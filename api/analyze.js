export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { data, context, mode, transcript, options, currentDate, userMessage, context: chatbotContext } = req.body;
    
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const parseKeys = (raw) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw.map(k => String(k).trim()).filter(Boolean);
        if (typeof raw !== 'string') return [];
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.map(k => String(k).trim()).filter(Boolean);
        } catch {
            // ignore
        }
        return raw
            .split(',')
            .map(k => k.trim().replace(/["\[\]]/g, ''))
            .filter(Boolean);
    };

    // Prefer server-side env vars (GEMINI_*) but also support VITE_* for existing deployments.
    const API_KEYS = (() => {
        const keysArrayRaw = process.env.GEMINI_API_KEYS_ARRAY ?? process.env.VITE_GEMINI_API_KEYS_ARRAY;
        const parsedArray = parseKeys(keysArrayRaw);
        if (parsedArray.length > 0) return parsedArray;

        const singleKey = process.env.GEMINI_API_KEY ?? process.env.VITE_GEMINI_API_KEY;
        return singleKey ? [singleKey] : [];
    })();

    const getRetryDelayMs = (response, bodyText) => {
        const retryAfter = response?.headers?.get?.('retry-after');
        if (retryAfter) {
            const seconds = Number(retryAfter);
            if (!Number.isNaN(seconds) && seconds > 0) return seconds * 1000;
        }

        if (typeof bodyText === 'string' && bodyText) {
            try {
                // Try to parse as JSON first
                const parsed = JSON.parse(bodyText);
                if (parsed?.error?.details) {
                    for (const detail of parsed.error.details) {
                        // Check for RetryInfo type with retryDelay field
                        if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' && detail.retryDelay) {
                            const delayStr = String(detail.retryDelay);
                            // Handle formats like "58s", "58.046904289s", or just "58"
                            const match = delayStr.match(/(\d+(?:\.\d+)?)s?/);
                            if (match) {
                                const seconds = Number(match[1]);
                                if (!Number.isNaN(seconds) && seconds > 0) {
                                    const delayMs = Math.ceil(seconds * 1000);
                                    console.log(`[API] Extracted retry delay: ${seconds}s (${delayMs}ms)`);
                                    return delayMs;
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                // If JSON parse fails, try regex match
            }
            
            // Fallback: regex match for retryDelay in string format
            const match = bodyText.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s?"/);
            if (match) {
                const seconds = Number(match[1]);
                if (!Number.isNaN(seconds) && seconds > 0) {
                    return Math.ceil(seconds * 1000);
                }
            }
        }

        return null;
    };
    const BASE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
    
    if (API_KEYS.length === 0) {
        return res.status(500).json({ error: 'Server Configuration Error: Missing API Keys' });
    }

    console.log(`[API] Loaded ${API_KEYS.length} API keys for rotation`);

    // Key rotation helper with tracking
    let currentKeyIndex = 0;
    const failedKeys = new Set(); // Track keys that failed recently
    const getNextApiKey = () => {
        let attempts = 0;
        while (attempts < API_KEYS.length) {
            const key = API_KEYS[currentKeyIndex % API_KEYS.length];
            if (!failedKeys.has(key)) {
                return key;
            }
            currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
            attempts++;
        }
        // If all keys failed, reset and try again
        failedKeys.clear();
        return API_KEYS[currentKeyIndex % API_KEYS.length];
    };
    const rotateKey = () => { 
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length; 
    };
    const markKeyFailed = (key) => {
        failedKeys.add(key);
        // Remove from failed set after 5 minutes
        setTimeout(() => failedKeys.delete(key), 5 * 60 * 1000);
    };

    try {
        let prompt = '';
        let generationConfig = {
            temperature: 0.7,
            maxOutputTokens: 300,
        };
        let contents = null;

        if (mode === 'chatbot') {
            // Chatbot mode - use conversation history
            const { systemPrompt, contextInfo, conversationHistory, currentFilters, currentDateRange } = chatbotContext;
            const systemMessage = `${systemPrompt}\n\n${contextInfo}`;

            const strictJsonInstruction = `\n\nCRITICAL OUTPUT REQUIREMENT:\nReturn ONLY a valid JSON object. Do not include any other text.\n\nJSON SCHEMA (MANDATORY):\n{\n  \"response\": string,\n  \"shouldUpdateFilters\": {\n    \"platforms\": number[],\n    \"pos\": number[],\n    \"sources\": number[],\n    \"events\": number[],\n    \"dateRange\": { \"from\": string, \"to\": string }\n  },\n  \"explanation\": string\n}\n\nIMPORTANT:\n- You MUST ALWAYS include shouldUpdateFilters (full object), even if no changes are needed.\n- If no changes needed, return shouldUpdateFilters as the current filters unchanged.\n\nCURRENT FILTERS (IDs):\n${JSON.stringify(currentFilters || {}, null, 2)}\n\nCURRENT DATE RANGE:\n${JSON.stringify(currentDateRange || {}, null, 2)}\n`;
            
            contents = [
                { role: 'user', parts: [{ text: systemMessage }] },
                { role: 'model', parts: [{ text: 'I understand. I\'m ready to help with dashboard questions and filter adjustments.' }] },
                ...conversationHistory,
                { role: 'user', parts: [{ text: `${userMessage}${strictJsonInstruction}` }] }
            ];

            generationConfig = {
                temperature: 0.2,
                maxOutputTokens: 1000,
                response_mime_type: "application/json"
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

        // Make API call with retry logic - try ALL available keys
        let lastError = null;
        let lastStatus = null;
        let lastDetails = '';
        let result = null;
        
        // Try up to all available keys (or max 100 attempts to prevent infinite loops)
        const maxAttempts = Math.min(API_KEYS.length, 100);
        const startKeyIndex = currentKeyIndex;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const apiKey = getNextApiKey();
                const keyPrefix = apiKey.substring(0, 10);
                console.log(`[API] Attempt ${attempt + 1}/${maxAttempts} using key ${keyPrefix}...`);
                
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
                    console.log(`[API] ✅ Success with key ${keyPrefix}...`);
                    break;
                }

                lastStatus = response.status;
                lastDetails = '';
                try {
                    lastDetails = await response.text();
                } catch {
                    lastDetails = '';
                }

                // Parse error details for better logging
                let errorInfo = '';
                try {
                    const errorJson = JSON.parse(lastDetails);
                    if (errorJson?.error?.message) {
                        errorInfo = errorJson.error.message.substring(0, 100);
                    }
                } catch {
                    errorInfo = lastDetails.substring(0, 100);
                }

                if (response.status === 429) {
                    console.warn(`[API] ⚠️ Key ${keyPrefix}... rate limited (429). Rotating...`);
                    markKeyFailed(apiKey);
                    rotateKey();
                    lastError = new Error(`Rate limit exceeded: ${errorInfo || response.statusText}`);
                    
                    // Only wait if we have more keys to try
                    if (attempt < maxAttempts - 1) {
                        const retryDelayMs = getRetryDelayMs(response, lastDetails);
                        if (retryDelayMs) {
                            console.log(`[API] Waiting ${Math.ceil(retryDelayMs / 1000)}s before next key...`);
                            await sleep(retryDelayMs);
                        } else {
                            // Small delay before trying next key
                            await sleep(500);
                        }
                    }
                    continue;
                }

                if (response.status === 403) {
                    console.warn(`[API] ⚠️ Key ${keyPrefix}... forbidden/quota exceeded (403). Rotating...`);
                    markKeyFailed(apiKey);
                    rotateKey();
                    lastError = new Error(`Quota exceeded: ${errorInfo || response.statusText}`);
                    
                    if (attempt < maxAttempts - 1) {
                        // Small delay before trying next key
                        await sleep(500);
                    }
                    continue;
                }

                if (response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504) {
                    console.warn(`[API] ⚠️ Server error ${response.status} with key ${keyPrefix}... Retrying...`);
                    lastError = new Error(`Server error: ${response.status} ${response.statusText}`);
                    if (attempt < maxAttempts - 1) {
                        await sleep(800 * (attempt + 1));
                        continue;
                    }
                }

                // For other errors, still rotate and try next key
                console.warn(`[API] ⚠️ Key ${keyPrefix}... failed with ${response.status}. Rotating...`);
                markKeyFailed(apiKey);
                rotateKey();
                lastError = new Error(`API Error: ${response.status} ${errorInfo || response.statusText}`);
                
                if (attempt < maxAttempts - 1) {
                    await sleep(500);
                    continue;
                }
            } catch (error) {
                const apiKey = getNextApiKey();
                const keyPrefix = apiKey.substring(0, 10);
                console.error(`[API] ❌ Exception with key ${keyPrefix}...:`, error.message);
                markKeyFailed(apiKey);
                rotateKey();
                lastError = error;
                if (attempt < maxAttempts - 1) {
                    await sleep(500);
                }
            }
        }

        if (!result) {
            const errorMessage = lastError?.message || 'Failed to call Gemini API after retries';
            const finalError = new Error(
                lastStatus === 429 
                    ? `All API keys rate limited. Tried ${maxAttempts} keys. Please try again in a few minutes.`
                    : lastStatus === 403
                    ? `All API keys quota exceeded. Tried ${maxAttempts} keys. Please check your API key quotas.`
                    : `Failed after trying ${maxAttempts} API keys: ${errorMessage}`
            );
            finalError.status = lastStatus || 500;
            finalError.details = lastDetails || '';
            console.error(`[API] ❌ All ${maxAttempts} attempts failed. Last error:`, errorMessage);
            throw finalError;
        }
        
        if (result.error) {
            throw new Error(result.error.message);
        }

        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('No content generated');

        // Handle chatbot mode
        if (mode === 'chatbot') {
            const extractJsonObject = (rawText) => {
                try {
                    const direct = JSON.parse(rawText);
                    if (direct && typeof direct === 'object') return direct;
                } catch {
                    // ignore
                }

                try {
                    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        if (parsed && typeof parsed === 'object') return parsed;
                    }
                } catch {
                    // ignore
                }

                return null;
            };

            // Try to parse JSON response (preferred)
            let parsedResponse = extractJsonObject(text);

            // If not JSON, do ONE repair pass to convert it into valid JSON
            if (!parsedResponse) {
                try {
                    const { systemPrompt, contextInfo, conversationHistory, currentFilters, currentDateRange } = chatbotContext;
                    const repairMessage = `You MUST output ONLY valid JSON matching this schema:\n{\n  \"response\": string,\n  \"shouldUpdateFilters\": {\n    \"platforms\": number[],\n    \"pos\": number[],\n    \"sources\": number[],\n    \"events\": number[],\n    \"dateRange\": { \"from\": string, \"to\": string }\n  },\n  \"explanation\": string\n}\n\nCURRENT FILTERS (IDs):\n${JSON.stringify(currentFilters || {}, null, 2)}\n\nCURRENT DATE RANGE:\n${JSON.stringify(currentDateRange || {}, null, 2)}\n\nUSER MESSAGE:\n${userMessage}\n\nPREVIOUS (INVALID) MODEL OUTPUT:\n${text}`;

                    const repairContents = [
                        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${contextInfo}` }] },
                        { role: 'model', parts: [{ text: 'I understand.' }] },
                        ...conversationHistory,
                        { role: 'user', parts: [{ text: repairMessage }] }
                    ];

                    let repairResult = null;
                    const repairMaxAttempts = Math.min(API_KEYS.length, 50);
                    for (let attempt = 0; attempt < repairMaxAttempts; attempt++) {
                        const apiKey = getNextApiKey();
                        const keyPrefix = apiKey.substring(0, 10);
                        const url = `${BASE_API_URL}?key=${apiKey}`;

                        const repairResp = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: repairContents,
                                generationConfig: {
                                    temperature: 0.1,
                                    maxOutputTokens: 900,
                                    response_mime_type: "application/json"
                                }
                            })
                        });

                        if (repairResp.ok) {
                            repairResult = await repairResp.json();
                            console.log(`[API] ✅ Repair successful with key ${keyPrefix}...`);
                            break;
                        }

                        let repairTextDetails = '';
                        try {
                            repairTextDetails = await repairResp.text();
                        } catch {
                            repairTextDetails = '';
                        }

                        if (repairResp.status === 429) {
                            console.warn(`[API] ⚠️ Repair: Key ${keyPrefix}... rate limited. Rotating...`);
                            markKeyFailed(apiKey);
                            rotateKey();
                            if (attempt < repairMaxAttempts - 1) {
                                const retryDelayMs = getRetryDelayMs(repairResp, repairTextDetails);
                                await sleep(retryDelayMs ?? 500);
                                continue;
                            }
                        }

                        if (repairResp.status === 403) {
                            console.warn(`[API] ⚠️ Repair: Key ${keyPrefix}... quota exceeded. Rotating...`);
                            markKeyFailed(apiKey);
                            rotateKey();
                            if (attempt < repairMaxAttempts - 1) {
                                await sleep(500);
                                continue;
                            }
                        }

                        // For other errors, rotate and continue
                        markKeyFailed(apiKey);
                        rotateKey();
                        if (attempt < repairMaxAttempts - 1) {
                            await sleep(500);
                            continue;
                        }
                        
                        break;
                    }

                    const repairText = repairResult?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (repairText) {
                        parsedResponse = extractJsonObject(repairText);
                    }
                } catch (repairErr) {
                    console.warn('Chatbot JSON repair failed:', repairErr?.message || repairErr);
                }
            }

            if (!parsedResponse || typeof parsedResponse !== 'object') {
                throw new Error('Chatbot response was not valid JSON');
            }

            if (!parsedResponse.shouldUpdateFilters) {
                throw new Error('Chatbot response missing shouldUpdateFilters');
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
