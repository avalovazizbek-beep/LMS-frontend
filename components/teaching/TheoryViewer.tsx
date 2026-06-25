"use client"

import { useEffect, useRef, useState } from "react"
import { BookOpen, CheckCircle2, ExternalLink, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { teachingApi, type ContentProgress, type TeachingFile, type PptxSlide, type PptxShape } from "@/lib/api"

const titleStyle = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const labelStyle = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

interface TheoryViewerProps {
  contentId: number
  file: TeachingFile
  title?: string
  initialProgress?: ContentProgress | null
  onCompleted?: () => void
}

export function TheoryViewer({ contentId, file, title, initialProgress, onCompleted }: TheoryViewerProps) {
  const isPdf = file.mimeType === "application/pdf" || /\.pdf$/i.test(file.originalName)
  const isPptx = /\.(pptx?|ppt)$/i.test(file.originalName) ||
    file.mimeType === "application/vnd.ms-powerpoint" ||
    file.mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  const fileUrl = teachingApi.fileUrl(file.url)

  if (isPdf) {
    return (
      <PdfTheoryViewer
        contentId={contentId}
        fileUrl={fileUrl}
        title={title}
        initialProgress={initialProgress}
        onCompleted={onCompleted}
      />
    )
  }

  if (isPptx) {
    return (
      <PptxViewer
        contentId={contentId}
        file={file}
        fileUrl={fileUrl}
        title={title}
        initialProgress={initialProgress}
        onCompleted={onCompleted}
      />
    )
  }

  return (
    <ManualTheoryViewer
      contentId={contentId}
      fileUrl={fileUrl}
      file={file}
      title={title}
      initialProgress={initialProgress}
      onCompleted={onCompleted}
    />
  )
}

/* ── PPTX Viewer: tries LibreOffice PDF first, then rich CSS slides ───── */
function PptxViewer({
  contentId, file, fileUrl, title, initialProgress, onCompleted,
}: {
  contentId: number
  file: TeachingFile
  fileUrl: string
  title?: string
  initialProgress?: ContentProgress | null
  onCompleted?: () => void
}) {
  const [mode, setMode] = useState<"loading" | "pdf" | "rich" | "text">("loading")
  const checkedRef = useRef(false)

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true
    // Try LibreOffice PDF first (HEAD request)
    const pdfUrl = teachingApi.pptxAsPdfUrl(contentId)
    fetch(pdfUrl, { method: "HEAD" })
      .then(r => setMode(r.ok ? "pdf" : "rich"))
      .catch(() => setMode("rich"))
  }, [contentId])

  if (mode === "loading") {
    return (
      <div className="rounded-[10px] p-6 flex items-center gap-3" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#0e58a8" }} />
        <span className="text-sm" style={labelStyle}>Taqdimot tayyorlanmoqda…</span>
      </div>
    )
  }

  if (mode === "pdf") {
    return (
      <PdfTheoryViewer
        contentId={contentId}
        fileUrl={teachingApi.pptxAsPdfUrl(contentId)}
        title={title}
        initialProgress={initialProgress}
        onCompleted={onCompleted}
        downloadUrl={fileUrl}
        downloadName={file.originalName}
      />
    )
  }

  // Rich CSS-based visual slide viewer (no LibreOffice needed)
  return (
    <RichPptxViewer
      contentId={contentId}
      file={file}
      fileUrl={fileUrl}
      title={title}
      initialProgress={initialProgress}
      onCompleted={onCompleted}
    />
  )
}

