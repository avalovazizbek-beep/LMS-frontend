"use client"

import { useMemo } from "react"
import { BookOpen, Video } from "lucide-react"
import Link from "next/link"
import { teachingApi, meetingsApi, type TeacherContent, type MeetingRecording } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

interface SubjectStat {
  name: string
  topicCount: number
  hasRecordings: boolean
}

export default function FanResurslari() {
  const { data, loading, error, refetch } = useApi(() => teachingApi.content({}), [])
  const { data: recData } = useApi(() => meetingsApi.myRecordings(), [])

  const items: TeacherContent[] = data?.data ?? []
  const recordings: MeetingRecording[] = recData?.data ?? []

  const subjects = useMemo((): SubjectStat[] => {
    const map: Record<string, { topics: Set<string>; hasRec: boolean }> = {}

    // Add subjects from teacher content topics
    items.forEach(item => {
      if (!item.topicKey) return
      const name = item.subjectName || "Boshqa"
      if (!map[name]) map[name] = { topics: new Set(), hasRec: false }
      map[name].topics.add(item.topicKey)
    })

    // Add subjects from meeting recordings
    recordings.forEach(r => {
      const name = r.subjectName || "Boshqa"
      if (!map[name]) map[name] = { topics: new Set(), hasRec: false }
      if (r.fileUrl) map[name].hasRec = true
    })

    return Object.entries(map)
      .map(([name, { topics, hasRec }]) => ({ name, topicCount: topics.size, hasRecordings: hasRec }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [items, recordings])

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
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0 transition-colors" style={{ backgroundColor: "#eef4ff" }}>
                  <BookOpen className="w-5 h-5 transition-colors group-hover:scale-110" style={{ color: "#0e58a8" }} />
                </div>
                {subject.hasRecordings && (
                  <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                    <Video className="w-2.5 h-2.5" /> Yozuv
                  </span>
                )}
              </div>

              <span className="text-sm font-semibold leading-snug line-clamp-3 flex-1" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {subject.name}
              </span>

              <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {subject.topicCount > 0 ? `${subject.topicCount} ta mavzu` : "Faqat yozuvlar"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
