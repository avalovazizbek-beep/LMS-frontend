"use client"

import { useMemo, useState, useEffect } from "react"
import { Search, ClipboardCheck, ChevronDown, ChevronUp, Users, Loader2, CalendarDays, CheckCircle2, XCircle, Video } from "lucide-react"
import { adminApi, type AdminAttendanceRow, type PlatformAttendanceDay, type AdminTeacherStat } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

function pctColor(pct: number) {
  if (pct >= 80) return "#15803d"
  if (pct >= 60) return "#d97706"
  return "#b91c1c"
}

/* ── Qo'lda kiritilgan davomat (eski tab) ─────────────────────────────── */
function ManualAttendance() {
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, loading, error, refetch } = useApi(() => adminApi.attendance(), [])
  const rows: AdminAttendanceRow[] = data?.data ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      r.groupName.toLowerCase().includes(q) ||
      r.subjectName.toLowerCase().includes(q) ||
      r.lessonDate.includes(q)
    )
  }, [rows, search])

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; groupId: number; groupName: string; subjectName: string; rows: AdminAttendanceRow[] }>()
    for (const r of filtered) {
      const key = `${r.groupId}::${r.subjectName}`
      if (!map.has(key)) map.set(key, { key, groupId: r.groupId, groupName: r.groupName, subjectName: r.subjectName, rows: [] })
      map.get(key)!.rows.push(r)
    }
    return Array.from(map.values()).sort((a, b) => a.groupName.localeCompare(b.groupName) || a.subjectName.localeCompare(b.subjectName))
  }, [filtered])

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 px-3 py-2.5 rounded-[6px] bg-white w-full max-w-sm"
        style={{ border: "1px solid rgba(1,41,112,0.2)" }}>
        <Search className="w-4 h-4 shrink-0" style={L} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Guruh, fan yoki sana bo'yicha"
          className="flex-1 bg-transparent outline-none text-sm"
          style={T} />
      </label>

      {groups.length === 0 ? (
        <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <ClipboardCheck className="w-8 h-8 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm" style={L}>Davomat ma&apos;lumotlari topilmadi</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(g => {
            const totalLessons = g.rows.length
            const avgPct = totalLessons > 0
              ? Math.round(g.rows.reduce((s, r) => s + r.presentPct, 0) / totalLessons)
              : 0
            const totalStudents = g.rows[0]?.total ?? 0
            const isOpen = expanded === g.key

            return (
              <div key={g.key} className="bg-white rounded-[10px] overflow-hidden"
                style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 2px 8px rgba(1,41,112,0.06)" }}>
                <button type="button" onClick={() => setExpanded(isOpen ? null : g.key)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[#f8fbff] transition-colors text-left">
                  <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#eef4ff" }}>
                    <Users className="w-5 h-5" style={{ color: "#0e58a8" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={T}>{g.groupName}</div>
                    <div className="text-xs mt-0.5 truncate" style={L}>{g.subjectName}</div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: pctColor(avgPct) }}>{avgPct}%</div>
                      <div className="text-xs" style={L}>o&apos;rtacha</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold" style={T}>{totalLessons}</div>
                      <div className="text-xs" style={L}>dars</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold" style={T}>{totalStudents}</div>
                      <div className="text-xs" style={L}>talaba</div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4" style={L} /> : <ChevronDown className="w-4 h-4" style={L} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="overflow-x-auto" style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: "#f8fbff", borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                          <th className="px-4 py-2 text-left font-semibold" style={L}>Sana</th>
                          <th className="px-3 py-2 text-center font-semibold" style={L}>Jami</th>
                          <th className="px-3 py-2 text-center font-semibold" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>Keldi</th>
                          <th className="px-3 py-2 text-center font-semibold" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>Kelmadi</th>
                          <th className="px-3 py-2 text-center font-semibold" style={{ color: "#d97706", fontFamily: "var(--font-poppins)" }}>Kechikdi</th>
                          <th className="px-3 py-2 text-center font-semibold" style={L}>Uzrli</th>
                          <th className="px-3 py-2 text-center font-semibold" style={T}>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.rows.map((r, i) => (
                          <tr key={r.lessonDate} style={{ borderBottom: i < g.rows.length - 1 ? "1px solid rgba(1,41,112,0.05)" : "none" }}>
                            <td className="px-4 py-2" style={T}>{r.lessonDate}</td>
                            <td className="px-3 py-2 text-center" style={L}>{r.total}</td>
                            <td className="px-3 py-2 text-center font-medium" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>{r.present}</td>
                            <td className="px-3 py-2 text-center font-medium" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{r.absent}</td>
                            <td className="px-3 py-2 text-center font-medium" style={{ color: "#d97706", fontFamily: "var(--font-poppins)" }}>{r.late}</td>
                            <td className="px-3 py-2 text-center" style={L}>{r.excused}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="font-bold text-sm" style={{ color: pctColor(r.presentPct) }}>{r.presentPct}%</span>
                            </td>
                          </tr>
                        ))}
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

/* ── Platforma asosida davomat (yangi tab) ────────────────────────────── */
function PlatformAttendance() {
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
      setErr2(e instanceof Error ? e.message : "Xatolik yuz berdi")
    } finally {
      setLoading2(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="bg-white rounded-[10px] p-5 flex flex-col gap-4"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 2px 8px rgba(1,41,112,0.06)" }}>
        <p className="text-xs" style={L}>
          Talaba kunlik platformada ≥40 min bo&apos;lsa — keldi. Meeting kuni: meeting davomiyligining 100% unda bo&apos;lsa — keldi.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Teacher */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={L}>O&apos;qituvchi</label>
            <div className="relative">
              <select
                className="w-full px-3 py-2.5 rounded-[6px] appearance-none text-sm pr-8"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}
                value={selectedTeacher?.hemisId ?? ""}
                onChange={e => {
                  const t = teachers.find(t => t.hemisId === e.target.value) ?? null
                  setSelectedTeacher(t); setResult(null)
                }}>
                <option value="">— Tanlang —</option>
                {teachers.map(t => <option key={t.hemisId} value={t.hemisId}>{t.fullName}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={L} />
            </div>
          </div>

          {/* Group */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={L}>Guruh</label>
            <div className="relative">
              {infoLoading ? (
                <div className="px-3 py-2.5 rounded-[6px] text-sm flex items-center gap-2"
                  style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Yuklanmoqda...
                </div>
              ) : groups.length > 0 ? (
                <>
                  <select
                    className="w-full px-3 py-2.5 rounded-[6px] appearance-none text-sm pr-8"
                    style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}
                    value={groupId}
                    onChange={e => { setGroupId(e.target.value); setResult(null) }}>
                    <option value="">— Guruh tanlang —</option>
                    {groups.map(g => <option key={g.id} value={String(g.id)}>{g.name} (#{g.id})</option>)}
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
                  onChange={e => { setGroupId(e.target.value); setResult(null) }}
                />
              )}
            </div>
          </div>

          {/* Subject */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={L}>Fan (ixtiyoriy)</label>
            <div className="relative">
              {subjects.length > 0 ? (
                <>
                  <select
                    className="w-full px-3 py-2.5 rounded-[6px] appearance-none text-sm pr-8"
                    style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}
                    value={subject}
                    onChange={e => { setSubject(e.target.value); setResult(null) }}>
                    <option value="">— Barcha fanlar —</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={L} />
                </>
              ) : (
                <input
                  type="text"
                  placeholder="Fan nomi (ixtiyoriy)"
                  className="w-full px-3 py-2.5 rounded-[6px] text-sm"
                  style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}
                  value={subject}
                  onChange={e => { setSubject(e.target.value); setResult(null) }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={L}>Boshlanish sana</label>
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setResult(null) }}
              className="px-3 py-2.5 rounded-[6px] text-sm"
              style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={L}>Tugash sana</label>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setResult(null) }}
              className="px-3 py-2.5 rounded-[6px] text-sm"
              style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }} />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={load} disabled={!groupId || loading2}
              className="px-5 py-2.5 rounded-[6px] text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              {loading2 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Ko&apos;rish
            </button>
          </div>
          {err2 && (
            <span className="text-xs" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{err2}</span>
          )}
        </div>
      </div>

      {/* Results */}
      {result === null && !loading2 && (
        <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <CalendarDays className="w-8 h-8 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm" style={L}>Guruh va sana oraliqni tanlang, so&apos;ng &quot;Ko&apos;rish&quot; tugmasini bosing</p>
        </div>
      )}

      {result !== null && result.length === 0 && (
        <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <ClipboardCheck className="w-8 h-8 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm" style={L}>Tanlangan parametrlar bo&apos;yicha dars jadvali topilmadi</p>
          <p className="text-xs mt-1" style={L}>Dars jadvali HEMIS'dan sinxronlanganligini tekshiring</p>
        </div>
      )}

      {result && result.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Jami darslar", value: result.length, color: "#0e58a8" },
              { label: "O'rtacha davomat", value: `${Math.round(result.reduce((s, r) => s + r.presentPct, 0) / result.length)}%`, color: pctColor(Math.round(result.reduce((s, r) => s + r.presentPct, 0) / result.length)) },
              { label: "Meeting kunlari", value: result.filter(r => r.isMeetingDay).length, color: "#7c3aed" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-[10px] p-4"
                style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 2px 8px rgba(1,41,112,0.06)" }}>
                <div className="text-xs mb-1" style={L}>{s.label}</div>
                <div className="text-2xl font-bold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {result.map(day => {
            const key = `${day.lessonDate}::${day.subjectName}`
            const isOpen = expanded === key
            return (
              <div key={key} className="bg-white rounded-[10px] overflow-hidden"
                style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 2px 8px rgba(1,41,112,0.06)" }}>
                <button type="button" onClick={() => setExpanded(isOpen ? null : key)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[#f8fbff] transition-colors text-left">
                  <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: day.isMeetingDay ? "#f5f3ff" : "#eef4ff" }}>
                    {day.isMeetingDay
                      ? <Video className="w-5 h-5" style={{ color: "#7c3aed" }} />
                      : <CalendarDays className="w-5 h-5" style={{ color: "#0e58a8" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={T}>{day.lessonDate}</div>
                    <div className="text-xs mt-0.5" style={L}>
                      {day.subjectName}
                      {day.isMeetingDay && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: "#f5f3ff", color: "#7c3aed" }}>Meeting {day.meetingMinutes} min</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" style={{ color: "#15803d" }} />
                      <span className="text-sm font-semibold" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>{day.present}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" style={{ color: "#b91c1c" }} />
                      <span className="text-sm font-semibold" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{day.absent}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: pctColor(day.presentPct) }}>{day.presentPct}%</div>
                      <div className="text-xs" style={L}>{day.total} talaba</div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4" style={L} /> : <ChevronDown className="w-4 h-4" style={L} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="overflow-x-auto" style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: "#f8fbff", borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                          <th className="px-4 py-2 text-left font-semibold" style={L}>#</th>
                          <th className="px-4 py-2 text-left font-semibold" style={L}>Talaba</th>
                          <th className="px-3 py-2 text-center font-semibold" style={L}>Holat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.students.map((s, i) => (
                          <tr key={s.studentId} style={{ borderBottom: i < day.students.length - 1 ? "1px solid rgba(1,41,112,0.05)" : "none" }}>
                            <td className="px-4 py-2 text-xs" style={L}>{i + 1}</td>
                            <td className="px-4 py-2 text-sm" style={T}>{s.studentName || `Talaba #${s.studentId}`}</td>
                            <td className="px-3 py-2 text-center">
                              {s.status === "present"
                                ? <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f0fdf4", color: "#15803d" }}><CheckCircle2 className="w-3 h-3" /> Keldi</span>
                                : <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fef2f2", color: "#b91c1c" }}><XCircle className="w-3 h-3" /> Kelmadi</span>}
                            </td>
                          </tr>
                        ))}
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

/* ── Main page ────────────────────────────────────────────────────────── */
export default function AdminDavomatlar() {
  const [tab, setTab] = useState<"manual" | "platform">("manual")

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={T}>Davomatlar</h1>
        <p className="text-sm mt-1" style={L}>Guruh va fan bo&apos;yicha davomat statistikasi</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-[8px] w-fit" style={{ backgroundColor: "#f1f5f9" }}>
        {([
          { key: "manual",   label: "Qo'lda kiritilgan" },
          { key: "platform", label: "Platforma davomati" },
        ] as { key: "manual" | "platform"; label: string }[]).map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-[6px] text-sm font-medium transition-all"
            style={{
              backgroundColor: tab === t.key ? "#fff" : "transparent",
              color: tab === t.key ? "#012970" : "#7293b9",
              fontFamily: "var(--font-poppins)",
              boxShadow: tab === t.key ? "0 1px 3px rgba(1,41,112,0.12)" : "none",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "manual"   && <ManualAttendance />}
      {tab === "platform" && <PlatformAttendance />}
    </div>
  )
}
