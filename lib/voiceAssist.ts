/* Ovozli yordamchi — maxsus ehtiyojli (ko'zi ojiz / zaif ko'ruvchi) talaba uchun
   sayt o'zi gapiradi: sahifa nomi, sichqoncha/barmoq/Tab tekkan element, test
   savoli va variantlari (components/layout/VoiceAssist.tsx, imtihon sahifasi).

   Ovoz — serverdan keladigan tabiiy neyron ovoz (POST /api/tts → MP3; backend
   services/ttsService.ts, uz-UZ-MadinaNeural): hamma brauzer va telefonda bir
   xil chiqadi. Server ovoz bera olmasa (internet yo'q, xizmat o'zgargan) —
   brauzerning o'z ovozi (Web Speech API) ishlatiladi; u o'zbekchani yomon
   o'qiydi, shuning uchun faqat zaxira. */

import type { Lang } from "@/lib/i18n/translations"

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
const STORAGE_KEY = "lms_voice_assist"
const MAX_CHARS = 480
const CACHE_LIMIT = 300

let active = false
let lang: Lang = "uz"

/** Har bir yangi speak(interrupt) — yangi avlod: eski so'rov va navbat bekor bo'ladi */
let generation = 0
let player: HTMLAudioElement | null = null
let chain: Promise<void> = Promise.resolve()
/** Hali aytib bo'linmagan bo'laklar soni */
let pendingParts = 0
/** Server ovozi ketma-ket ishlamasa — bir muddat brauzer ovoziga o'tiladi */
let serverDownUntil = 0
let serverFailures = 0

/** matn → MP3 (object URL). Menyu va tugma nomlari qayta yuklanmaydi */
const cache = new Map<string, string>()
const pending = new Map<string, Promise<string | null>>()

export function voiceSupported(): boolean {
  return typeof window !== "undefined" && typeof Audio !== "undefined"
}

export function setVoiceActive(on: boolean) {
  active = on && voiceSupported()
  if (!active) stopSpeaking()
}

export function isVoiceActive(): boolean {
  return active
}

export function setVoiceLang(next: Lang) {
  lang = next
}

/** Talaba o'chirib qo'ygan bo'lsa — eslab qolinadi (shu brauzerda) */
export function voiceMuted(): boolean {
  try { return window.localStorage.getItem(STORAGE_KEY) === "off" } catch { return false }
}
export function setVoiceMuted(muted: boolean) {
  try { window.localStorage.setItem(STORAGE_KEY, muted ? "off" : "on") } catch { /* private rejim */ }
}

/** Server ovozi hozir ishlamayaptimi (zaxira — brauzer ovozi) */
export function usingFallbackVoice(): boolean {
  return Date.now() < serverDownUntil
}

export function stopSpeaking() {
  generation += 1
  pendingParts = 0
  chain = Promise.resolve()
  if (player) { player.pause(); player.removeAttribute("src"); player = null }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel()
}

/** Uzun matn gaplarga bo'linadi: birinchi gap tez boshlanadi, qolgani navbatda */
function chunks(text: string): string[] {
  const parts = text.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]*/g) ?? []
  const out: string[] = []
  for (const p of parts) {
    const s = p.trim()
    if (!s || !/[\p{L}\p{N}]/u.test(s)) continue
    const last = out[out.length - 1]
    if (last && last.length + s.length < 220) out[out.length - 1] = `${last} ${s}`
    else out.push(s.slice(0, MAX_CHARS))
  }
  return out
}

