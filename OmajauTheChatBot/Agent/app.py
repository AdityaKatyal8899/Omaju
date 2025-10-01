from flask import Flask, request, jsonify
from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv
from bson import ObjectId
import json
from flask_cors import CORS
import requests
import traceback
import logging
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

# Load environment variables
load_dotenv()
logging.basicConfig(level=logging.INFO)

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
# Prefer GEMINI_API_KEY (Render-provided), fall back to GOOGLE_API_KEY for compatibility
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL") or "gemini-1.5-flash"
DEBUG_GENAI = (os.getenv("DEBUG_GENAI", "false").lower() == "true")

chat_model = None
if GEMINI_API_KEY:
    try:
        chat_model = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            temperature=0.7,
            google_api_key=GEMINI_API_KEY
        )
        logging.info("[genai] Initialized ChatGoogleGenerativeAI with model %s", GEMINI_MODEL)
    except Exception:
        logging.error("[genai] Failed to initialize ChatGoogleGenerativeAI: %s", traceback.format_exc())
else:
    logging.warning("[genai] No GEMINI_API_KEY/GOOGLE_API_KEY configured. Responses will fail.")

# Custom JSON Encoder for ObjectId and datetime
class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

app.json_encoder = JSONEncoder

# Use the environment variable if set, otherwise choose a safe default
# On Render, prefer AUTH_API_BASE env; if missing, fall back to the deployed auth URL
if os.getenv("RENDER") == "true":  # Render sets RENDER=true in deployed env
    AUTH_API_BASE = os.getenv("AUTH_API_BASE") or "https://omaju-onboarding.onrender.com/api/auth"
else:
    AUTH_API_BASE = os.getenv("AUTH_API_BASE") or "http://localhost:5001/api/auth"

def _validate_auth_or_401():
    """Validate Authorization Bearer token against OmajuSignUp profile endpoint.
    Returns (user_json | None, error_response | None)
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, (jsonify({"success": False, "message": "Access token required"}), 401)
    token = auth_header.split(" ", 1)[1]
    try:
        profile_url = f"{AUTH_API_BASE}/profile"
        print("[auth] validating token via:", profile_url)
        resp = requests.get(profile_url, headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }, timeout=5)
        if resp.status_code != 200:
            try:
                body = resp.text
            except Exception:
                body = None
            print("[auth] profile failed", resp.status_code, body)
            return None, (jsonify({"success": False, "message": "Invalid or expired token"}), 401)
        data = resp.json()
        return data.get("data", {}).get("user"), None
    except Exception as e:
        print("[auth] error contacting auth service:", e)
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
        elif msg["role"] == "assistant":
            history.append(AIMessage(content=msg["content"]))
        else:
            # Any non-user/assistant roles are treated as system messages
            history.append(SystemMessage(content=msg.get("content", "")))

    # Add identity context
    identity = SystemMessage(content="Your name is Omaju, a fun, friendly and extroverted AI ChatBot, created by Aditya Katyal, provide them my protfolio link to visit me https://adityakatyal-portfolio.onrender.com " \
    "but only when user ask you who is your creator and ask them again if you can provide them my portfolio or not "
    ". Give them the link only when they say yes. Be frindly and reply with atleast two to three lines")
    full_history = [identity] + history

    # Generate AI response
    try:
        if not chat_model:
            raise RuntimeError("Gemini chat_model not initialized (missing API key?)")
        agent_msg = chat_model.invoke(full_history)
        agent_response = agent_msg.content
    except Exception as e:
        logging.error(
            "[genai] Invocation failed. Model=%s, HasKey=%s, Error=%s\n%s",
            GEMINI_MODEL,
            bool(GEMINI_API_KEY),
            str(e),
            traceback.format_exc(),
        )
        agent_response = "Sorry, I am having trouble generating a response."
        if DEBUG_GENAI:
            # Include error detail in response for debugging (non-breaking: frontend ignores extra fields)
            return jsonify({"response": agent_response, "error": str(e)}), 200

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
    # if not legacy:
    #     # New session → create it with Omaju's greeting in legacy for BC
    #     greeting = {
    #         "role": "assistant",
    #         "content": "Hey! I am **Omaju**, your buddy for lone times. How may I help?",
    #         "timestamp": datetime.utcnow()
    #     }
    #     conversations.insert_one({
    #         "session_id": session_id,
    #         "created_at": datetime.utcnow(),
    #         "messages": [greeting]
    #     })
    #     return jsonify({
    #         "session_id": session_id,
    #         "created_at": datetime.utcnow().isoformat(),
    #         "messages": [greeting]
    #     })
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

    gemini_status = "configured" if GEMINI_API_KEY else "not configured"

    return jsonify({
        "status": "healthy" if mongo_status == "connected" else "unhealthy",
        "mongodb": mongo_status,
        "genai": gemini_status,
        "timestamp": datetime.utcnow().isoformat()
    })
@app.route("/api/health", methods=["GET"])
def api_health():
    return health()
# ============ New REST endpoints for 3-collection schema ============

@app.route("/genai/health", methods=["GET"])
def genai_health():
    """Attempt a minimal invocation to verify Gemini connectivity and model access."""
    info = {
        "model": GEMINI_MODEL,
        "has_key": bool(GEMINI_API_KEY),
        "configured": bool(chat_model is not None),
    }
    if not chat_model:
        return jsonify({"ok": False, **info, "error": "chat_model is not initialized (missing API key?)"}), 200
    try:
        probe = chat_model.invoke([HumanMessage(content="ping")])
        preview = (probe.content or "")[:120]
        return jsonify({"ok": True, **info, "preview": preview}), 200
    except Exception as e:
        logging.error("[genai] Health probe failed: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"ok": False, **info, "error": str(e)}), 200

@app.route("/loader", methods=["GET"])
def loader_page():
    """Simple HTML page that shows the Uiverse spinner, useful to verify loader rendering from backend."""
    html = """
