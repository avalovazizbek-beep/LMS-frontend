"use client"

import { useState } from "react"
import { Bot, Check, CheckCircle, ChevronDown, Download, ExternalLink, Eye, Loader2, Lock } from "lucide-react"
import { teachingApi, type PlagiarismResult, type TeachingSubmission } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"

/* Baholash kartasi (o'qituvchi → Baholash sahifasi).
   Baholanmagan ish — ochiq karta: chapda talaba ishi va tekshiruv natijalari
   (o'xshashlik, mavzuga moslik, AI tavsiya bahosi — uchalasi yonma-yon), o'ngda
   baho qo'yish (katta ball maydoni, "AI tavsiyasini qo'llash", tezkor ballar,
   tayyor izoh iboralari). Baholangan ish — bir qatorli ixcham ko'rinish
   (bosilsa tekshiruv tafsilotlari ochiladi). Baho saqlangach qulflanadi —
   bu qoida o'zgarmagan. */

const F = { fontFamily: "var(--font-poppins)" }
const INK = "#012970"
const MUTED = "#7293b9"
const LINE = "rgba(1,41,112,0.1)"

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function tone(pct: number, inverse = false) {
  // inverse: o'xshashlik — yuqori bo'lsa yomon
  const good = inverse ? pct < 20 : pct >= 70
  const mid = inverse ? pct < 50 : pct >= 50
  return good ? { fg: "#15803d", bar: "#22c55e" } : mid ? { fg: "#b45309", bar: "#f59e0b" } : { fg: "#b91c1c", bar: "#ef4444" }
}

/** Topshiriqning maksimal baliga mos tezkor ballar: 100 → 100,90,…,50; 5 → 5,4,3,2 */
function quickScores(max: number): number[] {
  if (max <= 10) return Array.from({ length: Math.min(6, max) }, (_, i) => max - i).filter(n => n > 0)
  return [...new Set([1, 0.9, 0.8, 0.7, 0.6, 0.5].map(f => Math.round(max * f)))]
}

const round1 = (n: number) => Math.round(n * 10) / 10

function Tile({ label, value, suffix, pct, color, bar, note }: {
  label: string; value: string; suffix?: string; pct: number | null; color: string; bar: string; note: React.ReactNode
}) {
  return (
    <div className="rounded-[10px] px-3.5 py-3" style={{ border: `1px solid ${LINE}` }}>
      <div className="text-xs font-medium" style={{ color: MUTED, ...F }}>{label}</div>
      <div className="mt-1 text-2xl font-bold leading-tight" style={{ color, ...F }}>
        {value}{suffix && <span className="text-sm font-medium" style={{ color: MUTED }}> {suffix}</span>}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "#e8eefb" }}>
        {pct !== null && <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, backgroundColor: bar }} />}
      </div>
      <div className="mt-1.5 text-xs leading-4" style={{ color: MUTED, ...F }}>{note}</div>
    </div>
  )
}

