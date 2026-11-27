"use client"

/* Davomat jurnali — haftalik elektron jadval (2026-11-27).
   O'qituvchi guruh, fan, mashg'ulot turi va haftani tanlaydi. Ustunlar —
   haftaning faqat dars bor kunlari (HEMIS jadvalidan; jadvalda fan topilmasa
   Du–Ju). Hali saqlanmagan kunda hamma katak ✓ Keldi; bosilganda
   ✕ Kelmadi → ! Sababli (sabab oynasi) → ✓ Keldi. Har kun alohida varaq:
   saqlangach qulflanadi, o'zgartirish — adminga so'rov orqali (avvalgidek). */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ChevronLeft, ChevronRight, ChevronDown, Save, History, Users, RefreshCw, Info, Lock, Unlock, Clock, Send,
  CheckCheck, CalendarDays, Check, X, Loader2, UserCheck, UserX, CircleAlert,
} from "lucide-react"
import {
  teachingApi,
  attendanceApi,
  type AttendanceStatus,
  type AttendanceWeek,
  type AttendanceWeekDay,
  type AttendanceWeekStudent,
} from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { sortByName } from "@/lib/utils"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { ATTENDANCE_TRAINING_TYPES, normalizeTrainingType, trainingTypeLabelKey } from "@/lib/attendanceTrainingTypes"

const FONT = { fontFamily: "var(--font-poppins)" } as const
const inputCls =
  "w-full px-3 py-2.5 rounded-[8px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none transition-colors"
const labelCls = "text-xs font-medium mb-1.5 block"

