"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { BookOpen, CheckCircle2, ClipboardList, HelpCircle, Lock, Circle, Library, ExternalLink, Video, Play, Clapperboard, FolderOpen, ChevronRight, ChevronDown } from "lucide-react"
import { PageHero } from "@/components/layout/PageHero"
import { subjectVisual, tint } from "@/components/teaching/ExamBoardArt"
import { teachingApi, hemisApi, meetingsApi, NO_TRAINING_TYPE, type StudentTopic, type StudentTopicSectionWithLock, type LocalResource, type SubjectRecording } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { StudentContentCard } from "@/components/teaching/StudentContentCard"
import { LockedMediaPlayer } from "@/components/teaching/LockedMediaPlayer"
import { TheoryViewer } from "@/components/teaching/TheoryViewer"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

function getYoutubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]+)/i)
  return match ? `https://www.youtube.com/embed/${match[1]}` : null
}

function getToken() {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("lms_token") || ""
}

function MeetingRecordingsSection({ subjectName, topicTitle }: { subjectName: string; topicTitle?: string }) {
  const { t } = useLanguage()
  const { data } = useApi(() => meetingsApi.recordingsBySubject(subjectName), [subjectName])
  const all: SubjectRecording[] = data?.data ?? []
  // Deduplicate by id (same recording may appear multiple times)
  const seen = new Set<string | number>()
  const allUnique = all.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
  const items = topicTitle
    ? allUnique.filter(r => {
        const a = r.title.trim().toLowerCase()
        const b = topicTitle.trim().toLowerCase()
        return a === b || a.includes(b) || b.includes(a)
      })
    : allUnique
  if (!items.length) return null

  return (
    <div className="flex flex-col gap-3 mt-4">
      <div className="flex items-center gap-2">
        <Video className="w-4 h-4" style={{ color: "#0e58a8" }} />
        <h2 className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {t("fanResurslari.onlineRecordings")}
        </h2>
        <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {items.map(r => {
          const videoUrl = `${API_BASE}${r.fileUrl}?token=${getToken()}`
          return (
            <div key={r.id} className="bg-white rounded-[10px] overflow-hidden"
              style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
              <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.07)" }}>
                <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#eef4ff" }}>
                  <Play className="w-4 h-4" style={{ color: "#0e58a8" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{r.title}</div>
                  {r.groupNames?.length > 0 && (
                    <div className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{r.groupNames.join(", ")}</div>
                  )}
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full shrink-0" style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                  {t("fanResurslari.recording")}
                </span>
              </div>
              <div className="p-3">
                <video
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full rounded-[6px]"
                  style={{ maxHeight: 320, backgroundColor: "#000" }}
                  src={videoUrl}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const titleStyle = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const labelStyle = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

/* Mashg'ulot turlari — talaba fanni tanlagach shulardan birini tanlaydi,
   har biri o'z alohida mavzu ro'yxatiga ega (ma'ruza/amaliyot/mustaqil ish
   aralashib ko'rinmaydi). */
const TRAINING_TYPE_PICKS = [
  { value: "Ma'ruza", labelKey: "fanResurslariOq.trainingType.lecture", icon: BookOpen },
  { value: "Amaliyot", labelKey: "fanResurslariOq.trainingType.practice", icon: ClipboardList },
  { value: "Mustaqil ish", labelKey: "fanResurslariOq.trainingType.independentStudy", icon: Library },
] as const

/* ── Mashg'ulot turini tanlash ekrani (fan tanlangandan keyin) ────────── */
/* Fan ichidagi "Video yozuvlar" ko'rinishi — mavzu nomiga bog'lanmagan, shu
   fanning (talaba guruhi qatnashgan) barcha online dars yozuvlari */
const RECORDINGS_VIEW = "__recordings__"

function TrainingTypePicker({
  subjectName, buckets, recordingCount, onSelect, onBack,
}: {
  subjectName: string
  buckets: { trainingType: string | null; topicCount: number }[]
  recordingCount: number
  onSelect: (value: string) => void
  onBack: () => void
}) {
  const { t } = useLanguage()
  const countFor = (value: string | null) => buckets.find(b => b.trainingType === value)?.topicCount ?? 0
  const legacyCount = countFor(null)

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-[30px]" style={{ fontFamily: "var(--font-poppins)" }}>
      <PageHero icon={subjectVisual(subjectName).Icon} title={subjectName} subtitle={t("fanResurslari.pickTrainingType")} onBack={onBack} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TRAINING_TYPE_PICKS.filter(p => countFor(p.value) > 0).map(p => (
          <PickCard key={p.value} color={TYPE_COLORS[p.value]} Icon={p.icon} title={t(p.labelKey)}
            sub={t("fanResurslari.topicCount", { n: countFor(p.value) })} onClick={() => onSelect(p.value)} />
        ))}
        {legacyCount > 0 && (
          <PickCard color="#64748b" Icon={FolderOpen} title={t("fanResurslari.otherMaterials")}
            sub={t("fanResurslari.topicCount", { n: legacyCount })} onClick={() => onSelect(NO_TRAINING_TYPE)} />
        )}
        {recordingCount > 0 && (
          <PickCard color="#16a34a" Icon={Video} title={t("fanResurslari.videoRecordings")}
            sub={t("fanResurslari.videoRecordingsCount", { n: recordingCount })} onClick={() => onSelect(RECORDINGS_VIEW)} />
        )}
      </div>
    </div>
  )
}

const TYPE_COLORS: Record<string, string> = { "Ma'ruza": "#2563eb", "Amaliyot": "#0d9488", "Mustaqil ish": "#7c3aed" }

/** Mashg'ulot turi kartasi: rangli belgi, nom, mavzular soni */
function PickCard({ color, Icon, title, sub, onClick }: {
  color: string
  Icon: typeof BookOpen
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl p-5 text-left transition-transform hover:-translate-y-1"
      style={{ background: "var(--lms-cell)", border: "1px solid var(--lms-border)", boxShadow: "var(--lms-shadow)" }}>
      <svg viewBox="0 0 120 120" className="pointer-events-none absolute -right-6 -top-6 h-32 w-32" aria-hidden>
        <circle cx="60" cy="60" r="56" fill={color} opacity="0.09" />
        <circle cx="60" cy="60" r="34" fill={color} opacity="0.08" />
      </svg>
      <div className="relative flex items-center justify-between">
        <span className="flex h-13 w-13 items-center justify-center rounded-2xl p-3"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 8px 18px ${color}40` }}>
          <Icon className="h-6 w-6 text-white" />
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full transition-transform group-hover:translate-x-1"
          style={{ background: tint(color, 12) }}>
          <ChevronRight className="h-4 w-4" style={{ color }} />
        </span>
      </div>
      <div className="relative">
        <span className="block text-[17px] font-semibold" style={{ color: "var(--lms-primary)" }}>{title}</span>
        <span className="mt-0.5 block text-[13px]" style={{ color: "var(--lms-muted)" }}>{sub}</span>
      </div>
      <span className="relative h-1.5 w-full rounded-full" style={{ background: tint(color, 22) }}>
        <span className="block h-1.5 w-1/3 rounded-full transition-all group-hover:w-2/3" style={{ background: color }} />
      </span>
    </button>
  )
}

export default function FanResurslariDetail() {
  const { t } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const subjectName = decodeURIComponent(String(params.subject ?? ""))

  const { data: summaryData, loading: lSummary } = useApi(() => teachingApi.studentTopicSummary(subjectName), [subjectName])
  const buckets = summaryData?.data ?? []
  const hasTypedBuckets = buckets.some(b => b.trainingType !== null && b.topicCount > 0)

  // Shu fanning video yozuvlari (backend faqat talaba guruhi qatnashgan darslarnikini beradi)
  const { data: recRes } = useApi(() => meetingsApi.recordingsBySubject(subjectName), [subjectName])
  const recordingCount = new Set((recRes?.data ?? []).filter(r => r.fileUrl).map(r => String(r.id))).size

  // null = hali tanlanmagan (bo'lim tanlash ekrani ko'rsatiladi, agar turlar bo'lsa).
  // Turlar umuman yo'q bo'lsa (hammasi eski/tegsiz), avtomatik "hammasi" ko'rsatiladi.
  const [selectedType, setSelectedType] = useState<string | null>(null)
  useEffect(() => {
    if (!lSummary && !hasTypedBuckets) setSelectedType(NO_TRAINING_TYPE)
  }, [lSummary, hasTypedBuckets])

  const shouldFetchTopics = selectedType !== null && selectedType !== RECORDINGS_VIEW
  const { data, loading, error, refetch } = useApi(
    () => shouldFetchTopics ? teachingApi.studentTopics(subjectName, selectedType!) : Promise.resolve({ success: true, data: [] }),
    [subjectName, selectedType]
  )
  const topics: StudentTopic[] = useMemo(() => data?.data ?? [], [data])

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  // Ochilganda — hozirgi (birinchi tugallanmagan ochiq) mavzu; hammasi
  // tugagan bo'lsa — oxirgi ochiq mavzu
  useEffect(() => {
    if (selectedKey && topics.some(t => t.topicKey === selectedKey)) return
    const current = topics.find(t => !t.locked && !t.completed) ?? topics.filter(t => !t.locked).pop() ?? topics[0]
    setSelectedKey(current ? current.topicKey : null)
  }, [topics, selectedKey])

  const selected = useMemo(() => topics.find(t => t.topicKey === selectedKey) ?? null, [topics, selectedKey])

  // Mavzudagi yuklangan hamma narsa bajarilgan zahoti keyingi mavzuga
  // o'zi o'tadi (qo'shimcha tugmasiz). Natijani (masalan test bahosini)
  // ko'rib olish uchun qisqa kutish bilan.
  const completedBefore = useRef<Record<string, boolean>>({})
  const [advanceTo, setAdvanceTo] = useState<string | null>(null)
  useEffect(() => {
    const prev = completedBefore.current
    const idx = topics.findIndex(t => t.topicKey === selectedKey)
    const cur = idx >= 0 ? topics[idx] : null
    const next = idx >= 0 ? topics[idx + 1] : undefined
    if (cur && prev[cur.topicKey] === false && cur.completed && next && !next.locked) {
      setAdvanceTo(next.topicKey)
    }
    completedBefore.current = Object.fromEntries(topics.map(t => [t.topicKey, t.completed]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics])
  useEffect(() => {
    if (!advanceTo) return
    const timer = setTimeout(() => {
      setSelectedKey(advanceTo)
      setAdvanceTo(null)
      topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" })
    }, 2500)
    return () => clearTimeout(timer)
  }, [advanceTo])

  function selectTopic(key: string) {
    setAdvanceTo(null)
    setSelectedKey(key)
  }

  if (lSummary) return <Loading />

  if (hasTypedBuckets && selectedType === null) {
    return <TrainingTypePicker subjectName={subjectName} buckets={buckets} recordingCount={recordingCount}
      onSelect={setSelectedType} onBack={() => router.back()} />
  }

  const backToPicker = () => { setSelectedType(hasTypedBuckets ? null : NO_TRAINING_TYPE); setSelectedKey(null); setAdvanceTo(null) }

  // ── Video yozuvlar (fan bo'yicha, mavzuga bog'lanmagan) ──
  if (selectedType === RECORDINGS_VIEW) {
    return (
      <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-[30px]" style={{ fontFamily: "var(--font-poppins)" }}>
        <PageHero icon={subjectVisual(subjectName).Icon} title={subjectName} subtitle={t("fanResurslari.videoRecordingsHint")} onBack={backToPicker}
          badge={<TypeBadge color="#16a34a">{t("fanResurslari.videoRecordings")}</TypeBadge>} />
        <MeetingRecordingsSection subjectName={subjectName} topicTitle={undefined} />
      </div>
    )
  }

  // Qayta yuklanayotganda (progress saqlangach) sahifa "sakramasin" — eski ma'lumot ko'rinib turadi
  if (loading && !data) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  const typePick = TRAINING_TYPE_PICKS.find(p => p.value === selectedType)
  const typeColor = typePick ? TYPE_COLORS[typePick.value] : "#2563eb"
  const doneCount = topics.filter(tp => tp.completed).length
  const donePct = topics.length ? Math.round((doneCount / topics.length) * 100) : 0
  const selectedIndex = selected ? topics.findIndex(tp => tp.topicKey === selected.topicKey) : -1

  return (
    <div ref={topRef} className="flex flex-col gap-5 p-4 sm:p-6 lg:p-[30px]" style={{ fontFamily: "var(--font-poppins)" }}>
      <PageHero icon={subjectVisual(subjectName).Icon} title={subjectName}
        onBack={hasTypedBuckets ? backToPicker : () => router.back()}
        badge={typePick ? <TypeBadge color={typeColor}>{t(typePick.labelKey)}</TypeBadge> : undefined}
        subtitle={topics.length === 0 ? t("fanResurslari.topicCount", { n: 0 }) : (
          <div className="flex flex-col gap-1.5">
            <span>{t("fanResurslari.progress", { done: doneCount, total: topics.length })}</span>
            <span className="block h-2 w-full max-w-[340px] overflow-hidden rounded-full" style={{ background: tint("#16a34a", 16) }}>
              <span className="block h-2 rounded-full transition-all" style={{ width: `${donePct}%`, background: "linear-gradient(90deg, #22c55e, #16a34a)" }} />
            </span>
          </div>
        )}>
        {recordingCount > 0 && (
          <button onClick={() => { setSelectedType(RECORDINGS_VIEW); setAdvanceTo(null) }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"
            style={{ background: tint("#16a34a", 10), color: "#15803d", border: `1px solid ${tint("#16a34a", 30)}` }}>
            <Video className="h-3.5 w-3.5" /> {t("fanResurslari.videoRecordingsCount", { n: recordingCount })}
          </button>
        )}
      </PageHero>

      {topics.length === 0 ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl p-14 text-center" style={{ background: "var(--lms-cell)", border: "1px solid var(--lms-border)" }}>
            <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--lms-muted)" }} />
            <p className="text-sm font-medium" style={titleStyle}>
              {t("fanResurslari.notFound")}
            </p>
            <p className="text-xs mt-1" style={labelStyle}>
              {t("fanResurslari.noTopicsYet")}
            </p>
          </div>
          <MeetingRecordingsSection subjectName={subjectName} topicTitle={undefined} />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {advanceTo && (
              <div className="flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold"
                style={{ background: tint("#16a34a", 10), color: "#15803d", border: `1px solid ${tint("#16a34a", 30)}` }}>
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {t("fanResurslari.autoNext")}
              </div>
            )}
            {selected ? (
              // key — har mavzuda bo'limlar qaytadan ochiladi (birinchi bajarilmagani o'zi ochiq)
              <TopicContent key={selected.topicKey} topic={selected} index={selectedIndex} onProgress={refetch} />
            ) : (
              <div className="rounded-2xl p-14 text-center" style={{ background: "var(--lms-cell)", border: "1px solid var(--lms-border)" }}>
                <Lock className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--lms-muted)" }} />
                <p className="text-sm font-medium" style={titleStyle}>{t("fanResurslari.topicLocked")}</p>
              </div>
            )}
            <MeetingRecordingsSection subjectName={subjectName} topicTitle={selected?.title} />
          </div>

          {/* Mavzular ro'yxati */}
          <div className="shrink-0 overflow-hidden rounded-2xl lg:sticky lg:top-4 lg:w-[320px] lg:self-start"
            style={{ background: "var(--lms-cell)", border: "1px solid var(--lms-border)", boxShadow: "var(--lms-shadow)" }}>
            <div className="flex items-center justify-between gap-2 px-4 py-3.5" style={{ borderBottom: "1px solid var(--lms-border)" }}>
              <h2 className="text-[15px] font-semibold" style={{ color: "var(--lms-primary)" }}>{t("fanResurslari.topicsHeading")}</h2>
              <span className="rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: tint("#16a34a", 12), color: "#15803d" }}>
                {doneCount} / {topics.length}
              </span>
            </div>
            <div className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto p-2">
              {topics.map((topic, idx) => {
                const isActive = topic.topicKey === selectedKey
                const circle = topic.completed ? "#16a34a" : topic.locked ? "#94a3b8" : typeColor
                return (
                  <button
                    key={topic.topicKey}
                    onClick={() => !topic.locked && selectTopic(topic.topicKey)}
                    disabled={topic.locked}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed"
                    style={{
                      background: isActive ? tint(typeColor, 10) : "transparent",
                      boxShadow: isActive ? `inset 3px 0 0 ${typeColor}` : undefined,
                      opacity: topic.locked ? 0.55 : 1,
                    }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={topic.completed || isActive
                        ? { background: circle, color: "#fff" }
                        : { background: tint(circle, 12), color: circle }}>
                      {topic.locked ? <Lock className="h-3.5 w-3.5" /> : topic.completed ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[13px] font-medium leading-snug" style={{ color: isActive ? typeColor : "var(--lms-primary)" }}>
                        {topic.title}
                      </span>
                      {isActive && !topic.completed && (
                        <span className="text-[11px] font-semibold" style={{ color: typeColor }}>{t("fanResurslari.current")}</span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TypeBadge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: tint(color, 12), color }}>
      {children}
    </span>
  )
}

function QollanmaSection({
  qollanma, onProgress,
}: {
  qollanma: StudentTopicSectionWithLock
  onProgress: () => void
}) {
  const { t } = useLanguage()
  const [marked, setMarked] = useState(!!qollanma.progress?.completed)

  useEffect(() => { setMarked(!!qollanma.progress?.completed) }, [qollanma.progress?.completed])

  async function handleDownload() {
    if (marked) return
    try {
      await teachingApi.markProgress(qollanma.id, true)
      setMarked(true)
      onProgress()
    } catch {
      // silent — file download still proceeds
    }
  }

  return (
    <div className="rounded-[10px] p-4 flex flex-col gap-3" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
      <div className="flex items-center gap-2">
        <Library className="w-4 h-4" style={{ color: "#0e58a8" }} />
        <span className="text-sm font-semibold" style={titleStyle}>{t("fanResurslari.guide")}</span>
        {marked && <CheckCircle2 className="w-4 h-4 ml-auto" style={{ color: "#22c55e" }} />}
      </div>

      {qollanma.file && (
        <a
          href={teachingApi.fileUrl(qollanma.file.url)}
          target="_blank"
          rel="noreferrer"
          onClick={handleDownload}
          className="flex items-center gap-2 w-fit px-3 py-2 rounded-[6px] text-sm font-medium transition-colors hover:bg-[#e8f0fb]"
          style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <ExternalLink className="w-4 h-4" />
          {qollanma.file.originalName}
        </a>
      )}

      {marked ? (
        <p className="text-xs font-medium" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>
          {t("fanResurslari.guideDownloaded")}
        </p>
      ) : (
        <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("fanResurslari.guideDownloadPrompt")}
        </p>
      )}
    </div>
  )
}

/* ── Accordion section wrapper ─────────────────────────────────────── */
function SectionAccordion({
  id, title, icon, locked, completed, defaultOpen, children,
}: {
  id: string
  title: string
  icon: React.ReactNode
  locked: boolean
  completed: boolean
  defaultOpen: boolean
  children: React.ReactNode
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(defaultOpen && !locked)
  // Oldingi bo'lim tugab, navbat shu bo'limga kelganda — o'zi ochiladi
  useEffect(() => {
    if (defaultOpen && !locked) setOpen(true)
  }, [defaultOpen, locked])

  const accent = locked ? "#94a3b8" : completed ? "#16a34a" : "#2563eb"
  const active = open && !locked

  return (
    <div className="overflow-hidden rounded-2xl transition-shadow"
      style={{
        background: "var(--lms-cell)",
        border: `1px solid ${active ? tint("#2563eb", 30) : completed ? tint("#16a34a", 28) : "var(--lms-border)"}`,
        boxShadow: active ? "var(--lms-shadow)" : undefined,
      }}>
      <button
        onClick={() => !locked && setOpen(o => !o)}
        disabled={locked}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"
        style={{ background: active ? tint("#2563eb", 5) : "transparent", cursor: locked ? "default" : "pointer" }}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: tint(accent, 12) }}>
          {icon}
        </span>
        <span className="flex-1 text-[14px] font-semibold"
          style={{ color: locked ? "var(--lms-muted)" : "var(--lms-primary)", fontFamily: "var(--font-poppins)" }}>
          {title}
        </span>
        {locked && (
          <span className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: tint("#94a3b8", 14), color: "#64748b" }}>
            <Lock className="h-3 w-3" /> {t("fanResurslari.locked")}
          </span>
        )}
        {!locked && completed && (
          <span className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: tint("#16a34a", 12), color: "#15803d" }}>
            <CheckCircle2 className="h-3 w-3" /> {t("fanResurslari.done")}
          </span>
        )}
        {!locked && (
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "var(--lms-muted)" }} />
        )}
      </button>
      {active && (
        <div className="p-4" style={{ borderTop: "1px solid var(--lms-border)" }}>
          {children}
        </div>
      )}
    </div>
  )
}

function TopicContent({ topic, index, onProgress }: { topic: StudentTopic; index: number; onProgress: () => void }) {
  const { t } = useLanguage()
  const { video, audio, theory, qollanma, test, assignment, youtube } = topic.sections
  // Topshiriq yuklangani yetarli — baholanishini kutmasdan keyingi mavzu ochiladi
  const assignmentDone = !!assignment?.submission

  // First unlocked + incomplete section is opened by default; falls back to first existing section
  function pickFirstOpen() {
    const seq: Array<[string, { sectionLocked?: boolean; progress?: { completed?: boolean } | null; submission?: unknown } | null | undefined]> = [
      ["video", video],
      ["audio", audio],
      ["theory", theory],
      ["qollanma", qollanma],
      ["test", test],
      ["assignment", assignment],
    ]
    // Prefer first unlocked and not-yet-completed
    for (const [id, sec] of seq) {
      const done = id === "assignment" ? assignmentDone : !!sec?.progress?.completed || !!(sec && "submission" in sec && sec.submission)
      if (sec && !sec.sectionLocked && !done) return id
    }
    // Fallback: first existing section
    for (const [id, sec] of seq) { if (sec) return id }
    return "video"
  }
  const firstOpen = pickFirstOpen()

  const hasAny = !!(video || audio || theory || qollanma || test || assignment || youtube)

  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl p-4 sm:p-5"
        style={{ background: `linear-gradient(105deg, var(--lms-cell) 0%, ${tint("#2563eb", 7)} 100%)`, border: "1px solid var(--lms-border)", boxShadow: "var(--lms-shadow)" }}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold text-white"
          style={{ background: topic.completed ? "linear-gradient(135deg, #22c55e, #15803d)" : "linear-gradient(135deg, #2563eb, #1e3a8a)" }}>
          {topic.completed ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          {index >= 0 && (
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#2563eb" }}>
              {t("fanResurslari.topicN", { n: index + 1 })}
            </span>
          )}
          <h2 className="text-[16px] font-semibold leading-snug sm:text-[17px]" style={{ color: "var(--lms-primary)" }}>{topic.title}</h2>
        </div>
        {topic.completed && (
          <span className="hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold sm:flex"
            style={{ background: tint("#16a34a", 12), color: "#15803d" }}>
            <CheckCircle2 className="h-3.5 w-3.5" /> {t("fanResurslari.done")}
          </span>
        )}
      </div>

      {!hasAny && (
        <div className="rounded-2xl p-14 text-center" style={{ background: "var(--lms-cell)", border: "1px solid var(--lms-border)" }}>
          <Circle className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
          <p className="text-sm" style={labelStyle}>{t("fanResurslari.noResourcesYet")}</p>
        </div>
      )}

      {video && video.file && (
        <SectionAccordion
          id="video"
          title={t("fanResurslari.video")}
          icon={<Video className="w-4 h-4" style={{ color: video.sectionLocked ? "#94a3b8" : "#0e58a8" }} />}
          locked={!!video.sectionLocked}
          completed={!!video.progress?.completed}
          defaultOpen={firstOpen === "video"}>
          <LockedMediaPlayer
            contentId={video.id}
            src={teachingApi.fileUrl(video.file.url)}
            kind="video"
            title={t("fanResurslari.video")}
            initialProgress={video.progress}
            onCompleted={onProgress}
          />
        </SectionAccordion>
      )}

      {youtube && youtube.meetingLink && (
        <SectionAccordion
          id="youtube"
          title={t("fanResurslari.youtubeExtra")}
          icon={<Clapperboard className="w-4 h-4" style={{ color: "#0e58a8" }} />}
          locked={false}
          completed={false}
          defaultOpen={false}>
          <div className="aspect-video w-full rounded-[8px] overflow-hidden bg-black">
            {getYoutubeEmbedUrl(youtube.meetingLink) ? (
              <iframe
                src={getYoutubeEmbedUrl(youtube.meetingLink)!}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <a href={youtube.meetingLink} target="_blank" rel="noreferrer"
                className="flex items-center justify-center w-full h-full text-sm" style={{ color: "#fff" }}>
                {t("fanResurslari.openVideo")}
              </a>
            )}
          </div>
        </SectionAccordion>
      )}

      {audio && audio.file && (
        <SectionAccordion
          id="audio"
          title={t("fanResurslari.audio")}
          icon={<Play className="w-4 h-4" style={{ color: audio.sectionLocked ? "#94a3b8" : "#0e58a8" }} />}
          locked={!!audio.sectionLocked}
          completed={!!audio.progress?.completed}
          defaultOpen={firstOpen === "audio"}>
          <LockedMediaPlayer
            contentId={audio.id}
            src={teachingApi.fileUrl(audio.file.url)}
            kind="audio"
            title={t("fanResurslari.audio")}
            initialProgress={audio.progress}
            onCompleted={onProgress}
          />
        </SectionAccordion>
      )}

      {theory && theory.file && (
        <SectionAccordion
          id="theory"
          title={t("fanResurslari.presentation")}
          icon={<BookOpen className="w-4 h-4" style={{ color: theory.sectionLocked ? "#94a3b8" : "#0e58a8" }} />}
          locked={!!theory.sectionLocked}
          completed={!!theory.progress?.completed}
          defaultOpen={firstOpen === "theory"}>
          <TheoryViewer
            contentId={theory.id}
            file={theory.file}
            title={t("fanResurslari.presentation")}
            initialProgress={theory.progress}
            onCompleted={onProgress}
          />
        </SectionAccordion>
      )}

      {qollanma && qollanma.file && (
        <SectionAccordion
          id="qollanma"
          title={t("fanResurslari.guide")}
          icon={<Library className="w-4 h-4" style={{ color: qollanma.sectionLocked ? "#94a3b8" : "#0e58a8" }} />}
          locked={!!qollanma.sectionLocked}
          completed={!!qollanma.progress?.completed}
          defaultOpen={firstOpen === "qollanma"}>
          <QollanmaSection qollanma={qollanma} onProgress={onProgress} />
        </SectionAccordion>
      )}

      {test && (
        <SectionAccordion
          id="test"
          title={`${t("fanResurslari.test")}${test.submission?.grade != null && test.maxScore ? ` · ${t("fanResurslari.scoreOf", { grade: test.submission.grade, max: test.maxScore })}` : test.submission?.grade != null ? ` · ${t("fanResurslari.score", { grade: test.submission.grade })}` : ""}`}
          icon={<HelpCircle className="w-4 h-4" style={{ color: test.sectionLocked ? "#94a3b8" : "#0e58a8" }} />}
          locked={!!test.sectionLocked}
          completed={test.submission?.grade != null}
          defaultOpen={firstOpen === "test"}>
          <StudentContentCard item={test} submittable />
        </SectionAccordion>
      )}

      {assignment && (
        <SectionAccordion
          id="assignment"
          title={t("fanResurslari.assignment")}
          icon={<ClipboardList className="w-4 h-4" style={{ color: assignment.sectionLocked ? "#94a3b8" : "#0e58a8" }} />}
          locked={!!assignment.sectionLocked}
          completed={assignmentDone}
          defaultOpen={firstOpen === "assignment"}>
          <StudentContentCard item={assignment} submittable />
        </SectionAccordion>
      )}
    </>
  )
}
