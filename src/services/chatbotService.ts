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
- Date Range: ${context.currentDateRange?.from.toLocaleDateString()} to ${context.currentDateRange?.to.toLocaleDateString()}
- Current Filters:
  * Platforms: ${context.currentFilters?.platforms?.length || 0} selected
  * POS: ${context.currentFilters?.pos?.length || 0} selected
  * Sources: ${context.currentFilters?.sources?.length || 0} selected
  * Events: ${selectedEventIds.length || 0} selected ${selectedEventIds.length > 0 ? `(${selectedEventNames})` : ''}

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
        const isLocalhost =
            typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

        const proxyCandidates = [
            envProxyUrl,
            '/api/analyze',
            // Only try cross-origin fallback when not on localhost to avoid CORS failures in dev
            ...(isLocalhost ? [] : ['https://dashboard-combined.vercel.app/api/analyze']),
        ].filter(Boolean);

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
                            conversationHistory
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
                    throw new Error(`Proxy Error (${proxyUrl}) ${response.status}: ${details || response.statusText}`);
                }

                result = await response.json();
                break;
            } catch (e) {
                lastError = e;
            }
        }

        if (!result) {
            throw lastError || new Error('Proxy Error: Failed to call chatbot proxy');
        }

        const normalizeForMatch = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

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
                const nameNorm = normalizeForMatch(pos.name);
                if (nameNorm.length < 5) continue;
                if (msg.includes(nameNorm)) {
                    matches.push({ id: pos.id, len: nameNorm.length });
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
        if (inferredPos !== null) {
            parsedResponse = {
                ...parsedResponse,
                shouldUpdateFilters: {
                    ...(parsedResponse?.shouldUpdateFilters || {}),
                    pos: parsedResponse?.shouldUpdateFilters?.pos ?? inferredPos.pos,
                }
            };
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
