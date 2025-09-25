"use client"
import React from "react"

interface MarkdownProps {
  text: string
}

// Minimal markdown renderer supporting bold, italic, inline code and fenced code blocks
export function Markdown({ text }: MarkdownProps) {
  const elements: React.ReactNode[] = []
  const lines = text.split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      // Skip closing ```
      if (i < lines.length && lines[i].trim().startsWith("```")) i++
      const code = codeLines.join("\n")
      elements.push(
        <pre key={`pre-${i}-${elements.length}`} className="my-2 overflow-x-auto rounded-lg bg-black/40 p-3 text-[13px] leading-relaxed ring-1 ring-white/10">
          <code className="font-mono text-white/90">{code}</code>
        </pre>
      )
      continue
    }

    // Inline markdown: `code`, **bold**, *italic*
    const inlineNodes: React.ReactNode[] = []
    let rest = line
    while (rest.length) {
      const codeMatch = rest.match(/`([^`]+)`/)
      const boldMatch = rest.match(/\*\*([^*]+)\*\*/)
      const italicMatch = rest.match(/\*([^*]+)\*/)
      const matches = [codeMatch, boldMatch, italicMatch].filter(Boolean) as RegExpMatchArray[]
      if (matches.length === 0) {
        inlineNodes.push(rest)
        break
      }
      const next = matches.reduce((min, m) => (m.index! < min.index! ? m : min))
      if (next.index! > 0) {
        inlineNodes.push(rest.slice(0, next.index))
      }
      if (next === codeMatch) {
        inlineNodes.push(<code key={`code-${i}-${inlineNodes.length}`} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em]">{codeMatch![1]}</code>)
        rest = rest.slice(codeMatch!.index! + codeMatch![0].length)
      } else if (next === boldMatch) {
        inlineNodes.push(<strong key={`b-${i}-${inlineNodes.length}`} className="font-semibold">{boldMatch![1]}</strong>)
        rest = rest.slice(boldMatch!.index! + boldMatch![0].length)
      } else if (next === italicMatch) {
        inlineNodes.push(<em key={`i-${i}-${inlineNodes.length}`} className="italic">{italicMatch![1]}</em>)
        rest = rest.slice(italicMatch!.index! + italicMatch![0].length)
      }
    }
    elements.push(
      <p key={`p-${i}`} className="whitespace-pre-wrap leading-relaxed">{inlineNodes}</p>
    )
    i++
  }

  return <div className="space-y-2">{elements}</div>
}
