"use client"

import { useState } from "react"
import { ExternalLink, Video } from "lucide-react"
import type { ZoomMeetingInfo } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { formatZoomMeetingId, launchZoom } from "@/lib/zoomLaunch"

const ZOOM_BLUE = "#0B5CFF"

/** Meeting bilan birga yaratilgan Zoom uchrashuvi — talaba "Qo'shilish"ni
 *  bossa kompyuterda Zoom desktop, telefonda Zoom mobil ilovasi ochiladi
 *  (lib/zoomLaunch.ts). Ilova ochilmasa — brauzer orqali kirish havolasi
 *  va qo'lda kiritish uchun ID/kod ko'rinib turadi.
 *  `compact` — haftalik jadval katagi uchun faqat kichik tugma. */
export function ZoomJoinCard({ zoom, compact = false }: { zoom: ZoomMeetingInfo; compact?: boolean }) {
  const { t } = useLanguage()
  const [tried, setTried] = useState(false)
  const joinUrl = zoom.joinUrl
  if (zoom.status !== "created" || !joinUrl) return null

  function join() {
    setTried(true)
    launchZoom(joinUrl!, zoom.meetingId)
  }

  if (compact) {
    return (
      <button type="button" onClick={join}
        className="mt-1 flex w-full items-center justify-center gap-1 rounded-[5px] px-1.5 py-1 text-[10px] font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: ZOOM_BLUE, fontFamily: "var(--font-poppins)" }}>
        <Video className="h-3 w-3 shrink-0" />
        <span className="truncate">Zoom · {t("darsJadvali.zoom.join")}</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-[8px] p-3"
      style={{ backgroundColor: "#f0f5ff", border: "1px solid rgba(11,92,255,0.2)" }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px]" style={{ backgroundColor: ZOOM_BLUE }}>
            <Video className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {t("darsJadvali.zoom.title")}
            </div>
            {(zoom.meetingId || zoom.password) && (
              <div className="text-[11px]" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {zoom.meetingId && <>ID: <span className="font-medium" style={{ color: "#445b7a" }}>{formatZoomMeetingId(zoom.meetingId)}</span></>}
                {zoom.meetingId && zoom.password && " · "}
                {zoom.password && <>{t("darsJadvali.zoom.passcode")}: <span className="font-medium" style={{ color: "#445b7a" }}>{zoom.password}</span></>}
              </div>
            )}
          </div>
        </div>
        <button type="button" onClick={join}
          className="flex items-center gap-1.5 rounded-[6px] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: ZOOM_BLUE, fontFamily: "var(--font-poppins)" }}>
          <Video className="h-3.5 w-3.5" />
          {t("darsJadvali.zoom.join")}
        </button>
      </div>
      {tried && (
        <p className="text-[11px]" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("darsJadvali.zoom.notOpened")}{" "}
          <a href={joinUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-0.5 font-medium underline underline-offset-2" style={{ color: ZOOM_BLUE }}>
            {t("darsJadvali.zoom.openInBrowser")} <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      )}
    </div>
  )
}
