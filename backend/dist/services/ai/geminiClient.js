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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEMINI_FALLBACK_RESPONSE = exports.GEMINI_CACHE_TTL_MS = exports.GEMINI_MAX_ATTEMPTS = exports.GEMINI_RETRY_DELAY_MS = exports.GEMINI_TIMEOUT_MS = exports.OPENROUTER_BASE_URL = exports.OPENROUTER_GEMINI_MODEL_NAME = exports.GEMINI_MODEL_NAME = void 0;
exports.getGeminiApiKey = getGeminiApiKey;
exports.getGeminiClient = getGeminiClient;
exports.getOpenRouterClient = getOpenRouterClient;
exports.getGeminiModel = getGeminiModel;
exports.generateGeminiText = generateGeminiText;
const generative_ai_1 = require("@google/generative-ai");
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("../../utils/logger");
exports.GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash';
exports.OPENROUTER_GEMINI_MODEL_NAME = process.env.OPENROUTER_GEMINI_MODEL_NAME || 'google/gemini-2.0-flash-001';
exports.OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
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
let openRouterClient = null;
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
function getConfiguredProvider() {
    var _a, _b, _c;
    const provider = (_a = process.env.GEMINI_PROVIDER) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
    if (provider === 'openrouter') {
        return 'openrouter';
    }
    if (provider === 'google') {
        return 'google';
    }
    const openRouterKey = (_b = process.env.OPENROUTER_API_KEY) === null || _b === void 0 ? void 0 : _b.trim();
    const geminiKey = (_c = process.env.GEMINI_API_KEY) === null || _c === void 0 ? void 0 : _c.trim();
    if (openRouterKey || (geminiKey === null || geminiKey === void 0 ? void 0 : geminiKey.startsWith('sk-or-'))) {
        return 'openrouter';
    }
    return 'google';
}
function getGoogleGeminiApiKey() {
    var _a;
    const apiKey = (_a = process.env.GEMINI_API_KEY) === null || _a === void 0 ? void 0 : _a.trim();
    if (!apiKey) {
        throw new Error('Missing GEMINI_API_KEY. Set GEMINI_API_KEY in the backend environment before calling Google Gemini.');
    }
    return apiKey;
}
function getOpenRouterApiKey() {
    var _a;
    const apiKey = (_a = (process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY)) === null || _a === void 0 ? void 0 : _a.trim();
    if (!apiKey) {
        throw new Error('Missing OPENROUTER_API_KEY. Set OPENROUTER_API_KEY or an OpenRouter sk-or-* GEMINI_API_KEY before calling OpenRouter.');
    }
    if (!apiKey.startsWith('sk-or-')) {
        throw new Error('OpenRouter provider is selected, but the configured API key is not an sk-or-* key.');
    }
    return apiKey;
}
function getGeminiApiKey() {
    return getConfiguredProvider() === 'openrouter' ? getOpenRouterApiKey() : getGoogleGeminiApiKey();
}
function shouldUseOpenRouter() {
    return getConfiguredProvider() === 'openrouter';
}
function getGeminiClient() {
    if (!genAI) {
        genAI = new generative_ai_1.GoogleGenerativeAI(getGoogleGeminiApiKey());
    }
    return genAI;
}
function getOpenRouterClient() {
    if (!openRouterClient) {
        openRouterClient = new openai_1.default({
            apiKey: getOpenRouterApiKey(),
            baseURL: exports.OPENROUTER_BASE_URL,
            timeout: exports.GEMINI_TIMEOUT_MS,
            defaultHeaders: {
                'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
                'X-Title': 'SayBee AI',
            },
        });
    }
    return openRouterClient;
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
            logger_1.logger.info('ai.gemini.cache_hit', { label });
            return cachedResponse;
        }
        let lastError;
        for (let attempt = 1; attempt <= exports.GEMINI_MAX_ATTEMPTS; attempt += 1) {
            try {
                const text = shouldUseOpenRouter()
                    ? yield generateOpenRouterGeminiText(trimmedPrompt, {
                        label,
                        modelName: process.env.OPENROUTER_GEMINI_MODEL_NAME || modelName,
                        timeoutMs,
                    })
                    : yield generateGoogleGeminiText(trimmedPrompt, {
                        label,
                        modelName,
                        timeoutMs,
                    });
                if (!text) {
                    throw new Error(`${label} returned an empty response.`);
                }
                setCachedGeminiResponse(prompt, text);
                return text;
            }
            catch (error) {
                lastError = error;
                if (attempt < exports.GEMINI_MAX_ATTEMPTS) {
                    logger_1.logger.warn('ai.gemini.retry', {
                        attempt,
                        label,
                        maxAttempts: exports.GEMINI_MAX_ATTEMPTS,
                        retryDelayMs: exports.GEMINI_RETRY_DELAY_MS,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    yield sleep(exports.GEMINI_RETRY_DELAY_MS);
                    continue;
                }
                logger_1.logger.error('ai.gemini.failed', {
                    label,
                    maxAttempts: exports.GEMINI_MAX_ATTEMPTS,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        throw lastError instanceof Error ? lastError : new Error(`${label} failed.`);
    });
}
function generateGoogleGeminiText(prompt, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const model = getGeminiModel(options.modelName, options.timeoutMs);
        const result = yield model.generateContent(prompt, { timeout: options.timeoutMs });
        return result.response.text().trim();
    });
}
function generateOpenRouterGeminiText(prompt, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const modelName = options.modelName === exports.GEMINI_MODEL_NAME ? exports.OPENROUTER_GEMINI_MODEL_NAME : options.modelName;
        const result = yield getOpenRouterClient().chat.completions.create({
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
        }, { timeout: options.timeoutMs });
        return ((_c = (_b = (_a = result.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || '';
    });
}
