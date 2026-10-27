import type { TeacherContent } from "@/lib/api"

/* Talabaning "Imtihonlar" va "Nazorat jadvali" sahifalarida mavzusiz
   imtihonlardan tashqari chiqadigan ishlar: topshiriq shaklidagi oraliq
   nazorat va mustaqil ishlar (Fan resurslaridagi "Mustaqil ish" mavzusining
   testi yoki topshirig'i). Savolsiz test talabaga ko'rsatilmaydi. */

export function isMustaqilWork(item: TeacherContent): boolean {
  return !!item.topicKey && /mustaqil/i.test(item.trainingType ?? "") &&
    (item.type === "assignment" || (item.type === "exam" && item.questionCount > 0))
}

export function isControlWork(item: TeacherContent): boolean {
  if (item.type === "assignment" && !item.topicKey && item.controlType === "oraliq") return true
  return isMustaqilWork(item)
}
