import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const { topicId, status, namespace } = await request.json();

    if (!topicId || !status || !namespace) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get index instance
    const index = pinecone.Index(process.env.PINECONE_INDEX!);

    // Query to find the vector
    const results = await index.query({
      vector: [0],
      filter: { id: topicId },
      topK: 1,
    });

    if (results.matches.length > 0) {
      const vectorId = results.matches[0].id;
      const metadata = results.matches[0].metadata;

      // Update the vector's metadata
      await index.update({
        id: vectorId,
        metadata: {
          ...metadata,
          status
        },
      });
    }

    return Response.json({
      status: "success",
      topicId,
      newStatus: status
    });

  } catch (error) {
    console.error('Error updating topic status:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
} 