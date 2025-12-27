export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { data, context } = req.body;
    const apiKey = process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Server Configuration Error: Missing API Key' });
    }

    try {
        const prompt = `
        You are a witty senior data analyst. Analyze this JSON data for panel "${context.panelName}".
        Context: ${context.period}.
        Metric: ${context.metricType}.
        Events involved: ${context.eventNames.join(', ')}.

        DATA:
        ${JSON.stringify(data)}

        Generate exactly **2 (TWO)** short, punchy insights.
        
        Rules:
        1. **Strict Limit**: Return EXACTLY 2 strings. No more.
        2. **Style**: Be analytical but add a *slight* witty or funny comparison where appropriate.
        3. **Context**: Mention specific event names if relevant.
        4. **Formatting**: Wrap key numbers, metric changes, or impactful words in **double asterisks** to make them pop. (e.g., "**40% spike**", "**rocket ship**").
        5. No markdown formatting other than bold (**). JSON Array ONLY. 
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 300,
                }
            })
        });

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error.message);
        }

        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('No content generated');

        // Parse JSON from text (handle potential markdown blocks if Gemini adds them despite instructions)
        let cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const insights = JSON.parse(cleanedText);

        return res.status(200).json({ insights });

    } catch (error) {
        console.error('AI Service Error:', error);
        return res.status(500).json({ error: 'Failed to generate insights', details: error.message });
    }
}
