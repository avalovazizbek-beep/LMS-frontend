"use client"

import { useState, useMemo } from "react"
import { CheckCircle2, XCircle, MinusCircle, TrendingUp, TrendingDown, Calendar } from "lucide-react"
import { motion } from "framer-motion"
import { hemisApi, HemisAttendance, HemisSchedule } from "@/lib/api"
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

const now = Math.floor(Date.now() / 1000)

export default function DavomatHisobotiPage() {
  const { currentCode, getSemesterId } = useCurrentSemester()
  const [selectedCode, setSelectedCode] = useState<number | null>(null)

  const activeCode = selectedCode ?? currentCode
  const semId = activeCode > 0 ? getSemesterId(activeCode) : undefined
  const semParam = semId ? { _semester: semId } : {}

  const { data: attData, loading, error, refetch } = useApi(() => hemisApi.attendance(semParam), [semId])
  const { data: schedData } = useApi(() => hemisApi.schedule(semParam), [semId])

  const absences: HemisAttendance[] = attData?.data ?? []
  const schedule: HemisSchedule[]   = schedData?.data ?? []

  const pastSchedule = useMemo(
    () => schedule.filter(s => s.lesson_date > 0 && s.lesson_date <= now),
    [schedule]
  )

  const schedBySubject = useMemo(() => {
    const map: Record<string, number> = {}
    pastSchedule.forEach(s => {
      map[s.subject.name] = (map[s.subject.name] || 0) + 1
    })
    return map
  }, [pastSchedule])

  const absBySubject = useMemo(() => {
    const map: Record<string, { total: number; sababli: number; sababsiz: number }> = {}
    absences.forEach(r => {
      const name = r.subject.name
      if (!map[name]) map[name] = { total: 0, sababli: 0, sababsiz: 0 }
      map[name].total++
      if (getAbsenceType(r) === "excused") map[name].sababli++
      else map[name].sababsiz++
    })
    return map
  }, [absences])

  const subjectStats = useMemo(() => {
    const subjects = new Set([
      ...Object.keys(schedBySubject),
      ...Object.keys(absBySubject),
    ])
    return Array.from(subjects).map(name => {
      const total    = schedBySubject[name] ?? absBySubject[name]?.total ?? 0
      const abs      = absBySubject[name] ?? { total: 0, sababli: 0, sababsiz: 0 }
      const missed   = abs.total
      const attended = Math.max(0, total - missed)
      const pct      = total > 0 ? Math.round((attended / total) * 100) : 0
      return { name, total, attended, missed, sababli: abs.sababli, sababsiz: abs.sababsiz, pct }
    }).sort((a, b) => b.total - a.total)
  }, [schedBySubject, absBySubject])

  const totalClasses  = pastSchedule.length
  const totalAbsent   = absences.length
  const totalAttended = Math.max(0, totalClasses - totalAbsent)
  const overallPct    = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0

  const recent = [...absences].sort((a, b) => b.lesson_date - a.lesson_date).slice(0, 7)

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Davomat hisoboti</h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Davomat hisoboti</p>
        </div>
        <SemesterTabs currentCode={currentCode} value={activeCode} onChange={code => { setSelectedCode(code) }} />
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: "Umumiy davomat",
            value: totalClasses > 0 ? `${overallPct}%` : "—",
            color: totalClasses > 0 ? (overallPct >= 85 ? "#22c55e" : "#ef4444") : "#7293b9",
            Icon: TrendingUp,
          },
          {
            label: "Qatnashilgan",
            value: totalClasses > 0 ? totalAttended : "—",
            color: "#1cc2dc",
            Icon: CheckCircle2,
          },
          {
            label: "Qatnashilmagan",
            value: totalAbsent,
            color: "#ef4444",
            Icon: XCircle,
          },
          {
            label: "Jami darslar",
            value: totalClasses > 0 ? totalClasses : "—",
            color: "#012970",
            Icon: Calendar,
          },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="flex items-center justify-between mb-2">
              <s.Icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div className="text-3xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
            <div className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
        <div className="p-5" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
          <h2 className="font-medium text-lg" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Fanlarga ko&apos;ra davomat</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)", backgroundColor: "#f6f9ff" }}>
                {["#", "Fanlar", "Aud. soat", "Sababli", "Sababsiz", "Jami", "Foiz"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjectStats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    Ma&apos;lumot topilmadi
                  </td>
                </tr>
              ) : subjectStats.map((s, i) => {
                const isLow = s.pct < 85
                return (
                  <motion.tr key={s.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    className="hover:bg-[#f6f9ff]/50 transition-colors"
                    style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium max-w-[220px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.name}</td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.total}</td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>{s.sababli}</td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{s.sababsiz}</td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.missed}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-sm font-semibold w-fit"
                        style={{ color: isLow ? "#ef4444" : "#22c55e", fontFamily: "var(--font-poppins)" }}>
                        {s.total > 0 ? `${s.pct}%` : "—"}
                        {isLow && <TrendingDown className="w-3.5 h-3.5" />}
                      </span>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="p-5" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
          <h2 className="font-medium text-lg" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>So&apos;nggi qoldirishlar</h2>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: "#22c55e" }} />
            <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              Qoldirilgan darslar yo&apos;q!
            </p>
          </div>
        ) : recent.map((r, i) => {
          const type  = getAbsenceType(r)
          const Icon  = type === "excused" ? MinusCircle : XCircle
          const color = type === "excused" ? "#f59e0b" : "#ef4444"
          const label = type === "excused" ? "Sababli" : "Sababsiz"
          return (
            <motion.div key={`${r.subject?.id}_${r.lesson_date}_${i}`}
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: i < recent.length - 1 ? "1px solid rgba(1,41,112,0.06)" : undefined }}>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 shrink-0" style={{ color: "#7293b9" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    {r.subject.name}
                  </p>
                  <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {formatDate(r.lesson_date)}
                    {r.lessonPair && ` · ${r.lessonPair.start_time}–${r.lessonPair.end_time}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: type === "excused" ? "#fff8e6" : "#fff0f0",
                    color,
                    border: `1px solid ${color}`,
                    fontFamily: "var(--font-poppins)",
                  }}>
                  {label}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
