"use client"

import { useState, useMemo } from "react"
import { Clock, MapPin, Video } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { hemisApi, HemisSchedule, meetingsApi } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import SemesterTabs from "@/components/ui/SemesterTabs"
import { useCurrentSemester } from "@/hooks/useCurrentSemester"

const DAYS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma"]

function toDayName(lessonDate: number): string {
  const idx = new Date(lessonDate * 1000).getDay() // 0=Sun,1=Mon,...
  return DAYS[idx - 1] ?? ""
}

function meetingDayName(startTime?: string): string {
  if (!startTime) return ""
  const idx = new Date(startTime).getDay()
  return DAYS[idx - 1] ?? ""
}

export default function DarsJadvali() {
  const { currentCode, getSemesterId } = useCurrentSemester()
  const [selectedCode, setSelectedCode] = useState<number | null>(null)
  const [activeDay, setActiveDay]       = useState("Dushanba")

  const activeCode = selectedCode ?? currentCode
  const semId = activeCode > 0 ? getSemesterId(activeCode) : undefined

  const { data, loading, error, refetch } = useApi(
    () => hemisApi.schedule(semId ? { _semester: semId } : {}),
    [semId]
  )
  const { data: meetingData } = useApi(() => meetingsApi.getStudentMeetings(), [])
  const raw: HemisSchedule[] = data?.data ?? []
  const meetingItems = useMemo(
    () => [...(meetingData?.data.upcoming ?? []), ...(meetingData?.data.past ?? [])],
    [meetingData]
  )

  const uniqueSchedule = useMemo(() => {
    const seen = new Set<string>()
    return raw.filter((s) => {
      const key = `${toDayName(s.lesson_date)}-${s.subject.id}-${s.lessonPair.name}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [raw])

  const daySchedule = useMemo(() =>
    uniqueSchedule
      .filter((s) => toDayName(s.lesson_date) === activeDay)
      .sort((a, b) => (a.lessonPair.start_time ?? "").localeCompare(b.lessonPair.start_time ?? "")),
    [uniqueSchedule, activeDay]
  )

  const dayMeetings = useMemo(
    () => meetingItems.filter((meeting) => meetingDayName(meeting.startTime) === activeDay),
    [meetingItems, activeDay]
  )

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Dars Jadvali</h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Dars jadvali</p>
        </div>
        <SemesterTabs
          currentCode={currentCode}
          value={activeCode}
          onChange={code => { setSelectedCode(code) }}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {DAYS.map((day) => (
          <button key={day} onClick={() => setActiveDay(day)}
            className="px-5 py-2.5 rounded-[10px] whitespace-nowrap border transition-colors font-medium text-sm"
            style={{
              backgroundColor: activeDay === day ? "#0e58a8" : "#fff",
              color: activeDay === day ? "#fff" : "#7293b9",
              borderColor: activeDay === day ? "rgba(1,41,112,0.3)" : "rgba(1,41,112,0.1)",
              fontFamily: "var(--font-poppins)",
            }}>
            {day}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeDay} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="flex flex-col gap-4">
          {daySchedule.length === 0 && dayMeetings.length === 0 ? (
            <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
              <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Bu kuni dars yo&apos;q</p>
            </div>
          ) : (
            <>
            {daySchedule.map((cls, i) => (
              <motion.div key={`${cls.id}-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-white rounded-[10px] p-5 flex items-start gap-4"
                style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
                <div className="flex flex-col items-center gap-1 shrink-0 w-24">
                  <Clock className="w-4 h-4" style={{ color: "#7293b9" }} />
                  <span className="text-xs font-medium text-center" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {cls.lessonPair.start_time}–{cls.lessonPair.end_time}
                  </span>
                </div>
                <div className="w-px self-stretch" style={{ backgroundColor: "rgba(1,41,112,0.1)" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <h3 className="font-semibold text-base" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {cls.subject.name}
                    </h3>
                    <span className="px-3 py-0.5 rounded-full text-xs font-medium shrink-0"
                      style={{ backgroundColor: "#f0f5ff", color: "#0e58a8" }}>
                      {cls.trainingType.name}
                    </span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{cls.employee.name}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {cls.auditorium && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" style={{ color: "#1cc2dc" }} />
                        <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{cls.auditorium.name}</span>
                      </div>
                    )}
                    <span className="text-xs font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{cls.group.name}</span>
                  </div>
                </div>
              </motion.div>
            ))}
            {dayMeetings.map((meeting, i) => (
              <motion.div key={`meeting-${meeting.id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (daySchedule.length + i) * 0.06 }}
                className="bg-white rounded-[10px] p-5 flex items-start gap-4"
                style={{ border: "1px solid rgba(14,88,168,0.22)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
                <div className="flex flex-col items-center gap-1 shrink-0 w-24">
                  <Video className="w-4 h-4" style={{ color: "#0e58a8" }} />
                  <span className="text-xs font-medium text-center" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {meeting.time}
                  </span>
                </div>
                <div className="w-px self-stretch" style={{ backgroundColor: "rgba(1,41,112,0.1)" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <h3 className="font-semibold text-base" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {meeting.title}
                    </h3>
                    <span className="px-3 py-0.5 rounded-full text-xs font-medium shrink-0"
                      style={{ backgroundColor: "#eef4ff", color: "#0e58a8" }}>
                      Zoom / Meeting
                    </span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {meeting.subject || meeting.host || "Online dars"}
                  </p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-xs font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                      {meeting.duration}
                    </span>
                    <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      Guruhlar: {(meeting.groupIds ?? []).join(", ")}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
