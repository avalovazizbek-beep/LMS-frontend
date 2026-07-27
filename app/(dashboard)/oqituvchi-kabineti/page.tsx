"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Users, RefreshCw, CalendarDays, BookOpen, ClipboardList, GraduationCap, Loader2,
} from "lucide-react"
import { teachingApi, type TeacherGroup, type TeacherScheduleItem } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { useLanguage } from "@/lib/i18n/LanguageContext"

export default function OqituvchiKabineti() {
  const { t } = useLanguage()
  const sections = [
    { type: "darslar",      label: t("oqKabineti.myLessons"),     description: t("oqKabineti.myLessonsDesc"),     Icon: BookOpen,      color: "#0e58a8" },
    { type: "topshiriqlar", label: t("oqKabineti.myAssignments"), description: t("oqKabineti.myAssignmentsDesc"), Icon: ClipboardList, color: "#f59e0b" },
    { type: "imtihonlar",   label: t("oqKabineti.myExams"),       description: t("oqKabineti.myExamsDesc"),       Icon: GraduationCap, color: "#7c3aed" },
  ] as const
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const { data: groupsRes, loading: groupsLoading, error: groupsError, refetch: refetchGroups } =
    useApi(() => teachingApi.groups(), [])
  const { data: scheduleRes, loading: scheduleLoading, error: scheduleError, refetch: refetchSchedule } =
    useApi(() => teachingApi.schedule(), [])

  const groups: TeacherGroup[] = groupsRes?.data ?? []
  const schedule: TeacherScheduleItem[] = scheduleRes?.data ?? []

  async function handleSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      await teachingApi.sync()
      setSyncMsg(t("oqKabineti.syncSuccess"))
      await Promise.all([refetchGroups(), refetchSchedule()])
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : t("oqKabineti.syncError"))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {t("oqKabineti.title")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("oqKabineti.subtitle")}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium transition-colors disabled:opacity-60"
          style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {t("oqKabineti.syncFromHemis")}
        </button>
      </div>

      {syncMsg && (
        <div className="text-sm px-4 py-2.5 rounded-[8px]"
          style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          {syncMsg}
        </div>
      )}

      {/* Content type shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sections.map(s => (
          <Link
            key={s.type}
            href={`/oqituvchi-kabineti/${s.type}`}
            className="group flex flex-col gap-3 p-5 rounded-[12px] bg-white transition-all hover:-translate-y-0.5"
            style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 2px 8px rgba(1,41,112,0.06)" }}
          >
            <div className="w-11 h-11 rounded-[10px] flex items-center justify-center"
              style={{ backgroundColor: "#f6f9ff" }}>
              <s.Icon className="w-5 h-5 transition-transform group-hover:scale-110" style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {s.label}
              </div>
              <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {s.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Groups */}
      <div className="bg-white rounded-[12px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5" style={{ color: "#0e58a8" }} />
          <h2 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {t("oqKabineti.myGroups")}
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {groups.length}
          </span>
        </div>

        {groupsLoading ? <Loading /> : groupsError ? <ApiError message={groupsError} onRetry={refetchGroups} /> : groups.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("oqKabineti.groupsNotFound")}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {groups.map(g => (
              <div key={g.id} className="flex flex-col gap-1 p-3 rounded-[8px]" style={{ backgroundColor: "#f6f9ff" }}>
                <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.name}</span>
                <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {[g.direction, g.course ? t("oqKabineti.courseSuffix", { n: g.course }) : null].filter(Boolean).join(" • ") || `ID: ${g.id}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-[12px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5" style={{ color: "#0e58a8" }} />
          <h2 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {t("oqKabineti.mySchedule")}
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {schedule.length}
          </span>
        </div>

        {scheduleLoading ? <Loading /> : scheduleError ? <ApiError message={scheduleError} onRetry={refetchSchedule} /> : schedule.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("oqKabineti.scheduleNotFound")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "var(--font-poppins)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                  {[t("oqKabineti.col.date"), t("oqKabineti.col.day"), t("oqKabineti.col.time"), t("oqKabineti.col.subject"), t("oqKabineti.col.group"), t("oqKabineti.col.room")].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: "#7293b9" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedule.map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid rgba(1,41,112,0.05)" }}>
                    <td className="py-2 px-3" style={{ color: "#012970" }}>{item.lessonDate ?? "—"}</td>
                    <td className="py-2 px-3" style={{ color: "#012970" }}>{item.weekDay ?? "—"}</td>
                    <td className="py-2 px-3" style={{ color: "#012970" }}>
                      {item.startTime && item.endTime ? `${item.startTime} – ${item.endTime}` : "—"}
                    </td>
                    <td className="py-2 px-3" style={{ color: "#012970" }}>{item.subjectName}</td>
                    <td className="py-2 px-3" style={{ color: "#012970" }}>
                      {groups.find(g => g.id === item.groupId)?.name ?? (item.groupId ?? "—")}
                    </td>
                    <td className="py-2 px-3" style={{ color: "#012970" }}>{item.room ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
