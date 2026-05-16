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
exports.createChatFallbackResponse = exports.aiFailure = exports.aiSuccess = void 0;
exports.buildChatMessages = buildChatMessages;
exports.generateChatReply = generateChatReply;
exports.streamChatReply = streamChatReply;
const geminiProvider_1 = require("../providers/geminiProvider");
const groqProvider_1 = require("../providers/groqProvider");
const providerUtils_1 = require("../providers/providerUtils");
const logger_1 = require("../utils/logger");
const aiSuccess = (data, provider = 'fallback', startedAt = Date.now()) => (0, providerUtils_1.aiResponse)({
    success: true,
    data,
    error: null,
    provider,
    startedAt,
});
exports.aiSuccess = aiSuccess;
const aiFailure = (error, data = null, provider = 'fallback', startedAt = Date.now()) => (0, providerUtils_1.aiResponse)({
    success: false,
    data,
    error,
    provider,
    startedAt,
});
exports.aiFailure = aiFailure;
const createChatFallbackResponse = (startedAt = Date.now()) => (0, exports.aiFailure)('AI temporarily unavailable', { message: "Let's continue your interview. Tell me about yourself." }, 'fallback', startedAt);
exports.createChatFallbackResponse = createChatFallbackResponse;
function isChatInputMessages(value) {
    return (Array.isArray(value) &&
        value.every((item) => typeof item === 'object' &&
            item !== null &&
            item.role &&
            typeof item.content === 'string'));
}
function buildChatMessages(input) {
    var _a;
    const mode = typeof input.mode === 'string' ? input.mode : 'general';
    const language = typeof input.language === 'string' ? input.language : 'English';
    const modeInstruction = {
        career: 'You are a career strategist. Help with career planning using practical next steps.',
        general: 'You are SayBee AI, a concise career and interview preparation assistant.',
        interview: 'You are an expert interview coach. Give realistic, human interview practice and feedback.',
        resume: 'You are a resume expert. Help improve resumes with concrete, recruiter-friendly advice.',
    };
    const system = [
        (_a = modeInstruction[mode]) !== null && _a !== void 0 ? _a : modeInstruction.general,
        `Reply in ${language} unless the user asks for another language.`,
        'Keep responses clear, practical, and conversational. Use markdown only when it improves readability.',
    ].join('\n');
    if (isChatInputMessages(input.messages)) {
        return [
            { role: 'system', content: system },
            ...input.messages.slice(-12).map((message) => ({
                role: message.role,
                content: message.content,
            })),
        ];
    }
    const prompt = typeof input.message === 'string' ? input.message.trim() : '';
    return [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
    ];
}
function generateChatReply(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const startedAt = Date.now();
        const messages = buildChatMessages(input);
        if (!messages.some((message) => message.role === 'user' && message.content.trim())) {
            return (0, exports.aiFailure)('Message is required', { message: '' }, 'fallback', startedAt);
        }
        try {
            const reply = yield (0, groqProvider_1.generateGroqText)(messages, {
                label: 'chat.reply.groq',
                maxTokens: 900,
                timeoutMs: 5000,
            });
            return (0, exports.aiSuccess)({ message: reply }, 'groq', startedAt);
        }
        catch (groqError) {
            logger_1.logger.warn('ai.chat.groq_failed_using_gemini', {
                error: groqError instanceof Error ? groqError.message : String(groqError),
            });
            try {
                const geminiPrompt = messages.map((message) => `${message.role}: ${message.content}`).join('\n\n');
                const reply = yield (0, geminiProvider_1.generateGeminiText)(geminiPrompt, {
                    label: 'chat.reply.gemini_fallback',
                    useCache: false,
                });
                return (0, exports.aiSuccess)({ message: reply }, 'gemini', startedAt);
            }
            catch (geminiError) {
                logger_1.logger.error('ai.chat.failed', {
                    error: geminiError instanceof Error ? geminiError.message : String(geminiError),
                });
                return (0, exports.createChatFallbackResponse)(startedAt);
            }
        }
    });
}
function streamChatReply(res, input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const startedAt = Date.now();
        const messages = buildChatMessages(input);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        (_a = res.flushHeaders) === null || _a === void 0 ? void 0 : _a.call(res);
        const writeEvent = (event, data) => {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        try {
            const text = yield (0, groqProvider_1.streamGroqText)(messages, (token) => writeEvent('token', { token }), {
                label: 'chat.reply.stream.groq',
                maxTokens: 900,
                timeoutMs: 7000,
            });
            writeEvent('done', (0, exports.aiSuccess)({ message: text }, 'groq', startedAt));
        }
        catch (groqError) {
            logger_1.logger.warn('ai.chat.stream.groq_failed_using_gemini', {
                error: groqError instanceof Error ? groqError.message : String(groqError),
            });
            try {
                const geminiPrompt = messages.map((message) => `${message.role}: ${message.content}`).join('\n\n');
                const text = yield (0, geminiProvider_1.generateGeminiText)(geminiPrompt, {
                    label: 'chat.reply.stream.gemini_fallback',
                    useCache: false,
                });
                writeEvent('token', { token: text });
                writeEvent('done', (0, exports.aiSuccess)({ message: text }, 'gemini', startedAt));
            }
            catch (_b) {
                writeEvent('done', (0, exports.createChatFallbackResponse)(startedAt));
            }
        }
        finally {
            res.end();
        }
    });
}
