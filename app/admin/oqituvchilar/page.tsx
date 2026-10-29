"use client"

import React, { useEffect, useState, useCallback, useMemo } from "react"
import {
  BookOpen, Video, CalendarCheck, CheckCircle2,
  RefreshCw, TrendingUp, ChevronDown, ChevronUp, Clock,
  FileText, Search, ChevronLeft, ChevronRight, Music, Layers, Users, Clapperboard, ClipboardList,
  ExternalLink, FileSpreadsheet, Send, Loader2, GraduationCap, X, Presentation, ListChecks,
} from "lucide-react"
import { adminApi, type AdminTeacherStat, type AdminTeacherTopic, type AdminTeacherTopicContent, type AdminExamQuestion } from "@/lib/api"
import { exportToExcel, exportToPdf, buildPdfBase64 } from "@/lib/exportUtils"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { motion, pageVariants } from "@/components/ui/motion"
import { PersonAvatar } from "@/components/ui/PersonAvatar"

// Admin.css tokenlari — qorong'i rejimda o'zi almashadi
const T = { color: "var(--adm-text)" } as const
const L = { color: "var(--adm-muted)" } as const
const PAGE_SIZE = 10

type CssVars = React.CSSProperties & Record<`--${string}`, string>

// Ko'rsatkich ranglari (admin.css'dagi kategoriya/rol tokenlari)
const C = {
  topic: "var(--adm-accent)",
  video: "var(--cat-2)",
  audio: "var(--cat-3)",
  presentation: "var(--role-dean)",
  test: "var(--role-admin)",
  group: "var(--role-dean)",
  meeting: "var(--cat-1)",
  students: "var(--adm-up)",
  qollanma: "#0891b2",
  assignment: "var(--role-pending)",
}

