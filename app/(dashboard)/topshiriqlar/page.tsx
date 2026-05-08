"use client"

import { useState, useMemo } from "react"
import { ClipboardList, CheckCircle2, Clock } from "lucide-react"
import Link from "next/link"
import SemesterTabs from "@/components/ui/SemesterTabs"
import { useCurrentSemester } from "@/hooks/useCurrentSemester"
import { hemisApi, HemisTask } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  "11": { bg: "#fff8e6", color: "#f59e0b" },
  "12": { bg: "#f0f5ff", color: "#0e58a8" },
  "13": { bg: "#f0fff4", color: "#22c55e" },
}
const STATUS_LABELS: Record<string, string> = {
  "11": "Berildi",
  "12": "Topshirdi",
  "13": "Baholandi",
}

interface SubjectStat {
  name: string
  total: number
  byStatus: Record<string, number>
}

export default function Topshiriqlar() {
  const { currentCode, getSemesterId } = useCurrentSemester()
  const [selectedCode, setSelectedCode] = useState<number | null>(null)

  const activeCode = selectedCode ?? currentCode
  const semId = activeCode > 0 ? getSemesterId(activeCode) : undefined

  const { data, loading, error, refetch } = useApi(
    () => hemisApi.tasks(semId ? { _semester: semId } : {}),
    [semId]
  )
  const tasks: HemisTask[] = data?.data ?? []

  // Group tasks by subject
  const subjectStats = useMemo((): SubjectStat[] => {
    const map: Record<string, SubjectStat> = {}
    tasks.forEach(t => {
      const name = t.subject?.name ?? "Boshqa"
      if (!map[name]) map[name] = { name, total: 0, byStatus: {} }
      map[name].total++
      const code = t.taskStatus?.code ?? "11"
      map[name].byStatus[code] = (map[name].byStatus[code] ?? 0) + 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [tasks])

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  const semParam = semId ? `?semester=${semId}` : ""

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Topshiriqlar
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Mustaqil ta&apos;lim va vazifalar — fanlarni tanlang
          </p>
        </div>
        <SemesterTabs
          currentCode={currentCode}
          value={activeCode || currentCode}
          onChange={code => setSelectedCode(code)}
        />
      </div>

      {/* Summary stats */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Jami",       value: tasks.length,                                              color: "#012970", Icon: ClipboardList },
            { label: "Berildi",    value: tasks.filter(t => t.taskStatus?.code === "11").length,     color: "#f59e0b", Icon: Clock         },
            { label: "Topshirdi",  value: tasks.filter(t => t.taskStatus?.code === "12").length,     color: "#0e58a8", Icon: ClipboardList },
            { label: "Baholandi",  value: tasks.filter(t => t.taskStatus?.code === "13").length,     color: "#22c55e", Icon: CheckCircle2  },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-[10px] p-4 flex items-center gap-3"
              style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
              <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#f6f9ff" }}>
                <s.Icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-2xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>
                  {s.value}
                </div>
                <div className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subject cards */}
      {subjectStats.length === 0 ? (
        <div className="bg-white rounded-[10px] p-12 text-center"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Bu semestrda topshiriqlar topilmadi
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {subjectStats.map(s => {
            const pending  = s.byStatus["11"] ?? 0
            const hasPending = pending > 0
            return (
              <Link
                key={s.name}
                href={`/topshiriqlar/${encodeURIComponent(s.name)}${semParam}`}
                className="group flex flex-col gap-3 p-4 rounded-[12px] bg-white transition-all hover:-translate-y-0.5"
                style={{
                  border: hasPending
                    ? "1px solid rgba(245,158,11,0.35)"
                    : "1px solid rgba(1,41,112,0.12)",
                  boxShadow: hasPending
                    ? "0px 2px 10px rgba(245,158,11,0.12)"
                    : "0px 2px 8px rgba(1,41,112,0.06)",
                }}
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: hasPending ? "#fff8e6" : "#eef4ff" }}
                >
                  <ClipboardList
                    className="w-5 h-5 transition-transform group-hover:scale-110"
                    style={{ color: hasPending ? "#f59e0b" : "#0e58a8" }}
                  />
                </div>

                {/* Subject name */}
                <span
                  className="text-sm font-semibold leading-snug line-clamp-3 flex-1"
                  style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
                >
                  {s.name}
                </span>

                {/* Status badges */}
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(s.byStatus).map(([code, cnt]) => (
                    <span
                      key={code}
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: STATUS_COLORS[code]?.bg ?? "#f6f9ff",
                        color: STATUS_COLORS[code]?.color ?? "#7293b9",
                        fontFamily: "var(--font-poppins)",
                      }}
                    >
                      {cnt} {STATUS_LABELS[code] ?? code}
                    </span>
                  ))}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between mt-auto pt-2"
                  style={{ borderTop: "1px solid rgba(1,41,112,0.07)" }}>
                  <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    Jami topshiriq
                  </span>
                  <span className="text-sm font-semibold"
                    style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    {s.total}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
