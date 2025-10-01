"use client"
import React, { useEffect, useRef, useState } from "react"
import { SendHorizonal } from "lucide-react"
import { cn } from "@/lib/utils"
import gsap from "gsap"
import Image from "next/image"

interface EmptyStateProps {
  onSend: (text: string) => void
  disabled?: boolean
}

const SUGGESTED_PROMPTS = [
  "What is the weather like today?",
  "Tell me a fun fact",
  "What's the latest news?",
  "Can you help me with a recipe?"
]

export function EmptyState({ onSend, disabled }: EmptyStateProps) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    if (wrapRef.current) {
      gsap.fromTo(
        wrapRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      )
    }
  }, [])

  const submit = () => {
    if (!value.trim() || disabled) return
    onSend(value)
    setValue("")
  }

  const handlePromptClick = (prompt: string) => {
    onSend(prompt)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div ref={wrapRef} className="w-full h-full flex flex-col items-center justify-center px-4 sm:px-6">
      <div className="max-w-3xl w-full space-y-8">
        {/* Logo and Welcome Message */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 relative">
              <Image 
                src="/omaju-logo.png" 
                alt="Omaju" 
                fill 
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Welcome to Omaju
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
            How can I help you today?
          </p>
        </div>

        {/* Suggested Prompts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {SUGGESTED_PROMPTS.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handlePromptClick(prompt)}
              disabled={disabled}
              className="p-3 sm:p-4 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm sm:text-base text-gray-700 dark:text-gray-200"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Box */}
        <div className="relative max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message Omaju..."
              className={cn(
                "w-full rounded-xl bg-white dark:bg-gray-800 px-4 pr-12 py-3.5 text-gray-900 dark:text-white placeholder-gray-400",
                "border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "shadow-sm"
              )}
              disabled={!!disabled}
            />
            <button
              type="button"
              aria-label="Send message"
              onClick={submit}
              disabled={!value.trim() || disabled}
              className={cn(
                "absolute right-2 p-2 rounded-lg transition-colors",
                value.trim() && !disabled 
                  ? "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  : "text-gray-400"
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
