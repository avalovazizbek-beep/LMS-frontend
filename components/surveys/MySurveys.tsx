"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ClipboardList, Clock, CheckCircle2, ArrowRight, CalendarClock, ShieldCheck, Timer, RefreshCw, AlertCircle, PauseCircle, Lock,
} from "lucide-react"
import { surveysApi, SURVEYS_CHANGED_EVENT, type MySurvey } from "@/lib/api"
import { fmtDateTime, timeLeft, endsSoon } from "./surveyUi"

/* Talaba / o'qituvchi: "Faol so'rovnomalar" kartalari (dashboard bloki va
   So'rovnomalar sahifasi). Qatnashish ixtiyoriy — hech narsa bloklanmaydi. */

function useMySurveys() {
  const [items, setItems] = useState<MySurvey[] | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  function fetchList() {
    return surveysApi.mine()
      .then((res) => { setItems(res.data ?? []); setError("") })
      .catch((e) => setError(e instanceof Error ? e.message : "Yuklab bo'lmadi"))
      .finally(() => setLoading(false))
  }

  /** "Qayta urinish" tugmasi uchun */
  function load() {
    setLoading(true)
    return fetchList()
  }

  useEffect(() => {
    void fetchList()
    const onChange = () => void fetchList()
    window.addEventListener(SURVEYS_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(SURVEYS_CHANGED_EVENT, onChange)
  }, [])

  return { items, error, loading, reload: load }
}

const card: React.CSSProperties = {
  backgroundColor: "var(--lms-cell)",
  border: "1px solid var(--lms-border)",
  boxShadow: "0px 0px 5px rgba(1,41,112,0.08)",
  fontFamily: "var(--font-poppins)",
}

function StatusChip({ s }: { s: MySurvey }) {
  if (s.myStatus === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ backgroundColor: "color-mix(in srgb, #16a34a 12%, transparent)", color: "#16a34a" }}>
        <CheckCircle2 className="h-3.5 w-3.5" /> Qatnashdingiz
      </span>
    )
  }
  if (s.state === "paused") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ backgroundColor: "color-mix(in srgb, #d97706 12%, transparent)", color: "#d97706" }}>
        <PauseCircle className="h-3.5 w-3.5" /> Vaqtincha to&apos;xtatilgan
      </span>
    )
  }
  if (s.state !== "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ backgroundColor: "var(--lms-soft)", color: "var(--lms-muted)" }}>
        <Lock className="h-3.5 w-3.5" /> Yopilgan
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ backgroundColor: "color-mix(in srgb, var(--lms-button) 12%, transparent)", color: "var(--lms-button)" }}>
      <Clock className="h-3.5 w-3.5" /> Javob kutilmoqda
    </span>
  )
}

export function SurveyCard({ s, compact = false }: { s: MySurvey; compact?: boolean }) {
  const open = s.state === "active" && s.myStatus === "pending"
  const soon = open && endsSoon(s.endAt)
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl p-4 sm:p-5" style={{
      ...card,
      borderColor: open ? "color-mix(in srgb, var(--lms-button) 35%, var(--lms-border))" : "var(--lms-border)",
    }}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip s={s} />
        <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: "var(--lms-soft)", color: "var(--lms-muted)" }}>
          {s.surveyTypeLabel}
        </span>
        {s.isAnonymous && (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: "var(--lms-soft)", color: "var(--lms-muted)" }}
            title="Javoblaringiz ismingizsiz saqlanadi">
            <ShieldCheck className="h-3.5 w-3.5" /> Anonim
          </span>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="break-words text-[15px] font-semibold leading-snug" style={{ color: "var(--lms-primary)" }}>{s.title}</h3>
        {!compact && s.description && (
          <p className="mt-1 line-clamp-2 text-sm" style={{ color: "var(--lms-muted)" }}>{s.description}</p>
        )}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs" style={{ color: "var(--lms-muted)" }}>
        <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> {fmtDateTime(s.endAt)} gacha</span>
        {open && (
          <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: soon ? "#e11d48" : "var(--lms-primary)" }}>
            <Clock className="h-3.5 w-3.5" /> {timeLeft(s.endAt)}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" /> ~{s.estimatedMinutes} daqiqa · {s.questionCount} savol</span>
      </div>
      {open ? (
        <Link href={`/sorovnomalar/${s.id}`}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--lms-button)" }}>
          Qatnashish <ArrowRight className="h-4 w-4" />
        </Link>
      ) : s.myStatus === "completed" ? (
        <p className="mt-1 text-xs" style={{ color: "var(--lms-muted)" }}>Javob berilgan: {fmtDateTime(s.completedAt)}</p>
      ) : null}
    </div>
  )
}

