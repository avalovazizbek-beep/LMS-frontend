"use client"

import { useMemo } from "react"
import { BookOpen, Lock } from "lucide-react"
import Link from "next/link"
import { teachingApi, type TeacherContent } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

interface SubjectStat {
  name: string
  total: number
  locked: number
}

export default function FanResurslari() {
  const { data, loading, error, refetch } = useApi(() => teachingApi.content({ type: "lesson" }), [])
  const items: TeacherContent[] = data?.data ?? []

  const subjects = useMemo((): SubjectStat[] => {
    const map: Record<string, SubjectStat> = {}
    items.forEach(item => {
      const name = item.subjectName || "Boshqa"
      if (!map[name]) map[name] = { name, total: 0, locked: 0 }
      map[name].total++
      if (item.status === "locked") map[name].locked++
    })
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Fan Resurslari
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          O&apos;qituvchi yuklagan darslik materiallari — fanlarni tanlang
        </p>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white rounded-[10px] p-12 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Hozircha darslik materiallari yuklanmagan
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {subjects.map(subject => (
            <Link
              key={subject.name}
              href={`/fan-resurslari/${encodeURIComponent(subject.name)}`}
              className="group flex flex-col gap-3 p-4 rounded-[12px] bg-white transition-all hover:-translate-y-0.5"
              style={{ border: "1px solid rgba(1,41,112,0.12)", boxShadow: "0px 2px 8px rgba(1,41,112,0.06)" }}
            >
              <div className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0 transition-colors" style={{ backgroundColor: "#eef4ff" }}>
                <BookOpen className="w-5 h-5 transition-colors group-hover:scale-110" style={{ color: "#0e58a8" }} />
              </div>

              <span className="text-sm font-semibold leading-snug line-clamp-3 flex-1" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {subject.name}
              </span>

              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {subject.total} ta material{subject.locked > 0 ? ` · ${subject.locked} qulflangan` : ""}
                </span>
                <span className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: subject.locked > 0 ? "#fef2f2" : "#eef4ff", color: subject.locked > 0 ? "#b91c1c" : "#0e58a8" }}>
                  {subject.locked > 0 ? <Lock className="w-3.5 h-3.5" /> : subject.total}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
