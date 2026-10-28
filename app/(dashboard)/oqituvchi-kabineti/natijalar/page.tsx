"use client"

import { Fragment, useMemo, useState, useCallback, useRef } from "react"
import { Users, BarChart3, BookOpen, CheckCircle, Download, RefreshCw, Bell, Send, X, ChevronDown, ChevronRight, Info } from "lucide-react"
import {
  teachingApi,
  type JournalTopic,
  type JournalStudent,
  type JournalScale,
  type JournalMiColumn,
  type JournalData,
  type PeriodSource,
} from "@/lib/api"
import { GradeBreakdown } from "@/components/teaching/GradeBreakdown"
import { journalLayout, studentTotals, fmtBall, PASS_BALL } from "@/lib/gradeTotals"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

/* ─── Rang yordamchi ─────────────────────────────────────────────────── */
function pctColor(pct: number | null): string {
  if (pct === null) return "#94a3b8"
  if (pct >= 86) return "#15803d"
  if (pct >= 71) return "#16a34a"
  if (pct >= 56) return "#d97706"
  return "#b91c1c"
}
function pctBg(pct: number | null): string {
  if (pct === null) return "transparent"
  if (pct >= 71) return "rgba(21,128,61,0.09)"
  if (pct >= 56) return "rgba(217,119,6,0.09)"
  return "rgba(185,28,28,0.09)"
}

/* ─── Mavzu score cell ───────────────────────────────────────────────── */
function TopicCell({ score, max }: { score: number | null; max: number }) {
  if (score === null)
    return (
      <td className="text-center px-1 py-2 border-r border-[rgba(1,41,112,0.06)]">
        <span style={{ color: "#d1d5db", fontSize: 13 }}>—</span>
      </td>
    )
  const effectiveMax = max > 0 ? max : 100
  const pct = Math.min(100, (score / effectiveMax) * 100)
  const c = pctColor(pct); const bg = pctBg(pct)
  return (
    <td className="text-center px-1 py-2 border-r border-[rgba(1,41,112,0.06)]">
      <span className="inline-block min-w-[32px] rounded-[4px] text-xs font-semibold px-1 py-0.5"
        style={{ color: c, backgroundColor: bg, fontFamily: "var(--font-poppins)" }}>
        {score}
      </span>
    </td>
  )
}

/* ─── Tahrirlash mumkin bo'lgan katak (ON1/ON2/YN) ──────────────────── */
function EditCell({
  value, onSave, maxVal = 100, source = null,
}: {
  value: number | null
  onSave: (v: number | null) => Promise<void>
  maxVal?: number
  /** Qiymat qayerdan: test / qo'lda / topshirmagan (0) — kichik belgi va izoh */
  source?: PeriodSource | null
}) {
  const { t } = useLanguage()
  const editHintCell = source ? `${t(`natijalarOq.source.${source}`)} — ${t("natijalarOq.editHintCell")}` : t("natijalarOq.editHintCell")
  const mark = source === "manual" ? "#7c3aed" : source === "absent" ? "#b91c1c" : null
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(value !== null ? String(value) : "")
    setEditing(true)
    setTimeout(() => ref.current?.select(), 30)
  }

  async function commit() {
    const parsed = draft.trim() === "" ? null : Number(draft.replace(",", "."))
    const val = parsed === null ? null : isNaN(parsed) ? value : Math.min(maxVal, Math.max(0, Math.round(parsed)))
    setEditing(false)
    if (val === value) return
    setSaving(true)
    await onSave(val).finally(() => setSaving(false))
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") commit()
    if (e.key === "Escape") setEditing(false)
  }

  const pct = value !== null && maxVal > 0 ? (value / maxVal) * 100 : null
  const c = pctColor(pct); const bg = pctBg(pct)

  return (
    <td className="text-center px-1 py-1.5 border-r border-[rgba(1,41,112,0.06)]"
      style={{ minWidth: 54 }}>
      {saving ? (
        <div className="w-3 h-3 border border-[#0e58a8] border-t-transparent rounded-full animate-spin mx-auto" />
      ) : editing ? (
        <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={onKey}
          className="w-12 text-center text-xs rounded-[4px] border border-[#0e58a8] outline-none px-1 py-0.5"
          style={{ fontFamily: "var(--font-poppins)", color: "#012970" }} />
      ) : (
        <span className="relative inline-block min-w-[32px] rounded-[4px] text-xs font-semibold px-1 py-0.5 cursor-pointer hover:ring-1 hover:ring-[#0e58a8] transition-all"
          style={{ color: value !== null ? c : "#94a3b8", backgroundColor: value !== null ? bg : "transparent", fontFamily: "var(--font-poppins)" }}
          onClick={startEdit}
          title={editHintCell}>
          {value !== null ? value : "—"}
          {mark && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: mark }} />}
        </span>
      )}
    </td>
  )
}

