"use client"
import Link from "next/link"
import { Navigation } from "./homenavigation"
import { BackendStatus } from "./backend-status"
import { ThemeToggle } from "./theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEffect, useRef, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Bell, Settings, LogOut, User, Image as ImageIcon, ArrowLeft } from "lucide-react"
import gsap from "gsap"
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose, DrawerHeader as DrawerH, DrawerTitle } from "@/components/ui/drawer"
import { MobileSidebar } from "@/components/mobile-sidebar"
import type { Thread } from "@/components/sidebar"
import { MobileSidebarNested } from "@/components/mobile-sidebar-nested"

interface HeaderProps {
  showNav?: boolean
  showBack?: boolean
  backHref?: string
  /**
   * When true, shows a quick "New chat" action in the header (used on chat page)
   */
  showNewChat?: boolean
  /**
   * Callback invoked when the New chat button is clicked
   */
  onNewChat?: () => void
  /** Optional: data for mobile sidebar drawer */
  mobileThreads?: Thread[]
  mobileActiveId?: string
  onMobileSelect?: (id: string) => void
  onMobileNew?: () => void
  onMobileDelete?: (id: string) => void
  /** Optional: nested chats/convos for mobile drawer (new schema) */
  mobileChats?: Array<{ id: string; title: string; createdAt: string; updatedAt?: string }>
  mobileConvosByChat?: Record<string, Array<{ id: string; chat_id: string; created_at: string }>>
  mobileActiveChatId?: string
  mobileActiveSessionId?: string
  onMobileSelectChat?: (chatId: string) => void
  onMobileSelectConvo?: (sessionId: string, chatId: string) => void
  onMobileCreateChat?: () => void
  onMobileCreateConvo?: (chatId: string) => void
}