/** 2026.10.14 — Intl'siz (brauzerda uz locale ma'lumotlari yo'q, "2026 M10 14" chiqarardi) */
function fmtDate(s: string) {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return "—"
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

function pageNums(cur: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const nums: (number | "...")[] = [0]
  const l = Math.max(1, cur - 1), r = Math.min(total - 2, cur + 1)
  if (l > 1) nums.push("...")
  for (let i = l; i <= r; i++) nums.push(i)
  if (r < total - 2) nums.push("...")
  nums.push(total - 1)
  return nums
}

interface RowState {
  expanded: boolean
  loading: boolean
  topics: AdminTeacherTopic[]
  topicSearch: string
}

/** Jadvaldagi raqamli ko'rsatkich — nol bo'lsa xira */
function MetricPill({ icon: Icon, value, color }: { icon: React.ElementType; value: number; color: string }) {
  return (
    <span className="adm-pill font-semibold" style={{ "--c": color, opacity: value > 0 ? 1 : 0.5 } as CssVars}>
      <Icon className="h-3.5 w-3.5" />
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </span>
  )
}

/** Kichikroq yorliq (mavzu ichidagi materiallar, guruh nomlari) */
const SMALL_PILL: React.CSSProperties = { padding: "1px 7px", fontSize: 11, borderRadius: 6 }

function ContentBadge({ active, icon: Icon, label, color }: {
  active: boolean
  icon: React.ElementType
  label: string
  color: string
}) {
  return (
    <span className="adm-pill"
      style={{ ...SMALL_PILL, borderRadius: 9999, "--c": active ? color : "var(--adm-muted)", opacity: active ? 1 : 0.45 } as CssVars}>
      <Icon className="h-3 w-3" />{label}
    </span>
  )
}

const CONTENT_KIND_LABEL_KEY: Record<string, string> = {
  video_lesson: "adminOqituvchilar.contentKindVideo", audio: "adminOqituvchilar.contentKindAudio",
  theory: "adminOqituvchilar.contentKindTheory", qollanma: "adminOqituvchilar.contentKindQollanma", youtube: "adminOqituvchilar.contentKindYoutube",
}

function ExamQuestionsPreview({ contentId }: { contentId: number }) {
  const { t } = useLanguage()
  const [questions, setQuestions] = useState<AdminExamQuestion[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminApi.contentQuestions(contentId)
      .then(r => { if (!cancelled) setQuestions(r.data ?? []) })
      .catch(() => { if (!cancelled) setQuestions([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [contentId])

  if (loading) return <div className="flex items-center justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-[var(--adm-accent)]" /></div>
  if (!questions || questions.length === 0) return <p className="px-2 py-2 text-xs" style={L}>{t("adminOqituvchilar.noQuestions")}</p>

  return (
    <div className="mt-2 flex flex-col gap-2 pl-3" style={{ borderLeft: "2px solid color-mix(in srgb, var(--adm-accent) 25%, transparent)" }}>
      {questions.map((q, qi) => (
        <div key={q.id} className="text-xs">
          <p className="font-medium" style={T}>{qi + 1}. {q.questionText} <span style={L}>{t("adminOqituvchilar.pointsLabel", { points: q.points })}</span></p>
          <div className="ml-3 mt-1 flex flex-col gap-0.5">
            {q.options.map((opt, oi) => {
              const isCorrect = q.correctIndexes?.includes(oi) ?? oi === q.correctIndex
              return (
                <span key={oi} className="flex items-center gap-1.5" style={{ color: isCorrect ? "var(--adm-up)" : "var(--adm-muted)", fontWeight: isCorrect ? 600 : 400 }}>
                  {isCorrect ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <span className="h-3 w-3 shrink-0" />}
                  {opt}
                </span>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function TopicContentDetail({ teacherHemisId, topicKey }: { teacherHemisId: string; topicKey: string }) {
  const { t } = useLanguage()
  const [items, setItems] = useState<AdminTeacherTopicContent[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedTest, setExpandedTest] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminApi.teacherTopicContent(teacherHemisId, topicKey)
      .then(r => { if (!cancelled) setItems(r.data ?? []) })
      .catch(() => { if (!cancelled) setItems([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [teacherHemisId, topicKey])

  if (loading) return <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-[var(--adm-accent)]" /></div>
  if (!items || items.length === 0) return <p className="px-5 py-3 text-xs" style={L}>{t("adminOqituvchilar.noMaterial")}</p>

  return (
    <div className="flex flex-col gap-2 px-5 pb-3">
      {items.map(it => {
        const isTest = it.type === "exam"
        const testOpen = expandedTest === it.id
        return (
          <div key={it.id} className="rounded-xl px-3 py-2" style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="adm-pill shrink-0 font-semibold" style={{ ...SMALL_PILL, "--c": "var(--adm-accent)" } as CssVars}>
                  {isTest ? t("adminOqituvchilar.itemTypeTest") : it.type === "assignment" ? t("adminOqituvchilar.itemTypeAssignment") : (CONTENT_KIND_LABEL_KEY[it.kind ?? ""] ? t(CONTENT_KIND_LABEL_KEY[it.kind ?? ""]) : it.kind)}
                </span>
                <span className="truncate text-sm" style={T}>
                  {/* Maks. ball berilmagan bo'lsa tizim 100 deb hisoblaydi */}
                  {it.fileName ?? (it.meetingLink ? it.meetingLink : isTest ? t("adminOqituvchilar.maxScoreLabel", { value: it.maxScore ?? 100 }) : it.title)}
                </span>
                {isTest && it.questionCount != null && (
                  <span className="adm-pill shrink-0 font-semibold"
                    style={{ ...SMALL_PILL, "--c": it.questionCount > 0 ? "var(--adm-up)" : "var(--role-admin)" } as CssVars}>
                    {it.questionCount > 0
                      ? t("adminOqituvchilar.questionCount", { n: it.questionCount })
                      : t("adminOqituvchilar.noQuestionsHidden")}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {isTest && (
                  <button onClick={() => setExpandedTest(testOpen ? null : it.id)}
                    className="adm-hover-row rounded-lg px-2 py-1 text-xs font-semibold text-[var(--adm-accent)]">
                    {testOpen ? t("adminOqituvchilar.closeBtn") : t("adminOqituvchilar.viewQuestionsBtn")}
                  </button>
                )}
                {it.fileName && (
                  <a href={adminApi.contentFileUrl(it.id)} target="_blank" rel="noreferrer" className="adm-hover-row rounded-lg p-1.5 text-[var(--adm-accent)]">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {it.meetingLink && (
                  <a href={it.meetingLink} target="_blank" rel="noreferrer" className="adm-hover-row rounded-lg p-1.5 text-[var(--adm-accent)]">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
            {isTest && testOpen && <ExamQuestionsPreview contentId={it.id} />}
          </div>
        )
      })}
    </div>
  )
}

/* Bir mavzu o'qituvchining har guruhida alohida yozuv (topicKey) — admin
   uchun fan + tur + nom bo'yicha bitta qatorga birlashtiriladi (aks holda 4
   guruhli mavzu "4 ta bir xil mavzu" bo'lib ko'rinardi). */
interface MergedTopic {
  id: string
  title: string
  subjectName: string | null
  trainingType: string | null
  instances: AdminTeacherTopic[]
  has: Record<"video" | "audio" | "theory" | "qollanma" | "youtube" | "test" | "assignment", boolean>
}

const TRAINING_TYPE_KEYS: Record<string, string> = {
  "Ma'ruza": "fanResurslariOq.trainingType.lecture",
  "Amaliyot": "fanResurslariOq.trainingType.practice",
  "Mustaqil ish": "fanResurslariOq.trainingType.independentStudy",
}

function mergeAdminTopics(topics: AdminTeacherTopic[]): MergedTopic[] {
  const map = new Map<string, MergedTopic>()
  for (const tp of topics) {
    const id = `${tp.subjectName ?? ""}|${tp.trainingType ?? ""}|${tp.title.trim().toLowerCase()}`
    let m = map.get(id)
    if (!m) {
      m = {
        id, title: tp.title, subjectName: tp.subjectName, trainingType: tp.trainingType, instances: [],
        has: { video: false, audio: false, theory: false, qollanma: false, youtube: false, test: false, assignment: false },
      }
      map.set(id, m)
    }
    m.instances.push(tp)
    m.has.video ||= tp.hasVideo
    m.has.audio ||= tp.hasAudio
    m.has.theory ||= tp.hasTheory
    m.has.qollanma ||= tp.hasQollanma
    m.has.youtube ||= tp.hasYoutube
    m.has.test ||= tp.hasTest
    m.has.assignment ||= tp.hasAssignment
  }
  for (const m of map.values()) {
    m.instances.sort((a, b) => (a.groupName ?? "").localeCompare(b.groupName ?? "", undefined, { numeric: true }))
  }
  return Array.from(map.values())
}

function TeacherTopicsTable({ teacherHemisId, state, onChange }: {
  teacherHemisId: string
  state: RowState
  onChange: (patch: Partial<RowState>) => void
}) {
  const { t } = useLanguage()
  const { topics, topicSearch } = state
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)

  const filtered = useMemo(() =>
    mergeAdminTopics(topics).filter(tp => !topicSearch.trim() || tp.title.toLowerCase().includes(topicSearch.toLowerCase())),
    [topics, topicSearch]
  )

  if (state.loading)
    return <div className="flex items-center justify-center py-8"><RefreshCw className="h-4 w-4 animate-spin text-[var(--adm-accent)]" /></div>

  if (!topics.length)
    return (
      <div className="py-7 text-center">
        <BookOpen className="mx-auto mb-2 h-6 w-6 opacity-40" style={L} />
        <p className="text-sm" style={L}>{t("adminOqituvchilar.noTopicsForTeacher")}</p>
      </div>
    )

  return (
    <div>
      {/* Mavzu qidiruvi */}
      <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
        <label className="adm-input flex h-9 w-full max-w-[300px] items-center gap-2 rounded-lg px-2.5">
          <Search className="h-3.5 w-3.5 shrink-0" style={L} />
          <input value={topicSearch} onChange={e => onChange({ topicSearch: e.target.value })}
            placeholder={t("adminOqituvchilar.topicSearchPlaceholder")}
            className="w-full bg-transparent text-xs text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]" />
        </label>
        <span className="ml-auto text-xs" style={L}>{t("adminOqituvchilar.topicsCountHint", { n: filtered.length })}</span>
      </div>

      {/* Mavzular jadvali */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
              {[t("adminOqituvchilar.colIndex"), t("adminOqituvchilar.colTopic"), t("adminOqituvchilar.colSubject"), t("adminOqituvchilar.colGroup"), t("adminOqituvchilar.colMaterials")].map(h => (
                <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={L}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((tp, i) => {
              const isOpen = expandedTopic === tp.id
              const typeKey = tp.trainingType ? TRAINING_TYPE_KEYS[tp.trainingType] : undefined
              return (
                <React.Fragment key={tp.id}>
                  <tr className="adm-hover-row cursor-pointer" data-active={isOpen}
                    style={{ borderBottom: isOpen ? "none" : "1px solid var(--adm-border)" }}
                    onClick={() => setExpandedTopic(isOpen ? null : tp.id)}>
                    <td className="w-10 px-5 py-3 text-xs" style={L}>{i + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="adm-icon-soft flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ "--c": "var(--adm-accent)" } as CssVars}>
                          <BookOpen className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm font-medium" style={T}>{tp.title}</span>
                        {tp.trainingType && (
                          <span className="adm-pill shrink-0 font-semibold" style={{ ...SMALL_PILL, borderRadius: 9999, "--c": "var(--adm-accent)" } as CssVars}>
                            {typeKey ? t(typeKey) : tp.trainingType}
                          </span>
                        )}
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5 shrink-0" style={L} /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" style={L} />}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: "var(--adm-text-2)" }}>{tp.subjectName ?? "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tp.instances.map(inst => (
                          <span key={inst.topicKey} className="adm-pill" style={SMALL_PILL}>
                            {inst.groupName ?? (inst.groupId ? `#${inst.groupId}` : "—")}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        <ContentBadge active={tp.has.video} icon={Video} label={t("adminOqituvchilar.contentKindVideo")} color={C.video} />
                        <ContentBadge active={tp.has.audio} icon={Music} label={t("adminOqituvchilar.contentKindAudio")} color={C.audio} />
                        <ContentBadge active={tp.has.theory} icon={Presentation} label={t("adminOqituvchilar.contentKindTheory")} color={C.presentation} />
                        <ContentBadge active={tp.has.qollanma} icon={Layers} label={t("adminOqituvchilar.contentKindQollanma")} color={C.qollanma} />
                        <ContentBadge active={tp.has.youtube} icon={Clapperboard} label={t("adminOqituvchilar.contentKindYoutube")} color={C.test} />
                        <ContentBadge active={tp.has.test} icon={ListChecks} label={t("adminOqituvchilar.itemTypeTest")} color={C.test} />
                        <ContentBadge active={tp.has.assignment} icon={ClipboardList} label={t("adminOqituvchilar.itemTypeAssignment")} color={C.assignment} />
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={5} style={{ backgroundColor: "color-mix(in srgb, var(--adm-accent) 4%, var(--adm-card))", borderBottom: "1px solid var(--adm-border)" }}>
                        {/* Har bir guruhdagi nusxaning materiallari alohida */}
                        {tp.instances.map(inst => (
                          <div key={inst.topicKey} className="pt-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                            {tp.instances.length > 1 && (
                              <p className="px-5 pb-2 text-xs font-semibold" style={T}>
                                {inst.groupName ?? (inst.groupId ? `#${inst.groupId}` : "—")}
                              </p>
                            )}
                            <TopicContentDetail teacherHemisId={teacherHemisId} topicKey={inst.topicKey} />
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, color, value, label, loading }: {
  icon: React.ElementType
  color: string
  value: number
  label: string
  loading: boolean
}) {
  return (
    <div className="adm-card flex items-center gap-3 p-3.5 sm:gap-3.5 sm:p-5" style={{ "--c": color } as CssVars}>
      <div className="adm-icon-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12">
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="min-w-0">
        {loading ? (
          <div className="my-1 h-6 w-14 animate-pulse rounded-md bg-[var(--adm-grid)]" />
        ) : (
          <div className="text-2xl font-bold leading-tight text-[var(--adm-text)]" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</div>
        )}
        <div className="truncate text-sm text-[var(--adm-text-2)]">{label}</div>
      </div>
    </div>
  )
}

export default function AdminOqituvchilar() {
  const { t } = useLanguage()
  const [stats, setStats] = useState<AdminTeacherStat[]>([])
  const [loading, setLoading] = useState(true)
  // Birinchi yuklash tugaguncha skelet; keyingi yangilashlarda jadval xira tortadi xolos
  const [loaded, setLoaded] = useState(false)
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    adminApi.teacherStats()
      .then(res => { setStats(res.data ?? []); setLoaded(true) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() =>
    stats.filter(s => !search.trim() || s.fullName.toLowerCase().includes(search.toLowerCase())),
    [stats, search]
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage = Math.min(page, pageCount - 1)
  const slice = filtered.slice(curPage * PAGE_SIZE, (curPage + 1) * PAGE_SIZE)

  // Har o'qituvchining mavzulari alohida — yig'indi takrorsiz jami
  const totals = useMemo(() => stats.reduce(
    (acc, s) => ({
      topics: acc.topics + s.mavzular,
      videos: acc.videos + s.videolar,
      presentations: acc.presentations + s.taqdimotlar,
      guides: acc.guides + s.qollanmalar,
      tests: acc.tests + s.testlar,
      assignments: acc.assignments + s.topshiriqlar,
      meetings: acc.meetings + s.meetingCount,
    }),
    { topics: 0, videos: 0, presentations: 0, guides: 0, tests: 0, assignments: 0, meetings: 0 }
  ), [stats])

  function patchRow(hemisId: string, patch: Partial<RowState>) {
    setRows(prev => ({ ...prev, [hemisId]: { ...prev[hemisId], ...patch } }))
  }

  async function toggleExpand(hemisId: string) {
    const cur = rows[hemisId]
    if (cur?.expanded) { patchRow(hemisId, { expanded: false }); return }
    if (cur?.topics?.length > 0) { patchRow(hemisId, { expanded: true }); return }
    setRows(prev => ({ ...prev, [hemisId]: { expanded: true, loading: true, topics: [], topicSearch: "" } }))
    try {
      const res = await adminApi.teacherTopics(hemisId)
      setRows(prev => ({ ...prev, [hemisId]: { ...prev[hemisId], loading: false, topics: res.data ?? [] } }))
    } catch {
      setRows(prev => ({ ...prev, [hemisId]: { ...prev[hemisId], loading: false } }))
    }
  }

  const lectureLabel = t("fanResurslariOq.trainingType.lecture")
  const practiceLabel = t("fanResurslariOq.trainingType.practice")
  const independentLabel = t("fanResurslariOq.trainingType.independentStudy")

  const reportColumns = [
    t("adminOqituvchilar.colIndex"), t("adminOqituvchilar.reportColTeacher"), t("adminOqituvchilar.reportColTopics"),
    lectureLabel, practiceLabel, independentLabel,
    t("adminOqituvchilar.reportColVideos"), t("adminOqituvchilar.reportColAudios"), t("adminOqituvchilar.reportColPresentations"),
    t("adminOqituvchilar.reportColGuides"), t("adminOqituvchilar.reportColTests"), t("adminOqituvchilar.reportColAssignments"),
    t("adminOqituvchilar.reportColGroups"), t("adminOqituvchilar.reportColMeetings"), t("adminOqituvchilar.reportColStudents"),
    t("adminOqituvchilar.reportColLastActivity"),
  ]
  const reportRows = (): (string | number)[][] =>
    filtered.map((s, i) => [i + 1, s.fullName, s.mavzular, s.mavzuMaruza ?? 0, s.mavzuAmaliyot ?? 0, s.mavzuMustaqil ?? 0, s.videolar, s.audiolar, s.taqdimotlar, s.qollanmalar, s.testlar, s.topshiriqlar, s.guruhlar, s.meetingCount, s.studentsCompleted, fmtDate(s.lastSeen)])

  function doExportExcel() {
    exportToExcel("oqituvchi-hisoboti", [{
      name: t("adminOqituvchilar.exportSheetName"),
      rows: filtered.map((s, i) => ({
        [t("adminOqituvchilar.colIndex")]: i + 1, [t("adminOqituvchilar.reportColTeacher")]: s.fullName, [t("adminOqituvchilar.reportColTopics")]: s.mavzular,
        [lectureLabel]: s.mavzuMaruza ?? 0, [practiceLabel]: s.mavzuAmaliyot ?? 0, [independentLabel]: s.mavzuMustaqil ?? 0,
        [t("adminOqituvchilar.reportColVideos")]: s.videolar, [t("adminOqituvchilar.reportColAudios")]: s.audiolar,
        [t("adminOqituvchilar.reportColPresentations")]: s.taqdimotlar, [t("adminOqituvchilar.reportColGuides")]: s.qollanmalar,
        [t("adminOqituvchilar.reportColTests")]: s.testlar, [t("adminOqituvchilar.reportColAssignments")]: s.topshiriqlar,
        [t("adminOqituvchilar.reportColGroups")]: s.guruhlar, [t("adminOqituvchilar.reportColMeetings")]: s.meetingCount, [t("adminOqituvchilar.reportColStudents")]: s.studentsCompleted,
        [t("adminOqituvchilar.reportColLastActivity")]: fmtDate(s.lastSeen),
      })),
    }])
  }

  function doExportPdf() {
    exportToPdf("oqituvchi-hisoboti", t("adminOqituvchilar.exportPdfTitle"), reportColumns, reportRows(), t("adminOqituvchilar.exportPdfSubtitle"))
  }

  const [sendingTelegram, setSendingTelegram] = useState(false)
  const [telegramMsg, setTelegramMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function doSendTelegram() {
    setSendingTelegram(true)
    setTelegramMsg(null)
    try {
      const pdfBase64 = buildPdfBase64(t("adminOqituvchilar.exportPdfTitle"), reportColumns, reportRows(), t("adminOqituvchilar.exportPdfSubtitle"))
      const res = await adminApi.sendReportTelegram({ filename: "oqituvchi-hisoboti.pdf", caption: t("adminOqituvchilar.exportPdfTitle"), pdfBase64 })
      setTelegramMsg({ ok: true, text: res.message || t("adminOqituvchilar.telegramSent") })
    } catch (e) {
      setTelegramMsg({ ok: false, text: e instanceof Error ? e.message : t("adminOqituvchilar.telegramError") })
    } finally {
      setSendingTelegram(false)
    }
  }

  const headCls = "px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--adm-muted)] whitespace-nowrap"

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="flex flex-col gap-5 px-4 pb-8 pt-2 sm:px-8">
      {/* Sarlavha */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="adm-icon-soft flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ "--c": "var(--adm-accent)" } as CssVars}>
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-[var(--adm-text)] sm:text-[30px]">{t("adminOqituvchilar.exportPdfTitle")}</h1>
            <p className="mt-0.5 text-sm text-[var(--adm-muted)]">{t("adminOqituvchilar.pageSubtitle")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={doExportExcel} disabled={!filtered.length}
            className="adm-btn-outline flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{ color: "var(--adm-up)", boxShadow: "var(--adm-shadow)" }}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </button>
          <button onClick={doExportPdf} disabled={!filtered.length}
            className="adm-btn-outline flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{ color: "var(--role-admin)", boxShadow: "var(--adm-shadow)" }}>
            <FileText className="h-4 w-4" /> PDF
          </button>
          <button onClick={doSendTelegram} disabled={!filtered.length || sendingTelegram}
            className="adm-btn-outline flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{ boxShadow: "var(--adm-shadow)" }}>
            {sendingTelegram ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Telegram
          </button>
          <button onClick={load}
            className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            style={{ boxShadow: "var(--adm-shadow)" }}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> {t("adminOqituvchilar.refreshBtn")}
          </button>
        </div>
      </div>

      {telegramMsg && (
        <span className="adm-pill w-fit" style={{ "--c": telegramMsg.ok ? "var(--adm-up)" : "var(--role-admin)" } as CssVars}>
          {telegramMsg.text}
        </span>
      )}

      {/* Qisqa xulosa — har bir material turi alohida */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard icon={GraduationCap} color="var(--role-teacher)" value={stats.length} label={t("adminOqituvchilar.exportSheetName")} loading={!loaded} />
          <StatCard icon={BookOpen} color={C.topic} value={totals.topics} label={t("adminOqituvchilar.reportColTopics")} loading={!loaded} />
          <StatCard icon={Video} color={C.video} value={totals.videos} label={t("adminOqituvchilar.reportColVideos")} loading={!loaded} />
          <StatCard icon={Presentation} color={C.presentation} value={totals.presentations} label={t("adminOqituvchilar.reportColPresentations")} loading={!loaded} />
          <StatCard icon={Layers} color={C.qollanma} value={totals.guides} label={t("adminOqituvchilar.reportColGuides")} loading={!loaded} />
          <StatCard icon={ListChecks} color={C.test} value={totals.tests} label={t("adminOqituvchilar.reportColTests")} loading={!loaded} />
          <StatCard icon={ClipboardList} color={C.assignment} value={totals.assignments} label={t("adminOqituvchilar.reportColAssignments")} loading={!loaded} />
          <StatCard icon={CalendarCheck} color={C.meeting} value={totals.meetings} label={t("adminOqituvchilar.reportColMeetings")} loading={!loaded} />
        </div>
        <p className="px-1 text-xs" style={L}>{t("adminOqituvchilar.countRuleHint")}</p>
      </div>

      {/* Qidiruv */}
      <div className="adm-card flex flex-wrap items-center gap-3 p-3 sm:p-4">
        <label className="adm-input flex h-10 w-full items-center gap-2 rounded-xl px-3 sm:w-[360px]">
          <Search className="h-4 w-4 shrink-0 text-[var(--adm-muted)]" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder={t("adminOqituvchilar.searchPlaceholder")}
            className="w-full min-w-0 bg-transparent text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]" />
          {search && (
            <button onClick={() => { setSearch(""); setPage(0) }} aria-label="×"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--adm-grid)] text-[var(--adm-muted)]">
              <X className="h-3 w-3" />
            </button>
          )}
        </label>
        <span className="adm-pill ml-auto" style={{ "--c": "var(--adm-accent)" } as CssVars}>
          {t("adminOqituvchilar.teacherCountLabel", { n: filtered.length })}
        </span>
      </div>

      {/* Jadval */}
      {loaded && filtered.length === 0 ? (
        <div className="adm-card p-12 text-center">
          <TrendingUp className="mx-auto mb-3 h-9 w-9 opacity-40" style={L} />
          <p className="text-sm" style={L}>{search ? t("adminOqituvchilar.noSearchResults", { search }) : t("adminOqituvchilar.noTeacherData")}</p>
        </div>
      ) : (
        <div className="adm-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
                  <th className={`${headCls} w-12 text-left`}>{t("adminOqituvchilar.colIndex")}</th>
                  <th className={`${headCls} text-left`}>{t("adminOqituvchilar.reportColTeacher")}</th>
                  <th className={`${headCls} text-center`}>{t("adminOqituvchilar.reportColTopics")}</th>
                  <th className={`${headCls} text-center`}>{t("adminOqituvchilar.reportColVideos")}</th>
                  <th className={`${headCls} text-center`}>{t("adminOqituvchilar.reportColAudios")}</th>
                  <th className={`${headCls} text-center`}>{t("adminOqituvchilar.reportColPresentations")}</th>
                  <th className={`${headCls} text-center`}>{t("adminOqituvchilar.reportColGuides")}</th>
                  <th className={`${headCls} text-center`}>{t("adminOqituvchilar.reportColTests")}</th>
                  <th className={`${headCls} text-center`}>{t("adminOqituvchilar.reportColAssignments")}</th>
                  <th className={`${headCls} text-center`}>{t("adminOqituvchilar.reportColGroups")}</th>
                  <th className={`${headCls} text-center`}>{t("adminOqituvchilar.reportColMeetings")}</th>
                  <th className={`${headCls} text-center`}>{t("adminOqituvchilar.reportColStudents")}</th>
                  <th className={`${headCls} text-left`}>{t("adminOqituvchilar.reportColLastActivity")}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className={`transition-opacity ${loading && loaded ? "opacity-50" : ""}`}>
                {!loaded ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--adm-border)" }}>
                      <td colSpan={14} className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--adm-grid)]" />
                          <div className="flex flex-1 flex-col gap-1.5">
                            <div className="h-3 w-1/4 animate-pulse rounded bg-[var(--adm-grid)]" />
                            <div className="h-2.5 w-16 animate-pulse rounded bg-[var(--adm-grid)]" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : slice.map((s, i) => {
                  const rowState = rows[s.hemisId]
                  const isExpanded = rowState?.expanded ?? false
                  const globalIdx = curPage * PAGE_SIZE + i + 1

                  return (
                    <React.Fragment key={s.hemisId}>
                      {/* O'qituvchi qatori */}
                      <tr className="adm-hover-row cursor-pointer" data-active={isExpanded}
                        style={{ borderBottom: isExpanded ? "none" : "1px solid var(--adm-border)" }}
                        onClick={() => toggleExpand(s.hemisId)}>

                        <td className="px-4 py-3 text-xs text-[var(--adm-muted)]" style={{ fontVariantNumeric: "tabular-nums" }}>{globalIdx}</td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <PersonAvatar kind="employee" id={s.hemisId} className="h-10 w-10 rounded-full"
                              style={{ boxShadow: "0 0 0 2px var(--adm-card), 0 0 0 3px var(--adm-border-strong)" }}>
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                                style={{ background: "linear-gradient(135deg, #34d399, #059669)" }}>
                                {s.fullName.trim().charAt(0).toUpperCase() || "?"}
                              </div>
                            </PersonAvatar>
                            <div className="min-w-0">
                              <div className="max-w-[300px] truncate text-[13px] font-semibold text-[var(--adm-text)]">{s.fullName}</div>
                              <div className="mt-0.5 text-[11px] text-[var(--adm-muted)]">{t("adminOqituvchilar.idLabel", { id: s.hemisId })}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="text-base font-bold text-[var(--adm-text)]" style={{ fontVariantNumeric: "tabular-nums" }}>{s.mavzular}</span>
                          {/* Mashg'ulot turi bo'yicha bo'linish */}
                          <div className="mt-0.5 flex flex-col items-center gap-0.5 text-[10px] leading-tight" style={L}>
                            {[
                              { n: s.mavzuMaruza, label: lectureLabel, color: "var(--adm-accent)" },
                              { n: s.mavzuAmaliyot, label: practiceLabel, color: "var(--adm-up)" },
                              { n: s.mavzuMustaqil, label: independentLabel, color: "var(--role-dean)" },
                              { n: s.mavzuTurisiz, label: t("adminOqituvchilar.topicTypeNone"), color: "var(--role-pending)" },
                            ].filter(x => x.n > 0).map(x => (
                              <span key={x.label} className="whitespace-nowrap">
                                <span className="font-semibold" style={{ color: x.color }}>{x.n}</span> {x.label}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center"><MetricPill icon={Video} value={s.videolar} color={C.video} /></td>
                        <td className="px-4 py-3 text-center"><MetricPill icon={Music} value={s.audiolar} color={C.audio} /></td>
                        <td className="px-4 py-3 text-center"><MetricPill icon={Presentation} value={s.taqdimotlar} color={C.presentation} /></td>
                        <td className="px-4 py-3 text-center"><MetricPill icon={Layers} value={s.qollanmalar} color={C.qollanma} /></td>
                        <td className="px-4 py-3 text-center"><MetricPill icon={ListChecks} value={s.testlar} color={C.test} /></td>
                        <td className="px-4 py-3 text-center"><MetricPill icon={ClipboardList} value={s.topshiriqlar} color={C.assignment} /></td>
                        <td className="px-4 py-3 text-center"><MetricPill icon={Users} value={s.guruhlar} color={C.group} /></td>
                        <td className="px-4 py-3 text-center"><MetricPill icon={CalendarCheck} value={s.meetingCount} color={C.meeting} /></td>
                        <td className="px-4 py-3 text-center"><MetricPill icon={CheckCircle2} value={s.studentsCompleted} color={C.students} /></td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--adm-text-2)]" style={{ fontVariantNumeric: "tabular-nums" }}>
                            <Clock className="h-3.5 w-3.5 text-[var(--adm-muted)]" />{fmtDate(s.lastSeen)}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center text-[var(--adm-muted)]">
                          {isExpanded
                            ? <ChevronUp className="mx-auto h-4 w-4" />
                            : <ChevronDown className="mx-auto h-4 w-4" />}
                        </td>
                      </tr>

                      {/* Ochilgan mavzular ro'yxati */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={14} className="p-0"
                            style={{ borderBottom: "1px solid var(--adm-border)", backgroundColor: "color-mix(in srgb, var(--adm-accent) 3%, var(--adm-card))" }}>
                            <div style={{ borderTop: "1px solid var(--adm-border)" }}>
                              <TeacherTopicsTable
                                teacherHemisId={s.hemisId}
                                state={rowState}
                                onChange={patch => patchRow(s.hemisId, patch)}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Sahifalash */}
          {loaded && pageCount > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3" style={{ borderTop: "1px solid var(--adm-border)" }}>
              <span className="text-xs" style={L}>
                {t("adminOqituvchilar.paginationRange", { start: curPage * PAGE_SIZE + 1, end: Math.min((curPage + 1) * PAGE_SIZE, filtered.length), total: filtered.length })}
              </span>
              <div className="flex max-w-full items-center gap-1.5 overflow-x-auto">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={curPage === 0}
                  className="adm-btn-outline flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold disabled:opacity-40">
                  <ChevronLeft className="h-3.5 w-3.5" /> {t("adminOqituvchilar.prevBtn")}
                </button>

                {pageNums(curPage, pageCount).map((n, idx) =>
                  n === "..." ? <span key={`e${idx}`} className="px-1 text-xs" style={L}>…</span> : (
                    <button key={n} onClick={() => setPage(n as number)}
                      data-active={n === curPage}
                      className="adm-chip h-8 w-8 rounded-lg text-xs font-semibold">
                      {(n as number) + 1}
                    </button>
                  )
                )}

                <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={curPage >= pageCount - 1}
                  className="adm-btn-outline flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold disabled:opacity-40">
                  {t("adminOqituvchilar.nextBtn")} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
