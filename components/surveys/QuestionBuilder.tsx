"use client"

import { ArrowUp, ArrowDown, Copy, Trash2, Plus, X, CircleDot, SquareCheck, AlignLeft, Gauge, ToggleLeft, Star, Lock } from "lucide-react"
import type { SurveyQuestion, SurveyQuestionType } from "@/lib/api"
import type { CssVars } from "@/components/admin/AdminUi"
import { QUESTION_TYPE_LABEL, QUESTION_TYPE_HINT } from "./surveyUi"

/* Savol konstruktori: 6 tur, matn, majburiylik, variantlar, tartib.
   locked = so'rovnomaga javob kelgan — faqat matnlarni tuzatish mumkin
   (savol/variant qo'shish, o'chirish, tur va tartibni o'zgartirish yopiq). */

export type EditorOption = { id?: number; text: string; key: string }
export type EditorQuestion = Omit<SurveyQuestion, "options"> & { key: string; options: EditorOption[] }

let seq = 0
export const newKey = () => `k${Date.now().toString(36)}${(seq++).toString(36)}`

export const TYPE_ICON: Record<SurveyQuestionType, React.ElementType> = {
  single: CircleDot,
  multiple: SquareCheck,
  text: AlignLeft,
  scale: Gauge,
  yesno: ToggleLeft,
  rating: Star,
}

export function newQuestion(type: SurveyQuestionType): EditorQuestion {
  return {
    key: newKey(),
    type,
    text: "",
    required: type !== "text",
    scaleMax: type === "scale" ? 5 : type === "rating" ? 5 : null,
    allowOther: false,
    options: type === "single" || type === "multiple" ? [{ text: "", key: newKey() }, { text: "", key: newKey() }] : [],
  }
}

function QuestionCard({ q, index, total, locked, onChange, onMove, onDuplicate, onRemove }: {
  q: EditorQuestion
  index: number
  total: number
  locked: boolean
  onChange: (q: EditorQuestion) => void
  onMove: (dir: -1 | 1) => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const Icon = TYPE_ICON[q.type]
  const hasOptions = q.type === "single" || q.type === "multiple"
  const setType = (type: SurveyQuestionType) => {
    const needsOptions = type === "single" || type === "multiple"
    onChange({
      ...q,
      type,
      scaleMax: type === "scale" ? (q.scaleMax === 10 ? 10 : 5) : type === "rating" ? 5 : null,
      allowOther: needsOptions ? q.allowOther : false,
      options: needsOptions ? (q.options.length ? q.options : [{ text: "", key: newKey() }, { text: "", key: newKey() }]) : [],
    })
  }
  const iconBtn = "flex h-8 w-8 items-center justify-center rounded-lg text-[var(--adm-muted)] transition-colors hover:bg-[var(--adm-grid)] hover:text-[var(--adm-text)] disabled:pointer-events-none disabled:opacity-30"

  return (
    <div className="adm-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #3b74f0, #1e40af)" }}>
          {index + 1}
        </span>
        <label className="adm-input flex h-9 items-center gap-2 rounded-xl px-2.5">
          <Icon className="h-4 w-4 text-[var(--adm-accent)]" />
          <select value={q.type} disabled={locked} onChange={(e) => setType(e.target.value as SurveyQuestionType)}
            className="cursor-pointer bg-transparent pr-1 text-sm font-semibold text-[var(--adm-text)] outline-none disabled:cursor-default" aria-label="Savol turi">
            {(Object.keys(QUESTION_TYPE_LABEL) as SurveyQuestionType[]).map((t) => <option key={t} value={t}>{QUESTION_TYPE_LABEL[t]}</option>)}
          </select>
        </label>
        <label className="flex cursor-pointer select-none items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-[var(--adm-text-2)]">
          <input type="checkbox" checked={q.required} onChange={(e) => onChange({ ...q, required: e.target.checked })}
            className="h-4 w-4 cursor-pointer" style={{ accentColor: "var(--adm-accent)" }} />
          Majburiy
        </label>
        <div className="ml-auto flex items-center gap-0.5">
          <button type="button" className={iconBtn} disabled={locked || index === 0} onClick={() => onMove(-1)} title="Yuqoriga" aria-label="Yuqoriga"><ArrowUp className="h-4 w-4" /></button>
          <button type="button" className={iconBtn} disabled={locked || index === total - 1} onClick={() => onMove(1)} title="Pastga" aria-label="Pastga"><ArrowDown className="h-4 w-4" /></button>
          <button type="button" className={iconBtn} disabled={locked} onClick={onDuplicate} title="Nusxa" aria-label="Nusxa"><Copy className="h-4 w-4" /></button>
          <button type="button" className={iconBtn} disabled={locked} onClick={onRemove} title="O'chirish" aria-label="O'chirish" style={{ color: locked ? undefined : "var(--role-admin)" }}><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <textarea value={q.text} onChange={(e) => onChange({ ...q, text: e.target.value })} rows={2} maxLength={2000}
        placeholder="Savol matnini kiriting"
        className="adm-input w-full resize-y rounded-xl px-3.5 py-2.5 text-sm font-medium text-[var(--adm-text)] outline-none placeholder:font-normal placeholder:text-[var(--adm-muted)]" />

      {hasOptions && (
        <div className="mt-3 flex flex-col gap-2">
          {q.options.map((o, j) => (
            <div key={o.key} className="flex items-center gap-2">
              <span className={`h-4 w-4 shrink-0 ${q.type === "single" ? "rounded-full" : "rounded"}`} style={{ border: "1.5px solid var(--adm-border-strong)" }} />
              <input value={o.text} maxLength={500} placeholder={`${j + 1}-variant`}
                onChange={(e) => onChange({ ...q, options: q.options.map((x) => (x.key === o.key ? { ...x, text: e.target.value } : x)) })}
                className="adm-input h-9 min-w-0 flex-1 rounded-lg px-3 text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]" />
              <button type="button" disabled={locked || q.options.length <= 2} title="Variantni o'chirish" aria-label="Variantni o'chirish"
                onClick={() => onChange({ ...q, options: q.options.filter((x) => x.key !== o.key) })}
                className={iconBtn}><X className="h-4 w-4" /></button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3 pl-6">
            <button type="button" disabled={locked || q.options.length >= 30}
              onClick={() => onChange({ ...q, options: [...q.options, { text: "", key: newKey() }] })}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--adm-accent)] disabled:opacity-40">
              <Plus className="h-3.5 w-3.5" /> Variant qo&apos;shish
            </button>
            <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-[var(--adm-text-2)]">
              <input type="checkbox" checked={q.allowOther} disabled={locked} onChange={(e) => onChange({ ...q, allowOther: e.target.checked })}
                className="h-4 w-4 cursor-pointer" style={{ accentColor: "var(--adm-accent)" }} />
              «Boshqa» varianti (foydalanuvchi o&apos;zi yozadi)
            </label>
          </div>
        </div>
      )}

      {q.type === "scale" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--adm-text-2)]">
          Shkala:
          {[5, 10].map((m) => (
            <button key={m} type="button" disabled={locked} data-active={q.scaleMax === m}
              onClick={() => onChange({ ...q, scaleMax: m })} className="adm-chip rounded-full px-3 py-1.5 font-semibold disabled:opacity-60">
              1 – {m}
            </button>
          ))}
        </div>
      )}
      {!hasOptions && q.type !== "scale" && (
        <p className="mt-2 text-xs text-[var(--adm-muted)]">{QUESTION_TYPE_HINT[q.type]}</p>
      )}
    </div>
  )
}

