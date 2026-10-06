"use client"

import { useLanguage } from "@/lib/i18n/LanguageContext"

const ORDER = [
  "proctor_terminated", "face_mismatch", "multi_face", "liveness", "no_face",
  "tab_blur", "fullscreen_exit", "screenshot_attempt",
] as const

/** Yuz bilan bog'liq (Face ID) — qizil; xulq-atvor (oyna, ekran) — sariq; yakunlanish — to'q qizil */
const STYLE: Record<string, { bg: string; color: string }> = {
  proctor_terminated: { bg: "#b91c1c", color: "#fff" },
  face_mismatch:      { bg: "#fef2f2", color: "#b91c1c" },
  multi_face:         { bg: "#fef2f2", color: "#b91c1c" },
  liveness:           { bg: "#fef2f2", color: "#b91c1c" },
  no_face:            { bg: "#fff7ed", color: "#c2410c" },
  tab_blur:           { bg: "#fffbeb", color: "#92400e" },
  fullscreen_exit:    { bg: "#fffbeb", color: "#92400e" },
  screenshot_attempt: { bg: "#fffbeb", color: "#92400e" },
}

/**
 * Imtihon paytidagi qoidabuzarliklar — tur bo'yicha nom va soni bilan
 * ("Yuz ko'rinmadi ×3"). O'qituvchi natija jadvalida va talaba o'z
 * kartasida ko'radi. Hech narsa bo'lmasa "—".
 */
export function ViolationChips({ counts, compact = false }: { counts: Record<string, number> | null | undefined; compact?: boolean }) {
  const { t } = useLanguage()
  const keys = Object.keys(counts ?? {}).filter((k) => (counts?.[k] ?? 0) > 0)
  if (!counts || keys.length === 0) {
    return <span className="text-xs" style={{ color: "#22c55e", fontFamily: "var(--font-poppins)" }}>—</span>
  }
  keys.sort((a, b) => {
    const ia = ORDER.indexOf(a as (typeof ORDER)[number])
    const ib = ORDER.indexOf(b as (typeof ORDER)[number])
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
  return (
    <span className={`inline-flex flex-wrap gap-1 ${compact ? "" : "max-w-[260px]"}`}>
      {keys.map((k) => {
        const st = STYLE[k] ?? { bg: "#f1f5f9", color: "#475569" }
        const label = STYLE[k] ? t(`viol.${k}`) : k
        const n = counts[k]
        return (
          <span key={k} className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ backgroundColor: st.bg, color: st.color, fontFamily: "var(--font-poppins)" }}>
            {label}{k === "proctor_terminated" ? "" : ` ×${n}`}
          </span>
        )
      })}
    </span>
  )
}
