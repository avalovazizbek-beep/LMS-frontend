"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FolderOpen,
  Home,
  Maximize2,
  MessageSquareText,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  PhoneOff,
  Play,
  Search,
  Sparkles,
  Users2,
  Video,
  VideoOff,
} from "lucide-react"
import { meetingsApi, type Meeting } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { cn } from "@/lib/utils"

type Participant = {
  name: string
  role: string
  accent: string
  surface: string
  status: "live" | "muted" | "invited"
}

type ViewState =
  | { stage: "lobby" }
  | { stage: "prejoin"; meetingId: string }
  | { stage: "call"; meetingId: string }

const demoUpcoming: Meeting[] = [
  {
    id: "meeting-demo-1",
    title: "Business weekly meeting",
    subject: "Growth strategy and design review",
    host: "Albert Flores",
    date: "Apr 16th, 2023",
    time: "10:00 AM",
    duration: "45 min",
    participants: 10,
    link: "#",
    status: "upcoming",
  },
  {
    id: "meeting-demo-2",
    title: "Sprint planning",
    subject: "Quarterly roadmap alignment",
    host: "Devon Lane",
    date: "Apr 18th, 2023",
    time: "02:30 PM",
    duration: "30 min",
    participants: 8,
    link: "#",
    status: "upcoming",
  },
  {
    id: "meeting-demo-3",
    title: "Product check-in",
    subject: "UI polish and delivery review",
    host: "Theresa Webb",
    date: "Apr 20th, 2023",
    time: "11:15 AM",
    duration: "40 min",
    participants: 6,
    link: "#",
    status: "upcoming",
  },
]

const demoPast: Meeting[] = [
  {
    id: "meeting-past-1",
    title: "Operations sync",
    subject: "Process review",
    host: "Floyd Miles",
    date: "Apr 12th, 2023",
    time: "09:00 AM",
    duration: "35 min",
    participants: 9,
    link: "#",
    status: "done",
  },
  {
    id: "meeting-past-2",
    title: "Design critique",
    subject: "Design review",
    host: "Jane Cooper",
    date: "Apr 10th, 2023",
    time: "03:00 PM",
    duration: "50 min",
    participants: 11,
    link: "#",
    status: "done",
  },
]

const participants: Participant[] = [
  {
    name: "Floyd Miles",
    role: "Process Manager",
    accent: "#2DD4BF",
    surface: "from-[#1c4155] to-[#162436]",
    status: "live",
  },
  {
    name: "Ralph Edwards",
    role: "Director",
    accent: "#22C55E",
    surface: "from-[#214938] to-[#161f31]",
    status: "live",
  },
  {
    name: "Leslie Alexander",
    role: "Project Lead",
    accent: "#F59E0B",
    surface: "from-[#5a3a18] to-[#1a2031]",
    status: "live",
  },
  {
    name: "Annette Black",
    role: "Manager",
    accent: "#EC4899",
    surface: "from-[#522447] to-[#181f31]",
    status: "live",
  },
  {
    name: "Theresa Webb",
    role: "Operating Officer",
    accent: "#A78BFA",
    surface: "from-[#40336b] to-[#161d31]",
    status: "live",
  },
  {
    name: "Devon Lane",
    role: "UI Designer",
    accent: "#60A5FA",
    surface: "from-[#244d74] to-[#152033]",
    status: "muted",
  },
  {
    name: "Jane Cooper",
    role: "Delivery Manager",
    accent: "#F97316",
    surface: "from-[#5e3318] to-[#171f31]",
    status: "live",
  },
  {
    name: "Savannah Nguyen",
    role: "Legal Officer",
    accent: "#14B8A6",
    surface: "from-[#1d4b49] to-[#151f31]",
    status: "live",
  },
  {
    name: "Ronald Richards",
    role: "System Analyst",
    accent: "#FB7185",
    surface: "from-[#5a293a] to-[#181f31]",
    status: "invited",
  },
  {
    name: "Robert Fox",
    role: "Trainee Engineer",
    accent: "#38BDF8",
    surface: "from-[#1b4662] to-[#162030]",
    status: "invited",
  },
]

