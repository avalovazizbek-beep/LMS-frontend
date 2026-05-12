"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import {
  ArrowLeft, ScanFace, CheckCircle2, AlertCircle, Loader2,
  Clock, BookOpen, ChevronRight, RotateCcw, Trophy, ShieldAlert, Eye,
} from "lucide-react"
import { faceApi } from "@/lib/api"
import { ensureFaceModels, areFaceModelsLoaded } from "@/lib/faceModelCache"
import { getExamSocket, disconnectExamSocket } from "@/lib/examSocket"

declare global { interface Window { faceapi: any } }

type Phase =
  | "intro"
  | "face-loading"
  | "face-scanning"
  | "face-ok"
  | "face-fail"
  | "exam"
  | "terminated"
  | "done"

const MIN_CONF    = 0.4
const CVS_W       = 480
const CVS_H       = 360
const MON_W       = 200
const MON_H       = 150
const CHECK_EVERY = 4000   // ms — monitor har 4 soniyada tekshiradi
const MAX_WARN    = 3
const EXAM_ID     = "demo-001"
const EXAM_MIN    = 5

const QUESTIONS = [
  { q: "Quyidagilardan qaysi biri dasturlash tili hisoblanadi?",
    options: ["HTML","CSS","Python","JSON"], correct: 2 },
  { q: "1 kilobayt (KB) necha baytga teng?",
    options: ["100","512","1000","1024"], correct: 3 },
  { q: "Internet tarmog'ida ma'lumot uzatish protokoli qaysi?",
    options: ["FTP","HTTP","TCP/IP","SMTP"], correct: 2 },
  { q: "SQL so'zining to'liq ma'nosi nima?",
    options: ["Structured Query Language","Simple Query Language","System Query Logic","Server Query Link"], correct: 0 },
  { q: "Quyidagi qaysi brauzer Google tomonidan ishlab chiqilgan?",
    options: ["Firefox","Safari","Edge","Chrome"], correct: 3 },
]

