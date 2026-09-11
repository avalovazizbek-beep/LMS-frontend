"use client"

import { useEffect, useState } from "react"
import { Calendar, RefreshCw } from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { reeduApi } from "@/lib/api"

const WEEK_DAYS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"]

type MyEnrollment = Awaited<ReturnType<typeof reeduApi.me>>["data"][number]

export default function QaytaOqishNazorat() {
  const { t } = useLanguage()
  const [enrollments, setEnrollments] = useState<MyEnrollment[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    reeduApi.me().then(res => setEnrollments(res.data)).finally(() => setLoading(false))
  }, [])

  const hasSchedule = enrollments?.some(e => e.schedule.length > 0)

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {t("qaytaOqishNazorat.title")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("qaytaOqishNazorat.subtitle")}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} />
        </div>
      ) : !hasSchedule ? (
        <div className="bg-white rounded-[10px] p-14 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#f0fbfd" }}>
            <Calendar className="w-8 h-8" style={{ color: "#1cc2dc" }} />
          </div>
          <p className="text-base font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {t("qaytaOqishNazorat.notFound")}
          </p>
          <p className="text-sm mt-2 max-w-sm mx-auto" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("qaytaOqishNazorat.notFoundDesc")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {enrollments!.filter(e => e.schedule.length > 0).map(e => (
            <div key={e.id} className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                <h2 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{e.subjectName}</h2>
                <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{e.groupName}{e.teacherFullName ? ` · ${e.teacherFullName}` : ""}</p>
              </div>
              {e.schedule.map(s => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                  <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{WEEK_DAYS[s.weekDay - 1] ?? s.weekDay}</span>
                  <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.startTime} — {s.endTime}</span>
                  <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.room || "—"}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
