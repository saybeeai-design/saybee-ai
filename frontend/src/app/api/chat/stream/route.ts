import { getApiBaseUrl } from '@/lib/backendUrl';

type ChatResponse = {
  data?: { message?: string } | null;
  error?: string | null;
  message?: string;
  success?: boolean;
};

type ChatRequest = {
  language?: string;
  message?: string;
  messages?: Array<{ content?: string; role?: string }>;
  mode?: string;
};

const streamHeaders = {
  'Cache-Control': 'no-cache, no-transform',
  'Content-Type': 'text/event-stream',
};

const toSse = (event: string, data: unknown): string =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

function buildFallbackBody(body: string): string {
  try {
    const parsed = JSON.parse(body) as ChatRequest;
    const lastUserMessage = [...(parsed.messages ?? [])]
      .reverse()
      .find((message) => message.role === 'user' && message.content?.trim());

    return JSON.stringify({
      ...parsed,
      message: parsed.message?.trim() || lastUserMessage?.content?.trim() || '',
    });
  } catch {
    return body;
  }
}

function getFallbackStatus(payload: ChatResponse, fallbackStatus: number): number {
  if (fallbackStatus === 401 || fallbackStatus === 429) {
    return fallbackStatus;
  }

  return payload.success === false ? 200 : fallbackStatus;
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headers = {
      'Content-Type': req.headers.get('content-type') || 'application/json',
      ...(req.headers.get('authorization')
        ? { Authorization: req.headers.get('authorization') as string }
        : {}),
      ...(req.headers.get('cookie') ? { Cookie: req.headers.get('cookie') as string } : {}),
    };

    const response = await fetch(`${getApiBaseUrl()}/chat/stream`, {
      method: 'POST',
      headers,
      body,
    });

    if (response.status === 404) {
      const fallbackResponse = await fetch(`${getApiBaseUrl()}/chat`, {
        method: 'POST',
        headers,
        body: buildFallbackBody(body),
      });
      const payload = (await fallbackResponse.json()) as ChatResponse;
      const message = payload.data?.message || payload.message || '';
      const stream = `${message ? toSse('token', { token: message }) : ''}${toSse('done', payload)}`;

      return new Response(stream, {
        status: getFallbackStatus(payload, fallbackResponse.status),
        headers: streamHeaders,
      });
    }

    return new Response(response.body, {
      status: response.status,
      headers: {
        ...streamHeaders,
        'Content-Type': response.headers.get('content-type') || 'text/event-stream',
      },
    });
  } catch (error) {
    console.error('Backend chat stream proxy error:', error);

    return Response.json(
      {
        success: false,
        data: null,
        error: 'Unable to reach the backend AI service.',
      },
      { status: 503 }
    );
  }
}
