"use client"

import { useEffect, useState } from "react"
import { RefreshCw, GraduationCap, CheckCircle2, XCircle, Clock } from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { reeduApi } from "@/lib/api"

type MyEnrollment = Awaited<ReturnType<typeof reeduApi.me>>["data"][number]

export default function QaytaOqish() {
  const { t } = useLanguage()
  const [enrollments, setEnrollments] = useState<MyEnrollment[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    reeduApi.me().then(res => setEnrollments(res.data)).finally(() => setLoading(false))
  }, [])

  const statusConfig: Record<string, { label: string; bg: string; color: string; icon: typeof Clock }> = {
    active:    { label: t("qaytaOqish.statusActive"),    bg: "#fff8e6", color: "#f59e0b", icon: Clock },
    completed: { label: t("qaytaOqish.statusCompleted"), bg: "#f0fdf4", color: "#22c55e", icon: CheckCircle2 },
    failed:    { label: t("qaytaOqish.statusFailed"),    bg: "#fff0f0", color: "#ef4444", icon: XCircle },
  }

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t("qaytaOqish.title")}</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("qaytaOqish.pageSubtitle")}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} />
        </div>
      ) : !enrollments || enrollments.length === 0 ? (
        <div className="bg-white rounded-[10px] p-14 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#f0fff4" }}>
            <GraduationCap className="w-8 h-8" style={{ color: "#22c55e" }} />
          </div>
          <p className="text-base font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {t("qaytaOqish.notEnrolled")}
          </p>
          <p className="text-sm mt-2 max-w-sm mx-auto" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("qaytaOqish.notEnrolledHint")}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          {enrollments.map((e) => {
            const st = statusConfig[e.status]
            const Icon = st.icon
            return (
              <div key={e.id} className="flex items-center justify-between px-5 py-4 flex-wrap gap-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 shrink-0" style={{ color: st.color }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{e.subjectName}</p>
                    <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {e.groupName}{e.teacherFullName ? ` · ${e.teacherFullName}` : ""} · {t("qaytaOqish.debtScore", { score: e.debtorTotalPoint ?? "—" })}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: st.bg, color: st.color }}>
                  {st.label}{e.finalScore !== null ? ` · ${e.finalScore}` : ""}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
