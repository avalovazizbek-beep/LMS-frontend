"use client"

import { useRef, useState } from "react"
import {
  Upload, FileText, Loader2, CheckCircle2, AlertCircle, AlertTriangle,
  Download, ClipboardPaste, ChevronDown, ChevronUp, X, Check,
} from "lucide-react"
import type { ExamQuestion } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { tr } from "@/lib/i18n/translations"
import {
  parseTestText, readTestFile, isTextTestFile,
  type ParsedTestFile, type TestSettingKey, type TestLineNote,
} from "@/lib/testImport"

const titleStyle = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const labelStyle = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

export interface ExamSettingsPatch {
  maxScore?: number | null
  durationMinutes?: number | null
  attemptsCount?: number | null
  questionDisplayCount?: number | null
}
export type TestImportMode = "replace" | "append"

const SETTING_KEYS: TestSettingKey[] = ["maxScore", "durationMinutes", "attemptsCount", "questionDisplayCount"]
const MAX_FILE_BYTES = 5 * 1024 * 1024

/* Namuna fayl — o'qituvchi tilida, lekin kalitlar parser taniydigan shaklda */
function downloadSample() {
  const ok = tr("qModal.tpl.correct")
  const bad = tr("qModal.tpl.wrong")
  const content = [
    `// ${tr("testImport.sample.header")}`,
    `// ${tr("qModal.tpl.rule4")}`,
    `// ${tr("qModal.tpl.rule5")}`,
    `// ${tr("qModal.tpl.rule6")}`,
    `// ${tr("qModal.tpl.rule3")}`,
    "",
    `${tr("testImport.sample.score")}: 100`,
    `${tr("testImport.sample.time")}: 15`,
    `${tr("testImport.sample.attempts")}: 2`,
    `${tr("testImport.sample.count")}: 2`,
    "",
    `1. ${tr("qModal.tpl.q1")}`,
    `- ${bad} A`,
    `+ ${ok}`,
    `- ${bad} B`,
    `- ${bad} C`,
    "",
    `2. ${tr("qModal.tpl.q3")}`,
    `+ ${ok} 1`,
    `+ ${ok} 2`,
    `- ${bad} A`,
    "",
  ].join("\n")
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = tr("testImport.sample.fileName")
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Test faylini tortib tashlash / tanlash → tekshirish → yuklash ──
   Fayl boshidagi ball/vaqt/urinish/test soni qatorlari sozlama
   maydonlariga tushadi; bo'lmasa o'qituvchi ularni qo'lda kiritadi. */
export function TestFileImport({
  existingCount, settingsLocked, compact = false, onImport,
}: {
  /** Mavjud testdagi savollar soni (test hali yo'q bo'lsa 0) */
  existingCount: number
  /** Mavzu muddati o'tgan — backend test parametrlarini o'zgartirmaydi */
  settingsLocked: boolean
  /** Testda savollar bor — kichik "fayldan yangilash" zonasi */
  compact?: boolean
  onImport: (questions: ExamQuestion[], settings: ExamSettingsPatch, mode: TestImportMode) => Promise<void>
}) {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [reading, setReading] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [checked, setChecked] = useState<{ source: string; parsed: ParsedTestFile } | null>(null)
  const [showList, setShowList] = useState(true)
  const [mode, setMode] = useState<TestImportMode>("replace")
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState<{ n: number; withSettings: boolean } | null>(null)

  function check(text: string, source: string) {
    setErr(null)
    setDone(null)
    if (!text.trim()) { setErr(t("testImport.empty")); return }
    const parsed = parseTestText(text)
    if (!parsed.questions.length && !parsed.issues.length) { setErr(t("testImport.noneFound")); return }
    setChecked({ source, parsed })
    setShowList(true)
    setPasteOpen(false)
  }

  async function handleFile(file: File) {
    setErr(null)
    setDone(null)
    if (!isTextTestFile(file)) { setErr(t("testImport.notTxt")); return }
    if (file.size > MAX_FILE_BYTES) { setErr(t("testImport.tooLarge")); return }
    setReading(true)
    try {
      check(await readTestFile(file), file.name)
    } catch {
      setErr(t("testImport.readError"))
    } finally {
      setReading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) { handleFile(file); return }
    // Word/brauzerdan belgilangan matnni to'g'ridan-to'g'ri tortib tashlash
    const text = e.dataTransfer.getData("text/plain")
    if (text) check(text, t("testImport.pastedSource"))
  }

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false)
    },
    onDrop: handleDrop,
  }

  const parsed = checked?.parsed
  const appending = mode === "append" && existingCount > 0
  const total = (parsed?.questions.length ?? 0) + (appending ? existingCount : 0)
  const fileSettingKeys = parsed ? SETTING_KEYS.filter(k => parsed.settings[k] !== undefined) : []
  const displayCount = parsed?.settings.questionDisplayCount
  const displayTooMany = displayCount !== undefined && displayCount > total

  function buildPatch(): ExamSettingsPatch {
    if (!parsed || settingsLocked) return {}
    const patch: ExamSettingsPatch = {}
    for (const k of fileSettingKeys) {
      const v = k === "questionDisplayCount" && displayTooMany ? 0 : parsed.settings[k]!
      patch[k] = v || null
    }
    return patch
  }

  async function doImport() {
    if (!parsed?.questions.length) return
    setImporting(true)
    setErr(null)
    try {
      const patch = buildPatch()
      await onImport(parsed.questions, patch, appending ? "append" : "replace")
      setDone({ n: parsed.questions.length, withSettings: Object.keys(patch).length > 0 })
      setChecked(null)
      setPasteText("")
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("testImport.importError"))
    } finally {
      setImporting(false)
    }
  }

  function settingValueText(k: TestSettingKey, v: number) {
    if (k === "maxScore") return String(v || 100)
    if (k === "durationMinutes") return v ? t("fanResurslariOq.test.durationMinutes", { n: v }) : t("fanResurslariOq.test.unlimitedTime")
    if (k === "attemptsCount") return v ? String(v) : t("fanResurslariOq.test.unlimitedAttempts")
    return v && !displayTooMany ? String(v) : t("fanResurslariOq.test.allQuestions", { n: total })
  }

  function noteRef(n: TestLineNote<string>) {
    return n.label
      ? t("testImport.questionLine", { label: n.label, line: n.line })
      : t("testImport.line", { line: n.line })
  }

  /* ── Tekshiruv natijasi ── */
  if (checked && parsed) {
    const okN = parsed.questions.length
    return (
      <div className="flex flex-col gap-3 rounded-[10px] p-4" style={{ border: "1px solid rgba(1,41,112,0.12)", backgroundColor: "#fbfcff" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 shrink-0" style={{ color: "#0e58a8" }} />
            <span className="text-sm font-semibold truncate" style={titleStyle}>{t("testImport.resultTitle")}</span>
            <span className="text-xs truncate" style={labelStyle}>· {checked.source}</span>
          </div>
          <button onClick={() => setChecked(null)} disabled={importing}
            className="p-1 rounded hover:bg-[#eef4ff] transition-colors shrink-0" title={t("mavzularOq.cancel")}>
            <X className="w-4 h-4" style={{ color: "#7293b9" }} />
          </button>
        </div>

        {/* Xulosa */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: okN ? "#f0fdf4" : "#f4f6fa", color: okN ? "#15803d" : "#7293b9", fontFamily: "var(--font-poppins)" }}>
            <CheckCircle2 className="w-3.5 h-3.5" /> {t("testImport.okCount", { n: okN })}
          </span>
          {parsed.issues.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
              <AlertCircle className="w-3.5 h-3.5" /> {t("testImport.errCount", { n: parsed.issues.length })}
            </span>
          )}
          {parsed.warnings.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: "#fff7ed", color: "#c2410c", fontFamily: "var(--font-poppins)" }}>
              <AlertTriangle className="w-3.5 h-3.5" /> {t("testImport.warnCount", { n: parsed.warnings.length })}
            </span>
          )}
        </div>

        {/* Sozlamalar: fayldan yoki qo'lda */}
        <div className="flex flex-col gap-2 rounded-[8px] px-3 py-2.5" style={{ backgroundColor: "#f6f9ff" }}>
          <span className="text-xs font-semibold" style={titleStyle}>{t("testImport.settingsTitle")}</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {SETTING_KEYS.map(k => {
              const v = parsed.settings[k]
              return (
                <div key={k} className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "var(--font-poppins)" }}>
                  {v !== undefined && !settingsLocked
                    ? <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "#16a34a" }} />
                    : <span className="w-3.5 h-3.5 shrink-0 rounded-full" style={{ border: "1.5px solid #c5d4e8" }} />}
                  <span style={labelStyle}>{t(`testImport.key.${k}`)}:</span>
                  {v !== undefined
                    ? <span className="font-medium" style={{ color: "#012970" }}>{settingValueText(k, v)}</span>
                    : <span style={{ color: "#a9bcd6" }}>{t("testImport.notInFile")}</span>}
                </div>
              )
            })}
          </div>
          {settingsLocked && fileSettingKeys.length > 0 && (
            <p className="text-xs" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>{t("testImport.settingsLocked")}</p>
          )}
          {!settingsLocked && displayTooMany && (
            <p className="text-xs" style={{ color: "#c2410c", fontFamily: "var(--font-poppins)" }}>
              {t("testImport.displayTooMany", { n: displayCount!, total })}
            </p>
          )}
          {parsed.settingIssues.map(s => (
            <p key={`${s.line}-${s.key}`} className="text-xs" style={{ color: "#c2410c", fontFamily: "var(--font-poppins)" }}>
              {t("testImport.settingTooBig", { line: s.line, key: t(`testImport.key.${s.key}`), value: s.value, max: s.max })}
            </p>
          ))}
        </div>

        {/* Xatolar va ogohlantirishlar — qator raqami bilan */}
        {(parsed.issues.length > 0 || parsed.warnings.length > 0) && (
          <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
            {parsed.issues.map((n, i) => (
              <div key={`e${i}`} className="flex items-start gap-2 text-xs px-3 py-2 rounded-[6px]"
                style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span><b>{noteRef(n)}</b> — {t(`testImport.issue.${n.code}`)}{n.text ? <span style={{ color: "#9f5b5b" }}> · «{n.text}»</span> : null}</span>
              </div>
            ))}
            {parsed.warnings.map((n, i) => (
              <div key={`w${i}`} className="flex items-start gap-2 text-xs px-3 py-2 rounded-[6px]"
                style={{ backgroundColor: "#fff7ed", color: "#c2410c", fontFamily: "var(--font-poppins)" }}>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span><b>{noteRef(n)}</b> — {t(`testImport.warn.${n.code}`)}{n.text ? <span style={{ color: "#a16207" }}> · «{n.text}»</span> : null}</span>
              </div>
            ))}
          </div>
        )}

        {/* Savollar — o'qituvchi to'g'ri javoblarni ko'zdan kechiradi */}
        {okN > 0 && (
          <div className="flex flex-col gap-2">
            <button onClick={() => setShowList(v => !v)}
              className="flex items-center gap-1.5 text-xs font-medium w-fit" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              {showList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showList ? t("testImport.hideList") : t("testImport.showList", { n: okN })}
            </button>
            {showList && (
              <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
                {parsed.questions.map((q, qi) => {
                  const correct = new Set(q.correctIndexes ?? [q.correctIndex])
                  return (
                    <div key={qi} className="rounded-[8px] bg-white px-3 py-2.5" style={{ border: "1px solid rgba(1,41,112,0.08)" }}>
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-semibold shrink-0 mt-px" style={{ color: "#7c3aed", fontFamily: "var(--font-poppins)" }}>{qi + 1}.</span>
                        <p className="text-sm font-medium leading-snug flex-1" style={titleStyle}>{q.questionText}</p>
                        {correct.size > 1 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: "#fdf4ff", color: "#7c3aed", fontFamily: "var(--font-poppins)" }}>
                            {t("qModal.multiShort")}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 mt-1.5 pl-5">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-start gap-1.5 text-xs" style={{ fontFamily: "var(--font-poppins)" }}>
                            {correct.has(oi)
                              ? <Check className="w-3.5 h-3.5 shrink-0 mt-px" style={{ color: "#16a34a" }} />
                              : <span className="w-3.5 h-3.5 shrink-0" />}
                            <span style={{ color: correct.has(oi) ? "#15803d" : "#445b7a", fontWeight: correct.has(oi) ? 600 : 400 }}>{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {err && (
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-[6px]"
            style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {err}
          </div>
        )}

        {/* Mavjud savollar bilan nima qilish + yuklash */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {existingCount > 0 && okN > 0 && (
            <div className="flex items-center gap-1 p-1 rounded-[8px]" style={{ backgroundColor: "#eef4ff" }}>
              {(["replace", "append"] as TestImportMode[]).map(m => (
                <button key={m} onClick={() => setMode(m)} disabled={importing}
                  className="px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: mode === m ? "#0e58a8" : "transparent",
                    color: mode === m ? "#fff" : "#445b7a",
                    fontFamily: "var(--font-poppins)",
                  }}>
                  {t(m === "replace" ? "testImport.modeReplace" : "testImport.modeAppend", { n: existingCount })}
                </button>
              ))}
            </div>
          )}
          <button onClick={doImport} disabled={importing || okN === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importing ? t("testImport.importing") : t("testImport.importBtn", { n: okN })}
          </button>
          <button onClick={() => inputRef.current?.click()} disabled={importing}
            className="px-3 py-2.5 rounded-[8px] text-sm font-medium bg-white disabled:opacity-60"
            style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {t("testImport.otherFile")}
          </button>
          {parsed.issues.length > 0 && okN > 0 && (
            <span className="text-xs" style={labelStyle}>{t("testImport.skipHint", { n: parsed.issues.length })}</span>
          )}
        </div>
        <input ref={inputRef} type="file" accept=".txt,text/plain" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleFile(f) }} />
      </div>
    )
  }

  /* ── Tortib tashlash zonasi ── */
  return (
    <div className="flex flex-col gap-2">
      {done && (
        <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-[8px]"
          style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="flex-1">
            {t("testImport.done", { n: done.n })}{done.withSettings ? ` ${t("testImport.doneSettings")}` : ""}
          </span>
          <button onClick={() => setDone(null)} className="p-0.5 rounded hover:bg-white/60">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <label {...dropHandlers}
        className={`flex items-center justify-center cursor-pointer transition-colors rounded-[10px] ${compact ? "flex-row gap-2.5 px-4 py-3" : "flex-col gap-2 py-8 px-4 text-center"}`}
        style={{
          border: `2px dashed ${dragOver ? "#0e58a8" : "rgba(1,41,112,0.22)"}`,
          backgroundColor: dragOver ? "#f0f5ff" : "#f8fafc",
        }}>
        {reading ? (
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} />
        ) : compact ? (
          <Upload className="w-4 h-4 shrink-0" style={{ color: "#0e58a8" }} />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#eef4ff" }}>
            <Upload className="w-5 h-5" style={{ color: "#0e58a8" }} />
          </div>
        )}
        {compact ? (
          <span className="text-sm font-medium" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {t("testImport.dropCompact")}
          </span>
        ) : (
          <>
            <span className="text-sm font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              {t("testImport.dropTitle")}
            </span>
            <span className="text-xs max-w-md" style={{ color: "#a9bcd6", fontFamily: "var(--font-poppins)" }}>
              {t("testImport.dropHint")}
            </span>
          </>
        )}
        <input ref={inputRef} type="file" accept=".txt,text/plain" className="hidden" disabled={reading}
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleFile(f) }} />
      </label>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => { setPasteOpen(v => !v); setErr(null) }}
          className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <ClipboardPaste className="w-3.5 h-3.5" /> {t("testImport.pasteText")}
        </button>
        <button onClick={downloadSample}
          className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <Download className="w-3.5 h-3.5" /> {t("testImport.downloadSample")}
        </button>
      </div>

      {pasteOpen && (
        <div className="flex flex-col gap-2">
          <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} autoFocus
            className="w-full px-3 py-2.5 rounded-[8px] text-xs border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none transition-colors"
            style={{ fontFamily: "monospace", minHeight: 180, resize: "vertical", color: "#012970" }}
            placeholder={t("testImport.pastePh")} />
          <button onClick={() => check(pasteText, t("testImport.pastedSource"))} disabled={!pasteText.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-medium w-fit text-white disabled:opacity-50"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            <FileText className="w-4 h-4" /> {t("testImport.check")}
          </button>
        </div>
      )}

      {err && (
        <div className="flex items-start gap-2 text-xs px-3 py-2 rounded-[6px]"
          style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> {err}
        </div>
      )}
    </div>
  )
}
