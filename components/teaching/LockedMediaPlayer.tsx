"use client"

import { useRef, useState } from "react"
import { CheckCircle2, Music, Video } from "lucide-react"
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

export function LockedMediaPlayer({ contentId, src, kind, title, initialProgress, onCompleted }: LockedMediaPlayerProps) {
  const [completed, setCompleted] = useState(!!initialProgress?.completed)
  const maxReachedRef = useRef(initialProgress?.maxPositionSeconds ?? 0)
  const durationRef = useRef<number | null>(initialProgress?.durationSeconds ?? null)
  const lastSaveRef = useRef(0)
  const completedRef = useRef(!!initialProgress?.completed)

  function save(immediate: boolean) {
    const now = Date.now()
    if (!immediate && now - lastSaveRef.current < SAVE_INTERVAL_MS) return
    lastSaveRef.current = now
    teachingApi.saveProgress(contentId, {
      positionSeconds: Math.floor(maxReachedRef.current),
      durationSeconds: durationRef.current ?? undefined,
    }).catch(() => {})
  }

  function handleLoadedMetadata(e: React.SyntheticEvent<HTMLMediaElement>) {
    const el = e.currentTarget
    durationRef.current = el.duration
    const resumeAt = initialProgress?.maxPositionSeconds ?? 0
    if (resumeAt > 0 && resumeAt < el.duration - 1) {
      el.currentTime = resumeAt
    }
  }

  function clampSeek(e: React.SyntheticEvent<HTMLMediaElement>) {
    const el = e.currentTarget
    if (el.currentTime > maxReachedRef.current + 1) {
      el.currentTime = maxReachedRef.current
    }
  }

  function handleTimeUpdate(e: React.SyntheticEvent<HTMLMediaElement>) {
    const el = e.currentTarget
    if (el.currentTime > maxReachedRef.current) {
      maxReachedRef.current = el.currentTime
      save(false)
    }
  }

  function handlePause() {
    save(true)
  }

  function handleEnded(e: React.SyntheticEvent<HTMLMediaElement>) {
    const el = e.currentTarget
    maxReachedRef.current = el.duration
    durationRef.current = el.duration
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
        <video
          controls
          controlsList="nodownload"
          preload="metadata"
          className="aspect-video w-full rounded-[8px] bg-black"
          src={src}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onSeeking={clampSeek}
          onPause={handlePause}
          onEnded={handleEnded}
        />
      ) : (
        <audio
          controls
          controlsList="nodownload"
          preload="metadata"
          className="w-full"
          src={src}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onSeeking={clampSeek}
          onPause={handlePause}
          onEnded={handleEnded}
        />
      )}
      <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
        Diqqat: oldinga siljitish bloklangan — to&apos;liq tinglab/ko&apos;rib chiqing.
      </p>
    </div>
  )
}
