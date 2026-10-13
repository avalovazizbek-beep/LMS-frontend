"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AlarmClock } from "lucide-react"
import { meetingsApi, type Meeting } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const WARN_BEFORE_MS = 60 * 1000        // dars boshlanishidan 1 daqiqa oldin
const SHOW_WINDOW_MS = 20 * 60 * 1000   // dars boshlangandan keyin 20 daqiqagacha
const MAX_SHOWS_PER_MEETING = 2         // har bir dars uchun ko'pi bilan shuncha marta
const REMIND_AGAIN_MS = 5 * 60 * 1000   // "Keyinroq" bosilsa — ikkinchi eslatma 5 daqiqadan keyin
const POLL_INTERVAL_MS = 15 * 1000
const STORAGE_KEY = "lms_meeting_reminders"
const LOG_TTL_MS = 24 * 60 * 60 * 1000

/* Har bir dars necha marta ko'rsatilgani. Avval faqat komponent ichida
   saqlanardi va /meeting sahifasiga o'tib qaytganda yoki sahifa
   yangilanganda nolga tushib, eslatma qayta-qayta chiqaverardi. Brauzer
   xotirasi ishlamasa (yashirin rejim) modul darajasidagi nusxa SPA
   ichida baribir saqlanib turadi. */
type ReminderLog = Record<string, { shows: number; lastAt: number }>
let memoryLog: ReminderLog = {}

function loadLog(): ReminderLog {
  let stored: ReminderLog = {}
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")
    if (parsed && typeof parsed === "object") stored = parsed
  } catch { /* xotira yo'q — memoryLog bilan davom etamiz */ }
  // Boshqa tab yozgan yangiroq yozuv ham hisobga olinadi
  const merged: ReminderLog = { ...stored }
  for (const [id, entry] of Object.entries(memoryLog)) {
    if (!merged[id] || merged[id].lastAt < entry.lastAt) merged[id] = entry
  }
  memoryLog = merged
  return merged
}

function saveLog(log: ReminderLog) {
  const cutoff = Date.now() - LOG_TTL_MS
  for (const id of Object.keys(log)) if (log[id].lastAt < cutoff) delete log[id]
  memoryLog = log
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(log)) } catch { /* ignore */ }
}

function parseTime(value?: string): number | null {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}

export function MeetingReminder() {
  const { t } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const [due, setDue] = useState<Meeting | null>(null)
  const dueRef = useRef<Meeting | null>(null)
  useEffect(() => { dueRef.current = due }, [due])

  useEffect(() => {
    if (pathname === "/meeting") return

    let cancelled = false

    async function check() {
      if (dueRef.current) return   // biri ko'rsatilib turibdi — almashtirmaymiz
      try {
        const res = await meetingsApi.getAll()
        if (cancelled) return
        const upcoming = res.data?.upcoming ?? []
        const now = Date.now()
        const log = loadLog()

        const candidate = upcoming
          .map(m => ({ m, start: parseTime(m.startTime) }))
          .filter(({ m, start }) => {
            if (start === null || now < start - WARN_BEFORE_MS || now > start + SHOW_WINDOW_MS) return false
            const entry = log[m.id]
            return !entry || (entry.shows < MAX_SHOWS_PER_MEETING && now - entry.lastAt >= REMIND_AGAIN_MS)
          })
          .sort((a, b) => (a.start ?? 0) - (b.start ?? 0))[0]

        if (!candidate || dueRef.current) return
        const id = candidate.m.id
        saveLog({ ...log, [id]: { shows: (log[id]?.shows ?? 0) + 1, lastAt: now } })
        setDue(candidate.m)
      } catch {
        /* jimgina e'tiborsiz qoldirish — bu faqat eslatma, asosiy oqimga ta'sir qilmasin */
      }
    }

    check()
    const id = window.setInterval(check, POLL_INTERVAL_MS)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [pathname])

  if (!due) return null

  function handleJoin() {
    if (!due) return
    // Darsga kirdi — shu dars uchun boshqa eslatilmaydi
    const log = loadLog()
    saveLog({ ...log, [due.id]: { shows: MAX_SHOWS_PER_MEETING, lastAt: Date.now() } })
    setDue(null)
    router.push("/meeting")
  }

  return (
    <div
      className="fixed inset-0 z-[5000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(1,41,112,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div className="w-full max-w-md rounded-[14px] bg-white p-7 flex flex-col items-center text-center gap-4 shadow-2xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "#fff7ed" }}>
          <AlarmClock className="h-8 w-8" style={{ color: "#ea580c" }} />
        </div>
        <h2 className="text-lg font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {t("meetingReminder.title")}
        </h2>
        <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("meetingReminder.body", { title: due.title })}
        </p>
        <div className="mt-1 w-full flex flex-col gap-2">
          <button
            onClick={handleJoin}
            className="w-full py-3 rounded-[8px] text-sm font-semibold text-white"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}
          >
            {t("meetingReminder.ok")}
          </button>
          <button
            onClick={() => setDue(null)}
            className="w-full py-2.5 rounded-[8px] text-sm font-medium transition-colors hover:bg-[#f6f9ff]"
            style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}
          >
            {t("meetingReminder.later")}
          </button>
        </div>
      </div>
    </div>
  )
}
