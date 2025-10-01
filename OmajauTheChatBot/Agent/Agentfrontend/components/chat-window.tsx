"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { getConversationHistory, sendChatMessage } from "@/lib/api"
import { ApiError } from "@/lib/api"
import { MessageBubble, type Message } from "./message-bubble"
import { InputBox } from "./input-box"
import { EmptyState } from "./empty-state"
import { useToast } from "@/components/ui/use-toast"
import { TypingIndicator } from "./typing-indicator"

interface ChatWindowProps {
  sessionId: string
  chatId?: string
  onFirstUserMessage?: (text: string) => void
  /** Optional: notify parent when any message (user or assistant) is appended */
  onAnyMessage?: (role: 'user' | 'assistant') => void
}

export function ChatWindow({ sessionId, chatId, onFirstUserMessage, onAnyMessage }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasNamed, setHasNamed] = useState(false)
  const tailRef = useRef<HTMLDivElement | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    let mounted = true
    async function fetchMessages() {
      if (!sessionId) return
      try {
        const conversation = await getConversationHistory(sessionId)
        if (!mounted) return
        if (conversation?.messages) setMessages(conversation.messages as Message[])
        else setMessages([])
      } catch (e) {
        toast({
          title: "Failed to load messages",
          description: "Please check your connection and try again.",
          duration: 2500,
          style: { background: "#ff4d6d", color: "#fff" },
        })
      }
    }
    fetchMessages()
    return () => { mounted = false }
  }, [sessionId, toast])

  useEffect(() => {
    tailRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async (text: string) => {
    if (!sessionId) {
      toast({
        title: "Setting things up…",
        description: "Please wait a moment while we initialize your session.",
        duration: 1800,
      })
      return
    }
    const userMsg: Message = { role: "user", content: text, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    try { onAnyMessage?.('user') } catch {}
    if (!hasNamed && onFirstUserMessage) {
      setHasNamed(true)
      onFirstUserMessage(text)
    }

    const placeholder: Message = { role: "assistant", content: "", timestamp: new Date().toISOString() }
    setIsLoading(true)
    setMessages(prev => [...prev, placeholder])
    try {
      const res = await sendChatMessage({ session_id: sessionId, message: text, chat_id: chatId })
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: "assistant",
          content: res.response,
          timestamp: new Date().toISOString(),
        }
        return updated
      })
      try { onAnyMessage?.('assistant') } catch {}
      // Toast notify for new assistant message
      toast({
        title: "New reply",
        description: "Assistant sent a response",
        duration: 1800,
        style: { background: "#00f5d4", color: "#002", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" },
      })
    } catch (e) {
      const status = e instanceof ApiError ? e.status : undefined
      const description = status ? `Server returned ${status}.` : "Could not reach server."
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: "assistant",
          content: status ? `Oops! Something went wrong (HTTP ${status}).` : "Oops! Something went wrong.",
          timestamp: new Date().toISOString(),
        }
        return updated
      })
      toast({
        title: "Message failed",
        description,
        duration: 2500,
        style: { background: "#ff4d6d", color: "#fff" },
      })
    } finally {
      setIsLoading(false)
    }
  }

  const hasMessages = messages.length > 0

  return (
    <section className="flex h-full w-full flex-col">
      {/* MOBILE: left padding via px-2; DESKTOP: px-4 keeps wider gutters */}
      {/* Messages scroller: large top padding for sticky header, generous bottom padding for sticky input (responsive on mobile) */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-2 sm:px-4 pt-20 sm:pt-24 pb-28 sm:pb-40">
        {!hasMessages ? (
          <div className="mx-auto flex h-full max-w-3xl items-center justify-center">
            <EmptyState onSend={handleSend} disabled={isLoading || !sessionId} />
          </div>
        ) : (
          // MOBILE: align to left with mx-0 + px-1 so bubbles don't touch screen edge; DESKTOP: center with mx-auto
          <div className="mx-0 sm:mx-auto px-1 sm:px-0 flex max-w-4xl flex-col space-y-3">
            {messages.map((m, i) => (
              <MessageBubble key={i} msg={m} />
            ))}
            <div ref={tailRef} />
          </div>
        )}
      </div>
      {hasMessages && <InputBox onSend={handleSend} disabled={isLoading || !sessionId} />}
      {isLoading && <TypingIndicator />}
    </section>
  )
}
