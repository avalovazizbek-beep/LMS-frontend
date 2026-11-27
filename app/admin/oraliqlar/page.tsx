"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  RefreshCw, Search, Clock, CheckCircle2, AlertCircle, Lock, LockOpen, Users, ChevronDown, ChevronUp,
  ClipboardList, UserX, X, BookOpen, UsersRound, User, CalendarClock, Hourglass, XCircle, Send, Info, RotateCcw, Loader2,
} from "lucide-react"
import {
  adminApi, reopenWindowOf, REOPEN_WINDOW_DAYS,
  type AdminExamListItem, type AdminOraliqStudent, type PeriodSource, type ReopenRequest, type ReopenStatus,
} from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { tr } from "@/lib/i18n/translations"
import { motion, pageVariants } from "@/components/ui/motion"
import { PersonAvatar } from "@/components/ui/PersonAvatar"
import { ViolationChips } from "@/components/teaching/ViolationChips"
import { TintStat, EmptyCard, PageHeader, Notice, type CssVars } from "@/components/admin/AdminUi"

const NUM = { fontVariantNumeric: "tabular-nums" } as const
const pad = (n: number) => String(n).padStart(2, "0")
// Jurnaldagi maksimal ball: oraliqda o'qituvchi qo'ygan ball (eski oraliqlar — 17 / 18)
const SLOT_MAX: Record<string, number> = { ON1: 17, ON2: 18, YN: 30 }

