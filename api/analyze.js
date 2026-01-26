export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { data, context, mode, transcript, options, currentDate, userMessage, context: chatbotContext } = req.body;
    
    // Get API keys array from environment
    const getApiKeys = () => {
        const keysArray = process.env.VITE_GEMINI_API_KEYS_ARRAY;
        if (keysArray) {
            try {
                if (typeof keysArray === 'string') {
                    return JSON.parse(keysArray);
                }
                return keysArray;
            } catch {
                return keysArray.split(',').map(k => k.trim().replace(/["\[\]]/g, ''));
            }
        }
        const singleKey = process.env.VITE_GEMINI_API_KEY;
        return singleKey ? [singleKey] : [];
    };

    const API_KEYS = getApiKeys();
    const BASE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
    
    if (API_KEYS.length === 0) {
        return res.status(500).json({ error: 'Server Configuration Error: Missing API Keys' });
    }

    // Key rotation helper
    let currentKeyIndex = 0;
    const getNextApiKey = () => API_KEYS[currentKeyIndex % API_KEYS.length];
    const rotateKey = () => { currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length; };

    try {
        let prompt = '';
        let generationConfig = {
            temperature: 0.7,
            maxOutputTokens: 300,
        };
        let contents = null;

        if (mode === 'chatbot') {
            // Chatbot mode - use conversation history
            const { systemPrompt, contextInfo, conversationHistory } = chatbotContext;
            const systemMessage = `${systemPrompt}\n\n${contextInfo}`;
            
            contents = [
                { role: 'user', parts: [{ text: systemMessage }] },
                { role: 'model', parts: [{ text: 'I understand. I\'m ready to help with dashboard questions and filter adjustments.' }] },
                ...conversationHistory,
                { role: 'user', parts: [{ text: userMessage }] }
            ];

            generationConfig = {
                temperature: 0.7,
                maxOutputTokens: 1000,
            };
        } else if (mode === 'parse_voice') {
            prompt = `
            You are a dashboard filter assistant. Convert this voice transcript into a structured JSON filter object.
            
            Today's Date Context: ${currentDate || new Date().toISOString()}
            Transcript: "${transcript}"
            
            Available Options (only use IDs from these sets):
            - Platforms: ${JSON.stringify(options.platforms)} (e.g., Android, iOS, Desktop)
            - POS/Websites: ${JSON.stringify(options.pos)} (e.g., Flipkart, Amazon)
            - Sources: ${JSON.stringify(options.sources)} (e.g., Checkout, Search)
            - Events: ${JSON.stringify(options.events)} (e.g., Order Success, Cart Add)
            
            Output rules:
            1. Return ONLY a JSON object.
            2. Recognize relative dates using Today's Date Context. If someone says "last 4 days", calculate the 'from' date based on ${currentDate}.
            3. Match names to the provided lists (fuzzy match).
            4. Use ISO strings for dateRange: { from: string, to: string }.
            5. If a filter is not mentioned, assume "All" and OMIT it from the JSON.
            6. Include a brief "explanation" of what filters you applied.
            
            Example Output:
            {
              "events": [12, 15],
              "pos": [2],
              "dateRange": { "from": "2024-03-01T00:00:00Z", "to": "2024-03-04T00:00:00Z" },
              "explanation": "Showing CHECKOUT_SUCCESS for Flipkart from the last 4 days."
            }
            `;
            generationConfig = {
                temperature: 0.1,
                maxOutputTokens: 500,
                response_mime_type: "application/json"
            };
        } else {
            // Default to insights mode
            prompt = `
            You are a witty senior data analyst. Analyze this JSON data for panel "${context?.panelName || 'Dashboard Panel'}".
            Context: ${context?.period || 'current period'}.
            Metric: ${context?.metricType || 'general metrics'}.
            Events involved: ${context?.eventNames?.join(', ') || 'selected events'}.

            DATA:
            ${JSON.stringify(data)}

            Generate exactly **2 (TWO)** short, punchy insights.
            
            Rules:
            1. **Strict Limit**: Return EXACTLY 2 strings. No more.
            2. **Style**: Be analytical but add a *slight* witty or funny comparison where appropriate.
            3. **Context**: Mention specific event names if relevant.
            4. **Formatting**: Wrap key numbers, metric changes, or impactful words in **double asterisks** to make them pop.
            5. No markdown formatting other than bold (**). JSON Array ONLY. 
            `;
        }

        // Make API call with retry logic
        let lastError = null;
        let lastStatus = null;
        let lastDetails = '';
        let result = null;
        
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const apiKey = getNextApiKey();
                const url = `${BASE_API_URL}?key=${apiKey}`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: contents || [{ parts: [{ text: prompt }] }],
                        generationConfig
                    })
                });

                if (response.ok) {
                    result = await response.json();
                    break;
                }

                lastStatus = response.status;
                lastDetails = '';
                try {
                    lastDetails = await response.text();
                } catch {
                    lastDetails = '';
                }

                if (response.status === 429 || response.status === 403) {
                    console.warn(`API key failed with ${response.status}, rotating...`);
                    rotateKey();
                    lastError = new Error(`API Error: ${response.status} ${response.statusText}`);
                    if (attempt < 2) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                        continue;
                    }
                }

                if (response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504) {
                    lastError = new Error(`API Error: ${response.status} ${response.statusText}`);
                    if (attempt < 2) {
                        await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
                        continue;
                    }
                }

                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            } catch (error) {
                lastError = error;
                if (attempt < 2) {
                    await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
                }
            }
        }

        if (!result) {
            const finalError = lastError || new Error('Failed to call Gemini API after retries');
            finalError.status = lastStatus || 500;
            finalError.details = lastDetails || '';
            throw finalError;
        }
        
        if (result.error) {
            throw new Error(result.error.message);
        }

        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('No content generated');

        // Handle chatbot mode
        if (mode === 'chatbot') {
            // Try to parse JSON response if it contains filter updates
            let parsedResponse = { response: text };
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.shouldUpdateFilters || parsed.explanation) {
                        parsedResponse = parsed;
                    }
                }
            } catch (parseError) {
                // Not JSON, use as plain text response
                console.warn('Chatbot response parsing failed:', parseError.message);
                console.warn('Raw AI response:', text);
            }
            
            // Debug log to see what we're returning
            if (parsedResponse.shouldUpdateFilters) {
                console.log('✅ Returning filter updates:', JSON.stringify(parsedResponse.shouldUpdateFilters));
            } else {
                console.log('⚠️ No filter updates found in response. Parsed:', parsedResponse);
            }
            
            return res.status(200).json(parsedResponse);
        }

        // Parse JSON from text for other modes
        let cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedResult = JSON.parse(cleanedText);

        if (mode === 'parse_voice') {
            return res.status(200).json(parsedResult);
        } else {
            return res.status(200).json({ insights: parsedResult });
        }

    } catch (error) {
        console.error('AI Service Error:', error);
        const status = error?.status || 500;
        return res.status(status).json({
            error: 'AI processing failed',
            details: error?.details || error.message,
            status
        });
    }
}
