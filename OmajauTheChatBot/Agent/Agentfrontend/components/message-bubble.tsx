import React, { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Markdown } from "./markdown"
import gsap from "gsap"

export interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user"
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!wrapRef.current) return
    const el = wrapRef.current
    gsap.fromTo(
      el,
      { y: 8, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.26, ease: "power2.out" }
    )
  }, [])
  return (
    <div
      ref={wrapRef}
      className={cn(
        "flex w-full items-start gap-2 sm:gap-3 px-2 max-[360px]:px-1 sm:px-0",
        isUser ? "justify-end pr-2 max-[360px]:pr-1 sm:pr-0" : "justify-start pl-2 max-[360px]:pl-1 sm:pl-0"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] max-[430px]:max-w-[78%] max-[375px]:max-w-[76%] sm:max-w-[70%] rounded-2xl sm:rounded-3xl px-2 sm:px-4 py-1.5 sm:py-2 text-white shadow-md transition-all",
          isUser
            ? "bg-[#343a40] text-white"
            : "bg-[#343a40] text-white ring-1 ring-white/10"
        )}
      >
        <div className="font-chat leading-relaxed text-[12px] sm:text-[15px] break-words">
          {isUser ? (
            <div className="whitespace-pre-wrap">{msg.content}</div>
          ) : (
            <Markdown text={msg.content} />
          )}
        </div>
        <div className="mt-1.5 sm:mt-2 text-right text-[8px] sm:text-[10px] text-white/70">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  )
}
