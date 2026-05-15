import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

export async function transcribeAudio(audioFilePath: string): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!fs.existsSync(audioFilePath)) {
    throw new Error(`Audio file not found: ${audioFilePath}`);
  }

  const formData = new FormData();
  formData.append('file', fs.createReadStream(audioFilePath), {
    filename: 'audio.wav',
    contentType: 'audio/wav',
  });
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...formData.getHeaders(),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper API error ${response.status}: ${error}`);
  }

  const data = (await response.json()) as {
    text: string;
    language?: string;
    duration?: number;
  };

  return {
    text: data.text,
    language: data.language,
    duration: data.duration,
  };
}

export async function transcribeBuffer(buffer: Buffer): Promise<TranscriptionResult> {
  const tmpPath = `/tmp/saybeeai-audio-${Date.now()}.wav`;
  fs.writeFileSync(tmpPath, buffer);
  try {
    return await transcribeAudio(tmpPath);
  } finally {
    fs.unlink(tmpPath, () => {});
  }
}
