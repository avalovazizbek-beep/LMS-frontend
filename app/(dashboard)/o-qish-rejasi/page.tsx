"use client"

import { useState } from "react"
import { BookOpen, Clock, CheckCircle2, Circle } from "lucide-react"
import { hemisApi, HemisGrade } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import SemesterTabs from "@/components/ui/SemesterTabs"
import { useCurrentSemester } from "@/hooks/useCurrentSemester"

export default function OqishRejasi() {
  const { currentCode, getSemesterId } = useCurrentSemester()
  const [selectedCode, setSelectedCode] = useState<number | null>(null)

  const activeCode = selectedCode ?? currentCode
  const semId = activeCode > 0 ? getSemesterId(activeCode) : undefined

  const { data, loading, error, refetch } = useApi(
    () => hemisApi.grades(semId ? { _semester: semId } : {}),
    [semId]
  )
  const subjects: HemisGrade[] = data?.data ?? []

  const totalCredits  = subjects.reduce((s, g) => s + (g.credit ?? 0), 0)
  const totalHours    = subjects.reduce((s, g) => s + (g.total_acload ?? 0), 0)
  const completed     = subjects.filter(g => g.finish_credit_status).length

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            O&apos;quv Rejasi
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Semestr bo&apos;yicha fanlar ro&apos;yxati
          </p>
        </div>
        <SemesterTabs currentCode={currentCode} value={activeCode || currentCode} onChange={code => setSelectedCode(code)} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Jami fanlar",   value: subjects.length, icon: BookOpen,     color: "#0e58a8" },
          { label: "Jami kreditlar", value: totalCredits,   icon: CheckCircle2, color: "#1cc2dc" },
          { label: "Jami soatlar",  value: totalHours,      icon: Clock,        color: "#012970" },
          { label: "Bajarilgan",    value: completed,       icon: Circle,       color: "#22c55e" },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
              <Icon className="w-6 h-6 mb-3" style={{ color: s.color }} />
              <div className="text-3xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.value}</div>
              <div className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
          <h2 className="text-lg font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Fanlar ro&apos;yxati</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                {["#", "Fan nomi", "Kredit", "Soatlar", "Turi", "Ball", "Holat"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap"
                    style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm"
                    style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    Bu semestrda fanlar topilmadi
                  </td>
                </tr>
              ) : subjects.map((g, i) => (
                <tr key={g.id} className="hover:bg-[#f6f9ff]/50 transition-colors"
                  style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                  <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.subject_name}</td>
                  <td className="px-4 py-3 text-sm text-center font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{g.credit}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.total_acload}h</td>
                  <td className="px-4 py-3">
                    {g.subject_type ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: g.subject_type === "Majburiy" ? "#f0f5ff" : "#f0fbfd",
                          color: g.subject_type === "Majburiy" ? "#0e58a8" : "#1cc2dc",
                        }}>{g.subject_type}</span>
                    ) : <span style={{ color: "#7293b9" }}>—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-center"
                    style={{ color: g.total_point > 0 ? "#012970" : "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {g.total_point > 0 ? `${g.total_point}/100` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {g.finish_credit_status
                      ? <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", border: "1px solid #0e58a8" }}>O&apos;tdi</span>
                      : <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: "#f0fbfd", color: "#1cc2dc", border: "1px solid #1cc2dc" }}>Jarayonda</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
