"use client"

import { useMemo } from "react"
import { ClipboardList, CheckCircle2, Clock, Lock } from "lucide-react"
import Link from "next/link"
import { teachingApi, type TeacherContent, type ContentStatus } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const STATUS_COLORS: Record<ContentStatus, { bg: string; color: string }> = {
  locked: { bg: "#fef2f2", color: "#b91c1c" },
  open:   { bg: "#f0fdf4", color: "#15803d" },
  closed: { bg: "#fffbeb", color: "#92400e" },
}
const STATUS_LABELS: Record<ContentStatus, string> = {
  locked: "Qulflangan",
  open: "Ochiq",
  closed: "Muddat tugagan",
}

interface SubjectStat {
  name: string
  total: number
  byStatus: Record<ContentStatus, number>
}

export default function Topshiriqlar() {
  const { data, loading, error, refetch } = useApi(() => teachingApi.content({ type: "assignment" }), [])
  const items: TeacherContent[] = data?.data ?? []

  const subjectStats = useMemo((): SubjectStat[] => {
    const map: Record<string, SubjectStat> = {}
    items.forEach(item => {
      const name = item.subjectName || "Boshqa"
      if (!map[name]) map[name] = { name, total: 0, byStatus: { locked: 0, open: 0, closed: 0 } }
      map[name].total++
      map[name].byStatus[item.status]++
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [items])

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Topshiriqlar
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          O&apos;qituvchi bergan topshiriqlar — fanlarni tanlang
        </p>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Jami",           value: items.length,                                       color: "#012970", Icon: ClipboardList },
            { label: "Qulflangan",     value: items.filter(i => i.status === "locked").length,    color: "#b91c1c", Icon: Lock          },
            { label: "Ochiq",          value: items.filter(i => i.status === "open").length,      color: "#15803d", Icon: Clock         },
            { label: "Muddat tugagan", value: items.filter(i => i.status === "closed").length,    color: "#92400e", Icon: CheckCircle2  },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-[10px] p-4 flex items-center gap-3" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
              <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#f6f9ff" }}>
                <s.Icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-2xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
                <div className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {subjectStats.length === 0 ? (
        <div className="bg-white rounded-[10px] p-12 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Hozircha topshiriqlar yo&apos;q
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {subjectStats.map(s => {
            const open = s.byStatus.open
            return (
              <Link
                key={s.name}
                href={`/topshiriqlar/${encodeURIComponent(s.name)}`}
                className="group flex flex-col gap-3 p-4 rounded-[12px] bg-white transition-all hover:-translate-y-0.5"
                style={{
                  border: open > 0 ? "1px solid rgba(21,128,61,0.3)" : "1px solid rgba(1,41,112,0.12)",
                  boxShadow: open > 0 ? "0px 2px 10px rgba(21,128,61,0.1)" : "0px 2px 8px rgba(1,41,112,0.06)",
                }}
              >
                <div className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: open > 0 ? "#f0fdf4" : "#eef4ff" }}>
                  <ClipboardList className="w-5 h-5 transition-transform group-hover:scale-110" style={{ color: open > 0 ? "#15803d" : "#0e58a8" }} />
                </div>

                <span className="text-sm font-semibold leading-snug line-clamp-3 flex-1" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {s.name}
                </span>

                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(s.byStatus) as ContentStatus[]).map(status => {
                    const cnt = s.byStatus[status]
                    if (!cnt) return null
                    return (
                      <span key={status} className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[status].bg, color: STATUS_COLORS[status].color, fontFamily: "var(--font-poppins)" }}>
                        {cnt} {STATUS_LABELS[status]}
                      </span>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: "1px solid rgba(1,41,112,0.07)" }}>
                  <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Jami topshiriq</span>
                  <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.total}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
