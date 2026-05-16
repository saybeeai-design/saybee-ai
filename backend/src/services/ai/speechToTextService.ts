import { transcribeAudioBuffer, type TranscriptionResult } from '../../providers/whisperProvider';

export type { TranscriptionResult };

export async function transcribeBuffer(
  buffer: Buffer,
  input: { contentType?: string; filename?: string; language?: string } = {}
): Promise<TranscriptionResult> {
  return transcribeAudioBuffer(buffer, input);
}
