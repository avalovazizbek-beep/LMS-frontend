"use client"

import { useMemo, useState, useCallback } from "react"
import { ChevronLeft, FileText, Download, CheckCircle, Lock, AlertCircle } from "lucide-react"
import {
  teachingApi,
  type TeacherContent,
  type TeachingSubmission,
} from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const
const sel = "w-full px-3 py-2.5 rounded-[8px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none bg-white"

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/* ── Submissions list ────────────────────────────────────────────────── */
function SubmissionsList({
  content,
  onBack,
}: {
  content: TeacherContent
  onBack: () => void
}) {
  const { data, loading, error, refetch } = useApi(
    () => teachingApi.submissions(content.id),
    [content.id]
  )

  const [grades, setGrades] = useState<Record<number, string>>({})
  const [feedbacks, setFeedbacks] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [saved, setSaved] = useState<Record<number, boolean>>({})
  const [finalizing, setFinalizing] = useState(false)
  const [finalized, setFinalized] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const submissions: TeachingSubmission[] = useMemo(() => {
    const list = data?.data ?? []
    // Ungraded first (grade === null), then graded
    return [...list].sort((a, b) => {
      if (a.grade === null && b.grade !== null) return -1
      if (a.grade !== null && b.grade === null) return 1
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    })
  }, [data?.data])

  const allGraded = submissions.length > 0 && submissions.every(s => s.grade !== null || saved[s.id])

  const handleGrade = useCallback(async (sub: TeachingSubmission) => {
    const gradeStr = grades[sub.id] ?? (sub.grade !== null ? String(sub.grade) : "")
    const gradeNum = parseFloat(gradeStr.replace(",", "."))
    if (isNaN(gradeNum) || gradeNum < 0) return
    if (content.maxScore !== null && gradeNum > content.maxScore) return
    const feedback = feedbacks[sub.id] ?? sub.feedback ?? ""
    setSaving(prev => ({ ...prev, [sub.id]: true }))
    setSaveError(null)
    try {
      await teachingApi.grade(sub.id, { grade: gradeNum, feedback: feedback || undefined })
      setSaved(prev => ({ ...prev, [sub.id]: true }))
      refetch()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Xatolik")
    } finally {
      setSaving(prev => ({ ...prev, [sub.id]: false }))
    }
  }, [grades, feedbacks, content.maxScore, refetch])

  const handleFinalize = useCallback(async () => {
    setFinalizing(true)
    setSaveError(null)
    try {
      await teachingApi.toggleContent(content.id)
      setFinalized(true)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Xatolik")
    } finally {
      setFinalizing(false)
    }
  }, [content.id])

  if (loading) return <Loading />
  if (error) return <ApiError message={error} onRetry={refetch} />

  const gradedCount = submissions.filter(s => s.grade !== null).length

  return (
    <div className="flex flex-col gap-5">
      {/* Back link */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm w-fit hover:underline transition-opacity" style={L}>
        <ChevronLeft className="w-4 h-4" /> Orqaga
      </button>

      {/* Header card */}
      <div className="rounded-[12px] bg-white overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 2px 8px rgba(1,41,112,0.06)" }}>
        {/* Top accent strip */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #0e58a8, #3b82f6)" }} />
        <div className="p-5 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-[10px] shrink-0 flex items-center justify-center mt-0.5"
              style={{ background: "linear-gradient(135deg, #eef4ff, #dbeafe)" }}>
              <FileText className="w-5 h-5" style={{ color: "#0e58a8" }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={T}>{content.title}</h2>
              <p className="text-sm mt-0.5" style={L}>{content.subjectName}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                  style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  Maks. ball: {content.maxScore ?? "—"}
                </span>
                {content.deadline && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: "#f5f3ff", color: "#6d28d9", fontFamily: "var(--font-poppins)" }}>
                    Muddat: {new Date(content.deadline).toLocaleDateString("uz-UZ")}
                  </span>
                )}
                {(content.isActive === false || finalized) && (
                  <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                    <Lock className="w-3 h-3" /> Yakunlangan (admin kerak)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center px-4 py-2 rounded-[10px]" style={{ backgroundColor: "#f6f9ff", border: "1px solid rgba(1,41,112,0.08)" }}>
              <div className="text-2xl font-bold" style={T}>{submissions.length}</div>
              <div className="text-[10px] mt-0.5 font-medium" style={L}>Topshirildi</div>
            </div>
            <div className="text-center px-4 py-2 rounded-[10px]" style={{ backgroundColor: gradedCount === submissions.length && submissions.length > 0 ? "#f0fdf4" : "#f6f9ff", border: `1px solid ${gradedCount === submissions.length && submissions.length > 0 ? "rgba(21,128,61,0.15)" : "rgba(1,41,112,0.08)"}` }}>
              <div className="text-2xl font-bold" style={{ color: gradedCount === submissions.length && submissions.length > 0 ? "#15803d" : "#012970", fontFamily: "var(--font-poppins)" }}>{gradedCount}</div>
              <div className="text-[10px] mt-0.5 font-medium" style={L}>Baholandi</div>
            </div>
          </div>
        </div>
      </div>

      {saveError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] text-sm" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5", fontFamily: "var(--font-poppins)" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {saveError}
        </div>
      )}

      {/* Submissions */}
      {submissions.length === 0 ? (
        <div className="rounded-[10px] bg-white p-14 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm font-medium" style={T}>Hali hech kim topshirmagan</p>
        </div>
      ) : (
        <>
          <div className="text-xs px-1 font-medium" style={L}>
            Baholanmagan talabalar — {submissions.filter(s => s.grade === null).length} ta
          </div>

          <div className="flex flex-col gap-3">
            {submissions.map(sub => {
              const isGraded = sub.grade !== null
              const isSavedNow = saved[sub.id]
              const isSaving = saving[sub.id]
              const gradeVal = grades[sub.id] ?? (sub.grade !== null ? String(sub.grade) : "")
              const feedbackVal = feedbacks[sub.id] ?? (sub.feedback ?? "")
              return (
                <div key={sub.id}
                  className="rounded-[10px] bg-white p-4 flex flex-col gap-3"
                  style={{
                    border: `1px solid ${(isGraded || isSavedNow) ? "rgba(21,128,61,0.2)" : "rgba(1,41,112,0.1)"}`,
                    boxShadow: "0px 0px 5px rgba(1,41,112,0.05)",
                    opacity: (content.isActive === false || finalized) ? 0.8 : 1,
                  }}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-semibold" style={T}>{sub.studentFullName}</div>
                      <div className="text-xs mt-0.5" style={L}>Topshirildi: {fmtDate(sub.submittedAt)}</div>
                      {sub.comment && <div className="text-xs mt-1 italic" style={L}>"{sub.comment}"</div>}
                    </div>
                    {(isGraded || isSavedNow) && (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                        <CheckCircle className="w-3.5 h-3.5" />
                        {sub.grade !== null ? `${sub.grade} ball` : `${gradeVal} ball`} baholandi
                      </span>
                    )}
                  </div>

                  {/* File download */}
                  {sub.file && (
                    <a
                      href={teachingApi.fileUrl(sub.file.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-[6px] text-xs font-medium w-fit hover:bg-[#f0f5ff] transition-colors"
                      style={{ border: "1px solid rgba(14,88,168,0.25)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      {sub.file.originalName}
                      {sub.file.size > 0 && <span style={L}>· {fmtSize(sub.file.size)}</span>}
                    </a>
                  )}

                  {/* Grade input — only for ungraded submissions (locked once saved) */}
                  {!(content.isActive === false || finalized) && !isGraded && !isSavedNow && (
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium" style={L}>
                          Baho {content.maxScore !== null ? `(0–${content.maxScore})` : ""}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={content.maxScore ?? undefined}
                          value={gradeVal}
                          onChange={e => setGrades(prev => ({ ...prev, [sub.id]: e.target.value }))}
                          placeholder="Ball"
                          className="w-24 px-3 py-2 rounded-[8px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none bg-white"
                          style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                        <label className="text-xs font-medium" style={L}>Izoh (ixtiyoriy)</label>
                        <input
                          type="text"
                          value={feedbackVal}
                          onChange={e => setFeedbacks(prev => ({ ...prev, [sub.id]: e.target.value }))}
                          placeholder="O'qituvchi izohi..."
                          className="w-full px-3 py-2 rounded-[8px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none bg-white"
                          style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
                        />
                      </div>
                      <button
                        onClick={() => handleGrade(sub)}
                        disabled={isSaving || !gradeVal}
                        className="px-4 py-2 rounded-[8px] text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                        style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}
                      >
                        {isSaving ? "Saqlanmoqda..." : "Saqlash"}
                      </button>
                    </div>
                  )}
                  {/* Locked grade display */}
                  {(isGraded || isSavedNow) && (
                    <div className="flex items-center gap-2 text-xs" style={L}>
                      <Lock className="w-3 h-3" />
                      Baho qulflandi — o'zgartirish uchun admin ruxsati kerak
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Finalize button */}
          {!(content.isActive === false || finalized) && allGraded && (
            <div className="rounded-[10px] p-4 flex items-center justify-between gap-4" style={{ backgroundColor: "#fffbeb", border: "1px solid rgba(217,119,6,0.25)" }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>Barcha talabalar baholandi</div>
                <div className="text-xs mt-0.5" style={{ color: "#b45309", fontFamily: "var(--font-poppins)" }}>
                  "Yakunlash" bosib topshiriqni yopasiz — keyinchalik admin ruxsati bilan ochiladi
                </div>
              </div>
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                style={{ backgroundColor: "#d97706", fontFamily: "var(--font-poppins)" }}
              >
                <Lock className="w-4 h-4" />
                {finalizing ? "Yopilmoqda..." : "Baholashni yakunlash"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────── */
export default function BaholashPage() {
  const [groupId, setGroupId] = useState<number | "">("")
  const [subjectName, setSubjectName] = useState("")
  const [selectedContent, setSelectedContent] = useState<TeacherContent | null>(null)

  const { data: groupsRes, loading: lGroups, error: eGroups } = useApi(() => teachingApi.groups(), [])
  const groups = groupsRes?.data ?? []

  const { data: subjectsRes } = useApi(
    () => groupId !== "" ? teachingApi.mySubjects(groupId as number) : Promise.resolve(null),
    [groupId]
  )
  const subjects = useMemo(() => {
    const list = subjectsRes?.data?.map(s => s.subjectName) ?? []
    return [...new Set(list)].sort()
  }, [subjectsRes])

  const ready = groupId !== "" && subjectName !== ""

  const { data: contentRes, loading: lContent, error: eContent } = useApi(
    () => ready ? teachingApi.content({ type: "assignment", group: groupId as number, subject: subjectName }) : Promise.resolve(null),
    [groupId, subjectName, ready]
  )
  const assignments = contentRes?.data ?? []

  if (lGroups) return <Loading />
  if (eGroups) return <ApiError message={eGroups} onRetry={() => window.location.reload()} />

  // Breadcrumb style
  if (selectedContent) {
    return (
      <div className="flex flex-col gap-5 p-[30px]">
        <div>
          <h1 className="text-[28px] font-medium" style={T}>Baholash</h1>
          <p className="text-sm mt-1" style={L}>Talabalar topshirgan ishlarni ko'rib baholang</p>
        </div>
        <SubmissionsList content={selectedContent} onBack={() => setSelectedContent(null)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={T}>Baholash</h1>
        <p className="text-sm mt-1" style={L}>Talabalar topshirgan amaliy ishlarni baholash</p>
      </div>

      {/* Filters */}
      <div className="rounded-[10px] bg-white p-4" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1 min-w-[200px] flex-1">
            <label className="text-xs font-medium" style={L}>O'quv guruhi</label>
            <select value={groupId}
              onChange={e => { setGroupId(Number(e.target.value) || ""); setSubjectName("") }}
              className={sel} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              <option value="">— Guruhni tanlang —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[220px] flex-1">
            <label className="text-xs font-medium" style={L}>Fan</label>
            <select value={subjectName} onChange={e => setSubjectName(e.target.value)}
              disabled={groupId === ""}
              className={sel}
              style={{ color: "#012970", fontFamily: "var(--font-poppins)", opacity: groupId === "" ? 0.5 : 1 }}>
              <option value="">— Fanni tanlang —</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Assignment list */}
      {!ready ? (
        <div className="rounded-[10px] bg-white p-14 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm font-medium" style={T}>Guruh va fanni tanlang</p>
        </div>
      ) : lContent ? (
        <div className="rounded-[10px] bg-white p-8 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="w-7 h-7 border-2 border-[#0e58a8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={L}>Yuklanmoqda...</p>
        </div>
      ) : eContent ? (
        <ApiError message={eContent} onRetry={() => {}} />
      ) : assignments.length === 0 ? (
        <div className="rounded-[10px] bg-white p-14 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm font-medium" style={T}>Amaliy topshiriqlar topilmadi</p>
          <p className="text-xs mt-1" style={L}>Bu guruh va fan uchun hali topshiriq yuklanmagan</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {assignments.map(content => (
            <button
              key={content.id}
              onClick={() => setSelectedContent(content)}
              className="rounded-[10px] bg-white p-4 text-left flex items-center justify-between gap-4 hover:bg-[#f6f9ff] transition-colors"
              style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}
            >
              <div>
                <div className="text-sm font-semibold" style={T}>{content.title}</div>
                <div className="text-xs mt-0.5" style={L}>
                  {content.topicKey && <span>{content.topicKey} · </span>}
                  Maks. ball: {content.maxScore ?? "—"}
                  {content.deadline && <span> · Muddat: {new Date(content.deadline).toLocaleDateString("uz-UZ")}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {content.isActive === false ? (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                    Yakunlangan
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                    Faol
                  </span>
                )}
                <span className="text-xs" style={{ color: "#0e58a8" }}>→</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
