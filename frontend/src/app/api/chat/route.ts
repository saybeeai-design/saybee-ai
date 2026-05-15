import { getApiBaseUrl } from '@/lib/backendUrl';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const response = await fetch(`${getApiBaseUrl()}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.get('authorization')
          ? { Authorization: req.headers.get('authorization') as string }
          : {}),
        ...(req.headers.get('cookie') ? { Cookie: req.headers.get('cookie') as string } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error('Backend chat proxy error:', error);

    return Response.json(
      {
        success: false,
        data: {
          message: "Let's continue your interview. Tell me about yourself.",
        },
        error: 'AI temporarily unavailable',
      },
      { status: 503 }
    );
  }
}
