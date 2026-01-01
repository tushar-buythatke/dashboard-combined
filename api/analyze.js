export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { data, context, mode, transcript, options, currentDate } = req.body;
    const apiKey = process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Server Configuration Error: Missing API Key' });
    }

    try {
        let prompt = '';
        let generationConfig = {
            temperature: 0.7,
            maxOutputTokens: 300,
        };

        if (mode === 'parse_voice') {
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

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig
            })
        });

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error.message);
        }

        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('No content generated');

        // Parse JSON from text
        let cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedResult = JSON.parse(cleanedText);

        if (mode === 'parse_voice') {
            return res.status(200).json(parsedResult);
        } else {
            return res.status(200).json({ insights: parsedResult });
        }

    } catch (error) {
        console.error('AI Service Error:', error);
        return res.status(500).json({ error: 'AI processing failed', details: error.message });
    }
}
