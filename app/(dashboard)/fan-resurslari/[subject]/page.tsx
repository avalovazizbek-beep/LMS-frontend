"use client"

import { useMemo } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { FileText, Video, Link2, Download, BookOpen, ArrowLeft } from "lucide-react"
import { hemisApi, HemisResource, HemisResourceItem, hemisDownloadUrl } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

type ResType = "pdf" | "video" | "link" | "other"
type ResourceGroup = "lecture" | "presentation" | "laboratory" | "video_lesson" | "meeting_video" | "other"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

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

function detectGroup(resource: HemisResource, item: HemisResourceItem): ResourceGroup {
  const code = `${resource.trainingType?.code ?? ""} ${item.resourceType?.code ?? ""}`.toLowerCase()
  const name = `${resource.trainingType?.name ?? ""} ${item.resourceType?.name ?? ""} ${resource.title ?? ""}`.toLowerCase()
  if (code.includes("meeting_video") || name.includes("meeting")) return "meeting_video"
  if (code.includes("video_lesson") || name.includes("video dars")) return "video_lesson"
  if (code.includes("laboratory") || name.includes("laborator")) return "laboratory"
  if (code.includes("presentation") || name.includes("taqdimot") || name.includes("prezent")) return "presentation"
  if (code.includes("lecture") || name.includes("ma'ruza") || name.includes("maruza")) return "lecture"
  if (detectItemType(item) === "video") return "video_lesson"
  return "other"
}

function formatSize(size?: number | string): string {
  if (size == null) return ""
  const n = Number(size)
  if (isNaN(n)) return ""
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

function formatDate(ts?: number): string {
  if (!ts) return ""
  return new Date(ts * 1000).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const typeConfig: Record<ResType, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>, bg: string, color: string, label: string }> = {
  pdf:   { icon: FileText, bg: "#fff0f0", color: "#ef4444", label: "Fayl"   },
  video: { icon: Video,    bg: "#f0f5ff", color: "#0e58a8", label: "Video"  },
  link:  { icon: Link2,    bg: "#f0fbfd", color: "#1cc2dc", label: "Havola" },
  other: { icon: FileText, bg: "#f6f9ff", color: "#7293b9", label: "Boshqa" },
}

interface FlatItem {
  key: string
  resourceTitle: string
  trainingType: string
  employee: string
  item: HemisResourceItem
  type: ResType
  group: ResourceGroup
}

const groupConfig: Array<{ key: ResourceGroup; label: string }> = [
  { key: "lecture", label: "Ma'ruzalar" },
  { key: "presentation", label: "Taqdimotlar" },
  { key: "laboratory", label: "Laboratoriyalar" },
  { key: "video_lesson", label: "Video darslar" },
  { key: "meeting_video", label: "Meeting videolar" },
  { key: "other", label: "Boshqa resurslar" },
]

function resourceHref(type: ResType, href?: string, filename?: string) {
  if (!href) return "#"
  if (href.startsWith("/uploads/")) return `${API_BASE}${href}`
  if (type === "link") return href
  return hemisDownloadUrl(href, filename)
}

export default function FanResurslariDetail() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const router       = useRouter()

  const subjectName = decodeURIComponent(String(params.subject ?? ""))
  const semId       = searchParams.get("semester") ?? undefined

  const { data, loading, error, refetch } = useApi(
    () => hemisApi.resources(semId ? { _semester: semId } : {}),
    [semId]
  )

  const flatItems = useMemo((): FlatItem[] => {
    const result: FlatItem[] = []
    ;(data?.data ?? [] as HemisResource[]).forEach((r: HemisResource) => {
      if ((r.subject?.name ?? "") !== subjectName) return
      const resourceTitle = r.title && r.title !== "." ? r.title : subjectName
      ;(r.subjectFileResourceItems ?? []).forEach((item: HemisResourceItem) => {
        result.push({
          key: String(item.id),
          resourceTitle,
          trainingType: r.trainingType?.name ?? "",
          employee: r.employee?.name ?? "",
          item,
          type: detectItemType(item),
          group: detectGroup(r, item),
        })
      })
    })
    return result
  }, [data, subjectName])

  const groupedItems = useMemo(() => {
    const map: Record<ResourceGroup, FlatItem[]> = {
      lecture: [],
      presentation: [],
      laboratory: [],
      video_lesson: [],
      meeting_video: [],
      other: [],
    }
    flatItems.forEach((item) => map[item.group].push(item))
    return map
  }, [flatItems])

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
          <h1
            className="text-[24px] font-semibold leading-snug"
            style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
          >
            {subjectName}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {flatItems.length} ta o&apos;quv materiali
          </p>
        </div>
      </div>

      {/* Resource grid */}
      {flatItems.length === 0 ? (
        <div className="bg-white rounded-[10px] p-14 text-center"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
          <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Resurslar topilmadi
          </p>
          <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Bu fan uchun hozircha o&apos;quv materiallari yuklanmagan
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groupConfig.map((group) => {
            const items = groupedItems[group.key]
            if (!items.length) return null
            return (
              <section key={group.key} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    {group.label}
                  </h2>
                  <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-xs font-semibold text-[#0e58a8]">
                    {items.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(f => {
            const cfg   = typeConfig[f.type]
            const Icon  = cfg.icon
            const files = f.item.files ?? []
            const href  = files[0]?.url || (f.item.url || undefined)
            const size  = formatSize(files[0]?.size)
            const date  = formatDate(f.item.updated_at)
            return (
              <div
                key={f.key}
                className="bg-white rounded-[10px] p-4 flex flex-col gap-3"
                style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}
              >
                {/* Top row */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: cfg.bg }}
                  >
                    <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2"
                      style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {files[0]?.name ?? f.resourceTitle}
                    </p>
                    <span
                      className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: cfg.bg, color: cfg.color, fontFamily: "var(--font-poppins)" }}
                    >
                      {(f.item.resourceType?.name ?? f.trainingType) || cfg.label}
                    </span>
                  </div>
                </div>

                {/* Meta */}
                {(size || date || f.employee) && (
                  <div className="flex items-center justify-between text-xs"
                    style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    <span>{[size, date].filter(Boolean).join(" · ")}</span>
                    {f.employee && (
                      <span className="truncate ml-2 max-w-[130px]">{f.employee}</span>
                    )}
                  </div>
                )}

                {f.type === "video" && href && (
                  <video
                    controls
                    preload="metadata"
                    className="aspect-video w-full rounded-[8px] bg-[#012970]"
                    src={resourceHref(f.type, href, files[0]?.name)}
                  />
                )}

                {/* Action */}
                <a
                  href={resourceHref(f.type, href, files[0]?.name)}
                  {...(f.type === "link"
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : { download: true })}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[5px] text-sm font-medium transition-opacity hover:opacity-90 mt-auto"
                  style={{
                    backgroundColor: href ? "#0e58a8" : "#c8d8e8",
                    color: "#fff",
                    fontFamily: "var(--font-poppins)",
                    pointerEvents: href ? "auto" : "none",
                  }}
                >
                  <Download className="w-4 h-4" />
                  {f.type === "link" ? "Ochish" : "Yuklab olish"}
                </a>
              </div>
            )
          })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
