"use client"

import { useEffect, useRef, useState, useCallback, ReactNode } from "react"
import Script from "next/script"
import { ShieldAlert, ShieldCheck, ShieldX, Loader2 } from "lucide-react"
import { faceApi } from "@/lib/api"

declare global {
  interface Window { faceapi: any }
}

/* ── Config ─────────────────────────────────────────────────────────── */
const MODEL_URL           = "/models"
const TINY_CONF           = 0.30   // 0.25→0.30: kamroq soxta aniqlash
const VERIFY_INTERVAL     = 6000   // 10s→6s: tezroq tekshiruv
const ABSENT_LIMIT        = 10000
const MAX_VIOLATIONS      = 5
const LIVENESS_INTERVAL   = 400
const EAR_THRESHOLD       = 0.22
const BLINK_TIMEOUT       = 90000
const VERIFY_FAIL_LIMIT   = 2
const MULTI_FACE_INTERVAL = 4000   // 8s→4s: tezroq ko'p-yuz tekshiruv

function eyeAspectRatio(eye: { x: number; y: number }[]): number {
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y)
  const vertical = dist(eye[1], eye[5]) + dist(eye[2], eye[4])
  const horizontal = dist(eye[0], eye[3])
  if (horizontal === 0) return EAR_THRESHOLD
  return vertical / (2 * horizontal)
}

type ProcStatus = "loading" | "ready" | "ok" | "warning" | "violation" | "error"

interface FaceProcProps {
  children: ReactNode
  onTerminate?: () => void
  onFirstVerified?: () => void   // fires once after first successful identity verification
  disabled?: boolean
  fixed?: boolean                // render widget + overlays as position:fixed
}