function fetchAudio(text: string): Promise<string | null> {
  const key = `${lang}\n${text}`
  const cached = cache.get(key)
  if (cached) return Promise.resolve(cached)
  const running = pending.get(key)
  if (running) return running
  if (usingFallbackVoice()) return Promise.resolve(null)

  let token: string | null = null
  try { token = window.localStorage.getItem("lms_token") } catch { /* storage yopiq */ }
  const job = fetch(`${BASE}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ text, lang }),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(String(res.status))
      const url = URL.createObjectURL(await res.blob())
      if (cache.size >= CACHE_LIMIT) {
        const oldest = cache.keys().next().value as string
        URL.revokeObjectURL(cache.get(oldest)!)
        cache.delete(oldest)
      }
      cache.set(key, url)
      serverFailures = 0
      return url
    })
    .catch(() => {
      // Ketma-ket 3 ta xato — 2 daqiqa brauzer ovozida (har gapda kutib qolmaslik uchun)
      serverFailures += 1
      if (serverFailures >= 3) { serverDownUntil = Date.now() + 120_000; serverFailures = 0 }
      return null
    })
    .finally(() => pending.delete(key))
  pending.set(key, job)
  return job
}

function playUrl(url: string, gen: number): Promise<void> {
  return new Promise((resolve) => {
    if (gen !== generation) { resolve(); return }
    const audio = new Audio(url)
    player = audio
    const done = () => { if (player === audio) player = null; resolve() }
    audio.onended = done
    audio.onerror = done
    audio.onpause = done
    // Sahifaga hali tegilmagan bo'lsa brauzer ovozni bloklaydi — jim o'tib ketamiz
    audio.play().catch(done)
  })
}

/** Zaxira: brauzerning o'z ovozi */
function speakWithBrowser(text: string, gen: number): Promise<void> {
  return new Promise((resolve) => {
    if (gen !== generation || !("speechSynthesis" in window)) { resolve(); return }
    const u = new SpeechSynthesisUtterance(text)
    const prefixes = lang === "ru" ? ["ru"] : lang === "en" ? ["en"] : ["uz", "tr", "ru"]
    const voices = window.speechSynthesis.getVoices()
    for (const p of prefixes) {
      const v = voices.find(x => x.lang.toLowerCase().startsWith(p))
      if (v) { u.voice = v; u.lang = v.lang; break }
    }
    u.onend = () => resolve()
    u.onerror = () => resolve()
    window.speechSynthesis.speak(u)
  })
}

/**
 * Matnni ovoz chiqarib o'qish. interrupt (standart) — oldingi gap to'xtatiladi;
 * false — navbatga qo'shiladi (masalan "Bosildi" savolni kesmasin).
 */
export function speak(text: string, opts: { interrupt?: boolean; force?: boolean } = {}) {
  // force — ovozli yordamchi yoqilmagan bo'lsa ham (o'qituvchi AI yordamchisining javobi)
  if ((!active && !opts.force) || !voiceSupported() || !text.trim()) return
  if (opts.interrupt !== false) stopSpeaking()
  const gen = generation
  const parts = chunks(forSpeech(text))
  // Hamma bo'lak darhol so'raladi (parallel), lekin tartib bilan chalinadi
  const audio = parts.map(p => fetchAudio(p))
  pendingParts += parts.length
  parts.forEach((part, i) => {
    chain = chain.then(async () => {
      try {
        if (gen !== generation) return
        const url = await audio[i]
        if (gen !== generation) return
        if (url) await playUrl(url, gen)
        else await speakWithBrowser(part, gen)
      } finally {
        if (gen === generation) pendingParts = Math.max(0, pendingParts - 1)
      }
    })
  })
}

/** Hozir gapiryaptimi (ovoz bilan chaqirish o'z ovozini "eshitib" qolmasligi uchun) */
export function isSpeaking(): boolean {
  return pendingParts > 0
}

/**
 * Matnni o'qishga tayyorlash: ovoz qisqartmalarni harflab yoki noto'g'ri o'qiydi
 * ("ON" → "on", "YN" → "in"), belgilarni esa nomi bilan aytadi. Ekrandagi matn
 * o'zgarmaydi — faqat ovozga ketadigan nusxa.
 */
export function forSpeech(text: string): string {
  if (lang === "ru" || lang === "en") return text.replace(/[⛔⚠✓✗•«»]/g, " ")
  return text
    // Belgilar
    .replace(/⛔/g, " Muammo: ").replace(/⚠/g, " Eslatma: ").replace(/✓/g, " bor: ").replace(/✗/g, " yo'q: ")
    .replace(/[•«»"“”]/g, " ").replace(/\s[—–-]\s/g, ", ").replace(/·/g, ", ")
    // Oraliq nazoratlar: ON1, ON 2, 1-ON, 2-on
    .replace(/\bON\s?1\b|\b1-?\s?ON\b|\b1-on\b/g, "birinchi oraliq nazorat")
    .replace(/\bON\s?2\b|\b2-?\s?ON\b|\b2-on\b/g, "ikkinchi oraliq nazorat")
    .replace(/\bON\b/g, "oraliq nazorat")
    .replace(/\bYN\b/g, "yakuniy nazorat")
    .replace(/\bJN\b/g, "joriy nazorat")
    .replace(/\bMI\b/g, "mustaqil ish")
    .replace(/\bLMS\b/g, "el em es")
    .replace(/\bHEMIS\b/g, "Hemis")
    .replace(/\bPDF\b/gi, "pe de ef")
    .replace(/\bFace ID\b/gi, "feys ay di")
    .replace(/\bAI\b/g, "sun'iy intellekt")
    // Sonlar va belgilar
    .replace(/\s=\s/g, " teng ").replace(/\s\+\s/g, " qo'shuv ")
    .replace(/(\d+)\s?%/g, "$1 foiz")
    .replace(/(\d+)\s?\/\s?(\d+)/g, "$2 dan $1")
    // Ro'yxat raqamlari: "1) " → "birinchi." kabi emas, shunchaki pauza
    .replace(/(^|\n)\s*(\d+)\)\s/g, "$1$2. ")
    .replace(/[ \t]{2,}/g, " ")
}
