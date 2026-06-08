"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import {
  Plus, X, Trash2, Pencil, FileText, Lock, CheckCircle2, Clock, Users, Loader2, Download,
} from "lucide-react"
import {
  teachingApi,
  type TeacherContent,
  type TeacherGroup,
  type TeachingContentType,
  type TeachingSubmission,
  type ContentStatus,
} from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const TYPE_MAP: Record<string, { type: TeachingContentType; title: string; itemLabel: string; hasFile: boolean; gradable: boolean }> = {
  darslar:      { type: "lesson",     title: "Darslarim",      itemLabel: "dars",      hasFile: true,  gradable: false },
  topshiriqlar: { type: "assignment", title: "Topshiriqlarim", itemLabel: "topshiriq", gradable: true,  hasFile: true },
  imtihonlar:   { type: "exam",       title: "Imtihonlarim",   itemLabel: "imtihon",   gradable: true,  hasFile: true },
}

const KIND_OPTIONS = [
  { value: "lecture", label: "Ma'ruza" },
  { value: "presentation", label: "Taqdimot" },
  { value: "laboratory", label: "Laboratoriya" },
  { value: "video_lesson", label: "Video dars" },
  { value: "other", label: "Boshqa" },
]

const STATUS_LABEL: Record<ContentStatus, { label: string; color: string; bg: string; Icon: typeof Lock }> = {
  locked: { label: "Qulflangan", color: "#b91c1c", bg: "#fef2f2", Icon: Lock },
  open:   { label: "Ochiq",      color: "#15803d", bg: "#f0fdf4", Icon: CheckCircle2 },
  closed: { label: "Yopilgan",   color: "#92400e", bg: "#fffbeb", Icon: Clock },
}

const inputCls =
  "w-full px-3 py-2.5 rounded-[8px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none transition-colors"
const labelCls = "text-xs font-medium mb-1.5 block"

function toLocalParts(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: "", time: "" }
  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