const topNav = [
  { label: "Home", icon: Home, active: true },
  { label: "People", icon: Users2, active: false },
  { label: "Files", icon: FolderOpen, active: false },
  { label: "Analytics", icon: BarChart3, active: false },
]

const controlButtons = [
  { label: "Microphone", icon: Mic, tone: "cyan" as const },
  { label: "Camera", icon: Video, tone: "cyan" as const },
  { label: "End Call", icon: PhoneOff, tone: "red" as const },
  { label: "Share Screen", icon: MonitorUp, tone: "cyan" as const },
  { label: "Messages", icon: MessageSquareText, tone: "cyan" as const },
]

function getInitials(name: string) {
  return name
    .split(" ")
    .map((chunk) => chunk[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function StatPill({
  icon: Icon,
  label,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  accent: string
}) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80"
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
      {label}
    </div>
  )
}

function Avatar({
  person,
  size = "md",
}: {
  person: Pick<Participant, "name" | "accent">
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
        "grid shrink-0 place-items-center rounded-full border border-white/12 font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.24)]",
        sizeClass
      )}
      style={{
        background: `linear-gradient(135deg, ${person.accent}, #172033)`,
      }}
    >
      {getInitials(person.name)}
    </div>
  )
}

function ControlButton({
  label,
  tone,
  icon: Icon,
}: {
  label: string
  tone: "cyan" | "red"
  icon: React.ComponentType<{ className?: string }>
}) {
  const isDanger = tone === "red"

  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "grid h-11 w-11 place-items-center rounded-full transition-transform hover:-translate-y-0.5 sm:h-12 sm:w-12",
        isDanger ? "w-auto min-w-[112px] px-5" : ""
      )}
      style={{
        background: isDanger
          ? "#ff5b57"
          : "linear-gradient(180deg, #34d9e8, #18abc5)",
        boxShadow: isDanger
          ? "0 18px 35px rgba(255, 91, 87, 0.35)"
          : "0 18px 35px rgba(28, 194, 220, 0.32)",
      }}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-white" />
        {isDanger && (
          <span
            className="text-sm font-medium text-white"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            End Call
          </span>
        )}
      </div>
    </button>
  )
}

