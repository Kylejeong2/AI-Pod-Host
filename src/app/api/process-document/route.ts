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

interface AnalysisResponse {
  topics: Array<{
    title: string;
    questions: string[];
    excerpts?: string[];
  }>;
  segues?: string[];
}

async function generateAnalysis(content: string, systemPrompt: string) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: typeof systemPrompt === 'string' ? systemPrompt : "You are an AI podcast host analyzing content for discussion."
      },
      {
        role: "user",
        content: `Analyze this content and return a JSON response with the following structure:
{
  "topics": [
    {
      "title": "string",
      "questions": ["string"],
      "excerpts": ["string"]
    }
  ],
  "segues": ["string"]
}`
      },
      { 
        role: "user", 
        content: content || "" 
      }
    ],
    response_format: { type: "json_object" }
  });

  const parsed = JSON.parse(response.choices[0].message.content || '{}');
  
  if (!parsed.topics?.length) {
    parsed.topics = [{
      title: "General Discussion",
      questions: ["What are the main points to discuss?"],
      excerpts: []
    }];
  }

  return parsed as AnalysisResponse;
}

async function generateEmbedding(chunk: string, namespace: string, index: number, topics: AnalysisResponse['topics']) {
  const embedding = await client.embeddings.create({
    model: "text-embedding-3-large",
    input: chunk,
    encoding_format: "float"
  });

  if (!embedding.data[0]?.embedding) {
    throw new Error('No embedding generated');
  }

  const isQuote = topics.some(topic => 
    topic.excerpts?.some(quote => chunk.includes(quote))
  ) || false;

  return {
    id: `${namespace}_chunk_${index}`,
    values: embedding.data[0].embedding,
    metadata: {
      content: chunk,
      topic_index: index,
      namespace,
      is_quote: isQuote,
      timestamp: index
    }
  };
}

export async function POST(request: Request) {
  try {
    const { content, systemPrompt } = await request.json();
    
    if (!content?.trim()) {
      return Response.json({ error: "Missing or empty content" }, { status: 400 });
    }

    const namespace = `podcast_${uuidv4()}`;
    const index = pinecone.Index(process.env.PINECONE_INDEX!);
    
    // Get analysis with error handling
    const analysis = await generateAnalysis(content, systemPrompt)
      .catch(err => {
        console.error('Analysis generation failed:', err);
        throw new Error('Failed to analyze content');
      });

    // Process chunks with error handling
    const chunks = splitIntoChunks(content);
    const embeddings = await Promise.all(
      chunks.map((chunk, i) => 
        generateEmbedding(chunk, namespace, i, analysis.topics)
          .catch(err => {
            console.error(`Failed to process chunk ${i}:`, err);
            return null;
          })
      )
    );

    // Filter out failed embeddings
    const validEmbeddings = embeddings.filter((e): e is NonNullable<typeof e> => e !== null);
    
    if (validEmbeddings.length === 0) {
      throw new Error('No valid embeddings generated');
    }

    // Upsert to Pinecone with error handling
    await index.namespace(namespace).upsert(validEmbeddings)
      .catch(err => {
        console.error('Pinecone upsert failed:', err);
        throw new Error('Failed to store embeddings');
      });

    return Response.json({
      namespace,
      analysis,
      processedChunks: validEmbeddings.length
    });

  } catch (error) {
    console.error('Error processing document:', error);
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
} 