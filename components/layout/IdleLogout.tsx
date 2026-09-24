"use client"

import { useEffect, useRef, useState } from "react"
import { Clock } from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageContext"

/* HEMIS'dagi kabi: 30 daqiqa harakatsiz qolinsa tizimdan chiqariladi va
   qayta kirish talab qilinadi. Chiqishdan 1 daqiqa oldin ogohlantiriladi.
   Oxirgi faollik vaqti localStorage'da — bir nechta tab ochiq bo'lsa,
   birida ishlash hammasini faol saqlaydi. */
const IDLE_MS = 30 * 60 * 1000
const WARN_MS = 60 * 1000
const LAST_ACTIVITY_KEY = "lms_last_activity"
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "touchstart", "scroll"] as const

function readLastActivity(): number | null {
  try {
    const v = Number(localStorage.getItem(LAST_ACTIVITY_KEY))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

function writeLastActivity(time = Date.now()) {
  try { localStorage.setItem(LAST_ACTIVITY_KEY, String(time)) } catch { /* private rejim */ }
}

/** Token qachon berilgan (JWT iat) — yangi login'dan keyin eski faollik vaqti hisobga olinmasin */
function tokenIssuedAt(): number | null {
  try {
    const token = localStorage.getItem("lms_token")
    const payload = token?.split(".")[1]
    if (!payload) return null
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
    return typeof json.iat === "number" ? json.iat * 1000 : null
  } catch {
    return null
  }
}

/** Video/audio o'ynayotgan bo'lsa — talaba dars ko'ryapti, harakatsiz emas */
function isMediaPlaying(): boolean {
  return Array.from(document.querySelectorAll<HTMLMediaElement>("video, audio")).some(m => !m.paused && !m.ended)
}

export function clearSession() {
  for (const key of ["lms_token", "lms_role", "_hemis_sem", "_hemis_sem_v2", LAST_ACTIVITY_KEY]) {
    try { localStorage.removeItem(key) } catch { /* ignore */ }
  }
  for (const key of ["lms_token", "lms_role", "hemis_oauth_state", "hemis_oauth_role", "hemis_oauth_redirect_uri"]) {
    try { sessionStorage.removeItem(key) } catch { /* ignore */ }
  }
}

export function IdleLogout({ paused = false }: {
  /** Online dars yoki imtihon paytida — harakatsizlik hisoblanmaydi */
  paused?: boolean
}) {
  const { t } = useLanguage()
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const loggedOut = useRef(false)

  useEffect(() => {
    function logout() {
      if (loggedOut.current) return
      loggedOut.current = true
      clearSession()
      window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/login?reason=idle`
    }

    // Sahifa ochilganda: oxirgi faollik 30 daqiqadan eski bo'lsa (masalan tab
    // yopilib, keyin qaytib kelinsa) — darhol chiqariladi. Yangi login'dan
    // keyin (token faollikdan keyin berilgan) — yangidan hisoblanadi.
    const last = readLastActivity()
    const issued = tokenIssuedAt()
    if (last && (!issued || issued < last) && Date.now() - last >= IDLE_MS) {
      logout()
      return
    }
    writeLastActivity()

    // Yozuv ko'pi bilan 5 soniyada bir marta — SAQLANGAN vaqtga qarab (tabning
    // o'z hisoblagichiga emas), aks holda boshqa tab yozgan eski vaqt yangilanmay qolardi
    const onActivity = () => {
      const now = Date.now()
      if (now - (readLastActivity() ?? 0) > 5000) writeLastActivity(now)
      setSecondsLeft(null)
    }
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true, capture: true }))

    const timer = window.setInterval(() => {
      if (paused || isMediaPlaying()) {
        writeLastActivity()
        setSecondsLeft(null)
        return
      }
      const idle = Date.now() - (readLastActivity() ?? Date.now())
      if (idle >= IDLE_MS) logout()
      else if (idle >= IDLE_MS - WARN_MS) setSecondsLeft(Math.ceil((IDLE_MS - idle) / 1000))
      else setSecondsLeft(null)
    }, 1000)

    // Boshqa tabda chiqilgan bo'lsa — bu tab ham login sahifasiga
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lms_token" && !e.newValue && !loggedOut.current) {
        loggedOut.current = true
        window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/login`
      }
    }
    window.addEventListener("storage", onStorage)

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, onActivity, { capture: true }))
      window.clearInterval(timer)
      window.removeEventListener("storage", onStorage)
    }
  }, [paused])

  if (secondsLeft === null) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(1,41,112,0.35)" }}>
      <div className="w-full max-w-sm rounded-[14px] bg-white p-6 flex flex-col items-center gap-3 text-center"
        style={{ boxShadow: "0 16px 48px rgba(1,41,112,0.18)" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#fff7ed" }}>
          <Clock className="w-6 h-6" style={{ color: "#c2410c" }} />
        </div>
        <p className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {t("idle.title")}
        </p>
        <p className="text-sm" style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>
          {t("idle.message", { n: secondsLeft })}
        </p>
        <button onClick={() => { writeLastActivity(); setSecondsLeft(null) }}
          className="mt-1 w-full px-4 py-2.5 rounded-[8px] text-sm font-semibold text-white"
          style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          {t("idle.continue")}
        </button>
      </div>
    </div>
  )
}
