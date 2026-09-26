"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, RefreshCw, CalendarDays, ClipboardCheck, BookCheck, FileCheck2, Plus, Trash2, Send } from "lucide-react"
import { reeduApi, type ReeduGroupDetail, type ReeduGradeType } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"

// Hafta kunlari 1..7 — nomi lug'atdagi weekday.N kalitidan olinadi
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7]
const GRADE_TYPES: ReeduGradeType[] = ["JN", "ON1", "ON2", "YN"]

type Tab = "jadval" | "davomat" | "nazorat" | "qaydnoma"

export default function ReeduGroupPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const id = Number(params.id)

  const [detail, setDetail] = useState<ReeduGroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("jadval")

  function load() {
    setLoading(true)
    reeduApi.groupDetail(id).then(res => setDetail(res.data)).finally(() => setLoading(false))
  }

  useEffect(() => { if (id) load() }, [id])

  if (loading || !detail) {
    return <div className="flex items-center justify-center py-24"><RefreshCw className="w-6 h-6 animate-spin" style={{ color: "#0e58a8" }} /></div>
  }

  const TABS: { key: Tab; label: string; icon: typeof CalendarDays }[] = [
    { key: "jadval", label: t("adminReedu.tabSchedule"), icon: CalendarDays },
    { key: "davomat", label: t("adminReedu.tabAttendance"), icon: ClipboardCheck },
    { key: "nazorat", label: t("adminReedu.tabControl"), icon: BookCheck },
    { key: "qaydnoma", label: t("adminReedu.tabRecord"), icon: FileCheck2 },
  ]

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/admin/qayta-oqish")} className="p-2 rounded-[8px] hover:bg-[#eef4ff]">
          <ArrowLeft className="w-4 h-4" style={{ color: "#0e58a8" }} />
        </button>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{detail.group.name}</h1>
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("adminReedu.groupMeta", { subject: detail.group.subjectName, n: detail.enrollments.length })} · {detail.group.status === "active" ? t("adminReedu.active") : t("adminReedu.closedGroup")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b" style={{ borderColor: "rgba(1,41,112,0.1)" }}>
        {TABS.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: tab === tb.key ? "#0e58a8" : "transparent",
              color: tab === tb.key ? "#0e58a8" : "#7293b9",
              fontFamily: "var(--font-poppins)",
            }}>
            <tb.icon className="w-4 h-4" />
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "jadval" && <ScheduleTab id={id} detail={detail} onSaved={load} />}
      {tab === "davomat" && <AttendanceTab id={id} detail={detail} onSaved={load} />}
      {tab === "nazorat" && <GradesTab id={id} detail={detail} onSaved={load} />}
      {tab === "qaydnoma" && <RecordTab id={id} detail={detail} />}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-[12px]" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>{children}</div>
}

/* ── 3-bosqich: Dars jadvali ─────────────────────────────────────────── */
function ScheduleTab({ id, detail, onSaved }: { id: number; detail: ReeduGroupDetail; onSaved: () => void }) {
  const { t } = useLanguage()
  const [slots, setSlots] = useState(detail.schedule.map(s => ({ weekDay: s.weekDay, startTime: s.startTime, endTime: s.endTime, room: s.room ?? "" })))
  const [saving, setSaving] = useState(false)

  function addSlot() {
    setSlots(prev => [...prev, { weekDay: 1, startTime: "09:00", endTime: "10:20", room: "" }])
  }
  function removeSlot(i: number) {
    setSlots(prev => prev.filter((_, idx) => idx !== i))
  }
  function update(i: number, field: string, value: string | number) {
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }
  async function save() {
    setSaving(true)
    try {
      await reeduApi.setSchedule(id, slots)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h2 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t("adminReedu.weeklySchedule")}</h2>
        <button onClick={addSlot} className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px]" style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <Plus className="w-3.5 h-3.5" /> {t("adminReedu.addRow")}
        </button>
      </div>
      <div className="p-5 flex flex-col gap-3">
        {slots.length === 0 && <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{t("adminReedu.noSchedule")}</p>}
        {slots.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-wrap">
            <select value={s.weekDay} onChange={e => update(i, "weekDay", Number(e.target.value))}
              className="px-3 py-2 rounded-[8px] text-sm outline-none" style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {WEEK_DAYS.map(d => <option key={d} value={d}>{t(`weekday.${d}`)}</option>)}
            </select>
            <input type="time" value={s.startTime} onChange={e => update(i, "startTime", e.target.value)}
              className="px-3 py-2 rounded-[8px] text-sm outline-none" style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
            <span style={{ color: "#7293b9" }}>—</span>
            <input type="time" value={s.endTime} onChange={e => update(i, "endTime", e.target.value)}
              className="px-3 py-2 rounded-[8px] text-sm outline-none" style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
            <input value={s.room} onChange={e => update(i, "room", e.target.value)} placeholder={t("adminReedu.room")}
              className="px-3 py-2 rounded-[8px] text-sm outline-none w-28" style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
            <button onClick={() => removeSlot(i)} className="p-2 rounded-[8px] hover:bg-red-50"><Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} /></button>
          </div>
        ))}
        <button onClick={save} disabled={saving}
          className="mt-2 w-fit px-4 py-2.5 rounded-[8px] text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          {saving ? t("common.saving") : t("adminReedu.saveSchedule")}
        </button>
      </div>
    </Card>
  )
}

