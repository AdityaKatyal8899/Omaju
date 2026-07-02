const API_BASE_URL = '/api';
const CHAT_API_URL = process.env.NEXT_PUBLIC_CHAT_API_URL || 'http://localhost:5000';

export interface SignupData {
  email: string;
  password: string;
  name: string;
}

export interface SigninData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  isEmailVerified?: boolean;
  username?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

export const authAPI = {
  signup: async (userData: SignupData): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Signup failed');
    return data;
  },

  signin: async (credentials: SigninData): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Signin failed');
    return data;
  },

  getProfile: async (token: string): Promise<{ success: boolean; data: { user: User } }> => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to get profile');
    return data;
  },

  loginWithGoogle: () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  },
  loginWithGithub: () => {
    window.location.href = `${API_BASE_URL}/auth/github`;
  },

  refreshToken: async (refreshToken: string): Promise<{ success: boolean; data: { tokens: { accessToken: string; refreshToken: string } } }> => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Token refresh failed');
    return data;
  },

  logout: async (token: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Logout failed');
    return data;
  },

  healthCheck: async (): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Health check failed');
    return data;
  },
};

// ========================
// Chat API Functions
// ========================

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
    const nextUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/chat'
    window.location.href = `/sign-in?next=${encodeURIComponent(nextUrl)}`
  } catch {}
}

export async function updateChatTitle(chatId: string, title: string): Promise<ChatTitle> {
  const token = getAccessToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${CHAT_API_URL}/chats/${chatId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ title }),
  })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    throw new ApiError(res.status, 'Failed to update chat title')
  }
  return res.json()
}

export async function sendChatMessage(message: ChatMessage): Promise<ChatResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getAccessToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${CHAT_API_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(message),
    mode: 'cors',
  })

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized()
    throw new ApiError(response.status, `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function getConversationHistory(sessionId: string): Promise<ConversationHistory | null> {
  const token = getAccessToken()
  const init: RequestInit = {}
  if (token) {
    init.headers = { 'Authorization': `Bearer ${token}` }
  }
  const response = await fetch(`${CHAT_API_URL}/messages/${sessionId}`, init)
  if (response.status === 404) return null
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized()
    throw new ApiError(response.status, `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

export async function checkHealth(): Promise<{ status: string; mongodb: string; genai: string; timestamp: string }> {
  const response = await fetch(`${CHAT_API_URL}/health`)
  if (!response.ok) {
    throw new ApiError(response.status, `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

export async function getChats(uid: string): Promise<ChatTitle[]> {
  const token = getAccessToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${CHAT_API_URL}/chats/${uid}`, { headers })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    throw new ApiError(res.status, 'Failed to fetch chats')
  }
  return res.json()
}

export async function createChat(uid: string, title: string): Promise<ChatTitle> {
  const token = getAccessToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${CHAT_API_URL}/chats/${uid}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title }),
  })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    throw new ApiError(res.status, 'Failed to create chat')
  }
  return res.json()
}

export async function getConvos(chatId: string): Promise<ConvoMeta[]> {
  const token = getAccessToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${CHAT_API_URL}/convos/${chatId}`, { headers })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    throw new ApiError(res.status, 'Failed to fetch convos')
  }
  return res.json()
}

export async function createConvo(chatId: string): Promise<ConversationHistory> {
  const token = getAccessToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${CHAT_API_URL}/convos/${chatId}`, { method: 'POST', headers })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    throw new ApiError(res.status, 'Failed to create convo')
  }
  return res.json()
}

export async function appendMessages(sessionId: string, messages: ConversationHistory['messages']): Promise<{ success: boolean }> {
  const token = getAccessToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${CHAT_API_URL}/convos/${sessionId}/messages`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    throw new ApiError(res.status, 'Failed to append messages')
  }
  return res.json()
}

export async function deleteChat(chatId: string): Promise<{ success: boolean }> {
  const token = getAccessToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${CHAT_API_URL}/chats/${chatId}`, { method: 'DELETE', headers })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    throw new ApiError(res.status, 'Failed to delete chat')
  }
  return res.json()
}

export async function deleteConvo(sessionId: string): Promise<{ success: boolean }> {
  const token = getAccessToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${CHAT_API_URL}/convos/${sessionId}`, { method: 'DELETE', headers })
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized()
    throw new ApiError(res.status, 'Failed to delete session')
  }
  return res.json()
}
