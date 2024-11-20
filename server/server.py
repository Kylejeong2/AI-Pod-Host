import json
import logging
import os
import uuid
from typing import List

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from openai import OpenAI
from pinecone import Pinecone
from pydantic import BaseModel

app = Flask(__name__)
# Update CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:3000",  # Development
            "http://localhost:3001",  # Development
            "https://f3db-24-43-251-139.ngrok-free.app",  # Add your ngrok URL
            "https://your-production-domain.com"  # Prod
        ],
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "max_age": 3600
    }
})

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY_EMBEDDINGS"))

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX"))

class Topic(BaseModel):
    id: str
    title: str
    questions: List[str]
    excerpts: List[str]

@app.route('/process_document', methods=['POST'])
def process_document():
    try:
        data = request.get_json()
        content = data.get('content')

        if not content:
            return jsonify({"error": "Missing content"}), 400

        # Generate initial analysis and topics
        analysis_response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": """
                Analyze this content for a podcast discussion. Extract:
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
                }
                """},
                {"role": "user", "content": content}
            ],
            response_format={ "type": "json_object" }
        )
        
        analysis = json.loads(analysis_response.choices[0].message.content)
        
        # Create embeddings for contextual retrieval
        chunks = split_into_chunks(content, chunk_size=300, overlap=50)
        
        # Create namespace for this session
        namespace = f"podcast_{str(uuid.uuid4())}"
        
        # Store chunks with metadata in Pinecone
        embeddings = []
        for i, chunk in enumerate(chunks):
            embedding = client.embeddings.create(
                model="text-embedding-3-large",
                input=chunk,
                encoding_format="float"
            )
            
            metadata = {
                "content": chunk,
                "topic_index": i,
                "is_quote": any(quote in chunk for topic in analysis["topics"] 
                              for quote in topic["excerpts"]),
                "timestamp": i  # Used for ordering/tracking discussed content
            }
            
            embeddings.append({
                "id": f"chunk_{i}",
                "values": embedding.data[0].embedding,
                "metadata": metadata
            })

        # Upsert to Pinecone
        index.upsert(vectors=embeddings, namespace=namespace)
        
        return jsonify({
            "namespace": namespace,
            "analysis": analysis
        })

    except Exception as e:
        logging.error(f"Error processing document: {str(e)}")
        return jsonify({"error": str(e)}), 500

def split_into_chunks(text: str, chunk_size: int = 300, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks for better context preservation"""
    chunks = []
    start = 0
    
    while start < len(text):
        # Find the end of the current chunk
        end = start + chunk_size
        
        # If not at the end of text, try to break at a sentence boundary
        if end < len(text):
            # Look for sentence endings (.!?) followed by space or newline
            for i in range(end - 20, end + 20):
                if i >= len(text):
                    break
                if text[i] in '.!?' and (i + 1 == len(text) or text[i + 1].isspace()):
                    end = i + 1
                    break
        
        chunks.append(text[start:end].strip())
        start = end - overlap
    
    return chunks