export default function DemoExamPage() {
  const router = useRouter()

  /* ── core state ── */
  const [phase,       setPhase]       = useState<Phase>("intro")
  const [scriptReady, setScriptReady] = useState(false)
  const [loadPct,     setLoadPct]     = useState(0)
  const [verifyMsg,   setVerifyMsg]   = useState<string | null>(null)
  const [username,    setUsername]    = useState("")

  /* ── exam state ── */
  const [answers,   setAnswers]   = useState<(number|null)[]>(Array(QUESTIONS.length).fill(null))
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft,  setTimeLeft]  = useState(EXAM_MIN * 60)

  /* ── monitoring state ── */
  const [warnings,    setWarnings]    = useState(0)
  const [warnVisible, setWarnVisible] = useState(false)
  const [warnMsg,     setWarnMsg]     = useState("")
  const [monReady,    setMonReady]    = useState(false)
  const [termReason,  setTermReason]  = useState("")

  /* ── refs ── */
  const entryVideoRef = useRef<HTMLVideoElement>(null)
  const entryCanvasRef = useRef<HTMLCanvasElement>(null)
  const entryRaf      = useRef(0)
  const entryFrames   = useRef(0)
  const entryVerify   = useRef(false)

  const monVideoRef   = useRef<HTMLVideoElement>(null)
  const monCanvasRef  = useRef<HTMLCanvasElement>(null)
  const monTimer      = useRef<ReturnType<typeof setInterval> | null>(null)
  const warningsRef   = useRef(0)
  const checkingRef   = useRef(false)

  /* ── get username from token ── */
  useEffect(() => {
    try {
      const token = document.cookie.split(";").find(c => c.trim().startsWith("token="))?.split("=")[1]
        || localStorage.getItem("token") || ""
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]))
        setUsername(payload.username || payload.sub || "student")
      }
    } catch { setUsername("student") }
  }, [])

  /* ── check models on mount ── */
  useEffect(() => {
    if (areFaceModelsLoaded()) { setLoadPct(100) }
    else if (window.faceapi)   { setScriptReady(true) }
  }, [])

  /* ── load models ── */
  useEffect(() => {
    if (!scriptReady) return
    if (areFaceModelsLoaded()) { setLoadPct(100); return }
    ;(async () => {
      try {
        await ensureFaceModels()
        setLoadPct(100)
      } catch { setVerifyMsg("Modellarni yuklashda xatolik. Sahifani yangilang.") }
    })()
  }, [scriptReady])

  /* ── entry camera ── */
  useEffect(() => {
    if (phase !== "face-scanning") return
    entryFrames.current = 0
    entryVerify.current = false
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: CVS_W }, height: { ideal: CVS_H }, facingMode: "user" } })
      .then(stream => {
        const v = entryVideoRef.current
        if (!v) return
        v.srcObject = stream
        v.onloadedmetadata = () => v.play().catch(() => {})
      })
      .catch(() => { setVerifyMsg("Kameraga ruxsat berilmadi."); setPhase("face-fail") })
  }, [phase])

  /* ── stop entry camera ── */
  function stopEntryCamera() {
    cancelAnimationFrame(entryRaf.current)
    const v = entryVideoRef.current
    if (v?.srcObject) { (v.srcObject as MediaStream).getTracks().forEach(t => t.stop()); v.srcObject = null }
  }

  /* ── entry face scan loop ── */
  const entryLoop = useCallback(async () => {
    const vid = entryVideoRef.current
    const cvs = entryCanvasRef.current
    if (!vid || !cvs || !vid.videoWidth || vid.readyState < 2) {
      entryRaf.current = requestAnimationFrame(entryLoop)
      return
    }
    const fa  = window.faceapi
    const ctx = cvs.getContext("2d")
    let result: any = null
    try {
      result = await fa
        .detectSingleFace(vid, new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: MIN_CONF }))
        .withFaceLandmarks().withFaceDescriptor()
    } catch { entryRaf.current = requestAnimationFrame(entryLoop); return }

    if (!result) {
      entryFrames.current = 0
      if (ctx) ctx.clearRect(0, 0, CVS_W, CVS_H)
      entryRaf.current = requestAnimationFrame(entryLoop)
      return
    }

    if (ctx) {
      ctx.clearRect(0, 0, CVS_W, CVS_H)
      const b = result.detection.box
      const sx = CVS_W / vid.videoWidth, sy = CVS_H / vid.videoHeight
      const bw = b.width*sx, bh = b.height*sy, bx = CVS_W - b.x*sx - bw, by = b.y*sy
      const pct = Math.min(1, entryFrames.current / 10)
      ctx.strokeStyle = `hsl(${120*pct},90%,40%)`; ctx.lineWidth = 2.5
      ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10
      ctx.strokeRect(bx, by, bw, bh)
    }

    entryFrames.current++

    if (entryFrames.current >= 10 && !entryVerify.current) {
      entryVerify.current = true
      const descriptor = Array.from(result.descriptor) as number[]
      try {
        const res = await faceApi.verify(descriptor)
        stopEntryCamera()
        if (res.verified) {
          setPhase("face-ok")
        } else {
          setVerifyMsg(
            res.reason === "not_registered"
              ? "Yuz ro'yxatdan o'tkazilmagan. Avval Face ID bo'limida ro'yxatdan o'ting."
              : `Yuz tasdiqlanmadi (ishonch: ${Math.round((res.confidence ?? 0) * 100)}%). Qayta urinib ko'ring.`
          )
          setPhase("face-fail")
        }
      } catch {
        stopEntryCamera()
        setVerifyMsg("Server bilan bog'lanishda xatolik.")
        setPhase("face-fail")
      }
      return
    }
    if (!entryVerify.current) entryRaf.current = requestAnimationFrame(entryLoop)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== "face-scanning") return
    const t = setTimeout(() => { entryRaf.current = requestAnimationFrame(entryLoop) }, 500)
    return () => { clearTimeout(t); cancelAnimationFrame(entryRaf.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  /* ── monitoring camera (exam phase) ── */
  useEffect(() => {
    if (phase !== "exam") return
    setMonReady(false)
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: MON_W*2 }, height: { ideal: MON_H*2 }, facingMode: "user" } })
      .then(stream => {
        const v = monVideoRef.current
        if (!v) return
        v.srcObject = stream
        v.onloadedmetadata = () => v.play().then(() => setMonReady(true)).catch(() => setMonReady(true))
      })
      .catch(() => {}) // monitoring kamera ishlamasa, imtihon to'xtamaydi
  }, [phase])

  function stopMonCamera() {
    if (monTimer.current) clearInterval(monTimer.current)
    const v = monVideoRef.current
    if (v?.srcObject) { (v.srcObject as MediaStream).getTracks().forEach(t => t.stop()); v.srcObject = null }
  }

  /* ── periodic face check during exam ── */
  const checkFace = useCallback(async () => {
    if (checkingRef.current) return
    const vid = monVideoRef.current
    if (!vid || !vid.videoWidth || vid.readyState < 2) return

    checkingRef.current = true
    const fa = window.faceapi
    let result: any = null
    try {
      result = await fa
        .detectSingleFace(vid, new fa.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: MIN_CONF }))
        .withFaceLandmarks().withFaceDescriptor()
    } catch { checkingRef.current = false; return }

    let verified = false
    let confidence = 0

    if (result) {
      const descriptor = Array.from(result.descriptor) as number[]
      try {
        const res = await faceApi.verify(descriptor)
        verified   = res.verified
        confidence = res.confidence ?? 0
      } catch {}
    }

    /* emit to socket */
    try {
      getExamSocket().emit("exam:face-event", {
        examId: EXAM_ID, username, verified, warnings: warningsRef.current,
      })
    } catch {}

    if (!verified) {
      const newCount = warningsRef.current + 1
      warningsRef.current = newCount
      setWarnings(newCount)

      const msg = result
        ? `Boshqa shaxs aniqlandi! Ogohlantirish: ${newCount}/${MAX_WARN}`
        : `Yuz ko'rinmadi! Kameraga qarang. Ogohlantirish: ${newCount}/${MAX_WARN}`

      setWarnMsg(msg)
      setWarnVisible(true)
      setTimeout(() => setWarnVisible(false), 3500)

      if (newCount >= MAX_WARN) {
        const reason = result ? "3 marta boshqa shaxs aniqlandi" : "3 marta yuz ko'rinmadi"
        stopMonCamera()
        try {
          getExamSocket().emit("exam:terminated", { examId: EXAM_ID, username, reason })
        } catch {}
        setTermReason(reason)
        setPhase("terminated")
        checkingRef.current = false
        return
      }
    }
    checkingRef.current = false
  }, [username])

  useEffect(() => {
    if (!monReady || phase !== "exam") return
    monTimer.current = setInterval(checkFace, CHECK_EVERY)
    return () => { if (monTimer.current) clearInterval(monTimer.current) }
  }, [monReady, phase, checkFace])

  /* ── socket join ── */
  useEffect(() => {
    if (phase !== "exam" || !username) return
    try {
      getExamSocket().emit("exam:join", { examId: EXAM_ID, username })
    } catch {}
    return () => { disconnectExamSocket() }
  }, [phase, username])

  /* ── exam timer ── */
  useEffect(() => {
    if (phase !== "exam" || submitted) return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); setSubmitted(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase, submitted])

  useEffect(() => () => { stopEntryCamera(); stopMonCamera() }, [])

  function fmt(s: number) {
    return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`
  }

  const score = submitted ? answers.filter((a,i) => a === QUESTIONS[i].correct).length : 0
  const pct   = submitted ? Math.round((score / QUESTIONS.length) * 100) : 0

  const entryProgress = Math.min(100, Math.round((entryFrames.current / 10) * 100))

  /* ════════════════════════════════════════════════════════════════ */
  return (
    <>
      <Script
        src="/face-api.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <div className="flex flex-col gap-6 p-[30px] max-w-[780px]">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => { stopEntryCamera(); stopMonCamera(); router.back() }}
            className="flex items-center justify-center w-9 h-9 rounded-[8px] hover:bg-[#f0f5ff] transition-colors shrink-0"
            style={{ border: "1px solid rgba(1,41,112,0.15)" }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: "#0e58a8" }} />
          </button>
          <div>
            <h1 className="text-[22px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              Demo imtihon
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              Face ID monitoring bilan sinov
            </p>
          </div>
        </div>

        {/* ── INTRO ── */}
        {phase === "intro" && (
          <div className="bg-white rounded-[10px] p-8 flex flex-col gap-5"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#f0f5ff" }}>
                <BookOpen className="w-6 h-6" style={{ color: "#0e58a8" }} />
              </div>
              <div>
                <p className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  Axborot texnologiyalari — Demo
                </p>
                <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {QUESTIONS.length} ta savol · {EXAM_MIN} daqiqa · Face ID kuzatuv
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { icon: ScanFace,    text: "Imtihon boshida yuzingiz Face ID orqali tasdiqlanadi",                             color: "#0e58a8", bg: "#f0f5ff" },
                { icon: Eye,        text: `Imtihon davomida kamera kuzatuv rejimida ishlaydi — har ${CHECK_EVERY/1000} soniyada tekshiriladi`, color: "#1cc2dc", bg: "#f0fbfd" },
                { icon: ShieldAlert, text: `${MAX_WARN} ta ogohlantirishdan so'ng imtihon avtomatik yakunlanadi va talaba yiqiladi`, color: "#ef4444", bg: "#fff5f5" },
                { icon: Clock,       text: `Imtihon muddati ${EXAM_MIN} daqiqa`,                                               color: "#f59e0b", bg: "#fff8e6" },
              ].map(({ icon: Icon, text, color, bg }) => (
                <div key={text} className="flex items-center gap-3 p-3 rounded-[8px]"
                  style={{ backgroundColor: bg, border: `1px solid ${color}22` }}>
                  <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                  <p className="text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{text}</p>
                </div>
              ))}
            </div>

            {loadPct < 100 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    AI modellari tayyorlanmoqda...
                  </span>
                  <span className="text-xs font-semibold" style={{ color: "#0e58a8" }}>{loadPct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "rgba(1,41,112,0.08)" }}>
                  <div className="h-1.5 rounded-full transition-all"
                    style={{ width: `${loadPct}%`, backgroundColor: "#0e58a8" }} />
                </div>
              </div>
            )}

            <button
              onClick={() => setPhase("face-scanning")}
              disabled={loadPct < 100}
              className="flex items-center justify-center gap-2 py-3 rounded-[8px] text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}
            >
              <ScanFace className="w-4 h-4" />
              {loadPct < 100 ? "Modeller yuklanmoqda..." : "Boshlash — Yuzni tasdiqlash"}
            </button>
          </div>
        )}

        {/* ── FACE SCANNING ── */}
        {phase === "face-scanning" && (
          <div className="bg-white rounded-[10px] overflow-hidden"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
              <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                Yuz tekshirilmoqda...
              </p>
              <span className="text-xs font-bold" style={{ color: "#0e58a8" }}>{entryProgress}%</span>
            </div>
            <div className="relative flex justify-center" style={{ backgroundColor: "#111" }}>
              <video ref={entryVideoRef} autoPlay playsInline muted
                style={{ width: "100%", maxWidth: CVS_W, height: CVS_H, objectFit: "cover", transform: "scaleX(-1)" }} />
              <canvas ref={entryCanvasRef} width={CVS_W} height={CVS_H}
                style={{ position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:5 }} />
            </div>
            <div className="p-4 flex flex-col gap-2">
              <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Kameraga qarang — yuz avtomatik skanerlanadi
              </p>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: "rgba(1,41,112,0.08)" }}>
                <div className="h-2 rounded-full transition-all duration-200"
                  style={{ width: `${entryProgress}%`, backgroundColor: entryProgress >= 100 ? "#22c55e" : "#0e58a8" }} />
              </div>
            </div>
          </div>
        )}

        {/* ── FACE OK ── */}
        {phase === "face-ok" && (
          <div className="bg-white rounded-[10px] p-10 flex flex-col items-center gap-5 text-center"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#f0fff4" }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: "#22c55e" }} />
            </div>
            <div>
              <p className="text-lg font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                Yuz tasdiqlandi!
              </p>
              <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Imtihon davomida kamera kuzatuv rejimida ishlaydi
              </p>
            </div>
            <button
              onClick={() => { setWarnings(0); warningsRef.current = 0; setTimeLeft(EXAM_MIN*60); setPhase("exam") }}
              className="flex items-center gap-2 px-6 py-3 rounded-[8px] text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}
            >
              Imtihonni boshlash <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── FACE FAIL ── */}
        {phase === "face-fail" && (
          <div className="bg-white rounded-[10px] p-10 flex flex-col items-center gap-5 text-center"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#fff5f5" }}>
              <AlertCircle className="w-8 h-8" style={{ color: "#ef4444" }} />
            </div>
            <div>
              <p className="text-lg font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                Yuz tasdiqlanmadi
              </p>
              <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {verifyMsg}
              </p>
            </div>
            <button
              onClick={() => { entryFrames.current=0; entryVerify.current=false; setVerifyMsg(null); setPhase("face-scanning") }}
              className="flex items-center gap-2 px-6 py-3 rounded-[8px] text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#ef4444", color: "#fff", fontFamily: "var(--font-poppins)" }}
            >
              <RotateCcw className="w-4 h-4" /> Qayta urinish
            </button>
          </div>
        )}

        {/* ── EXAM ── */}
        {phase === "exam" && (
          <div className="flex flex-col gap-4">

            {/* Warning toast */}
            {warnVisible && (
              <div className="fixed top-5 left-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-[10px] shadow-xl"
                style={{
                  transform: "translateX(-50%)",
                  backgroundColor: "#fff",
                  border: "2px solid #ef4444",
                  maxWidth: 400,
                }}>
                <ShieldAlert className="w-5 h-5 shrink-0" style={{ color: "#ef4444" }} />
                <p className="text-sm font-semibold" style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }}>
                  {warnMsg}
                </p>
              </div>
            )}

            {/* Top bar: timer + warnings + monitoring cam */}
            <div className="bg-white rounded-[10px] p-3 flex items-center gap-3 flex-wrap"
              style={{ border: "1px solid rgba(1,41,112,0.1)" }}>

              {/* face-ok badge */}
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />
                <span className="text-xs font-medium" style={{ color: "#22c55e", fontFamily: "var(--font-poppins)" }}>
                  Face ID tasdiqlangan
                </span>
              </div>

              <div className="w-px h-4 mx-1" style={{ backgroundColor: "rgba(1,41,112,0.1)" }} />

              {/* warnings */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: MAX_WARN }).map((_, i) => (
                  <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      backgroundColor: i < warnings ? "#ef4444" : "rgba(1,41,112,0.08)",
                      color: i < warnings ? "#fff" : "#c0cfe4",
                    }}>
                    {i+1}
                  </div>
                ))}
                <span className="text-xs ml-1" style={{ color: warnings > 0 ? "#ef4444" : "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  Ogohlantirishlar
                </span>
              </div>

              <div className="flex-1" />

              {/* timer */}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: timeLeft <= 60 ? "#ef4444" : "#f59e0b" }} />
                <span className="text-sm font-bold tabular-nums"
                  style={{ color: timeLeft <= 60 ? "#ef4444" : "#012970", fontFamily: "var(--font-poppins)" }}>
                  {fmt(timeLeft)}
                </span>
              </div>

              <div className="w-px h-4 mx-1" style={{ backgroundColor: "rgba(1,41,112,0.1)" }} />

              {/* monitoring camera — mini */}
              <div className="relative rounded-[6px] overflow-hidden shrink-0"
                style={{ width: MON_W/2, height: MON_H/2, backgroundColor: "#111", border: "1.5px solid rgba(14,88,168,0.3)" }}>
                {!monReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#7293b9" }} />
                  </div>
                )}
                <video ref={monVideoRef} autoPlay playsInline muted
                  style={{ width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)" }} />
                <canvas ref={monCanvasRef} width={MON_W} height={MON_H}
                  style={{ position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none" }} />
                <div className="absolute top-1 left-1 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#22c55e" }} />
                  <span className="text-[9px] font-bold" style={{ color: "#22c55e" }}>LIVE</span>
                </div>
              </div>
            </div>

            {/* Questions */}
            {QUESTIONS.map((q, qi) => (
              <div key={qi} className="bg-white rounded-[10px] p-5 flex flex-col gap-3"
                style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5"
                    style={{ backgroundColor: "#f0f5ff", color: "#0e58a8" }}>
                    {qi+1}
                  </span>
                  <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    {q.q}
                  </p>
                </div>
                <div className="flex flex-col gap-2 pl-9">
                  {q.options.map((opt, ai) => {
                    const sel       = answers[qi] === ai
                    const isCorrect = submitted && ai === q.correct
                    const isWrong   = submitted && sel && ai !== q.correct
                    let bg = "rgba(1,41,112,0.04)", border = "rgba(1,41,112,0.1)", textColor = "#7293b9"
                    if (sel && !submitted) { bg="#f0f5ff"; border="#0e58a8"; textColor="#012970" }
                    if (isCorrect) { bg="#f0fff4"; border="#22c55e"; textColor="#166534" }
                    if (isWrong)   { bg="#fff5f5"; border="#ef4444"; textColor="#ef4444" }
                    return (
                      <button key={ai} onClick={() => !submitted && setAnswers(p => { const a=[...p]; a[qi]=ai; return a })}
                        disabled={submitted}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-[8px] text-left transition-all"
                        style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                          style={{ backgroundColor: border, color: isCorrect?"#22c55e":isWrong?"#ef4444":sel?"#0e58a8":"#c0cfe4" }}>
                          {String.fromCharCode(65+ai)}
                        </span>
                        <span className="text-sm" style={{ color: textColor, fontFamily: "var(--font-poppins)" }}>{opt}</span>
                        {isCorrect && <CheckCircle2 className="w-4 h-4 ml-auto" style={{ color:"#22c55e" }} />}
                        {isWrong   && <AlertCircle  className="w-4 h-4 ml-auto" style={{ color:"#ef4444" }} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {!submitted ? (
              <button onClick={() => setSubmitted(true)}
                disabled={answers.some(a=>a===null)}
                className="py-3 rounded-[8px] text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                {answers.some(a=>a===null)
                  ? `Barcha savollarni belgilang (${answers.filter(a=>a!==null).length}/${QUESTIONS.length})`
                  : "Imtihonni topshirish"}
              </button>
            ) : (
              <button onClick={() => { stopMonCamera(); setPhase("done") }}
                className="flex items-center justify-center gap-2 py-3 rounded-[8px] text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#22c55e", color:"#fff", fontFamily:"var(--font-poppins)" }}>
                <Trophy className="w-4 h-4" /> Natijalarni ko&apos;rish
              </button>
            )}
          </div>
        )}

        {/* ── TERMINATED ── */}
        {phase === "terminated" && (
          <div className="bg-white rounded-[10px] p-10 flex flex-col items-center gap-5 text-center"
            style={{ border: "2px solid #ef4444" }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#fff5f5" }}>
              <ShieldAlert className="w-10 h-10" style={{ color: "#ef4444" }} />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }}>
                Imtihon to'xtatildi!
              </p>
              <p className="text-sm mt-2" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {termReason}
              </p>
              <p className="text-sm mt-1 font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {MAX_WARN} ta ogohlantirish to'plandi. Talaba imtihondan yiqildi.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => router.push("/face-id")}
                className="flex-1 py-2.5 rounded-[8px] text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ border:"1px solid rgba(1,41,112,0.2)", color:"#0e58a8", fontFamily:"var(--font-poppins)" }}>
                Face ID sozlamalari
              </button>
              <button onClick={() => router.push("/imtihonlar")}
                className="flex-1 py-2.5 rounded-[8px] text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor:"#ef4444", color:"#fff", fontFamily:"var(--font-poppins)" }}>
                Imtihonlarga qaytish
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {phase === "done" && (
          <div className="bg-white rounded-[10px] p-10 flex flex-col items-center gap-6 text-center"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: pct >= 60 ? "#f0fff4" : "#fff8e6" }}>
              <Trophy className="w-10 h-10" style={{ color: pct >= 60 ? "#22c55e" : "#f59e0b" }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {score} / {QUESTIONS.length}
              </p>
              <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {pct>=86?"A'lo! Zo'r natija!":pct>=71?"Yaxshi natija":pct>=56?"Qoniqarli":"Qoniqarsiz — qayta tayyorlaning"}
              </p>
            </div>
            <div className="w-full flex flex-col gap-1.5">
              <div className="w-full h-4 rounded-full overflow-hidden" style={{ backgroundColor:"rgba(1,41,112,0.08)" }}>
                <div className="h-4 rounded-full transition-all duration-700"
                  style={{ width:`${pct}%`, backgroundColor:pct>=60?"#22c55e":"#f59e0b" }} />
              </div>
              <span className="text-xs font-semibold" style={{ color:"#0e58a8" }}>{pct}%</span>
            </div>
            <div className="w-full flex flex-col gap-1.5">
              {QUESTIONS.map((q,i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-[6px]"
                  style={{ backgroundColor: answers[i]===q.correct?"#f0fff4":"#fff5f5" }}>
                  <span style={{ color:answers[i]===q.correct?"#22c55e":"#ef4444" }}>
                    {answers[i]===q.correct?"✓":"✗"}
                  </span>
                  <span className="text-xs flex-1 truncate text-left"
                    style={{ color:"#012970", fontFamily:"var(--font-poppins)" }}>
                    {q.q}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => {
                setAnswers(Array(QUESTIONS.length).fill(null))
                setSubmitted(false); setWarnings(0); warningsRef.current=0
                entryFrames.current=0; entryVerify.current=false
                setPhase("intro")
              }}
                className="flex-1 py-2.5 rounded-[8px] text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ border:"1px solid rgba(1,41,112,0.2)", color:"#0e58a8", fontFamily:"var(--font-poppins)" }}>
                <RotateCcw className="w-4 h-4 inline mr-2" />Qayta urinish
              </button>
              <button onClick={() => router.push("/imtihonlar")}
                className="flex-1 py-2.5 rounded-[8px] text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor:"#0e58a8", color:"#fff", fontFamily:"var(--font-poppins)" }}>
                Imtihonlarga qaytish
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
