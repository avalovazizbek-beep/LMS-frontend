"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, BookOpen } from "lucide-react"
import { teachingApi, type TeacherContent } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { StudentContentCard } from "@/components/teaching/StudentContentCard"

const KIND_LABELS: Record<string, string> = {
  lecture: "Ma'ruza",
  presentation: "Taqdimot",
  laboratory: "Laboratoriya",
  video_lesson: "Video dars",
  other: "Boshqa",
}

export default function FanResurslariDetail() {
  const params = useParams()
  const router = useRouter()
  const subjectName = decodeURIComponent(String(params.subject ?? ""))

  const { data, loading, error, refetch } = useApi(() => teachingApi.content({ type: "lesson", subject: subjectName }), [subjectName])
  const items: TeacherContent[] = useMemo(
    () => (data?.data ?? []).filter(i => i.subjectName === subjectName),
    [data, subjectName]
  )

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-[8px] transition-colors hover:bg-[#f0f5ff] shrink-0 mt-1"
          style={{ border: "1px solid rgba(1,41,112,0.15)" }}>
          <ArrowLeft className="w-4 h-4" style={{ color: "#0e58a8" }} />
        </button>
        <div>
          <h1 className="text-[24px] font-semibold leading-snug" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {subjectName}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {items.length} ta o&apos;quv materiali
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-[10px] p-14 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
          <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Resurslar topilmadi
          </p>
          <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Bu fan uchun hozircha o&apos;quv materiallari yuklanmagan
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map(item => (
            <div key={item.id} className="flex flex-col gap-1">
              {item.kind && (
                <span className="text-xs font-medium w-fit px-2.5 py-1 rounded-full ml-1"
                  style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  {KIND_LABELS[item.kind] ?? item.kind}
                </span>
              )}
              <StudentContentCard item={item} submittable={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
