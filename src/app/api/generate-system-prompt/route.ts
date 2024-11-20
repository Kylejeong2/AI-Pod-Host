import { OpenAI } from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { content } = await request.json();

    if (!content) {
      return Response.json({ error: "Missing content" }, { status: 400 });
    }

    const analysis = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system", 
          content: `Analyze the following content and generate a comprehensive system prompt for an AI podcast host. Include:
          1. Main themes and key concepts
          2. Important context and background information 
          3. Potential discussion angles
          4. Key terminology and definitions
          5. Relationships between concepts`
        },
        {
          role: "user",
          content
        }
      ]
    });

    return Response.json({ 
      systemPrompt: analysis.choices[0].message.content 
    });

  } catch (error) {
    console.error('Error generating system prompt:', error);
    return Response.json({ 
      error: 'Failed to generate system prompt',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined 
    }, { status: 500 });
  }
}