"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react"
import { AnimatePresence, motion } from "framer-motion"
import { io, type Socket } from "socket.io-client"
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  Maximize2,
  MessageSquareText,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  PhoneOff,
  Play,
  Plus,
  RefreshCw,
  Square,
  Trash2,
  Search,
  Send,
  Users2,
  Video,
  VideoOff,
  X,
  type LucideIcon,
} from "lucide-react"
import { meetingsApi, hemisApi, teachingApi, type Meeting, type MeetingRecording, type JoinTokenResponse, type CreateMeetingRequest, type TeacherGroup } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { cn } from "@/lib/utils"

/* ── JWT payload decode (faqat o'qish uchun, imzo tekshirilmaydi) ── */
function readJwtPayload(): Record<string, unknown> {
  try {
    if (typeof window === "undefined") return {}
    const token = sessionStorage.getItem("lms_token") ?? ""
    const part = token.split(".")[1]
    if (!part) return {}
    return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")))
  } catch { return {} }
}

function useCurrentUserRole() {
  const [role, setRole]       = useState<string>("")
  const [fullName, setFullName] = useState<string>("")
  const [groupId, setGroupId]  = useState<number | null>(null)
  const [groupIds, setGroupIds] = useState<number[]>([])
  useEffect(() => {
    const payload = readJwtPayload()
    setRole(typeof payload.role === "string" ? payload.role : "")
    setFullName(typeof payload.fullName === "string" ? payload.fullName : typeof payload.username === "string" ? payload.username : "")
    setGroupId(typeof payload.groupId === "number" ? payload.groupId : null)
    const ids = Array.isArray(payload.teacherGroupIds)
      ? (payload.teacherGroupIds as unknown[]).filter(n => typeof n === "number") as number[]
      : []
    setGroupIds(ids)
  }, [])
  return { role, fullName, groupId, groupIds }
}

function cleanName(name: string): string {
  return name
    .replace(/â\x80\x99/g, "'").replace(/â\x80\x98/g, "'")
    .replace(/â€™/g, "'").replace(/â€˜/g, "'")
    .replace(/[ʻʼ'']/g, "'")
    .normalize("NFC")
    .trim()
}

type TeacherGroupOption = { id: number; name: string }

function extractTeacherGroups(items: unknown[]): TeacherGroupOption[] {
  const map = new Map<number, string>()
  items.forEach((item) => {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
    const group = record.group && typeof record.group === "object" ? (record.group as Record<string, unknown>) : {}
    const idValue = group.id ?? group.group_id ?? group.code
    const id = typeof idValue === "number" ? idValue : Number(idValue)
    const name = typeof group.name === "string" ? group.name.trim() : ""
    if (Number.isFinite(id) && id > 0 && name && !map.has(id)) map.set(id, name)
  })
  return Array.from(map.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function roleLabel(role: string, groupId?: number | null, groupName?: string | null): string {
  if (role === "admin")   return "Admin"
  if (role === "teacher" || role === "employee") return "O'qituvchi"
  const label = groupName || (groupId ? `Guruh ${groupId}` : null)
  return label ? `Talaba · ${label}` : "Talaba"
}

type Participant = {
  userId?: number
  socketId?: string
  name: string
  role: string
  groupId?: number
  accent: string
  status: "live" | "muted" | "invited"
}

type ChatMessage = {
  id: string
  fullName: string
  text: string
  createdAt: string
}

type RemotePeer = {
  socketId: string
  name: string
  role: string
  groupId?: number | null
  cameraEnabled?: boolean
  micEnabled?: boolean
  screenSharing?: boolean
}

type RemoteStream = RemotePeer & {
  stream: MediaStream
}

type CallPanel = "participants" | "chat" | "cameras"
type ActiveVideoId = "self" | string

type ViewState =
  | { stage: "lobby" }
  | { stage: "prejoin"; meetingId: string }
  | { stage: "call"; meetingId: string }


const participantAccents = ["#0e58a8", "#1cc2dc", "#38bdf8", "#2563eb", "#14b8a6", "#f59e0b"]

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function participantText(count: number) {
  return `${count} ishtirokchi`
}

function formatCallDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":")
}

function getMeetingSocketUrl(joinToken: JoinTokenResponse | null) {
  const socketUrl = joinToken?.socketUrl
  if (socketUrl?.startsWith("http://") || socketUrl?.startsWith("https://")) {
    return socketUrl.replace(/\/+$/, "")
  }
  return (process.env.NEXT_PUBLIC_MEETING_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "")
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function mediaErrorText(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") return "Kamera yoki mikrofon uchun ruxsat berilmadi"
    if (error.name === "NotFoundError") return "Kamera yoki mikrofon qurilmasi topilmadi"
  }
  return error instanceof Error ? error.message : "Media qurilmani yoqishda xatolik"
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function socketText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return undefined
}

function socketNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return undefined
}

function normalizeSocketParticipants(value: unknown): Participant[] {
  const items = Array.isArray(value) ? value : []
  return items.map((item, index) => {
    const record = recordValue(item)
    const userId = socketNumber(record.userId, record.id)
    const rawStatus = socketText(record.status)?.toLowerCase()
    return {
      userId,
      socketId: socketText(record.socketId, record.sid),
      name: cleanName(socketText(record.fullName, record.name, record.username) || `Foydalanuvchi ${index + 1}`),
      role: socketText(record.role) || "student",
      groupId: socketNumber(record.groupId) ?? undefined,
      accent: participantAccents[(userId ?? index) % participantAccents.length],
      status: rawStatus === "muted" ? "muted" : "live",
    }
  })
}

function normalizeRemotePeers(value: unknown): RemotePeer[] {
  const items = Array.isArray(value) ? value : []
  return items
    .map((item, index): RemotePeer | null => {
      const record = recordValue(item)
      const mediaState = recordValue(record.mediaState)
      const socketId = socketText(record.socketId, record.sid)
      if (!socketId) return null
      return {
        socketId,
        name: cleanName(socketText(record.fullName, record.name, record.username) || `Foydalanuvchi ${index + 1}`),
        role: socketText(record.role) || "student",
        groupId: socketNumber(record.groupId) ?? null,
        cameraEnabled: mediaState.cameraEnabled === undefined ? undefined : Boolean(mediaState.cameraEnabled),
        micEnabled: mediaState.micEnabled === undefined ? undefined : Boolean(mediaState.micEnabled),
        screenSharing: Boolean(mediaState.screenSharing),
      }
    })
    .filter((peer): peer is RemotePeer => Boolean(peer))
}

function normalizeChatMessage(value: unknown, fallbackIndex = 0): ChatMessage {
  const record = recordValue(value)
  return {
    id:
      socketText(record.id, record.messageId, record.createdAt) ||
      `chat-${Date.now()}-${fallbackIndex}`,
    fullName: socketText(record.fullName, record.name, record.username) || "Foydalanuvchi",
    text: socketText(record.text, record.message, record.body) || "",
    createdAt: socketText(record.createdAt, record.time, record.sentAt) || new Date().toISOString(),
  }
}

function appendChatMessage(messages: ChatMessage[], message: ChatMessage) {
  if (!message.text.trim()) return messages
  if (messages.some((item) => item.id === message.id)) return messages
  return [...messages, message].slice(-100)
}

function unwrapSocketData(value: unknown) {
  const record = recordValue(value)
  return "data" in record ? record.data : value
}

function SourceBadge({
  label,
  tone,
}: {
  label: string
  tone: "success" | "warning" | "loading"
}) {
  const color =
    tone === "success" ? "#16a34a" : tone === "warning" ? "#f59e0b" : "#1cc2dc"

  return (
    <div
      className="inline-flex items-center gap-2 rounded-[5px] border border-[#d8e6f7] bg-white px-3 py-2 text-xs font-medium text-[#012970]"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  )
}