/* ── 4-bosqich: Davomat ──────────────────────────────────────────────── */
function AttendanceTab({ id, detail, onSaved }: { id: number; detail: ReeduGroupDetail; onSaved: () => void }) {
  const { t } = useLanguage()
  const today = new Date().toISOString().slice(0, 10)
  const [lessonDate, setLessonDate] = useState(today)
  const [statuses, setStatuses] = useState<Record<number, string>>(
    Object.fromEntries(detail.enrollments.map(e => [e.studentUserId, "present"]))
  )
  const [saving, setSaving] = useState(false)

  const attMap = useMemo(() => {
    const m = new Map<number, { present: number; total: number }>()
    for (const a of detail.attendance) m.set(a.studentUserId, { present: a.present, total: a.total })
    return m
  }, [detail.attendance])

  async function save() {
    setSaving(true)
    try {
      const records = detail.enrollments.map(e => ({ studentUserId: e.studentUserId, status: statuses[e.studentUserId] ?? "present" }))
      await reeduApi.markAttendance(id, lessonDate, records)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const STATUS_OPTS = [
    { v: "present", label: t("adminReedu.att.present"), color: "#22c55e" },
    { v: "late", label: t("adminReedu.att.late"), color: "#f59e0b" },
    { v: "excused", label: t("adminReedu.att.excused"), color: "#0891b2" },
    { v: "absent", label: t("adminReedu.att.absent"), color: "#ef4444" },
  ]

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h2 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t("adminReedu.markAttendance")}</h2>
        <input type="date" value={lessonDate} onChange={e => setLessonDate(e.target.value)}
          className="px-3 py-2 rounded-[8px] text-sm outline-none" style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)", backgroundColor: "#f6f9ff" }}>
              {[t("common.student"), t("common.status"), t("adminReedu.overallAtt")].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {detail.enrollments.map(e => {
              const summary = attMap.get(e.studentUserId)
              const pct = summary && summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : null
              return (
                <tr key={e.studentUserId} style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{e.studentFullName}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {STATUS_OPTS.map(opt => (
                        <button key={opt.v} onClick={() => setStatuses(prev => ({ ...prev, [e.studentUserId]: opt.v }))}
                          className="text-xs font-medium px-2.5 py-1 rounded-full border transition-colors"
                          style={{
                            borderColor: opt.color,
                            backgroundColor: statuses[e.studentUserId] === opt.v ? opt.color : "transparent",
                            color: statuses[e.studentUserId] === opt.v ? "#fff" : opt.color,
                          }}>{opt.label}</button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {pct !== null ? `${pct}% (${summary!.present}/${summary!.total})` : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="p-5">
        <button onClick={save} disabled={saving}
          className="px-4 py-2.5 rounded-[8px] text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          {saving ? t("common.saving") : t("adminReedu.saveAttendance")}
        </button>
      </div>
    </Card>
  )
}

/* ── 5-bosqich: Nazorat (JN/ON1/ON2/YN) ─────────────────────────────── */
function GradesTab({ id, detail, onSaved }: { id: number; detail: ReeduGroupDetail; onSaved: () => void }) {
  const { t } = useLanguage()
  const [grades, setGrades] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const g of detail.grades) init[`${g.studentUserId}:${g.gradeType}`] = g.grade !== null ? String(g.grade) : ""
    return init
  })
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [finalizing, setFinalizing] = useState<number | null>(null)

  async function saveGrade(studentUserId: number, gradeType: ReeduGradeType) {
    const key = `${studentUserId}:${gradeType}`
    const raw = grades[key]
    const value = raw === "" || raw === undefined ? null : Number(raw)
    setSavingKey(key)
    try {
      await reeduApi.setGrade(id, studentUserId, gradeType, value)
    } finally {
      setSavingKey(null)
    }
  }

  async function finalize(studentUserId: number) {
    setFinalizing(studentUserId)
    try {
      await reeduApi.finalize(id, studentUserId)
      onSaved()
    } catch {
      // baho hali kiritilmagan bo'lsa jim o'tkaziladi — tugma qayta bosiladi
    } finally {
      setFinalizing(null)
    }
  }

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h2 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t("adminReedu.gradesTitle")}</h2>
        <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("adminReedu.gradesHint")}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)", backgroundColor: "#f6f9ff" }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{t("common.student")}</th>
              {GRADE_TYPES.map(gt => (
                <th key={gt} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{gt}</th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{t("common.status")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {detail.enrollments.map(e => (
              <tr key={e.studentUserId} style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{e.studentFullName}</td>
                {GRADE_TYPES.map(gt => {
                  const key = `${e.studentUserId}:${gt}`
                  return (
                    <td key={gt} className="px-4 py-3">
                      <input value={grades[key] ?? ""} onChange={ev => setGrades(prev => ({ ...prev, [key]: ev.target.value }))}
                        onBlur={() => saveGrade(e.studentUserId, gt)}
                        type="number" min={0} max={100}
                        className="w-16 px-2 py-1.5 rounded-[6px] text-sm outline-none text-center"
                        style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
                      {savingKey === key && <RefreshCw className="w-3 h-3 animate-spin inline-block ml-1" style={{ color: "#0e58a8" }} />}
                    </td>
                  )
                })}
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{
                    backgroundColor: e.status === "completed" ? "#f0fdf4" : e.status === "failed" ? "#fff0f0" : "#fff8e6",
                    color: e.status === "completed" ? "#22c55e" : e.status === "failed" ? "#ef4444" : "#f59e0b",
                  }}>
                    {e.status === "completed" ? t("adminReedu.completed", { score: e.finalScore ?? "—" }) : e.status === "failed" ? t("adminReedu.failed", { score: e.finalScore ?? "—" }) : t("common.inProgress")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => finalize(e.studentUserId)} disabled={finalizing === e.studentUserId}
                    className="text-xs font-medium px-3 py-1.5 rounded-[6px]" style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                    {finalizing === e.studentUserId ? "…" : t("adminReedu.finalize")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ── 6-bosqich: Qaydnoma ────────────────────────────────────────────── */
function RecordTab({ id, detail }: { id: number; detail: ReeduGroupDetail }) {
  const { t } = useLanguage()
  const [rows, setRows] = useState<Awaited<ReturnType<typeof reeduApi.exportRecord>>["data"] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    reeduApi.exportRecord(id).then(res => setRows(res.data)).finally(() => setLoading(false))
  }, [id])

  const readyCount = rows?.filter(r => r.readyForHemis).length ?? 0

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h2 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t("adminReedu.recordTitle")}</h2>
        <p className="text-xs mt-0.5" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
          {t("adminReedu.recordHint")}
        </p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-14"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} /></div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)", backgroundColor: "#f6f9ff" }}>
                  {[t("common.student"), t("adminReedu.colIdNumber"), t("common.subject"), t("adminReedu.colOrigGroup"), t("adminReedu.colDebtScore"), t("adminReedu.colFinal"), t("common.status")].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{r.studentFullName}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{r.studentIdNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{r.subjectName}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{r.originalGroupName ?? "—"}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#b91c1c" }}>{r.debtorTotalPoint ?? "—"}</td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: "#012970" }}>{r.finalScore ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{
                        backgroundColor: r.readyForHemis ? "#f0fdf4" : "#fff8e6",
                        color: r.readyForHemis ? "#22c55e" : "#f59e0b",
                      }}>{r.readyForHemis ? t("adminReedu.ready") : t("common.pending")}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-5 flex items-center gap-2">
            <Send className="w-4 h-4" style={{ color: "#0e58a8" }} />
            <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {t("adminReedu.readyCount", { ready: readyCount, total: rows?.length ?? 0 })}
            </span>
          </div>
        </>
      )}
    </Card>
  )
}
