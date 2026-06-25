"use client"

import React, { useEffect, useState, useCallback, useMemo } from "react"
import {
  BookOpen, Video, CalendarCheck, CheckCircle2,
  RefreshCw, TrendingUp, ChevronDown, ChevronUp, User, Clock,
  FileText, Eye, Search, ChevronLeft, ChevronRight, Music, Layers, Users
} from "lucide-react"
import { adminApi, type AdminTeacherStat, type AdminStudentStat, type AdminTeacherTotals } from "@/lib/api"

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const
const PAGE_SIZE = 10

function fmtDate(s: string) {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtTime(min: number) {
  if (!min) return "—"
  if (min < 60) return `${Math.round(min)} daq`
  return `${Math.floor(min / 60)}s ${Math.round(min % 60)}d`
}

function ProgressCircle({ pct }: { pct: number }) {
  const size = 44
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 80 ? "#15803d" : pct >= 50 ? "#0e58a8" : pct >= 20 ? "#ea580c" : "#94a3b8"
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8f0fb" strokeWidth={5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="text-[11px] font-bold z-10" style={{ color, fontFamily: "var(--font-poppins)" }}>{pct}%</span>
    </div>
  )
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

interface RowState {
  expanded: boolean
  loading: boolean
  totals: AdminTeacherTotals | null
  students: AdminStudentStat[]
  studentSearch: string
  studentPage: number
}

function StudentSubTable({ state, onChange }: {
  state: RowState
  onChange: (patch: Partial<RowState>) => void
}) {
  const { students, totals, studentSearch, studentPage } = state
  const tot = totals ?? { totalContent: 1, totalTopics: 1, totalExams: 1, totalVideos: 1, totalAssignments: 1 }

  const filtered = useMemo(() =>
    students.filter(s => !studentSearch.trim() || s.studentName.toLowerCase().includes(studentSearch.toLowerCase())),
    [students, studentSearch]
  )
  const pc = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pg = Math.min(studentPage, pc - 1)
  const slice = filtered.slice(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE)

  if (state.loading)
    return <div className="flex items-center justify-center py-8"><RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#0e58a8" }} /></div>

  if (!students.length)
    return (
      <div className="py-7 text-center">
        <User className="w-6 h-6 mx-auto mb-2" style={{ color: "#d8e6f7" }} />
        <p className="text-sm" style={L}>Bu o'qituvchi materiallarini ko'rgan talabalar yo'q</p>
      </div>
    )

  return (
    <div>
      {/* Student search bar */}
      <div className="px-5 py-2.5 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
        <div className="relative max-w-[280px] w-full">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#7293b9" }} />
          <input value={studentSearch} onChange={e => onChange({ studentSearch: e.target.value, studentPage: 0 })}
            placeholder="Talaba izlash..." className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[6px] outline-none"
            style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }} />
        </div>
        <span className="text-xs ml-auto" style={L}>{filtered.length} talaba</span>
      </div>

      {/* Student table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr style={{ backgroundColor: "#f0f7ff", borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
              {["#", "TALABA", "UMUMIY KO'RSATKICH", "MAVZULAR", "VIDEOLAR", "TESTLAR", "O'RTACHA BAL", "TOMOSHA VAQTI"].map(h => (
                <th key={h} className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide ${h === "#" || h === "TALABA" ? "text-left" : "text-center"}`}
                  style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((st, si) => {
              const pct = tot.totalContent > 0 ? Math.min(100, Math.round((st.doneTopics / tot.totalContent) * 100)) : 0
              return (
                <tr key={st.studentId} className="hover:bg-white/70 transition-colors"
                  style={{ borderBottom: "1px solid rgba(1,41,112,0.04)" }}>
                  <td className="px-4 py-3 text-xs w-10" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>{pg * PAGE_SIZE + si + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#f0f5ff" }}>
                        <User className="w-3.5 h-3.5" style={{ color: "#0e58a8" }} />
                      </div>
                      <span className="text-sm font-medium" style={T}>{st.studentName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center"><div className="flex justify-center"><ProgressCircle pct={pct} /></div></td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-medium" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{st.doneTopics}/{tot.totalContent}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-medium" style={{ color: "#ea580c", fontFamily: "var(--font-poppins)" }}>{st.doneTopics}/{tot.totalVideos}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-medium" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{st.doneSubmissions}/{tot.totalExams}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {st.avgGrade !== null
                      ? <span className="text-sm font-semibold" style={{ color: st.avgGrade >= 56 ? "#15803d" : "#b91c1c", fontFamily: "var(--font-poppins)" }}>{st.avgGrade}</span>
                      : <span className="text-xs" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      <Eye className="w-3 h-3" />{fmtTime(st.watchMinutes)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Student sub-pagination */}
      {pc > 1 && (
        <div className="flex items-center justify-between px-5 py-2.5" style={{ borderTop: "1px solid rgba(1,41,112,0.06)" }}>
          <span className="text-xs" style={L}>{pg * PAGE_SIZE + 1}–{Math.min((pg + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => onChange({ studentPage: Math.max(0, pg - 1) })} disabled={pg === 0}
              className="p-1 rounded disabled:opacity-30 hover:bg-blue-50 transition-colors" style={{ color: "#0e58a8" }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageNums(pg, pc).map((n, idx) =>
              n === "..." ? <span key={`e${idx}`} className="px-1 text-xs" style={L}>…</span> : (
                <button key={n} onClick={() => onChange({ studentPage: n as number })}
                  className="w-6 h-6 rounded text-xs font-medium transition-colors"
                  style={{ backgroundColor: n === pg ? "#0e58a8" : "transparent", color: n === pg ? "#fff" : "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {(n as number) + 1}
                </button>
              )
            )}
            <button onClick={() => onChange({ studentPage: Math.min(pc - 1, pg + 1) })} disabled={pg >= pc - 1}
              className="p-1 rounded disabled:opacity-30 hover:bg-blue-50 transition-colors" style={{ color: "#0e58a8" }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminOqituvchilar() {
  const [stats, setStats] = useState<AdminTeacherStat[]>([])
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    adminApi.teacherStats()
      .then(res => setStats(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() =>
    stats.filter(s => !search.trim() || s.fullName.toLowerCase().includes(search.toLowerCase())),
    [stats, search]
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage = Math.min(page, pageCount - 1)
  const slice = filtered.slice(curPage * PAGE_SIZE, (curPage + 1) * PAGE_SIZE)

  function patchRow(hemisId: string, patch: Partial<RowState>) {
    setRows(prev => ({ ...prev, [hemisId]: { ...prev[hemisId], ...patch } }))
  }

  async function toggleExpand(hemisId: string) {
    const cur = rows[hemisId]
    if (cur?.expanded) { patchRow(hemisId, { expanded: false }); return }
    if (cur?.students?.length > 0) { patchRow(hemisId, { expanded: true }); return }
    setRows(prev => ({ ...prev, [hemisId]: { expanded: true, loading: true, totals: null, students: [], studentSearch: "", studentPage: 0 } }))
    try {
      const res = await adminApi.teacherStudents(hemisId)
      setRows(prev => ({ ...prev, [hemisId]: { ...prev[hemisId], loading: false, totals: res.totals, students: res.data ?? [] } }))
    } catch {
      setRows(prev => ({ ...prev, [hemisId]: { ...prev[hemisId], loading: false } }))
    }
  }

  return (
    <div className="flex flex-col gap-5 p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold" style={T}>O'qituvchi hisoboti</h1>
          <p className="text-sm mt-1" style={L}>Har bir o'qituvchi bo'yicha kontent va talabalar o'zlashtirishining to'liq hisoboti</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px] hover:bg-blue-100 transition-colors"
          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Yangilash
        </button>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-[10px] px-4 py-3 flex items-center gap-3"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 1px 4px rgba(1,41,112,0.05)" }}>
        <Search className="w-4 h-4 shrink-0" style={{ color: "#7293b9" }} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="O'qituvchi ismi bo'yicha izlash..." className="flex-1 text-sm outline-none bg-transparent"
          style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
        {search && (
          <button onClick={() => { setSearch(""); setPage(0) }}
            className="text-xs px-2 py-0.5 rounded-full hover:bg-slate-200 transition-colors"
            style={{ backgroundColor: "#f1f5f9", color: "#7293b9" }}>×</button>
        )}
        <span className="text-xs shrink-0" style={L}>{filtered.length} ta o'qituvchi</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[12px] p-12 text-center" style={{ border: "1px solid rgba(1,41,112,0.08)" }}>
          <TrendingUp className="w-8 h-8 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm" style={L}>{search ? `"${search}" bo'yicha hech narsa topilmadi` : "Hali o'qituvchi ma'lumotlari yo'q"}</p>
        </div>
      ) : (
        <>
          {/* Teacher table */}
          <div className="bg-white rounded-[12px] overflow-hidden"
            style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 8px rgba(1,41,112,0.05)" }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px]">
                <thead>
                  <tr style={{ backgroundColor: "#f6faff", borderBottom: "2px solid rgba(1,41,112,0.08)" }}>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider w-12" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>#</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>O'QITUVCHI</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>MAVZULAR</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>VIDEOLAR</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>AUDIOLAR</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>TESTLAR</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>GURUHLAR</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>MEETINGLAR</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>TALABALAR</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>SO'NGGI FAOLLIK</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {slice.map((s, i) => {
                    const rowState = rows[s.hemisId]
                    const isExpanded = rowState?.expanded ?? false
                    const globalIdx = curPage * PAGE_SIZE + i + 1

                    return (
                      <React.Fragment key={s.hemisId}>
                        {/* Teacher row */}
                        <tr className="hover:bg-[#f6f9ff]/80 transition-colors cursor-pointer"
                          style={{ borderBottom: isExpanded ? "none" : "1px solid rgba(1,41,112,0.05)" }}
                          onClick={() => toggleExpand(s.hemisId)}>

                          <td className="px-4 py-3.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                              {globalIdx}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: "#f0f5ff", border: "1.5px solid rgba(14,88,168,0.15)" }}>
                                <User className="w-4 h-4" style={{ color: "#0e58a8" }} />
                              </div>
                              <div>
                                <div className="text-sm font-semibold" style={T}>{s.fullName}</div>
                                <div className="text-[11px] mt-0.5" style={L}>ID: {s.hemisId}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-2.5 rounded-[6px] text-sm font-bold"
                              style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                              {s.mavzular}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                              style={{ backgroundColor: "#fff7ed", color: "#ea580c", fontFamily: "var(--font-poppins)" }}>
                              <Video className="w-3 h-3" />{s.videolar}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                              style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                              <Music className="w-3 h-3" />{s.audiolar}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                              style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                              <FileText className="w-3 h-3" />{s.testlar}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                              style={{ backgroundColor: "#faf5ff", color: "#7c3aed", fontFamily: "var(--font-poppins)" }}>
                              <Users className="w-3 h-3" />{s.guruhlar}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                              style={{ backgroundColor: "#f5f3ff", color: "#7c3aed", fontFamily: "var(--font-poppins)" }}>
                              <CalendarCheck className="w-3 h-3" />{s.meetingCount}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                              style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                              <CheckCircle2 className="w-3 h-3" />{s.studentsCompleted}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-xs"
                              style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                              <Clock className="w-3 h-3" />{fmtDate(s.lastSeen)}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center" style={{ color: "#7293b9" }}>
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 mx-auto" />
                              : <ChevronDown className="w-4 h-4 mx-auto" />}
                          </td>
                        </tr>

                        {/* Expanded student sub-table */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={11} className="p-0"
                              style={{ borderBottom: "1px solid rgba(1,41,112,0.06)", backgroundColor: "#f8fbff" }}>
                              <div style={{ borderTop: "2px solid rgba(1,41,112,0.07)" }}>
                                <StudentSubTable
                                  state={rowState}
                                  onChange={patch => patchRow(s.hemisId, patch)}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="bg-white rounded-[10px] px-5 py-3 flex items-center justify-between"
              style={{ border: "1px solid rgba(1,41,112,0.08)" }}>
              <span className="text-xs" style={L}>
                {curPage * PAGE_SIZE + 1}–{Math.min((curPage + 1) * PAGE_SIZE, filtered.length)} / {filtered.length} ta o'qituvchi
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={curPage === 0}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-xs font-medium disabled:opacity-30 hover:bg-blue-50 transition-colors"
                  style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  <ChevronLeft className="w-3.5 h-3.5" /> Oldingi
                </button>

                {pageNums(curPage, pageCount).map((n, idx) =>
                  n === "..." ? <span key={`e${idx}`} className="px-1 text-xs" style={L}>…</span> : (
                    <button key={n} onClick={() => setPage(n as number)}
                      className="w-8 h-8 rounded-[6px] text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: n === curPage ? "#0e58a8" : "transparent",
                        color: n === curPage ? "#fff" : "#7293b9",
                        fontFamily: "var(--font-poppins)",
                        border: n === curPage ? "none" : "1px solid rgba(1,41,112,0.1)",
                      }}>
                      {(n as number) + 1}
                    </button>
                  )
                )}

                <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={curPage >= pageCount - 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-xs font-medium disabled:opacity-30 hover:bg-blue-50 transition-colors"
                  style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  Keyingi <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
