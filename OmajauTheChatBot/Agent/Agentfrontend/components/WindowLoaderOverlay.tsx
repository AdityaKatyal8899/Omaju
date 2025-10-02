"use client"
import React, { useEffect, useState } from "react"
import WindowLoader from "./WindowLoader"

/**
 * Global window loading/resizing indicator.
 * - Shows the Uiverse loader centered as a non-blocking background effect.
 * - Triggered on initial mount and during window resize; hides shortly after.
 */
const WindowLoaderOverlay: React.FC = () => {
  const [isWindowLoading, setIsWindowLoading] = useState<boolean>(true)

  useEffect(() => {
    // Hide initial load after a brief delay to avoid flash
    const initial = setTimeout(() => setIsWindowLoading(false), 600)

    let resizeTimeout: number | undefined
    const onResize = () => {
      setIsWindowLoading(true)
      if (resizeTimeout) window.clearTimeout(resizeTimeout)
      // Hide shortly after resize settles
      resizeTimeout = window.setTimeout(() => setIsWindowLoading(false), 500)
    }

    window.addEventListener("resize", onResize)
    return () => {
      clearTimeout(initial)
      window.removeEventListener("resize", onResize)
      if (resizeTimeout) window.clearTimeout(resizeTimeout)
    }
  }, [])

  if (!isWindowLoading) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-20 grid place-items-center"
      style={{ background: "transparent" }}
    >
      <WindowLoader />
    </div>
  )
}

export default WindowLoaderOverlay
