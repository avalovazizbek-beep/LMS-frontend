"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AlarmClock } from "lucide-react"
import { meetingsApi, type Meeting } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const WARN_BEFORE_MS = 60 * 1000     // dars boshlanishidan 1 daqiqa oldin
const POLL_INTERVAL_MS = 15 * 1000

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
  const dismissedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (pathname === "/meeting") return

    let cancelled = false

    async function check() {
      try {
        const res = await meetingsApi.getAll()
        if (cancelled) return
        const upcoming = res.data?.upcoming ?? []
        const now = Date.now()

        const candidate = upcoming
          .filter(m => !dismissedRef.current.has(m.id))
          .map(m => ({ m, start: parseTime(m.startTime), end: parseTime(m.endTime) }))
          .filter(({ start, end }) =>
            start !== null && now >= start - WARN_BEFORE_MS && (end === null || now <= end)
          )
          .sort((a, b) => (a.start ?? 0) - (b.start ?? 0))[0]

        setDue(candidate ? candidate.m : null)
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
    if (due) dismissedRef.current.add(due.id)
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
        <button
          onClick={handleJoin}
          className="mt-1 w-full py-3 rounded-[8px] text-sm font-semibold text-white"
          style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}
        >
          {t("meetingReminder.ok")}
        </button>
      </div>
    </div>
  )
}
