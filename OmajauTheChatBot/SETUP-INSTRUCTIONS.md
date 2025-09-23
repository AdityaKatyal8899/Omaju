# Quick Setup Instructions

## Step-by-Step Setup

### 1. Copy Environment Files

**OmajuSignUp Backend:**
```bash
cd OmajuSignUp/backend
copy .env.example .env
```
Edit `.env` with your actual values (MongoDB URI, OAuth credentials, etc.)

**OmajuSignUp Frontend:**
```bash
cd OmajuSignUp/frontend
copy .env.example .env.local
```

**Agent Backend (Flask):** Ensure you have `Agent/.env` with required vars.

### 2. Install Dependencies

```bash
# OmajuSignUp Backend
cd OmajuSignUp\backend
npm install

# OmajuSignUp Frontend  
cd ..\frontend
npm install

# Agent Backend
cd ..\..\Agent
pip install -r requirements.txt

# Agent Frontend
cd Agentfrontend
npm install
```

### 3. Start Services

Double-click `start-all.bat` or run manually:

```bash
# Terminal 1
cd OmajuSignUp\backend && npm start

# Terminal 2  
cd OmajuSignUp\frontend && npm run dev

# Terminal 3
cd Agent && python app.py

# Terminal 4
cd Agent\Agentfrontend && npm run dev
```

### 4. Access Applications

- **Login/Signup**: http://localhost:3001
- **Agent Chat App**: http://localhost:3000

## Required Environment Variables

### Minimum Required (for basic functionality):
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Any secure random string
- `JWT_REFRESH_SECRET` - Another secure random string

### Optional (for OAuth):
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`

## Test the Flow

1. Go to http://localhost:3000 (Agent)
2. You'll be redirected to http://localhost:3001 (OmajuSignUp) if not signed in
3. Create account or login
4. After successful login, you'll be redirected back to Agent
5. Start chatting with Agent!
