import type { JournalData, JournalMiColumn, JournalScale, JournalStudent } from "@/lib/api"

/* Jurnal hisobi (backend services/gradeJournal.ts bilan bir xil):
   Ma'ruza = ON1 + ON2 + ma'ruzadan mustaqil ishlar (/35)
   Amaliyot = JN + amaliyotdan mustaqil ishlar (/35)
   Joriy = Ma'ruza + Amaliyot (/70), Ball = Joriy + Yakuniy (/100), Baho. */

// Jami ball (0-100) shu chegaradan boshlab "o'tgan" hisoblanadi
export const PASS_BALL = 55
const PRACTICE_PART = "Amaliyot"

export function sumOrNull(values: (number | null)[]): number | null {
  const known = values.filter((v): v is number => v !== null)
  return known.length ? known.reduce((a, b) => a + b, 0) : null
}

/** Baho: 86–100 → 5, 71–85 → 4, 55–70 → 3, qolgani → 2 (100 ballikka nisbatan) */
export function bahoOf(ball: number, max: number): number {
  const pct = max > 0 ? (ball / max) * 100 : 0
  return pct >= 86 ? 5 : pct >= 71 ? 4 : pct >= PASS_BALL ? 3 : 2
}

/** 2.4 → "2.4", 3 → "3" */
export function fmtBall(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export interface JournalLayout {
  lectureMi: JournalMiColumn[]
  practiceMi: JournalMiColumn[]
  lectureMax: number
  practiceMax: number
  joriyMax: number
  ballMax: number
  /** Haqiqatan yaratilgan oraliqlar bali (yaratilmagan o'rin hisobga kirmaydi) */
  lectureOnPoints: number
  /** Ma'ruzaning hali oraliq / mustaqil ishga taqsimlanmagan bali */
  lectureFree: number
}

export function journalLayout(
  scale: JournalScale,
  miColumns: JournalMiColumn[],
  periodItems?: JournalData["periodItems"],
): JournalLayout {
  const lectureMi = miColumns.filter(c => c.part !== PRACTICE_PART)
  const practiceMi = miColumns.filter(c => c.part === PRACTICE_PART)
  const lectureMiPoints = lectureMi.reduce((a, c) => a + c.points, 0)
  const lectureMax = scale.lecture ?? scale.on1 + scale.on2 + lectureMiPoints
  const practiceMax = scale.practice ?? scale.jn + practiceMi.reduce((a, c) => a + c.points, 0)
  // Hali yaratilmagan ON o'rni jurnalda eski 17/18 ni ko'rsatadi, lekin
  // "taqsimlangan" hisoblanmaydi
  const lectureOnPoints = periodItems
    ? (periodItems.ON1 ? scale.on1 : 0) + (periodItems.ON2 ? scale.on2 : 0)
    : scale.on1 + scale.on2
  return {
    lectureMi, practiceMi, lectureMax, practiceMax,
    joriyMax: lectureMax + practiceMax,
    ballMax: lectureMax + practiceMax + scale.yn,
    lectureOnPoints,
    lectureFree: Math.max(0, lectureMax - lectureOnPoints - lectureMiPoints),
  }
}

/** Talabaning qism jamlari; on1/on2/yn — jurnalda qo'lda o'zgartirilgan bo'lishi mumkin */
export function studentTotals(
  layout: JournalLayout,
  s: Pick<JournalStudent, "jn" | "miScores">,
  values: { on1: number | null; on2: number | null; yn: number | null },
) {
  const mi = (c: JournalMiColumn) => s.miScores?.[c.id] ?? null
  const lecture = sumOrNull([values.on1, values.on2, ...layout.lectureMi.map(mi)])
  const practice = sumOrNull([s.jn, ...layout.practiceMi.map(mi)])
  const joriy = lecture === null && practice === null ? null : (lecture ?? 0) + (practice ?? 0)
  const ball = joriy === null && values.yn === null ? null : (joriy ?? 0) + (values.yn ?? 0)
  // Baho yakuniy qo'yilgach chiqadi — undan oldingi ball to'liq emas
  const baho = ball === null || values.yn === null ? null : bahoOf(ball, layout.ballMax)
  return { ...values, mi, lecture, practice, joriy, ball, baho }
}
