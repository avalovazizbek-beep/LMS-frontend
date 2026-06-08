"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ClipboardList, ArrowLeft } from "lucide-react"
import { teachingApi, type TeacherContent, type ContentStatus } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { StudentContentCard } from "@/components/teaching/StudentContentCard"

const FILTERS: Array<{ key: "all" | ContentStatus; label: string }> = [
  { key: "all",    label: "Barchasi" },
  { key: "locked", label: "Qulflangan" },
  { key: "open",   label: "Ochiq" },
  { key: "closed", label: "Muddat tugagan" },
]

export default function TopshiriqlarDetail() {
  const params = useParams()
  const router = useRouter()
  const subjectName = decodeURIComponent(String(params.subject ?? ""))

  const [statusFilter, setStatusFilter] = useState<"all" | ContentStatus>("all")

  const { data, loading, error, refetch } = useApi(() => teachingApi.content({ type: "assignment", subject: subjectName }), [subjectName])
  const subjectItems: TeacherContent[] = useMemo(
    () => (data?.data ?? []).filter(i => i.subjectName === subjectName),
    [data, subjectName]
  )

  const filtered = useMemo(
    () => statusFilter === "all" ? subjectItems : subjectItems.filter(i => i.status === statusFilter),
    [subjectItems, statusFilter]
  )

  const counts = useMemo(() => ({
    all: subjectItems.length,
    locked: subjectItems.filter(i => i.status === "locked").length,
    open: subjectItems.filter(i => i.status === "open").length,
    closed: subjectItems.filter(i => i.status === "closed").length,
  }), [subjectItems])

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
            {subjectItems.length} ta topshiriq
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => {
          const cnt = counts[f.key]
          const isActive = statusFilter === f.key
          return (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? "#0e58a8" : "#fff",
                color: isActive ? "#fff" : "#7293b9",
                border: isActive ? "1px solid #0e58a8" : "1px solid rgba(1,41,112,0.15)",
                fontFamily: "var(--font-poppins)",
              }}>
              {f.label}
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "#f0f5ff", color: isActive ? "#fff" : "#0e58a8" }}>
                {cnt}
              </span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-[10px] p-12 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Topshiriqlar topilmadi
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(item => (
            <StudentContentCard key={item.id} item={item} submittable />
          ))}
        </div>
      )}
    </div>
  )
}
