"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowUpRight, Bot, Ear, EarOff, Mic, MicOff, Send, Sparkles, Trash2, Volume2, VolumeX, X } from "lucide-react"
import { assistantApi, assistantStream } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { isSpeaking, msSinceSpeech, setVoiceLang, speak, stopSpeaking } from "@/lib/voiceAssist"

/* O'qituvchi yordamchisi (AI agent) — pastki o'ng burchakdagi tugma.
   Yozma yoki og'zaki savol: saytni tushuntiradi, so'ralsa sahifani ochadi,
   mavzu bo'yicha topshiriq namunasi / test savollari yozib beradi.
   Model o'z serverimizda (Ollama) — backend routes/assistant.ts.
   Faqat ruxsat berilgan xodimga ko'rinadi (GET /api/assistant/status). */

interface Msg {
  role: "user" | "assistant"
  content: string
  page?: string | null
  pageTitle?: string | null
  opened?: boolean
  error?: boolean
  /** Model hali yozyapti (oqim) */
  streaming?: boolean
}

const STORE_KEY = "lms_assistant_chat"
const SPEAK_KEY = "lms_assistant_speak"
const WAKE_KEY = "lms_assistant_wake"
/** Chaqirilgandan keyin shuncha vaqt savollarni "yordamchi" demasdan ham eshitadi */
const AWAKE_MS = 45_000

