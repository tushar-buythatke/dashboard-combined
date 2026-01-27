
// MVP: Use env var if available, else fallback to hardcoded (safety net for dev)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// Get API keys array from env, fallback to single key
const getApiKeys = (): string[] => {
    const keysArray = import.meta.env.VITE_GEMINI_API_KEYS_ARRAY;
    if (keysArray) {
        try {
            // Handle both JSON string and array format
            if (typeof keysArray === 'string') {
                return JSON.parse(keysArray);
            }
            return keysArray;
        } catch {
            return keysArray.split(',').map((k: string) => k.trim().replace(/["\[\]]/g, ''));
        }
    }
    return GEMINI_API_KEY ? [GEMINI_API_KEY] : [];
};

const API_KEYS = getApiKeys();
const BASE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
const PROXY_URL = '/api/analyze';

// Key rotation with retry logic
let currentKeyIndex = 0;
const getNextApiKey = (): string => {
    if (API_KEYS.length === 0) throw new Error('No Gemini API keys available');
    return API_KEYS[currentKeyIndex % API_KEYS.length];
};

const rotateKey = () => {
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
};

export const callGeminiAPI = async (prompt: string, config: any = {}, maxRetries = 3): Promise<any> => {
    let lastError: any = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const apiKey = getNextApiKey();
            const url = `${BASE_API_URL}?key=${apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: config.temperature ?? 0.7,
                        maxOutputTokens: config.maxOutputTokens ?? 1000,
                        response_mime_type: config.response_mime_type || undefined,
                        ...config
                    }
                })
            });

            if (response.ok) {
                return await response.json();
            } else if (response.status === 429 || response.status === 403) {
                // Rate limit or quota exceeded - try next key
                console.warn(`API key ${apiKey.substring(0, 10)}... failed with ${response.status}, rotating...`);
                rotateKey();
                lastError = new Error(`API Error: ${response.statusText}`);
                continue;
            } else {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
        } catch (error: any) {
            lastError = error;
            if (attempt < maxRetries - 1) {
                rotateKey();
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
            }
        }
    }
    
    throw lastError || new Error('Failed to call Gemini API after retries');
};

export interface AiInsightContext {
    panelName: string;
    period: string; // e.g., "Last 7 Days", "Hourly"
    metricType: 'count' | 'timing' | 'percentage' | 'funnel' | 'other';
    eventNames: string[];
}

export interface VoiceFilterResult {
    platforms?: number[];
    pos?: number[];
    sources?: number[];
    events?: number[];
    dateRange?: {
        from: string; // ISO string or Date
        to: string;   // ISO string or Date
    };
    isHourly?: boolean;
    explanation?: string;
    // New fields for complex graph configurations
    graphType?: 'line' | 'bar' | 'percentage' | 'funnel' | 'user_flow';
    percentageConfig?: {
        parentEvents: number[]; // Denominator events
        childEvents: number[];  // Numerator events
    };
    funnelConfig?: {
        stages: { eventId: number }[];
        multipleChildEvents: number[]; // Success events at the end
    };
    userFlowConfig?: {
        stages: { label: string, eventIds: number[] }[];
    };
    // Support nested filters structure from AI
    filters?: {
        platforms?: number[];
        pos?: number[];
        sources?: number[];
        events?: number[];
        dateRange?: {
            from: string;
            to: string;
        };
    };
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
                    context: context,
                    mode: 'insights'
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
            You are a witty senior data analyst at Buyhatke. Analyze this JSON data for panel "${context.panelName}".
            Context: ${context.period}.
            Metric: ${context.metricType}.
            Events involved: ${context.eventNames.join(', ')}.

            DATA:
            ${JSON.stringify(limitedData)}

            Generate exactly **2 (TWO)** highly analytical and witty insights.
            
            Rules:
            1. **Strict Limit**: Return EXACTLY 2 strings. No more.
            2. **Style**: Analytical + Witty Comparison. Remove any "funny" or casual filler. Focus on "mind-boggling" stats and comparisons (e.g., "This metric spike is equivalent to a **400% jump** compared to the weekly baseline").
            3. **Insight Types**: Look for correlations, anomalies, or significant trends.
            4. **Formatting**: Wrap key numbers/words in **double asterisks** for bolding (e.g., "**40% spike**").
            5. JSON Array ONLY. 
            `;

            const result = await callGeminiAPI(prompt, {
                temperature: 0.7,
                maxOutputTokens: 300,
            });
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

/**
 * Parse a voice transcript into structured filter options using Gemini
 */
export const parseTranscriptToFilters = async (
    transcript: string,
    options: {
        platforms: { id: number, name: string }[];
        pos: { id: number, name: string }[];
        sources: { id: number, name: string }[];
        events: { id: number, name: string }[];
    },
    currentDate?: string, // ISO string for today's context
    voiceContext?: {
        currentFilters?: {
            platforms?: number[];
            pos?: number[];
            sources?: number[];
            events?: number[];
        };
        currentDateRange?: { from?: string; to?: string };
        panelGraphType?: 'line' | 'bar' | 'percentage' | 'funnel' | 'user_flow';
        panelGraphConfig?: {
            percentageConfig?: any;
            funnelConfig?: any;
            userFlowConfig?: any;
        };
    }
): Promise<VoiceFilterResult> => {
    try {
        if (import.meta.env.PROD) {
            console.log("Using Vercel Proxy for AI Voice Filter Parsing");
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript,
                    options,
                    currentDate: currentDate || new Date().toISOString(),
                    voiceContext: voiceContext || undefined,
                    mode: 'parse_voice'
                })
            });

            if (!response.ok) {
                if (response.status === 429) throw new Error('Rate limit exceeded');
                throw new Error(`Proxy Error: ${response.statusText}`);
            }

            return await response.json();
        } else {
            console.log("Using Direct API Call for AI Voice Filter Parsing (Dev Mode)");
            const currentGraphType = voiceContext?.panelGraphType || 'line';
            const prompt = `
            You are a dashboard filter assistant for Buyhatke Analytics. Convert this voice transcript into a structured JSON filter object and (if applicable) a special graph configuration update.
            
            Today's Date Context: ${currentDate || new Date().toISOString()}
            Transcript: "${transcript}"

            Current Dashboard Context:
            - Current Graph Type: ${currentGraphType}
            - Current Filters (IDs): ${JSON.stringify(voiceContext?.currentFilters || {}, null, 2)}
            - Current Date Range: ${JSON.stringify(voiceContext?.currentDateRange || {}, null, 2)}
            - Current Graph Config (only relevant if graph type is percentage/funnel/user_flow):
              * percentageConfig: ${JSON.stringify(voiceContext?.panelGraphConfig?.percentageConfig || null)}
              * funnelConfig: ${JSON.stringify(voiceContext?.panelGraphConfig?.funnelConfig || null)}
              * userFlowConfig: ${JSON.stringify(voiceContext?.panelGraphConfig?.userFlowConfig || null)}
            
            Available Options (only use IDs from these sets):
            - Platforms: ${JSON.stringify(options.platforms)}
            - POS/Websites: ${JSON.stringify(options.pos)}
            - Sources: ${JSON.stringify(options.sources)}
            - Events: ${JSON.stringify(options.events)}
            
            Task Breakdown:
            1. Recognize Filters: Dates, Platforms, POS, Sources.
            2. Graph Type Handling:
               - Prefer using the CURRENT Graph Type from context unless the user explicitly asks to switch.
               - If user says "funnel"/"conversion" => set graphType: "funnel" and return funnelConfig.
               - If user says "percentage"/"ratio" => set graphType: "percentage" and return percentageConfig.
               - If user says "user flow" => set graphType: "user_flow" and return userFlowConfig.
            3. Semantic Event Mapping: map vague terms (e.g., "spend lens", "checkout flow", "auth") to specific event sequences or sets. 
               Example: "spend lens" -> events like SPEND_shown, SPEND_clicked, SPEND_success.

            PLATFORM-AWARE EVENT RESOLUTION (VERY IMPORTANT):
            - Event names can represent the SAME concept across platforms but use different naming styles, e.g. "checkoutSuccess" vs "CHECKOUT_SUCCESS".
            - If the transcript mentions platform scope (e.g. "chrome extension", "android", "ios", "mobile", "web") OR you set platforms:
              * choose event IDs matching the intent AND include ALL strong naming variants for that scope.
              * avoid picking variants that clearly belong to other platforms.
            - If no platform scope is specified (platforms: [] => ALL), include ALL strong variants.
            - Return ONLY event IDs that exist in the provided Events list.
            
            Output Schema Details:
            - graphType: 'line' | 'bar' | 'percentage' | 'funnel' | 'user_flow'
            - percentageConfig: { "parentEvents": [ids], "childEvents": [ids] } -- Used for ratio analysis (Numerator/Denominator).
            - funnelConfig: { "stages": [{ "eventId": id }], "multipleChildEvents": [ids] } -- Sequential conversion.
            - userFlowConfig: { "stages": [{ "label": "Step Name", "eventIds": [ids] }] } -- Complex branching flows.
            
            Specific "Spend Lens" Example Strategy: 
            If someone says "Show the full flow of spend lens", generate a funnel or user flow using ALL relevant events starting with or containing "spend" or "spent", ordered logically (Shown -> Clicked -> Calculated -> Success/Error).

            Output rules:
            1. Return ONLY a JSON object.
            2. Match names to provided lists (fuzzy match). 
            3. Use ISO strings for dateRange: { from: string, to: string }.
            4. **Filter Reset Logic**: If a category (Platforms, POS, Sources) is not mentioned or implied as 'all', return an empty array '[]' for that field. Do NOT omit it if you want it cleared.
            5. If a command implies a reset (e.g., "Show me something else"), ensure all other categories are cleared to '[]'.
            6. Include a brief "explanation" of what you did.
            
            JSON Return Example for complex request:
            {
              "graphType": "funnel",
              "platforms": [],
              "pos": [],
              "sources": [],
              "events": [],
              "funnelConfig": {
                "stages": [{ "eventId": 101 }, { "eventId": 102 }],
                "multipleChildEvents": [103, 104]
              },
              "explanation": "Setting up a Spend Lens funnel: Shown -> Clicked -> Success."
            }
            `;

            const result = await callGeminiAPI(prompt, {
                temperature: 0.1,
                maxOutputTokens: 800,
                response_mime_type: "application/json"
            });
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("No response from AI");

            return JSON.parse(text.trim());
        }
    } catch (error: any) {
        console.error('AI Filter Parsing Failed:', error);
        // Re-throw with status code preserved for UI handling
        const enhancedError: any = new Error(error.message || 'Failed to parse filters from voice.');
        enhancedError.status = error.status;
        enhancedError.details = error.details;
        throw enhancedError;
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
