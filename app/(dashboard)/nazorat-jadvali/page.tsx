"use client"

import { useMemo, useState } from "react"
import { GraduationCap, Clock, BookOpen, Search } from "lucide-react"
import { teachingApi, type TeacherContent } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"]
const UZ_DAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"]

const STATUS_COLORS = {
  open:   { bg: "#f0fdf4", color: "#15803d", label: "Ochiq" },
  locked: { bg: "#fef2f2", color: "#b91c1c", label: "Qulflangan" },
  closed: { bg: "#fffbeb", color: "#92400e", label: "Yakunlangan" },
}

function dateKey(ts: number): string {
  const d = new Date(ts * 1000)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function dateHeading(ts: number): string {
  const d = new Date(ts * 1000)
  return `${UZ_DAYS[d.getDay()]}, ${d.getDate()}-${UZ_MONTHS[d.getMonth()]}, ${d.getFullYear()}`
}

export default function NazoratJadvali() {
  const [search, setSearch] = useState("")

  const { data: lmsData, loading, error, refetch } = useApi(() => teachingApi.content({ type: "exam" }), [])
  const lmsExams: TeacherContent[] = (lmsData?.data ?? []).filter(e =>
    !e.topicKey && (e.controlType === "oraliq" || e.controlType === "yakuniy")
  )

  const filtered = useMemo<Array<{ data: TeacherContent; ts: number }>>(() => {
    const q = search.trim().toLowerCase()
    return lmsExams
      .filter(e => {
        if (!e.availableFrom) return false
        if (!q) return true
        return (
          e.title.toLowerCase().includes(q) ||
          e.subjectName.toLowerCase().includes(q)
        )
      })
      .map(e => ({
        data: e,
        ts: Math.floor(new Date(e.availableFrom).getTime() / 1000),
      }))
      .sort((a, b) => a.ts - b.ts)
  }, [lmsExams, search])

  const groups = useMemo(() => {
    const map = new Map<string, { ts: number; items: Array<{ data: TeacherContent; ts: number }> }>()
    filtered.forEach(item => {
      const key = dateKey(item.ts)
      if (!map.has(key)) map.set(key, { ts: item.ts, items: [] })
      map.get(key)!.items.push(item)
    })
    return Array.from(map.values()).sort((a, b) => a.ts - b.ts)
  }, [filtered])

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Nazorat Jadvali
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Imtihon va nazorat turlarining jadvali
        </p>
      </div>

      <label className="flex items-center gap-2 px-3 py-2.5 rounded-[6px] bg-white w-full max-w-sm"
        style={{ border: "1px solid rgba(1,41,112,0.2)" }}>
        <Search className="w-4 h-4 shrink-0" style={{ color: "#7293b9" }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Fan yoki imtihon nomi bo'yicha qidirish"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
      </label>

      {groups.length === 0 ? (
        <div className="bg-white rounded-[10px] p-10 text-center"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <GraduationCap className="w-8 h-8 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Nazorat jadvali topilmadi
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(group => (
            <div key={group.ts} className="flex flex-col gap-3">
              <span className="text-sm font-semibold px-4 py-1.5 rounded-full w-fit"
                style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                {dateHeading(group.ts)}
              </span>

              <div className="flex flex-col gap-3">
                {group.items.map(item => {
                  const lms = item.data
                  const st = STATUS_COLORS[lms.status] ?? STATUS_COLORS.locked
                  const d = new Date(item.ts * 1000)
                  const timeStr = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
                  return (
                    <div key={`lms-${lms.id}`} className="bg-white rounded-[10px] p-4 flex flex-col gap-2"
                      style={{ border: "1px solid rgba(14,88,168,0.15)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                          <BookOpen className="w-5 h-5" style={{ color: "#0e58a8" }} />
                          {lms.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                            <Clock className="w-3.5 h-3.5" />
                            {timeStr}
                          </span>
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                            style={{ backgroundColor: st.bg, color: st.color, fontFamily: "var(--font-poppins)" }}>
                            {st.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 text-sm" style={{ fontFamily: "var(--font-poppins)" }}>
                        <span><span style={{ color: "#7293b9" }}>Fan:</span> <span style={{ color: "#012970", fontWeight: 500 }}>{lms.subjectName}</span></span>
                        {lms.controlType && (
                          <span><span style={{ color: "#7293b9" }}>Turi:</span> <span style={{ color: "#012970", fontWeight: 500 }}>{lms.controlType}</span></span>
                        )}
                        {lms.maxScore != null && (
                          <span><span style={{ color: "#7293b9" }}>Maksimal ball:</span> <span style={{ color: "#012970", fontWeight: 500 }}>{lms.maxScore}</span></span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: lms.controlType === "yakuniy" ? "#fef2f2" : "#eef4ff",
                            color: lms.controlType === "yakuniy" ? "#b91c1c" : "#0e58a8",
                            fontFamily: "var(--font-poppins)",
                          }}>
                          {lms.controlType === "yakuniy" ? "Yakuniy imtihon" : "Oraliq nazorat"}
                        </span>
                        {lms.attemptsCount != null && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: "#f5f3ff", color: "#7c3aed", fontFamily: "var(--font-poppins)" }}>
                            {lms.attemptsCount} ta urinish
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
