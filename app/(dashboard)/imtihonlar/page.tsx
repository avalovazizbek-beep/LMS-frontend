"use client"

import { useState } from "react"
import { Calendar, Clock, MapPin, CheckCircle2, AlertCircle, BookOpen } from "lucide-react"
import { motion } from "framer-motion"
import { hemisApi, HemisExam } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import SemesterTabs from "@/components/ui/SemesterTabs"
import { useCurrentSemester } from "@/hooks/useCurrentSemester"

function formatExamDate(ts?: number): string {
  if (!ts) return "—"
  return new Date(ts * 1000).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function isUpcoming(ts?: number): boolean {
  if (!ts) return true
  return ts * 1000 > Date.now()
}

export default function Imtihonlar() {
  const { currentCode, getSemesterId } = useCurrentSemester()
  const [selectedCode, setSelectedCode] = useState<number | null>(null)

  const activeCode = selectedCode ?? currentCode
  const semId = activeCode > 0 ? getSemesterId(activeCode) : undefined

  const { data, loading, error, refetch } = useApi(
    () => hemisApi.exams(semId ? { _semester: semId } : {}),
    [semId]
  )
  const exams: HemisExam[] = data?.data ?? []

  const upcoming = exams.filter((e) => isUpcoming(e.examDate))
  const done     = exams.filter((e) => !isUpcoming(e.examDate))

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Imtihonlar</h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Imtihon jadvali va natijalari</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SemesterTabs currentCode={currentCode} value={activeCode} onChange={code => setSelectedCode(code)} />
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: "Jami imtihonlar",  value: exams.length,    color: "#012970" },
          { label: "Kutilmoqda",       value: upcoming.length, color: "#f59e0b" },
          { label: "Yakunlangan",      value: done.length,     color: "#22c55e" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white rounded-[10px] p-5 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="text-3xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
            <div className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {upcoming.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-[10px]" style={{ backgroundColor: "#f0f5ff", border: "1px solid rgba(14,88,168,0.3)" }}>
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#0e58a8" }} />
          <p className="text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Yaqinlashayotgan imtihonlar: <strong>{upcoming.length} ta</strong>
          </p>
        </div>
      )}

      {/* Upcoming */}
      <div>
        <h2 className="text-lg font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Kelgusi imtihonlar</h2>
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-[10px] p-8 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Kelgusi imtihonlar yo&apos;q</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((e, i) => (
              <motion.div key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-3">
                    <h3 className="font-semibold text-base leading-snug" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {e.subject.name}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {e.examType.name}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold shrink-0"
                    style={{ backgroundColor: "#fff8e6", color: "#f59e0b", border: "1px solid #f59e0b" }}>
                    Kutilmoqda
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "#1cc2dc" }} />
                    <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {formatExamDate(e.examDate)}
                    </span>
                  </div>
                  {e.lessonPair && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: "#1cc2dc" }} />
                      <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        {e.lessonPair.start_time} – {e.lessonPair.end_time}
                      </span>
                    </div>
                  )}
                  {e.auditorium && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "#1cc2dc" }} />
                      <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        {e.auditorium.name}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: "#1cc2dc" }} />
                    <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {e.employee.name}
                    </span>
                  </div>
                  {e.group && (
                    <span className="text-xs font-semibold mt-1" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                      {e.group.name}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Done */}
      {done.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>O&apos;tgan imtihonlar</h2>
          <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            {done.map((e, i) => (
              <motion.div key={e.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: i < done.length - 1 ? "1px solid rgba(1,41,112,0.06)" : undefined }}>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#22c55e" }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {e.subject.name}
                    </p>
                    <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {formatExamDate(e.examDate)} · {e.examType.name}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: "#f0fbfd", color: "#1cc2dc", border: "1px solid #1cc2dc" }}>
                  Yakunlandi
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {exams.length === 0 && (
        <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
          <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Imtihonlar mavjud emas
          </p>
          <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Joriy semestrda imtihon jadvali hali tuzilmagan
          </p>
        </div>
      )}
    </div>
  )
}
