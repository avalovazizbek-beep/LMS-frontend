"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ScanFace, X } from "lucide-react"
import { faceApi } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"

// Admin talabalar ro'yxatidan "Face ID eskirgan/noto'g'ri bo'lishi mumkin"
// deb belgilagan talabalarga ko'rsatiladi (faceApi.status().adminRequestedReregister).
// Faqat talabalarga tegishli — imtihon proktoringi shu rol uchun.
export function FaceReregisterModal() {
  const router = useRouter()
  const { t } = useLanguage()
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem("lms_role") !== "student") return
    let cancelled = false
    faceApi.status()
      .then(res => { if (!cancelled && res.adminRequestedReregister) setShow(true) })
      .catch(() => { /* jimgina e'tiborsiz qoldirish — asosiy oqimga ta'sir qilmasin */ })
    return () => { cancelled = true }
  }, [])

  if (!show || dismissed) return null

  return (
    <div
      className="fixed inset-0 z-[5000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(1,41,112,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div className="w-full max-w-md rounded-[14px] bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
            {t("faceId.adminFlagBadge")}
          </span>
          <button
            onClick={() => setDismissed(true)}
            aria-label={t("announcementModal.closeAriaLabel")}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f0f5ff] transition-colors"
          >
            <X className="w-4 h-4" style={{ color: "#7293b9" }} />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          <div className="w-12 h-12 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: "#fff8e6" }}>
            <AlertTriangle className="w-6 h-6" style={{ color: "#f59e0b" }} />
          </div>
          <p className="text-sm leading-6" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {t("faceId.adminFlagMessage")}
          </p>
          <button
            onClick={() => router.push("/face-id/register")}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-[8px] text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}
          >
            <ScanFace className="w-4 h-4" />
            {t("faceId.adminFlagButton")}
          </button>
        </div>
      </div>
    </div>
  )
}
