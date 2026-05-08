"use client"

import { useState, useMemo } from "react"
import { Search, ChevronDown } from "lucide-react"
import { hemisApi, HemisAttendance } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import SemesterTabs from "@/components/ui/SemesterTabs"
import { useCurrentSemester } from "@/hooks/useCurrentSemester"

function getAbsenceType(r: HemisAttendance): "excused" | "absent" {
  if (r.explicable === true) return "excused"
  if ((r.absent_on ?? 0) > 0 && (r.absent_off ?? 0) === 0) return "excused"
  return "absent"
}

function formatDateTime(ts: number, time?: string): string {
  const d = new Date(ts * 1000).toLocaleDateString("uz-UZ", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
  return time ? `${d} ${time}` : d
}

// Extract the HEMIS semester code ("11","12",...,"18") from a record — used as ?semester= param.
function semHemisCode(r: HemisAttendance): string {
  const s = r.semester as any
  return String(s?.code ?? s?._id ?? s?.id ?? "")
}

export default function Davomat() {
  const { currentCode: hookCode } = useCurrentSemester()

  // ── Step 1: Discovery fetch — all records, no semester filter ────────────
  const { data: initData, loading: initLoading, error, refetch } = useApi(
    () => hemisApi.attendance()
  )
  const initAbsences: HemisAttendance[] = initData?.data ?? []

  // Build displayCode(1-8) → HEMIS API code("11"-"18") map from records
  // e.g. { 2: "12" } — used to pass ?semester=12 to the backend
  const semIdMap = useMemo(() => {
    const map = new Map<number, string>()
    initAbsences.forEach(r => {
      const hemisCode = semHemisCode(r)          // "11","12",...,"18"
      const n = Number(hemisCode)
      const displayCode = n >= 11 && n <= 18 ? n - 10 : 0   // 1..8
      if (displayCode > 0 && !map.has(displayCode)) map.set(displayCode, hemisCode)
    })
    return map
  }, [initAbsences])

  const maxSemCode  = semIdMap.size > 0 ? Math.max(...semIdMap.keys()) : 0
  const currentCode = Math.max(hookCode, maxSemCode)    // for disabling future tabs
  const defaultCode = maxSemCode > 0 ? maxSemCode : currentCode

  // ── Step 2: Per-tab state ─────────────────────────────────────────────────
  const [selectedCode, setSelectedCode] = useState<number | null>(null)
  const [tabAbsences, setTabAbsences]   = useState<HemisAttendance[] | null>(null)
  const [tabLoading, setTabLoading]     = useState(false)
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [search, setSearch]               = useState("")

  const activeCode = selectedCode ?? defaultCode

  // ── Step 3: Active absences ───────────────────────────────────────────────
  // tabAbsences = result of a per-tab backend call (with semester filter)
  // null         = fall back to client-side filter of initAbsences
  const activeAbsences = useMemo(() => {
    const bySem = (arr: HemisAttendance[]) => {
      if (!activeCode) return arr
      return arr.filter(r => {
        // r.semester.code is HEMIS code ("12"), convert to display code (2) before comparing
        const hemisCode = Number(r.semester?.code ?? 0)
        const rDisplay  = hemisCode >= 11 && hemisCode <= 18 ? hemisCode - 10 : hemisCode
        if (rDisplay > 0) return rDisplay === activeCode
        // fallback: parse leading digit from name "2-semestr"
        const m = (r.semester?.name ?? "").match(/^(\d+)/)
        return m ? Number(m[1]) === activeCode : false
      })
    }
    if (tabAbsences !== null) {
      const result = bySem(tabAbsences)
      // HEMIS may not support semester filtering and return []; fall back to initAbsences
      if (result.length === 0) return bySem(initAbsences)
      return result
    }
    return bySem(initAbsences)
  }, [tabAbsences, initAbsences, activeCode])

  const subjects = useMemo(
    () => [...new Set(activeAbsences.map(r => r.subject.name))].sort(),
    [activeAbsences]
  )

  const filtered = useMemo(() =>
    activeAbsences
      .filter(r => {
        if (subjectFilter !== "all" && r.subject.name !== subjectFilter) return false
        if (search) {
          const q = search.toLowerCase()
          return r.subject.name.toLowerCase().includes(q) ||
            (r.employee?.name?.toLowerCase().includes(q) ?? false)
        }
        return true
      })
      .sort((a, b) => b.lesson_date - a.lesson_date),
    [activeAbsences, subjectFilter, search]
  )

  // ── Tab click: fire a backend call with the real HEMIS semester ID ────────
  async function handleSemesterChange(code: number) {
    setSelectedCode(code)
    setSubjectFilter("all")
    setSearch("")
    setTabAbsences(null)

    const id = semIdMap.get(code)
    if (!id) return // no ID yet → client-side filter will handle it

    setTabLoading(true)
    try {
      const res = await hemisApi.attendance({ _semester: id })
      setTabAbsences(res.data ?? [])
    } catch {
      // fallback to client-side filter on error
    } finally {
      setTabLoading(false)
    }
  }

  if (initLoading) return <Loading />
  if (error)       return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Davomat
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Qoldirilgan darslar ro&apos;yxati
          </p>
        </div>
        <SemesterTabs
          currentCode={currentCode}
          value={activeCode || currentCode}
          onChange={handleSemesterChange}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-[5px] text-sm bg-white outline-none"
            style={{
              border: "1px solid rgba(1,41,112,0.2)",
              color: subjectFilter === "all" ? "#7293b9" : "#012970",
              fontFamily: "var(--font-poppins)",
              minWidth: 220,
            }}>
            <option value="all">Fanlarni tanlang</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "#7293b9" }} />
        </div>

        <label className="flex items-center gap-2 px-3 py-2.5 rounded-[5px] bg-white flex-1 min-w-[220px] max-w-sm"
          style={{ border: "1px solid rgba(1,41,112,0.2)" }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: "#7293b9" }} />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Fan / Xodim bo'yicha qidirish"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
          />
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] overflow-hidden"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>

        {tabLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{ borderColor: "#1cc2dc", borderTopColor: "transparent" }} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)", backgroundColor: "#f6f9ff" }}>
                    {["#", "Semestr", "Dars sanasi", "Fanlar", "Mashg'ulot", "Sababli", "Soatlar", "Xodim"].map(h => (
                      <th key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                        style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm"
                        style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        Bu semestrda qoldirilgan darslar yo&apos;q
                      </td>
                    </tr>
                  ) : filtered.map((r, i) => {
                    const type  = getAbsenceType(r)
                    const time  = r.lessonPair?.start_time
                    const hours = r.hours ?? r.academic_hours
                    return (
                      <tr key={`${r.subject?.id}_${r.lesson_date}_${i}`}
                        className="hover:bg-[#f6f9ff]/50 transition-colors"
                        style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                        <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                          {i + 1}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                          {r.semester?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                          {formatDateTime(r.lesson_date, time)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                          {r.subject.name}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                          {r.trainingType?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium"
                          style={{ color: type === "excused" ? "#f59e0b" : "#ef4444", fontFamily: "var(--font-poppins)" }}>
                          {type === "excused" ? "Ha" : "Yo'q"}
                        </td>
                        <td className="px-4 py-3 text-sm text-center" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                          {hours != null ? hours : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                          {r.employee?.name ?? "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(1,41,112,0.1)" }}>
              <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {filtered.length === 0
                  ? "0 ta natija"
                  : `1-${filtered.length} / jami ${filtered.length} ta`}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