export function QuestionBuilder({ questions, onChange, locked }: {
  questions: EditorQuestion[]
  onChange: (q: EditorQuestion[]) => void
  locked: boolean
}) {
  const update = (i: number, q: EditorQuestion) => onChange(questions.map((x, j) => (j === i ? q : x)))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= questions.length) return
    const next = [...questions]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const duplicate = (i: number) => {
    const src = questions[i]
    const copy: EditorQuestion = { ...src, id: undefined, key: newKey(), options: src.options.map((o) => ({ text: o.text, key: newKey() })) }
    onChange([...questions.slice(0, i + 1), copy, ...questions.slice(i + 1)])
  }

  return (
    <div className="flex flex-col gap-3">
      {locked && (
        <div className="adm-tint flex items-start gap-2.5 px-4 py-3 text-xs" style={{ "--c": "var(--role-pending)" } as CssVars}>
          <Lock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--role-pending)" }} />
          <span className="text-[var(--adm-text-2)]">
            Bu so&apos;rovnomaga javoblar kelgan — natijalar buzilmasligi uchun savol va variant qo&apos;shish, o&apos;chirish, turini yoki tartibini o&apos;zgartirish yopiq.
            Matndagi xatolarni tuzatish va majburiylikni o&apos;zgartirish mumkin.
          </span>
        </div>
      )}
      {questions.length === 0 && (
        <p className="rounded-2xl px-4 py-8 text-center text-sm text-[var(--adm-muted)]" style={{ border: "1px dashed var(--adm-border-strong)" }}>
          Hali savol yo&apos;q — quyidan savol turini tanlang
        </p>
      )}
      {questions.map((q, i) => (
        <QuestionCard key={q.key} q={q} index={i} total={questions.length} locked={locked}
          onChange={(nq) => update(i, nq)} onMove={(d) => move(i, d)} onDuplicate={() => duplicate(i)}
          onRemove={() => onChange(questions.filter((_, j) => j !== i))} />
      ))}
      {!locked && (
        <div className="adm-card p-4">
          <p className="mb-2.5 text-xs font-semibold text-[var(--adm-muted)]">Savol qo&apos;shish</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {(Object.keys(QUESTION_TYPE_LABEL) as SurveyQuestionType[]).map((t) => {
              const Icon = TYPE_ICON[t]
              return (
                <button key={t} type="button" disabled={questions.length >= 100} onClick={() => onChange([...questions, newQuestion(t)])}
                  className="adm-btn-outline flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center disabled:opacity-50">
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-semibold text-[var(--adm-text)]">{QUESTION_TYPE_LABEL[t]}</span>
                  <span className="text-[10px] leading-tight text-[var(--adm-muted)]">{QUESTION_TYPE_HINT[t]}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
