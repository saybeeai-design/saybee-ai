export interface ChatStreamMessage {
  role: 'user' | 'assistant';
  content: string;
}

type StreamDonePayload = {
  data?: { message?: string } | null;
  error?: string | null;
  message?: string;
  success?: boolean;
};

async function getSafeErrorMessage(response: Response): Promise<string> {
  if (response.status === 401) {
    return 'Your session expired. Please sign in again.';
  }

  if (response.status === 429) {
    return 'Too many AI requests. Please wait a moment and try again.';
  }

  try {
    const payload = (await response.clone().json()) as { error?: string; message?: string };
    if (payload.error || payload.message) {
      return payload.error || payload.message || 'AI request failed';
    }
  } catch {
    // Some streaming failures do not return JSON.
  }

  if (response.status >= 500) {
    return 'The AI service is temporarily unavailable.';
  }

  return 'AI request failed. Please try again.';
}

export async function streamChatCompletion(
  input: {
    language?: string;
    messages: ChatStreamMessage[];
    mode?: string;
  },
  onToken: (token: string) => void
) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok || !response.body) {
    throw new Error(await getSafeErrorMessage(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalPayload: unknown = null;

  const readEvent = (rawEvent: string) => {
    const eventLine = rawEvent.split('\n').find((line) => line.startsWith('event:'));
    const dataLine = rawEvent.split('\n').find((line) => line.startsWith('data:'));
    const event = eventLine?.replace(/^event:\s*/, '').trim();
    const data = dataLine?.replace(/^data:\s*/, '').trim();

    if (!event || !data) {
      return;
    }

    const parsed = JSON.parse(data) as StreamDonePayload & { token?: string };
    if (event === 'token' && parsed.token) {
      onToken(parsed.token);
    }
    if (event === 'done') {
      finalPayload = parsed;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const event of events) {
      readEvent(event);
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    readEvent(buffer);
  }

  const done = finalPayload as StreamDonePayload | null;
  if (done?.success === false) {
    throw new Error(done.error || done.data?.message || done.message || 'The AI service is temporarily unavailable.');
  }

  return finalPayload;
}
