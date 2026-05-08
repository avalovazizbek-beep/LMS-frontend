"use client"

import { useState } from "react"
import { TrendingUp, Award, BarChart2 } from "lucide-react"
import { motion } from "framer-motion"
import { hemisApi, HemisGrade } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import SemesterTabs from "@/components/ui/SemesterTabs"
import { useCurrentSemester } from "@/hooks/useCurrentSemester"

function getLetterGrade(point: number): string {
  if (point >= 86) return "A"
  if (point >= 71) return "B"
  if (point >= 56) return "C"
  return "D"
}

function gradeColor(point: number | null) {
  if (point == null) return { bg: "#f6f9ff", color: "#7293b9", border: "rgba(1,41,112,0.2)" }
  if (point >= 86) return { bg: "#f0fbfd", color: "#1cc2dc", border: "#1cc2dc" }
  if (point >= 71) return { bg: "#f0f5ff", color: "#0e58a8", border: "#0e58a8" }
  if (point >= 56) return { bg: "#fff8e6", color: "#f59e0b", border: "#f59e0b" }
  return { bg: "#fff0f0", color: "#ef4444", border: "#ef4444" }
}

function calcGpa(grades: HemisGrade[]): string {
  const withPoints = grades.filter((g) => g.total_point != null && g.credit)
  if (!withPoints.length) return "—"
  const totalCredits = withPoints.reduce((s, g) => s + g.credit, 0)
  const weightedSum  = withPoints.reduce((s, g) => {
    const pts = g.total_point >= 86 ? 4 : g.total_point >= 71 ? 3 : g.total_point >= 56 ? 2 : 0
    return s + pts * g.credit
  }, 0)
  return (weightedSum / totalCredits).toFixed(2)
}

export default function Ozlashtirish() {
  const { currentCode, getSemesterId } = useCurrentSemester()
  const [selectedCode, setSelectedCode] = useState<number | null>(null)

  const activeCode = selectedCode ?? currentCode
  const semId = activeCode > 0 ? getSemesterId(activeCode) : undefined

  const { data, loading, error, refetch } = useApi(
    () => hemisApi.grades(semId ? { _semester: semId } : {}),
    [semId]
  )
  const grades: HemisGrade[] = data?.data ?? []

  const graded   = grades.filter((g) => g.total_point != null && g.total_point > 0)
  const pending  = grades.filter((g) => !g.total_point)
  const gpa      = calcGpa(graded)

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>O&apos;zlashtirish</h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Akademik ko&apos;rsatkichlar</p>
        </div>
        <SemesterTabs currentCode={currentCode} value={activeCode} onChange={code => setSelectedCode(code)} />
      </motion.div>

      <div className="grid grid-cols-3 gap-5">
        {[
          { label: "GPA (joriy)",  value: gpa,           icon: Award,     color: "#1cc2dc" },
          { label: "Baholangan",   value: graded.length,  icon: BarChart2, color: "#0e58a8" },
          { label: "Kutilmoqda",   value: pending.length, icon: TrendingUp, color: "#7293b9" },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-white rounded-[10px] p-5 flex items-center gap-4" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
              <div className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#f6f9ff" }}>
                <Icon className="w-6 h-6" style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-2xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.value}</div>
                <div className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
          <h2 className="text-lg font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Fanlar bo&apos;yicha baholar</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                {["Fan", "O'qituvchi", "Kredit", "Umumiy ball (100)", "Baho", "Holat"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grades.map((g, idx) => {
                const hasPoint = g.total_point != null && g.total_point > 0
                const gc = gradeColor(hasPoint ? g.total_point : null)
                return (
                  <motion.tr key={g.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.subject_name}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{g.employee_name}</td>
                    <td className="px-4 py-3 text-sm text-center font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.credit}</td>
                    <td className="px-4 py-3 text-sm text-center font-semibold" style={{ color: hasPoint ? "#012970" : "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {hasPoint ? g.total_point : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: gc.bg, color: gc.color, border: `1px solid ${gc.border}` }}>
                        {hasPoint ? getLetterGrade(g.total_point) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: g.finish_credit_status ? "#f0fff4" : "#fff8e6",
                          color: g.finish_credit_status ? "#22c55e" : "#f59e0b",
                        }}>
                        {g.finish_credit_status ? "O'tdi" : "Kutilmoqda"}
                      </span>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
