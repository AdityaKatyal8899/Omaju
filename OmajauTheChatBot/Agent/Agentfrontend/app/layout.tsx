import type React from "react";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from "react";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Toaster as ShadToaster } from "@/components/ui/toaster";
import { Work_Sans, Poppins, Open_Sans } from "next/font/google";
import { Spinner } from "@/components/spinner";
import dynamic from "next/dynamic";

// Brand fonts
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans" });

import WindowLoaderOverlay from "@/components/WindowLoaderOverlay";

export const metadata: Metadata = {
  title: "Omaju the Bot",
  description: "Created with v0",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`font-body ${workSans.variable} ${poppins.variable} ${openSans.variable}`}
        suppressHydrationWarning={true}
      >
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"><Spinner /></div>}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </Suspense>
        {/* Non-blocking background loader for initial load and window resizing */}
        <WindowLoaderOverlay />
        {process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === 'true' && <Analytics />}
        <SonnerToaster richColors position="top-right" />
        <ShadToaster />
      </body>
    </html>
  );
}
