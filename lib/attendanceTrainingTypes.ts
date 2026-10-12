/* Davomat varag'i mashg'ulot turi bo'yicha ajratiladi: bir kunda bitta
   guruh/fanga ma'ruza ham, amaliy ham bo'lsa — ikkalasiga alohida davomat.
   Qiymatlar backend'dagi normalizeTrainingType bilan bir xil. */
export const ATTENDANCE_TRAINING_TYPES = [
  { value: "Ma'ruza", labelKey: "xodimFanResurslariYaratish.trainingType.lecture" },
  { value: "Amaliy", labelKey: "xodimFanResurslariYaratish.trainingType.practice" },
  { value: "Laboratoriya", labelKey: "xodimFanResurslariYaratish.trainingType.laboratory" },
  { value: "Seminar", labelKey: "xodimFanResurslariYaratish.trainingType.seminar" },
  { value: "Mustaqil ta'lim", labelKey: "xodimFanResurslariYaratish.trainingType.independentStudy" },
] as const

const ALIASES: [RegExp, string][] = [
  [/ma'?ruza|lecture|лекц|маъруза/, "Ma'ruza"],
  [/amaliy|practic|практ|амалий/, "Amaliy"],
  [/laborator|лаборат/, "Laboratoriya"],
  [/seminar|семинар/, "Seminar"],
  [/mustaqil|independent|самостоят|мустақил/, "Mustaqil ta'lim"],
]

/** HEMIS/URL'dan kelgan nomni ("Ma’ruza", "Amaliy mashg'ulot") ro'yxatdagi qiymatga keltiradi. */
export function normalizeTrainingType(raw: string | null | undefined): string {
  const text = raw?.trim() ?? ""
  if (!text) return ""
  const key = text.toLowerCase().replace(/[‘’ʻʼ`´']/g, "'")
  for (const [pattern, name] of ALIASES) {
    if (pattern.test(key)) return name
  }
  return text
}

/** Ko'rsatish uchun tarjima kaliti (ro'yxatda bo'lmasa — null, nomning o'zi ko'rsatiladi). */
export function trainingTypeLabelKey(value: string | null | undefined): string | null {
  return ATTENDANCE_TRAINING_TYPES.find((o) => o.value === value)?.labelKey ?? null
}
