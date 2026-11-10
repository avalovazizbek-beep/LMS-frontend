"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  GraduationCap, CheckCircle2, CalendarDays, AlertCircle, Clock, BadgeCheck, ChevronRight, ChevronDown,
  BookOpen, User, ListFilter, Activity, Search, X, Timer, FileWarning, Lock, XCircle, FileText, BarChart3,
  Eye, Play, Send, ArrowRight, Hourglass,
} from "lucide-react"
import { teachingApi, type TeacherContent, type MySubmissionLite, type TeachingFile } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { StudentContentCard } from "@/components/teaching/StudentContentCard"
import { oraliqPoints } from "@/components/teaching/GradeBudgetLine"
import { SubjectArt, subjectVisual, tint } from "@/components/teaching/ExamBoardArt"
import { PageHero } from "@/components/layout/PageHero"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { isProctoredControlTest } from "@/lib/controlWork"
import { FacePracticeNotice, useFacePractice } from "@/components/teaching/FacePracticeNotice"
import {
  loadExamBoard, boardStatus, canActNow, examKind, todoCount, EXAMS_CHANGED_EVENT,
  type BoardStatus, type ExamKind,
} from "@/lib/studentExams"

const TEXT = "var(--lms-primary)"
const MUTED = "var(--lms-muted)"
const CELL = "var(--lms-cell)"
const BORDER = "var(--lms-border)"
const FONT = { fontFamily: "var(--font-poppins)" }
const BLUE = "#2563eb"
const DAY = 86_400_000
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
const pad2 = (n: number) => String(n).padStart(2, "0")

type StatKey = "current" | "upcoming" | "todo" | "checking" | "graded"
type StatusFilter = "all" | StatKey | "missed"
type DateFilter = "all" | "today" | "week" | "month" | "past"

interface Row {
  item: TeacherContent
  sub?: MySubmissionLite
  status: BoardStatus
  kind: ExamKind
  canAct: boolean
}

const STATS: Array<{ key: StatKey; color: string; Icon: typeof Clock }> = [
  { key: "current",  color: "#16a34a", Icon: CheckCircle2 },
  { key: "upcoming", color: "#2563eb", Icon: CalendarDays },
  { key: "todo",     color: "#dc2626", Icon: AlertCircle },
  { key: "checking", color: "#ea580c", Icon: Clock },
  { key: "graded",   color: "#7c3aed", Icon: BadgeCheck },
]

const STATUS_STYLE: Record<BoardStatus, { color: string; Icon: typeof Clock }> = {
  upcoming: { color: "#2563eb", Icon: Lock },
  todo:     { color: "#d97706", Icon: FileWarning },
  checking: { color: "#ea580c", Icon: Hourglass },
  graded:   { color: "#16a34a", Icon: CheckCircle2 },
  missed:   { color: "#dc2626", Icon: XCircle },
}

// Qatordagi tartib: avval topshirish kerak bo'lganlar, keyin kutilayotganlar
const STATUS_ORDER: Record<BoardStatus, number> = { todo: 0, checking: 1, upcoming: 2, graded: 3, missed: 4 }

const KINDS: ExamKind[] = ["oraliq", "mustaqil", "yakuniy", "test"]

function matchesStatus(r: Row, f: StatusFilter): boolean {
  if (f === "all") return true
  if (f === "current") return r.canAct
  return r.status === f
}

function ms(iso: string | null | undefined): number | null {
  if (!iso) return null
  const v = new Date(iso).getTime()
  return Number.isNaN(v) ? null : v
}

function sameDay(a: number, b: number): boolean {
  const x = new Date(a), y = new Date(b)
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
}

function matchesDate(r: Row, f: DateFilter, now: number): boolean {
  if (f === "all") return true
  const d = ms(r.item.deadline)
  if (d == null) return false
  if (f === "past") return d < now
  if (f === "today") return d >= now && sameDay(d, now)
  return d >= now && d <= now + (f === "week" ? 7 : 30) * DAY
}

/** Topshiriqqa biriktirilgan vazifa fayli (video emas) */
function taskFiles(item: TeacherContent): TeachingFile[] {
  return [item.file, ...(item.files ?? [])]
    .filter((f, i, all): f is TeachingFile => !!f && all.findIndex((o) => o?.url === f.url) === i)
    .filter((f) => !(f.mimeType.startsWith("video/") || /\.(mp4|avi|mov|mkv|webm)$/i.test(f.originalName)))
}

