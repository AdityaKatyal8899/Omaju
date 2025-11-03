export const metadata = {
  title: "Omaju Onboarding",
  description:
    "Join Omaju — your gateway to next-gen microservices. Experience a smooth, intuitive onboarding flow.",
  robots: { index: true, follow: true },
  verification: {
    google: "PASTE_YOUR_VERIFICATION_CODE_HERE",
  },
  icons: {
    icon: "/favicon.ico", // place your tab image here
  },
  openGraph: {
    title: "Omaju Onboarding",
    description:
      "Get started with Omaju — modern microservices onboarding experience.",
    url: "https://YOUR_DEPLOYED_DOMAIN/onboarding",
    siteName: "Omaju",
    images: [
      {
        url: "/og-image.png", // optional social preview
        width: 1200,
        height: 630,
        alt: "Omaju Onboarding Preview",
      },
    ],
    type: "website",
  },
}

export default function OnboardingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center space-y-4">
        <h1 className="text-3xl font-semibold">Welcome to Omaju</h1>
        <p className="text-muted-foreground">
          This is the onboarding page. Replace this with your real onboarding flow.
        </p>
      </div>
    </main>
  )
}
