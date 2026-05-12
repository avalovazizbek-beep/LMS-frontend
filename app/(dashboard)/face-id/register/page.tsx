"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import {
  ArrowLeft, Camera, CheckCircle2, AlertCircle, Loader2, ScanFace, RotateCcw,
} from "lucide-react"
import { faceApi } from "@/lib/api"
import { ensureFaceModels, areFaceModelsLoaded } from "@/lib/faceModelCache"

declare global {
  interface Window { faceapi: any }
}

type Phase = "loading" | "camera" | "liveness" | "confirm" | "submitting" | "done" | "error"

const MODEL_URL     = "/models"
const TOTAL_SAMPLES = 3
const HOLD_FRAMES   = 5
const MIN_CONF      = 0.4
const CVS_W         = 640
const CVS_H         = 480

export default function FaceRegisterPage() {
  const router       = useRouter()
  const videoRef     = useRef<HTMLVideoElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const rafRef       = useRef<number>(0)
  const holdFrameRef = useRef<number>(0)
  const capturingRef = useRef(false)

  const [phase,        setPhase]        = useState<Phase>("loading")
  const [scriptReady,  setScriptReady]  = useState(false)
  const [loadStatus,   setLoadStatus]   = useState("AI modellari tayyorlanmoqda...")
  const [loadedCount,  setLoadedCount]  = useState(0)
  const [cameraReady,  setCameraReady]  = useState(false)
  const [samples,      setSamples]      = useState<number[][]>([])
  const [submitError,  setSubmitError]  = useState<string | null>(null)
  const [sampleIdx,    setSampleIdx]    = useState(0)
  const [confidence,   setConfidence]   = useState(0)
  const [faceDetected, setFaceDetected] = useState(false)
  const [holdPct,      setHoldPct]      = useState(0)
  const [captured,     setCaptured]     = useState(false)

  /* ── Suppress face-api.js internal errors ──────────────────────── */
  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      if (e.reason?.message?.includes("Box.constructor") || e.reason?.message?.includes("expected box"))
        e.preventDefault()
    }
    const onError = (e: ErrorEvent) => {
      if (e.message?.includes("Box.constructor") || e.message?.includes("expected box")) {
        e.preventDefault()
        return false
      }
    }
    window.addEventListener("unhandledrejection", onRejection)
    window.addEventListener("error", onError)
    return () => {
      window.removeEventListener("unhandledrejection", onRejection)
      window.removeEventListener("error", onError)
    }
  }, [])

  /* ── Check if models already loaded on mount ────────────────────── */
  useEffect(() => {
    if (areFaceModelsLoaded()) { setLoadedCount(3); setPhase("camera") }
    else if (window.faceapi)   { setScriptReady(true) }
  }, [])

  /* ── Load models ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!scriptReady) return
    if (areFaceModelsLoaded()) { setLoadedCount(3); setPhase("camera"); return }
    ;(async () => {
      try {
        setLoadStatus("Yuz aniqlash modeli yuklanmoqda... (1/3)")
        await ensureFaceModels()
        setLoadedCount(3)
        setPhase("camera")
      } catch {
        setLoadStatus("Xatolik. Sahifani qayta yuklang.")
      }
    })()
  }, [scriptReady])

  /* ── Camera stream ───────────────────────────────────────────────── */
  useEffect(() => {
    if (phase !== "liveness") return
    setCameraReady(false)
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } })
      .then(stream => {
        const vid = videoRef.current
        if (!vid) return
        vid.srcObject = stream
        vid.onloadedmetadata = () => {
          vid.play().then(() => setCameraReady(true)).catch(() => setCameraReady(true))
        }
      })
      .catch(() => {
        setPhase("error")
        setSubmitError("Kameraga ruxsat berilmadi. Brauzer sozlamalarini tekshiring.")
      })
  }, [phase])

  /* ── Stop camera ─────────────────────────────────────────────────── */
  function stopCamera() {
    cancelAnimationFrame(rafRef.current)
    const vid = videoRef.current
    if (vid?.srcObject) {
      ;(vid.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      vid.srcObject = null
    }
  }

  /* ── Draw dynamic bounding box ───────────────────────────────────── */
  function drawFaceBox(
    ctx: CanvasRenderingContext2D,
    box: { x: number; y: number; width: number; height: number },
    vidW: number,
    vidH: number,
    conf: number,
  ) {
    ctx.clearRect(0, 0, CVS_W, CVS_H)

    const sx = CVS_W / vidW
    const sy = CVS_H / vidH

    // Mirror x — video CSS is scaleX(-1), canvas is not
    const bw = box.width  * sx
    const bh = box.height * sy
    const bx = CVS_W - box.x * sx - bw
    const by = box.y * sy

    const color = conf >= 70 ? "#22c55e" : "#fbbf24"
    const cLen  = Math.min(bw, bh) * 0.22

    // Dim vignette around face
    ctx.save()
    ctx.fillStyle = "rgba(0,0,0,0.4)"
    ctx.beginPath()
    ctx.rect(0, 0, CVS_W, CVS_H)
    ctx.rect(bx - 6, by - 6, bw + 12, bh + 12)
    ;(ctx as any).fill("evenodd")
    ctx.restore()

    // Box border with glow
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.shadowColor = color
    ctx.shadowBlur = 14
    ctx.strokeRect(bx, by, bw, bh)
    ctx.restore()

    // Corner accents
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.lineCap = "square"
    ctx.shadowColor = color
    ctx.shadowBlur = 6
    // TL
    ctx.beginPath(); ctx.moveTo(bx, by + cLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cLen, by); ctx.stroke()
    // TR
    ctx.beginPath(); ctx.moveTo(bx + bw - cLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cLen); ctx.stroke()
    // BL
    ctx.beginPath(); ctx.moveTo(bx, by + bh - cLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cLen, by + bh); ctx.stroke()
    // BR
    ctx.beginPath(); ctx.moveTo(bx + bw - cLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cLen); ctx.stroke()
    ctx.restore()
  }

  /* ── Detection RAF loop ──────────────────────────────────────────── */
  const detect = useCallback(async (curSample: number, curSamples: number[][]) => {
    const vid = videoRef.current
    const cvs = canvasRef.current
    if (!vid || !cvs || vid.paused || vid.ended) return
    if (!vid.videoWidth || !vid.videoHeight || vid.readyState < 2) {
      rafRef.current = requestAnimationFrame(() => detect(curSample, curSamples))
      return
    }

    const fa  = window.faceapi
    const ctx = cvs.getContext("2d")

    let result: any = null
    try {
      result = await fa
        .detectSingleFace(vid, new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: MIN_CONF }))
        .withFaceLandmarks()
        .withFaceDescriptor()
    } catch {
      holdFrameRef.current = 0
      rafRef.current = requestAnimationFrame(() => detect(curSample, curSamples))
      return
    }

    /* No face detected */
    if (!result) {
      holdFrameRef.current = 0
      setFaceDetected(false)
      setConfidence(0)
      setHoldPct(0)
      if (ctx) ctx.clearRect(0, 0, CVS_W, CVS_H)
      rafRef.current = requestAnimationFrame(() => detect(curSample, curSamples))
      return
    }

    const conf = Math.round(result.detection.score * 100)
    setFaceDetected(true)
    setConfidence(conf)
    if (ctx) drawFaceBox(ctx, result.detection.box, vid.videoWidth, vid.videoHeight, conf)

    holdFrameRef.current++
    const frames = holdFrameRef.current
    const pct    = Math.min(100, Math.round((frames / HOLD_FRAMES) * 100))
    setHoldPct(pct)

    if (frames >= HOLD_FRAMES && !capturingRef.current) {
      capturingRef.current = true
      holdFrameRef.current = 0
      setHoldPct(100)
      setCaptured(true)

      const descriptor = Array.from(result.descriptor) as number[]
      const newSamples = [...curSamples, descriptor]
      setSamples(newSamples)

      const nextSample = curSample + 1
      setSampleIdx(nextSample)

      setTimeout(() => {
        setCaptured(false)
        capturingRef.current = false
        if (nextSample >= TOTAL_SAMPLES) {
          if (ctx) ctx.clearRect(0, 0, CVS_W, CVS_H)
          setPhase("confirm")
          stopCamera()
          return
        }
        setHoldPct(0)
        setConfidence(0)
        setFaceDetected(false)
        rafRef.current = requestAnimationFrame(() => detect(nextSample, newSamples))
      }, 900)
      return
    }

    if (!capturingRef.current) {
      rafRef.current = requestAnimationFrame(() => detect(curSample, curSamples))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Kick off detection once camera is live ──────────────────────── */
  useEffect(() => {
    if (!cameraReady) return
    holdFrameRef.current = 0
    setHoldPct(0)
    setConfidence(0)
    setFaceDetected(false)
    const tid = setTimeout(() => {
      rafRef.current = requestAnimationFrame(() => detect(0, []))
    }, 400)
    return () => {
      clearTimeout(tid)
      cancelAnimationFrame(rafRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraReady])

  /* ── Cleanup on unmount ──────────────────────────────────────────── */
  useEffect(() => () => { stopCamera() }, [])

  /* ── Submit ──────────────────────────────────────────────────────── */
  async function handleSubmit() {
    if (samples.length < 1) return
    setPhase("submitting")
    try {
      await faceApi.register(samples)
      setPhase("done")
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Xatolik yuz berdi")
      setPhase("error")
    }
  }

  /* ── Restart ─────────────────────────────────────────────────────── */
  function restart() {
    setSamples([])
    setSampleIdx(0)
    setSubmitError(null)
    setCameraReady(false)
    setFaceDetected(false)
    setConfidence(0)
    setHoldPct(0)
    setCaptured(false)
    holdFrameRef.current = 0
    capturingRef.current = false
    setPhase("camera")
  }

  function startCamera() {
    setSampleIdx(0)
    setSamples([])
    holdFrameRef.current = 0
    capturingRef.current = false
    setPhase("liveness")
  }

  const confColor = confidence >= 70 ? "#22c55e" : confidence >= 45 ? "#f59e0b" : "#ef4444"

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <>
      <Script src="/face-api.min.js" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />

      <div className="flex flex-col gap-6 p-[30px] max-w-[720px]">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => { stopCamera(); router.back() }}
            className="flex items-center justify-center w-9 h-9 rounded-[8px] hover:bg-[#f0f5ff] transition-colors shrink-0"
            style={{ border: "1px solid rgba(1,41,112,0.15)" }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: "#0e58a8" }} />
          </button>
          <div>
            <h1 className="text-[24px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              Yuzni ro&apos;yxatdan o&apos;tkazish
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              Kamera orqali {TOTAL_SAMPLES} ta surat avtomatik olinadi
            </p>
          </div>
        </div>

        {/* ── Loading ── */}
        {phase === "loading" && (
          <div className="bg-white rounded-[10px] p-8 flex flex-col items-center gap-5"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#0e58a8" }} />
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {loadStatus}
                </p>
                <span className="text-xs font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  {scriptReady ? `${loadedCount}/3` : "0/3"}
                </span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: "rgba(1,41,112,0.08)" }}>
                <div className="h-2 rounded-full transition-all duration-500"
                  style={{ width: scriptReady ? `${(loadedCount / 3) * 100}%` : "5%", backgroundColor: "#0e58a8" }} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              {["Skript", "Detektor", "Nuqtalar", "Tanish"].map((label, i) => {
                const done   = i === 0 ? scriptReady : loadedCount >= i
                const active = i === 0 ? !scriptReady : scriptReady && loadedCount === i - 1
                return (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
                      style={{
                        backgroundColor: done ? "#0e58a8" : active ? "#e8f0fb" : "#f6f9ff",
                        color: done ? "#fff" : active ? "#0e58a8" : "#c0cfe4",
                        border: active ? "1.5px solid #0e58a8" : "none",
                      }}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span className="text-[11px]"
                      style={{ color: done ? "#0e58a8" : "#b0c4d8", fontFamily: "var(--font-poppins)" }}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-center" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              Yuz tanish modellari yuklanmoqda, iltimos kuting...
            </p>
          </div>
        )}

        {/* ── Camera start ── */}
        {phase === "camera" && (
          <div className="bg-white rounded-[10px] p-8 flex flex-col items-center gap-5"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#f0f5ff" }}>
              <Camera className="w-10 h-10" style={{ color: "#0e58a8" }} />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold mb-1"
                style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                Kamerani yoqing
              </p>
              <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Kameraga qarang — yuz avtomatik aniqlanadi va {TOTAL_SAMPLES} ta surat olinadi.
                Yaxshi yoritilgan joyda turing.
              </p>
            </div>
            <div className="flex items-center gap-4">
              {Array.from({ length: TOTAL_SAMPLES }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{ backgroundColor: "#f0f5ff", color: "#0e58a8" }}>
                    {i + 1}
                  </div>
                  <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    Surat {i + 1}
                  </p>
                </div>
              ))}
            </div>
            <button onClick={startCamera}
              className="flex items-center gap-2 px-6 py-3 rounded-[8px] text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
              <Camera className="w-4 h-4" />
              Kamerani yoqish
            </button>
          </div>
        )}

        {/* ── Liveness / capture ── */}
        {phase === "liveness" && (
          <div className="bg-white rounded-[10px] overflow-hidden"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>

            {/* Sample dots */}
            <div className="flex items-center gap-2 px-4 py-3 border-b"
              style={{ borderColor: "rgba(1,41,112,0.08)" }}>
              <p className="text-xs font-medium" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Olingan suratlar:
              </p>
              <div className="flex items-center gap-2 ml-1">
                {Array.from({ length: TOTAL_SAMPLES }).map((_, i) => (
                  <div key={i}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                    style={{
                      backgroundColor: i < sampleIdx ? "#22c55e" : i === sampleIdx ? "#0e58a8" : "#f0f5ff",
                      color:           i <= sampleIdx ? "#fff" : "#94a3b8",
                      transform: i === sampleIdx && captured ? "scale(1.3)" : "scale(1)",
                    }}>
                    {i < sampleIdx ? "✓" : i + 1}
                  </div>
                ))}
              </div>
              <span className="ml-auto text-xs font-bold"
                style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                {sampleIdx} / {TOTAL_SAMPLES}
              </span>
            </div>

            {/* Camera view */}
            <div className="relative flex justify-center" style={{ backgroundColor: "#111" }}>
              {!cameraReady && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
                  style={{ backgroundColor: "#111" }}>
                  <Loader2 className="w-9 h-9 animate-spin" style={{ color: "#0e58a8" }} />
                  <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    Kamera yoqilmoqda...
                  </p>
                </div>
              )}
              {/* Green flash on capture */}
              {captured && (
                <div className="absolute inset-0 z-20 pointer-events-none"
                  style={{ backgroundColor: "rgba(34,197,94,0.18)", transition: "opacity 0.3s" }} />
              )}
              <video
                ref={videoRef}
                autoPlay playsInline muted
                className="block"
                style={{
                  width: "100%", maxWidth: CVS_W, height: CVS_H,
                  objectFit: "cover", transform: "scaleX(-1)",
                }}
              />
              <canvas
                ref={canvasRef}
                width={CVS_W}
                height={CVS_H}
                style={{
                  position: "absolute", top: 0, left: 0,
                  width: "100%", height: "100%",
                  pointerEvents: "none", zIndex: 5,
                }}
              />
            </div>

            {/* ── Status bar ── */}
            <div className="p-4 flex flex-col gap-3">

              {/* Status text + confidence badge */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {captured
                    ? "✓ Surat qabul qilindi!"
                    : faceDetected
                    ? "Yuz aniqlandi — barqaror turing"
                    : "Yuzingizni kameraga to’g’rilang"}
                </p>
                <span
                  className="shrink-0 text-base font-bold px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: faceDetected
                      ? (confidence >= 70 ? "#dcfce7" : confidence >= 45 ? "#fff8e6" : "#fee2e2")
                      : "#f1f5f9",
                    color: faceDetected ? confColor : "#94a3b8",
                    fontFamily: "var(--font-poppins)",
                    minWidth: 60,
                    textAlign: "center",
                  }}>
                  {faceDetected ? `${confidence}%` : "—"}
                </span>
              </div>

              {/* Aniqlik darajasi */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    Aniqlik darajasi
                  </span>
                  <span className="text-xs font-semibold" style={{ color: confColor }}>
                    {faceDetected ? `${confidence}%` : "—"}
                  </span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden"
                  style={{ backgroundColor: "rgba(1,41,112,0.08)" }}>
                  <div className="h-3 rounded-full transition-all duration-150"
                    style={{ width: `${confidence}%`, backgroundColor: confColor }} />
                </div>
              </div>

              {/* Barqarorlik (capture progress) */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    Barqarorlik — {holdPct >= 100 ? "qabul qilinyapti..." : "barqaror turing"}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: "#0e58a8" }}>
                    {holdPct}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: "rgba(1,41,112,0.08)" }}>
                  <div className="h-2 rounded-full transition-all duration-100"
                    style={{
                      width: `${holdPct}%`,
                      backgroundColor: holdPct >= 100 ? "#22c55e" : "#0e58a8",
                    }} />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── Confirm ── */}
        {phase === "confirm" && (
          <div className="bg-white rounded-[10px] p-6 flex flex-col gap-5"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                style={{ backgroundColor: "#f0fff4" }}>
                <CheckCircle2 className="w-5 h-5" style={{ color: "#22c55e" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  Barcha {samples.length} ta surat olindi
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  Yuz ma&apos;lumotlarini saqlashni tasdiqlang
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-[8px]"
              style={{ backgroundColor: "#f0f5ff", border: "1px solid rgba(14,88,168,0.2)" }}>
              <ScanFace className="w-5 h-5 shrink-0" style={{ color: "#0e58a8" }} />
              <p className="text-xs" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                Yuz ma&apos;lumotlari muddatsiz saqlanadi. Imtihon oldidan yuzingiz tekshiriladi.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSubmit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-semibold flex-1 justify-center transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                <CheckCircle2 className="w-4 h-4" />
                Saqlash
              </button>
              <button onClick={restart}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium transition-opacity hover:opacity-80"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                <RotateCcw className="w-4 h-4" />
                Qaytadan
              </button>
            </div>
          </div>
        )}

        {/* ── Submitting ── */}
        {phase === "submitting" && (
          <div className="bg-white rounded-[10px] p-10 flex flex-col items-center gap-4"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#0e58a8" }} />
            <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              Ma&apos;lumotlar saqlanmoqda...
            </p>
          </div>
        )}

        {/* ── Done ── */}
        {phase === "done" && (
          <div className="bg-white rounded-[10px] p-10 flex flex-col items-center gap-4 text-center"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#f0fff4" }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: "#22c55e" }} />
            </div>
            <p className="text-lg font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              Yuz muvaffaqiyatli ro&apos;yxatdan o&apos;tdi!
            </p>
            <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              Yuz ma&apos;lumotlari muvaffaqiyatli saqlandi. Imtihon oldidan yuz tasdiqlovi o&apos;tkaziladi.
            </p>
            <button onClick={() => router.push("/face-id")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
              Face ID sahifasiga qaytish
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {phase === "error" && (
          <div className="bg-white rounded-[10px] p-8 flex flex-col items-center gap-4 text-center"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#fff5f5" }}>
              <AlertCircle className="w-8 h-8" style={{ color: "#ef4444" }} />
            </div>
            <p className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              Xatolik yuz berdi
            </p>
            <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {submitError}
            </p>
            <button onClick={restart}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
              <RotateCcw className="w-4 h-4" />
              Qaytadan urinish
            </button>
          </div>
        )}

      </div>
    </>
  )
}
