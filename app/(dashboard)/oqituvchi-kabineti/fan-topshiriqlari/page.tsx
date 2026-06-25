"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Download, X, Users, FileText, Loader2 } from "lucide-react"
import { hemisApi, type HemisTaskSubmission } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const titleStyle = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const labelStyle = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

type SubjectTaskDetail = {
  id?: number | string
  name?: string | null
  comment?: string | null
  taskType?: { code?: string; name?: string }
  max_ball?: number | null
  deadline_label?: string
  file_count?: number
  students_label?: string
  active?: boolean
}

/* ── Natijalar modal ─────────────────────────────────────────────── */
function SubmissionsModal({
  taskId,
  taskName,
  onClose,
}: {
  taskId: string
  taskName: string
  onClose: () => void
}) {
  const { data, loading, error } = useApi(
    () => hemisApi.taskSubmissions({ taskId }),
    [taskId]
  )
  const submissions = data?.data ?? []

  function formatSize(bytes: number | null) {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(1,41,112,0.35)" }}>
      <div className="bg-white rounded-[14px] w-full max-w-3xl max-h-[88vh] flex flex-col"
        style={{ boxShadow: "0 16px 48px rgba(1,41,112,0.18)" }}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <div>
            <h2 className="text-base font-semibold" style={titleStyle}>{taskName}</h2>
            <p className="text-xs mt-0.5" style={labelStyle}>
              Talabalar topshirishlari · jami {submissions.length} ta
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#f0f5ff] transition-colors shrink-0">
            <X className="w-5 h-5" style={{ color: "#7293b9" }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2" style={labelStyle}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Yuklanmoqda...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-center" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{error}</div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <FileText className="w-10 h-10" style={{ color: "#d8e6f7" }} />
              <p className="text-sm" style={labelStyle}>Hali hech kim topshirmagan</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)", backgroundColor: "#f8fafc" }}>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={titleStyle}>#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={titleStyle}>Talaba</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={titleStyle}>Fayl</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={titleStyle}>Izoh</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold" style={titleStyle}>Topshirilgan</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold" style={titleStyle}>Yuklab olish</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub, i) => (
                  <tr key={sub.id}
                    className="hover:bg-[#f6f9ff]"
                    style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-3 text-sm" style={labelStyle}>{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium" style={titleStyle}>{sub.studentName}</span>
                    </td>
                    <td className="px-4 py-3">
                      {sub.originalName ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium truncate max-w-[160px]" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                            {sub.originalName}
                          </span>
                          {sub.fileSize && (
                            <span className="text-xs" style={labelStyle}>{formatSize(sub.fileSize)}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs" style={labelStyle}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[140px]" style={labelStyle}>
                      {sub.comment || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={labelStyle}>
                      {formatDate(sub.submittedAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sub.downloadUrl && sub.fileName ? (
                        <a
                          href={hemisApi.taskSubmissionFileUrl(sub.fileName)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-[6px] hover:bg-[#eef4ff] transition-colors"
                          title="Yuklab olish"
                        >
                          <Download className="w-4 h-4" style={{ color: "#0e58a8" }} />
                        </a>
                      ) : (
                        <span className="text-xs" style={labelStyle}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-3 flex items-center justify-between shrink-0"
          style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
          <span className="text-xs" style={labelStyle}>
            Jami: {submissions.length} ta topshirilgan
          </span>
          <button onClick={onClose}
            className="px-4 py-2 rounded-[8px] text-sm font-medium"
            style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>
            Yopish
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Bosh sahifa ─────────────────────────────────────────────────── */
export default function FanTopshiriqlariDetailPage() {
  const searchParams = useSearchParams()
  const subject    = searchParams.get("subject")    ?? ""
  const group      = searchParams.get("group")      ?? ""
  const curriculum = searchParams.get("curriculum") ?? ""
  const training   = searchParams.get("training")   ?? ""
  const semester   = searchParams.get("semester")   ?? ""
  const eduYear    = searchParams.get("eduYear")    ?? ""
  const maxBall    = searchParams.get("maxBall")    ?? ""
  const name       = searchParams.get("name")       ?? ""

  const [selectedTask, setSelectedTask] = useState<{ id: string; name: string } | null>(null)

  const params = useMemo(() => {
    const p: Record<string, string> = {}
    if (subject)    p._subject          = subject
    if (group)      p._group            = group
    if (curriculum) p._curriculum       = curriculum
    if (training)   p._training_type    = training
    if (semester)   p._semester         = semester
    if (eduYear)    p._education_year   = eduYear
    return p
  }, [subject, group, curriculum, training, semester, eduYear])

  const { data, loading, error, refetch } = useApi(
    () => hemisApi.employeeData("subject-task-detail", params),
    [subject, group, curriculum, training, semester, eduYear]
  )

  const items = (data?.data as SubjectTaskDetail[] | undefined) ?? []

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  const headerMaxBall = maxBall || String(items.reduce((max, item) => Math.max(max, item.max_ball ?? 0), 0))

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div className="flex items-center gap-2 text-sm" style={labelStyle}>
        <Link href="/dashboard" className="hover:underline">Asosiy</Link>
        <span>/</span>
        <Link href="/xodim/fan-topshiriqlari" className="hover:underline">Fan topshiriqlari</Link>
        {name && (
          <>
            <span>/</span>
            <span style={{ color: "#012970" }}>{name}</span>
          </>
        )}
      </div>

      <div className="rounded-[10px] bg-white"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
        <div className="p-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <h1 className="text-base font-semibold" style={titleStyle}>
            Topshiriqlar ro&apos;yxati (Maks. ball: {headerMaxBall})
          </h1>
          <p className="text-xs mt-0.5" style={labelStyle}>
            Talabalar topshiriqlarini ko&apos;rish uchun &quot;Natijalar&quot; tugmasini bosing
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                {["#", "Nomi", "Savol/Fayl", "Muddat", "Talabalar", "Faol", "Natijalar"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap"
                    style={titleStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item, index) => {
                  const subtitle = [item.taskType?.name, item.max_ball ? `${item.max_ball} ball` : null]
                    .filter(Boolean).join(" / ")
                  const isTest = item.taskType?.code === "12"
                  const taskId = item.id != null ? String(item.id) : null
                  const taskName = item.name || item.comment || `Topshiriq ${index + 1}`
                  return (
                    <tr key={item.id ?? index}
                      className="hover:bg-[#f6f9ff]"
                      style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                      <td className="px-4 py-2.5 text-sm" style={labelStyle}>{index + 1}</td>
                      <td className="px-4 py-2.5 text-sm">
                        <div style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                          {item.name || item.comment || "-"}
                        </div>
                        {subtitle && (
                          <div className="text-xs" style={labelStyle}>{subtitle}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        <span style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                          {isTest ? "0 savol" : `${item.file_count ?? 0} fayl`}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                        {item.deadline_label ?? "-"}
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        <span className="rounded-[4px] bg-[#eef4ff] px-2 py-0.5 text-xs font-medium"
                          style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                          {item.students_label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        <span className="rounded-[4px] px-2 py-0.5 text-xs font-medium whitespace-nowrap"
                          style={{
                            fontFamily: "var(--font-poppins)",
                            color: item.active ? "#15803d" : "#b91c1c",
                            backgroundColor: item.active ? "#f0fdf4" : "#fef2f2",
                          }}>
                          {item.active ? "Faol" : "Nofaol"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {taskId ? (
                          <button
                            onClick={() => setSelectedTask({ id: taskId, name: taskName })}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors hover:bg-[#0e58a8] hover:text-white"
                            style={{
                              border: "1px solid rgba(14,88,168,0.3)",
                              color: "#0e58a8",
                              fontFamily: "var(--font-poppins)",
                            }}
                          >
                            <Users className="w-3.5 h-3.5" />
                            Natijalar
                          </button>
                        ) : (
                          <span className="text-xs" style={labelStyle}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm" style={labelStyle}>
                    Hech narsa topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-3 text-xs" style={labelStyle}>
          <span>1-{items.length} / jami {items.length} ta</span>
        </div>
      </div>

      {selectedTask && (
        <SubmissionsModal
          taskId={selectedTask.id}
          taskName={selectedTask.name}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}