function combineToIso(date: string, time: string): string | null {
  if (!date || !time) return null
  const d = new Date(`${date}T${time}:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

interface FormState {
  groupId: string
  subjectName: string
  title: string
  description: string
  kind: string
  availableFromDate: string
  availableFromTime: string
  deadlineDate: string
  deadlineTime: string
  maxScore: string
  durationMinutes: string
  file: File | null
}

const EMPTY_FORM: FormState = {
  groupId: "",
  subjectName: "",
  title: "",
  description: "",
  kind: "lecture",
  availableFromDate: "",
  availableFromTime: "",
  deadlineDate: "",
  deadlineTime: "",
  maxScore: "",
  durationMinutes: "",
  file: null,
}

export default function TeacherContentTypePage() {
  const params = useParams<{ type: string }>()
  const slug = typeof params?.type === "string" ? params.type : Array.isArray(params?.type) ? params.type[0] : ""
  const config = TYPE_MAP[slug]

  const { data: groupsRes } = useApi(() => teachingApi.groups(), [])
  const groups: TeacherGroup[] = groupsRes?.data ?? []

  const { data: contentRes, loading, error, refetch } = useApi(
    () => teachingApi.content(config ? { type: config.type } : undefined),
    [config?.type]
  )
  const items: TeacherContent[] = useMemo(() => contentRes?.data ?? [], [contentRes])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [gradingFor, setGradingFor] = useState<TeacherContent | null>(null)

  if (!config) {
    return (
      <div className="p-[30px]">
        <ApiError message="Sahifa topilmadi" />
      </div>
    )
  }

  function openCreateForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowForm(true)
  }

  function openEditForm(item: TeacherContent) {
    const af = toLocalParts(item.availableFrom)
    const dl = toLocalParts(item.deadline)
    setEditingId(item.id)
    setForm({
      groupId: String(item.groupId),
      subjectName: item.subjectName,
      title: item.title,
      description: item.description ?? "",
      kind: item.kind ?? "lecture",
      availableFromDate: af.date,
      availableFromTime: af.time,
      deadlineDate: dl.date,
      deadlineTime: dl.time,
      maxScore: item.maxScore != null ? String(item.maxScore) : "",
      durationMinutes: item.durationMinutes != null ? String(item.durationMinutes) : "",
      file: null,
    })
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handleSubmitForm() {
    setFormError(null)

    const availableFrom = combineToIso(form.availableFromDate, form.availableFromTime)
    const deadline = combineToIso(form.deadlineDate, form.deadlineTime)

    if (!form.groupId) { setFormError("Guruhni tanlang"); return }
    if (!form.subjectName.trim()) { setFormError("Fan nomini kiriting"); return }
    if (!form.title.trim()) { setFormError("Sarlavhani kiriting"); return }
    if (!editingId && !availableFrom) { setFormError("Ochilish sanasi va vaqtini kiriting"); return }

    setSaving(true)
    try {
      if (editingId) {
        await teachingApi.updateContent(editingId, {
          title: form.title.trim(),
          description: form.description.trim() || null,
          subjectName: form.subjectName.trim(),
          availableFrom: availableFrom ?? undefined,
          deadline: deadline,
          maxScore: form.maxScore ? Number(form.maxScore) : null,
          durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
        })
      } else {
        await teachingApi.createContent({
          type: config.type,
          groupId: form.groupId,
          subjectName: form.subjectName.trim(),
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          kind: config.type === "lesson" ? form.kind : undefined,
          availableFrom: availableFrom as string,
          deadline: deadline,
          maxScore: form.maxScore ? Number(form.maxScore) : null,
          durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
          file: form.file,
        })
      }
      closeForm()
      await refetch()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Saqlashda xatolik yuz berdi")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Ushbu kontentni o'chirishni tasdiqlaysizmi?")) return
    try {
      await teachingApi.removeContent(id)
      await refetch()
    } catch (err) {
      alert(err instanceof Error ? err.message : "O'chirishda xatolik")
    }
  }

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {config.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Guruhlaringiz uchun {config.itemLabel} yarating — ochilish va topshirish muddatlarini belgilang
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium"
          style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}
        >
          <Plus className="w-4 h-4" />
          Yangi qo&apos;shish
        </button>
      </div>

      {loading ? <Loading /> : error ? <ApiError message={error} onRetry={refetch} /> : items.length === 0 ? (
        <div className="bg-white rounded-[12px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Hozircha hech narsa yo&apos;q. &quot;Yangi qo&apos;shish&quot; orqali {config.itemLabel} yarating.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => {
            const st = STATUS_LABEL[item.status]
            const groupName = groups.find(g => g.id === item.groupId)?.name ?? `Guruh #${item.groupId}`
            return (
              <div key={item.id} className="bg-white rounded-[12px] p-5 flex flex-col gap-3"
                style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#f6f9ff" }}>
                      <FileText className="w-5 h-5" style={{ color: "#0e58a8" }} />
                    </div>
                    <div>
                      <div className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                        {item.title}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        {item.subjectName} • <Users className="w-3 h-3 inline -mt-0.5" /> {groupName}
                      </div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ color: st.color, backgroundColor: st.bg, fontFamily: "var(--font-poppins)" }}>
                    <st.Icon className="w-3.5 h-3.5" />
                    {st.label}
                  </span>
                </div>

                {item.description && (
                  <p className="text-sm" style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{item.description}</p>
                )}

                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  <span>Ochiladi: <strong style={{ color: "#012970" }}>{formatDateTime(item.availableFrom)}</strong></span>
                  <span>Muddat: <strong style={{ color: "#012970" }}>{formatDateTime(item.deadline)}</strong></span>
                  {item.maxScore != null && <span>Maks. ball: <strong style={{ color: "#012970" }}>{item.maxScore}</strong></span>}
                  {item.durationMinutes != null && <span>Davomiyligi: <strong style={{ color: "#012970" }}>{item.durationMinutes} daqiqa</strong></span>}
                </div>

                {item.file && (
                  <a
                    href={teachingApi.fileUrl(item.file.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-medium w-fit px-3 py-1.5 rounded-[6px]"
                    style={{ color: "#0e58a8", backgroundColor: "#f0f5ff", fontFamily: "var(--font-poppins)" }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {item.file.originalName}
                  </a>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {config.gradable && (
                    <button
                      onClick={() => setGradingFor(item)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors"
                      style={{ color: "#0e58a8", border: "1px solid #d8e6f7", fontFamily: "var(--font-poppins)" }}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Topshirilganlarni ko&apos;rish / baholash
                    </button>
                  )}
                  <button
                    onClick={() => openEditForm(item)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors"
                    style={{ color: "#445b7a", border: "1px solid #d8e6f7", fontFamily: "var(--font-poppins)" }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Tahrirlash
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors"
                    style={{ color: "#dc2626", border: "1px solid #fecaca", fontFamily: "var(--font-poppins)" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    O&apos;chirish
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <ContentFormModal
          config={config}
          groups={groups}
          form={form}
          setForm={setForm}
          editing={editingId !== null}
          saving={saving}
          error={formError}
          onClose={closeForm}
          onSubmit={handleSubmitForm}
        />
      )}

      {gradingFor && (
        <GradingModal content={gradingFor} onClose={() => setGradingFor(null)} />
      )}
    </div>
  )
}

function ContentFormModal({
  config, groups, form, setForm, editing, saving, error, onClose, onSubmit,
}: {
  config: { type: TeachingContentType; itemLabel: string; hasFile: boolean }
  groups: TeacherGroup[]
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  editing: boolean
  saving: boolean
  error: string | null
  onClose: () => void
  onSubmit: () => void
}) {
  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(1,41,112,0.35)" }}>
      <div className="bg-white rounded-[14px] w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {editing ? "Tahrirlash" : `Yangi ${config.itemLabel}`}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#f0f5ff] transition-colors">
            <X className="w-5 h-5" style={{ color: "#7293b9" }} />
          </button>
        </div>

        {error && (
          <div className="text-sm px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>Guruh</label>
            <select
              className={inputCls}
              style={{ fontFamily: "var(--font-poppins)" }}
              value={form.groupId}
              disabled={editing}
              onChange={e => update("groupId", e.target.value)}
            >
              <option value="">Tanlang…</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>Fan nomi</label>
            <input className={inputCls} style={{ fontFamily: "var(--font-poppins)" }} value={form.subjectName}
              onChange={e => update("subjectName", e.target.value)} placeholder="Masalan: Dasturlash asoslari" />
          </div>

          <div className="col-span-2">
            <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>Sarlavha</label>
            <input className={inputCls} style={{ fontFamily: "var(--font-poppins)" }} value={form.title}
              onChange={e => update("title", e.target.value)} placeholder="Masalan: 3-modul: Massivlar" />
          </div>

          <div className="col-span-2">
            <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>Tavsif (ixtiyoriy)</label>
            <textarea className={inputCls} style={{ fontFamily: "var(--font-poppins)", minHeight: 80 }} value={form.description}
              onChange={e => update("description", e.target.value)} placeholder="Qo'shimcha ma'lumot, ko'rsatmalar..." />
          </div>

          {config.type === "lesson" && (
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>Turi</label>
              <select className={inputCls} style={{ fontFamily: "var(--font-poppins)" }} value={form.kind}
                onChange={e => update("kind", e.target.value)}>
                {KIND_OPTIONS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
          )}

          {config.type !== "lesson" && (
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>Maksimal ball (ixtiyoriy)</label>
              <input type="number" min={0} className={inputCls} style={{ fontFamily: "var(--font-poppins)" }} value={form.maxScore}
                onChange={e => update("maxScore", e.target.value)} placeholder="100" />
            </div>
          )}

          {config.type === "exam" && (
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>Davomiyligi (daqiqa, ixtiyoriy)</label>
              <input type="number" min={0} className={inputCls} style={{ fontFamily: "var(--font-poppins)" }} value={form.durationMinutes}
                onChange={e => update("durationMinutes", e.target.value)} placeholder="90" />
            </div>
          )}

          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>Ochilish sanasi va vaqti</label>
            <div className="flex gap-2">
              <input type="date" className={inputCls} style={{ fontFamily: "var(--font-poppins)" }} value={form.availableFromDate}
                onChange={e => update("availableFromDate", e.target.value)} />
              <input type="time" className={inputCls} style={{ fontFamily: "var(--font-poppins)" }} value={form.availableFromTime}
                onChange={e => update("availableFromTime", e.target.value)} />
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>Topshirish muddati (ixtiyoriy)</label>
            <div className="flex gap-2">
              <input type="date" className={inputCls} style={{ fontFamily: "var(--font-poppins)" }} value={form.deadlineDate}
                onChange={e => update("deadlineDate", e.target.value)} />
              <input type="time" className={inputCls} style={{ fontFamily: "var(--font-poppins)" }} value={form.deadlineTime}
                onChange={e => update("deadlineTime", e.target.value)} />
            </div>
          </div>

          {config.hasFile && !editing && (
            <div className="col-span-2">
              <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>Fayl (ixtiyoriy — video, hujjat, taqdimot...)</label>
              <input type="file" className="text-sm" style={{ fontFamily: "var(--font-poppins)", color: "#445b7a" }}
                onChange={e => update("file", e.target.files?.[0] ?? null)} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-[8px] text-sm font-medium"
            style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>
            Bekor qilish
          </button>
          <button onClick={onSubmit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-medium disabled:opacity-60"
            style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Saqlash
          </button>
        </div>
      </div>
    </div>
  )
}

function GradingModal({ content, onClose }: { content: TeacherContent; onClose: () => void }) {
  const { data, loading, error, refetch } = useApi(() => teachingApi.submissions(content.id), [content.id])
  const submissions: TeachingSubmission[] = data?.data ?? []

  const [activeId, setActiveId] = useState<number | null>(null)
  const [grade, setGrade] = useState("")
  const [feedback, setFeedback] = useState("")
  const [saving, setSaving] = useState(false)
  const [gradeError, setGradeError] = useState<string | null>(null)

  function startGrading(sub: TeachingSubmission) {
    setActiveId(sub.id)
    setGrade(sub.grade != null ? String(sub.grade) : "")
    setFeedback(sub.feedback ?? "")
    setGradeError(null)
  }

  async function saveGrade(submissionId: number) {
    setGradeError(null)
    const num = Number(grade)
    if (!grade.trim() || Number.isNaN(num)) { setGradeError("Bahoni kiriting"); return }
    setSaving(true)
    try {
      await teachingApi.grade(submissionId, { grade: num, feedback: feedback.trim() || undefined })
      setActiveId(null)
      await refetch()
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : "Baholashda xatolik")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(1,41,112,0.35)" }}>
      <div className="bg-white rounded-[14px] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {content.title}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              Topshirilgan ishlar — {submissions.length} ta
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#f0f5ff] transition-colors">
            <X className="w-5 h-5" style={{ color: "#7293b9" }} />
          </button>
        </div>

        {loading ? <Loading /> : error ? <ApiError message={error} onRetry={refetch} /> : submissions.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Hozircha hech kim topshirmagan
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {submissions.map(sub => (
              <div key={sub.id} className="rounded-[10px] p-4 flex flex-col gap-2" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {sub.studentFullName}
                    </div>
                    <div className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      Topshirildi: {formatDateTime(sub.submittedAt)}
                    </div>
                  </div>
                  {sub.grade != null && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: "#15803d", backgroundColor: "#f0fdf4", fontFamily: "var(--font-poppins)" }}>
                      Baholandi: {sub.grade}{content.maxScore ? ` / ${content.maxScore}` : ""}
                    </span>
                  )}
                </div>

                {sub.comment && <p className="text-sm" style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{sub.comment}</p>}

                {sub.file && (
                  <a href={teachingApi.fileUrl(sub.file.url)} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-medium w-fit px-3 py-1.5 rounded-[6px]"
                    style={{ color: "#0e58a8", backgroundColor: "#f0f5ff", fontFamily: "var(--font-poppins)" }}>
                    <Download className="w-3.5 h-3.5" />
                    {sub.file.originalName}
                  </a>
                )}

                {activeId === sub.id ? (
                  <div className="flex flex-col gap-2 pt-1">
                    {gradeError && (
                      <div className="text-xs px-3 py-1.5 rounded-[6px]" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                        {gradeError}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input type="number" min={0} placeholder="Baho" value={grade} onChange={e => setGrade(e.target.value)}
                        className={inputCls} style={{ fontFamily: "var(--font-poppins)", maxWidth: 120 }} />
                      <input placeholder="Izoh (ixtiyoriy)" value={feedback} onChange={e => setFeedback(e.target.value)}
                        className={inputCls} style={{ fontFamily: "var(--font-poppins)" }} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setActiveId(null)} className="px-3 py-1.5 rounded-[6px] text-xs font-medium"
                        style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>Bekor qilish</button>
                      <button onClick={() => saveGrade(sub.id)} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] text-xs font-medium disabled:opacity-60"
                        style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Saqlash
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => startGrading(sub)}
                    className="w-fit text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors"
                    style={{ color: "#0e58a8", border: "1px solid #d8e6f7", fontFamily: "var(--font-poppins)" }}>
                    {sub.grade != null ? "Bahoni o'zgartirish" : "Baholash"}
                  </button>
                )}

                {sub.feedback && activeId !== sub.id && (
                  <p className="text-xs italic" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    Izoh: {sub.feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
