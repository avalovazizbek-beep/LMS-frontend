"use client"

import { SearchX, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n/LanguageContext"

export default function RootNotFound() {
  const { t } = useLanguage()
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-[30px]"
      style={{ backgroundColor: "#f6f9ff" }}
    >
      <div
        className="bg-white rounded-[15px] p-12 flex flex-col items-center text-center max-w-md w-full"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 30px rgba(1,41,112,0.08)" }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: "#f0f5ff" }}
        >
          <SearchX className="w-10 h-10" style={{ color: "#0e58a8" }} />
        </div>

        <p
          className="text-6xl font-bold mb-3"
          style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}
        >
          404
        </p>

        <h2
          className="text-2xl font-semibold mb-2"
          style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
        >
          {t("notFound.title")}
        </h2>
        <p
          className="text-sm leading-relaxed mb-8"
          style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}
        >
          {t("notFound.desc")}
        </p>

        <div className="w-full h-px mb-8" style={{ backgroundColor: "rgba(1,41,112,0.08)" }} />

        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-6 py-2.5 rounded-[8px] text-white text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t("notFound.backHome")}
        </Link>
      </div>
    </div>
  )
}