/* ── Sana yordamchilari (Intl'siz: brauzerda uz locale bo'lmasligi mumkin) ── */
const pad = (n: number) => String(n).padStart(2, "0")
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function todayStr() {
  return toDateStr(new Date())
}
function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}
function mondayOf(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`)
  return addDays(dateStr, -((d.getDay() + 6) % 7))
}
/** 0 = Dushanba … 6 = Yakshanba */
function weekdayIndex(dateStr: string) {
  return (new Date(`${dateStr}T00:00:00`).getDay() + 6) % 7
}
function fmtDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-")
  return y && m && d ? `${d}.${m}.${y}` : dateStr
}
function fmtShort(dateStr: string) {
  const [, m, d] = dateStr.split("-")
  return m && d ? `${d}.${m}` : dateStr
}
function fmtDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* Sababli: sabab izohning boshiga yoziladi ("Kasallik — ..."), shunda admin
   va talaba sahifalarida ham o'sha matn ko'rinadi */
const EXCUSE_REASONS = [
  { value: "Kasallik", key: "davomatHafta.reason.illness" },
  { value: "Oilaviy sabab", key: "davomatHafta.reason.family" },
  { value: "Ruxsatnoma", key: "davomatHafta.reason.permit" },
  { value: "Boshqa sabab", key: "davomatHafta.reason.other" },
] as const
function composeExcuse(reason: string, note: string) {
  const n = note.trim()
  return n ? `${reason} — ${n}` : reason
}
function parseExcuse(comment: string | null): { reason: string; note: string } {
  const c = comment?.trim() ?? ""
  for (const r of EXCUSE_REASONS) {
    if (c === r.value) return { reason: r.value, note: "" }
    if (c.startsWith(`${r.value} — `)) return { reason: r.value, note: c.slice(r.value.length + 3) }
  }
  return { reason: EXCUSE_REASONS[0].value, note: c }
}

const STATUS_STYLE: Record<AttendanceStatus, { color: string; bg: string; border: string }> = {
  present: { color: "#15803d", bg: "#dcfce7", border: "#86efac" },
  absent:  { color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
  excused: { color: "#b45309", bg: "#fef3c7", border: "#fcd34d" },
  late:    { color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
}

function StatusGlyph({ status, className = "w-4 h-4" }: { status: AttendanceStatus; className?: string }) {
  if (status === "present") return <Check className={className} strokeWidth={3} />
  if (status === "absent") return <X className={className} strokeWidth={3} />
  if (status === "late") return <Clock className={className} strokeWidth={2.5} />
  return <span className="text-[15px] font-extrabold leading-none">!</span>
}

interface Mark {
  status: AttendanceStatus
  comment: string | null
  auto?: boolean
}
/** Tahrirlanadigan kunlarning joriy belgilari: sana → talaba → belgi */
type Drafts = Record<string, Record<number, Mark>>

export default function DavomatJurnaliPage() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const today = todayStr()
  const thisMonday = mondayOf(today)
  const initialGroup = searchParams.get("group")
  const initialSubject = searchParams.get("subject") ?? ""
  const initialTraining = normalizeTrainingType(searchParams.get("training"))
  const initialWeek = (() => {
    const d = searchParams.get("date")
    return mondayOf(d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today ? d : today)
  })()

  const statusLabel = (s: AttendanceStatus) => t(`oqDavomat.status.${s}`)
  const typeLabel = (value: string | null | undefined) => {
    const key = trainingTypeLabelKey(value)
    return key ? t(key) : (value ?? "")
  }

  const { data: groupsRes, loading: lGroups, error: eGroups, refetch: rGroups } = useApi(() => teachingApi.groups(), [])
  const groups = groupsRes?.data ?? []

  const [groupId, setGroupId] = useState<number | "">(initialGroup ? Number(initialGroup) : "")
  const [subjectName, setSubjectName] = useState(initialSubject)
  const [trainingType, setTrainingType] = useState(initialTraining)
  const [weekStart, setWeekStart] = useState(initialWeek)

  const { data: subjectsRes } = useApi(
    () => groupId !== "" ? teachingApi.mySubjects(groupId as number) : Promise.resolve(null),
    [groupId]
  )
  const subjects = useMemo(() => {
    const list = subjectsRes?.data?.map(s => s.subjectName) ?? []
    return [...new Set(list)].sort()
  }, [subjectsRes])

  const [week, setWeek] = useState<AttendanceWeek | null>(null)
  const [loadingWeek, setLoadingWeek] = useState(false)
  const [weekError, setWeekError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Drafts>({})
  const [dirtyDays, setDirtyDays] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [excuse, setExcuse] = useState<{ date: string; studentUserId: number; name: string; reason: string; note: string } | null>(null)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveDays, setSaveDays] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [requestDay, setRequestDay] = useState<AttendanceWeekDay | null>(null)
  const [tip, setTip] = useState<{ x: number; y: number; lines: string[] } | null>(null)

  const ready = groupId !== "" && !!subjectName && !!trainingType

  const { data: historyRes, loading: lHistory, refetch: refetchHistory } = useApi(
    () =>
      groupId !== "" && subjectName
        ? attendanceApi.history({ groupId, subject: subjectName })
        : Promise.resolve({ success: true, data: [] }),
    [groupId, subjectName]
  )
  const history = historyRes?.data ?? []

  const loadSeq = useRef(0)
  const loadWeek = useCallback(async (keepMsg = false) => {
    if (groupId === "" || !subjectName || !trainingType) return
    const seq = ++loadSeq.current
    setLoadingWeek(true)
    setWeekError(null)
    if (!keepMsg) setMsg(null)
    try {
      const res = await attendanceApi.week(groupId, subjectName, weekStart, trainingType)
      if (seq !== loadSeq.current) return
      const data = { ...res.data, students: sortByName(res.data.students, (s) => s.fullName) }
      // Tahrirlanadigan kunlar: saqlangan/avtomatik belgi bo'lsa o'sha,
      // bo'lmasa ✓ Keldi — o'qituvchi faqat kelmaganlarni bosadi
      const next: Drafts = {}
      for (const d of data.days) {
        if (d.future || d.locked) continue
        const marks: Record<number, Mark> = {}
        for (const s of data.students) {
          const c = d.cells[s.studentUserId]
          marks[s.studentUserId] = c ? { status: c.status, comment: c.comment, auto: c.auto } : { status: "present", comment: null }
        }
        next[d.date] = marks
      }
      setWeek(data)
      setDrafts(next)
      setDirtyDays(new Set())
    } catch (e) {
      if (seq !== loadSeq.current) return
      setWeek(null)
      setWeekError(e instanceof Error ? e.message : t("oqBaholash.error"))
    } finally {
      if (seq === loadSeq.current) setLoadingWeek(false)
    }
  }, [groupId, subjectName, trainingType, weekStart, t])

  // Guruh/fan/tur/hafta tayyor bo'lsa jadval o'zi ochiladi
  useEffect(() => {
    if (!ready) return
    const h = setTimeout(() => { void loadWeek() }, 250)
    return () => clearTimeout(h)
  }, [ready, loadWeek])

  /** Saqlanmagan belgilar bo'lsa — almashtirishdan oldin so'raladi */
  function guard(action: () => void) {
    if (dirtyDays.size > 0 && !window.confirm(t("davomatHafta.discardConfirm"))) return
    setDirtyDays(new Set())
    action()
  }
  function resetWeek() {
    setWeek(null)
    setDrafts({})
    setMsg(null)
  }

  const days = useMemo(() => week?.days ?? [], [week])
  const students: AttendanceWeekStudent[] = useMemo(() => week?.students ?? [], [week])
  const editableDays = days.filter((d) => !!drafts[d.date])

  function markOf(day: AttendanceWeekDay, studentUserId: number): Mark | null {
    if (day.future) return null
    return drafts[day.date]?.[studentUserId] ?? day.cells[studentUserId] ?? null
  }

  function setMark(date: string, studentUserId: number, mark: Mark) {
    setDrafts((prev) => ({ ...prev, [date]: { ...prev[date], [studentUserId]: mark } }))
    setDirtyDays((prev) => new Set(prev).add(date))
  }

  /** ✓ Keldi → ✕ Kelmadi → ! Sababli (sabab oynasi) → ✓ Keldi */
  function cycle(day: AttendanceWeekDay, s: AttendanceWeekStudent) {
    const cur = drafts[day.date]?.[s.studentUserId]
    if (!cur) return
    setTip(null)
    if (cur.status === "absent") {
      const p = parseExcuse(null)
      setExcuse({ date: day.date, studentUserId: s.studentUserId, name: s.fullName, reason: p.reason, note: "" })
      return
    }
    setMark(day.date, s.studentUserId, { status: cur.status === "excused" ? "present" : "absent", comment: null })
  }

  function markAllPresent() {
    setDrafts((prev) => {
      const next: Drafts = {}
      for (const [date, marks] of Object.entries(prev)) {
        next[date] = Object.fromEntries(Object.keys(marks).map((id) => [id, { status: "present" as const, comment: null }]))
      }
      return next
    })
    setDirtyDays(new Set(Object.keys(drafts)))
  }

  // Statistika va soatlar — ko'rinib turgan (kelajak bo'lmagan) kunlar bo'yicha
  const stats = useMemo(() => {
    const c: Record<AttendanceStatus, number> = { present: 0, absent: 0, excused: 0, late: 0 }
    for (const d of days) {
      if (d.future) continue
      for (const s of students) {
        const m = drafts[d.date]?.[s.studentUserId] ?? d.cells[s.studentUserId]
        if (m) c[m.status]++
      }
    }
    return c
  }, [days, students, drafts])

  function weekHours(studentUserId: number) {
    let absent = 0
    let excused = 0
    for (const d of days) {
      const m = markOf(d, studentUserId)
      if (m?.status === "absent") absent += d.hours
      else if (m?.status === "excused") excused += d.hours
    }
    return { absent, excused }
  }

  function openSave() {
    // Saqlanmagan kunlar — hammasi; ruxsat berilgan (saqlangan) kunlar — faqat o'zgargan bo'lsa
    setSaveDays(new Set(editableDays.filter((d) => !d.saved || dirtyDays.has(d.date)).map((d) => d.date)))
    setSaveOpen(true)
    setMsg(null)
  }

  async function handleSave() {
    if (groupId === "" || !week) return
    setSaving(true)
    let ok = 0
    const errors: string[] = []
    for (const d of editableDays) {
      if (!saveDays.has(d.date)) continue
      try {
        await attendanceApi.save({
          groupId,
          subjectName,
          date: d.date,
          trainingType,
          records: students.map((s) => {
            const m = drafts[d.date]?.[s.studentUserId] ?? { status: "present" as const, comment: null }
            return { studentUserId: s.studentUserId, fullName: s.fullName, status: m.status, comment: m.comment ?? undefined }
          }),
        })
        ok++
      } catch (e) {
        errors.push(`${fmtDay(d.date)}: ${e instanceof Error ? e.message : t("oqBaholash.error")}`)
      }
    }
    setSaving(false)
    setSaveOpen(false)
    setMsg(errors.length
      ? { ok: false, text: [ok ? t("davomatHafta.save.done", { n: ok }) : "", ...errors].filter(Boolean).join(" · ") }
      : { ok: true, text: t("davomatHafta.save.done", { n: ok }) })
    setDirtyDays(new Set())
    refetchHistory()
    await loadWeek(true)
  }

  function showTip(e: { currentTarget: HTMLElement }, day: AttendanceWeekDay, mark: Mark | null) {
    if (!mark) return
    const r = e.currentTarget.getBoundingClientRect()
    const lines = [
      `${t(`davomatHafta.wd.${weekdayIndex(day.date)}`)}, ${fmtDay(day.date)}`,
      t("davomatHafta.tip.status", { status: statusLabel(mark.status) }),
    ]
    if (mark.status === "absent" || mark.status === "excused") lines.push(t("davomatHafta.tip.time", { n: day.hours }))
    if (mark.comment) lines.push(mark.comment)
    if (mark.auto) lines.push(t("davomatHafta.tip.auto"))
    if (!day.saved || dirtyDays.has(day.date)) lines.push(t("davomatHafta.tip.notSaved"))
    setTip({ x: r.left + r.width / 2, y: r.top, lines })
  }

  if (lGroups) return <Loading />
  if (eGroups) return <ApiError message={eGroups} onRetry={rGroups} />

  const noLessons = !!week && week.days.length === 0
  const canGoNext = weekStart < thisMonday

  return (
    <div className="flex flex-col gap-5 p-[30px]" onScroll={() => setTip(null)}>
      <div className="flex items-center gap-2 text-sm flex-wrap" style={{ color: "#7293b9", ...FONT }}>
        <Link href="/xodim/davomat-jurnali" className="flex items-center gap-1 hover:underline">
          <ChevronLeft className="w-4 h-4" />
          {t("davomatJurnaliOq.breadcrumb")}
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#e8f0fe" }}>
          <CalendarDays className="w-7 h-7" style={{ color: "#0e58a8" }} />
        </div>
        <div>
          <h1 className="text-[28px] font-semibold leading-tight" style={{ color: "#012970", ...FONT }}>
            {t("davomatJurnaliOq.title")}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#7293b9", ...FONT }}>{t("davomatHafta.subtitle")}</p>
        </div>
      </div>

      {/* Filtrlar */}
      <div className="bg-white rounded-[12px] p-4 flex flex-col gap-3" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_0.8fr_1.3fr_auto] gap-3 items-end">
          <div>
            <label className={labelCls} style={{ color: "#012970", ...FONT }}>{t("oqBaholash.group")}</label>
            <div className="relative">
              <select
                value={groupId}
                onChange={(e) => { const v = e.target.value; guard(() => { setGroupId(v ? Number(v) : ""); setSubjectName(""); resetWeek() }) }}
                className={`${inputCls} appearance-none pr-8`}
                style={{ color: "#012970", ...FONT }}>
                <option value="">{t("oqBaholash.selectGroup")}</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#7293b9" }} />
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", ...FONT }}>{t("oqBaholash.subject")}</label>
            {subjects.length > 0 ? (
              <div className="relative">
                <select
                  value={subjectName}
                  onChange={(e) => { const v = e.target.value; guard(() => { setSubjectName(v); resetWeek() }) }}
                  className={`${inputCls} appearance-none pr-8`}
                  style={{ color: "#012970", ...FONT }}>
                  <option value="">{t("oqBaholash.selectSubject")}</option>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#7293b9" }} />
              </div>
            ) : (
              <input
                type="text"
                value={subjectName}
                onChange={(e) => { setSubjectName(e.target.value); resetWeek() }}
                placeholder={t("oqBaholash.subjectPlaceholder")}
                className={inputCls}
                style={{ color: "#012970", ...FONT }}
              />
            )}
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", ...FONT }}>{t("oqDavomat.trainingType")}</label>
            <div className="relative">
              <select
                value={trainingType}
                onChange={(e) => { const v = e.target.value; guard(() => { setTrainingType(v); resetWeek() }) }}
                disabled={saving}
                className={`${inputCls} appearance-none pr-8 disabled:bg-[#f6f9ff]`}
                style={{ color: "#012970", ...FONT }}>
                <option value="">{t("oqDavomat.trainingTypePlaceholder")}</option>
                {ATTENDANCE_TRAINING_TYPES.map((opt) => <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#7293b9" }} />
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", ...FONT }}>{t("davomatHafta.week")}</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => guard(() => { setWeekStart((w) => addDays(w, -7)); resetWeek() })}
                className="shrink-0 rounded-[8px] border border-[#d8e6f7] p-2.5 hover:bg-[#f6f9ff]"
                title={t("davomatHafta.prevWeek")} aria-label={t("davomatHafta.prevWeek")}>
                <ChevronLeft className="w-4 h-4" style={{ color: "#0e58a8" }} />
              </button>
              {/* Oraliq ustiga sana tanlagich: istalgan kunni tanlasa — o'sha hafta */}
              <label className="relative flex-1 flex items-center gap-2 px-3 py-2.5 rounded-[8px] border border-[#d8e6f7] text-sm cursor-pointer whitespace-nowrap"
                style={{ color: "#012970", ...FONT }} title={t("davomatHafta.pickWeek")}>
                <CalendarDays className="w-4 h-4 shrink-0" style={{ color: "#0e58a8" }} />
                {fmtDay(weekStart)} – {fmtDay(addDays(weekStart, 6))}
                <input
                  type="date"
                  value={weekStart}
                  max={today}
                  aria-label={t("davomatHafta.pickWeek")}
                  onClick={(e) => { try { e.currentTarget.showPicker?.() } catch { /* eski brauzer */ } }}
                  onChange={(e) => { const v = e.target.value; if (v) guard(() => { setWeekStart(mondayOf(v > today ? today : v)); resetWeek() }) }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
              <button
                type="button"
                onClick={() => { if (canGoNext) guard(() => { setWeekStart((w) => addDays(w, 7)); resetWeek() }) }}
                disabled={!canGoNext}
                className="shrink-0 rounded-[8px] border border-[#d8e6f7] p-2.5 hover:bg-[#f6f9ff] disabled:opacity-40 disabled:cursor-not-allowed"
                title={t("davomatHafta.nextWeek")} aria-label={t("davomatHafta.nextWeek")}>
                <ChevronRight className="w-4 h-4" style={{ color: "#0e58a8" }} />
              </button>
            </div>
          </div>

          <button
            onClick={() => guard(() => { void loadWeek() })}
            disabled={!ready || loadingWeek}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "#0e58a8", color: "#fff", ...FONT }}>
            <RefreshCw className={`w-4 h-4 ${loadingWeek ? "animate-spin" : ""}`} />
            {t("davomatHafta.refresh")}
          </button>
        </div>

        <div className="flex items-start gap-2 px-3 py-2 rounded-[8px] text-xs" style={{ backgroundColor: "#f0f7ff", color: "#0e58a8", border: "1px solid rgba(14,88,168,0.15)", ...FONT }}>
          <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
          {t("davomatHafta.howto")}
        </div>
      </div>

      {!ready && (
        <div className="bg-white rounded-[12px] p-8 text-center text-sm" style={{ border: "1px solid rgba(1,41,112,0.1)", color: "#7293b9", ...FONT }}>
          {groupId !== "" && subjectName && !trainingType ? t("davomatJurnaliOq.chooseTypeHint") : t("davomatHafta.selectFilters")}
        </div>
      )}

      {ready && weekError && <ApiError message={weekError} onRetry={() => loadWeek()} />}
      {ready && !weekError && loadingWeek && !week && <Loading />}

      {ready && week && (
        <>
          {/* Statistika */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: t("davomatHafta.stat.students"), value: students.length, color: "#0e58a8", bg: "#eef4ff", Icon: Users },
              { label: statusLabel("present"), value: stats.present + stats.late, color: "#15803d", bg: "#f0fdf4", Icon: UserCheck },
              { label: statusLabel("absent"), value: stats.absent, color: "#dc2626", bg: "#fef2f2", Icon: UserX },
              { label: statusLabel("excused"), value: stats.excused, color: "#b45309", bg: "#fffbeb", Icon: CircleAlert },
            ].map((c) => (
              <div key={c.label} className="rounded-[12px] px-4 py-3.5 flex items-center gap-3" style={{ backgroundColor: c.bg, border: `1px solid ${c.color}22` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shrink-0">
                  <c.Icon className="w-5 h-5" style={{ color: c.color }} />
                </div>
                <div>
                  <div className="text-xs font-medium" style={{ color: c.color, ...FONT }}>{c.label}</div>
                  <div className="text-2xl font-bold leading-tight" style={{ color: c.color, ...FONT, fontVariantNumeric: "tabular-nums" }}>{c.value}</div>
                </div>
              </div>
            ))}
          </div>

          {!week.scheduleFound && (
            <div className="flex items-start gap-2 rounded-[10px] px-4 py-2.5 text-xs" style={{ backgroundColor: "#fffbeb", color: "#92400e", border: "1px solid rgba(146,64,14,0.2)", ...FONT }}>
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
              {t("davomatHafta.noSchedule")}
            </div>
          )}

          <div className="bg-white rounded-[12px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
            {noLessons ? (
              <div className="px-5 py-14 text-center text-sm" style={{ color: "#7293b9", ...FONT }}>
                {t("davomatHafta.noLessons", { type: typeLabel(trainingType) })}
              </div>
            ) : (
              <div className="overflow-x-auto" onScroll={() => setTip(null)}>
                <table className="w-full" style={{ minWidth: 420 + days.length * 104, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f6f9ff", borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                      <th className="px-3 py-3 text-left text-xs font-semibold w-12" style={{ color: "#012970", ...FONT }}>№</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold min-w-[220px]" style={{ color: "#012970", ...FONT }}>{t("davomatJurnaliOq.studentFullName")}</th>
                      {days.map((d) => {
                        const isToday = d.date === week.today
                        const pending = d.editRequest?.status === "pending"
                        const approved = d.saved && !d.locked
                        const unsaved = !d.saved && !d.future
                        return (
                          <th key={d.date} className="px-1.5 py-2 text-center align-top w-[104px]"
                            style={{ backgroundColor: isToday ? "#e8f0fe" : undefined, borderLeft: "1px solid rgba(1,41,112,0.06)" }}>
                            <button
                              type="button"
                              disabled={!d.locked}
                              onClick={() => setRequestDay(d)}
                              title={d.locked ? t("davomatHafta.day.locked") : d.future ? t("davomatHafta.day.future") : undefined}
                              className="w-full flex flex-col items-center gap-0.5 rounded-[8px] px-1 py-1 enabled:hover:bg-white enabled:cursor-pointer">
                              <span className="text-[13px] font-semibold" style={{ color: d.future ? "#94a3b8" : "#012970", ...FONT }}>
                                {t(`davomatHafta.wd.${weekdayIndex(d.date)}`)}
                              </span>
                              <span className="text-xs font-medium" style={{ color: d.future ? "#94a3b8" : "#445b7a", ...FONT }}>
                                {fmtShort(d.date)}{isToday ? ` · ${t("davomatHafta.today")}` : ""}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] font-medium mt-0.5" style={FONT}>
                                {d.locked && !pending && <><Lock className="w-3 h-3" style={{ color: "#92400e" }} /><span style={{ color: "#92400e" }}>{t("davomatHafta.hours", { n: d.hours })}</span></>}
                                {pending && <><Clock className="w-3 h-3" style={{ color: "#1d4ed8" }} /><span style={{ color: "#1d4ed8" }}>{t("davomatHafta.day.pending")}</span></>}
                                {approved && <><Unlock className="w-3 h-3" style={{ color: "#15803d" }} /><span style={{ color: "#15803d" }}>{t("davomatHafta.day.approved")}</span></>}
                                {unsaved && <><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} /><span style={{ color: "#b45309" }}>{t("davomatHafta.day.unsaved")}</span></>}
                                {d.future && <span style={{ color: "#94a3b8" }}>{t("davomatHafta.hours", { n: d.hours })}</span>}
                              </span>
                            </button>
                          </th>
                        )
                      })}
                      <th className="px-3 py-3 text-center text-xs font-semibold w-[110px]" style={{ color: "#012970", borderLeft: "1px solid rgba(1,41,112,0.06)", ...FONT }}>
                        {t("davomatHafta.col.week")}
                        <div className="text-[10px] font-normal" style={{ color: "#7293b9" }}>{t("davomatHafta.col.missedHint")}</div>
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold w-[100px]" style={{ color: "#012970", ...FONT }}>
                        {t("davomatHafta.col.total")}
                        <div className="text-[10px] font-normal" style={{ color: "#7293b9" }}>{t("davomatHafta.col.missedHint")}</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={days.length + 4} className="px-4 py-14 text-center text-sm" style={{ color: "#7293b9", ...FONT }}>
                          {t("oqBaholash.noStudents")}
                        </td>
                      </tr>
                    ) : students.map((s, i) => {
                      const wh = weekHours(s.studentUserId)
                      const weekMissed = wh.absent + wh.excused
                      const total = s.totalAbsentHours + s.totalExcusedHours
                      return (
                        <tr key={s.studentUserId} className="hover:bg-[#f8fbff]" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                          <td className="px-3 py-2 text-sm" style={{ color: "#7293b9", ...FONT }}>{i + 1}</td>
                          <td className="px-3 py-2 text-sm font-medium" style={{ color: "#012970", ...FONT }}>{s.fullName}</td>
                          {days.map((d) => {
                            const isToday = d.date === week.today
                            const mark = markOf(d, s.studentUserId)
                            const editable = !!drafts[d.date]
                            const st = mark ? STATUS_STYLE[mark.status] : null
                            return (
                              <td key={d.date} className="px-1.5 py-1.5 text-center"
                                style={{ backgroundColor: isToday ? "#f5f8ff" : undefined, borderLeft: "1px solid rgba(1,41,112,0.06)" }}>
                                {d.future ? (
                                  <span className="text-sm" style={{ color: "#cbd5e1" }}>—</span>
                                ) : mark && st ? (
                                  <button
                                    type="button"
                                    // disabled emas: qulflangan katakda ham sichqoncha ma'lumotni ko'rsatsin
                                    aria-disabled={!editable}
                                    onClick={() => { if (editable) cycle(d, s) }}
                                    onMouseEnter={(e) => showTip(e, d, mark)}
                                    onMouseLeave={() => setTip(null)}
                                    onFocus={(e) => showTip(e, d, mark)}
                                    onBlur={() => setTip(null)}
                                    aria-label={`${s.fullName}, ${fmtDay(d.date)}: ${statusLabel(mark.status)}`}
                                    className={`relative mx-auto w-9 h-9 rounded-[9px] flex items-center justify-center transition-transform ${editable ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}
                                    style={{ backgroundColor: st.bg, color: st.color, border: `1.5px solid ${st.border}`, opacity: editable ? 1 : 0.8 }}>
                                    <StatusGlyph status={mark.status} />
                                    {mark.auto && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ backgroundColor: "#0e58a8" }} />}
                                  </button>
                                ) : (
                                  <span className="text-sm" style={{ color: "#cbd5e1" }}>·</span>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-2 py-1.5 text-center" style={{ borderLeft: "1px solid rgba(1,41,112,0.06)" }}>
                            <span className="inline-block min-w-[64px] text-xs font-bold px-2.5 py-1.5 rounded-[8px]"
                              style={weekMissed > 0
                                ? { backgroundColor: "#fee2e2", color: "#b91c1c", ...FONT }
                                : { backgroundColor: "#dcfce7", color: "#15803d", ...FONT }}>
                              {t("davomatHafta.hours", { n: weekMissed })}
                            </span>
                            {wh.excused > 0 && <div className="text-[10px] mt-0.5" style={{ color: "#b45309", ...FONT }}>{t("davomatHafta.excusedOf", { n: wh.excused })}</div>}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <span className="text-sm font-semibold" style={{ color: total > 0 ? "#b91c1c" : "#7293b9", ...FONT }}>
                              {t("davomatHafta.hours", { n: total })}
                            </span>
                            {s.totalExcusedHours > 0 && <div className="text-[10px]" style={{ color: "#b45309", ...FONT }}>{t("davomatHafta.excusedOf", { n: s.totalExcusedHours })}</div>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {(editableDays.length > 0 || msg) && students.length > 0 && (
              <div className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap" style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
                <span className="text-sm" style={{ color: msg?.ok ? "#15803d" : "#b91c1c", ...FONT }}>{msg?.text}</span>
                {editableDays.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap ml-auto">
                    <button
                      onClick={markAllPresent}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium"
                      style={{ backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid rgba(21,128,61,0.25)", ...FONT }}>
                      <CheckCheck className="w-4 h-4" />
                      {t("davomatHafta.markAll")}
                    </button>
                    <button
                      onClick={openSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-medium disabled:opacity-50"
                      style={{ backgroundColor: "#0e58a8", color: "#fff", ...FONT }}>
                      <Save className="w-4 h-4" />
                      {t("davomatHafta.saveBtn")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Oldingi sanalar — bosilsa o'sha hafta ochiladi */}
      {groupId !== "" && subjectName && (
        <div className="bg-white rounded-[12px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
            <History className="w-4 h-4" style={{ color: "#0e58a8" }} />
            <span className="text-sm font-semibold" style={{ color: "#012970", ...FONT }}>{t("oqBaholash.previousDates")}</span>
            <button onClick={() => refetchHistory()} className="ml-auto" title={t("oqBaholash.refresh")}>
              <RefreshCw className="w-4 h-4" style={{ color: "#7293b9" }} />
            </button>
          </div>
          {lHistory ? (
            <div className="px-5 py-6"><Loading /></div>
          ) : history.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm" style={{ color: "#7293b9", ...FONT }}>{t("oqBaholash.noRecordsYet")}</div>
          ) : (
            <div className="divide-y max-h-[360px] overflow-y-auto" style={{ borderColor: "rgba(1,41,112,0.06)" }}>
              {history.map((h) => {
                const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, excused: 0, late: 0 }
                h.records.forEach((r) => { counts[r.status]++ })
                return (
                  <button
                    key={`${h.lessonDate}-${h.subjectName}-${h.trainingType ?? ""}`}
                    onClick={() => guard(() => {
                      const type = normalizeTrainingType(h.trainingType)
                      if (type) setTrainingType(type)
                      setWeekStart(mondayOf(h.lessonDate))
                      resetWeek()
                    })}
                    className="w-full text-left px-5 py-3 flex items-center gap-3 flex-wrap hover:bg-[#f6f9ff]/50 transition-colors">
                    <span className="text-sm font-medium w-28 shrink-0" style={{ color: "#012970", ...FONT }}>{fmtDay(h.lessonDate)}</span>
                    {h.trainingType && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: "#eef4ff", color: "#0e58a8", ...FONT }}>
                        {typeLabel(h.trainingType)}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(counts) as AttendanceStatus[]).map((k) => counts[k] > 0 && (
                        <span key={k} className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: STATUS_STYLE[k].bg, color: STATUS_STYLE[k].color, ...FONT }}>
                          {statusLabel(k)}: {counts[k]}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Katak ustidagi ma'lumot (fixed — jadval aylantirgichi kesib qo'ymasin) */}
      {tip && (
        <div className="fixed z-[60] pointer-events-none rounded-[10px] px-3 py-2 text-xs flex flex-col gap-0.5 max-w-[260px]"
          style={{ left: tip.x, top: tip.y - 8, transform: "translate(-50%, -100%)", backgroundColor: "#fff", color: "#012970",
            border: "1px solid rgba(1,41,112,0.15)", boxShadow: "0 10px 24px -8px rgba(1,41,112,0.35)", ...FONT }}>
          {tip.lines.map((l, i) => <span key={i} className={i === 0 ? "font-semibold" : ""}>{l}</span>)}
        </div>
      )}

      {excuse && (
        <ExcuseModal
          value={excuse}
          onChange={setExcuse}
          onCancel={() => setExcuse(null)}
          onSave={() => {
            setMark(excuse.date, excuse.studentUserId, { status: "excused", comment: composeExcuse(excuse.reason, excuse.note) })
            setExcuse(null)
          }}
        />
      )}

      {saveOpen && (
        <SaveModal
          days={editableDays}
          selected={saveDays}
          onToggle={(date) => setSaveDays((prev) => { const n = new Set(prev); if (n.has(date)) n.delete(date); else n.add(date); return n })}
          countsOf={(date) => {
            const marks = Object.values(drafts[date] ?? {})
            return { absent: marks.filter((m) => m.status === "absent").length, excused: marks.filter((m) => m.status === "excused").length }
          }}
          dirty={dirtyDays}
          saving={saving}
          onCancel={() => setSaveOpen(false)}
          onSave={handleSave}
        />
      )}

      {requestDay && groupId !== "" && (
        <EditRequestModal
          day={requestDay}
          groupId={groupId}
          subjectName={subjectName}
          trainingType={trainingType}
          typeLabel={typeLabel(trainingType)}
          onClose={() => setRequestDay(null)}
          onSent={() => { void loadWeek(true) }}
        />
      )}
    </div>
  )
}

/* ── Sababli: sabab va izoh ─────────────────────────────────────────── */
function ExcuseModal({ value, onChange, onCancel, onSave }: {
  value: { date: string; studentUserId: number; name: string; reason: string; note: string }
  onChange: (v: { date: string; studentUserId: number; name: string; reason: string; note: string }) => void
  onCancel: () => void
  onSave: () => void
}) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(1,41,112,0.35)" }} onClick={onCancel}>
      <div className="bg-white rounded-[14px] w-full max-w-md p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="excuse-title">
        <div className="flex items-start justify-between gap-3">
          <h2 id="excuse-title" className="text-lg font-semibold flex items-center gap-2" style={{ color: "#012970", ...FONT }}>
            <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#dc2626" }}>
              <X className="w-4 h-4 text-white" strokeWidth={3} />
            </span>
            {t("davomatHafta.excuse.title")}
          </h2>
          <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-[#f0f5ff]" aria-label={t("davomatHafta.close")}>
            <X className="w-5 h-5" style={{ color: "#7293b9" }} />
          </button>
        </div>
        <div className="text-sm font-medium flex flex-col gap-0.5" style={{ color: "#012970", ...FONT }}>
          <span>{t("davomatHafta.excuse.student", { name: value.name })}</span>
          <span>{t("davomatHafta.excuse.date", { date: `${fmtDay(value.date)} (${t(`davomatHafta.wd.${weekdayIndex(value.date)}`)})` })}</span>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold mb-1" style={{ color: "#012970", ...FONT }}>{t("davomatHafta.excuse.choose")}</legend>
          {EXCUSE_REASONS.map((r) => (
            <label key={r.value} className="relative flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: "#012970", ...FONT }}>
              <input type="radio" name="excuse-reason" checked={value.reason === r.value}
                onChange={() => onChange({ ...value, reason: r.value })} className="w-4 h-4" style={{ accentColor: "#0e58a8" }} />
              {t(r.key)}
            </label>
          ))}
        </fieldset>
        <div>
          <label className={labelCls} style={{ color: "#012970", ...FONT }}>{t("davomatHafta.excuse.note")}</label>
          <textarea value={value.note} onChange={(e) => onChange({ ...value, note: e.target.value })} rows={3} maxLength={500}
            placeholder={t("davomatHafta.excuse.notePh")} className={`${inputCls} resize-y`} style={{ color: "#012970", ...FONT }} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2.5 rounded-[8px] text-sm font-medium"
            style={{ color: "#0e58a8", backgroundColor: "#eef4ff", ...FONT }}>
            {t("davomatJurnaliOq.cancel")}
          </button>
          <button onClick={onSave} autoFocus className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-medium"
            style={{ backgroundColor: "#0e58a8", color: "#fff", ...FONT }}>
            <Check className="w-4 h-4" />
            {t("davomatHafta.excuse.save")}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Saqlash: qaysi kunlar saqlanadi (dars bo'lmagan kunni olib tashlash mumkin) ── */
function SaveModal({ days, selected, onToggle, countsOf, dirty, saving, onCancel, onSave }: {
  days: AttendanceWeekDay[]
  selected: Set<string>
  onToggle: (date: string) => void
  countsOf: (date: string) => { absent: number; excused: number }
  dirty: Set<string>
  saving: boolean
  onCancel: () => void
  onSave: () => void
}) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(1,41,112,0.35)" }}>
      <div className="bg-white rounded-[14px] w-full max-w-md p-6 flex flex-col gap-4" role="dialog" aria-modal="true" aria-labelledby="save-title">
        <div className="flex items-start justify-between gap-3">
          <h2 id="save-title" className="text-lg font-semibold flex items-center gap-2" style={{ color: "#012970", ...FONT }}>
            <Save className="w-5 h-5" style={{ color: "#0e58a8" }} />
            {t("davomatHafta.save.title")}
          </h2>
          <button onClick={onCancel} disabled={saving} className="p-1.5 rounded-full hover:bg-[#f0f5ff]" aria-label={t("davomatHafta.close")}>
            <X className="w-5 h-5" style={{ color: "#7293b9" }} />
          </button>
        </div>
        <p className="text-xs" style={{ color: "#445b7a", ...FONT }}>{t("davomatHafta.save.hint")}</p>
        {days.length === 0 ? (
          <p className="text-sm" style={{ color: "#7293b9", ...FONT }}>{t("davomatHafta.save.none")}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {days.map((d) => {
              const c = countsOf(d.date)
              const on = selected.has(d.date)
              return (
                <label key={d.date} className="relative flex items-center gap-3 px-3 py-2.5 rounded-[8px] cursor-pointer"
                  style={{ border: `1px solid ${on ? "#0e58a8" : "#d8e6f7"}`, backgroundColor: on ? "#f5f9ff" : "#fff" }}>
                  <input type="checkbox" checked={on} onChange={() => onToggle(d.date)} className="w-4 h-4" style={{ accentColor: "#0e58a8" }} />
                  <span className="flex-1 flex flex-col" style={FONT}>
                    <span className="text-sm font-semibold" style={{ color: "#012970" }}>
                      {t(`davomatHafta.wd.${weekdayIndex(d.date)}`)}, {fmtDay(d.date)}
                    </span>
                    <span className="text-xs" style={{ color: c.absent + c.excused ? "#b91c1c" : "#15803d" }}>
                      {t("davomatHafta.save.dayLine", { absent: c.absent, excused: c.excused })}
                    </span>
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={d.saved
                    ? { color: "#15803d", backgroundColor: "#f0fdf4", ...FONT }
                    : { color: "#b45309", backgroundColor: "#fffbeb", ...FONT }}>
                    {d.saved ? t("davomatHafta.day.approved") : t("davomatHafta.day.unsaved")}{d.saved && dirty.has(d.date) ? " ✎" : ""}
                  </span>
                </label>
              )
            })}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} disabled={saving} className="px-4 py-2.5 rounded-[8px] text-sm font-medium"
            style={{ color: "#445b7a", border: "1px solid #d8e6f7", ...FONT }}>
            {t("davomatJurnaliOq.cancel")}
          </button>
          <button onClick={onSave} disabled={saving || selected.size === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "#15803d", color: "#fff", ...FONT }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t("davomatHafta.save.confirm", { n: selected.size })}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Saqlangan (qulflangan) kun: adminga o'zgartirish so'rovi ─────────── */
function EditRequestModal({ day, groupId, subjectName, trainingType, typeLabel, onClose, onSent }: {
  day: AttendanceWeekDay
  groupId: number
  subjectName: string
  trainingType: string
  typeLabel: string
  onClose: () => void
  onSent: () => void
}) {
  const { t } = useLanguage()
  const [reason, setReason] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const req = day.editRequest
  const label = trainingType ? `${fmtDay(day.date)} (${typeLabel})` : fmtDay(day.date)

  async function send() {
    if (!reason.trim()) return
    setSending(true)
    setResult(null)
    try {
      await attendanceApi.requestEdit({ groupId, subjectName, date: day.date, trainingType: trainingType || undefined, reason: reason.trim() })
      setResult({ ok: true, text: t("davomatJurnaliOq.requestSent") })
      setReason("")
      onSent()
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : t("oqBaholash.error") })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(1,41,112,0.35)" }} onClick={onClose}>
      <div className="bg-white rounded-[14px] w-full max-w-md p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="req-title">
        <div className="flex items-start justify-between gap-3">
          <h2 id="req-title" className="text-lg font-semibold flex items-center gap-2" style={{ color: "#012970", ...FONT }}>
            <Lock className="w-5 h-5" style={{ color: "#92400e" }} />
            {t("davomatHafta.request.title", { date: fmtDay(day.date) })}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#f0f5ff]" aria-label={t("davomatHafta.close")}>
            <X className="w-5 h-5" style={{ color: "#7293b9" }} />
          </button>
        </div>
        <p className="text-sm" style={{ color: "#92400e", ...FONT }}>{t("davomatJurnaliOq.lockedNotice", { date: label })}</p>

        {result?.ok || req?.status === "pending" ? (
          <div className="flex items-start gap-2 text-xs px-3 py-2 rounded-[8px]" style={{ color: "#0e58a8", backgroundColor: "#f0f7ff", border: "1px solid rgba(14,88,168,0.15)", ...FONT }}>
            <Clock className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>
              {result?.ok ? result.text : t("davomatJurnaliOq.pendingNotice", { date: fmtDateTime(req!.createdAt) })}
              {req?.status === "pending" && <span className="block mt-0.5" style={{ color: "#7293b9" }}>{t("davomatJurnaliOq.yourReason", { reason: req.reason })}</span>}
            </span>
          </div>
        ) : (
          <>
            {req?.status === "rejected" && (
              <div className="text-xs px-3 py-2 rounded-[8px]" style={{ color: "#b91c1c", backgroundColor: "#fef2f2", ...FONT }}>
                {t("davomatJurnaliOq.rejectedNotice")}
                {req.adminNote && <span className="block mt-0.5" style={{ color: "#7293b9" }}>{t("davomatJurnaliOq.adminNote", { note: req.adminNote })}</span>}
              </div>
            )}
            <div>
              <label className={labelCls} style={{ color: "#012970", ...FONT }}>{t("davomatJurnaliOq.reasonLabel")}</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000}
                placeholder={t("davomatJurnaliOq.reasonPlaceholder")} className={`${inputCls} resize-y`} style={{ color: "#012970", ...FONT }} />
            </div>
            {result && !result.ok && <span className="text-xs" style={{ color: "#b91c1c", ...FONT }}>{result.text}</span>}
          </>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-[8px] text-sm font-medium"
            style={{ color: "#445b7a", border: "1px solid #d8e6f7", ...FONT }}>
            {t("davomatHafta.close")}
          </button>
          {!result?.ok && req?.status !== "pending" && (
            <button onClick={send} disabled={sending || !reason.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "#92400e", color: "#fff", ...FONT }}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t("davomatJurnaliOq.sendRequest")}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
