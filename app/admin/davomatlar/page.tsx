"use client"

import { Fragment, useMemo, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import {
  ClipboardCheck, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Users, UsersRound, Loader2, CalendarDays,
  CalendarCheck, CheckCircle2, XCircle, Video, User, FileSpreadsheet, FileText, Send, Download,
  Clock, PencilLine, RefreshCw, Info, BookOpen, ArrowRight, Check, X, RotateCcw, Search,
} from "lucide-react"
import {
  adminApi, type AdminAttendanceRow, type AdminAttendanceDetailRow, type AdminAttendanceMatrix,
  type PlatformAttendanceDay, type AdminTeacherStat,
  type AttendanceEditRequest, type AttendanceEditStatus,
} from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { exportToExcel, exportToPdf, buildPdfBase64 } from "@/lib/exportUtils"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { motion, pageVariants } from "@/components/ui/motion"
import { PersonAvatar } from "@/components/ui/PersonAvatar"
import { trainingTypeLabelKey } from "@/lib/attendanceTrainingTypes"
import { Field, FieldSelect, TintStat as StatCard, EmptyCard, type CssVars } from "@/components/admin/AdminUi"

const T = { color: "var(--adm-text)" } as const
const L = { color: "var(--adm-muted)" } as const
const NUM = { fontVariantNumeric: "tabular-nums" } as const

const OVERVIEW_PAGE_SIZE = 20
const MATRIX_PAGE_SIZES = [10, 20, 50]

/** Davomat foizi rangi — admin.css tokenlari (qorong'i rejimda ham o'qiladi) */
function pctColor(pct: number) {
  if (pct >= 80) return "var(--adm-up)"
  if (pct >= 60) return "var(--role-pending)"
  return "var(--role-admin)"
}

/* Holatlar: rang, belgi, tarjima. "Uzrli" — hujjat (sababli) belgisi */
const STATUS: Record<string, { labelKey: string; color: string; icon: React.ElementType }> = {
  present: { labelKey: "adminDavomatlar.statusPresent", color: "var(--adm-up)",       icon: Check },
  absent:  { labelKey: "adminDavomatlar.statusAbsent",  color: "var(--role-admin)",   icon: X },
  late:    { labelKey: "adminDavomatlar.statusLate",    color: "var(--role-pending)", icon: Clock },
  excused: { labelKey: "adminDavomatlar.statusExcused", color: "var(--role-dean)",    icon: FileText },
}
const STATUS_ORDER = ["present", "absent", "late", "excused"] as const

const pad = (n: number) => String(n).padStart(2, "0")
const sheetKeyOf = (date: string, type?: string | null) => `${date}|${type ?? ""}`

/** "2026-10-12" → Date (mahalliy yarim tun) */
function dayOf(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}
/** Hafta kuni tarjima kaliti — weekday.1 (Dushanba) … weekday.7 (Yakshanba) */
function weekdayKey(iso: string) {
  const d = dayOf(iso)
  if (!d) return null
  return `weekday.${d.getDay() === 0 ? 7 : d.getDay()}`
}
/** Intl'siz (brauzerda uz locale ma'lumotlari yo'q): 12.10.2026 */
function fmtDay(iso: string) {
  const d = dayOf(iso)
  return d ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}` : iso
}
function fmtStamp(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Eksport uchun: "2026-10-12 (Amaliy)" */
function dateWithType(date: string, type?: string | null) {
  return type ? `${date} (${type})` : date
}

function pageNums(cur: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const nums: (number | "...")[] = [0]
  const l = Math.max(1, cur - 1), r = Math.min(total - 2, cur + 1)
  if (l > 1) nums.push("...")
  for (let i = l; i <= r; i++) nums.push(i)
  if (r < total - 2) nums.push("...")
  nums.push(total - 1)
  return nums
}

/* ── Kichik umumiy bo'laklar ─────────────────────────────────────────── */

/* Mashg'ulot turi (ma'ruza/amaliy...) — bir kunda har biri alohida davomat */
function TrainingTypeBadge({ value, small }: { value?: string | null; small?: boolean }) {
  const { t } = useLanguage()
  if (!value) return null
  const key = trainingTypeLabelKey(value)
  return (
    <span className="adm-pill" style={{ "--c": "var(--adm-accent)", ...(small ? { padding: "0 6px", fontSize: 10, lineHeight: "16px" } : {}) } as CssVars}>
      {key ? t(key) : value}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage()
  const cfg = STATUS[status]
  const Icon = cfg?.icon
  return (
    <span className="adm-pill font-semibold" style={{ "--c": cfg?.color ?? "var(--adm-muted)" } as CssVars}>
      {Icon && <Icon className="h-3 w-3" strokeWidth={3} />}
      {cfg ? t(cfg.labelKey) : status}
    </span>
  )
}

/** Jadval katagidagi yumaloq holat belgisi; belgilanmagan bo'lsa — kulrang chiziqcha */
function StatusDot({ status, title, size = 22 }: { status?: string; title?: string; size?: number }) {
  const cfg = status ? STATUS[status] : undefined
  if (!cfg) {
    return (
      <span title={title} className="mx-auto flex items-center justify-center rounded-full text-[var(--adm-muted)]"
        style={{ width: size, height: size, backgroundColor: "var(--adm-grid)" }}>
        <span className="h-0.5 w-2 rounded bg-current opacity-60" />
      </span>
    )
  }
  const Icon = cfg.icon
  return (
    <span title={title} className="mx-auto flex items-center justify-center rounded-full text-white"
      style={{ width: size, height: size, backgroundColor: cfg.color, boxShadow: `0 3px 8px -4px ${cfg.color}` }}>
      <Icon style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={3} />
    </span>
  )
}

function Legend() {
  const { t } = useLanguage()
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {STATUS_ORDER.map(s => (
        <span key={s} className="adm-pill" style={{ "--c": STATUS[s].color } as CssVars}>
          <StatusDot status={s} size={14} />
          {t(STATUS[s].labelKey)}
        </span>
      ))}
    </div>
  )
}

const DATE_INPUT = "w-full min-w-0 bg-transparent text-sm font-semibold text-[var(--adm-text)] outline-none"

/** Pastki sahifalash qatori */
function Pager({ total, page, pageSize, onPage, sizes, onPageSize }: {
  total: number; page: number; pageSize: number; onPage: (p: number) => void
  sizes?: number[]; onPageSize?: (n: number) => void
}) {
  const { t } = useLanguage()
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3" style={{ borderTop: "1px solid var(--adm-border)" }}>
      <span className="text-xs text-[var(--adm-muted)]" style={NUM}>
        {t("adminDavomatlar.shownRange", { total, from: page * pageSize + 1, to: Math.min(total, (page + 1) * pageSize) })}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => onPage(page - 1)} disabled={page <= 0} aria-label="←"
          className="adm-btn-outline flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageNums(page, pageCount).map((n, i) =>
          n === "..." ? <span key={`e${i}`} className="px-1 text-xs" style={L}>…</span> : (
            <button key={n} onClick={() => onPage(n)} data-active={n === page}
              className="adm-chip h-8 min-w-8 rounded-lg px-2 text-xs font-semibold" style={NUM}>
              {n + 1}
            </button>
          )
        )}
        <button onClick={() => onPage(page + 1)} disabled={page >= pageCount - 1} aria-label="→"
          className="adm-btn-outline flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
        {sizes && onPageSize && (
          <div className="adm-input relative ml-1 h-8 rounded-lg">
            <select value={pageSize} onChange={e => onPageSize(Number(e.target.value))}
              className="h-full cursor-pointer appearance-none bg-transparent pl-2.5 pr-7 text-xs font-semibold text-[var(--adm-text)] outline-none">
              {sizes.map(s => <option key={s} value={s}>{t("adminDavomatlar.perPage", { n: s })}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--adm-muted)]" />
          </div>
        )}
      </div>
    </div>
  )
}

function StudentInitial({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36, background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  )
}

const AVATAR_RING = { boxShadow: "0 0 0 2px var(--adm-card), 0 0 0 3px var(--adm-border-strong)" }

/* ── Bitta varaqning (sana + mashg'ulot turi) talabalar ro'yxati ─────────── */
function DateDetailRows({ groupId, subject, date, trainingType }: { groupId: number; subject: string; date: string; trainingType?: string | null }) {
  const { t } = useLanguage()
  const [rows, setRows] = useState<AdminAttendanceDetailRow[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminApi.attendanceDetail({ groupId, subject, date, trainingType })
      .then(r => { if (!cancelled) setRows(r.data ?? []) })
      .catch(() => { if (!cancelled) setRows([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [groupId, subject, date, trainingType])

  if (loading) return <div className="flex items-center justify-center py-5"><Loader2 className="h-4 w-4 animate-spin text-[var(--adm-accent)]" /></div>
  if (!rows || rows.length === 0) return <p className="px-5 py-4 text-xs" style={L}>{t("adminDavomatlar.noStudentDataForDate")}</p>

  return (
    <div className="px-3 pb-3 sm:px-5">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
            <th className="w-10 py-2 text-left text-[11px] font-semibold uppercase tracking-wider" style={L}>{t("adminDavomatlar.colIndex")}</th>
            <th className="py-2 text-left text-[11px] font-semibold uppercase tracking-wider" style={L}>{t("adminDavomatlar.colFullName")}</th>
            <th className="py-2 text-right text-[11px] font-semibold uppercase tracking-wider" style={L}>{t("adminDavomatlar.colStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.studentId} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--adm-border)" : "none" }}>
              <td className="py-1.5 text-xs" style={{ ...L, ...NUM }}>{i + 1}</td>
              <td className="py-1.5">
                <div className="flex items-center gap-2.5">
                  <PersonAvatar kind="student" id={r.studentId} className="h-7 w-7 rounded-full" style={AVATAR_RING}>
                    <StudentInitial name={r.studentName} size={28} />
                  </PersonAvatar>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium" style={T}>{r.studentName}</div>
                    {r.comment && <div className="truncate text-[11px]" style={L}>{r.comment}</div>}
                  </div>
                </div>
              </td>
              <td className="py-1.5 text-right"><StatusBadge status={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Qo'lda kiritilgan davomat ───────────────────────────────────────── */
type Combo = {
  key: string
  groupId: number
  groupName: string
  subjectName: string
  teacherId: number | null
  teacherName: string | null
  rows: AdminAttendanceRow[]
  students: number
  avgPct: number
}

/* Talabalar × varaqlar jadvali (namunadagi asosiy ko'rinish) */
function StudentsMatrix({ combo }: { combo: Combo }) {
  const { t } = useLanguage()
  const [matrix, setMatrix] = useState<AdminAttendanceMatrix | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [query, setQuery] = useState("")

  useEffect(() => {
    let cancelled = false
    adminApi.attendanceMatrix({ groupId: combo.groupId, subject: combo.subjectName })
      .then(r => { if (!cancelled) { setMatrix(r.data); setError(null) } })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : t("adminDavomatlar.errorOccurred")) })
    return () => { cancelled = true }
  }, [combo.groupId, combo.subjectName]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ustunlar — filtrlardan o'tgan varaqlar (sana oralig'i/o'qituvchi), eskidan yangiga
  const columns = useMemo(
    () => [...combo.rows].sort((a, b) => a.lessonDate.localeCompare(b.lessonDate) || (a.trainingType ?? "").localeCompare(b.trainingType ?? ""))
      .map(r => ({ key: sheetKeyOf(r.lessonDate, r.trainingType), date: r.lessonDate, type: r.trainingType ?? null })),
    [combo.rows]
  )

  const students = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (matrix?.students ?? [])
      .filter(s => !q || s.studentName.toLowerCase().includes(q) || (s.studentIdNumber ?? "").includes(q))
      .map(s => {
        const marked = columns.filter(c => s.marks[c.key])
        const present = marked.filter(c => s.marks[c.key] === "present").length
        return { ...s, present, marked: marked.length, pct: marked.length ? Math.round((present / marked.length) * 100) : 0 }
      })
  }, [matrix, columns, query])

  if (error) return <p className="px-5 py-6 text-sm" style={{ color: "var(--role-admin)" }}>{error}</p>
  if (!matrix) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
            <div className="h-9 w-9 animate-pulse rounded-full bg-[var(--adm-grid)]" />
            <div className="h-3 w-48 animate-pulse rounded bg-[var(--adm-grid)]" />
            <div className="ml-auto flex gap-3">
              {Array.from({ length: 6 }).map((__, j) => <div key={j} className="h-5 w-5 animate-pulse rounded-full bg-[var(--adm-grid)]" />)}
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (matrix.students.length === 0) return <p className="px-5 py-6 text-sm" style={L}>{t("adminDavomatlar.noStudentDataForGroup")}</p>

  const curPage = Math.min(page, Math.max(0, Math.ceil(students.length / pageSize) - 1))
  const slice = students.slice(curPage * pageSize, (curPage + 1) * pageSize)
  // Chap ustunlar gorizontal aylantirishda joyida qoladi
  const stickyBg = { backgroundColor: "var(--adm-card)" }
  const idxCol = { width: 48, minWidth: 48, maxWidth: 48 }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 px-5 pb-3">
        <label className="adm-input flex h-9 w-full items-center gap-2 rounded-lg px-2.5 sm:w-[280px]">
          <Search className="h-3.5 w-3.5 shrink-0" style={L} />
          <input value={query} onChange={e => { setQuery(e.target.value); setPage(0) }}
            placeholder={t("adminDavomatlar.colFullName")}
            className="w-full bg-transparent text-xs text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]" />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="z-[1] px-4 py-3 sm:sticky sm:left-0 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ ...L, ...stickyBg, ...idxCol, borderBottom: "1px solid var(--adm-border)" }}>#</th>
              <th className="z-[1] min-w-[190px] px-3 py-3 sm:sticky sm:left-12 sm:min-w-[250px] text-left text-[11px] font-semibold uppercase tracking-wider"
                style={{ ...L, ...stickyBg, borderBottom: "1px solid var(--adm-border)", boxShadow: "1px 0 0 var(--adm-border)" }}>
                {t("adminDavomatlar.platformExportColStudent")}
              </th>
              {columns.map(c => {
                const wk = weekdayKey(c.date)
                const d = dayOf(c.date)
                return (
                  <th key={c.key} className="min-w-[78px] px-1.5 py-2.5 text-center align-top" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                    <div className="text-xs font-bold text-[var(--adm-text)]" style={NUM}>{d ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}` : c.date}</div>
                    <div className="text-[10px] font-medium text-[var(--adm-muted)]">{wk ? t(wk) : ""}</div>
                    {c.type && <div className="mt-1"><TrainingTypeBadge value={c.type} small /></div>}
                  </th>
                )
              })}
              <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ ...L, borderBottom: "1px solid var(--adm-border)" }}>{t("adminDavomatlar.colTotal")}</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider" style={{ ...L, borderBottom: "1px solid var(--adm-border)" }}>%</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((s, i) => (
              <tr key={s.studentId} className="adm-hover-row">
                <td className="z-[1] px-4 py-2.5 text-xs sm:sticky sm:left-0" style={{ ...L, ...NUM, ...stickyBg, ...idxCol, borderBottom: "1px solid var(--adm-border)" }}>{curPage * pageSize + i + 1}</td>
                <td className="z-[1] px-3 py-2.5 sm:sticky sm:left-12" style={{ ...stickyBg, borderBottom: "1px solid var(--adm-border)", boxShadow: "1px 0 0 var(--adm-border)" }}>
                  <div className="flex items-center gap-2.5">
                    <PersonAvatar kind="student" id={s.studentId} className="h-9 w-9 rounded-full" style={AVATAR_RING}>
                      <StudentInitial name={s.studentName} />
                    </PersonAvatar>
                    <div className="min-w-0">
                      <div className="max-w-[130px] truncate text-[13px] font-semibold sm:max-w-[230px]" style={T}>{s.studentName}</div>
                      {s.studentIdNumber && <div className="text-[11px]" style={{ ...L, ...NUM }}>{s.studentIdNumber}</div>}
                    </div>
                  </div>
                </td>
                {columns.map(c => {
                  const st = s.marks[c.key]
                  const label = st && STATUS[st] ? t(STATUS[st].labelKey) : t("adminDavomatlar.noMark")
                  const comment = s.comments[c.key]
                  return (
                    <td key={c.key} className="px-1.5 py-2.5 text-center" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                      <StatusDot status={st} title={`${fmtDay(c.date)} — ${label}${comment ? `: ${comment}` : ""}`} />
                    </td>
                  )
                })}
                <td className="px-3 py-2.5 text-center text-[13px] font-medium text-[var(--adm-text-2)]" style={{ ...NUM, borderBottom: "1px solid var(--adm-border)" }}>
                  {s.present}/{s.marked}
                </td>
                <td className="px-4 py-2.5 text-center text-[13px] font-bold" style={{ ...NUM, color: pctColor(s.pct), borderBottom: "1px solid var(--adm-border)" }}>
                  {s.pct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager total={students.length} page={curPage} pageSize={pageSize} onPage={setPage}
        sizes={MATRIX_PAGE_SIZES} onPageSize={n => { setPageSize(n); setPage(0) }} />
    </div>
  )
}

