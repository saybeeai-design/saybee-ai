import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Transcribes an audio file using OpenAI Whisper (model: whisper-1).
 * @param filePath Path to the audio file.
 * @returns Transcription text.
 */
export async function transcribeAudio(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found: ${filePath}`);
  }

  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "whisper-1"
  });

  return response.text;
}
