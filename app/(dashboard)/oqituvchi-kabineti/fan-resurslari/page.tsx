"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Video, Music, BookOpen, HelpCircle, ClipboardList, Library,
  Upload, Trash2, CheckCircle2, Loader2, ExternalLink,
  BookMarked, CalendarDays, VideoIcon, Save, BarChart3,
  Check, X, RefreshCw, Users, ChevronLeft, Pencil, Plus,
} from "lucide-react"
import {
  teachingApi, meetingsApi,
  type TeacherContent, type CreateMeetingRequest, type SubjectRecording,
  type TeachingSubmission, type ExamQuestion, type TeacherGroup,
} from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { QuestionsModal } from "@/components/teaching/QuestionsModal"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const labelStyle = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const
const titleStyle = { color: "#012970", fontFamily: "var(--font-poppins)" } as const

// HEMIS'da o'quv yili sentyabrdan boshlanadi — boshqa "xodim" sahifalaridagi
// bilan bir xil hisoblash (masalan app/(dashboard)/xodim/[...slug]/page.tsx).
function academicYearStart() {
  const now = new Date()
  const year = now.getFullYear()
  return now.getMonth() >= 8 ? year : year - 1
}
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => academicYearStart() - i)

interface Selection {
  groupId: number
  groupName: string
  subjectName: string
  topicKey: string
  topicTitle: string
}

