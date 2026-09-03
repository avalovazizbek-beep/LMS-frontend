import { Poppins } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/lib/i18n/LanguageContext"
import { cn } from "@/lib/utils"
import SplashScreen from "@/components/SplashScreen"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
})

const SITE_URL = "https://lms.sies.uz"

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SamISI — Masofaviy Ta'lim Tizimi (LMS)",
    template: "%s · SamISI LMS",
  },
  description:
    "SamISI Masofaviy Ta'lim Tizimi — talabalar va o'qituvchilar uchun onlayn darslar, imtihonlar, davomat, baholash va meeting tizimi.",
  keywords: ["SamISI", "masofaviy ta'lim", "LMS", "onlayn ta'lim", "Samarqand", "talabalar", "o'qituvchilar"],
  applicationName: "SamISI LMS",
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: SITE_URL,
    siteName: "SamISI LMS",
    title: "SamISI — Masofaviy Ta'lim Tizimi",
    description: "Talabalar va o'qituvchilar uchun onlayn masofaviy ta'lim platformasi.",
    images: [{ url: "/logo.png" }],
  },
  twitter: {
    card: "summary",
    title: "SamISI — Masofaviy Ta'lim Tizimi",
    description: "Talabalar va o'qituvchilar uchun onlayn masofaviy ta'lim platformasi.",
    images: ["/logo.png"],
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="uz"
      suppressHydrationWarning
      className={cn("antialiased", poppins.variable)}
      style={{ fontFamily: "var(--font-poppins), sans-serif" }}
    >
      <body>
        <SplashScreen />
        <LanguageProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
