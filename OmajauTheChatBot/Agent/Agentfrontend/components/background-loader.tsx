"use client"
import React from "react"
import { cn } from "@/lib/utils"

interface BackgroundLoaderProps {
  className?: string
}

// From Uiverse.io by Shoh2008
export function BackgroundLoader({ className }: BackgroundLoaderProps) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 flex items-center justify-center", className)} aria-hidden>
      <span className="loader" />
      <style jsx>{`
        .loader {
          display: block;
          width: 84px;
          height: 84px;
          position: relative;
          opacity: 0.8;
          filter: drop-shadow(0 8px 24px rgba(0,0,0,0.25));
        }
        .loader:before , .loader:after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 0;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #FFF;
          transform: translate(-50% , -100%)  scale(0);
          animation: push_401 2s infinite linear;
        }
        .loader:after {
          animation-delay: 1s;
        }
        @keyframes push_401 {
          0% , 50% {
            transform: translate(-50% , 0%)  scale(1)
          }
          100% {
            transform: translate(-50%, -100%) scale(0)
          }
        }
      `}</style>
    </div>
  )
}
