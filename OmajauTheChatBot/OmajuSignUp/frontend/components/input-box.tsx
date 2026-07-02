"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowUp, SendHorizonal } from "lucide-react"
import { cn } from "@/lib/utils"

interface InputBoxProps {
  onSend: (text: string) => void
  disabled?: boolean
}

export function InputBox({ onSend, disabled }: InputBoxProps) {
  const [value, setValue] = useState("")
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  const autosize = useCallback(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 200) + "px"
  }, [])

  useEffect(() => { autosize() }, [value, autosize])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!value.trim()) return
      onSend(value)
      setValue("")
    }
  }

return (
  <div className="sticky bottom-0 z-10 w-full border-t border-border/60 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/70 pb-[env(safe-area-inset-bottom,0px)]">
    {/* MOBILE: left-align and reduce horizontal padding; DESKTOP: center with larger padding */}
    <div className="flex w-full sm:max-w-4xl items-end justify-start sm:justify-center px-2 max-[375px]:px-1 max-[320px]:px-1 sm:px-6 py-2 max-[375px]:py-1.5 max-[320px]:py-1">
      <div className="relative flex-1 rounded-2xl sm:rounded-3xl bg-card/50 p-1.5 max-[375px]:p-1 max-[320px]:p-0.5 sm:p-2 shadow-inner ring-1 ring-border/60">
        <textarea
          ref={taRef}
          className={cn(
            // MOBILE: tighter paddings, smaller font and height; DESKTOP: keep original spacing
            "font-chat w-full resize-none bg-transparent px-3 max-[375px]:px-2 max-[320px]:px-2 sm:px-4 pr-10 max-[375px]:pr-9 max-[320px]:pr-8 sm:pr-12 py-1.5 max-[375px]:py-1 max-[320px]:py-0.5 sm:py-2 text-foreground placeholder:text-foreground/60 focus:outline-none",
            "max-h-[160px] min-h-[30px] text-[13px] max-[360px]:text-[12px] max-[320px]:text-[11px] sm:text-[15px] leading-normal"
          )}
          placeholder="Ask Something..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!!disabled}
          // MOBILE: single row base to feel compact; auto-expands via autosize
          rows={1}
        />

        <button
          aria-label="Send message"
          onClick={() => {
            if (value.trim()) {
              onSend(value);
              setValue("");
            }
          }}
          disabled={!!disabled}
          className={cn(
            // MOBILE: smaller, tucked into the corner; DESKTOP: original size
            "absolute right-1.5 max-[375px]:right-1 max-[320px]:right-1 sm:right-2 bottom-1.5 max-[375px]:bottom-1 max-[320px]:bottom-1 sm:bottom-2 grid h-9 w-9 max-[375px]:h-8 max-[375px]:w-8 max-[320px]:h-7 max-[320px]:w-7 sm:h-10 sm:w-10 place-items-center rounded-full border-2 transition-all",
            disabled
              ? "bg-foreground/10 text-foreground/40 border-foreground/20"
              : "bg-[--brand-button] text-white dark:text-foreground border-[--brand-button] shadow-lg hover:shadow-[0_0_0_4px_rgba(38,103,255,0.35)] hover:brightness-110"
          )}
        >
          {/* MOBILE: icon size slightly smaller */}
          <ArrowUp className="h-4 w-4 max-[375px]:h-3.5 max-[375px]:w-3.5 max-[320px]:h-3 max-[320px]:w-3 sm:h-5 sm:w-5" />
        </button>
      </div>
    </div>
  </div>
)

}
