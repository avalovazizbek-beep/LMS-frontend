"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronLeft, FileText, Download, CheckCircle, Lock, AlertCircle, ShieldAlert, ExternalLink } from "lucide-react"
import {
  teachingApi,
  type TeacherContent,
  type TeachingSubmission,
  type PlagiarismResult,
} from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { compareNames } from "@/lib/utils"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const
const sel = "w-full px-3 py-2.5 rounded-[8px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none bg-white"

// HEMIS'da o'quv yili sentyabrdan boshlanadi — boshqa sahifalardagi bilan
// bir xil hisoblash (masalan fan-resurslari, xodim/[...slug]).
function academicYearStart() {
  const now = new Date()
  const year = now.getFullYear()
  return now.getMonth() >= 8 ? year : year - 1
}
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => academicYearStart() - i)

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

/* ── Miltillovchi nuqta — baholanmagan ish borligini ko'rsatadi ──────── */
function PulseDot({ color = "#ea580c" }: { color?: string }) {
  return (
    <span className="relative flex w-2.5 h-2.5 shrink-0">
      <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ backgroundColor: color }} />
      <span className="relative inline-flex w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
    </span>
  )
}

// Mavzular o'sish tartibida: "8_Mavzu…", "9-Mavzu…", "10-Mavzu…" (raqam bo'yicha)
function byTopicNumber(a: TeacherContent, b: TeacherContent) {
  return a.title.localeCompare(b.title, undefined, { numeric: true }) ||
    (a.topicKey ?? "").localeCompare(b.topicKey ?? "", undefined, { numeric: true })
}