export function Header({ showNav = true, showBack = false, backHref = "/", showNewChat = false, onNewChat, mobileThreads, mobileActiveId, onMobileSelect, onMobileNew, onMobileDelete, mobileChats, mobileConvosByChat, mobileActiveChatId, mobileActiveSessionId, onMobileSelectChat, onMobileSelectConvo, onMobileCreateChat, onMobileCreateConvo }: HeaderProps) {
  const [bgMode, setBgMode] = useState<"solid" | "gradient" | "image">("solid")
  const { toast } = useToast()
  // Auth profile state (from OmajuSignUp)
  const [userName, setUserName] = useState<string>("")
  const [userEmail, setUserEmail] = useState<string>("")
  const [avatarUrl, setAvatarUrl] = useState<string>("")
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false)
  const AUTH_API_BASE = (process.env.NEXT_PUBLIC_AUTH_API_BASE || "http://localhost:5001/api") + "/auth"

  const onBgChange = (mode: typeof bgMode) => {
    setBgMode(mode)
    toast({
      title: "Appearance updated",
      description: `Background set to ${mode}`,
      className: "brand-shadow",
      duration: 2000,
    })
    if (typeof window !== "undefined") {
      document.documentElement.dataset.bg = mode
    }
  }

  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!panelRef.current) return
    gsap.fromTo(
      panelRef.current,
      { y: -12, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" }
    )
  }, [])

  // Fetch authenticated profile to display avatar/name
  useEffect(() => {
    let cancelled = false
    const fetchProfile = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken')
        if (!accessToken) {
          setProfileLoaded(true)
          return
        }
        const res = await fetch(`${AUTH_API_BASE}/profile`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })
        if (!res.ok) {
          setProfileLoaded(true)
          return
        }
        const data = await res.json()
        if (cancelled) return
        const u = data?.data?.user || {}
        setUserName(u.name || "")
        setUserEmail(u.email || "")
        if (u.avatar) setAvatarUrl(u.avatar)
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) setProfileLoaded(true)
      }
    }
    fetchProfile()
    return () => { cancelled = true }
  }, [])

  const initials = (userName || userEmail || 'OM').trim().split(/\s+/).map(s => s[0]).slice(0,2).join('').toUpperCase() || 'OM'

  const handleLogout = () => {
    try {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    } catch {}
    // Soft notify
    toast({ title: 'Logged out', duration: 1500 })
    // Optional: redirect to landing
    if (typeof window !== 'undefined') window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-30">
      {/* Sleek translucent header */}
      <div className="mx-auto max-w-7xl px-2 sm:px-4 py-1.5 sm:py-2">
        <div ref={panelRef} className="rounded-2xl border border-border/60 bg-background/30 backdrop-blur supports-[backdrop-filter]:bg-background/30 shadow-lg">
          <div className="flex h-14 sm:h-16 items-center justify-between px-2 sm:px-3">
            <div className="flex items-center gap-2 sm:gap-4 max-[360px]:gap-1.5">
              {showBack && (
                <Link href={backHref} className="rounded-md p-1 text-foreground/80 hover:bg-foreground/10 hover:text-foreground transition-colors" aria-label="Go back">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              )}
              <div className="flex items-center gap-1 sm:gap-2 max-[360px]:gap-0.5">
                {/* Mobile: drawer trigger */}
                {(mobileThreads || mobileChats) && (
                  <Drawer direction="left">
                    {/* MOBILE: hamburger trigger shrunk for xs */}
                    <DrawerTrigger className="sm:hidden rounded-md p-1 text-foreground/80 hover:bg-foreground/10">
                      {/* Simple hamburger icon using three bars */}
                      <div className="flex flex-col gap-0.5">
                        <span className="block h-0.5 w-4 max-[360px]:w-3.5 bg-foreground rounded" />
                        <span className="block h-0.5 w-3.5 max-[360px]:w-3 bg-foreground rounded" />
                        <span className="block h-0.5 w-3 max-[360px]:w-2.5 bg-foreground rounded" />
                      </div>
                    </DrawerTrigger>
                    <DrawerContent className="p-0">
                      <DrawerH className="border-b border-border/60">
                        <DrawerTitle className="px-4">Chats</DrawerTitle>
                      </DrawerH>
                      {mobileChats ? (
                        <MobileSidebarNested
                          chats={mobileChats}
                          convosByChat={mobileConvosByChat || {}}
                          activeChatId={mobileActiveChatId}
                          activeSessionId={mobileActiveSessionId}
                          onCreateChat={onMobileCreateChat}
                          onCreateConvo={onMobileCreateConvo}
                          onSelectChat={onMobileSelectChat}
                          onSelectConvo={onMobileSelectConvo}
                        />
                      ) : (
                        <MobileSidebar
                          threads={mobileThreads!}
                          activeId={mobileActiveId}
                          onSelect={(id) => { onMobileSelect?.(id) }}
                          onNew={() => { onMobileNew?.() }}
                          onDelete={(id) => { onMobileDelete?.(id) }}
                        />
                      )}
                      <div className="p-2">
                        <DrawerClose asChild>
                          <button className="w-full rounded-md border border-border/60 py-2 text-sm">Close</button>
                        </DrawerClose>
                      </div>
                    </DrawerContent>
                  </Drawer>
                )}
                {/* MOBILE: shrink title text on xs so avatar fits */}
                <Link href="/" className="font-heading text-xs max-[360px]:text-[10px] sm:text-lg font-semibold text-foreground truncate max-w-[120px] max-[360px]:max-w-[90px] sm:max-w-none">
                  Omaju Chat Assistant
                </Link>
              </div>
              <span className="hidden sm:inline-block h-2 w-2 animate-pulse rounded-full bg-[--brand-notification]" />
              {showNav && <div className="hidden md:block"><Navigation /></div>}
            </div>
            <div className="flex items-center gap-1 sm:gap-3 max-[360px]:gap-0.5">
              {/* Connection status: compact on mobile */}
              <div className="flex items-center sm:scale-100 scale-90 max-[360px]:scale-75 max-[400px]:hidden">
                <BackendStatus />
              </div>
              {/* Rounded button style for theme toggle */}
              <div className="[&_button]:rounded-full [&_button]:shadow [&_button:hover]:shadow-[0_0_0_3px_rgba(38,103,255,0.25)] max-[360px]:scale-90 max-[340px]:hidden">
                <ThemeToggle />
              </div>
              {/* New chat quick action in chat view */}
              {showNewChat && (
                <Button onClick={onNewChat} className="hidden sm:inline-flex brand-button text-white rounded-full h-9 px-3 shadow hover:brightness-110 hover:shadow-[0_0_0_4px_rgba(38,103,255,0.35)]">
                  + New chat
                </Button>
              )}
              {/* MOBILE: show avatar on mobile at smaller size; Desktop: original size */}
              <div className="block">
                <DropdownMenu>
                  <DropdownMenuTrigger className="focus:outline-none inline-flex items-center justify-center align-middle">
                    <Avatar className="self-center h-7 w-7 max-[360px]:h-6 max-[360px]:w-6 sm:h-8 sm:w-8 lg:h-9 lg:w-9 ring-2 ring-border/60 transition-shadow hover:shadow-[0_0_0_4px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_0_4px_rgba(255,255,255,0.15)]">
                      <AvatarImage className="w-full h-full object-cover" src={avatarUrl || "/avatar.png"} alt={userName || userEmail || "User"} onError={() => setAvatarUrl("")} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-heading">My Account</DropdownMenuLabel>
                    {(userName || userEmail) && (
                      <div className="px-2 pb-2 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground text-sm truncate">{userName || 'User'}</div>
                        <div className="truncate">{userEmail}</div>
                      </div>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2">
                      <Settings className="h-4 w-4" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <User className="h-4 w-4" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="font-heading">Appearance</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onBgChange("solid")} className="gap-2">
                      <Settings className="h-4 w-4" /> Solid
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBgChange("gradient")} className="gap-2">
                      <Settings className="h-4 w-4" /> Gradient
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBgChange("image")} className="gap-2">
                      <ImageIcon className="h-4 w-4" /> Background Image
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-400 focus:text-red-500">
                      <LogOut className="h-4 w-4" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
