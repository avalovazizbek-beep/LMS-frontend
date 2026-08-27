import type { LucideIcon } from "lucide-react"
import { BookOpen, CalendarDays, Users2 } from "lucide-react"
import type { MeetingRecording } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"

function InfoPill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
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

export function RecordingCard({ recording }: { recording: MeetingRecording }) {
  const { t } = useLanguage()
  return (
    <div className="rounded-[8px] border border-[#d8e6f7] bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <InfoPill icon={BookOpen} label={recording.subjectName || t("meetingPage.subjectNotSpecified")} />
        <InfoPill icon={CalendarDays} label={recording.date} />
        <InfoPill
          icon={Users2}
          label={recording.groupIds.length ? `${t("meetingPage.groupLabel")} ${recording.groupIds.join(", ")}` : t("meetingPage.groupNotSpecified")}
        />
      </div>
      <p className="mt-2.5 text-sm font-semibold text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>
        {recording.title}
      </p>
      <video
        controls
        playsInline
        preload="metadata"
        className="mt-2.5 w-full rounded-[8px] bg-black"
        src={recording.fileUrl}
      />
    </div>
  )
}
