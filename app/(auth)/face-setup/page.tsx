"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Loader2,
  RotateCcw,
  ScanFace,
} from "lucide-react"
import { faceApi } from "@/lib/api"

declare global {
  interface Window { faceapi: any }
}

type Step = "intro" | "loading" | "camera" | "liveness" | "confirm" | "submitting" | "done" | "error"

const MODEL_URL     = "/models"
const TOTAL_SAMPLES = 3
const HOLD_FRAMES   = 5
const MIN_CONF      = 0.4
const CVS_W         = 640
const CVS_H         = 480

export default function FaceSetupPage() {
  const router        = useRouter()
  const videoRef      = useRef<HTMLVideoElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const rafRef        = useRef<number>(0)
  const holdFrameRef  = useRef<number>(0)
  const capturingRef  = useRef(false)

  const [step,         setStep]         = useState<Step>("intro")
  const [scriptReady,  setScriptReady]  = useState(false)
  const [loadedCount,  setLoadedCount]  = useState(0)
  const [loadStatus,   setLoadStatus]   = useState("AI modellari tayyorlanmoqda...")
  const [cameraReady,  setCameraReady]  = useState(false)
  const [samples,      setSamples]      = useState<number[][]>([])
  const [sampleIdx,    setSampleIdx]    = useState(0)
  const [confidence,   setConfidence]   = useState(0)
  const [faceDetected, setFaceDetected] = useState(false)
  const [holdPct,      setHoldPct]      = useState(0)
  const [captured,     setCaptured]     = useState(false)
  const [submitError,  setSubmitError]  = useState<string | null>(null)

  /* ── Suppress face-api.js internal errors ── */
  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      if (e.reason?.message?.includes("Box.constructor") || e.reason?.message?.includes("expected box"))
        e.preventDefault()
    }
    const onError = (e: ErrorEvent) => {
      if (e.message?.includes("Box.constructor") || e.message?.includes("expected box")) {
        e.preventDefault(); return false
      }
    }
    window.addEventListener("unhandledrejection", onRejection)
    window.addEventListener("error", onError)
    return () => {
      window.removeEventListener("unhandledrejection", onRejection)
      window.removeEventListener("error", onError)
    }
  }, [])

  /* ── Load models after script ready ── */
  useEffect(() => {
    if (!scriptReady || step !== "loading") return
    ;(async () => {
      try {
        const fa = window.faceapi
        setLoadStatus("Yuz aniqlash modeli... (1/3)")
        await fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL); setLoadedCount(1)
        setLoadStatus("Yuz nuqtalari modeli... (2/3)")
        await fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL); setLoadedCount(2)
        setLoadStatus("Yuz tanish modeli... (3/3)")
        await fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL); setLoadedCount(3)
        setStep("camera")
      } catch {
        setLoadStatus("Xatolik. Sahifani qayta yuklang.")
      }
    })()
  }, [scriptReady, step])

  /* ── Camera stream ── */
  useEffect(() => {
    if (step !== "liveness") return
    setCameraReady(false)
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } })
      .then(stream => {
        const vid = videoRef.current
        if (!vid) return
        vid.srcObject = stream
        vid.onloadedmetadata = () => vid.play().then(() => setCameraReady(true)).catch(() => setCameraReady(true))
      })
      .catch(() => {
        setSubmitError("Kameraga ruxsat berilmadi. Brauzer sozlamalarini tekshiring.")
        setStep("error")
      })
  }, [step])

  function stopCamera() {
    cancelAnimationFrame(rafRef.current)
    const vid = videoRef.current
    if (vid?.srcObject) {
      ;(vid.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      vid.srcObject = null
    }
  }

  function drawFaceBox(
    ctx: CanvasRenderingContext2D,
    box: { x: number; y: number; width: number; height: number },
    vidW: number, vidH: number, conf: number,
  ) {
    ctx.clearRect(0, 0, CVS_W, CVS_H)
    const sx = CVS_W / vidW; const sy = CVS_H / vidH
    const bw = box.width * sx; const bh = box.height * sy
    const bx = CVS_W - box.x * sx - bw; const by = box.y * sy
    const color = conf >= 70 ? "#22c55e" : "#fbbf24"
    const cLen = Math.min(bw, bh) * 0.22

    ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.4)"
    ctx.beginPath(); ctx.rect(0, 0, CVS_W, CVS_H)
    ctx.rect(bx - 6, by - 6, bw + 12, bh + 12)
    ;(ctx as any).fill("evenodd"); ctx.restore()

    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.5
    ctx.shadowColor = color; ctx.shadowBlur = 14
    ctx.strokeRect(bx, by, bw, bh); ctx.restore()

    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 4
    ctx.lineCap = "square"; ctx.shadowColor = color; ctx.shadowBlur = 6
    ctx.beginPath(); ctx.moveTo(bx, by + cLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cLen, by); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(bx + bw - cLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cLen); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(bx, by + bh - cLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cLen, by + bh); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(bx + bw - cLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cLen); ctx.stroke()
    ctx.restore()
  }

  /* ── Detection RAF loop ── */
  const detect = useCallback(async (curSample: number, curSamples: number[][]) => {
    const vid = videoRef.current; const cvs = canvasRef.current
    if (!vid || !cvs || vid.paused || vid.ended) return
    if (!vid.videoWidth || !vid.videoHeight || vid.readyState < 2) {
      rafRef.current = requestAnimationFrame(() => detect(curSample, curSamples)); return
    }
    const fa = window.faceapi; const ctx = cvs.getContext("2d")
    let result: any = null
    try {
      result = await fa
        .detectSingleFace(vid, new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: MIN_CONF }))
        .withFaceLandmarks().withFaceDescriptor()
    } catch {
      holdFrameRef.current = 0
      rafRef.current = requestAnimationFrame(() => detect(curSample, curSamples)); return
    }

    if (!result) {
      holdFrameRef.current = 0; setFaceDetected(false); setConfidence(0); setHoldPct(0)
      if (ctx) ctx.clearRect(0, 0, CVS_W, CVS_H)
      rafRef.current = requestAnimationFrame(() => detect(curSample, curSamples)); return
    }

    const conf = Math.round(result.detection.score * 100)
    setFaceDetected(true); setConfidence(conf)
    if (ctx) drawFaceBox(ctx, result.detection.box, vid.videoWidth, vid.videoHeight, conf)

    holdFrameRef.current++
    const pct = Math.min(100, Math.round((holdFrameRef.current / HOLD_FRAMES) * 100))
    setHoldPct(pct)

    if (holdFrameRef.current >= HOLD_FRAMES && !capturingRef.current) {
      capturingRef.current = true; holdFrameRef.current = 0; setHoldPct(100); setCaptured(true)
      const descriptor = Array.from(result.descriptor) as number[]
      const newSamples = [...curSamples, descriptor]
      setSamples(newSamples)
      const nextSample = curSample + 1; setSampleIdx(nextSample)
      setTimeout(() => {
        setCaptured(false); capturingRef.current = false
        if (nextSample >= TOTAL_SAMPLES) {
          if (ctx) ctx.clearRect(0, 0, CVS_W, CVS_H)
          setStep("confirm"); stopCamera(); return
        }
        setHoldPct(0); setConfidence(0); setFaceDetected(false)
        rafRef.current = requestAnimationFrame(() => detect(nextSample, newSamples))
      }, 900)
      return
    }
    if (!capturingRef.current)
      rafRef.current = requestAnimationFrame(() => detect(curSample, curSamples))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cameraReady) return
    holdFrameRef.current = 0; setHoldPct(0); setConfidence(0); setFaceDetected(false)
    const tid = setTimeout(() => {
      rafRef.current = requestAnimationFrame(() => detect(0, []))
    }, 400)
    return () => { clearTimeout(tid); cancelAnimationFrame(rafRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraReady])

  useEffect(() => () => { stopCamera() }, [])

  async function handleSubmit() {
    if (samples.length < 1) return
    setStep("submitting")
    try {
      await faceApi.register(samples)
      setStep("done")
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Xatolik yuz berdi")
      setStep("error")
    }
  }

  function startCapture() {
    setStep("loading")
  }

  function startCamera() {
    setSampleIdx(0); setSamples([])
    holdFrameRef.current = 0; capturingRef.current = false
    setStep("liveness")
  }

  function retry() {
    setSamples([]); setSampleIdx(0); setSubmitError(null)
    setCameraReady(false); setFaceDetected(false); setConfidence(0)
    setHoldPct(0); setCaptured(false); holdFrameRef.current = 0
    capturingRef.current = false; setStep("intro")
  }

  const confColor = confidence >= 70 ? "#22c55e" : confidence >= 45 ? "#f59e0b" : "#ef4444"

  return (
    <>
      <Script src="/face-api.min.js" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />

      <div className="flex min-h-screen items-center justify-center p-6" style={{ backgroundColor: "#f6f9ff" }}>
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mb-2 inline-flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px]" style={{ backgroundColor: "#0e58a8" }}>
                <span className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-poppins)" }}>L</span>
              </div>
              <span className="text-xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>LMS Pro</span>
            </div>
            <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Face ID sozlash</p>
          </div>

          <div className="rounded-[15px] bg-white p-8" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 30px rgba(1,41,112,0.08)" }}>

            {/* ── Intro ── */}
            {step === "intro" && (
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full" style={{ backgroundColor: "#f0f5ff", border: "3px solid rgba(14,88,168,0.2)" }}>
                  <Camera className="h-12 w-12" style={{ color: "#0e58a8" }} />
                </div>
                <div>
                  <h2 className="mb-2 text-xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Face ID ni sozlang</h2>
                  <p className="text-sm leading-relaxed" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    Tizimga kirish va imtihon monitoring uchun yuz tasvirini ro&apos;yxatga olishingiz kerak. Jarayon bir necha soniya davom etadi.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 text-left">
                  {["Yaxshi yoritilgan joyda turing", "Kamera oldida to'g'ri qaragan holda turing", "Ko'zoynak yoki niqob kiymasligingiz tavsiya etiladi"].map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-[8px] p-3" style={{ backgroundColor: "#f6f9ff" }}>
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "#f0fbfd" }}>
                        <span className="text-xs font-semibold" style={{ color: "#1cc2dc" }}>{i + 1}</span>
                      </div>
                      <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{tip}</p>
                    </div>
                  ))}
                </div>
                <button onClick={startCapture} className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] font-medium text-white" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  Boshlash <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* ── Loading models ── */}
            {step === "loading" && (
              <div className="flex flex-col items-center gap-5">
                <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#0e58a8" }} />
                <div className="w-full flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{loadStatus}</p>
                    <span className="text-xs font-semibold" style={{ color: "#0e58a8" }}>{loadedCount}/3</span>
                  </div>
                  <div className="h-2 w-full rounded-full" style={{ backgroundColor: "rgba(1,41,112,0.08)" }}>
                    <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${(loadedCount / 3) * 100}%`, backgroundColor: "#0e58a8" }} />
                  </div>
                </div>
                <p className="text-xs text-center" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Yuz tanish modellari yuklanmoqda...</p>
              </div>
            )}

            {/* ── Camera start ── */}
            {step === "camera" && (
              <div className="flex flex-col items-center gap-5">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "#f0f5ff" }}>
                  <Camera className="w-10 h-10" style={{ color: "#0e58a8" }} />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold mb-1" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Kamerani yoqing</p>
                  <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    Kameraga qarang — yuz avtomatik aniqlanadi va {TOTAL_SAMPLES} ta surat olinadi.
                  </p>
                </div>
                <button onClick={startCamera} className="flex items-center gap-2 px-6 py-3 rounded-[8px] text-sm font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                  <Camera className="w-4 h-4" /> Kamerani yoqish
                </button>
              </div>
            )}

            {/* ── Liveness capture ── */}
            {step === "liveness" && (
              <div className="flex flex-col gap-4">
                {/* Sample dots */}
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium" style={{ color: "#7293b9" }}>Suratlar:</p>
                  <div className="flex items-center gap-2 ml-1">
                    {Array.from({ length: TOTAL_SAMPLES }).map((_, i) => (
                      <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                        style={{
                          backgroundColor: i < sampleIdx ? "#22c55e" : i === sampleIdx ? "#0e58a8" : "#f0f5ff",
                          color: i <= sampleIdx ? "#fff" : "#94a3b8",
                          transform: i === sampleIdx && captured ? "scale(1.3)" : "scale(1)",
                        }}>
                        {i < sampleIdx ? "✓" : i + 1}
                      </div>
                    ))}
                  </div>
                  <span className="ml-auto text-xs font-bold" style={{ color: "#0e58a8" }}>{sampleIdx}/{TOTAL_SAMPLES}</span>
                </div>

                {/* Camera view */}
                <div className="relative flex justify-center rounded-[12px] overflow-hidden" style={{ backgroundColor: "#111", border: "2px solid rgba(14,88,168,0.3)" }}>
                  {!cameraReady && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3" style={{ backgroundColor: "#111" }}>
                      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#0e58a8" }} />
                      <p className="text-xs" style={{ color: "#7293b9" }}>Kamera yoqilmoqda...</p>
                    </div>
                  )}
                  {captured && (
                    <div className="absolute inset-0 z-20 pointer-events-none" style={{ backgroundColor: "rgba(34,197,94,0.18)" }} />
                  )}
                  <video ref={videoRef} autoPlay playsInline muted className="block w-full" style={{ maxHeight: 300, objectFit: "cover", transform: "scaleX(-1)" }} />
                  <canvas ref={canvasRef} width={CVS_W} height={CVS_H} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }} />
                </div>

                {/* Status */}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium" style={{ color: "#012970" }}>
                    {captured ? "✓ Surat qabul qilindi!" : faceDetected ? "Barqaror turing" : "Yuzingizni kameraga to'g'rilang"}
                  </p>
                  <span className="shrink-0 text-sm font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: faceDetected ? (confidence >= 70 ? "#dcfce7" : "#fff8e6") : "#f1f5f9", color: faceDetected ? confColor : "#94a3b8" }}>
                    {faceDetected ? `${confidence}%` : "—"}
                  </span>
                </div>

                {/* Hold progress */}
                <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "rgba(1,41,112,0.08)" }}>
                  <div className="h-2 rounded-full transition-all duration-100" style={{ width: `${holdPct}%`, backgroundColor: holdPct >= 100 ? "#22c55e" : "#0e58a8" }} />
                </div>
              </div>
            )}

            {/* ── Confirm ── */}
            {step === "confirm" && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: "#f0fff4" }}>
                    <CheckCircle2 className="w-5 h-5" style={{ color: "#22c55e" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#012970" }}>{samples.length} ta surat olindi</p>
                    <p className="text-xs mt-0.5" style={{ color: "#7293b9" }}>Yuz ma&apos;lumotlarini saqlashni tasdiqlang</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-[8px]" style={{ backgroundColor: "#f0f5ff", border: "1px solid rgba(14,88,168,0.2)" }}>
                  <ScanFace className="w-5 h-5 shrink-0" style={{ color: "#0e58a8" }} />
                  <p className="text-xs" style={{ color: "#012970" }}>Yuz ma&apos;lumotlari xavfsiz saqlanadi. Imtihon oldidan yuzingiz tekshiriladi.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSubmit} className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-semibold flex-1 justify-center hover:opacity-90 transition-opacity" style={{ backgroundColor: "#0e58a8", color: "#fff" }}>
                    <CheckCircle2 className="w-4 h-4" /> Saqlash
                  </button>
                  <button onClick={() => { stopCamera(); setStep("camera") }} className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium hover:opacity-80 transition-opacity" style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9" }}>
                    <RotateCcw className="w-4 h-4" /> Qaytadan
                  </button>
                </div>
              </div>
            )}

            {/* ── Submitting ── */}
            {step === "submitting" && (
              <div className="flex flex-col items-center gap-4 py-6">
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#0e58a8" }} />
                <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Ma&apos;lumotlar saqlanmoqda...</p>
              </div>
            )}

            {/* ── Done ── */}
            {step === "done" && (
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: "#f0fff4" }}>
                  <CheckCircle2 className="h-12 w-12" style={{ color: "#22c55e" }} />
                </div>
                <div>
                  <h2 className="mb-2 text-xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Muvaffaqiyatli!</h2>
                  <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    Face ID muvaffaqiyatli ro&apos;yxatga olindi. Endi tizimga yuz orqali kirishingiz mumkin.
                  </p>
                </div>
                <div className="flex w-full items-center gap-3 rounded-[8px] p-4" style={{ backgroundColor: "#f0fff4", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "#22c55e" }} />
                  <p className="text-sm" style={{ color: "#22c55e", fontFamily: "var(--font-poppins)" }}>Yuz ma&apos;lumotlari xavfsiz saqlandi</p>
                </div>
                <a href="/login" className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] font-medium text-white" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  Kirish sahifasiga o&apos;tish
                </a>
              </div>
            )}

            {/* ── Error ── */}
            {step === "error" && (
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: "#fff0f0" }}>
                  <AlertTriangle className="h-12 w-12" style={{ color: "#ef4444" }} />
                </div>
                <div>
                  <h2 className="mb-2 text-xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Xatolik yuz berdi</h2>
                  <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {submitError || "Yuz aniqlanmadi yoki sifat yetarli emas."}
                  </p>
                </div>
                <button onClick={retry} className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] font-medium" style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  <RefreshCw className="h-4 w-4" /> Qayta urinish
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
