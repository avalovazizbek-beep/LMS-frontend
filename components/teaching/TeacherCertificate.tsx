"use client"

import { useEffect, useState } from "react"
import { Playfair_Display } from "next/font/google"
import { Award, ChevronDown, Download, FileDown, Loader2 } from "lucide-react"
import { teachingApi, type CertificateTopicPart, type TeacherCertificateStatus } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Modal } from "@/components/ui/Modal"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { tr } from "@/lib/i18n/translations"

const nameFont = Playfair_Display({ subsets: ["latin", "latin-ext"], weight: "700", preload: false })

/* Shablon 1220×864 — koordinatalar shu o'lchamda, eksport SCALE barobar katta
   chiziladi. Asl rasmdagi namuna sana (05.10.2026) va "Saria" yozuvi shablondan
   o'chirilgan: sana ham, "Sana" yorlig'i ham shu yerda yoziladi. */
const TEMPLATE_SRC = "/certificates/tashakkurnoma.jpg"
const W = 1220
const H = 864
const SCALE = 2
// "Hurmatli" so'zidan keyin, oltin chiziq ustida
const NAME = { cx: 724, baseline: 331, maxWidth: 336, size: 34, minSize: 18, color: "#0b2849" }
// Kalendar belgisi yonida, pastki chiziq ustida
const DATE = { cx: 947, baseline: 729, size: 15, color: "#1a2436" }
const DATE_LABEL = { cx: 928, baseline: 761, size: 13, color: "#4a525a", text: "Sana" }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Shablon yuklanmadi: ${src}`))
    img.src = src
  })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

// HEMIS ismlaridagi oʻ/gʻ belgilari (U+02BB) shriftda bo'lmasligi mumkin — tipografik qo'shtirnoqqa
const typographicApostrophes = (s: string) => s.replace(/[ʻ`‘]/g, "‘").replace(/[ʼ´’]/g, "’")

async function drawCertificate(fullName: string, issuedAt: string): Promise<HTMLCanvasElement> {
  const sans = getComputedStyle(document.documentElement).getPropertyValue("--font-poppins").trim() || "sans-serif"
  const serif = nameFont.style.fontFamily
  const name = typographicApostrophes(fullName.trim())
  const [img] = await Promise.all([
    loadImage(TEMPLATE_SRC),
    document.fonts.load(`700 ${NAME.size}px ${serif}`, name),
    document.fonts.load(`500 ${DATE.size}px ${sans}`),
    document.fonts.load(`400 ${DATE_LABEL.size}px ${sans}`),
  ])

  const canvas = document.createElement("canvas")
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas mavjud emas")
  ctx.scale(SCALE, SCALE)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, 0, 0, W, H)
  ctx.textAlign = "center"
  ctx.textBaseline = "alphabetic"

  // Uzun ism chiziqqa sig'guncha kichrayadi
  let size = NAME.size
  ctx.font = `700 ${size}px ${serif}`
  while (size > NAME.minSize && ctx.measureText(name).width > NAME.maxWidth) {
    size -= 1
    ctx.font = `700 ${size}px ${serif}`
  }
  ctx.fillStyle = NAME.color
  ctx.fillText(name, NAME.cx, NAME.baseline, NAME.maxWidth)

  ctx.font = `500 ${DATE.size}px ${sans}`
  ctx.fillStyle = DATE.color
  ctx.fillText(formatDate(issuedAt), DATE.cx, DATE.baseline)

  ctx.font = `400 ${DATE_LABEL.size}px ${sans}`
  ctx.fillStyle = DATE_LABEL.color
  ctx.fillText(DATE_LABEL.text, DATE_LABEL.cx, DATE_LABEL.baseline)
  return canvas
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const fontStyle = { fontFamily: "var(--font-poppins)" } as const