/* ─── Hisoblangan ball katagi (JN / Umumiy / Ball) ───────────────────── */
function BallCell({ value, max }: { value: number | null; max: number }) {
  if (value === null) return (
    <td className="text-center px-2 py-2 border-r border-[rgba(1,41,112,0.1)]">
      <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
    </td>
  )
  const pct = max > 0 ? (value / max) * 100 : 0
  const c = pctColor(pct); const bg = pctBg(pct)
  return (
    <td className="text-center px-2 py-2 border-r border-[rgba(1,41,112,0.1)]">
      <span className="inline-block px-1.5 py-0.5 rounded-[4px] text-xs font-bold"
        style={{ color: c, backgroundColor: bg, fontFamily: "var(--font-poppins)" }}>
        {value}
      </span>
    </td>
  )
}

/* ─── Baho katagi (5 / 4 / 3 / 2) ────────────────────────────────────── */
const BAHO_COLOR: Record<number, string> = { 5: "#15803d", 4: "#16a34a", 3: "#d97706", 2: "#b91c1c" }

function BahoCell({ value }: { value: number | null }) {
  return (
    <td className="text-center px-2 py-2 border-r border-[rgba(1,41,112,0.1)]">
      {value === null
        ? <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
        : <span className="text-sm font-bold" style={{ color: BAHO_COLOR[value], fontFamily: "var(--font-poppins)" }}>{value}</span>}
    </td>
  )
}

/* ─── Davomat cell ───────────────────────────────────────────────────── */
function AttCell({ pct }: { pct: number | null }) {
  if (pct === null) return (
    <td className="text-center px-2 py-2">
      <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
    </td>
  )
  const c = pct >= 75 ? "#15803d" : pct >= 60 ? "#d97706" : "#b91c1c"
  const bg = pct >= 75 ? "rgba(21,128,61,0.09)" : pct >= 60 ? "rgba(217,119,6,0.09)" : "rgba(185,28,28,0.09)"
  return (
    <td className="text-center px-2 py-2">
      <span className="inline-block px-1.5 py-0.5 rounded-[4px] text-xs font-semibold"
        style={{ color: c, backgroundColor: bg, fontFamily: "var(--font-poppins)" }}>
        {pct}%
      </span>
    </td>
  )
}

