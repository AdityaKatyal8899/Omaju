"use client"
import React, { useEffect, useRef } from "react"
import gsap from "gsap"
import { cn } from "@/lib/utils"

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
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
    </div>
  )
}