function Avatar({
  name,
  accent = "#0e58a8",
  size = "md",
}: {
  name: string
  accent?: string
  size?: "sm" | "md" | "lg"
}) {
  const sizeClass =
    size === "sm"
      ? "h-9 w-9 text-xs"
      : size === "lg"
        ? "h-14 w-14 text-base"
        : "h-11 w-11 text-sm"

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-white",
        sizeClass
      )}
      style={{ backgroundColor: accent, fontFamily: "var(--font-poppins)" }}
    >
      {getInitials(name)}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  accent: string
}) {
  return (
    <div className="rounded-[8px] border border-[#d8e6f7] bg-white p-4 shadow-[0_2px_12px_rgba(1,41,112,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className="text-[13px] text-[#7293b9]"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {label}
          </p>
          <p
            className="mt-2 text-2xl font-semibold text-[#012970]"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {value}
          </p>
        </div>
        <div
          className="grid h-11 w-11 place-items-center rounded-[8px]"
          style={{ backgroundColor: `${accent}14` }}
        >
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
      </div>
    </div>
  )
}

function InfoPill({
  icon: Icon,
  label,
}: {
  icon: LucideIcon
  label: string
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#f6f9ff] px-2.5 py-1.5 text-xs text-[#104475]"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <Icon className="h-3.5 w-3.5 text-[#7293b9]" />
      {label}
    </span>
  )
}

function PrimaryButton({
  children,
  onClick,
  loading,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center justify-center gap-2 rounded-[5px] bg-[#0e58a8] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#104475] disabled:cursor-not-allowed disabled:opacity-60"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  )
}

function MeetingCard({
  meeting,
  onJoin,
  onDelete,
  joining,
  deleting,
}: {
  meeting: Meeting
  onJoin: (meetingId: string) => void
  onDelete?: (meetingId: string) => void
  joining?: boolean
  deleting?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-[8px] border border-[#d8e6f7] bg-white p-5 shadow-[0_2px_12px_rgba(1,41,112,0.06)]"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] bg-[#e8fbff]">
            <Video className="h-5 w-5 text-[#1cc2dc]" />
          </div>
          <div className="min-w-0">
            <h3
              className="text-[17px] font-semibold text-[#012970]"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              {meeting.title}
            </h3>
            <p
              className="mt-1 text-sm text-[#7293b9]"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              {meeting.subject || meeting.host}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <InfoPill icon={Users2} label={meeting.host || "Host"} />
              <InfoPill icon={CalendarDays} label={meeting.date} />
              <InfoPill icon={Clock3} label={`${meeting.time} - ${meeting.duration}`} />
              <InfoPill icon={Users2} label={participantText(meeting.participants)} />
              {meeting.groupNames && meeting.groupNames.length > 0 && (
                <InfoPill icon={BookOpen} label={meeting.groupNames.join(", ")} />
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {meeting.link !== "#" && (
            <a
              href={meeting.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-[5px] border border-[#d8e6f7] bg-white px-4 py-2.5 text-sm font-medium text-[#104475] transition-colors hover:bg-[#f6f9ff]"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Havola
              <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(meeting.id)}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-2 rounded-[5px] border border-red-200 bg-white px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
              style={{ fontFamily: "var(--font-poppins)" }}
              title="Meetingni o'chirish"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          )}
          <PrimaryButton onClick={() => onJoin(meeting.id)} loading={joining}>
            {!joining ? <Play className="h-4 w-4 fill-current" /> : null}
            Qo&apos;shilish
          </PrimaryButton>
        </div>
      </div>
    </motion.div>
  )
}

function EmptyMeetings({ loading }: { loading: boolean }) {
  return (
    <div className="rounded-[8px] border border-dashed border-[#b7cce8] bg-white px-5 py-10 text-center">
      <Video className="mx-auto h-9 w-9 text-[#7293b9]" />
      <p
        className="mt-3 text-sm font-medium text-[#012970]"
        style={{ fontFamily: "var(--font-poppins)" }}
      >
        {loading ? "Meetinglar yuklanmoqda" : "Hozircha meeting yo'q"}
      </p>
    </div>
  )
}

function PastMeetingCard({ meeting }: { meeting: Meeting }) {
  return (
    <div className="rounded-[8px] border border-[#d8e6f7] bg-white px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-full bg-[#e8fbff]">
          <CheckCircle2 className="h-4 w-4 text-[#1cc2dc]" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold text-[#012970]"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {meeting.title}
          </p>
          <p
            className="mt-1 text-xs text-[#7293b9]"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {meeting.date} - {meeting.time} - {meeting.duration}
          </p>
          <p
            className="mt-2 text-xs text-[#7293b9]"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {participantText(meeting.participants)}
          </p>
        </div>
      </div>
    </div>
  )
}

function VideoPreview({ label }: { label: string }) {
  return (
    <div className="relative min-h-[320px] overflow-hidden rounded-[8px] bg-[#dfe9f7]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,_#f6f9ff_0%,_#d9f8ff_52%,_#bad8f4_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,_rgba(255,255,255,0.85),_transparent_24%),radial-gradient(circle_at_82%_20%,_rgba(28,194,220,0.22),_transparent_28%)]" />
      <div className="relative flex min-h-[320px] items-center justify-center p-8">
        <div className="grid place-items-center text-center">
          <Avatar name={label} size="lg" />
          <p
            className="mt-4 text-sm font-medium text-[#012970]"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {label}
          </p>
          <p
            className="mt-1 text-xs text-[#7293b9]"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            Kamera preview
          </p>
        </div>
      </div>
    </div>
  )
}

function LiveVideoPreview({
  stream,
  label,
  cameraEnabled,
  screenSharing,
  mediaError,
}: {
  stream: MediaStream | null
  label: string
  cameraEnabled: boolean
  screenSharing: boolean
  mediaError: string | null
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hasVideo =
    Boolean(stream?.getVideoTracks().some((track) => track.readyState === "live")) &&
    (cameraEnabled || screenSharing)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.srcObject = hasVideo ? stream : null
    if (hasVideo) {
      void video.play().catch(() => undefined)
    }

    return () => {
      video.srcObject = null
    }
  }, [hasVideo, stream])

  if (!hasVideo) {
    return (
      <div className="relative h-full min-h-[360px] overflow-hidden rounded-[8px] bg-[#10192a]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,_#111827_0%,_#1e3a8a_55%,_#0f172a_100%)]" />
        <div className="relative flex h-full min-h-[360px] items-center justify-center p-8">
          <div className="grid place-items-center text-center">
            <Avatar name={label} size="lg" />
            <p
              className="mt-4 text-sm font-medium text-white"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              {cameraEnabled ? "Kamera ulanmoqda" : "Kamera o'chirilgan"}
            </p>
            {mediaError && (
              <p
                className="mt-2 max-w-[420px] text-xs leading-5 text-red-100"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                {mediaError}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-[360px] overflow-hidden rounded-[8px] bg-[#10192a]">
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className="h-full min-h-[360px] w-full object-cover"
      />
      <div
        className="absolute left-5 top-5 rounded-full bg-white/95 px-4 py-2 text-xs font-medium text-[#012970] shadow-[0_6px_18px_rgba(1,41,112,0.16)]"
        style={{ fontFamily: "var(--font-poppins)" }}
      >
        {screenSharing ? "Ekran ulashilmoqda" : "Kamera yoniq"}
      </div>
    </div>
  )
}

function LocalVideoTile({
  stream,
  label,
  cameraEnabled,
  screenSharing,
  active,
  onSelect,
}: {
  stream: MediaStream | null
  label: string
  cameraEnabled: boolean
  screenSharing: boolean
  active: boolean
  onSelect: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hasVideo = Boolean(
    stream?.getVideoTracks().some((track) => track.readyState === "live")
  )

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.srcObject = hasVideo ? stream : null
    if (hasVideo) {
      void video.play().catch(() => undefined)
    }

    return () => {
      video.srcObject = null
    }
  }, [hasVideo, stream])

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "relative h-32 w-48 overflow-hidden rounded-[8px] border bg-[#10192a] text-left shadow-[0_10px_28px_rgba(0,0,0,0.28)] transition focus:outline-none focus:ring-2 focus:ring-white/80",
        active ? "border-white ring-2 ring-[#1cc2dc]" : "border-white/20 hover:border-white/70"
      )}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Avatar name={label} />
        </div>
      )}
      <div
        className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1.5 text-xs font-medium text-white"
        style={{ fontFamily: "var(--font-poppins)" }}
      >
        {screenSharing ? "Siz - ekran" : cameraEnabled ? label : "Siz - kamera o'chirilgan"}
      </div>
    </button>
  )
}

function RemoteVideoTile({
  remote,
  active,
  onSelect,
}: {
  remote: RemoteStream
  active: boolean
  onSelect: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hasVideo = Boolean(
    remote.stream.getVideoTracks().some((track) => track.readyState === "live")
  )

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.srcObject = hasVideo ? remote.stream : null
    if (hasVideo) {
      void video.play().catch(() => undefined)
    }

    return () => {
      video.srcObject = null
    }
  }, [hasVideo, remote.stream])

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "relative h-32 w-48 overflow-hidden rounded-[8px] border bg-[#10192a] text-left shadow-[0_10px_28px_rgba(0,0,0,0.28)] transition focus:outline-none focus:ring-2 focus:ring-white/80",
        active ? "border-white ring-2 ring-[#1cc2dc]" : "border-white/20 hover:border-white/70"
      )}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          playsInline
          autoPlay
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Avatar name={remote.name} />
        </div>
      )}
      <div
        className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1.5 text-xs font-medium text-white"
        style={{ fontFamily: "var(--font-poppins)" }}
      >
        {remote.screenSharing ? `${remote.name} - ekran` : remote.name}
      </div>
    </button>
  )
}