function scoreText(item: TeacherContent, sub: MySubmissionLite): string {
  return item.maxScore ? `${sub.grade}/${item.maxScore}` : String(sub.grade)
}

export default function Imtihonlar() {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useApi(loadExamBoard, [])

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  // Yon paneldagi "Imtihonlar" yonidagi son shu ma'lumotdan yangilanadi
  useEffect(() => {
    if (data) window.dispatchEvent(new CustomEvent(EXAMS_CHANGED_EVENT, { detail: todoCount(data) }))
  }, [data])

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [subjectFilter, setSubjectFilter] = useState("")
  const [teacherFilter, setTeacherFilter] = useState("")
  const [kindFilter, setKindFilter] = useState("")
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [openRow, setOpenRow] = useState<{ id: number; form: boolean } | null>(null)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const [showAllActivity, setShowAllActivity] = useState(false)

  const rows: Row[] = useMemo(() => (data?.items ?? []).map((item) => {
    const sub = data?.subs.get(item.id)
    return { item, sub, status: boardStatus(item, sub), kind: examKind(item), canAct: canActNow(item, sub) }
  }), [data])

  // Ochiq yoki kutilayotgan oraliq / mustaqil ish testi bor — yuz sinovini taklif qilamiz
  const hasControlTest = rows.some((r) => r.item.status !== "closed" && isProctoredControlTest(r.item))
  const facePractice = useFacePractice(hasControlTest)

  const counts = useMemo(() => {
    const c: Record<StatKey, number> = { current: 0, upcoming: 0, todo: 0, checking: 0, graded: 0 }
    for (const r of rows) for (const s of STATS) if (matchesStatus(r, s.key)) c[s.key]++
    return c
  }, [rows])

  const uniq = (list: (string | null | undefined)[]) =>
    [...new Set(list.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b))
  const subjects = useMemo(() => uniq(rows.map((r) => r.item.subjectName)), [rows])
  const teachers = useMemo(() => uniq(rows.map((r) => r.item.teacherName)), [rows])
  const kinds = useMemo(() => KINDS.filter((k) => rows.some((r) => r.kind === k)), [rows])

  const filtersActive = statusFilter !== "all" || !!subjectFilter || !!teacherFilter || !!kindFilter || dateFilter !== "all" || !!search.trim()
  const clearFilters = () => {
    setStatusFilter("all"); setSubjectFilter(""); setTeacherFilter(""); setKindFilter(""); setDateFilter("all"); setSearch("")
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) =>
      matchesStatus(r, statusFilter) &&
      (!subjectFilter || r.item.subjectName === subjectFilter) &&
      (!teacherFilter || r.item.teacherName === teacherFilter) &&
      (!kindFilter || r.kind === kindFilter) &&
      matchesDate(r, dateFilter, now) &&
      (!q || [r.item.title, r.item.subjectName, r.item.teacherName ?? ""].some((v) => v.toLowerCase().includes(q))))
  }, [rows, statusFilter, subjectFilter, teacherFilter, kindFilter, dateFilter, search, now])

  // Fan bo'yicha guruhlar: topshirish kerak bo'lgani bor fanlar tepada
  const groups = useMemo(() => {
    const map = new Map<string, Row[]>()
    for (const r of filtered) {
      const list = map.get(r.item.subjectName) ?? []
      list.push(r)
      map.set(r.item.subjectName, list)
    }
    const nearest = (list: Row[]) => Math.min(...list.filter((r) => r.status === "todo").map((r) => ms(r.item.deadline) ?? Infinity), Infinity)
    return [...map.entries()].map(([subject, list]) => ({
      subject,
      rows: [...list].sort((a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        (ms(a.item.deadline) ?? Infinity) - (ms(b.item.deadline) ?? Infinity) ||
        a.item.id - b.item.id),
      teachers: uniq(list.map((r) => r.item.teacherName)),
      todo: list.filter((r) => r.status === "todo").length,
      hasActive: list.some((r) => r.canAct || r.status === "upcoming"),
    })).sort((a, b) => (b.todo > 0 ? 1 : 0) - (a.todo > 0 ? 1 : 0) || nearest(a.rows) - nearest(b.rows) || a.subject.localeCompare(b.subject))
  }, [filtered])

  const isOpen = (subject: string, index: number, hasActive: boolean) =>
    expanded[subject] ?? (filtersActive || hasActive || index === 0)

  // Sana qo'lda: Chrome'da uz locale to'liq emas (Intl "M11 12" chiqaradi)
  const monthName = (v: number) => t(`adminDashboard.monthLong.${MONTH_KEYS[new Date(v).getMonth()]}`)
  const dayMonth = (v: number) => t("examsBoard.dayMonth", { day: new Date(v).getDate(), month: monthName(v) })
  const hhmm = (v: number) => { const d = new Date(v); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}` }
  const dateTime = (v: number) => `${dayMonth(v)}, ${hhmm(v)}`
  const timeLeft = (deadline: number): string | null => {
    const diff = deadline - now
    if (diff <= 0) return null
    if (diff < 3_600_000) return t("examsBoard.leftMinutes", { n: Math.max(1, Math.floor(diff / 60_000)) })
    if (diff < DAY) return t("examsBoard.leftHours", { n: Math.floor(diff / 3_600_000) })
    return t("examsBoard.leftDays", { n: Math.floor(diff / DAY) })
  }
  const leftColor = (deadline: number) => (deadline - now <= 2 * DAY ? "#dc2626" : deadline - now <= 7 * DAY ? "#d97706" : BLUE)
  const relTime = (v: number) => {
    const time = hhmm(v)
    if (sameDay(v, now)) return t("examsBoard.today", { time })
    if (sameDay(v, now - DAY)) return t("examsBoard.yesterday", { time })
    const d = new Date(v)
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`
  }

  // Pastdagi panellar: yaqin muddatlar (topshirilmagan) va ochiladiganlar; so'nggi topshirish/baholar
  const upcoming = useMemo(() => rows
    .map((r) => {
      if (r.status === "todo") {
        const d = ms(r.item.deadline)
        return d != null && d > now ? { r, at: d, opens: false } : null
      }
      if (r.status === "upcoming") {
        const d = ms(r.item.availableFrom)
        return d != null ? { r, at: d, opens: true } : null
      }
      return null
    })
    .filter((x): x is { r: Row; at: number; opens: boolean } => !!x)
    .sort((a, b) => a.at - b.at), [rows, now])

  const activity = useMemo(() => rows
    .filter((r): r is Row & { sub: MySubmissionLite } => !!r.sub)
    .map((r) => ({ r, graded: r.sub.grade != null, at: ms(r.sub.grade != null ? (r.sub.gradedAt ?? r.sub.submittedAt) : r.sub.submittedAt) ?? 0 }))
    .sort((a, b) => b.at - a.at), [rows])

  /** Paneldagi yozuv bosilganda — fan ochiladi, qator tafsiloti chiqadi */
  function focusRow(r: Row) {
    clearFilters()
    setExpanded((prev) => ({ ...prev, [r.item.subjectName]: true }))
    setOpenRow({ id: r.item.id, form: false })
    window.setTimeout(() => document.getElementById(`exam-row-${r.item.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 120)
  }

  if (loading && !data) return <Loading />
  if (error && !data) return <ApiError message={error} onRetry={refetch} />

  const kindLabel = (k: ExamKind) => t(`examsBoard.kind.${k}`)
  const selectAll = { value: "", label: t("examsBoard.filter.all") }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-[30px]" style={FONT}>
      <PageHero icon={GraduationCap} title={t("exams.title")} subtitle={t("examsBoard.subtitle")} />

      {hasControlTest && !facePractice.loading && !facePractice.passed && <FacePracticeNotice compact />}

      {/* Holat kartalari — bosilsa ro'yxat shu holat bo'yicha filtrlanadi */}
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {STATS.map((s, i) => {
          const active = statusFilter === s.key
          return (
            <motion.button key={s.key} type="button"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setStatusFilter((f) => (f === s.key ? "all" : s.key))}
              className="group flex items-center gap-3 rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5"
              style={{ background: tint(s.color, 8), border: `1px solid ${tint(s.color, 26)}`, boxShadow: active ? `0 0 0 2px ${s.color}` : undefined }}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: s.color, boxShadow: `0 6px 14px ${s.color}40` }}>
                <s.Icon className="h-5 w-5 text-white" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold" style={{ color: TEXT }}>{t(`examsBoard.stat.${s.key}`)}</span>
                <span className="block text-[28px] font-bold leading-tight" style={{ color: s.color }}>{counts[s.key]}</span>
                <span className="block truncate text-[12px]" style={{ color: MUTED }}>{t(`examsBoard.stat.${s.key}Hint`)}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: s.color }} />
            </motion.button>
          )
        })}
      </div>

      {/* Filtrlar */}
      <div className="grid grid-cols-1 gap-2.5 rounded-2xl p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        style={{ background: CELL, border: `1px solid ${BORDER}`, boxShadow: "var(--lms-shadow)" }}>
        <FilterSelect icon={BookOpen} label={t("examsBoard.filter.subject")} value={subjectFilter} onChange={setSubjectFilter}
          options={[selectAll, ...subjects.map((s) => ({ value: s, label: s }))]} />
        <FilterSelect icon={User} label={t("examsBoard.filter.teacher")} value={teacherFilter} onChange={setTeacherFilter}
          options={[selectAll, ...teachers.map((s) => ({ value: s, label: s }))]} />
        <FilterSelect icon={ListFilter} label={t("examsBoard.filter.kind")} value={kindFilter} onChange={setKindFilter}
          options={[selectAll, ...kinds.map((k) => ({ value: k, label: kindLabel(k) }))]} />
        <FilterSelect icon={Activity} label={t("examsBoard.filter.status")} value={statusFilter === "all" ? "" : statusFilter}
          onChange={(v) => setStatusFilter((v || "all") as StatusFilter)}
          options={[selectAll, ...STATS.map((s) => ({ value: s.key, label: t(`examsBoard.stat.${s.key}`) })), { value: "missed", label: t("examsBoard.status.missed") }]} />
        <FilterSelect icon={CalendarDays} label={t("examsBoard.filter.date")} value={dateFilter === "all" ? "" : dateFilter}
          onChange={(v) => setDateFilter((v || "all") as DateFilter)}
          options={[selectAll, ...(["today", "week", "month", "past"] as const).map((d) => ({ value: d, label: t(`examsBoard.date.${d}`) }))]} />
        <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl px-3" style={{ background: CELL, border: `1px solid ${BORDER}` }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: MUTED }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("examsBoard.filter.search")}
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" style={{ color: TEXT }} />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="×">
              <X className="h-4 w-4" style={{ color: MUTED }} />
            </button>
          )}
        </label>
        {filtersActive && (
          <div className="flex items-center justify-between gap-2 px-1 text-[12px] sm:col-span-2 lg:col-span-3 xl:col-span-6" style={{ color: MUTED }}>
            <span>{t("examsBoard.count", { n: filtered.length })}</span>
            <button type="button" onClick={clearFilters} className="font-semibold" style={{ color: BLUE }}>{t("examsBoard.filter.clear")}</button>
          </div>
        )}
      </div>

      {/* Fanlar bo'yicha ro'yxat */}
      {rows.length === 0 ? (
        <EmptyCard title={t("exams.empty.title")} text={t("exams.empty.subtitle")} />
      ) : groups.length === 0 ? (
        <EmptyCard title={t("examsBoard.noMatch")} action={{ label: t("examsBoard.filter.clear"), onClick: clearFilters }} />
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g, gi) => {
            const open = isOpen(g.subject, gi, g.hasActive)
            const { Icon, color } = subjectVisual(g.subject)
            return (
              <div key={g.subject} className="overflow-hidden rounded-2xl"
                style={{ background: CELL, border: `1px solid ${BORDER}`, boxShadow: `inset 4px 0 0 ${open ? color : tint(color, 45)}${open ? ", var(--lms-shadow)" : ""}` }}>
                <div className={open ? "lg:grid lg:grid-cols-[190px_minmax(0,1fr)]" : ""}>
                  {open && (
                    <div className="hidden items-center justify-center pl-3 lg:flex">
                      <SubjectArt name={g.subject} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <button type="button" onClick={() => setExpanded((prev) => ({ ...prev, [g.subject]: !open }))}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${open ? "lg:hidden" : ""}`}
                        style={{ background: tint(color, 12) }}>
                        <Icon className="h-5 w-5" style={{ color }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          {open && <span className="hidden h-4 w-1 shrink-0 rounded-full lg:inline-block" style={{ background: color }} />}
                          <span className="truncate text-[16px] font-semibold" style={{ color: TEXT }}>{g.subject}</span>
                        </span>
                        {g.teachers.length > 0 && (
                          <span className="mt-0.5 block truncate text-[13px]" style={{ color: MUTED }}>
                            {t("examsBoard.teacher", { name: g.teachers.join(", ") })}
                          </span>
                        )}
                      </span>
                      {g.todo > 0 && (
                        <span className="hidden whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold sm:inline-block"
                          style={{ background: tint("#dc2626", 10), color: "#dc2626" }}>
                          {t("examsBoard.todoN", { n: g.todo })}
                        </span>
                      )}
                      <span className="whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-semibold"
                        style={{ background: tint(BLUE, 10), color: BLUE }}>
                        {t("examsBoard.count", { n: g.rows.length })}
                      </span>
                      <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: MUTED }} />
                    </button>

                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div key="rows" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                          <div className="flex flex-col gap-2 px-3 pb-4 sm:px-5">
                            {g.rows.map((r, i) => (
                              <ExamRow key={r.item.id} row={r} index={i}
                                detailsOpen={openRow?.id === r.item.id} formOpen={openRow?.id === r.item.id && openRow.form}
                                onToggle={(form) => setOpenRow((cur) => (cur?.id === r.item.id ? null : { id: r.item.id, form }))}
                                onChanged={refetch}
                                kindLabel={kindLabel(r.kind)}
                                dateTime={dateTime} timeLeft={timeLeft} leftColor={leftColor} />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Yaqin muddatlar va so'nggi faoliyat */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel icon={Clock} color="#7c3aed" title={t("examsBoard.upcomingTitle")}
            more={upcoming.length > 2 ? { open: showAllUpcoming, toggle: () => setShowAllUpcoming((v) => !v) } : null}>
            {upcoming.length === 0 ? (
              <p className="py-3 text-[13px]" style={{ color: MUTED }}>{t("examsBoard.upcomingEmpty")}</p>
            ) : (upcoming.slice(0, showAllUpcoming ? undefined : 2)).map(({ r, at, opens }) => (
              <button key={r.item.id} type="button" onClick={() => focusRow(r)}
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors"
                style={{ background: tint("#7c3aed", 6) }}>
                <span className="flex w-[64px] shrink-0 flex-col items-center rounded-lg py-1.5"
                  style={{ background: CELL, border: `1px solid ${tint("#7c3aed", 20)}` }}>
                  <span className="text-[20px] font-bold leading-none" style={{ color: TEXT }}>{new Date(at).getDate()}</span>
                  <span className="mt-0.5 text-[11px] font-medium capitalize" style={{ color: TEXT }}>{monthName(at)}</span>
                  <span className="text-[10px] capitalize" style={{ color: MUTED }}>{t(`examsBoard.wd.${new Date(at).getDay()}`)}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold" style={{ color: TEXT }}>{r.item.subjectName} — {r.item.title}</span>
                  <span className="mt-0.5 block truncate text-[12px]" style={{ color: MUTED }}>
                    {t(opens ? "examsBoard.opens" : "examsBoard.deadline", { date: dateTime(at) })}
                    {r.item.teacherName ? ` • ${t("examsBoard.teacher", { name: r.item.teacherName })}` : ""}
                  </span>
                </span>
                {!opens && timeLeft(at) && <Pill color="#7c3aed" Icon={Timer}>{timeLeft(at)}</Pill>}
                {opens && <Pill color={BLUE} Icon={Lock}>{t("examsBoard.status.upcoming")}</Pill>}
              </button>
            ))}
          </Panel>

          <Panel icon={CheckCircle2} color="#16a34a" title={t("examsBoard.activityTitle")}
            more={activity.length > 3 ? { open: showAllActivity, toggle: () => setShowAllActivity((v) => !v) } : null}>
            {activity.length === 0 ? (
              <p className="py-3 text-[13px]" style={{ color: MUTED }}>{t("examsBoard.activityEmpty")}</p>
            ) : (activity.slice(0, showAllActivity ? 15 : 3)).map(({ r, graded, at }) => (
              <button key={r.item.id} type="button" onClick={() => focusRow(r)}
                className="flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{ background: graded ? "#16a34a" : tint(BLUE, 14) }}>
                  {graded ? <CheckCircle2 className="h-4 w-4 text-white" /> : <Send className="h-3.5 w-3.5" style={{ color: BLUE }} />}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: TEXT }}>
                  <span className="font-semibold">{r.item.title}</span>
                  {" — "}
                  {graded ? t("examsBoard.act.graded", { score: scoreText(r.item, r.sub) }) : t("examsBoard.act.submitted")}
                  <span style={{ color: MUTED }}> · {r.item.subjectName}</span>
                </span>
                <span className="shrink-0 text-[12px]" style={{ color: MUTED }}>{relTime(at)}</span>
              </button>
            ))}
          </Panel>
        </div>
      )}
    </div>
  )
}

