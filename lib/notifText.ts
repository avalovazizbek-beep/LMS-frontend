import type { Notif } from "@/lib/api"

type TFunc = (key: string, params?: Record<string, string | number>) => string

/** Backend kalit yuborgan bo'lsa — tanlangan tilda, aks holda saqlangan (o'zbekcha) matn. */
function translated(t: TFunc, n: Notif, part: "title" | "body", fallback: string): string {
  if (!n.i18nKey) return fallback
  const key = `notif.${n.i18nKey}.${part}`
  const text = t(key, n.i18nParams ?? undefined)
  return text !== key ? text : fallback
}

export function notifTitle(t: TFunc, n: Notif): string {
  return translated(t, n, "title", n.title)
}

export function notifBody(t: TFunc, n: Notif): string {
  return translated(t, n, "body", n.body)
}

export function notifTime(n: Notif, locale: string): string {
  const d = new Date(n.time)
  return Number.isNaN(d.getTime())
    ? n.time
    : d.toLocaleString(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}
