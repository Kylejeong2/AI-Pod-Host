import { OpenAI } from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { response: responseText, currentContext } = await request.json();

    if (!responseText) {
      return Response.json({ error: "Missing response text" }, { status: 400 });
    }

    const analysis = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze this response for:
            1. Key topics and keywords
            2. Discussion depth (0-5)
            3. User interests and engagement points
            4. Relevant quotes or references
            
            Return as JSON with keys:
            {
                "keywords": string[],
                "depth": number,
                "keyPoints": string[],
                "relevantQuotes": string[],
                "userInterests": string[]
            }`
        },
        {
          role: "user",
          content: `Context: ${currentContext}\n\nResponse: ${responseText}`
        }
      ],
      response_format: { type: "json_object" }
    });

    return Response.json(JSON.parse(analysis.choices[0].message.content || ''));

  } catch (error) {
    console.error('Error analyzing response:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
} 