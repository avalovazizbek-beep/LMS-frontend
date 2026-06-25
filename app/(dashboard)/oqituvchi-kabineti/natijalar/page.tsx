"use client"

import { useMemo, useState, useCallback, useRef } from "react"
import { Users, BarChart3, BookOpen, CheckCircle, Download, RefreshCw, Bell, Send, X } from "lucide-react"
import {
  teachingApi,
  type JournalTopic,
  type JournalStudent,
} from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

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
  value, onSave, maxVal = 100,
}: {
  value: number | null
  onSave: (v: number | null) => Promise<void>
  maxVal?: number
}) {
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
    const val = parsed === null ? null : isNaN(parsed) ? value : Math.min(maxVal, Math.max(0, parsed))
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
        <span className="inline-block min-w-[32px] rounded-[4px] text-xs font-semibold px-1 py-0.5 cursor-pointer hover:ring-1 hover:ring-[#0e58a8] transition-all"
          style={{ color: value !== null ? c : "#94a3b8", backgroundColor: value !== null ? bg : "transparent", fontFamily: "var(--font-poppins)" }}
          onClick={startEdit}
          title="Bosib tahrirlang">
          {value !== null ? value : "—"}
        </span>
      )}
    </td>
  )
}

/* ─── Joriy Nazorat cell ─────────────────────────────────────────────── */
function JnCell({ jn }: { jn: number | null }) {
  if (jn === null) return (
    <td className="text-center px-2 py-2 border-r border-[rgba(1,41,112,0.1)]">
      <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
    </td>
  )
  const c = pctColor(jn); const bg = pctBg(jn)
  return (
    <td className="text-center px-2 py-2 border-r border-[rgba(1,41,112,0.1)]">
      <span className="inline-block px-1.5 py-0.5 rounded-[4px] text-xs font-bold"
        style={{ color: c, backgroundColor: bg, fontFamily: "var(--font-poppins)" }}>
        {jn.toFixed(1)}%
      </span>
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
  student, subjectName, onClose,
}: {
  student: { fullName: string; jn: number | null; on1: number | null; on2: number | null; yn: number | null; attendancePct: number | null }
  subjectName: string
  onClose: () => void
}) {
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
        message: message.trim(),
        stats: {
          subject: subjectName,
          jn: student.jn,
          on1: student.on1,
          on2: student.on2,
          yn: student.yn,
          attendance: student.attendancePct,
        },
      })
      setResult({ ok: true, text: res.message || "Yuborildi" })
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : "Xatolik" })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-[14px] bg-white p-6 flex flex-col gap-4 shadow-2xl"
        style={{ border: "1px solid rgba(1,41,112,0.12)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" style={{ color: "#0e58a8" }} />
            <span className="text-sm font-semibold" style={T}>Telegram xabar</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" style={{ color: "#94a3b8" }} />
          </button>
        </div>
        <div className="flex flex-col gap-1 p-3 rounded-[8px]" style={{ backgroundColor: "#f8fbff", border: "1px solid rgba(1,41,112,0.08)" }}>
          <div className="text-xs font-semibold" style={T}>{student.fullName}</div>
          <div className="text-xs flex flex-wrap gap-2 mt-1">
            {subjectName && <span style={L}>{subjectName}</span>}
            {student.jn != null && <span style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>JN: {student.jn}%</span>}
            {student.on1 != null && <span style={{ color: "#7c3aed", fontFamily: "var(--font-poppins)" }}>ON1: {student.on1}</span>}
            {student.on2 != null && <span style={{ color: "#7c3aed", fontFamily: "var(--font-poppins)" }}>ON2: {student.on2}</span>}
            {student.yn  != null && <span style={{ color: "#0891b2", fontFamily: "var(--font-poppins)" }}>YN: {student.yn}</span>}
            {student.attendancePct != null && <span style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>Davomat: {student.attendancePct}%</span>}
          </div>
        </div>
        <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)}
          placeholder="Xabar matni (o'zbek tilida)..."
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
          {sending ? "Yuborilmoqda..." : "Telegram ga yuborish"}
        </button>
      </div>
    </div>
  )
}

