"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEMINI_FALLBACK_RESPONSE = exports.parseJsonFromGemini = exports.getGeminiModel = exports.getGeminiClient = exports.generateGeminiText = exports.GEMINI_TIMEOUT_MS = exports.GEMINI_MODEL_NAME = void 0;
var geminiProvider_1 = require("../../providers/geminiProvider");
Object.defineProperty(exports, "GEMINI_MODEL_NAME", { enumerable: true, get: function () { return geminiProvider_1.GEMINI_MODEL_NAME; } });
Object.defineProperty(exports, "GEMINI_TIMEOUT_MS", { enumerable: true, get: function () { return geminiProvider_1.GEMINI_TIMEOUT_MS; } });
Object.defineProperty(exports, "generateGeminiText", { enumerable: true, get: function () { return geminiProvider_1.generateGeminiText; } });
Object.defineProperty(exports, "getGeminiClient", { enumerable: true, get: function () { return geminiProvider_1.getGeminiClient; } });
Object.defineProperty(exports, "getGeminiModel", { enumerable: true, get: function () { return geminiProvider_1.getGeminiModel; } });
Object.defineProperty(exports, "parseJsonFromGemini", { enumerable: true, get: function () { return geminiProvider_1.parseJsonFromGemini; } });
exports.GEMINI_FALLBACK_RESPONSE = {
    success: false,
    error: 'AI temporarily unavailable',
    data: {
        message: "Let's continue your interview. Tell me about yourself.",
    },
};
