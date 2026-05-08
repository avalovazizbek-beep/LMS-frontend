"use client"

import { TrendingUp, Award, BookOpen } from "lucide-react"
import { hemisApi } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

interface HemisGpaItem {
  id: number | string
  student?: { id: number | string; name: string }
  gpa?: number | string
  educationYear?: { id: number | string; name: string }
  level?: { id: number | string; name: string }
}

function gpaColor(gpa: number): { bg: string; color: string } {
  if (gpa >= 3.5) return { bg: "#f0fbfd", color: "#1cc2dc" }
  if (gpa >= 3.0) return { bg: "#f0fff4", color: "#22c55e" }
  if (gpa >= 2.5) return { bg: "#f0f5ff", color: "#0e58a8" }
  if (gpa >= 2.0) return { bg: "#fff8e6", color: "#f59e0b" }
  return { bg: "#fff0f0", color: "#ef4444" }
}

export default function TalabaGpa() {
  const { data, loading, error, refetch } = useApi(() => hemisApi.gpa())
  const items: HemisGpaItem[] = (data?.data as any) ?? []

  const avg = items.length > 0
    ? (items.reduce((s, i) => s + Number(i.gpa ?? 0), 0) / items.length).toFixed(2)
    : null

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Talaba GPA Bali
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Har yilgi o&apos;rtacha ball ko&apos;rsatkichi
        </p>
      </div>

      {/* Summary */}
      {avg && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { label: "Umumiy o'rtacha GPA", value: avg,             icon: Award,     color: "#1cc2dc" },
            { label: "Ta'lim yillari",       value: items.length,   icon: BookOpen,  color: "#0e58a8" },
            { label: "Eng yuqori GPA",       value: Math.max(...items.map(i => Number(i.gpa ?? 0))).toFixed(2), icon: TrendingUp, color: "#22c55e" },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-white rounded-[10px] p-5 flex items-center gap-4"
                style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
                <div className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#f6f9ff" }}>
                  <Icon className="w-6 h-6" style={{ color: s.color }} />
                </div>
                <div>
                  <div className="text-2xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    {s.value}
                  </div>
                  <div className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* GPA by year */}
      <div className="bg-white rounded-[10px] overflow-hidden"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
          <h2 className="text-lg font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            O&apos;quv yillari bo&apos;yicha GPA
          </h2>
        </div>
        {items.length === 0 ? (
          <div className="p-10 text-center">
            <Award className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
            <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>GPA ma&apos;lumotlari topilmadi</p>
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-4">
            {items.map(item => {
              const gpaVal = Number(item.gpa ?? 0)
              const gc = gpaColor(gpaVal)
              const pct = Math.min((gpaVal / 4) * 100, 100)
              return (
                <div key={String(item.id)}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                        {item.educationYear?.name ?? "—"}
                      </span>
                      {item.level?.name && (
                        <span className="ml-2 text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                          {item.level.name}
                        </span>
                      )}
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm font-semibold"
                      style={{ backgroundColor: gc.bg, color: gc.color, fontFamily: "var(--font-poppins)" }}>
                      {gpaVal.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: "rgba(1,41,112,0.08)" }}>
                    <div className="h-2 rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: gc.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
