"use client"
import React, { useEffect, useRef, useState } from "react"
import { Mic, Plus, SendHorizonal } from "lucide-react"
import { cn } from "@/lib/utils"
import gsap from "gsap"

interface EmptyStateProps {
  onSend: (text: string) => void
  disabled?: boolean
}

export function EmptyState({ onSend, disabled }: EmptyStateProps) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    if (wrapRef.current) {
      gsap.fromTo(
        wrapRef.current,
        { opacity: 0, y: 8, scale: 0.99 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "power2.out" }
      )
    }
  }, [])

  const submit = () => {
    if (!value.trim() || disabled) return
    onSend(value)
    setValue("")
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div ref={wrapRef} className="w-full px-3 sm:px-4 text-center">
      <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
        <h1 className="font-heading text-xl sm:text-3xl md:text-4xl text-foreground">Where should we begin?</h1>
        <div className="relative mx-auto w-full max-w-xl sm:max-w-2xl">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-foreground/60">
            <Plus className="h-5 w-5" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything"
            className={cn(
              "w-full rounded-full bg-card/60 px-10 sm:px-12 pr-14 sm:pr-16 py-3.5 sm:py-4 text-foreground placeholder:text-foreground/60",
              "ring-1 ring-border/60 shadow-lg focus:outline-none focus:ring-2 focus:ring-[--brand-input]/40"
            )}
            disabled={!!disabled}
          />
          <div className="absolute inset-y-0 right-2 flex items-center gap-1">
            <button
              type="button"
              aria-label="Send"
              onClick={submit}
              disabled={!!disabled}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-full border-2 transition-all",
                disabled
                  ? "bg-foreground/10 text-foreground/40 border-foreground/20"
                  : "bg-[--brand-button] text-white dark:text-foreground border-[--brand-button] shadow hover:shadow-[0_0_0_6px_rgba(38,103,255,0.35)] hover:brightness-110"
              )}
            >
              <SendHorizonal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
