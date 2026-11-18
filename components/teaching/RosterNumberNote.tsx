"use client"

import { useEffect, useState } from "react"
import { Hash } from "lucide-react"
import { teachingApi } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"

/* Talabaning guruh ro'yxatidagi tartib raqami — o'qituvchi jurnalidagi
   tartib bilan bir xil (shu fanga biriktirilganlar, F.I.Sh alifbosi).
   O'qituvchi topshiriq variantini "ro'yxatdagi raqamingiz bo'yicha"
   berganda talaba raqamini shu yerdan biladi. Bir fan uchun bir marta
   so'raladi (har mavzuda qayta emas). */

const cache = new Map<string, Promise<{ number: number; total: number } | null>>()

function loadNumber(subject: string) {
  let p = cache.get(subject)
  if (!p) {
    p = teachingApi.myRosterNumber(subject).then((r) => r.data ?? null).catch(() => null)
    cache.set(subject, p)
  }
  return p
}

export function RosterNumberNote({ subjectName }: { subjectName: string }) {
  const { t } = useLanguage()
  const [info, setInfo] = useState<{ number: number; total: number } | null>(null)

  useEffect(() => {
    let alive = true
    if (subjectName) loadNumber(subjectName).then((v) => { if (alive) setInfo(v) })
    return () => { alive = false }
  }, [subjectName])

  if (!info) return null
  return (
    <div className="mb-3 flex items-start gap-3 rounded-xl px-3.5 py-2.5"
      style={{ backgroundColor: "var(--lms-soft)", border: "1px solid var(--lms-border)", fontFamily: "var(--font-poppins)" }}>
      <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-1.5 text-sm font-bold text-white"
        style={{ backgroundColor: "var(--lms-button)", fontVariantNumeric: "tabular-nums" }} aria-hidden>
        {info.number}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--lms-primary)" }}>
          <Hash className="mr-1 inline h-3.5 w-3.5 align-[-2px]" style={{ color: "var(--lms-button)" }} />
          {t("fanResurslari.rosterNumber", { n: info.number, total: info.total })}
        </p>
        <p className="text-xs" style={{ color: "var(--lms-muted)" }}>{t("fanResurslari.rosterNumberHint")}</p>
      </div>
    </div>
  )
}
