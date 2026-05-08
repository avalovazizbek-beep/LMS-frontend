"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import {
  ArrowLeft, Camera, CheckCircle2, AlertCircle, Loader2, ScanFace, RotateCcw,
} from "lucide-react"
import { faceApi } from "@/lib/api"

/* ── Types ──────────────────────────────────────────────────────────── */
declare global {
  interface Window { faceapi: any }
}

type Phase = "loading" | "camera" | "liveness" | "capturing" | "confirm" | "submitting" | "done" | "error"

interface LivenessStep {
  id: string
  label: string
  hint: string
  check: (ratio: number) => boolean
}

const LIVENESS_STEPS: LivenessStep[] = [
  { id: "center1", label: "To'g'ri qarang",   hint: "Yuzingizni kameraga to'g'ri qarating",   check: r => r >= 0.38 && r <= 0.62 },
  { id: "left",    label: "Chapga burilng",   hint: "Boshingizni biroz chapga burilng",         check: r => r < 0.38 },
  { id: "center2", label: "Qaytib qarang",    hint: "Yana kameraga to'g'ri qarang",             check: r => r >= 0.38 && r <= 0.62 },
]

const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights"
const HOLD_MS   = 2000   // hold pose this long to capture
const MIN_CONF  = 0.75

/* ── Component ──────────────────────────────────────────────────────── */
export default function FaceRegisterPage() {
  const router    = useRouter()
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const holdRef   = useRef<{ startMs: number; stepIdx: number } | null>(null)

  const [phase,        setPhase]        = useState<Phase>("loading")
  const [scriptReady,  setScriptReady]  = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [loadStatus,   setLoadStatus]   = useState("Face-api yuklanmoqda...")
  const [stepIdx,      setStepIdx]      = useState(0)
  const [progress,     setProgress]     = useState(0)   // 0–100 for hold bar
  const [samples,      setSamples]      = useState<number[][]>([])
  const [statusMsg,    setStatusMsg]    = useState("")
  const [submitError,  setSubmitError]  = useState<string | null>(null)
  const [capturing,    setCapturing]    = useState(false)

  /* ── Load models after script is ready ─────────────────────────── */
  useEffect(() => {
    if (!scriptReady) return
    ;(async () => {
      try {
        const fa = window.faceapi
        setLoadStatus("TinyFaceDetector yuklanmoqda...")
        await fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
        setLoadStatus("FaceLandmark modeli yuklanmoqda...")
        await fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
        setLoadStatus("FaceRecognition modeli yuklanmoqda...")
        await fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        setModelsLoaded(true)
        setPhase("camera")
      } catch {
        setLoadStatus("Modellarni yuklashda xatolik. Internet aloqasini tekshiring.")
      }
    })()
  }, [scriptReady])

  /* ── Start camera ───────────────────────────────────────────────── */
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setPhase("liveness")
        setStepIdx(0)
        setSamples([])
        holdRef.current = null
      }
    } catch {
      setPhase("error")
      setSubmitError("Kameraga ruxsat berilmadi. Brauzer sozlamalarini tekshiring.")
    }
  }

  /* ── Stop camera ────────────────────────────────────────────────── */
  function stopCamera() {
    cancelAnimationFrame(rafRef.current)
    const vid = videoRef.current
    if (vid?.srcObject) {
      (vid.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      vid.srcObject = null
    }
  }

  /* ── Detect pose from landmarks ─────────────────────────────────── */
  function getPoseRatio(landmarks: any): number {
    const pts = landmarks.positions
    if (!pts || pts.length < 17) return 0.5
    const noseTip  = pts[30]
    const leftJaw  = pts[0]
    const rightJaw = pts[16]
    const w = rightJaw.x - leftJaw.x
    if (w < 10) return 0.5
    return (noseTip.x - leftJaw.x) / w
  }

  /* ── Detection loop ─────────────────────────────────────────────── */
  const detect = useCallback(async (curStep: number, curSamples: number[][]) => {
    const vid = videoRef.current
    const cvs = canvasRef.current
    if (!vid || !cvs || vid.paused || vid.ended) return

    const fa = window.faceapi
    const detection = await fa
      .detectSingleFace(vid, new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: MIN_CONF }))
      .withFaceLandmarks()
      .withFaceDescriptor()

    const ctx = cvs.getContext("2d")
    if (ctx) {
      ctx.clearRect(0, 0, cvs.width, cvs.height)
    }

    if (!detection) {
      setStatusMsg("Yuz aniqlanmadi. Kamera oldiga yaqinroq turing.")
      setProgress(0)
      holdRef.current = null
      rafRef.current = requestAnimationFrame(() => detect(curStep, curSamples))
      return
    }

    // Draw box
    if (ctx) {
      const { x, y, width, height } = detection.detection.box
      ctx.strokeStyle = "#1cc2dc"
      ctx.lineWidth   = 2
      ctx.strokeRect(x, y, width, height)
    }

    const step  = LIVENESS_STEPS[curStep]
    const ratio = getPoseRatio(detection.landmarks)
    const pass  = step.check(ratio)

    if (pass) {
      const now = Date.now()
      if (!holdRef.current || holdRef.current.stepIdx !== curStep) {
        holdRef.current = { startMs: now, stepIdx: curStep }
      }
      const elapsed = now - holdRef.current.startMs
      const pct     = Math.min(100, Math.round((elapsed / HOLD_MS) * 100))
      setProgress(pct)
      setStatusMsg(`${step.label} ✓`)

      if (elapsed >= HOLD_MS && !capturing) {
        setCapturing(true)
        holdRef.current = null
        const descriptor = Array.from(detection.descriptor) as number[]
        const newSamples = [...curSamples, descriptor]
        setSamples(newSamples)

        const nextStep = curStep + 1
        if (nextStep >= LIVENESS_STEPS.length) {
          setPhase("confirm")
          stopCamera()
          return
        }
        setStepIdx(nextStep)
        setProgress(0)
        setCapturing(false)
        rafRef.current = requestAnimationFrame(() => detect(nextStep, newSamples))
        return
      }
    } else {
      setProgress(0)
      holdRef.current = null
      setStatusMsg(step.hint)
    }

    setCapturing(false)
    rafRef.current = requestAnimationFrame(() => detect(curStep, curSamples))
  }, [capturing])

  /* ── Start detection when phase = liveness ──────────────────────── */
  useEffect(() => {
    if (phase !== "liveness") return
    setProgress(0)
    setStatusMsg(LIVENESS_STEPS[0].hint)
    const tid = setTimeout(() => {
      rafRef.current = requestAnimationFrame(() => detect(0, []))
    }, 500)
    return () => {
      clearTimeout(tid)
      cancelAnimationFrame(rafRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  /* ── Cleanup on unmount ─────────────────────────────────────────── */
  useEffect(() => () => { stopCamera() }, [])

  /* ── Submit to backend ──────────────────────────────────────────── */
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

  /* ── Restart ────────────────────────────────────────────────────── */
  function restart() {
    setSamples([])
    setStepIdx(0)
    setProgress(0)
    setSubmitError(null)
    setPhase("camera")
  }

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <div className="flex flex-col gap-6 p-[30px] max-w-[720px]">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => { stopCamera(); router.back() }}
            className="flex items-center justify-center w-9 h-9 rounded-[8px] hover:bg-[#f0f5ff] transition-colors shrink-0"
            style={{ border: "1px solid rgba(1,41,112,0.15)" }}>
            <ArrowLeft className="w-4 h-4" style={{ color: "#0e58a8" }} />
          </button>
          <div>
            <h1 className="text-[24px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              Yuzni ro&apos;yxatdan o&apos;tkazish
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              Kamera orqali 3 qadamli tekshiruv
            </p>
          </div>
        </div>

        {/* ── Loading phase ── */}
        {(phase === "loading") && (
          <div className="bg-white rounded-[10px] p-10 flex flex-col items-center gap-4"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#0e58a8" }} />
            <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {loadStatus}
            </p>
            <p className="text-xs text-center" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              Face-api.js modellari birinchi marta yuklanmoqda. Bu bir necha daqiqa olishi mumkin.
            </p>
          </div>
        )}

        {/* ── Camera start phase ── */}
        {phase === "camera" && (
          <div className="bg-white rounded-[10px] p-8 flex flex-col items-center gap-5"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#f0f5ff" }}>
              <Camera className="w-10 h-10" style={{ color: "#0e58a8" }} />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold mb-1" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                Kamerani yoqing
              </p>
              <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Yuzni ro&apos;yxatdan o&apos;tkazish uchun 3 qadamdan o&apos;tishingiz kerak bo&apos;ladi.
                Yaxshi yoritilgan joyda turing.
              </p>
            </div>
            {/* Steps preview */}
            <div className="flex items-center gap-3 w-full">
              {LIVENESS_STEPS.map((s, i) => (
                <div key={s.id} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{ backgroundColor: "#f0f5ff", color: "#0e58a8" }}>
                    {i + 1}
                  </div>
                  <p className="text-xs text-center" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {s.label}
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

        {/* ── Liveness phase ── */}
        {phase === "liveness" && (
          <div className="bg-white rounded-[10px] overflow-hidden"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>

            {/* Step indicators */}
            <div className="flex border-b" style={{ borderColor: "rgba(1,41,112,0.08)" }}>
              {LIVENESS_STEPS.map((s, i) => {
                const done    = i < stepIdx
                const active  = i === stepIdx
                return (
                  <div key={s.id} className="flex-1 flex flex-col items-center gap-1 py-3 px-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{
                        backgroundColor: done ? "#22c55e" : active ? "#0e58a8" : "#f0f5ff",
                        color:           done ? "#fff"    : active ? "#fff"    : "#7293b9",
                      }}>
                      {done ? "✓" : i + 1}
                    </div>
                    <p className="text-xs text-center" style={{
                      color: active ? "#012970" : "#7293b9",
                      fontFamily: "var(--font-poppins)",
                      fontWeight: active ? 600 : 400,
                    }}>
                      {s.label}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Camera view */}
            <div className="relative flex justify-center" style={{ backgroundColor: "#000" }}>
              <video ref={videoRef} autoPlay playsInline muted
                className="block"
                style={{ width: "100%", maxWidth: 640, height: 360, objectFit: "cover", transform: "scaleX(-1)" }} />
              <canvas ref={canvasRef} width={640} height={360}
                className="absolute top-0 left-0 w-full h-full"
                style={{ transform: "scaleX(-1)", pointerEvents: "none" }} />
            </div>

            {/* Status & progress */}
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {LIVENESS_STEPS[stepIdx]?.hint ?? ""}
                </p>
                <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {statusMsg}
                </p>
              </div>
              {/* Hold progress bar */}
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: "rgba(1,41,112,0.08)" }}>
                <div className="h-2 rounded-full transition-all duration-100"
                  style={{ width: `${progress}%`, backgroundColor: progress === 100 ? "#22c55e" : "#1cc2dc" }} />
              </div>
              <p className="text-xs text-center" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Bu pozitsiyani {(HOLD_MS / 1000).toFixed(0)} soniya ushlab turing
              </p>
            </div>
          </div>
        )}

        {/* ── Confirm phase ── */}
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
                Ma&apos;lumotlar 30 kun davomida saqlangan bo&apos;ladi. Imtihon oldidan yuzingiz tekshiriladi.
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
              Ma&apos;lumotlaringiz 30 kun davomida saqlandi.
              Imtihon oldidan yuz tasdiqlovi o&apos;tkaziladi.
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