function normSpeech(text: string): string {
  return text.toLowerCase().replace(/[`´‘’ʻʼ]/g, "'").replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim()
}

/** "xayr", "ko'rishguncha", "bo'ldi rahmat" — oynani yopish */
function isGoodbye(text: string): boolean {
  const t = normSpeech(text)
  return t.split(" ").length <= 4
    && /^(xayr|hayr|xo'p xayr|mayli xayr|rahmat xayr|ko'rishguncha|korishguncha|sog' bo'l|bo'ldi rahmat|bo'ldi|yopil|yop|пока|до свидания|bye|goodbye)( |$)/.test(t)
}

/** "Salom yordamchi", "yordamchi", "hey yordamchi" — chaqiruv so'zi. Qaytaradi: undan keyingi gap ("" bo'lishi mumkin) yoki null */
function afterWakeWord(text: string): string | null {
  const t = normSpeech(text)
  const m = t.match(/(?:^|\s)(?:(?:salom|assalom|assalomu alaykum|hey|allo|alo)\s+)?(yordamchi[a-z']*|помощник|assistant)(?:\s|$)/)
  if (!m || m.index === undefined) return null
  return t.slice(m.index + m[0].length).trim()
}

// Brauzerning nutqni matnga aylantirishi (Chrome / Edge) — tip e'lonlari standart lib'da yo'q
interface SpeechRec {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { resultIndex?: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start: () => void
  stop: () => void
}
function speechRecCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const REC_LANG: Record<string, string> = { uz: "uz-UZ", uzc: "uz-UZ", kaa: "uz-UZ", ru: "ru-RU", en: "en-US" }

export function TeacherAssistant() {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const [enabled, setEnabled] = useState(false)
  const [notReady, setNotReady] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [speakOn, setSpeakOn] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const recRef = useRef<SpeechRec | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const msgsRef = useRef<Msg[]>([])
  msgsRef.current = msgs
  const canListen = speechRecCtor() !== null
  // Ovoz bilan chaqirish: "Salom yordamchi" desa oyna ochiladi va savolni eshitadi
  const [wakeOn, setWakeOn] = useState(false)
  const [awake, setAwake] = useState(false)
  const awakeUntilRef = useRef(0)
  const openRef = useRef(false)
  openRef.current = open
  const sendRef = useRef<(text: string, viaVoice?: boolean) => void>(() => {})

  // Faqat ruxsat berilgan xodim
  useEffect(() => {
    let cancelled = false
    try { if (localStorage.getItem("lms_role") !== "employee") return } catch { return }
    assistantApi.status()
      .then(res => {
        if (cancelled || !res.enabled) return
        setEnabled(true)
        setNotReady(res.ready === false ? (res.reason ?? "") : null)
        try {
          const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || "[]") as Msg[]
          if (Array.isArray(saved)) setMsgs(saved.slice(-40).map(m => ({ ...m, streaming: false })))
          setSpeakOn(localStorage.getItem(SPEAK_KEY) === "on")
          setWakeOn(localStorage.getItem(WAKE_KEY) === "on")
        } catch { /* storage yopiq */ }
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!enabled) return
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-40))) } catch { /* storage yopiq */ }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
  }, [msgs, busy, enabled])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else { recRef.current?.stop(); stopSpeaking() }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  async function send(text: string, viaVoice = false) {
    const question = text.trim()
    if (!question || busy) return
    setInput("")
    setMicError(null)
    // "Xayr" — oyna yopiladi (serverga so'rov ketmaydi)
    if (isGoodbye(question)) {
      const bye = t("assistant.bye")
      setMsgs(prev => [...prev, { role: "user", content: question }, { role: "assistant", content: bye }])
      awakeUntilRef.current = 0
      setAwake(false)
      if (speakOn || viaVoice) { setVoiceLang(lang); speak(bye, { force: true }) }
      setTimeout(() => setOpen(false), speakOn || viaVoice ? 1800 : 700)
      return
    }
    const history = [...msgsRef.current, { role: "user" as const, content: question }]
    setMsgs(history)
    setBusy(true)
    // Oldingi javobda taklif qilingan sahifa — "och" / "ha" / "tushuntir" shunga tegishli
    const lastPage = [...msgsRef.current].reverse().find(m => m.role === "assistant" && m.page)?.page ?? null
    try {
      // Javob so'zma-so'z keladi: birinchi bo'lak kelganda xabar paydo bo'ladi va to'lib boradi
      let draft = ""
      const a = await assistantStream({
        messages: history.filter(m => !m.error).slice(-12).map(m => ({ role: m.role, content: m.content })),
        page: pathname, lastPage, lang,
      }, (piece) => {
        const first = draft === ""
        draft += piece
        const shown = draft.replace(/\*\*/g, "").replace(/^#{1,6}\s*/gm, "")
        setMsgs(prev => first
          ? [...prev, { role: "assistant", content: shown, streaming: true }]
          : prev.map((m, i) => (i === prev.length - 1 && m.streaming ? { ...m, content: shown } : m)))
      })
      const final: Msg = { role: "assistant", content: a.reply, page: a.page, pageTitle: a.pageTitle, opened: a.openNow }
      setMsgs(prev => (prev[prev.length - 1]?.streaming ? [...prev.slice(0, -1), final] : [...prev, final]))
      if (speakOn || viaVoice) { setVoiceLang(lang); speak(a.reply.slice(0, 900), { force: true }) }
      if (a.openNow && a.page) router.push(a.page)
    } catch (e) {
      const failed: Msg = { role: "assistant", content: e instanceof Error ? e.message : t("assistant.error"), error: true }
      // Yarim yozilgan javob qolsa — o'chirmaymiz, tagiga xato chiqadi
      setMsgs(prev => [...prev.map(m => (m.streaming ? { ...m, streaming: false } : m)), failed])
    } finally {
      setBusy(false)
      // Ovoz bilan so'ralgan bo'lsa — javobdan keyin ham bir muddat eshitib turadi
      if (viaVoice && wakeOn) { awakeUntilRef.current = Date.now() + AWAKE_MS; setAwake(true) }
    }
  }
  sendRef.current = (text, viaVoice) => { void send(text, viaVoice) }

  // ── Ovoz bilan chaqirish: doimiy tinglash (faqat o'qituvchi o'zi yoqqanda) ──
  useEffect(() => {
    if (!enabled || !wakeOn) return
    const Ctor = speechRecCtor()
    if (!Ctor) return
    let stopped = false
    let rec: SpeechRec | null = null
    let restart: ReturnType<typeof setTimeout> | null = null

    const heard = (raw: string) => {
      const text = raw.trim()
      // O'z ovozini (javobni o'qiyotganini) savol deb qabul qilmasin: gapirayotganda va
      // gap tugagach 1,5 soniya ichida kelgan natija — karnaydan qaytgan aks-sado
      if (!text || isSpeaking() || msSinceSpeech() < 1500) return
      // Brauzer noto'g'ri tanigan: harfsiz (faqat raqamlar) yoki juda qisqa
      if ((text.match(/\p{L}/gu) ?? []).length < 3) return
      // Aks-sado filtri: eshitilgan gapning so'zlari yordamchining oxirgi javobida bo'lsa — bu o'zining ovozi
      const lastReply = [...msgsRef.current].reverse().find(m => m.role === "assistant")?.content ?? ""
      if (lastReply) {
        const said = new Set(normSpeech(lastReply).split(" "))
        const words = normSpeech(text).split(" ").filter(w => w.length > 2)
        if (words.length >= 4 && words.filter(w => said.has(w)).length / words.length >= 0.6) return
      }
      const rest = afterWakeWord(text)
      if (rest !== null) {
        awakeUntilRef.current = Date.now() + AWAKE_MS
        setAwake(true)
        setOpen(true)
        if (rest.split(" ").length >= 2) sendRef.current(rest, true)
        else { setVoiceLang(lang); speak(t("assistant.hearing"), { force: true }) }
        return
      }
      // Chaqirilgan va oyna ochiq — keyingi gaplar savol hisoblanadi
      if (openRef.current && Date.now() < awakeUntilRef.current) {
        awakeUntilRef.current = Date.now() + AWAKE_MS
        sendRef.current(text, true)
      }
    }

    const start = () => {
      if (stopped) return
      rec = new Ctor()
      rec.lang = REC_LANG[lang] ?? "uz-UZ"
      rec.continuous = true
      rec.interimResults = false
      rec.onresult = (e) => {
        for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) heard(e.results[i][0].transcript)
        }
      }
      rec.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          stopped = true
          setWakeOn(false)
          try { localStorage.setItem(WAKE_KEY, "off") } catch { /* storage yopiq */ }
          setMicError(t("assistant.micDenied"))
        }
      }
      // Brauzer tinglashni o'zi to'xtatib turadi (jimlik, tarmoq) — qayta boshlanadi
      // (yordamchi gapirayotgan paytda emas — o'shanda ataylab to'xtatilgan)
      rec.onend = () => { if (!stopped && !pausedForSpeech) restart = setTimeout(start, 400) }
      try { rec.start() } catch { restart = setTimeout(start, 1500) }
    }
    start()
    // Yordamchi gapirayotganda mikrofon tinglashi to'xtatiladi (o'z ovozini eshitmasin),
    // gap tugagach qayta yoqiladi va "eshitish" vaqti yangidan boshlanadi
    let pausedForSpeech = false
    let wasAwake = false
    const guard = setInterval(() => {
      if (stopped) return
      if (isSpeaking() && !pausedForSpeech) {
        pausedForSpeech = true
        wasAwake = Date.now() < awakeUntilRef.current
        try { rec?.stop() } catch { /* allaqachon to'xtagan */ }
      } else if (pausedForSpeech && msSinceSpeech() > 800) {
        pausedForSpeech = false
        if (wasAwake && openRef.current) awakeUntilRef.current = Date.now() + AWAKE_MS
        start()
      }
    }, 250)
    const tick = setInterval(() => setAwake(Date.now() < awakeUntilRef.current), 2000)
    return () => {
      stopped = true
      if (restart) clearTimeout(restart)
      clearInterval(guard)
      clearInterval(tick)
      try { rec?.stop() } catch { /* allaqachon to'xtagan */ }
      setAwake(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, wakeOn, lang])

  function toggleWake() {
    const next = !wakeOn
    setWakeOn(next)
    setMicError(null)
    try { localStorage.setItem(WAKE_KEY, next ? "on" : "off") } catch { /* storage yopiq */ }
    if (next) { setVoiceLang(lang); speak(t("assistant.wakeEnabled"), { force: true }) }
    else { awakeUntilRef.current = 0; setAwake(false) }
  }

  function toggleMic() {
    // Ovoz bilan chaqirish yoqilgan: alohida tinglagich ochilmaydi (ikkitasi bir-biriga
    // xalaqit beradi) — shunchaki "uyg'onadi" yoki uxlaydi
    if (wakeOn) {
      const on = Date.now() < awakeUntilRef.current
      awakeUntilRef.current = on ? 0 : Date.now() + AWAKE_MS
      setAwake(!on)
      if (!on) stopSpeaking()
      return
    }
    if (listening) { recRef.current?.stop(); return }
    const Ctor = speechRecCtor()
    if (!Ctor) return
    stopSpeaking()
    setMicError(null)
    const rec = new Ctor()
    rec.lang = REC_LANG[lang] ?? "uz-UZ"
    rec.interimResults = true
    rec.continuous = false
    let finalText = ""
    rec.onresult = (e) => {
      let text = ""
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
      finalText = text
      setInput(text)
    }
    rec.onerror = (e) => {
      setMicError(e.error === "not-allowed" || e.error === "service-not-allowed" ? t("assistant.micDenied") : t("assistant.micFailed"))
    }
    rec.onend = () => {
      setListening(false)
      recRef.current = null
      if (finalText.trim()) void send(finalText, true)
    }
    recRef.current = rec
    setListening(true)
    try { rec.start() } catch { setListening(false) }
  }

  function toggleSpeak() {
    const next = !speakOn
    setSpeakOn(next)
    try { localStorage.setItem(SPEAK_KEY, next ? "on" : "off") } catch { /* storage yopiq */ }
    if (!next) stopSpeaking()
  }

  if (!enabled) return null

  const hearing = listening || awake
  const suggestions = [t("assistant.s1"), t("assistant.s2"), t("assistant.s3"), t("assistant.s4")]
  const font = { fontFamily: "var(--font-poppins)" }

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label={t("assistant.open")}
          className="group fixed bottom-5 right-5 z-[4500] flex items-center gap-2 rounded-full py-3 pl-3.5 pr-4 text-sm font-semibold text-white shadow-xl transition-transform hover:scale-[1.03]"
          style={{ ...font, background: "linear-gradient(135deg, #0e58a8, #1cc2dc)" }}>
          <Bot className="h-5 w-5" aria-hidden />
          <span className="hidden sm:inline">{t("assistant.button")}</span>
          {wakeOn && <span title={t("assistant.wakeHint")} className="flex"><Ear className="h-4 w-4 opacity-90" aria-hidden /></span>}
        </button>
      )}

      {open && (
        <section role="dialog" aria-label={t("assistant.title")} data-busy={busy}
          className="fixed bottom-0 right-0 z-[4500] flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--lms-cell)] shadow-2xl sm:bottom-5 sm:right-5 sm:h-[min(640px,calc(100dvh-40px))] sm:w-[400px] sm:rounded-2xl"
          style={{ ...font, border: "1px solid var(--lms-border)" }}>
          <header className="flex items-center gap-2.5 px-4 py-3 text-white" style={{ background: "linear-gradient(135deg, #0e58a8, #1cc2dc)" }}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20"><Bot className="h-5 w-5" aria-hidden /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold leading-tight">{t("assistant.title")}</h2>
              <p className="truncate text-[11px] opacity-85">{t("assistant.subtitle")}</p>
            </div>
            {canListen && (
              <button type="button" onClick={toggleWake} aria-pressed={wakeOn} aria-label={wakeOn ? t("assistant.wakeOff") : t("assistant.wakeOn")}
                title={wakeOn ? t("assistant.wakeOff") : t("assistant.wakeOn")} className="rounded-full p-2 hover:bg-white/20">
                {wakeOn ? <Ear className="h-4 w-4" aria-hidden /> : <EarOff className="h-4 w-4" aria-hidden />}
              </button>
            )}
            <button type="button" onClick={toggleSpeak} aria-pressed={speakOn} aria-label={speakOn ? t("assistant.speakOff") : t("assistant.speakOn")}
              title={speakOn ? t("assistant.speakOff") : t("assistant.speakOn")} className="rounded-full p-2 hover:bg-white/20">
              {speakOn ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
            </button>
            {msgs.length > 0 && (
              <button type="button" onClick={() => { setMsgs([]); stopSpeaking() }} aria-label={t("assistant.clear")} title={t("assistant.clear")} className="rounded-full p-2 hover:bg-white/20">
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} aria-label={t("common.close")} className="rounded-full p-2 hover:bg-white/20">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {notReady !== null && (
              <p role="alert" className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "#fff7ed", color: "#9a3412", border: "1px solid rgba(234,88,12,0.35)" }}>
                {t("assistant.notReady")}{notReady ? ` (${notReady})` : ""}
              </p>
            )}
            {msgs.length === 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-sm leading-6 text-[var(--lms-primary)]">{t("assistant.hello")}</p>
                <div className="flex flex-col gap-2">
                  {suggestions.map(s => (
                    <button key={s} type="button" onClick={() => send(s)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-[var(--lms-primary)] transition-colors hover:bg-[var(--lms-bg)]"
                      style={{ border: "1px solid var(--lms-border)" }}>
                      <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "#1cc2dc" }} aria-hidden /> {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex flex-col gap-1.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-[1.55]"
                  style={m.role === "user"
                    ? { backgroundColor: "#0e58a8", color: "#fff", borderBottomRightRadius: 6 }
                    : { backgroundColor: m.error ? "rgba(239,68,68,0.1)" : "var(--lms-bg)", color: m.error ? "#b91c1c" : "var(--lms-primary)", border: "1px solid var(--lms-border)", borderBottomLeftRadius: 6 }}>
                  {m.content}
                </div>
                {m.role === "assistant" && m.page && (
                  <button type="button" onClick={() => router.push(m.page!)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: "#0e58a8" }}>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    {m.opened ? t("assistant.openAgain", { title: m.pageTitle ?? "" }) : t("assistant.openPage", { title: m.pageTitle ?? "" })}
                  </button>
                )}
              </div>
            ))}
            {busy && !msgs[msgs.length - 1]?.streaming && (
              <div className="flex items-center gap-1.5 self-start rounded-2xl px-4 py-3" style={{ backgroundColor: "var(--lms-bg)", border: "1px solid var(--lms-border)" }} role="status" aria-label={t("assistant.thinking")}>
                {[0, 1, 2].map(i => <span key={i} className="h-2 w-2 animate-bounce rounded-full" style={{ backgroundColor: "#7293b9", animationDelay: `${i * 0.15}s` }} />)}
              </div>
            )}
          </div>

          {micError && <p role="alert" className="px-4 pb-1 text-xs" style={{ color: "#b91c1c" }}>{micError}</p>}
          <form onSubmit={e => { e.preventDefault(); void send(input) }} className="flex items-end gap-2 px-3 py-3" style={{ borderTop: "1px solid var(--lms-border)" }}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} rows={1} maxLength={2000}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input) } }}
              placeholder={hearing ? t("assistant.listening") : wakeOn ? t("assistant.wakeHint") : t("assistant.placeholder")} aria-label={t("assistant.placeholder")}
              className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl px-3 py-2.5 text-sm text-[var(--lms-primary)] focus:outline-none focus:ring-2 focus:ring-[#1cc2dc]"
              style={{ border: "1px solid var(--lms-border)", backgroundColor: "var(--lms-bg)" }} />
            {canListen && (
              <button type="button" onClick={toggleMic} aria-pressed={hearing} aria-label={hearing ? t("assistant.micStop") : t("assistant.micStart")}
                title={hearing ? t("assistant.micStop") : t("assistant.micStart")}
                className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl ${hearing ? "animate-pulse" : ""}`}
                style={hearing ? { backgroundColor: "#ef4444", color: "#fff" } : { border: "1px solid var(--lms-border)", color: "#0e58a8" }}>
                {hearing ? <MicOff className="h-5 w-5" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}
              </button>
            )}
            <button type="submit" disabled={busy || !input.trim()} aria-label={t("assistant.send")}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-50"
              style={{ backgroundColor: "#0e58a8" }}>
              <Send className="h-5 w-5" aria-hidden />
            </button>
          </form>
        </section>
      )}
    </>
  )
}
