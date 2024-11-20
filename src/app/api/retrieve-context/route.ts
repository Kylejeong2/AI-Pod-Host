import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const { query, namespace } = await request.json();

    if (!query || !namespace) {
      return Response.json({ error: "Missing query or namespace" }, { status: 400 });
    }

    // Get embedding for query
    const embedding = await client.embeddings.create({
      model: "text-embedding-3-large",
      input: query,
    });

    // Search Pinecone with namespace
    const index = pinecone.Index(process.env.PINECONE_INDEX!);
    const searchResponse = await index.namespace(namespace).query({
      vector: embedding.data[0].embedding,
      topK: 3,
      includeMetadata: true,
      includeValues: false,
    });

    const relevantContexts = searchResponse.matches.map(match => match.metadata?.content);

    return Response.json({
      contexts: relevantContexts
    });

  } catch (error) {
    console.error('Error retrieving context:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
} 