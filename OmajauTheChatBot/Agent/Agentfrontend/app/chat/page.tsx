"use client"
import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { ChatWindow } from "@/components/chat-window"
import { SidebarNested, type ChatItem, type ConvoItem } from "@/components/sidebar-nested"
import { createChat, createConvo, getChats, getConvos, deleteChat, deleteConvo } from "@/lib/api"

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string>("")
  const [uid, setUid] = useState<string>("")
  const [chats, setChats] = useState<ChatItem[]>([])
  const [convosByChat, setConvosByChat] = useState<Record<string, ConvoItem[]>>({})
  const [activeChatId, setActiveChatId] = useState<string>("")
  const [uiLoading, setUiLoading] = useState<boolean>(false)
  // Auth gating
  const [authChecked, setAuthChecked] = useState<boolean>(false)
  const [redirecting, setRedirecting] = useState<boolean>(false)
  // OmajuSignUp endpoints (must be provided via env at build-time)
  const SIGNUP_FRONTEND_URL = process.env.NEXT_PUBLIC_SIGNUP_URL as string
  const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE as string
  // Sidebar layout: two fixed states only
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('sidebar_collapsed') : null
    return saved === 'true' ? true : false
  })
  // Mobile detection to avoid large left margins on small screens
  const [isMobile, setIsMobile] = useState<boolean>(false)
  // XS breakpoint detection: Sidebar is hidden below 640px (sm:block)
  const [isXs, setIsXs] = useState<boolean>(false)
  
  // On mount: verify authentication via OmajuSignUp backend and capture uid
  useEffect(() => {
    // 1) Capture tokens from URL if signup app redirected with them
    try {
      const url = new URL(window.location.href)
      const at = url.searchParams.get('accessToken')
      const rt = url.searchParams.get('refreshToken')
      if (at) localStorage.setItem('accessToken', at)
      if (rt) localStorage.setItem('refreshToken', rt)
      if (at || rt) {
        url.searchParams.delete('accessToken')
        url.searchParams.delete('refreshToken')
        // Clean URL without reloading
        window.history.replaceState({}, document.title, url.toString())
      }
    } catch {}

    const verifyAuth = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken')
        const refreshToken = localStorage.getItem('refreshToken')
        console.debug('[auth] tokens present?', { hasAccess: !!accessToken, hasRefresh: !!refreshToken })
        console.debug('[auth] AUTH_API_BASE:', AUTH_API_BASE, 'SIGNUP_FRONTEND_URL:', SIGNUP_FRONTEND_URL)
        if (!accessToken || !refreshToken) {
          // No tokens → redirect to sign-up
          const nextUrl = typeof window !== 'undefined' ? window.location.origin + '/chat' : '/chat'
          setRedirecting(true)
          window.location.href = `${SIGNUP_FRONTEND_URL}/sign-up?next=${encodeURIComponent(nextUrl)}`
          return
        }

        // Validate token with profile endpoint
        const profileUrl = `${AUTH_API_BASE}/profile`
        console.debug('[auth] calling profile:', profileUrl)
        const res = await fetch(profileUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!res.ok) {
          let body: any = null
          try { body = await res.text() } catch {}
          console.warn('[auth] profile failed', { status: res.status, body })
          // Token invalid or expired → redirect to sign-up
          const nextUrl = typeof window !== 'undefined' ? window.location.origin + '/chat' : '/chat'
          setRedirecting(true)
          window.location.href = `${SIGNUP_FRONTEND_URL}/sign-up?next=${encodeURIComponent(nextUrl)}`
          return
        }

        // Auth OK → allow rendering and set uid
        const data = await res.json()
        const id = data?.data?.user?._id || data?.data?.user?.id || data?.data?.user?.uid
        if (!id) throw new Error('No uid in profile')
        setUid(String(id))
        setAuthChecked(true)
      } catch (e) {
        // Network or other error → fail closed to sign-up
        console.error('[auth] verifyAuth error', e)
        const nextUrl = typeof window !== 'undefined' ? window.location.origin + '/chat' : '/chat'
        setRedirecting(true)
        window.location.href = `${SIGNUP_FRONTEND_URL}/sign-up?next=${encodeURIComponent(nextUrl)}`
      }
    }

    verifyAuth()
  }, [])
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const mqXs = window.matchMedia('(max-width: 639px)')
    const onChange = () => setIsMobile(mq.matches)
    const onChangeXs = () => setIsXs(mqXs.matches)
    onChange()
    onChangeXs()
    mq.addEventListener('change', onChange)
    mqXs.addEventListener('change', onChangeXs)
    return () => {
      mq.removeEventListener('change', onChange)
      mqXs.removeEventListener('change', onChangeXs)
    }
  }, [])

  // Ensure on mobile the sidebar is collapsed to 64px to avoid covering content
  useEffect(() => {
    if (isMobile && !sidebarCollapsed) {
      setSidebarCollapsed(true)
      localStorage.setItem('sidebar_collapsed', 'true')
    }
  }, [isMobile])

  // Load chats when authenticated
  useEffect(() => {
    if (!authChecked || !uid) return
    let mounted = true
    ;(async () => {
      try {
        const list = await getChats(uid)
        if (!mounted) return
        const mapped: ChatItem[] = list.map(c => ({ id: c._id, title: c.title, createdAt: c.created_at as any, updatedAt: c.updated_at as any }))
        setChats(mapped)
        // if no active chat, pick first
        if (!activeChatId && mapped.length) setActiveChatId(mapped[0].id)
      } catch (e) {
        // noop for now
      }
    })()
    return () => { mounted = false }
  }, [authChecked, uid])

  // Load convos when active chat changes
  useEffect(() => {
    if (!activeChatId) return
    let mounted = true
    ;(async () => {
      try {
        setUiLoading(true)
        const convos = await getConvos(activeChatId)
        if (!mounted) return
        const mapped: ConvoItem[] = convos.map(cv => ({ id: cv._id, chat_id: cv.chat_id, created_at: cv.created_at as any }))
        setConvosByChat(prev => ({ ...prev, [activeChatId]: mapped }))
        // choose a session if none selected
        const sid = mapped[0]?.id
        if (sid) {
          setSessionId(sid)
        } else {
          // no sessions yet → create one so ChatWindow can send immediately
          const convo = await createConvo(activeChatId)
          setConvosByChat(prev => ({
            ...prev,
            [activeChatId]: [{ id: convo._id!, chat_id: activeChatId, created_at: convo.created_at as any }]
          }))
          setSessionId(convo._id!)
        }
      } catch (e) {
        setConvosByChat(prev => ({ ...prev, [activeChatId]: [] }))
      } finally {
        setUiLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [activeChatId])

  const onCreateChat = async () => {
    if (!uid) return
    try {
      setUiLoading(true)
      const newChat = await createChat(uid, "Untitled chat")
      const mapped: ChatItem = { id: newChat._id, title: newChat.title, createdAt: newChat.created_at as any, updatedAt: newChat.updated_at as any }
      setChats(prev => [mapped, ...prev])
      setActiveChatId(mapped.id)
      // also create first convo automatically
      const convo = await createConvo(mapped.id)
      setConvosByChat(prev => ({ ...prev, [mapped.id]: [{ id: convo._id!, chat_id: mapped.id, created_at: convo.created_at as any }] }))
      setSessionId(convo._id!)
    } catch {} finally { setUiLoading(false) }
  }

  const onSelectChat = (chatId: string) => {
    setActiveChatId(chatId)
  }

  const onSelectConvo = (sid: string, chatId: string) => {
    setActiveChatId(chatId)
    setSessionId(sid)
  }

  const onFirstUserMessage = (text: string) => {
    // Name the active chat after the first user message (truncated)
    const title = text.trim().slice(0, 40) + (text.length > 40 ? "…" : "")
    setChats(prev => prev.map(c => (c.id === activeChatId ? { ...c, title: title || "Untitled chat" } : c)))
  }

  const onDeleteChat = async (chatId: string) => {
    try {
      setUiLoading(true)
      await deleteChat(chatId)
      setChats(prev => prev.filter(c => c.id !== chatId))
      setConvosByChat(prev => { const next = { ...prev } as Record<string, ConvoItem[]>; delete (next as any)[chatId]; return next })
      if (activeChatId === chatId) {
        const remaining = chats.filter(c => c.id !== chatId)
        const nextChatId = remaining[0]?.id || ""
        setActiveChatId(nextChatId)
        const nextSessions = nextChatId ? (convosByChat[nextChatId] || []) : []
        setSessionId(nextSessions[0]?.id || "")
      }
    } catch {}
    finally { setUiLoading(false) }
  }

  const onDeleteConvo = async (sessionIdToDelete: string) => {
    try {
      setUiLoading(true)
      await deleteConvo(sessionIdToDelete)
      setConvosByChat(prev => ({
        ...prev,
        [activeChatId]: (prev[activeChatId] || []).filter(c => c.id !== sessionIdToDelete)
      }))
      if (sessionId === sessionIdToDelete) {
        const next = (convosByChat[activeChatId] || []).find(c => c.id !== sessionIdToDelete)
        setSessionId(next?.id || "")
      }
    } catch {}
    finally { setUiLoading(false) }
  }

  // Loading/redirect states
  if (redirecting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <span className="loader" />
      </div>
    )
  }

  if (!authChecked) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <span className="loader" />
    </div>
  )

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden">
      {/* Sidebar is fixed at the left and can be resized by dragging. */}
      <SidebarNested
        chats={chats}
        convosByChat={convosByChat}
        activeChatId={activeChatId}
        activeSessionId={sessionId}
        collapsed={sidebarCollapsed}
        onToggle={() => {
          const next = !sidebarCollapsed
          setSidebarCollapsed(next)
          localStorage.setItem('sidebar_collapsed', String(next))
        }}
        onCreateChat={onCreateChat}
        onCreateConvo={async (chatId) => {
          try {
            setUiLoading(true)
            const convo = await createConvo(chatId)
            setConvosByChat(prev => ({
              ...prev,
              [chatId]: [{ id: convo._id!, chat_id: chatId, created_at: convo.created_at as any }, ...(prev[chatId] || [])]
            }))
            setActiveChatId(chatId)
            setSessionId(convo._id!)
          } catch {} finally { setUiLoading(false) }
        }}
        onSelectChat={onSelectChat}
        onSelectConvo={onSelectConvo}
        onDeleteChat={onDeleteChat}
        onDeleteConvo={onDeleteConvo}
      />

      {/* Shift header to the right by sidebar width (or 64px when collapsed) and shrink its width */}
      <div
        style={{
          marginLeft: isXs ? 0 : (sidebarCollapsed ? 64 : 320),
          width: isXs ? '100%' : `calc(100% - ${(sidebarCollapsed ? 64 : 320)}px)`,
        }}
        className="transition-[margin,width] duration-200 ease-out"
      >
        {/* Minimal chat header: back button only, nav hidden, quick "New chat" action */}
        <Header
          showNav={false}
          showBack
          backHref="/"
          showNewChat
          onNewChat={onCreateChat}
          mobileChats={chats}
          mobileConvosByChat={convosByChat}
          mobileActiveChatId={activeChatId}
          mobileActiveSessionId={sessionId}
          onMobileCreateChat={onCreateChat}
          onMobileCreateConvo={async (chatId) => {
            try {
              const convo = await createConvo(chatId)
              setConvosByChat(prev => ({
                ...prev,
                [chatId]: [{ id: convo._id!, chat_id: chatId, created_at: convo.created_at as any }, ...(prev[chatId] || [])]
              }))
              setActiveChatId(chatId)
              setSessionId(convo._id!)
            } catch {}
          }}
          onMobileSelectChat={onSelectChat}
          onMobileSelectConvo={onSelectConvo}
        />
      </div>

      {/* Content below header, offset down by 60px as requested, and shifted right by sidebar width */}
      <div
        className="flex w-full transition-[margin] duration-200 ease-out"
        style={{
          marginTop: 72,
          height: `calc(100vh - 72px - 64px)`,
          marginLeft: isXs ? 0 : (sidebarCollapsed ? 64 : 320),
        }}
      >
        <div className="flex-1 flex justify-start sm:justify-center px-2 sm:px-0">
          {/* Mobile: shrink chat box on small devices; Desktop: keep 960px content width */}
          <div className="w-full sm:w-[960px] max-w-full max-[430px]:max-w-[430px] max-[375px]:max-w-[375px]">
            {uiLoading && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <span className="loader" />
              </div>
            )}
            <ChatWindow
              sessionId={sessionId}
              chatId={activeChatId}
              onFirstUserMessage={onFirstUserMessage}
              onAnyMessage={() => {
                // Best-effort bump of chat updatedAt in local state
                setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, updatedAt: new Date().toISOString() } : c))
              }}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
