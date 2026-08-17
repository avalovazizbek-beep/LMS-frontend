"use client"

import { Fragment, useMemo, useState, useEffect } from "react"
import {
  Search, ClipboardCheck, ChevronDown, ChevronUp, Users, Loader2, CalendarDays,
  CheckCircle2, XCircle, Video, User, FileSpreadsheet, FileText, Send,
} from "lucide-react"
import {
  adminApi, type AdminAttendanceRow, type AdminAttendanceDetailRow, type AdminAttendanceStudentRow,
  type AdminAttendanceStudentDetailRow, type PlatformAttendanceDay, type AdminTeacherStat,
} from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { exportToExcel, exportToPdf, buildPdfBase64 } from "@/lib/exportUtils"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

function pctColor(pct: number) {
  if (pct >= 80) return "#15803d"
  if (pct >= 60) return "#d97706"
  return "#b91c1c"
}

const STATUS_LABEL_KEY: Record<string, string> = {
  present: "adminDavomatlar.statusPresent", absent: "adminDavomatlar.statusAbsent",
  excused: "adminDavomatlar.statusExcused", late: "adminDavomatlar.statusLate",
}
const STATUS_COLOR: Record<string, string> = {
  present: "#15803d", absent: "#b91c1c", excused: "#7293b9", late: "#d97706",
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage()
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `${STATUS_COLOR[status] ?? "#7293b9"}1a`, color: STATUS_COLOR[status] ?? "#7293b9" }}>
      {status === "present" ? <CheckCircle2 className="w-3 h-3" /> : status === "absent" ? <XCircle className="w-3 h-3" /> : null}
      {STATUS_LABEL_KEY[status] ? t(STATUS_LABEL_KEY[status]) : status}
    </span>
  )
}

