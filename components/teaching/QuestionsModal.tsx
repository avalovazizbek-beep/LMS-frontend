"use client"

import { useRef, useState } from "react"
import {
  X, Trash2, Plus, Loader2, Download, Upload,
  CheckSquare, Square, Check, Image as ImageIcon,
  FileText, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react"
import { teachingApi, type TeacherContent, type ExamQuestion } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const titleStyle = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const labelStyle = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const
const inputCls = "w-full px-3 py-2.5 rounded-[8px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none transition-colors"

type Tab = "questions" | "shablon"

interface QuestionDraft {
  questionText: string
  imageUrl: string
  optionImages: (string | null)[]
  options: string[]
  correctIndexes: number[]
  isMulti: boolean
  points: number
}

const emptyDraft = (): QuestionDraft => ({
  questionText: "",
  imageUrl: "",
  optionImages: [null, null, null, null],
  options: ["", "", "", ""],
  correctIndexes: [0],
  isMulti: false,
  points: 1,
})

/* ── Template parser ────────────────────────────────────────────────── */
function parseTemplate(text: string): ExamQuestion[] {
  const questions: ExamQuestion[] = []
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)

  for (const block of blocks) {
    const lines = block.split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("//") && !l.startsWith("#"))

    if (!lines.length) continue

    let questionText = ""
    let imageUrl = ""
    const optionLines: { text: string; correct: boolean }[] = []
    let headerDone = false

    for (const line of lines) {
      if (line.startsWith("+") || line.startsWith("-")) {
        headerDone = true
        const correct = line.startsWith("+")
        const text = line.slice(1).trim()
        if (text) optionLines.push({ text, correct })
      } else if (!headerDone && line.startsWith("@")) {
        imageUrl = line.slice(1).trim()
      } else if (!headerDone) {
        const clean = line.replace(/^\d+[\s.\-\)]+/, "").trim()
        if (clean) questionText += (questionText ? " " : "") + clean
      }
    }

    if (!questionText || optionLines.length < 2) continue
    const correctOnes = optionLines.filter(o => o.correct)
    if (!correctOnes.length) continue

    const options = optionLines.map(o => o.text)
    const correctIndexes = optionLines
      .map((o, i) => (o.correct ? i : -1))
      .filter(i => i >= 0)

    questions.push({
      questionText,
      imageUrl: imageUrl || null,
      options,
      correctIndex: correctIndexes[0],
      correctIndexes,
      points: 1,
    })
  }
  return questions
}

/* ── Template generator ─────────────────────────────────────────────── */
function generateTemplate(questions?: ExamQuestion[]): string {
  const header = [
    "// LMS Test Shablon Formati",
    "// ========================",
    "// - Har bir savol bo'sh qator bilan ajratiladi",
    "// - Savol matni birinchi qatorda bo'ladi",
    "// - @https://rasm-url.com/rasm.png  — savol rasmi (ixtiyoriy)",
    "// - + variant  — to'g'ri javob",
    "// - - variant  — noto'g'ri javob",
    "// - Bir nechta + satri — bir nechta to'g'ri javob bo'lishi mumkin",
    "// ========================",
  ].join("\n")

  if (questions?.length) {
    const body = questions.map((q, i) => {
      const lines: string[] = [`${i + 1}. ${q.questionText}`]
      if (q.imageUrl) lines.push(`@${q.imageUrl}`)
      const correctSet = new Set(q.correctIndexes ?? [q.correctIndex])
      q.options.forEach((opt, oi) => {
        lines.push(`${correctSet.has(oi) ? "+" : "-"} ${opt}`)
      })
      return lines.join("\n")
    }).join("\n\n")
    return `${header}\n\n${body}`
  }

  // Empty sample template
  return `${header}

1. Savol matni bu yerga yoziladi?
+ To'g'ri javob
- Noto'g'ri javob A
- Noto'g'ri javob B
- Noto'g'ri javob C

2. Rasmli savol misoli?
@https://example.com/rasm.png
+ To'g'ri javob
- Noto'g'ri javob A
- Noto'g'ri javob B

3. Ko'p to'g'ri javobli savol misoli?
+ To'g'ri javob 1
+ To'g'ri javob 2
- Noto'g'ri javob A
- Noto'g'ri javob B`
}

