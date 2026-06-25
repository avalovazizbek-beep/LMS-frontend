"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { teachingApi, gradeApi, authApi, hemisApi } from "@/lib/api"
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

// Baho qiymatiga qarab rang tanlash
function gradeStyle(grade: number | null): { text: string; color: string; bg: string } {
  if (grade === null) return { text: "", color: "#104475", bg: "transparent" }
  if (grade >= 90) return { text: String(grade), color: "#15803d", bg: "#f0fdf4" }
  if (grade >= 60) return { text: String(grade), color: "#0e58a8", bg: "#eef4ff" }
  return { text: String(grade), color: "#dc2626", bg: "#fef2f2" }
}

// Qulda kiritilgan matnni baho qiymatiga aylantirish (0-100 yoki bo'sh — baho yo'q)
function parseCellInput(raw: string): number | null {
  const value = raw.trim()
  if (value === "") return null
  const num = Number(value)
  if (Number.isNaN(num)) return null
  return Math.max(0, Math.min(100, Math.round(num)))
}

// HEMIS /v1/data/student-grade-list dan kelgan, normallashtirilgan baho yozuvi
interface HemisGradeRecord {
  studentUserId: number
  studentName: string
  lessonDate: string
  lessonPairName: string | null
  startTime: string | null
  endTime: string | null
  grade: number | null
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

export default function BaholashJurnaliPage() {
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
    () => (numericGroupId !== null && subjectName ? gradeApi.roster(numericGroupId, subjectName, todayStr()) : Promise.resolve({ success: true, data: [] })),
    [numericGroupId, subjectName]
  )

  const { data: historyRes, loading: lHistory, error: eHistory, refetch: rHistory } = useApi(
    () => (numericGroupId !== null && subjectName ? gradeApi.history({ groupId: numericGroupId, subject: subjectName }) : Promise.resolve({ success: true, data: [] })),
    [numericGroupId, subjectName]
  )

  // HEMIS'ning o'zidagi baho yozuvlari (faqat o'qish — har bir dars sanasi + jufti)
  const { data: hemisGradeRes, loading: lHemisGrade, error: eHemisGrade, refetch: rHemisGrade } = useApi(
    () => (numericGroupId !== null && subjectName
      ? hemisApi.employeeData("grade-records", { group: String(numericGroupId), subject: subjectName })
      : Promise.resolve({ success: true, data: [] as HemisGradeRecord[] })),
    [numericGroupId, subjectName]
  )

  const roster = rosterRes?.data ?? []
  const history = historyRes?.data ?? []
  const hemisRecords = (hemisGradeRes?.data ?? []) as HemisGradeRecord[]

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

  const gradeByStudentAndDate = useMemo(() => {
    const map = new Map<string, number | null>()
    history.forEach((entry) => {
      entry.records.forEach((r) => {
        map.set(`${r.studentUserId}|${entry.lessonDate}`, r.grade)
      })
    })
    return map
  }, [history])

  const hemisCellMap = useMemo(() => {
    const map = new Map<string, number | null>()
    hemisRecords.forEach((r) => {
      map.set(`${r.studentUserId}|${r.lessonDate}__${r.lessonPairName ?? ""}`, r.grade)
    })
    return map
  }, [hemisRecords])