/* ── Bitta sananing ichidagi talabalar ro'yxati (ism-familiya + holat) ─── */
function DateDetailRows({ groupId, subject, date }: { groupId: number; subject: string; date: string }) {
  const { t } = useLanguage()
  const [rows, setRows] = useState<AdminAttendanceDetailRow[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminApi.attendanceDetail({ groupId, subject, date })
      .then(r => { if (!cancelled) setRows(r.data ?? []) })
      .catch(() => { if (!cancelled) setRows([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [groupId, subject, date])

  if (loading) return <div className="flex items-center justify-center py-5"><Loader2 className="w-4 h-4 animate-spin" style={{ color: "#0e58a8" }} /></div>
  if (!rows || rows.length === 0) return <p className="text-xs py-4 px-4" style={L}>{t("adminDavomatlar.noStudentDataForDate")}</p>

  return (
    <div className="px-4 pb-3">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
            <th className="text-left py-1.5 font-semibold text-xs" style={L}>{t("adminDavomatlar.colIndex")}</th>
            <th className="text-left py-1.5 font-semibold text-xs" style={L}>{t("adminDavomatlar.colFullName")}</th>
            <th className="text-center py-1.5 font-semibold text-xs" style={L}>{t("adminDavomatlar.colStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.studentId} style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(1,41,112,0.04)" : "none" }}>
              <td className="py-1.5 text-xs" style={L}>{i + 1}</td>
              <td className="py-1.5" style={T}>{r.studentName}</td>
              <td className="py-1.5 text-center"><StatusBadge status={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Talaba bo'yicha ro'yxat: har birining umumiy foizi, bosilsa sana-sana tarixi ─── */
function StudentAttendanceView({ groupId, subject }: { groupId: number; subject: string }) {
  const { t } = useLanguage()
  const [rows, setRows] = useState<AdminAttendanceStudentRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null)
  const [detail, setDetail] = useState<Record<number, AdminAttendanceStudentDetailRow[]>>({})
  const [detailLoading, setDetailLoading] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminApi.attendanceStudents({ groupId, subject })
      .then(r => { if (!cancelled) setRows(r.data ?? []) })
      .catch(() => { if (!cancelled) setRows([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [groupId, subject])

  async function toggleStudent(studentId: number) {
    if (expandedStudent === studentId) { setExpandedStudent(null); return }
    setExpandedStudent(studentId)
    if (detail[studentId]) return
    setDetailLoading(studentId)
    try {
      const r = await adminApi.attendanceStudentDetail({ groupId, subject, studentId })
      setDetail(prev => ({ ...prev, [studentId]: r.data ?? [] }))
    } catch { setDetail(prev => ({ ...prev, [studentId]: [] })) }
    finally { setDetailLoading(null) }
  }

  if (loading) return <div className="flex items-center justify-center py-5"><Loader2 className="w-4 h-4 animate-spin" style={{ color: "#0e58a8" }} /></div>
  if (!rows || rows.length === 0) return <p className="text-xs py-4 px-4" style={L}>{t("adminDavomatlar.noStudentDataForGroup")}</p>

  return (
    <div className="px-4 pb-3 flex flex-col gap-2">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
            <th className="text-left py-1.5 font-semibold text-xs" style={L}>{t("adminDavomatlar.colIndex")}</th>
            <th className="text-left py-1.5 font-semibold text-xs" style={L}>{t("adminDavomatlar.colFullName")}</th>
            <th className="text-center py-1.5 font-semibold text-xs" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>{t("adminDavomatlar.colPresent")}</th>
            <th className="text-center py-1.5 font-semibold text-xs" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{t("adminDavomatlar.colAbsent")}</th>
            <th className="text-center py-1.5 font-semibold text-xs" style={L}>{t("adminDavomatlar.colTotal")}</th>
            <th className="text-center py-1.5 font-semibold text-xs" style={T}>{t("adminDavomatlar.colPercent")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const isOpen = expandedStudent === s.studentId
            return (
              <Fragment key={s.studentId}>
                <tr className="cursor-pointer hover:bg-[#f6f9ff]/60 transition-colors"
                  style={{ borderBottom: isOpen ? "none" : "1px solid rgba(1,41,112,0.04)" }}
                  onClick={() => toggleStudent(s.studentId)}>
                  <td className="py-1.5 text-xs" style={L}>{i + 1}</td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 shrink-0" style={{ color: "#7293b9" }} />
                      <span style={T}>{s.studentName}</span>
                    </div>
                  </td>
                  <td className="py-1.5 text-center font-medium" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>{s.present}</td>
                  <td className="py-1.5 text-center font-medium" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{s.absent}</td>
                  <td className="py-1.5 text-center" style={L}>{s.total}</td>
                  <td className="py-1.5 text-center">
                    <span className="font-bold text-xs" style={{ color: pctColor(s.presentPct) }}>{s.presentPct}%</span>
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={6} className="pb-2" style={{ backgroundColor: "#f8fbff" }}>
                      {detailLoading === s.studentId ? (
                        <div className="flex items-center justify-center py-3"><Loader2 className="w-4 h-4 animate-spin" style={{ color: "#0e58a8" }} /></div>
                      ) : (detail[s.studentId]?.length ?? 0) === 0 ? (
                        <p className="text-xs py-2 px-2" style={L}>{t("adminDavomatlar.noDateData")}</p>
                      ) : (
                        <table className="w-full text-xs mt-1">
                          <tbody>
                            {detail[s.studentId].map(d => (
                              <tr key={d.lessonDate} style={{ borderBottom: "1px solid rgba(1,41,112,0.04)" }}>
                                <td className="py-1 px-2" style={T}>{d.lessonDate}</td>
                                <td className="py-1 px-2 text-right"><StatusBadge status={d.status} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
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

/* ── Qo'lda kiritilgan davomat (eski tab) ─────────────────────────────── */
type AttGroup = { key: string; groupId: number; groupName: string; subjectName: string; rows: AdminAttendanceRow[] }

function GroupAttendanceCard({ g, isOpen, onToggle }: { g: AttGroup; isOpen: boolean; onToggle: () => void }) {
  const { t } = useLanguage()
  const [viewMode, setViewMode] = useState<"sana" | "talaba">("sana")
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  const totalLessons = g.rows.length
  const avgPct = totalLessons > 0 ? Math.round(g.rows.reduce((s, r) => s + r.presentPct, 0) / totalLessons) : 0
  const totalStudents = g.rows[0]?.total ?? 0

  return (
    <div className="bg-white rounded-[10px] overflow-hidden"
      style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 2px 8px rgba(1,41,112,0.06)" }}>
      <button type="button" onClick={onToggle}
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
            <div className="text-xs" style={L}>{t("adminDavomatlar.avgLabel")}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold" style={T}>{totalLessons}</div>
            <div className="text-xs" style={L}>{t("adminDavomatlar.lessonsLabel")}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold" style={T}>{totalStudents}</div>
            <div className="text-xs" style={L}>{t("adminDavomatlar.studentsLabel")}</div>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4" style={L} /> : <ChevronDown className="w-4 h-4" style={L} />}
        </div>
      </button>

      {isOpen && (
        <div style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
          {/* Ko'rinish tugmalari */}
          <div className="flex gap-1 p-2" style={{ backgroundColor: "#f8fbff" }}>
            {([
              { key: "sana",    label: t("adminDavomatlar.viewBySana") },
              { key: "talaba",  label: t("adminDavomatlar.viewByTalaba") },
            ] as { key: "sana" | "talaba"; label: string }[]).map(vm => (
              <button key={vm.key} type="button" onClick={() => setViewMode(vm.key)}
                className="px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors"
                style={{
                  backgroundColor: viewMode === vm.key ? "#fff" : "transparent",
                  color: viewMode === vm.key ? "#0e58a8" : "#7293b9",
                  border: viewMode === vm.key ? "1px solid rgba(14,88,168,0.2)" : "1px solid transparent",
                  fontFamily: "var(--font-poppins)",
                }}>
                {vm.label}
              </button>
            ))}
          </div>

          {viewMode === "sana" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: "#f8fbff", borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                    <th className="px-4 py-2 text-left font-semibold" style={L}>{t("adminDavomatlar.tableColDate")}</th>
                    <th className="px-3 py-2 text-center font-semibold" style={L}>{t("adminDavomatlar.tableColTotal")}</th>
                    <th className="px-3 py-2 text-center font-semibold" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>{t("adminDavomatlar.tableColPresent")}</th>
                    <th className="px-3 py-2 text-center font-semibold" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{t("adminDavomatlar.tableColAbsent")}</th>
                    <th className="px-3 py-2 text-center font-semibold" style={{ color: "#d97706", fontFamily: "var(--font-poppins)" }}>{t("adminDavomatlar.tableColLate")}</th>
                    <th className="px-3 py-2 text-center font-semibold" style={L}>{t("adminDavomatlar.tableColExcused")}</th>
                    <th className="px-3 py-2 text-center font-semibold" style={T}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r, i) => {
                    const dateOpen = expandedDate === r.lessonDate
                    return (
                      <Fragment key={r.lessonDate}>
                        <tr className="cursor-pointer hover:bg-[#f6f9ff]/60 transition-colors"
                          style={{ borderBottom: dateOpen ? "none" : (i < g.rows.length - 1 ? "1px solid rgba(1,41,112,0.05)" : "none") }}
                          onClick={() => setExpandedDate(dateOpen ? null : r.lessonDate)}>
                          <td className="px-4 py-2 flex items-center gap-1.5" style={T}>
                            {dateOpen ? <ChevronUp className="w-3.5 h-3.5" style={L} /> : <ChevronDown className="w-3.5 h-3.5" style={L} />}
                            {r.lessonDate}
                          </td>
                          <td className="px-3 py-2 text-center" style={L}>{r.total}</td>
                          <td className="px-3 py-2 text-center font-medium" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>{r.present}</td>
                          <td className="px-3 py-2 text-center font-medium" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{r.absent}</td>
                          <td className="px-3 py-2 text-center font-medium" style={{ color: "#d97706", fontFamily: "var(--font-poppins)" }}>{r.late}</td>
                          <td className="px-3 py-2 text-center" style={L}>{r.excused}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="font-bold text-sm" style={{ color: pctColor(r.presentPct) }}>{r.presentPct}%</span>
                          </td>
                        </tr>
                        {dateOpen && (
                          <tr>
                            <td colSpan={7} style={{ backgroundColor: "#f8fbff", borderBottom: i < g.rows.length - 1 ? "1px solid rgba(1,41,112,0.08)" : "none" }}>
                              <DateDetailRows groupId={g.groupId} subject={g.subjectName} date={r.lessonDate} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <StudentAttendanceView groupId={g.groupId} subject={g.subjectName} />
          )}
        </div>
      )}
    </div>
  )
}

function ManualAttendance() {
  const { t } = useLanguage()
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
    const map = new Map<string, AttGroup>()
    for (const r of filtered) {
      const key = `${r.groupId}::${r.subjectName}`
      if (!map.has(key)) map.set(key, { key, groupId: r.groupId, groupName: r.groupName, subjectName: r.subjectName, rows: [] })
      map.get(key)!.rows.push(r)
    }
    return Array.from(map.values()).sort((a, b) => a.groupName.localeCompare(b.groupName) || a.subjectName.localeCompare(b.subjectName))
  }, [filtered])

  function doExportExcel() {
    const sheetName = t("adminDavomatlar.exportSheetName")
    const colGroup = t("adminDavomatlar.exportColGroup"), colSubject = t("adminDavomatlar.exportColSubject"), colDate = t("adminDavomatlar.exportColDate")
    const colTotal = t("adminDavomatlar.exportColTotal"), colPresent = t("adminDavomatlar.exportColPresent"), colAbsent = t("adminDavomatlar.exportColAbsent")
    const colLate = t("adminDavomatlar.exportColLate"), colExcused = t("adminDavomatlar.exportColExcused"), colPercent = t("adminDavomatlar.exportColPercent")
    exportToExcel("davomat-hisoboti", [{
      name: sheetName,
      rows: filtered.map(r => ({
        [colGroup]: r.groupName, [colSubject]: r.subjectName, [colDate]: r.lessonDate,
        [colTotal]: r.total, [colPresent]: r.present, [colAbsent]: r.absent, [colLate]: r.late, [colExcused]: r.excused,
        [colPercent]: r.presentPct,
      })),
    }])
  }

  function doExportPdf() {
    exportToPdf(
      "davomat-hisoboti", t("adminDavomatlar.exportPdfTitle"),
      [t("adminDavomatlar.exportColGroup"), t("adminDavomatlar.exportColSubject"), t("adminDavomatlar.exportColDate"), t("adminDavomatlar.exportColTotal"), t("adminDavomatlar.exportColPresent"), t("adminDavomatlar.exportColAbsent"), t("adminDavomatlar.exportColLate"), t("adminDavomatlar.exportColExcused"), t("adminDavomatlar.exportColPercent")],
      filtered.map(r => [r.groupName, r.subjectName, r.lessonDate, r.total, r.present, r.absent, r.late, r.excused, `${r.presentPct}%`])
    )
  }

  const [sendingTelegram, setSendingTelegram] = useState(false)
  const [telegramMsg, setTelegramMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function doSendTelegram() {
    setSendingTelegram(true)
    setTelegramMsg(null)
    try {
      const pdfBase64 = buildPdfBase64(
        t("adminDavomatlar.exportPdfTitle"),
        [t("adminDavomatlar.exportColGroup"), t("adminDavomatlar.exportColSubject"), t("adminDavomatlar.exportColDate"), t("adminDavomatlar.exportColTotal"), t("adminDavomatlar.exportColPresent"), t("adminDavomatlar.exportColAbsent"), t("adminDavomatlar.exportColLate"), t("adminDavomatlar.exportColExcused"), t("adminDavomatlar.exportColPercent")],
        filtered.map(r => [r.groupName, r.subjectName, r.lessonDate, r.total, r.present, r.absent, r.late, r.excused, `${r.presentPct}%`])
      )
      const res = await adminApi.sendReportTelegram({ filename: "davomat-hisoboti.pdf", caption: t("adminDavomatlar.exportPdfTitle"), pdfBase64 })
      setTelegramMsg({ ok: true, text: res.message || t("adminDavomatlar.telegramSent") })
    } catch (e) {
      setTelegramMsg({ ok: false, text: e instanceof Error ? e.message : t("adminDavomatlar.telegramError") })
    } finally {
      setSendingTelegram(false)
    }
  }

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 px-3 py-2.5 rounded-[6px] bg-white w-full max-w-sm"
          style={{ border: "1px solid rgba(1,41,112,0.2)" }}>
          <Search className="w-4 h-4 shrink-0" style={L} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("adminDavomatlar.searchPlaceholderManual")}
            className="flex-1 bg-transparent outline-none text-sm"
            style={T} />
        </label>
        <div className="flex items-center gap-2 ml-auto">
          <button type="button" onClick={doExportExcel} disabled={!filtered.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-xs font-medium transition-colors hover:bg-[#f0fdf4] disabled:opacity-50"
            style={{ border: "1px solid rgba(21,128,61,0.25)", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button type="button" onClick={doExportPdf} disabled={!filtered.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-xs font-medium transition-colors hover:bg-[#fef2f2] disabled:opacity-50"
            style={{ border: "1px solid rgba(185,28,28,0.25)", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <button type="button" onClick={doSendTelegram} disabled={!filtered.length || sendingTelegram}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-xs font-medium transition-colors hover:bg-[#eff6ff] disabled:opacity-50"
            style={{ border: "1px solid rgba(14,88,168,0.25)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {sendingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Telegram
          </button>
        </div>
      </div>

      {telegramMsg && (
        <div className="text-xs px-3 py-2 rounded-[6px] w-fit"
          style={{ backgroundColor: telegramMsg.ok ? "#f0fdf4" : "#fef2f2", color: telegramMsg.ok ? "#15803d" : "#b91c1c", fontFamily: "var(--font-poppins)" }}>
          {telegramMsg.text}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <ClipboardCheck className="w-8 h-8 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm" style={L}>{t("adminDavomatlar.noAttendanceData")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(g => (
            <GroupAttendanceCard key={g.key} g={g} isOpen={expanded === g.key}
              onToggle={() => setExpanded(expanded === g.key ? null : g.key)} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Platforma asosida davomat (yangi tab) ────────────────────────────── */
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

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="bg-white rounded-[10px] p-5 flex flex-col gap-4"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 2px 8px rgba(1,41,112,0.06)" }}>
        <p className="text-xs" style={L}>
          {t("adminDavomatlar.platformHint")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Teacher */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={L}>{t("adminDavomatlar.teacherLabel")}</label>
            <div className="relative">
              <select
                className="w-full px-3 py-2.5 rounded-[6px] appearance-none text-sm pr-8"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}
                value={selectedTeacher?.hemisId ?? ""}
                onChange={e => {
                  const teacher = teachers.find(tt => tt.hemisId === e.target.value) ?? null
                  setSelectedTeacher(teacher); setResult(null)
                }}>
                <option value="">{t("adminDavomatlar.selectPlaceholder")}</option>
                {teachers.map(tt => <option key={tt.hemisId} value={tt.hemisId}>{tt.fullName}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={L} />
            </div>
          </div>

          {/* Group */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={L}>{t("adminDavomatlar.groupLabel")}</label>
            <div className="relative">
              {infoLoading ? (
                <div className="px-3 py-2.5 rounded-[6px] text-sm flex items-center gap-2"
                  style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("adminDavomatlar.loadingLabel")}
                </div>
              ) : groups.length > 0 ? (
                <>
                  <select
                    className="w-full px-3 py-2.5 rounded-[6px] appearance-none text-sm pr-8"
                    style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}
                    value={groupId}
                    onChange={e => { setGroupId(e.target.value); setResult(null) }}>
                    <option value="">{t("adminDavomatlar.selectGroupPlaceholder")}</option>
                    {groups.map(g => <option key={g.id} value={String(g.id)}>{g.name} (#{g.id})</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={L} />
                </>
              ) : (
                <input
                  type="number"
                  placeholder={t("adminDavomatlar.groupIdPlaceholder")}
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
            <label className="text-xs font-semibold" style={L}>{t("adminDavomatlar.subjectOptionalLabel")}</label>
            <div className="relative">
              {subjects.length > 0 ? (
                <>
                  <select
                    className="w-full px-3 py-2.5 rounded-[6px] appearance-none text-sm pr-8"
                    style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}
                    value={subject}
                    onChange={e => { setSubject(e.target.value); setResult(null) }}>
                    <option value="">{t("adminDavomatlar.allSubjectsOption")}</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={L} />
                </>
              ) : (
                <input
                  type="text"
                  placeholder={t("adminDavomatlar.subjectOptionalPlaceholder")}
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
            <label className="text-xs font-semibold" style={L}>{t("adminDavomatlar.startDateLabel")}</label>
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setResult(null) }}
              className="px-3 py-2.5 rounded-[6px] text-sm"
              style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={L}>{t("adminDavomatlar.endDateLabel")}</label>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setResult(null) }}
              className="px-3 py-2.5 rounded-[6px] text-sm"
              style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }} />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={load} disabled={!groupId || loading2}
              className="px-5 py-2.5 rounded-[6px] text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              {loading2 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {t("adminDavomatlar.viewBtn")}
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
          <p className="text-sm" style={L}>{t("adminDavomatlar.emptySelectHint")}</p>
        </div>
      )}

      {result !== null && result.length === 0 && (
        <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <ClipboardCheck className="w-8 h-8 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm" style={L}>{t("adminDavomatlar.noScheduleFound")}</p>
          <p className="text-xs mt-1" style={L}>{t("adminDavomatlar.noScheduleHint")}</p>
        </div>
      )}

      {result && result.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* Export tugmalari */}
          <div className="flex items-center gap-2 justify-end">
            <button type="button"
              onClick={() => exportToExcel("platforma-davomati", [{
                name: t("adminDavomatlar.exportSheetName"),
                rows: result.flatMap(day => day.students.map(s => ({
                  [t("adminDavomatlar.exportColDate")]: day.lessonDate, [t("adminDavomatlar.exportColSubject")]: day.subjectName, [t("adminDavomatlar.platformExportColStudent")]: s.studentName || t("adminDavomatlar.studentFallback", { id: s.studentId }),
                  [t("adminDavomatlar.platformExportColStatus")]: s.status === "present" ? t("adminDavomatlar.statusPresent") : t("adminDavomatlar.statusAbsent"),
                }))),
              }])}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-xs font-medium transition-colors hover:bg-[#f0fdf4]"
              style={{ border: "1px solid rgba(21,128,61,0.25)", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-xs font-medium transition-colors hover:bg-[#fef2f2]"
              style={{ border: "1px solid rgba(185,28,28,0.25)", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t("adminDavomatlar.summaryTotalLessons"), value: result.length, color: "#0e58a8" },
              { label: t("adminDavomatlar.summaryAvgAttendance"), value: `${Math.round(result.reduce((s, r) => s + r.presentPct, 0) / result.length)}%`, color: pctColor(Math.round(result.reduce((s, r) => s + r.presentPct, 0) / result.length)) },
              { label: t("adminDavomatlar.summaryMeetingDays"), value: result.filter(r => r.isMeetingDay).length, color: "#7c3aed" },
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
                      {day.isMeetingDay && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: "#f5f3ff", color: "#7c3aed" }}>{t("adminDavomatlar.meetingBadge", { minutes: day.meetingMinutes })}</span>}
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
                      <div className="text-xs" style={L}>{t("adminDavomatlar.totalStudentsSuffix", { n: day.total })}</div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4" style={L} /> : <ChevronDown className="w-4 h-4" style={L} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="overflow-x-auto" style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: "#f8fbff", borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                          <th className="px-4 py-2 text-left font-semibold" style={L}>{t("adminDavomatlar.colIndex")}</th>
                          <th className="px-4 py-2 text-left font-semibold" style={L}>{t("adminDavomatlar.platformExportColStudent")}</th>
                          <th className="px-3 py-2 text-center font-semibold" style={L}>{t("adminDavomatlar.platformExportColStatus")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.students.map((s, i) => (
                          <tr key={s.studentId} style={{ borderBottom: i < day.students.length - 1 ? "1px solid rgba(1,41,112,0.05)" : "none" }}>
                            <td className="px-4 py-2 text-xs" style={L}>{i + 1}</td>
                            <td className="px-4 py-2 text-sm" style={T}>{s.studentName || t("adminDavomatlar.studentFallback", { id: s.studentId })}</td>
                            <td className="px-3 py-2 text-center">
                              {s.status === "present"
                                ? <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f0fdf4", color: "#15803d" }}><CheckCircle2 className="w-3 h-3" /> {t("adminDavomatlar.statusPresent")}</span>
                                : <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fef2f2", color: "#b91c1c" }}><XCircle className="w-3 h-3" /> {t("adminDavomatlar.statusAbsent")}</span>}
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
  const { t } = useLanguage()
  const [tab, setTab] = useState<"manual" | "platform">("manual")

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={T}>{t("adminDavomatlar.pageTitle")}</h1>
        <p className="text-sm mt-1" style={L}>{t("adminDavomatlar.pageSubtitle")}</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-[8px] w-fit" style={{ backgroundColor: "#f1f5f9" }}>
        {([
          { key: "manual",   label: t("adminDavomatlar.tabManual") },
          { key: "platform", label: t("adminDavomatlar.tabPlatform") },
        ] as { key: "manual" | "platform"; label: string }[]).map(tabItem => (
          <button key={tabItem.key} type="button" onClick={() => setTab(tabItem.key)}
            className="px-4 py-2 rounded-[6px] text-sm font-medium transition-all"
            style={{
              backgroundColor: tab === tabItem.key ? "#fff" : "transparent",
              color: tab === tabItem.key ? "#012970" : "#7293b9",
              fontFamily: "var(--font-poppins)",
              boxShadow: tab === tabItem.key ? "0 1px 3px rgba(1,41,112,0.12)" : "none",
            }}>
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === "manual"   && <ManualAttendance />}
      {tab === "platform" && <PlatformAttendance />}
    </div>
  )
}
