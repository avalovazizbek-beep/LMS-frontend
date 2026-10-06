"use client"

import { useEffect, useState } from "react"
import { Playfair_Display } from "next/font/google"
import { Award, Download, FileDown, Loader2 } from "lucide-react"
import { teachingApi, type TeacherCertificate } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Modal } from "@/components/ui/Modal"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { tr } from "@/lib/i18n/translations"

const nameFont = Playfair_Display({ subsets: ["latin", "latin-ext"], weight: "700", preload: false })

/* Joylashuv standart shablon (1220×864) o'lchamida beriladi va rasmning haqiqiy
   o'lchamiga nisbatan qo'llanadi — admin yuklagan shablon ham shu tartibda
   bo'lishi kerak. Standart shablondagi namuna sana (05.10.2026) va "Saria"
   yozuvi rasmdan o'chirilgan: sana ham, "Sana" yorlig'i ham shu yerda yoziladi. */
const DEFAULT_TEMPLATE_SRC = "/certificates/tashakkurnoma.jpg"
const W = 1220
const H = 864
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

/** Admin yuklagan shablon, bo'lmasa standart shablon */
async function loadTemplate(): Promise<HTMLImageElement> {
  const blob = await teachingApi.certificateTemplate().catch(() => null)
  if (!blob) return loadImage(DEFAULT_TEMPLATE_SRC)
  const url = URL.createObjectURL(blob)
  try {
    return await loadImage(url)
  } catch {
    return loadImage(DEFAULT_TEMPLATE_SRC)
  } finally {
    // Rasm decode bo'lgach URL kerak emas — canvas'ga chizish img elementidan
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

export function formatCertificateDate(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

// HEMIS ismlaridagi oʻ/gʻ belgilari (U+02BB) shriftda bo'lmasligi mumkin — tipografik qo'shtirnoqqa
const typographicApostrophes = (s: string) => s.replace(/[ʻ`‘]/g, "‘").replace(/[ʼ´’]/g, "’")

export async function drawCertificate(fullName: string, issuedAt: string): Promise<HTMLCanvasElement> {
  const sans = getComputedStyle(document.documentElement).getPropertyValue("--font-poppins").trim() || "sans-serif"
  const serif = nameFont.style.fontFamily
  const name = typographicApostrophes(fullName.trim())
  const [img] = await Promise.all([
    loadTemplate(),
    document.fonts.load(`700 ${NAME.size}px ${serif}`, name),
    document.fonts.load(`500 ${DATE.size}px ${sans}`),
    document.fonts.load(`400 ${DATE_LABEL.size}px ${sans}`),
  ])

  // Kamida 2 barobar (bosmaga yaroqli), katta shablonda o'z o'lchamida
  const outW = Math.min(4000, Math.max(W * 2, img.naturalWidth))
  const outH = Math.round(outW * (img.naturalHeight / img.naturalWidth))
  const sx = outW / W
  const sy = outH / H
  const canvas = document.createElement("canvas")
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas mavjud emas")
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, 0, 0, outW, outH)
  ctx.textAlign = "center"
  ctx.textBaseline = "alphabetic"

  // Uzun ism chiziqqa sig'guncha kichrayadi
  let size = NAME.size
  ctx.font = `700 ${size * sx}px ${serif}`
  while (size > NAME.minSize && ctx.measureText(name).width > NAME.maxWidth * sx) {
    size -= 1
    ctx.font = `700 ${size * sx}px ${serif}`
  }
  ctx.fillStyle = NAME.color
  ctx.fillText(name, NAME.cx * sx, NAME.baseline * sy, NAME.maxWidth * sx)

  ctx.font = `500 ${DATE.size * sx}px ${sans}`
  ctx.fillStyle = DATE.color
  ctx.fillText(formatCertificateDate(issuedAt), DATE.cx * sx, DATE.baseline * sy)

  ctx.font = `400 ${DATE_LABEL.size * sx}px ${sans}`
  ctx.fillStyle = DATE_LABEL.color
  ctx.fillText(DATE_LABEL.text, DATE_LABEL.cx * sx, DATE_LABEL.baseline * sy)
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

/** Tashakkurnoma rasmi (canvas'dan) — `version` o'zgarsa qayta chiziladi */
function useCertificateCanvas(fullName: string, issuedAt: string, version = 0) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    setError(null)
    drawCertificate(fullName, issuedAt)
      .then((c) => {
        if (cancelled) return
        setCanvas(c)
        setPreview(c.toDataURL("image/jpeg", 0.9))
      })
      .catch(() => { if (!cancelled) setError(tr("certificate.renderError")) })
    return () => { cancelled = true }
  }, [fullName, issuedAt, version])
  return { canvas, preview, error }
}

function CertificateImage({ preview, error }: { preview: string | null; error: string | null }) {
  const { t } = useLanguage()
  return (
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
  )
}

/** Admin sozlamalaridagi namuna: namunaviy ism va bugungi sana bilan */
export function CertificatePreview({ fullName, version }: { fullName: string; version: number }) {
  const [issuedAt] = useState(() => new Date().toISOString())
  const { preview, error } = useCertificateCanvas(fullName, issuedAt, version)
  return <CertificateImage preview={preview} error={error} />
}

export function CertificateModal({ fullName, issuedAt, title, onClose }: {
  fullName: string
  issuedAt: string
  /** Avtomatik ochilganda — tabrik sarlavhasi */
  title?: string
  onClose: () => void
}) {
  const { t } = useLanguage()
  const { canvas, preview, error } = useCertificateCanvas(fullName, issuedAt)
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const filename = `Tashakkurnoma - ${fullName}`

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
    setSaveError(null)
    try {
      const { jsPDF } = await import("jspdf")
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const pw = pdf.internal.pageSize.getWidth()
      const ph = pdf.internal.pageSize.getHeight()
      const ratio = canvas.height / canvas.width
      let w = pw
      let h = pw * ratio
      if (h > ph) { h = ph; w = ph / ratio }
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", (pw - w) / 2, (ph - h) / 2, w, h)
      pdf.save(`${filename}.pdf`)
    } catch {
      setSaveError(t("certificate.renderError"))
    } finally {
      setBusy(null)
    }
  }

  const btn = "flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-semibold transition-opacity disabled:opacity-60"

  return (
    <Modal open title={title ?? t("certificate.title")} onClose={onClose} maxWidth={920}>
      <div className="flex flex-col gap-4">
        <CertificateImage preview={preview} error={error ?? saveError} />
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

/* Hali ko'rilmagan tashakkurnoma bir sahifa yuklanishida faqat BIR marta o'zi
   ochiladi — layout'dagi CertificateAutoOpen va sahifalardagi karta bir vaqtda
   ko'rsa ham ikkita oyna chiqmasligi uchun. Ochilishi bilan serverda "ko'rildi"
   deb belgilanadi — keyingi kirishlarda (boshqa qurilmada ham) o'zi ochilmaydi. */
let autoOpenClaimed = false

function claimAutoOpen(certificate: TeacherCertificate): boolean {
  if (autoOpenClaimed || certificate.seen) return false
  autoOpenClaimed = true
  teachingApi.markCertificateSeen().catch(() => {})
  return true
}

/** Layout uchun: tashakkurnoma berilgach o'qituvchi saytga birinchi kirganda o'zi ochiladi */
export function CertificateAutoOpen() {
  const { t } = useLanguage()
  const [certificate, setCertificate] = useState<TeacherCertificate | null>(null)
  useEffect(() => {
    let role: string | null = null
    try { role = localStorage.getItem("lms_role") } catch { /* storage yo'q */ }
    if (role !== "employee") return
    let cancelled = false
    teachingApi.certificate()
      .then((res) => {
        const cert = res.data?.certificate
        if (!cancelled && cert && claimAutoOpen(cert)) setCertificate(cert)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  if (!certificate) return null
  return (
    <CertificateModal fullName={certificate.fullName} issuedAt={certificate.issuedAt}
      title={t("certificate.issued")} onClose={() => setCertificate(null)} />
  )
}

/** O'qituvchi: faqat tashakkurnoma BERILGANDA ko'rinadi. Progress ataylab
    ko'rsatilmaydi — tashakkurnoma kutilmagan sovg'a bo'lib chiqishi kerak.
    `refreshKey` o'zgarsa qayta so'raladi (resurs yuklangach darhol chiqishi uchun). */
export function TeacherCertificateCard({ refreshKey }: { refreshKey?: unknown }) {
  const { t } = useLanguage()
  const { data } = useApi(() => teachingApi.certificate(), [refreshKey])
  const [open, setOpen] = useState(false)
  const [congratulate, setCongratulate] = useState(false)
  const certificate: TeacherCertificate | null | undefined = data?.data?.certificate
  // Sahifada ishlayotgan paytda berilsa (masalan 15-mavzu yuklangach) — shu yerning o'zida ochiladi
  useEffect(() => {
    if (certificate && claimAutoOpen(certificate)) {
      setCongratulate(true)
      setOpen(true)
    }
  }, [certificate])
  if (!certificate) return null

  return (
    <div className="rounded-[12px] bg-white px-5 py-4 flex items-center gap-4 flex-wrap"
      style={{ border: "1px solid rgba(184,134,47,0.35)", boxShadow: "0 1px 4px rgba(1,41,112,0.06)" }}>
      <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#fdf6e7" }}>
        <Award className="w-6 h-6" style={{ color: "#b8862f" }} />
      </div>
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-semibold" style={{ ...fontStyle, color: "#012970" }}>{t("certificate.issued")}</p>
        <p className="text-xs mt-0.5" style={{ ...fontStyle, color: "#7293b9" }}>
          {t("certificate.issuedOn", { date: formatCertificateDate(certificate.issuedAt) })}
        </p>
      </div>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ ...fontStyle, backgroundColor: "#b8862f" }}>
        <Download className="w-4 h-4" /> {t("certificate.open")}
      </button>
      {open && (
        <CertificateModal fullName={certificate.fullName} issuedAt={certificate.issuedAt}
          title={congratulate ? t("certificate.issued") : undefined}
          onClose={() => { setOpen(false); setCongratulate(false) }} />
      )}
    </div>
  )
}
