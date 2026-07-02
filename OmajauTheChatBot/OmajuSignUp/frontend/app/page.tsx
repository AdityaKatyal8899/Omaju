'use client';

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { MicSearchBar } from "@/components/mic-search-bar"
import { ThemeToggle } from "@/components/theme-toggle"
import { BackendStatus } from "@/components/backend-status"
import { Navigation } from "@/components/homenavigation"
import { AnimatedSections } from "@/components/animated-sections"
import { Card, CardContent } from "@/components/ui/card"

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/chat");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-500"></div>
        <p className="mt-4 text-lg text-muted-foreground">Loading...</p>
      </main>
    );
  }

  // If user is logged in, show loading spinner while redirecting
  if (user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-500"></div>
        <p className="mt-4 text-lg text-muted-foreground">Redirecting to chat...</p>
      </main>
    );
  }

  // Render the rich home page for guests
  return (
    <main className="relative min-h-screen overflow-x-clip">
      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="container mx-auto px-4 py-2">
          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur supports-[backdrop-filter]:bg-black/30 shadow-lg">
            <div className="flex h-14 items-center justify-between px-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm bg-cyan-500" aria-hidden />
                  <h1 className="text-pretty text-base font-semibold tracking-tight text-foreground dark:text-white">Omaju Chat Assistant</h1>
                </div>
                <Navigation />
              </div>
              <div className="flex items-center gap-2">
                <BackendStatus />
                <ThemeToggle />
                <Link href="/sign-in" className="text-sm font-medium px-4 py-2 rounded-xl bg-cyan-500 text-white hover:bg-cyan-600 transition-colors">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "../assets/bg.jpg" }}
          aria-hidden="true"
        />
        <div className="relative z-10 container mx-auto px-4">
          <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center md:min-h-[80vh]">
            <div className="max-w-xl space-y-5">
              <h2 className="text-balance text-3xl font-semibold leading-[1.2] sm:text-4xl md:text-5xl text-foreground">
                Welcome ! <span className="text-cyan-500">How</span> Can{" "}
                <span className="text-amber-400">I Help You</span>
              </h2>
            </div>

            <div className="w-full max-w-xl">
              <div className="mt-4 text-center">
                <Link 
                  href="/chat" 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-full hover:bg-cyan-600 transition-colors"
                >
                  🚀 Start AI Chat
                </Link>
              </div>
            </div>

            <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Real-time" value="Low-latency" />
              <StatCard label="Accuracy" value="Smart Punctuation" />
              <StatCard label="Export" value="TXT • DOCX • SRT" />
            </div>
          </div>
        </div>
      </section>

      {/* Features with GSAP scroll animations */}
      <AnimatedSections>
        <section className="relative py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="reveal mx-auto max-w-2xl text-center">
              <h3 className="text-balance text-2xl font-semibold sm:text-3xl">
                Built for your flow
              </h3>
              <p className="text-pretty text-sm text-muted-foreground sm:text-base">
                Flexible controls, dependable output, and formats that fit your work.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
              <FeatureCard
                title="Noise-aware"
                description="Adaptive filtering keeps your transcript focused—noisy environments welcome."
                iconDotClass="bg-cyan-500"
              />
              <FeatureCard
                title="Smart segments"
                description="Auto paragraphs and timestamps for clean, readable notes right away."
                iconDotClass="bg-amber-400"
              />
              <FeatureCard
                title="Command-ready"
                description="Say 'new task', 'bookmark', or 'summary' to enrich your transcript."
                iconDotClass="bg-foreground"
              />
            </div>
          </div>
        </section>
      </AnimatedSections>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="reveal">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-cyan-500" aria-hidden />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <span className="text-sm font-medium">{value}</span>
      </CardContent>
    </Card>
  )
}

function FeatureCard({
  title,
  description,
  iconDotClass,
}: {
  title: string
  description: string
  iconDotClass?: string
}) {
  return (
    <Card className="reveal">
      <CardContent className="p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-sm ${iconDotClass || "bg-cyan-500"}`} aria-hidden />
          <h4 className="text-base font-semibold">{title}</h4>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
