// Import callGeminiAPI - will be available after aiService exports it
// For now, we'll define it here to avoid circular dependency
const getApiKeys = (): string[] => {
    const keysArray = import.meta.env.VITE_GEMINI_API_KEYS_ARRAY;
    if (keysArray) {
        try {
            if (typeof keysArray === 'string') {
                return JSON.parse(keysArray);
            }
            return keysArray;
        } catch {
            return keysArray.split(',').map((k: string) => k.trim().replace(/["\[\]]/g, ''));
        }
    }
    const singleKey = import.meta.env.VITE_GEMINI_API_KEY;
    return singleKey ? [singleKey] : [];
};

const API_KEYS = getApiKeys();
const BASE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

let currentKeyIndex = 0;
const getNextApiKey = (): string => {
    if (API_KEYS.length === 0) throw new Error('No Gemini API keys available');
    return API_KEYS[currentKeyIndex % API_KEYS.length];
};

const rotateKey = () => {
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
};

const callGeminiAPI = async (prompt: string, config: any = {}, maxRetries = 3): Promise<any> => {
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
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    }
    
    throw lastError || new Error('Failed to call Gemini API after retries');
};

const KNOWLEDGE_BASE_KEY = 'dashboard_chatbot_knowledge_base';
const CHAT_HISTORY_KEY = 'dashboard_chatbot_history';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface ChatbotContext {
    currentFilters?: any;
    currentDateRange?: { from: Date; to: Date };
    availableOptions?: {
        platforms: { id: number; name: string }[];
        pos: { id: number; name: string }[];
        sources: (string | { id: number; name: string })[];
        events: { id: number; name: string }[];
    };
    panelName?: string;
    graphData?: any[];
    metricType?: 'count' | 'timing' | 'percentage' | 'funnel' | 'other';
    panelGraphType?: 'line' | 'bar' | 'percentage' | 'funnel' | 'user_flow';
    panelGraphConfig?: {
        percentageConfig?: any;
        funnelConfig?: any;
        userFlowConfig?: any;
    };
}

// Load knowledge base from localStorage
export const loadKnowledgeBase = (): string => {
    try {
        return localStorage.getItem(KNOWLEDGE_BASE_KEY) || '';
    } catch {
        return '';
    }
};

// Save knowledge base to localStorage with size limit
const MAX_KNOWLEDGE_BASE_SIZE = 50000; // ~50KB limit to prevent localStorage bloat

export const saveKnowledgeBase = (knowledge: string): void => {
    try {
        // Limit knowledge base size to prevent localStorage overflow
        const limitedKnowledge = knowledge.length > MAX_KNOWLEDGE_BASE_SIZE
            ? knowledge.substring(0, MAX_KNOWLEDGE_BASE_SIZE) + '... [truncated]'
            : knowledge;
        localStorage.setItem(KNOWLEDGE_BASE_KEY, limitedKnowledge);
    } catch (error) {
        console.error('Failed to save knowledge base:', error);
        // If storage is full, try to clear old data
        try {
            localStorage.removeItem(KNOWLEDGE_BASE_KEY);
            const limitedKnowledge = knowledge.substring(0, MAX_KNOWLEDGE_BASE_SIZE / 2);
            localStorage.setItem(KNOWLEDGE_BASE_KEY, limitedKnowledge);
        } catch (e) {
            console.error('Failed to recover from storage error:', e);
        }
    }
};

// Load chat history from localStorage
export const loadChatHistory = (panelId?: string): ChatMessage[] => {
    try {
        const key = panelId ? `${CHAT_HISTORY_KEY}_${panelId}` : CHAT_HISTORY_KEY;
        const history = localStorage.getItem(key);
        return history ? JSON.parse(history) : [];
    } catch {
        return [];
    }
};

// Save chat history to localStorage with size limit
const MAX_CHAT_HISTORY_MESSAGES = 30; // Reduced from 50 to prevent bloat
const MAX_CHAT_HISTORY_SIZE = 100000; // ~100KB limit per panel

export const saveChatHistory = (messages: ChatMessage[], panelId?: string): void => {
    try {
        const key = panelId ? `${CHAT_HISTORY_KEY}_${panelId}` : CHAT_HISTORY_KEY;
        // Keep only last N messages
        let recentMessages = messages.slice(-MAX_CHAT_HISTORY_MESSAGES);
        
        // Check size and trim if needed
        let jsonString = JSON.stringify(recentMessages);
        if (jsonString.length > MAX_CHAT_HISTORY_SIZE) {
            // Reduce message count until size is acceptable
            while (jsonString.length > MAX_CHAT_HISTORY_SIZE && recentMessages.length > 5) {
                recentMessages = recentMessages.slice(1);
                jsonString = JSON.stringify(recentMessages);
            }
        }
        
        localStorage.setItem(key, jsonString);
    } catch (error: any) {
        console.error('Failed to save chat history:', error);
        // If storage quota exceeded, clear old history
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            try {
                const key = panelId ? `${CHAT_HISTORY_KEY}_${panelId}` : CHAT_HISTORY_KEY;
                // Keep only last 10 messages
                const minimalMessages = messages.slice(-10);
                localStorage.setItem(key, JSON.stringify(minimalMessages));
            } catch (e) {
                console.error('Failed to recover from storage quota error:', e);
            }
        }
    }
};

// Generate chatbot response
export const generateChatbotResponse = async (
    userMessage: string,
    context: ChatbotContext,
    panelId?: string
): Promise<{ response: string; shouldUpdateFilters?: any; explanation?: string }> => {
    try {
        const knowledgeBase = loadKnowledgeBase();
        const chatHistory = loadChatHistory(panelId);
        
        // Build context prompt with currently selected events
        const selectedEventIds = context.currentFilters?.events || [];
        const selectedEvents = context.availableOptions?.events.filter((e: any) => selectedEventIds.includes(e.id)) || [];
        const selectedEventNames = selectedEvents.map((e: any) => e.name).join(', ');

        const contextInfo = `
Current Dashboard Context:
- Panel: ${context.panelName || 'Main Panel'}
- Metric Type: ${context.metricType || 'count'}
- Graph Type: ${context.panelGraphType || 'line'}
- Date Range: ${context.currentDateRange?.from.toLocaleDateString()} to ${context.currentDateRange?.to.toLocaleDateString()}
- Current Filters:
  * Platforms: ${context.currentFilters?.platforms?.length || 0} selected
  * POS: ${context.currentFilters?.pos?.length || 0} selected
  * Sources: ${context.currentFilters?.sources?.length || 0} selected
  * Events: ${selectedEventIds.length || 0} selected ${selectedEventIds.length > 0 ? `(${selectedEventNames})` : ''}

Current Graph Config (only relevant if graph type is percentage/funnel/user_flow):
- percentageConfig: ${JSON.stringify(context.panelGraphConfig?.percentageConfig || null)}
- funnelConfig: ${JSON.stringify(context.panelGraphConfig?.funnelConfig || null)}
- userFlowConfig: ${JSON.stringify(context.panelGraphConfig?.userFlowConfig || null)}

Currently Selected Events (use these if user's query is vague):
${selectedEventIds.length > 0 ? selectedEvents.map((e: any) => `- ${e.name} (ID: ${e.id})`).join('\n') : '- None selected - select all available events'}

Available Options:
- Platforms: ${context.availableOptions?.platforms.map((p: any) => `${p.name} (${p.id})`).join(', ') || 'N/A'}
- POS: ${context.availableOptions?.pos.map((p: any) => `${p.name} (${p.id})`).join(', ') || 'N/A'}
- Sources: ${Array.isArray(context.availableOptions?.sources) ? context.availableOptions.sources.map((s: any) => typeof s === 'object' ? `${s.name || s.id}` : s).join(', ') : 'N/A'}
- Events: ${context.availableOptions?.events.map((e: any) => `${e.name} (${e.id})`).join(', ') || 'N/A'}
`;

        const systemPrompt = `You are an intelligent dashboard assistant for Buyhatke Analytics. Your role is to:
1. Answer questions about the dashboard data, filters, and analytics
2. IMMEDIATELY adjust filters based on user queries - NO CONFIRMATION NEEDED
3. Provide insights about the data
4. Only answer questions relevant to the dashboard - politely decline off-topic questions

${knowledgeBase ? `\nKnowledge Base:\n${knowledgeBase}\n` : ''}

CRITICAL RULES - READ CAREFULLY:
- TAKE IMMEDIATE ACTION - Never ask for confirmation or say "Here's what I'll do" or "Please confirm"
- When user asks to see data/insights/stats, INSTANTLY apply the filter changes and report what you did
- Be decisive and action-oriented - users want instant results, not permission requests
- ALWAYS return the shouldUpdateFilters JSON when filters need changing

FILTER RESET LOGIC - EXTREMELY IMPORTANT:
- **POS/SITE**: If NOT mentioned in query, set to [] (empty = ALL sites). Don't carry over previous POS filters.
- **PLATFORMS**: If NOT mentioned, set to [] (empty = ALL platforms). Don't carry over.
- **SOURCES**: If NOT mentioned, set to [] (empty = ALL sources). Don't carry over.
- Only keep previous filters if user explicitly refers to them (e.g., "show same data for yesterday")
- Each query should be independent unless context clearly indicates continuation

EVENT SELECTION INTELLIGENCE:
- **SPECIFIC EVENT MENTIONS**: If user mentions specific event (e.g., "self update", "checkout", "price alert"), select ONLY that event
  * "self update" / "shelf update" → Select only PA_SELF_UPDATED or SELF_UPDATE events
  * "success" / "successful" → Select only events with "success" or "SUCCESS" in name
  * "error" / "failure" → Select only events with "error", "ERROR", "failure", "FAIL" in name
  * "checkout" → Select only checkout-related events
  * "price alert" / "price drop" → Select only price alert events
- **VAGUE QUERIES**: If NO specific event mentioned, use currently selected events from context
- **"ALL" KEYWORD**: Only select ALL available events if user explicitly says "all events" or "everything"
- Use intelligent semantic matching: "kitne updates hue" = select update events only

PLATFORM-AWARE EVENT RESOLUTION (VERY IMPORTANT):
- Event names can represent the SAME concept across platforms but use different naming styles, e.g. "checkoutSuccess" (extension/web) vs "CHECKOUT_SUCCESS" (mobile/app).
- If the user mentions platform scope (e.g. "chrome extension", "android", "ios", "mobile", "web") OR you set platforms in shouldUpdateFilters:
  1) Choose event IDs that match the user's intent AND exist for those platforms.
  2) If multiple variants of the same concept exist across the chosen platforms, include ALL relevant variants.
  3) Avoid selecting variants that clearly belong to other platforms when the user asked for a specific platform.
- If platforms are not specified (platforms: [] means ALL), include ALL strong variants of the same concept (camelCase + SNAKE_CASE etc.) so data isn't missed.
- Use the provided Platforms list (IDs + names) and Events list (IDs + names). You must return ONLY event IDs from the available list.

SPECIAL GRAPH CONFIG UPDATES:
- Prefer using the CURRENT Graph Type from context unless the user explicitly asks to switch graph type.
- If the current graph type is:
  * percentage: update percentageConfig.parentEvents and percentageConfig.childEvents when the user asks to change numerator/denominator.
  * funnel: update funnelConfig.stages and funnelConfig.multipleChildEvents.
  * user_flow: update userFlowConfig.stages (label + eventIds).
- You may also set shouldUpdateFilters.graphType to switch graph type if explicitly requested.

FUNNEL RULES (VERY IMPORTANT):
- Prefer funnelConfig over dumping lots of events.
- funnelConfig.stages MUST be an ORDERED list of the main steps (these map to e1, e2, e3... in the UI).
- funnelConfig.multipleChildEvents should ONLY be used for the final grouped stage (if needed), not every event in the flow.
- Keep shouldUpdateFilters.events empty or small (<= 10). Do NOT return dozens of events.

- Be concise, helpful, and professional
- Use the context provided to give accurate answers
- If you don't know something, say so honestly

**CRITICAL - JSON RESPONSE FORMAT (MANDATORY)**:
When user asks to change filters or see specific data, you MUST respond with VALID JSON in this EXACT format:

{
  "response": "✅ Applied filters: Showing all sites data for SELF_UPDATE events over last 6 days.",
  "shouldUpdateFilters": {
    "platforms": [],
    "pos": [],
    "sources": [],
    "events": [101],
    "graphType": "line",
    "percentageConfig": { "parentEvents": [201], "childEvents": [202] },
    "funnelConfig": { "stages": [{ "eventId": 301 }, { "eventId": 302 }], "multipleChildEvents": [303] },
    "userFlowConfig": { "stages": [{ "label": "Step 1", "eventIds": [401, 402] }] },
    "dateRange": {
      "from": "2026-01-20T00:00:00.000Z",
      "to": "2026-01-26T00:00:00.000Z"
    }
  },
  "explanation": "Showing all sites, SELF_UPDATE events only, last 6 days"
}

**EXAMPLES OF CORRECT JSON RESPONSES**:
User: "flipkart ke stats"
Response:
{
  "response": "✅ Showing Flipkart data for currently selected events.",
  "shouldUpdateFilters": {
    "pos": [2]
  }
}

User: "last 6 days me kitne updates"
Response:
{
  "response": "✅ Showing all sites data for update events over last 6 days.",
  "shouldUpdateFilters": {
    "pos": [],
    "events": [update_event_ids_only],
    "dateRange": {
      "from": "2026-01-20T00:00:00.000Z",
      "to": "2026-01-26T00:00:00.000Z"
    }
  }
}

User: "show me nykaa, myntra, and flipkart for last 12 days"
Response:
{
  "response": "✅ Applied filters: Showing Nykaa, Myntra, and Flipkart data for CHECKOUT_SUCCESS events over the last 12 days.",
  "shouldUpdateFilters": {
    "pos": [1830, 111, 2],
    "dateRange": {
      "from": "2026-01-14T00:00:00.000Z",
      "to": "2026-01-26T00:00:00.000Z"
    }
  }
}

**MANDATORY RULES**:
- ALWAYS return valid JSON object, not plain text
- ALWAYS include "shouldUpdateFilters" when changing filters
- NEVER say "Please confirm" or ask permission
- Match site names to exact POS IDs from available options
- For special graphs, return percentageConfig/funnelConfig/userFlowConfig only when you are changing them.
- Return ONLY the JSON object, nothing before or after

Otherwise, just respond naturally with helpful information.`;

        // Build conversation history for Gemini API
        const conversationHistory = chatHistory.slice(-10).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        // Build the full prompt with system instructions
        const systemMessage = `${systemPrompt}\n\n${contextInfo}`;
        
        // Create contents array with system message and conversation history
        const contents = [
            { role: 'user', parts: [{ text: systemMessage }] },
            { role: 'model', parts: [{ text: 'I understand. I\'m ready to help with dashboard questions and filter adjustments.' }] },
            ...conversationHistory,
            { role: 'user', parts: [{ text: userMessage }] }
        ];

        // IMPORTANT:
        // Always use server-side proxy for chatbot (both dev + prod) to avoid leaking API keys
        // and to reduce failures from quota/CORS in local dev.
        const envProxyUrl = (import.meta as any)?.env?.VITE_CHATBOT_PROXY_URL as string | undefined;

        // IMPORTANT:
        // Do NOT attempt cross-origin fallbacks here. If a user is on a different deployment/domain,
        // cross-origin POST will fail due to CORS and AI chat will "work for some users" and not others.
        // Instead:
        // - default to same-origin /api/analyze
        // - allow an explicit proxy override via VITE_CHATBOT_PROXY_URL
        const proxyCandidates = [envProxyUrl, '/api/analyze'].filter(Boolean);

        let result: any = null;
        let lastError: any = null;

        for (const proxyUrl of proxyCandidates) {
            try {
                const response = await fetch(proxyUrl!, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mode: 'chatbot',
                        userMessage,
                        context: {
                            systemPrompt,
                            contextInfo,
                            conversationHistory,
                            currentFilters: context.currentFilters || {},
                            currentDateRange: context.currentDateRange
                                ? {
                                    from: context.currentDateRange.from?.toISOString?.() || context.currentDateRange.from,
                                    to: context.currentDateRange.to?.toISOString?.() || context.currentDateRange.to,
                                }
                                : undefined
                        }
                    })
                });

                if (!response.ok) {
                    let details = '';
                    try {
                        const errJson = await response.json();
                        details = errJson?.details || errJson?.error || JSON.stringify(errJson);
                    } catch {
                        try {
                            details = await response.text();
                        } catch {
                            details = '';
                        }
                    }
                    const hint = response.status === 404
                        ? ' (Hint: /api/analyze route not deployed on this domain)'
                        : response.status === 500
                            ? ' (Hint: server missing GEMINI_API_KEY(S) env vars)'
                            : '';
                    throw new Error(`Proxy Error (${proxyUrl}) ${response.status}: ${details || response.statusText}${hint}`);
                }

                result = await response.json();
                break;
            } catch (e) {
                lastError = e;
            }
        }

        // DEV-only fallback:
        // If /api/analyze isn't available locally (or missing server GEMINI env vars), fall back to
        // calling Gemini directly using VITE_GEMINI_API_KEY(S) from the developer's machine.
        // This avoids breaking local dev flows while still keeping prod server-side.
        if (!result) {
            const isDev = (import.meta as any)?.env?.DEV === true;
            if (isDev && API_KEYS.length > 0) {
                const historyText = chatHistory.slice(-10)
                    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
                    .join('\n');

                const directPrompt = `${systemMessage}\n\nConversation History:\n${historyText || '(none)'}\n\nUser: ${userMessage}\n\nCRITICAL: Return ONLY a valid JSON object matching the schema described above. Do not include any extra text.`;

                const direct = await callGeminiAPI(directPrompt, {
                    temperature: 0.2,
                    maxOutputTokens: 1000,
                    response_mime_type: 'application/json'
                });

                const directText = direct?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!directText) throw lastError || new Error('DEV Gemini fallback returned no content');

                try {
                    result = JSON.parse(String(directText));
                } catch {
                    // Try to extract first JSON object in case of stray text
                    const m = String(directText).match(/\{[\s\S]*\}/);
                    if (m) {
                        result = JSON.parse(m[0]);
                    } else {
                        throw lastError || new Error('DEV Gemini fallback returned invalid JSON');
                    }
                }
            } else {
                throw lastError || new Error('Proxy Error: Failed to call chatbot proxy');
            }
        }

        const normalizeForMatch = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

        const inferLastNDaysRange = (): { from: string; to: string } | null => {
            const msg = (userMessage || '').toLowerCase();
            const m = msg.match(/\b(last|past)\s+(\d+)\s+days?\b/);
            if (!m) return null;
            const n = Number(m[2]);
            if (!Number.isFinite(n) || n <= 0) return null;

            const contextTo = context.currentDateRange?.to
                ? new Date(context.currentDateRange.to)
                : new Date();
            const to = new Date(contextTo.getTime());
            const from = new Date(contextTo.getTime() - n * 24 * 60 * 60 * 1000);

            return { from: from.toISOString(), to: to.toISOString() };
        };

        const findEventIdByName = (needle: string): number | null => {
            const events = context.availableOptions?.events || [];
            const target = needle.trim().toLowerCase();
            const exact = events.find(e => String(e.name || '').trim().toLowerCase() === target);
            if (exact) return Number(exact.id);

            const partial = events.find(e => String(e.name || '').trim().toLowerCase().includes(target));
            if (partial) return Number(partial.id);

            return null;
        };

        const applySpendFlowDefaults = (shouldUpdateFilters: any) => {
            const msgNorm = normalizeForMatch(userMessage);
            if (!msgNorm.includes('flow')) return;

            const requestedGraphType = ((): 'funnel' | 'user_flow' | 'percentage' | null => {
                if (msgNorm.includes('userflow') || (msgNorm.includes('user') && msgNorm.includes('flow'))) return 'user_flow';
                if (msgNorm.includes('funnel') || msgNorm.includes('conversion')) return 'funnel';
                if (msgNorm.includes('percentage') || msgNorm.includes('ratio')) return 'percentage';
                return null;
            })();

            const effectiveGraphType: any =
                shouldUpdateFilters?.graphType ||
                requestedGraphType ||
                context?.panelGraphType ||
                null;

            if (requestedGraphType && !shouldUpdateFilters?.graphType) {
                shouldUpdateFilters.graphType = requestedGraphType;
            }

            // Infer a primary flow keyword from the message: "<keyword> flow" / "flow for <keyword>"
            // This is a *fallback* repair step only; the model is still the primary source of intent.
            const rawMsg = (userMessage || '').toLowerCase();
            const kwFromA = rawMsg.match(/\b([a-z0-9_\-]{3,})\s+flow\b/);
            const kwFromB = rawMsg.match(/\bflow\s+for\s+([a-z0-9_\-]{3,})\b/);
            const flowKeywordRaw = (kwFromA?.[1] || kwFromB?.[1] || '').trim();
            const flowKeyword = normalizeForMatch(flowKeywordRaw);
            const stopTokens = new Set(['user', 'users', 'funnel', 'conversion', 'graph', 'flow']);

            const preferredTokens = [
                'spend',
                'checkout',
                'pricealert',
                'price',
                'coupon',
                'cart',
                'payment',
                'login',
                'signup',
            ];

            const preferredFromMessage = preferredTokens.find((t) => msgNorm.includes(t)) || '';
            const flowToken =
                preferredFromMessage ||
                (!stopTokens.has(flowKeyword) ? flowKeyword : '');
            if (!flowToken) return;

            const findEventIdByKeywords = (keywords: string[]): number | null => {
                const events = context.availableOptions?.events || [];
                let best: { id: number; score: number } | null = null;

                for (const e of events) {
                    const name = String(e.name || '').toLowerCase();
                    const n = normalizeForMatch(name);
                    if (!n) continue;

                    // Require flow token to reduce accidental matches
                    if (!n.includes(flowToken)) continue;

                    let score = 0;
                    for (const k of keywords) {
                        const kn = normalizeForMatch(k);
                        if (!kn) continue;
                        if (n.includes(kn)) score += 10;
                    }
                    if (score <= 0) continue;

                    // Prefer shorter names (more specific) when scores tie
                    score += Math.max(0, 20 - Math.min(20, n.length / 3));

                    const id = Number((e as any).id);
                    if (!Number.isFinite(id)) continue;
                    if (!best || score > best.score) {
                        best = { id, score };
                    }
                }

                return best?.id ?? null;
            };

            const shownId = findEventIdByKeywords(['shown', 'view', 'start', 'open']);
            const clickedId = findEventIdByKeywords(['clicked', 'click', 'tap']);
            const successId = findEventIdByKeywords(['success', 'successful']);
            const failedId = findEventIdByKeywords(['failed', 'fail', 'error']);
            const zeroId = findEventIdByKeywords(['zero']);

            const coreEvents = [shownId, clickedId, successId, failedId, zeroId]
                .filter((v): v is number => typeof v === 'number' && !isNaN(v));

            const graphType = effectiveGraphType;

            if (graphType === 'funnel') {
                const stages = Array.isArray(shouldUpdateFilters?.funnelConfig?.stages)
                    ? shouldUpdateFilters.funnelConfig.stages
                    : [];

                if (stages.length < 2) {
                    const stageEventIds = [shownId, clickedId]
                        .filter((v): v is number => typeof v === 'number' && !isNaN(v));

                    if (stageEventIds.length >= 2) {
                        shouldUpdateFilters.funnelConfig = {
                            ...(shouldUpdateFilters.funnelConfig || {}),
                            stages: stageEventIds.map((id) => ({ eventId: id })),
                            multipleChildEvents: [successId, zeroId]
                                .filter((v): v is number => typeof v === 'number' && !isNaN(v)),
                        };
                    }
                }

                if (Array.isArray(shouldUpdateFilters?.events) && shouldUpdateFilters.events.length > 10 && coreEvents.length > 0) {
                    shouldUpdateFilters.events = coreEvents;
                }
            }

            if (graphType === 'user_flow') {
                const stages = Array.isArray(shouldUpdateFilters?.userFlowConfig?.stages)
                    ? shouldUpdateFilters.userFlowConfig.stages
                    : [];

                if (stages.length < 2) {
                    const builtStages = [
                        { label: 'Shown', eventIds: shownId ? [shownId] : [] },
                        { label: 'Clicked', eventIds: clickedId ? [clickedId] : [] },
                        {
                            label: 'Outcome',
                            eventIds: [successId, zeroId, failedId]
                                .filter((v): v is number => typeof v === 'number' && !isNaN(v)),
                        },
                    ].filter(s => (s.eventIds || []).length > 0);

                    if (builtStages.length >= 2) {
                        shouldUpdateFilters.userFlowConfig = {
                            ...(shouldUpdateFilters.userFlowConfig || {}),
                            stages: builtStages,
                        };
                    }
                }

                if (Array.isArray(shouldUpdateFilters?.events) && shouldUpdateFilters.events.length > 10 && coreEvents.length > 0) {
                    shouldUpdateFilters.events = coreEvents;
                }
            }

            if (graphType === 'percentage') {
                const wantsSuccessOutOfRegistered =
                    msgNorm.includes('percentage') &&
                    msgNorm.includes('success') &&
                    (msgNorm.includes('outof') || msgNorm.includes('ratio')) &&
                    (msgNorm.includes('registered') || msgNorm.includes('clicked'));

                if (wantsSuccessOutOfRegistered && clickedId && successId) {
                    shouldUpdateFilters.percentageConfig = {
                        parentEvents: [clickedId],
                        childEvents: [successId],
                    };

                    if (Array.isArray(shouldUpdateFilters?.events)) {
                        shouldUpdateFilters.events = [clickedId, successId];
                    }
                }
            }
        };

        const getPosNameVariants = (name: string): string[] => {
            const variants = new Set<string>();
            const raw = (name || '').trim();
            if (!raw) return [];

            variants.add(normalizeForMatch(raw));

            const withoutNumericParens = raw.replace(/\(\s*\d+\s*\)/g, '').trim();
            if (withoutNumericParens) variants.add(normalizeForMatch(withoutNumericParens));

            const withoutTrailingNumericParens = raw.replace(/\s*\(\s*\d+\s*\)\s*$/g, '').trim();
            if (withoutTrailingNumericParens) variants.add(normalizeForMatch(withoutTrailingNumericParens));

            return Array.from(variants).filter(v => v.length >= 3);
        };

        const inferPosFromMessage = (): { pos: number[]; shouldForceReset: boolean } | null => {
            const posOptions = context.availableOptions?.pos;
            if (!posOptions || posOptions.length === 0) return null;

            const msg = normalizeForMatch(userMessage);

            const isContinuation =
                msg.includes('same') ||
                msg.includes('previous') ||
                msg.includes('again') ||
                msg.includes('continue') ||
                msg.includes('asbefore') ||
                msg.includes('previously');

            if (
                msg.includes('allsites') ||
                msg.includes('allsite') ||
                msg.includes('overall') ||
                msg.includes('allpos')
            ) {
                return { pos: [], shouldForceReset: true };
            }

            const matches: Array<{ id: number; len: number }> = [];
            for (const pos of posOptions) {
                const variants = getPosNameVariants(pos.name);
                for (const v of variants) {
                    if (v.length < 5) continue;
                    if (msg.includes(v)) {
                        matches.push({ id: pos.id, len: v.length });
                    }
                }
            }

            if (matches.length === 0) {
                // No site mentioned: default to ALL sites (reset POS) unless user clearly continues previous context
                if (isContinuation) return null;
                return { pos: [], shouldForceReset: true };
            }

            matches.sort((a, b) => b.len - a.len);
            return { pos: Array.from(new Set(matches.map(m => m.id))), shouldForceReset: false };
        };

        // Proxy already returns parsed response
        let parsedResponse: any = result;
        if (typeof parsedResponse === 'string') {
            parsedResponse = { response: parsedResponse };
        }
        if (!parsedResponse?.response && typeof parsedResponse?.text === 'string') {
            parsedResponse = { response: parsedResponse.text };
        }

        const inferredPos = inferPosFromMessage();
        const hasExplicitPos =
            !!parsedResponse?.shouldUpdateFilters &&
            Object.prototype.hasOwnProperty.call(parsedResponse.shouldUpdateFilters, 'pos');

        // Only use client-side POS inference as a LAST RESORT when the model/proxy did not provide pos at all.
        // Never override an explicit model decision (including pos: [] meaning "all sites").
        if (inferredPos !== null && !hasExplicitPos) {
            parsedResponse = {
                ...parsedResponse,
                shouldUpdateFilters: {
                    ...(parsedResponse?.shouldUpdateFilters || {}),
                    pos: inferredPos.pos,
                }
            };
        }

        // If the model provided POS but it clearly disagrees with a high-confidence local match, correct it.
        // Example: message contains "myntra" but model selects Nykaa.
        if (
            inferredPos !== null &&
            hasExplicitPos &&
            inferredPos.pos.length > 0 &&
            Array.isArray(parsedResponse?.shouldUpdateFilters?.pos) &&
            parsedResponse.shouldUpdateFilters.pos.length > 0
        ) {
            const modelPos = parsedResponse.shouldUpdateFilters.pos
                .map((v: any) => Number(v))
                .filter((n: number) => !isNaN(n));
            const inferredSet = new Set(inferredPos.pos);
            const modelSet = new Set(modelPos);

            const inferredMissingInModel = inferredPos.pos.some((id: number) => !modelSet.has(id));
            const modelHasExtra = modelPos.some((id: number) => !inferredSet.has(id));

            if (inferredMissingInModel && modelHasExtra) {
                parsedResponse = {
                    ...parsedResponse,
                    shouldUpdateFilters: {
                        ...(parsedResponse?.shouldUpdateFilters || {}),
                        pos: inferredPos.pos,
                    },
                };
            }
        }

        // Date range repair for "last N days".
        const inferredRange = inferLastNDaysRange();
        if (inferredRange && parsedResponse?.shouldUpdateFilters) {
            const modelRange = parsedResponse.shouldUpdateFilters.dateRange;
            const modelTo = modelRange?.to ? new Date(modelRange.to) : null;
            const ctxTo = context.currentDateRange?.to ? new Date(context.currentDateRange.to) : null;

            const shouldOverride =
                !modelRange ||
                !modelTo ||
                isNaN(modelTo.getTime()) ||
                (ctxTo && Math.abs(modelTo.getTime() - ctxTo.getTime()) > 36 * 60 * 60 * 1000);

            if (shouldOverride) {
                parsedResponse = {
                    ...parsedResponse,
                    shouldUpdateFilters: {
                        ...(parsedResponse.shouldUpdateFilters || {}),
                        dateRange: inferredRange,
                    },
                };
            }
        }

        // Spend flow defaults: prevent empty funnel/user flow when switching graph type via chat.
        if (parsedResponse?.shouldUpdateFilters) {
            applySpendFlowDefaults(parsedResponse.shouldUpdateFilters);
        }

        // Save to chat history
        const newMessages: ChatMessage[] = [
            ...chatHistory,
            { role: 'user', content: userMessage, timestamp: Date.now() },
            { role: 'assistant', content: parsedResponse.response, timestamp: Date.now() }
        ];
        saveChatHistory(newMessages, panelId);

        return parsedResponse;
    } catch (error: any) {
        console.error('Chatbot response generation failed:', error);
        throw new Error(error.message || 'Failed to generate response');
    }
};

// Update knowledge base periodically
export const updateKnowledgeBase = async (recentQuestions: string[], recentAnswers: string[]): Promise<void> => {
    try {
        const currentKnowledge = loadKnowledgeBase();
        
        const prompt = `You are maintaining a knowledge base for a dashboard chatbot. 

Current Knowledge Base:
${currentKnowledge || 'Empty - starting fresh'}

Recent Q&A pairs:
${recentQuestions.map((q, i) => `Q: ${q}\nA: ${recentAnswers[i] || 'N/A'}`).join('\n\n')}

Update the knowledge base with:
1. Important patterns from recent questions
2. Common user intents
3. Dashboard-specific terminology
4. Filter adjustment patterns

Keep it concise (max 500 words). Return only the updated knowledge base text, no explanations.`;

        const result = await callGeminiAPI(prompt, {
            temperature: 0.3,
            maxOutputTokens: 800,
        });

        const updatedKnowledge = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (updatedKnowledge) {
            saveKnowledgeBase(updatedKnowledge.trim());
        }
    } catch (error) {
        console.error('Failed to update knowledge base:', error);
    }
};
