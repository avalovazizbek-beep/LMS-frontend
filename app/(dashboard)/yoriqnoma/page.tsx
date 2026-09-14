"use client"

import { FileText, Download } from "lucide-react"
import { announcementsApi } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { useLanguage } from "@/lib/i18n/LanguageContext"

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "long", year: "numeric" })
  } catch {
    return iso
  }
}

export default function YoriqnomaPage() {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useApi(() => announcementsApi.guide())
  const items = data?.data ?? []

  if (loading) return <Loading />
  if (error) return <ApiError message={error} onRetry={refetch} />

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      <header className="pt-[25px] pb-5 px-5 bg-white" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h1 className="font-medium text-[28px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {t("yoriqnoma.title")}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("yoriqnoma.subtitle")}
        </p>
      </header>

      <div className="p-[30px] flex flex-col gap-5">
        {items.length === 0 && (
          <div className="bg-white rounded-[10px] p-8 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {t("yoriqnoma.empty")}
            </p>
          </div>
        )}

        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            {item.file?.mediaKind === "video" && (
              <video
                controls
                playsInline
                controlsList="nodownload"
                preload="metadata"
                className="w-full bg-black"
                style={{ maxHeight: "480px" }}
                src={announcementsApi.fileUrl(item.id)}
              />
            )}
            {item.file?.mediaKind === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={announcementsApi.fileUrl(item.id)} alt={item.title ?? ""} className="w-full object-contain" style={{ maxHeight: "480px" }} />
            )}
            {item.file?.mediaKind === "file" && (
              <a
                href={announcementsApi.fileUrl(item.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 mx-5 mt-5 p-4 rounded-[10px] hover:shadow-md transition-shadow"
                style={{ border: "1px solid rgba(1,41,112,0.1)" }}
              >
                <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#eef4ff" }}>
                  <FileText className="w-5 h-5" style={{ color: "#0e58a8" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    {item.file.originalName}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {formatSize(item.file.size)}
                  </div>
                </div>
                <Download className="w-4 h-4 shrink-0" style={{ color: "#7293b9" }} />
              </a>
            )}

            {(item.title || item.message) && (
              <div className="px-5 py-4 flex flex-col gap-2">
                {item.title && (
                  <h2 className="text-lg font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    {item.title}
                  </h2>
                )}
                {item.message && (
                  <p className="text-sm whitespace-pre-wrap" style={{ color: "#516a8f", fontFamily: "var(--font-poppins)" }}>
                    {item.message}
                  </p>
                )}
                <span className="text-xs" style={{ color: "#a3b6cf", fontFamily: "var(--font-poppins)" }}>
                  {formatDate(item.createdAt)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
