"use client"

import { useEffect, useState } from "react"
import { Camera, Loader2 } from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { Modal } from "@/components/ui/Modal"
import { teachingApi, type ViolationDetailRow } from "@/lib/api"

const ORDER = [
  "tab_limit", "proctor_terminated", "face_mismatch", "multi_face", "liveness", "no_face",
  "tab_blur", "fullscreen_exit", "screenshot_attempt",
] as const

/** Yuz bilan bog'liq (Face ID) — qizil; xulq-atvor (oyna, ekran) — sariq; yakunlanish — to'q qizil.
    Ranglar admin tokenlaridan (qorong'i rejimda ham o'qiladi), boshqa panellarda — qavs ichidagilar. */
const RED = "var(--role-admin, #b91c1c)"
const ORANGE = "var(--cat-2, #c2410c)"
const AMBER = "var(--role-pending, #92400e)"
const tint = (color: string) => ({ bg: `color-mix(in srgb, ${color} 12%, transparent)`, color })
const STYLE: Record<string, { bg: string; color: string }> = {
  tab_limit:          { bg: RED, color: "#fff" },
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
export function ViolationChips({ counts, compact = false, contentId, studentUserId }: {
  counts: Record<string, number> | null | undefined
  compact?: boolean
  /** Ikkalasi berilsa "Batafsil" tugmasi chiqadi: vaqt va Face ID rasmlari (o'qituvchi/admin) */
  contentId?: number
  studentUserId?: number
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const keys = Object.keys(counts ?? {}).filter((k) => (counts?.[k] ?? 0) > 0)
  if (!counts || keys.length === 0) {
    return <span className="text-xs" style={{ color: "var(--adm-up, #22c55e)", fontFamily: "var(--font-poppins)" }}>—</span>
  }
  keys.sort((a, b) => {
    const ia = ORDER.indexOf(a as (typeof ORDER)[number])
    const ib = ORDER.indexOf(b as (typeof ORDER)[number])
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
  const canOpen = contentId != null && studentUserId != null
  return (
    <span className={`inline-flex flex-wrap gap-1 ${compact ? "" : "max-w-[260px]"}`}>
      {canOpen && (
        <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(true) }}
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap hover:underline"
          style={{ color: "var(--adm-accent, #0e58a8)", border: "1px solid color-mix(in srgb, var(--adm-accent, #0e58a8) 35%, transparent)", fontFamily: "var(--font-poppins)" }}>
          <Camera className="w-3 h-3" /> {t("viol.details")}
        </button>
      )}
      {canOpen && open && (
        <span onClick={(e) => e.stopPropagation()}>
          <ViolationDetailsModal contentId={contentId!} studentUserId={studentUserId!} onClose={() => setOpen(false)} />
        </span>
      )}
      {keys.map((k) => {
        const st = STYLE[k] ?? tint("var(--adm-muted, #475569)")
        const label = STYLE[k] ? t(`viol.${k}`) : k
        const n = counts[k]
        return (
          <span key={k} className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ backgroundColor: st.bg, color: st.color, fontFamily: "var(--font-poppins)" }}>
            {label}{k === "proctor_terminated" || k === "tab_limit" ? "" : ` ×${n}`}
          </span>
        )
      })}
    </span>
  )
}

function timeOf(value: string): string {
  // ISO (brauzer vaqti) yoki "YYYY-MM-DD HH:MM:SS" (server vaqti)
  if (!value.includes("T")) return value.slice(11, 19) || value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** Bitta talabaning shu imtihondagi qoidabuzarliklari: vaqt, sabab va Face ID rasmi */
function ViolationDetailsModal({ contentId, studentUserId, onClose }: { contentId: number; studentUserId: number; onClose: () => void }) {
  const { t } = useLanguage()
  const [rows, setRows] = useState<ViolationDetailRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    teachingApi.studentViolations(contentId, studentUserId)
      .then((res) => { if (alive) setRows(res.data ?? []) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [contentId, studentUserId])

  return (
    <Modal open title={t("viol.detailsTitle")} onClose={onClose} maxWidth={640}>
      <div className="max-h-[70vh] overflow-y-auto -mx-1 px-1" style={{ fontFamily: "var(--font-poppins)" }}>
        {failed ? (
          <p className="text-sm" style={{ color: "#b91c1c" }}>{t("viol.loadFailed")}</p>
        ) : rows === null ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#7293b9" }}>
            <Loader2 className="w-4 h-4 animate-spin" /> {t("viol.loading")}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm" style={{ color: "#7293b9" }}>{t("viol.none")}</p>
        ) : (
          <>
            <p className="text-xs mb-3" style={{ color: "#7293b9" }}>{t("viol.detailsHint")}</p>
            <div className="flex flex-col gap-2">
              {rows.map((r) => {
                const st = STYLE[r.violationType] ?? tint("var(--adm-muted, #475569)")
                return (
                  <div key={r.id} className="flex items-start gap-3 rounded-lg p-2" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
                    {r.snapshot ? (
                      <a href={r.snapshot} target="_blank" rel="noreferrer" className="shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.snapshot} alt="" className="rounded-md object-cover" style={{ width: 128, height: 96 }} />
                      </a>
                    ) : null}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ backgroundColor: st.bg, color: st.color }}>
                          {STYLE[r.violationType] ? t(`viol.${r.violationType}`) : r.violationType}
                        </span>
                        <span className="text-xs tabular-nums" style={{ color: "#7293b9" }}>{timeOf(r.createdAt)}</span>
                      </div>
                      {r.detail && <p className="text-xs mt-1 break-words" style={{ color: "#334155" }}>{r.detail}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