function downloadTemplate(questions?: ExamQuestion[]) {
  const content = generateTemplate(questions)
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "test-shablon.txt"
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Question card (read mode) ──────────────────────────────────────── */
function QuestionCard({
  q, index, onEdit, onDelete,
}: {
  q: ExamQuestion
  index: number
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const correctSet = new Set(q.correctIndexes ?? [q.correctIndex])
  const isMulti = (q.correctIndexes?.length ?? 1) > 1

  return (
    <div className="rounded-[10px]" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
      <div className="flex items-start gap-3 p-4">
        <span className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold text-white shrink-0 mt-0.5"
          style={{ backgroundColor: "#7c3aed" }}>
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug" style={titleStyle}>{q.questionText}</p>
          {q.imageUrl && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="truncate max-w-[200px]">{q.imageUrl}</span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: isMulti ? "#fdf4ff" : "#eef4ff", color: isMulti ? "#7c3aed" : "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              {isMulti ? "Ko'p to'g'ri" : "Bir to'g'ri"}
            </span>
            <span className="text-xs" style={labelStyle}>{q.options.length} variant · {q.points} ball</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded hover:bg-[#f0f5ff] transition-colors">
            {expanded
              ? <ChevronUp className="w-4 h-4" style={{ color: "#7293b9" }} />
              : <ChevronDown className="w-4 h-4" style={{ color: "#7293b9" }} />}
          </button>
          <button onClick={onEdit} className="p-1.5 rounded hover:bg-[#f0f5ff] transition-colors"
            title="Tahrirlash">
            <FileText className="w-3.5 h-3.5" style={{ color: "#0e58a8" }} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-[#fef2f2] transition-colors">
            <Trash2 className="w-4 h-4" style={{ color: "#dc2626" }} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-1.5 px-4 pb-4 pl-14">
          {q.imageUrl && (q.imageUrl.startsWith("http") || q.imageUrl.startsWith("/api/")) && (
            <img
              src={q.imageUrl.startsWith("/api/") ? teachingApi.fileUrl(q.imageUrl) : q.imageUrl}
              alt="savol rasmi"
              className="max-h-[160px] w-auto rounded-[6px] object-contain mb-1"
              style={{ border: "1px solid rgba(1,41,112,0.1)" }} />
          )}
          {q.options.map((opt, oi) => (
            <div key={oi} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded shrink-0"
                  style={{
                    backgroundColor: correctSet.has(oi) ? "#f0fdf4" : "#f4f6fa",
                    color: correctSet.has(oi) ? "#15803d" : "#94a3b8",
                  }}>
                  <Check className="w-3 h-3" />
                </span>
                <span className="text-sm" style={{ color: correctSet.has(oi) ? "#15803d" : "#445b7a", fontFamily: "var(--font-poppins)" }}>
                  {opt}
                </span>
              </div>
              {q.optionImages?.[oi] && (
                <div className="pl-7">
                  <img
                    src={q.optionImages[oi]!.startsWith("/api/") ? teachingApi.fileUrl(q.optionImages[oi]!) : q.optionImages[oi]!}
                    alt={`variant ${oi + 1}`}
                    className="max-h-[80px] w-auto rounded-[4px] object-contain"
                    style={{ border: "1px solid rgba(1,41,112,0.08)" }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Question form (add / edit) ─────────────────────────────────────── */
function QuestionForm({
  initial, onSave, onCancel, saveLabel = "Qo'shish",
}: {
  initial: QuestionDraft
  onSave: (d: QuestionDraft) => void
  onCancel: () => void
  saveLabel?: string
}) {
  const [d, setD] = useState<QuestionDraft>(initial)
  const [imgUploading, setImgUploading] = useState(false)
  const [imgErr, setImgErr] = useState<string | null>(null)
  const [optImgUploading, setOptImgUploading] = useState<Record<number, boolean>>({})
  const imgInputRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(file: File) {
    setImgErr(null)
    setImgUploading(true)
    try {
      const res = await teachingApi.uploadQuestionImage(file)
      setD(p => ({ ...p, imageUrl: res.data.url }))
    } catch (e) {
      setImgErr(e instanceof Error ? e.message : "Rasm yuklanmadi")
    } finally {
      setImgUploading(false)
    }
  }

  async function handleOptionImageUpload(oi: number, file: File) {
    setOptImgUploading(p => ({ ...p, [oi]: true }))
    try {
      const res = await teachingApi.uploadQuestionImage(file)
      setD(p => {
        const imgs = [...(p.optionImages ?? [])]
        while (imgs.length <= oi) imgs.push(null)
        imgs[oi] = res.data.url
        return { ...p, optionImages: imgs }
      })
    } catch { /* ignore */ } finally {
      setOptImgUploading(p => ({ ...p, [oi]: false }))
    }
  }

  function removeOptionImage(oi: number) {
    setD(p => {
      const imgs = [...(p.optionImages ?? [])]
      if (oi < imgs.length) imgs[oi] = null
      return { ...p, optionImages: imgs }
    })
  }

  function toggleCorrect(oi: number) {
    if (d.isMulti) {
      const has = d.correctIndexes.includes(oi)
      const next = has ? d.correctIndexes.filter(i => i !== oi) : [...d.correctIndexes, oi]
      setD(prev => ({ ...prev, correctIndexes: next.length ? next : [oi] }))
    } else {
      setD(prev => ({ ...prev, correctIndexes: [oi] }))
    }
  }

  function setOption(oi: number, val: string) {
    const opts = [...d.options]
    opts[oi] = val
    setD(prev => ({ ...prev, options: opts }))
  }

  function addOption() {
    setD(prev => ({
      ...prev,
      options: [...prev.options, ""],
      optionImages: [...(prev.optionImages ?? []), null],
    }))
  }

  function removeOption(oi: number) {
    if (d.options.length <= 2) return
    const opts = d.options.filter((_, i) => i !== oi)
    const imgs = (d.optionImages ?? []).filter((_, i) => i !== oi)
    const cIdx = d.correctIndexes
      .map(i => i > oi ? i - 1 : i === oi ? -1 : i)
      .filter(i => i >= 0 && i < opts.length)
    setD(prev => ({ ...prev, options: opts, optionImages: imgs, correctIndexes: cIdx.length ? cIdx : [0] }))
  }

  const valid =
    d.questionText.trim() &&
    d.options.every(o => o.trim()) &&
    d.correctIndexes.length > 0 &&
    d.correctIndexes.every(i => i >= 0 && i < d.options.length)

  return (
    <div className="rounded-[10px] p-4 flex flex-col gap-4" style={{ border: "1px solid rgba(14,88,168,0.25)", backgroundColor: "#fafcff" }}>

      {/* Question text */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={labelStyle}>Savol matni *</label>
        <textarea
          className={inputCls}
          style={{ fontFamily: "var(--font-poppins)", minHeight: 64, resize: "vertical" }}
          value={d.questionText}
          onChange={e => setD(p => ({ ...p, questionText: e.target.value }))}
          placeholder="Savol matnini kiriting..."
        />
      </div>

      {/* Image upload / URL */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium flex items-center gap-1.5" style={labelStyle}>
          <ImageIcon className="w-3.5 h-3.5" /> Rasm (ixtiyoriy)
        </label>
        <div className="flex gap-2 items-start">
          <input
            className={inputCls}
            style={{ fontFamily: "var(--font-poppins)" }}
            value={d.imageUrl}
            onChange={e => setD(p => ({ ...p, imageUrl: e.target.value }))}
            placeholder="https://... yoki fayl yuklash →"
          />
          <label className="flex items-center gap-1.5 px-3 py-2.5 rounded-[8px] text-sm font-medium cursor-pointer shrink-0 transition-colors hover:bg-[#f0f5ff] disabled:opacity-50"
            style={{ border: "1px solid #d8e6f7", color: "#0e58a8", fontFamily: "var(--font-poppins)", opacity: imgUploading ? 0.6 : 1 }}>
            {imgUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Yuklash
            <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
              disabled={imgUploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }} />
          </label>
        </div>
        {imgErr && <p className="text-xs" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{imgErr}</p>}
        {d.imageUrl && (
          <div className="flex items-start gap-2 mt-1">
            {(d.imageUrl.startsWith("http") || d.imageUrl.startsWith("/api/")) && (
              <img
                src={d.imageUrl.startsWith("/api/") ? teachingApi.fileUrl(d.imageUrl) : d.imageUrl}
                alt="preview"
                className="max-h-[120px] w-auto rounded-[6px] object-contain"
                style={{ border: "1px solid rgba(1,41,112,0.1)" }}
              />
            )}
            <button onClick={() => setD(p => ({ ...p, imageUrl: "" }))}
              className="p-1.5 rounded hover:bg-red-50 transition-colors mt-0.5"
              title="Rasmni o'chirish">
              <X className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
            </button>
          </div>
        )}
      </div>

      {/* Multi-correct toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setD(p => ({ ...p, isMulti: !p.isMulti, correctIndexes: p.correctIndexes.slice(0, 1) }))}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors"
          style={{
            border: `1px solid ${d.isMulti ? "#7c3aed" : "rgba(1,41,112,0.2)"}`,
            backgroundColor: d.isMulti ? "#fdf4ff" : "transparent",
            color: d.isMulti ? "#7c3aed" : "#445b7a",
            fontFamily: "var(--font-poppins)",
          }}>
          {d.isMulti ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          {d.isMulti ? "Ko'p to'g'ri javob (checkbox)" : "Bir to'g'ri javob (radio)"}
        </button>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium" style={labelStyle}>Variantlar (to'g'risini belgilang) *</label>
        {d.options.map((opt, oi) => {
          const isCorrect = d.correctIndexes.includes(oi)
          const optImg = d.optionImages?.[oi] ?? null
          const optImgLoading = optImgUploading[oi] ?? false
          return (
            <div key={oi} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleCorrect(oi)}
                  className="flex items-center justify-center w-6 h-6 rounded shrink-0 transition-colors"
                  style={{
                    border: `2px solid ${isCorrect ? "#16a34a" : "#d8e6f7"}`,
                    backgroundColor: isCorrect ? "#f0fdf4" : "white",
                  }}>
                  {isCorrect && <Check className="w-3.5 h-3.5" style={{ color: "#16a34a" }} />}
                </button>
                <span className="text-xs shrink-0 w-6 text-center" style={{ color: isCorrect ? "#16a34a" : "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {String.fromCharCode(65 + oi)}.
                </span>
                <input
                  className={inputCls}
                  style={{ fontFamily: "var(--font-poppins)", borderColor: isCorrect ? "#86efac" : "#d8e6f7" }}
                  value={opt}
                  onChange={e => setOption(oi, e.target.value)}
                  placeholder={`${oi + 1}-variant matni`}
                />
                {/* Variant rasm yuklash */}
                <label className="flex items-center justify-center w-8 h-8 rounded cursor-pointer shrink-0 transition-colors hover:bg-[#f0f5ff]"
                  title="Rasm qo'shish"
                  style={{ border: "1px solid #d8e6f7", color: optImg ? "#0e58a8" : "#b0c4de" }}>
                  {optImgLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <ImageIcon className="w-3.5 h-3.5" />}
                  <input type="file" accept="image/*" className="hidden" disabled={optImgLoading}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleOptionImageUpload(oi, f); e.target.value = "" }} />
                </label>
                {d.options.length > 2 && (
                  <button onClick={() => removeOption(oi)} className="p-1.5 rounded hover:bg-red-50 shrink-0">
                    <X className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
                  </button>
                )}
              </div>
              {/* Variant rasmi preview */}
              {optImg && (
                <div className="flex items-start gap-2 pl-14">
                  <img
                    src={optImg.startsWith("/api/") ? teachingApi.fileUrl(optImg) : optImg}
                    alt={`variant ${oi + 1} rasm`}
                    className="max-h-[90px] w-auto rounded-[6px] object-contain"
                    style={{ border: "1px solid rgba(1,41,112,0.1)" }}
                  />
                  <button onClick={() => removeOptionImage(oi)} className="p-1 rounded hover:bg-red-50" title="Rasmni o'chirish">
                    <X className="w-3 h-3" style={{ color: "#dc2626" }} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {d.options.length < 8 && (
          <button onClick={addOption}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[6px] w-fit transition-colors hover:bg-[#f0f5ff]"
            style={{ color: "#0e58a8", border: "1px dashed #d8e6f7", fontFamily: "var(--font-poppins)" }}>
            <Plus className="w-3 h-3" /> Variant qo&apos;shish
          </button>
        )}
      </div>

      {/* Points */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium" style={labelStyle}>Ball:</label>
        <input type="number" min={1} max={100}
          className={inputCls}
          style={{ fontFamily: "var(--font-poppins)", maxWidth: 80 }}
          value={d.points}
          onChange={e => setD(p => ({ ...p, points: Math.max(1, Number(e.target.value) || 1) }))}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={() => valid && onSave(d)} disabled={!valid}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
          <Check className="w-4 h-4" />
          {saveLabel}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2.5 rounded-[8px] text-sm font-medium"
          style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>
          Bekor
        </button>
      </div>
    </div>
  )
}

/* ── Main Modal ─────────────────────────────────────────────────────── */
export const EMPTY_QUESTION = (): ExamQuestion => ({
  questionText: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  correctIndexes: [0],
  points: 1,
})

export function QuestionsModal({
  content, onClose, onSaved,
}: {
  content: TeacherContent
  onClose: () => void
  onSaved: () => void
}) {
  const { data, loading, error } = useApi(() => teachingApi.questions(content.id), [content.id])

  const [tab, setTab] = useState<Tab>("questions")
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null)
  const [addMode, setAddMode] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Template import state
  const [templateText, setTemplateText] = useState("")
  const [importPreview, setImportPreview] = useState<ExamQuestion[] | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<"replace" | "append">("append")

  const loadedList = (data?.data as ExamQuestion[] | undefined)?.map(q => ({
    ...q,
    correctIndexes: q.correctIndexes?.length ? q.correctIndexes : [q.correctIndex ?? 0],
  })) ?? []

  const list: ExamQuestion[] = questions ?? loadedList

  function draftFromQuestion(q: ExamQuestion): QuestionDraft {
    const correctIndexes = q.correctIndexes?.length ? q.correctIndexes : [q.correctIndex ?? 0]
    const opts = q.options.length ? [...q.options] : ["", "", "", ""]
    const optionImages: (string | null)[] = opts.map((_, i) => q.optionImages?.[i] ?? null)
    return {
      questionText: q.questionText,
      imageUrl: q.imageUrl ?? "",
      optionImages,
      options: opts,
      correctIndexes,
      isMulti: correctIndexes.length > 1,
      points: q.points ?? 1,
    }
  }

  function draftToQuestion(d: QuestionDraft): ExamQuestion {
    return {
      questionText: d.questionText,
      imageUrl: d.imageUrl || null,
      optionImages: d.optionImages?.some(v => v) ? d.optionImages : null,
      options: d.options,
      correctIndex: d.correctIndexes[0] ?? 0,
      correctIndexes: d.correctIndexes,
      points: d.points,
    }
  }

  function handleAdd(d: QuestionDraft) {
    const q = draftToQuestion(d)
    setQuestions([...list, q])
    setAddMode(false)
  }

  function handleEdit(index: number, d: QuestionDraft) {
    const q = draftToQuestion(d)
    setQuestions(list.map((existing, i) => i === index ? q : existing))
    setEditIndex(null)
  }

  function handleDelete(index: number) {
    setQuestions(list.filter((_, i) => i !== index))
  }

  function handleTemplatePreview() {
    setImportError(null)
    if (!templateText.trim()) {
      setImportError("Shablon matni bo'sh")
      return
    }
    const parsed = parseTemplate(templateText)
    if (!parsed.length) {
      setImportError("Hech qanday savol topilmadi — format to'g'riligini tekshiring")
      return
    }
    setImportPreview(parsed)
  }

  function handleImport() {
    if (!importPreview?.length) return
    const imported = importMode === "append"
      ? [...list, ...importPreview]
      : importPreview
    setQuestions(imported)
    setImportPreview(null)
    setTemplateText("")
    setTab("questions")
  }

  async function handleSave() {
    setSaveError(null)
    for (const q of list) {
      if (!q.questionText.trim()) { setSaveError("Har bir savol matni to'ldirilishi kerak"); return }
      if (q.options.some(o => !o.trim())) { setSaveError("Har bir variant to'ldirilishi kerak"); return }
    }
    setSaving(true)
    try {
      await teachingApi.saveQuestions(content.id, list)
      onSaved()
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Saqlashda xatolik yuz berdi")
    } finally {
      setSaving(false)
    }
  }

  const totalPoints = list.reduce((s, q) => s + (q.points ?? 1), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(1,41,112,0.35)" }}>
      <div className="bg-white rounded-[14px] w-full max-w-2xl max-h-[92vh] flex flex-col"
        style={{ boxShadow: "0 16px 48px rgba(1,41,112,0.18)" }}>

        {/* Header */}
        <div className="px-6 pt-5 pb-0 shrink-0">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold" style={titleStyle}>{content.title} — savollar</h2>
              <p className="text-xs mt-0.5" style={labelStyle}>
                {list.length} ta savol · {totalPoints} ball jami
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#f0f5ff] transition-colors mt-0.5">
              <X className="w-5 h-5" style={{ color: "#7293b9" }} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b" style={{ borderColor: "rgba(1,41,112,0.1)" }}>
            {([
              { id: "questions", label: "Savollar" },
              { id: "shablon", label: "Shablon" },
            ] as { id: Tab; label: string }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-4 py-2.5 text-sm font-medium transition-colors relative"
                style={{
                  color: tab === t.id ? "#0e58a8" : "#7293b9",
                  fontFamily: "var(--font-poppins)",
                }}
              >
                {t.label}
                {tab === t.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ backgroundColor: "#0e58a8" }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {loading ? <Loading /> : error ? <ApiError message={error} /> : (
            <>
              {/* ── Savollar tab ── */}
              {tab === "questions" && (
                <div className="flex flex-col gap-3">
                  {saveError && (
                    <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-[6px]"
                      style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                      <AlertCircle className="w-4 h-4 shrink-0" /> {saveError}
                    </div>
                  )}

                  {list.length === 0 && !addMode && (
                    <div className="text-center py-8" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
                      <p className="text-sm">Hali savollar qo&apos;shilmagan</p>
                      <p className="text-xs mt-1">Quyidagi tugma orqali savol qo&apos;shing yoki shablon orqali import qiling</p>
                    </div>
                  )}

                  {list.map((q, qi) =>
                    editIndex === qi ? (
                      <QuestionForm
                        key={qi}
                        initial={draftFromQuestion(q)}
                        onSave={d => handleEdit(qi, d)}
                        onCancel={() => setEditIndex(null)}
                        saveLabel="Saqlash"
                      />
                    ) : (
                      <QuestionCard
                        key={qi}
                        q={q}
                        index={qi}
                        onEdit={() => { setEditIndex(qi); setAddMode(false) }}
                        onDelete={() => handleDelete(qi)}
                      />
                    )
                  )}

                  {addMode && (
                    <QuestionForm
                      initial={emptyDraft()}
                      onSave={handleAdd}
                      onCancel={() => setAddMode(false)}
                    />
                  )}

                  {!addMode && editIndex === null && (
                    <button
                      onClick={() => setAddMode(true)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium w-full transition-colors hover:bg-[#f0f5ff]"
                      style={{ color: "#7c3aed", border: "1px dashed #e9d5ff", fontFamily: "var(--font-poppins)" }}
                    >
                      <Plus className="w-4 h-4" />
                      Savol qo&apos;shish
                    </button>
                  )}
                </div>
              )}

              {/* ── Shablon tab ── */}
              {tab === "shablon" && (
                <div className="flex flex-col gap-4">
                  {/* Download section */}
                  <div className="rounded-[10px] p-4 flex flex-col gap-3"
                    style={{ border: "1px solid rgba(1,41,112,0.1)", backgroundColor: "#f8fafc" }}>
                    <h3 className="text-sm font-semibold" style={titleStyle}>Shablonni yuklab olish</h3>
                    <p className="text-xs" style={labelStyle}>
                      Shablon faylini yuklab oling, to&apos;ldiring va qayta import qiling.
                      Format: <code style={{ backgroundColor: "#eef4ff", padding: "1px 4px", borderRadius: 4 }}>+ to&apos;g&apos;ri</code> / <code style={{ backgroundColor: "#fef2f2", padding: "1px 4px", borderRadius: 4 }}>- noto&apos;g&apos;ri</code>
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => downloadTemplate()}
                        className="flex items-center gap-2 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors hover:bg-[#f0f5ff]"
                        style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                        <Download className="w-4 h-4" />
                        Bo&apos;sh shablon
                      </button>
                      {list.length > 0 && (
                        <button onClick={() => downloadTemplate(list)}
                          className="flex items-center gap-2 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors hover:bg-[#f0f5ff]"
                          style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                          <Download className="w-4 h-4" />
                          Mavjud savollar bilan ({list.length} ta)
                        </button>
                      )}
                    </div>

                    <div className="text-xs rounded-[6px] p-3" style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "monospace" }}>
                      <div>1. Savol matni?</div>
                      <div>@https://rasm-url.com/rasm.png <span style={{ color: "#7293b9" }}>(ixtiyoriy rasm)</span></div>
                      <div style={{ color: "#16a34a" }}>+ To&apos;g&apos;ri javob</div>
                      <div style={{ color: "#dc2626" }}>- Noto&apos;g&apos;ri javob A</div>
                      <div style={{ color: "#dc2626" }}>- Noto&apos;g&apos;ri javob B</div>
                    </div>
                  </div>

                  {/* Import section */}
                  <div className="rounded-[10px] p-4 flex flex-col gap-3"
                    style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
                    <h3 className="text-sm font-semibold" style={titleStyle}>Shablon orqali import</h3>
                    <p className="text-xs" style={labelStyle}>Shablon faylini yuklang (.txt) yoki matnni quyida joylashtiring</p>

                    {/* .txt file upload button */}
                    <label className="flex items-center gap-2 px-3 py-2 rounded-[6px] text-sm font-medium cursor-pointer w-fit transition-colors hover:bg-[#f0f5ff]"
                      style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                      <Upload className="w-4 h-4" />
                      .txt fayldan yuklash
                      <input type="file" accept=".txt,text/plain" className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = ev => {
                            const text = ev.target?.result
                            if (typeof text === "string") {
                              setTemplateText(text)
                              setImportPreview(null)
                              setImportError(null)
                            }
                          }
                          reader.readAsText(file, "utf-8")
                          e.target.value = ""
                        }}
                      />
                    </label>

                    <textarea
                      value={templateText}
                      onChange={e => { setTemplateText(e.target.value); setImportPreview(null); setImportError(null) }}
                      className={inputCls}
                      style={{ fontFamily: "monospace", minHeight: 160, fontSize: "12px", resize: "vertical" }}
                      placeholder={"1. Savol matni?\n+ To'g'ri javob\n- Noto'g'ri javob A\n- Noto'g'ri javob B\n\n2. Ikkinchi savol?\n..."}
                    />

                    {importError && (
                      <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-[6px]"
                        style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {importError}
                      </div>
                    )}

                    {importPreview && (
                      <div className="flex flex-col gap-2 rounded-[8px] p-3"
                        style={{ backgroundColor: "#f0fdf4", border: "1px solid #86efac" }}>
                        <p className="text-xs font-semibold" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                          {importPreview.length} ta savol topildi
                        </p>
                        {importPreview.slice(0, 3).map((q, i) => (
                          <p key={i} className="text-xs truncate" style={{ color: "#166534", fontFamily: "var(--font-poppins)" }}>
                            {i + 1}. {q.questionText} ({q.options.length} variant)
                          </p>
                        ))}
                        {importPreview.length > 3 && (
                          <p className="text-xs" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                            ...va yana {importPreview.length - 3} ta
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {!importPreview ? (
                        <button onClick={handleTemplatePreview} disabled={!templateText.trim()}
                          className="flex items-center gap-2 px-3 py-2 rounded-[6px] text-sm font-medium disabled:opacity-50 transition-colors hover:bg-[#f0f5ff]"
                          style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                          <FileText className="w-4 h-4" />
                          Tekshirish
                        </button>
                      ) : (
                        <>
                          <select
                            value={importMode}
                            onChange={e => setImportMode(e.target.value as "replace" | "append")}
                            className="px-3 py-2 rounded-[6px] text-sm outline-none"
                            style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }}>
                            <option value="append">Mavjudlarga qo&apos;shish</option>
                            <option value="replace">Almashtirib yuklash</option>
                          </select>
                          <button onClick={handleImport}
                            className="flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm font-medium text-white"
                            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                            <Upload className="w-4 h-4" />
                            Import qilish
                          </button>
                          <button onClick={() => { setImportPreview(null) }}
                            className="px-3 py-2 text-sm"
                            style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                            Bekor
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between gap-3 shrink-0"
          style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
          <span className="text-xs" style={labelStyle}>
            {list.length} ta savol · {totalPoints} ball
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2.5 rounded-[8px] text-sm font-medium"
              style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>
              Yopish
            </button>
            <button onClick={handleSave} disabled={saving || list.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Saqlash
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