/* Sana bo'yicha: har varaq — jami/keldi/kelmadi..., bosilsa talabalar */
function DatesView({ combo }: { combo: Combo }) {
  const { t } = useLanguage()
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const rows = useMemo(
    () => [...combo.rows].sort((a, b) => b.lessonDate.localeCompare(a.lessonDate) || (a.trainingType ?? "").localeCompare(b.trainingType ?? "")),
    [combo.rows]
  )
  const head = "px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider"

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={L}>{t("adminDavomatlar.tableColDate")}</th>
            <th className={head} style={L}>{t("adminDavomatlar.tableColTotal")}</th>
            <th className={head} style={{ color: STATUS.present.color }}>{t("adminDavomatlar.tableColPresent")}</th>
            <th className={head} style={{ color: STATUS.absent.color }}>{t("adminDavomatlar.tableColAbsent")}</th>
            <th className={head} style={{ color: STATUS.late.color }}>{t("adminDavomatlar.tableColLate")}</th>
            <th className={head} style={{ color: STATUS.excused.color }}>{t("adminDavomatlar.tableColExcused")}</th>
            <th className={`${head} pr-5`} style={L}>%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const key = sheetKeyOf(r.lessonDate, r.trainingType)
            const open = expandedDate === key
            const wk = weekdayKey(r.lessonDate)
            return (
              <Fragment key={key}>
                <tr className="adm-hover-row cursor-pointer" data-active={open}
                  style={{ borderBottom: open ? "none" : "1px solid var(--adm-border)" }}
                  onClick={() => setExpandedDate(open ? null : key)}>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {open ? <ChevronUp className="h-4 w-4" style={L} /> : <ChevronDown className="h-4 w-4" style={L} />}
                      <span className="text-[13px] font-semibold" style={{ ...T, ...NUM }}>{fmtDay(r.lessonDate)}</span>
                      {wk && <span className="text-xs" style={L}>{t(wk)}</span>}
                      <TrainingTypeBadge value={r.trainingType} />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-[13px]" style={{ ...L, ...NUM }}>{r.total}</td>
                  <td className="px-3 py-3 text-center text-[13px] font-semibold" style={{ ...NUM, color: STATUS.present.color }}>{r.present}</td>
                  <td className="px-3 py-3 text-center text-[13px] font-semibold" style={{ ...NUM, color: STATUS.absent.color }}>{r.absent}</td>
                  <td className="px-3 py-3 text-center text-[13px] font-semibold" style={{ ...NUM, color: STATUS.late.color }}>{r.late}</td>
                  <td className="px-3 py-3 text-center text-[13px] font-semibold" style={{ ...NUM, color: STATUS.excused.color }}>{r.excused}</td>
                  <td className="px-3 py-3 pr-5">
                    <div className="flex items-center justify-end gap-2">
                      <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-[var(--adm-grid)] sm:block">
                        <div className="h-full rounded-full" style={{ width: `${r.presentPct}%`, backgroundColor: pctColor(r.presentPct) }} />
                      </div>
                      <span className="w-10 text-right text-[13px] font-bold" style={{ ...NUM, color: pctColor(r.presentPct) }}>{r.presentPct}%</span>
                    </div>
                  </td>
                </tr>
                {open && (
                  <tr>
                    <td colSpan={7} style={{ backgroundColor: "color-mix(in srgb, var(--adm-accent) 4%, var(--adm-card))", borderBottom: "1px solid var(--adm-border)" }}>
                      <div className="pt-2">
                        <DateDetailRows groupId={combo.groupId} subject={combo.subjectName} date={r.lessonDate} trainingType={r.trainingType} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Eksport menyusi — Excel, PDF va Telegram (PDF fayl sifatida) */
function ExportMenu({ disabled, onExcel, onPdf, onTelegram, sending }: {
  disabled: boolean; onExcel: () => void; onPdf: () => void; onTelegram: () => void; sending: boolean
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const items = [
    { key: "excel", label: "Excel", icon: FileSpreadsheet, color: "var(--adm-up)", run: onExcel },
    { key: "pdf", label: "PDF", icon: FileText, color: "var(--role-admin)", run: onPdf },
    { key: "tg", label: "Telegram", icon: sending ? Loader2 : Send, color: "var(--adm-accent)", run: onTelegram },
  ]
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} disabled={disabled} data-active={open}
        className="adm-btn-outline flex h-[56px] items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-50">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {t("adminDavomatlar.export")}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="adm-pop absolute right-0 top-[calc(100%+8px)] z-50 w-[190px] p-1.5">
            {items.map(it => {
              const Icon = it.icon
              return (
                <button key={it.key} type="button" disabled={sending && it.key === "tg"}
                  onClick={() => { it.run(); setOpen(false) }}
                  className="adm-hover-row flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-medium text-[var(--adm-text)] disabled:opacity-50">
                  <Icon className={`h-4 w-4 ${sending && it.key === "tg" ? "animate-spin" : ""}`} style={{ color: it.color }} />
                  {it.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function ManualAttendance() {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useApi(() => adminApi.attendance(), [])
  const rows: AdminAttendanceRow[] = useMemo(() => data?.data ?? [], [data])

  const [groupF, setGroupF] = useState("")
  const [subjectF, setSubjectF] = useState("")
  const [teacherF, setTeacherF] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [view, setView] = useState<"students" | "dates">("students")
  const [ovPage, setOvPage] = useState(0)

  // Tanlov ro'yxatlari — har biri boshqa tanlangan filtrlarga moslashadi
  const groupOptions = useMemo(() => {
    const m = new Map<number, string>()
    for (const r of rows) if (!teacherF || String(r.teacherId) === teacherF) m.set(r.groupId, r.groupName)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }))
  }, [rows, teacherF])
  const subjectOptions = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) {
      if (groupF && String(r.groupId) !== groupF) continue
      if (teacherF && String(r.teacherId) !== teacherF) continue
      s.add(r.subjectName)
    }
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [rows, groupF, teacherF])
  const teacherOptions = useMemo(() => {
    const m = new Map<number, string>()
    for (const r of rows) {
      if (groupF && String(r.groupId) !== groupF) continue
      if (subjectF && r.subjectName !== subjectF) continue
      if (r.teacherId) m.set(r.teacherId, r.teacherName || `#${r.teacherId}`)
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rows, groupF, subjectF])

  const filtered = useMemo(() => rows.filter(r =>
    (!groupF || String(r.groupId) === groupF) &&
    (!subjectF || r.subjectName === subjectF) &&
    (!teacherF || String(r.teacherId) === teacherF) &&
    (!from || r.lessonDate >= from) &&
    (!to || r.lessonDate <= to)
  ), [rows, groupF, subjectF, teacherF, from, to])

  const combos = useMemo(() => {
    const map = new Map<string, Combo>()
    for (const r of filtered) {
      const key = `${r.groupId}::${r.subjectName}`
      let c = map.get(key)
      if (!c) {
        c = { key, groupId: r.groupId, groupName: r.groupName, subjectName: r.subjectName, teacherId: r.teacherId ?? null, teacherName: r.teacherName ?? null, rows: [], students: 0, avgPct: 0 }
        map.set(key, c)
      }
      c.rows.push(r)
      c.students = Math.max(c.students, r.total)
      if (!c.teacherName && r.teacherName) { c.teacherId = r.teacherId ?? null; c.teacherName = r.teacherName }
    }
    for (const c of map.values()) c.avgPct = Math.round(c.rows.reduce((s, r) => s + r.presentPct, 0) / Math.max(1, c.rows.length))
    return [...map.values()].sort((a, b) => a.groupName.localeCompare(b.groupName, undefined, { numeric: true }) || a.subjectName.localeCompare(b.subjectName))
  }, [filtered])

  const selected = groupF && subjectF ? combos.find(c => String(c.groupId) === groupF && c.subjectName === subjectF) ?? null : null

  const totals = useMemo(() => {
    const sum = filtered.reduce((a, r) => ({
      marks: a.marks + r.total, present: a.present + r.present, absent: a.absent + r.absent, late: a.late + r.late, excused: a.excused + r.excused,
    }), { marks: 0, present: 0, absent: 0, late: 0, excused: 0 })
    return sum
  }, [filtered])
  const share = (n: number) => t("adminDavomatlar.ofMarks", { pct: totals.marks ? Math.round((n / totals.marks) * 100) : 0 })

  const hasFilter = !!(groupF || subjectF || teacherF || from || to)
  function resetFilters() { setGroupF(""); setSubjectF(""); setTeacherF(""); setFrom(""); setTo(""); setOvPage(0) }
  function openCombo(c: Combo) { setGroupF(String(c.groupId)); setSubjectF(c.subjectName); setView("students") }

  /* ── Eksport (filtrdan o'tgan varaqlar) ── */
  const exportHeaders = () => [t("adminDavomatlar.exportColGroup"), t("adminDavomatlar.exportColSubject"), t("adminDavomatlar.exportColDate"), t("adminDavomatlar.exportColTotal"), t("adminDavomatlar.exportColPresent"), t("adminDavomatlar.exportColAbsent"), t("adminDavomatlar.exportColLate"), t("adminDavomatlar.exportColExcused"), t("adminDavomatlar.exportColPercent")]
  const exportRows = () => filtered.map(r => [r.groupName, r.subjectName, dateWithType(r.lessonDate, r.trainingType), r.total, r.present, r.absent, r.late, r.excused, `${r.presentPct}%`])

  function doExportExcel() {
    const colGroup = t("adminDavomatlar.exportColGroup"), colSubject = t("adminDavomatlar.exportColSubject"), colDate = t("adminDavomatlar.exportColDate")
    const colTotal = t("adminDavomatlar.exportColTotal"), colPresent = t("adminDavomatlar.exportColPresent"), colAbsent = t("adminDavomatlar.exportColAbsent")
    const colLate = t("adminDavomatlar.exportColLate"), colExcused = t("adminDavomatlar.exportColExcused"), colPercent = t("adminDavomatlar.exportColPercent")
    exportToExcel("davomat-hisoboti", [{
      name: t("adminDavomatlar.exportSheetName"),
      rows: filtered.map(r => ({
        [colGroup]: r.groupName, [colSubject]: r.subjectName, [colDate]: dateWithType(r.lessonDate, r.trainingType),
        [colTotal]: r.total, [colPresent]: r.present, [colAbsent]: r.absent, [colLate]: r.late, [colExcused]: r.excused,
        [colPercent]: r.presentPct,
      })),
    }])
  }

  function doExportPdf() {
    exportToPdf("davomat-hisoboti", t("adminDavomatlar.exportPdfTitle"), exportHeaders(), exportRows())
  }

  const [sendingTelegram, setSendingTelegram] = useState(false)
  const [telegramMsg, setTelegramMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function doSendTelegram() {
    setSendingTelegram(true)
    setTelegramMsg(null)
    try {
      const pdfBase64 = buildPdfBase64(t("adminDavomatlar.exportPdfTitle"), exportHeaders(), exportRows())
      const res = await adminApi.sendReportTelegram({ filename: "davomat-hisoboti.pdf", caption: t("adminDavomatlar.exportPdfTitle"), pdfBase64 })
      setTelegramMsg({ ok: true, text: res.message || t("adminDavomatlar.telegramSent") })
    } catch (e) {
      setTelegramMsg({ ok: false, text: e instanceof Error ? e.message : t("adminDavomatlar.telegramError") })
    } finally {
      setSendingTelegram(false)
    }
  }

  if (error) {
    return (
      <div className="adm-card flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-sm" style={{ color: "var(--role-admin)" }}>{error}</p>
        <button onClick={refetch} className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
          <RefreshCw className="h-4 w-4" /> {t("adminDavomatlar.req.refresh")}
        </button>
      </div>
    )
  }

  const ovSlice = combos.slice(ovPage * OVERVIEW_PAGE_SIZE, (ovPage + 1) * OVERVIEW_PAGE_SIZE)

  return (
    <div className="flex flex-col gap-5">
      {/* Filtrlar */}
      <div className="adm-card grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-[1fr_1.3fr_1.2fr_1.3fr_auto]">
        <Field icon={UsersRound} label={t("adminDavomatlar.groupLabel")}>
          <FieldSelect value={groupF} onChange={v => { setGroupF(v); setSubjectF(""); setOvPage(0) }} disabled={loading}>
            <option value="">{t("adminDavomatlar.allGroups")}</option>
            {groupOptions.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
          </FieldSelect>
        </Field>
        <Field icon={BookOpen} label={t("adminDavomatlar.subjectLabel")}>
          <FieldSelect value={subjectF} onChange={v => { setSubjectF(v); setOvPage(0) }} disabled={loading}>
            <option value="">{t("adminDavomatlar.allSubjects")}</option>
            {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </FieldSelect>
        </Field>
        <Field icon={User} label={t("adminDavomatlar.teacherLabel")}>
          <FieldSelect value={teacherF} onChange={v => { setTeacherF(v); setOvPage(0) }} disabled={loading}>
            <option value="">{t("adminDavomatlar.allTeachers")}</option>
            {teacherOptions.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
          </FieldSelect>
        </Field>
        <Field icon={CalendarDays} label={t("adminDavomatlar.dateRange")}>
          <div className="flex items-center gap-1.5">
            <input type="date" value={from} max={to || undefined} onChange={e => { setFrom(e.target.value); setOvPage(0) }} className={DATE_INPUT} />
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--adm-muted)]" />
            <input type="date" value={to} min={from || undefined} onChange={e => { setTo(e.target.value); setOvPage(0) }} className={DATE_INPUT} />
          </div>
        </Field>
        <div className="flex items-stretch gap-2 sm:col-span-2 xl:col-span-1">
          {hasFilter && (
            <button type="button" onClick={resetFilters} title={t("adminDavomatlar.reset")} aria-label={t("adminDavomatlar.reset")}
              className="adm-btn-outline flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-xl" style={{ color: "var(--adm-text-2)" }}>
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <ExportMenu disabled={!filtered.length} onExcel={doExportExcel} onPdf={doExportPdf} onTelegram={doSendTelegram} sending={sendingTelegram} />
        </div>
      </div>

      {telegramMsg && (
        <span className="adm-pill w-fit" style={{ "--c": telegramMsg.ok ? "var(--adm-up)" : "var(--role-admin)" } as CssVars}>{telegramMsg.text}</span>
      )}

      {/* Statistika */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="adm-card h-[84px] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <StatCard icon={CalendarCheck} color="var(--adm-accent)" label={t("adminDavomatlar.summaryTotalLessons")} value={filtered.length}
            sub={t("adminDavomatlar.statLessonsSub", { n: combos.length })} />
          <StatCard icon={CheckCircle2} color={STATUS.present.color} label={t("adminDavomatlar.statPresent")} value={totals.present} sub={share(totals.present)} />
          <StatCard icon={XCircle} color={STATUS.absent.color} label={t("adminDavomatlar.statAbsent")} value={totals.absent} sub={share(totals.absent)} />
          <StatCard icon={Clock} color={STATUS.late.color} label={t("adminDavomatlar.statLate")} value={totals.late} sub={share(totals.late)} />
          <StatCard icon={FileText} color={STATUS.excused.color} label={t("adminDavomatlar.statusExcused")} value={totals.excused} sub={share(totals.excused)} />
        </div>
      )}

      {/* Asosiy kartochka */}
      {loading ? (
        <div className="adm-card h-[320px] animate-pulse" />
      ) : groupF && subjectF ? (
        !selected ? (
          <EmptyCard icon={ClipboardCheck} text={t("adminDavomatlar.noAttendanceData")} />
        ) : (
          <div className="adm-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-5 pb-3 pt-4">
              <button type="button" onClick={() => { setSubjectF(""); setGroupF("") }}
                className="adm-btn-outline flex h-9 items-center gap-1 rounded-lg pl-2 pr-3 text-xs font-semibold">
                <ChevronLeft className="h-4 w-4" /> {t("adminDavomatlar.allGroups")}
              </button>
              <div className="flex min-w-0 items-center gap-3">
                <div className="adm-icon-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ "--c": "var(--adm-accent)" } as CssVars}>
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-bold" style={T}>{selected.groupName}</div>
                  <div className="truncate text-xs" style={L}>{selected.subjectName}</div>
                </div>
              </div>
              {selected.teacherName && (
                <div className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3" style={{ backgroundColor: "var(--adm-grid)" }}>
                  <PersonAvatar kind="employee" id={selected.teacherId} className="h-7 w-7 rounded-full">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ background: "linear-gradient(135deg, #34d399, #059669)" }}>
                      <User className="h-3.5 w-3.5" />
                    </div>
                  </PersonAvatar>
                  <span className="max-w-[220px] truncate text-xs font-semibold" style={T}>{selected.teacherName}</span>
                </div>
              )}
              <div className="ml-auto flex items-center gap-4 text-center">
                <div><div className="text-base font-bold" style={{ ...NUM, color: pctColor(selected.avgPct) }}>{selected.avgPct}%</div><div className="text-[11px]" style={L}>{t("adminDavomatlar.avgLabel")}</div></div>
                <div><div className="text-base font-bold" style={{ ...T, ...NUM }}>{selected.rows.length}</div><div className="text-[11px]" style={L}>{t("adminDavomatlar.lessonsLabel")}</div></div>
                <div><div className="text-base font-bold" style={{ ...T, ...NUM }}>{selected.students}</div><div className="text-[11px]" style={L}>{t("adminDavomatlar.studentsLabel")}</div></div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4">
              <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: "var(--adm-grid)" }}>
                {([
                  { key: "students", label: t("adminDavomatlar.viewStudents") },
                  { key: "dates", label: t("adminDavomatlar.viewBySana") },
                ] as const).map(v => (
                  <button key={v.key} type="button" onClick={() => setView(v.key)} data-active={view === v.key}
                    className="rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors"
                    style={view === v.key
                      ? { background: "linear-gradient(90deg,#2f6bf2,#2259e0)", color: "#fff", boxShadow: "0 6px 14px -6px rgba(47,107,242,0.7)" }
                      : { color: "var(--adm-text-2)" }}>
                    {v.label}
                  </button>
                ))}
              </div>
              <Legend />
            </div>

            {view === "students" ? <StudentsMatrix key={selected.key} combo={selected} /> : <DatesView combo={selected} />}
          </div>
        )
      ) : combos.length === 0 ? (
        <EmptyCard icon={ClipboardCheck} text={t("adminDavomatlar.noAttendanceData")} />
      ) : (
        /* Umumiy ko'rinish: guruh + fan juftliklari */
        <div className="adm-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--adm-border)" }}>
            <h2 className="text-[15px] font-semibold" style={T}>{t("adminDavomatlar.byGroupSubject")}</h2>
            <span className="text-xs" style={L}>{t("adminDavomatlar.clickToOpen")}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
                  {["#", t("adminDavomatlar.groupLabel"), t("adminDavomatlar.subjectLabel"), t("adminDavomatlar.teacherLabel"), t("adminDavomatlar.colLessons"), t("adminDavomatlar.colStudents"), t("adminDavomatlar.colAvg"), ""].map((h, i) => (
                    <th key={i} className={`whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider ${i >= 4 && i <= 5 ? "text-center" : "text-left"}`} style={L}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ovSlice.map((c, i) => (
                  <tr key={c.key} onClick={() => openCombo(c)} className="adm-hover-row cursor-pointer" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                    <td className="w-12 px-4 py-3 text-xs" style={{ ...L, ...NUM }}>{ovPage * OVERVIEW_PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="adm-icon-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ "--c": "var(--role-student)" } as CssVars}>
                          <UsersRound className="h-[18px] w-[18px]" />
                        </div>
                        <span className="whitespace-nowrap text-[13px] font-semibold" style={T}>{c.groupName}</span>
                      </div>
                    </td>
                    <td className="max-w-[260px] px-4 py-3 text-[13px]" style={{ color: "var(--adm-text-2)" }}>{c.subjectName}</td>
                    <td className="px-4 py-3">
                      {c.teacherName ? (
                        <div className="flex items-center gap-2">
                          <PersonAvatar kind="employee" id={c.teacherId} className="h-7 w-7 rounded-full" style={AVATAR_RING}>
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #34d399, #059669)" }}>
                              {c.teacherName.charAt(0).toUpperCase()}
                            </div>
                          </PersonAvatar>
                          <span className="max-w-[200px] truncate text-xs font-medium" style={T}>{c.teacherName}</span>
                        </div>
                      ) : <span className="text-xs" style={L}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-[13px] font-semibold" style={{ ...T, ...NUM }}>{c.rows.length}</td>
                    <td className="px-4 py-3 text-center text-[13px] font-semibold" style={{ ...T, ...NUM }}>{c.students}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--adm-grid)]">
                          <div className="h-full rounded-full" style={{ width: `${c.avgPct}%`, backgroundColor: pctColor(c.avgPct) }} />
                        </div>
                        <span className="text-[13px] font-bold" style={{ ...NUM, color: pctColor(c.avgPct) }}>{c.avgPct}%</span>
                      </div>
                    </td>
                    <td className="w-10 px-4 py-3 text-[var(--adm-muted)]"><ChevronRight className="h-4 w-4" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager total={combos.length} page={ovPage} pageSize={OVERVIEW_PAGE_SIZE} onPage={setOvPage} />
        </div>
      )}
    </div>
  )
}

/* ── Platforma asosida davomat ────────────────────────────────────────── */
function PlatformAttendance() {
  const { t } = useLanguage()
  const [selectedTeacher, setSelectedTeacher] = useState<AdminTeacherStat | null>(null)
  const [groups, setGroups]     = useState<{ id: number; name: string }[]>([])
  const [subjects, setSubjects] = useState<string[]>([])
  const [groupId, setGroupId]   = useState("")
  const [subject, setSubject]   = useState("")
  const [from, setFrom]         = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10)
  })
  const [to, setTo]   = useState(() => new Date().toISOString().slice(0, 10))
  const [result, setResult]     = useState<PlatformAttendanceDay[] | null>(null)
  const [loading2, setLoading2] = useState(false)
  const [err2, setErr2]         = useState("")
  const [infoLoading, setInfoLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: teacherData } = useApi(() => adminApi.teacherStats(), [])
  const teachers: AdminTeacherStat[] = teacherData?.data ?? []

  // Qoida Sozlamalardan (backend hisobida ham shu qiymatlar ishlatiladi)
  const { data: settingsData } = useApi(() => adminApi.getSettings(), [])
  const ruleMinutes = settingsData?.data?.platform_attendance_minutes ?? "40"
  const rulePct = settingsData?.data?.platform_meeting_percent ?? "100"

  useEffect(() => {
    if (!selectedTeacher) { setGroups([]); setSubjects([]); setGroupId(""); setSubject(""); return }
    setInfoLoading(true)
    adminApi.teacherInfo(selectedTeacher.hemisId)
      .then(r => { setGroups(r.data.groups); setSubjects(r.data.subjects); setGroupId(""); setSubject("") })
      .catch(() => { setGroups([]); setSubjects([]) })
      .finally(() => setInfoLoading(false))
  }, [selectedTeacher])

  async function load() {
    if (!groupId) return
    setLoading2(true); setErr2(""); setResult(null)
    try {
      const r = await adminApi.platformAttendance({
        groupId: Number(groupId),
        subject: subject || undefined,
        from: from || undefined,
        to: to || undefined,
      })
      setResult(r.data)
    } catch (e) {
      setErr2(e instanceof Error ? e.message : t("adminDavomatlar.errorOccurred"))
    } finally {
      setLoading2(false)
    }
  }

  const avg = result && result.length ? Math.round(result.reduce((s, r) => s + r.presentPct, 0) / result.length) : 0
  const plainInput = "w-full min-w-0 bg-transparent text-sm font-semibold text-[var(--adm-text)] outline-none placeholder:font-normal placeholder:text-[var(--adm-muted)]"

  return (
    <div className="flex flex-col gap-5">
      <div className="adm-tint flex items-start gap-2.5 px-4 py-3 text-xs" style={{ "--c": "var(--adm-accent)", color: "var(--adm-text-2)" } as CssVars}>
        <Info className="mt-px h-4 w-4 shrink-0 text-[var(--adm-accent)]" />
        {t("adminDavomatlar.platformHint", { min: ruleMinutes, pct: rulePct })}
      </div>

      {/* Filtrlar */}
      <div className="adm-card grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-[1.3fr_1fr_1.2fr_1.3fr_auto]">
        <Field icon={User} label={t("adminDavomatlar.teacherLabel")}>
          <FieldSelect value={selectedTeacher?.hemisId ?? ""}
            onChange={v => { setSelectedTeacher(teachers.find(tt => tt.hemisId === v) ?? null); setResult(null) }}>
            <option value="">{t("adminDavomatlar.selectPlaceholder")}</option>
            {teachers.map(tt => <option key={tt.hemisId} value={tt.hemisId}>{tt.fullName}</option>)}
          </FieldSelect>
        </Field>
        <Field icon={UsersRound} label={t("adminDavomatlar.groupLabel")}>
          {infoLoading ? (
            <span className="flex items-center gap-2 text-sm" style={L}><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("adminDavomatlar.loadingLabel")}</span>
          ) : groups.length > 0 ? (
            <FieldSelect value={groupId} onChange={v => { setGroupId(v); setResult(null) }}>
              <option value="">{t("adminDavomatlar.selectGroupPlaceholder")}</option>
              {groups.map(g => <option key={g.id} value={String(g.id)}>{g.name} (#{g.id})</option>)}
            </FieldSelect>
          ) : (
            <input type="number" placeholder={t("adminDavomatlar.groupIdPlaceholder")} className={plainInput}
              value={groupId} onChange={e => { setGroupId(e.target.value); setResult(null) }} />
          )}
        </Field>
        <Field icon={BookOpen} label={t("adminDavomatlar.subjectOptionalLabel")}>
          {subjects.length > 0 ? (
            <FieldSelect value={subject} onChange={v => { setSubject(v); setResult(null) }}>
              <option value="">{t("adminDavomatlar.allSubjectsOption")}</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </FieldSelect>
          ) : (
            <input type="text" placeholder={t("adminDavomatlar.subjectOptionalPlaceholder")} className={plainInput}
              value={subject} onChange={e => { setSubject(e.target.value); setResult(null) }} />
          )}
        </Field>
        <Field icon={CalendarDays} label={t("adminDavomatlar.dateRange")}>
          <div className="flex items-center gap-1.5">
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setResult(null) }} className={DATE_INPUT} aria-label={t("adminDavomatlar.startDateLabel")} />
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--adm-muted)]" />
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setResult(null) }} className={DATE_INPUT} aria-label={t("adminDavomatlar.endDateLabel")} />
          </div>
        </Field>
        <button type="button" onClick={load} disabled={!groupId || loading2}
          className="adm-btn-primary flex h-[56px] items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold disabled:opacity-50 sm:col-span-2 xl:col-span-1">
          {loading2 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {t("adminDavomatlar.viewBtn")}
        </button>
      </div>

      {err2 && <span className="adm-pill w-fit" style={{ "--c": "var(--role-admin)" } as CssVars}>{err2}</span>}

      {result === null && !loading2 && (
        <EmptyCard icon={CalendarDays} text={t("adminDavomatlar.emptySelectHint")} />
      )}

      {result !== null && result.length === 0 && (
        <EmptyCard icon={ClipboardCheck} text={t("adminDavomatlar.noScheduleFound")} hint={t("adminDavomatlar.noScheduleHint")} />
      )}

      {result && result.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:gap-4">
            <StatCard icon={CalendarCheck} color="var(--adm-accent)" label={t("adminDavomatlar.summaryTotalLessons")} value={result.length} />
            <StatCard icon={CheckCircle2} color={pctColor(avg)} label={t("adminDavomatlar.summaryAvgAttendance")} value={`${avg}%`} />
            <StatCard icon={Video} color="var(--role-dean)" label={t("adminDavomatlar.summaryMeetingDays")} value={result.filter(r => r.isMeetingDay).length} />
            <div className="flex items-center gap-2 sm:flex-col sm:items-stretch sm:justify-center">
              <button type="button"
                onClick={() => exportToExcel("platforma-davomati", [{
                  name: t("adminDavomatlar.exportSheetName"),
                  rows: result.flatMap(day => day.students.map(s => ({
                    [t("adminDavomatlar.exportColDate")]: day.lessonDate, [t("adminDavomatlar.exportColSubject")]: day.subjectName, [t("adminDavomatlar.platformExportColStudent")]: s.studentName || t("adminDavomatlar.studentFallback", { id: s.studentId }),
                    [t("adminDavomatlar.platformExportColStatus")]: s.status === "present" ? t("adminDavomatlar.statusPresent") : t("adminDavomatlar.statusAbsent"),
                  }))),
                }])}
                className="adm-btn-outline flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ color: "var(--adm-up)" }}>
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </button>
              <button type="button"
                onClick={() => exportToPdf(
                  "platforma-davomati", t("adminDavomatlar.tabPlatform"),
                  [t("adminDavomatlar.exportColDate"), t("adminDavomatlar.exportColSubject"), t("adminDavomatlar.platformExportColStudent"), t("adminDavomatlar.platformExportColStatus")],
                  result.flatMap(day => day.students.map(s => [
                    day.lessonDate, day.subjectName, s.studentName || t("adminDavomatlar.studentFallback", { id: s.studentId }),
                    s.status === "present" ? t("adminDavomatlar.statusPresent") : t("adminDavomatlar.statusAbsent"),
                  ]))
                )}
                className="adm-btn-outline flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ color: "var(--role-admin)" }}>
                <FileText className="h-4 w-4" /> PDF
              </button>
            </div>
          </div>

          {result.map(day => {
            const key = `${day.lessonDate}::${day.subjectName}`
            const isOpen = expanded === key
            const wk = weekdayKey(day.lessonDate)
            return (
              <div key={key} className="adm-card overflow-hidden">
                <button type="button" onClick={() => setExpanded(isOpen ? null : key)}
                  className="adm-hover-row flex w-full items-center gap-4 px-5 py-4 text-left" data-active={isOpen}>
                  <div className="adm-icon-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ "--c": day.isMeetingDay ? "var(--role-dean)" : "var(--adm-accent)" } as CssVars}>
                    {day.isMeetingDay ? <Video className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold" style={{ ...T, ...NUM }}>{fmtDay(day.lessonDate)}</span>
                      {wk && <span className="text-xs" style={L}>{t(wk)}</span>}
                      {day.isMeetingDay && (
                        <span className="adm-pill" style={{ "--c": "var(--role-dean)", padding: "0 8px", fontSize: 11 } as CssVars}>
                          {t("adminDavomatlar.meetingBadge", { minutes: day.meetingMinutes })}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs" style={L}>{day.subjectName}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ ...NUM, color: STATUS.present.color }}>
                      <StatusDot status="present" size={18} />{day.present}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ ...NUM, color: STATUS.absent.color }}>
                      <StatusDot status="absent" size={18} />{day.absent}
                    </span>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ ...NUM, color: pctColor(day.presentPct) }}>{day.presentPct}%</div>
                      <div className="text-[11px]" style={L}>{t("adminDavomatlar.totalStudentsSuffix", { n: day.total })}</div>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4" style={L} /> : <ChevronDown className="h-4 w-4" style={L} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="overflow-x-auto px-3 pb-3 sm:px-5" style={{ borderTop: "1px solid var(--adm-border)" }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
                          <th className="w-10 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={L}>{t("adminDavomatlar.colIndex")}</th>
                          <th className="py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={L}>{t("adminDavomatlar.platformExportColStudent")}</th>
                          <th className="py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={L}>{t("adminDavomatlar.platformExportColStatus")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.students.map((s, i) => {
                          const name = s.studentName || t("adminDavomatlar.studentFallback", { id: s.studentId })
                          return (
                            <tr key={s.studentId} style={{ borderBottom: i < day.students.length - 1 ? "1px solid var(--adm-border)" : "none" }}>
                              <td className="py-1.5 text-xs" style={{ ...L, ...NUM }}>{i + 1}</td>
                              <td className="py-1.5">
                                <div className="flex items-center gap-2.5">
                                  <PersonAvatar kind="student" id={s.studentId} className="h-7 w-7 rounded-full" style={AVATAR_RING}>
                                    <StudentInitial name={name} size={28} />
                                  </PersonAvatar>
                                  <span className="text-[13px] font-medium" style={T}>{name}</span>
                                </div>
                              </td>
                              <td className="py-1.5 text-right"><StatusBadge status={s.status === "present" ? "present" : "absent"} /></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
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

/* ── O'qituvchilarning saqlangan (qulflangan) davomatni o'zgartirish so'rovlari ── */
const REQ_STATUS: Record<AttendanceEditStatus, { labelKey: string; color: string; icon: typeof Clock }> = {
  pending:  { labelKey: "adminDavomatlar.req.statusPending",  color: "var(--role-pending)", icon: Clock },
  approved: { labelKey: "adminDavomatlar.req.statusApproved", color: "var(--adm-up)",       icon: CheckCircle2 },
  used:     { labelKey: "adminDavomatlar.req.statusUsed",     color: "var(--adm-accent)",   icon: PencilLine },
  rejected: { labelKey: "adminDavomatlar.req.statusRejected", color: "var(--role-admin)",   icon: XCircle },
}

function EditRequests({ onPendingCount }: { onPendingCount: (n: number) => void }) {
  const { t } = useLanguage()
  const [status, setStatus] = useState<AttendanceEditStatus>("pending")
  const [rows, setRows] = useState<AttendanceEditRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [actingId, setActingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<Record<number, string>>({})
  const [openSheet, setOpenSheet] = useState<number | null>(null)

  function load(s: AttendanceEditStatus = status) {
    setLoading(true)
    setError(null)
    adminApi.attendanceEditRequests(s)
      .then((res) => { setRows(res.data ?? []); onPendingCount(res.pendingCount ?? 0) })
      .catch((e) => setError(e instanceof Error ? e.message : t("common.error")))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(status) }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  async function review(id: number, action: "approve" | "reject") {
    setActingId(id)
    setActionError((prev) => ({ ...prev, [id]: "" }))
    try {
      await adminApi.reviewAttendanceEditRequest(id, action, notes[id]?.trim() || undefined)
      load(status)
    } catch (e) {
      setActionError((prev) => ({ ...prev, [id]: e instanceof Error ? e.message : t("common.error") }))
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="adm-tint flex items-start gap-2.5 px-4 py-3 text-xs" style={{ "--c": "var(--adm-accent)", color: "var(--adm-text-2)" } as CssVars}>
        <Info className="mt-px h-4 w-4 shrink-0 text-[var(--adm-accent)]" />
        {t("adminDavomatlar.req.hint")}
      </div>

      <div className="adm-card flex flex-wrap items-center gap-2 p-3 sm:p-4">
        {(Object.keys(REQ_STATUS) as AttendanceEditStatus[]).map((s) => {
          const cfg = REQ_STATUS[s]
          const Icon = cfg.icon
          return (
            <button key={s} type="button" onClick={() => setStatus(s)} data-active={status === s}
              className="adm-chip flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium">
              <Icon className="h-3.5 w-3.5" />
              {t(cfg.labelKey)}
            </button>
          )
        })}
        <button type="button" onClick={() => load(status)}
          className="adm-btn-outline ml-auto flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> {t("adminDavomatlar.req.refresh")}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="adm-card h-[150px] animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="adm-card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm" style={{ color: "var(--role-admin)" }}>{error}</p>
          <button onClick={() => load(status)} className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <RefreshCw className="h-4 w-4" /> {t("adminDavomatlar.req.refresh")}
          </button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyCard icon={ClipboardCheck} text={t("adminDavomatlar.req.empty")} />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => {
            const cfg = REQ_STATUS[r.status]
            const Icon = cfg.icon
            const acting = actingId === r.id
            return (
              <div key={r.id} className="adm-card flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <PersonAvatar kind="employee" id={r.teacherUserId} className="h-11 w-11 rounded-full" style={AVATAR_RING}>
                    <div className="adm-icon-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ "--c": "var(--adm-accent)" } as CssVars}>
                      <User className="h-5 w-5" />
                    </div>
                  </PersonAvatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold" style={T}>{r.teacherName}</span>
                      <span className="adm-pill" style={{ "--c": cfg.color } as CssVars}>
                        <Icon className="h-3 w-3" />
                        {t(cfg.labelKey)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm" style={{ color: "var(--adm-text-2)" }}>
                      {r.groupName ?? `#${r.groupId}`} · {r.subjectName}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs" style={L}>
                      <span className="flex items-center gap-1 font-semibold" style={{ ...T, ...NUM }}>
                        <CalendarDays className="h-3.5 w-3.5" />
                        {t("adminDavomatlar.req.lessonDate", { date: fmtDay(r.lessonDate) })}
                      </span>
                      <TrainingTypeBadge value={r.trainingType} />
                      <span style={NUM}>{t("adminDavomatlar.req.sentAt", { date: fmtStamp(r.createdAt) })}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl px-3.5 py-2.5 text-sm" style={{ backgroundColor: "var(--adm-grid)", color: "var(--adm-text)" }}>
                  {t("adminDavomatlar.req.reason", { reason: r.reason })}
                </div>

                <div>
                  <button type="button" onClick={() => setOpenSheet(openSheet === r.id ? null : r.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-[var(--adm-accent)]">
                    {openSheet === r.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {openSheet === r.id ? t("adminDavomatlar.req.hideSheet") : t("adminDavomatlar.req.showSheet")}
                  </button>
                  {openSheet === r.id && (
                    <div className="mt-2 rounded-xl pt-2" style={{ border: "1px solid var(--adm-border)" }}>
                      <DateDetailRows groupId={r.groupId} subject={r.subjectName} date={r.lessonDate} trainingType={r.trainingType} />
                    </div>
                  )}
                </div>

                {r.status === "pending" ? (
                  <div className="flex flex-col gap-2">
                    <input
                      value={notes[r.id] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder={t("adminDavomatlar.req.notePlaceholder")}
                      maxLength={1000}
                      className="adm-input w-full rounded-xl px-3.5 py-2.5 text-sm outline-none placeholder:text-[var(--adm-muted)]"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => review(r.id, "approve")} disabled={acting}
                        className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: "var(--adm-up)", boxShadow: "0 6px 14px -6px var(--adm-up)" }}>
                        {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {t("adminDavomatlar.req.approve")}
                      </button>
                      <button type="button" onClick={() => review(r.id, "reject")} disabled={acting}
                        className="adm-btn-outline flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                        style={{ color: "var(--role-admin)" }}>
                        {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                        {t("adminDavomatlar.req.reject")}
                      </button>
                      {actionError[r.id] && (
                        <span className="text-xs" style={{ color: "var(--role-admin)" }}>{actionError[r.id]}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 text-xs" style={L}>
                    {r.reviewedAt && (
                      <span style={NUM}>{t("adminDavomatlar.req.reviewed", { name: r.reviewedByName ?? "—", date: fmtStamp(r.reviewedAt) })}</span>
                    )}
                    {r.adminNote && <span>{t("adminDavomatlar.req.adminNote", { note: r.adminNote })}</span>}
                    {r.usedAt && <span style={{ ...NUM, color: "var(--adm-accent)" }}>{t("adminDavomatlar.req.usedAt", { date: fmtStamp(r.usedAt) })}</span>}
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

/* ── Asosiy sahifa ────────────────────────────────────────────────────── */
type AdminDavomatTab = "manual" | "platform" | "requests"

export default function AdminDavomatlar() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  // Bildirishnomadagi havola (?tab=requests) to'g'ridan-to'g'ri so'rovlarni ochadi
  const [tab, setTab] = useState<AdminDavomatTab>(searchParams.get("tab") === "requests" ? "requests" : "manual")
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    adminApi.attendanceEditRequests("pending")
      .then((res) => setPendingCount(res.pendingCount ?? 0))
      .catch(() => { /* ruxsat yo'q yoki xato — nishonsiz qoladi */ })
  }, [])

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="flex flex-col gap-5 px-4 pb-8 pt-2 sm:px-8">
      {/* Sarlavha */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="adm-icon-soft flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ "--c": "var(--adm-accent)" } as CssVars}>
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-[var(--adm-text)] sm:text-[30px]">{t("adminDavomatlar.pageTitle")}</h1>
            <p className="mt-0.5 text-sm text-[var(--adm-muted)]">{t("adminDavomatlar.pageSubtitle")}</p>
          </div>
        </div>

        {/* Bo'limlar */}
        <div className="adm-card flex flex-wrap gap-1 p-1">
          {([
            { key: "manual",   label: t("adminDavomatlar.tabManual"), icon: ClipboardCheck },
            { key: "platform", label: t("adminDavomatlar.tabPlatform"), icon: Video },
            { key: "requests", label: t("adminDavomatlar.tabRequests"), icon: PencilLine },
          ] as { key: AdminDavomatTab; label: string; icon: React.ElementType }[]).map(tabItem => {
            const Icon = tabItem.icon
            const active = tab === tabItem.key
            return (
              <button key={tabItem.key} type="button" onClick={() => setTab(tabItem.key)}
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
      </div>

      {tab === "manual"   && <ManualAttendance />}
      {tab === "platform" && <PlatformAttendance />}
      {tab === "requests" && <EditRequests onPendingCount={setPendingCount} />}
    </motion.div>
  )
}
