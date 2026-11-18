"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Search, Check, X, Plus, Trash2, Users, GraduationCap, Building2, BookOpen, Layers, UsersRound, RefreshCw } from "lucide-react"
import { surveysApi, type SurveyAudienceOptions, type SurveyTargetRule } from "@/lib/api"
import type { CssVars } from "@/components/admin/AdminUi"

/* Auditoriya tanlash: bir nechta qoida (har biri — talabalar yoki
   o'qituvchilar + fakultet/yo'nalish/kurs/guruh filtrlari). Qoidalar
   birlashadi; bitta qoida ichidagi filtrlar bir-birini toraytiradi. */

export const emptyRule = (audience: SurveyTargetRule["audience"]): SurveyTargetRule => ({
  audience, faculties: [], specialties: [], courses: [], groupIds: [],
})

interface PickOption { value: string; label: string; hint?: string }

function MultiPick({ icon: Icon, label, options, selected, onChange, disabled }: {
  icon: React.ElementType
  label: string
  options: PickOption[]
  selected: string[]
  onChange: (v: string[]) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) }
  }, [open])

  const sel = new Set(selected)
  const shown = options.filter((o) => !q.trim() || o.label.toLowerCase().includes(q.trim().toLowerCase()))
  const names = options.filter((o) => sel.has(o.value)).map((o) => o.label)
  const summary = !selected.length ? "Barchasi" : names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2}`

  return (
    <div ref={ref} className="relative min-w-0">
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="adm-input flex min-h-[56px] w-full items-center gap-3 rounded-xl px-3 py-1.5 text-left disabled:opacity-60">
        <span className="adm-icon-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ "--c": "var(--adm-accent)" } as CssVars}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium leading-4 text-[var(--adm-muted)]">{label}</span>
          <span className={`block truncate text-sm font-semibold ${selected.length ? "text-[var(--adm-text)]" : "text-[var(--adm-text-2)]"}`}>{summary}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--adm-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="adm-pop absolute left-0 right-0 top-[calc(100%+6px)] z-30 flex max-h-80 min-w-[240px] flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid var(--adm-border)" }}>
            <Search className="h-4 w-4 text-[var(--adm-muted)]" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish"
              className="w-full bg-transparent text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]" />
            {selected.length > 0 && (
              <button type="button" onClick={() => onChange([])} className="shrink-0 text-xs font-medium text-[var(--adm-accent)]">Tozalash</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {shown.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-[var(--adm-muted)]">Topilmadi</p>
            ) : shown.map((o) => {
              const on = sel.has(o.value)
              return (
                <button key={o.value} type="button" data-active={on}
                  onClick={() => onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
                  className="adm-hover-row flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--adm-text)]">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
                    style={{ border: `1.5px solid ${on ? "var(--adm-accent)" : "var(--adm-border-strong)"}`, backgroundColor: on ? "var(--adm-accent)" : "transparent" }}>
                    {on && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="shrink-0 text-[11px] text-[var(--adm-muted)]">{o.hint}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function RuleCard({ rule, index, options, canRemove, onChange, onRemove, disabled }: {
  rule: SurveyTargetRule
  index: number
  options: SurveyAudienceOptions
  canRemove: boolean
  onChange: (r: SurveyTargetRule) => void
  onRemove: () => void
  disabled?: boolean
}) {
  const specialties = options.specialties.filter((s) => !rule.faculties.length || (s.faculty && rule.faculties.includes(s.faculty)))
  const groups = options.groups.filter((g) =>
    (!rule.faculties.length || (g.faculty && rule.faculties.includes(g.faculty))) &&
    (!rule.specialties.length || (g.specialty && rule.specialties.includes(g.specialty))) &&
    (!rule.courses.length || (g.course && rule.courses.includes(g.course))))
  const isTeacher = rule.audience === "teacher"

  return (
    <div className="rounded-2xl p-4" style={{ border: "1px solid var(--adm-border-strong)", backgroundColor: "color-mix(in srgb, var(--adm-accent) 3%, var(--adm-card))" }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--adm-muted)]">{index + 1}-auditoriya</span>
          <div className="flex rounded-xl p-0.5" style={{ backgroundColor: "var(--adm-grid)" }} role="radiogroup">
            {([["student", "Talabalar", Users], ["teacher", "O'qituvchilar", GraduationCap]] as const).map(([value, label, Icon]) => (
              <button key={value} type="button" role="radio" aria-checked={rule.audience === value} disabled={disabled}
                onClick={() => onChange({ ...rule, audience: value })}
                className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-colors"
                style={rule.audience === value
                  ? { backgroundColor: "var(--adm-card)", color: "var(--adm-accent)", boxShadow: "var(--adm-shadow)" }
                  : { color: "var(--adm-text-2)" }}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} disabled={disabled} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium" style={{ color: "var(--role-admin)" }}>
            <Trash2 className="h-3.5 w-3.5" /> Olib tashlash
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <MultiPick icon={Building2} label="Fakultet" disabled={disabled} selected={rule.faculties}
          options={options.faculties.map((f) => ({ value: f.name, label: f.name, hint: `${f.count}` }))}
          onChange={(v) => onChange({ ...rule, faculties: v, specialties: [], groupIds: [] })} />
        <MultiPick icon={BookOpen} label="Yo'nalish" disabled={disabled} selected={rule.specialties}
          options={specialties.map((s) => ({ value: s.name, label: s.name, hint: `${s.count}` }))}
          onChange={(v) => onChange({ ...rule, specialties: v, groupIds: [] })} />
        <MultiPick icon={Layers} label="Kurs" disabled={disabled} selected={rule.courses}
          options={options.courses.map((c) => ({ value: c.name, label: c.name, hint: `${c.count}` }))}
          onChange={(v) => onChange({ ...rule, courses: v, groupIds: [] })} />
        <MultiPick icon={UsersRound} label="Guruh" disabled={disabled} selected={rule.groupIds.map(String)}
          options={groups.map((g) => ({ value: String(g.id), label: g.name, hint: `${g.count}` }))}
          onChange={(v) => onChange({ ...rule, groupIds: v.map(Number) })} />
      </div>
      <p className="mt-2.5 text-[11px] text-[var(--adm-muted)]">
        {isTeacher
          ? "O'qituvchilar: filtrlar tanlangan guruhlarda dars beradigan o'qituvchilarni belgilaydi. Filtrsiz — barcha masofaviy guruhlar o'qituvchilari."
          : "Talabalar: faqat faol masofaviy ta'lim talabalari. Filtr tanlanmasa — barchasi."}
      </p>
    </div>
  )
}

export function AudiencePicker({ rules, onChange, options, scopeNote, disabled }: {
  rules: SurveyTargetRule[]
  onChange: (rules: SurveyTargetRule[]) => void
  options: SurveyAudienceOptions | null
  scopeNote?: string | null
  disabled?: boolean
}) {
  const [preview, setPreview] = useState<{ total: number; students: number; teachers: number } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const key = useMemo(() => JSON.stringify(rules), [rules])

  useEffect(() => {
    let alive = true
    const id = window.setTimeout(() => {
      if (!rules.length) { setPreview({ total: 0, students: 0, teachers: 0 }); return }
      setLoadingPreview(true)
      surveysApi.preview(rules)
        .then((r) => { if (alive) setPreview(r.data) })
        .catch(() => { if (alive) setPreview(null) })
        .finally(() => { if (alive) setLoadingPreview(false) })
    }, 450)
    return () => { alive = false; window.clearTimeout(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const presets: { label: string; rules: SurveyTargetRule[] }[] = [
    { label: "Barcha talabalar", rules: [emptyRule("student")] },
    { label: "Barcha o'qituvchilar", rules: [emptyRule("teacher")] },
    { label: "Talabalar va o'qituvchilar", rules: [emptyRule("student"), emptyRule("teacher")] },
  ]

  if (!options) {
    return <div className="flex justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-[var(--adm-accent)]" /></div>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-[var(--adm-muted)]">Tez tanlash:</span>
        {presets.map((p) => (
          <button key={p.label} type="button" disabled={disabled}
            data-active={JSON.stringify(p.rules) === key}
            onClick={() => onChange(p.rules)} className="adm-chip rounded-full px-3 py-1.5 text-xs font-semibold">
            {p.label}
          </button>
        ))}
      </div>
      {scopeNote && <p className="text-xs font-medium" style={{ color: "var(--role-dean)" }}>{scopeNote}</p>}
      {rules.map((r, i) => (
        <RuleCard key={i} rule={r} index={i} options={options} canRemove={rules.length > 1} disabled={disabled}
          onChange={(nr) => onChange(rules.map((x, j) => (j === i ? nr : x)))}
          onRemove={() => onChange(rules.filter((_, j) => j !== i))} />
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" disabled={disabled || rules.length >= 20} onClick={() => onChange([...rules, emptyRule("student")])}
          className="adm-btn-outline flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" /> Yana auditoriya qo&apos;shish
        </button>
        <div className="adm-tint flex items-center gap-2 px-3.5 py-2 text-sm" style={{ "--c": "var(--adm-accent)" } as CssVars}>
          {loadingPreview ? <RefreshCw className="h-4 w-4 animate-spin text-[var(--adm-accent)]" /> : <Users className="h-4 w-4 text-[var(--adm-accent)]" />}
          {preview ? (
            <span className="text-[var(--adm-text)]">
              Jami <b style={{ fontVariantNumeric: "tabular-nums" }}>{preview.total}</b> kishi
              <span className="text-[var(--adm-muted)]"> · talaba {preview.students} · o&apos;qituvchi {preview.teachers}</span>
            </span>
          ) : (
            <span className="text-[var(--adm-muted)]">Hisoblanmoqda…</span>
          )}
          {preview && preview.total === 0 && rules.length > 0 && <X className="h-4 w-4" style={{ color: "var(--role-admin)" }} aria-label="Hech kim topilmadi" />}
        </div>
      </div>
    </div>
  )
}
