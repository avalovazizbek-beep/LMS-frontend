"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ClipboardList, CheckCircle2, ShieldCheck, CalendarClock, Timer, AlertCircle, RefreshCw, ArrowLeft, Lock, PauseCircle, Clock,
} from "lucide-react"
import { surveysApi, SURVEYS_CHANGED_EVENT, type SurveyForm } from "@/lib/api"
import { PageHero } from "@/components/layout/PageHero"
import { SurveyFill } from "@/components/surveys/SurveyFill"
import { fmtDateTime, timeLeft } from "@/components/surveys/surveyUi"

const card: React.CSSProperties = {
  backgroundColor: "var(--lms-cell)",
  border: "1px solid var(--lms-border)",
  boxShadow: "0px 0px 5px rgba(1,41,112,0.08)",
  fontFamily: "var(--font-poppins)",
}

function Message({ icon: Icon, color, title, text }: { icon: React.ElementType; color: string; title: string; text?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-2xl p-10 text-center" style={card}>
      <span className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}>
        <Icon className="h-8 w-8" style={{ color }} />
      </span>
      <p className="text-lg font-semibold" style={{ color: "var(--lms-primary)" }}>{title}</p>
      {text && <p className="max-w-md text-sm" style={{ color: "var(--lms-muted)" }}>{text}</p>}
      <Link href="/sorovnomalar" className="mt-2 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: "var(--lms-button)" }}>
        <ArrowLeft className="h-4 w-4" /> So&apos;rovnomalarga qaytish
      </Link>
    </motion.div>
  )
}

export default function SurveyFillPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = Number(params?.id)
  const validId = Number.isInteger(id) && id > 0
  const [form, setForm] = useState<SurveyForm | null>(null)
  const [fetchError, setFetchError] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [done, setDone] = useState(false)
  const error = validId ? fetchError : "So'rovnoma topilmadi"
  const loading = validId && !loaded

  function fetchForm() {
    return surveysApi.form(id)
      .then((res) => { setForm(res.data); setFetchError("") })
      .catch((e) => setFetchError(e instanceof Error ? e.message : "So'rovnoma topilmadi"))
      .finally(() => setLoaded(true))
  }

  function load() {
    setLoaded(false)
    void fetchForm()
  }

  useEffect(() => {
    if (validId) void fetchForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function submit(answers: Parameters<typeof surveysApi.submit>[1]) {
    await surveysApi.submit(id, answers)
    setDone(true)
    window.dispatchEvent(new Event(SURVEYS_CHANGED_EVENT))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="flex w-full flex-col gap-5 p-4 sm:p-[30px]">
      <PageHero icon={ClipboardList} title={form?.title ?? "So'rovnoma"} subtitle={form?.surveyTypeLabel}
        onBack={() => router.push("/sorovnomalar")} />
      {/* Forma o'qish uchun qulay kenglikda (sarlavha — to'liq kenglikda) */}
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">

      {loading ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl" style={{ backgroundColor: "var(--lms-soft)" }} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl p-10 text-center" style={card}>
          <AlertCircle className="h-8 w-8" style={{ color: "#e11d48" }} />
          <p className="text-sm" style={{ color: "var(--lms-primary)" }}>{error}</p>
          <div className="flex gap-2">
            <button onClick={load} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium" style={{ border: "1px solid var(--lms-border)", color: "var(--lms-primary)" }}>
              <RefreshCw className="h-4 w-4" /> Qayta urinish
            </button>
            <Link href="/sorovnomalar" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: "var(--lms-button)" }}>
              So&apos;rovnomalar
            </Link>
          </div>
        </div>
      ) : done ? (
        <Message icon={CheckCircle2} color="#16a34a" title="Javobingiz qabul qilindi. Rahmat!"
          text={form?.isAnonymous ? "Javoblaringiz anonim saqlandi — ular ismingizga bog'lanmaydi." : "Fikringiz ta'lim sifatini yaxshilashga yordam beradi."} />
      ) : form && form.myStatus === "completed" ? (
        <Message icon={CheckCircle2} color="#16a34a" title="Siz bu so'rovnomada qatnashgansiz"
          text={`Javob berilgan: ${fmtDateTime(form.completedAt)}. Har bir so'rovnomaga bir marta javob beriladi.`} />
      ) : form && form.state === "paused" ? (
        <Message icon={PauseCircle} color="#d97706" title="So'rovnoma vaqtincha to'xtatilgan" text="Qayta ochilganda bildirishnoma keladi." />
      ) : form && form.state !== "active" ? (
        <Message icon={Lock} color="#7293b9" title="So'rovnoma yopilgan" text={`Muddat ${fmtDateTime(form.endAt)} da tugagan.`} />
      ) : form ? (
        <>
          <div className="rounded-2xl p-4 sm:p-5" style={card}>
            {form.description && (
              <p className="mb-3 whitespace-pre-wrap break-words text-sm leading-relaxed" style={{ color: "var(--lms-primary)" }}>{form.description}</p>
            )}
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs" style={{ color: "var(--lms-muted)" }}>
              <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> {fmtDateTime(form.endAt)} gacha</span>
              <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: "var(--lms-primary)" }}><Clock className="h-3.5 w-3.5" /> {timeLeft(form.endAt)}</span>
              <span className="inline-flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" /> Taxminan {form.estimatedMinutes} daqiqa · {form.questions.length} savol</span>
              {form.isAnonymous && (
                <span className="inline-flex items-center gap-1.5" style={{ color: "#16a34a" }}>
                  <ShieldCheck className="h-3.5 w-3.5" /> Anonim: javoblaringiz ismingizsiz saqlanadi
                </span>
              )}
            </div>
            <p className="mt-3 text-xs" style={{ color: "var(--lms-muted)" }}>
              <span style={{ color: "#e11d48" }}>*</span> — majburiy savol. Qatnashish ixtiyoriy, lekin yuborilgan javobni o&apos;zgartirib bo&apos;lmaydi.
            </p>
          </div>
          <SurveyFill questions={form.questions} onSubmit={submit} />
        </>
      ) : null}
      </div>
    </div>
  )
}
