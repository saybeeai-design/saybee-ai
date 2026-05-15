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
exports.generateChatReply = generateChatReply;
const geminiClient_1 = require("./ai/geminiClient");
const logger_1 = require("../utils/logger");
const aiSuccess = (data) => ({
    success: true,
    data,
    error: null,
});
exports.aiSuccess = aiSuccess;
const aiFailure = (error, data = null) => ({
    success: false,
    data,
    error,
});
exports.aiFailure = aiFailure;
const createChatFallbackResponse = () => (0, exports.aiFailure)(geminiClient_1.GEMINI_FALLBACK_RESPONSE.error, {
    message: geminiClient_1.GEMINI_FALLBACK_RESPONSE.data.message,
});
exports.createChatFallbackResponse = createChatFallbackResponse;
function generateChatReply(message) {
    return __awaiter(this, void 0, void 0, function* () {
        const prompt = message.trim();
        if (!prompt) {
            return (0, exports.aiFailure)('Message is required', { message: '' });
        }
        try {
            const reply = yield (0, geminiClient_1.generateGeminiText)(prompt, { label: 'chat.reply' });
            return (0, exports.aiSuccess)({ message: reply });
        }
        catch (error) {
            logger_1.logger.error('ai.chat.failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return (0, exports.createChatFallbackResponse)();
        }
    });
}
