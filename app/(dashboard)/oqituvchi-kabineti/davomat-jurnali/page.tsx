"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Lock } from "lucide-react"
import { teachingApi, attendanceApi, authApi, hemisApi } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

function todayStr() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fmtDate(value: string) {
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const borderCls = "border border-[#d8e6f7]"

// HEMIS /v1/data/attendance-list dan kelgan, normallashtirilgan davomat yozuvi
interface HemisAttendanceRecord {
  studentUserId: number
  studentName: string
  lessonDate: string
  lessonPairName: string | null
  startTime: string | null
  endTime: string | null
  absentOn: number
  absentOff: number
}

interface DateColumn {
  key: string
  date: string
  pairName: string | null
  startTime: string | null
  endTime: string | null
}

function timeRangeLabel(col: DateColumn) {
  if (!col.startTime || !col.endTime) return null
  return col.pairName ? `${col.pairName}. ${col.startTime}-${col.endTime}` : `${col.startTime}-${col.endTime}`
}

export default function DavomatJurnaliPage() {
  const searchParams = useSearchParams()
  const groupId = searchParams.get("group")
  const subjectName = searchParams.get("subject") ?? ""
  const groupName = searchParams.get("groupName") ?? ""
  const trainingType = searchParams.get("training") ?? ""

  const { data: groupsRes, loading: lGroups, error: eGroups, refetch: rGroups } = useApi(() => teachingApi.groups(), [])
  const { data: meRes } = useApi(() => authApi.me(), [])

  const groups = groupsRes?.data ?? []
  const group = groups.find((g) => String(g.id) === groupId)
  const resolvedGroupName = groupName || group?.name || "-"

  const numericGroupId = groupId ? Number(groupId) : null

  const { data: rosterRes, loading: lRoster, error: eRoster, refetch: rRoster } = useApi(
    () => (numericGroupId !== null && subjectName ? attendanceApi.roster(numericGroupId, subjectName, todayStr()) : Promise.resolve({ success: true, data: [] })),
    [numericGroupId, subjectName]
  )

  // HEMIS'ning o'zidagi davomat yozuvlari (faqat o'qish — har bir dars sanasi + jufti)
  const { data: hemisAttendanceRes, loading: lHemisAtt, error: eHemisAtt, refetch: rHemisAtt } = useApi(
    () => (numericGroupId !== null && subjectName
      ? hemisApi.employeeData("attendance-records", { group: String(numericGroupId), subject: subjectName })
      : Promise.resolve({ success: true, data: [] as HemisAttendanceRecord[] })),
    [numericGroupId, subjectName]
  )

  const roster = rosterRes?.data ?? []
  const hemisRecords = (hemisAttendanceRes?.data ?? []) as HemisAttendanceRecord[]

  const dateColumns = useMemo<DateColumn[]>(() => {
    const map = new Map<string, DateColumn>()
    hemisRecords.forEach((r) => {
      const key = `${r.lessonDate}__${r.lessonPairName ?? ""}`
      if (!map.has(key)) {
        map.set(key, { key, date: r.lessonDate, pairName: r.lessonPairName, startTime: r.startTime, endTime: r.endTime })
      }
    })
    return Array.from(map.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1
      return (a.startTime ?? "").localeCompare(b.startTime ?? "")
    })
  }, [hemisRecords])

  const hemisCellMap = useMemo(() => {
    const map = new Map<string, { absentOn: number; absentOff: number }>()
    hemisRecords.forEach((r) => {
      map.set(`${r.studentUserId}|${r.lessonDate}__${r.lessonPairName ?? ""}`, { absentOn: r.absentOn, absentOff: r.absentOff })
    })
    return map
  }, [hemisRecords])

  function getCell(studentUserId: number, col: DateColumn) {
    const hemisCell = hemisCellMap.get(`${studentUserId}|${col.key}`)
    if (hemisCell?.absentOff) {
      return { text: String(hemisCell.absentOff), color: "#dc2626", bg: "#fef2f2", absentOff: hemisCell.absentOff, absentOn: 0 }
    }
    if (hemisCell?.absentOn) {
      return { text: String(hemisCell.absentOn), color: "#15803d", bg: "#f0fdf4", absentOff: 0, absentOn: hemisCell.absentOn }
    }
    return { text: "", color: "#104475", bg: "transparent", absentOff: 0, absentOn: 0 }
  }

  if (lGroups) return <Loading />
  if (eGroups) return <ApiError message={eGroups} onRetry={rGroups} />

  const loading = lRoster || lHemisAtt
  const error = eRoster || eHemisAtt

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div className="flex items-center gap-2 text-sm flex-wrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
        <Link href="/xodim/davomat-jurnali" className="flex items-center gap-1 hover:underline">
          <ChevronLeft className="w-4 h-4" />
          Davomat jurnali
        </Link>
      </div>

      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Davomat jurnali
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {resolvedGroupName} — {subjectName || "-"}
        </p>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] text-xs" style={{ backgroundColor: "#f0f7ff", color: "#0e58a8", border: "1px solid rgba(14,88,168,0.15)", fontFamily: "var(--font-poppins)" }}>
        <Lock className="w-3.5 h-3.5 shrink-0" />
        Davomat avtomatik tarzda HEMIS tizimidan olinadi. O'qituvchi qo'lda o'zgartira olmaydi.
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex-1 min-w-0 rounded-[10px] bg-white" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
          {loading ? <Loading /> : error ? <ApiError message={error} onRetry={() => { rRoster(); rHemisAtt() }} /> : (
            <div className="overflow-x-auto p-3">
              <table className="w-full border-collapse" style={{ tableLayout: "auto" }}>
                <thead>
                  <tr style={{ backgroundColor: "#eef4ff" }}>
                    <th className={`${borderCls} px-3 py-2 text-xs font-semibold whitespace-nowrap w-[50px]`} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>#</th>
                    <th className={`${borderCls} px-4 py-2 text-left text-xs font-semibold whitespace-nowrap w-full`} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Talabaning F.I.Sh.</th>
                    <th className={`${borderCls} px-3 py-2 text-xs font-semibold whitespace-nowrap w-[50px]`} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>S</th>
                    <th className={`${borderCls} px-3 py-2 text-xs font-semibold whitespace-nowrap w-[50px]`} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>SZ</th>
                    {dateColumns.map((col) => {
                      const timeLabel = timeRangeLabel(col)
                      return (
                        <th key={col.key} className={`${borderCls} px-2 py-1.5 text-center whitespace-nowrap min-w-[110px]`}>
                          <span className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: "#16a34a", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                            {fmtDate(col.date)}
                          </span>
                          {timeLabel && (
                            <div className="mt-1 text-[10px] italic" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                              {timeLabel}
                            </div>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {roster.length ? (
                    roster.map((student, index) => {
                      let absentTotal = 0
                      let excusedTotal = 0
                      dateColumns.forEach((col) => {
                        const cell = getCell(student.studentUserId, col)
                        absentTotal += cell.absentOff
                        excusedTotal += cell.absentOn
                      })
                      return (
                        <tr key={student.studentUserId} className="hover:bg-[#f6f9ff]">
                          <td className={`${borderCls} px-3 py-2 text-sm text-center`} style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{index + 1}</td>
                          <td className={`${borderCls} px-4 py-2 text-sm font-medium whitespace-nowrap`} style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                            {student.fullName}
                          </td>
                          <td className={`${borderCls} px-3 py-2 text-sm text-center font-medium`} style={{ color: absentTotal ? "#dc2626" : "#7293b9", fontFamily: "var(--font-poppins)" }}>
                            {absentTotal || ""}
                          </td>
                          <td className={`${borderCls} px-3 py-2 text-sm text-center font-medium`} style={{ color: excusedTotal ? "#15803d" : "#7293b9", fontFamily: "var(--font-poppins)" }}>
                            {excusedTotal || ""}
                          </td>
                          {dateColumns.map((col) => {
                            const style = getCell(student.studentUserId, col)
                            return (
                              <td
                                key={col.key}
                                className={`${borderCls} px-1 py-1 text-sm text-center font-medium select-none`}
                                style={{ color: style.color, backgroundColor: style.bg, fontFamily: "var(--font-poppins)" }}
                              >
                                <span className="block w-full px-2 py-1">{style.text}</span>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={4 + dateColumns.length} className={`${borderCls} px-4 py-12 text-center text-sm`} style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        Bu guruhda talaba topilmadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <p className="text-xs mt-2.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                <span style={{ color: "#dc2626" }}>S (son)</span> — sababsiz,{" "}
                <span style={{ color: "#15803d" }}>SZ</span> — sababli ketgan soatlar. Ma&apos;lumotlar HEMIS tizimidan avtomatik yuklanadi.
              </p>
            </div>
          )}
        </div>

        <div className="w-full lg:w-[300px] shrink-0 rounded-[10px] bg-white p-4 self-start" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Ma&apos;lumot
          </h2>
          <div className="flex flex-col gap-2.5 text-sm">
            <div className="flex items-start justify-between gap-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)", paddingBottom: 8 }}>
              <span style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Guruh</span>
              <span className="text-right font-medium" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>{resolvedGroupName}</span>
            </div>
            <div className="flex items-start justify-between gap-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)", paddingBottom: 8 }}>
              <span style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Fanlar</span>
              <span className="text-right font-medium" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>{subjectName || "-"}</span>
            </div>
            <div className="flex items-start justify-between gap-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)", paddingBottom: 8 }}>
              <span style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Mashg&apos;ulot</span>
              <span className="text-right font-medium" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>{trainingType || "-"}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Xodim</span>
              <span className="text-right font-medium" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>{meRes?.user?.fullName ?? "-"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