function FilmstripCard({ person }: { person: Participant }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        "relative h-[138px] min-w-[126px] flex-1 overflow-hidden rounded-[16px] border border-white/8 bg-gradient-to-br p-3",
        person.surface
      )}
      style={{ boxShadow: "0 18px 32px rgba(3, 7, 18, 0.22)" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_36%)]" />
      <div className="relative flex h-full flex-col justify-between gap-4">
        <Avatar person={person} size="lg" />
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p
              className="truncate text-sm font-medium text-white"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              {person.name}
            </p>
            <p
              className="truncate text-[11px] text-white/65"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              {person.role}
            </p>
          </div>
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#101829]/70 text-white/85">
            <Mic className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ParticipantRow({ person }: { person: Participant }) {
  const dotColor =
    person.status === "invited"
      ? "#94a3b8"
      : person.status === "muted"
        ? "#f59e0b"
        : "#2dd4bf"

  return (
    <div className="flex items-center gap-3 rounded-[18px] px-3 py-2.5 transition-colors hover:bg-white/4">
      <Avatar person={person} />
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium text-white"
          style={{ fontFamily: "var(--font-poppins)" }}
        >
          {person.name}
        </p>
        <p
          className="truncate text-[11px] text-white/55"
          style={{ fontFamily: "var(--font-poppins)" }}
        >
          {person.role}
        </p>
      </div>
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-[#101829]">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      </div>
    </div>
  )
}

function MainSpeakerArtwork() {
  return (
    <svg
      viewBox="0 0 1200 760"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="meeting-wall" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#fbfaf7" />
          <stop offset="100%" stopColor="#ebe3d7" />
        </linearGradient>
        <linearGradient id="meeting-shirt" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#eedec1" />
          <stop offset="100%" stopColor="#e4d0ab" />
        </linearGradient>
        <linearGradient
          id="meeting-inner-shirt"
          x1="0%"
          x2="100%"
          y1="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#8d9096" />
          <stop offset="100%" stopColor="#6c7075" />
        </linearGradient>
        <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      <rect width="1200" height="760" fill="url(#meeting-wall)" />
      <rect
        x="52"
        y="72"
        width="1096"
        height="616"
        rx="50"
        fill="#f9f6f0"
        opacity="0.6"
      />
      <circle
        cx="194"
        cy="144"
        r="82"
        fill="#ffffff"
        opacity="0.4"
        filter="url(#soft-shadow)"
      />
      <circle
        cx="1035"
        cy="170"
        r="102"
        fill="#ffffff"
        opacity="0.38"
        filter="url(#soft-shadow)"
      />
      <rect x="120" y="150" width="250" height="300" rx="42" fill="#f1ece4" />
      <rect x="875" y="140" width="196" height="276" rx="38" fill="#f0e9df" />
      <ellipse
        cx="612"
        cy="728"
        rx="350"
        ry="44"
        fill="#cdb89b"
        opacity="0.24"
      />

      <path
        d="M262 650c58-130 170-204 330-204s272 74 330 204v110H262z"
        fill="url(#meeting-shirt)"
      />
      <path
        d="M470 520c43-22 89-33 138-33 50 0 96 11 139 33l-24 166H494z"
        fill="url(#meeting-inner-shirt)"
      />
      <path
        d="M420 494c30-45 92-78 189-78 98 0 161 34 190 78l-47 42c-28-29-73-43-143-43-67 0-114 14-142 43z"
        fill="#f1dfbf"
      />

      <ellipse cx="602" cy="317" rx="118" ry="136" fill="#f3cfac" />
      <path
        d="M496 317c0-109 55-163 127-163 65 0 115 45 115 113 0 33-13 63-34 85h-83z"
        fill="#4d2b1f"
      />
      <path
        d="M517 377c13 48 45 86 84 103 39-17 71-55 84-103-17 18-48 28-84 28-36 0-67-10-84-28z"
        fill="#7e4330"
      />
      <path
        d="M580 353c11 18 33 31 57 31s46-13 57-31c-1 38-27 79-57 95-30-16-56-57-57-95z"
        fill="#6f3a2b"
      />
      <path
        d="M573 410c17 12 53 13 74 0-8 22-26 38-37 38-11 0-28-16-37-38z"
        fill="#e89f8e"
      />
      <circle cx="553" cy="315" r="8.5" fill="#2f231e" />
      <circle cx="651" cy="315" r="8.5" fill="#2f231e" />
      <path
        d="M557 360c12 10 26 15 44 15 18 0 32-5 44-15"
        fill="none"
        stroke="#5c3125"
        strokeLinecap="round"
        strokeWidth="10"
      />

      <path
        d="M350 292c-34 25-63 72-68 131-5 62 16 116 61 154l35-64c-16-22-23-54-17-90 5-33 19-60 39-77z"
        fill="#f3cfac"
      />
      <path
        d="M381 340c-15 19-24 45-28 76-3 24 0 47 9 66l31-11c-7-12-10-31-7-51 2-17 9-33 18-45z"
        fill="#e9b59e"
      />
      <path
        d="M363 283c12-19 33-39 61-53l33 56c-18 10-32 25-42 42z"
        fill="#f1dfbf"
      />

      <path
        d="M470 520c20-8 42-14 69-19l-8 154h-54z"
        fill="#d6c3a1"
        opacity="0.65"
      />
      <path
        d="M731 501c27 5 49 11 69 19l-7 135h-54z"
        fill="#d1bc97"
        opacity="0.65"
      />

      <path
        d="M480 242c-5 0-10 2-13 6-19 20-29 45-29 77v45c0 13 11 24 24 24h14z"
        fill="#202633"
      />
      <path
        d="M725 242c5 0 10 2 13 6 19 20 29 45 29 77v45c0 13-11 24-24 24h-14z"
        fill="#202633"
      />
      <path
        d="M474 248c21-40 60-63 126-63 66 0 105 23 126 63"
        fill="none"
        stroke="#202633"
        strokeLinecap="round"
        strokeWidth="12"
      />
      <path
        d="M748 394c0 24-14 48-41 72"
        fill="none"
        stroke="#ff6b57"
        strokeLinecap="round"
        strokeWidth="7"
      />
    </svg>
  )
}

function MeetingCard({
  meeting,
  onJoin,
}: {
  meeting: Meeting
  onJoin: (meetingId: string) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-[24px] border border-white/8 bg-[#151f34] p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0f2a44]">
            <Video className="h-5 w-5 text-[#2dd4bf]" />
          </div>
          <div className="min-w-0">
            <h3
              className="text-lg font-semibold text-white"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              {meeting.title}
            </h3>
            <p
              className="mt-1 text-sm text-white/60"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              {meeting.subject}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                `Host: ${meeting.host}`,
                meeting.date,
                `${meeting.time} • ${meeting.duration}`,
                `${meeting.participants} participants`,
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-white/70"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {meeting.link !== "#" && (
            <a
              href={meeting.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition-colors hover:bg-white/8"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Havola
              <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
          <button
            type="button"
            onClick={() => onJoin(meeting.id)}
            className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,_#34d9e8,_#0e58a8)] px-4 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            <Play className="h-4 w-4 fill-current" />
            Qo&apos;shilish
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function LobbyStage({
  upcoming,
  past,
  sourceLabel,
  sourceTone,
  onJoin,
}: {
  upcoming: Meeting[]
  past: Meeting[]
  sourceLabel: string
  sourceTone: string
  onJoin: (meetingId: string) => void
}) {
  const nextMeeting = upcoming[0] ?? demoUpcoming[0]
  const totalParticipants = upcoming.reduce(
    (sum, meeting) => sum + meeting.participants,
    0
  )

  return (
    <motion.div
      key="meeting-lobby"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.28 }}
      className="h-full overflow-y-auto pr-1"
    >
      <div className="grid min-h-full gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[28px] border border-white/6 bg-[#111b2d] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
          <div className="rounded-[28px] bg-[linear-gradient(135deg,_#15233b_0%,_#17304e_55%,_#0f4a74_100%)] p-6 sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-[#7be0ec]">
                  <Sparkles className="h-4 w-4" />
                  Meeting lobby
                </div>
                <h1
                  className="mt-5 text-3xl font-semibold text-white sm:text-[40px]"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  Avval meetingni tanlang, keyin qo&apos;shiling
                </h1>
                <p
                  className="mt-4 max-w-xl text-sm leading-7 text-white/72 sm:text-base"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  Kelgusi meetinglar ro&apos;yxati shu yerda turadi.
                  `Qo&apos;shilish` bosilganda avval pre-join oynasi ochiladi,
                  keyin meeting ichiga kirasiz.
                </p>
              </div>

              <div
                className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-[#101829] px-3 py-2 text-xs text-white/70"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: sourceTone }}
                />
                {sourceLabel}
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Kelgusi meetinglar",
                  value: upcoming.length,
                  color: "#2dd4bf",
                },
                {
                  label: "Jami ishtirokchilar",
                  value: totalParticipants,
                  color: "#38bdf8",
                },
                {
                  label: "Yakunlangan meetinglar",
                  value: past.length,
                  color: "#f59e0b",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-4"
                >
                  <p
                    className="text-3xl font-semibold"
                    style={{
                      color: stat.color,
                      fontFamily: "var(--font-poppins)",
                    }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="mt-1 text-sm text-white/65"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-7 rounded-[24px] border border-white/8 bg-[#101829]/65 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p
                    className="text-xs font-semibold tracking-[0.24em] text-[#7be0ec] uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Next meeting
                  </p>
                  <h2
                    className="mt-3 text-2xl font-semibold text-white"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    {nextMeeting.title}
                  </h2>
                  <p
                    className="mt-2 text-sm text-white/68"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    {nextMeeting.subject}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      nextMeeting.date,
                      nextMeeting.time,
                      nextMeeting.duration,
                      `${nextMeeting.participants} participants`,
                    ].map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-white/70"
                        style={{ fontFamily: "var(--font-poppins)" }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onJoin(nextMeeting.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,_#34d9e8,_#0e58a8)] px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(28,194,220,0.28)] transition-transform hover:-translate-y-0.5"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  <Play className="h-4 w-4 fill-current" />
                  Qo&apos;shilish
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-4">
              <h2
                className="text-xl font-semibold text-white"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                Meetinglar ro&apos;yxati
              </h2>
              <p
                className="mt-1 text-sm text-white/55"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                Har bir meeting uchun alohida join bosqichi bor.
              </p>
            </div>

            <div className="space-y-4">
              {upcoming.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onJoin={onJoin}
                />
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-white/6 bg-[#111b2d] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p
                  className="text-sm font-medium text-[#2dd4bf]"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  Meeting status
                </p>
                <h3
                  className="mt-2 text-xl font-semibold text-white"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  Bugungi tayyorgarlik
                </h3>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0f2a44]">
                <Sparkles className="h-5 w-5 text-[#2dd4bf]" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                "Qo'shilish bosilganda avval pre-join oynasi ochiladi",
                "Call oynasi keyingi bosqichda alohida full-screen ko'rinishda chiqadi",
                "Sidebar va yuqori navbar call paytida joyida qoladi",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[18px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/72"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/6 bg-[#111b2d] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between">
              <h3
                className="text-xl font-semibold text-white"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                O&apos;tgan meetinglar
              </h3>
              <span
                className="text-xs text-white/45"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                {past.length} ta
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {past.map((meeting) => (
                <div
                  key={meeting.id}
                  className="rounded-[20px] border border-white/8 bg-[#151f34] px-4 py-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-full bg-[#12304f]">
                      <CheckCircle2 className="h-4 w-4 text-[#2dd4bf]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-semibold text-white"
                        style={{ fontFamily: "var(--font-poppins)" }}
                      >
                        {meeting.title}
                      </p>
                      <p
                        className="mt-1 text-xs text-white/55"
                        style={{ fontFamily: "var(--font-poppins)" }}
                      >
                        {meeting.date} • {meeting.time} • {meeting.duration}
                      </p>
                      <p
                        className="mt-2 text-xs text-white/42"
                        style={{ fontFamily: "var(--font-poppins)" }}
                      >
                        {meeting.participants} participants
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  )
}

function PrejoinStage({
  meeting,
  micEnabled,
  cameraEnabled,
  onBack,
  onEnter,
  onToggleMic,
  onToggleCamera,
}: {
  meeting: Meeting
  micEnabled: boolean
  cameraEnabled: boolean
  onBack: () => void
  onEnter: () => void
  onToggleMic: () => void
  onToggleCamera: () => void
}) {
  return (
    <motion.div
      key="meeting-prejoin"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.28 }}
      className="flex h-full items-center justify-center overflow-hidden"
    >
      <div className="grid h-full w-full max-w-[1360px] gap-4 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <div className="min-h-0 rounded-[30px] border border-white/6 bg-[#111b2d] p-4 shadow-[0_32px_80px_rgba(3,7,18,0.24)] sm:p-5">
          <div className="flex h-full min-h-0 flex-col rounded-[26px] border border-white/6 bg-[#151f34] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#101829] px-4 py-2 text-sm text-white transition-colors hover:bg-white/8"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                <ArrowLeft className="h-4 w-4" />
                Orqaga
              </button>
              <div
                className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-[#101829] px-3 py-2 text-xs text-white/70"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                <span className="h-2 w-2 rounded-full bg-[#2dd4bf]" />
                Pre-join
              </div>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-[26px] bg-[#ebe1d2]">
              <div className="relative h-full min-h-[320px]">
                <MainSpeakerArtwork />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_56%,rgba(8,13,24,0.38)_100%)]" />
                <div className="absolute right-4 bottom-4 rounded-full bg-[#101829]/70 px-4 py-2 text-sm text-white backdrop-blur-sm">
                  Preview
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/6 bg-[#111b2d] p-5 shadow-[0_32px_80px_rgba(3,7,18,0.24)] sm:p-6">
          <div className="flex h-full flex-col rounded-[26px] border border-white/6 bg-[#151f34] p-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-[#7be0ec]">
              <Sparkles className="h-4 w-4" />
              Meetingga kirishdan oldin
            </div>

            <h2
              className="mt-5 text-[30px] font-semibold text-white"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              {meeting.title}
            </h2>
            <p
              className="mt-2 text-sm leading-7 text-white/68"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Avval audio va kamera holatini tekshirib oling. `Meetingga kirish`
              bosilgandan keyin full-screen call oynasi ochiladi.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <StatPill
                icon={CalendarDays}
                label={meeting.date}
                accent="#2dd4bf"
              />
              <StatPill icon={Clock3} label={meeting.time} accent="#f59e0b" />
              <StatPill
                icon={Users2}
                label={`${meeting.participants} participants`}
                accent="#38bdf8"
              />
            </div>

            <div className="mt-6 rounded-[22px] border border-white/8 bg-[#101829]/70 p-4">
              <p
                className="text-xs font-semibold tracking-[0.22em] text-[#7be0ec] uppercase"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                Host
              </p>
              <p
                className="mt-3 text-lg font-semibold text-white"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                {meeting.host}
              </p>
              <p
                className="mt-1 text-sm text-white/58"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                {meeting.subject}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onToggleMic}
                className="rounded-[20px] border border-white/8 bg-[#101829]/70 px-4 py-4 text-left transition-colors hover:bg-white/8"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-2xl",
                      micEnabled ? "bg-[#0f2a44]" : "bg-[#2c1a20]"
                    )}
                  >
                    {micEnabled ? (
                      <Mic className="h-5 w-5 text-[#2dd4bf]" />
                    ) : (
                      <MicOff className="h-5 w-5 text-[#ff7b7b]" />
                    )}
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold text-white"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      Mikrofon
                    </p>
                    <p
                      className="text-xs text-white/50"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      {micEnabled ? "Yoniq" : "Ochiq emas"}
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onToggleCamera}
                className="rounded-[20px] border border-white/8 bg-[#101829]/70 px-4 py-4 text-left transition-colors hover:bg-white/8"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "grid h-11 w-11 place-items-center rounded-2xl",
                      cameraEnabled ? "bg-[#0f2a44]" : "bg-[#2c1a20]"
                    )}
                  >
                    {cameraEnabled ? (
                      <Video className="h-5 w-5 text-[#2dd4bf]" />
                    ) : (
                      <VideoOff className="h-5 w-5 text-[#ff7b7b]" />
                    )}
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold text-white"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      Kamera
                    </p>
                    <p
                      className="text-xs text-white/50"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      {cameraEnabled ? "Tayyor" : "Yopiq"}
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-auto space-y-3 pt-6">
              <button
                type="button"
                onClick={onEnter}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,_#34d9e8,_#0e58a8)] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(28,194,220,0.28)] transition-transform hover:-translate-y-0.5"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                <Play className="h-4 w-4 fill-current" />
                Meetingga kirish
              </button>

              {meeting.link !== "#" && (
                <a
                  href={meeting.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/8"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  Tashqi havolani ochish
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function CallStage({
  meeting,
  sourceLabel,
  sourceTone,
  liveParticipants,
  invitedParticipants,
  filmstripPeople,
  onLeave,
}: {
  meeting: Meeting
  sourceLabel: string
  sourceTone: string
  liveParticipants: Participant[]
  invitedParticipants: Participant[]
  filmstripPeople: Participant[]
  onLeave: () => void
}) {
  return (
    <motion.div
      key="call-view"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.28 }}
      className="h-full"
    >
      <div className="flex h-full min-h-0 flex-col rounded-[28px] border border-white/6 bg-[#111b2d] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4">
        <div className="flex shrink-0 flex-col gap-3 rounded-[24px] border border-white/6 bg-[#151f34] px-4 py-3 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onLeave}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-[#101829] text-white transition-colors hover:bg-white/8"
              aria-label="Meeting list"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(180deg,_#34d9e8,_#169ab3)] text-sm font-semibold text-white shadow-[0_18px_32px_rgba(28,194,220,0.28)]">
              LS
            </div>

            <div>
              <p
                className="text-[15px] font-semibold text-white"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                {meeting.title}
              </p>
              <div
                className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/55"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                <span>{meeting.date}</span>
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span>{meeting.time}</span>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 xl:flex">
            {topNav.map(({ label, icon: Icon, active }) => (
              <button
                key={label}
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
                  active
                    ? "bg-[#18253b] text-[#2dd4bf]"
                    : "text-white/70 hover:bg-white/4 hover:text-white"
                )}
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div
              className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-[#101829] px-3 py-2 text-xs text-white/70"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: sourceTone }}
              />
              {sourceLabel}
            </div>
            <button
              type="button"
              aria-label="Notifications"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/8 bg-[#101829] text-white/75"
            >
              <Bell className="h-4.5 w-4.5" />
            </button>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(135deg,_#f1c7a0,_#8d5f4e)] text-sm font-semibold text-[#1a2030]">
              AF
            </div>
          </div>
        </div>

        <div className="mt-3 grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_310px]">
          <section className="flex min-h-0 flex-col">
            <div className="flex min-h-0 flex-1 flex-col rounded-[28px] border border-white/6 bg-[#10192a] p-3 sm:p-4">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <StatPill
                    icon={CalendarDays}
                    label={meeting.subject}
                    accent="#2dd4bf"
                  />
                  <StatPill
                    icon={Clock3}
                    label={meeting.duration}
                    accent="#f59e0b"
                  />
                  <StatPill
                    icon={Users2}
                    label={`${meeting.participants} participants`}
                    accent="#38bdf8"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="inline-flex items-center gap-2 rounded-full bg-[#13243a] px-3 py-2 text-xs text-white/80"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    <span className="h-2 w-2 rounded-full bg-[#2dd4bf]" />
                    Live now
                  </div>

                  {meeting.link !== "#" && (
                    <a
                      href={meeting.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      Open link
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="relative mt-3 min-h-[320px] flex-1 overflow-hidden rounded-[26px] bg-[#ebe1d2]">
                <MainSpeakerArtwork />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.15),_transparent_42%),linear-gradient(180deg,transparent_60%,rgba(7,11,24,0.58)_100%)]" />

                <div
                  className="absolute bottom-5 left-5 rounded-full bg-[#6c6d74]/80 px-4 py-2 text-sm text-white backdrop-blur-sm"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  {meeting.host}
                </div>

                <button
                  type="button"
                  aria-label="Expand video"
                  className="absolute right-5 bottom-5 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-[#101829]/60 text-white backdrop-blur-sm"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>

                <div className="absolute inset-x-4 bottom-4 sm:inset-x-5">
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {filmstripPeople.map((person) => (
                      <FilmstripCard key={person.name} person={person} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
                <div
                  className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-[#131f33] px-3 py-2 text-sm text-white/80"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5b57]" />
                  </span>
                  24:01:45
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  {controlButtons.map((control) => (
                    <ControlButton key={control.label} {...control} />
                  ))}
                </div>

                <button
                  type="button"
                  aria-label="More options"
                  className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[#131f33] text-white/80 sm:h-12 sm:w-12"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
            </div>
          </section>

          <aside className="flex min-h-0 flex-col rounded-[28px] border border-white/6 bg-[#10192a] p-4">
            <div className="shrink-0">
              <div className="flex items-center gap-2 rounded-full bg-[#141f33] p-1">
                <button
                  type="button"
                  className="rounded-full bg-white px-5 py-2 text-sm font-medium text-[#111827]"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  Chat
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm text-[#2dd4bf]"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  Participants
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white">
                    15
                  </span>
                </button>
              </div>

              <label className="mt-4 flex items-center gap-3 rounded-[16px] border border-white/8 bg-[#141f33] px-3 py-3 text-white/55">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  type="search"
                  placeholder="Type to search"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
                  style={{ fontFamily: "var(--font-poppins)" }}
                />
              </label>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p
                    className="text-xs font-semibold tracking-[0.22em] text-[#2dd4bf] uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    In meeting
                  </p>
                  <span
                    className="text-xs text-white/40"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    {liveParticipants.length} online
                  </span>
                </div>
                <div className="space-y-1.5">
                  {liveParticipants.map((person) => (
                    <ParticipantRow key={person.name} person={person} />
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <p
                    className="text-xs font-semibold tracking-[0.22em] text-white/45 uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Invited people
                  </p>
                  <span
                    className="text-xs text-white/35"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    {invitedParticipants.length} pending
                  </span>
                </div>
                <div className="space-y-1.5">
                  {invitedParticipants.map((person) => (
                    <ParticipantRow key={person.name} person={person} />
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </motion.div>
  )
}

export default function MeetingPage() {
  const { data, loading, error } = useApi(() => meetingsApi.getAll())
  const [viewState, setViewState] = useState<ViewState>({ stage: "lobby" })
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)

  const upcoming = data?.data.upcoming?.length
    ? data.data.upcoming
    : demoUpcoming
  const past = data?.data.past?.length ? data.data.past : demoPast

  const prejoinMeeting =
    viewState.stage === "prejoin"
      ? (upcoming.find((meeting) => meeting.id === viewState.meetingId) ?? null)
      : null

  const callMeeting =
    viewState.stage === "call"
      ? (upcoming.find((meeting) => meeting.id === viewState.meetingId) ?? null)
      : null

  const liveParticipants = participants.filter(
    (person) => person.status !== "invited"
  )
  const invitedParticipants = participants.filter(
    (person) => person.status === "invited"
  )
  const filmstripPeople = [
    participants[5],
    participants[0],
    participants[9],
    participants[6],
    participants[1],
  ].filter(Boolean) as Participant[]

  const sourceLabel = error ? "Demo mode" : loading ? "Syncing..." : "Live data"
  const sourceTone = error ? "#f59e0b" : loading ? "#38bdf8" : "#2dd4bf"

  const openPrejoin = (meetingId: string) => {
    setViewState({ stage: "prejoin", meetingId })
  }

  const enterMeeting = () => {
    if (!prejoinMeeting) return
    setViewState({ stage: "call", meetingId: prejoinMeeting.id })
  }

  return (
    <div className="h-full bg-[radial-gradient(circle_at_top,_#ef7a33_0%,_#d76728_36%,_#541532_100%)] p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto h-full max-w-[1500px] rounded-[34px] border border-white/35 bg-[#0e1728] p-3 shadow-[0_45px_140px_rgba(15,23,42,0.5)] sm:p-4"
      >
        <AnimatePresence mode="wait">
          {callMeeting ? (
            <CallStage
              key={`call-${callMeeting.id}`}
              meeting={callMeeting}
              sourceLabel={sourceLabel}
              sourceTone={sourceTone}
              liveParticipants={liveParticipants}
              invitedParticipants={invitedParticipants}
              filmstripPeople={filmstripPeople}
              onLeave={() => setViewState({ stage: "lobby" })}
            />
          ) : prejoinMeeting ? (
            <PrejoinStage
              key={`prejoin-${prejoinMeeting.id}`}
              meeting={prejoinMeeting}
              micEnabled={micEnabled}
              cameraEnabled={cameraEnabled}
              onBack={() => setViewState({ stage: "lobby" })}
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
              onJoin={openPrejoin}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