/** Intl'siz (brauzerda uz locale ma'lumotlari yo'q): 15.10.2026 23:50 */
function fmt(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function examStatus(e: { availableFrom: string; deadline: string | null }): "locked" | "open" | "closed" {
  const now = Date.now()
  if (new Date(e.availableFrom).getTime() > now) return "locked"
  if (e.deadline && new Date(e.deadline).getTime() < now) return "closed"
  return "open"
}

const STATUS_STYLE = {
  locked: { color: "var(--adm-muted)", icon: Lock, key: "adminOraliq.status.locked" },
  open:   { color: "var(--adm-up)", icon: LockOpen, key: "adminOraliq.status.open" },
  closed: { color: "var(--role-admin)", icon: Clock, key: "adminOraliq.status.closed" },
} as const

const SOURCE_KEY: Record<PeriodSource, string> = {
  exam: "adminOraliq.source.exam",
  manual: "adminOraliq.source.manual",
  absent: "adminOraliq.source.absent",
}

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
/** Qayta ochish oynasi yopilguncha: kun yoki (1 kundan kam bo'lsa) soat */
function leftUnits(closesAt: string | null, now: number): { unit: "days" | "hours"; n: number } {
  const left = closesAt ? new Date(closesAt).getTime() - now : 0
  return left >= DAY_MS ? { unit: "days", n: Math.ceil(left / DAY_MS) } : { unit: "hours", n: Math.max(1, Math.ceil(left / HOUR_MS)) }
}
const isScored = (e: { controlType: string | null }) => e.controlType === "oraliq" || e.controlType === "mustaqil"

/* Bitta nazorat bo'yicha guruhning to'liq ro'yxati: kim topshirdi, kim
   kelmadi (muddat o'tgach 0), tanlanganlarga bir martalik qayta ochish */
function OraliqStudents({ exam, onChanged }: { exam: AdminExamListItem; onChanged: () => void }) {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useApi(() => adminApi.oraliqStudents(exam.id), [exam.id])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [revoking, setRevoking] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const detail = data?.data ?? null
  const students: AdminOraliqStudent[] = useMemo(() => detail?.students ?? [], [detail])
  // Oraliq / mustaqil ish: admin o'zi ochmaydi — faqat o'qituvchi so'rovini tasdiqlaydi
  const byRequest = !!detail?.reopenByRequest
  const selectable = byRequest ? [] : students.filter(s => !s.passed && !s.retakeGranted)
  const absent = selectable.filter(s => s.submittedAt === null)
  const slot = detail?.exam.slot ?? null
  const slotMax = slot ? (slot !== "YN" ? detail?.exam.gradePoints ?? null : null) ?? SLOT_MAX[slot] : null

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function grant() {
    const ids = [...selected]
    if (!ids.length) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await adminApi.grantRetake(exam.id, ids, reason.trim() || undefined)
      setMsg({ ok: true, text: res.message ?? t("adminOraliq.granted", { n: ids.length }) })
      setSelected(new Set())
      setReason("")
      await refetch()
      onChanged()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : t("common.error") })
    } finally {
      setBusy(false)
    }
  }

  async function revoke(studentUserId: number) {
    setRevoking(studentUserId)
    setMsg(null)
    try {
      await adminApi.revokeRetake(exam.id, studentUserId)
      setMsg({ ok: true, text: t("adminOraliq.revoked") })
      await refetch()
      onChanged()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : t("common.error") })
    } finally {
      setRevoking(null)
    }
  }

  if (loading && !detail) {
    return <div className="flex justify-center py-6"><RefreshCw className="h-5 w-5 animate-spin text-[var(--adm-accent)]" /></div>
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <p className="text-sm" style={{ color: "var(--role-admin)" }}>{error}</p>
        <button onClick={() => refetch()} className="adm-btn-outline flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold">
          <RefreshCw className="h-3.5 w-3.5" /> {tr("common.refresh")}
        </button>
      </div>
    )
  }
  if (!students.length) return <p className="py-6 text-center text-sm text-[var(--adm-muted)]">{t("adminOraliq.noStudents")}</p>

  const submitted = students.filter(s => s.submittedAt !== null).length
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="adm-pill" style={{ "--c": "var(--adm-accent)" } as CssVars}><Users className="h-3 w-3" /> <span style={NUM}>{students.length}</span></span>
          <span className="adm-pill" style={{ "--c": "var(--adm-up)" } as CssVars}><CheckCircle2 className="h-3 w-3" /> {t("adminOraliq.submitted")}: <span style={NUM}>{submitted}</span></span>
          <span className="adm-pill" style={{ "--c": "var(--role-admin)" } as CssVars}><UserX className="h-3 w-3" /> {t("adminOraliq.absent")}: <span style={NUM}>{students.length - submitted}</span></span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {absent.length > 0 && (
            <button onClick={() => setSelected(new Set(absent.map(s => s.userId)))}
              className="adm-btn-outline rounded-xl px-3 py-2 text-xs font-semibold">
              {t("adminOraliq.selectAbsent", { n: absent.length })}
            </button>
          )}
          {selected.size > 0 && (
            <button onClick={() => setSelected(new Set())} className="rounded-xl px-3 py-2 text-xs font-medium text-[var(--adm-muted)] hover:text-[var(--adm-text)]">
              {t("adminOraliq.clearSelection")}
            </button>
          )}
        </div>
      </div>

      {byRequest && (
        <div className="adm-tint flex items-start gap-2.5 px-4 py-3 text-xs" style={{ "--c": "var(--adm-accent)", color: "var(--adm-text-2)" } as CssVars}>
          <Info className="mt-px h-4 w-4 shrink-0 text-[var(--adm-accent)]" />
          {t("adminOraliq.byRequestHint", { days: REOPEN_WINDOW_DAYS })}
        </div>
      )}

      {!byRequest && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="adm-input flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl px-3 sm:max-w-[360px]">
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder={t("adminOraliq.reasonPh")}
              className="w-full bg-transparent text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]" />
          </label>
          <button onClick={grant} disabled={busy}
            className="adm-btn-primary flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60">
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LockOpen className="h-4 w-4" />}
            {t("adminOraliq.grantSelected", { n: selected.size })}
          </button>
        </div>
      )}
      {!byRequest && <p className="text-[11px] text-[var(--adm-muted)]">{t("adminOraliq.grantHint")}</p>}

      {msg && <Notice ok={msg.ok}>{msg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}{msg.text}</Notice>}

      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--adm-border)" }}>
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--adm-grid)", borderBottom: "1px solid var(--adm-border)" }}>
              {["", "#", t("adminOraliq.colStudent"), t("adminOraliq.colResult"),
                slot ? t("adminOraliq.colJournal", { slot, max: slotMax ?? "" }) : t("adminOraliq.colJournalPlain"),
                t("adminOraliq.colAttempts"), t("adminOraliq.colStatus"), t("viol.column")].map((h, i) => (
                <th key={i} className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--adm-muted)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const canSelect = !byRequest && !s.passed && !s.retakeGranted
              const ball = slotMax != null && s.journalPct != null ? Math.round((Math.min(100, Math.max(0, s.journalPct)) * slotMax) / 100) : null
              return (
                <tr key={s.userId} className="adm-hover-row" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                  <td className="w-8 px-3 py-2.5">
                    {canSelect && (
                      <input type="checkbox" checked={selected.has(s.userId)} onChange={() => toggle(s.userId)}
                        className="h-4 w-4 cursor-pointer" style={{ accentColor: "var(--adm-accent)" }} aria-label={s.fullName} />
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[var(--adm-muted)]" style={NUM}>{i + 1}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <PersonAvatar kind="student" id={s.userId} className="h-8 w-8 rounded-full">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}>
                          {s.fullName.trim().charAt(0).toUpperCase() || "?"}
                        </div>
                      </PersonAvatar>
                      <span className="text-[13px] font-medium text-[var(--adm-text)]">{s.fullName}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {s.submittedAt !== null ? (
                      <span className="font-bold" style={{ color: s.passed ? "var(--adm-up)" : "var(--role-admin)", ...NUM }}>
                        {s.grade ?? "—"}{detail?.exam.maxScore ? `/${detail.exam.maxScore}` : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--adm-muted)]">{t("adminOraliq.notSubmitted")}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {ball != null ? (
                      <span className="flex items-center gap-1.5">
                        <span className="font-bold text-[var(--adm-text)]" style={NUM}>{ball}</span>
                        {s.journalSource && s.journalSource !== "exam" && (
                          <span className="adm-pill" style={{ "--c": s.journalSource === "absent" ? "var(--role-admin)" : "var(--role-dean)" } as CssVars}>
                            {t(SOURCE_KEY[s.journalSource])}
                          </span>
                        )}
                      </span>
                    ) : <span className="text-xs text-[var(--adm-muted)]">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--adm-muted)]" style={NUM}>
                    {detail?.exam.attemptsCount ? `${s.attemptsUsed}/${Math.max(detail.exam.attemptsCount, s.attemptsUsed)}` : s.attemptsUsed}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {s.retakeGranted ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="adm-pill" style={{ "--c": "var(--adm-accent)" } as CssVars}><LockOpen className="h-3 w-3" /> {t("adminOraliq.reopened")}</span>
                        <button onClick={() => revoke(s.userId)} disabled={revoking === s.userId}
                          className="text-[11px] underline disabled:opacity-50" style={{ color: "var(--role-admin)" }}>
                          {revoking === s.userId ? "…" : t("adminOraliq.revoke")}
                        </button>
                      </span>
                    ) : s.reopenPending ? (
                      <span className="adm-pill" style={{ "--c": "var(--role-pending)" } as CssVars}><Send className="h-3 w-3" /> {t("adminOraliq.inRequest")}</span>
                    ) : s.passed ? (
                      <span className="adm-pill" style={{ "--c": "var(--adm-up)" } as CssVars}><CheckCircle2 className="h-3 w-3" /> {t("adminOraliq.passed")}</span>
                    ) : s.submittedAt !== null ? (
                      <span className="adm-pill" style={{ "--c": "var(--role-pending)" } as CssVars}>{t("adminOraliq.failed")}</span>
                    ) : (
                      <span className="adm-pill" style={{ "--c": "var(--role-admin)" } as CssVars}><UserX className="h-3 w-3" /> {t("adminOraliq.absent")}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5"><ViolationChips counts={s.violations ?? undefined} contentId={exam.id} studentUserId={s.userId} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── O'qituvchilarning qayta ochish so'rovlari (oraliq / mustaqil ish) ──
   Admin o'zi ochmaydi: o'qituvchi talabalarni belgilab so'raydi, shu yerda
   tasdiqlanadi yoki rad etiladi. Muddatdan 5 kun o'tgach tasdiqlab bo'lmaydi. */
const REQ_TABS: (ReopenStatus | "all")[] = ["pending", "approved", "rejected", "expired", "all"]
const REQ_STYLE: Record<ReopenStatus, { color: string; icon: React.ElementType }> = {
  pending:   { color: "var(--role-pending)", icon: Hourglass },
  approved:  { color: "var(--adm-up)", icon: CheckCircle2 },
  rejected:  { color: "var(--role-admin)", icon: XCircle },
  expired:   { color: "var(--adm-muted)", icon: Clock },
  cancelled: { color: "var(--adm-muted)", icon: X },
}

function ReopenRequests({ onPendingCount }: { onPendingCount: (n: number) => void }) {
  const { t } = useLanguage()
  const [status, setStatus] = useState<ReopenStatus | "all">("pending")
  const [rows, setRows] = useState<ReopenRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [actingId, setActingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<Record<number, string>>({})
  const [flash, setFlash] = useState<string | null>(null)
  const [windowDays, setWindowDays] = useState(REOPEN_WINDOW_DAYS)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback((s: ReopenStatus | "all") => {
    setLoading(true)
    setError(null)
    adminApi.reopenRequests(s)
      .then((res) => {
        setRows(res.data ?? [])
        onPendingCount(res.pendingCount ?? 0)
        setWindowDays(res.windowDays ?? REOPEN_WINDOW_DAYS)
        setNow(Date.now())
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("common.error")))
      .finally(() => setLoading(false))
  }, [onPendingCount, t])

  useEffect(() => { load(status) }, [status, load])

  async function review(r: ReopenRequest, action: "approve" | "reject") {
    setActingId(r.id)
    setFlash(null)
    setActionError((prev) => ({ ...prev, [r.id]: "" }))
    try {
      const res = await adminApi.reviewReopenRequest(r.id, action, notes[r.id]?.trim() || undefined)
      setFlash(`${r.content.title} · ${r.content.groupName}: ${res.message}`)
      load(status)
    } catch (e) {
      setActionError((prev) => ({ ...prev, [r.id]: e instanceof Error ? e.message : t("common.error") }))
      load(status)
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="adm-tint flex items-start gap-2.5 px-4 py-3 text-xs" style={{ "--c": "var(--adm-accent)", color: "var(--adm-text-2)" } as CssVars}>
        <Info className="mt-px h-4 w-4 shrink-0 text-[var(--adm-accent)]" />
        {t("adminOraliq.req.hint", { days: windowDays })}
      </div>

      <div className="adm-card flex flex-wrap items-center gap-2 p-3 sm:p-4">
        {REQ_TABS.map((s) => {
          const Icon = s === "all" ? ClipboardList : REQ_STYLE[s].icon
          return (
            <button key={s} type="button" onClick={() => setStatus(s)} data-active={status === s}
              className="adm-chip flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium">
              <Icon className="h-3.5 w-3.5" />
              {t(`adminOraliq.req.status.${s}`)}
            </button>
          )
        })}
        <button type="button" onClick={() => load(status)}
          className="adm-btn-outline ml-auto flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> {t("common.refresh")}
        </button>
      </div>

      {flash && <Notice ok><CheckCircle2 className="h-4 w-4 shrink-0" />{flash}</Notice>}

      {loading && rows.length === 0 ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="adm-card h-[160px] animate-pulse" />)}
        </div>
      ) : error ? (
        <Notice ok={false}><AlertCircle className="h-4 w-4 shrink-0" />{error}</Notice>
      ) : rows.length === 0 ? (
        <EmptyCard icon={RotateCcw} text={t("adminOraliq.req.empty")} />
      ) : (
        <div className={`flex flex-col gap-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {rows.map((r) => {
            const cfg = REQ_STYLE[r.status]
            const StIcon = cfg.icon
            const acting = actingId === r.id
            const isMiReq = r.content.controlType === "mustaqil"
            const slot = r.content.kind === "ON1" || r.content.kind === "ON2" ? r.content.kind : null
            const left = leftUnits(r.window.closesAt, now)
            const winOpen = r.window.closesAt ? new Date(r.window.closesAt).getTime() > now : true
            return (
              <div key={r.id} className="adm-card flex flex-col gap-3 p-5" style={{ boxShadow: `inset 3px 0 0 ${cfg.color}, var(--adm-shadow)` }}>
                <div className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-[var(--adm-text)]">
                  {r.content.title}
                  {slot && <span className="adm-pill" style={{ "--c": "var(--role-dean)" } as CssVars}>{slot}</span>}
                  {isMiReq && (
                    <span className="adm-pill" style={{ "--c": "#9333ea" } as CssVars}>
                      {t("adminOraliq.miBadge")} · {t(r.content.gradePart === "Amaliyot" ? "fanResurslariOq.trainingType.practice" : "fanResurslariOq.trainingType.lecture")}
                    </span>
                  )}
                  {r.content.type === "assignment" && <span className="adm-pill" style={{ "--c": "var(--role-pending)" } as CssVars}>{t("adminOraliq.formatAssignment")}</span>}
                  <span className="adm-pill" style={{ "--c": cfg.color } as CssVars}><StIcon className="h-3 w-3" /> {t(`adminOraliq.req.status.${r.status}`)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="adm-pill" style={{ "--c": "var(--adm-accent)" } as CssVars}><UsersRound className="h-3 w-3" /> {r.content.groupName}</span>
                  <span className="adm-pill"><BookOpen className="h-3 w-3" /> {r.content.subjectName}</span>
                  <span className="adm-pill"><User className="h-3 w-3" /> {r.teacherName}</span>
                  <span className="adm-pill"><CalendarClock className="h-3 w-3" /> <span style={NUM}>{t("adminOraliq.req.deadline", { date: fmt(r.content.deadline) })}</span></span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--adm-muted)]">
                  <span style={NUM}>{t("adminOraliq.req.sentAt", { date: fmt(r.createdAt) })}</span>
                  {r.status === "pending" && (winOpen ? (
                    <span className="font-semibold" style={{ color: "var(--role-pending)" }}>
                      <Hourglass className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
                      {t(left.unit === "days" ? "adminOraliq.req.leftDays" : "adminOraliq.req.leftHours", { n: left.n })}
                    </span>
                  ) : (
                    <span className="font-semibold" style={{ color: "var(--role-admin)" }}>
                      <Lock className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />{t("adminOraliq.req.closed")}
                    </span>
                  ))}
                </div>

                <div className="rounded-xl px-3.5 py-2.5 text-sm" style={{ backgroundColor: "var(--adm-grid)", color: "var(--adm-text)" }}>
                  {t("adminOraliq.req.reason", { reason: r.reason })}
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--adm-muted)]">{t("adminOraliq.req.students", { n: r.students.length })}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {r.students.map((s) => <span key={s.userId} className="adm-pill">{s.fullName}</span>)}
                  </div>
                </div>

                {r.status === "pending" ? (
                  <div className="flex flex-col gap-2">
                    <input
                      value={notes[r.id] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder={t("adminOraliq.req.notePh")}
                      maxLength={1000}
                      className="adm-input w-full rounded-xl px-3.5 py-2.5 text-sm outline-none placeholder:text-[var(--adm-muted)]"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => review(r, "approve")} disabled={acting || !winOpen}
                        className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: "var(--adm-up)", boxShadow: "0 6px 14px -6px var(--adm-up)" }}>
                        {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LockOpen className="h-3.5 w-3.5" />}
                        {t("adminOraliq.req.approve", { n: r.students.length })}
                      </button>
                      <button type="button" onClick={() => review(r, "reject")} disabled={acting}
                        className="adm-btn-outline flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                        style={{ color: "var(--role-admin)" }}>
                        {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                        {t("adminOraliq.req.reject")}
                      </button>
                      {actionError[r.id] && <span className="text-xs" style={{ color: "var(--role-admin)" }}>{actionError[r.id]}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 text-xs text-[var(--adm-muted)]">
                    {r.reviewedAt && <span style={NUM}>{t("adminOraliq.req.reviewed", { name: r.reviewedByName ?? "—", date: fmt(r.reviewedAt) })}</span>}
                    {r.status === "approved" && <span style={{ color: "var(--adm-up)" }}>{t("adminOraliq.req.granted", { n: r.grantedCount })}</span>}
                    {r.adminNote && <span>{t("adminOraliq.req.adminNote", { note: r.adminNote })}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

type Kind = "oraliq" | "yakuniy"
type SlotFilter = "all" | "ON1" | "ON2" | "MI"
const isMi = (e: AdminExamListItem) => e.controlType === "mustaqil"
const PAGE_SIZE = 50

export default function AdminOraliqlar() {
  const { t } = useLanguage()
  // Bildirishnomadagi havola (?tab=requests) to'g'ridan-to'g'ri so'rovlarni ochadi
  const searchParams = useSearchParams()
  const [pageTab, setPageTab] = useState<"exams" | "requests">(searchParams.get("tab") === "requests" ? "requests" : "exams")
  const [pendingCount, setPendingCount] = useState(0)
  const [now] = useState(() => Date.now())
  useEffect(() => {
    adminApi.reopenRequests("pending")
      .then((res) => setPendingCount(res.pendingCount ?? 0))
      .catch(() => { /* ruxsat yo'q yoki xato — nishonsiz qoladi */ })
  }, [])
  const [kind, setKind] = useState<Kind>("oraliq")
  const [slotFilter, setSlotFilter] = useState<SlotFilter>("all")
  const [search, setSearch] = useState("")
  const [teacherFilter, setTeacherFilter] = useState("")
  const [groupFilter, setGroupFilter] = useState("")
  const [subjectFilter, setSubjectFilter] = useState("")
  const [openId, setOpenId] = useState<number | null>(null)
  // Server endi hamma nazoratni qaytaradi (avval 300 ta bilan kesilardi) —
  // sahifa og'irlashmasin deb kartalar bo'lib-bo'lib chiziladi
  const [shown, setShown] = useState(PAGE_SIZE)

  // Oraliq bo'limida mustaqil ishlar ham (MI filtri) — ular ham muddatli, kelmaganga qayta ochiladi
  const { data, loading, error, refetch } = useApi(
    () => adminApi.examsList({ controlType: kind === "oraliq" ? "oraliq,mustaqil" : kind }), [kind])
  const exams: AdminExamListItem[] = useMemo(() => data?.data ?? [], [data])

  // O'qituvchi → guruh → fan tanlovlari: keyingisining ro'yxati oldingisiga qarab toraytiriladi
  const uniq = (list: string[]) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const teacherOptions = useMemo(() => uniq(exams.map(e => e.teacherName)), [exams])
  const groupOptions = useMemo(() =>
    uniq(exams.filter(e => !teacherFilter || e.teacherName === teacherFilter).map(e => e.groupName)), [exams, teacherFilter])
  const subjectOptions = useMemo(() =>
    uniq(exams.filter(e => (!teacherFilter || e.teacherName === teacherFilter) && (!groupFilter || e.groupName === groupFilter))
      .map(e => e.subjectName)), [exams, teacherFilter, groupFilter])
  const hasSelectFilter = !!(teacherFilter || groupFilter || subjectFilter)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return exams.filter(e =>
      (kind !== "oraliq" || slotFilter === "all" || (slotFilter === "MI" ? isMi(e) : e.slot === slotFilter)) &&
      (!teacherFilter || e.teacherName === teacherFilter) &&
      (!groupFilter || e.groupName === groupFilter) &&
      (!subjectFilter || e.subjectName === subjectFilter) &&
      (!q || [e.title, e.groupName, e.subjectName, e.teacherName].some(v => v.toLowerCase().includes(q)))
    )
  }, [exams, search, slotFilter, kind, teacherFilter, groupFilter, subjectFilter])

  // Filtr o'zgarsa ro'yxat yana boshidan (50 ta) ko'rsatiladi
  const filterKey = [search, slotFilter, kind, teacherFilter, groupFilter, subjectFilter].join("|")
  const [shownFor, setShownFor] = useState(filterKey)
  if (shownFor !== filterKey) { setShownFor(filterKey); setShown(PAGE_SIZE) }
  const visible = filtered.slice(0, shown)

  const counts = useMemo(() => ({
    all: exams.length,
    open: exams.filter(e => examStatus(e) === "open").length,
    closed: exams.filter(e => examStatus(e) === "closed").length,
    grants: exams.reduce((n, e) => n + e.grantCount, 0),
  }), [exams])

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="flex flex-col gap-5 px-4 pb-8 pt-2 sm:px-8">
      <PageHeader icon={ClipboardList} title={t("adminOraliq.title")} subtitle={t("adminOraliq.subtitle")}>
        <div className="flex flex-wrap items-center gap-2">
        <div className="adm-card flex flex-wrap gap-1 p-1">
          {([
            { key: "exams", label: t("adminOraliq.tab.exams"), icon: ClipboardList },
            { key: "requests", label: t("adminOraliq.tab.requests"), icon: RotateCcw },
          ] as { key: "exams" | "requests"; label: string; icon: React.ElementType }[]).map(tabItem => {
            const Icon = tabItem.icon
            const active = pageTab === tabItem.key
            return (
              <button key={tabItem.key} type="button" onClick={() => setPageTab(tabItem.key)}
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors"
                style={active
                  ? { background: "linear-gradient(90deg,#2f6bf2,#2259e0)", color: "#fff", boxShadow: "0 6px 14px -6px rgba(47,107,242,0.7)" }
                  : { color: "var(--adm-text-2)" }}>
                <Icon className="h-4 w-4" />
                {tabItem.label}
                {tabItem.key === "requests" && pendingCount > 0 && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                    style={{ backgroundColor: active ? "rgba(255,255,255,0.25)" : "var(--role-admin)" }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {pageTab === "exams" && (
          <button onClick={() => refetch()}
            className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            style={{ boxShadow: "var(--adm-shadow)" }}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> {t("common.refresh")}
          </button>
        )}
        </div>
      </PageHeader>

      {pageTab === "requests" ? <ReopenRequests onPendingCount={setPendingCount} /> : (<>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <TintStat icon={ClipboardList} color="var(--adm-accent)" label={t("adminOraliq.statAll")} value={counts.all} />
        <TintStat icon={LockOpen} color="var(--adm-up)" label={t("adminOraliq.statOpen")} value={counts.open} />
        <TintStat icon={Clock} color="var(--role-admin)" label={t("adminOraliq.statClosed")} value={counts.closed} />
        <TintStat icon={UsersRound} color="var(--role-dean)" label={t("adminOraliq.statGrants")} value={counts.grants} />
      </div>

      <div className="adm-card flex flex-wrap items-center gap-3 p-3 sm:p-4">
        <div className="flex items-center gap-1.5">
          {(["oraliq", "yakuniy"] as Kind[]).map(k => (
            <button key={k} onClick={() => { setKind(k); setOpenId(null) }} data-active={kind === k}
              className="adm-chip rounded-full px-3.5 py-1.5 text-[13px] font-medium">
              {t(k === "oraliq" ? "adminOraliq.kindOraliq" : "adminOraliq.kindYakuniy")}
            </button>
          ))}
        </div>
        {kind === "oraliq" && (
          <div className="flex items-center gap-1.5">
            {(["all", "ON1", "ON2", "MI"] as SlotFilter[]).map(s => (
              <button key={s} onClick={() => setSlotFilter(s)} data-active={slotFilter === s}
                className="adm-chip rounded-full px-3 py-1.5 text-[13px] font-medium">
                {s === "all" ? t("adminOraliq.slotAll") : s === "MI" ? t("adminOraliq.slotMi") : s}
              </button>
            ))}
          </div>
        )}
        <label className="adm-input flex h-10 w-full items-center gap-2 rounded-xl px-3 sm:ml-auto sm:w-[340px]">
          <Search className="h-4 w-4 shrink-0 text-[var(--adm-muted)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("adminOraliq.searchPh")}
            className="w-full bg-transparent text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]" />
          {search && (
            <button onClick={() => setSearch("")} aria-label="×" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--adm-grid)] text-[var(--adm-muted)]">
              <X className="h-3 w-3" />
            </button>
          )}
        </label>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { value: teacherFilter, options: teacherOptions, all: t("adminOraliq.allTeachers"),
              set: (v: string) => { setTeacherFilter(v); setGroupFilter(""); setSubjectFilter("") } },
            { value: groupFilter, options: groupOptions, all: t("adminOraliq.allGroups"),
              set: (v: string) => { setGroupFilter(v); setSubjectFilter("") } },
            { value: subjectFilter, options: subjectOptions, all: t("adminOraliq.allSubjects"), set: setSubjectFilter },
          ].map(f => (
            <select key={f.all} value={f.value} onChange={e => { f.set(e.target.value); setOpenId(null) }}
              className="adm-input h-10 w-full rounded-xl px-3 text-sm text-[var(--adm-text)] outline-none">
              <option value="">{f.all}</option>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
        </div>
        {hasSelectFilter && (
          <div className="flex w-full items-center justify-between gap-2 text-[13px] text-[var(--adm-muted)]">
            <span>{t("adminOraliq.foundN", { n: filtered.length })}</span>
            <button onClick={() => { setTeacherFilter(""); setGroupFilter(""); setSubjectFilter("") }}
              className="font-semibold text-[var(--adm-accent)]">
              {t("adminOraliq.clearFilters")}
            </button>
          </div>
        )}
      </div>

      {error && <Notice ok={false}><AlertCircle className="h-4 w-4 shrink-0" />{error}</Notice>}

      {loading && !data ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="adm-card h-[96px] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyCard icon={ClipboardList} text={t("adminOraliq.empty")} hint={t("adminOraliq.emptyHint")} />
      ) : (
        <div className={`flex flex-col gap-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {visible.map(exam => {
            const st = STATUS_STYLE[examStatus(exam)]
            const isOpen = openId === exam.id
            return (
              <div key={exam.id} className="adm-card overflow-hidden" style={{ boxShadow: `inset 3px 0 0 ${st.color}, var(--adm-shadow)` }}>
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:px-5">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <div className="adm-icon-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ "--c": st.color } as CssVars}>
                      <st.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-[var(--adm-text)]">
                        {exam.title}
                        {exam.slot && <span className="adm-pill" style={{ "--c": "var(--role-dean)" } as CssVars}>{exam.slot}{exam.controlType === "oraliq" ? ` · ${exam.gradePoints ?? SLOT_MAX[exam.slot]} ${t("adminOraliq.pointsShort")}` : ""}</span>}
                        {isMi(exam) && (
                          <span className="adm-pill" style={{ "--c": "#9333ea" } as CssVars}>
                            {t("adminOraliq.miBadge")} · {t(exam.gradePart === "Amaliyot" ? "fanResurslariOq.trainingType.practice" : "fanResurslariOq.trainingType.lecture")}
                            {exam.gradePoints != null ? ` · ${exam.gradePoints} ${t("adminOraliq.pointsShort")}` : ""}
                          </span>
                        )}
                        {exam.type === "assignment" && <span className="adm-pill" style={{ "--c": "var(--role-pending)" } as CssVars}>{t("adminOraliq.formatAssignment")}</span>}
                        {exam.isActive === false && <span className="adm-pill" title={t("adminOraliq.inactiveHint")}>{t("adminOraliq.inactive")}</span>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="adm-pill" style={{ "--c": "var(--adm-accent)" } as CssVars}><UsersRound className="h-3 w-3" /> {exam.groupName}</span>
                        <span className="adm-pill"><BookOpen className="h-3 w-3" /> {exam.subjectName}</span>
                        <span className="adm-pill"><User className="h-3 w-3" /> {exam.teacherName}</span>
                        <span className="adm-pill" style={{ "--c": st.color } as CssVars}>
                          <CalendarClock className="h-3 w-3" />
                          <span style={NUM}>{fmt(exam.availableFrom)} — {fmt(exam.deadline)}</span>
                          <span>{t(st.key)}</span>
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-[var(--adm-muted)]">
                        <span>{t("adminOraliq.submittedCount", { n: exam.submissionCount })}</span>
                        {exam.grantCount > 0 && <span style={{ color: "var(--adm-accent)" }}>{t("adminOraliq.grantCount", { n: exam.grantCount })}</span>}
                        {(exam.pendingRequests ?? 0) > 0 && (
                          <button type="button" onClick={() => setPageTab("requests")} className="font-semibold underline" style={{ color: "var(--role-pending)" }}>
                            <Send className="-mt-0.5 mr-1 inline h-3 w-3" />{t("adminOraliq.pendingCount", { n: exam.pendingRequests ?? 0 })}
                          </button>
                        )}
                        {isScored(exam) && (() => {
                          const win = reopenWindowOf(exam.deadline, now)
                          if (!win.ended) return null
                          if (!win.open) return <span className="font-semibold" style={{ color: "var(--role-admin)" }}><Lock className="-mt-0.5 mr-1 inline h-3 w-3" />{t("adminOraliq.reopenClosed")}</span>
                          const left = leftUnits(win.closesAt, now)
                          return <span className="font-semibold" style={{ color: "var(--role-pending)" }}><Hourglass className="-mt-0.5 mr-1 inline h-3 w-3" />{t(left.unit === "days" ? "adminOraliq.reopenLeft" : "adminOraliq.reopenLeftHours", { n: left.n })}</span>
                        })()}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setOpenId(isOpen ? null : exam.id)} data-active={isOpen}
                    className="adm-btn-outline flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold">
                    <Users className="h-4 w-4" />
                    {t("adminOraliq.showStudents")}
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
                {isOpen && (
                  <div className="px-4 pb-4 pt-4 sm:px-5" style={{ borderTop: "1px solid var(--adm-border)" }}>
                    <OraliqStudents exam={exam} onChanged={() => refetch()} />
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length > visible.length && (
            <button onClick={() => setShown(n => n + PAGE_SIZE)}
              className="adm-btn-outline mx-auto flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold"
              style={{ boxShadow: "var(--adm-shadow)" }}>
              <ChevronDown className="h-4 w-4" />
              {t("adminOraliq.showMore", { n: filtered.length - visible.length })}
            </button>
          )}
        </div>
      )}
      </>)}
    </motion.div>
  )
}
