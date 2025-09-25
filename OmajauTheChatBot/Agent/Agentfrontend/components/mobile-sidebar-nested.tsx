"use client"

import { Plus, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useState } from "react"

export interface MobileChatItem { id: string; title: string; createdAt: string; updatedAt?: string }
export interface MobileConvoItem { id: string; chat_id: string; created_at: string }

interface MobileSidebarNestedProps {
  chats: MobileChatItem[]
  convosByChat: Record<string, MobileConvoItem[]>
  activeChatId?: string
  activeSessionId?: string
  onSelectChat?: (chatId: string) => void
  onSelectConvo?: (sessionId: string, chatId: string) => void
  onCreateChat?: () => void
  onCreateConvo?: (chatId: string) => void
}

export function MobileSidebarNested({ chats, convosByChat, activeChatId, activeSessionId, onSelectChat, onSelectConvo, onCreateChat, onCreateConvo }: MobileSidebarNestedProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/60">
        <div className="text-sm font-heading text-foreground/90">Chats</div>
        <Button onClick={onCreateChat} className="brand-button text-white rounded-full h-8 px-3 shadow hover:brightness-110">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2 pb-2">
        <div className="space-y-1">
          {chats.map(chat => {
            const isOpen = expanded[chat.id] || chat.id === activeChatId
            const convos = convosByChat[chat.id] || []
            return (
              <div key={chat.id} className="rounded-lg">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { toggle(chat.id); onSelectChat?.(chat.id) }}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                    "text-foreground/85 hover:bg-foreground/10 bg-transparent transition-colors",
                    activeChatId === chat.id && "bg-foreground/10 text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                    <div className="truncate">{chat.title}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onCreateConvo?.(chat.id) }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {isOpen && (
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
                        <span className="truncate">{new Date(c.created_at).toLocaleString()}</span>
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
    </div>
  )
}
