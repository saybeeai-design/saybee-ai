import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest"
    });

    const result = await model.generateContent(message);
    const reply = result.response.text();

    return Response.json({
      reply: reply
    });
  } catch (error) {
    console.error("AI Chat Route Error:", error);
    return Response.json({ error: "Failed to fetch AI response" }, { status: 500 });
  }
}
