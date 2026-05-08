"use client"

import { useMemo, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import {
  ClipboardList, Download, CheckCircle2, Clock, AlertCircle, ArrowLeft,
} from "lucide-react"
import { hemisApi, HemisTask } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

function formatDate(ts?: number): string {
  if (!ts) return "—"
  return new Date(ts * 1000).toLocaleDateString("uz-UZ", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

const statusConfig: Record<string, {
  label: string; bg: string; color: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  "11": { label: "Berildi",   bg: "#fff8e6", color: "#f59e0b", icon: Clock         },
  "12": { label: "Topshirdi", bg: "#f0f5ff", color: "#0e58a8", icon: ClipboardList },
  "13": { label: "Baholandi", bg: "#f0fff4", color: "#22c55e", icon: CheckCircle2  },
}

const FILTERS = [
  { key: "all", label: "Barchasi" },
  { key: "11",  label: "Berildi"  },
  { key: "12",  label: "Topshirdi"},
  { key: "13",  label: "Baholandi"},
]

export default function TopshiriqlarDetail() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const router       = useRouter()

  const subjectName = decodeURIComponent(String(params.subject ?? ""))
  const semId       = searchParams.get("semester") ?? undefined

  const [statusFilter, setStatusFilter] = useState("all")

  const { data, loading, error, refetch } = useApi(
    () => hemisApi.tasks(semId ? { _semester: semId } : {}),
    [semId]
  )

  const subjectTasks: HemisTask[] = useMemo(() =>
    (data?.data ?? []).filter(t => (t.subject?.name ?? "Boshqa") === subjectName),
    [data, subjectName]
  )

  const filtered = useMemo(() =>
    statusFilter === "all"
      ? subjectTasks
      : subjectTasks.filter(t => t.taskStatus?.code === statusFilter),
    [subjectTasks, statusFilter]
  )

  const counts = useMemo(() => ({
    all: subjectTasks.length,
    "11": subjectTasks.filter(t => t.taskStatus?.code === "11").length,
    "12": subjectTasks.filter(t => t.taskStatus?.code === "12").length,
    "13": subjectTasks.filter(t => t.taskStatus?.code === "13").length,
  }), [subjectTasks])

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-[8px] transition-colors hover:bg-[#f0f5ff] shrink-0 mt-1"
          style={{ border: "1px solid rgba(1,41,112,0.15)" }}
        >
          <ArrowLeft className="w-4 h-4" style={{ color: "#0e58a8" }} />
        </button>
        <div>
          <h1 className="text-[24px] font-semibold leading-snug"
            style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {subjectName}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {subjectTasks.length} ta topshiriq
          </p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => {
          const cnt = counts[f.key as keyof typeof counts]
          const isActive = statusFilter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? "#0e58a8" : "#fff",
                color: isActive ? "#fff" : "#7293b9",
                border: isActive ? "1px solid #0e58a8" : "1px solid rgba(1,41,112,0.15)",
                fontFamily: "var(--font-poppins)",
              }}
            >
              {f.label}
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "#f0f5ff",
                  color: isActive ? "#fff" : "#0e58a8",
                }}
              >
                {cnt}
              </span>
            </button>
          )
        })}
      </div>

      {/* Task cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[10px] p-12 text-center"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Topshiriqlar topilmadi
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(t => {
            const st       = statusConfig[t.taskStatus?.code ?? "11"] ?? statusConfig["11"]
            const StatusIcon = st.icon
            const activity = t.studentTaskActivity
            const isOverdue = t.deadline && Date.now() / 1000 > t.deadline && t.taskStatus?.code === "11"

            return (
              <div key={String(t.id)} className="bg-white rounded-[10px] p-5"
                style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                      style={{ backgroundColor: st.bg }}>
                      <StatusIcon className="w-5 h-5" style={{ color: st.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm"
                        style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                        {t.name ?? "Topshiriq"}
                      </h3>
                      {t.comment && (
                        <p className="text-xs mt-1 line-clamp-2"
                          style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                          {t.comment}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs"
                          style={{ color: isOverdue ? "#ef4444" : "#7293b9", fontFamily: "var(--font-poppins)" }}>
                          {isOverdue && <AlertCircle className="w-3 h-3 inline mr-0.5" />}
                          Muddat: {formatDate(t.deadline)}
                        </span>
                        <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                          Max ball: {t.max_ball ?? "—"}
                        </span>
                        {t.employee?.name && (
                          <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                            {t.employee.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: st.bg, color: st.color, border: `1px solid ${st.color}` }}>
                      {st.label}
                    </span>
                    {activity?.mark != null && (
                      <span className="text-sm font-semibold"
                        style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                        {activity.mark} / {t.max_ball ?? "—"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Task files */}
                {(t.files ?? []).length > 0 && (
                  <div className="mt-3 pt-3 flex flex-wrap gap-2"
                    style={{ borderTop: "1px solid rgba(1,41,112,0.06)" }}>
                    <span className="text-xs mr-1"
                      style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Fayl:</span>
                    {t.files!.map((f, fi) => (
                      <a key={fi} href={f.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-xs transition-opacity hover:opacity-80"
                        style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                        <Download className="w-3 h-3" />
                        {f.name}
                      </a>
                    ))}
                  </div>
                )}

                {/* Submitted activity */}
                {activity && (
                  <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(1,41,112,0.06)" }}>
                    <p className="text-xs font-medium mb-2"
                      style={{ color: "#22c55e", fontFamily: "var(--font-poppins)" }}>
                      Topshirilgan: {formatDate(activity.send_date)}
                      {activity.marked_comment && activity.marked_comment !== "." && ` · ${activity.marked_comment}`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(activity.files ?? []).map((f, fi) => (
                        <a key={fi} href={f.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-xs transition-opacity hover:opacity-80"
                          style={{ backgroundColor: "#f0fff4", color: "#22c55e", fontFamily: "var(--font-poppins)" }}>
                          <Download className="w-3 h-3" />
                          {f.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
