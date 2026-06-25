"use client"

import { useState, useEffect } from "react"
import { BarChart3, Search, Users, BookOpen, Loader2, ChevronDown, Upload, CheckCircle2, Bell, Send, X } from "lucide-react"
import { adminApi, teachingApi, type AdminTeacherStat, type JournalData } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

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

function ScoreCell({ score, max }: { score: number | null; max: number }) {
  if (score === null)
    return <td className="text-center px-1 py-2 border-r border-[rgba(1,41,112,0.06)]"><span style={{ color: "#d1d5db", fontSize: 13 }}>—</span></td>
  const pct = max > 0 ? (score / max) * 100 : null
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

/* ── Telegram xabar modal ─────────────────────────────────────────────── */
function NotifyModal({ name, subject, jn, on1, on2, yn, att, onClose }: {
  name: string; subject: string; jn: number | null; on1: number | null; on2: number | null; yn: number | null; att: number | null; onClose: () => void
}) {
  const [msg, setMsg] = useState("")
  const [sending, setSending] = useState(false)
  const [res, setRes] = useState<{ ok: boolean; text: string } | null>(null)

  async function send() {
    if (!msg.trim()) return
    setSending(true); setRes(null)
    try {
      const r = await teachingApi.notifyStudent({ studentName: name, message: msg.trim(), stats: { subject, jn, on1, on2, yn, attendance: att } })
      setRes({ ok: true, text: r.message || "Yuborildi" })
    } catch (e) { setRes({ ok: false, text: e instanceof Error ? e.message : "Xatolik" }) }
    finally { setSending(false) }
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
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors"><X className="w-4 h-4" style={{ color: "#94a3b8" }} /></button>
        </div>
        <div className="flex flex-col gap-1 p-3 rounded-[8px]" style={{ backgroundColor: "#f8fbff", border: "1px solid rgba(1,41,112,0.08)" }}>
          <div className="text-xs font-semibold" style={T}>{name}</div>
          <div className="text-xs flex flex-wrap gap-2 mt-1">
            {subject && <span style={L}>{subject}</span>}
            {jn != null && <span style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>JN: {jn}%</span>}
            {on1 != null && <span style={{ color: "#7c3aed", fontFamily: "var(--font-poppins)" }}>ON1: {on1}</span>}
            {on2 != null && <span style={{ color: "#7c3aed", fontFamily: "var(--font-poppins)" }}>ON2: {on2}</span>}
            {yn  != null && <span style={{ color: "#0891b2", fontFamily: "var(--font-poppins)" }}>YN: {yn}</span>}
            {att != null && <span style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>Davomat: {att}%</span>}
          </div>
        </div>
        <textarea rows={4} value={msg} onChange={e => setMsg(e.target.value)} placeholder="Xabar matni..."
          className="w-full rounded-[8px] p-3 text-sm resize-none outline-none"
          style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
        {res && <div className="text-xs px-3 py-2 rounded-[6px]"
          style={{ backgroundColor: res.ok ? "#f0fdf4" : "#fef2f2", color: res.ok ? "#15803d" : "#b91c1c", fontFamily: "var(--font-poppins)" }}>{res.text}</div>}
        <button onClick={send} disabled={sending || !msg.trim()}
          className="flex items-center justify-center gap-2 py-2.5 rounded-[8px] text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Yuborilmoqda..." : "Telegram ga yuborish"}
        </button>
      </div>
    </div>
  )
}

