"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { Volume2, VolumeX } from "lucide-react"
import { teachingApi } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import {
  usingFallbackVoice, setVoiceActive, setVoiceLang, setVoiceMuted, speak, stopSpeaking, voiceMuted, voiceSupported,
} from "@/lib/voiceAssist"

/* Ovozli yordamchi (lib/voiceAssist.ts) — faqat admin "maxsus ehtiyojli" deb
   belgilagan talabada ishlaydi. Sayt o'zi gapiradi:
     - sahifa ochilganda — sahifa nomi;
     - sichqoncha, barmoq yoki Tab tekkan element — nomi va turi (tugma, havola...);
     - bosilganda — "bosildi".
   Escape — gapni to'xtatadi. Pastki chap burchakdagi tugma — yoqish/o'chirish. */

const INTERACTIVE = "button, a[href], input, select, textarea, summary, [role=button], [role=link], [role=tab], [role=menuitem]"
const READABLE = `${INTERACTIVE}, label, h1, h2, h3, h4, p, li, td, th, [role=note], [role=alert], [role=status]`

type T = (key: string, params?: Record<string, string | number>) => string

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim().slice(0, 300)
}

/** Element nomi va turi — ekran o'quvchi dastur aytadigan ko'rinishda */
function describe(el: Element, t: T): string {
  // Javob varianti / belgilash katagi yorlig'i — ichidagi input bo'yicha
  const inner = el.tagName === "LABEL" ? el.querySelector("input, select, textarea") : null
  const target = (inner ?? el) as HTMLElement
  const tag = target.tagName
  const role = target.getAttribute("role")
  const type = tag === "INPUT" ? (target as HTMLInputElement).type : ""

  let name = clean(target.getAttribute("aria-label"))
  if (!name) {
    const labelledBy = target.getAttribute("aria-labelledby")
    if (labelledBy) name = clean(labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? "").join(" "))
  }
  if (!name && (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA")) {
    const field = target as HTMLInputElement
    name = clean(field.labels?.[0]?.textContent) || clean(field.placeholder) || clean(field.title)
  }
  if (!name) name = clean((el as HTMLElement).innerText) || clean(target.getAttribute("title")) || clean(target.getAttribute("alt"))
  if (!name) return ""

  if (type === "radio") return `${name}. ${(target as HTMLInputElement).checked ? t("voice.selected") : t("voice.notSelected")}`
  if (type === "checkbox") return `${name}. ${t("voice.checkbox")}, ${(target as HTMLInputElement).checked ? t("voice.checked") : t("voice.unchecked")}`
  if (tag === "SELECT") {
    const sel = target as HTMLSelectElement
    return `${name}. ${t("voice.list")}: ${clean(sel.selectedOptions[0]?.textContent)}`
  }
  if (tag === "INPUT" || tag === "TEXTAREA") {
    const value = type === "password" ? "" : clean((target as HTMLInputElement).value)
    return `${name}. ${t("voice.field")}${value ? `: ${value}` : ""}`
  }
  const disabled = (target as HTMLButtonElement).disabled || target.getAttribute("aria-disabled") === "true"
  if (tag === "BUTTON" || role === "button" || role === "tab" || role === "menuitem" || tag === "SUMMARY") {
    const pressed = target.getAttribute("aria-pressed") === "true" || target.getAttribute("aria-current") === "true"
    return `${name}. ${t("voice.button")}${pressed ? `, ${t("voice.active")}` : ""}${disabled ? `, ${t("voice.disabled")}` : ""}`
  }
  if (tag === "A" || role === "link") return `${name}. ${t("voice.link")}`
  if (/^H[1-4]$/.test(tag)) return `${name}. ${t("voice.heading")}`
  return name
}

