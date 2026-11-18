"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ListChecks, ArrowLeft, Save, Send, Eye, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck, Users, CalendarClock, ListOrdered,
  FileText, BarChart3, Bell,
} from "lucide-react"
import {
  surveysApi, type SurveyAudienceOptions, type SurveyManagerInfo, type SurveyPayload, type SurveyTargetRule, type SurveyState,
  type StoredSurveyQuestion,
} from "@/lib/api"
import { PageHeader, Notice, type CssVars } from "@/components/admin/AdminUi"
import { Modal } from "@/components/ui/Modal"
import { AudiencePicker, emptyRule } from "@/components/surveys/AudiencePicker"
import { QuestionBuilder, newKey, newQuestion, type EditorQuestion } from "@/components/surveys/QuestionBuilder"
import { SurveyFill } from "@/components/surveys/SurveyFill"
import { STATE_LABEL, STATE_COLOR, toLocalInput, fromLocalInput, setFlash, takeFlash } from "@/components/surveys/surveyUi"

interface FormState {
  title: string
  description: string
  surveyType: string
  isAnonymous: boolean
  isActive: boolean
  startAt: string
  endAt: string
  estimatedMinutes: string
  reminderIntervalDays: number
  targets: SurveyTargetRule[]
  questions: EditorQuestion[]
}

function defaultForm(): FormState {
  const start = new Date()
  start.setSeconds(0, 0)
  const end = new Date(start.getTime() + 7 * 86_400_000)
  end.setHours(23, 59, 0, 0)
  return {
    title: "",
    description: "",
    surveyType: "umumiy",
    isAnonymous: true,
    isActive: true,
    startAt: toLocalInput(start),
    endAt: toLocalInput(end),
    estimatedMinutes: "",
    reminderIntervalDays: 3,
    targets: [emptyRule("student")],
    questions: [newQuestion("single")],
  }
}

function toPayload(f: FormState, publish: boolean): SurveyPayload {
  return {
    title: f.title.trim(),
    description: f.description.trim(),
    surveyType: f.surveyType,
    isAnonymous: f.isAnonymous,
    isActive: f.isActive,
    startAt: fromLocalInput(f.startAt),
    endAt: fromLocalInput(f.endAt),
    estimatedMinutes: f.estimatedMinutes.trim() ? Number(f.estimatedMinutes) : null,
    reminderIntervalDays: f.reminderIntervalDays,
    targets: f.targets,
    questions: f.questions.map((q) => ({
      ...(q.id ? { id: q.id } : {}),
      type: q.type,
      text: q.text.trim(),
      required: q.required,
      scaleMax: q.scaleMax,
      allowOther: q.allowOther,
      options: q.options.map((o) => ({ ...(o.id ? { id: o.id } : {}), text: o.text.trim() })).filter((o) => o.text),
    })),
    publish,
  }
}

/** Mijoz tomonida tekshiruv — backend ham xuddi shuni tekshiradi */
function validate(f: FormState, publish: boolean): string[] {
  const errors: string[] = []
  if (f.title.trim().length < 3) errors.push("So'rovnoma nomini kiriting (kamida 3 belgi)")
  const start = new Date(f.startAt).getTime()
  const end = new Date(f.endAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) errors.push("Boshlanish va tugash sanasini kiriting")
  else if (end <= start) errors.push("Tugash sanasi boshlanishdan keyin bo'lishi kerak")
  else if (publish && end <= Date.now()) errors.push("Tugash sanasi o'tib ketgan")
  if (f.estimatedMinutes.trim()) {
    const n = Number(f.estimatedMinutes)
    if (!Number.isInteger(n) || n < 1 || n > 180) errors.push("Taxminiy davomiylik 1–180 daqiqa bo'lsin")
  }
  f.questions.forEach((q, i) => {
    if (!q.text.trim()) errors.push(`${i + 1}-savol matni bo'sh`)
    if (q.type === "single" || q.type === "multiple") {
      const texts = q.options.map((o) => o.text.trim().toLowerCase()).filter(Boolean)
      if (texts.length < 2) errors.push(`${i + 1}-savol: kamida 2 ta variant kiriting`)
      if (new Set(texts).size !== texts.length) errors.push(`${i + 1}-savol: variantlar takrorlangan`)
    }
  })
  if (publish) {
    if (!f.targets.length) errors.push("Kamida bitta auditoriya tanlang")
    if (!f.questions.length) errors.push("Kamida bitta savol qo'shing")
  }
  return errors
}

