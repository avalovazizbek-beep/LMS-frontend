import type { SurveyQuestionType, SurveyState } from "@/lib/api"

/* So'rovnomalar moduli uchun umumiy matn va formatlash yordamchilari.
   Interfeys o'zbek tilida (modul talabi). Sana — Intl'siz: Chrome'da
   uz-Latn uchun lokal ma'lumot yo'q ("2026 M10 14" chiqib qoladi). */

const pad = (n: number) => String(n).padStart(2, "0")

/** 18.11.2026 14:30 */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 18.11.2026 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** <input type="datetime-local"> qiymati (mahalliy vaqt) */
export function toLocalInput(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return ""
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** datetime-local qiymatini ISO'ga (mahalliy vaqt sifatida talqin qilinadi) */
export function fromLocalInput(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "" : d.toISOString()
}

/** "3 kun 4 soat qoldi" / "45 daqiqa qoldi" / "Muddati tugagan" */
export function timeLeft(endIso: string, now = Date.now()): string {
  const ms = new Date(endIso).getTime() - now
  if (!Number.isFinite(ms) || ms <= 0) return "Muddati tugagan"
  const min = Math.floor(ms / 60_000)
  const days = Math.floor(min / 1440)
  const hours = Math.floor((min % 1440) / 60)
  const minutes = min % 60
  if (days > 0) return hours > 0 ? `${days} kun ${hours} soat qoldi` : `${days} kun qoldi`
  if (hours > 0) return minutes > 0 ? `${hours} soat ${minutes} daqiqa qoldi` : `${hours} soat qoldi`
  return `${Math.max(1, minutes)} daqiqa qoldi`
}

/** Tugashiga 24 soatdan kam qolganmi (kartada ogohlantirish rangi) */
export function endsSoon(endIso: string, now = Date.now()): boolean {
  const ms = new Date(endIso).getTime() - now
  return ms > 0 && ms < 24 * 3_600_000
}

export const STATE_LABEL: Record<SurveyState, string> = {
  draft: "Qoralama",
  scheduled: "Rejalashtirilgan",
  active: "Faol",
  paused: "To'xtatilgan",
  finished: "Yakunlangan",
  archived: "Arxivda",
}

/** Admin ranglari (admin.css tokenlari) */
export const STATE_COLOR: Record<SurveyState, string> = {
  draft: "var(--adm-muted)",
  scheduled: "var(--role-dean)",
  active: "var(--adm-up)",
  paused: "var(--role-pending)",
  finished: "var(--adm-accent)",
  archived: "var(--role-blocked)",
}

export const QUESTION_TYPE_LABEL: Record<SurveyQuestionType, string> = {
  single: "Bitta javobli",
  multiple: "Bir nechta javobli",
  text: "Ochiq matnli javob",
  scale: "Baholash shkalasi",
  yesno: "Ha / Yo'q",
  rating: "Yulduzli baholash",
}

export const QUESTION_TYPE_HINT: Record<SurveyQuestionType, string> = {
  single: "Variantlardan bittasi tanlanadi",
  multiple: "Bir nechta variant belgilanadi",
  text: "Foydalanuvchi javobni o'zi yozadi",
  scale: "1–5 yoki 1–10 ball",
  yesno: "Ikki javobli savol",
  rating: "1–5 yulduz",
}

export const ROLE_LABEL: Record<string, string> = {
  student: "Talaba",
  employee: "O'qituvchi",
  teacher: "O'qituvchi",
}

export function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0
}

/** Fayl nomi uchun xavfsiz qisqa nom */
export function safeFileName(title: string): string {
  return title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || "sorovnoma"
}

/** Sahifa almashganda bir martalik xabar (masalan "E'lon qilindi") */
const FLASH_KEY = "lms_survey_flash"
export function setFlash(ok: boolean, text: string) {
  try { sessionStorage.setItem(FLASH_KEY, JSON.stringify({ ok, text })) } catch { /* sessionStorage yo'q */ }
}
export function takeFlash(): { ok: boolean; text: string } | null {
  try {
    const raw = sessionStorage.getItem(FLASH_KEY)
    if (!raw) return null
    sessionStorage.removeItem(FLASH_KEY)
    const v = JSON.parse(raw)
    return typeof v?.text === "string" ? { ok: !!v.ok, text: v.text } : null
  } catch {
    return null
  }
}
