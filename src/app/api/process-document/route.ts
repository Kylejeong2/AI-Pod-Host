import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

function splitIntoChunks(text: string, chunkSize: number = 300, overlap: number = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    if (end < text.length) {
      // Look for sentence endings (.!?) followed by space or newline
      for (let i = end - 20; i < end + 20 && i < text.length; i++) {
        if ('.!?'.includes(text[i]) && (i + 1 === text.length || /\s/.test(text[i + 1]))) {
          end = i + 1;
          break;
        }
      }
    }
    
    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }
  
  return chunks;
}

export async function POST(request: Request) {
  try {
    const { content } = await request.json();
    
    if (!content) {
      return Response.json({ error: "Missing content" }, { status: 400 });
    }

    // Generate initial analysis and topics
    const analysis = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze this content for a podcast discussion. Extract:
            1. A brief summary (2-3 sentences)
            2. 3-5 main topics for discussion, ordered by natural conversation flow
            3. 2-3 engaging questions per topic that build on each other
            4. Key quotes or excerpts (1-2 per topic) that could spark discussion
            5. Potential segues between topics
            
            Format as JSON with keys: 
            {
                "summary": string,
                "topics": array of {
                    "id": string (uuid),
                    "title": string,
                    "questions": string[],
                    "excerpts": string[],
                    "segue_to_next": string,
                    "status": "pending"
                }
            }`
        },
        { role: "user", content }
      ],
      response_format: { type: "json_object" }
    });

    const parsedAnalysis = JSON.parse(analysis.choices[0].message.content || '');
        
    // Create embeddings for contextual retrieval
    const chunks = splitIntoChunks(content);
    const namespace = `podcast_${uuidv4()}`;
    
    // Get index instance with proper API version
    const index = pinecone.Index(process.env.PINECONE_INDEX!);
    
    // Create and store embeddings
    const embeddings = await Promise.all(chunks.map(async (chunk, i) => {
      const embedding = await client.embeddings.create({
        model: "text-embedding-3-large",
        input: chunk,
        encoding_format: "float"
      });

      return {
        id: `chunk_${i}`,
        values: embedding.data[0].embedding,
        metadata: {
          content: chunk,
          topic_index: i,
          is_quote: parsedAnalysis.topics.some(
            (topic: any) => topic.excerpts.some((quote: string) => chunk.includes(quote))
          ),
          timestamp: i
        }
      };
    }));

    // Upsert to Pinecone
    await index.upsert(embeddings);

    return Response.json({
      namespace,
      analysis: parsedAnalysis
    });

  } catch (error) {
    console.error('Error processing document:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
} 