/** Dashboard bloki: faqat ochiq so'rovnomalar bo'lsa ko'rinadi */
export function ActiveSurveysBlock() {
  const { items } = useMySurveys()
  const live = (items ?? []).filter((s) => s.state === "active")
  if (!live.length) return null
  const pending = live.filter((s) => s.myStatus === "pending")
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="rounded-[10px] p-5" style={{ ...card, borderTop: "4px solid var(--lms-button)" }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--lms-soft)" }}>
            <ClipboardList className="h-5 w-5" style={{ color: "var(--lms-button)" }} />
          </span>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--lms-primary)" }}>Faol so&apos;rovnomalar</h2>
            <p className="text-xs" style={{ color: "var(--lms-muted)" }}>
              {pending.length
                ? `${pending.length} ta so'rovnomada fikringiz kutilmoqda — qatnashish ixtiyoriy`
                : "Barcha faol so'rovnomalarda qatnashdingiz. Rahmat!"}
            </p>
          </div>
        </div>
        <Link href="/sorovnomalar" className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--lms-button)" }}>
          Barchasi <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...pending, ...live.filter((s) => s.myStatus === "completed")].slice(0, 3).map((s) => (
          <SurveyCard key={s.id} s={s} compact />
        ))}
      </div>
    </motion.section>
  )
}

/** So'rovnomalar sahifasi: ochiqlari va tarix */
export function MySurveysList() {
  const { items, error, loading, reload } = useMySurveys()
  const [tab, setTab] = useState<"open" | "history">("open")

  if (loading && !items) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl" style={{ backgroundColor: "var(--lms-soft)" }} />
        ))}
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl p-10 text-center" style={card}>
        <AlertCircle className="h-8 w-8" style={{ color: "#e11d48" }} />
        <p className="text-sm" style={{ color: "var(--lms-primary)" }}>{error}</p>
        <button onClick={() => void reload()} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: "var(--lms-button)" }}>
          <RefreshCw className="h-4 w-4" /> Qayta urinish
        </button>
      </div>
    )
  }

  const all = items ?? []
  const open = all.filter((s) => s.state === "active" || s.state === "paused").filter((s) => s.myStatus === "pending")
  const history = all.filter((s) => !open.includes(s))
  const list = tab === "open" ? open : history

  return (
    <div className="flex flex-col gap-5" style={{ fontFamily: "var(--font-poppins)" }}>
      <div className="flex flex-wrap gap-2">
        {([["open", `Javob kutilmoqda (${open.length})`], ["history", `Qatnashganlarim va yopilganlar (${history.length})`]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: tab === key ? "var(--lms-button)" : "var(--lms-cell)",
              color: tab === key ? "#fff" : "var(--lms-primary)",
              border: "1px solid var(--lms-border)",
            }}>
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={card}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "var(--lms-soft)" }}>
            <ClipboardList className="h-8 w-8" style={{ color: "var(--lms-accent)" }} />
          </div>
          <p className="text-base font-medium" style={{ color: "var(--lms-primary)" }}>
            {tab === "open" ? "Hozircha javob kutilayotgan so'rovnoma yo'q" : "Hali hech qaysi so'rovnomada qatnashmagansiz"}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: "var(--lms-muted)" }}>
            Yangi so&apos;rovnoma e&apos;lon qilinganda bildirishnoma keladi va shu yerda ko&apos;rinadi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => <SurveyCard key={s.id} s={s} />)}
        </div>
      )}
    </div>
  )
}
