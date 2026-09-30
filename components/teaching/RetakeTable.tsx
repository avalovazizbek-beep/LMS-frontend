"use client"

import { useMemo, useState } from "react"
import { BarChart3, CheckCircle2, Loader2, RefreshCw, Users, XCircle } from "lucide-react"
import type { TeachingSubmission } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { sortByName } from "@/lib/utils"

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

/** Backend'dagi isExamPassed bilan bir xil: maksimal ballning 60% i */
function isPassed(grade: number | null, maxScore: number | null): boolean {
  if (grade == null) return false
  return grade >= (maxScore && maxScore > 0 ? maxScore * 0.6 : 60)
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

interface Props {
  submissions: TeachingSubmission[]
  maxScore: number | null
  attemptsCount: number | null
  /** Tanlangan talabalarga bittadan qo'shimcha urinish (o'qituvchi yoki admin API) */
  grant: (studentUserIds: number[]) => Promise<unknown>
  revoke: (studentUserId: number) => Promise<unknown>
  onChanged: () => Promise<unknown> | void
  /** Talaba javoblarini ko'rish (o'qituvchi oynasida) */
  onView?: (sub: TeachingSubmission) => void
}

/**
 * Test natijalari (F.I.Sh. bo'yicha) + yiqilgan talabalarni belgilab,
 * aynan ularga qayta urinish ruxsatini berish. Ruxsat bir martalik —
 * talaba testni yana bir marta topshiradi (muddat o'tgan bo'lsa ham).
 */
export function RetakeTable({ submissions, maxScore, attemptsCount, grant, revoke, onChanged, onView }: Props) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [revoking, setRevoking] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const rows = useMemo(() => sortByName(submissions, (s) => s.studentFullName), [submissions])
  const selectable = rows.filter((s) => !isPassed(s.grade, maxScore) && !s.retakeGranted)
  const maxAttempts = attemptsCount && attemptsCount > 0 ? attemptsCount : null

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleGrant() {
    const ids = [...selected]
    if (!ids.length) return
    setBusy(true)
    setMsg(null)
    try {
      await grant(ids)
      setSelected(new Set())
      setMsg({ ok: true, text: t("retake.grantedMsg", { n: ids.length }) })
      await onChanged()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : t("retake.error") })
    } finally {
      setBusy(false)
    }
  }

  async function handleRevoke(studentUserId: number) {
    setRevoking(studentUserId)
    setMsg(null)
    try {
      await revoke(studentUserId)
      setMsg({ ok: true, text: t("retake.revokedMsg") })
      await onChanged()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : t("retake.error") })
    } finally {
      setRevoking(null)
    }
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Users className="w-10 h-10" style={{ color: "#d8e6f7" }} />
        <p className="text-sm" style={L}>{t("retake.noSubmissions")}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs max-w-xl" style={L}>{t("retake.hint")}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {selectable.length > 0 && (
            <button type="button"
              onClick={() => setSelected(selected.size === selectable.length ? new Set() : new Set(selectable.map((s) => s.studentUserId)))}
              className="px-3 py-2 rounded-[8px] text-xs font-medium transition-colors hover:bg-[#f0f5ff]"
              style={{ border: "1px solid #d8e6f7", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              {selected.size === selectable.length ? t("retake.clearSelection") : t("retake.selectFailed", { n: selectable.length })}
            </button>
          )}
          <button type="button" onClick={handleGrant} disabled={busy || selected.size === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-xs font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {t("retake.grantSelected", { n: selected.size })}
          </button>
        </div>
      </div>

      {msg && (
        <div className="px-3 py-2 rounded-[8px] text-xs"
          style={{
            backgroundColor: msg.ok ? "#f0fdf4" : "#fef2f2",
            color: msg.ok ? "#15803d" : "#b91c1c",
            border: `1px solid ${msg.ok ? "rgba(34,197,94,0.3)" : "#fca5a5"}`,
            fontFamily: "var(--font-poppins)",
          }}>
          {msg.text}
        </div>
      )}

      <div className="overflow-x-auto rounded-[10px]" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
              {["", "#", t("retake.colStudent"), t("retake.colScore"), t("retake.colAttempts"), t("retake.colStatus"), t("retake.colSubmitted"), ...(onView ? [""] : [])].map((h, i) => (
                <th key={i} className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={T}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((sub, i) => {
              const passed = isPassed(sub.grade, maxScore)
              const canSelect = !passed && !sub.retakeGranted
              const used = sub.attemptsUsed ?? 1
              return (
                <tr key={sub.id} className="hover:bg-[#f6f9ff]" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                  <td className="px-3 py-2.5 w-8">
                    {canSelect && (
                      <input type="checkbox" checked={selected.has(sub.studentUserId)} onChange={() => toggle(sub.studentUserId)}
                        className="w-4 h-4 accent-[#0e58a8] cursor-pointer" aria-label={sub.studentFullName} />
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={L}>{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium" style={T}>{sub.studentFullName}</td>
                  <td className="px-3 py-2.5 font-bold whitespace-nowrap" style={{ color: passed ? "#15803d" : "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                    {sub.grade ?? "—"}{maxScore ? `/${maxScore}` : ""}
                  </td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={L}>
                    {maxAttempts !== null ? `${used}/${Math.max(maxAttempts, used)}` : used}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {passed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                        <CheckCircle2 className="w-3 h-3" /> {t("retake.passed")}
                      </span>
                    ) : sub.retakeGranted ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                          <RefreshCw className="w-3 h-3" /> {t("retake.granted")}
                        </span>
                        <button type="button" onClick={() => handleRevoke(sub.studentUserId)} disabled={revoking === sub.studentUserId}
                          className="text-[11px] underline disabled:opacity-50" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                          {revoking === sub.studentUserId ? "…" : t("retake.revoke")}
                        </button>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                        <XCircle className="w-3 h-3" /> {t("retake.failed")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={L}>{fmtDate(sub.submittedAt)}</td>
                  {onView && (
                    <td className="px-3 py-2.5">
                      {sub.answers?.length ? (
                        <button type="button" onClick={() => onView(sub)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-xs font-medium transition-colors hover:bg-[#0e58a8] hover:text-white"
                          style={{ border: "1px solid rgba(14,88,168,0.3)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                          <BarChart3 className="w-3 h-3" /> {t("retake.view")}
                        </button>
                      ) : <span className="text-xs" style={L}>—</span>}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