/** Tekshiruv natijalari: uchta ko'rsatkich + AI izohi + qo'shimcha eslatmalar */
function Checks({ plag, maxScore }: { plag: PlagiarismResult | undefined; maxScore: number }) {
  const { t } = useLanguage()
  const ai = plag?.ai
  const sim = plag ? tone(plag.maxSimilarityPct, true) : null
  const rel = ai?.status === "done" && ai.relevance != null ? tone(ai.relevance) : null
  const aiNote = !plag ? t("gradeCard.notChecked")
    : !ai ? t("gradeCard.notChecked")
    : ai.status === "pending" ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" aria-hidden /> {t("gradeCard.aiPending")}</span>
    : ai.status === "no_text" ? t("gradeCard.aiNoText")
    : ai.status === "no_topic" ? <span style={{ color: "#92400e" }}>{t("gradeCard.noTopic")}</span>
    : ai.status === "failed" ? t("gradeCard.aiFailed")
    : null
  const aiGrade = ai?.status === "done" && ai.grade != null ? ai.grade : null
  return (
    <>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Tile label={t("gradeCard.similarity")}
          value={plag ? `${plag.maxSimilarityPct}%` : "—"} pct={plag ? plag.maxSimilarityPct : null}
          color={sim?.fg ?? MUTED} bar={sim?.bar ?? "#cbd5e1"}
          note={!plag ? t("gradeCard.notChecked")
            : plag.textSource === "none" ? <span style={{ color: "#92400e" }}>{t("plagx.unreadableShort")} — {t("gradeCard.unreadable")}</span>
            : plag.matchedStudentName ? <span style={{ color: sim!.fg }}>{t("gradeCard.similarTo", { name: plag.matchedStudentName })}</span>
            : <span style={{ color: "#15803d" }}>{t("gradeCard.noSimilar")}</span>} />
        <Tile label={t("gradeCard.relevance")}
          value={rel ? `${ai!.relevance}%` : "—"} pct={rel ? ai!.relevance : null}
          color={rel?.fg ?? MUTED} bar={rel?.bar ?? "#cbd5e1"}
          note={aiNote ?? (rel ? (ai!.relevance! >= 70 ? t("gradeCard.onTopic") : ai!.relevance! >= 50 ? t("gradeCard.partlyOnTopic") : t("gradeCard.offTopic")) : t("gradeCard.noTopic"))} />
        <Tile label={t("gradeCard.aiGrade")}
          value={aiGrade !== null ? String(aiGrade) : "—"} suffix={aiGrade !== null ? "/ 100" : undefined} pct={aiGrade}
          color={aiGrade !== null ? "#0e58a8" : MUTED} bar="#0e58a8"
          note={aiNote ?? (aiGrade !== null && maxScore !== 100 ? t("gradeCard.aiScaled", { n: round1(aiGrade * maxScore / 100), max: maxScore }) : t("gradeCard.onlySuggestion"))} />
      </div>

      {plag && (plag.matchedGroupName || plag.textSource === "ocr") && (
        <div className="mt-2 flex flex-col gap-0.5 text-xs" style={{ color: "#445b7a", ...F }}>
          {plag.matchedGroupName && <p>{t("plagx.otherGroup", { group: plag.matchedGroupName })}</p>}
          {plag.textSource === "ocr" && <p>{t("plagx.ocrLong", { words: plag.wordCount ?? 0 })}</p>}
        </div>
      )}

      {ai?.status === "done" && ai.comment && (
        <div className="mt-3 rounded-[10px] px-3.5 py-3" style={{ backgroundColor: "#f6f9ff", border: "1px solid rgba(14,88,168,0.12)" }}>
          <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: INK, ...F }}>
            <Bot className="h-4 w-4" style={{ color: "#0e58a8" }} aria-hidden /> {t("gradeCard.aiComment")}
          </div>
          <p className="mt-1.5 text-[13.5px] leading-[1.55]" style={{ color: INK, ...F }}>{ai.comment}</p>
          <p className="mt-2 text-[11.5px]" style={{ color: "#94a3b8", ...F }}>{t("plagx.aiDisclaimer")}</p>
        </div>
      )}

      {plag?.internetEnabled && plag.internetMatches.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {plag.internetMatches.map((m, i) => (
            <a key={i} href={m.link} target="_blank" rel="noreferrer"
              className="flex items-start gap-2 rounded-[6px] bg-white p-2 text-xs transition-colors hover:bg-[#eef4ff]" style={{ border: `1px solid ${LINE}` }}>
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#0e58a8" }} aria-hidden />
              <div className="min-w-0">
                <p className="truncate font-medium" style={{ color: "#0e58a8", ...F }}>{m.title || m.link}</p>
                <p className="mt-0.5" style={{ color: MUTED, ...F }}>{m.snippet}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  )
}

function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${small ? "h-9 w-9 text-sm" : "h-11 w-11 text-base"}`}
      style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", ...F }} aria-hidden>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  )
}

const VIEWABLE = /\.(pdf|txt|png|jpe?g|webp|gif)$/i

export interface GradingCardProps {
  sub: TeachingSubmission
  plag: PlagiarismResult | undefined
  maxScore: number
  gradeVal: string
  feedbackVal: string
  onGrade: (value: string) => void
  onFeedback: (value: string) => void
  onSave: () => void
  saving: boolean
  /** Baho qo'yilgan (qulflangan) */
  locked: boolean
  /** Topshiriq yakunlangan — xiraroq ko'rinadi */
  dimmed?: boolean
  submittedText: string
}

export function GradingCard({ sub, plag, maxScore, gradeVal, feedbackVal, onGrade, onFeedback, onSave, saving, locked, dimmed, submittedText }: GradingCardProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const fileUrl = sub.file ? teachingApi.fileUrl(sub.file.url) : null
  const ext = sub.file?.originalName.split(".").pop()?.slice(0, 4).toUpperCase() ?? ""
  const ai = plag?.ai?.status === "done" ? plag.ai : null
  const aiScaled = ai?.grade != null ? round1(ai.grade * maxScore / 100) : null
  const sim = plag ? tone(plag.maxSimilarityPct, true) : null

  /* ── Baholangan: bir qator ── */
  if (locked) {
    return (
      <div className="overflow-hidden rounded-[12px] bg-white" style={{ border: "1px solid rgba(21,128,61,0.2)", boxShadow: "0 1px 4px rgba(1,41,112,0.04)", opacity: dimmed ? 0.8 : 1 }}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <Avatar name={sub.studentFullName} small />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14.5px] font-semibold" style={{ color: INK, ...F }}>{sub.studentFullName}</div>
            <div className="mt-0.5 truncate text-xs" style={{ color: MUTED, ...F }}>
              {submittedText}
              {sub.file && fileUrl && <> · <a href={fileUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline" style={{ color: "#0e58a8" }}>{sub.file.originalName}</a></>}
            </div>
          </div>
          {plag && sim && (
            <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: `${sim.bar}1f`, color: sim.fg, ...F }}>
              {t("gradeCard.similarityShort", { pct: plag.maxSimilarityPct })}
            </span>
          )}
          {ai?.grade != null && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: "#eef4ff", color: "#0e58a8", ...F }}>
              <Bot className="h-3 w-3" aria-hidden /> {t("plagx.aiShort", { grade: ai.grade })}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: "#f0fdf4", color: "#15803d", ...F }}>
            <CheckCircle className="h-3.5 w-3.5" aria-hidden /> {t("gradeCard.graded")}
          </span>
          <span className="text-xl font-bold" style={{ color: "#15803d", ...F }} title={t("baholashPageOq.lockedGrade")}>
            {sub.grade !== null ? sub.grade : gradeVal}<span className="text-xs font-medium" style={{ color: MUTED }}> / {maxScore}</span>
          </span>
          <span title={t("baholashPageOq.lockedGrade")} className="flex"><Lock className="h-3.5 w-3.5" style={{ color: MUTED }} aria-hidden /></span>
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={t("gradeCard.details")}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[#f0f5ff]">
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "#0e58a8" }} aria-hidden />
          </button>
        </div>
        {open && (
          <div className="px-4 pb-4 pt-1" style={{ borderTop: `1px solid ${LINE}` }}>
            {sub.feedback && <p className="mb-3 mt-2 text-[13px]" style={{ color: INK, ...F }}><span style={{ color: MUTED }}>{t("gradeCard.yourComment")}</span> {sub.feedback}</p>}
            <div className="mt-2"><Checks plag={plag} maxScore={maxScore} /></div>
          </div>
        )}
      </div>
    )
  }

  /* ── Baholanmagan: ochiq karta ── */
  const phrases = [t("gradeCard.phrase1"), t("gradeCard.phrase2"), t("gradeCard.phrase3")]
  const addPhrase = (text: string) => onFeedback(feedbackVal.trim() ? `${feedbackVal.trim().replace(/[.;,]$/, "")}. ${text}` : text)

  return (
    <div className="overflow-hidden rounded-[14px] bg-white" style={{ border: `1px solid ${LINE}`, boxShadow: "0 2px 10px rgba(1,41,112,0.05)" }}>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${LINE}` }}>
        <Avatar name={sub.studentFullName} />
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold leading-tight" style={{ color: INK, ...F }}>{sub.studentFullName}</div>
          <div className="mt-0.5 text-[12.5px]" style={{ color: MUTED, ...F }}>{submittedText}</div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: "#fff8e6", color: "#92400e", ...F }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#ea580c" }} /> {t("gradeCard.waiting")}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Chap: talaba ishi va tekshiruv */}
        <div className="px-5 py-4 lg:border-r" style={{ borderColor: LINE }}>
          <p className="mb-2 text-xs font-semibold" style={{ color: MUTED, ...F }}>{t("gradeCard.work")}</p>
          {sub.file && fileUrl ? (
            <div className="flex flex-wrap items-center gap-3 rounded-[10px] px-3.5 py-3" style={{ border: `1px solid ${LINE}` }}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] text-[10.5px] font-bold" style={{ backgroundColor: "#eef4ff", color: "#0e58a8", ...F }}>{ext}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold" style={{ color: INK, ...F }}>{sub.file.originalName}</div>
                <div className="text-xs" style={{ color: MUTED, ...F }}>
                  {sub.file.size > 0 ? fmtSize(sub.file.size) : ""}
                  {plag?.textSource === "ocr" && ` · ${t("gradeCard.fromImage")}`}
                </div>
              </div>
              <a href={fileUrl} download={sub.file.originalName}
                className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-white px-3.5 text-[13px] font-semibold transition-colors hover:bg-[#f0f5ff]" style={{ border: `1px solid ${LINE}`, color: "#0e58a8", ...F }}>
                <Download className="h-3.5 w-3.5" aria-hidden /> {t("gradeCard.download")}
              </a>
              {VIEWABLE.test(sub.file.originalName) && (
                <a href={fileUrl} target="_blank" rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-[9px] px-3.5 text-[13px] font-semibold text-white" style={{ backgroundColor: "#0e58a8", ...F }}>
                  <Eye className="h-3.5 w-3.5" aria-hidden /> {t("gradeCard.view")}
                </a>
              )}
            </div>
          ) : (
            <p className="rounded-[10px] px-3.5 py-3 text-[13px]" style={{ border: `1px dashed ${LINE}`, color: MUTED, ...F }}>{t("gradeCard.noFile")}</p>
          )}
          {sub.comment && <p className="mt-2 text-[13px] italic" style={{ color: "#445b7a", ...F }}>“{sub.comment}”</p>}
          <div className="mt-4"><Checks plag={plag} maxScore={maxScore} /></div>
        </div>

        {/* O'ng: baho qo'yish */}
        <form className="px-5 py-4" style={{ backgroundColor: "#fbfcff" }} onSubmit={e => { e.preventDefault(); if (!saving && gradeVal) onSave() }}>
          <label className="mb-2 block text-xs font-semibold" style={{ color: MUTED, ...F }} htmlFor={`grade-${sub.id}`}>{t("gradeCard.setGrade")}</label>
          <div className="flex items-end gap-2.5">
            <input id={`grade-${sub.id}`} data-grade-input type="number" inputMode="decimal" min="0" max={maxScore} step="any"
              value={gradeVal} onChange={e => onGrade(e.target.value)} placeholder="—"
              className="h-14 w-28 rounded-[12px] bg-white text-center text-[26px] font-bold focus:outline-none focus:ring-4 focus:ring-[#0e58a8]/15"
              style={{ border: "2px solid #0e58a8", color: INK, ...F }} />
            <span className="pb-3.5 text-[15px]" style={{ color: MUTED, ...F }}>{t("gradeCard.ofMax", { max: maxScore })}</span>
          </div>

          {aiScaled !== null && (
            <button type="button" onClick={() => onGrade(String(aiScaled))}
              className="mt-2.5 flex h-[38px] w-full items-center justify-center gap-2 rounded-[9px] text-[13px] font-semibold transition-colors hover:bg-[#e3edff]"
              style={{ border: "1px dashed #0e58a8", backgroundColor: "#eef4ff", color: "#0e58a8", ...F }}>
              <Check className="h-4 w-4" aria-hidden /> {t("gradeCard.useAi", { n: aiScaled })}
            </button>
          )}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {quickScores(maxScore).map(n => (
              <button key={n} type="button" onClick={() => onGrade(String(n))} aria-label={t("gradeCard.setN", { n })}
                className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors hover:bg-[#eef4ff]"
                style={{ border: `1px solid ${gradeVal === String(n) ? "#0e58a8" : LINE}`, backgroundColor: gradeVal === String(n) ? "#eef4ff" : "#fff", color: INK, ...F }}>
                {n}
              </button>
            ))}
          </div>

          <label className="mb-1.5 mt-4 block text-xs font-semibold" style={{ color: MUTED, ...F }} htmlFor={`fb-${sub.id}`}>{t("baholashPageOq.feedbackLabel")}</label>
          <textarea id={`fb-${sub.id}`} value={feedbackVal} onChange={e => onFeedback(e.target.value)} rows={3}
            placeholder={t("baholashPageOq.feedbackPlaceholder")}
            className="w-full resize-none rounded-[10px] bg-white px-3 py-2.5 text-[13.5px] focus:border-[#0e58a8] focus:outline-none"
            style={{ border: `1px solid ${LINE}`, color: INK, ...F }} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {phrases.map(p => (
              <button key={p} type="button" onClick={() => addPhrase(p)}
                className="rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-[#e3edff]"
                style={{ border: `1px solid ${LINE}`, backgroundColor: "#f6f9ff", color: "#0e58a8", ...F }}>{p}</button>
            ))}
            {ai?.comment && (
              <button type="button" onClick={() => onFeedback(ai.comment!)}
                className="rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-[#e3edff]"
                style={{ border: `1px solid ${LINE}`, backgroundColor: "#f6f9ff", color: "#0e58a8", ...F }}>+ {t("gradeCard.useAiComment")}</button>
            )}
          </div>

          <button type="submit" disabled={saving || !gradeVal}
            className="mt-3.5 h-[46px] w-full rounded-[11px] text-[15px] font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#0e58a8", ...F }}>
            {saving ? t("baholashPageOq.saving") : t("gradeCard.saveNext")}
          </button>
          <p className="mt-2 text-center text-[11.5px]" style={{ color: "#94a3b8", ...F }}>{t("gradeCard.saveHint")}</p>
        </form>
      </div>
    </div>
  )
}
