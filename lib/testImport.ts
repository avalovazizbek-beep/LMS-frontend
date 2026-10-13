/* ── Test faylini (.txt yoki joylangan matn) tahlil qilish ────────────────
   Format (o'qituvchilar Word/Notepad'da yozadigan ko'rinish):

     ball: 100            ← ixtiyoriy sozlamalar (fayl boshida)
     vaqt: 15
     urinish: 2
     test soni: 10

     1. Savol matni?
     @https://.../rasm.png  ← ixtiyoriy savol rasmi (variantlardan oldin)
     - noto'g'ri variant
     + to'g'ri variant

   Bo'sh qatorlar shart emas va ortiqchasi ham buzmaydi (Word'dan ikki
   oraliq bilan nusxalangan matn): raqamli qator ("5. ...") yoki
   variantlardan keyin kelgan oddiy qator yangi savol boshlaydi. Xato
   savollar o'tkazib yuboriladi va qator raqami bilan ko'rsatiladi. */

import type { ExamQuestion } from "@/lib/api"

export interface TestFileSettings {
  maxScore?: number
  durationMinutes?: number
  attemptsCount?: number
  questionDisplayCount?: number
}
export type TestSettingKey = keyof TestFileSettings

export type TestQuestionIssueCode =
  | "noText"          // variantlar bor, savol matni yo'q
  | "noOptions"       // savol matni bor, variant yo'q
  | "fewOptions"      // bitta variant
  | "noCorrect"       // "+" belgili variant yo'q
export type TestWarningCode =
  | "duplicateOption"   // bir savolda ikkita bir xil variant
  | "duplicateQuestion" // savol fayl ichida takrorlangan
  | "allCorrect"        // barcha variantlar "+"

export interface TestLineNote<C extends string> {
  line: number      // savol boshlangan qator (1 dan)
  label: string | null  // fayldagi savol raqami ("5"), raqamsiz bo'lsa null
  text: string      // savol matnidan parcha
  code: C
}
export type TestQuestionIssue = TestLineNote<TestQuestionIssueCode>
export type TestWarning = TestLineNote<TestWarningCode>

export interface TestSettingIssue {
  line: number
  key: TestSettingKey
  value: string
  max: number
}

export interface ParsedTestFile {
  settings: TestFileSettings
  questions: ExamQuestion[]
  issues: TestQuestionIssue[]
  warnings: TestWarning[]
  settingIssues: TestSettingIssue[]
}

/* Sozlama maydonlari bilan bir xil chegaralar (fan-resurslari inputlari) */
export const TEST_SETTING_MAX: Record<TestSettingKey, number> = {
  maxScore: 1000,
  durationMinutes: 300,
  attemptsCount: 10,
  questionDisplayCount: 9999,
}

/* Kalitlar normalize qilingan holda: kichik harf, apostroflarsiz, qavs
   ichidagisiz ("Maks ball (0 = 100)" → "maks ball"). Uz/uz-kirill/ru/en/kaa. */
const SETTING_ALIASES: Record<string, TestSettingKey> = {}
function alias(key: TestSettingKey, names: string[]) {
  for (const n of names) SETTING_ALIASES[n] = key
}
alias("maxScore", [
  "ball", "bal", "maks ball", "max ball", "maksimal ball", "umumiy ball", "jami ball",
  "балл", "бал", "макс балл", "максимал балл", "максимальный балл",
  "score", "max score", "maximum score", "points",
])
alias("durationMinutes", [
  "vaqt", "vaqti", "test vaqti", "davomiylik", "daqiqa",
  "вақт", "вақти", "тест вақти", "время", "длительность", "минут",
  "time", "duration", "minutes", "waqıt",
])
alias("attemptsCount", [
  "urinish", "urinishlar", "urinish soni", "urinishlar soni",
  "urunish", "urunishlar", "urunish soni", "urunishlar soni",
  "уриниш", "уринишлар", "уриниш сони", "уринишлар сони",
  "попытки", "попытка", "попыток", "количество попыток",
  "attempts", "attempt", "urınıw", "urınıwlar sanı",
])
alias("questionDisplayCount", [
  "test soni", "testlar soni", "savol soni", "savollar soni",
  "тест сони", "тестлар сони", "савол сони", "саволлар сони",
  "количество вопросов", "вопросов", "число вопросов",
  "questions", "question count", "number of questions",
  "soraw sanı", "sorawlar sanı",
])

const APOSTROPHES = /['ʻʼ’‘`´]/g
function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(APOSTROPHES, "")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim()
}

const UNLIMITED = /^(cheksiz|чексиз|sheksiz|без ограничений|безлимит|неограниченно|unlimited)$/i
/* "15", "15 daqiqa", "100 ball", "2 marta", "10 ta" → son; "cheksiz" → 0.
   Faqat son + bitta birlik so'zi — "Vaqt: 2 soat necha daqiqa?" kabi savol
   sozlama deb olinmasligi uchun. */