/* ─── Telegram xabar modal ───────────────────────────────────────────── */
function NotifyModal({
  student, subjectName, scale, onClose,
}: {
  student: { userId: number; fullName: string; jn: number | null; on1: number | null; on2: number | null; mi?: number | null; yn: number | null; attendancePct: number | null }
  subjectName: string
  scale: JournalScale
  onClose: () => void
}) {
  const { t } = useLanguage()
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  async function send() {
    if (!message.trim()) return
    setSending(true)
    setResult(null)
    try {
      const res = await teachingApi.notifyStudent({
        studentName: student.fullName,
        studentUserId: student.userId,
        message: message.trim(),
        stats: {
          subject: subjectName,
          jn: student.jn,
          on1: student.on1,
          on2: student.on2,
          mi: student.mi ?? null,
          yn: student.yn,
          attendance: student.attendancePct,
          scale,
        },
      })
      setResult({ ok: true, text: res.message || t("natijalarOq.sentDefault") })
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : t("natijalarOq.errorDefault") })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-[14px] bg-white p-6 flex flex-col gap-4 shadow-2xl"
        style={{ border: "1px solid rgba(1,41,112,0.12)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" style={{ color: "#0e58a8" }} />
            <span className="text-sm font-semibold" style={T}>{t("natijalarOq.telegramTitle")}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" style={{ color: "#94a3b8" }} />
          </button>
        </div>
        <div className="flex flex-col gap-1 p-3 rounded-[8px]" style={{ backgroundColor: "#f8fbff", border: "1px solid rgba(1,41,112,0.08)" }}>
          <div className="text-xs font-semibold" style={T}>{student.fullName}</div>
          <div className="text-xs flex flex-wrap gap-2 mt-1">
            {subjectName && <span style={L}>{subjectName}</span>}
            {student.jn != null && <span style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>JN: {student.jn}/{scale.jn}</span>}
            {student.on1 != null && <span style={{ color: "#7c3aed", fontFamily: "var(--font-poppins)" }}>ON1: {student.on1}/{scale.on1}</span>}
            {student.on2 != null && <span style={{ color: "#7c3aed", fontFamily: "var(--font-poppins)" }}>ON2: {student.on2}/{scale.on2}</span>}
            {student.mi != null && !!scale.mi && <span style={{ color: "#9333ea", fontFamily: "var(--font-poppins)" }}>MI: {student.mi}/{scale.mi}</span>}
            {student.yn  != null && <span style={{ color: "#0891b2", fontFamily: "var(--font-poppins)" }}>YN: {student.yn}/{scale.yn}</span>}
            {student.attendancePct != null && <span style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>{t("natijalarOq.attendanceLabel")}: {student.attendancePct}%</span>}
          </div>
        </div>
        <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)}
          placeholder={t("natijalarOq.messagePlaceholder")}
          className="w-full rounded-[8px] p-3 text-sm resize-none outline-none"
          style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
        {result && (
          <div className="text-xs px-3 py-2 rounded-[6px]"
            style={{ backgroundColor: result.ok ? "#f0fdf4" : "#fef2f2", color: result.ok ? "#15803d" : "#b91c1c", fontFamily: "var(--font-poppins)" }}>
            {result.text}
          </div>
        )}
        <button onClick={send} disabled={sending || !message.trim()}
          className="flex items-center justify-center gap-2 py-2.5 rounded-[8px] text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? t("natijalarOq.sending") : t("natijalarOq.sendToTelegram")}
        </button>
      </div>
    </div>
  )
}

