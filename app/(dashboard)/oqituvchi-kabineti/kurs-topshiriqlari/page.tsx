"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Plus, Trash2, Pencil, Download, Power } from "lucide-react"
import { teachingApi, type TeacherContent, type TeachingSubmission } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

function formatDateTime(iso: string | null): string {
  if (!iso) return "-"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function KursTopshiriqlariDetailPage() {
  const searchParams = useSearchParams()
  const groupId = searchParams.get("group") ?? ""
  const groupNames = searchParams.get("groupNames") ?? ""
  const trainingName = searchParams.get("trainingName") ?? ""
  const semester = searchParams.get("semester") ?? ""
  const name = searchParams.get("name") ?? ""
  const maxBall = searchParams.get("maxBall") ?? ""

  const semesterLabel = useMemo(() => {
    const code = Number(semester)
    return Number.isFinite(code) && code >= 11 && code <= 20 ? `${code - 10}-semestr` : ""
  }, [semester])

  const breadcrumbDetails = [trainingName, semesterLabel, groupNames].filter(Boolean).join(" | ")

  const { data, loading, error, refetch } = useApi(
    () => teachingApi.content({ type: "kurs-topshiriq", group: groupId || undefined, subject: name || undefined }),
    [groupId, name]
  )

  const items: TeacherContent[] = data?.data ?? []

  const [submissionCounts, setSubmissionCounts] = useState<Record<number, { total: number; graded: number }>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all(
      items.map(async (item) => {
        try {
          const res = await teachingApi.submissions(item.id)
          const list: TeachingSubmission[] = res.data ?? []
          return [item.id, { total: list.length, graded: list.filter((s) => s.grade != null).length }] as const
        } catch {
          return [item.id, { total: 0, graded: 0 }] as const
        }
      })
    ).then((entries) => {
      if (!cancelled) setSubmissionCounts(Object.fromEntries(entries))
    })
    return () => { cancelled = true }
  }, [items])

  const createHref = `/oqituvchi-kabineti/kurs-topshiriqlari/yangi?${searchParams.toString()}`

  function editHref(id: number) {
    const q = new URLSearchParams(searchParams.toString())
    q.set("id", String(id))
    return `/oqituvchi-kabineti/kurs-topshiriqlari/yangi?${q.toString()}`
  }

  async function handleDelete(id: number) {
    if (!confirm("Ushbu topshiriqni o'chirishni tasdiqlaysizmi?")) return
    try {
      await teachingApi.removeContent(id)
      await refetch()
    } catch (err) {
      alert(err instanceof Error ? err.message : "O'chirishda xatolik")
    }
  }

  async function handleToggleActive(id: number) {
    try {
      await teachingApi.toggleContent(id)
      await refetch()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Holatni almashtirishda xatolik")
    }
  }

  if (loading) return <Loading />
  if (error) return <ApiError message={error} onRetry={refetch} />

  const headerMaxBall = items.length
    ? String(items.reduce((max, item) => Math.max(max, item.maxScore ?? 0), 0))
    : (maxBall || "100")

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div className="flex items-center gap-2 text-sm flex-wrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
        <Link href="/dashboard" className="hover:underline">Asosiy</Link>
        <span>/</span>
        <Link href="/oqituvchi-kabineti/kurs-topshiriqlar" className="hover:underline">Kurs topshiriqlari</Link>
        {name && (
          <>
            <span>/</span>
            <span style={{ color: "#012970" }}>
              {name}{breadcrumbDetails ? ` (${breadcrumbDetails})` : ""}
            </span>
          </>
        )}
      </div>

      <div className="rounded-[10px] bg-white" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
        <div className="flex items-center justify-between gap-3 p-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <h1 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Topshiriqlar ro&apos;yxati(Maks. ball: {headerMaxBall})
          </h1>
          <Link
            href={createHref}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-sm font-medium"
            style={{ backgroundColor: "#16a34a", color: "#fff", fontFamily: "var(--font-poppins)" }}
          >
            <Plus className="w-4 h-4" />
            Yaratish
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>#</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Nomi</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Savol/Fayl</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Muddat</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Yangi talaba</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Talabalar</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Faol</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item, index) => {
                  const counts = submissionCounts[item.id]
                  const fileCount = item.files?.length ?? (item.docFile || item.videoFile ? 1 : 0)
                  return (
                    <tr key={item.id} className="hover:bg-[#f6f9ff]" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                      <td className="px-4 py-2.5 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{index + 1}</td>
                      <td className="px-4 py-2.5 text-sm">
                        <div style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>{item.title}</div>
                        {item.maxScore != null && (
                          <div className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{item.maxScore} ball</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        {item.docFile ? (
                          <a
                            href={teachingApi.fileUrl(item.docFile.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5"
                            style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}
                          >
                            <Download className="w-3.5 h-3.5" />
                            {fileCount} fayl
                          </a>
                        ) : (
                          <span style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{fileCount} fayl</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                        {formatDateTime(item.deadline)}
                      </td>
                      <td className="px-4 py-2.5 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>-</td>
                      <td className="px-4 py-2.5 text-sm">
                        <span className="rounded-[4px] bg-[#eef4ff] px-2 py-0.5 text-xs font-medium" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                          {counts ? `${counts.graded}/${counts.total}` : "0/0"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(item.id)}
                            className="rounded-[4px] px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors"
                            style={{
                              fontFamily: "var(--font-poppins)",
                              color: item.isActive ? "#15803d" : "#b91c1c",
                              backgroundColor: item.isActive ? "#f0fdf4" : "#fef2f2",
                            }}
                            title={item.isActive ? "Nofaol qilish" : "Faollashtirish"}
                          >
                            <Power className="w-3 h-3 inline -mt-0.5 mr-1" />
                            {item.isActive ? "Faol" : "Nofaol"}
                          </button>
                          <Link href={editHref(item.id)} className="p-1 rounded-[4px] hover:bg-[#f0f5ff]" title="Tahrirlash">
                            <Pencil className="w-3.5 h-3.5" style={{ color: "#445b7a" }} />
                          </Link>
                          <button onClick={() => handleDelete(item.id)} className="p-1 rounded-[4px] hover:bg-[#fef2f2]" title="O'chirish">
                            <Trash2 className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    Hech narsa topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-3 text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          <span>1-{items.length} / jami {items.length} ta</span>
        </div>
      </div>
    </div>
  )
}
