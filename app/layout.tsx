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

const SITE_URL   = "https://lms.sies.uz"
const BASE_PATH  = process.env.NEXT_PUBLIC_BASE_PATH || ""
// Haqiqiy jamoat uchun ochiq manzil — basePath bilan birga (masalan
// https://lms.sies.uz/lms-samisi). Ilgari SITE_URL basePath'siz ishlatilgan
// edi (openGraph.url va h.k.da) — bu qidiruv botlari/ijtimoiy tarmoqlar
// uchun noto'g'ri (haqiqatda ko'rinmaydigan) manzil ko'rsatardi.
const PUBLIC_URL = `${SITE_URL}${BASE_PATH}`

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SamISI LMS — Masofaviy Ta'lim Tizimi (SIES)",
    template: "%s · SamISI LMS",
  },
  description:
    "SamISI (Samarqand Iqtisodiyot va Servis Instituti, SIES) Masofaviy Ta'lim Tizimi — talabalar va o'qituvchilar uchun onlayn darslar, imtihonlar, davomat, baholash va meeting (LMS SIES, Masofaviy ta'lim SamISI).",
  keywords: [
    "SamISI", "SIES", "LMS SIES", "LMS SamISI",
    "masofaviy ta'lim SamISI", "masofaviy ta'lim SIES", "masofaviy ta'lim sies.uz",
    "masofaviy ta'lim", "LMS", "onlayn ta'lim", "Samarqand iqtisodiyot va servis instituti",
    "Samarqand", "talabalar", "o'qituvchilar",
  ],
  applicationName: "SamISI LMS",
  alternates: {
    canonical: `${PUBLIC_URL}/login`,
  },
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: PUBLIC_URL,
    siteName: "SamISI LMS (SIES)",
    title: "SamISI LMS — Masofaviy Ta'lim Tizimi (SIES)",
    description: "Talabalar va o'qituvchilar uchun SamISI (SIES) onlayn masofaviy ta'lim platformasi.",
    images: [{ url: "/logo.png" }],
  },
  twitter: {
    card: "summary",
    title: "SamISI LMS — Masofaviy Ta'lim Tizimi (SIES)",
    description: "Talabalar va o'qituvchilar uchun SamISI (SIES) onlayn masofaviy ta'lim platformasi.",
    images: ["/logo.png"],
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
}

// Google'ga "SamISI", "SIES", "LMS SIES", "Masofaviy ta'lim SamISI" kabi
// turli qidiruv iboralari BITTA tashkilotga tegishli ekanini bildirish
// uchun (alternateName) — brendlangan qidiruvlarda to'g'ri tanilish
// ehtimolini oshiradi. E'tibor: bu birinchi o'ringa chiqishni KAFOLATLAMAYDI
// (bu domen yoshi, backlinklar, Google'ning o'z algoritmiga bog'liq),
// faqat sayt to'g'ri va aniq tanilishiga yordam beradi.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "SamISI LMS",
  alternateName: [
    "SIES", "SamISI", "LMS SIES", "LMS SamISI",
    "Masofaviy ta'lim SamISI", "Masofaviy ta'lim SIES",
    "Samarqand iqtisodiyot va servis instituti",
  ],
  url: PUBLIC_URL,
  logo: `${SITE_URL}/logo.png`,
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SplashScreen />
        <LanguageProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
