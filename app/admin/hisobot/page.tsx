"use client"

import { useState, useEffect } from "react"
import { BarChart3, Search, Users, BookOpen, Loader2, ChevronDown, Upload, CheckCircle2, Bell, Send, X, Info } from "lucide-react"
import { adminApi, teachingApi, type AdminTeacherStat, type JournalData } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { useLanguage } from "@/lib/i18n/LanguageContext"

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
function NotifyModal({ name, userId, subject, jn, on1, on2, yn, att, onClose }: {
  name: string; userId: number; subject: string; jn: number | null; on1: number | null; on2: number | null; yn: number | null; att: number | null; onClose: () => void
}) {
  const { t } = useLanguage()
  const [msg, setMsg] = useState("")
  const [sending, setSending] = useState(false)
  const [res, setRes] = useState<{ ok: boolean; text: string } | null>(null)

  async function send() {
    if (!msg.trim()) return
    setSending(true); setRes(null)
    try {
      const r = await teachingApi.notifyStudent({ studentName: name, studentUserId: userId, message: msg.trim(), stats: { subject, jn, on1, on2, yn, attendance: att } })
      setRes({ ok: true, text: r.message || t("adminHisobot.notifySent") })
    } catch (e) { setRes({ ok: false, text: e instanceof Error ? e.message : t("adminHisobot.errorGeneric") }) }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-[14px] bg-white p-6 flex flex-col gap-4 shadow-2xl"
        style={{ border: "1px solid rgba(1,41,112,0.12)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" style={{ color: "#0e58a8" }} />
            <span className="text-sm font-semibold" style={T}>{t("adminHisobot.notifyModalTitle")}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors"><X className="w-4 h-4" style={{ color: "#94a3b8" }} /></button>
        </div>
        <div className="flex flex-col gap-1 p-3 rounded-[8px]" style={{ backgroundColor: "#f8fbff", border: "1px solid rgba(1,41,112,0.08)" }}>
          <div className="text-xs font-semibold" style={T}>{name}</div>
          <div className="text-xs flex flex-wrap gap-2 mt-1">
            {subject && <span style={L}>{subject}</span>}
            {jn != null && <span style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{t("adminHisobot.notifyJn", { value: jn })}</span>}
            {on1 != null && <span style={{ color: "#7c3aed", fontFamily: "var(--font-poppins)" }}>{t("adminHisobot.notifyOn1", { value: on1 })}</span>}
            {on2 != null && <span style={{ color: "#7c3aed", fontFamily: "var(--font-poppins)" }}>{t("adminHisobot.notifyOn2", { value: on2 })}</span>}
            {yn  != null && <span style={{ color: "#0891b2", fontFamily: "var(--font-poppins)" }}>{t("adminHisobot.notifyYn", { value: yn })}</span>}
            {att != null && <span style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>{t("adminHisobot.notifyAttendance", { value: att })}</span>}
          </div>
        </div>
        <textarea rows={4} value={msg} onChange={e => setMsg(e.target.value)} placeholder={t("adminHisobot.notifyMessagePlaceholder")}
          className="w-full rounded-[8px] p-3 text-sm resize-none outline-none"
          style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
        {res && <div className="text-xs px-3 py-2 rounded-[6px]"
          style={{ backgroundColor: res.ok ? "#f0fdf4" : "#fef2f2", color: res.ok ? "#15803d" : "#b91c1c", fontFamily: "var(--font-poppins)" }}>{res.text}</div>}
        <button onClick={send} disabled={sending || !msg.trim()}
          className="flex items-center justify-center gap-2 py-2.5 rounded-[8px] text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? t("adminHisobot.notifySending") : t("adminHisobot.notifySendBtn")}
        </button>
      </div>
    </div>
  )
}

function JournalTable({ journal, subject }: { journal: JournalData; subject: string }) {
  const { t } = useLanguage()
  const { topics, students } = journal
  const totalStudents = students.length
  const [notify, setNotify] = useState<typeof students[0] | null>(null)
  const avgJn = students.filter(s => s.jn !== null).length > 0
    ? Math.round(students.reduce((sum, s) => sum + (s.jn ?? 0), 0) / totalStudents * 10) / 10
    : null
  const completed = students.filter(s => s.jn !== null && s.jn >= 56).length

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t("adminHisobot.statTotalStudents"), value: totalStudents, icon: Users, color: "#0e58a8" },
          { label: t("adminHisobot.statAvgJn"), value: avgJn !== null ? `${avgJn}%` : "—", icon: BarChart3, color: "#7c3aed" },
          { label: t("adminHisobot.statTopicsCount"), value: topics.length, icon: BookOpen, color: "#0891b2" },
          { label: t("adminHisobot.statCompleted"), value: `${completed}/${totalStudents}`, icon: BarChart3, color: "#15803d" },
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
          <p className="text-sm" style={L}>{t("adminHisobot.noStudentData")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-[10px] overflow-x-auto"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 2px 8px rgba(1,41,112,0.06)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
            <span className="text-sm font-semibold" style={T}>
              {t("adminHisobot.journalTableTitle")}
            </span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: "#f8fbff", borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-[#f8fbff] z-10" style={T}>{t("adminHisobot.colIndex")}</th>
                <th className="text-left px-3 py-2 font-semibold sticky left-6 bg-[#f8fbff] z-10 min-w-[180px]" style={T}>{t("adminHisobot.colStudent")}</th>
                <th colSpan={topics.length} className="text-center px-2 py-2 font-semibold border-l border-[rgba(1,41,112,0.08)]"
                  style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  {t("adminHisobot.colTopicsScore")}
                </th>
                <th className="text-center px-3 py-2 font-semibold border-l border-[rgba(1,41,112,0.08)] bg-[#eef4ff]"
                  style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{t("adminHisobot.colJnPct")}</th>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                <th className="sticky left-0 bg-white z-10" />
                <th className="sticky left-6 bg-white z-10" />
                {topics.map(tp => (
                  <th key={tp.key} className="text-center px-1 py-1.5 border-r border-[rgba(1,41,112,0.06)] font-semibold" style={L}>
                    {t("adminHisobot.topicHeader", { idx: tp.idx })}<br />
                    <span style={{ color: "#94a3b8" }}>/{tp.maxScore}</span>
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
                    {topics.map(tp => (
                      <ScoreCell key={tp.key} score={s.topicScores[tp.key] ?? null} max={tp.maxScore} />
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
                        title={t("adminHisobot.notifyTooltip")}>
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
        <NotifyModal name={notify.fullName} userId={notify.userId} subject={subject} jn={notify.jn} on1={null} on2={null} yn={null} att={null}
          onClose={() => setNotify(null)} />
      )}
    </div>
  )
}

export default function AdminHisobot() {
  const { t } = useLanguage()
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
      setErr2(e instanceof Error ? e.message : t("adminHisobot.errorOccurred"))
    } finally {
      setLoading2(false)
    }
  }

  async function doHemisSync() {
    setSyncing(true)
    setSyncMsg("")
    try {
      const res = await adminApi.hemisSync()
      setSyncMsg(res.message || t("adminHisobot.hemisSyncSuccess"))
    } catch (e: unknown) {
      setSyncMsg(e instanceof Error ? e.message : t("adminHisobot.errorGeneric"))
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
          <h1 className="text-[28px] font-medium" style={T}>{t("adminHisobot.pageTitle")}</h1>
          <p className="text-sm mt-1" style={L}>{t("adminHisobot.pageSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {syncMsg && (
            // Diqqat: HEMIS hozircha tashqi yozishga ruxsat bermaydi — bu
            // faqat LMS ichida ma'lumot to'planganini bildiradi, HAQIQATDA
            // HEMIS'ga yuborilgani emas. Shuning uchun yashil "muvaffaqiyat"
            // emas, neytral "ma'lumot" ko'rinishida ko'rsatiladi.
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full max-w-md"
              style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              <Info className="w-3.5 h-3.5 shrink-0" />{syncMsg}
            </span>
          )}
          <button type="button" onClick={doHemisSync} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[6px] text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {t("adminHisobot.hemisSyncBtn")}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white rounded-[10px] p-5 flex flex-col gap-4"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 2px 8px rgba(1,41,112,0.06)" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Teacher selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={L}>{t("adminHisobot.teacherLabel")}</label>
            <div className="relative">
              <select
                className="w-full px-3 py-2.5 rounded-[6px] appearance-none text-sm pr-8"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}
                value={selectedTeacher?.hemisId ?? ""}
                onChange={e => {
                  const teacher = teachers.find(tt => tt.hemisId === e.target.value) ?? null
                  setSelectedTeacher(teacher)
                  setJournal(null)
                }}>
                <option value="">{t("adminHisobot.selectPlaceholder")}</option>
                {teachers.map(tt => (
                  <option key={tt.hemisId} value={tt.hemisId}>{tt.fullName}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={L} />
            </div>
          </div>

          {/* Group select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={L}>{t("adminHisobot.groupLabel")}</label>
            <div className="relative">
              {infoLoading ? (
                <div className="px-3 py-2.5 rounded-[6px] text-sm flex items-center gap-2"
                  style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("adminHisobot.loadingLabel")}
                </div>
              ) : teacherGroups.length > 0 ? (
                <>
                  <select
                    className="w-full px-3 py-2.5 rounded-[6px] appearance-none text-sm pr-8"
                    style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}
                    value={groupId}
                    onChange={e => { setGroupId(e.target.value); setJournal(null) }}>
                    <option value="">{t("adminHisobot.selectGroupPlaceholder")}</option>
                    {teacherGroups.map(g => (
                      <option key={g.id} value={String(g.id)}>{g.name} (#{g.id})</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={L} />
                </>
              ) : (
                <input
                  type="number"
                  placeholder={t("adminHisobot.groupIdPlaceholder")}
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
            <label className="text-xs font-semibold" style={L}>{t("adminHisobot.subjectLabel")}</label>
            <div className="relative">
              {teacherSubjects.length > 0 ? (
                <>
                  <select
                    className="w-full px-3 py-2.5 rounded-[6px] appearance-none text-sm pr-8"
                    style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}
                    value={subject}
                    onChange={e => { setSubject(e.target.value); setJournal(null) }}>
                    <option value="">{t("adminHisobot.selectSubjectPlaceholder")}</option>
                    {teacherSubjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={L} />
                </>
              ) : (
                <input
                  type="text"
                  placeholder={t("adminHisobot.subjectNamePlaceholder")}
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
            {t("adminHisobot.viewBtn")}
          </button>
          {err2 && <span className="text-sm" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{err2}</span>}
        </div>
      </div>

      {/* Journal table */}
      {journal && <JournalTable journal={journal} subject={subject} />}

      {!journal && !loading2 && (
        <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <BarChart3 className="w-8 h-8 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm" style={L}>{t("adminHisobot.emptyStateHint")}</p>
        </div>
      )}
    </div>
  )
}
