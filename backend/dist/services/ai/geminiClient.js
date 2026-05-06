"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEMINI_FALLBACK_RESPONSE = exports.GEMINI_CACHE_TTL_MS = exports.GEMINI_MAX_ATTEMPTS = exports.GEMINI_RETRY_DELAY_MS = exports.GEMINI_TIMEOUT_MS = exports.GEMINI_MODEL_NAME = void 0;
exports.getGeminiApiKey = getGeminiApiKey;
exports.getGeminiClient = getGeminiClient;
exports.getGeminiModel = getGeminiModel;
exports.generateGeminiText = generateGeminiText;
const generative_ai_1 = require("@google/generative-ai");
exports.GEMINI_MODEL_NAME = 'gemini-1.5-flash';
exports.GEMINI_TIMEOUT_MS = 8000;
exports.GEMINI_RETRY_DELAY_MS = 500;
exports.GEMINI_MAX_ATTEMPTS = 2;
exports.GEMINI_CACHE_TTL_MS = 5 * 60 * 1000;
exports.GEMINI_FALLBACK_RESPONSE = {
    success: false,
    error: 'AI temporarily unavailable',
    data: {
        message: "Let's continue your interview. Tell me about yourself.",
    },
};
let genAI = null;
const geminiPromptCache = new Map();
const sleep = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
const getCachedGeminiResponse = (prompt) => {
    const cached = geminiPromptCache.get(prompt);
    if (!cached) {
        return null;
    }
    if (cached.expiresAt <= Date.now()) {
        geminiPromptCache.delete(prompt);
        return null;
    }
    return cached.value;
};
const setCachedGeminiResponse = (prompt, value) => {
    geminiPromptCache.set(prompt, {
        value,
        expiresAt: Date.now() + exports.GEMINI_CACHE_TTL_MS,
    });
};
function getGeminiApiKey() {
    var _a;
    const apiKey = (_a = process.env.GEMINI_API_KEY) === null || _a === void 0 ? void 0 : _a.trim();
    if (!apiKey) {
        throw new Error('Missing GEMINI_API_KEY. Set GEMINI_API_KEY in the backend environment before calling Gemini.');
    }
    return apiKey;
}
function getGeminiClient() {
    if (!genAI) {
        genAI = new generative_ai_1.GoogleGenerativeAI(getGeminiApiKey());
    }
    return genAI;
}
function getGeminiModel(modelName = exports.GEMINI_MODEL_NAME, timeoutMs = exports.GEMINI_TIMEOUT_MS) {
    return getGeminiClient().getGenerativeModel({ model: modelName }, { timeout: timeoutMs });
}
function generateGeminiText(prompt_1) {
    return __awaiter(this, arguments, void 0, function* (prompt, options = {}) {
        const { label = 'Gemini request', modelName = exports.GEMINI_MODEL_NAME, timeoutMs = exports.GEMINI_TIMEOUT_MS, } = options;
        const trimmedPrompt = prompt.trim();
        if (!trimmedPrompt) {
            throw new Error(`${label} requires a non-empty prompt.`);
        }
        const cachedResponse = getCachedGeminiResponse(prompt);
        if (cachedResponse) {
            console.info(`[Gemini] ${label} cache hit.`);
            return cachedResponse;
        }
        let lastError;
        for (let attempt = 1; attempt <= exports.GEMINI_MAX_ATTEMPTS; attempt += 1) {
            try {
                const model = getGeminiModel(modelName, timeoutMs);
                const result = yield model.generateContent(prompt, { timeout: timeoutMs });
                const text = result.response.text().trim();
                if (!text) {
                    throw new Error(`${label} returned an empty response.`);
                }
                setCachedGeminiResponse(prompt, text);
                return text;
            }
            catch (error) {
                lastError = error;
                if (attempt < exports.GEMINI_MAX_ATTEMPTS) {
                    console.warn(`[Gemini] ${label} attempt ${attempt}/${exports.GEMINI_MAX_ATTEMPTS} failed. Retrying in ${exports.GEMINI_RETRY_DELAY_MS}ms.`, error);
                    yield sleep(exports.GEMINI_RETRY_DELAY_MS);
                    continue;
                }
                console.error(`[Gemini] ${label} failed after ${exports.GEMINI_MAX_ATTEMPTS} attempts.`, error);
            }
        }
        throw lastError instanceof Error ? lastError : new Error(`${label} failed.`);
    });
}