/* ── Rich visual slide renderer using CSS positioning ─────────────────── */
function RichPptxViewer({
  contentId, file, fileUrl, title, initialProgress, onCompleted,
}: {
  contentId: number
  file: TeachingFile
  fileUrl: string
  title?: string
  initialProgress?: ContentProgress | null
  onCompleted?: () => void
}) {
  const [completed, setCompleted] = useState(!!initialProgress?.completed)
  const [slides, setSlides] = useState<PptxSlide[]>([])
  const [count, setCount] = useState(0)
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Maksimal yetilgan slayd indeksi — oldin ko'rilganlarni qayta tiklash
  const initMax = initialProgress?.pagesRead?.length
    ? Math.max(...initialProgress.pagesRead) - 1   // 1-based → 0-based
    : (initialProgress?.completed ? Infinity : 0)
  const [maxReached, setMaxReached] = useState<number>(initMax === Infinity ? 9999 : initMax)

  useEffect(() => {
    setLoading(true)
    teachingApi.pptxRichSlides(contentId)
      .then(res => {
        if (res.count > 0 && res.slides?.length) {
          setCount(res.count)
          setSlides(res.slides as PptxSlide[])
        } else {
          setCount(0)
        }
      })
      .catch(() => setCount(0))
      .finally(() => setLoading(false))
  }, [contentId])

  // Slaydga o'tish — faqat ko'rilgan yoki keyingisiga o'tish mumkin
  function goTo(idx: number) {
    const clamped = Math.max(0, Math.min(idx, count - 1))
    // Oldinga sakrashga ruxsat yo'q — faqat bir qadam (yoki orqaga)
    if (clamped > maxReached + 1) return
    setCurrent(clamped)
    if (clamped > maxReached) setMaxReached(clamped)
  }

  async function markDone() {
    if (completed || saving) return
    setSaving(true)
    try {
      // Barcha sahifalar ko'rilganini qayd etish
      const pagesRead = Array.from({ length: count }, (_, i) => i + 1)
      await teachingApi.saveProgress(contentId, { pagesRead, totalPages: count, completed: true })
      setCompleted(true)
      onCompleted?.()
    } finally {
      setSaving(false)
    }
  }

  const allSeen = count > 0 && maxReached >= count - 1

  if (loading) {
    return (
      <div className="rounded-[10px] p-6 flex items-center gap-3" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#0e58a8" }} />
        <span className="text-sm" style={labelStyle}>Taqdimot yuklanmoqda…</span>
      </div>
    )
  }

  if (count === 0 || slides.length === 0) {
    return (
      <ManualTheoryViewer
        contentId={contentId}
        fileUrl={fileUrl}
        file={file}
        title={title}
        initialProgress={initialProgress}
        onCompleted={onCompleted}
      />
    )
  }

  const slide = slides[current]
  const canGoNext = current < count - 1 && current <= maxReached

  return (
    <div className="rounded-[10px] flex flex-col gap-0" style={{ border: "1px solid rgba(1,41,112,0.15)", overflow: "hidden" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: "#f6f9ff", borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" style={{ color: "#0e58a8" }} />
          <span className="text-sm font-semibold" style={titleStyle}>{title ?? "Taqdimot"}</span>
        </div>
        <div className="flex items-center gap-3">
          <a href={fileUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-[5px] transition-colors hover:bg-[#e8f0fb]"
            style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            <ExternalLink className="w-3.5 h-3.5" />
            Yuklab olish
          </a>
          <span className="text-xs font-medium" style={labelStyle}>{current + 1} / {count}</span>
          {completed && <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />}
          {saving && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#0e58a8" }} />}
        </div>
      </div>

      {/* Slide canvas — 16:9 */}
      <div style={{ backgroundColor: "#1a1f2e", padding: "20px 28px" }}>
        <div style={{
          position: "relative", width: "100%", paddingBottom: "56.25%",
          backgroundColor: slide.bg || "#ffffff",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          borderRadius: 3,
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            {slide.shapes.map((shape, si) => (
              <SlideShape key={si} shape={shape} />
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar — ko'rilgan slaydlar soni */}
      <div style={{ height: 3, backgroundColor: "#e8f0fb" }}>
        <div style={{
          height: "100%", backgroundColor: allSeen ? "#22c55e" : "#0e58a8",
          width: `${((Math.min(maxReached, count - 1) + 1) / count) * 100}%`,
          transition: "width 0.3s ease",
        }} />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: "#f6f9ff", borderTop: "1px solid rgba(1,41,112,0.1)" }}>
        <button
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-[6px] disabled:opacity-40 transition-colors hover:bg-[#e8f0fb]"
          style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <ChevronLeft className="w-4 h-4" />
          Oldingi
        </button>

        {/* Dot indicators — ko'rilmagan slaydlarga o'tib bo'lmaydi */}
        <div className="flex gap-1 flex-wrap justify-center" style={{ maxWidth: "60%" }}>
          {Array.from({ length: Math.min(count, 20) }, (_, i) => {
            const idx = count > 20 ? Math.floor(i * count / 20) : i
            const isCur = count > 20
              ? (idx <= current && (i === 19 || Math.floor((i + 1) * count / 20) > current))
              : i === current
            const isSeen = idx <= maxReached
            const isClickable = isSeen && idx !== current
            return (
              <button
                key={i}
                onClick={() => isClickable ? goTo(idx) : undefined}
                disabled={!isClickable}
                className="rounded-full transition-all"
                style={{
                  width: isCur ? 20 : 8, height: 8, border: "none", cursor: isClickable ? "pointer" : "default",
                  backgroundColor: isCur ? "#0e58a8" : isSeen ? "#93c5fd" : "#e2e8f0",
                }}
              />
            )
          })}
        </div>

        {/* Oxirgi slaydga yetmagan: "Keyingi" tugmasi */}
        {current < count - 1 ? (
          <button
            onClick={() => goTo(current + 1)}
            disabled={!canGoNext}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-[6px] transition-colors disabled:opacity-40"
            style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
            Keyingi <ChevronRight className="w-4 h-4" />
          </button>
        ) : allSeen ? (
          /* Oxirgi slaydga yetib, hammasi ko'rilgan — "Tugatish" tugmasi */
          <button
            disabled={completed || saving}
            onClick={markDone}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-[6px] disabled:opacity-60"
            style={{ backgroundColor: completed ? "#22c55e" : "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
            {completed
              ? <><CheckCircle2 className="w-4 h-4" />Tugatildi</>
              : saving
                ? <><Loader2 className="w-4 h-4 animate-spin" />Saqlanmoqda…</>
                : <><CheckCircle2 className="w-4 h-4" />Tugatish</>}
          </button>
        ) : (
          /* Hali hammasi ko'rilmagan holda oxirgi slaydda — disabled */
          <button
            disabled
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-[6px] opacity-40"
            style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
            <CheckCircle2 className="w-4 h-4" />Tugatish
          </button>
        )}
      </div>

      {/* Ko'rilmagan slaydlar haqida ogohlantirish */}
      {!completed && !allSeen && (
        <div className="px-4 py-2 text-xs text-center" style={{ backgroundColor: "#fffbeb", borderTop: "1px solid rgba(217,119,6,0.15)", color: "#92400e", fontFamily: "var(--font-poppins)" }}>
          Keyingi bo&apos;limni ochish uchun barcha {count} ta slaydni navbatma-navbat ko&apos;ring ({Math.min(maxReached + 1, count)}/{count} ko&apos;rildi)
        </div>
      )}
    </div>
  )
}

function SlideShape({ shape }: { shape: PptxShape }) {
  return (
    <div style={{
      position: "absolute",
      left: `${shape.x}%`,
      top: `${shape.y}%`,
      width: `${shape.w}%`,
      minHeight: `${shape.h}%`,
      backgroundColor: shape.fill ?? "transparent",
      overflow: "hidden",
      padding: "0.4%",
      boxSizing: "border-box",
    }}>
      {shape.p.map((para, pi) => (
        <p key={pi} style={{
          textAlign: para.a as "left" | "center" | "right" | "justify",
          margin: 0,
          padding: 0,
          lineHeight: para.ls ? `${para.ls / 100}` : "1.3",
        }}>
          {para.r.map((run, ri) =>
            run.t === "\n"
              ? <br key={ri} />
              : (
                <span key={ri} style={{
                  fontWeight: run.b ? "bold" : "normal",
                  fontStyle: run.i ? "italic" : "normal",
                  /* sz is in points; 1pt = 1.333px; then scale by ~0.85 for container */
                  fontSize: `${run.sz * 1.13}px`,
                  color: run.c ?? "inherit",
                  fontFamily: "Calibri, Arial, sans-serif",
                  whiteSpace: "pre-wrap",
                }}>
                  {run.t}
                </span>
              )
          )}
        </p>
      ))}
    </div>
  )
}

/* ── PDF Viewer — auto-completes when iframe finishes loading ─────────── */
function PdfTheoryViewer({
  contentId, fileUrl, title, initialProgress, onCompleted, downloadUrl, downloadName,
}: {
  contentId: number
  fileUrl: string
  title?: string
  initialProgress?: ContentProgress | null
  onCompleted?: () => void
  downloadUrl?: string
  downloadName?: string
}) {
  const [completed, setCompleted] = useState(!!initialProgress?.completed)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  async function markRead() {
    if (completed || saving) return
    setSaving(true)
    try {
      await teachingApi.saveProgress(contentId, { pagesRead: [1], totalPages: 1, completed: true })
      setCompleted(true)
      onCompleted?.()
    } catch {} finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-[10px] p-4 flex flex-col gap-2" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4" style={{ color: "#0e58a8" }} />
        <span className="text-sm font-semibold" style={titleStyle}>{title ?? "Taqdimot"}</span>
        {downloadUrl && (
          <a href={downloadUrl} target="_blank" rel="noreferrer"
            className="ml-auto flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-[5px] transition-colors hover:bg-[#e8f0fb]"
            style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            <ExternalLink className="w-3.5 h-3.5" />
            {downloadName ?? "Yuklab olish"}
          </a>
        )}
        {completed && <CheckCircle2 className="w-4 h-4 ml-auto" style={{ color: "#22c55e" }} />}
      </div>

      <div className="rounded-[8px] overflow-hidden" style={{ height: "75vh", backgroundColor: "#f4f6fa" }}>
        <iframe
          src={fileUrl}
          title={title ?? "Taqdimot"}
          onLoad={() => setIframeLoaded(true)}
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      </div>

      {/* Tugallash — faqat iframe yuklangandan keyin va qo'lda bosilganda */}
      {!completed ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs" style={labelStyle}>
            Hujjatni o&apos;qib chiqqach, tugmani bosing
          </p>
          <button
            onClick={markRead}
            disabled={!iframeLoaded || saving}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-[6px] disabled:opacity-40 transition-colors"
            style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" />Saqlanmoqda…</>
              : <><CheckCircle2 className="w-4 h-4" />O&apos;qib chiqdim</>}
          </button>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>
          <CheckCircle2 className="w-3.5 h-3.5" /> Ko&apos;rib chiqildi
        </p>
      )}
    </div>
  )
}

function ManualTheoryViewer({
  contentId, fileUrl, file, title, initialProgress, onCompleted,
}: {
  contentId: number
  fileUrl: string
  file: TeachingFile
  title?: string
  initialProgress?: ContentProgress | null
  onCompleted?: () => void
}) {
  const [completed, setCompleted] = useState(!!initialProgress?.completed)
  const [saving, setSaving] = useState(false)

  async function markRead() {
    setSaving(true)
    try {
      await teachingApi.saveProgress(contentId, { pagesRead: [1], totalPages: 1, completed: true })
      setCompleted(true)
      onCompleted?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-[10px] p-4 flex flex-col gap-2" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4" style={{ color: "#0e58a8" }} />
        <span className="text-sm font-semibold" style={titleStyle}>{title ?? "Taqdimot"}</span>
        {completed && <CheckCircle2 className="w-4 h-4 ml-auto" style={{ color: "#22c55e" }} />}
      </div>
      <a href={fileUrl} target="_blank" rel="noreferrer"
        className="flex items-center gap-2 w-fit px-3 py-2 rounded-[6px] text-sm font-medium"
        style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
        <ExternalLink className="w-4 h-4" />
        {file.originalName}
      </a>
      {!completed && (
        <button onClick={markRead} disabled={saving}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-[8px] text-sm font-medium w-fit disabled:opacity-60"
          style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          O&apos;qib chiqdim
        </button>
      )}
    </div>
  )
}
