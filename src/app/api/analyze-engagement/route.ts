import { OpenAI } from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function calculateBaseScore(avgLength: number, lengthTrend: number[]): number {
  // More lenient base score from average length (0-1)
  const lengthScore = Math.min(1.0, avgLength / 100); // Reduced from 150
  
  // More forgiving trend score (-0.2 to 0.4)
  let trendScore = 0;
  if (lengthTrend.length >= 2) {
    const trend = (lengthTrend[lengthTrend.length - 1] - lengthTrend[0]) / lengthTrend[0];
    trendScore = Math.max(-0.2, Math.min(0.4, trend));
  }
  
  // Add a higher minimum base score
  return Math.max(0.3, Math.min(1, lengthScore + trendScore)); // Increased from 0.2
}

export async function POST(request: Request) {
  try {
    const { responses, currentTopic } = await request.json();

    if (!responses || responses.length === 0) {
      return Response.json({ error: "Missing responses" }, { status: 400 });
    }

    // Calculate basic metrics with more lenient thresholds
    const avgLength = responses.reduce((sum: number, r: string) => sum + r.length, 0) / responses.length;
    const lengthTrend = responses.slice(-3).map((r: string) => r.length);

    // Get deeper analysis from OpenAI with adjusted prompt
    const analysis = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze user engagement in a podcast conversation. Be generous in interpretation and focus on:
            1. Any signs of personal connection or interest
            2. Presence of relevant content (even if brief)
            3. Signs of active listening and participation
            4. Basic interaction patterns
            
            Return a JSON object with:
            {
              "score": number (0.2-1), // Minimum score of 0.2 to be more lenient
              "metrics": {
                "depth": number (1-5),
                "relevance": number (0.2-1),
                "complexity": number (0.2-1)
              },
              "patterns": {
                "showsInterest": boolean,
                "isParticipating": boolean,
                "staysOnTopic": boolean
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
    
    // Weight the AI analysis more heavily than basic metrics
    const baseScore = calculateBaseScore(avgLength, lengthTrend);
    const finalScore = (baseScore + (aiAnalysis.score * 2)) / 3; // Give AI analysis more weight

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
    return Response.json({ 
      score: 0.5, // Default to neutral score on error
      error: "Failed to analyze engagement" 
    }, { status: 500 });
  }
} 