function CertificateModal({ certificate, onClose }: {
  certificate: NonNullable<TeacherCertificateStatus["certificate"]>
  onClose: () => void
}) {
  const { t } = useLanguage()
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null)
  const filename = `Tashakkurnoma - ${certificate.fullName}`

  useEffect(() => {
    let cancelled = false
    drawCertificate(certificate.fullName, certificate.issuedAt)
      .then((c) => {
        if (cancelled) return
        setCanvas(c)
        setPreview(c.toDataURL("image/jpeg", 0.92))
      })
      .catch(() => { if (!cancelled) setError(tr("certificate.renderError")) })
    return () => { cancelled = true }
  }, [certificate.fullName, certificate.issuedAt])

  function downloadPng() {
    if (!canvas) return
    setBusy("png")
    canvas.toBlob((blob) => {
      if (blob) saveBlob(blob, `${filename}.png`)
      setBusy(null)
    }, "image/png")
  }

  async function downloadPdf() {
    if (!canvas) return
    setBusy("pdf")
    try {
      const { jsPDF } = await import("jspdf")
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const pw = pdf.internal.pageSize.getWidth()
      const ph = pdf.internal.pageSize.getHeight()
      let w = pw
      let h = pw * (H / W)
      if (h > ph) { h = ph; w = ph * (W / H) }
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", (pw - w) / 2, (ph - h) / 2, w, h)
      pdf.save(`${filename}.pdf`)
    } catch {
      setError(t("certificate.renderError"))
    } finally {
      setBusy(null)
    }
  }

  const btn = "flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-semibold transition-opacity disabled:opacity-60"

  return (
    <Modal open title={t("certificate.title")} onClose={onClose} maxWidth={920}>
      <div className="flex flex-col gap-4">
        <div className="w-full rounded-[8px] overflow-hidden flex items-center justify-center"
          style={{ aspectRatio: `${W} / ${H}`, backgroundColor: "#f6f9ff", border: "1px solid rgba(1,41,112,0.1)" }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={t("certificate.title")} className="w-full h-full object-contain" />
          ) : error ? (
            <p className="text-sm" style={{ ...fontStyle, color: "#b91c1c" }}>{error}</p>
          ) : (
            <span className="flex items-center gap-2 text-sm" style={{ ...fontStyle, color: "#7293b9" }}>
              <Loader2 className="w-4 h-4 animate-spin" /> {t("certificate.preparing")}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button onClick={downloadPng} disabled={!canvas || busy !== null} className={btn}
            style={{ ...fontStyle, border: "1px solid rgba(14,88,168,0.35)", color: "#0e58a8", backgroundColor: "white" }}>
            {busy === "png" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {t("certificate.downloadPng")}
          </button>
          <button onClick={downloadPdf} disabled={!canvas || busy !== null} className={`${btn} text-white`}
            style={{ ...fontStyle, backgroundColor: "#0e58a8" }}>
            {busy === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {t("certificate.downloadPdf")}
          </button>
        </div>
      </div>
    </Modal>
  )
}

const PART_KEYS: Record<CertificateTopicPart, string> = {
  media: "certificate.part.media",
  presentation: "certificate.part.presentation",
  guide: "certificate.part.guide",
  check: "certificate.part.check",
}

/** O'qituvchi: tashakkurnoma sari progress (n / 15 to'liq mavzu) yoki berilgan
    tashakkurnomani ko'rish/yuklab olish. `refreshKey` o'zgarsa qayta so'raladi —
    resurs yuklangach progress darhol yangilanishi uchun. */
export function TeacherCertificateCard({ refreshKey }: { refreshKey?: unknown }) {
  const { t } = useLanguage()
  const { data } = useApi(() => teachingApi.certificate(), [refreshKey])
  const [open, setOpen] = useState(false)
  const [showIncomplete, setShowIncomplete] = useState(false)
  const status = data?.data
  if (!status) return null

  const { goal, completedTopics, incomplete, certificate } = status
  const pct = Math.min(100, Math.round((completedTopics / goal) * 100))

  if (certificate) {
    return (
      <div className="rounded-[12px] bg-white px-5 py-4 flex items-center gap-4 flex-wrap"
        style={{ border: "1px solid rgba(184,134,47,0.35)", boxShadow: "0 1px 4px rgba(1,41,112,0.06)" }}>
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#fdf6e7" }}>
          <Award className="w-6 h-6" style={{ color: "#b8862f" }} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-semibold" style={{ ...fontStyle, color: "#012970" }}>{t("certificate.issued")}</p>
          <p className="text-xs mt-0.5" style={{ ...fontStyle, color: "#7293b9" }}>
            {t("certificate.issuedOn", { date: formatDate(certificate.issuedAt) })}
          </p>
        </div>
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ ...fontStyle, backgroundColor: "#b8862f" }}>
          <Download className="w-4 h-4" /> {t("certificate.open")}
        </button>
        {open && <CertificateModal certificate={certificate} onClose={() => setOpen(false)} />}
      </div>
    )
  }

  return (
    <div className="rounded-[12px] bg-white px-5 py-4 flex flex-col gap-3"
      style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 1px 4px rgba(1,41,112,0.06)" }}>
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#eef4ff" }}>
          <Award className="w-6 h-6" style={{ color: "#0e58a8" }} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <p className="text-sm font-semibold" style={{ ...fontStyle, color: "#012970" }}>{t("certificate.title")}</p>
            <p className="text-xs font-medium" style={{ ...fontStyle, color: "#0e58a8" }}>
              {t("certificate.progress", { n: completedTopics, goal })}
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#eef4ff" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: "#0e58a8" }} />
          </div>
          <p className="text-xs" style={{ ...fontStyle, color: "#7293b9" }}>{t("certificate.rule", { goal })}</p>
        </div>
      </div>

      {incomplete.length > 0 && (
        <div className="flex flex-col gap-2 sm:pl-[60px]">
          <button onClick={() => setShowIncomplete((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold w-fit" style={{ ...fontStyle, color: "#b45309" }}>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showIncomplete ? "rotate-180" : ""}`} />
            {t("certificate.incomplete", { n: incomplete.length })}
          </button>
          {showIncomplete && (
            <ul className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
              {incomplete.map((topic, i) => (
                <li key={`${topic.subjectName}|${topic.trainingType}|${topic.title}|${i}`}
                  className="text-xs px-3 py-2 rounded-[8px]" style={{ ...fontStyle, backgroundColor: "#fffbeb" }}>
                  <span className="font-semibold break-words" style={{ color: "#012970" }}>{topic.title}</span>
                  <span style={{ color: "#7293b9" }}> · {topic.subjectName}</span>
                  <span className="block mt-0.5" style={{ color: "#b45309" }}>
                    {t("certificate.missing", { parts: topic.missing.map((p) => t(PART_KEYS[p])).join(", ") })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