function Section({ icon: Icon, title, hint, children }: { icon: React.ElementType; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="adm-card p-4 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="adm-icon-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ "--c": "var(--adm-accent)" } as CssVars}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-[var(--adm-text)]">{title}</h2>
          {hint && <p className="text-xs text-[var(--adm-muted)]">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

const inputCls = "adm-input w-full rounded-xl px-3.5 py-2.5 text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]"
const labelCls = "mb-1.5 block text-xs font-semibold text-[var(--adm-text-2)]"

export default function SurveyEditorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const isNew = params?.id === "yangi"
  const surveyId = isNew ? null : Number(params?.id)

  const [info, setInfo] = useState<SurveyManagerInfo | null>(null)
  const [options, setOptions] = useState<SurveyAudienceOptions | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [meta, setMeta] = useState<{ status: "draft" | "published"; state: SurveyState; responseCount: number } | null>(null)
  const [loadError, setLoadError] = useState("")
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState<{ startsLater: boolean } | null>(null)
  // Saqlangan holat nusxasi — "saqlanmagan o'zgarishlar" belgisi uchun
  const [initialSnap, setInitialSnap] = useState("")

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [me, opts] = await Promise.all([surveysApi.managerInfo(), surveysApi.options()])
        if (!alive) return
        setInfo(me.data)
        setOptions(opts.data)
        if (isNew) {
          const f = defaultForm()
          setForm(f)
          setInitialSnap(JSON.stringify(f))
          setMeta({ status: "draft", state: "draft", responseCount: 0 })
          return
        }
        if (!surveyId || !Number.isInteger(surveyId)) throw new Error("So'rovnoma topilmadi")
        const d = (await surveysApi.detail(surveyId)).data
        if (!alive) return
        const f: FormState = {
          title: d.title,
          description: d.description ?? "",
          surveyType: d.surveyType,
          isAnonymous: d.isAnonymous,
          isActive: d.isActive,
          startAt: toLocalInput(d.startAt),
          endAt: toLocalInput(d.endAt),
          estimatedMinutes: d.estimatedMinutes ? String(d.estimatedMinutes) : "",
          reminderIntervalDays: d.reminderIntervalDays,
          targets: d.targets.length ? d.targets : [emptyRule("student")],
          questions: d.questions.map((q) => ({ ...q, key: newKey(), options: q.options.map((o) => ({ ...o, key: newKey() })) })),
        }
        setForm(f)
        setInitialSnap(JSON.stringify(f))
        setMeta({ status: d.status, state: d.state, responseCount: d.responseCount })
        const flash = takeFlash()
        if (flash) setMsg(flash)
      } catch (e) {
        if (alive) setLoadError(e instanceof Error ? e.message : "Yuklab bo'lmadi")
      }
    }
    void load()
    return () => { alive = false }
  }, [isNew, surveyId])

  const dirty = !!form && JSON.stringify(form) !== initialSnap
  useEffect(() => {
    if (!dirty) return
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", onUnload)
    return () => window.removeEventListener("beforeunload", onUnload)
  }, [dirty])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => (f ? { ...f, [key]: value } : f))
  const locked = (meta?.responseCount ?? 0) > 0
  const published = meta?.status === "published"
  const autoMinutes = Math.max(1, Math.ceil((form?.questions.length ?? 0) * 0.5))

  const previewQuestions: StoredSurveyQuestion[] = useMemo(() => (form?.questions ?? []).map((q, i) => ({
    ...q,
    id: i + 1,
    text: q.text || `${i + 1}-savol`,
    options: q.options.filter((o) => o.text.trim()).map((o, j) => ({ id: (i + 1) * 1000 + j + 1, text: o.text })),
  })), [form?.questions])

  async function save(publish: boolean) {
    if (!form) return
    setMsg(null)
    const errs = validate(form, publish || published)
    setErrors(errs)
    if (errs.length) { window.scrollTo({ top: 0, behavior: "smooth" }); return }
    setSaving(publish ? "publish" : "draft")
    try {
      const payload = toPayload(form, publish)
      if (isNew) {
        const r = await surveysApi.create(payload)
        setInitialSnap(JSON.stringify(form))
        if (r.message) {
          // Qoralama saqlandi, e'lon qilinmadi — sababini ko'rsatib, tahrirlashga o'tamiz
          setFlash(false, r.message)
          router.replace(`/admin/sorovnomalar/${r.data.id}`)
          return
        }
        setFlash(true, r.data.published ? `E'lon qilindi — ${r.data.participants ?? 0} kishiga yuborildi` : "Qoralama saqlandi")
        router.replace(r.data.published ? `/admin/sorovnomalar/${r.data.id}/natijalar` : `/admin/sorovnomalar/${r.data.id}`)
        return
      }
      const r = await surveysApi.update(surveyId!, payload)
      setInitialSnap(JSON.stringify(form))
      if (publish) {
        setFlash(true, `E'lon qilindi — ${r.data.participants ?? 0} kishiga yuborildi`)
        router.replace(`/admin/sorovnomalar/${surveyId}/natijalar`)
        return
      }
      setMsg({ ok: true, text: r.data.published ? "O'zgarishlar saqlandi — auditoriya yangilandi" : "Qoralama saqlandi" })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Saqlab bo'lmadi" })
      window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setSaving(null)
      setConfirmPublish(null)
    }
  }

  if (loadError) {
    return (
      <div className="px-3 pt-2 sm:px-8">
        <div className="adm-card flex flex-col items-center gap-3 p-10 text-center">
          <AlertCircle className="h-8 w-8" style={{ color: "var(--role-admin)" }} />
          <p className="text-sm text-[var(--adm-text)]">{loadError}</p>
          <Link href="/admin/sorovnomalar" className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Ro&apos;yxatga qaytish</Link>
        </div>
      </div>
    )
  }

  if (!form || !info || !meta) {
    return (
      <div className="flex flex-col gap-4 px-3 pt-2 sm:px-8">
        {[0, 1, 2].map((i) => <div key={i} className="adm-card h-40 animate-pulse" />)}
      </div>
    )
  }

  const canSave = isNew ? info.canCreate : info.canEdit
  const scopeNote = info.role === "dean" ? `Dekanat doirasi: ${info.faculties?.join(", ") || "fakultet biriktirilmagan"} — fakultet tanlanmasa ham faqat shu doira oladi` : null
  const types = info.surveyTypes

  return (
    <div className="flex flex-col gap-5 px-3 pb-28 pt-2 sm:px-8">
      <PageHeader icon={ListChecks}
        title={isNew ? "Yangi so'rovnoma" : "So'rovnomani tahrirlash"}
        subtitle={isNew ? "Savollar, auditoriya va muddatni belgilang" : form.title}>
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && (
            <span className="adm-pill" style={{ "--c": STATE_COLOR[meta.state] } as CssVars}>{STATE_LABEL[meta.state]}</span>
          )}
          {published && (
            <Link href={`/admin/sorovnomalar/${surveyId}/natijalar`} className="adm-btn-outline flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold">
              <BarChart3 className="h-4 w-4" /> Natijalar
            </Link>
          )}
          <Link href="/admin/sorovnomalar" className="adm-btn-outline flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" /> Ro&apos;yxat
          </Link>
        </div>
      </PageHeader>

      {errors.length > 0 && (
        <div className="adm-tint px-4 py-3 text-sm" style={{ "--c": "var(--role-admin)" } as CssVars}>
          <p className="mb-1 flex items-center gap-2 font-semibold" style={{ color: "var(--role-admin)" }}><AlertCircle className="h-4 w-4" /> Tuzatish kerak:</p>
          <ul className="ml-6 list-disc text-[var(--adm-text-2)]">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      {msg && <Notice ok={msg.ok}>{msg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}{msg.text}</Notice>}
      {!canSave && <Notice ok={false}><AlertCircle className="h-4 w-4 shrink-0" /> Sizda bu amal uchun ruxsat yo&apos;q — faqat ko&apos;rish mumkin.</Notice>}

      <Section icon={FileText} title="Asosiy ma'lumotlar">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <label className={labelCls} htmlFor="sv-title">So&apos;rovnoma nomi *</label>
            <input id="sv-title" value={form.title} maxLength={255} onChange={(e) => set("title", e.target.value)}
              placeholder="Masalan: Masofaviy ta'lim sifatidan qoniqish" className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="sv-type">So&apos;rovnoma turi</label>
            <select id="sv-type" value={form.surveyType} onChange={(e) => set("surveyType", e.target.value)} className={`${inputCls} cursor-pointer`}>
              {Object.entries(types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="lg:col-span-3">
            <label className={labelCls} htmlFor="sv-desc">Tavsifi</label>
            <textarea id="sv-desc" value={form.description} maxLength={5000} rows={3} onChange={(e) => set("description", e.target.value)}
              placeholder="So'rovnoma maqsadi va ishtirokchilarga qisqa izoh" className={`${inputCls} resize-y`} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {([
            [true, "Anonim", "Javoblar ismsiz saqlanadi: admin ham kim nima deb javob berganini ko'rmaydi, faqat kim qatnashganini", ShieldCheck],
            [false, "Ochiq (ismli)", "Har bir javob kimniki ekani natijalar va Excel eksportida ko'rinadi", Eye],
          ] as const).map(([value, label, hint, Icon]) => {
            const on = form.isAnonymous === value
            return (
              <button key={label} type="button" disabled={locked} onClick={() => set("isAnonymous", value)}
                className="flex items-start gap-3 rounded-2xl p-3.5 text-left transition-colors disabled:cursor-not-allowed"
                style={{
                  border: `1.5px solid ${on ? "var(--adm-accent)" : "var(--adm-border)"}`,
                  backgroundColor: on ? "color-mix(in srgb, var(--adm-accent) 6%, var(--adm-card))" : "var(--adm-card)",
                  opacity: locked && !on ? 0.5 : 1,
                }}>
                <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: on ? "var(--adm-accent)" : "var(--adm-muted)" }} />
                <span>
                  <span className="block text-sm font-semibold text-[var(--adm-text)]">{label}</span>
                  <span className="block text-xs text-[var(--adm-muted)]">{hint}</span>
                </span>
              </button>
            )
          })}
        </div>
        {locked && <p className="mt-2 text-[11px] text-[var(--adm-muted)]">Javoblar kelgani uchun anonimlik turini o&apos;zgartirib bo&apos;lmaydi.</p>}

        <label className="mt-4 flex w-fit cursor-pointer select-none items-center gap-3 text-sm text-[var(--adm-text)]">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)}
            className="h-4 w-4 cursor-pointer" style={{ accentColor: "var(--adm-accent)" }} />
          <span><b>Faol</b> <span className="text-xs text-[var(--adm-muted)]">— o&apos;chirilsa so&apos;rovnoma to&apos;xtatilgan bo&apos;ladi (javob qabul qilinmaydi)</span></span>
        </label>
      </Section>

      <Section icon={CalendarClock} title="Muddat va eslatmalar" hint="So'rovnoma shu oraliqda ochiq bo'ladi, keyin o'zi yopiladi va arxivga o'tadi">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className={labelCls} htmlFor="sv-start">Boshlanish *</label>
            <input id="sv-start" type="datetime-local" value={form.startAt} onChange={(e) => set("startAt", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="sv-end">Tugash *</label>
            <input id="sv-end" type="datetime-local" value={form.endAt} onChange={(e) => set("endAt", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="sv-min">Taxminiy davomiylik (daqiqa)</label>
            <input id="sv-min" type="number" min={1} max={180} value={form.estimatedMinutes} onChange={(e) => set("estimatedMinutes", e.target.value)}
              placeholder={`Avtomatik: ~${autoMinutes}`} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="sv-rem">Takroriy eslatma</label>
            <select id="sv-rem" value={form.reminderIntervalDays} onChange={(e) => set("reminderIntervalDays", Number(e.target.value))} className={`${inputCls} cursor-pointer`}>
              <option value={0}>Yo&apos;q</option>
              {[1, 2, 3, 5, 7].map((d) => <option key={d} value={d}>Har {d} kunda</option>)}
            </select>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-[var(--adm-muted)]">
          <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Bildirishnomalar faqat javob bermaganlarga boradi: e&apos;lon qilinganda (yoki boshlanish vaqti kelganda), tanlangan oraliqda takroriy va tugashiga 24 soat qolganda oxirgisi.
          Bitta so&apos;rovnoma uchun qo&apos;ng&apos;iroqchada doim bitta xabar turadi. Qatnashish majburiy emas — platforma hech narsani to&apos;smaydi.
        </p>
      </Section>

      <Section icon={Users} title="Maqsadli auditoriya" hint="Bir nechta auditoriyani birga tanlash mumkin — ular birlashadi">
        <AudiencePicker rules={form.targets} onChange={(r) => set("targets", r)} options={options} scopeNote={scopeNote} />
      </Section>

      <Section icon={ListOrdered} title={`Savollar (${form.questions.length})`} hint="Savol turini tanlang, matn va variantlarni kiriting. Tartibni strelkalar bilan o'zgartiring">
        <QuestionBuilder questions={form.questions} onChange={(q) => set("questions", q)} locked={locked} />
      </Section>

      {/* Pastki amal paneli */}
      <div className="fixed bottom-0 left-0 right-0 z-30 md:left-auto md:right-0" style={{ pointerEvents: "none" }}>
        <div className="mx-auto flex max-w-5xl justify-end px-3 pb-4 sm:px-8" style={{ pointerEvents: "auto" }}>
          <div className="adm-pop flex flex-wrap items-center gap-2 p-2.5">
            {dirty && <span className="hidden px-2 text-xs font-medium sm:inline" style={{ color: "var(--role-pending)" }}>Saqlanmagan o&apos;zgarishlar bor</span>}
            <button type="button" onClick={() => setPreviewOpen(true)} disabled={!form.questions.length}
              className="adm-btn-outline flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold disabled:opacity-50">
              <Eye className="h-4 w-4" /> Ko&apos;rish
            </button>
            {canSave && (
              <button type="button" onClick={() => void save(false)} disabled={!!saving}
                className={`${published ? "adm-btn-primary" : "adm-btn-outline"} flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold disabled:opacity-60`}>
                {saving === "draft" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {published ? "O'zgarishlarni saqlash" : "Qoralama saqlash"}
              </button>
            )}
            {canSave && !published && (
              <button type="button" disabled={!!saving}
                onClick={() => {
                  const errs = validate(form, true)
                  setErrors(errs)
                  if (errs.length) { window.scrollTo({ top: 0, behavior: "smooth" }); return }
                  setConfirmPublish({ startsLater: new Date(form.startAt).getTime() > Date.now() })
                }}
                className="adm-btn-primary flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60">
                {saving === "publish" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                E&apos;lon qilish
              </button>
            )}
          </div>
        </div>
      </div>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Oldindan ko'rish" maxWidth={760}>
        <div className="max-h-[72vh] overflow-y-auto pr-1">
          <div className="mb-4">
            <p className="text-lg font-semibold" style={{ color: "var(--lms-primary)" }}>{form.title || "Nomsiz so'rovnoma"}</p>
            {form.description && <p className="mt-1 whitespace-pre-wrap text-sm" style={{ color: "var(--lms-muted)" }}>{form.description}</p>}
          </div>
          <SurveyFill questions={previewQuestions} preview />
        </div>
      </Modal>

      <Modal open={!!confirmPublish} onClose={() => setConfirmPublish(null)} title="E'lon qilish">
        <div className="flex flex-col gap-4 text-sm" style={{ color: "#46557a" }}>
          <p>
            «<b style={{ color: "#012970" }}>{form.title}</b>» e&apos;lon qilinadi. Tanlangan auditoriyadagi har bir kishiga
            {confirmPublish?.startsLater ? " boshlanish vaqti kelganda" : " hozir"} bildirishnoma boradi.
          </p>
          <p className="text-xs">Javoblar kelgunicha savollarni tahrirlash mumkin; keyin faqat matnni tuzatish mumkin bo&apos;ladi.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmPublish(null)} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970" }}>Bekor qilish</button>
            <button onClick={() => void save(true)} disabled={!!saving} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: "#0e58a8" }}>
              {saving === "publish" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} E&apos;lon qilish
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
