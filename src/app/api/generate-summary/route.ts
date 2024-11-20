import { OpenAI } from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { transcript } = await request.json();

    if (!transcript) {
      return Response.json({ error: "Missing transcript" }, { status: 400 });
    }

    const analysis = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze this podcast transcript and provide a comprehensive summary. Include:
            1. Main discussion points
            2. Key takeaways
            3. Topics covered with approximate duration and engagement level
            4. Overall engagement metrics
            
            Return as JSON with keys:
            {
              "mainPoints": string[],
              "keyTakeaways": string[],
              "topicsCovered": Array<{
                "title": string,
                "duration": number,
                "engagement": number
              }>,
              "overallEngagement": number,
              "duration": number
            }`
        },
        {
          role: "user",
          content: transcript
        }
      ],
      response_format: { type: "json_object" }
    });

    return Response.json(JSON.parse(analysis.choices[0].message.content || ''));

  } catch (error) {
    console.error('Error generating summary:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
} 