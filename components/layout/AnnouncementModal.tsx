"use client"

import { useEffect, useState } from "react"
import { X, ChevronLeft, ChevronRight, FileText, Download } from "lucide-react"
import { announcementsApi, type Announcement } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AnnouncementModal() {
  const { t } = useLanguage()
  const [items, setItems] = useState<Announcement[]>([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    announcementsApi.mine()
      .then(res => { if (!cancelled) setItems(res.data ?? []) })
      .catch(() => { /* jimgina e'tiborsiz qoldirish — bu login popup, asosiy oqimga ta'sir qilmasin */ })
    return () => { cancelled = true }
  }, [])

  if (items.length === 0) return null

  const current = items[index]
  const hasMultiple = items.length > 1

  function handleClose() {
    const ids = items.map(a => a.id)
    setItems([])
    announcementsApi.dismiss(ids).catch(() => {})
  }

  return (
    <div
      className="fixed inset-0 z-[5000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(1,41,112,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div className="w-full max-w-lg rounded-[14px] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <div className="text-xs font-medium" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {hasMultiple ? t("announcementModal.counter", { current: index + 1, total: items.length }) : ""}
          </div>
          <button
            onClick={handleClose}
            aria-label={t("announcementModal.closeAriaLabel")}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f0f5ff] transition-colors"
          >
            <X className="w-4 h-4" style={{ color: "#7293b9" }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {current.file?.mediaKind === "video" && (
            <video
              key={current.id}
              controls
              playsInline
              controlsList="nodownload"
              preload="metadata"
              className="w-full bg-black"
              style={{ maxHeight: "50vh" }}
              src={announcementsApi.fileUrl(current.id)}
            />
          )}
          {current.file?.mediaKind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={current.id} src={announcementsApi.fileUrl(current.id)} alt={current.title ?? ""} className="w-full object-contain" style={{ maxHeight: "50vh" }} />
          )}
          {current.file?.mediaKind === "file" && (
            <a
              href={announcementsApi.fileUrl(current.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 mx-5 mt-4 p-4 rounded-[10px] hover:shadow-md transition-shadow"
              style={{ border: "1px solid rgba(1,41,112,0.1)" }}
            >
              <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#eef4ff" }}>
                <FileText className="w-5 h-5" style={{ color: "#0e58a8" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {current.file.originalName}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {formatSize(current.file.size)}
                </div>
              </div>
              <Download className="w-4 h-4 shrink-0" style={{ color: "#7293b9" }} />
            </a>
          )}

          {(current.title || current.message) && (
            <div className="px-5 py-4 flex flex-col gap-2">
              {current.title && (
                <h2 className="text-lg font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {current.title}
                </h2>
              )}
              {current.message && (
                <p className="text-sm whitespace-pre-wrap" style={{ color: "#516a8f", fontFamily: "var(--font-poppins)" }}>
                  {current.message}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-5 py-3 shrink-0" style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
          {hasMultiple && (
            <>
              <button
                onClick={() => setIndex(i => Math.max(0, i - 1))}
                disabled={index === 0}
                aria-label={t("announcementModal.prevAriaLabel")}
                className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-[#f0f5ff] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" style={{ color: "#012970" }} />
              </button>
              <button
                onClick={() => setIndex(i => Math.min(items.length - 1, i + 1))}
                disabled={index === items.length - 1}
                aria-label={t("announcementModal.nextAriaLabel")}
                className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-[#f0f5ff] transition-colors"
              >
                <ChevronRight className="w-4 h-4" style={{ color: "#012970" }} />
              </button>
            </>
          )}
          <button
            onClick={handleClose}
            className="ml-auto px-5 py-2.5 rounded-[8px] text-sm font-semibold text-white"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}
          >
            {t("announcementModal.closeBtn")}
          </button>
        </div>
      </div>
    </div>
  )
}
