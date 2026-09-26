import { Poppins } from "next/font/google"
import { cookies } from "next/headers"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/lib/i18n/LanguageContext"
import { DEFAULT_LANG, LANG_COOKIE, isLang, languageInfo } from "@/lib/i18n/translations"
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
    canonical: `${SITE_URL}/login`,
  },
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: SITE_URL,
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
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Tanlangan til cookie'da — sahifa serverdayoq shu tilda chiziladi
  const cookieLang = (await cookies()).get(LANG_COOKIE)?.value
  const initialLang = isLang(cookieLang) ? cookieLang : undefined

  return (
    <html
      lang={languageInfo(initialLang ?? DEFAULT_LANG).htmlLang}
      suppressHydrationWarning
      className={cn("antialiased", poppins.variable)}
      style={{ fontFamily: "var(--font-poppins), sans-serif" }}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <LanguageProvider initialLang={initialLang}>
          <SplashScreen />
          <ThemeProvider>{children}</ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