function JournalTable({ journal, subject }: { journal: JournalData; subject: string }) {
  const { topics, students } = journal
  const totalStudents = students.length
  const [notify, setNotify] = useState<typeof students[0] | null>(null)
  const avgJn = students.filter(s => s.jn !== null).length > 0
    ? Math.round(students.reduce((sum, s) => sum + (s.jn ?? 0), 0) / totalStudents * 10) / 10
    : null
  const completed = students.filter(s => s.jn !== null && s.jn >= 56).length

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Jami talabalar", value: totalStudents, icon: Users, color: "#0e58a8" },
          { label: "O'rtacha JN", value: avgJn !== null ? `${avgJn}%` : "—", icon: BarChart3, color: "#7c3aed" },
          { label: "Mavzular soni", value: topics.length, icon: BookOpen, color: "#0891b2" },
          { label: "O'tgan", value: `${completed}/${totalStudents}`, icon: BarChart3, color: "#15803d" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-[10px] p-4"
            style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 2px 8px rgba(1,41,112,0.06)" }}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-xs" style={L}>{s.label}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-[10px] p-8 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <p className="text-sm" style={L}>Talabalar ma'lumotlari topilmadi</p>
        </div>
      ) : (
        <div className="bg-white rounded-[10px] overflow-x-auto"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 2px 8px rgba(1,41,112,0.06)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
            <span className="text-sm font-semibold" style={T}>
              Talabalar ballari jurnali
            </span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: "#f8fbff", borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-[#f8fbff] z-10" style={T}>#</th>
                <th className="text-left px-3 py-2 font-semibold sticky left-6 bg-[#f8fbff] z-10 min-w-[180px]" style={T}>TALABA</th>
                <th colSpan={topics.length} className="text-center px-2 py-2 font-semibold border-l border-[rgba(1,41,112,0.08)]"
                  style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  MAVZULAR BO'YICHA BALL
                </th>
                <th className="text-center px-3 py-2 font-semibold border-l border-[rgba(1,41,112,0.08)] bg-[#eef4ff]"
                  style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>JN %</th>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                <th className="sticky left-0 bg-white z-10" />
                <th className="sticky left-6 bg-white z-10" />
                {topics.map(t => (
                  <th key={t.key} className="text-center px-1 py-1.5 border-r border-[rgba(1,41,112,0.06)] font-semibold" style={L}>
                    {t.idx}-mavzu<br />
                    <span style={{ color: "#94a3b8" }}>/{t.maxScore}</span>
                  </th>
                ))}
                <th className="border-l border-[rgba(1,41,112,0.08)] bg-[#eef4ff]" />
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const jnColor = pctColor(s.jn)
                const jnBg = pctBg(s.jn)
                return (
                  <tr key={s.userId} style={{ borderBottom: "1px solid rgba(1,41,112,0.05)" }}>
                    <td className="px-3 py-2 text-center sticky left-0 bg-white z-10" style={L}>{i + 1}</td>
                    <td className="px-3 py-2 sticky left-6 bg-white z-10" style={{ minWidth: 180 }}>
                      <div className="font-semibold" style={T}>{s.fullName}</div>
                      {s.studentIdNumber && <div style={L}>{s.studentIdNumber}</div>}
                    </td>
                    {topics.map(t => (
                      <ScoreCell key={t.key} score={s.topicScores[t.key] ?? null} max={t.maxScore} />
                    ))}
                    <td className="text-center px-3 py-2 border-l border-[rgba(1,41,112,0.08)] bg-[#f8fbff]">
                      {s.jn !== null ? (
                        <span className="inline-block rounded-[4px] px-1.5 py-0.5 font-bold text-xs"
                          style={{ color: jnColor, backgroundColor: jnBg, fontFamily: "var(--font-poppins)" }}>
                          {s.jn}%
                        </span>
                      ) : <span style={{ color: "#d1d5db" }}>—</span>}
                    </td>
                    <td className="text-center px-2 py-2" style={{ backgroundColor: "#fff7ed" }}>
                      <button onClick={() => setNotify(s)}
                        className="w-7 h-7 rounded-full flex items-center justify-center mx-auto hover:bg-orange-100 transition-colors"
                        title="Xabar yuborish">
                        <Bell className="w-3.5 h-3.5" style={{ color: "#ea580c" }} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {notify && (
        <NotifyModal name={notify.fullName} subject={subject} jn={notify.jn} on1={null} on2={null} yn={null} att={null}
          onClose={() => setNotify(null)} />
      )}
    </div>
  )
}

export default function AdminHisobot() {
  const [selectedTeacher, setSelectedTeacher] = useState<AdminTeacherStat | null>(null)
  const [groupId, setGroupId] = useState("")
  const [subject, setSubject] = useState("")
  const [journal, setJournal] = useState<JournalData | null>(null)
  const [loading2, setLoading2] = useState(false)
  const [err2, setErr2] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState("")
  const [teacherGroups, setTeacherGroups] = useState<{ id: number; name: string }[]>([])
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([])
  const [infoLoading, setInfoLoading] = useState(false)

  const { data, loading, error, refetch } = useApi(() => adminApi.teacherStats(), [])
  const teachers: AdminTeacherStat[] = data?.data ?? []

  useEffect(() => {
    if (!selectedTeacher) {
      setTeacherGroups([]); setTeacherSubjects([]); setGroupId(""); setSubject(""); return
    }
    setInfoLoading(true)
    adminApi.teacherInfo(selectedTeacher.hemisId)
      .then(r => {
        setTeacherGroups(r.data.groups)
        setTeacherSubjects(r.data.subjects)
        setGroupId(""); setSubject("")
      })
      .catch(() => { setTeacherGroups([]); setTeacherSubjects([]) })
      .finally(() => setInfoLoading(false))
  }, [selectedTeacher])

  async function loadJournal() {
    if (!selectedTeacher || !groupId || !subject) return
    setLoading2(true)
    setErr2("")
    setJournal(null)
    try {
      const res = await adminApi.teacherJournal({
        teacherId: Number(selectedTeacher.hemisId),
        groupId: Number(groupId),
        subject,
      })
      setJournal(res.data)
    } catch (e: unknown) {
      setErr2(e instanceof Error ? e.message : "Xatolik yuz berdi")
    } finally {
      setLoading2(false)
    }
  }

  async function doHemisSync() {
    setSyncing(true)
    setSyncMsg("")
    try {
      const res = await adminApi.hemisSync()
      setSyncMsg(res.message || "Muvaffaqiyatli")
    } catch (e: unknown) {
      setSyncMsg(e instanceof Error ? e.message : "Xatolik")
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={T}>Natijalar jurnali</h1>
          <p className="text-sm mt-1" style={L}>O'qituvchi, guruh va fan bo'yicha talabalar natijalarini ko'rish</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {syncMsg && (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
              style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
              <CheckCircle2 className="w-3.5 h-3.5" />{syncMsg}
            </span>
          )}
          <button type="button" onClick={doHemisSync} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[6px] text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            HEMIS ga yuklash
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white rounded-[10px] p-5 flex flex-col gap-4"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 2px 8px rgba(1,41,112,0.06)" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Teacher selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={L}>O'qituvchi</label>
            <div className="relative">
              <select
                className="w-full px-3 py-2.5 rounded-[6px] appearance-none text-sm pr-8"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}
                value={selectedTeacher?.hemisId ?? ""}
                onChange={e => {
                  const t = teachers.find(t => t.hemisId === e.target.value) ?? null
                  setSelectedTeacher(t)
                  setJournal(null)
                }}>
                <option value="">— Tanlang —</option>
                {teachers.map(t => (
                  <option key={t.hemisId} value={t.hemisId}>{t.fullName}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={L} />
            </div>
          </div>

          {/* Group select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={L}>Guruh</label>
            <div className="relative">
              {infoLoading ? (
                <div className="px-3 py-2.5 rounded-[6px] text-sm flex items-center gap-2"
                  style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Yuklanmoqda...
                </div>
              ) : teacherGroups.length > 0 ? (
                <>
                  <select
                    className="w-full px-3 py-2.5 rounded-[6px] appearance-none text-sm pr-8"
                    style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}
                    value={groupId}
                    onChange={e => { setGroupId(e.target.value); setJournal(null) }}>
                    <option value="">— Guruh tanlang —</option>
                    {teacherGroups.map(g => (
                      <option key={g.id} value={String(g.id)}>{g.name} (#{g.id})</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={L} />
                </>
              ) : (
                <input
                  type="number"
                  placeholder="Guruh ID kiriting"
                  className="w-full px-3 py-2.5 rounded-[6px] text-sm"
                  style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}
                  value={groupId}
                  onChange={e => { setGroupId(e.target.value); setJournal(null) }}
                />
              )}
            </div>
          </div>

          {/* Subject select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={L}>Fan nomi</label>
            <div className="relative">
              {teacherSubjects.length > 0 ? (
                <>
                  <select
                    className="w-full px-3 py-2.5 rounded-[6px] appearance-none text-sm pr-8"
                    style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}
                    value={subject}
                    onChange={e => { setSubject(e.target.value); setJournal(null) }}>
                    <option value="">— Fan tanlang —</option>
                    {teacherSubjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={L} />
                </>
              ) : (
                <input
                  type="text"
                  placeholder="Fan nomini kiriting"
                  className="w-full px-3 py-2.5 rounded-[6px] text-sm"
                  style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}
                  value={subject}
                  onChange={e => { setSubject(e.target.value); setJournal(null) }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadJournal}
            disabled={!selectedTeacher || !groupId || !subject || loading2}
            className="px-5 py-2.5 rounded-[6px] text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {loading2 ? <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" /> : <Search className="w-4 h-4 inline mr-1.5" />}
            Ko'rish
          </button>
          {err2 && <span className="text-sm" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{err2}</span>}
        </div>
      </div>

      {/* Journal table */}
      {journal && <JournalTable journal={journal} subject={subject} />}

      {!journal && !loading2 && (
        <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <BarChart3 className="w-8 h-8 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm" style={L}>O'qituvchi, guruh va fan tanlang, so'ng "Ko'rish" tugmasini bosing</p>
        </div>
      )}
    </div>
  )
}
