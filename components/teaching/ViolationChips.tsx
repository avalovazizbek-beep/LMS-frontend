"use client"

import { useLanguage } from "@/lib/i18n/LanguageContext"

const ORDER = [
  "proctor_terminated", "face_mismatch", "multi_face", "liveness", "no_face",
  "tab_blur", "fullscreen_exit", "screenshot_attempt",
] as const

/** Yuz bilan bog'liq (Face ID) — qizil; xulq-atvor (oyna, ekran) — sariq; yakunlanish — to'q qizil.
    Ranglar admin tokenlaridan (qorong'i rejimda ham o'qiladi), boshqa panellarda — qavs ichidagilar. */
const RED = "var(--role-admin, #b91c1c)"
const ORANGE = "var(--cat-2, #c2410c)"
const AMBER = "var(--role-pending, #92400e)"
const tint = (color: string) => ({ bg: `color-mix(in srgb, ${color} 12%, transparent)`, color })
const STYLE: Record<string, { bg: string; color: string }> = {
  proctor_terminated: { bg: RED, color: "#fff" },
  face_mismatch:      tint(RED),
  multi_face:         tint(RED),
  liveness:           tint(RED),
  no_face:            tint(ORANGE),
  tab_blur:           tint(AMBER),
  fullscreen_exit:    tint(AMBER),
  screenshot_attempt: tint(AMBER),
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
    return <span className="text-xs" style={{ color: "var(--adm-up, #22c55e)", fontFamily: "var(--font-poppins)" }}>—</span>
  }
  keys.sort((a, b) => {
    const ia = ORDER.indexOf(a as (typeof ORDER)[number])
    const ib = ORDER.indexOf(b as (typeof ORDER)[number])
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
  return (
    <span className={`inline-flex flex-wrap gap-1 ${compact ? "" : "max-w-[260px]"}`}>
      {keys.map((k) => {
        const st = STYLE[k] ?? tint("var(--adm-muted, #475569)")
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
