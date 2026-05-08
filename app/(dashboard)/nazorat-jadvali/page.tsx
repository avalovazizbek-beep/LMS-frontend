"use client"

import { useState } from "react"
import { FileText } from "lucide-react"
import { hemisApi, HemisPerformance } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import SemesterTabs from "@/components/ui/SemesterTabs"
import { useCurrentSemester } from "@/hooks/useCurrentSemester"

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function gradeColor(grade: number) {
  if (grade >= 86) return { bg: "#f0fbfd", color: "#1cc2dc" }
  if (grade >= 71) return { bg: "#f0f5ff", color: "#0e58a8" }
  if (grade >= 56) return { bg: "#fff8e6", color: "#f59e0b" }
  return { bg: "#fff0f0", color: "#ef4444" }
}

export default function NazoratJadvali() {
  const { currentCode, getSemesterId } = useCurrentSemester()
  const [selectedCode, setSelectedCode] = useState<number | null>(null)

  const activeCode = selectedCode ?? currentCode
  const semId = activeCode > 0 ? getSemesterId(activeCode) : undefined

  const { data, loading, error, refetch } = useApi(
    () => hemisApi.performance(semId ? { _semester: semId } : {}),
    [semId]
  )
  const records: HemisPerformance[] = (data?.data ?? []) as HemisPerformance[]
  const sorted = [...records].sort((a, b) => {
    const aDate = (a as any).lesson_date ?? 0
    const bDate = (b as any).lesson_date ?? 0
    return bDate - aDate
  })

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Nazorat Jadvali</h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Joriy nazorat natijalari</p>
        </div>
        <SemesterTabs currentCode={currentCode} value={activeCode || currentCode} onChange={code => setSelectedCode(code)} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] overflow-hidden"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)", backgroundColor: "#f6f9ff" }}>
                {["#", "Fan", "Turi", "O'qituvchi", "Sana", "Ball"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm"
                    style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    Bu semestrda nazorat natijalari topilmadi
                  </td>
                </tr>
              ) : sorted.map((r: any, i) => {
                const gc = gradeColor(r.grade ?? 0)
                return (
                  <tr key={r.id ?? i} className="hover:bg-[#f6f9ff]/50 transition-colors"
                    style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {r.subject?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: "#f6f9ff", color: "#7293b9" }}>
                        {r.trainingType?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {r.employee?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {r.lesson_date ? formatDate(r.lesson_date) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.grade != null ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: gc.bg, color: gc.color }}>
                          {r.grade}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
                          <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Kutilmoqda</span>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(1,41,112,0.1)" }}>
          <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Jami: {sorted.length} ta natija
          </span>
        </div>
      </div>
    </div>
  )
}
