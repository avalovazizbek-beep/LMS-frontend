import type { TeacherContent } from "@/lib/api"

/* Talabaning "Imtihonlar" va "Nazorat jadvali" sahifalarida mavzusiz
   imtihonlardan tashqari chiqadigan ishlar: topshiriq shaklidagi oraliq
   nazorat va mustaqil ishlar. Mustaqil ish Nazoratlar bo'limida (oraliq
   bilan bir joyda) yaratiladi — control_type "mustaqil"; avval Fan
   resurslaridagi "Mustaqil ish" mavzusida yaratilganlari ham hisobga
   olinadi. Savolsiz test talabaga ko'rsatilmaydi. */

/** Mustaqil ish nazorati (backend periodGrades.MUSTAQIL_CONTROL bilan bir xil) */
export const MUSTAQIL_CONTROL = "mustaqil"

export function isMustaqilWork(item: TeacherContent): boolean {
  const takeable = item.type === "assignment" || (item.type === "exam" && item.questionCount > 0)
  if (!takeable) return false
  if (item.controlType === MUSTAQIL_CONTROL) return true
  return !!item.topicKey && /mustaqil/i.test(item.trainingType ?? "")
}

export function isControlWork(item: TeacherContent): boolean {
  if (item.type === "assignment" && !item.topicKey && item.controlType === "oraliq") return true
  return isMustaqilWork(item)
}
