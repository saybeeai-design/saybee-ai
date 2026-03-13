"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeminiClient = getGeminiClient;
exports.getGeminiModel = getGeminiModel;
const generative_ai_1 = require("@google/generative-ai");
let genAI = null;
function getGeminiClient() {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set in environment variables');
        }
        genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    return genAI;
}
function getGeminiModel(modelName = 'gemini-1.5-flash-latest') {
    return getGeminiClient().getGenerativeModel({ model: modelName });
}
