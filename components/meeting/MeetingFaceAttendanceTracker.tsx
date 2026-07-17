"use client"

import { useEffect, useRef, useState } from "react"
import Script from "next/script"
import { meetingsApi } from "@/lib/api"

declare global {
  interface Window { faceapi: any }
}

const BASE_PATH   = process.env.NEXT_PUBLIC_BASE_PATH || ""
const MODEL_URL   = `${BASE_PATH}/models`
const PING_SECONDS = 15
const TINY_CONF    = 0.30

interface Props {
  meetingId: string
  stream: MediaStream | null
  cameraEnabled: boolean
}

/**
 * Ko'rinmas Face ID kuzatuvchi — meeting davomida talabaning kamerasida
 * yuzi ko'rinib turgan vaqtni har PING_SECONDS'da backendga yuboradi.
 * Yakuniy davomat (keldi/kelmadi) meeting tugaganda shu ma'lumot
 * asosida hisoblanadi (backend: syncMeetingAttendanceToMain).
 */
export default function MeetingFaceAttendanceTracker({ meetingId, stream, cameraEnabled }: Props) {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const [modelsReady, setModelsReady] = useState(false)

  // Kamera oqimini ko'rinmas videoga ulash
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    if (stream && cameraEnabled) {
      vid.srcObject = stream
      vid.play().catch(() => {})
    } else {
      vid.srcObject = null
    }
  }, [stream, cameraEnabled])

  useEffect(() => {
    if (!modelsReady) return
    if (!stream || !cameraEnabled) return

    async function tick() {
      const vid = videoRef.current
      let visible = false
      try {
        if (vid && vid.videoWidth && vid.readyState >= 2) {
          const fa = window.faceapi
          const det = await fa.detectSingleFace(
            vid,
            new fa.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: TINY_CONF })
          )
          visible = Boolean(det)
        }
      } catch { /* ignore frame errors */ }

      try {
        await meetingsApi.facePing(meetingId, { visible, intervalSeconds: PING_SECONDS })
      } catch { /* tarmoq xatosi — keyingi tsiklda qayta urinamiz */ }
    }

    timerRef.current = setInterval(tick, PING_SECONDS * 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [stream, cameraEnabled, meetingId, modelsReady])

  async function loadModels() {
    try {
      const fa = window.faceapi
      await fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
      setModelsReady(true)
    } catch { /* model yuklanmasa — kuzatuv shunchaki ishlamaydi, meeting davom etadi */ }
  }

  return (
    <>
      <Script
        src={`${BASE_PATH}/face-api.min.js`}
        strategy="afterInteractive"
        onLoad={() => { loadModels() }}
      />
      <video ref={videoRef} autoPlay playsInline muted
        style={{ position: "fixed", width: 1, height: 1, opacity: 0, pointerEvents: "none", top: -9999, left: -9999 }}
      />
    </>
  )
}
