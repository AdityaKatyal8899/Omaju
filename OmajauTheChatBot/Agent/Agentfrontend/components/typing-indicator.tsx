"use client"
import React from "react"
import { cn } from "@/lib/utils"

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("inline-flex items-center", className)} role="status" aria-label="Assistant is typing">
      <div className="rounded-2xl bg-muted text-foreground/90 ring-1 ring-border px-3 py-2 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </div>
      </div>
      <style jsx>{`
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: currentColor;
          opacity: 0.6;
          display: block;
          animation: bounce 1.2s infinite ease-in-out;
        }
        .dot:nth-child(2) { animation-delay: 0.15s; }
        .dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