export default function FaceProctor({
  children, onTerminate, onFirstVerified, disabled = false, fixed = false,
}: FaceProcProps) {
  const videoRef            = useRef<HTMLVideoElement>(null)
  const rafRef              = useRef<number>(0)
  const verifyTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const absentSince         = useRef<number | null>(null)
  const isVerifyingRef      = useRef(false)
  const lastLivenessCheck   = useRef(0)
  const eyesClosedRef       = useRef(false)
  const lastBlinkTime       = useRef<number | null>(null)
  const consecutiveVerifyFails = useRef(0)
  const firstVerifiedFiredRef  = useRef(false)
  const onFirstVerifiedRef     = useRef(onFirstVerified)
  const lastMultiFaceCheck     = useRef(0)
  const multiPersonRef         = useRef(false)                  // ko'p yuz blok holati
  const multiPersonTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusRef              = useRef<ProcStatus>("loading")  // RAF da fresh qiymat
  useEffect(() => { onFirstVerifiedRef.current = onFirstVerified }, [onFirstVerified])

  const [scriptReady,  setScriptReady]  = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [cameraReady,  setCameraReady]  = useState(false)
  const [status,       setStatus]       = useState<ProcStatus>("loading")
  const setStatusSynced = useCallback((s: ProcStatus) => {
    statusRef.current = s
    setStatus(s)
  }, [])
  const [violations,   setViolations]   = useState(0)
  const [statusMsg,    setStatusMsg]    = useState("Yuklanmoqda...")
  const [examBlocked,      setExamBlocked]      = useState(false)
  const [multiPersonBlocked, setMultiPersonBlocked] = useState(false)
  const [confidence,   setConfidence]   = useState<number | null>(null)
  const [violationSnap,    setViolationSnap]    = useState<string | null>(null)
  const [violationHistory, setViolationHistory] = useState<{ reason: string; time: string }[]>([])

  useEffect(() => {
    if (!scriptReady) return
    ;(async () => {
      try {
        const fa = window.faceapi
        // Parallel yuklash — SsdMobilenetv1 olib tashlandi (5.6 MB tejaldi)
        // TinyFaceDetector ham verification uchun ishlatiladi (3-5x tezroq)
        await Promise.all([
          fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        setModelsLoaded(true)
      } catch {
        setStatusSynced("error")
        setStatusMsg("Model yuklanmadi")
      }
    })()
  }, [scriptReady])

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
        setStatusSynced("error")
        setStatusMsg("Kameraga ruxsat berilmadi")
      })
  }, [modelsLoaded, disabled])

  function stopAll() {
    cancelAnimationFrame(rafRef.current)
    if (verifyTimerRef.current) clearInterval(verifyTimerRef.current)
    if (multiPersonTimerRef.current) clearTimeout(multiPersonTimerRef.current)
    const vid = videoRef.current
    if (vid?.srcObject) {
      ;(vid.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      vid.srcObject = null
    }
  }

  const violationsRef = useRef(0)  // state updater ichida ishlatish uchun ref

  const addViolation = useCallback((reason: string) => {
    // Xatolik paytidagi video kadr
    try {
      const vid = videoRef.current
      if (vid && vid.videoWidth > 0 && vid.readyState >= 2) {
        const canvas = document.createElement("canvas")
        canvas.width = vid.videoWidth
        canvas.height = vid.videoHeight
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.save()
          ctx.scale(-1, 1)
          ctx.drawImage(vid, -canvas.width, 0)
          ctx.restore()
          setViolationSnap(canvas.toDataURL("image/jpeg", 0.55))
        }
      }
    } catch { /* ignore */ }

    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`
    setViolationHistory(h => [...h, { reason, time: timeStr }])

    // ref orqali hisoblash — state updater ichida setState chaqirishdan qochish
    violationsRef.current += 1
    const next = violationsRef.current
    setViolations(next)
    setExamBlocked(true)

    if (next >= MAX_VIOLATIONS) {
      setStatusSynced("violation")
      setStatusMsg(`${MAX_VIOLATIONS} ta xatolik — imtihon yakunlandi`)
      stopAll()
      // onTerminate ni render fazasidan tashqarida chaqirish (React xatosini oldini olish)
      setTimeout(() => onTerminate?.(), 0)
    } else {
      setStatusSynced("warning")
      setStatusMsg(`Xatolik ${next}/${MAX_VIOLATIONS}: ${reason}`)
      setTimeout(() => {
        setExamBlocked(false)
        setStatusSynced("ok")
        setStatusMsg("Tekshiruv davom etmoqda")
      }, 4000)
    }
  }, [onTerminate, setStatusSynced])

  const runVerify = useCallback(async () => {
    if (isVerifyingRef.current) return
    const vid = videoRef.current
    if (!vid || !vid.videoWidth || vid.readyState < 2) return

    isVerifyingRef.current = true
    try {
      const fa = window.faceapi
      // TinyFaceDetector ishlatildi — SsdMobilenetv1 o'rniga (3-5x tezroq, 5.6MB tejaldi)
      // inputSize: 224 — yuz identifikatsiyasi uchun yetarli aniqlik
      const result = await fa
        .detectSingleFace(vid, new fa.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: TINY_CONF }))
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!result) {
        consecutiveVerifyFails.current = 0
        isVerifyingRef.current = false
        return
      }

      const descriptor = Array.from(result.descriptor) as number[]
      const res = await faceApi.verify(descriptor)

      if (!res.verified) {
        if (res.reason === "not_registered" || res.reason === "expired") {
          consecutiveVerifyFails.current = 0
          const conf = res.confidence !== undefined ? Math.round(res.confidence * 100) : 0
          setConfidence(conf)
          addViolation(res.reason === "not_registered" ? "Yuz ro'yxatdan o'tmagan" : "Yuz ma'lumotlari muddati tugagan")
        } else {
          consecutiveVerifyFails.current += 1
          const conf = res.confidence !== undefined ? Math.round(res.confidence * 100) : 0
          setConfidence(conf)
          if (consecutiveVerifyFails.current >= VERIFY_FAIL_LIMIT) {
            consecutiveVerifyFails.current = 0
            addViolation(`Yuz mos kelmadi (${conf}% · ${VERIFY_FAIL_LIMIT}x tekshiruv)`)
          } else {
            setStatusSynced("warning")
            setStatusMsg(`Yuz tekshiruvda... (${conf}%)`)
          }
        }
      } else {
        consecutiveVerifyFails.current = 0
        const conf = res.confidence !== undefined ? Math.round(res.confidence * 100) : null
        setConfidence(conf)
        setStatusSynced("ok")
        setStatusMsg(`Tasdiqlandi${conf !== null ? ` — ${conf}%` : ""}`)
        if (!firstVerifiedFiredRef.current) {
          firstVerifiedFiredRef.current = true
          onFirstVerifiedRef.current?.()
        }
      }
    } catch {
      consecutiveVerifyFails.current = 0
    } finally {
      isVerifyingRef.current = false
    }
  }, [addViolation, setStatusSynced])

  const presenceLoop = useCallback(async () => {
    const vid = videoRef.current
    if (!vid || vid.paused || vid.ended) return
    if (!vid.videoWidth || vid.readyState < 2) {
      rafRef.current = requestAnimationFrame(presenceLoop)
      return
    }

    try {
      const fa = window.faceapi
      const tinyOptions = new fa.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: TINY_CONF })
      const now = Date.now()
      const checkLiveness = now - lastLivenessCheck.current >= LIVENESS_INTERVAL

      let det: any = null
      let landmarks: any = null
      if (checkLiveness) {
        lastLivenessCheck.current = now
        const full = await fa.detectSingleFace(vid, tinyOptions).withFaceLandmarks()
        det = full?.detection ?? null
        landmarks = full?.landmarks ?? null
      } else {
        det = await fa.detectSingleFace(vid, tinyOptions)
      }

      // Ko'p yuz tekshiruvi — aniqlansa darhol bloklash, 15s ichida ketsa — xatolik yo'q
      if (now - lastMultiFaceCheck.current >= MULTI_FACE_INTERVAL) {
        lastMultiFaceCheck.current = now
        try {
          const allFaces = await fa.detectAllFaces(vid, new fa.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.20 }))
          if (allFaces && allFaces.length > 1) {
            if (!multiPersonRef.current) {
              // Yangi bloklash — darhol to'xtatish
              multiPersonRef.current = true
              setMultiPersonBlocked(true)
              setExamBlocked(true)
              setStatusSynced("warning")
              setStatusMsg(`${allFaces.length} ta yuz aniqlandi — imtihon bloklanadi`)
              // 15 soniya ichida ketmasa → violation
              if (multiPersonTimerRef.current) clearTimeout(multiPersonTimerRef.current)
              multiPersonTimerRef.current = setTimeout(() => {
                if (multiPersonRef.current) {
                  multiPersonRef.current = false
                  setMultiPersonBlocked(false)
                  addViolation("Boshqa odam imtihon davomida aniqlandi")
                }
              }, 15000)
            }
          } else {
            // Ko'p yuz yo'qoldi — blokni olib tashlash
            if (multiPersonRef.current) {
              multiPersonRef.current = false
              setMultiPersonBlocked(false)
              if (multiPersonTimerRef.current) {
                clearTimeout(multiPersonTimerRef.current)
                multiPersonTimerRef.current = null
              }
              setExamBlocked(false)
              setStatusSynced("ok")
              setStatusMsg("Kuzatilmoqda")
            }
          }
        } catch { /* ignore */ }
      }

      if (!det) {
        if (absentSince.current === null) absentSince.current = Date.now()
        lastBlinkTime.current = null
        eyesClosedRef.current = false
        const absentMs = Date.now() - absentSince.current
        if (absentMs >= ABSENT_LIMIT) {
          absentSince.current = null
          addViolation("Yuz kamerada ko'rinmadi (10 soniya)")
        } else {
          const secs = Math.ceil((ABSENT_LIMIT - absentMs) / 1000)
          setStatusSynced("warning")
          setStatusMsg(`Yuz ko'rinmayapti — ${secs}s`)
        }
      } else {
        absentSince.current = null
        // statusRef.current — fresh qiymat (stale closure muammosi yo'q)
        if (statusRef.current !== "ok" && statusRef.current !== "loading") {
          setStatusSynced("ok")
          setStatusMsg("Kuzatilmoqda")
        }
        if (lastBlinkTime.current === null) lastBlinkTime.current = now
        if (landmarks) {
          const leftEAR  = eyeAspectRatio(landmarks.getLeftEye())
          const rightEAR = eyeAspectRatio(landmarks.getRightEye())
          const ear = (leftEAR + rightEAR) / 2
          if (ear < EAR_THRESHOLD) {
            eyesClosedRef.current = true
          } else if (eyesClosedRef.current) {
            eyesClosedRef.current = false
            lastBlinkTime.current = now
          }
        }
        if (now - lastBlinkTime.current >= BLINK_TIMEOUT) {
          lastBlinkTime.current = now
          addViolation("Jonlilik tekshiruvi: ko'z qisish aniqlanmadi")
        }
      }
    } catch { /* ignore frame errors */ }

    rafRef.current = requestAnimationFrame(presenceLoop)
  }, [addViolation, setStatusSynced])

  useEffect(() => {
    if (!cameraReady) return
    setStatusSynced("ok")
    setStatusMsg("Kuzatilmoqda")
    rafRef.current = requestAnimationFrame(presenceLoop)
    runVerify()
    verifyTimerRef.current = setInterval(runVerify, VERIFY_INTERVAL)
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (verifyTimerRef.current) clearInterval(verifyTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraReady])

  useEffect(() => () => { stopAll() }, [])

  const colors: Record<ProcStatus, { bg: string; border: string; text: string; icon: string }> = {
    loading:   { bg: "#f0f5ff", border: "rgba(14,88,168,0.2)",  text: "#0e58a8", icon: "#0e58a8" },
    ready:     { bg: "#f0f5ff", border: "rgba(14,88,168,0.2)",  text: "#0e58a8", icon: "#0e58a8" },
    ok:        { bg: "#f0fff4", border: "rgba(34,197,94,0.3)",  text: "#166534", icon: "#22c55e" },
    warning:   { bg: "#fff8e6", border: "rgba(245,158,11,0.4)", text: "#92400e", icon: "#f59e0b" },
    violation: { bg: "#fff0f0", border: "rgba(239,68,68,0.4)",  text: "#7f1d1d", icon: "#ef4444" },
    error:     { bg: "#fff0f0", border: "rgba(239,68,68,0.3)",  text: "#7f1d1d", icon: "#ef4444" },
  }
  const c = colors[status]
  const StatusIcon = status === "ok" ? ShieldCheck : status === "violation" || status === "error" ? ShieldX : ShieldAlert

  /* ── Camera widget (shared between fixed and default modes) ─────────── */
  const cameraWidget = (
    <div
      style={{
        display: "flex", alignItems: "stretch",
        borderRadius: 10, overflow: "hidden",
        border: `1.5px solid ${c.border}`,
        backgroundColor: c.bg,
        minWidth: 260,
      }}
    >
      <div style={{ position: "relative", width: 88, height: 66, backgroundColor: "#111", flexShrink: 0 }}>
        {!cameraReady && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#7293b9" }} />
          </div>
        )}
        <video ref={videoRef} autoPlay playsInline muted
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
        />
        <div style={{ position: "absolute", bottom: 4, left: 4, display: "flex", gap: 4 }}>
          {Array.from({ length: MAX_VIOLATIONS }).map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%",
              backgroundColor: i < violations ? "#ef4444" : "rgba(255,255,255,0.3)",
            }} />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", flex: 1 }}>
        <StatusIcon className="w-4 h-4 shrink-0" style={{ color: c.icon }} />
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: c.text, margin: 0, fontFamily: "var(--font-poppins)", whiteSpace: "nowrap" }}>
            {statusMsg}
          </p>
          <p style={{ fontSize: 10, color: c.text, opacity: 0.7, margin: 0, fontFamily: "var(--font-poppins)" }}>
            Face ID · {violations}/{MAX_VIOLATIONS} xatolik{confidence !== null ? ` · ${confidence}%` : ""}
          </p>
        </div>
      </div>
    </div>
  )

  const blockedOverlay = examBlocked && violations < MAX_VIOLATIONS ? (
    <div style={{
      position: fixed ? "fixed" : "absolute", inset: 0, zIndex: fixed ? 10000 : 40,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
      backgroundColor: multiPersonBlocked ? "rgba(220,38,38,0.92)" : "rgba(239,68,68,0.08)",
      backdropFilter: "blur(8px)",
      ...(fixed ? {} : { borderRadius: 10, border: "2px solid rgba(239,68,68,0.3)" }),
    }}>
      {multiPersonBlocked ? (
        /* Ko'p yuz / telfon aniqlandi — qattiq bloklash */
        <>
          <ShieldAlert className="w-20 h-20" style={{ color: "#fff" }} />
          <div style={{ textAlign: "center", padding: "0 40px", maxWidth: 480 }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 10px", fontFamily: "var(--font-poppins)" }}>
              Boshqa odam aniqlandi!
            </p>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", margin: "0 0 16px", fontFamily: "var(--font-poppins)", lineHeight: 1.5 }}>
              Imtihon davomida faqat <strong>siz</strong> kamerada ko&apos;rinishingiz kerak.
              Boshqa odam yoki telfon ekranini kameradan olib tashlang.
            </p>
            <div style={{
              display: "inline-block", padding: "8px 20px", borderRadius: 8,
              backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
            }}>
              <p style={{ fontSize: 13, color: "#fde68a", margin: 0, fontFamily: "var(--font-poppins)", fontWeight: 600 }}>
                ⚠ 15 soniya ichida olib tashlasangiz — xatolik yozilmaydi
              </p>
            </div>
          </div>
        </>
      ) : (
        /* Oddiy Face ID xatoligi */
        <>
          <ShieldAlert className="w-12 h-12" style={{ color: "#ef4444" }} />
          {violationSnap && (
            <img src={violationSnap} alt="xatolik rasmi"
              style={{ width: 140, height: 105, borderRadius: 8, objectFit: "cover",
                border: "2px solid rgba(239,68,68,0.5)", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }} />
          )}
          <div style={{ textAlign: "center", padding: "0 32px" }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#7f1d1d", margin: "0 0 4px", fontFamily: "var(--font-poppins)" }}>
              Face ID xatoligi — {violations}/{MAX_VIOLATIONS}
            </p>
            <p style={{ fontSize: 14, color: "#92400e", margin: 0, fontFamily: "var(--font-poppins)" }}>{statusMsg}</p>
            <p style={{ fontSize: 12, color: "#b45309", margin: "8px 0 0", fontFamily: "var(--font-poppins)" }}>
              Imtihon 4 soniyadan so&apos;ng davom etadi...
            </p>
          </div>
        </>
      )}
    </div>
  ) : null

  const terminatedOverlay = violations >= MAX_VIOLATIONS ? (
    <div style={{
      position: fixed ? "fixed" : "absolute", inset: 0, zIndex: fixed ? 10000 : 50,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
      backgroundColor: "rgba(239,68,68,0.12)", backdropFilter: "blur(8px)",
      ...(fixed ? {} : { borderRadius: 10, border: "2px solid rgba(239,68,68,0.5)" }),
    }}>
      <ShieldX className="w-16 h-16" style={{ color: "#ef4444" }} />
      {violationSnap && (
        <img src={violationSnap} alt="oxirgi xatolik"
          style={{ width: 140, height: 105, borderRadius: 8, objectFit: "cover",
            border: "2px solid rgba(239,68,68,0.5)", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }} />
      )}
      <div style={{ textAlign: "center", padding: "0 32px" }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#7f1d1d", margin: "0 0 8px", fontFamily: "var(--font-poppins)" }}>
          Imtihon yakunlandi
        </p>
        <p style={{ fontSize: 14, color: "#92400e", margin: 0, fontFamily: "var(--font-poppins)" }}>
          {MAX_VIOLATIONS} ta Face ID xatoligi qayd etildi. Natijalar avtomatik yuborildi.
        </p>
      </div>
    </div>
  ) : null

  const contentBlocked = status !== "ok" || examBlocked || violations >= MAX_VIOLATIONS
  const childrenWrapper = (
    <div style={{
      pointerEvents: contentBlocked ? "none" : "auto",
      opacity: contentBlocked ? 0.45 : 1,
      transition: "opacity 0.3s",
    }}>
      {children}
    </div>
  )

  /* ── Fixed mode (katta, video-birinchi) ────────────────────────────── */
  if (fixed) {
    return (
      <>
        <Script src="/face-api.min.js" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
        {/* Katta kamera vidgeti — o'ng yuqori burchak */}
        <div style={{
          position: "fixed", top: 10, right: 10, zIndex: 10001,
          width: 215, borderRadius: 10, overflow: "hidden",
          border: `2px solid ${c.border}`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        }}>
          {/* Video qismi */}
          <div style={{ position: "relative", height: 162, backgroundColor: "#111" }}>
            {!cameraReady && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#7293b9" }} />
              </div>
            )}
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
            />
            {/* Xatolik nuqtalari — yuqori chap */}
            <div style={{ position: "absolute", top: 6, left: 6, display: "flex", gap: 4 }}>
              {Array.from({ length: MAX_VIOLATIONS }).map((_, i) => (
                <div key={i} style={{
                  width: 9, height: 9, borderRadius: "50%",
                  backgroundColor: i < violations ? "#ef4444" : "rgba(255,255,255,0.35)",
                  border: "1px solid rgba(0,0,0,0.3)",
                }} />
              ))}
            </div>
            {/* Holat overlay — pastki qism */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              padding: "5px 8px",
              backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: c.icon, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", fontFamily: "var(--font-poppins)", lineHeight: 1 }}>
                {statusMsg}
              </span>
            </div>
          </div>
          {/* Status paneli */}
          <div style={{
            padding: "5px 8px", backgroundColor: c.bg,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <StatusIcon className="w-3 h-3" style={{ color: c.icon }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: c.text, fontFamily: "var(--font-poppins)" }}>
                Face ID
              </span>
            </div>
            <span style={{ fontSize: 10, color: c.text, opacity: 0.75, fontFamily: "var(--font-poppins)" }}>
              {violations}/{MAX_VIOLATIONS}{confidence !== null ? ` · ${confidence}%` : ""}
            </span>
          </div>

          {/* Xatoliklar tarixi */}
          {violationHistory.length > 0 && (
            <div style={{
              backgroundColor: "#fff5f5",
              borderTop: "1px solid rgba(239,68,68,0.15)",
              padding: "6px 8px",
              maxHeight: 130,
              overflowY: "auto",
            }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#b91c1c", margin: "0 0 4px", fontFamily: "var(--font-poppins)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Qayd etilgan xatoliklar
              </p>
              {violationHistory.map((v, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 5, marginBottom: 4 }}>
                  <span style={{
                    flexShrink: 0, width: 14, height: 14, borderRadius: "50%",
                    backgroundColor: "#ef4444", color: "#fff",
                    fontSize: 8, fontWeight: 700, fontFamily: "var(--font-poppins)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{i + 1}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 9, color: "#7f1d1d", fontFamily: "var(--font-poppins)", lineHeight: 1.3 }}>
                      {v.reason}
                    </p>
                    <p style={{ margin: 0, fontSize: 8, color: "#b45309", fontFamily: "var(--font-poppins)", opacity: 0.8 }}>
                      {v.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {blockedOverlay}
        {terminatedOverlay}
        {childrenWrapper}
      </>
    )
  }

  /* ── Default mode (original layout) ─────────────────────────────────── */
  return (
    <>
      <Script src="/face-api.min.js" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
      <div className="relative flex flex-col gap-4">
        <div className="self-end">{cameraWidget}</div>
        {blockedOverlay}
        {terminatedOverlay}
        <div className="relative" style={{
          pointerEvents: examBlocked || violations >= MAX_VIOLATIONS ? "none" : "auto",
          opacity: examBlocked ? 0.4 : 1,
          transition: "opacity 0.3s",
        }}>
          {children}
        </div>
      </div>
    </>
  )
}
