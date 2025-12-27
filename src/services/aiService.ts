
// MVP: Use env var if available, else fallback to hardcoded (safety net for dev)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

export interface AiInsightContext {
    panelName: string;
    period: string; // e.g., "Last 7 Days", "Hourly"
    metricType: 'count' | 'timing' | 'percentage' | 'funnel' | 'other';
    eventNames: string[];
}

export const generatePanelInsights = async (
    graphData: any[],
    context: AiInsightContext
): Promise<string[]> => {
    try {
        // 1. Pre-process data to reduce token count and improve relevance
        const simplifiedData = simplifyData(graphData, context.metricType);

        // Limit data points if too large (e.g. max 40 points)
        const limitedData = simplifiedData.length > 40 
            ? simplifiedData.filter((_, i) => i % Math.ceil(simplifiedData.length / 40) === 0) 
            : simplifiedData;

        // 2. Construct Prompt (Updated for User Requirements)
        const prompt = `
        You are a witty senior data analyst. Analyze this JSON data for panel "${context.panelName}".
        Context: ${context.period}.
        Metric: ${context.metricType}.
        Events involved: ${context.eventNames.join(', ')}.

        DATA:
        ${JSON.stringify(limitedData)}

        Generate exactly **2 (TWO)** short, punchy insights.
        
        Rules:
        1. **Strict Limit**: Return EXACTLY 2 strings. No more.
        2. **Style**: Be analytical but add a *slight* witty or funny comparison where appropriate (e.g., "rocket ship", "snail pace", "flat as a pancake").
        3. **Context**: Mention specific event names if relevant.
        4. No markdown formatting. JSON Array ONLY. 
        5. Example: ["Traffic spiked 40%—to the moon! 🚀", "Errors dropped to zero, smooth sailing."]
        `;

        // 3. Call Gemini API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7, // Higher temp for wit
                    maxOutputTokens: 300,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`AI Service Error: ${response.statusText}`);
        }

        const result = await response.json();

        // 4. Parse Response
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return ["No insights generated."];

        // Clean up markdown code blocks if present ( ```json ... ``` )
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const insights = JSON.parse(cleanText);
            return Array.isArray(insights) ? insights : [cleanText];
        } catch (e) {
            console.warn("Failed to parse AI response as JSON, returning raw text split", e);
            return cleanText.split('\n').filter((s: string) => s.length > 5);
        }

    } catch (error) {
        console.error("Failed to generate AI insights:", error);
        return ["Unable to generate insights at this time."];
    }
};

// Helper to reduce data payload size
const simplifyData = (data: any[], type: string): any[] => {
    if (!data || data.length === 0) return [];

    return data.map(item => {
        const newItem: any = { date: item.date }; // Ensure date is kept

        // Heuristic: Keep numeric keys appropriate for the metric type
        Object.keys(item).forEach(key => {
            if (key === 'date' || key === 'name') return;

            // For counts, keep columns ending in _count or raw numbers
            if (type === 'count' && (key.endsWith('_count') || typeof item[key] === 'number')) {
                if (isRelevantKey(key)) newItem[key] = item[key];
            }
            // For timing, keep _avg, _p95 etc
            else if (type === 'timing' && (key.includes('avg') || key.includes('p95'))) {
                newItem[key] = Math.round(item[key]); // Round for simpler tokens
            }
            // For percentage
            else if (type === 'percentage' && key.includes('percent')) {
                newItem[key] = item[key];
            }
            // Generic fallback: if it's a number and not an ID
            else if (typeof item[key] === 'number' && !key.toLowerCase().includes('id')) {
                newItem[key] = item[key];
            }
        });
        return newItem;
    });
};

const isRelevantKey = (key: string): boolean => {
    // Filter out internal system keys if any
    if (key.startsWith('_')) return false;
    return true;
};