/* ── Submissions list ────────────────────────────────────────────────── */
function SubmissionsList({
  content,
  onBack,
}: {
  content: TeacherContent
  onBack: () => void
}) {
  const { t } = useLanguage()
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

  // Antiplagiat — talaba-talaba o'xshashlik + (sozlangan bo'lsa) internet tekshiruvi
  const { data: plagData, refetch: refetchPlag } = useApi(() => teachingApi.plagiarismResults(content.id), [content.id])
  const plagByStudent = new Map((plagData?.data ?? []).map(p => [p.studentUserId, p]))
  const [plagChecking, setPlagChecking] = useState(false)
  const [plagError, setPlagError] = useState<string | null>(null)
  const [openPlagFor, setOpenPlagFor] = useState<number | null>(null)

  async function runPlagCheck() {
    setPlagChecking(true)
    setPlagError(null)
    try {
      await teachingApi.runPlagiarismCheck(content.id)
      await refetchPlag()
    } catch (e) {
      setPlagError(e instanceof Error ? e.message : t("typeContentOq.plag.checkError"))
    } finally {
      setPlagChecking(false)
    }
  }

  const submissions: TeachingSubmission[] = useMemo(() => {
    const list = data?.data ?? []
    // Baholanmaganlar oldin, keyin baholanganlar — har biri ichida F.I.Sh. bo'yicha
    return [...list].sort((a, b) => {
      if (a.grade === null && b.grade !== null) return -1
      if (a.grade !== null && b.grade === null) return 1
      return compareNames(a.studentFullName, b.studentFullName)
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
      setSaveError(e instanceof Error ? e.message : t("natijalarOq.errorDefault"))
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
      setSaveError(e instanceof Error ? e.message : t("natijalarOq.errorDefault"))
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
        <ChevronLeft className="w-4 h-4" /> {t("baholashPageOq.back")}
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
                  {t("baholashPageOq.maxScore", { n: content.maxScore ?? "—" })}
                </span>
                {content.deadline && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: "#f5f3ff", color: "#6d28d9", fontFamily: "var(--font-poppins)" }}>
                    {t("baholashPageOq.deadline", { date: new Date(content.deadline).toLocaleDateString("uz-UZ") })}
                  </span>
                )}
                {(content.isActive === false || finalized) && (
                  <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                    <Lock className="w-3 h-3" /> {t("baholashPageOq.finalizedTag")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center px-4 py-2 rounded-[10px]" style={{ backgroundColor: "#f6f9ff", border: "1px solid rgba(1,41,112,0.08)" }}>
              <div className="text-2xl font-bold" style={T}>{submissions.length}</div>
              <div className="text-[10px] mt-0.5 font-medium" style={L}>{t("baholashPageOq.submittedStat")}</div>
            </div>
            <div className="text-center px-4 py-2 rounded-[10px]" style={{ backgroundColor: gradedCount === submissions.length && submissions.length > 0 ? "#f0fdf4" : "#f6f9ff", border: `1px solid ${gradedCount === submissions.length && submissions.length > 0 ? "rgba(21,128,61,0.15)" : "rgba(1,41,112,0.08)"}` }}>
              <div className="text-2xl font-bold" style={{ color: gradedCount === submissions.length && submissions.length > 0 ? "#15803d" : "#012970", fontFamily: "var(--font-poppins)" }}>{gradedCount}</div>
              <div className="text-[10px] mt-0.5 font-medium" style={L}>{t("baholashPageOq.gradedStat")}</div>
            </div>
            {submissions.length > 0 && (
              <button onClick={runPlagCheck} disabled={plagChecking}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-[8px] transition-colors hover:bg-[#f0f5ff] disabled:opacity-60 self-stretch"
                style={{ border: "1px solid #d8e6f7", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <ShieldAlert className={`w-3.5 h-3.5 ${plagChecking ? "animate-pulse" : ""}`} />
                {plagChecking ? t("common.checking") : t("typeContentOq.plag.run")}
              </button>
            )}
          </div>
        </div>
      </div>

      {plagError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] text-sm" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5", fontFamily: "var(--font-poppins)" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {plagError}
        </div>
      )}

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
          <p className="text-sm font-medium" style={T}>{t("baholashPageOq.noSubmissions")}</p>
        </div>
      ) : (
        <>
          <div className="text-xs px-1 font-medium" style={L}>
            {t("baholashPageOq.ungradedCount", { n: submissions.filter(s => s.grade === null).length })}
          </div>

          <div className="flex flex-col gap-3">
            {submissions.map(sub => {
              const isGraded = sub.grade !== null
              const isSavedNow = saved[sub.id]
              const isSaving = saving[sub.id]
              const gradeVal = grades[sub.id] ?? (sub.grade !== null ? String(sub.grade) : "")
              const feedbackVal = feedbacks[sub.id] ?? (sub.feedback ?? "")
              const plag = plagByStudent.get(sub.studentUserId)
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
                      <div className="text-xs mt-0.5" style={L}>{t("baholashPageOq.submittedAt", { date: fmtDate(sub.submittedAt) })}</div>
                      {sub.comment && <div className="text-xs mt-1 italic" style={L}>"{sub.comment}"</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      {plag && (
                        <button onClick={() => setOpenPlagFor(openPlagFor === sub.id ? null : sub.id)}
                          className="text-xs font-semibold px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
                          style={{
                            backgroundColor: plag.maxSimilarityPct >= 50 || plag.internetMatches.length > 0 ? "#fff0f0" : plag.maxSimilarityPct >= 20 ? "#fff8e6" : "#f0fdf4",
                            color: plag.maxSimilarityPct >= 50 || plag.internetMatches.length > 0 ? "#b91c1c" : plag.maxSimilarityPct >= 20 ? "#92400e" : "#15803d",
                            fontFamily: "var(--font-poppins)",
                          }}>
                          {t("plag.short", { pct: plag.maxSimilarityPct })}{plag.internetMatches.length > 0 ? " · web" : ""}
                        </button>
                      )}
                      {(isGraded || isSavedNow) && (
                        <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                          <CheckCircle className="w-3.5 h-3.5" />
                          {t("baholashPageOq.gradedBadge", { grade: sub.grade !== null ? sub.grade : gradeVal })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Antiplagiat tafsiloti */}
                  {plag && openPlagFor === sub.id && (
                    <div className="rounded-[8px] p-3 flex flex-col gap-2" style={{ backgroundColor: "#f6f9ff" }}>
                      <p className="text-xs" style={L}>
                        {plag.matchedStudentName ? t("typeContentOq.plag.mostSimilar", { name: plag.matchedStudentName }) : t("typeContentOq.plag.noSimilar")}
                      </p>
                      {!plag.internetEnabled ? (
                        <p className="text-xs" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
                          {t("plag.noApiKeyShort")}
                        </p>
                      ) : plag.internetMatches.length === 0 ? (
                        <p className="text-xs" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>{t("typeContentOq.plag.noInternetMatch")}</p>
                      ) : (
                        plag.internetMatches.map((m, i) => (
                          <a key={i} href={m.link} target="_blank" rel="noreferrer"
                            className="flex items-start gap-2 text-xs p-2 rounded-[6px] bg-white transition-colors hover:bg-[#eef4ff]"
                            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#0e58a8" }} />
                            <div className="min-w-0">
                              <p className="font-medium truncate" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{m.title || m.link}</p>
                              <p className="mt-0.5" style={L}>{m.snippet}</p>
                            </div>
                          </a>
                        ))
                      )}
                    </div>
                  )}

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
                          {t("baholashPageOq.gradeLabel", { range: content.maxScore !== null ? `(0–${content.maxScore})` : "" })}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={content.maxScore ?? undefined}
                          value={gradeVal}
                          onChange={e => setGrades(prev => ({ ...prev, [sub.id]: e.target.value }))}
                          placeholder={t("baholashPageOq.gradePlaceholder")}
                          className="w-24 px-3 py-2 rounded-[8px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none bg-white"
                          style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
                        />
                      </div>
                      <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                        <label className="text-xs font-medium" style={L}>{t("baholashPageOq.feedbackLabel")}</label>
                        <input
                          type="text"
                          value={feedbackVal}
                          onChange={e => setFeedbacks(prev => ({ ...prev, [sub.id]: e.target.value }))}
                          placeholder={t("baholashPageOq.feedbackPlaceholder")}
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
                        {isSaving ? t("baholashPageOq.saving") : t("baholashPageOq.save")}
                      </button>
                    </div>
                  )}
                  {/* Locked grade display */}
                  {(isGraded || isSavedNow) && (
                    <div className="flex items-center gap-2 text-xs" style={L}>
                      <Lock className="w-3 h-3" />
                      {t("baholashPageOq.lockedGrade")}
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
                <div className="text-sm font-semibold" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>{t("baholashPageOq.allGradedTitle")}</div>
                <div className="text-xs mt-0.5" style={{ color: "#b45309", fontFamily: "var(--font-poppins)" }}>
                  {t("baholashPageOq.allGradedHint")}
                </div>
              </div>
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                style={{ backgroundColor: "#d97706", fontFamily: "var(--font-poppins)" }}
              >
                <Lock className="w-4 h-4" />
                {finalizing ? t("baholashPageOq.closing") : t("baholashPageOq.finalizeBtn")}
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
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const [groupId, setGroupId] = useState<number | "">("")
  const [academicYear, setAcademicYear] = useState("")
  const [subjectName, setSubjectName] = useState("")
  const [selectedContent, setSelectedContent] = useState<TeacherContent | null>(null)
  // Ro'yxat yuklangach avtomatik ochiladigan topshiriq (bildirishnoma/panel orqali)
  const [openContentId, setOpenContentId] = useState<number | null>(null)

  const { data: groupsRes, loading: lGroups, error: eGroups } = useApi(() => teachingApi.groups(), [])
  const groups = groupsRes?.data ?? []

  const { data: pendingRes, refetch: refetchPending } = useApi(() => teachingApi.gradingPending(), [])
  const pending = useMemo(() => pendingRes?.data ?? [], [pendingRes])
  const pendingTotal = pending.reduce((s, p) => s + p.count, 0)
  const pendingByGroup = useMemo(() => {
    const m = new Map<number, number>()
    for (const p of pending) if (p.groupId != null) m.set(p.groupId, (m.get(p.groupId) ?? 0) + p.count)
    return m
  }, [pending])
  const pendingByContent = useMemo(() => new Map(pending.map(p => [p.contentId, p.count])), [pending])

  function openPending(p: { groupId: number | null; subjectName: string; contentId: number }) {
    if (p.groupId == null) return
    setAcademicYear("")
    setGroupId(p.groupId)
    setSubjectName(p.subjectName)
    setSelectedContent(null)
    setOpenContentId(p.contentId)
  }

  // Bildirishnomadan kelganda (?group=&subject=&content=) — o'sha topshiriq ochiladi
  useEffect(() => {
    const g = Number(searchParams.get("group"))
    const s = searchParams.get("subject")
    if (!g || !s) return
    openPending({ groupId: g, subjectName: s, contentId: Number(searchParams.get("content")) || 0 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Faqat aniq bir yil tanlanganda HEMIS'dan so'raladi — o'sha yilda dars
  // bergan guruhlar, o'tganlari ham (joriy /groups faqat so'nggi
  // sinxronizatsiya + kontenti bor guruhlarni beradi).
  const { data: yearGroupsRes } = useApi(
    () => academicYear ? teachingApi.groupsByYear(academicYear) : Promise.resolve(null),
    [academicYear]
  )
  const yearGroups = yearGroupsRes?.data ?? []

  const displayGroups = useMemo(() => {
    if (!academicYear) return groups
    return [...yearGroups].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  }, [academicYear, groups, yearGroups])

  // Baholanmagan ishi bor, lekin joriy ro'yxatda yo'q (o'tgan yilgi) guruh ham tanlovda chiqadi
  const groupOptions = useMemo(() => {
    const list = displayGroups.map(g => ({ id: g.id, name: g.name }))
    if (academicYear) return list
    const known = new Set(list.map(g => g.id))
    for (const p of pending) {
      if (p.groupId == null || known.has(p.groupId)) continue
      known.add(p.groupId)
      list.push({ id: p.groupId, name: p.groupName ?? String(p.groupId) })
    }
    return list
  }, [displayGroups, academicYear, pending])

  function handleYearChange(val: string) {
    setAcademicYear(val)
    setGroupId("")
    setSubjectName("")
    setOpenContentId(null)
  }

  const { data: subjectsRes } = useApi(
    () => groupId !== "" ? teachingApi.mySubjects(groupId as number) : Promise.resolve(null),
    [groupId]
  )
  const subjects = useMemo(() => {
    const fromContent = subjectsRes?.data?.map(s => s.subjectName) ?? []
    const fromHemis = academicYear
      ? (yearGroups.find(g => g.id === groupId)?.subjects ?? [])
      : []
    const fromPending = pending.filter(p => p.groupId === groupId).map(p => p.subjectName)
    return [...new Set([...fromContent, ...fromHemis, ...fromPending])].sort()
  }, [subjectsRes, academicYear, yearGroups, groupId, pending])

  const pendingBySubject = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of pending) if (p.groupId === groupId) m.set(p.subjectName, (m.get(p.subjectName) ?? 0) + p.count)
    return m
  }, [pending, groupId])

  const ready = groupId !== "" && subjectName !== ""

  const { data: contentRes, loading: lContent, error: eContent } = useApi(
    () => ready ? teachingApi.content({ type: "assignment", group: groupId as number, subject: subjectName }) : Promise.resolve(null),
    [groupId, subjectName, ready]
  )
  const assignments = useMemo(() => [...(contentRes?.data ?? [])].sort(byTopicNumber), [contentRes])

  useEffect(() => {
    if (openContentId == null) return
    const found = assignments.find(a => a.id === openContentId)
    if (!found) return
    setSelectedContent(found)
    setOpenContentId(null)
  }, [openContentId, assignments])

  function backToList() {
    setSelectedContent(null)
    refetchPending()
  }

  if (lGroups) return <Loading />
  if (eGroups) return <ApiError message={eGroups} onRetry={() => window.location.reload()} />

  // Breadcrumb style
  if (selectedContent) {
    return (
      <div className="flex flex-col gap-5 p-[30px]">
        <div>
          <h1 className="text-[28px] font-medium" style={T}>{t("baholashPageOq.pageTitle")}</h1>
          <p className="text-sm mt-1" style={L}>{t("baholashPageOq.subtitleSubmissions")}</p>
        </div>
        <SubmissionsList content={selectedContent} onBack={backToList} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={T}>{t("baholashPageOq.pageTitle")}</h1>
        <p className="text-sm mt-1" style={L}>{t("baholashPageOq.subtitleMain")}</p>
      </div>

      {/* Baholash kutayotgan ishlar — guruh, fan, topshiriq; bosilsa o'sha ochiladi */}
      {pending.length > 0 && (
        <div className="rounded-[10px] p-4 flex flex-col gap-3"
          style={{ backgroundColor: "#fff7ed", border: "1px solid rgba(234,88,12,0.25)" }}>
          <div className="flex items-center gap-2">
            <PulseDot />
            <span className="text-sm font-semibold" style={{ color: "#9a3412", fontFamily: "var(--font-poppins)" }}>
              {t("baholashPageOq.pendingTitle", { n: pendingTotal })}
            </span>
          </div>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
            {pending.map(p => (
              <button key={p.contentId} onClick={() => openPending(p)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] bg-white text-left transition-colors hover:bg-[#fffaf5]"
                style={{ border: "1px solid rgba(234,88,12,0.2)" }}>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                  style={{ backgroundColor: "#ea580c", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                  {p.groupName ?? "—"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={T}>{p.title}</div>
                  <div className="text-xs truncate" style={L}>
                    {p.subjectName}{p.lastStudent ? ` · ${t("baholashPageOq.lastStudent", { name: p.lastStudent })}` : ""}
                  </div>
                </div>
                <span className="text-xs font-semibold shrink-0" style={{ color: "#c2410c", fontFamily: "var(--font-poppins)" }}>
                  {t("baholashPageOq.newWorks", { n: p.count })}
                </span>
                <span className="text-xs shrink-0" style={{ color: "#c2410c" }}>→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-[10px] bg-white p-4" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1 min-w-[160px] flex-1">
            <label className="text-xs font-medium" style={L}>{t("baholashPageOq.academicYear")}</label>
            <select value={academicYear} onChange={e => handleYearChange(e.target.value)}
              className={sel} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              <option value="">{t("baholashPageOq.allYears")}</option>
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}-{y + 1}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[200px] flex-1">
            <label className="flex items-center gap-2 text-xs font-medium" style={L}>
              {t("baholashPageOq.group")}
              {pendingByGroup.size > 0 && (
                <span className="flex items-center gap-1.5 font-semibold" style={{ color: "#c2410c" }}>
                  <PulseDot /> {t("baholashPageOq.groupsWithNew", { n: pendingByGroup.size })}
                </span>
              )}
            </label>
            <select value={groupId}
              onChange={e => { setGroupId(Number(e.target.value) || ""); setSubjectName(""); setOpenContentId(null) }}
              className={sel} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              <option value="">{t("baholashPageOq.selectGroup")}</option>
              {groupOptions.map(g => {
                const n = pendingByGroup.get(g.id)
                return <option key={g.id} value={g.id}>{n ? `🔴 ${g.name} — ${t("baholashPageOq.newWorks", { n })}` : g.name}</option>
              })}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[220px] flex-1">
            <label className="text-xs font-medium" style={L}>{t("baholashPageOq.subject")}</label>
            <select value={subjectName} onChange={e => { setSubjectName(e.target.value); setOpenContentId(null) }}
              disabled={groupId === ""}
              className={sel}
              style={{ color: "#012970", fontFamily: "var(--font-poppins)", opacity: groupId === "" ? 0.5 : 1 }}>
              <option value="">{t("baholashPageOq.selectSubject")}</option>
              {subjects.map(s => {
                const n = pendingBySubject.get(s)
                return <option key={s} value={s}>{n ? `🔴 ${s} — ${t("baholashPageOq.newWorks", { n })}` : s}</option>
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Assignment list */}
      {!ready ? (
        <div className="rounded-[10px] bg-white p-14 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm font-medium" style={T}>{t("baholashPageOq.selectGroupSubject")}</p>
        </div>
      ) : lContent ? (
        <div className="rounded-[10px] bg-white p-8 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="w-7 h-7 border-2 border-[#0e58a8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={L}>{t("baholashPageOq.loading")}</p>
        </div>
      ) : eContent ? (
        <ApiError message={eContent} onRetry={() => {}} />
      ) : assignments.length === 0 ? (
        <div className="rounded-[10px] bg-white p-14 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm font-medium" style={T}>{t("baholashPageOq.notFound")}</p>
          <p className="text-xs mt-1" style={L}>{t("baholashPageOq.notFoundHint")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {assignments.map(content => {
            const newCount = pendingByContent.get(content.id) ?? 0
            return (
            <button
              key={content.id}
              onClick={() => setSelectedContent(content)}
              className="rounded-[10px] bg-white p-4 text-left flex items-center justify-between gap-4 hover:bg-[#f6f9ff] transition-colors"
              style={{
                border: newCount ? "1px solid rgba(234,88,12,0.45)" : "1px solid rgba(1,41,112,0.1)",
                boxShadow: "0px 0px 5px rgba(1,41,112,0.05)",
              }}
            >
              <div>
                <div className="text-sm font-semibold" style={T}>{content.title}</div>
                <div className="text-xs mt-0.5" style={L}>
                  {content.topicKey && <span>{content.topicKey} · </span>}
                  {t("baholashPageOq.maxScore", { n: content.maxScore ?? "—" })}
                  {content.deadline && <span> · {t("baholashPageOq.deadline", { date: new Date(content.deadline).toLocaleDateString("uz-UZ") })}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {newCount > 0 && (
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ backgroundColor: "#fff7ed", color: "#c2410c", fontFamily: "var(--font-poppins)" }}>
                    <PulseDot /> {t("baholashPageOq.newWorks", { n: newCount })}
                  </span>
                )}
                {content.isActive === false ? (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                    {t("baholashPageOq.finalizedBadge")}
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                    {t("baholashPageOq.activeBadge")}
                  </span>
                )}
                <span className="text-xs" style={{ color: "#0e58a8" }}>→</span>
              </div>
            </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
