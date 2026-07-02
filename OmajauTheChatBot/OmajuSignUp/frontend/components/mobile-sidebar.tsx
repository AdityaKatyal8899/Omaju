"use client"

import { useState } from "react"
import { Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Thread } from "@/components/sidebar"

interface MobileSidebarProps {
  threads: Thread[]
  activeId?: string
  onSelect?: (id: string) => void
  onNew?: () => void
  onDelete?: (id: string) => void
}

export function MobileSidebar({ threads, activeId, onSelect, onNew, onDelete }: MobileSidebarProps) {
  const [query, setQuery] = useState("")

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/60">
        <div className="text-sm font-heading text-foreground/90">Chats</div>
        <Button onClick={onNew} className="brand-button text-white rounded-full h-8 px-3 shadow hover:brightness-110">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats..."
            className="pl-10 rounded-full bg-[--brand-input]/20 border-border/60 text-foreground placeholder:text-foreground/60 shadow-sm focus:ring-2 focus:ring-[--brand-input]/40"
          />
        </div>
      </div>

      {/* Threads */}
      <ScrollArea className="flex-1 px-2 pb-2">
        <div className="space-y-1">
          {threads
            .filter(t => t.title.toLowerCase().includes(query.toLowerCase()))
            .map(t => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect?.(t.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelect?.(t.id) }}
                className={cn(
                  "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                  "text-foreground/85 hover:bg-foreground/10 bg-transparent transition-colors",
                  activeId === t.id && "bg-[color-mix(in_srgb,_var(--brand-button)_24%,_#000_76%)] text-foreground outline outline-1 outline-foreground/10 dark:outline-white/10"
                )}
                title={new Date(t.createdAt).toLocaleString()}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.title}</div>
                  <div className="truncate text-[10px] text-foreground/60">
                    {(t.updatedAt || t.createdAt) ? new Date(t.updatedAt || t.createdAt).toLocaleString() : ''}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Delete chat ${t.title}`}
                  className="rounded p-1 text-red-400 opacity-0 transition-all hover:text-red-300 hover:bg-white/5 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm(`Delete chat: "${t.title}"? This cannot be undone.`)) {
                      onDelete?.(t.id)
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
        </div>
      </ScrollArea>
    </div>
  )
}
