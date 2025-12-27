
// MVP: Use env var if available, else fallback to hardcoded (safety net for dev)
// MVP: Use env var if available, else fallback to hardcoded (safety net for dev)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
const PROXY_URL = '/api/analyze';

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
        // 1. Pre-process data
        const simplifiedData = simplifyData(graphData, context.metricType);

        // Limit data
        const limitedData = simplifiedData.length > 40
            ? simplifiedData.filter((_, i) => i % Math.ceil(simplifiedData.length / 40) === 0)
            : simplifiedData;

        // CHECK ENVIRONMENT: Use Proxy in PROD, Direct in DEV
        if (import.meta.env.PROD) {
            // --- PRODUCTION: CALL PROXY (KEY HIDDEN) ---
            console.log("Using Vercel Proxy for AI Insights");
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: limitedData,
                    context: context
                })
            });

            if (!response.ok) {
                if (response.status === 429) throw new Error('Rate limit exceeded');
                throw new Error(`Proxy Error: ${response.statusText}`);
            }

            const result = await response.json();
            // Parse JSON from result if it's a string, or use directly
            return result.insights || [];

        } else {
            // --- DEVELOPMENT: DIRECT CALL (KEY VISIBLE LOCALLY) ---
            console.log("Using Direct API Call (Dev Mode)");

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
            2. **Style**: Analytical + witty comparison.
            3. **Formatting**: Wrap key numbers/words in **double asterisks** for bolding (e.g., "**40% spike**").
            4. JSON Array ONLY. 
            `;

            const response = await fetch(API_URL, {
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

            if (!response.ok) {
                if (response.status === 429) throw new Error('Rate limit exceeded');
                throw new Error(`AI Service Error: ${response.statusText}`);
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) return ["No insights generated."];

            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            try {
                return JSON.parse(cleanedText);
            } catch (e) {
                return cleanedText.split('\n').filter((s: string) => s.length > 5);
            }
        }

    } catch (error) {
        console.error('AI Insight Generation Failed:', error);
        throw error;
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
