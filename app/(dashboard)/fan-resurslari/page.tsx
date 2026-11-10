"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { BookOpen, Video, Library, Layers, Search, X, ArrowRight, ClipboardList } from "lucide-react"
import { teachingApi, meetingsApi, type TeacherContent, type MeetingRecording } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { PageHero } from "@/components/layout/PageHero"
import { subjectVisual, tint } from "@/components/teaching/ExamBoardArt"

const TEXT = "var(--lms-primary)"
const MUTED = "var(--lms-muted)"
const CELL = "var(--lms-cell)"
const BORDER = "var(--lms-border)"

interface SubjectStat {
  name: string
  topicCount: number
  lecture: number
  practice: number
  recordingCount: number
}

export default function FanResurslari() {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useApi(() => teachingApi.content({}), [])
  const { data: recData } = useApi(() => meetingsApi.myRecordings(), [])
  const [search, setSearch] = useState("")

  const items: TeacherContent[] = useMemo(() => data?.data ?? [], [data])
  const recordings: MeetingRecording[] = useMemo(() => recData?.data ?? [], [recData])

  const subjects = useMemo((): SubjectStat[] => {
    const map: Record<string, { topics: Set<string>; lecture: Set<string>; practice: Set<string>; recs: Set<string> }> = {}
    const entry = (name: string) => (map[name] ??= { topics: new Set(), lecture: new Set(), practice: new Set(), recs: new Set() })

    // Fan mavzulari (o'qituvchi yuklagan kontent)
    items.forEach(item => {
      if (!item.topicKey) return
      const e = entry(item.subjectName || t("fanResurslari.other"))
      e.topics.add(item.topicKey)
      if (/ma.ruza/i.test(item.trainingType ?? "")) e.lecture.add(item.topicKey)
      else if (/amaliy/i.test(item.trainingType ?? "")) e.practice.add(item.topicKey)
    })

    // Online dars video yozuvlari — backend faqat talabaning O'Z guruhi
    // qatnashgan darslarinikini qaytaradi (canViewMeeting)
    recordings.forEach(r => {
      const e = entry(r.subjectName || t("fanResurslari.other"))
      if (r.fileUrl) e.recs.add(String(r.id))
    })

    return Object.entries(map)
      .map(([name, e]) => ({ name, topicCount: e.topics.size, lecture: e.lecture.size, practice: e.practice.size, recordingCount: e.recs.size }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [items, recordings, t])

  const q = search.trim().toLowerCase()
  const visible = q ? subjects.filter(s => s.name.toLowerCase().includes(q)) : subjects
  const totals = {
    subjects: subjects.length,
    topics: subjects.reduce((n, s) => n + s.topicCount, 0),
    videos: subjects.reduce((n, s) => n + s.recordingCount, 0),
  }

  if (loading && !data) return <Loading />
  if (error && !data) return <ApiError message={error} onRetry={refetch} />

  const stats = [
    { key: "subjects", value: totals.subjects, color: "#2563eb", Icon: Library, label: t("fanResurslari.statSubjects"), hint: t("fanResurslari.statSubjectsHint") },
    { key: "topics", value: totals.topics, color: "#0d9488", Icon: Layers, label: t("fanResurslari.statTopics"), hint: t("fanResurslari.statTopicsHint") },
    { key: "videos", value: totals.videos, color: "#7c3aed", Icon: Video, label: t("fanResurslari.statVideos"), hint: t("fanResurslari.statVideosHint") },
  ]

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-[30px]" style={{ fontFamily: "var(--font-poppins)" }}>
      <PageHero icon={Library} title={t("fanResurslari.title")} subtitle={t("fanResurslari.subtitle")} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div key={s.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 rounded-2xl p-4"
            style={{ background: tint(s.color, 8), border: `1px solid ${tint(s.color, 26)}` }}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: s.color, boxShadow: `0 6px 14px ${s.color}40` }}>
              <s.Icon className="h-5 w-5 text-white" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold" style={{ color: TEXT }}>{s.label}</span>
              <span className="block text-[28px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</span>
              <span className="block truncate text-[12px]" style={{ color: MUTED }}>{s.hint}</span>
            </span>
          </motion.div>
        ))}
      </div>

      {subjects.length > 0 && (
        <label className="flex h-11 w-full items-center gap-2 rounded-xl px-3 sm:max-w-[420px]"
          style={{ background: CELL, border: `1px solid ${BORDER}`, boxShadow: "var(--lms-shadow)" }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: MUTED }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("fanResurslari.searchPh")}
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" style={{ color: TEXT }} />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="×">
              <X className="h-4 w-4" style={{ color: MUTED }} />
            </button>
          )}
        </label>
      )}

      {subjects.length === 0 || visible.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: CELL, border: `1px solid ${BORDER}` }}>
          <BookOpen className="mx-auto mb-3 h-10 w-10" style={{ color: MUTED }} />
          <p className="text-sm" style={{ color: MUTED }}>
            {subjects.length === 0 ? t("fanResurslari.empty") : t("fanResurslari.noMatch")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visible.map((subject, i) => {
            const { Icon, color } = subjectVisual(subject.name)
            return (
              <motion.div key={subject.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
                <Link href={`/fan-resurslari/${encodeURIComponent(subject.name)}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl transition-transform hover:-translate-y-1"
                  style={{ background: CELL, border: `1px solid ${BORDER}`, boxShadow: "var(--lms-shadow)" }}>
                  {/* Rangli sarlavha qismi */}
                  <div className="relative h-[92px] overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${tint(color, 22)} 0%, ${tint(color, 7)} 100%)` }}>
                    <svg viewBox="0 0 300 92" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
                      <circle cx="262" cy="10" r="46" fill={color} opacity="0.12" />
                      <circle cx="292" cy="78" r="30" fill={color} opacity="0.10" />
                      <circle cx="200" cy="70" r="6" fill={color} opacity="0.25" />
                      <path d="M150 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill={color} opacity="0.35" />
                    </svg>
                    <div className="absolute bottom-[-18px] left-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
                      style={{ background: CELL, boxShadow: `0 8px 20px ${color}33`, border: `1px solid ${color}22` }}>
                      <Icon className="h-7 w-7" style={{ color }} />
                    </div>
                    {subject.recordingCount > 0 && (
                      <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold"
                        style={{ background: CELL, color: "#15803d" }}>
                        <Video className="h-3 w-3" /> {subject.recordingCount}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-7">
                    <span className="line-clamp-2 min-h-[2.6em] text-[15px] font-semibold leading-snug" style={{ color: TEXT }}>
                      {subject.name}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {subject.topicCount > 0 ? (
                        <>
                          <Chip color={color} Icon={Layers}>{t("fanResurslari.topicCount", { n: subject.topicCount })}</Chip>
                          {subject.lecture > 0 && <Chip color="#2563eb" Icon={BookOpen}>{t("fanResurslariOq.trainingType.lecture")} · {subject.lecture}</Chip>}
                          {subject.practice > 0 && <Chip color="#0d9488" Icon={ClipboardList}>{t("fanResurslariOq.trainingType.practice")} · {subject.practice}</Chip>}
                        </>
                      ) : (
                        <Chip color="#15803d" Icon={Video}>{t("fanResurslari.onlyRecordings")}</Chip>
                      )}
                    </div>
                    <span className="mt-auto flex items-center justify-between border-t pt-3 text-[13px] font-semibold"
                      style={{ borderColor: BORDER, color }}>
                      {t("fanResurslari.open")}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Chip({ color, Icon, children }: { color: string; Icon: typeof Video; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold"
      style={{ background: tint(color, 10), color }}>
      <Icon className="h-3 w-3" /> {children}
    </span>
  )
}
