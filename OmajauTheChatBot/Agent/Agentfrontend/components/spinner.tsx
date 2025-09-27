"use client"

import React from "react"

export function Spinner({ center = false }: { center?: boolean }) {
  return (
    <div className={center ? "flex items-center justify-center w-full h-full" : undefined}>
      {/* From Uiverse.io by satyamchaudharydev */}
      <div className="spinner" aria-label="Loading" role="status">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  )
}
