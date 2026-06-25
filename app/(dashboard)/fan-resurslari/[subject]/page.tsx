"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, CheckCircle2, ClipboardList, HelpCircle, Lock, Circle, Library, ExternalLink, Video, Play } from "lucide-react"
import { teachingApi, hemisApi, meetingsApi, type StudentTopic, type StudentTopicSectionWithLock, type LocalResource, type SubjectRecording } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { StudentContentCard } from "@/components/teaching/StudentContentCard"
import { LockedMediaPlayer } from "@/components/teaching/LockedMediaPlayer"
import { TheoryViewer } from "@/components/teaching/TheoryViewer"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

function getToken() {
  if (typeof window === "undefined") return ""
  return sessionStorage.getItem("lms_token") || ""
}

function MeetingRecordingsSection({ subjectName, topicTitle }: { subjectName: string; topicTitle?: string }) {
  const { data } = useApi(() => meetingsApi.recordingsBySubject(subjectName), [subjectName])
  const all: SubjectRecording[] = data?.data ?? []
  // Deduplicate by id (same recording may appear multiple times)
  const seen = new Set<number>()
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
          Online dars yozuvlari
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
                  Yozuv
                </span>
              </div>
              <div className="p-3">
                <video
                  controls
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

export default function FanResurslariDetail() {
  const params = useParams()
  const router = useRouter()
  const subjectName = decodeURIComponent(String(params.subject ?? ""))

  const { data, loading, error, refetch } = useApi(() => teachingApi.studentTopics(subjectName), [subjectName])
  const topics: StudentTopic[] = data?.data ?? []

  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  useEffect(() => {
    if (selectedKey && topics.some(t => t.topicKey === selectedKey)) return
    const firstOpen = topics.find(t => !t.locked) ?? topics[0]
    setSelectedKey(firstOpen ? firstOpen.topicKey : null)
  }, [topics, selectedKey])

  const selected = useMemo(() => topics.find(t => t.topicKey === selectedKey) ?? null, [topics, selectedKey])

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-[8px] transition-colors hover:bg-[#f0f5ff] shrink-0 mt-1"
          style={{ border: "1px solid rgba(1,41,112,0.15)" }}>
          <ArrowLeft className="w-4 h-4" style={{ color: "#0e58a8" }} />
        </button>
        <div>
          <h1 className="text-[24px] font-semibold leading-snug" style={titleStyle}>
            {subjectName}
          </h1>
          <p className="text-sm mt-0.5" style={labelStyle}>
            {topics.length} ta mavzu
          </p>
        </div>
      </div>

      {topics.length === 0 ? (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-[10px] p-14 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
            <p className="text-sm font-medium" style={titleStyle}>
              Resurslar topilmadi
            </p>
            <p className="text-xs mt-1" style={labelStyle}>
              Bu fan uchun hozircha mavzular yuklanmagan
            </p>
          </div>
          <MeetingRecordingsSection subjectName={subjectName} topicTitle={undefined} />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {selected ? (
              <TopicContent topic={selected} onProgress={refetch} />
            ) : (
              <div className="bg-white rounded-[10px] p-14 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
                <Lock className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
                <p className="text-sm font-medium" style={titleStyle}>Mavzu qulflangan</p>
              </div>
            )}
            <MeetingRecordingsSection subjectName={subjectName} topicTitle={selected?.title} />
          </div>

          <div className="lg:w-[300px] shrink-0 bg-white rounded-[10px]"
            style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
              <h2 className="text-sm font-semibold" style={titleStyle}>Mavzular</h2>
            </div>
            <div className="flex flex-col">
              {topics.map((topic, idx) => {
                const isActive = topic.topicKey === selectedKey
                return (
                  <button
                    key={topic.topicKey}
                    onClick={() => !topic.locked && setSelectedKey(topic.topicKey)}
                    disabled={topic.locked}
                    className="flex items-center gap-3 px-4 py-3 text-left transition-colors disabled:cursor-not-allowed"
                    style={{
                      borderBottom: "1px solid rgba(1,41,112,0.06)",
                      backgroundColor: isActive ? "#f6f9ff" : "transparent",
                      opacity: topic.locked ? 0.55 : 1,
                    }}
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-xs font-semibold"
                      style={{
                        backgroundColor: topic.completed ? "#f0fdf4" : topic.locked ? "#f4f6fa" : "#eef4ff",
                        color: topic.completed ? "#15803d" : topic.locked ? "#9aa8bd" : "#0e58a8",
                      }}>
                      {topic.locked ? <Lock className="w-3.5 h-3.5" /> : topic.completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </span>
                    <span className="text-sm font-medium truncate" style={{ color: isActive ? "#0e58a8" : "#104475", fontFamily: "var(--font-poppins)" }}>
                      {topic.title}
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


function QollanmaSection({
  qollanma, onProgress,
}: {
  qollanma: StudentTopicSectionWithLock
  onProgress: () => void
}) {
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
        <span className="text-sm font-semibold" style={titleStyle}>Qo&apos;llanma (Adabiyotlar)</span>
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
          ✓ Yuklab olindi — keyingi bo&apos;lim ochildi
        </p>
      ) : (
        <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Faylni yuklab oling — keyingi bo&apos;lim avtomatik ochiladi
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
  const [open, setOpen] = useState(defaultOpen && !locked)

  const borderColor = locked
    ? "rgba(1,41,112,0.07)"
    : completed
      ? "rgba(34,197,94,0.3)"
      : "rgba(1,41,112,0.15)"

  const headerBg = open && !locked ? "#f0f5ff" : completed ? "rgba(240,253,244,0.6)" : "white"

  return (
    <div className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${borderColor}` }}>
      <button
        onClick={() => !locked && setOpen(o => !o)}
        disabled={locked}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ backgroundColor: headerBg, cursor: locked ? "default" : "pointer" }}>
        <div className="shrink-0 p-1.5 rounded-[6px]"
          style={{ backgroundColor: locked ? "#f1f5f9" : completed ? "rgba(34,197,94,0.12)" : "#eef4ff" }}>
          {icon}
        </div>
        <span className="text-sm font-semibold flex-1"
          style={{ color: locked ? "#94a3b8" : "#012970", fontFamily: "var(--font-poppins)" }}>
          {title}
        </span>
        {locked && <Lock className="w-4 h-4 shrink-0" style={{ color: "#b0c2d8" }} />}
        {!locked && completed && !open && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#22c55e" }} />}
        {!locked && (
          <svg
            className="w-4 h-4 shrink-0 transition-transform"
            style={{ color: "#7293b9", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      {!locked && open && (
        <div className="p-4" style={{ borderTop: `1px solid ${borderColor}`, backgroundColor: "white" }}>
          {children}
        </div>
      )}
    </div>
  )
}

function TopicContent({ topic, onProgress }: { topic: StudentTopic; onProgress: () => void }) {
  const { video, audio, theory, qollanma, test, assignment } = topic.sections

  // First unlocked + incomplete section is opened by default; falls back to first existing section
  function pickFirstOpen() {
    const seq: Array<[string, { sectionLocked: boolean; progress?: { completed?: boolean } | null; submission?: unknown } | undefined]> = [
      ["video", video],
      ["audio", audio],
      ["theory", theory],
      ["qollanma", qollanma],
      ["test", test],
      ["assignment", assignment],
    ]
    // Prefer first unlocked and not-yet-completed
    for (const [id, sec] of seq) {
      if (sec && !sec.sectionLocked && !sec.progress?.completed && !("submission" in sec && sec.submission)) return id
    }
    // Fallback: first existing section
    for (const [id, sec] of seq) { if (sec) return id }
    return "video"
  }
  const firstOpen = pickFirstOpen()

  const hasAny = !!(video || audio || theory || qollanma || test || assignment)

  return (
    <>
      <div className="bg-white rounded-[10px] p-4 flex items-center gap-2"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
        {topic.completed && <CheckCircle2 className="w-5 h-5" style={{ color: "#22c55e" }} />}
        <h2 className="text-base font-semibold" style={titleStyle}>{topic.title}</h2>
      </div>

      {!hasAny && (
        <div className="bg-white rounded-[10px] p-14 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <Circle className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
          <p className="text-sm" style={labelStyle}>Bu mavzu uchun resurslar hali yuklanmagan</p>
        </div>
      )}

      {video && video.file && (
        <SectionAccordion
          id="video"
          title="Video"
          icon={<Video className="w-4 h-4" style={{ color: video.sectionLocked ? "#94a3b8" : "#0e58a8" }} />}
          locked={video.sectionLocked}
          completed={!!video.progress?.completed}
          defaultOpen={firstOpen === "video"}>
          <LockedMediaPlayer
            contentId={video.id}
            src={teachingApi.fileUrl(video.file.url)}
            kind="video"
            title="Video"
            initialProgress={video.progress}
            onCompleted={onProgress}
          />
        </SectionAccordion>
      )}

      {audio && audio.file && (
        <SectionAccordion
          id="audio"
          title="Audio"
          icon={<Play className="w-4 h-4" style={{ color: audio.sectionLocked ? "#94a3b8" : "#0e58a8" }} />}
          locked={audio.sectionLocked}
          completed={!!audio.progress?.completed}
          defaultOpen={firstOpen === "audio"}>
          <LockedMediaPlayer
            contentId={audio.id}
            src={teachingApi.fileUrl(audio.file.url)}
            kind="audio"
            title="Audio"
            initialProgress={audio.progress}
            onCompleted={onProgress}
          />
        </SectionAccordion>
      )}

      {theory && theory.file && (
        <SectionAccordion
          id="theory"
          title="Taqdimot (Prezentatsiya)"
          icon={<BookOpen className="w-4 h-4" style={{ color: theory.sectionLocked ? "#94a3b8" : "#0e58a8" }} />}
          locked={theory.sectionLocked}
          completed={!!theory.progress?.completed}
          defaultOpen={firstOpen === "theory"}>
          <TheoryViewer
            contentId={theory.id}
            file={theory.file}
            title="Taqdimot (Prezentatsiya)"
            initialProgress={theory.progress}
            onCompleted={onProgress}
          />
        </SectionAccordion>
      )}

      {qollanma && qollanma.file && (
        <SectionAccordion
          id="qollanma"
          title="Qo'llanma (Adabiyotlar)"
          icon={<Library className="w-4 h-4" style={{ color: qollanma.sectionLocked ? "#94a3b8" : "#0e58a8" }} />}
          locked={qollanma.sectionLocked}
          completed={!!qollanma.progress?.completed}
          defaultOpen={firstOpen === "qollanma"}>
          <QollanmaSection qollanma={qollanma} onProgress={onProgress} />
        </SectionAccordion>
      )}

      {test && (
        <SectionAccordion
          id="test"
          title={`Test${test.submission?.grade != null && test.maxScore ? ` · ${test.submission.grade}/${test.maxScore} ball` : test.submission?.grade != null ? ` · ${test.submission.grade} ball` : ""}`}
          icon={<HelpCircle className="w-4 h-4" style={{ color: test.sectionLocked ? "#94a3b8" : "#0e58a8" }} />}
          locked={test.sectionLocked}
          completed={test.submission?.grade != null}
          defaultOpen={firstOpen === "test"}>
          <StudentContentCard item={test} submittable />
        </SectionAccordion>
      )}

      {assignment && (
        <SectionAccordion
          id="assignment"
          title="Topshiriq"
          icon={<ClipboardList className="w-4 h-4" style={{ color: assignment.sectionLocked ? "#94a3b8" : "#0e58a8" }} />}
          locked={assignment.sectionLocked}
          completed={!!assignment.submission}
          defaultOpen={firstOpen === "assignment"}>
          <StudentContentCard item={assignment} submittable />
        </SectionAccordion>
      )}
    </>
  )
}
