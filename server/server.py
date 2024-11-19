import os
import uuid

import openai
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from pinecone import Pinecone
from youtube_transcript_api import YouTubeTranscriptApi

app = Flask(__name__)
# Update CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:3000",  # Development
            "https://your-production-domain.com"  # Prod
        ],
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "max_age": 3600
    }
})

# Load environment variables
load_dotenv()

# Initialize OpenAI and Pinecone
openai.api_key = os.getenv("OPENAI_API_KEY_EMBEDDINGS")
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX"))

@app.route('/transcript', methods=['POST'])
def get_transcript():
    data = request.get_json()
    video_id = data.get('videoId')
    if not video_id:
        return jsonify({"error": "Missing video_id in request body"}), 400

    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        return jsonify({"transcript": transcript})
    except Exception as e:
        print(f"Error fetching transcript: {e}")
        return jsonify({"error": "Failed to fetch transcript"}), 500

@app.route('/process_video', methods=['POST'])
def process_video():
    print("Received request for /process_video")  
    data = request.get_json()
    video_id = data.get('videoId')
    if not video_id:
        return jsonify({"error": "Missing video_id in request body"}), 400

    try:
        # Get transcript
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        
        # Generate embeddings and store in Pinecone
        for entry in transcript:
            sentence = entry['text']
            timestamp = entry['start']
            duration = entry['duration']
            # Updated embedding creation using new OpenAI client
            response = openai.embeddings.create(
                model="text-embedding-3-large",
                input=sentence
            )
            embedding = response.data[0].embedding
            
            namespace = f"overlap_{video_id}_embeddings"
            index.upsert([(str(uuid.uuid4()), embedding, {"timestamp": timestamp, "duration": duration, "content": sentence})], namespace=namespace)

        full_transcript = ' '.join([entry['text'] for entry in transcript])
        summary_response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert at summarizing and you write elaborate and info-packed summarizes with all the key insights and including all the important concepts from text. Write the summary in exactly 10 sentences."},
                {"role": "user", "content": full_transcript}
            ]
        )
        summary = summary_response.choices[0].message.content

        return jsonify({
            "status": "success",
            "transcript": transcript,
            "summary": summary
        }), 200
        
    except Exception as e:
        print(f"Error processing video: {e}")
        return jsonify({"error": "Failed to process video"}), 500

if __name__ == '__main__':
    app.run(debug=True)
