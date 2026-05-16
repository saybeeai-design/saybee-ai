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
exports.getInterviewConfigFromReportData = void 0;
exports.generateInterviewQuestion = generateInterviewQuestion;
exports.generateFollowUpQuestion = generateFollowUpQuestion;
exports.buildQuestionFallback = buildQuestionFallback;
const searchService_1 = require("../searchService");
const geminiProvider_1 = require("../../providers/geminiProvider");
const groqProvider_1 = require("../../providers/groqProvider");
const promptBuilder_1 = require("./promptBuilder");
Object.defineProperty(exports, "getInterviewConfigFromReportData", { enumerable: true, get: function () { return promptBuilder_1.getInterviewConfigFromReportData; } });
const roleContexts_1 = require("./roleContexts");
function shouldUseWebContext(interviewConfig, stage) {
    const roleContext = (0, roleContexts_1.resolveRoleContext)(interviewConfig);
    if (stage === 'Closing') {
        return false;
    }
    return roleContext.currentAffairsFocus || stage === 'Technical' || stage === 'Scenario';
}
function fetchWebContext(interviewConfig, stage) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!shouldUseWebContext(interviewConfig, stage)) {
            return {
                usedWebContext: false,
                webContextBlock: '',
            };
        }
        try {
            const searchQuery = (0, searchService_1.buildSearchQuery)(interviewConfig.category, stage);
            const searchResults = yield (0, searchService_1.searchWeb)(searchQuery);
            const formatted = (0, searchService_1.formatSearchContext)(searchResults);
            if (!formatted) {
                return {
                    usedWebContext: false,
                    webContextBlock: '',
                };
            }
            return {
                usedWebContext: true,
                webContextBlock: formatted,
            };
        }
        catch (_a) {
            return {
                usedWebContext: false,
                webContextBlock: '',
            };
        }
    });
}
function generateInterviewQuestion(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const { interviewConfig, previousQuestions, resumeSummary, stage } = input;
        const { usedWebContext, webContextBlock } = yield fetchWebContext(interviewConfig, stage);
        const builtPrompt = (0, promptBuilder_1.buildInterviewPrompt)({
            interviewConfig,
            previousQuestions,
            resumeContext: resumeSummary,
            stage,
            webContext: webContextBlock,
        });
        let raw;
        try {
            raw = yield (0, groqProvider_1.generateGroqText)(builtPrompt.prompt, {
                label: `generateInterviewQuestion (${stage})`,
                maxTokens: 320,
                timeoutMs: 4500,
            });
        }
        catch (_a) {
            raw = yield (0, geminiProvider_1.generateGeminiText)(builtPrompt.prompt, {
                label: `generateInterviewQuestion.fallback (${stage})`,
                useCache: false,
            });
        }
        return (0, promptBuilder_1.parseGeneratedQuestionResponse)(raw, builtPrompt, stage, { usedWebContext });
    });
}
function generateFollowUpQuestion(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const { followUpCount = 0, interviewConfig, lastQuestion, resumeSummary, stage, userAnswer } = input;
        const builtPrompt = (0, promptBuilder_1.buildFollowUpPrompt)({
            followUpCount,
            interviewConfig,
            lastQuestion,
            resumeContext: resumeSummary,
            stage,
            userAnswer,
        });
        let raw;
        try {
            raw = yield (0, groqProvider_1.generateGroqText)(builtPrompt.prompt, {
                label: `generateFollowUpQuestion (${stage})`,
                maxTokens: 300,
                timeoutMs: 4500,
            });
        }
        catch (_a) {
            raw = yield (0, geminiProvider_1.generateGeminiText)(builtPrompt.prompt, {
                label: `generateFollowUpQuestion.fallback (${stage})`,
                useCache: false,
            });
        }
        return (0, promptBuilder_1.parseGeneratedQuestionResponse)(raw, builtPrompt, stage, {
            isFollowUp: true,
            usedWebContext: false,
        });
    });
}
function buildQuestionFallback(input) {
    return (0, promptBuilder_1.buildFallbackInterviewQuestion)(input);
}
