"use client"
import { useEffect, useState } from "react"
import { Plus, PanelLeftClose, PanelLeftOpen, Trash2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

// Thread items shown in the sidebar
export interface Thread {
  id: string
  title: string
  createdAt: string
  /**
   * Last updated timestamp (optional). When available, we show this under the title.
   */
  updatedAt?: string
}

interface SidebarProps {
  threads: Thread[]
  activeId?: string
  collapsed?: boolean
  onToggle?: () => void
  onSelect?: (id: string) => void
  onNew?: () => void
  onDelete?: (id: string) => void
}

export function Sidebar({ threads, activeId, collapsed, onToggle, onSelect, onNew, onDelete }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(collapsed ?? false)
  const [query, setQuery] = useState("")

  // Initialize collapsed state from props or localStorage
  useEffect(() => {
    if (typeof collapsed === "boolean") {
      setIsCollapsed(collapsed)
    } else {
      const saved = localStorage.getItem("sidebar_collapsed")
      if (saved) setIsCollapsed(saved === "true")
    }
  }, [collapsed])

  const toggle = () => {
    setIsCollapsed(v => !v)
    onToggle?.()
    // Persist collapsed state
    setTimeout(() => localStorage.setItem("sidebar_collapsed", String(!isCollapsed)), 0)
  }

  // Fixed widths: collapsed 64px, expanded 320px
  const pxWidth = isCollapsed ? 64 : 320

  return (
    <aside
      className={cn(
        // Fixed glass panel pinned to the left; header/content offset via padding/margin
        "fixed top-0 left-0 z-20 h-screen transition-[width] duration-150",
        // Hide the sidebar rail on small screens; keep desktop behavior unchanged
        "hidden sm:block",
        // Theme-aware border and subtle background
        "border-r border-border/60 backdrop-blur-md bg-background/20 brand-shadow rounded-r-xl"
      )}
      style={{ width: pxWidth }}
      aria-label="Chat history sidebar"
    >
      {/* Top bar: title (when expanded) + collapse/expand button (aligned to very top to sit BESIDE the navbar) */}
      <div className="flex items-center justify-between px-2 py-4 border-b border-border/60">
        {!isCollapsed && (
          <div className="px-2 py-1 text-sm font-heading text-foreground/90 tracking-wide">Chats</div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground/80 hover:text-foreground"
          onClick={toggle}
          aria-label={isCollapsed ? "Expand chat sidebar" : "Collapse chat sidebar"}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <PanelLeftOpen className="h-5 w-5"/> : <PanelLeftClose className="h-5 w-5"/>}
        </Button>
      </div>
      {/* New chat CTA */}
      <div className="p-2">
        <Button
          onClick={onNew}
          className={cn(
            "w-full text-foreground rounded-lg shadow-sm",
            "bg-[--brand-button] hover:brightness-10",
            isCollapsed && "px-0"
          )}
          aria-label="Create new chat"
        >
          <Plus className="mr-2 h-4 w-4" /> {!isCollapsed && "New Convo"}
        </Button>
      </div>

      {/* Search / filter input (expanded only) */}
      {!isCollapsed && (
        <div className="px-2 pb-1">
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
      )}
      {/* List of threads */}
      <ScrollArea className="h-[calc(100%-140px)] px-2 pb-2 no-scrollbar">
        <div className="space-y-1">
          {threads
            .filter(t => t.title.toLowerCase().includes(query.toLowerCase()))
            .map(t => (
            // Use a non-button container so we can include a dedicated delete <button>
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect?.(t.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSelect?.(t.id) }}
              className={cn(
                // Item styling: extra transparent base, subtle hover, stronger active
                "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                "text-foreground/85 hover:bg-foreground/10 bg-transparent transition-colors",
                activeId === t.id && "bg-[color-mix(in_srgb,_var(--brand-button)_24%,_#000_76%)] text-foreground outline outline-1 outline-foreground/10 dark:outline-white/10"
              )}
              title={new Date(t.createdAt).toLocaleString()}
            >
              <div className="flex min-w-0 items-center gap-2">
                {/* Active indicator bar on the left */}
                <span
                  aria-hidden
                  className={cn(
                    "h-4 w-1 rounded-full flex-shrink-0",
                    activeId === t.id ? "bg-[--brand-button]" : "bg-transparent",
                    isCollapsed && "hidden"
                  )}
                />
                {/* Title + timestamp preview (expanded only) */}
                <div className={cn("min-w-0", isCollapsed && "hidden")}>
                  <div className="truncate">{t.title}</div>
                  <div className="truncate text-[10px] text-foreground/60" suppressHydrationWarning>
                    {(t.updatedAt || t.createdAt) ? new Date(t.updatedAt || t.createdAt).toLocaleString() : ''}
                  </div>
                </div>
              </div>
              {/* Unread indicator dot when not active and updatedAt differs from createdAt */}
              {(!isCollapsed && activeId !== t.id && t.updatedAt && t.updatedAt !== t.createdAt) && (
                <span aria-label="Unread" title="Unread messages" className="ml-2 inline-block h-2.5 w-2.5 rounded-full bg-[--brand-notification] shadow-[0_0_8px_2px_rgba(0,245,212,0.4)]" />
              )}
              {/* Dedicated delete button for reliable clicking and accessibility */}
              {!isCollapsed && (
                <button
                  type="button"
                  aria-label={`Delete chat ${t.title}`}
                  className="rounded p-1 text-red-400 opacity-0 transition-all hover:text-red-300 hover:bg-white/5 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Lightweight confirmation; can be replaced with shadcn AlertDialog if desired
                    if (window.confirm(`Delete chat: "${t.title}"? This cannot be undone.`)) {
                      onDelete?.(t.id)
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      {/* No drag handle: width is fixed to 64px (collapsed) or 320px (expanded) */}
    </aside>
  )
}
