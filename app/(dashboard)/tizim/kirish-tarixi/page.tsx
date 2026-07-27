"use client"

import { Clock } from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageContext"

export default function KirishTarixi() {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {t("kirishTarixi.title")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("kirishTarixi.subtitle")}
        </p>
      </div>

      <div className="bg-white rounded-[10px] p-10 text-center"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
        <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
        <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {t("kirishTarixi.notFound")}
        </p>
        <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("kirishTarixi.comingSoon")}
        </p>
      </div>
    </div>
  )
}
