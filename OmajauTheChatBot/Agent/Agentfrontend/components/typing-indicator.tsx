"use client"
import React, { useEffect, useRef } from "react"
import gsap from "gsap"
import { cn } from "@/lib/utils"

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!wrapRef.current) return
    const tl = gsap.timeline()
    tl.fromTo(
      wrapRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.25, ease: "power2.out" }
    )
    return () => { tl.kill() }
  }, [])

  return (
    <div
      ref={wrapRef}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm",
        "transition-opacity",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Assistant is typing"
    >
      {/* Loader from Uiverse.io by Shoh2008 */}
      <span className="loader" />
      <style jsx>{`
        .loader {
          display: block;
          width: 84px;
          height: 84px;
          position: relative;
        }

        .loader:before, .loader:after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 0;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #FFF;
          transform: translate(-50% , -100%) scale(0);
          animation: push_401 2s infinite linear;
        }

        .loader:after {
          animation-delay: 1s;
        }

        @keyframes push_401 {
          0%, 50% {
            transform: translate(-50%, 0%) scale(1);
          }
          100% {
            transform: translate(-50%, -100%) scale(0);
          }
        }
      `}</style>
    </div>
  )
}
