"use client"

import { useMemo, useState } from "react"
import {
  RefreshCw, Search, ArrowLeft, Users2, CheckCircle2, XCircle,
  AlertCircle, Loader2, Undo2,
} from "lucide-react"
import { adminApi, type AdminExamListItem, type TeachingSubmission } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function controlTypeLabel(controlType: string | null, t: (k: string) => string) {
  if (controlType === "oraliq") return t("adminRetake.typeOraliq")
  if (controlType === "yakuniy") return t("adminRetake.typeYakuniy")
  return t("adminRetake.typeRegular")
}

/* ── Imtihonlar ro'yxati ── */
function ExamList({ onSelect }: { onSelect: (exam: AdminExamListItem) => void }) {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useApi(() => adminApi.examsList(), [])
  const exams = data?.data ?? []
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return exams
    return exams.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.subjectName.toLowerCase().includes(q) ||
      e.teacherName.toLowerCase().includes(q) ||
      e.groupName.toLowerCase().includes(q)
    )
  }, [exams, search])

  if (loading) return <Loading />
  if (error) return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={T}>{t("adminRetake.pageTitle")}</h1>
        <p className="text-sm mt-1" style={L}>{t("adminRetake.pageSubtitle")}</p>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#b0c2d8" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("adminRetake.searchPlaceholder")}
          className="w-full pl-9 pr-3 py-2.5 rounded-[8px] text-sm outline-none"
          style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[10px] bg-white p-16 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <RefreshCw className="w-10 h-10 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm font-semibold" style={T}>{t("adminRetake.emptyExams")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(exam => (
            <button key={exam.id} onClick={() => onSelect(exam)}
              className="text-left rounded-[10px] bg-white p-4 flex items-center justify-between gap-4 flex-wrap transition-colors hover:bg-[#f6f9ff]"
              style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate" style={T}>{exam.title}</div>
                <div className="text-xs mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5" style={L}>
                  <span>{exam.subjectName}</span>
                  <span>{exam.groupName}</span>
                  <span>{exam.teacherName}</span>
                  {exam.deadline && <span>{fmtDate(exam.deadline)}</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                    {controlTypeLabel(exam.controlType, t)}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ backgroundColor: "#f6f9ff", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    <Users2 className="w-2.5 h-2.5" />
                    {exam.submissionCount}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Tanlangan imtihon: natijalar + ruxsat berish ── */
function ExamDetail({ exam, onBack }: { exam: AdminExamListItem; onBack: () => void }) {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useApi(() => adminApi.contentSubmissions(exam.id), [exam.id])
  const submissions = useMemo(() => data?.data ?? [], [data])

  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [granting, setGranting] = useState(false)
  const [revokingId, setRevokingId] = useState<number | null>(null)
  const [opError, setOpError] = useState<string | null>(null)

  const visible = showAll ? submissions : submissions.filter(s => !s.passed)

  function toggleSelect(studentUserId: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(studentUserId)) next.delete(studentUserId)
      else next.add(studentUserId)
      return next
    })
  }

  async function handleGrant() {
    if (!selected.size) return
    setGranting(true)
    setOpError(null)
    try {
      await adminApi.grantRetake(exam.id, Array.from(selected))
      setSelected(new Set())
      await refetch()
    } catch (err) {
      setOpError(err instanceof Error ? err.message : t("adminRetake.grantError"))
    } finally {
      setGranting(false)
    }
  }

  async function handleRevoke(studentUserId: number) {
    setRevokingId(studentUserId)
    setOpError(null)
    try {
      await adminApi.revokeRetake(exam.id, studentUserId)
      await refetch()
    } catch (err) {
      setOpError(err instanceof Error ? err.message : t("adminRetake.revokeError"))
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-[8px] transition-colors hover:bg-[#f0f5ff] shrink-0"
          style={{ border: "1px solid rgba(1,41,112,0.15)" }}>
          <ArrowLeft className="w-4 h-4" style={{ color: "#0e58a8" }} />
        </button>
        <div className="min-w-0">
          <h1 className="text-[22px] font-medium truncate" style={T}>{exam.title}</h1>
          <p className="text-sm mt-0.5" style={L}>
            {exam.subjectName} · {exam.groupName} · {controlTypeLabel(exam.controlType, t)}
          </p>
        </div>
      </div>

      {opError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] text-sm"
          style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5", fontFamily: "var(--font-poppins)" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {opError}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : error ? (
        <ApiError message={error} onRetry={refetch} />
      ) : (
        <div className="rounded-[10px] bg-white overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="flex items-center justify-between gap-3 px-5 py-4 flex-wrap"
            style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
            <button onClick={() => setShowAll(v => !v)}
              className="text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors hover:bg-[#f6f9ff]"
              style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              {showAll ? t("adminRetake.onlyFailedToggle") : t("adminRetake.showAllToggle")}
            </button>
            <button onClick={handleGrant} disabled={!selected.size || granting}
              className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-semibold text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {selected.size
                ? t("adminRetake.selectedCount", { n: selected.size })
                : t("adminRetake.grantBtn")}
            </button>
          </div>

          {visible.length === 0 ? (
            <div className="p-14 text-center">
              <CheckCircle2 className="w-9 h-9 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
              <p className="text-sm font-semibold" style={T}>{t("adminRetake.noFailedStudents")}</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {visible.map((sub: TeachingSubmission & { passed: boolean }) => (
                <div key={sub.id} className="flex items-center gap-3 px-5 py-3.5 flex-wrap"
                  style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                  <input
                    type="checkbox"
                    checked={selected.has(sub.studentUserId)}
                    onChange={() => toggleSelect(sub.studentUserId)}
                    disabled={sub.passed}
                    className="w-4 h-4 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={T}>
                      {sub.studentFullName}
                      {sub.retakeGranted && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium align-middle"
                          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                          <RefreshCw className="w-2.5 h-2.5" />
                          {t("adminRetake.grantedBadge")}
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={L}>
                      {fmtDate(sub.submittedAt)} · {t("adminRetake.scoreLabel", { n: sub.grade ?? 0 })}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shrink-0"
                    style={sub.passed
                      ? { backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }
                      : { backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                    {sub.passed ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                    {sub.passed ? t("adminRetake.statusPassed") : t("adminRetake.statusFailed")}
                  </span>
                  {sub.retakeGranted && (
                    <button onClick={() => handleRevoke(sub.studentUserId)} disabled={revokingId === sub.studentUserId}
                      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-[6px] shrink-0 transition-colors hover:bg-red-50 disabled:opacity-60"
                      style={{ color: "#dc2626", fontFamily: "var(--font-poppins)" }}>
                      {revokingId === sub.studentUserId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                      {t("adminRetake.revokeBtn")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminRetakePage() {
  const [exam, setExam] = useState<AdminExamListItem | null>(null)
  return exam
    ? <ExamDetail exam={exam} onBack={() => setExam(null)} />
    : <ExamList onSelect={setExam} />
}
