export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { data, context, mode, transcript, options, currentDate, userMessage, context: chatbotContext, voiceContext } = req.body;

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

            const strictJsonInstruction = `
CRITICAL OUTPUT REQUIREMENT:
Return ONLY a valid JSON object. Do not include any other text.
\n\nJSON SCHEMA (MANDATORY):\n{\n  \"response\": string,\n  \"shouldUpdateFilters\": {\n    \"platforms\": number[],\n    \"pos\": number[],\n    \"sources\": number[],\n    \"events\": number[],\n    \"graphType\": \"line\" | \"bar\" | \"percentage\" | \"funnel\" | \"user_flow\",\n    \"percentageConfig\"?: { \"parentEvents\": number[], \"childEvents\": number[] },\n    \"funnelConfig\"?: { \"stages\": Array<{ \"eventId\": number }>, \"multipleChildEvents\": number[] },\n    \"userFlowConfig\"?: { \"stages\": Array<{ \"label\": string, \"eventIds\": number[] }> },\n    \"dateRange\": { \"from\": string, \"to\": string }\n  },\n  \"explanation\": string\n}\n\nIMPORTANT:
- You MUST ALWAYS include shouldUpdateFilters (full object), even if no changes are needed.
- If no changes needed, return shouldUpdateFilters as the current filters unchanged.
- If the user asks for a funnel graph OR the current graph type is funnel, you MUST include funnelConfig.stages with at least 2 events.
- If the user asks for a user flow graph OR the current graph type is user_flow, you MUST include userFlowConfig.stages with at least 2 stages.

FUNNEL RULES (VERY IMPORTANT):
- Prefer funnelConfig over events[].
- funnelConfig.stages must be an ORDERED list of the main steps (these map to e1, e2, e3... in the UI).
- funnelConfig.multipleChildEvents should ONLY represent the final-stage grouped events (if needed), not every event in the flow.
- Do NOT dump dozens of related event IDs in shouldUpdateFilters.events.
  Keep events[] empty or limited to stage + final stage event IDs (<= 10).

CURRENT FILTERS (IDs):
${JSON.stringify(currentFilters || {}, null, 2)}
\n\nCURRENT DATE RANGE:\n${JSON.stringify(currentDateRange || {}, null, 2)}\n`;
            
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
            const currentGraphType = voiceContext?.panelGraphType || 'line';
            prompt = `
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

            PLATFORM-AWARE EVENT RESOLUTION (VERY IMPORTANT):
            - Event names can represent the SAME concept across platforms but use different naming styles, e.g. "checkoutSuccess" vs "CHECKOUT_SUCCESS".
            - If the transcript mentions platform scope (e.g. "chrome extension", "android", "ios", "mobile", "web") OR you set platforms:
              * choose event IDs matching the intent AND include ALL strong naming variants for that scope.
              * avoid picking variants that clearly belong to other platforms.
            - If no platform scope is specified (platforms: [] => ALL), include ALL strong variants.
            - Return ONLY event IDs that exist in the provided Events list.

            Output Schema Details:
            - graphType: 'line' | 'bar' | 'percentage' | 'funnel' | 'user_flow'
            - percentageConfig: { "parentEvents": [ids], "childEvents": [ids] }
            - funnelConfig: { "stages": [{ "eventId": id }], "multipleChildEvents": [ids] }
            - userFlowConfig: { "stages": [{ "label": "Step Name", "eventIds": [ids] }] }

            Output rules:
            1. Return ONLY a JSON object.
            2. Match names to provided lists (fuzzy match).
            3. Use ISO strings for dateRange: { from: string, to: string }.
            4. **Filter Reset Logic**: If a category (Platforms, POS, Sources) is not mentioned or implied as 'all', return an empty array '[]' for that field. Do NOT omit it if you want it cleared.
            5. Include a brief "explanation" of what you did.

            JSON Return Example:
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
              "explanation": "Setting up a conversion funnel."
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
                    console.warn(`[API] ⚠️ Key ${keyPrefix}... rate limited (429). Rotating immediately...`);
                    markKeyFailed(apiKey);
                    rotateKey();
                    lastError = new Error(`Rate limit exceeded: ${errorInfo || response.statusText}`);
                    continue;
                }

                if (response.status === 403) {
                    console.warn(`[API] ⚠️ Key ${keyPrefix}... forbidden/quota exceeded (403). Rotating immediately...`);
                    markKeyFailed(apiKey);
                    rotateKey();
                    lastError = new Error(`Quota exceeded: ${errorInfo || response.statusText}`);
                    continue;
                }

                if (response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504) {
                    console.warn(`[API] ⚠️ Server error ${response.status} with key ${keyPrefix}... Rotating immediately...`);
                    markKeyFailed(apiKey);
                    rotateKey();
                    lastError = new Error(`Server error: ${response.status} ${response.statusText}`);
                    continue;
                }

                // For other errors, still rotate and try next key
                console.warn(`[API] ⚠️ Key ${keyPrefix}... failed with ${response.status}. Rotating immediately...`);
                markKeyFailed(apiKey);
                rotateKey();
                lastError = new Error(`API Error: ${response.status} ${errorInfo || response.statusText}`);
                continue;
            } catch (error) {
                const apiKey = getNextApiKey();
                const keyPrefix = apiKey.substring(0, 10);
                console.error(`[API] ❌ Exception with key ${keyPrefix}...:`, error.message);
                markKeyFailed(apiKey);
                rotateKey();
                lastError = error;
                continue;
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
                    const repairMessage = `You MUST output ONLY valid JSON matching this schema:\n{\n  \"response\": string,\n  \"shouldUpdateFilters\": {\n    \"platforms\": number[],\n    \"pos\": number[],\n    \"sources\": number[],\n    \"events\": number[],\n    \"graphType\": \"line\" | \"bar\" | \"percentage\" | \"funnel\" | \"user_flow\",\n    \"percentageConfig\"?: { \"parentEvents\": number[], \"childEvents\": number[] },\n    \"funnelConfig\"?: { \"stages\": Array<{ \"eventId\": number }>, \"multipleChildEvents\": number[] },\n    \"userFlowConfig\"?: { \"stages\": Array<{ \"label\": string, \"eventIds\": number[] }> },\n    \"dateRange\": { \"from\": string, \"to\": string }\n  },\n  \"explanation\": string\n}\n\nIMPORTANT:\n- If the user asks for a funnel graph OR the current graph type is funnel, include funnelConfig.stages with at least 2 events.\n- If the user asks for a user flow graph OR the current graph type is user_flow, include userFlowConfig.stages with at least 2 stages.\n\nCURRENT FILTERS (IDs):\n${JSON.stringify(currentFilters || {}, null, 2)}\n\nCURRENT DATE RANGE:\n${JSON.stringify(currentDateRange || {}, null, 2)}\n\nUSER MESSAGE:\n${userMessage}\n\nPREVIOUS (INVALID) MODEL OUTPUT:\n${text}`;

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
                            console.warn(`[API] ⚠️ Repair: Key ${keyPrefix}... rate limited. Rotating immediately...`);
                            markKeyFailed(apiKey);
                            rotateKey();
                            continue;
                        }

                        if (repairResp.status === 403) {
                            console.warn(`[API] ⚠️ Repair: Key ${keyPrefix}... quota exceeded. Rotating immediately...`);
                            markKeyFailed(apiKey);
                            rotateKey();
                            continue;
                        }

                        // For other errors, rotate and continue
                        console.warn(`[API] ⚠️ Repair: Key ${keyPrefix}... failed with ${repairResp.status}. Rotating immediately...`);
                        markKeyFailed(apiKey);
                        rotateKey();
                        continue;
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
