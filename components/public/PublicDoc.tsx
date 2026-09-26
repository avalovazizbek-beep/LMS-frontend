"use client"

import { useState, type ReactNode } from "react"

/**
 * Ommaviy sahifalar (/privacy, /terms, /docs, /support) uchun ikki tilli
 * qobiq. Standart til — inglizcha: bu sahifalar Zoom Marketplace
 * ro'yxatida ko'rsatiladi va ularni Zoom tekshiruvchilari o'qiydi.
 * O'zbekcha versiya tugma bilan ochiladi.
 */
export function PublicDoc({
  en,
  uz,
  titleEn,
  titleUz,
  subtitleEn,
  subtitleUz,
}: {
  en: ReactNode
  uz: ReactNode
  titleEn: string
  titleUz: string
  subtitleEn: string
  subtitleUz: string
}) {
  const [lang, setLang] = useState<"en" | "uz">("en")
  const isEn = lang === "en"

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f6f9ff" }} lang={isEn ? "en" : "uz"}>
      <div className="mx-auto max-w-3xl px-5 py-14">
        <div className="flex items-start justify-between gap-4 mb-2">
          <p className="text-xs uppercase tracking-wide" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {isEn ? "SamISI (SIES) Distance Learning System" : "SamISI (SIES) Masofaviy Ta'lim Tizimi"}
          </p>
          <div className="flex shrink-0 rounded-[8px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.15)" }}>
            {(["en", "uz"] as const).map(code => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: lang === code ? "#0e58a8" : "#fff",
                  color: lang === code ? "#fff" : "#0e58a8",
                  fontFamily: "var(--font-poppins)",
                }}
              >
                {code === "en" ? "English" : "O'zbekcha"}
              </button>
            ))}
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-1" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {isEn ? titleEn : titleUz}
        </h1>
        <p className="text-xs mb-10" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {isEn ? subtitleEn : subtitleUz}
        </p>
        {isEn ? en : uz}
      </div>
    </main>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-2" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
        {title}
      </h2>
      <div className="text-sm leading-relaxed space-y-2" style={{ color: "#33415c", fontFamily: "var(--font-poppins)" }}>
        {children}
      </div>
    </section>
  )
}

export function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: "#0e58a8" }}
      >
        {n}
      </span>
      <p>{children}</p>
    </div>
  )
}

export const SUPPORT_EMAIL = "azizbekavalov132@gmail.com"

export function MailLink() {
  return <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "#0e58a8" }}>{SUPPORT_EMAIL}</a>
}