function settingValue(raw: string): number | null {
  const v = raw.trim().replace(/[.;,]+$/, "")
  if (UNLIMITED.test(v)) return 0
  const m = v.match(/^(\d{1,5})(?:\s*[\p{L}'ʻʼ’]+\.?)?$/u)
  return m ? Number(m[1]) : null
}

/* "+ variant" → to'g'ri; "- variant" (Word'dan "–"/"—" ham) → noto'g'ri */
const OPTION_LINE = /^([+\-–—])\s*(.*)$/
/* "5. Savol", "5) Savol", "5.Savol" — savol raqami ("2.5 ga teng" emas) */
const NUMBERED = /^(\d{1,4})\s*[.)]\s*(?!\d)(.*)$/
/* Variant oldidagi "A) " belgisi — talabaga variantlar aralashtirib
   ko'rsatiladi, harf qolib ketmasligi kerak. ("A. Navoiy" kabi bosh
   harflarga tegmaslik uchun faqat qavsli shakl.) */
const OPTION_LETTER = /^[A-Fa-fА-Еа-е]\)\s+/
const SETTING_LINE = /^([^:=]{2,40}?)\s*[:=]\s*(.+)$/

interface Block {
  line: number
  label: string | null
  textParts: string[]
  imageUrl: string
  options: { text: string; correct: boolean }[]
}

export function parseTestText(input: string): ParsedTestFile {
  const lines = input.replace(/^﻿/, "").split(/\r\n|\r|\n/)
  const settings: TestFileSettings = {}
  const settingIssues: TestSettingIssue[] = []
  const blocks: Block[] = []
  let cur: Block | null = null
  let blankAfter = false

  const flush = (b: Block | null) => {
    if (b && (b.textParts.length || b.options.length || b.imageUrl)) blocks.push(b)
  }
  const start = (line: number, label: string | null = null): Block => {
    flush(cur)
    return { line, label, textParts: [], imageUrl: "", options: [] }
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNo = idx + 1
    const line = lines[idx].replace(/ /g, " ").trim()
    if (!line) { if (cur) blankAfter = true; continue }
    if (line.startsWith("//") || line.startsWith("#")) continue
    const afterBlank = blankAfter
    blankAfter = false

    const opt = line.match(OPTION_LINE)
    if (opt) {
      if (!cur) cur = start(lineNo)
      cur.options.push({ text: opt[2].replace(OPTION_LETTER, "").trim(), correct: opt[1] === "+" })
      continue
    }

    // Sozlama qatori — savollar orasida (savol matni yozilayotgan paytda
    // emas), aks holda "Urinish: ..." bilan boshlangan savol buzilardi.
    if (!cur || cur.options.length || afterBlank) {
      // "Maks ball (0 = 100): 150" — qavs ichidagi "=" ajratuvchi emas
      const kv = line.replace(/\([^)]*\)/g, " ").match(SETTING_LINE)
      const key = kv ? SETTING_ALIASES[normalizeKey(kv[1])] : undefined
      const value = kv && key ? settingValue(kv[2]) : null
      if (kv && key && value !== null) {
        flush(cur)
        cur = null
        if (value > TEST_SETTING_MAX[key]) {
          settingIssues.push({ line: lineNo, key, value: kv[2].trim(), max: TEST_SETTING_MAX[key] })
        } else {
          settings[key] = value
        }
        continue
      }
    }

    if (line.startsWith("@") && cur && !cur.options.length) {
      cur.imageUrl = line.slice(1).trim()
      continue
    }

    const num = line.match(NUMBERED)
    if (num) {
      cur = start(lineNo, num[1])
      if (num[2].trim()) cur.textParts.push(num[2].trim())
      continue
    }

    // Variantlardan keyin kelgan raqamsiz qator — yangi savol; aks holda
    // ko'p qatorli savol matnining davomi.
    if (!cur || cur.options.length) cur = start(lineNo)
    cur.textParts.push(line)
  }
  flush(cur)

  const questions: ExamQuestion[] = []
  const issues: TestQuestionIssue[] = []
  const warnings: TestWarning[] = []
  const seenQuestions = new Set<string>()
  const norm = (s: string) => s.toLowerCase().replace(APOSTROPHES, "").replace(/\s+/g, " ").trim()

  for (const b of blocks) {
    const questionText = b.textParts.join(" ").replace(/\s+/g, " ").trim()
    const options = b.options.filter(o => o.text)
    const shown = questionText || options[0]?.text || ""
    const base = { line: b.line, label: b.label, text: shown.length > 90 ? `${shown.slice(0, 90)}…` : shown }

    let code: TestQuestionIssueCode | null = null
    if (!questionText) code = "noText"
    else if (!options.length) code = "noOptions"
    else if (options.length < 2) code = "fewOptions"
    else if (!options.some(o => o.correct)) code = "noCorrect"
    if (code) { issues.push({ ...base, code }); continue }

    if (new Set(options.map(o => norm(o.text))).size < options.length) warnings.push({ ...base, code: "duplicateOption" })
    if (options.every(o => o.correct)) warnings.push({ ...base, code: "allCorrect" })
    const qKey = norm(questionText)
    if (seenQuestions.has(qKey)) warnings.push({ ...base, code: "duplicateQuestion" })
    seenQuestions.add(qKey)

    const correctIndexes = options.map((o, i) => (o.correct ? i : -1)).filter(i => i >= 0)
    questions.push({
      questionText,
      imageUrl: b.imageUrl || null,
      options: options.map(o => o.text),
      correctIndex: correctIndexes[0],
      correctIndexes,
      points: 1,
    })
  }

  return { settings, questions, issues, warnings, settingIssues }
}

/* Fayl kodirovkasi: UTF-8 (Notepad standarti), UTF-16 ("Unicode" bilan
   saqlangan) yoki eski Windows-1251 (kirill) — aks holda "ʻ" va kirill
   harflari "�" bo'lib chiqardi. */
export async function readTestFile(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer())
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder("utf-16le").decode(buf)
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder("utf-16be").decode(buf)
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder("windows-1251").decode(buf)
  }
}

export function isTextTestFile(file: File): boolean {
  return /\.txt$/i.test(file.name) || file.type === "text/plain"
}
