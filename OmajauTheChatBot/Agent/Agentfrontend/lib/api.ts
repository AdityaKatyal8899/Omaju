const API_BASE_URL = process.env.NEXT_PUBLIC_CHAT_API_URL as string
// Fail fast in runtime if API base URL is not configured
if (!API_BASE_URL || API_BASE_URL === 'undefined') {
  // eslint-disable-next-line no-console
  console.error('[config] NEXT_PUBLIC_CHAT_API_URL is not set. API calls will fail.')
}

export async function updateChatTitle(chatId: string, title: string): Promise<ChatTitle> {
  const token = getAccessToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ title }),
  })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    try { console.error('[api] PATCH /chats/:chatId failed', { base: API_BASE_URL, chatId, status: res.status }) } catch {}
    throw new ApiError(res.status, 'Failed to update chat title')
  }
  return res.json()
}
const SIGNUP_FRONTEND_URL = process.env.NEXT_PUBLIC_SIGNUP_URL || 'http://localhost:3001'

export interface ChatMessage {
  session_id: string
  message: string
  role?: 'user' | 'assistant'
  chat_id?: string
}

export interface ChatResponse {
  response: string
}

export interface ConversationHistory {
  _id?: string
  session_id: string
  created_at?: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
}

export interface ChatTitle {
  _id: string
  uid: string
  title: string
  created_at: string
  updated_at?: string
}

export interface ConvoMeta {
  _id: string
  chat_id: string
  created_at: string
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem('accessToken') } catch { return null }
}

function handleUnauthorized() {
  try {
    const nextUrl = typeof window !== 'undefined' ? window.location.origin + '/chat' : 'http://localhost:3000/chat'
    window.location.href = `${SIGNUP_FRONTEND_URL}/sign-up?next=${encodeURIComponent(nextUrl)}`
  } catch {}
}

// Send a message to the backend
export async function sendChatMessage(message: ChatMessage): Promise<ChatResponse> {
  // Build headers safely for TypeScript
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getAccessToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(message),
    mode: 'cors',
  })

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized()
    }
    // Non-intrusive diagnostics
    try { console.error('[api] POST /chat failed', { base: API_BASE_URL, status: response.status }) } catch {}
    throw new ApiError(response.status, `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// Get conversation history for a session
export async function getConversationHistory(sessionId: string): Promise<ConversationHistory | null> {
  const token = getAccessToken()
  const init: RequestInit = {}
  if (token) {
    init.headers = { 'Authorization': `Bearer ${token}` }
  }
  const response = await fetch(`${API_BASE_URL}/messages/${sessionId}`, init)
  if (response.status === 404) return null
  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized()
    }
    try { console.error('[api] GET /messages/:sessionId failed', { base: API_BASE_URL, sessionId, status: response.status }) } catch {}
    throw new ApiError(response.status, `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

// Check backend health
export async function checkHealth(): Promise<{ status: string; mongodb: string; genai: string; timestamp: string }> {
  const response = await fetch(`${API_BASE_URL}/health`)
  if (!response.ok) {
    try { console.error('[api] GET /health failed', { base: API_BASE_URL, status: response.status }) } catch {}
    throw new ApiError(response.status, `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

// New helpers for 3-collection schema

export async function getChats(uid: string): Promise<ChatTitle[]> {
  const token = getAccessToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE_URL}/chats/${uid}`, { headers })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    try { console.error('[api] GET /chats/:uid failed', { base: API_BASE_URL, uid, status: res.status }) } catch {}
    throw new ApiError(res.status, 'Failed to fetch chats')
  }
  return res.json()
}

export async function createChat(uid: string, title: string): Promise<ChatTitle> {
  const token = getAccessToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE_URL}/chats/${uid}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title }),
  })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    try { console.error('[api] POST /chats/:uid failed', { base: API_BASE_URL, uid, status: res.status }) } catch {}
    throw new ApiError(res.status, 'Failed to create chat')
  }
  return res.json()
}

export async function getConvos(chatId: string): Promise<ConvoMeta[]> {
  const token = getAccessToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE_URL}/convos/${chatId}`, { headers })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    try { console.error('[api] GET /convos/:chatId failed', { base: API_BASE_URL, chatId, status: res.status }) } catch {}
    throw new ApiError(res.status, 'Failed to fetch convos')
  }
  return res.json()
}

export async function createConvo(chatId: string): Promise<ConversationHistory> {
  const token = getAccessToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE_URL}/convos/${chatId}`, { method: 'POST', headers })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    try { console.error('[api] POST /convos/:chatId failed', { base: API_BASE_URL, chatId, status: res.status }) } catch {}
    throw new ApiError(res.status, 'Failed to create convo')
  }
  return res.json()
}

export async function appendMessages(sessionId: string, messages: ConversationHistory['messages']): Promise<{ success: boolean }> {
  const token = getAccessToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE_URL}/convos/${sessionId}/messages`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    try { console.error('[api] PATCH /convos/:sessionId/messages failed', { base: API_BASE_URL, sessionId, status: res.status }) } catch {}
    throw new ApiError(res.status, 'Failed to append messages')
  }
  return res.json()
}

export { API_BASE_URL }

// Deletions
export async function deleteChat(chatId: string): Promise<{ success: boolean }> {
  const token = getAccessToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE_URL}/chats/${chatId}`, { method: 'DELETE', headers })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    try { console.error('[api] DELETE /chats/:chatId failed', { base: API_BASE_URL, chatId, status: res.status }) } catch {}
    throw new ApiError(res.status, 'Failed to delete chat')
  }
  return res.json()
}

export async function deleteConvo(sessionId: string): Promise<{ success: boolean }> {
  const token = getAccessToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE_URL}/convos/${sessionId}`, { method: 'DELETE', headers })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    try { 
      console.error('[api] DELETE /convos/:sessionId failed', { 
        method: 'DELETE', 
        url: `${API_BASE_URL}/convos/${sessionId}`, 
        status: res.status, 
        message: 'Failed to delete session' 
      }) 
    } catch {}
    throw new ApiError(res.status, 'Failed to delete session')
  }
  return res.json()
}