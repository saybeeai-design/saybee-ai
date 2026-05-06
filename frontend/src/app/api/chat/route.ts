import { createChatFallbackResponse, generateChatReply } from '@/lib/server/geminiChatService';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { message?: unknown };
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return Response.json(
        {
          success: false,
          error: 'Message is required',
          data: {
            message: '',
          },
        },
        { status: 400 }
      );
    }

    const result = await generateChatReply(message);
    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error('AI Chat Route Error:', error);

    return Response.json(createChatFallbackResponse(), { status: 200 });
  }
}
