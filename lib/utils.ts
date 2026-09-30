import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/* F.I.Sh. bo'yicha alifbo tartibi — Excel/HEMIS'dagi kabi lotin tartibida
   (O‘/G‘ dagi tutuq belgisi va katta-kichik harf farqi hisobga olinmaydi). */
const nameCollator = new Intl.Collator("en", { sensitivity: "base", ignorePunctuation: true, numeric: true })

export function compareNames(a: string | null | undefined, b: string | null | undefined): number {
  return nameCollator.compare((a ?? "").trim(), (b ?? "").trim())
}

export function sortByName<T>(list: readonly T[], name: (item: T) => string | null | undefined): T[] {
  return [...list].sort((a, b) => compareNames(name(a), name(b)))
}
