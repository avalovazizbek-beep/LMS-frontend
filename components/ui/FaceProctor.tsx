"use client"

import { useEffect, useRef, useState, useCallback, ReactNode } from "react"
import Script from "next/script"
import { ShieldAlert, ShieldCheck, ShieldX, Camera, Loader2 } from "lucide-react"
import { faceApi } from "@/lib/api"

declare global {
  interface Window { faceapi: any }
}

/* ── Config ─────────────────────────────────────────────────────────── */
const MODEL_URL        = "/models"
const TINY_CONF        = 0.4           // TinyFaceDetector threshold (presence)
const VERIFY_INTERVAL  = 5000          // ms between identity verifications
const ABSENT_LIMIT     = 12000         // ms face can be absent before violation
const MAX_VIOLATIONS   = 3

/* ── Types ───────────────────────────────────────────────────────────── */
type ProcStatus = "loading" | "ready" | "ok" | "warning" | "violation" | "error"

interface FaceProcProps {
  children: ReactNode
  onTerminate?: () => void          // called when 3rd violation triggers exam end
  disabled?: boolean                // externally disable proctoring
}

/* ── Component ──────────────────────────────────────────────────────── */
export default function FaceProctor({ children, onTerminate, disabled = false }: FaceProcProps) {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const rafRef        = useRef<number>(0)
  const verifyTimerRef= useRef<ReturnType<typeof setInterval> | null>(null)
  const absentSince   = useRef<number | null>(null)
  const isVerifyingRef= useRef(false)

  const [scriptReady,  setScriptReady]  = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [cameraReady,  setCameraReady]  = useState(false)
  const [status,       setStatus]       = useState<ProcStatus>("loading")
  const [violations,   setViolations]   = useState(0)
  const [statusMsg,    setStatusMsg]    = useState("Yuklanmoqda...")
  const [examBlocked,  setExamBlocked]  = useState(false)
  const [confidence,   setConfidence]   = useState<number | null>(null)

  /* ── Load models ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!scriptReady) return
    ;(async () => {
      try {
        const fa = window.faceapi
        // TinyFaceDetector for fast presence detection every frame
        await fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
        // SSD + recognition for periodic identity verification
        await fa.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
        await fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
        await fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        setModelsLoaded(true)
      } catch {
        setStatus("error")
        setStatusMsg("Model yuklanmadi")
      }
    })()
  }, [scriptReady])

  /* ── Start camera after models loaded ───────────────────────────── */
  useEffect(() => {
    if (!modelsLoaded || disabled) return
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" } })
      .then(stream => {
        const vid = videoRef.current
        if (!vid) return
        vid.srcObject = stream
        vid.onloadedmetadata = () => {
          vid.play().then(() => setCameraReady(true)).catch(() => setCameraReady(true))
        }
      })
      .catch(() => {
        setStatus("error")
        setStatusMsg("Kameraga ruxsat berilmadi")
      })
  }, [modelsLoaded, disabled])

  /* ── Stop everything ─────────────────────────────────────────────── */
  function stopAll() {
    cancelAnimationFrame(rafRef.current)
    if (verifyTimerRef.current) clearInterval(verifyTimerRef.current)
    const vid = videoRef.current
    if (vid?.srcObject) {
      ;(vid.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      vid.srcObject = null
    }
  }

  /* ── Record a violation ──────────────────────────────────────────── */
  const addViolation = useCallback((reason: string) => {
    setViolations(prev => {
      const next = prev + 1
      setExamBlocked(true)
      if (next >= MAX_VIOLATIONS) {
        setStatus("violation")
        setStatusMsg(`${MAX_VIOLATIONS} ta xatolik — imtihon yakunlandi`)
        stopAll()
        onTerminate?.()
      } else {
        setStatus("warning")
        setStatusMsg(`Xatolik ${next}/${MAX_VIOLATIONS}: ${reason}`)
        // Unblock after 4s so student can see the warning
        setTimeout(() => {
          setExamBlocked(false)
          setStatus("ok")
          setStatusMsg("Tekshiruv davom etmoqda")
        }, 4000)
      }
      return next
    })
  }, [onTerminate])

  /* ── Periodic identity verification (every VERIFY_INTERVAL ms) ────── */
  const runVerify = useCallback(async () => {
    if (isVerifyingRef.current) return
    const vid = videoRef.current
    if (!vid || !vid.videoWidth || vid.readyState < 2) return

    isVerifyingRef.current = true
    try {
      const fa = window.faceapi
      const result = await fa
        .detectSingleFace(vid, new fa.SsdMobilenetv1Options({ minConfidence: 0.4 }))
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!result) {
        // No face found — absence handled by RAF loop; identity skip
        isVerifyingRef.current = false
        return
      }

      const descriptor = Array.from(result.descriptor) as number[]
      const res = await faceApi.verify(descriptor)

      if (!res.verified) {
        const conf = res.confidence !== undefined ? Math.round(res.confidence * 100) : 0
        setConfidence(conf)
        addViolation(
          res.reason === "not_registered"
            ? "Yuz ro'yxatdan o'tmagan"
            : res.reason === "expired"
            ? "Yuz ma'lumotlari muddati tugagan"
            : `Yuz mos kelmadi (${conf}%)`
        )
      } else {
        const conf = res.confidence !== undefined ? Math.round(res.confidence * 100) : null
        setConfidence(conf)
        setStatus("ok")
        setStatusMsg(`Tasdiqlandi${conf !== null ? ` — ${conf}%` : ""}`)
      }
    } catch {
      // Network/backend error — don't penalize student
    } finally {
      isVerifyingRef.current = false
    }
  }, [addViolation])

  /* ── RAF loop: fast presence check with TinyFaceDetector ─────────── */
  const presenceLoop = useCallback(async () => {
    const vid = videoRef.current
    if (!vid || vid.paused || vid.ended) return
    if (!vid.videoWidth || vid.readyState < 2) {
      rafRef.current = requestAnimationFrame(presenceLoop)
      return
    }

    try {
      const fa = window.faceapi
      const det = await fa.detectSingleFace(
        vid,
        new fa.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: TINY_CONF })
      )

      if (!det) {
        // Face absent
        if (absentSince.current === null) absentSince.current = Date.now()
        const absentMs = Date.now() - absentSince.current
        if (absentMs >= ABSENT_LIMIT) {
          absentSince.current = null
          addViolation("Yuz kamerada ko'rinmadi (12 soniya)")
        } else {
          const secs = Math.ceil((ABSENT_LIMIT - absentMs) / 1000)
          setStatus("warning")
          setStatusMsg(`Yuz ko'rinmayapti — ${secs}s`)
          setExamBlocked(false)
        }
      } else {
        // Face present
        absentSince.current = null
        if (status !== "ok" && status !== "loading") {
          setStatus("ok")
          setStatusMsg("Kuzatilmoqda")
        }
      }
    } catch {
      // ignore frame errors
    }

    rafRef.current = requestAnimationFrame(presenceLoop)
  }, [addViolation, status])

  /* ── Kick off loops when camera is ready ─────────────────────────── */
  useEffect(() => {
    if (!cameraReady) return
    setStatus("ok")
    setStatusMsg("Kuzatilmoqda")

    // Presence loop (RAF — as fast as possible)
    rafRef.current = requestAnimationFrame(presenceLoop)

    // Identity loop (interval — every VERIFY_INTERVAL ms)
    runVerify() // immediate first check
    verifyTimerRef.current = setInterval(runVerify, VERIFY_INTERVAL)

    return () => {
      cancelAnimationFrame(rafRef.current)
      if (verifyTimerRef.current) clearInterval(verifyTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraReady])

  /* ── Cleanup on unmount ──────────────────────────────────────────── */
  useEffect(() => () => { stopAll() }, [])

  /* ── Status colors ───────────────────────────────────────────────── */
  const colors: Record<ProcStatus, { bg: string; border: string; text: string; icon: string }> = {
    loading:   { bg: "#f0f5ff", border: "rgba(14,88,168,0.2)",   text: "#0e58a8", icon: "#0e58a8" },
    ready:     { bg: "#f0f5ff", border: "rgba(14,88,168,0.2)",   text: "#0e58a8", icon: "#0e58a8" },
    ok:        { bg: "#f0fff4", border: "rgba(34,197,94,0.3)",   text: "#166534", icon: "#22c55e" },
    warning:   { bg: "#fff8e6", border: "rgba(245,158,11,0.4)",  text: "#92400e", icon: "#f59e0b" },
    violation: { bg: "#fff0f0", border: "rgba(239,68,68,0.4)",   text: "#7f1d1d", icon: "#ef4444" },
    error:     { bg: "#fff0f0", border: "rgba(239,68,68,0.3)",   text: "#7f1d1d", icon: "#ef4444" },
  }
  const c = colors[status]

  const StatusIcon = status === "ok"
    ? ShieldCheck
    : status === "violation" || status === "error"
    ? ShieldX
    : ShieldAlert

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <>
      <Script src="/face-api.min.js" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />

      <div className="relative flex flex-col gap-4">

        {/* ── Proctoring widget (top-right corner) ── */}
        <div
          className="flex items-stretch gap-0 rounded-[10px] overflow-hidden self-end"
          style={{ border: `1.5px solid ${c.border}`, backgroundColor: c.bg, minWidth: 260 }}
        >
          {/* Camera preview */}
          <div className="relative shrink-0" style={{ width: 88, height: 66, backgroundColor: "#111" }}>
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#7293b9" }} />
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay playsInline muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {/* Violation dots */}
            <div className="absolute bottom-1 left-1 flex gap-1">
              {Array.from({ length: MAX_VIOLATIONS }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: i < violations ? "#ef4444" : "rgba(255,255,255,0.3)" }}
                />
              ))}
            </div>
          </div>

          {/* Status info */}
          <div className="flex items-center gap-2 px-3 py-2 flex-1">
            <StatusIcon className="w-4 h-4 shrink-0" style={{ color: c.icon }} />
            <div className="flex flex-col min-w-0">
              <p className="text-[11px] font-semibold truncate" style={{ color: c.text, fontFamily: "var(--font-poppins)" }}>
                {statusMsg}
              </p>
              <p className="text-[10px]" style={{ color: c.text, opacity: 0.7, fontFamily: "var(--font-poppins)" }}>
                Face ID • {violations}/{MAX_VIOLATIONS} xatolik
                {confidence !== null ? ` • ${confidence}%` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* ── Blocked overlay ── */}
        {examBlocked && violations < MAX_VIOLATIONS && (
          <div
            className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-[10px] gap-4"
            style={{ backgroundColor: "rgba(239,68,68,0.08)", backdropFilter: "blur(4px)", border: "2px solid rgba(239,68,68,0.3)" }}
          >
            <ShieldAlert className="w-12 h-12" style={{ color: "#ef4444" }} />
            <div className="text-center px-8">
              <p className="text-base font-bold mb-1" style={{ color: "#7f1d1d", fontFamily: "var(--font-poppins)" }}>
                Face ID xatoligi — {violations}/{MAX_VIOLATIONS}
              </p>
              <p className="text-sm" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
                {statusMsg}
              </p>
              <p className="text-xs mt-2" style={{ color: "#b45309", fontFamily: "var(--font-poppins)" }}>
                Imtihon 4 soniyadan so'ng davom etadi...
              </p>
            </div>
          </div>
        )}

        {/* ── Exam terminated overlay ── */}
        {violations >= MAX_VIOLATIONS && (
          <div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-[10px] gap-4"
            style={{ backgroundColor: "rgba(239,68,68,0.12)", backdropFilter: "blur(8px)", border: "2px solid rgba(239,68,68,0.5)" }}
          >
            <ShieldX className="w-16 h-16" style={{ color: "#ef4444" }} />
            <div className="text-center px-8">
              <p className="text-lg font-bold mb-2" style={{ color: "#7f1d1d", fontFamily: "var(--font-poppins)" }}>
                Imtihon yakunlandi
              </p>
              <p className="text-sm" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
                {MAX_VIOLATIONS} ta Face ID xatoligi qayd etildi.
                Natijalar avtomatik yuborildi.
              </p>
            </div>
          </div>
        )}

        {/* ── Exam content ── */}
        <div
          className="relative"
          style={{ pointerEvents: examBlocked || violations >= MAX_VIOLATIONS ? "none" : "auto",
                   opacity: examBlocked ? 0.4 : 1,
                   transition: "opacity 0.3s" }}
        >
          {children}
        </div>

      </div>
    </>
  )
}