/* ── Bitta imtihon qatori: raqam, nom, muddat, holat, fayl/natija, amal ── */
function ExamRow({ row, index, detailsOpen, formOpen, onToggle, onChanged, kindLabel, dateTime, timeLeft, leftColor }: {
  row: Row
  index: number
  detailsOpen: boolean
  formOpen: boolean
  onToggle: (form: boolean) => void
  onChanged: () => void
  kindLabel: string
  dateTime: (v: number) => string
  timeLeft: (deadline: number) => string | null
  leftColor: (deadline: number) => string
}) {
  const { t } = useLanguage()
  const { item, sub, status } = row
  const st = STATUS_STYLE[status]
  const deadline = ms(item.deadline)
  const opensAt = ms(item.availableFrom)
  const isTest = item.type === "exam" && item.questionCount > 0
  const points = item.controlType === "oraliq" ? oraliqPoints(item) : item.gradePoints
  const left = status === "todo" && deadline != null ? timeLeft(deadline) : null
  const file = status !== "upcoming" && !isTest ? taskFiles(item)[0] : undefined

  const dateLine = status === "upcoming" && opensAt != null
    ? t("examsBoard.opens", { date: dateTime(opensAt) })
    : deadline != null ? t("examsBoard.deadline", { date: dateTime(deadline) }) : t("examsBoard.noDeadline")

  const primaryCls = "flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition-opacity hover:opacity-90"
  let primary: React.ReactNode
  if (isTest && row.canAct && !sub) {
    primary = (
      <Link href={`/imtihonlar/${item.id}`} className={primaryCls} style={{ background: BLUE, color: "#fff", boxShadow: "0 6px 14px rgba(37,99,235,0.25)" }}>
        <Play className="h-4 w-4" /> {t("examsBoard.start")}
      </Link>
    )
  } else if (!isTest && row.canAct && !sub) {
    primary = (
      <button type="button" onClick={() => onToggle(true)} className={primaryCls}
        style={detailsOpen ? { background: tint(BLUE, 10), color: BLUE } : { background: BLUE, color: "#fff", boxShadow: "0 6px 14px rgba(37,99,235,0.25)" }}>
        {detailsOpen ? <><ChevronDown className="h-4 w-4 rotate-180" /> {t("examsBoard.hide")}</> : <><Send className="h-4 w-4" /> {t("examsBoard.submit")}</>}
      </button>
    )
  } else {
    primary = (
      <button type="button" onClick={() => onToggle(false)} className={primaryCls} style={{ background: tint(BLUE, 10), color: BLUE }}>
        {detailsOpen ? <><ChevronDown className="h-4 w-4 rotate-180" /> {t("examsBoard.hide")}</> : <><Eye className="h-4 w-4" /> {t("examsBoard.view")}</>}
      </button>
    )
  }

  const chipCls = "flex h-10 w-full items-center justify-center gap-2 rounded-xl px-3 text-[13px] font-semibold"
  let middle: React.ReactNode = <span className="hidden lg:block" />
  if (status === "graded" && sub) {
    middle = (
      <span className={chipCls} style={{ border: `1px solid ${BORDER}`, color: TEXT, background: CELL }}>
        <BarChart3 className="h-4 w-4" style={{ color: BLUE }} /> {t("examsBoard.result", { score: scoreText(item, sub) })}
      </span>
    )
  } else if (file) {
    middle = (
      <a href={teachingApi.fileUrl(file.url)} target="_blank" rel="noreferrer" download title={file.originalName}
        className={`${chipCls} transition-colors`} style={{ border: `1px solid ${BORDER}`, color: BLUE, background: CELL }}>
        <FileText className="h-4 w-4" /> {t("examsBoard.file")}
      </a>
    )
  } else if (isTest && item.durationMinutes != null) {
    middle = (
      <span className={chipCls} style={{ border: `1px solid ${BORDER}`, color: TEXT, background: CELL }}>
        <Clock className="h-4 w-4" style={{ color: MUTED }} /> {t("examsBoard.minutes", { n: item.durationMinutes })}
      </span>
    )
  }

  return (
    <div id={`exam-row-${item.id}`} className="overflow-hidden rounded-xl"
      style={{ background: tint(BLUE, 3), border: `1px solid ${detailsOpen ? tint(BLUE, 35) : BORDER}` }}>
      <div className="flex flex-col gap-3 p-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_150px_140px] lg:items-center lg:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: BLUE }}>
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold" style={{ color: TEXT }}>{item.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px]" style={{ color: MUTED }}>
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>{dateLine}</span>
              <span>· {kindLabel}{points != null ? ` · ${t("examsBoard.points", { n: points })}` : ""}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {left && deadline != null && <Pill color={leftColor(deadline)} Icon={Timer}>{left}</Pill>}
          <Pill color={st.color} Icon={st.Icon}>{t(`examsBoard.status.${status}`)}</Pill>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:contents">
          <div className="lg:border-l lg:pl-4" style={{ borderColor: BORDER }}>{middle}</div>
          <div>{primary}</div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {detailsOpen && (
          <motion.div key="details" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden"
            style={{ borderTop: `1px solid ${BORDER}`, background: CELL }}>
            <StudentContentCard item={item} submittable embedded autoOpenForm={formOpen} onChanged={onChanged} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Pill({ color, Icon, children }: { color: string; Icon: typeof Clock; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold"
      style={{ background: tint(color, 12), color }}>
      <Icon className="h-3.5 w-3.5" /> {children}
    </span>
  )
}

function FilterSelect({ icon: Icon, label, value, onChange, options }: {
  icon: typeof Clock
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="relative flex h-11 min-w-0 items-center gap-2 rounded-xl px-3" style={{ background: CELL, border: `1px solid ${BORDER}` }}>
      <Icon className="h-4 w-4 shrink-0" style={{ color: TEXT }} />
      <span className="shrink-0 text-[13px] font-semibold" style={{ color: TEXT }}>{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent pr-6 text-[13px] outline-none" style={{ color: TEXT }}>
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ backgroundColor: CELL, color: TEXT }}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4" style={{ color: MUTED }} />
    </label>
  )
}

function Panel({ icon: Icon, color, title, more, children }: {
  icon: typeof Clock
  color: string
  title: string
  more: { open: boolean; toggle: () => void } | null
  children: React.ReactNode
}) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-3 rounded-2xl p-4 sm:p-5" style={{ background: CELL, border: `1px solid ${BORDER}`, boxShadow: "var(--lms-shadow)" }}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: tint(color, 14) }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </span>
        <h2 className="min-w-0 flex-1 truncate text-[17px] font-semibold" style={{ color: TEXT }}>{title}</h2>
        {more && (
          <button type="button" onClick={more.toggle} className="flex shrink-0 items-center gap-1 text-[13px] font-semibold" style={{ color: BLUE }}>
            {t(more.open ? "examsBoard.seeLess" : "examsBoard.seeAll")} <ArrowRight className={`h-4 w-4 transition-transform ${more.open ? "-rotate-90" : ""}`} />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function EmptyCard({ title, text, action }: { title: string; text?: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="rounded-2xl p-10 text-center" style={{ background: CELL, border: `1px solid ${BORDER}` }}>
      <GraduationCap className="mx-auto mb-3 h-10 w-10" style={{ color: MUTED }} />
      <p className="text-sm font-medium" style={{ color: TEXT }}>{title}</p>
      {text && <p className="mt-1 text-xs" style={{ color: MUTED }}>{text}</p>}
      {action && (
        <button type="button" onClick={action.onClick} className="mt-3 text-[13px] font-semibold" style={{ color: BLUE }}>{action.label}</button>
      )}
    </div>
  )
}
