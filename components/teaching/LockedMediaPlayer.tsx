"use client"

import { useRef, useState, useCallback } from "react"
import { CheckCircle2, Music, Video, Play, Pause, Maximize } from "lucide-react"
import { teachingApi, type ContentProgress } from "@/lib/api"

const titleStyle = { color: "#012970", fontFamily: "var(--font-poppins)" } as const

interface LockedMediaPlayerProps {
  contentId: number
  src: string
  kind: "video" | "audio"
  title?: string
  initialProgress?: ContentProgress | null
  onCompleted?: () => void
}

const SAVE_INTERVAL_MS = 5000
// timeupdate/seeking orqali tekshiruv — brauzerning o'z skrub panelini yashirgan
// bo'lsak ham, dasturiy (masalan konsol orqali currentTime=) yoki klaviatura
// bilan oldinga siljitishga qarshi ikkinchi qatlam himoya sifatida qoladi.
const SEEK_TOLERANCE_S = 1.5

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

export function LockedMediaPlayer({ contentId, src, kind, title, initialProgress, onCompleted }: LockedMediaPlayerProps) {
  const mediaRef = useRef<HTMLMediaElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [completed, setCompleted] = useState(!!initialProgress?.completed)
  const maxReachedRef = useRef(initialProgress?.maxPositionSeconds ?? 0)
  const durationRef = useRef<number | null>(initialProgress?.durationSeconds ?? null)
  const lastSaveRef = useRef(0)
  const completedRef = useRef(!!initialProgress?.completed)
  const draggingRef = useRef(false)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [maxReached, setMaxReached] = useState(maxReachedRef.current)
  const [duration, setDuration] = useState(durationRef.current ?? 0)

  function save(immediate: boolean) {
    const now = Date.now()
    if (!immediate && now - lastSaveRef.current < SAVE_INTERVAL_MS) return
    lastSaveRef.current = now
    teachingApi.saveProgress(contentId, {
      positionSeconds: Math.floor(maxReachedRef.current),
      durationSeconds: durationRef.current ?? undefined,
    }).catch(() => {})
  }

  function handleLoadedMetadata() {
    const el = mediaRef.current
    if (!el) return
    durationRef.current = el.duration
    setDuration(el.duration)
    const resumeAt = initialProgress?.maxPositionSeconds ?? 0
    if (resumeAt > 0 && resumeAt < el.duration - 1) {
      el.currentTime = resumeAt
      setCurrentTime(resumeAt)
    }
  }

  /** Nishonlangan vaqtni faqat allaqachon yetib borilgan nuqtagacha qisqartiradi
      — oldinga "sakrash" imkoni umuman berilmaydi, orqaga qaytish har doim erkin. */
  function clampTarget(target: number): number {
    return Math.min(target, maxReachedRef.current)
  }

  function seekTo(target: number) {
    const el = mediaRef.current
    if (!el) return
    const clamped = clampTarget(target)
    el.currentTime = clamped
    setCurrentTime(clamped)
  }

  function handleTimeUpdate() {
    const el = mediaRef.current
    if (!el) return
    if (el.currentTime > maxReachedRef.current + SEEK_TOLERANCE_S) {
      el.currentTime = maxReachedRef.current
      setCurrentTime(maxReachedRef.current)
      return
    }
    setCurrentTime(el.currentTime)
    if (el.currentTime > maxReachedRef.current) {
      maxReachedRef.current = el.currentTime
      setMaxReached(el.currentTime)
      save(false)
    }
  }

  function handlePause() {
    setPlaying(false)
    save(true)
  }
  function handlePlay() {
    setPlaying(true)
  }

  function handleEnded() {
    const el = mediaRef.current
    if (!el) return
    maxReachedRef.current = el.duration
    setMaxReached(el.duration)
    durationRef.current = el.duration
    setPlaying(false)
    teachingApi.saveProgress(contentId, {
      positionSeconds: Math.floor(el.duration),
      durationSeconds: el.duration,
      completed: true,
    }).then(() => {
      if (!completedRef.current) {
        completedRef.current = true
        setCompleted(true)
        onCompleted?.()
      }
    }).catch(() => {})
  }

  function togglePlay() {
    const el = mediaRef.current
    if (!el) return
    if (el.paused) el.play().catch(() => {})
    else el.pause()
  }

  // Native brauzer klaviatura miyonbarlari (Chrome/Firefox) videoga fokus
  // bo'lsa `controls` yo'q bo'lsa ham ishlaydi — Chap/O'ng, Home/End, PageUp/Down
  // orqali oldinga sakrashni bloklaymiz, orqaga qaytish erkin qoladi.
  function handleKeyDown(e: React.KeyboardEvent<HTMLMediaElement>) {
    const el = mediaRef.current
    if (!el) return
    const forwardKeys = ["ArrowRight", "PageUp", "End"]
    const spaceOrK = e.key === " " || e.key.toLowerCase() === "k"
    if (forwardKeys.includes(e.key)) {
      e.preventDefault()
      const step = e.key === "End" ? el.duration : e.key === "PageUp" ? 60 : 5
      const target = e.key === "End" ? el.duration : el.currentTime + step
      seekTo(target)
      return
    }
    if (e.key === "ArrowLeft" || e.key === "PageDown" || e.key === "Home") {
      e.preventDefault()
      const step = e.key === "Home" ? el.currentTime : e.key === "PageDown" ? 60 : 5
      el.currentTime = e.key === "Home" ? 0 : Math.max(0, el.currentTime - step)
      setCurrentTime(el.currentTime)
      return
    }
    if (spaceOrK) {
      e.preventDefault()
      togglePlay()
    }
  }

  const fractionFromClientX = useCallback((clientX: number): number => {
    const bar = barRef.current
    if (!bar) return 0
    const rect = bar.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }, [])

  function handleBarPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = true
    const target = fractionFromClientX(e.clientX) * (duration || 0)
    seekTo(target)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  function handleBarPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    const target = fractionFromClientX(e.clientX) * (duration || 0)
    seekTo(target)
  }
  function handleBarPointerUp() {
    draggingRef.current = false
  }

  function toggleFullscreen() {
    const el = mediaRef.current as HTMLVideoElement | null
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    else el.requestFullscreen?.().catch(() => {})
  }

  // maxReached'gacha bo'lgan qism to'liq "tinglangan/ko'rilgan" — undan keyingi
  // qism progress panelida umuman ko'rinmaydi (bosib bo'lmasligini vizual bildiradi).
  const watchedPct = duration > 0 ? Math.min(100, (maxReached / duration) * 100) : 0
  const playedPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  return (
    <div className="rounded-[10px] p-4 flex flex-col gap-2" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
      <div className="flex items-center gap-2">
        {kind === "video" ? (
          <Video className="w-4 h-4" style={{ color: "#0e58a8" }} />
        ) : (
          <Music className="w-4 h-4" style={{ color: "#0e58a8" }} />
        )}
        <span className="text-sm font-semibold" style={titleStyle}>{title ?? (kind === "video" ? "Video" : "Audio")}</span>
        {completed && <CheckCircle2 className="w-4 h-4 ml-auto" style={{ color: "#22c55e" }} />}
      </div>

      {kind === "video" ? (
        <div className="relative rounded-[8px] overflow-hidden bg-black" onClick={togglePlay}>
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            playsInline
            preload="metadata"
            className="aspect-video w-full"
            src={src}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
            onKeyDown={handleKeyDown}
            onContextMenu={e => e.preventDefault()}
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
          />
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(1,41,112,0.55)" }}>
                <Play className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          preload="metadata"
          src={src}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onKeyDown={handleKeyDown}
          onContextMenu={e => e.preventDefault()}
          controlsList="nodownload noremoteplayback"
          className="hidden"
        />
      )}

      {/* Moslashtirilgan boshqaruv paneli — faqat maxReached'gacha bosish/tortish mumkin */}
      <div className="flex items-center gap-2.5">
        <button onClick={togglePlay}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors hover:opacity-80"
          style={{ backgroundColor: "#0e58a8" }}>
          {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
        </button>

        <span className="text-xs shrink-0 tabular-nums" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {formatTime(currentTime)}
        </span>

        <div
          ref={barRef}
          onPointerDown={handleBarPointerDown}
          onPointerMove={handleBarPointerMove}
          onPointerUp={handleBarPointerUp}
          onPointerLeave={handleBarPointerUp}
          className="relative flex-1 h-2.5 rounded-full cursor-pointer touch-none"
          style={{ backgroundColor: "#eef2f8" }}
        >
          {/* Ko'rib/tinglab bo'lingan (bosish mumkin bo'lgan) qism */}
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${watchedPct}%`, backgroundColor: "rgba(14,88,168,0.25)" }} />
          {/* Joriy pozitsiya */}
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${playedPct}%`, backgroundColor: "#0e58a8" }} />
          <div className="absolute top-1/2 rounded-full shadow"
            style={{ left: `${playedPct}%`, transform: "translate(-50%, -50%)", width: 12, height: 12, backgroundColor: "#0e58a8", border: "2px solid white" }} />
        </div>

        <span className="text-xs shrink-0 tabular-nums" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {formatTime(duration)}
        </span>

        {kind === "video" && (
          <button onClick={toggleFullscreen}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-[#f0f5ff]">
            <Maximize className="w-4 h-4" style={{ color: "#7293b9" }} />
          </button>
        )}
      </div>

      <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
        Diqqat: oldinga siljitish bloklangan — to&apos;liq tinglab/ko&apos;rib chiqing.
      </p>
    </div>
  )
}