/* ── UploadSection ──────────────────────────────────────────────────── */
function UploadSection({
  icon, title, description, item, accept, noFile, uploading, progress, disabled, disabledMessage,
  onUpload, onCreate, onDelete, onReplace, extra,
}: {
  icon: React.ReactNode
  title: string
  description: string
  item?: TeacherContent
  accept: string
  noFile?: boolean
  uploading: boolean
  progress?: number | null
  disabled?: boolean
  disabledMessage?: string
  onUpload: (file: File) => void
  onCreate?: () => void
  onDelete: () => void
  onReplace?: (file: File) => void
  extra?: React.ReactNode
}) {
  const { t } = useLanguage()
  const replaceRef = useRef<HTMLInputElement>(null)
  return (
    <div className="rounded-[10px] p-4 flex flex-col gap-2"
      style={{ border: item ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(1,41,112,0.1)", opacity: disabled ? 0.55 : 1, backgroundColor: item ? "rgba(240,253,244,0.4)" : "white" }}>
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-[6px]" style={{ backgroundColor: item ? "rgba(34,197,94,0.1)" : "#eef4ff" }}>
          {icon}
        </div>
        <span className="text-sm font-semibold" style={titleStyle}>{title}</span>
        {item && <CheckCircle2 className="w-4 h-4 ml-auto" style={{ color: "#22c55e" }} />}
      </div>
      <p className="text-xs" style={labelStyle}>{description}</p>

      {disabled ? (
        <p className="text-xs px-3 py-2 rounded-[6px]"
          style={{ backgroundColor: "#fff7ed", color: "#92400e", fontFamily: "var(--font-poppins)" }}>
          {disabledMessage}
        </p>
      ) : item ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#f6f9ff" }}>
          <span className="text-sm truncate min-w-0" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {item.file?.originalName ?? item.title}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {item.file && (
              <a href={teachingApi.fileUrl(item.file.url)} target="_blank" rel="noreferrer"
                className="p-1.5 rounded hover:bg-white transition-colors" title={t("fanResurslariOq.upload.openFile")}>
                <ExternalLink className="w-4 h-4" style={{ color: "#0e58a8" }} />
              </a>
            )}
            {onReplace && !noFile && (
              <>
                <input ref={replaceRef} type="file" accept={accept} className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { onReplace(f); replaceRef.current!.value = "" } }} />
                <button onClick={() => replaceRef.current?.click()}
                  className="p-1.5 rounded hover:bg-white transition-colors" title={t("fanResurslariOq.upload.replace")}>
                  <Pencil className="w-4 h-4" style={{ color: "#d97706" }} />
                </button>
              </>
            )}
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-white transition-colors" title={t("fanResurslariOq.upload.delete")}>
              <Trash2 className="w-4 h-4" style={{ color: "#dc2626" }} />
            </button>
          </div>
        </div>
      ) : noFile ? (
        <button onClick={onCreate} disabled={uploading}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-[6px] text-sm font-medium w-fit transition-colors hover:bg-[#f6f9ff] disabled:opacity-60"
          style={{ border: "1px dashed rgba(1,41,112,0.25)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? t("fanResurslariOq.upload.creating") : t("fanResurslariOq.upload.createTest")}
        </button>
      ) : uploading ? (
        <div className="flex flex-col gap-1.5 w-full max-w-[260px]">
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("fanResurslariOq.upload.uploading")} {progress != null ? `${progress}%` : ""}
          </div>
          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#eef4ff" }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${progress ?? 0}%`, backgroundColor: "#0e58a8" }} />
          </div>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-[6px] text-sm font-medium cursor-pointer w-fit transition-colors hover:bg-[#f6f9ff]"
          style={{ border: "1px dashed rgba(1,41,112,0.25)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <Upload className="w-4 h-4" />
          {t("fanResurslariOq.upload.uploadFile")}
          <input type="file" accept={accept} className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
        </label>
      )}

      {extra}
    </div>
  )
}

/* ── Meeting section ────────────────────────────────────────────────── */
function MeetingSection({
  meetingItem, groupId, subjectName, topicKey, topicTitle, onRefetch,
}: {
  meetingItem?: TeacherContent
  groupId: number
  subjectName: string
  topicKey: string
  topicTitle: string
  onRefetch: () => void
}) {
  const { t } = useLanguage()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: topicTitle,
    date: new Date().toISOString().slice(0, 10),
    startTime: "09:00",
    endTime: "10:30",
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [uploadingRec, setUploadingRec] = useState(false)

  async function handleCreate() {
    setLoading(true)
    setErr(null)
    try {
      const startTime = `${form.date}T${form.startTime}:00`
      const endTime = `${form.date}T${form.endTime}:00`
      const meetReq: CreateMeetingRequest = {
        title: form.title || topicTitle,
        subjectName,
        startTime,
        endTime,
        groupIds: [groupId],
      }
      const meetRes = await meetingsApi.create(meetReq)
      const meetId = meetRes.data.id
      const meetLink = meetRes.data.link || ""

      await teachingApi.createContent({
        type: "mavzu",
        kind: "meeting",
        groupId,
        subjectName,
        topicKey,
        title: form.title || topicTitle,
        availableFrom: startTime,
        meetingLink: meetLink || meetId,
      })
      setCreating(false)
      onRefetch()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("fanResurslariOq.meeting.createError"))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!meetingItem) return
    setLoading(true)
    try {
      await teachingApi.removeContent(meetingItem.id)
      onRefetch()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("fanResurslariOq.meeting.deleteError"))
    } finally {
      setLoading(false)
    }
  }

  async function handleRecordingUpload(file: File) {
    if (!meetingItem?.meetingLink) return
    setUploadingRec(true)
    try {
      await meetingsApi.uploadRecording(meetingItem.meetingLink, file, file.name)
      onRefetch()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("fanResurslariOq.meeting.recordingUploadError"))
    } finally {
      setUploadingRec(false)
    }
  }

  return (
    <div className="rounded-[10px] p-4 flex flex-col gap-3"
      style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
      <div className="flex items-center gap-2">
        <VideoIcon className="w-4 h-4" style={{ color: "#0e58a8" }} />
        <span className="text-sm font-semibold" style={titleStyle}>{t("fanResurslariOq.meeting.title")}</span>
        {meetingItem && <CheckCircle2 className="w-4 h-4 ml-auto" style={{ color: "#22c55e" }} />}
      </div>
      <p className="text-xs" style={labelStyle}>{t("fanResurslariOq.meeting.description")}</p>

      {err && (
        <p className="text-xs px-3 py-2 rounded-[6px]"
          style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
          {err}
        </p>
      )}

      {meetingItem ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#f6f9ff" }}>
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays className="w-4 h-4 shrink-0" style={{ color: "#0e58a8" }} />
              <span className="text-sm truncate min-w-0" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                {meetingItem.title}
              </span>
              {meetingItem.meetingLink && (
                <a href={meetingItem.meetingLink.startsWith("http") ? meetingItem.meetingLink : `#`}
                  target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-white transition-colors shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" style={{ color: "#0e58a8" }} />
                </a>
              )}
            </div>
            <button onClick={handleDelete} disabled={loading}
              className="p-1.5 rounded hover:bg-white transition-colors shrink-0">
              <Trash2 className="w-4 h-4" style={{ color: "#dc2626" }} />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.meeting.recording")}</p>
            {uploadingRec ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Loader2 className="w-4 h-4 animate-spin" /> {t("fanResurslariOq.meeting.uploading")}
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 rounded-[6px] text-sm font-medium cursor-pointer w-fit transition-colors hover:bg-[#f6f9ff]"
                style={{ border: "1px dashed rgba(1,41,112,0.25)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Upload className="w-4 h-4" />
                {t("fanResurslariOq.meeting.uploadRecording")}
                <input type="file" accept="video/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleRecordingUpload(f) }} />
              </label>
            )}
          </div>
        </div>
      ) : creating ? (
        <div className="flex flex-col gap-3 p-3 rounded-[8px]"
          style={{ backgroundColor: "#f8fafc", border: "1px solid rgba(1,41,112,0.08)" }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.meeting.titleLabel")}</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="px-3 py-2 rounded-[5px] text-sm outline-none"
              style={{ border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)" }}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.meeting.dateLabel")}</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="px-3 py-2 rounded-[5px] text-sm outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.meeting.startLabel")}</label>
              <input type="time" value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="px-3 py-2 rounded-[5px] text-sm outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.meeting.endLabel")}</label>
              <input type="time" value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="px-3 py-2 rounded-[5px] text-sm outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCreate} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
              {loading ? t("fanResurslariOq.meeting.creating") : t("fanResurslariOq.meeting.create")}
            </button>
            <button onClick={() => { setCreating(false); setErr(null) }}
              className="px-3 py-2 rounded-[6px] text-sm"
              style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {t("fanResurslariOq.meeting.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-3 py-2.5 rounded-[6px] text-sm font-medium w-fit transition-colors hover:bg-[#f6f9ff]"
          style={{ border: "1px dashed rgba(1,41,112,0.25)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <CalendarDays className="w-4 h-4" />
          {t("fanResurslariOq.meeting.create")}
        </button>
      )}
    </div>
  )
}

/* ── Test natijalari modali ──────────────────────────────────────────── */
function TestResultsModal({ test, onClose }: { test: TeacherContent; onClose: () => void }) {
  const { t } = useLanguage()
  const [selectedSub, setSelectedSub] = useState<TeachingSubmission | null>(null)

  const { data: subsData, loading: lSubs } = useApi(
    () => teachingApi.submissions(test.id), [test.id]
  )
  const { data: qData, loading: lQ } = useApi(
    () => teachingApi.questions(test.id), [test.id]
  )

  const submissions = (subsData?.data ?? []) as TeachingSubmission[]
  const allQuestions = (qData?.data ?? []) as ExamQuestion[]
  const loading = lSubs || lQ

  const questionsForSub = (sub: TeachingSubmission): ExamQuestion[] => {
    if (sub.questionIds?.length) {
      const byId = new Map(allQuestions.map(q => [q.id, q]))
      return sub.questionIds.map(id => byId.get(id)).filter(Boolean) as ExamQuestion[]
    }
    return allQuestions
  }

  function fmtDate(iso: string) {
    const d = new Date(iso)
    return `${d.getDate().toString().padStart(2,"0")}.${(d.getMonth()+1).toString().padStart(2,"0")}.${d.getFullYear()} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`
  }

  const avgScore = submissions.length
    ? Math.round(submissions.reduce((s, sub) => s + (sub.grade ?? 0), 0) / submissions.length)
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(1,41,112,0.35)" }}>
      <div className="bg-white rounded-[14px] w-full max-w-4xl max-h-[90vh] flex flex-col"
        style={{ boxShadow: "0 16px 48px rgba(1,41,112,0.18)" }}>

        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <div className="flex items-center gap-3">
            {selectedSub && (
              <button onClick={() => setSelectedSub(null)}
                className="p-1.5 rounded-[6px] hover:bg-[#f0f5ff] transition-colors">
                <ChevronLeft className="w-4 h-4" style={{ color: "#0e58a8" }} />
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold" style={titleStyle}>
                {selectedSub ? selectedSub.studentFullName : t("fanResurslariOq.results.title")}
              </h2>
              <p className="text-xs mt-0.5" style={labelStyle}>
                {selectedSub
                  ? t("fanResurslariOq.results.scoreLine", { grade: selectedSub.grade ?? "—", max: test.maxScore ?? "?", date: fmtDate(selectedSub.submittedAt) })
                  : t("fanResurslariOq.results.summaryLine", { title: test.title, count: submissions.length, avg: avgScore })}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#f0f5ff] transition-colors shrink-0">
            <X className="w-5 h-5" style={{ color: "#7293b9" }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2" style={labelStyle}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{t("fanResurslariOq.results.loading")}</span>
            </div>
          ) : selectedSub ? (
            /* ── Talaba javoblari ── */
            <div className="flex flex-col gap-5">
              {questionsForSub(selectedSub).map((q, qi) => {
                const chosen  = selectedSub.answers?.[qi] ?? -1
                const correct = q.correctIndexes ?? [q.correctIndex]
                const isRight = correct.includes(chosen)
                // Use student's shuffled option order if stored, otherwise original order
                const perm: number[] = selectedSub.optionPerms?.[q.id!] ?? q.options.map((_, i) => i)
                return (
                  <div key={q.id} className="rounded-[10px] p-4"
                    style={{ border: `1.5px solid ${isRight ? "rgba(34,197,94,0.3)" : "rgba(185,28,28,0.3)"}`, backgroundColor: isRight ? "rgba(240,253,244,0.5)" : "rgba(254,242,242,0.5)" }}>
                    <div className="flex items-start gap-2 mb-3">
                      <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: isRight ? "rgba(34,197,94,0.15)" : "rgba(185,28,28,0.15)", color: isRight ? "#15803d" : "#b91c1c" }}>
                        {qi + 1}
                      </span>
                      <p className="text-sm font-medium" style={titleStyle}>{q.questionText}</p>
                    </div>
                    <div className="flex flex-col gap-2 pl-8">
                      {perm.map((origIdx, shuffledPos) => {
                        const opt = q.options[origIdx]
                        const isChosen  = chosen === origIdx
                        const isCorrect = correct.includes(origIdx)
                        return (
                          <div key={shuffledPos}
                            className="flex items-center gap-2 px-3 py-2 rounded-[6px] text-sm"
                            style={{
                              backgroundColor: isCorrect ? "rgba(34,197,94,0.12)" : isChosen ? "rgba(185,28,28,0.08)" : "rgba(1,41,112,0.03)",
                              border: isCorrect ? "1px solid rgba(34,197,94,0.4)" : isChosen ? "1px solid rgba(185,28,28,0.3)" : "1px solid transparent",
                              fontFamily: "var(--font-poppins)",
                            }}>
                            {isCorrect
                              ? <Check className="w-4 h-4 shrink-0" style={{ color: "#15803d" }} />
                              : isChosen
                                ? <X className="w-4 h-4 shrink-0" style={{ color: "#b91c1c" }} />
                                : <span className="w-4 h-4 shrink-0" />}
                            <span style={{ color: isCorrect ? "#15803d" : isChosen ? "#b91c1c" : "#445b7a" }}>
                              {String.fromCharCode(65 + shuffledPos)}){" "}{opt}
                            </span>
                            {isChosen && !isCorrect && <span className="ml-auto text-xs" style={{ color: "#b91c1c" }}>{t("fanResurslariOq.results.studentChose")}</span>}
                            {isCorrect && <span className="ml-auto text-xs font-semibold" style={{ color: "#15803d" }}>{t("fanResurslariOq.results.correctAnswer")}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* ── Talabalar ro'yxati ── */
            submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <Users className="w-10 h-10" style={{ color: "#d8e6f7" }} />
                <p className="text-sm" style={labelStyle}>{t("fanResurslariOq.results.noSubmissions")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)", backgroundColor: "#f8fafc" }}>
                    {["#", t("fanResurslariOq.results.colStudent"), t("fanResurslariOq.results.colScore"), t("fanResurslariOq.results.colPercent"), t("fanResurslariOq.results.colSubmitted"), t("fanResurslariOq.results.colView")].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold" style={titleStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {submissions.sort((a, b) => (b.grade ?? 0) - (a.grade ?? 0)).map((sub, i) => {
                    const pct = test.maxScore && sub.grade !== null
                      ? Math.round((sub.grade / test.maxScore) * 100) : null
                    const pc = pct === null ? "#445b7a" : pct >= 85 ? "#15803d" : pct >= 55 ? "#d97706" : "#b91c1c"
                    return (
                      <tr key={sub.id} className="hover:bg-[#f6f9ff]"
                        style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                        <td className="px-4 py-3 text-sm" style={labelStyle}>{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium" style={titleStyle}>{sub.studentFullName}</td>
                        <td className="px-4 py-3 text-sm font-bold" style={{ color: pc, fontFamily: "var(--font-poppins)" }}>
                          {sub.grade ?? "—"}{test.maxScore ? `/${test.maxScore}` : ""}
                        </td>
                        <td className="px-4 py-3">
                          {pct !== null ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-[4px]"
                              style={{ color: pc, backgroundColor: `${pc}18`, fontFamily: "var(--font-poppins)" }}>
                              {pct}%
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={labelStyle}>
                          {fmtDate(sub.submittedAt)}
                        </td>
                        <td className="px-4 py-3">
                          {sub.answers?.length ? (
                            <button onClick={() => setSelectedSub(sub)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-xs font-medium transition-colors hover:bg-[#0e58a8] hover:text-white"
                              style={{ border: "1px solid rgba(14,88,168,0.3)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                              <BarChart3 className="w-3 h-3" /> {t("fanResurslariOq.results.viewBtn")}
                            </button>
                          ) : <span className="text-xs" style={labelStyle}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            )
          )}
        </div>

        <div className="px-5 py-3 shrink-0 flex items-center justify-between text-xs"
          style={{ borderTop: "1px solid rgba(1,41,112,0.08)", ...labelStyle }}>
          <span>{t("fanResurslariOq.results.totalSubmitted", { n: submissions.length })}</span>
          <button onClick={onClose}
            className="px-4 py-2 rounded-[8px] text-sm font-medium"
            style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>
            {t("fanResurslariOq.results.close")}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Resurslar panel ─────────────────────────────────────────────────── */
function ResourcesPanel({ sel }: { sel: Selection }) {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useApi(
    () => teachingApi.contentByTopic({ topicKey: sel.topicKey, groupId: sel.groupId }),
    [sel.topicKey, sel.groupId]
  )
  const items = data?.data ?? []

  const [uploadingKind, setUploadingKind] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [opErr, setOpErr] = useState<string | null>(null)
  const [showQuestions, setShowQuestions] = useState(false)
  const [showTestResults, setShowTestResults] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsErr, setSettingsErr] = useState<string | null>(null)
  const [settingsOk, setSettingsOk] = useState(false)


  const video      = items.find(i => i.type === "mavzu" && i.kind === "video_lesson")
  const audio      = items.find(i => i.type === "mavzu" && i.kind === "audio")
  const theory     = items.find(i => i.type === "mavzu" && i.kind === "theory")
  const qollanma   = items.find(i => i.type === "mavzu" && i.kind === "qollanma")
  const test       = items.find(i => i.type === "exam")
  const assignment = items.find(i => i.type === "assignment")
  const meeting    = items.find(i => i.type === "mavzu" && i.kind === "meeting")

  // Unified settings state — only test has saveable settings
  const [settings, setSettings] = useState({
    testMaxScore: 0, testDuration: 0, testAttempts: 0, testDisplayCount: 0,
  })

  // Sync settings from loaded data
  useEffect(() => {
    setSettings({
      testMaxScore:     test?.maxScore              ?? 0,
      testDuration:     test?.durationMinutes        ?? 0,
      testAttempts:     test?.attemptsCount          ?? 0,
      testDisplayCount: test?.questionDisplayCount   ?? 0,
    })
    setSettingsOk(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test?.id])

  const setSt = <K extends keyof typeof settings>(key: K, v: number) =>
    setSettings(s => ({ ...s, [key]: v }))

  async function saveAllSettings() {
    if (!test) return
    setSavingSettings(true)
    setSettingsErr(null)
    setSettingsOk(false)
    try {
      await teachingApi.updateContent(test.id, {
        maxScore:             settings.testMaxScore     || null,
        durationMinutes:      settings.testDuration     || null,
        attemptsCount:        settings.testAttempts     || null,
        questionDisplayCount: settings.testDisplayCount || null,
      })
      await refetch()
      setSettingsOk(true)
    } catch (e) {
      setSettingsErr(e instanceof Error ? e.message : t("fanResurslariOq.errors.saveError"))
    } finally {
      setSavingSettings(false)
    }
  }

  const now = () => new Date().toISOString()

  async function upload(kind: string, type: "mavzu" | "exam" | "assignment", file: File | null) {
    setOpErr(null)
    setUploadingKind(kind)
    setUploadProgress(file ? 0 : null)
    try {
      await teachingApi.createContent({
        type, groupId: sel.groupId, subjectName: sel.subjectName,
        topicKey: sel.topicKey, title: sel.topicTitle, kind,
        availableFrom: now(), docFile: file,
        onUploadProgress: file ? setUploadProgress : undefined,
      })
      await refetch()
    } catch (err) {
      setOpErr(err instanceof Error ? err.message : t("fanResurslariOq.errors.uploadError"))
    } finally {
      setUploadingKind(null)
      setUploadProgress(null)
    }
  }

  async function remove(item?: TeacherContent) {
    if (!item) return
    setOpErr(null)
    try {
      await teachingApi.removeContent(item.id)
      await refetch()
    } catch (err) {
      setOpErr(err instanceof Error ? err.message : t("fanResurslariOq.errors.deleteError"))
    }
  }

  async function replace(item: TeacherContent, kind: string, type: "mavzu" | "exam" | "assignment", file: File) {
    setOpErr(null)
    setUploadingKind(kind)
    setUploadProgress(0)
    try {
      // Avval YANGI faylni yuklaymiz, faqat muvaffaqiyatli bo'lsa eskisini
      // o'chiramiz — aks holda internet uzilib yuklash muvaffaqiyatsiz
      // tugasa, o'qituvchi eski faylini butunlay yo'qotib qo'yardi.
      await teachingApi.createContent({
        type, groupId: sel.groupId, subjectName: sel.subjectName,
        topicKey: sel.topicKey, title: sel.topicTitle, kind,
        availableFrom: item.availableFrom ?? new Date().toISOString(),
        docFile: file,
        onUploadProgress: setUploadProgress,
      })
      await teachingApi.removeContent(item.id)
      await refetch()
    } catch (err) {
      setOpErr(err instanceof Error ? err.message : t("fanResurslariOq.errors.replaceError"))
    } finally {
      setUploadingKind(null)
      setUploadProgress(null)
    }
  }

  if (loading) return <Loading />
  if (error) return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-4">
      {opErr && (
        <div className="text-sm px-3 py-2 rounded-[6px]"
          style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
          {opErr}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

      {/* Video */}
      <UploadSection
        icon={<Video className="w-4 h-4" style={{ color: "#0e58a8" }} />}
        title={t("fanResurslariOq.video.title")}
        description={t("fanResurslariOq.video.description")}
        item={video} accept="video/*"
        uploading={uploadingKind === "video_lesson"}
        progress={uploadingKind === "video_lesson" ? uploadProgress : null}
        onUpload={f => upload("video_lesson", "mavzu", f)}
        onDelete={() => remove(video)}
        onReplace={video ? f => replace(video, "video_lesson", "mavzu", f) : undefined}
      />

      {/* Audio */}
      <UploadSection
        icon={<Music className="w-4 h-4" style={{ color: "#0e58a8" }} />}
        title={t("fanResurslariOq.audio.title")}
        description={t("fanResurslariOq.audio.description")}
        item={audio} accept="audio/*"
        uploading={uploadingKind === "audio"}
        progress={uploadingKind === "audio" ? uploadProgress : null}
        onUpload={f => upload("audio", "mavzu", f)}
        onDelete={() => remove(audio)}
        onReplace={audio ? f => replace(audio, "audio", "mavzu", f) : undefined}
      />

      {/* Taqdimot */}
      <UploadSection
        icon={<BookOpen className="w-4 h-4" style={{ color: "#0e58a8" }} />}
        title={t("fanResurslariOq.presentation.title")}
        description={t("fanResurslariOq.presentation.description")}
        item={theory} accept=".pdf,.ppt,.pptx"
        uploading={uploadingKind === "theory"}
        progress={uploadingKind === "theory" ? uploadProgress : null}
        onUpload={f => upload("theory", "mavzu", f)}
        onDelete={() => remove(theory)}
        onReplace={theory ? f => replace(theory, "theory", "mavzu", f) : undefined}
      />

      {/* Qo'llanma */}
      <UploadSection
        icon={<Library className="w-4 h-4" style={{ color: "#0e58a8" }} />}
        title={t("fanResurslariOq.guide.title")}
        description={t("fanResurslariOq.guide.description")}
        item={qollanma} accept=".pdf,.doc,.docx,.zip,.rar"
        uploading={uploadingKind === "qollanma"}
        progress={uploadingKind === "qollanma" ? uploadProgress : null}
        onUpload={f => upload("qollanma", "mavzu", f)}
        onDelete={() => remove(qollanma)}
        onReplace={qollanma ? f => replace(qollanma, "qollanma", "mavzu", f) : undefined}
      />

      </div>{/* end grid 2-col */}

      {/* Test — full width (settings, buttons ko'p) */}
      <UploadSection
        icon={<HelpCircle className="w-4 h-4" style={{ color: "#0e58a8" }} />}
        title={t("fanResurslariOq.test.title")}
        description={t("fanResurslariOq.test.description")}
        item={test} accept="" noFile
        uploading={uploadingKind === "test"}
        disabled={!!assignment && !test}
        disabledMessage={t("fanResurslariOq.test.disabledMessage")}
        onUpload={() => {}}
        onCreate={() => upload("test", "exam", null)}
        onDelete={() => remove(test)}
        extra={test && (
          <div className="flex flex-col gap-3 pt-1 mt-1" style={{ borderTop: "1px solid rgba(1,41,112,0.06)" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setShowQuestions(true)}
                className="px-3 py-2 rounded-[6px] text-sm font-medium transition-colors hover:bg-[#f6f9ff]"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                {t("fanResurslariOq.test.editQuestions")}
              </button>
              <button onClick={() => setShowTestResults(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors hover:bg-[#f6f9ff]"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <BarChart3 className="w-4 h-4" />
                {t("fanResurslariOq.test.resultsBtn")}
              </button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.test.maxScoreLabel")}</label>
                <input type="number" min={0} max={1000} value={settings.testMaxScore}
                  onChange={e => setSt("testMaxScore", Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 px-2 py-1.5 rounded-[5px] text-sm outline-none"
                  style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.test.durationLabel")}</label>
                <input type="number" min={0} max={300} value={settings.testDuration}
                  onChange={e => setSt("testDuration", Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 px-2 py-1.5 rounded-[5px] text-sm outline-none"
                  style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.test.attemptsLabel")}</label>
                <input type="number" min={0} max={10} value={settings.testAttempts}
                  onChange={e => setSt("testAttempts", Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 px-2 py-1.5 rounded-[5px] text-sm outline-none"
                  style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={labelStyle}>
                  {t("fanResurslariOq.test.questionCountLabel", {
                    extra: test?.questionCount ? t("fanResurslariOq.test.questionCountExtra", { n: test.questionCount }) : "",
                  })}
                </label>
                <input type="number" min={0} max={test?.questionCount || 9999} value={settings.testDisplayCount}
                  onChange={e => setSt("testDisplayCount", Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 px-2 py-1.5 rounded-[5px] text-sm outline-none"
                  style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
              </div>
            </div>
            <p className="text-xs" style={labelStyle}>
              {t("fanResurslariOq.test.summaryMaxScore", { n: settings.testMaxScore > 0 ? settings.testMaxScore : 100 })} ·{" "}
              {settings.testDuration > 0 ? t("fanResurslariOq.test.durationMinutes", { n: settings.testDuration }) : t("fanResurslariOq.test.unlimitedTime")} ·{" "}
              {settings.testAttempts > 0 ? t("fanResurslariOq.test.attemptsTimes", { n: settings.testAttempts }) : t("fanResurslariOq.test.unlimitedAttempts")} ·{" "}
              {settings.testDisplayCount > 0
                ? t("fanResurslariOq.test.questionsShown", { n: settings.testDisplayCount })
                : t("fanResurslariOq.test.allQuestions", { n: test?.questionCount ?? 0 })}
            </p>
            {showQuestions && (
              <QuestionsModal content={test} onClose={() => setShowQuestions(false)} onSaved={refetch} />
            )}
            {showTestResults && (
              <TestResultsModal test={test} onClose={() => setShowTestResults(false)} />
            )}
          </div>
        )}
      />

      {/* Topshiriq — full width */}
      <UploadSection
        icon={<ClipboardList className="w-4 h-4" style={{ color: "#0e58a8" }} />}
        title={t("fanResurslariOq.assignment.title")}
        description={t("fanResurslariOq.assignment.description")}
        item={assignment} accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar"
        uploading={uploadingKind === "assignment"}
        progress={uploadingKind === "assignment" ? uploadProgress : null}
        disabled={!!test && !assignment}
        disabledMessage={t("fanResurslariOq.assignment.disabledMessage")}
        onUpload={f => upload("assignment", "assignment", f)}
        onDelete={() => remove(assignment)}
      />

      {/* Meeting — full width */}
      <MeetingSection
        meetingItem={meeting}
        groupId={sel.groupId}
        subjectName={sel.subjectName}
        topicKey={sel.topicKey}
        topicTitle={sel.topicTitle}
        onRefetch={refetch}
      />

      {/* Yozuvlar */}
      <TeacherRecordingsSection subjectName={sel.subjectName} topicTitle={sel.topicTitle} />

      {/* Save bar — only shown when test is uploaded */}
      {test && (
        <div className="flex items-center gap-3 flex-wrap px-4 py-3 rounded-[10px]"
          style={{ backgroundColor: "#f6f9ff", border: "1px solid rgba(1,41,112,0.12)" }}>
          <button onClick={saveAllSettings} disabled={savingSettings}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingSettings ? t("fanResurslariOq.saveBar.saving") : t("fanResurslariOq.saveBar.save")}
          </button>
          {settingsOk && !savingSettings && (
            <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>
              <CheckCircle2 className="w-4 h-4" /> {t("fanResurslariOq.saveBar.saved")}
            </span>
          )}
          {settingsErr && (
            <span className="text-sm" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{settingsErr}</span>
          )}
          <span className="text-xs ml-auto" style={labelStyle}>
            {t("fanResurslariOq.saveBar.hint")}
          </span>
        </div>
      )}
    </div>
  )
}

/* ── Mavzu yozuvlari (o'qituvchi uchun) ─────────────────────────────── */
function TeacherRecordingsSection({ subjectName, topicTitle }: { subjectName: string; topicTitle: string }) {
  const { t } = useLanguage()
  const { data } = useApi(() => meetingsApi.recordingsBySubject(subjectName), [subjectName])
  const all: SubjectRecording[] = data?.data ?? []

  const filtered = all.filter(r => {
    const a = r.title.toLowerCase()
    const b = topicTitle.toLowerCase()
    return a === b || a.includes(b) || b.includes(a)
  })

  if (filtered.length === 0) return null

  return (
    <div className="rounded-[10px] p-4 flex flex-col gap-3"
      style={{ border: "1px solid rgba(1,41,112,0.1)", backgroundColor: "white" }}>
      <div className="flex items-center gap-2">
        <VideoIcon className="w-4 h-4" style={{ color: "#0e58a8" }} />
        <span className="text-sm font-semibold" style={titleStyle}>{t("fanResurslariOq.recordings.title")}</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-auto"
          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          {t("fanResurslariOq.recordings.count", { n: filtered.length })}
        </span>
      </div>
      {filtered.map(r => (
        <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-[8px]"
          style={{ backgroundColor: "#f8fbff", border: "1px solid rgba(1,41,112,0.07)" }}>
          <VideoIcon className="w-4 h-4 shrink-0" style={{ color: "#0e58a8" }} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={titleStyle}>{r.title || r.originalName}</div>
            <div className="text-xs mt-0.5" style={labelStyle}>
              {new Date(r.startTime).toLocaleDateString("uz-UZ")} · {r.groupNames?.join(", ")}
            </div>
          </div>
          <a href={r.fileUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold shrink-0 text-white"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            <ExternalLink className="w-3.5 h-3.5" /> {t("fanResurslariOq.recordings.view")}
          </a>
        </div>
      ))}
    </div>
  )
}

/* ── Bosh sahifa ─────────────────────────────────────────────────────── */
export default function FanResurslariPage() {
  const { t } = useLanguage()
  const { data: groupsRes, loading: lGroups, error: eGroups } = useApi(() => teachingApi.groups(), [])

  const groups = groupsRes?.data ?? []

  const [groupId, setGroupId] = useState<number | "">("")
  const [academicYear, setAcademicYear] = useState("")
  const [subjectName, setSubjectName] = useState("")
  const [topicKey, setTopicKey] = useState("")

  // Faqat aniq bir yil tanlanganda HEMIS'dan so'raladi (join sahifa
  // yuklanishida emas) — o'sha yilda o'qituvchi dars bergan guruhlar,
  // o'tganlari ham (joriy /groups faqat so'nggi sinxronizatsiya + kontenti
  // bor guruhlarni beradi).
  const { data: yearGroupsRes, loading: lYearGroups } = useApi(
    () => academicYear ? teachingApi.groupsByYear(academicYear) : Promise.resolve(null),
    [academicYear]
  )
  const yearGroups = yearGroupsRes?.data ?? []

  const displayGroups = useMemo<TeacherGroup[]>(() => {
    if (!academicYear) return groups
    return [...yearGroups].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  }, [academicYear, groups, yearGroups])

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)")
    const apply = () => setIsMobile(mql.matches)
    apply()
    mql.addEventListener("change", apply)
    return () => mql.removeEventListener("change", apply)
  }, [])

  const activeGroupId = groupId !== "" ? groupId : null

  const { data: subjectsRes } = useApi(
    () => activeGroupId ? teachingApi.mySubjects(activeGroupId as number) : Promise.resolve(null),
    [activeGroupId]
  )

  // Bazamizda hali kontenti yo'q guruh uchun mySubjects bo'sh qaytadi — bunday
  // holatda HEMIS'dan (groupsByYear orqali) shu guruhga o'qitilgan fanlar
  // ro'yxatini qo'shib, tanlashni ishga tushirib beramiz.
  const subjects = useMemo<string[]>(() => {
    const fromContent = subjectsRes?.data?.map(s => s.subjectName) ?? []
    const fromHemis = academicYear
      ? (yearGroups.find(g => g.id === activeGroupId)?.subjects ?? [])
      : []
    return [...new Set([...fromContent, ...fromHemis])].sort()
  }, [subjectsRes, academicYear, yearGroups, activeGroupId])

  const { data: contentRes, loading: lTopics, refetch: refetchTopics } = useApi(
    () => activeGroupId && subjectName
      ? teachingApi.content({ group: activeGroupId, subject: subjectName })
      : Promise.resolve({ success: true, data: [] }),
    [activeGroupId, subjectName]
  )
  const allItems = contentRes?.data ?? []

  interface SidebarTopic { key: string; title: string; markerId: number | null }

  const topics = useMemo<SidebarTopic[]>(() => {
    const map = new Map<string, SidebarTopic>()
    allItems.forEach(item => {
      if (!item.topicKey) return
      if (!map.has(item.topicKey)) {
        const markerId = (item.type === "mavzu" && item.kind === "topic") ? item.id : null
        map.set(item.topicKey, { key: item.topicKey, title: item.title, markerId })
      } else if (item.type === "mavzu" && item.kind === "topic") {
        const existing = map.get(item.topicKey)!
        map.set(item.topicKey, { ...existing, markerId: item.id, title: item.title })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }))
  }, [allItems])

  const [addingTopic, setAddingTopic] = useState(false)
  const [newTopicTitle, setNewTopicTitle] = useState("")
  const [addTopicLoading, setAddTopicLoading] = useState(false)
  const [editTopicKey, setEditTopicKey] = useState<string | null>(null)
  const [editTopicTitle, setEditTopicTitle] = useState("")
  const [editTopicLoading, setEditTopicLoading] = useState(false)
  const [deleteTopicKey, setDeleteTopicKey] = useState<string | null>(null)
  const [deleteTopicLoading, setDeleteTopicLoading] = useState(false)
  const [topicOpError, setTopicOpError] = useState<string | null>(null)

  async function handleAddTopic() {
    if (!newTopicTitle.trim() || !activeGroupId || !subjectName) return
    setTopicOpError(null)
    setAddTopicLoading(true)
    try {
      const newKey = `${subjectName}__${activeGroupId}__${Date.now()}`
      await teachingApi.createContent({
        type: "mavzu",
        kind: "topic",
        groupId: activeGroupId,
        subjectName,
        topicKey: newKey,
        title: newTopicTitle.trim(),
        availableFrom: new Date().toISOString(),
      })
      setNewTopicTitle("")
      setAddingTopic(false)
      await refetchTopics()
      setTopicKey(newKey)
    } catch (err) {
      setTopicOpError(err instanceof Error ? err.message : t("mavzularOq.addError"))
    } finally {
      setAddTopicLoading(false)
    }
  }

  function startEditTopic(tp: SidebarTopic) {
    setEditTopicKey(tp.key)
    setEditTopicTitle(tp.title)
    setTopicOpError(null)
  }

  async function saveEditTopic(tp: SidebarTopic) {
    if (!editTopicTitle.trim() || !tp.markerId) return
    setEditTopicLoading(true)
    setTopicOpError(null)
    try {
      await teachingApi.updateContent(tp.markerId, { title: editTopicTitle.trim() })
      setEditTopicKey(null)
      await refetchTopics()
    } catch (err) {
      setTopicOpError(err instanceof Error ? err.message : t("mavzularOq.editError"))
    } finally {
      setEditTopicLoading(false)
    }
  }

  async function handleDeleteTopic(key: string) {
    setDeleteTopicLoading(true)
    setTopicOpError(null)
    try {
      const toDelete = allItems.filter(i => i.topicKey === key)
      await Promise.all(toDelete.map(i => teachingApi.removeContent(i.id)))
      setDeleteTopicKey(null)
      if (topicKey === key) setTopicKey("")
      await refetchTopics()
    } catch (err) {
      setTopicOpError(err instanceof Error ? err.message : t("mavzularOq.deleteError"))
    } finally {
      setDeleteTopicLoading(false)
    }
  }

  const topicCounts = useMemo(() => {
    const map = new Map<string, number>()
    allItems.forEach(item => {
      if (!item.topicKey || item.kind === "topic") return
      map.set(item.topicKey, (map.get(item.topicKey) ?? 0) + 1)
    })
    return map
  }, [allItems])

  const selectedTopic = topics.find(tp => tp.key === topicKey)
  const groupName = displayGroups.find(g => g.id === activeGroupId)?.name ?? ""

  function handleYearChange(val: string) {
    setAcademicYear(val)
    setGroupId("")
    setSubjectName("")
    setTopicKey("")
  }

  function handleGroupChange(val: string) {
    setGroupId(val === "" ? "" : Number(val))
    setSubjectName("")
    setTopicKey("")
  }

  function handleSubjectChange(val: string) {
    setSubjectName(val)
    setTopicKey("")
  }

  if (lGroups) return <Loading />
  if (eGroups) return <div className="p-[30px]"><ApiError message={eGroups} onRetry={() => {}} /></div>

  const selection: Selection | null = activeGroupId && subjectName && topicKey && selectedTopic
    ? { groupId: activeGroupId, groupName, subjectName, topicKey, topicTitle: selectedTopic.title }
    : null

  return (
    <div className="flex flex-col" style={{ minHeight: "100vh", backgroundColor: "#f0f4fa" }}>

      {/* ── Top header bar ── */}
      <div className="px-8 py-5 bg-white shrink-0"
        style={{ borderBottom: "1px solid rgba(1,41,112,0.08)", boxShadow: "0 1px 4px rgba(1,41,112,0.06)" }}>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-[22px] font-semibold" style={titleStyle}>{t("fanResurslariOq.pageTitle")}</h1>
            <p className="text-xs mt-0.5" style={labelStyle}>{t("fanResurslariOq.pageSubtitle")}</p>
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.academicYear")}</label>
              <select value={academicYear} onChange={e => handleYearChange(e.target.value)}
                className="px-3 py-2 rounded-[6px] text-sm outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", minWidth: 140, backgroundColor: "white" }}>
                <option value="">{t("fanResurslariOq.allYears")}</option>
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}-{y + 1}</option>)}
              </select>
              {lYearGroups && (
                <Loader2 className="w-3.5 h-3.5 animate-spin mt-1" style={{ color: "#7293b9" }} />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.group")}</label>
              <select value={groupId} onChange={e => handleGroupChange(e.target.value)}
                className="px-3 py-2 rounded-[6px] text-sm outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", minWidth: 140, backgroundColor: "white" }}>
                <option value="">{t("fanResurslariOq.selectPlaceholder")}</option>
                {displayGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.subjectName")}</label>
              <select value={subjectName} onChange={e => handleSubjectChange(e.target.value)}
                disabled={!activeGroupId || subjects.length === 0}
                className="px-3 py-2 rounded-[6px] text-sm outline-none disabled:opacity-50"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", minWidth: 200, backgroundColor: "white" }}>
                <option value="">{t("fanResurslariOq.selectPlaceholder")}</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-panel body ── */}
      {!activeGroupId || !subjectName ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 py-24">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#eef4ff" }}>
            <BookOpen className="w-8 h-8" style={{ color: "#0e58a8" }} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold" style={titleStyle}>
              {!activeGroupId ? t("fanResurslariOq.selectGroupPrompt") : t("fanResurslariOq.selectSubjectPrompt")}
            </p>
            <p className="text-sm mt-1" style={labelStyle}>{t("fanResurslariOq.selectFromFiltersAbove")}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0" style={{ flexDirection: isMobile ? "column" : "row" }}>

          {/* ── Left: main content area ── */}
          <div className="flex-1 overflow-y-auto p-6" style={{ order: isMobile ? 2 : 0 }}>
            {selection ? (
              <div className="flex flex-col gap-4">
                {/* Topic header */}
                <div className="rounded-[12px] bg-white px-5 py-4 flex items-center gap-3"
                  style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 1px 4px rgba(1,41,112,0.06)" }}>
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "#0e58a8" }}>
                    <BookMarked className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold truncate" style={titleStyle}>{selection.topicTitle}</h2>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                        {selection.subjectName}
                      </span>
                      <span className="text-xs" style={labelStyle}>{selection.groupName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {["video_lesson","audio","theory","qollanma"].map(kind => {
                      const has = allItems.some(i => i.topicKey === selection.topicKey && i.kind === kind)
                      const icons: Record<string,React.ReactNode> = {
                        video_lesson: <Video className="w-3.5 h-3.5" />,
                        audio: <Music className="w-3.5 h-3.5" />,
                        theory: <BookOpen className="w-3.5 h-3.5" />,
                        qollanma: <Library className="w-3.5 h-3.5" />,
                      }
                      return (
                        <div key={kind} className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: has ? "rgba(34,197,94,0.12)" : "rgba(1,41,112,0.06)", color: has ? "#15803d" : "#b0c2d8" }}>
                          {icons[kind]}
                        </div>
                      )
                    })}
                    {allItems.some(i => i.topicKey === selection.topicKey && i.type === "exam") && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#15803d" }}>
                        <HelpCircle className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
                <ResourcesPanel sel={selection} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-24">
                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#eef4ff" }}>
                  <BookMarked className="w-7 h-7" style={{ color: "#0e58a8" }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold" style={titleStyle}>{t("fanResurslariOq.selectTopic")}</p>
                  <p className="text-xs mt-1" style={labelStyle}>{t("fanResurslariOq.selectTopicHint")}</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: course topics sidebar ── */}
          <div className="shrink-0 bg-white overflow-y-auto"
            style={{
              width: isMobile ? "100%" : 300,
              maxHeight: isMobile ? 260 : undefined,
              borderLeft: isMobile ? "none" : "1px solid rgba(1,41,112,0.08)",
              borderBottom: isMobile ? "1px solid rgba(1,41,112,0.08)" : "none",
              order: isMobile ? 1 : 0,
            }}>
            {/* Sidebar header */}
            <div className="px-4 py-3 sticky top-0 bg-white z-10 flex items-center justify-between gap-2"
              style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {t("fanResurslariOq.sidebar.courseTopics")}
                </p>
                {lTopics && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#7293b9" }} />
                    <span className="text-xs" style={labelStyle}>{t("fanResurslariOq.sidebar.loading")}</span>
                  </div>
                )}
              </div>
              <button onClick={() => { setAddingTopic(v => !v); setTopicOpError(null) }}
                className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-[6px] shrink-0 transition-colors hover:bg-[#f6f9ff]"
                style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Plus className="w-3.5 h-3.5" />
                {t("mavzularOq.addTopic")}
              </button>
            </div>

            {addingTopic && (
              <div className="px-4 py-3 flex flex-col gap-2" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                <input
                  value={newTopicTitle}
                  onChange={e => setNewTopicTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddTopic()}
                  placeholder={t("mavzularOq.topicName")}
                  autoFocus
                  className="px-3 py-2 rounded-[5px] text-sm outline-none"
                  style={{ border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)" }}
                />
                <div className="flex items-center gap-2">
                  <button onClick={handleAddTopic} disabled={addTopicLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium text-white disabled:opacity-60"
                    style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                    {addTopicLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {t("mavzularOq.add")}
                  </button>
                  <button onClick={() => { setAddingTopic(false); setNewTopicTitle("") }}
                    className="px-3 py-1.5 rounded-[6px] text-xs font-medium"
                    style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {t("mavzularOq.cancel")}
                  </button>
                </div>
              </div>
            )}

            {topicOpError && (
              <div className="px-4 py-2 text-xs" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                {topicOpError}
              </div>
            )}

            {/* Topics list */}
            <div className="py-2">
              {topics.length === 0 && !lTopics ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs" style={labelStyle}>{t("fanResurslariOq.sidebar.noTopicsYet")}</p>
                </div>
              ) : topics.map((tp, idx) => {
                const count  = topicCounts.get(tp.key) ?? 0
                const isActive = tp.key === topicKey

                if (editTopicKey === tp.key) {
                  return (
                    <div key={tp.key} className="px-4 py-3 flex items-center gap-2">
                      <input
                        value={editTopicTitle}
                        onChange={e => setEditTopicTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEditTopic(tp); if (e.key === "Escape") setEditTopicKey(null) }}
                        autoFocus
                        className="flex-1 px-2 py-1.5 rounded-[5px] text-sm outline-none"
                        style={{ border: "1px solid rgba(1,41,112,0.35)", color: "#012970", fontFamily: "var(--font-poppins)" }}
                      />
                      <button onClick={() => saveEditTopic(tp)} disabled={editTopicLoading}
                        className="flex items-center justify-center w-7 h-7 rounded-[6px] transition-colors hover:bg-green-50 disabled:opacity-60">
                        {editTopicLoading ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#16a34a" }} /> : <Check className="w-4 h-4" style={{ color: "#16a34a" }} />}
                      </button>
                      <button onClick={() => setEditTopicKey(null)}
                        className="flex items-center justify-center w-7 h-7 rounded-[6px] transition-colors hover:bg-red-50">
                        <X className="w-4 h-4" style={{ color: "#dc2626" }} />
                      </button>
                    </div>
                  )
                }

                if (deleteTopicKey === tp.key) {
                  return (
                    <div key={tp.key} className="px-4 py-3 flex flex-col gap-2">
                      <span className="text-xs" style={labelStyle}>{t("mavzularOq.deleteConfirm", { title: tp.title })}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDeleteTopic(tp.key)} disabled={deleteTopicLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium text-white disabled:opacity-60"
                          style={{ backgroundColor: "#dc2626", fontFamily: "var(--font-poppins)" }}>
                          {deleteTopicLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                          {t("mavzularOq.yesDelete")}
                        </button>
                        <button onClick={() => setDeleteTopicKey(null)}
                          className="px-3 py-1.5 rounded-[6px] text-xs font-medium"
                          style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                          {t("mavzularOq.cancel")}
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={tp.key} className="group w-full flex items-start gap-1 transition-all"
                    style={{
                      backgroundColor: isActive ? "#eef4ff" : "transparent",
                      borderLeft: isActive ? "3px solid #0e58a8" : "3px solid transparent",
                    }}>
                    <button onClick={() => setTopicKey(tp.key)}
                      className="flex-1 min-w-0 text-left px-4 py-3 flex items-start gap-3">
                      {/* Number badge */}
                      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                        style={{
                          backgroundColor: isActive ? "#0e58a8" : count > 0 ? "rgba(34,197,94,0.12)" : "rgba(1,41,112,0.06)",
                          color: isActive ? "white" : count > 0 ? "#15803d" : "#7293b9",
                          fontFamily: "var(--font-poppins)",
                        }}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug"
                          style={{ color: isActive ? "#012970" : "#445b7a", fontFamily: "var(--font-poppins)" }}>
                          {tp.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {count > 0 ? (
                            <span className="text-xs" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                              {t("fanResurslariOq.sidebar.materialCount", { n: count })}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: "#b0c2d8", fontFamily: "var(--font-poppins)" }}>
                              {t("fanResurslariOq.sidebar.empty")}
                            </span>
                          )}
                          {count > 0 && (
                            <div className="flex items-center gap-0.5">
                              {allItems.some(i => i.topicKey === tp.key && i.kind === "video_lesson") && <Video className="w-3 h-3" style={{ color: "#94a3b8" }} />}
                              {allItems.some(i => i.topicKey === tp.key && i.kind === "audio") && <Music className="w-3 h-3" style={{ color: "#94a3b8" }} />}
                              {allItems.some(i => i.topicKey === tp.key && i.kind === "theory") && <BookOpen className="w-3 h-3" style={{ color: "#94a3b8" }} />}
                              {allItems.some(i => i.topicKey === tp.key && i.type === "exam") && <HelpCircle className="w-3 h-3" style={{ color: "#94a3b8" }} />}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                    <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 pr-2 pt-3">
                      <button onClick={() => startEditTopic(tp)} title={t("mavzularOq.edit")}
                        className="flex items-center justify-center w-6 h-6 rounded-[5px] transition-colors hover:bg-[#f0f5ff]">
                        <Pencil className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
                      </button>
                      <button onClick={() => { setDeleteTopicKey(tp.key); setTopicOpError(null) }} title={t("mavzularOq.delete")}
                        className="flex items-center justify-center w-6 h-6 rounded-[5px] transition-colors hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
