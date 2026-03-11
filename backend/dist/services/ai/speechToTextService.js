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
exports.transcribeAudio = transcribeAudio;
exports.transcribeBuffer = transcribeBuffer;
const fs_1 = __importDefault(require("fs"));
const form_data_1 = __importDefault(require("form-data"));
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * Transcribes an audio file using the OpenAI Whisper API.
 * The audio file should be in a supported format: mp3, mp4, mpeg, mpga, m4a, wav, or webm.
 *
 * Falls back to a stub response if WHISPER_API_KEY is not configured.
 */
function transcribeAudio(audioFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const apiKey = process.env.WHISPER_API_KEY || process.env.OPENAI_API_KEY;
        // ── Stub mode (no API key configured) ────────────────────────────────────────
        if (!apiKey) {
            console.warn('[SpeechToText] No WHISPER_API_KEY found — returning stub transcription');
            return {
                text: '[Speech-to-Text stub: configure WHISPER_API_KEY to enable real transcription]',
                language: 'en',
            };
        }
        // ── Real Whisper transcription ────────────────────────────────────────────────
        if (!fs_1.default.existsSync(audioFilePath)) {
            throw new Error(`Audio file not found: ${audioFilePath}`);
        }
        const formData = new form_data_1.default();
        formData.append('file', fs_1.default.createReadStream(audioFilePath), {
            filename: 'audio.wav',
            contentType: 'audio/wav',
        });
        formData.append('model', 'whisper-1');
        formData.append('response_format', 'verbose_json');
        const response = yield (0, node_fetch_1.default)('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: Object.assign({ Authorization: `Bearer ${apiKey}` }, formData.getHeaders()),
            body: formData,
        });
        if (!response.ok) {
            const error = yield response.text();
            throw new Error(`Whisper API error ${response.status}: ${error}`);
        }
        const data = (yield response.json());
        return {
            text: data.text,
            language: data.language,
            duration: data.duration,
        };
    });
}
/**
 * Transcribes audio from a raw Buffer (e.g. from a multer upload)
 * by writing it to a temp file first.
 */
function transcribeBuffer(buffer_1) {
    return __awaiter(this, arguments, void 0, function* (buffer, mimeType = 'audio/wav') {
        const tmpPath = `/tmp/saybeeai-audio-${Date.now()}.wav`;
        fs_1.default.writeFileSync(tmpPath, buffer);
        try {
            return yield transcribeAudio(tmpPath);
        }
        finally {
            fs_1.default.unlink(tmpPath, () => { }); // cleanup
        }
    });
}
