"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Search, XCircle, AlertCircle, ClipboardList, CheckCircle2, Monitor, Clock } from "lucide-react"
import { hemisApi, attendanceApi, type HemisAttendance, type StudentAttendanceEntry, type PlatformSessionEntry } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import SemesterTabs from "@/components/ui/SemesterTabs"
import { useCurrentSemester } from "@/hooks/useCurrentSemester"

function getAbsenceType(r: HemisAttendance): "excused" | "absent" {
  if (r.explicable === true) return "excused"
  if ((r.absent_on ?? 0) > 0 && (r.absent_off ?? 0) === 0) return "excused"
  return "absent"
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatIso(iso: string) {
  return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
}

type Tab = "hemis" | "platform" | "sessions"

export default function Davomat() {
  const { currentCode, getSemesterId } = useCurrentSemester()
  const [selectedCode, setSelectedCode] = useState<number | null>(null)
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<Tab>("hemis")

  const activeCode = selectedCode ?? currentCode
  const semId = activeCode > 0 ? getSemesterId(activeCode) : undefined
  const semParam = semId ? { _semester: semId } : {}

  const { data: attData,     loading: l1, error: e1, refetch: r1 } = useApi(() => hemisApi.attendance(semParam), [semId])
  const { data: lmsData,     loading: l2, error: e2, refetch: r2 } = useApi(() => attendanceApi.me(), [])
  const { data: sessionData, loading: l3,             refetch: r3 } = useApi(() => attendanceApi.sessionsMe(), [])

  const hemis: HemisAttendance[] = useMemo(
    () => [...(attData?.data ?? [])].sort((a, b) => b.lesson_date - a.lesson_date),
    [attData]
  )
  const lmsRecords: StudentAttendanceEntry[] = lmsData?.data ?? []
  const sessions: PlatformSessionEntry[]     = sessionData?.data ?? []

  const subjects = useMemo(() =>
    [...new Set(hemis.map(r => r.subject?.name).filter(Boolean))].sort() as string[],
    [hemis]
  )

  const filteredHemis = useMemo(() => {
    let list = hemis
    if (subjectFilter !== "all") list = list.filter(r => r.subject?.name === subjectFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(r =>
        (r.subject?.name ?? "").toLowerCase().includes(q) ||
        (r.employee?.name ?? "").toLowerCase().includes(q)
      )
    }
    return list
  }, [hemis, subjectFilter, search])

  const filteredLms = useMemo(() => {
    let list = lmsRecords
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(r => r.subjectName.toLowerCase().includes(q))
    }
    return list
  }, [lmsRecords, search])

  if (l1 || l2) return <Loading />
  if (e1) return <ApiError message={e1} onRetry={() => { r1(); r2(); r3() }} />

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "hemis",    label: "HEMIS davomati",    count: hemis.length },
    { key: "platform", label: "Platformadan keldi", count: lmsRecords.length },
    { key: "sessions", label: "Kirish tarixi",      count: sessions.length },
  ]

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Davomat
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Darslarga davomat tarixi
          </p>
        </div>
        <SemesterTabs currentCode={currentCode} value={activeCode} onChange={code => setSelectedCode(code)} />
      </div>

      {/* Tab tugmalari */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-medium transition-colors"
            style={{
              backgroundColor: tab === t.key ? "#0e58a8" : "#f6f9ff",
              color: tab === t.key ? "#fff" : "#7293b9",
              fontFamily: "var(--font-poppins)",
              border: "1px solid " + (tab === t.key ? "#0e58a8" : "rgba(1,41,112,0.1)"),
            }}>
            {t.label}
            <span className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: tab === t.key ? "rgba(255,255,255,0.2)" : "rgba(1,41,112,0.08)" }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filtrlar — faqat birinchi 2 tabda */}
      {tab !== "sessions" && (
        <div className="flex gap-3 flex-wrap">
          {tab === "hemis" && (
            <div className="relative">
              <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 rounded-[6px] text-sm bg-white outline-none"
                style={{
                  border: "1px solid rgba(1,41,112,0.2)",
                  color: subjectFilter === "all" ? "#7293b9" : "#012970",
                  fontFamily: "var(--font-poppins)", minWidth: 220,
                }}>
                <option value="all">Fanlarni tanlang</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: "#7293b9" }} />
            </div>
          )}
          <label className="flex items-center gap-2 px-3 py-2.5 rounded-[6px] bg-white flex-1 min-w-[260px] max-w-sm"
            style={{ border: "1px solid rgba(1,41,112,0.2)" }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: "#7293b9" }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={tab === "hemis" ? "Fan / Xodim bo'yicha qidirish" : "Fan bo'yicha qidirish"}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
          </label>
        </div>
      )}

      {/* ── TAB 1: HEMIS davomati ── */}
      {tab === "hemis" && (
        <div className="bg-white rounded-[10px] overflow-hidden"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)", backgroundColor: "#f6f9ff" }}>
                  {["#", "Semestr", "Dars sanasi", "Fanlar", "Mashg'ulot", "Sababli", "Soatlar", "Xodim"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHemis.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-14 text-center" style={{ color: "#7293b9" }}>
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="w-8 h-8" style={{ color: "#d8e6f7" }} />
                      <span className="text-sm">Davomat yozuvlari topilmadi</span>
                    </div>
                  </td></tr>
                ) : filteredHemis.map((r, i) => {
                  const isExcused = getAbsenceType(r) === "excused"
                  return (
                    <tr key={`${r.id ?? i}-${r.lesson_date}`} className="hover:bg-[#f6f9ff]/50 transition-colors"
                      style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                      <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{i + 1}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{r.semester?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{formatDate(r.lesson_date)}</td>
                      <td className="px-4 py-3 text-sm max-w-[200px]" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{r.subject?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{r.trainingType?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full w-fit whitespace-nowrap"
                          style={{ backgroundColor: isExcused ? "#fffbeb" : "#fef2f2", color: isExcused ? "#92400e" : "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                          {isExcused ? <AlertCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {isExcused ? "Sababli" : "Sababsiz"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{r.academic_hours ?? r.hours ?? "—"}</td>
                      <td className="px-4 py-3 text-sm max-w-[200px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{r.employee?.name ?? "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredHemis.length > 0 && (
            <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
              <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Jami: {filteredHemis.length} ta yozuv
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Platformadan keldi (meeting + platforma) ── */}
      {tab === "platform" && (
        <div className="bg-white rounded-[10px] overflow-hidden"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
          {e2 ? (
            <div className="p-8 text-center text-sm" style={{ color: "#b91c1c" }}>
              Ma&apos;lumot yuklanmadi. <button onClick={r2} className="underline">Qayta urinish</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)", backgroundColor: "#f6f9ff" }}>
                    {["#", "Sana", "Fan", "Holat", "Izoh"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                        style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLms.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-14 text-center" style={{ color: "#7293b9" }}>
                      <div className="flex flex-col items-center gap-2">
                        <Monitor className="w-8 h-8" style={{ color: "#d8e6f7" }} />
                        <span className="text-sm">Platformadan davomat yozuvlari topilmadi</span>
                      </div>
                    </td></tr>
                  ) : filteredLms.map((r, i) => (
                    <tr key={`lms-${i}`} className="hover:bg-[#f6f9ff]/50 transition-colors"
                      style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                      <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{i + 1}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{formatIso(r.lessonDate)}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{r.subjectName}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full w-fit"
                          style={{
                            backgroundColor: r.status === "present" ? "#f0fdf4" : r.status === "late" ? "#fffbeb" : "#fef2f2",
                            color: r.status === "present" ? "#15803d" : r.status === "late" ? "#92400e" : "#b91c1c",
                            fontFamily: "var(--font-poppins)",
                          }}>
                          {r.status === "present" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {r.status === "present" ? "Keldi" : r.status === "late" ? "Kech keldi" : r.status === "excused" ? "Sababli" : "Kelmadi"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        {r.comment ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredLms.length > 0 && (
            <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
              <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Jami: {filteredLms.length} ta yozuv
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Kirish tarixi (sessiyalar) ── */}
      {tab === "sessions" && (
        <div className="bg-white rounded-[10px] overflow-hidden"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)", backgroundColor: "#f6f9ff" }}>
                  {["#", "Sana", "Kirish vaqti", "Chiqish vaqti", "Davomiyligi"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-14 text-center" style={{ color: "#7293b9" }}>
                    <div className="flex flex-col items-center gap-2">
                      <Clock className="w-8 h-8" style={{ color: "#d8e6f7" }} />
                      <span className="text-sm">Kirish tarixi topilmadi</span>
                    </div>
                  </td></tr>
                ) : sessions.map((s, i) => (
                  <tr key={s.sessionId} className="hover:bg-[#f6f9ff]/50 transition-colors"
                    style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{i + 1}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{formatIso(s.loginAt)}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>{formatTime(s.loginAt)}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: s.logoutAt ? "#b91c1c" : "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {s.logoutAt ? formatTime(s.logoutAt) : "Hali chiqmagan"}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {s.durationMinutes > 0 ? `${s.durationMinutes} daqiqa` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sessions.length > 0 && (
            <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
              <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Jami: {sessions.length} ta kirish
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
