# OAuth Setup Guide

## Google OAuth Configuration

### Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project or create a new one

2. **Enable APIs**
   - Go to **APIs & Services** → **Library**
   - Search and enable: **Google+ API** or **People API**

3. **Create OAuth 2.0 Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Click **+ CREATE CREDENTIALS** → **OAuth client ID**
   - Choose **Web application**

4. **Configure OAuth Client**

   **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   http://localhost:3001
   http://127.0.0.1:3000
   http://127.0.0.1:3001
   ```

   **Authorized redirect URIs:**
   ```
   http://localhost:5001/api/auth/google/callback
   http://127.0.0.1:5001/api/auth/google/callback
   ```

5. **OAuth Consent Screen**
   - Go to **APIs & Services** → **OAuth consent screen**
   - Fill in required fields:
     - App name: `OmajuTheChatBot`
     - User support email: Your email
     - Application home page: `http://localhost:3000`
     - Authorized domains: `localhost`
     - Developer contact: Your email

6. **Test Users (Development Mode)**
   - Add test user emails in **OAuth consent screen** → **Test users**

## GitHub OAuth Configuration

### GitHub Developer Settings

1. **Go to GitHub Settings**
   - Visit: https://github.com/settings/developers
   - Click **New OAuth App**

2. **Configure OAuth App**
   - Application name: `OmajuTheChatBot`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:5001/api/auth/github/callback`

3. **Get Credentials**
   - Copy **Client ID** and **Client Secret**

## Environment Variables

Add to `OmajuSignUp/backend/.env`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# GitHub OAuth  
GITHUB_CLIENT_ID=your-github-client-id-here
GITHUB_CLIENT_SECRET=your-github-client-secret-here
```

## Testing OAuth Flow

1. Start all services: `start-all.bat`
2. Go to: http://localhost:3001
3. Click "Login with Google" or "Login with GitHub"
4. Complete OAuth flow
5. Should redirect to: http://localhost:3000 (OmajuChat)

## Troubleshooting

### Common Issues:

1. **"redirect_uri_mismatch" error**
   - Check that redirect URI exactly matches in OAuth settings
   - Ensure no trailing slashes

2. **"origin_mismatch" error**
   - Verify JavaScript origins are correctly set
   - Check for http vs https mismatch

3. **"access_denied" error**
   - App might be in restricted mode
   - Add test users or publish the app

4. **CORS errors**
   - Ensure frontend origins are in authorized JavaScript origins
   - Check CORS configuration in backend

### Debug Steps:

1. Check browser network tab for OAuth requests
2. Verify environment variables are loaded
3. Check backend logs for OAuth callback processing
4. Ensure all services are running on correct ports
