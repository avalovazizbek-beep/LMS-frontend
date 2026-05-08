"use client"

import { useState, useMemo } from "react"
import { BookOpen } from "lucide-react"
import Link from "next/link"
import SemesterTabs from "@/components/ui/SemesterTabs"
import { useCurrentSemester } from "@/hooks/useCurrentSemester"
import { hemisApi, HemisGrade, HemisResource, HemisResourceItem } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

type ResType = "pdf" | "video" | "link" | "other"

function detectTypeFromFile(filename: string, url: string): ResType {
  const name = (filename + url).toLowerCase()
  if (/\.(mp4|avi|mov|mkv|webm)$/.test(name)) return "video"
  if (/\.(pdf|doc|docx|ppt|pptx|xls|xlsx)$/.test(name)) return "pdf"
  if (url && !filename) return "link"
  return "other"
}

function detectItemType(item: HemisResourceItem): ResType {
  const typeName = (item.resourceType?.name ?? "").toLowerCase()
  if (typeName.includes("video")) return "video"
  const firstFile = item.files?.[0]
  if (firstFile) return detectTypeFromFile(firstFile.name, firstFile.url)
  if (item.url) return "link"
  return "other"
}

const typeIcons: Record<ResType, string> = {
  pdf: "📄", video: "🎬", link: "🔗", other: "📁",
}

export default function FanResurslari() {
  const { currentCode, getSemesterId } = useCurrentSemester()
  const [selectedCode, setSelectedCode] = useState<number | null>(null)

  const activeCode = selectedCode ?? currentCode
  const semId = activeCode > 0 ? getSemesterId(activeCode) : undefined

  // Enrolled subjects for this semester
  const { data: gradesData, loading: gradesLoading, error: gradesError, refetch } = useApi(
    () => hemisApi.grades(semId ? { _semester: semId } : {}),
    [semId]
  )
  const subjects = useMemo(() => {
    const grades: HemisGrade[] = gradesData?.data ?? []
    return [...new Set(grades.map(g => g.subject_name).filter(Boolean))].sort()
  }, [gradesData])

  // Resources — for counting per subject
  const { data: resData } = useApi(
    () => hemisApi.resources(semId ? { _semester: semId } : {}),
    [semId]
  )
  const resCountBySubject = useMemo(() => {
    const map: Record<string, number> = {}
    ;(resData?.data ?? [] as HemisResource[]).forEach((r: HemisResource) => {
      const name = r.subject?.name ?? ""
      if (!name) return
      ;(r.subjectFileResourceItems ?? []).forEach((item: HemisResourceItem) => {
        map[name] = (map[name] ?? 0) + 1
      })
    })
    return map
  }, [resData])

  if (gradesLoading) return <Loading />
  if (gradesError)   return <ApiError message={gradesError} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Fan Resurslari
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            O&apos;quv materiallari — fanlarni tanlang
          </p>
        </div>
        <SemesterTabs
          currentCode={currentCode}
          value={activeCode || currentCode}
          onChange={code => setSelectedCode(code)}
        />
      </div>

      {/* Subject cards */}
      {subjects.length === 0 ? (
        <div className="bg-white rounded-[10px] p-12 text-center"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Bu semestrda fanlar topilmadi
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {subjects.map(subject => {
            const count = resCountBySubject[subject] ?? 0
            const semParam = semId ? `?semester=${semId}` : ""
            return (
              <Link
                key={subject}
                href={`/fan-resurslari/${encodeURIComponent(subject)}${semParam}`}
                className="group flex flex-col gap-3 p-4 rounded-[12px] bg-white transition-all hover:-translate-y-0.5"
                style={{
                  border: "1px solid rgba(1,41,112,0.12)",
                  boxShadow: "0px 2px 8px rgba(1,41,112,0.06)",
                }}
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0 transition-colors"
                  style={{ backgroundColor: "#eef4ff" }}
                >
                  <BookOpen
                    className="w-5 h-5 transition-colors group-hover:scale-110"
                    style={{ color: "#0e58a8" }}
                  />
                </div>

                {/* Subject name */}
                <span
                  className="text-sm font-semibold leading-snug line-clamp-3 flex-1"
                  style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
                >
                  {subject}
                </span>

                {/* Footer: resource count */}
                <div className="flex items-center justify-between mt-auto">
                  <span
                    className="text-xs"
                    style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}
                  >
                    {count > 0 ? `${count} ta resurs` : "Resurs yo'q"}
                  </span>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: count > 0 ? "#eef4ff" : "#f6f9ff",
                      color: count > 0 ? "#0e58a8" : "#7293b9",
                      fontFamily: "var(--font-poppins)",
                    }}
                  >
                    {count > 0 ? `${count}` : "0"}
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
