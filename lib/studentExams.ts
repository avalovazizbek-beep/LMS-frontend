import { teachingApi, type TeacherContent, type MySubmissionLite } from "@/lib/api"
import { isControlWork, MUSTAQIL_CONTROL } from "@/lib/controlWork"

/** Imtihonlar sahifasi ma'lumotni yangilaganda — yon paneldagi son ham
    yangilanadi (detail: topshirilmagan ishlar soni) */
export const EXAMS_CHANGED_EVENT = "lms:exams-changed"

/** Imtihonlar sahifasidagi ro'yxat: mavzusiz testlar + topshiriq shaklidagi
    oraliqlar + mustaqil ishlar (test/topshiriq) */
export function isExamBoardItem(e: TeacherContent): boolean {
  return (e.type === "exam" && !e.topicKey && e.controlType !== MUSTAQIL_CONTROL) || isControlWork(e)
}

export interface ExamBoard {
  items: TeacherContent[]
  /** contentId → talabaning o'z ishi */
  subs: Map<number, MySubmissionLite>
}

export async function loadExamBoard(): Promise<ExamBoard> {
  const [a, b] = await Promise.all([teachingApi.content({ type: "exam" }), teachingApi.content({ type: "assignment" })])
  const items = [...(a.data ?? []), ...(b.data ?? [])].filter(isExamBoardItem)
  const subs = new Map<number, MySubmissionLite>()
  if (items.length) {
    const res = await teachingApi.mySubmissions(items.map((i) => i.id))
    for (const s of res.data ?? []) subs.set(s.contentId, s)
  }
  return { items, subs }
}

/** Talaba hozir topshira / yecha oladimi: ochiq yoki (muddat o'tgan bo'lsa)
    mavzu qayta ochilgan yoki admin qayta urinish bergan */
export function canActNow(item: TeacherContent, sub?: MySubmissionLite): boolean {
  if (item.status === "open") return true
  return item.status === "closed" && (item.isReopened === true || item.retakeGranted === true || sub?.retakeGranted === true)
}

/** Kartadagi holat:
    upcoming — hali ochilmagan; todo — topshirish kerak; checking — topshirilgan,
    baho kutilmoqda; graded — baholangan; missed — muddat o'tgan, topshirilmagan */
export type BoardStatus = "upcoming" | "todo" | "checking" | "graded" | "missed"

export function boardStatus(item: TeacherContent, sub?: MySubmissionLite): BoardStatus {
  if (item.status === "locked") return "upcoming"
  if (sub) return sub.grade != null ? "graded" : "checking"
  return canActNow(item, sub) ? "todo" : "missed"
}

export type ExamKind = "oraliq" | "mustaqil" | "yakuniy" | "test"

export function examKind(item: TeacherContent): ExamKind {
  if (item.controlType === "oraliq") return "oraliq"
  if (item.controlType === MUSTAQIL_CONTROL) return "mustaqil"
  if (item.controlType === "yakuniy") return "yakuniy"
  return "test"
}

/** Yon paneldagi "Imtihonlar" yonidagi son — topshirish kerak bo'lgan ishlar */
export function todoCount(board: ExamBoard): number {
  return board.items.filter((i) => boardStatus(i, board.subs.get(i.id)) === "todo").length
}
