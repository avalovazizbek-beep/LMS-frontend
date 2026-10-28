import type { TeacherContent } from "@/lib/api"

/* Talabaning "Imtihonlar" va "Nazorat jadvali" sahifalarida mavzusiz
   imtihonlardan tashqari chiqadigan ishlar: topshiriq shaklidagi oraliq
   nazorat va mustaqil ishlar. Mustaqil ish Nazoratlar bo'limida (oraliq
   bilan bir joyda) yaratiladi — control_type "mustaqil". Fan resurslaridagi
   eski "Mustaqil ish" mavzulari bu yerga kirmaydi (ma'ruzaga yoki amaliyotga
   tegishli ekani noma'lum — o'qituvchi kerak bo'lsa qayta yaratadi). Savolsiz
   test talabaga ko'rsatilmaydi. */

/** Mustaqil ish nazorati (backend periodGrades.MUSTAQIL_CONTROL bilan bir xil) */
export const MUSTAQIL_CONTROL = "mustaqil"

export function isMustaqilWork(item: TeacherContent): boolean {
  if (item.controlType !== MUSTAQIL_CONTROL || item.topicKey) return false
  return item.type === "assignment" || (item.type === "exam" && item.questionCount > 0)
}

export function isControlWork(item: TeacherContent): boolean {
  if (item.type === "assignment" && !item.topicKey && item.controlType === "oraliq") return true
  return isMustaqilWork(item)
}