@app.route('/retrieve_context', methods=['POST'])
def retrieve_context():
    try:
        data = request.get_json()
        query = data.get('query')
        namespace = data.get('namespace')
        
        if not query or not namespace:
            return jsonify({"error": "Missing query or namespace"}), 400

        # Get embedding for query
        embedding_response = client.embeddings.create(
            model="text-embedding-3-large",
            input=query
        )
        query_embedding = embedding_response.data[0].embedding

        # Search Pinecone
        search_response = index.query(
            namespace=namespace,
            vector=query_embedding,
            top_k=3,
            include_metadata=True
        )

        relevant_contexts = [match.metadata['text'] for match in search_response['matches']]

        return jsonify({
            "contexts": relevant_contexts
        })

    except Exception as e:
        logging.error(f"Error retrieving context: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/update_topic_status', methods=['POST'])
def update_topic_status():
    try:
        data = request.get_json()
        topic_id = data.get('topicId')
        status = data.get('status')
        namespace = data.get('namespace')
        
        if not all([topic_id, status, namespace]):
            return jsonify({"error": "Missing required fields"}), 400

        # Update topic status in Pinecone metadata
        results = index.query(
            namespace=namespace,
            filter={"id": topic_id},
            top_k=1
        )
        
        if results['matches']:
            vector_id = results['matches'][0]['id']
            metadata = results['matches'][0]['metadata']
            metadata['status'] = status
            
            index.update(
                id=vector_id,
                namespace=namespace,
                metadata=metadata
            )

        return jsonify({
            "status": "success",
            "topicId": topic_id,
            "newStatus": status
        })

    except Exception as e:
        logging.error(f"Error updating topic status: {e}")
        return jsonify({"error": str(e)}), 500

def calculate_engagement_score(avg_length: float, length_trend: List[int]) -> float:
    """Calculate engagement score based on response patterns."""
    base_score = min(1.0, avg_length / 200)  # Normalize to 0-1
    
    if length_trend:
        trend_score = (length_trend[-1] - length_trend[0]) / length_trend[0]
        return max(0.0, min(1.0, (base_score + trend_score) / 2))
    
    return base_score

def get_engagement_recommendation(score: float) -> str:
    """Get recommendation based on engagement score."""
    if score < 0.3:
        return "Consider switching topics or asking more engaging questions"
    if score < 0.6:
        return "Try asking follow-up questions about specific points"
    return "Good engagement - continue current approach"

@app.route('/prepare_podcast', methods=['POST'])
def prepare_podcast():
    """Alias for process_document to match frontend expectations"""
    return process_document()

@app.route('/analyze_response', methods=['POST'])
def analyze_response():
    try:
        data = request.get_json()
        response_text = data.get('response')
        current_context = data.get('currentContext')
        
        analysis = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": """
                Analyze this response for:
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
                }
                """},
                {"role": "user", "content": f"Context: {current_context}\n\nResponse: {response_text}"}
            ],
            response_format={ "type": "json_object" }
        )
        
        return jsonify(analysis.choices[0].message.content)

    except Exception as e:
        logging.error(f"Error analyzing response: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/suggest_topics', methods=['POST'])
def suggest_topics():
    try:
        data = request.get_json()
        current_topic = data.get('currentTopic')
        context = data.get('context')
        engagement_score = data.get('engagementScore')
        
        suggestion = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": """
                Suggest topic transitions based on:
                1. Current topic and context
                2. User engagement level
                3. Conversation history
                
                Return as JSON with keys:
                {
                    "transitionStrategy": string,
                    "suggestedTopics": string[],
                    "rationale": string
                }
                """},
                {"role": "user", "content": f"""
                Current Topic: {current_topic}
                Context: {context}
                Engagement Score: {engagement_score}
                """}
            ],
            response_format={ "type": "json_object" }
        )
        
        return jsonify(suggestion.choices[0].message.content)

    except Exception as e:
        logging.error(f"Error suggesting topics: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/suggest_question', methods=['POST'])
def suggest_question():
    try:
        data = request.get_json()
        topic = data.get('topic')
        context = data.get('context')
        depth = data.get('depth')
        
        suggestion = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": """
                Generate a follow-up question based on:
                1. Current topic and discussion depth
                2. Recent context and keywords
                3. User interests and engagement
                
                Return as JSON with keys:
                {
                    "question": string,
                    "type": "followup" | "clarification" | "transition",
                    "rationale": string
                }
                """},
                {"role": "user", "content": f"""
                Topic: {topic}
                Context: {context}
                Discussion Depth: {depth}
                """}
            ],
            response_format={ "type": "json_object" }
        )
        
        return jsonify(suggestion.choices[0].message.content)

    except Exception as e:
        logging.error(f"Error suggesting question: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
