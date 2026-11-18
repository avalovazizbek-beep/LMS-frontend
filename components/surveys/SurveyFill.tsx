"use client"

import { useMemo, useRef, useState } from "react"
import { Star, CheckCircle2, AlertCircle, RefreshCw, Send, Check } from "lucide-react"
import type { StoredSurveyQuestion, SurveyAnswerValue } from "@/lib/api"

/* So'rovnomani to'ldirish formasi — talaba/o'qituvchi sahifasi va admin
   "Oldindan ko'rish" oynasi uchun umumiy. Ranglar --lms-* tokenlarida
   (qorong'i rejim o'zi moslashadi). */

type Answers = Record<number, SurveyAnswerValue>

const OTHER = -1

function isAnswered(q: StoredSurveyQuestion, a: SurveyAnswerValue | undefined): boolean {
  if (!a) return false
  if (q.type === "single" || q.type === "multiple") return (a.optionIds?.length ?? 0) > 0 || !!a.text?.trim()
  if (q.type === "text") return !!a.text?.trim()
  return a.value !== undefined && a.value !== null
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--lms-cell)",
  border: "1px solid var(--lms-border)",
  boxShadow: "0 1px 2px rgba(1,41,112,0.04)",
}

function ChoiceRow({ checked, multiple, label, onSelect, name }: {
  checked: boolean; multiple: boolean; label: string; onSelect: () => void; name: string
}) {
  return (
    <label
      className="flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition-colors"
      style={{
        border: `1px solid ${checked ? "var(--lms-button)" : "var(--lms-border)"}`,
        backgroundColor: checked ? "color-mix(in srgb, var(--lms-button) 8%, var(--lms-cell))" : "var(--lms-cell)",
        color: "var(--lms-primary)",
      }}>
      <input type={multiple ? "checkbox" : "radio"} name={name} checked={checked} onChange={onSelect}
        className="sr-only" />
      <span aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center ${multiple ? "rounded-md" : "rounded-full"}`}
        style={{
          border: `2px solid ${checked ? "var(--lms-button)" : "var(--lms-muted)"}`,
          backgroundColor: checked ? "var(--lms-button)" : "transparent",
        }}>
        {checked && (multiple ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : <span className="h-2 w-2 rounded-full bg-white" />)}
      </span>
      <span className="min-w-0 break-words">{label}</span>
    </label>
  )
}

function QuestionInput({ q, value, onChange, disabled }: {
  q: StoredSurveyQuestion
  value: SurveyAnswerValue | undefined
  onChange: (v: SurveyAnswerValue) => void
  disabled: boolean
}) {
  const [hoverStar, setHoverStar] = useState(0)
  const name = `q-${q.id}`

  if (q.type === "single" || q.type === "multiple") {
    const multiple = q.type === "multiple"
    const picked = new Set(value?.optionIds ?? [])
    const otherOn = value?.text !== undefined
    const toggle = (id: number) => {
      if (disabled) return
      if (multiple) {
        if (id === OTHER) {
          onChange({ optionIds: [...picked], text: otherOn ? undefined : "" })
          return
        }
        const next = new Set(picked)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        onChange({ optionIds: [...next], text: value?.text })
      } else {
        onChange(id === OTHER ? { optionIds: [], text: value?.text ?? "" } : { optionIds: [id] })
      }
    }
    return (
      <div className="flex flex-col gap-2" role={multiple ? "group" : "radiogroup"}>
        {q.options.map((o) => (
          <ChoiceRow key={o.id} name={name} multiple={multiple} label={o.text} checked={picked.has(o.id)} onSelect={() => toggle(o.id)} />
        ))}
        {q.allowOther && (
          <>
            <ChoiceRow name={name} multiple={multiple} label="Boshqa (o'zim yozaman)" checked={otherOn} onSelect={() => toggle(OTHER)} />
            {otherOn && (
              <input autoFocus value={value?.text ?? ""} maxLength={5000} disabled={disabled}
                onChange={(e) => onChange({ optionIds: multiple ? [...picked] : [], text: e.target.value })}
                placeholder="Javobingizni yozing"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                style={{ border: "1px solid var(--lms-border)", backgroundColor: "var(--lms-cell)", color: "var(--lms-primary)" }} />
            )}
          </>
        )}
      </div>
    )
  }

  if (q.type === "text") {
    const text = value?.text ?? ""
    return (
      <div>
        <textarea value={text} maxLength={5000} rows={4} disabled={disabled}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Javobingizni shu yerga yozing"
          className="w-full resize-y rounded-xl px-3.5 py-3 text-sm outline-none"
          style={{ border: "1px solid var(--lms-border)", backgroundColor: "var(--lms-cell)", color: "var(--lms-primary)" }} />
        <div className="mt-1 text-right text-[11px]" style={{ color: "var(--lms-muted)" }}>{text.length} / 5000</div>
      </div>
    )
  }

  if (q.type === "yesno") {
    return (
      <div className="grid grid-cols-2 gap-3 sm:max-w-sm" role="radiogroup">
        {[{ v: 1, label: "Ha" }, { v: 0, label: "Yo'q" }].map(({ v, label }) => {
          const on = value?.value === v
          return (
            <button key={v} type="button" role="radio" aria-checked={on} disabled={disabled}
              onClick={() => onChange({ value: v })}
              className="rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
              style={{
                border: `1px solid ${on ? "var(--lms-button)" : "var(--lms-border)"}`,
                backgroundColor: on ? "var(--lms-button)" : "var(--lms-cell)",
                color: on ? "#fff" : "var(--lms-primary)",
              }}>
              {label}
            </button>
          )
        })}
      </div>
    )
  }

  if (q.type === "rating") {
    const current = value?.value ?? 0
    const shown = hoverStar || current
    return (
      <div className="flex items-center gap-1.5" role="radiogroup" onMouseLeave={() => setHoverStar(0)}>
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} type="button" role="radio" aria-checked={current === v} aria-label={`${v} yulduz`} disabled={disabled}
            onMouseEnter={() => setHoverStar(v)} onFocus={() => setHoverStar(v)} onBlur={() => setHoverStar(0)}
            onClick={() => onChange({ value: v })}
            className="rounded-lg p-1 transition-transform hover:scale-110">
            <Star className="h-8 w-8" strokeWidth={1.6}
              style={{ color: v <= shown ? "#f59e0b" : "var(--lms-muted)", fill: v <= shown ? "#f59e0b" : "transparent" }} />
          </button>
        ))}
        {current > 0 && <span className="ml-2 text-sm font-medium" style={{ color: "var(--lms-muted)" }}>{current} / 5</span>}
      </div>
    )
  }

  // scale
  const max = q.scaleMax ?? 5
  const values = Array.from({ length: max }, (_, i) => i + 1)
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {values.map((v) => {
          const on = value?.value === v
          return (
            <button key={v} type="button" role="radio" aria-checked={on} disabled={disabled}
              onClick={() => onChange({ value: v })}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold transition-colors"
              style={{
                border: `1px solid ${on ? "var(--lms-button)" : "var(--lms-border)"}`,
                backgroundColor: on ? "var(--lms-button)" : "var(--lms-cell)",
                color: on ? "#fff" : "var(--lms-primary)",
                fontVariantNumeric: "tabular-nums",
              }}>
              {v}
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px]" style={{ color: "var(--lms-muted)", maxWidth: max * 52 }}>
        <span>Juda past</span>
        <span>Juda yuqori</span>
      </div>
    </div>
  )
}

export function SurveyFill({ questions, onSubmit, preview = false }: {
  questions: StoredSurveyQuestion[]
  /** Berilmasa — faqat ko'rish (admin oldindan ko'rishi) */
  onSubmit?: (answers: Answers) => Promise<void>
  preview?: boolean
}) {
  const [answers, setAnswers] = useState<Answers>({})
  const [missing, setMissing] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const refs = useRef<Record<number, HTMLElement | null>>({})

  const requiredIds = useMemo(() => questions.filter((q) => q.required).map((q) => q.id), [questions])
  const answeredCount = questions.filter((q) => isAnswered(q, answers[q.id])).length
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0

  function setAnswer(id: number, v: SurveyAnswerValue) {
    setAnswers((prev) => ({ ...prev, [id]: v }))
    if (missing.has(id)) setMissing((prev) => { const next = new Set(prev); next.delete(id); return next })
  }

  async function submit() {
    setError("")
    const lack = requiredIds.filter((id) => !isAnswered(questions.find((q) => q.id === id)!, answers[id]))
    if (lack.length) {
      setMissing(new Set(lack))
      setError(`${lack.length} ta majburiy savolga javob berilmagan`)
      refs.current[lack[0]]?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    if (!onSubmit) return
    // Bo'sh "Boshqa" maydoni yuborilmaydi
    const clean: Answers = {}
    for (const q of questions) {
      const a = answers[q.id]
      if (!a || !isAnswered(q, a)) continue
      clean[q.id] = { ...a, ...(a.text !== undefined ? { text: a.text.trim() || undefined } : {}) }
    }
    setBusy(true)
    try {
      await onSubmit(clean)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yuborib bo'lmadi — qayta urinib ko'ring")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4" style={{ fontFamily: "var(--font-poppins)" }}>
      {/* Jarayon */}
      <div className="sticky top-0 z-10 rounded-2xl px-4 py-3" style={{ ...cardStyle, backdropFilter: "blur(6px)" }}>
        <div className="flex items-center justify-between text-xs font-medium" style={{ color: "var(--lms-muted)" }}>
          <span>Javob berildi: <b style={{ color: "var(--lms-primary)" }}>{answeredCount}</b> / {questions.length}</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{progress}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--lms-soft)" }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: "var(--lms-button)" }} />
        </div>
      </div>

      {questions.map((q, i) => {
        const isMissing = missing.has(q.id)
        return (
          <fieldset key={q.id} ref={(el) => { refs.current[q.id] = el }}
            className="rounded-2xl p-4 sm:p-5"
            style={{ ...cardStyle, borderColor: isMissing ? "#e11d48" : "var(--lms-border)" }}>
            <legend className="sr-only">{`${i + 1}-savol`}</legend>
            <div className="mb-3.5 flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                style={{ backgroundColor: "var(--lms-soft)", color: "var(--lms-button)" }}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words text-[15px] font-medium leading-snug" style={{ color: "var(--lms-primary)" }}>
                  {q.text}
                  {q.required && <span className="ml-1" style={{ color: "#e11d48" }} aria-label="majburiy">*</span>}
                </p>
                {q.type === "multiple" && <p className="mt-0.5 text-xs" style={{ color: "var(--lms-muted)" }}>Bir nechta javob belgilash mumkin</p>}
              </div>
            </div>
            <QuestionInput q={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} disabled={busy} />
            {isMissing && (
              <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium" style={{ color: "#e11d48" }}>
                <AlertCircle className="h-3.5 w-3.5" /> Bu savol majburiy
              </p>
            )}
          </fieldset>
        )
      })}

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
          style={{ backgroundColor: "color-mix(in srgb, #e11d48 8%, var(--lms-cell))", color: "#e11d48", border: "1px solid color-mix(in srgb, #e11d48 25%, transparent)" }}>
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {preview ? (
        <p className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-xs" style={{ color: "var(--lms-muted)", border: "1px dashed var(--lms-border)" }}>
          <CheckCircle2 className="h-4 w-4" /> Oldindan ko&apos;rish — javob yuborilmaydi
        </p>
      ) : (
        <button type="button" onClick={submit} disabled={busy}
          className="flex items-center justify-center gap-2 self-stretch rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60 sm:self-end"
          style={{ backgroundColor: "var(--lms-button)" }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Javoblarni yuborish
        </button>
      )}
    </div>
  )
}