export function VoiceAssist() {
  const { t, lang } = useLanguage()
  const pathname = usePathname()
  const [eligible, setEligible] = useState(false)
  const [muted, setMuted] = useState(false)
  const [noNativeVoice, setNoNativeVoice] = useState(false)
  const tRef = useRef(t)
  tRef.current = t
  const lastElRef = useRef<Element | null>(null)
  const lastAtRef = useRef(0)

  // Faqat belgilangan talaba (xodimda backend "o'chiq" qaytaradi)
  useEffect(() => {
    if (!voiceSupported()) return
    let cancelled = false
    teachingApi.examSettings()
      .then(res => { if (!cancelled && res.data.accessibility?.enabled) { setEligible(true); setMuted(voiceMuted()) } })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [])

  const on = eligible && !muted

  useEffect(() => { setVoiceLang(lang) }, [lang])

  useEffect(() => {
    setVoiceActive(on)
    return () => setVoiceActive(false)
  }, [on])

  // Server ovozi ishlamay, brauzer ovoziga o'tilgan bo'lsa — ogohlantirish
  useEffect(() => {
    if (!on) return
    const timer = setInterval(() => setNoNativeVoice(usingFallbackVoice()), 4000)
    return () => clearInterval(timer)
  }, [on])

  // Sahifa almashganda — sahifa nomi
  useEffect(() => {
    if (!on) return
    const timer = setTimeout(() => {
      const h1 = document.querySelector("main h1, h1")
      const title = clean(h1?.textContent) || clean(document.title)
      if (title) speak(tRef.current("voice.page", { title }))
    }, 900)
    return () => clearTimeout(timer)
  }, [on, pathname])

  // Tekkan / fokuslangan elementni aytish
  useEffect(() => {
    if (!on) return
    let hoverTimer: ReturnType<typeof setTimeout> | null = null

    const say = (el: Element | null, force = false) => {
      if (!el) return
      // Bir xil elementni ketma-ket takrorlamaslik (fokus + sichqoncha bir vaqtda)
      if (!force && el === lastElRef.current && Date.now() - lastAtRef.current < 1500) return
      const text = describe(el, tRef.current)
      if (!text) return
      lastElRef.current = el
      lastAtRef.current = Date.now()
      speak(text)
    }
    const pick = (node: EventTarget | null): Element | null => {
      if (!(node instanceof Element)) return null
      return node.closest("label") ?? node.closest(INTERACTIVE) ?? node.closest(READABLE)
    }

    // Savol sarlavhasiga dasturiy fokus: uni imtihon sahifasi o'zi (variantlari bilan) o'qiydi
    const onFocus = (e: FocusEvent) => {
      if (e.target instanceof Element && e.target.hasAttribute("data-voice-nofocus")) return
      say(pick(e.target))
    }
    const onOver = (e: PointerEvent) => {
      const el = pick(e.target)
      if (hoverTimer) clearTimeout(hoverTimer)
      if (!el || el === lastElRef.current) return
      // Sichqoncha ustidan shunchaki o'tib ketganda gapirmasin
      hoverTimer = setTimeout(() => say(el), e.pointerType === "touch" ? 0 : 220)
    }
    const onClick = (e: MouseEvent) => {
      const el = pick(e.target)
      if (!el || el.closest("[data-voice-skip]")) return
      const input = el.tagName === "LABEL" ? el.querySelector("input") : el
      const type = input instanceof HTMLInputElement ? input.type : ""
      // Variant / katak: yangi holati bilan qayta aytiladi; boshqalarda — "bosildi"
      if (type === "radio" || type === "checkbox") setTimeout(() => say(el, true), 60)
      else if (el.matches(INTERACTIVE) && !(el as HTMLButtonElement).disabled) speak(tRef.current("voice.pressed"), { interrupt: false })
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") stopSpeaking() }

    document.addEventListener("focusin", onFocus)
    document.addEventListener("pointerover", onOver)
    document.addEventListener("click", onClick, true)
    document.addEventListener("keydown", onKey)
    return () => {
      if (hoverTimer) clearTimeout(hoverTimer)
      document.removeEventListener("focusin", onFocus)
      document.removeEventListener("pointerover", onOver)
      document.removeEventListener("click", onClick, true)
      document.removeEventListener("keydown", onKey)
    }
  }, [on])

  if (!eligible) return null

  function toggle() {
    const next = !muted
    setMuted(next)
    setVoiceMuted(next)
    if (!next) {
      // setVoiceActive effekti keyingi renderda — shu yerning o'zida yoqib, tasdiqni aytamiz
      setVoiceActive(true)
      speak(t("voice.turnedOn"))
    } else {
      stopSpeaking()
    }
  }

  return (
    <div data-voice-skip style={{ position: "fixed", left: 12, bottom: 12, zIndex: 10005, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, maxWidth: 300 }}>
      {on && noNativeVoice && (
        <p role="note" style={{
          margin: 0, padding: "8px 10px", borderRadius: 8, fontSize: 12, lineHeight: 1.4,
          backgroundColor: "#fff7ed", color: "#7c2d12", border: "1px solid rgba(234,88,12,0.45)", fontFamily: "var(--font-poppins)",
        }}>
          {t("voice.noUzVoice")}
        </p>
      )}
      <button type="button" onClick={toggle} aria-pressed={on}
        aria-label={on ? t("voice.turnOff") : t("voice.turnOn")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 999,
          backgroundColor: on ? "#0e58a8" : "#ffffff", color: on ? "#ffffff" : "#012970",
          border: "2px solid #0e58a8", fontFamily: "var(--font-poppins)", fontSize: 13, fontWeight: 600,
          cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
        }}>
        {on ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
        {on ? t("voice.on") : t("voice.off")}
      </button>
    </div>
  )
}
