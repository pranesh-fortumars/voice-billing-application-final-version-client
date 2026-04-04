import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/hooks/use-auth"
import { LanguageProvider } from "@/contexts/language-context"
import { Suspense } from "react"
import { ThemeScript } from "./theme-script"
import "./globals.css"

export const metadata: Metadata = {
  title: "Supermarket POS System",
  description: "Professional Point of Sale System for Supermarkets",
  generator: "SuperMarket",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          http-equiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com https://*.vercel-analytics.com https://*.google.com https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https://*.google-analytics.com https://*.api.qrserver.com; connect-src 'self' http://localhost:5001 http://127.0.0.1:5001 wss://*.google.com https://*.googleapis.com https://*.google.com https://*.vercel-analytics.com;"
        />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <LanguageProvider>
            <AuthProvider>
              <ThemeScript />
              {children}
            </AuthProvider>
          </LanguageProvider>
        </Suspense>
        {typeof window !== "undefined" && !(window as any).Capacitor && <Analytics />}
      </body>
    </html>
  )
}
