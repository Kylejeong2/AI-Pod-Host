import { OpenAI } from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { currentTopic, context, engagementScore } = await request.json();

    if (!currentTopic || !context) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const suggestion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Suggest topic transitions based on:
            1. Current topic and context
            2. User engagement level
            3. Conversation history
            
            Return as JSON with keys:
            {
                "transitionStrategy": string,
                "suggestedTopics": string[],
                "rationale": string
            }`
        },
        {
          role: "user",
          content: `Current Topic: ${currentTopic.title}
            Context: ${JSON.stringify(context)}
            Engagement Score: ${engagementScore}`
        }
      ],
      response_format: { type: "json_object" }
    });

    return Response.json(JSON.parse(suggestion.choices[0].message.content || ''));

  } catch (error) {
    console.error('Error suggesting topics:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
} 