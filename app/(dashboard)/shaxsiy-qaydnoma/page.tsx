"use client"

import { useState } from "react"
import { BookOpen } from "lucide-react"
import { hemisApi, HemisGrade } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import SemesterTabs from "@/components/ui/SemesterTabs"
import { useCurrentSemester } from "@/hooks/useCurrentSemester"

function gradeLabel(pt: number): string {
  if (pt >= 86) return "A (Mukammal)"
  if (pt >= 71) return "B (Yaxshi)"
  if (pt >= 56) return "C (Qoniqarli)"
  if (pt >= 1)  return "D (Qoniqarsiz)"
  return "—"
}

function gradeColor(pt: number) {
  if (pt >= 86) return { bg: "#f0fbfd", color: "#1cc2dc" }
  if (pt >= 71) return { bg: "#f0fff4", color: "#22c55e" }
  if (pt >= 56) return { bg: "#fff8e6", color: "#f59e0b" }
  if (pt >= 1)  return { bg: "#fff0f0", color: "#ef4444" }
  return { bg: "#f6f9ff", color: "#7293b9" }
}

export default function ShaxsiyQaydnoma() {
  const { currentCode, getSemesterId } = useCurrentSemester()
  const [selectedCode, setSelectedCode] = useState<number | null>(null)

  const activeCode = selectedCode ?? currentCode
  const semId = activeCode > 0 ? getSemesterId(activeCode) : undefined

  const { data, loading, error, refetch } = useApi(
    () => hemisApi.grades(semId ? { _semester: semId } : {}),
    [semId]
  )
  const grades: HemisGrade[] = data?.data ?? []

  const totalCredits = grades.reduce((s, g) => s + (g.credit ?? 0), 0)
  const withPoints   = grades.filter(g => g.total_point > 0)
  const gpa = withPoints.length > 0
    ? (withPoints.reduce((s, g) => {
        const pts = g.total_point >= 86 ? 4 : g.total_point >= 71 ? 3 : g.total_point >= 56 ? 2 : 0
        return s + pts * g.credit
      }, 0) / withPoints.reduce((s, g) => s + g.credit, 0)).toFixed(2)
    : null

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Shaxsiy Qaydnoma
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Akademik qaydnoma — baholar ro&apos;yxati
          </p>
        </div>
        <SemesterTabs currentCode={currentCode} value={activeCode || currentCode} onChange={code => setSelectedCode(code)} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: "Jami fanlar",   value: grades.length   },
          { label: "Jami kreditlar", value: totalCredits   },
          { label: "GPA",            value: gpa ?? "—"     },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-[10px] p-5 text-center"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="text-3xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {s.value}
            </div>
            <div className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grade table */}
      <div className="bg-white rounded-[10px] overflow-hidden"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)", backgroundColor: "#f6f9ff" }}>
                {["#", "Fan", "Kredit", "Ball", "Baho", "Holat"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm"
                    style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: "#7293b9" }} />
                    Bu semestrda fanlar topilmadi
                  </td>
                </tr>
              ) : grades.map((g, i) => {
                const hasPoint = g.total_point > 0
                const gc = gradeColor(hasPoint ? g.total_point : 0)
                return (
                  <tr key={g.id} className="hover:bg-[#f6f9ff]/50 transition-colors"
                    style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {g.subject_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-semibold"
                      style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{g.credit}</td>
                    <td className="px-4 py-3 text-sm text-center font-semibold"
                      style={{ color: hasPoint ? "#012970" : "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {hasPoint ? g.total_point : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: gc.bg, color: gc.color }}>
                        {hasPoint ? gradeLabel(g.total_point) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: g.finish_credit_status ? "#f0fff4" : "#f6f9ff",
                          color: g.finish_credit_status ? "#22c55e" : "#7293b9",
                        }}>
                        {g.finish_credit_status ? "O'tdi" : "Jarayonda"}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
