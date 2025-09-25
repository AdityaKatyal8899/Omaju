"use client"
import { useState } from "react"
import { Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export interface ChatItem {
  id: string
  title: string
  createdAt: string
  updatedAt?: string
}

export interface ConvoItem {
  id: string
  chat_id: string
  created_at: string
}

interface SidebarNestedProps {
  chats: ChatItem[]
  convosByChat: Record<string, ConvoItem[]>
  activeChatId?: string
  activeSessionId?: string
  collapsed?: boolean
  onToggle?: () => void
  onSelectChat?: (chatId: string) => void
  onSelectConvo?: (sessionId: string, chatId: string) => void
  onCreateChat?: () => void
  onCreateConvo?: (chatId: string) => void
  onDeleteChat?: (chatId: string) => void
  onDeleteConvo?: (sessionId: string) => void
}

export function SidebarNested({
  chats,
  convosByChat,
  activeChatId,
  activeSessionId,
  collapsed,
  onToggle,
  onSelectChat,
  onSelectConvo,
  onCreateChat,
  onCreateConvo,
  onDeleteChat,
  onDeleteConvo,
}: SidebarNestedProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const isCollapsed = collapsed ?? false

  const toggleChat = (chatId: string) => setExpanded(prev => ({ ...prev, [chatId]: !prev[chatId] }))

  const pxWidth = isCollapsed ? 64 : 320

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-40 h-screen transition-[width] duration-150",
        "hidden sm:block",
        "border-r border-border/60 backdrop-blur-md bg-background/20 brand-shadow rounded-r-xl"
      )}
      style={{ width: pxWidth }}
      aria-label="Chat history sidebar"
    >
      <div className="flex items-center justify-between px-2 py-4 border-b border-border/60">
        {!isCollapsed && (
          <div className="px-2 py-1 text-sm font-heading text-foreground/90 tracking-wide">Chats</div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground/80 hover:text-foreground"
          onClick={onToggle}
          aria-label={isCollapsed ? "Expand chat sidebar" : "Collapse chat sidebar"}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {/* icon placeholder handled by parent toggle */}
          <span className="font-bold">{isCollapsed ? ">" : "<"}</span>
        </Button>
      </div>

      <div className="p-2">
        <Button
          onClick={onCreateChat}
          className={cn(
            "w-full text-foreground rounded-lg shadow-sm",
            "bg-[--brand-button] hover:brightness-10",
            isCollapsed && "px-0"
          )}
          aria-label="Create new chat"
        >
          <Plus className="mr-2 h-4 w-4" /> {!isCollapsed && "New Chat"}
        </Button>
      </div>

      <ScrollArea className="h-[calc(100%-140px)] px-2 pb-2 no-scrollbar">
        <div className="space-y-1">
          {chats.map(chat => {
            const isActiveChat = chat.id === activeChatId
            const isOpen = expanded[chat.id] || isActiveChat
            const convos = convosByChat[chat.id] || []
            return (
              <div key={chat.id} className="rounded-lg">
                {/* Chat row */}
                <div
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                    "text-foreground/85 hover:bg-foreground/10 bg-transparent transition-colors",
                    isActiveChat && "bg-[color-mix(in_srgb,_var(--brand-button)_24%,_#000_76%)] text-foreground outline outline-1 outline-foreground/10 dark:outline-white/10"
                  )}
                  onClick={() => {
                    toggleChat(chat.id)
                    onSelectChat?.(chat.id)
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen ? <ChevronDown className="h-4 w-4 flex-shrink-0"/> : <ChevronRight className="h-4 w-4 flex-shrink-0"/>}
                    {!isCollapsed && <div className="truncate">{chat.title}</div>}
                  </div>
                  {!isCollapsed && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onCreateConvo?.(chat.id) }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <button
                        type="button"
                        aria-label={`Delete chat ${chat.title}`}
                        className="rounded p-1 text-red-400 opacity-0 transition-all hover:text-red-300 hover:bg-white/5 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete chat: "${chat.title}"? This cannot be undone.`)) onDeleteChat?.(chat.id) }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {/* Convos list */}
                {isOpen && !isCollapsed && (
                  <div className="ml-6 space-y-1">
                    {convos.map(c => (
                      <div
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectConvo?.(c.id, chat.id)}
                        className={cn(
                          "flex items-center justify-between rounded-md px-3 py-1.5 text-xs text-foreground/85 hover:bg-foreground/10",
                          activeSessionId === c.id && "bg-foreground/15 text-foreground"
                        )}
                        title={new Date(c.created_at).toLocaleString()}
                      >
                        <span className="truncate" suppressHydrationWarning>{new Date(c.created_at).toLocaleString()}</span>
                        <button className="rounded p-1 text-red-400 opacity-0 transition-all hover:text-red-300 hover:bg-white/5 group-hover:opacity-100" aria-label="Delete convo" onClick={(e) => { e.stopPropagation(); onDeleteConvo?.(c.id) }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {convos.length === 0 && (
                      <div className="px-3 py-1.5 text-xs text-foreground/60">No sessions yet</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </aside>
  )
}
