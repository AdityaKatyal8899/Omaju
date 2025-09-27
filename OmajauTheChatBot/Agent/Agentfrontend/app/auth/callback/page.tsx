"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function AgentAuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    const refreshToken = searchParams.get('refreshToken') || token || ''
    const next = searchParams.get('next') || '/chat'

    if (token) {
      // Persist tokens for Agent chat gate to consume
      try {
        localStorage.setItem('accessToken', token)
        localStorage.setItem('refreshToken', refreshToken)
      } catch (e) {
        console.error('Failed to persist auth tokens:', e)
      }
      // Navigate to next destination (may be absolute). If it's absolute and same origin, use router.
      try {
        const url = new URL(next, window.location.origin)
        if (url.origin === window.location.origin) {
          router.replace(url.pathname + url.search + url.hash)
        } else {
          window.location.href = next
        }
      } catch {
        // Fallback
        router.replace('/chat')
      }
    } else {
      // Missing token -> go to sign-up
      const signupBase = process.env.NEXT_PUBLIC_SIGNUP_URL as string
      const returnTo = typeof window !== 'undefined' ? window.location.origin + '/chat' : '/chat'
      window.location.href = `${signupBase}/sign-up?next=${encodeURIComponent(returnTo)}`
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Completing authentication…</h2>
        <p className="text-muted-foreground">Please wait while we set up your session.</p>
      </div>
    </div>
  )
}
