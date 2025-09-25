from flask import Flask, request, jsonify
from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv
from bson import ObjectId
import json
from flask_cors import CORS
import requests

# ✅ Correct Gemini import
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
# Allow Authorization header through CORS so frontend can send Bearer tokens
CORS(
    app,
    origins=[
        "https://omaju-chatinterface-adityakatyal.vercel.app",
        "https://omaju-onboarding.vercel.app",
        "http://localhost:3000",  # optional for local testing
        "http://localhost:3001"   # optional for local testing
    ],
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Content-Type"],
    methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
)

# Database setup
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["ChatApp"]

# Legacy single collection (for backward compatibility)
conversations = db["conversations"]

# New 3-collection schema
users_col = db["users"]          # created/managed by Node auth service
chats_col = db["chats"]          # chat titles per user (uid)
convos_col = db["convos"]        # sessions and messages per chat

# Gemini setup
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = "gemini-1.5-flash"

chat_model = ChatGoogleGenerativeAI(
    model=GEMINI_MODEL,
    temperature=0.7,
    google_api_key=GOOGLE_API_KEY
)

# ✅ Custom JSON Encoder for ObjectId and datetime
class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

app.json_encoder = JSONEncoder

AUTH_API_BASE = os.getenv("AUTH_API_BASE", "http://localhost:5001/api/auth")

