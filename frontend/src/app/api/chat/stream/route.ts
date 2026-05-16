import { getApiBaseUrl } from '@/lib/backendUrl';

export async function POST(req: Request) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers.get('content-type') || 'application/json',
        ...(req.headers.get('authorization')
          ? { Authorization: req.headers.get('authorization') as string }
          : {}),
        ...(req.headers.get('cookie') ? { Cookie: req.headers.get('cookie') as string } : {}),
      },
      body: await req.text(),
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-cache, no-transform',
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
