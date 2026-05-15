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
exports.LANGUAGE_CODES = void 0;
exports.textToSpeech = textToSpeech;
exports.getLanguageCode = getLanguageCode;
function textToSpeech(text_1) {
    return __awaiter(this, arguments, void 0, function* (text, languageCode = 'en-US') {
        const googleTtsKey = process.env.GOOGLE_TTS_API_KEY;
        if (!googleTtsKey) {
            throw new Error('GOOGLE_TTS_API_KEY is not configured');
        }
        const requestBody = {
            input: { text },
            voice: { languageCode, ssmlGender: 'FEMALE' },
            audioConfig: { audioEncoding: 'MP3' },
        };
        const response = yield fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleTtsKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            const err = yield response.text();
            throw new Error(`Google TTS error ${response.status}: ${err}`);
        }
        const data = (yield response.json());
        return {
            audioBase64: data.audioContent,
            text,
            isStub: false,
        };
    });
}
exports.LANGUAGE_CODES = {
    English: 'en-US',
    Hindi: 'hi-IN',
    Assamese: 'as-IN',
    Bengali: 'bn-IN',
    Tamil: 'ta-IN',
    Telugu: 'te-IN',
    Marathi: 'mr-IN',
    Gujarati: 'gu-IN',
};
function getLanguageCode(languageName) {
    var _a;
    return (_a = exports.LANGUAGE_CODES[languageName]) !== null && _a !== void 0 ? _a : 'en-US';
}