/* ─── Asosiy jurnal jadvali ──────────────────────────────────────────── */
function GradeJournal({
  topics, students, scale, miColumns, periodItems, untypedTopicCount, groupId, subjectName, onRefresh, refreshing,
}: {
  topics: JournalTopic[]
  students: JournalStudent[]
  scale: JournalScale
  miColumns: JournalMiColumn[]
  periodItems: JournalData["periodItems"]
  untypedTopicCount: number
  groupId: number
  subjectName: string
  onRefresh: () => void
  refreshing: boolean
}) {
  const { t } = useLanguage()
  const [overrides, setOverrides] = useState<Record<string, number | null>>({})
  const [notifyStudent, setNotifyStudent] = useState<JournalStudent | null>(null)
  // Bosilgan talaba qatori ostida batafsil baholar ochiladi
  const [openId, setOpenId] = useState<number | null>(null)

  // Jurnal tuzilishi (lib/gradeTotals.ts): Ma'ruza = ON1 + ON2 + ma'ruzadan
  // mustaqil ishlar (/35), Amaliyot = JN + amaliyotdan mustaqil ishlar (/35),
  // Joriy (/70), Yakuniy (/30), Ball (/100), Baho.
  const layout = journalLayout(scale, miColumns)
  const { lectureMi, practiceMi, lectureMax, practiceMax, joriyMax, ballMax, lectureFree } = layout
  const lectureOnPoints = scale.on1 + scale.on2
  const lectureMiPoints = lectureMi.reduce((a, c) => a + c.points, 0)
  const practiceMiPoints = practiceMi.reduce((a, c) => a + c.points, 0)

  function getVal(userId: number, field: "on1" | "on2" | "yn", s: JournalStudent): number | null {
    const k = `${userId}:${field}`
    return k in overrides ? overrides[k] : s[field]
  }
  function getSource(userId: number, field: "on1" | "on2" | "yn", s: JournalStudent): PeriodSource | null {
    const k = `${userId}:${field}`
    if (k in overrides) return overrides[k] === null ? null : "manual"
    return s.periodSource?.[field] ?? null
  }

  function totals(s: JournalStudent) {
    return studentTotals(layout, s, {
      on1: getVal(s.userId, "on1", s), on2: getVal(s.userId, "on2", s), yn: getVal(s.userId, "yn", s),
    })
  }

  // Katakka ball (masalan 0-17) kiritiladi, bazada esa foiz saqlanadi —
  // imtihondan avtomatik kelgan ON/YN bilan bir xil ko'rinishda.
  // Qo'lda yozilgan baho test natijasidan ustun turadi (testdan keyin yozilgan
  // bo'lsa). Bo'shatilsa — test natijasi qaytadi, shuning uchun jurnal yangilanadi.
  const save = useCallback(async (
    userId: number, gradeType: "ON1" | "ON2" | "YN", val: number | null
  ) => {
    const key = `${userId}:${gradeType.toLowerCase()}`
    setOverrides(prev => ({ ...prev, [key]: val }))
    const max = gradeType === "ON1" ? scale.on1 : gradeType === "ON2" ? scale.on2 : scale.yn
    const pct = val === null ? null : Math.round((val / max) * 1000) / 10
    try {
      await teachingApi.savePeriodGrade({ groupId, subjectName, studentUserId: userId, gradeType, grade: pct })
      if (val === null) {
        setOverrides(prev => { const next = { ...prev }; delete next[key]; return next })
        onRefresh()
      }
    } catch (err) {
      setOverrides(prev => { const next = { ...prev }; delete next[key]; return next })
      alert(err instanceof Error ? err.message : t("natijalarOq.saveError"))
    }
  }, [groupId, subjectName, scale, onRefresh, t])

  const passed = students.filter(s => (totals(s).ball ?? 0) >= PASS_BALL).length

  const withJn = students.filter(s => s.jn !== null)
  const avgJn = withJn.length
    ? `${Math.round(withJn.reduce((sum, s) => sum + (s.jn ?? 0), 0) / withJn.length)}/${scale.jn}`
    : "—"

  function exportCsv() {
    const header = [
      "#", t("natijalarOq.csvStudent"),
      `ON1 (/${scale.on1})`, `ON2 (/${scale.on2})`,
      ...lectureMi.map(c => `${c.label} (/${c.points})`),
      `${t("natijalarOq.colLecture")} (/${lectureMax})`,
      ...topics.map(tp => t("natijalarOq.csvTopicCol", { n: tp.idx })),
      `JN (/${scale.jn})`,
      ...practiceMi.map(c => `${c.label} (/${c.points})`),
      `${t("natijalarOq.colPractice")} (/${practiceMax})`,
      `${t("natijalarOq.colJoriy")} (/${joriyMax})`, `YN (/${scale.yn})`, `${t("natijalarOq.colBall")} (/${ballMax})`,
      t("natijalarOq.colBaho"),
      t("natijalarOq.csvAttendancePct"),
    ]
    const rows = students.map((s, i) => {
      const r = totals(s)
      return [
        i + 1,
        s.fullName,
        r.on1 ?? "", r.on2 ?? "", ...lectureMi.map(c => r.mi(c) ?? ""), r.lecture ?? "",
        ...topics.map(tp => s.topicPoints?.[tp.key] ?? s.topicScores[tp.key] ?? ""),
        s.jn ?? "", ...practiceMi.map(c => r.mi(c) ?? ""), r.practice ?? "",
        r.joriy ?? "", r.yn ?? "", r.ball ?? "", r.baho ?? "",
        s.attendancePct !== null ? `${s.attendancePct}%` : "",
      ]
    })
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url
    a.download = `jurnal_${subjectName}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const colTh = (col: { key: string; label: string; title?: string; bg: string; br: string }) => (
    <th key={col.key} title={col.title} className="px-2 py-2 text-center text-[10px] font-semibold"
      style={{ ...T, minWidth: 50, backgroundColor: col.bg, borderRight: `1px solid ${col.br}` }}>
      {col.label}
    </th>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Stat kartalar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Users className="w-5 h-5" style={{ color: "#0e58a8" }} />, val: students.length, label: t("natijalarOq.totalStudents"), bg: "#eef4ff" },
          { icon: <BarChart3 className="w-5 h-5" style={{ color: "#15803d" }} />, val: avgJn, label: t("natijalarOq.avgJn"), bg: "#f0fdf4" },
          { icon: <BookOpen className="w-5 h-5" style={{ color: "#d97706" }} />, val: topics.length, label: t("natijalarOq.practiceTopicsCount"), bg: "#fffbeb" },
          { icon: <CheckCircle className="w-5 h-5" style={{ color: "#7c3aed" }} />, val: `${passed}/${students.length}`, label: t("natijalarOq.passed"), bg: "#f5f3ff" },
        ].map(c => (
          <div key={c.label} className="rounded-[10px] bg-white p-4 flex items-center gap-3"
            style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
            <div className="p-2 rounded-[8px]" style={{ backgroundColor: c.bg }}>{c.icon}</div>
            <div>
              <div className="text-lg font-bold" style={T}>{c.val}</div>
              <div className="text-xs" style={L}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Ball taqsimoti — o'qituvchi qo'ygan ballardan avtomatik */}
      <div className="flex items-start gap-3 text-xs px-4 py-3 rounded-[10px]"
        style={{ backgroundColor: "#f0f7ff", color: "#012970", border: "1px solid rgba(14,88,168,0.15)", fontFamily: "var(--font-poppins)" }}>
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#0e58a8" }} />
        <div className="flex flex-col gap-0.5">
          <span>{t("natijalarOq.splitLecture", { total: fmtBall(lectureMax), on: fmtBall(lectureOnPoints), mi: fmtBall(lectureMiPoints) })}</span>
          <span>{topics.length > 0
            ? t("natijalarOq.splitPractice", { total: fmtBall(practiceMax), mi: fmtBall(practiceMiPoints), jn: fmtBall(scale.jn), count: topics.length, each: fmtBall(topics[0].points ?? scale.jn / topics.length) })
            : t("natijalarOq.splitPracticeNoTopics", { total: fmtBall(practiceMax), mi: fmtBall(practiceMiPoints), jn: fmtBall(scale.jn) })}</span>
        </div>
      </div>

      {(topics.length === 0 || untypedTopicCount > 0 || lectureFree > 0) && (
        <div className="flex flex-col gap-1 text-xs px-4 py-3 rounded-[10px]"
          style={{ backgroundColor: "#fff7ed", color: "#92400e", border: "1px solid rgba(146,64,14,0.15)", fontFamily: "var(--font-poppins)" }}>
          {lectureFree > 0 && <span>{t("natijalarOq.lectureFree", { n: lectureFree, total: lectureMax })}</span>}
          {topics.length === 0 && <span>{t("natijalarOq.noPracticeTopics")}</span>}
          {untypedTopicCount > 0 && <span>{t("natijalarOq.untypedTopics", { n: untypedTopicCount })}</span>}
        </div>
      )}

      {/* Jadval */}
      <div className="rounded-[10px] bg-white overflow-hidden"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
        <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2"
          style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <div>
            <span className="text-sm font-semibold" style={T}>{t("natijalarOq.journalTitle")}</span>
            <span className="ml-2 text-xs" style={L}>{t("natijalarOq.journalHint", { jn: scale.jn })}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors hover:bg-[#eef4ff]"
              style={{ border: "1px solid rgba(14,88,168,0.25)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              <Download className="w-3.5 h-3.5" /> {t("natijalarOq.export")}
            </button>
            <button onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors hover:bg-[#f0fdf4]"
              style={{ border: "1px solid rgba(21,128,61,0.25)", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> {t("natijalarOq.refresh")}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse">
            <thead>
              {/* 1-qator: bo'lim sarlavhalari */}
              <tr style={{ backgroundColor: "#e8f0fe", borderBottom: "1px solid rgba(1,41,112,0.12)" }}>
                <th rowSpan={2} className="sticky left-0 z-20 px-3 py-2 text-left text-xs font-semibold"
                  style={{ ...T, backgroundColor: "#e8f0fe", minWidth: 190, borderRight: "2px solid rgba(1,41,112,0.15)" }}>
                  {t("natijalarOq.colStudent")}
                </th>
                {[
                  { label: t("natijalarOq.colLecture"),  span: 3 + lectureMi.length, bg: "#fef9c3" },
                  // Amaliy mavzular (har birining JN'dagi bali) — ma'ruzadan keyin, amaliyot jamidan oldin
                  ...(topics.length ? [{ label: t("natijalarOq.colPracticeTopics"), span: topics.length, bg: "#dbeafe" }] : []),
                  { label: t("natijalarOq.colPractice"), span: 2 + practiceMi.length, bg: "#dcfce7" },
                  { label: t("natijalarOq.colJoriy"),    span: 1, bg: "#e0e7ff" },
                  { label: t("natijalarOq.colYn"),       span: 1, bg: "#fce7f3" },
                  { label: t("natijalarOq.colBall"),     span: 1, bg: "#ede9fe" },
                  { label: t("natijalarOq.colBaho"),     span: 1, bg: "#f5f3ff" },
                  { label: t("natijalarOq.colAttendance"), span: 2, bg: "#f0fdf4" },
                ].map(g => (
                  <th key={g.label} colSpan={g.span} className="px-2 py-1.5 text-center text-xs font-semibold"
                    style={{ ...T, borderRight: "1px solid rgba(1,41,112,0.12)", backgroundColor: g.bg }}>
                    {g.label}
                  </th>
                ))}
              </tr>
              {/* 2-qator: har bir ustun */}
              <tr style={{ backgroundColor: "#f0f5ff", borderBottom: "2px solid rgba(1,41,112,0.12)" }}>
                {[
                  { key: "on1",   label: `ON1 /${scale.on1}`,   bg: "#fefce8", br: "rgba(1,41,112,0.08)" },
                  { key: "on2",   label: `ON2 /${scale.on2}`,   bg: "#fefce8", br: "rgba(1,41,112,0.08)" },
                  ...lectureMi.map(c => ({ key: `mi-${c.id}`, label: `${c.label} /${c.points}`, title: c.title, bg: "#fefce8", br: "rgba(1,41,112,0.08)" })),
                  { key: "lecture", label: `${t("natijalarOq.colPartTotal")} /${lectureMax}`, bg: "#fef9c3", br: "rgba(1,41,112,0.15)" },
                ].map(colTh)}
                {topics.map(tp => (
                  <th key={tp.key}
                    className="px-1 py-2 text-center text-[10px] font-semibold"
                    style={{ ...T, minWidth: 52, maxWidth: 70, borderRight: "1px solid rgba(1,41,112,0.08)", backgroundColor: "#f0f5ff" }}
                    title={tp.title}>
                    <div className="font-semibold">{t("natijalarOq.topicN", { n: tp.idx })}</div>
                    {tp.points != null ? (
                      <div className="font-normal" style={L}>/{fmtBall(tp.points)}</div>
                    ) : tp.maxScore > 0 && (
                      <div className="font-normal" style={L}>/{tp.maxScore}</div>
                    )}
                  </th>
                ))}
                {[
                  { key: "jn",    label: `JN /${scale.jn}`,     bg: "#f0fdf4", br: "rgba(1,41,112,0.08)" },
                  ...practiceMi.map(c => ({ key: `mi-${c.id}`, label: `${c.label} /${c.points}`, title: c.title, bg: "#f0fdf4", br: "rgba(1,41,112,0.08)" })),
                  { key: "practice", label: `${t("natijalarOq.colPartTotal")} /${practiceMax}`, bg: "#dcfce7", br: "rgba(1,41,112,0.15)" },
                  { key: "joriy", label: `/${joriyMax}`,        bg: "#eef2ff", br: "rgba(1,41,112,0.12)" },
                  { key: "yn",    label: `/${scale.yn}`,        bg: "#fdf2f8", br: "rgba(1,41,112,0.12)" },
                  { key: "ball",  label: `/${ballMax}`,         bg: "#f5f3ff", br: "rgba(1,41,112,0.12)" },
                  { key: "baho",  label: "2–5",                 bg: "#f5f3ff", br: "rgba(1,41,112,0.12)" },
                  { key: "att",   label: t("natijalarOq.colAttendanceShort"), bg: "#f0fdf4", br: "rgba(1,41,112,0.08)" },
                  { key: "bell",  label: "📣",                  bg: "#fff7ed", br: "transparent" },
                ].map(colTh)}
              </tr>
            </thead>

            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={topics.length + 12 + lectureMi.length + practiceMi.length} className="px-4 py-14 text-center text-sm" style={L}>
                  {t("natijalarOq.noResults")}
                </td></tr>
              ) : students.map((s, idx) => {
                const r = totals(s)
                const open = openId === s.userId
                return (
                <Fragment key={s.userId}>
                <tr className="hover:bg-[#f8faff]"
                  style={{ borderBottom: "1px solid rgba(1,41,112,0.05)" }}>
                  {/* Talaba ismi — sticky; bosilsa batafsil baholari ochiladi */}
                  <td className="sticky left-0 z-10 px-3 py-2 bg-white cursor-pointer"
                    style={{ borderRight: "2px solid rgba(1,41,112,0.1)" }}
                    onClick={() => setOpenId(open ? null : s.userId)} title={t("natijalarOq.showDetails")}>
                    <div className="flex items-center gap-2">
                      {open
                        ? <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "#0e58a8" }} />
                        : <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "#7293b9" }} />}
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                        style={{ backgroundColor: "#eef4ff", color: "#0e58a8" }}>{idx + 1}</span>
                      <div>
                        <div className="text-xs font-medium" style={T}>{s.fullName}</div>
                        {s.studentIdNumber && <div className="text-[10px]" style={L}>{s.studentIdNumber}</div>}
                      </div>
                    </div>
                  </td>

                  {/* Ma'ruza: ON1, ON2, ma'ruzadan mustaqil ishlar, jami */}
                  <EditCell value={r.on1} maxVal={scale.on1} source={getSource(s.userId, "on1", s)} onSave={v => save(s.userId, "ON1", v)} />
                  <EditCell value={r.on2} maxVal={scale.on2} source={getSource(s.userId, "on2", s)} onSave={v => save(s.userId, "ON2", v)} />
                  {lectureMi.map(c => <BallCell key={c.id} value={r.mi(c)} max={c.points} />)}
                  <BallCell value={r.lecture} max={lectureMax} />

                  {/* Amaliy topshiriqlar — har birining JN'dagi bali (ulush × foiz) */}
                  {topics.map(tp => (
                    <TopicCell key={tp.key}
                      score={s.topicPoints ? s.topicPoints[tp.key] ?? null : s.topicScores[tp.key] ?? null}
                      max={tp.points ?? tp.maxScore} />
                  ))}

                  {/* Amaliyot: JN, amaliyotdan mustaqil ishlar, jami */}
                  <BallCell value={s.jn} max={scale.jn} />
                  {practiceMi.map(c => <BallCell key={c.id} value={r.mi(c)} max={c.points} />)}
                  <BallCell value={r.practice} max={practiceMax} />

                  {/* Joriy = Ma'ruza + Amaliyot */}
                  <BallCell value={r.joriy} max={joriyMax} />

                  {/* YN */}
                  <EditCell value={r.yn} maxVal={scale.yn} source={getSource(s.userId, "yn", s)} onSave={v => save(s.userId, "YN", v)} />

                  {/* Ball = Joriy + YN, va baho */}
                  <BallCell value={r.ball} max={ballMax} />
                  <BahoCell value={r.baho} />

                  {/* Davomat */}
                  <AttCell pct={s.attendancePct} />

                  {/* Bell */}
                  <td className="text-center px-2 py-2" style={{ backgroundColor: "#fff7ed" }}>
                    <button
                      onClick={() => setNotifyStudent(s)}
                      className="w-7 h-7 rounded-full flex items-center justify-center mx-auto hover:bg-orange-100 transition-colors"
                      title={t("natijalarOq.sendMessage")}>
                      <Bell className="w-3.5 h-3.5" style={{ color: "#ea580c" }} />
                    </button>
                  </td>
                </tr>
                {open && (
                  <tr style={{ backgroundColor: "#f8faff", borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                    <td colSpan={topics.length + 12 + lectureMi.length + practiceMi.length} className="p-3">
                      <div className="sticky left-3" style={{ maxWidth: "min(1200px, calc(100vw - 120px))" }}>
                        <GradeBreakdown data={{ topics, scale, miColumns, periodItems }} student={s}
                          values={{ on1: r.on1, on2: r.on2, yn: r.yn }} />
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

        <div className="px-4 py-2.5 flex items-center justify-between text-xs"
          style={{ borderTop: "1px solid rgba(1,41,112,0.08)", ...L }}>
          <span>{t("natijalarOq.totalCount", { n: students.length })}</span>
          <span style={{ color: "#0e58a8" }}>{t("natijalarOq.editHint")}</span>
        </div>
        <div className="px-4 pb-2.5 flex items-center gap-4 flex-wrap text-[11px]" style={L}>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#7c3aed" }} />{t("natijalarOq.source.manual")}</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#b91c1c" }} />{t("natijalarOq.source.absent")}</span>
          <span>{t("natijalarOq.source.legend")}</span>
        </div>
      </div>

      {notifyStudent && (
        <NotifyModal
          student={{ ...notifyStudent, on1: getVal(notifyStudent.userId, "on1", notifyStudent), on2: getVal(notifyStudent.userId, "on2", notifyStudent), yn: getVal(notifyStudent.userId, "yn", notifyStudent) }}
          subjectName={subjectName}
          scale={scale}
          onClose={() => setNotifyStudent(null)}
        />
      )}
    </div>
  )
}

/* ─── Sahifa ─────────────────────────────────────────────────────────── */
// Backend shkalani har doim yuboradi; bu faqat eski javob kelib qolsa
const DEFAULT_SCALE: JournalScale = { jn: 35, on1: 17, on2: 18, yn: 30 }

export default function NatijalarPage() {
  const { t } = useLanguage()
  const { data: groupsRes, loading: lGroups, error: eGroups } = useApi(() => teachingApi.groups(), [])

  const groups = groupsRes?.data ?? []

  const [groupId, setGroupId]       = useState<number | "">("")
  const [subjectName, setSubjectName] = useState("")

  const { data: subjectsRes } = useApi(
    () => groupId !== "" ? teachingApi.mySubjects(groupId as number) : Promise.resolve(null),
    [groupId]
  )

  const subjects = useMemo(() => {
    const list = subjectsRes?.data?.map(s => s.subjectName) ?? []
    return [...new Set(list)].sort()
  }, [subjectsRes])

  const ready = groupId !== "" && subjectName !== ""

  const { data, loading, error, refetch } = useApi(
    () => ready ? teachingApi.gradeJournal(groupId, subjectName) : Promise.resolve(null),
    [groupId, subjectName, ready]
  )

  const topics   = data?.data?.topics   ?? []
  const students = data?.data?.students ?? []
  const scale    = data?.data?.scale    ?? DEFAULT_SCALE

  if (lGroups) return <Loading />
  if (eGroups) return <ApiError message={eGroups} onRetry={() => window.location.reload()} />

  const sel = "w-full px-3 py-2.5 rounded-[8px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none bg-white"

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      {/* Filtr */}
      <div className="rounded-[10px] bg-white p-4"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4" style={{ color: "#0e58a8" }} />
          <span className="text-sm font-semibold" style={T}>{t("natijalarOq.pageTitle")}</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1 min-w-[200px] flex-1">
            <label className="text-xs font-medium" style={L}>{t("natijalarOq.group")}</label>
            <select value={groupId}
              onChange={e => { setGroupId(Number(e.target.value) || ""); setSubjectName("") }}
              className={sel} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              <option value="">{t("natijalarOq.selectGroup")}</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[220px] flex-1">
            <label className="text-xs font-medium" style={L}>{t("natijalarOq.subject")}</label>
            <select value={subjectName} onChange={e => setSubjectName(e.target.value)}
              disabled={groupId === ""}
              className={sel}
              style={{ color: "#012970", fontFamily: "var(--font-poppins)", opacity: groupId === "" ? 0.5 : 1 }}>
              <option value="">{t("natijalarOq.selectSubject")}</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Kontent */}
      {!ready ? (
        <div className="rounded-[10px] bg-white p-14 text-center"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <BarChart3 className="w-10 h-10 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm font-medium" style={T}>{t("natijalarOq.selectGroupSubject")}</p>
          <p className="text-xs mt-1" style={L}>{t("natijalarOq.selectHint")}</p>
        </div>
      ) : loading ? (
        <div className="rounded-[10px] bg-white p-14 text-center"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="w-7 h-7 border-2 border-[#0e58a8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={L}>{t("natijalarOq.journalLoading")}</p>
        </div>
      ) : error ? (
        <ApiError message={error} onRetry={refetch} />
      ) : (
        <GradeJournal
          topics={topics}
          students={students}
          scale={scale}
          miColumns={data?.data?.miColumns ?? []}
          periodItems={data?.data?.periodItems}
          untypedTopicCount={data?.data?.untypedTopicCount ?? 0}
          groupId={groupId as number}
          subjectName={subjectName}
          onRefresh={refetch}
          refreshing={loading}
        />
      )}
    </div>
  )
}

/* ─── Sahifa (export) ────────────────────────────────────────────────── */