<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
    <title>Omaju Loader</title>
    <style>
      body { margin:0; height:100vh; display:flex; align-items:center; justify-content:center; background:#0b0b0b; color:#fff; }
      /* From Uiverse.io by satyamchaudharydev */
      .spinner { position: relative; width: 60px; height: 60px; display: flex; justify-content: center; align-items: center; border-radius: 50%; margin-left: -75px; }
      .spinner span { position: absolute; top: 50%; left: var(--left); width: 35px; height: 7px; background: #ffff; animation: dominos 1s ease infinite; box-shadow: 2px 2px 3px 0px black; }
      .spinner span:nth-child(1) { --left: 80px; animation-delay: 0.125s; }
      .spinner span:nth-child(2) { --left: 70px; animation-delay: 0.3s; }
      .spinner span:nth-child(3) { left: 60px; animation-delay: 0.425s; }
      .spinner span:nth-child(4) { animation-delay: 0.54s; left: 50px; }
      .spinner span:nth-child(5) { animation-delay: 0.665s; left: 40px; }
      .spinner span:nth-child(6) { animation-delay: 0.79s; left: 30px; }
      .spinner span:nth-child(7) { animation-delay: 0.915s; left: 20px; }
      .spinner span:nth-child(8) { left: 10px; }
      @keyframes dominos { 50% { opacity: 0.7; } 75% { transform: rotate(90deg); } 80% { opacity: 1; } }
    </style>
  </head>
  <body>
    <div class=\"spinner\" aria-label=\"Loading\" role=\"status\">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  </body>
 </html>
    """
    return html, 200, {"Content-Type": "text/html; charset=utf-8"}

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
    convos_col.insert_one({
        "_id": session_id,
        "chat_id": chat_id,
        "created_at": datetime.utcnow(),
        "messages": []
    })
    chats_col.update_one({"_id": chat_id}, {"$set": {"updated_at": datetime.utcnow()}})
    return jsonify({
        "_id": session_id,
        "chat_id": chat_id,
        "created_at": datetime.utcnow().isoformat(),
        "messages": []
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
    PORT = int(os.environ.get("PORT", 5000))  # Use Render’s port, fallback to 5000 locally
    app.run(host="0.0.0.0", port=PORT, debug=True)