/* ─── Asosiy jurnal jadvali ──────────────────────────────────────────── */
function GradeJournal({
  topics, students, groupId, subjectName, onRefresh, refreshing,
}: {
  topics: JournalTopic[]
  students: JournalStudent[]
  groupId: number
  subjectName: string
  onRefresh: () => void
  refreshing: boolean
}) {
  const [overrides, setOverrides] = useState<Record<string, number | null>>({})
  const [notifyStudent, setNotifyStudent] = useState<JournalStudent | null>(null)

  function getVal(userId: number, field: "on1" | "on2" | "yn", s: JournalStudent): number | null {
    const k = `${userId}:${field}`
    return k in overrides ? overrides[k] : s[field]
  }

  const save = useCallback(async (
    userId: number, gradeType: "ON1" | "ON2" | "YN", val: number | null
  ) => {
    setOverrides(prev => ({ ...prev, [`${userId}:${gradeType.toLowerCase()}`]: val }))
    await teachingApi.savePeriodGrade({ groupId, subjectName, studentUserId: userId, gradeType, grade: val })
  }, [groupId, subjectName])

  const totalMax = topics.reduce((s, t) => s + t.maxScore, 0)

  const passed  = students.filter(s => {
    const jn = s.jn ?? 0
    const on = ((getVal(s.userId, "on1", s) ?? 0) + (getVal(s.userId, "on2", s) ?? 0)) / 2
    const yn = getVal(s.userId, "yn", s) ?? 0
    return jn + on + yn >= 55
  }).length

  const avgJn = students.length
    ? (students.reduce((sum, s) => sum + (s.jn ?? 0), 0) / students.length).toFixed(1)
    : "—"

  function exportCsv() {
    const header = [
      "#", "Talaba",
      ...topics.map(t => `${t.idx}-mavzu`),
      "JN (%)", "ON1", "ON2", "YN", "Davomat %",
    ]
    const rows = students.map((s, i) => [
      i + 1,
      s.fullName,
      ...topics.map(t => s.topicScores[t.key] ?? ""),
      s.jn !== null ? `${s.jn}%` : "",
      getVal(s.userId, "on1", s) ?? "",
      getVal(s.userId, "on2", s) ?? "",
      getVal(s.userId, "yn", s) ?? "",
      s.attendancePct !== null ? `${s.attendancePct}%` : "",
    ])
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url
    a.download = `jurnal_${subjectName}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stat kartalar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Users className="w-5 h-5" style={{ color: "#0e58a8" }} />, val: students.length, label: "Jami talabalar", bg: "#eef4ff" },
          { icon: <BarChart3 className="w-5 h-5" style={{ color: "#15803d" }} />, val: `${avgJn}%`, label: "O'rtacha JN", bg: "#f0fdf4" },
          { icon: <BookOpen className="w-5 h-5" style={{ color: "#d97706" }} />, val: topics.length, label: "Mavzular soni", bg: "#fffbeb" },
          { icon: <CheckCircle className="w-5 h-5" style={{ color: "#7c3aed" }} />, val: `${passed}/${students.length}`, label: "O'tgan", bg: "#f5f3ff" },
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

      {/* Jadval */}
      <div className="rounded-[10px] bg-white overflow-hidden"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
        <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2"
          style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <div>
            <span className="text-sm font-semibold" style={T}>Talabalar ballari jurnali</span>
            <span className="ml-2 text-xs" style={L}>· JN = topshirilgan mavzular o&apos;rtachasi (%) · ON/YN katakchalarini bosib tahrirlang</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors hover:bg-[#eef4ff]"
              style={{ border: "1px solid rgba(14,88,168,0.25)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              <Download className="w-3.5 h-3.5" /> Eksport
            </button>
            <button onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors hover:bg-[#f0fdf4]"
              style={{ border: "1px solid rgba(21,128,61,0.25)", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Yangilash
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
                  TALABA
                </th>
                <th colSpan={topics.length} className="px-2 py-1.5 text-center text-xs font-semibold"
                  style={{ ...T, borderRight: "2px solid rgba(1,41,112,0.15)", backgroundColor: "#dbeafe" }}>
                  MAVZULAR BO&apos;YICHA BALL
                </th>
                <th colSpan={1} className="px-2 py-1.5 text-center text-xs font-semibold"
                  style={{ ...T, borderRight: "1px solid rgba(1,41,112,0.12)", backgroundColor: "#dcfce7" }}>
                  JN
                </th>
                <th colSpan={2} className="px-2 py-1.5 text-center text-xs font-semibold"
                  style={{ ...T, borderRight: "1px solid rgba(1,41,112,0.12)", backgroundColor: "#fef9c3" }}>
                  ORALIQ (ON)
                </th>
                <th colSpan={1} className="px-2 py-1.5 text-center text-xs font-semibold"
                  style={{ ...T, borderRight: "1px solid rgba(1,41,112,0.12)", backgroundColor: "#fce7f3" }}>
                  YAKUNIY
                </th>
                <th colSpan={1} className="px-2 py-1.5 text-center text-xs font-semibold"
                  style={{ ...T, backgroundColor: "#f0fdf4" }}>
                  DAVOMAT
                </th>
              </tr>
              {/* 2-qator: har bir ustun */}
              <tr style={{ backgroundColor: "#f0f5ff", borderBottom: "2px solid rgba(1,41,112,0.12)" }}>
                {topics.map(t => (
                  <th key={t.key}
                    className="px-1 py-2 text-center text-[10px] font-semibold"
                    style={{ ...T, minWidth: 52, maxWidth: 70, borderRight: "1px solid rgba(1,41,112,0.08)", backgroundColor: "#f0f5ff" }}
                    title={t.title}>
                    <div className="font-semibold">{t.idx}-mavzu</div>
                    {t.maxScore > 0 && (
                      <div className="font-normal" style={L}>/{t.maxScore}</div>
                    )}
                  </th>
                ))}
                {[
                  { label: "JN %",    bg: "#f0fdf4", br: "rgba(1,41,112,0.12)" },
                  { label: "ON1",     bg: "#fefce8", br: "rgba(1,41,112,0.08)" },
                  { label: "ON2",     bg: "#fefce8", br: "rgba(1,41,112,0.12)" },
                  { label: "YN",      bg: "#fdf2f8", br: "rgba(1,41,112,0.12)" },
                  { label: "Davomat", bg: "#f0fdf4", br: "rgba(1,41,112,0.08)" },
                  { label: "📣",      bg: "#fff7ed", br: "transparent" },
                ].map(col => (
                  <th key={col.label} className="px-2 py-2 text-center text-[10px] font-semibold"
                    style={{ ...T, minWidth: 50, backgroundColor: col.bg, borderRight: `1px solid ${col.br}` }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={topics.length + 7} className="px-4 py-14 text-center text-sm" style={L}>
                  Hech qanday natija topilmadi
                </td></tr>
              ) : students.map((s, idx) => (
                <tr key={s.userId} className="hover:bg-[#f8faff]"
                  style={{ borderBottom: "1px solid rgba(1,41,112,0.05)" }}>
                  {/* Talaba ismi — sticky */}
                  <td className="sticky left-0 z-10 px-3 py-2 bg-white"
                    style={{ borderRight: "2px solid rgba(1,41,112,0.1)" }}>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                        style={{ backgroundColor: "#eef4ff", color: "#0e58a8" }}>{idx + 1}</span>
                      <div>
                        <div className="text-xs font-medium" style={T}>{s.fullName}</div>
                        {s.studentIdNumber && <div className="text-[10px]" style={L}>{s.studentIdNumber}</div>}
                      </div>
                    </div>
                  </td>

                  {/* Mavzu ballari */}
                  {topics.map(t => (
                    <TopicCell key={t.key} score={s.topicScores[t.key] ?? null} max={t.maxScore} />
                  ))}

                  {/* JN */}
                  <JnCell jn={s.jn} />

                  {/* ON1, ON2 */}
                  <EditCell value={getVal(s.userId, "on1", s)} onSave={v => save(s.userId, "ON1", v)} />
                  <EditCell value={getVal(s.userId, "on2", s)} onSave={v => save(s.userId, "ON2", v)} />

                  {/* YN */}
                  <EditCell value={getVal(s.userId, "yn", s)} onSave={v => save(s.userId, "YN", v)} />

                  {/* Davomat */}
                  <AttCell pct={s.attendancePct} />

                  {/* Bell */}
                  <td className="text-center px-2 py-2" style={{ backgroundColor: "#fff7ed" }}>
                    <button
                      onClick={() => setNotifyStudent(s)}
                      className="w-7 h-7 rounded-full flex items-center justify-center mx-auto hover:bg-orange-100 transition-colors"
                      title="Xabar yuborish">
                      <Bell className="w-3.5 h-3.5" style={{ color: "#ea580c" }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 flex items-center justify-between text-xs"
          style={{ borderTop: "1px solid rgba(1,41,112,0.08)", ...L }}>
          <span>Jami: {students.length} ta talaba</span>
          <span style={{ color: "#0e58a8" }}>ON/YN: katakchani bosib, son kiriting → Enter yoki boshqa joyga bosing</span>
        </div>
      </div>

      {notifyStudent && (
        <NotifyModal
          student={{ ...notifyStudent, on1: getVal(notifyStudent.userId, "on1", notifyStudent), on2: getVal(notifyStudent.userId, "on2", notifyStudent), yn: getVal(notifyStudent.userId, "yn", notifyStudent) }}
          subjectName={subjectName}
          onClose={() => setNotifyStudent(null)}
        />
      )}
    </div>
  )
}

/* ─── Sahifa ─────────────────────────────────────────────────────────── */
export default function NatijalarPage() {
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
          <span className="text-sm font-semibold" style={T}>Mavzular bo&apos;yicha natijalar</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1 min-w-[200px] flex-1">
            <label className="text-xs font-medium" style={L}>O&apos;quv guruhi</label>
            <select value={groupId}
              onChange={e => { setGroupId(Number(e.target.value) || ""); setSubjectName("") }}
              className={sel} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              <option value="">— Guruhni tanlang —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[220px] flex-1">
            <label className="text-xs font-medium" style={L}>Fan</label>
            <select value={subjectName} onChange={e => setSubjectName(e.target.value)}
              disabled={groupId === ""}
              className={sel}
              style={{ color: "#012970", fontFamily: "var(--font-poppins)", opacity: groupId === "" ? 0.5 : 1 }}>
              <option value="">— Fanni tanlang —</option>
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
          <p className="text-sm font-medium" style={T}>Guruh va fanni tanlang</p>
          <p className="text-xs mt-1" style={L}>Talabalarning mavzu bo&apos;yicha test ballari va davomat chiqadi</p>
        </div>
      ) : loading ? (
        <div className="rounded-[10px] bg-white p-14 text-center"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="w-7 h-7 border-2 border-[#0e58a8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={L}>Jurnal yuklanmoqda...</p>
        </div>
      ) : error ? (
        <ApiError message={error} onRetry={refetch} />
      ) : topics.length === 0 ? (
        <div className="rounded-[10px] bg-white p-14 text-center"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm font-medium" style={T}>Mavzular topilmadi</p>
          <p className="text-xs mt-1" style={L}>Bu guruh va fan uchun hali mavzu yaratilmagan</p>
        </div>
      ) : (
        <GradeJournal
          topics={topics}
          students={students}
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
