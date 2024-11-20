import { OpenAI } from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { responses, currentTopic } = await request.json();

    if (!responses || responses.length === 0) {
      return Response.json({ error: "Missing responses" }, { status: 400 });
    }

    // Calculate basic metrics
    const avgLength = responses.reduce((sum: number, r: string) => sum + r.length, 0) / responses.length;
    const lengthTrend = responses.slice(-3).map((r: string) => r.length);

    // Get deeper analysis from OpenAI
    const analysis = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze user engagement in a podcast conversation. Consider:
            1. Response length and complexity
            2. Topic relevance and depth
            3. Question-answer patterns
            4. Emotional engagement indicators
            
            Return a JSON object with:
            {
              "score": number (0-1),
              "metrics": {
                "depth": number (1-5),
                "relevance": number (0-1),
                "complexity": number (0-1)
              },
              "patterns": {
                "elaboration": boolean,
                "personalExamples": boolean,
                "followUpQuestions": boolean
              },
              "recommendation": string
            }`
        },
        {
          role: "user",
          content: `Recent responses: ${JSON.stringify(responses.slice(-3))}
                   Current topic: ${currentTopic}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const aiAnalysis = JSON.parse(analysis.choices[0].message.content || '');
    
    // Combine AI and basic metrics
    const baseScore = calculateBaseScore(avgLength, lengthTrend);
    const finalScore = (baseScore + aiAnalysis.score) / 2;

    return Response.json({
      score: finalScore,
      metrics: {
        ...aiAnalysis.metrics,
        averageLength: avgLength,
        lengthTrend
      },
      patterns: aiAnalysis.patterns,
      recommendation: aiAnalysis.recommendation
    });

  } catch (error) {
    console.error('Error analyzing engagement:', error);
    return Response.json({ error: "Failed to analyze engagement" }, { status: 500 });
  }
}

function calculateBaseScore(avgLength: number, lengthTrend: number[]): number {
  // Base score from average length (0-1)
  const lengthScore = Math.min(1.0, avgLength / 200);
  
  // Trend score (-0.5 to 0.5)
  let trendScore = 0;
  if (lengthTrend.length >= 2) {
    const trend = (lengthTrend[lengthTrend.length - 1] - lengthTrend[0]) / lengthTrend[0];
    trendScore = Math.max(-0.5, Math.min(0.5, trend));
  }
  
  return Math.max(0, Math.min(1, lengthScore + trendScore));
} 