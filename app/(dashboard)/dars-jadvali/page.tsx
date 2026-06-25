"use client"

import { useMemo, useState } from "react"
import { Clock, BookOpen, Link as LinkIcon, CalendarDays, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { meetingsApi, hemisApi, teachingApi, type HemisSchedule, type Meeting, type TeacherContent } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const DAYS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"]
const DAY_SHORT = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"]
const UZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"]

function shortWeekDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")} ${UZ_MONTHS[d.getMonth()]}`
}

function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

type DayItem =
  | { kind: "hemis"; data: HemisSchedule; time: Date }
  | { kind: "meeting"; data: Meeting; time: Date }
  | { kind: "nazorat"; data: TeacherContent; time: Date }

export default function DarsJadvali() {
  const today = new Date()
  const [weekOffset, setWeekOffset] = useState(0)
  const [showWeekPicker, setShowWeekPicker] = useState(false)
  const [activeDay, setActiveDay] = useState(() => {
    const d = today.getDay()
    return d === 0 ? 6 : d - 1
  })

  const weekStart = useMemo(() => {
    const mon = getMonday(today)
    mon.setDate(mon.getDate() + weekOffset * 7)
    return mon
  }, [weekOffset]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: scheduleData, loading: scheduleLoading, error: scheduleError, refetch: scheduleRefetch } = useApi(
    () => hemisApi.schedule({}),
    []
  )
  const hemisSchedule: HemisSchedule[] = scheduleData?.data ?? []

  const { data: meetData } = useApi(() => meetingsApi.getStudentMeetings(), [])
  const allMeetings: Meeting[] = [
    ...(meetData?.data.upcoming ?? []),
    ...(meetData?.data.past ?? []),
  ]

  const { data: nazoratData } = useApi(() => teachingApi.content({ type: "exam" }), [])
  const nazoratItems: TeacherContent[] = (nazoratData?.data ?? []).filter(e =>
    !e.topicKey && (e.controlType === "oraliq" || e.controlType === "yakuniy") && !!e.availableFrom
  )

  const weekDates = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    }), [weekStart]
  )

  const byDay = useMemo(() => {
    const map: Record<number, DayItem[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }

    hemisSchedule.forEach(item => {
      const lessonDate = new Date(item.lesson_date * 1000)
      const [hour, min] = (item.lessonPair?.start_time ?? "00:00").split(":").map(Number)
      const t = new Date(lessonDate.getFullYear(), lessonDate.getMonth(), lessonDate.getDate(), hour, min, 0)
      const idx = lessonDate.getDay() === 0 ? 6 : lessonDate.getDay() - 1
      map[idx].push({ kind: "hemis", data: item, time: t })
    })

    allMeetings.forEach(meeting => {
      const iso = meeting.startTime ?? meeting.date
      if (!iso) return
      const d = new Date(iso)
      if (isNaN(d.getTime())) return
      const idx = d.getDay() === 0 ? 6 : d.getDay() - 1
      map[idx].push({ kind: "meeting", data: meeting, time: d })
    })

    nazoratItems.forEach(exam => {
      const d = new Date(exam.availableFrom!)
      if (isNaN(d.getTime())) return
      const idx = d.getDay() === 0 ? 6 : d.getDay() - 1
      map[idx].push({ kind: "nazorat", data: exam, time: d })
    })

    Object.values(map).forEach(arr => arr.sort((a, b) => a.time.getTime() - b.time.getTime()))
    return map
  }, [hemisSchedule, allMeetings, nazoratItems])

  const activeLessons = useMemo(() => {
    const dayDate = weekDates[activeDay]
    return (byDay[activeDay] ?? []).filter(item => {
      const d = item.time
      return d.getFullYear() === dayDate.getFullYear() &&
             d.getMonth() === dayDate.getMonth() &&
             d.getDate() === dayDate.getDate()
    })
  }, [byDay, activeDay, weekDates])

  const weekLabel = useMemo(() => {
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    return `${shortWeekDate(weekStart)} / ${shortWeekDate(end)}`
  }, [weekStart])

  const weekNumber = useMemo(() => isoWeekNumber(weekStart), [weekStart])

  const weekOptions = useMemo(() => {
    const todayMonday = getMonday(today)
    return Array.from({ length: 21 }, (_, i) => i - 10).map(offset => {
      const start = new Date(todayMonday)
      start.setDate(start.getDate() + offset * 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return {
        offset,
        number: isoWeekNumber(start),
        label: `${shortWeekDate(start)} / ${shortWeekDate(end)}`,
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (scheduleLoading) return <Loading />
  if (scheduleError)   return <ApiError message={scheduleError} onRetry={scheduleRefetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Dars Jadvali
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            HEMIS jadvaliga ko&apos;ra darslar va onlayn uchrashuvlar
          </p>
        </div>

        {/* Hafta navigatsiyasi */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="px-3 py-2 rounded-[8px] text-sm font-medium border transition-colors hover:bg-[#f0f5ff]"
            style={{ borderColor: "rgba(1,41,112,0.15)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}
          >
            ‹ Oldingi
          </button>

          <div className="relative">
            <button
              onClick={() => setShowWeekPicker(v => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-[8px] text-sm font-medium border transition-colors hover:bg-[#f0f5ff]"
              style={{ borderColor: "rgba(14,88,168,0.25)", color: "#012970", fontFamily: "var(--font-poppins)" }}
            >
              <span className="font-semibold" style={{ color: "#0e58a8" }}>{weekNumber}.</span>
              {weekLabel}
              <ChevronDown className="w-4 h-4" style={{ color: "#7293b9" }} />
            </button>

            <AnimatePresence>
              {showWeekPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowWeekPicker(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-2 z-20 rounded-[10px] bg-white overflow-hidden"
                    style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 4px 16px rgba(1,41,112,0.12)", minWidth: 220 }}
                  >
                    <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "#7293b9", borderBottom: "1px solid rgba(1,41,112,0.06)", fontFamily: "var(--font-poppins)" }}>
                      Haftani tanlang
                    </div>
                    <div className="max-h-[260px] overflow-y-auto">
                      {weekOptions.map(opt => {
                        const isSelected = opt.offset === weekOffset
                        return (
                          <button
                            key={opt.offset}
                            onClick={() => { setWeekOffset(opt.offset); setShowWeekPicker(false) }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left transition-colors hover:bg-[#f0f5ff]"
                            style={{
                              backgroundColor: isSelected ? "#eef4ff" : "transparent",
                              color: isSelected ? "#0e58a8" : "#012970",
                              fontWeight: isSelected ? 600 : 400,
                              fontFamily: "var(--font-poppins)",
                            }}
                          >
                            <span className="w-7 shrink-0 text-right">{opt.number}.</span>
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="px-3 py-2 rounded-[8px] text-sm font-medium border transition-colors hover:bg-[#f0f5ff]"
            style={{ borderColor: "rgba(1,41,112,0.15)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}
          >
            Keyingi ›
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-2 rounded-[8px] text-xs font-medium"
              style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}
            >
              Bugun
            </button>
          )}
        </div>
      </div>

      {/* Kun tablar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {DAYS.map((day, idx) => {
          const date = weekDates[idx]
          const isToday =
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
          const count = (byDay[idx] ?? []).filter(item => {
            const d = item.time
            return d.getFullYear() === date.getFullYear() &&
                   d.getMonth() === date.getMonth() &&
                   d.getDate() === date.getDate()
          }).length
          const isActive = activeDay === idx

          return (
            <button key={day} onClick={() => setActiveDay(idx)}
              className="flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-[10px] min-w-[72px] transition-colors border font-medium text-sm relative"
              style={{
                backgroundColor: isActive ? "#0e58a8" : isToday ? "#f0f5ff" : "#fff",
                color: isActive ? "#fff" : isToday ? "#0e58a8" : "#7293b9",
                borderColor: isActive ? "rgba(1,41,112,0.3)" : isToday ? "rgba(14,88,168,0.3)" : "rgba(1,41,112,0.1)",
                fontFamily: "var(--font-poppins)",
              }}>
              <span className="text-xs opacity-70">{DAY_SHORT[idx]}</span>
              <span className="text-base font-semibold leading-tight">{date.getDate()}</span>
              {count > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5"
                  style={{
                    backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "#eef4ff",
                    color: isActive ? "#fff" : "#0e58a8",
                  }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Darslar ro'yxati */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeDay}-${weekOffset}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-4"
        >
          {activeLessons.length === 0 ? (
            <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
              <BookOpen className="w-8 h-8 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
              <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Bu kuni rejalashtirilgan dars yo&apos;q
              </p>
            </div>
          ) : (
            activeLessons.map((entry, i) => {
              if (entry.kind === "meeting") {
                const m = entry.data
                const isUpcoming = m.status === "upcoming"
                return (
                  <motion.div
                    key={`meeting-${m.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="bg-white rounded-[10px] p-5 flex items-start gap-4"
                    style={{ border: "1px solid rgba(14,88,168,0.2)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}
                  >
                    <div className="flex flex-col items-center gap-1 shrink-0 w-20 pt-0.5">
                      <Clock className="w-4 h-4" style={{ color: "#7293b9" }} />
                      <span className="text-xs font-semibold text-center" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                        {m.time}
                      </span>
                      {m.endTime && (
                        <span className="text-[10px] text-center" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                          – {fmt(m.endTime)}
                        </span>
                      )}
                    </div>

                    <div className="w-px self-stretch" style={{ backgroundColor: "rgba(1,41,112,0.08)" }} />

                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-base leading-snug" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                            {m.title}
                          </h3>
                          {m.subjectName && (
                            <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                              {m.subjectName}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: "#ecfeff", color: "#0891b2", fontFamily: "var(--font-poppins)" }}>
                            <CalendarDays className="w-3 h-3" /> Online dars
                          </span>
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                            style={{
                              backgroundColor: isUpcoming ? "#f0fdf4" : "#f1f5f9",
                              color: isUpcoming ? "#15803d" : "#64748b",
                              fontFamily: "var(--font-poppins)",
                            }}>
                            {isUpcoming ? "Kutilmoqda" : "Tugagan"}
                          </span>
                        </div>
                      </div>

                      {isUpcoming && m.link && m.link !== "#" && (
                        <a
                          href={m.link.startsWith("http") ? m.link : `https://${m.link}`}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[6px] w-fit"
                          style={{ backgroundColor: "#ecfeff", color: "#0891b2", fontFamily: "var(--font-poppins)" }}>
                          <LinkIcon className="w-3.5 h-3.5" />
                          Darsga kirish
                        </a>
                      )}
                    </div>
                  </motion.div>
                )
              }

              // Oraliq / Yakuniy nazorat (LMS)
              if (entry.kind === "nazorat") {
                const exam = entry.data
                const isYakuniy = exam.controlType === "yakuniy"
                const timeStr = entry.time.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
                const STATUS: Record<string, string> = { open: "Ochiq", locked: "Qulflangan", closed: "Yakunlangan" }
                return (
                  <motion.div
                    key={`nazorat-${exam.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="bg-white rounded-[10px] p-5 flex items-start gap-4"
                    style={{ border: `1px solid ${isYakuniy ? "rgba(185,28,28,0.2)" : "rgba(14,88,168,0.2)"}`, boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}
                  >
                    <div className="flex flex-col items-center gap-1 shrink-0 w-20 pt-0.5">
                      <Clock className="w-4 h-4" style={{ color: "#7293b9" }} />
                      <span className="text-xs font-semibold text-center" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                        {timeStr}
                      </span>
                    </div>
                    <div className="w-px self-stretch" style={{ backgroundColor: "rgba(1,41,112,0.08)" }} />
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-base leading-snug" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                            {exam.title}
                          </h3>
                          {exam.subjectName && (
                            <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                              {exam.subjectName}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                            style={{
                              backgroundColor: isYakuniy ? "#fef2f2" : "#eef4ff",
                              color: isYakuniy ? "#b91c1c" : "#0e58a8",
                              fontFamily: "var(--font-poppins)",
                            }}>
                            {isYakuniy ? "Yakuniy imtihon" : "Oraliq nazorat"}
                          </span>
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                            style={{
                              backgroundColor: exam.status === "open" ? "#f0fdf4" : "#f1f5f9",
                              color: exam.status === "open" ? "#15803d" : "#64748b",
                              fontFamily: "var(--font-poppins)",
                            }}>
                            {STATUS[exam.status] ?? exam.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              }

              // HEMIS jadval darsi
              const s = entry.data
              const startTime = s.lessonPair?.start_time ?? "—"
              const endTime = s.lessonPair?.end_time
              return (
                <motion.div
                  key={`hemis-${s.id}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-white rounded-[10px] p-5 flex items-start gap-4"
                  style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}
                >
                  <div className="flex flex-col items-center gap-1 shrink-0 w-20 pt-0.5">
                    <Clock className="w-4 h-4" style={{ color: "#7293b9" }} />
                    <span className="text-xs font-semibold text-center" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {startTime}
                    </span>
                    {endTime && (
                      <span className="text-[10px] text-center" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        – {endTime}
                      </span>
                    )}
                  </div>

                  <div className="w-px self-stretch" style={{ backgroundColor: "rgba(1,41,112,0.08)" }} />

                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="font-semibold text-base leading-snug" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                          {s.subject.name}
                        </h3>
                        <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                          {s.employee.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {s.trainingType && (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                            {s.trainingType.name}
                          </span>
                        )}
                        {s.auditorium && (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                            {s.auditorium.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
