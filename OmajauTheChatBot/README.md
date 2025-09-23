# OmajuTheChatBot - Local Development Setup

This project now consists of a single fullstack application for the chat product, plus a dedicated authentication service:
- **OmajuSignUp**: Authentication service (Node.js backend on port 5001, Next.js frontend on port 3001)
- **Agent**: Chat application (Flask backend on port 5000, Next.js frontend on port 3000)

## Architecture Overview

```
┌─────────────────┐    ┌────────────┐
│   OmajuSignUp   │    │   Agent    │
│  Auth Service   │    │  Chat App  │
│ Frontend :3001  │◄──►│ Frontend:3000
│ Backend  :5001  │    │ Backend :5000
└─────────────────┘    └────────────┘
```

## Authentication Flow

1. User visits Agent (http://localhost:3000)
2. If not authenticated, the Agent app redirects to OmajuSignUp (http://localhost:3001)
3. User logs in or signs up (email/password or OAuth)
4. On success, the user is redirected back to Agent and remains signed in (session via secure cookies)

All signup/login/authentication logic is handled exclusively by the OmajuSignUp backend. The Agent frontend checks session state via `/api/user/profile` and protects pages accordingly.

## Quick Start

### Prerequisites
- Node.js (v16+)
- Python (v3.8+)
- MongoDB connection string
- Google/GitHub OAuth credentials (optional)

### 1. Environment Setup

**OmajuSignUp Backend** - Copy `backend/.env.example` to `backend/.env`:
```env
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
AGENT_FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5001
```

**OmajuSignUp Frontend** - Copy `frontend/.env.example` to `frontend/.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001
NEXT_PUBLIC_CHAT_URL=http://localhost:3000
```

**Agent Backend** - Create or edit `Agent/.env`:
```env
MONGO_URI=your-mongodb-connection-string
GOOGLE_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-1.5-flash
FLASK_ENV=development
FLASK_APP=app.py
PORT=5000
```

### 2. Install Dependencies

```bash
# OmajuSignUp Backend
cd OmajuSignUp/backend
npm install

# OmajuSignUp Frontend
cd ../frontend
npm install

# Agent Backend (Flask)
cd ../../Agent
pip install -r requirements.txt

# Agent Frontend (Next.js)
cd Agentfrontend
npm install
```

### 3. Start All Services

Option 1: Use the batch script (Windows)
```bash
./start-all.bat
```

Option 2: Start manually
```bash
# Terminal 1 - OmajuSignUp Backend
cd OmajuSignUp/backend
npm start

# Terminal 2 - OmajuSignUp Frontend
cd OmajuSignUp/frontend
npm run dev

# Terminal 3 - Agent Backend
cd Agent
python app.py

# Terminal 4 - Agent Frontend
cd Agent/Agentfrontend
npm run dev
```

## Service URLs

- OmajuSignUp Frontend: http://localhost:3001
- Agent Frontend: http://localhost:3000
- OmajuSignUp Backend: http://localhost:5001
- Agent Backend: http://localhost:5000

## API Endpoints (Auth Service)

- POST `/api/auth/signup` - Email/password registration
- POST `/api/auth/signin` - Email/password login
- GET `/api/auth/google` - Google OAuth
- GET `/api/auth/github` - GitHub OAuth
- GET `/api/user/profile` - Get current user (protected)
- POST `/api/auth/refresh` - Refresh JWT token
- POST `/api/auth/logout` - Logout
- GET `/health` - Health check

## OAuth Configuration

Google OAuth redirect: `http://localhost:5001/api/auth/google/callback`

GitHub OAuth redirect: `http://localhost:5001/api/auth/github/callback`

## Troubleshooting

- CORS Errors: Ensure origins `http://localhost:3000` and `http://localhost:3001` are allowed on the OmajuSignUp backend
- Port Conflicts: Ensure 3000, 3001, 5000, 5001 are free
- Profile Failing: Confirm cookies are being sent (credentials: 'include') and OmajuSignUp server is running

## Notes

- The Agent frontend protects the `/chat` route using an AuthGuard that checks `/api/user/profile`
- All authentication is centralized in the OmajuSignUp service
- User stays signed in via secure cookies set by OmajuSignUp