  const [overrides, setOverrides] = useState<Map<string, number | null>>(new Map())
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)

  // Katakcha uchun ko'rinish: avval bizning DB'dagi (override/tarix) qiymat, bo'lmasa HEMIS'dagi qiymat
  function getCell(studentUserId: number, col: DateColumn) {
    const key = `${studentUserId}|${col.date}`
    if (overrides.has(key)) return gradeStyle(overrides.get(key) ?? null)
    if (gradeByStudentAndDate.has(key)) return gradeStyle(gradeByStudentAndDate.get(key) ?? null)
    const hemisGrade = hemisCellMap.get(`${studentUserId}|${col.key}`)
    return gradeStyle(hemisGrade ?? null)
  }

  function getGradeValue(studentUserId: number, col: DateColumn): number | null {
    const key = `${studentUserId}|${col.date}`
    if (overrides.has(key)) return overrides.get(key) ?? null
    if (gradeByStudentAndDate.has(key)) return gradeByStudentAndDate.get(key) ?? null
    return hemisCellMap.get(`${studentUserId}|${col.key}`) ?? null
  }

  async function handleCellSave(studentUserId: number, fullName: string, date: string, raw: string) {
    if (numericGroupId === null || !subjectName) return
    const key = `${studentUserId}|${date}`
    const current = overrides.has(key) ? overrides.get(key) ?? null : (gradeByStudentAndDate.get(key) ?? null)
    const next = parseCellInput(raw)

    if (next === current) return

    setSaveError(null)
    setOverrides((prev) => new Map(prev).set(key, next))
    setSavingKey(key)
    try {
      await gradeApi.save({
        groupId: numericGroupId,
        subjectName,
        date,
        records: [{ studentUserId, fullName, grade: next }],
      })
    } catch (e) {
      setOverrides((prev) => new Map(prev).set(key, current))
      setSaveError(e instanceof Error ? e.message : "Saqlashda xatolik yuz berdi")
    } finally {
      setSavingKey(null)
    }
  }

  if (lGroups) return <Loading />
  if (eGroups) return <ApiError message={eGroups} onRetry={rGroups} />

  const loading = lRoster || lHistory || lHemisGrade
  const error = eRoster || eHistory || eHemisGrade

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div className="flex items-center gap-2 text-sm flex-wrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
        <Link href="/xodim/baholash-jurnali" className="flex items-center gap-1 hover:underline">
          <ChevronLeft className="w-4 h-4" />
          Baholash jurnali
        </Link>
      </div>

      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Baholash jurnali
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {resolvedGroupName} — {subjectName || "-"}
        </p>
      </div>

      {saveError && <ApiError message={saveError} onRetry={() => setSaveError(null)} />}

      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex-1 min-w-0 rounded-[10px] bg-white" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
          {loading ? <Loading /> : error ? <ApiError message={error} onRetry={() => { rRoster(); rHistory(); rHemisGrade() }} /> : (
            <div className="overflow-x-auto p-3">
              <table className="w-full border-collapse" style={{ tableLayout: "auto" }}>
                <thead>
                  {dateColumns.length > 0 && (
                    <tr style={{ backgroundColor: "#eef4ff" }}>
                      <th rowSpan={2} className={`${borderCls} px-3 py-2 text-xs font-semibold whitespace-nowrap w-[50px]`} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>#</th>
                      <th rowSpan={2} className={`${borderCls} px-4 py-2 text-left text-xs font-semibold whitespace-nowrap w-full`} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Talabaning F.I.Sh.</th>
                      <th rowSpan={2} className={`${borderCls} px-3 py-2 text-xs font-semibold whitespace-nowrap w-[70px]`} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>O&apos;rtacha</th>
                      <th colSpan={dateColumns.length} className={`${borderCls} px-2 py-2 text-center text-xs font-semibold whitespace-nowrap`} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                        Dars sanasi
                      </th>
                    </tr>
                  )}
                  <tr style={{ backgroundColor: "#eef4ff" }}>
                    {dateColumns.length === 0 && (
                      <>
                        <th className={`${borderCls} px-3 py-2 text-xs font-semibold whitespace-nowrap w-[50px]`} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>#</th>
                        <th className={`${borderCls} px-4 py-2 text-left text-xs font-semibold whitespace-nowrap w-full`} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Talabaning F.I.Sh.</th>
                        <th className={`${borderCls} px-3 py-2 text-xs font-semibold whitespace-nowrap w-[70px]`} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>O&apos;rtacha</th>
                      </>
                    )}
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
                      const grades: number[] = []
                      dateColumns.forEach((col) => {
                        const g = getGradeValue(student.studentUserId, col)
                        if (g !== null) grades.push(g)
                      })
                      const average = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : null
                      return (
                        <tr key={student.studentUserId} className="hover:bg-[#f6f9ff]">
                          <td className={`${borderCls} px-3 py-2 text-sm text-center`} style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{index + 1}</td>
                          <td className={`${borderCls} px-4 py-2 text-sm font-medium whitespace-nowrap`} style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                            {student.fullName}
                          </td>
                          <td className={`${borderCls} px-3 py-2 text-sm text-center font-medium`} style={{ color: average !== null ? "#0e58a8" : "#7293b9", fontFamily: "var(--font-poppins)" }}>
                            {average !== null ? average.toFixed(1) : ""}
                          </td>
                          {dateColumns.map((col) => {
                            const style = getCell(student.studentUserId, col)
                            const key = `${student.studentUserId}|${col.date}`
                            const isSaving = savingKey === key
                            const isEditing = editingKey === key
                            return (
                              <td
                                key={col.key}
                                onClick={() => !isEditing && setEditingKey(key)}
                                className={`${borderCls} px-1 py-1 text-sm text-center font-medium cursor-text select-none transition-opacity hover:ring-2 hover:ring-inset hover:ring-[#0e58a8]`}
                                style={{ color: style.color, backgroundColor: style.bg, fontFamily: "var(--font-poppins)", opacity: isSaving ? 0.5 : 1 }}
                                title="Bahoni yozish uchun bosing"
                              >
                                {isEditing ? (
                                  <input
                                    autoFocus
                                    defaultValue={style.text}
                                    className="w-12 text-center bg-transparent outline-none"
                                    style={{ color: style.color, fontFamily: "var(--font-poppins)" }}
                                    onFocus={(e) => e.target.select()}
                                    onBlur={(e) => {
                                      handleCellSave(student.studentUserId, student.fullName, col.date, e.target.value)
                                      setEditingKey(null)
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") e.currentTarget.blur()
                                      if (e.key === "Escape") { e.currentTarget.value = style.text; e.currentTarget.blur() }
                                    }}
                                  />
                                ) : (
                                  <span className="block w-full px-2 py-1">{style.text}</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={3 + dateColumns.length} className={`${borderCls} px-4 py-12 text-center text-sm`} style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        Bu guruhda talaba topilmadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <p className="text-xs mt-2.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Katakchani bosib bahoni qo&apos;lda yozing: 0-100 oralig&apos;ida son kiriting, bo&apos;sh qoldirsangiz baho o&apos;chiriladi. Yozib bo&apos;lgach Enter bosing.
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
