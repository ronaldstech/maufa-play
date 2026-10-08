import axios from 'axios';

export const GROQ_API_URL = '/api/groq/chat/completions';
export const GROQ_MODEL = 'openai/gpt-oss-120b';

export const API_KEY = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_GROK_API_KEY;

/** Optional proxy used to read linked documents (e.g. `https://r.jina.ai/`). */
export const FETCH_PROXY_URL = import.meta.env.VITE_FETCH_PROXY_URL || '';

export const requireApiKey = () => {
    if (!API_KEY) {
        throw new Error("API key is missing. Please set VITE_GROQ_API_KEY in your .env file.");
    }
};

/** Tolerant JSON parsing: strips fences and prose around the object. */
export const parseJsonLoose = (raw) => {
    if (typeof raw !== 'string') return raw;

    const trimmed = raw.trim();
    try {
        return JSON.parse(trimmed);
    } catch {
        const start = trimmed.indexOf('{');
        const end = trimmed.lastIndexOf('}');
        if (start !== -1 && end > start) {
            return JSON.parse(trimmed.slice(start, end + 1));
        }
        throw new Error("AI returned invalid JSON format.");
    }
};

const request = async (payload) => {
    const response = await axios.post(
        GROQ_API_URL,
        { model: GROQ_MODEL, ...payload },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            }
        }
    );

    return response.data.choices[0].message.content;
};

const toApiError = (error, fallback) => {
    if (error.response) {
        return new Error(`API Error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
    }
    return new Error(error.message || fallback);
};

/**
 * Asks the model for a JSON object and parses it.
 *
 * @param {string} systemPrompt
 * @param {string|Array<{role: string, content: string}>} userContent
 * @param {{temperature?: number, maxTokens?: number}} options
 */
export const askJson = async (systemPrompt, userContent, { temperature = 0.5, maxTokens = 2600 } = {}) => {
    requireApiKey();

    const messages = typeof userContent === 'string'
        ? [{ role: 'user', content: userContent }]
        : userContent;

    try {
        const raw = await request({
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            temperature,
            max_tokens: maxTokens,
            response_format: { type: "json_object" }
        });

        return parseJsonLoose(raw);
    } catch (error) {
        console.error('Groq JSON request failed:', error);
        throw toApiError(error, 'The AI could not complete that request.');
    }
};

/**
 * Asks the model for plain text (markdown allowed).
 *
 * @param {string} systemPrompt
 * @param {string|Array<{role: string, content: string}>} userContent
 * @param {{temperature?: number, maxTokens?: number}} options
 */
export const askText = async (systemPrompt, userContent, { temperature = 0.6, maxTokens = 1400 } = {}) => {
    requireApiKey();

    const messages = typeof userContent === 'string'
        ? [{ role: 'user', content: userContent }]
        : userContent;

    try {
        const raw = await request({
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            temperature,
            max_tokens: maxTokens
        });

        return typeof raw === 'string' ? raw.trim() : String(raw);
    } catch (error) {
        console.error('Groq text request failed:', error);
        throw toApiError(error, 'The AI could not complete that request.');
    }
};