/* ── Create Meeting Modal ────────────────────────────────────────────── */
function CreateMeetingModal({
  open,
  defaultGroupIds,
  onClose,
  onCreated,
}: {
  open: boolean
  defaultGroupIds: number[]
  onClose: () => void
  onCreated: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [title, setTitle]           = useState("")
  const [subjectName, setSubjectName] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate]             = useState(today)
  const [startTime, setStartTime]   = useState("09:00")
  const [endTime, setEndTime]       = useState("10:00")
  const [groupOptions, setGroupOptions] = useState<TeacherGroupOption[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groupsError, setGroupsError]     = useState<string | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSelectedGroupIds([])
    setGroupsError(null)
    setGroupsLoading(true)
    hemisApi.employeeData("attendance-journal")
      .then((res) => {
        const items = Array.isArray(res?.data) ? res.data : []
        const options = extractTeacherGroups(items)
        setGroupOptions(options)
        if (!options.length && defaultGroupIds.length) {
          setGroupOptions(defaultGroupIds.map((id) => ({ id, name: `Guruh ${id}` })))
        }
      })
      .catch(() => {
        setGroupsError("Guruhlar ro'yxatini yuklab bo'lmadi")
        if (defaultGroupIds.length) {
          setGroupOptions(defaultGroupIds.map((id) => ({ id, name: `Guruh ${id}` })))
        }
      })
      .finally(() => setGroupsLoading(false))
  }, [open, defaultGroupIds])

  if (!open) return null

  function toggleGroup(id: number) {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((gid) => gid !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const ids = selectedGroupIds
    if (!title.trim()) { setError("Sarlavha majburiy"); return }
    if (!subjectName.trim()) { setError("Fan nomi majburiy"); return }
    if (!date) { setError("Sana majburiy"); return }
    if (!startTime || !endTime) { setError("Vaqt majburiy"); return }
    if (ids.length === 0) { setError("Kamida 1 ta guruh ID kerak"); return }

    const startISO = new Date(`${date}T${startTime}:00`).toISOString()
    const endISO   = new Date(`${date}T${endTime}:00`).toISOString()
    if (new Date(endISO) <= new Date(startISO)) {
      setError("Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak"); return
    }

    setLoading(true)
    try {
      const body: CreateMeetingRequest = {
        title: title.trim(),
        subjectName: subjectName.trim(),
        description: description.trim() || undefined,
        startTime: startISO,
        endTime: endISO,
        groupIds: ids,
      }
      await meetingsApi.create(body)
      setTitle(""); setSubjectName(""); setDescription(""); setDate(today)
      setStartTime("09:00"); setEndTime("10:00")
      onCreated()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(1,41,112,0.4)", backdropFilter: "blur(4px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-lg rounded-[12px] bg-white shadow-[0_20px_60px_rgba(1,41,112,0.2)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <div>
            <h2 className="text-lg font-semibold text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>
              Yangi meeting yaratish
            </h2>
            <p className="text-xs text-[#7293b9] mt-0.5" style={{ fontFamily: "var(--font-poppins)" }}>
              O&apos;qituvchi sifatida meeting belgilang
            </p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[#f6f9ff] transition-colors">
            <X className="h-4 w-4 text-[#7293b9]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>
              Sarlavha <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Masalan: Hosil va uning tatbiqlari"
              className="h-10 rounded-[8px] border border-[#d8e6f7] px-3 text-sm text-[#012970] outline-none focus:border-[#0e58a8] transition-colors"
              style={{ fontFamily: "var(--font-poppins)" }}
            />
          </div>

          {/* Subject name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>
              Fan nomi <span className="text-red-500">*</span>
            </label>
            <input
              value={subjectName}
              onChange={e => setSubjectName(e.target.value)}
              placeholder="Masalan: Matematik tahlil"
              className="h-10 rounded-[8px] border border-[#d8e6f7] px-3 text-sm text-[#012970] outline-none focus:border-[#0e58a8] transition-colors"
              style={{ fontFamily: "var(--font-poppins)" }}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>
              Tavsif (ixtiyoriy)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Meeting haqida qisqacha..."
              rows={2}
              className="rounded-[8px] border border-[#d8e6f7] px-3 py-2 text-sm text-[#012970] outline-none focus:border-[#0e58a8] transition-colors resize-none"
              style={{ fontFamily: "var(--font-poppins)" }}
            />
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>
              Sana <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={e => setDate(e.target.value)}
              className="h-10 rounded-[8px] border border-[#d8e6f7] px-3 text-sm text-[#012970] outline-none focus:border-[#0e58a8] transition-colors"
              style={{ fontFamily: "var(--font-poppins)" }}
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>
                Boshlanish <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="h-10 rounded-[8px] border border-[#d8e6f7] px-3 text-sm text-[#012970] outline-none focus:border-[#0e58a8] transition-colors"
                style={{ fontFamily: "var(--font-poppins)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>
                Tugash <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="h-10 rounded-[8px] border border-[#d8e6f7] px-3 text-sm text-[#012970] outline-none focus:border-[#0e58a8] transition-colors"
                style={{ fontFamily: "var(--font-poppins)" }}
              />
            </div>
          </div>

          {/* Groups */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>
              Guruhlar <span className="text-red-500">*</span>
            </label>
            <p className="text-[11px] text-[#7293b9]" style={{ fontFamily: "var(--font-poppins)" }}>
              Meeting faqat tanlangan guruhlarga ko&apos;rinadi. Ro&apos;yxat siz o&apos;qitadigan davomat jurnali guruhlaridan olinadi.
            </p>

            {groupsLoading ? (
              <div className="flex items-center gap-2 rounded-[8px] border border-[#d8e6f7] px-3 py-3 text-sm text-[#7293b9]" style={{ fontFamily: "var(--font-poppins)" }}>
                <Loader2 className="h-4 w-4 animate-spin" /> Guruhlar yuklanmoqda...
              </div>
            ) : groupOptions.length === 0 ? (
              <div className="rounded-[8px] border border-[#d8e6f7] px-3 py-3 text-sm text-[#7293b9]" style={{ fontFamily: "var(--font-poppins)" }}>
                Sizga biriktirilgan guruhlar topilmadi
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto rounded-[8px] border border-[#d8e6f7] p-2">
                {groupOptions.map((group) => {
                  const checked = selectedGroupIds.includes(group.id)
                  return (
                    <label
                      key={group.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-sm transition-colors hover:bg-[#f6f9ff]"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGroup(group.id)}
                        className="h-4 w-4 rounded border-[#d8e6f7] text-[#0e58a8] focus:ring-[#0e58a8]"
                      />
                      <span className="font-medium text-[#012970]">{group.name}</span>
                      <span className="text-xs text-[#7293b9]">#{group.id}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {groupsError && (
              <p className="text-[11px] text-red-500" style={{ fontFamily: "var(--font-poppins)" }}>{groupsError}</p>
            )}
            {!groupsLoading && groupOptions.length > 0 && (
              <p className="text-[11px] text-[#7293b9]" style={{ fontFamily: "var(--font-poppins)" }}>
                Tanlandi: {selectedGroupIds.length ? groupOptions.filter(g => selectedGroupIds.includes(g.id)).map(g => g.name).join(", ") : "—"}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" style={{ fontFamily: "var(--font-poppins)" }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-[8px] bg-[#0e58a8] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#104475] disabled:opacity-60"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {loading ? "Yaratilmoqda..." : "Meeting yaratish"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] border border-[#d8e6f7] px-5 py-2.5 text-sm font-medium text-[#7293b9] hover:bg-[#f6f9ff] transition-colors"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Bekor qilish
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function RecordingCard({ recording }: { recording: MeetingRecording }) {
  return (
    <div className="rounded-[8px] border border-[#d8e6f7] bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <InfoPill icon={BookOpen} label={recording.subjectName || "Fan ko'rsatilmagan"} />
        <InfoPill icon={CalendarDays} label={recording.date} />
        <InfoPill
          icon={Users2}
          label={recording.groupIds.length ? `Guruh ${recording.groupIds.join(", ")}` : "Guruh ko'rsatilmagan"}
        />
      </div>
      <p className="mt-2.5 text-sm font-semibold text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>
        {recording.title}
      </p>
      <video
        controls
        preload="metadata"
        className="mt-2.5 w-full rounded-[8px] bg-black"
        src={recording.fileUrl}
      />
    </div>
  )
}

function RecordingsSection() {
  const { data, loading, error } = useApi(() => meetingsApi.myRecordings(), [])
  const seen = new Set<string>()
  const recordings = (data?.data ?? []).filter(r => {
    const key = String(r.id ?? r.fileUrl ?? r.title)
    if (seen.has(key)) return false
    seen.add(key); return true
  })

  return (
    <div className="rounded-[8px] border border-[#d8e6f7] bg-white p-5 shadow-[0_2px_12px_rgba(1,41,112,0.06)]">
      <h3 className="text-lg font-semibold text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>
        Darslar yozuvlari
      </h3>
      {error && (
        <p className="mt-2 text-sm text-red-600" style={{ fontFamily: "var(--font-poppins)" }}>
          {error}
        </p>
      )}
      <div className="mt-4 space-y-3">
        {recordings.length ? (
          recordings.map((recording) => <RecordingCard key={recording.id} recording={recording} />)
        ) : (
          <EmptyMeetings loading={loading} />
        )}
      </div>
    </div>
  )
}

function LobbyStage({
  upcoming,
  past,
  sourceLabel,
  sourceTone,
  loading,
  onJoin,
  onDelete,
  onRefresh,
  onCreateMeeting,
  joiningId,
  deletingId,
  joinError,
  apiError,
  isTeacher,
}: {
  upcoming: Meeting[]
  past: Meeting[]
  sourceLabel: string
  sourceTone: "success" | "warning" | "loading"
  loading: boolean
  onJoin: (meetingId: string) => void
  onDelete: (meetingId: string) => void
  onRefresh: () => void
  onCreateMeeting: () => void
  joiningId: string | null
  deletingId: string | null
  joinError: string | null
  apiError: string | null
  isTeacher: boolean
}) {
  const nextMeeting = upcoming[0]
  const totalParticipants = upcoming.reduce(
    (sum, meeting) => sum + meeting.participants,
    0
  )

  return (
    <motion.div
      key="meeting-lobby"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="h-full overflow-y-auto"
    >
      <div className="mx-auto w-full max-w-[1540px] px-6 py-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1
              className="text-2xl font-semibold text-[#012970]"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Meeting
            </h1>
            <p
              className="mt-1 text-sm text-[#7293b9]"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Masofaviy darslar va uchrashuvlar
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SourceBadge label={sourceLabel} tone={sourceTone} />
            {isTeacher && (
              <button
                type="button"
                onClick={onCreateMeeting}
                className="inline-flex items-center gap-2 rounded-[5px] bg-[#0e58a8] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#104475]"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                <Plus className="h-3.5 w-3.5" />
                Yangi meeting
              </button>
            )}
            <button
              type="button"
              onClick={onRefresh}
              className="grid h-9 w-9 place-items-center rounded-[5px] border border-[#d8e6f7] bg-white text-[#104475] transition-colors hover:bg-[#f6f9ff]"
              aria-label="Yangilash"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <StatCard
            icon={CalendarDays}
            label="Kelgusi meetinglar"
            value={upcoming.length}
            accent="#0e58a8"
          />
          <StatCard
            icon={Users2}
            label="Jami ishtirokchilar"
            value={totalParticipants}
            accent="#1cc2dc"
          />
          <StatCard
            icon={CheckCircle2}
            label="Yakunlangan meetinglar"
            value={past.length}
            accent="#16a34a"
          />
        </div>

        {apiError && (
          <div
            className="mt-4 rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {apiError}
          </div>
        )}

        {joinError && (
          <div
            className="mt-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {joinError}
          </div>
        )}

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0">
            {nextMeeting && (
              <div className="mb-5 rounded-[8px] border border-[#d8e6f7] bg-white p-5 shadow-[0_2px_12px_rgba(1,41,112,0.06)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1cc2dc]"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      Keyingi meeting
                    </p>
                    <h2
                      className="mt-2 text-xl font-semibold text-[#012970]"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      {nextMeeting.title}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <InfoPill icon={CalendarDays} label={nextMeeting.date} />
                      <InfoPill icon={Clock3} label={nextMeeting.time} />
                      <InfoPill icon={Users2} label={participantText(nextMeeting.participants)} />
                    </div>
                  </div>
                  <PrimaryButton
                    onClick={() => onJoin(nextMeeting.id)}
                    loading={joiningId === nextMeeting.id}
                  >
                    {joiningId !== nextMeeting.id ? (
                      <Play className="h-4 w-4 fill-current" />
                    ) : null}
                    Qo&apos;shilish
                  </PrimaryButton>
                </div>
              </div>
            )}

            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2
                  className="text-lg font-semibold text-[#012970]"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  Meetinglar ro&apos;yxati
                </h2>
                <p
                  className="mt-1 text-sm text-[#7293b9]"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  {upcoming.length} ta kelgusi meeting
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {upcoming.length ? (
                upcoming.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onJoin={onJoin}
                    onDelete={onDelete}
                    joining={joiningId === meeting.id}
                    deleting={deletingId === meeting.id}
                  />
                ))
              ) : (
                <EmptyMeetings loading={loading} />
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-[8px] border border-[#d8e6f7] bg-white p-5 shadow-[0_2px_12px_rgba(1,41,112,0.06)]">
              <div className="flex items-center justify-between">
                <h3
                  className="text-lg font-semibold text-[#012970]"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  O&apos;tgan meetinglar
                </h3>
                <span
                  className="text-xs text-[#7293b9]"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  {past.length} ta
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {past.length ? (
                  past.map((meeting) => (
                    <PastMeetingCard key={meeting.id} meeting={meeting} />
                  ))
                ) : (
                  <EmptyMeetings loading={loading} />
                )}
              </div>
            </div>

            <RecordingsSection />
          </aside>
        </div>
      </div>
    </motion.div>
  )
}

function ToggleCard({
  active,
  title,
  subtitle,
  icon: ActiveIcon,
  offIcon: OffIcon,
  onClick,
}: {
  active: boolean
  title: string
  subtitle: string
  icon: LucideIcon
  offIcon: LucideIcon
  onClick: () => void
}) {
  const Icon = active ? ActiveIcon : OffIcon

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[8px] border border-[#d8e6f7] bg-white px-4 py-4 text-left transition-colors hover:bg-[#f6f9ff]"
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 place-items-center rounded-[8px]"
          style={{ backgroundColor: active ? "#e8fbff" : "#fff1f2" }}
        >
          <Icon className={cn("h-5 w-5", active ? "text-[#1cc2dc]" : "text-red-500")} />
        </div>
        <div>
          <p
            className="text-sm font-semibold text-[#012970]"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {title}
          </p>
          <p
            className="text-xs text-[#7293b9]"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {subtitle}
          </p>
        </div>
      </div>
    </button>
  )
}

function PrejoinStage({
  meeting,
  micEnabled,
  cameraEnabled,
  previewStream,
  joining,
  joinError,
  onBack,
  onEnter,
  onToggleMic,
  onToggleCamera,
}: {
  meeting: Meeting
  micEnabled: boolean
  cameraEnabled: boolean
  previewStream: MediaStream | null
  joining: boolean
  joinError: string | null
  onBack: () => void
  onEnter: () => void
  onToggleMic: () => void
  onToggleCamera: () => void
}) {
  return (
    <motion.div
      key="meeting-prejoin"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="h-full overflow-y-auto"
    >
      <div className="mx-auto grid min-h-full w-full max-w-[1360px] gap-5 px-6 py-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
        <section className="min-w-0 rounded-[8px] border border-[#d8e6f7] bg-white p-5 shadow-[0_2px_12px_rgba(1,41,112,0.06)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-[5px] border border-[#d8e6f7] bg-white px-4 py-2 text-sm font-medium text-[#104475] transition-colors hover:bg-[#f6f9ff]"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              <ArrowLeft className="h-4 w-4" />
              Orqaga
            </button>
            <SourceBadge label="Pre-join" tone="success" />
          </div>
          {previewStream && cameraEnabled
            ? <LiveVideoPreview stream={previewStream} label={meeting.host || meeting.title} cameraEnabled={cameraEnabled} screenSharing={false} mediaError={null} />
            : <VideoPreview label={meeting.host || meeting.title} />
          }
        </section>

        <aside className="rounded-[8px] border border-[#d8e6f7] bg-white p-5 shadow-[0_2px_12px_rgba(1,41,112,0.06)]">
          <h2
            className="text-2xl font-semibold text-[#012970]"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {meeting.title}
          </h2>
          <p
            className="mt-2 text-sm leading-6 text-[#7293b9]"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {meeting.subject}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <InfoPill icon={CalendarDays} label={meeting.date} />
            <InfoPill icon={Clock3} label={meeting.time} />
            <InfoPill icon={Users2} label={participantText(meeting.participants)} />
          </div>

          <div className="mt-5 rounded-[8px] border border-[#d8e6f7] bg-[#f6f9ff] p-4">
            <p
              className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1cc2dc]"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Host
            </p>
            <p
              className="mt-2 text-base font-semibold text-[#012970]"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              {meeting.host || "Ko'rsatilmagan"}
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            <ToggleCard
              active={micEnabled}
              title="Mikrofon"
              subtitle={micEnabled ? "Yoniq" : "Ochiq emas"}
              icon={Mic}
              offIcon={MicOff}
              onClick={onToggleMic}
            />
            <ToggleCard
              active={cameraEnabled}
              title="Kamera"
              subtitle={cameraEnabled ? "Tayyor" : "Yopiq"}
              icon={Video}
              offIcon={VideoOff}
              onClick={onToggleCamera}
            />
          </div>

          {joinError && (
            <div
              className="mt-5 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              {joinError}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <PrimaryButton onClick={onEnter} loading={joining} disabled={joining}>
              {!joining ? <Play className="h-4 w-4 fill-current" /> : null}
              Meetingga kirish
            </PrimaryButton>

            {meeting.link !== "#" && (
              <a
                href={meeting.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-[5px] border border-[#d8e6f7] bg-white px-4 py-2.5 text-sm font-medium text-[#104475] transition-colors hover:bg-[#f6f9ff]"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                Tashqi havolani ochish
                <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </aside>
      </div>
    </motion.div>
  )
}

function CallControlButton({
  label,
  tone,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  tone: "primary" | "danger"
  icon: LucideIcon
  active?: boolean
  onClick: () => void
}) {
  const danger = tone === "danger"

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition-colors",
        danger
          ? "bg-red-500 text-white hover:bg-red-600"
          : active
            ? "border border-[#0e58a8] bg-[#0e58a8] text-white hover:bg-[#104475]"
            : "border border-[#d8e6f7] bg-white text-[#104475] hover:bg-[#f6f9ff]"
      )}
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <Icon className="h-5 w-5" />
      {danger ? <span>{label}</span> : null}
    </button>
  )
}

function ParticipantRow({ person }: { person: Participant }) {
  const dotColor =
    person.status === "invited"
      ? "#94a3b8"
      : person.status === "muted"
        ? "#f59e0b"
        : "#16a34a"

  return (
    <div className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 transition-colors hover:bg-[#f6f9ff]">
      <Avatar name={person.name} accent={person.accent} />
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium text-[#012970]"
          style={{ fontFamily: "var(--font-poppins)" }}
        >
          {person.name}
        </p>
        <p
          className="truncate text-xs text-[#7293b9]"
          style={{ fontFamily: "var(--font-poppins)" }}
        >
          {roleLabel(person.role)}
        </p>
      </div>
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
    </div>
  )
}

/* ── Participant grid tile ──────────────────────────────────────────── */
function ParticipantTile({
  stream, name, roleLine, isActive, isSelf, micOn, camOn, screenOn, onClick,
}: {
  stream: MediaStream | null
  name: string
  roleLine: string
  isActive: boolean
  isSelf?: boolean
  micOn?: boolean
  camOn?: boolean
  screenOn?: boolean
  onClick?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hasVideo = Boolean(stream?.getVideoTracks().some(t => t.readyState === "live")) && (camOn !== false || screenOn)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = hasVideo ? stream : null
    if (hasVideo) void video.play().catch(() => undefined)
    return () => { video.srcObject = null }
  }, [hasVideo, stream])

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[10px] border-2 transition-all focus:outline-none",
        isActive ? "border-[#0e58a8] shadow-[0_0_0_3px_rgba(14,88,168,0.25)]" : "border-transparent hover:border-[#1cc2dc]/60",
        isSelf && "cursor-default"
      )}
      style={{ backgroundColor: "#10192a", aspectRatio: "16/9" }}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          playsInline autoPlay muted={isSelf}
          className="h-full w-full object-cover"
          style={isSelf ? { transform: "scaleX(-1)" } : undefined}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#111827] to-[#1e3a8a]">
          <Avatar name={name} size="lg" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      {/* Name + role */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2">
        <p className="truncate text-left text-sm font-semibold text-white drop-shadow" style={{ fontFamily: "var(--font-poppins)" }}>
          {name}{isSelf ? " (Siz)" : ""}
        </p>
        <p className="truncate text-left text-[11px] text-white/70" style={{ fontFamily: "var(--font-poppins)" }}>
          {roleLine}
        </p>
      </div>

      {/* Status indicators */}
      <div className="absolute right-2 top-2 flex items-center gap-1">
        {micOn === false && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60">
            <MicOff className="h-3 w-3 text-red-400" />
          </span>
        )}
        {screenOn && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60">
            <MonitorUp className="h-3 w-3 text-yellow-300" />
          </span>
        )}
      </div>

      {isActive && (
        <div className="absolute left-2 top-2 rounded-full bg-[#0e58a8] px-2 py-0.5 text-[10px] font-semibold text-white">
          Asosiy
        </div>
      )}
    </button>
  )
}

/* ── Grid columns helper ────────────────────────────────────────────── */
function gridCols(count: number): string {
  if (count <= 1) return "grid-cols-1"
  if (count <= 2) return "grid-cols-2"
  if (count <= 4) return "grid-cols-2"
  if (count <= 9) return "grid-cols-3"
  return "grid-cols-4"
}

function CallStage({
  meeting,
  sourceLabel,
  sourceTone,
  joinToken,
  liveParticipants,
  invitedParticipants,
  remoteStreams,
  localStream,
  screenStream,
  activeVideoId,
  micEnabled,
  cameraEnabled,
  screenSharing,
  mediaError,
  socketError,
  activePanel,
  chatMessages,
  chatInput,
  callSeconds,
  isTeacher,
  localUserName,
  localUserRole,
  localGroupId,
  groupIdToName,
  isRecording,
  recordingError,
  recordingUploading,
  onToggleMic,
  onToggleCamera,
  onToggleScreen,
  onToggleRecording,
  onSelectVideo,
  onTogglePanel,
  onChatInputChange,
  onSendChat,
  onFullscreen,
  onLeave,
}: {
  meeting: Meeting
  sourceLabel: string
  sourceTone: "success" | "warning" | "loading"
  joinToken: JoinTokenResponse | null
  liveParticipants: Participant[]
  invitedParticipants: Participant[]
  remoteStreams: RemoteStream[]
  localStream: MediaStream | null
  screenStream: MediaStream | null
  activeVideoId: ActiveVideoId
  micEnabled: boolean
  cameraEnabled: boolean
  screenSharing: boolean
  mediaError: string | null
  socketError: string | null
  activePanel: CallPanel
  chatMessages: ChatMessage[]
  chatInput: string
  callSeconds: number
  isTeacher: boolean
  localUserName: string
  localUserRole: string
  localGroupId: number | null
  groupIdToName: Map<number, string>
  isRecording: boolean
  recordingError: string | null
  recordingUploading: boolean
  onToggleMic: () => void
  onToggleCamera: () => void
  onToggleScreen: () => void
  onToggleRecording: () => void
  onSelectVideo: (videoId: ActiveVideoId) => void
  onTogglePanel: (panel: CallPanel) => void
  onChatInputChange: (value: string) => void
  onSendChat: () => void
  onFullscreen: () => void
  onLeave: () => void
}) {
  const videoSectionRef = useRef<HTMLElement | null>(null)
  const handleFullscreen = () => {
    const el = videoSectionRef.current
    if (!el) { onFullscreen(); return }
    if (!document.fullscreenElement) void el.requestFullscreen?.()
    else void document.exitFullscreen?.()
  }
  const activeRemote = activeVideoId === "self"
    ? null
    : (remoteStreams.find(r => r.socketId === activeVideoId) ?? null)
  const localPreviewStream = screenStream || localStream
  const activeStream      = activeRemote?.stream ?? localPreviewStream
  const activeLabel       = activeRemote ? activeRemote.name : (localUserName || "Siz")
  const activeSubLabel    = activeRemote
    ? roleLabel(activeRemote.role, activeRemote.groupId, groupIdToName.get(activeRemote.groupId ?? 0))
    : roleLabel(localUserRole, localGroupId, groupIdToName.get(localGroupId ?? 0))
  const activeScreenSharing  = activeRemote?.screenSharing ?? screenSharing
  const activeCameraEnabled  = activeRemote ? (activeRemote.cameraEnabled !== false) : cameraEnabled

  const allowedRemoteStreams = isTeacher
    ? remoteStreams
    : remoteStreams.filter(r => r.role === "teacher" || r.role === "employee")
  const visibleRemoteStreams = activeRemote
    ? allowedRemoteStreams.filter(r => r.socketId !== activeRemote.socketId)
    : allowedRemoteStreams

  const participantCount = liveParticipants.length + invitedParticipants.length
  const panelCount = activePanel === "chat" ? chatMessages.length
    : activePanel === "cameras" ? remoteStreams.length
    : participantCount

  const handleChatSubmit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); onSendChat() }

  // Ishtirokchi ustiga bosish → asosiy ekranda ochish, yana bosish → o'ziga qaytish
  const handleParticipantClick = (person: Participant) => {
    if (!person.socketId) return
    if (activeVideoId === person.socketId) {
      onSelectVideo("self")
      return
    }
    const hasStream = remoteStreams.some(r => r.socketId === person.socketId)
    if (hasStream) onSelectVideo(person.socketId)
  }

  return (
    <motion.div key="call-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="h-full overflow-hidden">
      <div className="flex h-full min-h-0 flex-col bg-[#f6f9ff] px-6 py-6">

        {/* Header */}
        <div className="mb-4 flex shrink-0 flex-col gap-3 rounded-[8px] border border-[#d8e6f7] bg-white px-4 py-3 shadow-[0_2px_12px_rgba(1,41,112,0.06)] xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onLeave} className="grid h-10 w-10 place-items-center rounded-full border border-[#d8e6f7] bg-white text-[#104475] hover:bg-[#f6f9ff]" aria-label="Orqaga">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="grid h-11 w-11 place-items-center rounded-[8px] bg-[#0e58a8] text-sm font-semibold text-white">
              {getInitials(meeting.subject || meeting.title)}
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>{meeting.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#7293b9]" style={{ fontFamily: "var(--font-poppins)" }}>
                <span>{meeting.date}</span><span>{meeting.time}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SourceBadge label={sourceLabel} tone={sourceTone} />
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e6f7] bg-[#f6f9ff] px-3 py-2 text-sm text-[#104475]" style={{ fontFamily: "var(--font-poppins)" }}>
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />{formatCallDuration(callSeconds)}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">

          {/* Video area */}
          <section ref={videoSectionRef} className="flex min-h-0 flex-col rounded-[8px] border border-[#d8e6f7] bg-white p-4 shadow-[0_2px_12px_rgba(1,41,112,0.06)]">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <InfoPill icon={CalendarDays} label={meeting.subject || "Meeting"} />
                <InfoPill icon={Clock3} label={meeting.duration} />
                <InfoPill icon={Users2} label={participantText(meeting.participants)} />
              </div>
              {meeting.link !== "#" && (
                <a href={meeting.link} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-[5px] border border-[#d8e6f7] bg-white px-3 py-2 text-xs font-medium text-[#104475] hover:bg-[#f6f9ff]"
                  style={{ fontFamily: "var(--font-poppins)" }}>
                  Havola <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {/* Main video */}
            <div className="relative mt-3 min-h-[360px] flex-1 overflow-hidden rounded-[8px] bg-[#10192a]">
              {/* Camera/screen ON */}
              {activeCameraEnabled || activeScreenSharing ? (
                <LiveVideoPreview stream={activeStream} label={activeLabel} cameraEnabled={activeCameraEnabled} screenSharing={activeScreenSharing} mediaError={mediaError} />
              ) : (
                /* Camera OFF — to'liq ism, rol, guruh */
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 p-6">
                  <Avatar name={activeLabel} size="lg" />
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-poppins)" }}>{activeLabel}</p>
                    <p className="mt-1 text-sm text-white/60" style={{ fontFamily: "var(--font-poppins)" }}>{activeSubLabel}</p>
                    <p className="mt-2 text-xs text-white/40" style={{ fontFamily: "var(--font-poppins)" }}>Kamera o'chirilgan</p>
                  </div>
                </div>
              )}

              {/* Thumbnails — top-left */}
              {(activeRemote || visibleRemoteStreams.length > 0) && (
                <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap gap-3">
                  {activeRemote && (
                    <LocalVideoTile stream={localPreviewStream} label="Siz" cameraEnabled={cameraEnabled} screenSharing={screenSharing} active={activeVideoId === "self"} onSelect={() => onSelectVideo("self")} />
                  )}
                  {visibleRemoteStreams.map(remote => (
                    <RemoteVideoTile key={remote.socketId} remote={remote} active={activeVideoId === remote.socketId} onSelect={() => onSelectVideo(remote.socketId)} />
                  ))}
                </div>
              )}

              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(16,25,42,0.72)_100%)] pointer-events-none" />
              <div className="absolute bottom-5 left-5 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-[#012970] shadow-[0_6px_18px_rgba(1,41,112,0.16)]" style={{ fontFamily: "var(--font-poppins)" }}>
                {activeLabel}
              </div>
              <button type="button" aria-label="Kattalashtirish" onClick={handleFullscreen}
                className="absolute right-5 bottom-5 grid h-10 w-10 place-items-center rounded-full bg-white text-[#104475] shadow-[0_6px_18px_rgba(1,41,112,0.16)]">
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>

            {/* Controls */}
            <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
              <div />
              <div className="flex flex-wrap items-center justify-center gap-3">
                <CallControlButton label={micEnabled ? "Mikrofonni o'chirish" : "Mikrofonni yoqish"} icon={micEnabled ? Mic : MicOff} tone="primary" active={micEnabled} onClick={onToggleMic} />
                <CallControlButton label={cameraEnabled ? "Kamerani o'chirish" : "Kamerani yoqish"} icon={cameraEnabled ? Video : VideoOff} tone="primary" active={cameraEnabled} onClick={onToggleCamera} />
                <CallControlButton label="Chiqish" icon={PhoneOff} tone="danger" onClick={onLeave} />
                <CallControlButton label={screenSharing ? "Ekran ulashishni to'xtatish" : "Ekran ulashish"} icon={MonitorUp} tone="primary" active={screenSharing} onClick={onToggleScreen} />
                {isTeacher && (
                  <CallControlButton
                    label={isRecording ? "Yozishni tugatish" : "Yozishni boshlash"}
                    icon={isRecording ? Square : Circle}
                    tone={isRecording ? "danger" : "primary"}
                    active={isRecording}
                    onClick={onToggleRecording}
                  />
                )}
                <CallControlButton label="Chat" icon={MessageSquareText} tone="primary" active={activePanel === "chat"} onClick={() => onTogglePanel("chat")} />
              </div>
              <button type="button" onClick={() => onTogglePanel(activePanel === "participants" ? "chat" : "participants")}
                className="grid h-11 w-11 place-items-center rounded-full border border-[#d8e6f7] bg-white text-[#104475] hover:bg-[#f6f9ff]">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="flex min-h-0 flex-col rounded-[8px] border border-[#d8e6f7] bg-white p-4 shadow-[0_2px_12px_rgba(1,41,112,0.06)]">
            <div className="shrink-0">
              <div className="flex items-center gap-1 rounded-[5px] bg-[#f6f9ff] p-1">
                {(["participants", ...(isTeacher ? ["cameras"] : []), "chat"] as CallPanel[]).map(id => (
                  <button key={id} type="button" onClick={() => onTogglePanel(id)}
                    className={cn("rounded-[5px] px-3 py-2 text-xs font-medium transition-colors",
                      activePanel === id ? "bg-white text-[#012970] shadow-[0_2px_8px_rgba(1,41,112,0.08)]" : "text-[#7293b9] hover:bg-white")}
                    style={{ fontFamily: "var(--font-poppins)" }}>
                    {id === "participants" ? "Ishtirokchilar" : id === "cameras" ? "Kameralar" : "Chat"}
                  </button>
                ))}
                <span className="ml-auto rounded-full bg-[#e8fbff] px-2 py-0.5 text-xs font-medium text-[#0e58a8]" style={{ fontFamily: "var(--font-poppins)" }}>
                  {panelCount}
                </span>
              </div>
              {activePanel === "participants" && (
                <p className="mt-3 text-[11px] text-[#7293b9]" style={{ fontFamily: "var(--font-poppins)" }}>
                  💡 Bosing — kamerasini asosiy ekranda oching
                </p>
              )}
            </div>

            {socketError && (
              <div className="mt-4 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" style={{ fontFamily: "var(--font-poppins)" }}>
                {socketError}
              </div>
            )}

            {recordingError && (
              <div className="mt-4 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" style={{ fontFamily: "var(--font-poppins)" }}>
                {recordingError}
              </div>
            )}

            {(isRecording || recordingUploading) && (
              <div className="mt-4 flex items-center gap-2 rounded-[8px] border border-[#d8e6f7] bg-[#f6f9ff] px-3 py-2 text-xs text-[#0e58a8]" style={{ fontFamily: "var(--font-poppins)" }}>
                {isRecording && (
                  <>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    Yozib olinmoqda...
                  </>
                )}
                {recordingUploading && "Yozuv serverga yuklanmoqda..."}
              </div>
            )}

            {/* Participants */}
            {activePanel === "participants" && (
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 space-y-1">
                {/* O'zi */}
                <div className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 bg-[#f0f5ff]">
                  <Avatar name={localUserName || "Siz"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>
                      {localUserName || "Siz"} <span className="text-[#7293b9] text-xs font-normal">(Siz)</span>
                    </p>
                    <p className="truncate text-xs text-[#7293b9]" style={{ fontFamily: "var(--font-poppins)" }}>{roleLabel(localUserRole, localGroupId, groupIdToName.get(localGroupId ?? 0))}</p>
                  </div>
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                </div>
                {liveParticipants.map(person => {
                  const hasStream = remoteStreams.some(r => r.socketId === person.socketId)
                  return (
                    <div
                      key={person.socketId ?? person.name}
                      onClick={() => handleParticipantClick(person)}
                      title={hasStream ? "Bosing — kamerasini oching" : ""}
                      className={cn(
                        "flex items-center gap-3 rounded-[8px] px-3 py-2.5 transition-colors",
                        hasStream ? "cursor-pointer hover:bg-[#f0f5ff] active:bg-[#e8f0fb]" : "hover:bg-[#f6f9ff]",
                        activeVideoId === person.socketId && "bg-[#e8f0fb] border border-[#0e58a8]/20"
                      )}
                    >
                      <Avatar name={person.name} accent={person.accent} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>{person.name}</p>
                        <p className="truncate text-xs text-[#7293b9]" style={{ fontFamily: "var(--font-poppins)" }}>{roleLabel(person.role, person.groupId, groupIdToName.get(person.groupId ?? 0))}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasStream && (
                          <span className="text-[10px] text-[#0e58a8]" title="Kamera bor">
                            <Video className="h-3 w-3" />
                          </span>
                        )}
                        <span className={cn("h-2.5 w-2.5 rounded-full", person.status === "muted" ? "bg-yellow-400" : "bg-green-500")} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Cameras (teacher only) */}
            {activePanel === "cameras" && isTeacher && (
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 space-y-3">
                {remoteStreams.length === 0 ? (
                  <p className="rounded-[8px] border border-dashed border-[#b7cce8] px-3 py-8 text-center text-sm text-[#7293b9]" style={{ fontFamily: "var(--font-poppins)" }}>
                    Hali hech kim kamera yoqmagan
                  </p>
                ) : remoteStreams.map(remote => (
                  <ParticipantTile
                    key={remote.socketId}
                    stream={remote.stream}
                    name={remote.name}
                    roleLine={roleLabel(remote.role, remote.groupId, groupIdToName.get(remote.groupId ?? 0))}
                    isActive={activeVideoId === remote.socketId}
                    micOn={remote.micEnabled}
                    camOn={remote.cameraEnabled}
                    screenOn={remote.screenSharing}
                    onClick={() => onSelectVideo(remote.socketId)}
                  />
                ))}
              </div>
            )}

            {/* Chat */}
            {activePanel === "chat" && (
              <>
                <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 space-y-3">
                  {chatMessages.length ? chatMessages.map(message => (
                    <div key={message.id} className="rounded-[8px] border border-[#d8e6f7] bg-[#f6f9ff] px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>{message.fullName}</p>
                        <span className="shrink-0 text-[11px] text-[#7293b9]">
                          {new Date(message.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-[#104475]" style={{ fontFamily: "var(--font-poppins)" }}>{message.text}</p>
                    </div>
                  )) : (
                    <p className="rounded-[8px] border border-dashed border-[#b7cce8] px-3 py-8 text-center text-sm text-[#7293b9]" style={{ fontFamily: "var(--font-poppins)" }}>
                      Hozircha xabar yo&apos;q
                    </p>
                  )}
                </div>
                <form onSubmit={handleChatSubmit} className="mt-4 flex shrink-0 gap-2">
                  <input value={chatInput} onChange={e => onChatInputChange(e.target.value)} placeholder="Xabar yozish"
                    className="min-w-0 flex-1 rounded-[5px] border border-[#d8e6f7] bg-white px-3 py-2 text-sm text-[#104475] outline-none placeholder:text-[#7293b9]"
                    style={{ fontFamily: "var(--font-poppins)" }} />
                  <button type="submit" disabled={!chatInput.trim()}
                    className="grid h-10 w-10 place-items-center rounded-[5px] bg-[#0e58a8] text-white hover:bg-[#104475] disabled:cursor-not-allowed disabled:opacity-50">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </aside>
        </div>
      </div>
    </motion.div>
  )
}

export default function MeetingPage() {
  const { data, loading, error, refetch } = useApi(() => meetingsApi.getStudentMeetings())
  const { data: groupsData } = useApi(() => teachingApi.groups(), [])
  const { role, fullName: localFullName, groupId: localGroupId, groupIds: teacherGroupIds } = useCurrentUserRole()
  const isTeacher = role === "employee"
  const groupIdToName = useMemo(() => {
    const map = new Map<number, string>()
    const groups: TeacherGroup[] = groupsData?.data ?? []
    groups.forEach(g => { if (g.id && g.name) map.set(g.id, g.name) })
    return map
  }, [groupsData])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [viewState, setViewState] = useState<ViewState>({ stage: "lobby" })
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [joiningId, setJoiningId]   = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [joinError, setJoinError]   = useState<string | null>(null)
  const [joinToken, setJoinToken] = useState<JoinTokenResponse | null>(null)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [screenSharing, setScreenSharing] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [socketStatus, setSocketStatus] = useState("Realtime tayyor")
  const [socketError, setSocketError] = useState<string | null>(null)
  const [socketParticipants, setSocketParticipants] = useState<Participant[]>([])
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([])
  const [activeVideoId, setActiveVideoId] = useState<ActiveVideoId>("self")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [activePanel, setActivePanel] = useState<CallPanel>("participants")
  const [callSeconds, setCallSeconds] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [recordingUploading, setRecordingUploading] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingScreenStreamRef = useRef<MediaStream | null>(null)
  const recordingAudioContextRef = useRef<AudioContext | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const remoteStreamsRef = useRef<Map<string, RemoteStream>>(new Map())
  const remotePeerStatesRef = useRef<Map<string, Partial<RemotePeer>>>(new Map())
  const offeredPeersRef = useRef<Set<string>>(new Set())

  const upcoming = data?.data.upcoming ?? []
  const past     = data?.data.past     ?? []

  const prejoinMeeting =
    viewState.stage === "prejoin"
      ? (upcoming.find((meeting) => meeting.id === viewState.meetingId) ?? null)
      : null

  const callMeeting =
    viewState.stage === "call"
      ? (upcoming.find((meeting) => meeting.id === viewState.meetingId) ?? null)
      : null

  const invitedParticipants: Participant[] = []
  // Deduplicate by userId, exclude self, filter out student accounts without a groupId (demo/test accounts)
  const liveParticipants = (() => {
    const seenIds = new Set<number>()
    const seenNames = new Set<string>()
    return socketParticipants.filter(p => {
      const isTeacherRole = p.role === "employee" || p.role === "teacher" || p.role === "admin"
      const isValidStudent = !isTeacherRole && !!p.groupId
      if (!isTeacherRole && !isValidStudent) return false  // no groupId & not teacher → skip (demo accounts)
      if (p.userId != null) {
        if (seenIds.has(p.userId)) return false
        seenIds.add(p.userId)
      } else {
        if (seenNames.has(p.name)) return false
        seenNames.add(p.name)
      }
      return true
    })
  })()

  const sourceLabel = loading
    ? "Yuklanmoqda"
    : error
      ? "API xatosi"
      : viewState.stage === "call"
        ? socketStatus
        : "Meeting API"
  const sourceTone = error || socketError ? "warning" : loading ? "loading" : "success"
  const apiError   = error ? `Meeting API xatosi: ${error}` : null

  useEffect(() => {
    if (
      activeVideoId !== "self" &&
      !remoteStreams.some((remote) => remote.socketId === activeVideoId)
    ) {
      setActiveVideoId("self")
    }
  }, [activeVideoId, remoteStreams])

  const setLocalMedia = (stream: MediaStream | null) => {
    localStreamRef.current = stream
    setLocalStream(stream)
  }

  const setScreenMedia = (stream: MediaStream | null) => {
    screenStreamRef.current = stream
    setScreenStream(stream)
    setScreenSharing(Boolean(stream))
  }

  const currentOutboundVideoTrack = () =>
    screenStreamRef.current?.getVideoTracks()[0] ??
    localStreamRef.current?.getVideoTracks()[0] ??
    null

  const currentOutboundVideoStream = (track: MediaStreamTrack | null) => {
    if (!track) return null
    const screenStream = screenStreamRef.current
    if (screenStream?.getVideoTracks().includes(track)) return screenStream
    return localStreamRef.current
  }

  const emitMediaState = (
    socket = socketRef.current,
    overrides: Partial<Pick<RemotePeer, "cameraEnabled" | "micEnabled" | "screenSharing">> = {}
  ) => {
    socket?.emit("media:state", {
      cameraEnabled,
      micEnabled,
      screenSharing: Boolean(screenStreamRef.current),
      ...overrides,
    })
  }

  const refreshRemoteStreams = () => {
    setRemoteStreams(Array.from(remoteStreamsRef.current.values()))
  }

  const closePeerConnection = (socketId: string) => {
    peerConnectionsRef.current.get(socketId)?.close()
    peerConnectionsRef.current.delete(socketId)
    offeredPeersRef.current.delete(socketId)
    remoteStreamsRef.current.delete(socketId)
    remotePeerStatesRef.current.delete(socketId)
    refreshRemoteStreams()
  }

  const closePeerConnections = () => {
    peerConnectionsRef.current.forEach((connection) => connection.close())
    peerConnectionsRef.current.clear()
    offeredPeersRef.current.clear()
    remoteStreamsRef.current.clear()
    remotePeerStatesRef.current.clear()
    refreshRemoteStreams()
  }

  const addLocalTracksToPeer = (connection: RTCPeerConnection) => {
    const stream = localStreamRef.current
    const videoTrack = currentOutboundVideoTrack()
    const videoStream = currentOutboundVideoStream(videoTrack)

    stream?.getAudioTracks().forEach((track) => {
      const alreadyAdded = connection.getSenders().some((sender) => sender.track === track)
      if (!alreadyAdded) connection.addTrack(track, stream)
    })

    if (videoTrack && videoStream) {
      const alreadyAdded = connection.getSenders().some((sender) => sender.track === videoTrack)
      if (!alreadyAdded) connection.addTrack(videoTrack, videoStream)
    }
  }

  const syncPeerMediaTracks = () => {
    const videoTrack = currentOutboundVideoTrack()
    const videoStream = currentOutboundVideoStream(videoTrack)
    const audioTrack = localStreamRef.current?.getAudioTracks()[0] ?? null
    const audioStream = localStreamRef.current

    peerConnectionsRef.current.forEach((connection) => {
      const videoSender = connection.getSenders().find((sender) => sender.track?.kind === "video")
      const audioSender = connection.getSenders().find((sender) => sender.track?.kind === "audio")

      if (videoSender) {
        void videoSender.replaceTrack(videoTrack)
      } else if (videoTrack && videoStream) {
        connection.addTrack(videoTrack, videoStream)
      }

      if (audioSender) {
        void audioSender.replaceTrack(audioTrack)
      } else if (audioTrack && audioStream) {
        connection.addTrack(audioTrack, audioStream)
      }
    })
  }

  const updateRemoteMediaState = (payload: unknown) => {
    const record = recordValue(payload)
    const socketId = socketText(record.socketId, record.sid, record.from)
    if (!socketId) return

    const nextState = {
      cameraEnabled: Boolean(record.cameraEnabled),
      micEnabled: Boolean(record.micEnabled),
      screenSharing: Boolean(record.screenSharing),
    }
    remotePeerStatesRef.current.set(socketId, {
      ...(remotePeerStatesRef.current.get(socketId) ?? {}),
      ...nextState,
    })

    const existing = remoteStreamsRef.current.get(socketId)
    if (existing) {
      remoteStreamsRef.current.set(socketId, {
        ...existing,
        ...nextState,
      })
      refreshRemoteStreams()
    }
  }

  const createPeerConnection = (socket: Socket, peer: RemotePeer) => {
    const existing = peerConnectionsRef.current.get(peer.socketId)
    if (existing) return existing

    const connection = new RTCPeerConnection(rtcConfig)
    peerConnectionsRef.current.set(peer.socketId, connection)
    remotePeerStatesRef.current.set(peer.socketId, {
      ...(remotePeerStatesRef.current.get(peer.socketId) ?? {}),
      ...peer,
    })

    connection.onicecandidate = (event) => {
      if (!event.candidate) return
      socket.emit("webrtc:ice-candidate", {
        targetSocketId: peer.socketId,
        candidate: event.candidate,
      })
    }

    connection.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track])
      const peerState = remotePeerStatesRef.current.get(peer.socketId) ?? {}
      remoteStreamsRef.current.set(peer.socketId, {
        ...peer,
        ...peerState,
        stream,
      })
      refreshRemoteStreams()
    }

    connection.onconnectionstatechange = () => {
      if (["closed", "disconnected", "failed"].includes(connection.connectionState)) {
        closePeerConnection(peer.socketId)
      }
    }

    addLocalTracksToPeer(connection)
    return connection
  }

  const startPeerOffer = async (socket: Socket, peer: RemotePeer) => {
    if (offeredPeersRef.current.has(peer.socketId)) return
    offeredPeersRef.current.add(peer.socketId)

    try {
      const connection = createPeerConnection(socket, peer)
      const offer = await connection.createOffer()
      await connection.setLocalDescription(offer)
      socket.emit("webrtc:offer", {
        targetSocketId: peer.socketId,
        sdp: connection.localDescription,
      })
    } catch (issue) {
      offeredPeersRef.current.delete(peer.socketId)
      setSocketError(issue instanceof Error ? issue.message : "WebRTC offer yuborilmadi")
    }
  }

  const answerPeerOffer = async (socket: Socket, payload: unknown) => {
    try {
      const record = recordValue(payload)
      const from = socketText(record.from, record.fromSocketId)
      const sdp = record.sdp as RTCSessionDescriptionInit | undefined
      if (!from || !sdp) return

      const user = recordValue(record.user)
      const peer: RemotePeer = {
        socketId: from,
        name: socketText(user.fullName, user.name, user.username, record.fullName) || "Foydalanuvchi",
        role: socketText(user.role, user.groupId, record.role) || "Talaba",
      }
      const connection = createPeerConnection(socket, peer)
      await connection.setRemoteDescription(sdp)
      const answer = await connection.createAnswer()
      await connection.setLocalDescription(answer)
      socket.emit("webrtc:answer", {
        targetSocketId: from,
        sdp: connection.localDescription,
      })
    } catch (issue) {
      setSocketError(issue instanceof Error ? issue.message : "WebRTC answer yuborilmadi")
    }
  }

  const acceptPeerAnswer = async (payload: unknown) => {
    try {
      const record = recordValue(payload)
      const from = socketText(record.from, record.fromSocketId)
      const sdp = record.sdp as RTCSessionDescriptionInit | undefined
      const connection = from ? peerConnectionsRef.current.get(from) : null
      if (!connection || !sdp || connection.signalingState === "closed") return
      await connection.setRemoteDescription(sdp)
    } catch (issue) {
      setSocketError(issue instanceof Error ? issue.message : "WebRTC answer qabul qilinmadi")
    }
  }

  const acceptIceCandidate = async (payload: unknown) => {
    try {
      const record = recordValue(payload)
      const from = socketText(record.from, record.fromSocketId)
      const candidate = record.candidate as RTCIceCandidateInit | undefined
      const connection = from ? peerConnectionsRef.current.get(from) : null
      if (!connection || !candidate || connection.connectionState === "closed") return
      await connection.addIceCandidate(candidate)
    } catch (issue) {
      setSocketError(issue instanceof Error ? issue.message : "ICE candidate qabul qilinmadi")
    }
  }

  const ensureLocalMedia = async (constraints: MediaStreamConstraints) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Brauzer media qurilmalarni qo'llamaydi")
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    stream.getAudioTracks().forEach((track) => {
      track.enabled = micEnabled
    })
    stream.getVideoTracks().forEach((track) => {
      track.enabled = cameraEnabled
    })
    stopStream(localStreamRef.current)
    setLocalMedia(stream)
    syncPeerMediaTracks()
    return stream
  }

  const prepareCallMedia = async () => {
    if (!micEnabled && !cameraEnabled) return
    try {
      setMediaError(null)
      await ensureLocalMedia({ audio: micEnabled, video: cameraEnabled })
    } catch (mediaIssue) {
      setMediaError(mediaErrorText(mediaIssue))
    }
  }

  const ensureTrack = async (kind: "audio" | "video") => {
    const current = localStreamRef.current
    const hasTrack =
      kind === "audio"
        ? Boolean(current?.getAudioTracks().length)
        : Boolean(current?.getVideoTracks().length)

    if (hasTrack) return current
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Brauzer media qurilmalarni qo'llamaydi")
    }

    const nextTrackStream = await navigator.mediaDevices.getUserMedia({
      audio: kind === "audio",
      video: kind === "video",
    })
    const nextStream = new MediaStream([
      ...(current?.getTracks() ?? []),
      ...nextTrackStream.getTracks(),
    ])
    setLocalMedia(nextStream)
    syncPeerMediaTracks()
    return nextStream
  }

  const disconnectSocket = () => {
    closePeerConnections()
    socketRef.current?.emit("meeting:leave")
    socketRef.current?.disconnect()
    socketRef.current = null
  }

  const leaveCall = async () => {
    if (mediaRecorderRef.current) {
      await stopRecording()
    }
    disconnectSocket()
    stopStream(localStreamRef.current)
    stopStream(screenStreamRef.current)
    stopStream(previewStream)
    setPreviewStream(null)
    setLocalMedia(null)
    setScreenMedia(null)
    setSocketParticipants([])
    setRemoteStreams([])
    setActiveVideoId("self")
    setChatMessages([])
    setChatInput("")
    setMediaError(null)
    setSocketError(null)
    setSocketStatus("Realtime tayyor")
    setCallSeconds(0)
    setViewState({ stage: "lobby" })
    refetch()
  }

  const toggleMic = async () => {
    const next = !micEnabled
    try {
      setMediaError(null)
      if (next) await ensureTrack("audio")
      localStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = next
      })
      setMicEnabled(next)
      syncPeerMediaTracks()
      emitMediaState(undefined, { micEnabled: next })
    } catch (mediaIssue) {
      setMediaError(mediaErrorText(mediaIssue))
    }
  }

  const toggleCamera = async () => {
    const next = !cameraEnabled
    try {
      setMediaError(null)
      if (next) await ensureTrack("video")
      localStreamRef.current?.getVideoTracks().forEach((track) => {
        track.enabled = next
      })
      setCameraEnabled(next)
      syncPeerMediaTracks()
      emitMediaState(undefined, { cameraEnabled: next })
    } catch (mediaIssue) {
      setMediaError(mediaErrorText(mediaIssue))
    }
  }

  const stopScreenShare = () => {
    stopStream(screenStreamRef.current)
    setScreenMedia(null)
    syncPeerMediaTracks()
    emitMediaState(undefined, { screenSharing: false })
  }

  const toggleScreenShare = async () => {
    if (screenSharing) {
      stopScreenShare()
      return
    }

    try {
      setMediaError(null)
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("Brauzer ekran ulashishni qo'llamaydi")
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      stream.getVideoTracks()[0]?.addEventListener("ended", stopScreenShare, { once: true })
      setScreenMedia(stream)
      syncPeerMediaTracks()
      emitMediaState(undefined, { screenSharing: true })
    } catch (mediaIssue) {
      setMediaError(mediaErrorText(mediaIssue))
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.()
    else void document.exitFullscreen?.()
  }

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current
    const meetingId = callMeeting?.id
    if (!recorder) return

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve()
      if (recorder.state !== "inactive") recorder.stop()
      else resolve()
    })
    mediaRecorderRef.current = null

    stopStream(recordingScreenStreamRef.current)
    recordingScreenStreamRef.current = null
    if (recordingAudioContextRef.current) {
      void recordingAudioContextRef.current.close()
      recordingAudioContextRef.current = null
    }
    setIsRecording(false)

    const chunks = recordedChunksRef.current
    recordedChunksRef.current = []
    if (!chunks.length || !meetingId) return

    const blob = new Blob(chunks, { type: "video/webm" })
    setRecordingUploading(true)
    try {
      await meetingsApi.uploadRecording(meetingId, blob, "meeting.webm")
    } catch (issue) {
      setRecordingError(issue instanceof Error ? issue.message : "Yozuvni yuklashda xatolik")
    } finally {
      setRecordingUploading(false)
    }
  }

  const startRecording = async () => {
    try {
      setRecordingError(null)
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("Brauzer ekran yozishni qo'llamaydi")
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true,
        // @ts-ignore — Chrome/Edge specific: pre-selects current tab
        preferCurrentTab: true,
        selfBrowserSurface: "include",
      })
      recordingScreenStreamRef.current = screenStream

      const screenAudioTracks = screenStream.getAudioTracks()
      const micAudioTracks = localStreamRef.current?.getAudioTracks() ?? []
      let audioTrack: MediaStreamTrack | null = null

      if (screenAudioTracks.length && micAudioTracks.length) {
        const audioContext = new AudioContext()
        recordingAudioContextRef.current = audioContext
        const destination = audioContext.createMediaStreamDestination()
        audioContext.createMediaStreamSource(new MediaStream(screenAudioTracks)).connect(destination)
        audioContext.createMediaStreamSource(new MediaStream(micAudioTracks)).connect(destination)
        audioTrack = destination.stream.getAudioTracks()[0] ?? null
      } else if (screenAudioTracks.length) {
        audioTrack = screenAudioTracks[0]
      } else if (micAudioTracks.length) {
        audioTrack = micAudioTracks[0]
      }

      const tracks: MediaStreamTrack[] = [...screenStream.getVideoTracks()]
      if (audioTrack) tracks.push(audioTrack)
      const recordingStream = new MediaStream(tracks)

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm"
      const recorder = new MediaRecorder(recordingStream, { mimeType })
      recordedChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data)
      }
      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setIsRecording(true)

      screenStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        void stopRecording()
      }, { once: true })
    } catch (issue) {
      setRecordingError(mediaErrorText(issue))
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      void stopRecording()
    } else {
      void startRecording()
    }
  }

  const sendChatMessage = () => {
    const text = chatInput.trim()
    if (!text) return

    const socket = socketRef.current
    if (!socket?.connected) {
      setSocketError("Realtime ulanmagan, xabar yuborilmadi")
      return
    }

    socket.emit("chat:send", { message: text }, (ack: unknown) => {
      const body = unwrapSocketData(ack)
      const record = recordValue(ack)
      if (record.success === false) {
        setSocketError(socketText(record.error, record.message) || "Xabar yuborilmadi")
        return
      }
      setChatMessages((messages) =>
        appendChatMessage(messages, normalizeChatMessage(body))
      )
    })
    setChatInput("")
  }

  useEffect(() => {
    return () => {
      socketRef.current?.emit("meeting:leave")
      socketRef.current?.disconnect()
      socketRef.current = null
      closePeerConnections()
      stopStream(localStreamRef.current)
      stopStream(screenStreamRef.current)
      stopStream(recordingScreenStreamRef.current)
      mediaRecorderRef.current?.stop()
      void recordingAudioContextRef.current?.close()
    }
  }, [])

  useEffect(() => {
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = micEnabled
    })
  }, [localStream, micEnabled])

  useEffect(() => {
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = cameraEnabled
    })
  }, [localStream, cameraEnabled])

  useEffect(() => {
    if (viewState.stage !== "call") {
      return
    }

    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setCallSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [viewState])

  useEffect(() => {
    if (viewState.stage !== "call" || !joinToken?.token) return

    const socket = io(getMeetingSocketUrl(joinToken), {
      auth: { token: joinToken.token, joinToken: joinToken.token },
      transports: ["websocket", "polling"],
      extraHeaders: { "ngrok-skip-browser-warning": "true" },
    })

    socketRef.current = socket

    const applyJoinedPayload = (payload: unknown) => {
      const body = recordValue(unwrapSocketData(payload))
      const joinedParticipants = normalizeSocketParticipants(body.participants)
      const joinedPeers = normalizeRemotePeers(body.peers)
      const joinedMessages = Array.isArray(body.messages)
        ? body.messages.map((message, index) => normalizeChatMessage(message, index))
        : []

      if (joinedParticipants.length) setSocketParticipants(joinedParticipants)
      joinedPeers.forEach((peer) => {
        void startPeerOffer(socket, peer)
      })
      if (joinedMessages.length) {
        setChatMessages((messages) =>
          joinedMessages.reduce(appendChatMessage, messages)
        )
      }
    }

    socket.on("connect", () => {
      setSocketStatus("Realtime ulandi")
      socket.emit("meeting:join", {}, (ack: unknown) => {
        const record = recordValue(ack)
        if (record.success === false) {
          setSocketError(socketText(record.error, record.message) || "Meetingga socket orqali kirilmadi")
          return
        }
        applyJoinedPayload(ack)
        emitMediaState(socket)
      })
    })

    socket.on("meeting:joined", applyJoinedPayload)
    socket.on("participants", (payload: unknown) => {
      setSocketParticipants(normalizeSocketParticipants(payload))
    })
    socket.on("participant:joined", (payload: unknown) => {
      const next = normalizeSocketParticipants([payload])[0]
      if (!next) return
      setSocketParticipants((items) => {
        const filtered = items.filter((item) => item.name !== next.name)
        return [...filtered, next]
      })
    })
    socket.on("participant:left", (payload: unknown) => {
      const record = recordValue(payload)
      const socketId = socketText(record.socketId, record.sid)
      const name = socketText(record.fullName, record.name)
      if (socketId) closePeerConnection(socketId)
      if (!name) return
      setSocketParticipants((items) => items.filter((item) => item.name !== name))
    })
    socket.on("webrtc:offer", (payload: unknown) => {
      void answerPeerOffer(socket, payload)
    })
    socket.on("webrtc:answer", (payload: unknown) => {
      void acceptPeerAnswer(payload)
    })
    socket.on("webrtc:ice-candidate", (payload: unknown) => {
      void acceptIceCandidate(payload)
    })
    socket.on("media:state", updateRemoteMediaState)
    socket.on("chat:newMessage", (payload: unknown) => {
      setChatMessages((messages) =>
        appendChatMessage(messages, normalizeChatMessage(payload))
      )
    })
    socket.on("chat:message", (payload: unknown) => {
      setChatMessages((messages) =>
        appendChatMessage(messages, normalizeChatMessage(payload))
      )
    })
    socket.on("meeting:ended", () => {
      // O'qituvchi recording qilayotgan bo'lsa avtomatik to'xtatadi va yuklaydi
      void leaveCall()
    })
    socket.on("connect_error", (issue) => {
      setSocketStatus("Realtime xatosi")
      setSocketError(issue.message)
    })
    socket.on("disconnect", () => {
      setSocketStatus("Realtime uzildi")
    })

    return () => {
      socket.emit("meeting:leave")
      socket.disconnect()
      closePeerConnections()
      if (socketRef.current === socket) socketRef.current = null
    }
  }, [joinToken, viewState])

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm("Meetingni o'chirishni tasdiqlaysizmi?")) return
    setDeletingId(meetingId)
    try {
      await meetingsApi.remove(meetingId)
      refetch()
    } catch (e) {
      alert(e instanceof Error ? e.message : "O'chirishda xatolik")
    } finally {
      setDeletingId(null)
    }
  }

  const openPrejoin = (meetingId: string) => {
    setJoinError(null)
    setJoinToken(null)
    setSocketError(null)
    setMediaError(null)
    setViewState({ stage: "prejoin", meetingId })
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => setPreviewStream(stream))
        .catch(() => setPreviewStream(null))
    }
  }

  const enterMeeting = async () => {
    if (!prejoinMeeting) return

    setJoiningId(prejoinMeeting.id)
    setJoinError(null)

    try {
      const res = await meetingsApi.studentJoinToken(prejoinMeeting.id)
      stopStream(previewStream)
      setPreviewStream(null)
      await prepareCallMedia()
      setJoinToken(res.data)
      setChatMessages([])
      setSocketParticipants([])
      setActiveVideoId("self")
      setSocketStatus("Realtime ulanmoqda")
      setSocketError(null)
      setCallSeconds(0)
      setViewState({ stage: "call", meetingId: prejoinMeeting.id })
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Join-token olishda xatolik")
    } finally {
      setJoiningId(null)
    }
  }

  return (
    <div className="h-full bg-[#f6f9ff]">
      <AnimatePresence>
        {createModalOpen && (
          <CreateMeetingModal
            key="create-modal"
            open={createModalOpen}
            defaultGroupIds={teacherGroupIds}
            onClose={() => setCreateModalOpen(false)}
            onCreated={() => refetch()}
          />
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {callMeeting ? (
          <CallStage
            key={`call-${callMeeting.id}`}
            meeting={callMeeting}
            sourceLabel={sourceLabel}
            sourceTone={sourceTone}
            joinToken={joinToken}
            liveParticipants={liveParticipants}
            invitedParticipants={invitedParticipants}
            remoteStreams={remoteStreams}
            localStream={localStream}
            screenStream={screenStream}
            activeVideoId={activeVideoId}
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
            screenSharing={screenSharing}
            mediaError={mediaError}
            socketError={socketError}
            activePanel={activePanel}
            chatMessages={chatMessages}
            chatInput={chatInput}
            callSeconds={callSeconds}
            isTeacher={isTeacher}
            localUserName={localFullName}
            localUserRole={role}
            localGroupId={localGroupId}
            groupIdToName={groupIdToName}
            isRecording={isRecording}
            recordingError={recordingError}
            recordingUploading={recordingUploading}
            onToggleMic={toggleMic}
            onToggleCamera={toggleCamera}
            onToggleScreen={toggleScreenShare}
            onToggleRecording={toggleRecording}
            onSelectVideo={setActiveVideoId}
            onTogglePanel={setActivePanel}
            onChatInputChange={setChatInput}
            onSendChat={sendChatMessage}
            onFullscreen={toggleFullscreen}
            onLeave={leaveCall}
          />
        ) : prejoinMeeting ? (
          <PrejoinStage
            key={`prejoin-${prejoinMeeting.id}`}
            meeting={prejoinMeeting}
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
            previewStream={previewStream}
            joining={joiningId === prejoinMeeting.id}
            joinError={joinError}
            onBack={() => { stopStream(previewStream); setPreviewStream(null); setViewState({ stage: "lobby" }) }}
            onEnter={enterMeeting}
            onToggleMic={() => setMicEnabled((value) => !value)}
            onToggleCamera={() => setCameraEnabled((value) => !value)}
          />
        ) : (
          <LobbyStage
            key="lobby"
            upcoming={upcoming}
            past={past}
            sourceLabel={sourceLabel}
            sourceTone={sourceTone}
            loading={loading}
            onJoin={openPrejoin}
            onDelete={handleDeleteMeeting}
            onRefresh={refetch}
            onCreateMeeting={() => setCreateModalOpen(true)}
            joiningId={joiningId}
            deletingId={deletingId}
            joinError={joinError}
            apiError={apiError}
            isTeacher={isTeacher}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