def _validate_auth_or_401():
    """Validate Authorization Bearer token against OmajuSignUp profile endpoint.
    Returns (user_json | None, error_response | None)
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, (jsonify({"success": False, "message": "Access token required"}), 401)
    token = auth_header.split(" ", 1)[1]
    try:
        resp = requests.get(f"{AUTH_API_BASE}/profile", headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }, timeout=5)
        if resp.status_code != 200:
            return None, (jsonify({"success": False, "message": "Invalid or expired token"}), 401)
        data = resp.json()
        return data.get("data", {}).get("user"), None
    except Exception as e:
        return None, (jsonify({"success": False, "message": "Auth service unavailable"}), 503)

# Root endpoint
@app.route("/")
def home():
    return jsonify({"message": "Welcome to Flask Backend!"})

# Chat endpoint (generates assistant response)
# Updated to prefer new convos collection. Falls back to legacy conversations.
@app.route("/chat", methods=["POST"])
def chat():
    # Enforce auth
    user, err = _validate_auth_or_401()
    if err:
        return err

    data = request.get_json()
    session_id = data.get("session_id")
    chat_id = data.get("chat_id")
    user_message = data.get("message")

    if not session_id or not user_message:
        return jsonify({"error": "session_id and message are required"}), 400

    # Save user message to new convos collection when possible
    user_doc = {"role": "user", "content": user_message, "timestamp": datetime.utcnow()}
    wrote_new = False
    if chat_id:
        convos_col.update_one(
            {"_id": session_id},
            {
                "$setOnInsert": {
                    "_id": session_id,
                    "chat_id": chat_id,
                    "created_at": datetime.utcnow(),
                    "messages": []
                }
            },
            upsert=True
        )
        convos_col.update_one({"_id": session_id}, {"$push": {"messages": user_doc}})
        # bump chat updated_at
        try:
            chats_col.update_one({"_id": chat_id}, {"$set": {"updated_at": datetime.utcnow()}}, upsert=False)
        except Exception:
            pass
        wrote_new = True

    if not wrote_new:
        # Legacy behavior
        conversations.update_one(
            {"session_id": session_id},
            {"$push": {"messages": user_doc}, "$setOnInsert": {"session_id": session_id, "created_at": datetime.utcnow()}},
            upsert=True
        )

    # Fetch last 20 messages for context
    # Prefer new convos
    conversation_doc = convos_col.find_one({"_id": session_id})
    if not conversation_doc:
        conversation_doc = conversations.find_one({"session_id": session_id}) or {"messages": []}
    recent_msgs = conversation_doc.get("messages", [])[-20:]

    # Prepare messages for LangChain
    history = []
    for msg in recent_msgs:
        if msg["role"] == "user":
            history.append(HumanMessage(content=msg["content"]))
        else:
            history.append(SystemMessage(content=msg["content"]))

    # Add identity context
    identity = SystemMessage(content="Your name is Omaju, a fun, friendly and extroverted AI ChatBot, created by Aditya Katyal, provide them my protfolio link to visit me https://adityakatyal-portfolio.onrender.com " \
    "but only when user ask you who is your creator and ask them again if you can provide them my portfolio or not "
    ". Give them the link only when they say yes. Be frindly and reply with atleast two to three lines")
    full_history = [identity] + history

    # Generate AI response
    try:
        agent_msg = chat_model.invoke(full_history)
        agent_response = agent_msg.content
    except Exception as e:
        print("GenAI invocation error:", e)
        agent_response = "Sorry, I am having trouble generating a response."

    # Save AI response into the same location as user message
    ai_doc = {"role": "assistant", "content": agent_response, "timestamp": datetime.utcnow()}
    if wrote_new or convos_col.find_one({"_id": session_id}):
        convos_col.update_one({"_id": session_id}, {"$push": {"messages": ai_doc}})
    else:
        conversations.update_one({"session_id": session_id}, {"$push": {"messages": ai_doc}})

    return jsonify({"response": agent_response})

# Fetch conversation by session (now reads from new convos, falls back to legacy)
@app.route("/messages/<session_id>", methods=["GET"])
def get_messages(session_id):
    # Enforce auth
    user, err = _validate_auth_or_401()
    if err:
        return err
    conversation_doc = convos_col.find_one({"_id": session_id})
    if conversation_doc:
        # Align response shape with previous handler
        return jsonify({
            "_id": conversation_doc.get("_id"),
            "session_id": conversation_doc.get("_id"),
            "chat_id": conversation_doc.get("chat_id"),
            "created_at": conversation_doc.get("created_at"),
            "messages": conversation_doc.get("messages", [])
        })

    # Fallback to legacy
    legacy = conversations.find_one({"session_id": session_id})
    if not legacy:
        # New session → create it with Omaju's greeting in legacy for BC
        greeting = {
            "role": "assistant",
            "content": "Hey! I am **Omaju**, your buddy for lone times. How may I help?",
            "timestamp": datetime.utcnow()
        }
        conversations.insert_one({
            "session_id": session_id,
            "created_at": datetime.utcnow(),
            "messages": [greeting]
        })
        return jsonify({
            "session_id": session_id,
            "created_at": datetime.utcnow().isoformat(),
            "messages": [greeting]
        })
    return jsonify(legacy)

# Clear a session's messages
@app.route("/clear/<session_id>", methods=["POST"])
def clear_messages(session_id):
    # Enforce auth
    user, err = _validate_auth_or_401()
    if err:
        return err
    # Clear in both locations for safety
    convos_col.delete_one({"_id": session_id})
    conversations.delete_one({"session_id": session_id})
    return jsonify({"message": f"Session {session_id} cleared!"})

# Health check
@app.route("/health", methods=["GET"])
def health():
    try:
        client.admin.command('ping')
        mongo_status = "connected"
    except Exception as e:
        mongo_status = f"disconnected ({str(e)})"

    gemini_status = "configured" if GOOGLE_API_KEY else "not configured"

    return jsonify({
        "status": "healthy" if mongo_status == "connected" else "unhealthy",
        "mongodb": mongo_status,
        "genai": gemini_status,
        "timestamp": datetime.utcnow().isoformat()
    })

# ============ New REST endpoints for 3-collection schema ============

def _require_uid_match(uid_from_path, user_obj):
    """If a uid is present in path, ensure it matches the authenticated user."""
    if not user_obj:
        return (jsonify({"success": False, "message": "Unauthorized"}), 401)
    auth_uid = user_obj.get("_id") or user_obj.get("id") or user_obj.get("uid")
    if uid_from_path != str(auth_uid):
        return (jsonify({"success": False, "message": "Forbidden"}), 403)
    return None


@app.route("/chats/<uid>", methods=["GET"])
def list_chats(uid):
    # Enforce auth and uid match
    user, err = _validate_auth_or_401()
    if err:
        return err
    mismatch = _require_uid_match(uid, user)
    if mismatch:
        return mismatch

    chats = list(chats_col.find({"uid": uid}).sort("updated_at", -1))
    # Normalize datetimes
    for c in chats:
        c["created_at"] = c.get("created_at")
        c["updated_at"] = c.get("updated_at")
    return jsonify(chats)


@app.route("/convos/<chat_id>", methods=["GET"])
def list_convos(chat_id):
    # Enforce auth
    user, err = _validate_auth_or_401()
    if err:
        return err
    convos = list(convos_col.find({"chat_id": chat_id}, {"messages": 0}).sort("created_at", -1))
    return jsonify(convos)


@app.route("/convos/<chat_id>", methods=["POST"])
def create_convo(chat_id):
    # Enforce auth
    user, err = _validate_auth_or_401()
    if err:
        return err
    # Ensure chat exists (optional)
    chat = chats_col.find_one({"_id": chat_id})
    if not chat:
        return jsonify({"success": False, "message": "Chat not found"}), 404

    # Create new session id if not provided
    body = request.get_json(silent=True) or {}
    session_id = body.get("session_id") or f"session_{int(datetime.utcnow().timestamp()*1000)}"
    greeting = {
        "role": "assistant",
        "content": "Hey! I am Omaju, your buddy.",
        "timestamp": datetime.utcnow()
    }
    convos_col.insert_one({
        "_id": session_id,
        "chat_id": chat_id,
        "created_at": datetime.utcnow(),
        "messages": [greeting]
    })
    chats_col.update_one({"_id": chat_id}, {"$set": {"updated_at": datetime.utcnow()}})
    return jsonify({
        "_id": session_id,
        "chat_id": chat_id,
        "created_at": datetime.utcnow().isoformat(),
        "messages": [greeting]
    }), 201


@app.route("/convos/<session_id>/messages", methods=["PATCH"])
def append_messages(session_id):
    # Enforce auth
    user, err = _validate_auth_or_401()
    if err:
        return err
    body = request.get_json() or {}
    msgs = body.get("messages", [])
    if not isinstance(msgs, list) or not msgs:
        return jsonify({"success": False, "message": "messages array required"}), 400
    # Normalize timestamps
    normalized = []
    for m in msgs:
        if not (isinstance(m, dict) and m.get("role") and m.get("content")):
            continue
        ts = m.get("timestamp")
        if isinstance(ts, str):
            try:
                # leave string; encoder will handle datetime only
                pass
            except Exception:
                ts = datetime.utcnow()
        elif not ts:
            ts = datetime.utcnow()
        normalized.append({"role": m["role"], "content": m["content"], "timestamp": ts})
    if not normalized:
        return jsonify({"success": False, "message": "no valid messages"}), 400
    res = convos_col.update_one({"_id": session_id}, {"$push": {"messages": {"$each": normalized}}})
    if res.matched_count == 0:
        return jsonify({"success": False, "message": "session not found"}), 404
    return jsonify({"success": True})


# Helper endpoint to create a new chat title for a user (optional for frontend convenience)
@app.route("/chats/<uid>", methods=["POST"])
def create_chat(uid):
    user, err = _validate_auth_or_401()
    if err:
        return err
    mismatch = _require_uid_match(uid, user)
    if mismatch:
        return mismatch
    body = request.get_json(silent=True) or {}
    title = body.get("title") or "Untitled chat"
    chat_id = body.get("chat_id") or f"chat_{int(datetime.utcnow().timestamp()*1000)}"
    now = datetime.utcnow()
    doc = {"_id": chat_id, "uid": uid, "title": title, "created_at": now, "updated_at": now}
    chats_col.insert_one(doc)
    return jsonify(doc), 201


@app.route("/chats/<chat_id>", methods=["DELETE"])
def delete_chat(chat_id):
    # Enforce auth
    user, err = _validate_auth_or_401()
    if err:
        return err
    # Ensure chat exists and belongs to user
    chat = chats_col.find_one({"_id": chat_id})
    if not chat:
        return jsonify({"success": False, "message": "Chat not found"}), 404
    auth_uid = (user or {}).get("_id") or (user or {}).get("id") or (user or {}).get("uid")
    if str(chat.get("uid")) != str(auth_uid):
        return jsonify({"success": False, "message": "Forbidden"}), 403
    # Delete chat and its convos
    convos_col.delete_many({"chat_id": chat_id})
    chats_col.delete_one({"_id": chat_id})
    return jsonify({"success": True})


@app.route("/convos/<session_id>", methods=["DELETE"])
def delete_convo(session_id):
    # Enforce auth
    user, err = _validate_auth_or_401()
    if err:
        return err
    res = convos_col.delete_one({"_id": session_id})
    if res.deleted_count == 0:
        return jsonify({"success": False, "message": "Session not found"}), 404
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(port=5000, debug=True)
