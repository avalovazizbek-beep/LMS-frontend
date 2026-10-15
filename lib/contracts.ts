import type { HemisContractItem } from "@/lib/api"

/* HEMIS talabaning barcha o'quv yillari shartnomalarini qaytaradi va
   eng ESKISI birinchi keladi (masalan 2023-2024 → 2024-2025 → 2025).
   Avval sahifa birinchisini ko'rsatardi — joriy yil uchun to'lagan talaba
   o'tgan yilgi raqamlarni ko'rib, "to'lovim ko'rinmayapti" derdi. */

/** O'quv yilining BOSHLANISH yili. HEMIS ikki xil yozadi: "2023-2024 o`quv
    yili" (oraliq) va "2025" (faqat boshlanishi = 2025-2026). Kattasini olsak
    "2024-2025" va "2025" teng chiqib qolardi — shuning uchun eng kichigi. */
export function contractYear(item: HemisContractItem): number {
  const years = String(item._data?.eduYear ?? "").match(/\d{4}/g)
  return years ? Math.min(...years.map(Number)) : 0
}

/** Eng yangi (joriy) shartnoma birinchi */
export function sortContractsNewestFirst(items: HemisContractItem[]): HemisContractItem[] {
  return [...items].sort((a, b) =>
    contractYear(b) - contractYear(a) ||
    (Number(b.updated_at) || 0) - (Number(a.updated_at) || 0) ||
    (Number(b.id) || 0) - (Number(a.id) || 0)
  )
}

/** HEMIS yozuvining oxirgi yangilanishi (unix soniya) → 15.10.2026 05:25 */
export function fmtHemisStamp(unix?: number | null): string | null {
  if (!unix) return null
  const d = new Date(unix * 1000)
  if (Number.isNaN(d.getTime())) return null
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}
