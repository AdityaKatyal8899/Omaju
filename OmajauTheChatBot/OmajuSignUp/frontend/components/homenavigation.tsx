"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/chat", label: "Chat" }
  ]

  return (
    <nav className="flex items-center gap-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "tab-link relative flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/80 transition-colors",
            pathname === item.href
              ? "text-white after:!scale-x-100"
              : "hover:text-white"
          )}
        >
          <span className="hidden sm:inline">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}
