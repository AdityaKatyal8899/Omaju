"use client"
import React from "react"
import { cn } from "@/lib/utils"

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
<<<<<<< HEAD
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
=======
  const dotsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!dotsRef.current) return
    const dots = dotsRef.current.querySelectorAll("span")
    const tl = gsap.timeline({ repeat: -1 })
    tl.to(dots, { opacity: 0.3, stagger: 0.12, duration: 0.25, ease: "power1.inOut" })
      .to(dots, { opacity: 1, stagger: 0.12, duration: 0.25, ease: "power1.inOut" }, 0.12)
    return () => { tl.kill() }
  }, [])

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <div
        className="rounded-3xl bg-[#1b263b] text-white ring-1 ring-white/10 px-4 py-2 shadow-md"
        aria-live="polite"
        aria-label="Assistant is typing"
      >
        <div ref={dotsRef} className="flex items-center gap-1">
          <span className="block h-2 w-2 rounded-full bg-white/80" />
          <span className="block h-2 w-2 rounded-full bg-white/80" />
          <span className="block h-2 w-2 rounded-full bg-white/80" />
        </div>
      </div>
>>>>>>> parent of 02884cf (1/10/25)
    </div>
  )
}
