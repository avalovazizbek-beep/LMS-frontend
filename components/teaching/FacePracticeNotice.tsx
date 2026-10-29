"use client"

import Link from "next/link"
import { ScanFace, ArrowRight, CheckCircle2 } from "lucide-react"
import { faceApi, teachingApi } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { useLanguage } from "@/lib/i18n/LanguageContext"

/* Oraliq / mustaqil ish testidan oldin "Yuzni sinab ko'rish" (demo test):
   sinovdan o'tmagan talabaga xabar chiqadi; admin "majburiy" qilgan bo'lsa
   imtihonni boshlash tugmasi sinovdan keyin ochiladi. Holatni olib
   bo'lmasa (tarmoq/eski server) — to'sqinlik qilmaymiz. */

const FONT = { fontFamily: "var(--font-poppins)" } as const

export function useFacePractice(enabled: boolean) {
  const { data: practiceRes, loading, error } = useApi(
    () => (enabled ? faceApi.practiceStatus() : Promise.resolve(null)), [enabled])
  const { data: settingsRes, loading: lSettings } = useApi(
    () => (enabled ? teachingApi.examSettings() : Promise.resolve(null)), [enabled])
  return {
    loading: enabled && (loading || lSettings),
    passed: practiceRes?.data?.passed === true || !!error,
    required: settingsRes?.data?.facePracticeRequired !== false,
  }
}

export function FacePracticeNotice({ back, required = false, compact = false }: {
  /** Sinovdan keyin qaytiladigan imtihon sahifasi */
  back?: string
  required?: boolean
  /** Imtihonlar ro'yxatidagi qisqa ko'rinish */
  compact?: boolean
}) {
  const { t } = useLanguage()
  const href = back ? `/face-id/sinov?back=${encodeURIComponent(back)}` : "/face-id/sinov"
  return (
    <div className="rounded-[10px] p-4 flex flex-col sm:flex-row sm:items-center gap-3 text-left"
      style={{ backgroundColor: "#fff7ed", border: "1px solid rgba(234,88,12,0.3)" }}>
      <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#ffedd5" }}>
        <ScanFace className="w-5 h-5" style={{ color: "#c2410c" }} />
      </div>
      <div className="flex-1 min-w-0" style={FONT}>
        <p className="text-sm font-semibold" style={{ color: "#9a3412" }}>{t("facePractice.notice.title")}</p>
        <p className="text-xs mt-0.5 leading-5" style={{ color: "#9a3412" }}>
          {compact ? t("facePractice.notice.listDesc") : t("facePractice.notice.desc")}
        </p>
        {required && !compact && (
          <p className="text-xs mt-1 font-semibold" style={{ color: "#c2410c" }}>{t("facePractice.notice.required")}</p>
        )}
      </div>
      <Link href={href}
        className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-semibold text-white"
        style={{ backgroundColor: "#ea580c", ...FONT }}>
        {t("facePractice.notice.button")}<ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

export function FacePracticePassed() {
  const { t } = useLanguage()
  return (
    <p className="flex items-center justify-center gap-1.5 text-xs font-medium" style={{ color: "#15803d", ...FONT }}>
      <CheckCircle2 className="w-3.5 h-3.5" />{t("facePractice.notice.passed")}
    </p>
  )
}
