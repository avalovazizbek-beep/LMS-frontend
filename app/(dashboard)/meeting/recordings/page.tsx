"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { meetingsApi } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { RecordingCard } from "@/components/meeting/RecordingCard"

function readRole(): string {
  try {
    const token = sessionStorage.getItem("lms_token") ?? ""
    const part = token.split(".")[1]
    if (!part) return ""
    const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")))
    return typeof payload.role === "string" ? payload.role : ""
  } catch {
    return ""
  }
}

export default function AllRecordingsPage() {
  const { t } = useLanguage()
  const [isTeacher, setIsTeacher] = useState<boolean | null>(null)
  useEffect(() => setIsTeacher(readRole() === "employee"), [])

  const { data, loading, error, refetch } = useApi(() => meetingsApi.myRecordings())
  const seen = new Set<string>()
  const recordings = (data?.data ?? []).filter(r => {
    const key = String(r.id ?? r.fileUrl ?? r.title)
    if (seen.has(key)) return false
    seen.add(key); return true
  })

  if (isTeacher === false) {
    return (
      <div className="p-[30px]">
        <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("common.noAccess")}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div className="flex items-center gap-3">
        <Link href="/meeting"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#d8e6f7] bg-white text-[#104475] hover:bg-[#f6f9ff]"
          aria-label={t("common.back")}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {t("meetingPage.allRecordingsTitle")}
        </h1>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ApiError message={error} onRetry={refetch} />
      ) : recordings.length ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {recordings.map((recording) => <RecordingCard key={recording.id} recording={recording} />)}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("meetingPage.none")}
        </p>
      )}
    </div>
  )
}
