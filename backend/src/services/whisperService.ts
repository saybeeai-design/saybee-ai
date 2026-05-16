import fs from 'fs';
import { transcribeAudioBuffer } from '../providers/whisperProvider';

export async function transcribeAudio(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found: ${filePath}`);
  }

  const buffer = await fs.promises.readFile(filePath);
  const result = await transcribeAudioBuffer(buffer, {
    contentType: 'audio/webm',
    filename: 'answer.webm',
  });

  return result.text;
}
