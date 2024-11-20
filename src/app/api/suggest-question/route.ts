import { OpenAI } from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { topic, context, depth } = await request.json();

    if (!topic || context === undefined || depth === undefined) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const suggestion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Generate a follow-up question based on:
            1. Current topic and discussion depth
            2. Recent context and keywords
            3. User interests and engagement
            
            Return as JSON with keys:
            {
                "question": string,
                "type": "followup" | "clarification" | "transition",
                "rationale": string
            }`
        },
        {
          role: "user",
          content: `Topic: ${JSON.stringify(topic)}
            Context: ${JSON.stringify(context)}
            Discussion Depth: ${depth}`
        }
      ],
      response_format: { type: "json_object" }
    });

    return Response.json(JSON.parse(suggestion.choices[0].message.content || ''));

  } catch (error) {
    console.error('Error suggesting question:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
} 