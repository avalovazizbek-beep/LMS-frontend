"use client"

import { useMemo, useState } from "react"
import {
  RefreshCw, Search, Clock, CheckCircle2, AlertCircle, Lock, LockOpen, Users, ChevronDown, ChevronUp,
  ClipboardList, UserX, X, BookOpen, UsersRound, User, CalendarClock,
} from "lucide-react"
import { adminApi, type AdminExamListItem, type AdminOraliqStudent, type PeriodSource } from "@/lib/api"
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
  const selectable = students.filter(s => !s.passed && !s.retakeGranted)
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

      {selected.size > 0 && (
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
      <p className="text-[11px] text-[var(--adm-muted)]">{t("adminOraliq.grantHint")}</p>

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
              const canSelect = !s.passed && !s.retakeGranted
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
                    ) : s.passed ? (
                      <span className="adm-pill" style={{ "--c": "var(--adm-up)" } as CssVars}><CheckCircle2 className="h-3 w-3" /> {t("adminOraliq.passed")}</span>
                    ) : s.submittedAt !== null ? (
                      <span className="adm-pill" style={{ "--c": "var(--role-pending)" } as CssVars}>{t("adminOraliq.failed")}</span>
                    ) : (
                      <span className="adm-pill" style={{ "--c": "var(--role-admin)" } as CssVars}><UserX className="h-3 w-3" /> {t("adminOraliq.absent")}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5"><ViolationChips counts={s.violations ?? undefined} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type Kind = "oraliq" | "yakuniy"
type SlotFilter = "all" | "ON1" | "ON2" | "MI"
const isMi = (e: AdminExamListItem) => e.controlType === "mustaqil"

export default function AdminOraliqlar() {
  const { t } = useLanguage()
  const [kind, setKind] = useState<Kind>("oraliq")
  const [slotFilter, setSlotFilter] = useState<SlotFilter>("all")
  const [search, setSearch] = useState("")
  const [openId, setOpenId] = useState<number | null>(null)

  // Oraliq bo'limida mustaqil ishlar ham (MI filtri) — ular ham muddatli, kelmaganga qayta ochiladi
  const { data, loading, error, refetch } = useApi(
    () => adminApi.examsList({ controlType: kind === "oraliq" ? "oraliq,mustaqil" : kind }), [kind])
  const exams: AdminExamListItem[] = useMemo(() => data?.data ?? [], [data])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return exams.filter(e =>
      (kind !== "oraliq" || slotFilter === "all" || (slotFilter === "MI" ? isMi(e) : e.slot === slotFilter)) &&
      (!q || [e.title, e.groupName, e.subjectName, e.teacherName].some(v => v.toLowerCase().includes(q)))
    )
  }, [exams, search, slotFilter, kind])

  const counts = useMemo(() => ({
    all: exams.length,
    open: exams.filter(e => examStatus(e) === "open").length,
    closed: exams.filter(e => examStatus(e) === "closed").length,
    grants: exams.reduce((n, e) => n + e.grantCount, 0),
  }), [exams])

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="flex flex-col gap-5 px-4 pb-8 pt-2 sm:px-8">
      <PageHeader icon={ClipboardList} title={t("adminOraliq.title")} subtitle={t("adminOraliq.subtitle")}>
        <button onClick={() => refetch()}
          className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          style={{ boxShadow: "var(--adm-shadow)" }}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> {t("common.refresh")}
        </button>
      </PageHeader>

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
          {filtered.map(exam => {
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
        </div>
      )}
    </motion.div>
  )
}
