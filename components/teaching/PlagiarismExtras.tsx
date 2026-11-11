"use client"

import { useEffect } from "react"
import { Bot, ScanText, FileWarning, Loader2 } from "lucide-react"
import type { PlagiarismResult } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"

/* Antiplagiat natijasiga qo'shimchalar (baholash sahifalari uchun umumiy):
   - matn qayerdan olingani (fayldan / rasmdan o'qilgan / o'qib bo'lmadi);
   - eng o'xshash ish boshqa guruhda bo'lsa — guruh nomi;
   - AI tavsiya: mavzuga moslik va 100 ballik tavsiya baho (faqat tavsiya —
     bahoni o'qituvchi o'zi qo'yadi). AI fonda ishlaydi, shuning uchun
     natija kutilayotgan bo'lsa sahifa o'zi yangilanib turadi. */

const FONT = { fontFamily: "var(--font-poppins)" }

/** AI tavsiyasi hali tayyor bo'lmagan ishlar bo'lsa — har 6 soniyada qayta so'raydi */
export function usePlagAiPolling(results: PlagiarismResult[] | undefined, refetch: () => void) {
  const pending = (results ?? []).some(r => r.ai?.status === "pending")
  useEffect(() => {
    if (!pending) return
    const timer = setInterval(refetch, 6000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending])
}

function gradeColors(grade: number) {
  if (grade >= 70) return { bg: "#f0fdf4", fg: "#15803d" }
  if (grade >= 50) return { bg: "#fff8e6", fg: "#92400e" }
  return { bg: "#fff0f0", fg: "#b91c1c" }
}

/** Ro'yxatdagi qisqa belgi: "AI: 72" / "AI…" / "Rasmdan" */
export function PlagAiBadge({ result, onClick }: { result: PlagiarismResult; onClick?: () => void }) {
  const { t } = useLanguage()
  const ai = result.ai
  const chips: React.ReactNode[] = []
  if (result.textSource === "ocr") {
    chips.push(
      <span key="ocr" title={t("plagx.ocrHint")} className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: "#eef4ff", color: "#0e58a8", ...FONT }}>
        <ScanText className="w-3 h-3" aria-hidden /> {t("plagx.ocrShort")}
      </span>
    )
  } else if (result.textSource === "none") {
    chips.push(
      <span key="none" title={t("plagx.unreadableHint")} className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: "#f1f5f9", color: "#475569", ...FONT }}>
        <FileWarning className="w-3 h-3" aria-hidden /> {t("plagx.unreadableShort")}
      </span>
    )
  }
  if (ai?.status === "pending") {
    chips.push(
      <span key="ai" className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: "#f6f9ff", color: "#7293b9", ...FONT }}>
        <Loader2 className="w-3 h-3 animate-spin" aria-hidden /> {t("plagx.aiPending")}
      </span>
    )
  } else if (ai?.status === "done" && ai.grade !== null) {
    const c = gradeColors(ai.grade)
    chips.push(
      <span key="ai" title={t("plagx.aiHint")} className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: c.bg, color: c.fg, ...FONT }}>
        <Bot className="w-3 h-3" aria-hidden /> {t("plagx.aiShort", { grade: ai.grade })}
      </span>
    )
  }
  if (!chips.length) return null
  return onClick
    ? <button type="button" onClick={onClick} className="inline-flex flex-wrap items-center gap-1 transition-opacity hover:opacity-80">{chips}</button>
    : <span className="inline-flex flex-wrap items-center gap-1">{chips}</span>
}

/** Tafsilot oynasi ichidagi bloklar */
export function PlagExtraDetails({ result }: { result: PlagiarismResult }) {
  const { t } = useLanguage()
  const ai = result.ai
  return (
    <>
      {(result.matchedGroupName || result.textSource === "ocr" || result.textSource === "none") && (
        <div className="flex flex-col gap-1 text-xs" style={{ color: "#445b7a", ...FONT }}>
          {result.matchedGroupName && <p>{t("plagx.otherGroup", { group: result.matchedGroupName })}</p>}
          {result.textSource === "ocr" && <p>{t("plagx.ocrLong", { words: result.wordCount ?? 0 })}</p>}
          {result.textSource === "none" && <p style={{ color: "#92400e" }}>{t("plagx.unreadableLong")}</p>}
        </div>
      )}

      <div className="rounded-[10px] p-4" style={{ backgroundColor: "#f6f9ff", border: "1px solid rgba(14,88,168,0.12)" }}>
        <p className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#012970", ...FONT }}>
          <Bot className="w-4 h-4" aria-hidden /> {t("plagx.aiTitle")}
        </p>
        {!ai ? (
          <p className="text-xs mt-1" style={{ color: "#7293b9", ...FONT }}>{t("plagx.aiNotRun")}</p>
        ) : ai.status === "pending" ? (
          <p className="flex items-center gap-1.5 text-xs mt-1" style={{ color: "#7293b9", ...FONT }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> {t("plagx.aiPendingLong")}
          </p>
        ) : ai.status === "no_text" ? (
          <p className="text-xs mt-1" style={{ color: "#92400e", ...FONT }}>{t("plagx.aiNoText")}</p>
        ) : ai.status === "failed" || ai.grade === null || ai.relevance === null ? (
          <p className="text-xs mt-1" style={{ color: "#92400e", ...FONT }}>{t("plagx.aiFailed")}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: gradeColors(ai.relevance).bg, color: gradeColors(ai.relevance).fg, ...FONT }}>
                {t("plagx.aiRelevance", { pct: ai.relevance })}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: gradeColors(ai.grade).bg, color: gradeColors(ai.grade).fg, ...FONT }}>
                {t("plagx.aiGrade", { grade: ai.grade })}
              </span>
            </div>
            {ai.comment && <p className="text-xs mt-2 leading-5" style={{ color: "#012970", ...FONT }}>{ai.comment}</p>}
          </>
        )}
        <p className="text-[11px] mt-2" style={{ color: "#94a3b8", ...FONT }}>{t("plagx.aiDisclaimer")}</p>
      </div>
    </>
  )
}
