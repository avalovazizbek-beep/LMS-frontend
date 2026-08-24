"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Plus, X, Trash2, Pencil, FileText, Lock, CheckCircle2, Clock, Users, Loader2, Download,
  Video, Link as LinkIcon, File as FileIcon, HelpCircle, Power, CalendarCheck, BarChart2, ArrowLeft,
} from "lucide-react"
import {
  teachingApi,
  hemisApi,
  hemisCalendarPlanPdfUrl,
  type TeacherContent,
  type TeacherGroup,
  type TeacherScheduleItem,
  type TeachingContentType,
  type TeachingSubmission,
  type ContentStatus,
  type ExamQuestion,
} from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { QuestionsModal } from "@/components/teaching/QuestionsModal"
import { useLanguage } from "@/lib/i18n/LanguageContext"

type TFunc = (key: string, params?: Record<string, string | number>) => string

interface TypeConfig {
  type: TeachingContentType
  title: string
  subtitle: string
  itemLabel: string
  hasFile: boolean
  gradable: boolean
  showMaterials: boolean
  hasDuration: boolean
  hasTrainingLoad: boolean
  hasActiveToggle: boolean
  readOnly?: boolean
  filterControlType?: string | null   // null = controlType yo'q itemlar, string = shu controlType
}

interface TypeConfigDef {
  type: TeachingContentType
  titleKey: string
  subtitleKey: string
  itemLabelKey: string
  hasFile: boolean
  gradable: boolean
  showMaterials: boolean
  hasDuration: boolean
  hasTrainingLoad: boolean
  hasActiveToggle: boolean
  readOnly?: boolean
  filterControlType?: string | null   // null = controlType yo'q itemlar, string = shu controlType
}

const TYPE_MAP: Record<string, TypeConfigDef> = {
  darslar: {
    type: "lesson",
    titleKey: "typeContentOq.types.darslar.title",
    subtitleKey: "typeContentOq.types.darslar.subtitle",
    itemLabelKey: "typeContentOq.types.darslar.itemLabel",
    hasFile: true, gradable: false, showMaterials: true, hasDuration: false,
    hasTrainingLoad: true, hasActiveToggle: true,
  },
  topshiriqlar: {
    type: "assignment",
    titleKey: "typeContentOq.types.topshiriqlar.title",
    subtitleKey: "typeContentOq.types.topshiriqlar.subtitle",
    itemLabelKey: "typeContentOq.types.topshiriqlar.itemLabel",
    hasFile: true, gradable: true, showMaterials: false, hasDuration: false,
    hasTrainingLoad: false, hasActiveToggle: true,
  },
  imtihonlar: {
    type: "exam",
    titleKey: "typeContentOq.types.imtihonlar.title",
    subtitleKey: "typeContentOq.types.imtihonlar.subtitle",
    itemLabelKey: "typeContentOq.types.imtihonlar.itemLabel",
    hasFile: true, gradable: true, showMaterials: false, hasDuration: true,
    hasTrainingLoad: false, hasActiveToggle: false,
    readOnly: true,
    filterControlType: null,       // controlType yo'q (oraliq emas) itemlar
  },
  "oraliq-nazorat": {
    type: "exam",
    titleKey: "typeContentOq.types.oraliqNazorat.title",
    subtitleKey: "typeContentOq.types.oraliqNazorat.subtitle",
    itemLabelKey: "typeContentOq.types.oraliqNazorat.itemLabel",
    hasFile: false, gradable: true, showMaterials: false, hasDuration: true,
    hasTrainingLoad: false, hasActiveToggle: true,
    filterControlType: "oraliq",   // faqat controlType="oraliq" itemlar
  },
  mavzular: {
    type: "mavzu",
    titleKey: "typeContentOq.types.mavzular.title",
    subtitleKey: "typeContentOq.types.mavzular.subtitle",
    itemLabelKey: "typeContentOq.types.mavzular.itemLabel",
    hasFile: true, gradable: false, showMaterials: false, hasDuration: false,
    hasTrainingLoad: true, hasActiveToggle: true,
  },
  "kurs-topshiriqlar": {
    type: "kurs-topshiriq",
    titleKey: "typeContentOq.types.kursTopshiriqlar.title",
    subtitleKey: "typeContentOq.types.kursTopshiriqlar.subtitle",
    itemLabelKey: "typeContentOq.types.kursTopshiriqlar.itemLabel",
    hasFile: true, gradable: true, showMaterials: false, hasDuration: false,
    hasTrainingLoad: false, hasActiveToggle: true,
  },
  kalendar: {
    type: "kalendar",
    titleKey: "typeContentOq.types.kalendar.title",
    subtitleKey: "typeContentOq.types.kalendar.subtitle",
    itemLabelKey: "typeContentOq.types.kalendar.itemLabel",
    hasFile: true, gradable: false, showMaterials: false, hasDuration: false,
    hasTrainingLoad: false, hasActiveToggle: true,
  },
  malumotlar: {
    type: "malumot",
    titleKey: "typeContentOq.types.malumotlar.title",
    subtitleKey: "typeContentOq.types.malumotlar.subtitle",
    itemLabelKey: "typeContentOq.types.malumotlar.itemLabel",
    hasFile: true, gradable: false, showMaterials: false, hasDuration: false,
    hasTrainingLoad: false, hasActiveToggle: false,
  },
}

function getTypeConfig(t: TFunc, slug: string): TypeConfig | null {
  const def = TYPE_MAP[slug]
  if (!def) return null
  return {
    type: def.type,
    title: t(def.titleKey),
    subtitle: t(def.subtitleKey),
    itemLabel: t(def.itemLabelKey),
    hasFile: def.hasFile,
    gradable: def.gradable,
    showMaterials: def.showMaterials,
    hasDuration: def.hasDuration,
    hasTrainingLoad: def.hasTrainingLoad,
    hasActiveToggle: def.hasActiveToggle,
    readOnly: def.readOnly,
    filterControlType: def.filterControlType,
  }
}

const KIND_OPTIONS = [
  { value: "lecture", labelKey: "typeContentOq.kind.lecture" },
  { value: "presentation", labelKey: "typeContentOq.kind.presentation" },
  { value: "laboratory", labelKey: "typeContentOq.kind.laboratory" },
  { value: "video_lesson", labelKey: "typeContentOq.kind.videoLesson" },
  { value: "other", labelKey: "typeContentOq.kind.other" },
]

const STATUS_LABEL: Record<ContentStatus, { labelKey: string; color: string; bg: string; Icon: typeof Lock }> = {
  locked: { labelKey: "typeContentOq.status.locked", color: "#b91c1c", bg: "#fef2f2", Icon: Lock },
  open:   { labelKey: "typeContentOq.status.open",   color: "#15803d", bg: "#f0fdf4", Icon: CheckCircle2 },
  closed: { labelKey: "typeContentOq.status.closed", color: "#92400e", bg: "#fffbeb", Icon: Clock },
}

const inputCls =
  "w-full px-3 py-2.5 rounded-[8px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none transition-colors"
const labelCls = "text-xs font-medium mb-1.5 block"

function toLocalParts(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: "", time: "" }
  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

function combineToIso(date: string, time: string): string | null {
  if (!date || !time) return null
  const d = new Date(`${date}T${time}:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function recordId(value: unknown): string {
  const id = asRecord(value).id
  return typeof id === "string" || typeof id === "number" ? String(id) : ""
}

function textValue(value: unknown): string | null {
  return typeof value === "string" || typeof value === "number" ? String(value) : null
}

async function downloadFileWithAuth(url: string, filename: string, t: TFunc) {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      alert(data?.message || t("typeContentOq.hemis.downloadError"))
      return
    }
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(blobUrl)
  } catch (err) {
    alert(err instanceof Error ? err.message : t("typeContentOq.hemis.downloadError"))
  }
}

function recordLabel(...values: unknown[]): string {
  for (const value of values) {
    const record = asRecord(value)
    const label = record.name ?? record.title ?? record.code
    if (typeof label === "string" && label.trim()) return label.trim()
    if (typeof label === "number") return String(label)
  }
  return "-"
}

function academicYearStart() {
  const now = new Date()
  const year = now.getFullYear()
  return now.getMonth() >= 8 ? year : year - 1
}

function normalizeHemisItems(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  const record = asRecord(data)
  if (Array.isArray(record.items)) return record.items
  if (Array.isArray(record.rows)) return record.rows
  if (Array.isArray(record.data)) return record.data
  return []
}

function HemisSubjectTasksTable() {
  const { t } = useLanguage()
  const yearStart = academicYearStart()
  const [eduYear, setEduYear] = useState(String(yearStart))
  const [semester, setSemester] = useState("")
  const [search, setSearch] = useState("")

  const params = useMemo(() => {
    const p: Record<string, string> = {}
    if (eduYear) p._education_year = eduYear
    if (semester) p._semester = semester
    return p
  }, [eduYear, semester])

  const { data, loading, error, refetch } = useApi(
    () => hemisApi.employeeData("subject-tasks", params),
    [eduYear, semester]
  )

  const rows = useMemo(() => {
    const items = normalizeHemisItems(data?.data)
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter((item) => {
      const record = asRecord(item)
      const text = [
        recordLabel(record.subject),
        recordLabel(record.group),
        recordLabel(record.curriculum, asRecord(record.curriculumSubject).curriculum),
      ].join(" ").toLowerCase()
      return text.includes(query)
    })
  }, [data, search])

  return (
    <div className="rounded-[10px] bg-white" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
      <div className="flex flex-col gap-2 p-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={eduYear}
            onChange={(event) => setEduYear(event.target.value)}
            className="w-0 min-w-[110px] flex-1 rounded-[5px] border border-[#d8e6f7] bg-white px-2 py-1.5 text-xs text-[#104475] outline-none"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {[yearStart, yearStart - 1, yearStart - 2, yearStart - 3].map((year) => (
              <option key={year} value={year}>{year}-{year + 1}</option>
            ))}
          </select>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("typeContentOq.hemis.searchSubjectGroup")}
            className="w-0 min-w-[160px] flex-1 rounded-[5px] border border-[#d8e6f7] bg-white px-2 py-1.5 text-xs text-[#104475] outline-none placeholder:text-[#7293b9]"
            style={{ fontFamily: "var(--font-poppins)" }}
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSemester("")}
            className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={{
              fontFamily: "var(--font-poppins)",
              backgroundColor: semester === "" ? "#0e58a8" : "#fff",
              color: semester === "" ? "#fff" : "#104475",
              border: "1px solid #d8e6f7",
            }}
          >
            {t("typeContentOq.hemis.allSemesters")}
          </button>
          {Array.from({ length: 8 }, (_, index) => {
            const value = index + 1
            const code = String(10 + value)
            const active = semester === code
            return (
              <button
                key={code}
                type="button"
                onClick={() => setSemester(code)}
                className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  fontFamily: "var(--font-poppins)",
                  backgroundColor: active ? "#0e58a8" : "#fff",
                  color: active ? "#fff" : "#104475",
                  border: "1px solid #d8e6f7",
                }}
              >
                {t("typeContentOq.hemis.semesterN", { n: value })}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? <Loading /> : error ? <ApiError message={error} onRetry={refetch} /> : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
              {["#", t("typeContentOq.hemis.colSubjects"), t("typeContentOq.hemis.colCurriculum"), t("typeContentOq.hemis.colGroup"), t("typeContentOq.hemis.colTraining"), t("typeContentOq.hemis.colTasks"), t("typeContentOq.hemis.colSemester"), t("typeContentOq.hemis.colLanguage")].map((label) => (
                <th key={label} className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((item, index) => {
                const record = asRecord(item)
                const subject = asRecord(record.subject)
                const group = asRecord(record.group)
                const groupList = Array.isArray(record.groups) ? record.groups.map(asRecord) : [group]
                const trainingType = asRecord(record.trainingType)
                const semesterRecord = asRecord(record.semester)
                const educationYear = asRecord(record.educationYear)
                const curriculum = asRecord(record.curriculum)
                const curriculumSubjectCurriculum = asRecord(asRecord(record.curriculumSubject).curriculum)
                const language = asRecord(asRecord(record.educationLang ?? group.educationLang))
                const taskCount = record.task_count ?? record.tasks_count ?? 0

                const query = new URLSearchParams()
                const subjectId = recordId(subject)
                const groupId = recordId(group)
                const curriculumId = recordId(curriculum) || recordId(curriculumSubjectCurriculum)
                if (subjectId) query.set("subject", subjectId)
                if (groupId) query.set("group", groupId)
                if (curriculumId) query.set("curriculum", curriculumId)
                if (trainingType.code) query.set("training", String(trainingType.code))
                if (semesterRecord.code) query.set("semester", String(semesterRecord.code))
                if (educationYear.code) query.set("eduYear", String(educationYear.code))
                if (record.max_ball != null) query.set("maxBall", String(record.max_ball))
                query.set("name", recordLabel(subject))
                const href = `/oqituvchi-kabineti/fan-topshiriqlari?${query.toString()}`

                return (
                  <tr key={index} className="hover:bg-[#f6f9ff]" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{index + 1}</td>
                    <td className="px-4 py-2.5 text-sm">
                      <Link href={href} className="font-medium hover:underline" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                        {recordLabel(subject)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {recordLabel(curriculum, curriculumSubjectCurriculum)}
                    </td>
                    <td className="px-4 py-2.5 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {groupList.map((groupItem, groupIndex) => (
                          <span
                            key={groupIndex}
                            className="rounded-[4px] bg-[#0e58a8] px-2 py-0.5 text-xs font-medium text-white whitespace-nowrap"
                            style={{ fontFamily: "var(--font-poppins)" }}
                          >
                            {recordLabel(groupItem)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {recordLabel(trainingType)}
                    </td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {String(taskCount)}
                    </td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      <div>{recordLabel(semesterRecord)}</div>
                      {educationYear.name ? (
                        <div className="text-xs" style={{ color: "#7293b9" }}>{String(educationYear.name)}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {recordLabel(language)}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {t("typeContentOq.hemis.notFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}

function HemisCourseTasksTable() {
  const { t } = useLanguage()
  const yearStart = academicYearStart()
  const [eduYear, setEduYear] = useState(String(yearStart))
  const [semester, setSemester] = useState("")
  const [search, setSearch] = useState("")

  const params = useMemo(() => {
    const p: Record<string, string> = {}
    if (eduYear) p._education_year = eduYear
    if (semester) p._semester = semester
    return p
  }, [eduYear, semester])

  const { data, loading, error, refetch } = useApi(
    () => hemisApi.employeeData("course-tasks", params),
    [eduYear, semester]
  )

  const rows = useMemo(() => {
    const items = normalizeHemisItems(data?.data)
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter((item) => {
      const record = asRecord(item)
      const text = [
        recordLabel(record.subject),
        recordLabel(record.group),
        recordLabel(record.curriculum, asRecord(record.curriculumSubject).curriculum),
      ].join(" ").toLowerCase()
      return text.includes(query)
    })
  }, [data, search])

  return (
    <div className="rounded-[10px] bg-white" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
      <div className="flex flex-col gap-2 p-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={eduYear}
            onChange={(event) => setEduYear(event.target.value)}
            className="w-0 min-w-[110px] flex-1 rounded-[5px] border border-[#d8e6f7] bg-white px-2 py-1.5 text-xs text-[#104475] outline-none"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {[yearStart, yearStart - 1, yearStart - 2, yearStart - 3].map((year) => (
              <option key={year} value={year}>{year}-{year + 1}</option>
            ))}
          </select>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("typeContentOq.hemis.searchSubjectGroup")}
            className="w-0 min-w-[160px] flex-1 rounded-[5px] border border-[#d8e6f7] bg-white px-2 py-1.5 text-xs text-[#104475] outline-none placeholder:text-[#7293b9]"
            style={{ fontFamily: "var(--font-poppins)" }}
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSemester("")}
            className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={{
              fontFamily: "var(--font-poppins)",
              backgroundColor: semester === "" ? "#0e58a8" : "#fff",
              color: semester === "" ? "#fff" : "#104475",
              border: "1px solid #d8e6f7",
            }}
          >
            {t("typeContentOq.hemis.allSemesters")}
          </button>
          {Array.from({ length: 8 }, (_, index) => {
            const value = index + 1
            const code = String(10 + value)
            const active = semester === code
            return (
              <button
                key={code}
                type="button"
                onClick={() => setSemester(code)}
                className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  fontFamily: "var(--font-poppins)",
                  backgroundColor: active ? "#0e58a8" : "#fff",
                  color: active ? "#fff" : "#104475",
                  border: "1px solid #d8e6f7",
                }}
              >
                {t("typeContentOq.hemis.semesterN", { n: value })}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? <Loading /> : error ? <ApiError message={error} onRetry={refetch} /> : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
              {["#", t("typeContentOq.hemis.colSubjects"), t("typeContentOq.hemis.colCurriculum"), t("typeContentOq.hemis.colGroup"), t("typeContentOq.hemis.colControlType"), t("typeContentOq.hemis.colTasks"), t("typeContentOq.hemis.colSemester"), t("typeContentOq.hemis.colLanguage")].map((label) => (
                <th key={label} className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((item, index) => {
                const record = asRecord(item)
                const subject = asRecord(record.subject)
                const group = asRecord(record.group)
                const groupList = Array.isArray(record.groups) ? record.groups.map(asRecord) : [group]
                const controlType = asRecord(record.controlType)
                const semesterRecord = asRecord(record.semester)
                const educationYear = asRecord(record.educationYear)
                const curriculum = asRecord(record.curriculum)
                const curriculumSubjectCurriculum = asRecord(asRecord(record.curriculumSubject).curriculum)
                const language = asRecord(asRecord(record.educationLang ?? group.educationLang))
                const taskCount = record.task_count ?? record.tasks_count ?? 0

                const query = new URLSearchParams()
                const subjectId = recordId(subject)
                const groupId = recordId(group)
                const curriculumId = recordId(curriculum) || recordId(curriculumSubjectCurriculum)
                const trainingType = asRecord(record.trainingType)
                if (subjectId) query.set("subject", subjectId)
                if (groupId) query.set("group", groupId)
                if (curriculumId) query.set("curriculum", curriculumId)
                if (trainingType.code) query.set("training", String(trainingType.code))
                if (trainingType.name) query.set("trainingName", String(trainingType.name))
                if (semesterRecord.code) query.set("semester", String(semesterRecord.code))
                if (educationYear.code) query.set("eduYear", String(educationYear.code))
                if (record.max_ball != null) query.set("maxBall", String(record.max_ball))
                const groupNames = groupList.map((groupItem) => recordLabel(groupItem)).filter((label) => label !== "-").join(", ")
                if (groupNames) query.set("groupNames", groupNames)
                query.set("name", recordLabel(subject))
                const href = `/oqituvchi-kabineti/kurs-topshiriqlari?${query.toString()}`

                return (
                  <tr key={index} className="hover:bg-[#f6f9ff]" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{index + 1}</td>
                    <td className="px-4 py-2.5 text-sm">
                      <Link href={href} className="font-medium hover:underline" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                        {recordLabel(subject)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {recordLabel(curriculum, curriculumSubjectCurriculum)}
                    </td>
                    <td className="px-4 py-2.5 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {groupList.map((groupItem, groupIndex) => (
                          <span
                            key={groupIndex}
                            className="rounded-[4px] bg-[#0e58a8] px-2 py-0.5 text-xs font-medium text-white whitespace-nowrap"
                            style={{ fontFamily: "var(--font-poppins)" }}
                          >
                            {recordLabel(groupItem)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {recordLabel(controlType)}
                    </td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {String(taskCount)}
                    </td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      <div>{recordLabel(semesterRecord)}</div>
                      {educationYear.name ? (
                        <div className="text-xs" style={{ color: "#7293b9" }}>{String(educationYear.name)}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {recordLabel(language)}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {t("typeContentOq.hemis.notFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}

function HemisCalendarPlanTable() {
  const { t } = useLanguage()
  const yearStart = academicYearStart()
  const [eduYear, setEduYear] = useState(String(yearStart))
  const [semester, setSemester] = useState("")
  const [search, setSearch] = useState("")

  const params = useMemo(() => {
    const p: Record<string, string> = {}
    if (eduYear) p._education_year = eduYear
    if (semester) p._semester = semester
    return p
  }, [eduYear, semester])

  const { data, loading, error, refetch } = useApi(
    () => hemisApi.employeeData("calendar-plan", params),
    [eduYear, semester]
  )

  const rows = useMemo(() => {
    const items = normalizeHemisItems(data?.data)
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter((item) => {
      const record = asRecord(item)
      const text = [
        recordLabel(record.subject),
        recordLabel(record.group),
        recordLabel(record.curriculum),
      ].join(" ").toLowerCase()
      return text.includes(query)
    })
  }, [data, search])

  return (
    <div className="rounded-[10px] bg-white" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
      <div className="flex flex-col gap-2 p-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={eduYear}
            onChange={(event) => setEduYear(event.target.value)}
            className="w-0 min-w-[110px] flex-1 rounded-[5px] border border-[#d8e6f7] bg-white px-2 py-1.5 text-xs text-[#104475] outline-none"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {[yearStart, yearStart - 1, yearStart - 2, yearStart - 3].map((year) => (
              <option key={year} value={year}>{year}-{year + 1}</option>
            ))}
          </select>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("typeContentOq.hemis.searchSubjectGroup")}
            className="w-0 min-w-[160px] flex-1 rounded-[5px] border border-[#d8e6f7] bg-white px-2 py-1.5 text-xs text-[#104475] outline-none placeholder:text-[#7293b9]"
            style={{ fontFamily: "var(--font-poppins)" }}
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSemester("")}
            className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={{
              fontFamily: "var(--font-poppins)",
              backgroundColor: semester === "" ? "#0e58a8" : "#fff",
              color: semester === "" ? "#fff" : "#104475",
              border: "1px solid #d8e6f7",
            }}
          >
            {t("typeContentOq.hemis.allSemesters")}
          </button>
          {Array.from({ length: 8 }, (_, index) => {
            const value = index + 1
            const code = String(10 + value)
            const active = semester === code
            return (
              <button
                key={code}
                type="button"
                onClick={() => setSemester(code)}
                className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  fontFamily: "var(--font-poppins)",
                  backgroundColor: active ? "#0e58a8" : "#fff",
                  color: active ? "#fff" : "#104475",
                  border: "1px solid #d8e6f7",
                }}
              >
                {t("typeContentOq.hemis.semesterN", { n: value })}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? <Loading /> : error ? <ApiError message={error} onRetry={refetch} /> : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
              {["#", t("typeContentOq.hemis.colSubjects"), t("typeContentOq.hemis.colCurriculum"), t("typeContentOq.hemis.colGroup"), t("typeContentOq.hemis.colTraining"), t("typeContentOq.hemis.colSemester"), t("typeContentOq.hemis.colFileName")].map((label) => (
                <th key={label} className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((item, index) => {
                const record = asRecord(item)
                const subject = asRecord(record.subject)
                const group = asRecord(record.group)
                const curriculum = asRecord(record.curriculum)
                const trainingType = asRecord(record.trainingType)
                const semesterRecord = asRecord(record.semester)
                const educationYear = asRecord(record.educationYear)
                const calendarPlanUrl = hemisCalendarPlanPdfUrl({
                  curriculum: textValue(record._curriculum),
                  semester: textValue(record._semester),
                  educationYear: textValue(record._education_year),
                  subject: textValue(record._subject),
                  group: textValue(record._group),
                  trainingType: textValue(record._training_type),
                  educationLang: textValue(record._education_lang),
                  filename: `Calendar_plan-${recordLabel(subject)}.pdf`,
                })

                return (
                  <tr key={index} className="hover:bg-[#f6f9ff]" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{index + 1}</td>
                    <td className="px-4 py-2.5 text-sm font-medium" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {recordLabel(subject)}
                    </td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {recordLabel(curriculum)}
                    </td>
                    <td className="px-4 py-2.5 text-sm">
                      {group.id != null ? (
                        <span
                          className="rounded-[4px] bg-[#0e58a8] px-2 py-0.5 text-xs font-medium text-white whitespace-nowrap"
                          style={{ fontFamily: "var(--font-poppins)" }}
                        >
                          {recordLabel(group)}
                        </span>
                      ) : (
                        <span style={{ color: "#7293b9" }}>-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {recordLabel(trainingType)}
                    </td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      <div>{recordLabel(semesterRecord)}</div>
                      {educationYear.name ? (
                        <div className="text-xs" style={{ color: "#7293b9" }}>{String(educationYear.name)}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-sm">
                      {calendarPlanUrl !== "#" ? (
                        <button
                          type="button"
                          onClick={() => downloadFileWithAuth(calendarPlanUrl, `Calendar_plan-${recordLabel(subject)}.pdf`, t)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-[6px] border transition-colors hover:bg-[#f0f5ff]"
                          style={{ borderColor: "#d8e6f7", backgroundColor: "#f6f9ff" }}
                          title={`Calendar_plan-${recordLabel(subject)}.pdf`}
                        >
                          <Download className="w-4 h-4" style={{ color: "#0e58a8" }} />
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-[6px] border cursor-not-allowed"
                          style={{ borderColor: "#e6edf6", backgroundColor: "#f8fafc" }}
                          title={t("typeContentOq.hemis.fileNotAvailable")}
                        >
                          <Download className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {t("typeContentOq.hemis.notFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}

function HemisSubjectInfoTable() {
  const { t } = useLanguage()
  const yearStart = academicYearStart()
  const [eduYear, setEduYear] = useState(String(yearStart))
  const [semester, setSemester] = useState("")
  const [search, setSearch] = useState("")

  const params = useMemo(() => {
    const p: Record<string, string> = {}
    if (eduYear) p._education_year = eduYear
    if (semester) p._semester = semester
    return p
  }, [eduYear, semester])

  const { data, loading, error, refetch } = useApi(
    () => hemisApi.employeeData("subject-info", params),
    [eduYear, semester]
  )

  const rows = useMemo(() => {
    const items = normalizeHemisItems(data?.data)
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter((item) => {
      const record = asRecord(item)
      const text = [
        recordLabel(record.subject),
        recordLabel(record.curriculum),
      ].join(" ").toLowerCase()
      return text.includes(query)
    })
  }, [data, search])

  return (
    <div className="rounded-[10px] bg-white" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
      <div className="flex flex-col gap-2 p-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={eduYear}
            onChange={(event) => setEduYear(event.target.value)}
            className="w-0 min-w-[110px] flex-1 rounded-[5px] border border-[#d8e6f7] bg-white px-2 py-1.5 text-xs text-[#104475] outline-none"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {[yearStart, yearStart - 1, yearStart - 2, yearStart - 3].map((year) => (
              <option key={year} value={year}>{year}-{year + 1}</option>
            ))}
          </select>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("typeContentOq.hemis.searchSubjectCurriculum")}
            className="w-0 min-w-[160px] flex-1 rounded-[5px] border border-[#d8e6f7] bg-white px-2 py-1.5 text-xs text-[#104475] outline-none placeholder:text-[#7293b9]"
            style={{ fontFamily: "var(--font-poppins)" }}
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSemester("")}
            className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={{
              fontFamily: "var(--font-poppins)",
              backgroundColor: semester === "" ? "#0e58a8" : "#fff",
              color: semester === "" ? "#fff" : "#104475",
              border: "1px solid #d8e6f7",
            }}
          >
            {t("typeContentOq.hemis.allSemesters")}
          </button>
          {Array.from({ length: 8 }, (_, index) => {
            const value = index + 1
            const code = String(10 + value)
            const active = semester === code
            return (
              <button
                key={code}
                type="button"
                onClick={() => setSemester(code)}
                className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  fontFamily: "var(--font-poppins)",
                  backgroundColor: active ? "#0e58a8" : "#fff",
                  color: active ? "#fff" : "#104475",
                  border: "1px solid #d8e6f7",
                }}
              >
                {t("typeContentOq.hemis.semesterN", { n: value })}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? <Loading /> : error ? <ApiError message={error} onRetry={refetch} /> : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
              {["#", t("typeContentOq.hemis.colSubjects"), t("typeContentOq.hemis.colCurriculum"), t("typeContentOq.hemis.colEducationType"), t("typeContentOq.hemis.colSemester")].map((label) => (
                <th key={label} className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((item, index) => {
                const record = asRecord(item)
                const subject = asRecord(record.subject)
                const curriculum = asRecord(record.curriculum)
                const educationType = asRecord(record.educationType)
                const educationForm = asRecord(record.educationForm)
                const department = asRecord(record.department)
                const semesterRecord = asRecord(record.semester)
                const educationYear = asRecord(record.educationYear)
                const typeFormLabel = [recordLabel(educationType), recordLabel(educationForm)]
                  .filter((label) => label && label !== "-")
                  .join(" / ")

                return (
                  <tr key={index} className="hover:bg-[#f6f9ff]" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{index + 1}</td>
                    <td className="px-4 py-2.5 text-sm font-medium" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {recordLabel(subject)}
                    </td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {recordLabel(curriculum)}
                    </td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      <div>{typeFormLabel || "-"}</div>
                      {department.name ? (
                        <div className="text-xs" style={{ color: "#7293b9" }}>{String(department.name)}</div>
                      ) : null}
                      <div className="text-xs" style={{ color: "#7293b9" }}>{t("typeContentOq.hemis.creditSystem")}</div>
                    </td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      <div>{recordLabel(semesterRecord)}</div>
                      {educationYear.name ? (
                        <div className="text-xs" style={{ color: "#7293b9" }}>{String(educationYear.name)}</div>
                      ) : null}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {t("typeContentOq.hemis.notFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}

interface FormState {
  groupId: string
  subjectName: string
  title: string
  description: string
  kind: string
  availableFromDate: string
  availableFromTime: string
  deadlineDate: string
  deadlineTime: string
  maxScore: string
  durationMinutes: string
  questionDisplayCount: string
  trainingLoad: string
  lessonDate: string
  delivered: boolean
  docFile: File | null
  videoFile: File | null
  meetingLink: string
}

const EMPTY_FORM: FormState = {
  groupId: "",
  subjectName: "",
  title: "",
  description: "",
  kind: "lecture",
  availableFromDate: "",
  availableFromTime: "",
  deadlineDate: "",
  deadlineTime: "",
  maxScore: "",
  durationMinutes: "",
  questionDisplayCount: "",
  trainingLoad: "",
  lessonDate: "",
  delivered: false,
  docFile: null,
  videoFile: null,
  meetingLink: "",
}

export default function TeacherContentTypePage() {
  const { t } = useLanguage()
  const params = useParams<{ type: string }>()
  const slug = typeof params?.type === "string" ? params.type : Array.isArray(params?.type) ? params.type[0] : ""
  const config = getTypeConfig(t, slug)

  const { data: groupsRes } = useApi(() => teachingApi.groups(), [])
  const groups: TeacherGroup[] = groupsRes?.data ?? []

  const { data: scheduleRes } = useApi(() => teachingApi.schedule(), [])
  const scheduleItems = scheduleRes?.data ?? []

  const { data: contentRes, loading, error, refetch } = useApi(
    () => teachingApi.content(config ? { type: config.type } : undefined),
    [config?.type]
  )
  const items: TeacherContent[] = useMemo(() => {
    const all: TeacherContent[] = contentRes?.data ?? []
    if (!config || config.filterControlType === undefined) return all
    if (config.filterControlType === null) {
      return all.filter(i => !i.controlType || i.controlType !== "oraliq")
    }
    return all.filter(i => i.controlType === config.filterControlType)
  }, [contentRes, config])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [gradingFor, setGradingFor] = useState<TeacherContent | null>(null)
  const [questionsFor, setQuestionsFor] = useState<TeacherContent | null>(null)

  if (!config) {
    return (
      <div className="p-[30px]">
        <ApiError message={t("typeContentOq.pageNotFound")} />
      </div>
    )
  }

  if (config.type === "assignment") {
    return (
      <div className="flex flex-col gap-6 p-[30px]">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {config.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {config.subtitle}
          </p>
        </div>
        <HemisSubjectTasksTable />
      </div>
    )
  }

  if (config.type === "kurs-topshiriq") {
    return (
      <div className="flex flex-col gap-6 p-[30px]">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {config.title}
            </h1>
            <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {config.subtitle}
            </p>
          </div>
          <Link
            href="/oqituvchi-kabineti/kurs-topshiriqlari/yangi"
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-sm font-medium whitespace-nowrap"
            style={{ backgroundColor: "#16a34a", color: "#fff", fontFamily: "var(--font-poppins)" }}
          >
            <Plus className="w-4 h-4" />
            {t("typeContentOq.add")}
          </Link>
        </div>
        <HemisCourseTasksTable />
      </div>
    )
  }

  if (config.type === "malumot") {
    return (
      <div className="flex flex-col gap-6 p-[30px]">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {config.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {config.subtitle}
          </p>
        </div>
        <HemisSubjectInfoTable />
      </div>
    )
  }

  if (config.type === "kalendar") {
    return (
      <div className="flex flex-col gap-6 p-[30px]">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {config.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {config.subtitle}
          </p>
        </div>
        <HemisCalendarPlanTable />
      </div>
    )
  }

  function openCreateForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowForm(true)
  }

  function openEditForm(item: TeacherContent) {
    const af = toLocalParts(item.availableFrom)
    const dl = toLocalParts(item.deadline)
    setEditingId(item.id)
    setForm({
      groupId: String(item.groupId),
      subjectName: item.subjectName,
      title: item.title,
      description: item.description ?? "",
      kind: item.kind ?? "lecture",
      availableFromDate: af.date,
      availableFromTime: af.time,
      deadlineDate: dl.date,
      deadlineTime: dl.time,
      maxScore: item.maxScore != null ? String(item.maxScore) : "",
      durationMinutes: item.durationMinutes != null ? String(item.durationMinutes) : "",
      questionDisplayCount: item.questionDisplayCount != null ? String(item.questionDisplayCount) : "",
      trainingLoad: item.trainingLoad != null ? String(item.trainingLoad) : "",
      lessonDate: item.lessonDate ?? "",
      delivered: item.delivered,
      docFile: null,
      videoFile: null,
      meetingLink: item.meetingLink ?? "",
    })
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handleSubmitForm() {
    setFormError(null)

    const availableFrom = combineToIso(form.availableFromDate, form.availableFromTime)
    const deadline = combineToIso(form.deadlineDate, form.deadlineTime)

    if (!form.groupId) { setFormError(t("typeContentOq.err.selectGroup")); return }
    if (!form.subjectName.trim()) { setFormError(t("typeContentOq.err.enterSubjectName")); return }
    if (!form.title.trim()) { setFormError(t("typeContentOq.err.enterTitle")); return }
    const requiresDate = config!.type === "lesson" || config!.gradable
    if (!editingId && requiresDate && !availableFrom) { setFormError(t("typeContentOq.err.enterAvailableFrom")); return }

    setSaving(true)
    try {
      if (editingId) {
        await teachingApi.updateContent(editingId, {
          title: form.title.trim(),
          description: form.description.trim() || null,
          subjectName: form.subjectName.trim(),
          availableFrom: availableFrom ?? undefined,
          deadline: deadline,
          maxScore: form.maxScore ? Number(form.maxScore) : null,
          durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
          questionDisplayCount: form.questionDisplayCount ? Number(form.questionDisplayCount) : null,
          trainingLoad: form.trainingLoad ? Number(form.trainingLoad) : null,
          lessonDate: config!.type === "kalendar" ? (form.lessonDate || null) : undefined,
          delivered: config!.type === "kalendar" ? form.delivered : undefined,
          meetingLink: form.meetingLink.trim() || null,
        })
      } else {
        const created = await teachingApi.createContent({
          type: config!.type,
          groupId: form.groupId,
          subjectName: form.subjectName.trim(),
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          kind: config!.type === "lesson" ? form.kind : undefined,
          controlType: config!.filterControlType ?? undefined,
          availableFrom: availableFrom ?? new Date().toISOString(),
          deadline: deadline,
          maxScore: form.maxScore ? Number(form.maxScore) : null,
          durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
          trainingLoad: form.trainingLoad ? Number(form.trainingLoad) : null,
          lessonDate: config!.type === "kalendar" ? (form.lessonDate || null) : undefined,
          delivered: config!.type === "kalendar" ? form.delivered : undefined,
          docFile: form.docFile,
          meetingLink: form.meetingLink.trim() || undefined,
        })
        if (form.videoFile && created.data?.id) {
          await teachingApi.uploadVideoFile(created.data.id, form.videoFile)
        }
      }
      closeForm()
      await refetch()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("typeContentOq.err.saveError"))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t("typeContentOq.confirmDelete"))) return
    try {
      await teachingApi.removeContent(id)
      await refetch()
    } catch (err) {
      alert(err instanceof Error ? err.message : t("typeContentOq.err.deleteError"))
    }
  }

  async function handleToggleActive(id: number) {
    try {
      await teachingApi.toggleContent(id)
      await refetch()
    } catch (err) {
      alert(err instanceof Error ? err.message : t("typeContentOq.err.toggleError"))
    }
  }

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {config.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {config.subtitle}
          </p>
        </div>
        {!config.readOnly && (config.type === "lesson" ? (
          <Link
            href="/xodim/fan-resurslari/yaratish"
            className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium"
            style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}
          >
            <Plus className="w-4 h-4" />
            {t("typeContentOq.addNew")}
          </Link>
        ) : (
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium"
            style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}
          >
            <Plus className="w-4 h-4" />
            {t("typeContentOq.addNew")}
          </button>
        ))}
      </div>

      {loading ? <Loading /> : error ? <ApiError message={error} onRetry={refetch} /> : items.length === 0 ? (
        <div className="bg-white rounded-[12px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("typeContentOq.emptyState", { item: config.itemLabel })}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => {
            const st = STATUS_LABEL[item.status]
            const groupName = groups.find(g => g.id === item.groupId)?.name ?? t("typeContentOq.groupFallback", { id: item.groupId })
            return (
              <div key={item.id} className="bg-white rounded-[12px] p-5 flex flex-col gap-3"
                style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#f6f9ff" }}>
                      <FileText className="w-5 h-5" style={{ color: "#0e58a8" }} />
                    </div>
                    <div>
                      <div className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                        {item.title}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        {item.subjectName} • <Users className="w-3 h-3 inline -mt-0.5" /> {groupName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ color: st.color, backgroundColor: st.bg, fontFamily: "var(--font-poppins)" }}>
                      <st.Icon className="w-3.5 h-3.5" />
                      {t(st.labelKey)}
                    </span>
                    {config.hasActiveToggle && (
                      <button
                        onClick={() => handleToggleActive(item.id)}
                        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors"
                        style={{
                          color: item.isActive ? "#15803d" : "#7293b9",
                          backgroundColor: item.isActive ? "#f0fdf4" : "#f1f5f9",
                          fontFamily: "var(--font-poppins)",
                        }}
                        title={item.isActive ? t("typeContentOq.deactivate") : t("typeContentOq.activate")}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {item.isActive ? t("typeContentOq.active") : t("typeContentOq.inactive")}
                      </button>
                    )}
                  </div>
                </div>

                {item.description && (
                  <p className="text-sm" style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{item.description}</p>
                )}

                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {config.type === "kalendar" ? (
                    <>
                      <span>{t("typeContentOq.lessonDate")} <strong style={{ color: "#012970" }}>{item.lessonDate ?? "—"}</strong></span>
                      <span className="flex items-center gap-1">
                        {t("typeContentOq.delivered")}
                        <strong style={{ color: item.delivered ? "#15803d" : "#b91c1c" }}>
                          <CalendarCheck className="w-3.5 h-3.5 inline -mt-0.5 mr-0.5" />
                          {item.delivered ? t("typeContentOq.yes") : t("typeContentOq.no")}
                        </strong>
                      </span>
                    </>
                  ) : (
                    <>
                      <span>{t("typeContentOq.opensAt")} <strong style={{ color: "#012970" }}>{formatDateTime(item.availableFrom)}</strong></span>
                      <span>{t("typeContentOq.deadline")} <strong style={{ color: "#012970" }}>{formatDateTime(item.deadline)}</strong></span>
                    </>
                  )}
                  {item.maxScore != null && <span>{t("typeContentOq.maxScore")} <strong style={{ color: "#012970" }}>{item.maxScore}</strong></span>}
                  {item.durationMinutes != null && <span>{t("typeContentOq.duration")} <strong style={{ color: "#012970" }}>{t("typeContentOq.minutesUnit", { n: item.durationMinutes })}</strong></span>}
                  {item.trainingLoad != null && <span>{t("typeContentOq.load")} <strong style={{ color: "#012970" }}>{t("typeContentOq.hoursUnit", { n: item.trainingLoad })}</strong></span>}
                </div>

                {item.docFile && (
                  <a
                    href={teachingApi.fileUrl(item.docFile.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-medium w-fit px-3 py-1.5 rounded-[6px]"
                    style={{ color: "#0e58a8", backgroundColor: "#f0f5ff", fontFamily: "var(--font-poppins)" }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {item.docFile.originalName}
                  </a>
                )}
                {item.videoFile && (
                  <div className="flex items-center gap-2 text-xs font-medium w-fit px-3 py-1.5 rounded-[6px]"
                    style={{ color: "#7c3aed", backgroundColor: "#f5f3ff", fontFamily: "var(--font-poppins)" }}>
                    <Video className="w-3.5 h-3.5" />
                    {item.videoFile.originalName}
                  </div>
                )}
                {item.meetingLink && (
                  <a
                    href={item.meetingLink.startsWith("http") ? item.meetingLink : `https://${item.meetingLink}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-medium w-fit px-3 py-1.5 rounded-[6px]"
                    style={{ color: "#0891b2", backgroundColor: "#ecfeff", fontFamily: "var(--font-poppins)" }}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    {t("typeContentOq.meetingPrefix")} {item.meetingLink.length > 40 ? item.meetingLink.slice(0, 40) + "…" : item.meetingLink}
                  </a>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {config.type === "exam" && (
                    <button
                      onClick={() => setQuestionsFor(item)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors"
                      style={{ color: "#7c3aed", border: "1px solid #e9d5ff", fontFamily: "var(--font-poppins)" }}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      {t("typeContentOq.questions")}{item.questionCount > 0 ? ` (${item.questionCount})` : ""}
                    </button>
                  )}
                  {config.gradable && (
                    <button
                      onClick={() => setGradingFor(item)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors"
                      style={{ color: "#0e58a8", border: "1px solid #d8e6f7", fontFamily: "var(--font-poppins)" }}
                    >
                      <Users className="w-3.5 h-3.5" />
                      {t("typeContentOq.viewGrade")}
                    </button>
                  )}
                  {!config.readOnly && (
                    <>
                      <button
                        onClick={() => openEditForm(item)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors"
                        style={{ color: "#445b7a", border: "1px solid #d8e6f7", fontFamily: "var(--font-poppins)" }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {t("typeContentOq.edit")}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors"
                        style={{ color: "#dc2626", border: "1px solid #fecaca", fontFamily: "var(--font-poppins)" }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t("typeContentOq.delete")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <ContentFormModal
          config={config}
          groups={groups}
          scheduleItems={scheduleItems}
          form={form}
          setForm={setForm}
          editing={editingId !== null}
          saving={saving}
          error={formError}
          onClose={closeForm}
          onSubmit={handleSubmitForm}
        />
      )}

      {gradingFor && (
        <GradingModal content={gradingFor} onClose={() => setGradingFor(null)} readOnly={config.readOnly} />
      )}

      {questionsFor && (
        <QuestionsModal
          content={questionsFor}
          onClose={() => setQuestionsFor(null)}
          onSaved={refetch}
        />
      )}
    </div>
  )
}

function ContentFormModal({
  config, groups, scheduleItems, form, setForm, editing, saving, error, onClose, onSubmit,
}: {
  config: TypeConfig
  groups: TeacherGroup[]
  scheduleItems: TeacherScheduleItem[]
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  editing: boolean
  saving: boolean
  error: string | null
  onClose: () => void
  onSubmit: () => void
}) {
  const { t } = useLanguage()
  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const subjects = useMemo(() => {
    const pool = form.groupId
      ? scheduleItems.filter(s => String(s.groupId) === String(form.groupId))
      : scheduleItems
    return [...new Set(pool.map(s => s.subjectName).filter(Boolean))].sort()
  }, [scheduleItems, form.groupId])

  const isLesson  = config.type === "lesson"
  const isKalendar = config.type === "kalendar"
  const isMalumot = config.type === "malumot"
  const isMavzu   = config.type === "mavzu"

  const availFromLabel = isKalendar ? t("typeContentOq.form.availFromKalendar") : isMavzu ? t("typeContentOq.form.availFromMavzu") : t("typeContentOq.form.availFromDefault")
  const deadlineLabel  = isKalendar ? t("typeContentOq.form.deadlineKalendar") : config.gradable ? t("typeContentOq.form.deadlineGradable") : t("typeContentOq.form.deadlineDefault")

  const showAvailableFrom = !isMalumot
  const showDeadline      = config.gradable || isKalendar || isLesson
  const showMaxScore      = config.gradable
  const showKind          = isLesson && !editing
  const showDocFile       = !editing && config.hasFile
  const showVideoFile     = isLesson && !editing
  const showMeetingLink   = isLesson

  const titlePlaceholder =
    isLesson              ? t("typeContentOq.form.titlePlaceholderLesson") :
    isMavzu               ? t("typeContentOq.form.titlePlaceholderMavzu") :
    isKalendar            ? t("typeContentOq.form.titlePlaceholderKalendar") :
    isMalumot             ? t("typeContentOq.form.titlePlaceholderMalumot") :
    config.type === "kurs-topshiriq" ? t("typeContentOq.form.titlePlaceholderKurs") :
    config.type === "exam" ? t("typeContentOq.form.titlePlaceholderExam") :
    t("typeContentOq.form.titlePlaceholderDefault")

  const descPlaceholder =
    isKalendar ? t("typeContentOq.form.descPlaceholderKalendar") :
    isMalumot  ? t("typeContentOq.form.descPlaceholderMalumot") :
    isLesson   ? t("typeContentOq.form.descPlaceholderLesson") :
    isMavzu    ? t("typeContentOq.form.descPlaceholderMavzu") :
    t("typeContentOq.form.descPlaceholderDefault")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(1,41,112,0.35)" }}>
      <div className="bg-white rounded-[14px] w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {editing ? t("typeContentOq.form.editTitle") : t("typeContentOq.form.newTitle", { item: config.itemLabel })}
            </h2>
            {!editing && (
              <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {config.subtitle}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#f0f5ff] transition-colors">
            <X className="w-5 h-5" style={{ color: "#7293b9" }} />
          </button>
        </div>

        {error && (
          <div className="text-sm px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">

          {/* Guruh */}
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{t("typeContentOq.form.group")}</label>
            <select className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
              value={form.groupId} disabled={editing}
              onChange={e => update("groupId", e.target.value)}>
              <option value="">{t("typeContentOq.form.selectPlaceholder")}</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          {/* Fan nomi */}
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{t("typeContentOq.form.subjectName")}</label>
            {subjects.length > 0 ? (
              <select className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
                value={form.subjectName} onChange={e => update("subjectName", e.target.value)}>
                <option value="">{t("typeContentOq.form.selectPlaceholder")}</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input className={inputCls} style={{ fontFamily: "var(--font-poppins)" }} value={form.subjectName}
                onChange={e => update("subjectName", e.target.value)} placeholder={t("typeContentOq.form.subjectNamePlaceholder")} />
            )}
          </div>

          {/* Sarlavha */}
          <div className="col-span-2">
            <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{t("typeContentOq.form.title")}</label>
            <input className={inputCls} style={{ fontFamily: "var(--font-poppins)" }} value={form.title}
              onChange={e => update("title", e.target.value)} placeholder={titlePlaceholder} />
          </div>

          {/* Tavsif */}
          <div className="col-span-2">
            <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{t("typeContentOq.form.description")}</label>
            <textarea className={inputCls} style={{ fontFamily: "var(--font-poppins)", minHeight: 80 }} value={form.description}
              onChange={e => update("description", e.target.value)} placeholder={descPlaceholder} />
          </div>

          {/* Dars turi — faqat lesson, yaratishda */}
          {showKind && (
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{t("typeContentOq.form.kind")}</label>
              <select className={inputCls} style={{ fontFamily: "var(--font-poppins)" }} value={form.kind}
                onChange={e => update("kind", e.target.value)}>
                {KIND_OPTIONS.map(k => <option key={k.value} value={k.value}>{t(k.labelKey)}</option>)}
              </select>
            </div>
          )}

          {/* Maksimal ball — topshiriq, imtihon, kurs */}
          {showMaxScore && (
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{t("typeContentOq.form.maxScore")}</label>
              <input type="number" min={0} className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
                value={form.maxScore} onChange={e => update("maxScore", e.target.value)} placeholder="100" />
            </div>
          )}

          {/* Davomiyligi — faqat imtihon */}
          {config.hasDuration && (
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{t("typeContentOq.form.duration")}</label>
              <input type="number" min={0} className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
                value={form.durationMinutes} onChange={e => update("durationMinutes", e.target.value)} placeholder="90" />
            </div>
          )}

          {/* Talabaga ko'rsatiladigan savollar soni — savol bazasidan tasodifiy tanlanadi.
              Faqat tahrirlashda (savollar allaqachon qo'shilgan bo'lganda) mantiqan to'g'ri keladi. */}
          {config.hasDuration && editing && (
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{t("typeContentOq.form.questionDisplayCount")}</label>
              <input type="number" min={0} className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
                value={form.questionDisplayCount} onChange={e => update("questionDisplayCount", e.target.value)} placeholder="20" />
              <p className="mt-1 text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{t("typeContentOq.form.questionDisplayCountHint")}</p>
            </div>
          )}

          {/* Yuklama (soat) — mashg'ulot turi bo'yicha o'quv yuki */}
          {config.hasTrainingLoad && (
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{t("typeContentOq.form.load")}</label>
              <input type="number" min={0} className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
                value={form.trainingLoad} onChange={e => update("trainingLoad", e.target.value)} placeholder="2" />
            </div>
          )}

          {/* Kalendar reja — dars sanasi va o'tildi belgisi */}
          {isKalendar && (
            <>
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{t("typeContentOq.form.lessonDate")}</label>
                <input type="date" className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
                  value={form.lessonDate} onChange={e => update("lessonDate", e.target.value)} />
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-end pb-2.5">
                <label className="flex items-center gap-2 text-sm" style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>
                  <input type="checkbox" checked={form.delivered}
                    onChange={e => update("delivered", e.target.checked)} />
                  {t("typeContentOq.form.delivered")}
                </label>
              </div>
            </>
          )}

          {/* Sana maydonlari */}
          {showAvailableFrom && (
            <div className={`col-span-2 ${showDeadline ? "sm:col-span-1" : ""}`}>
              <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{availFromLabel}</label>
              <div className="flex gap-2">
                <input type="date" className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
                  value={form.availableFromDate} onChange={e => update("availableFromDate", e.target.value)} />
                <input type="time" className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
                  value={form.availableFromTime} onChange={e => update("availableFromTime", e.target.value)} />
              </div>
            </div>
          )}

          {showDeadline && (
            <div className={`col-span-2 ${showAvailableFrom ? "sm:col-span-1" : ""}`}>
              <label className={labelCls} style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{deadlineLabel}</label>
              <div className="flex gap-2">
                <input type="date" className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
                  value={form.deadlineDate} onChange={e => update("deadlineDate", e.target.value)} />
                <input type="time" className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
                  value={form.deadlineTime} onChange={e => update("deadlineTime", e.target.value)} />
              </div>
            </div>
          )}

          {/* Materiallar bo'limi — yaratishda */}
          {!editing && (showDocFile || showVideoFile) && (
            <div className="col-span-2 flex flex-col gap-3">
              <div className="text-xs font-semibold pt-1" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {showVideoFile ? t("typeContentOq.form.materialsMulti") : t("typeContentOq.form.materials")}
              </div>

              {showDocFile && (
                <div className="rounded-[10px] p-3 flex flex-col gap-2" style={{ backgroundColor: "#f0f5ff", border: "1px solid #d8e6f7" }}>
                  <div className="flex items-center gap-2">
                    <FileIcon className="w-4 h-4" style={{ color: "#0e58a8" }} />
                    <span className="text-xs font-medium" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                      {isLesson ? t("typeContentOq.form.docLesson") :
                       isKalendar ? t("typeContentOq.form.docKalendar") :
                       isMalumot  ? t("typeContentOq.form.docMalumot") :
                       t("typeContentOq.form.docDefault")}
                    </span>
                  </div>
                  {form.docFile ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs truncate flex-1 min-w-0" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{form.docFile.name}</span>
                      <button type="button" onClick={() => update("docFile", null)}
                        className="text-xs px-2 py-0.5 rounded" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                        {t("typeContentOq.form.remove")}
                      </button>
                    </div>
                  ) : (
                    <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar"
                      className="text-xs" style={{ fontFamily: "var(--font-poppins)", color: "#445b7a" }}
                      onChange={e => update("docFile", e.target.files?.[0] ?? null)} />
                  )}
                </div>
              )}

              {showVideoFile && (
                <div className="rounded-[10px] p-3 flex flex-col gap-2" style={{ backgroundColor: "#faf5ff", border: "1px solid #e9d5ff" }}>
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" style={{ color: "#7c3aed" }} />
                    <span className="text-xs font-medium" style={{ color: "#7c3aed", fontFamily: "var(--font-poppins)" }}>
                      {t("typeContentOq.form.video")}
                    </span>
                  </div>
                  {form.videoFile ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs truncate flex-1 min-w-0" style={{ color: "#6d28d9", fontFamily: "var(--font-poppins)" }}>{form.videoFile.name}</span>
                      <button type="button" onClick={() => update("videoFile", null)}
                        className="text-xs px-2 py-0.5 rounded" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                        {t("typeContentOq.form.remove")}
                      </button>
                    </div>
                  ) : (
                    <input type="file" accept="video/*,.mp4,.avi,.mov,.mkv,.webm"
                      className="text-xs" style={{ fontFamily: "var(--font-poppins)", color: "#445b7a" }}
                      onChange={e => update("videoFile", e.target.files?.[0] ?? null)} />
                  )}
                </div>
              )}

              {showMeetingLink && !editing && (
                <div className="rounded-[10px] p-3 flex flex-col gap-2" style={{ backgroundColor: "#ecfeff", border: "1px solid #a5f3fc" }}>
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" style={{ color: "#0891b2" }} />
                    <span className="text-xs font-medium" style={{ color: "#0891b2", fontFamily: "var(--font-poppins)" }}>
                      {t("typeContentOq.form.meetingLink")}
                    </span>
                  </div>
                  <input type="url" className={inputCls} style={{ fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }}
                    value={form.meetingLink} onChange={e => update("meetingLink", e.target.value)}
                    placeholder="https://zoom.us/j/..." />
                </div>
              )}
            </div>
          )}

          {/* Tahrirlashda faqat meeting link — lesson uchun */}
          {editing && showMeetingLink && (
            <div className="col-span-2 rounded-[10px] p-3" style={{ backgroundColor: "#ecfeff", border: "1px solid #a5f3fc" }}>
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="w-4 h-4" style={{ color: "#0891b2" }} />
                <span className="text-xs font-medium" style={{ color: "#0891b2", fontFamily: "var(--font-poppins)" }}>
                  {t("typeContentOq.form.meetingLinkUpdate")}
                </span>
              </div>
              <input type="url" className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
                value={form.meetingLink} onChange={e => update("meetingLink", e.target.value)}
                placeholder="https://zoom.us/j/..." />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-[8px] text-sm font-medium"
            style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>
            {t("common.cancel")}
          </button>
          <button onClick={onSubmit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-medium disabled:opacity-60"
            style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  )
}

function GradingModal({ content, onClose, readOnly = false }: { content: TeacherContent; onClose: () => void; readOnly?: boolean }) {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useApi(() => teachingApi.submissions(content.id), [content.id])
  const submissions: TeachingSubmission[] = data?.data ?? []
  const [viewSub, setViewSub] = useState<TeachingSubmission | null>(null)

  const graded = submissions.filter(s => s.grade != null)
  const avg = graded.length > 0
    ? Math.round(graded.reduce((a, s) => a + s.grade!, 0) / graded.length)
    : null

  if (viewSub) {
    return (
      <SubmissionDetailModal
        content={content}
        sub={viewSub}
        readOnly={readOnly}
        onBack={() => setViewSub(null)}
        onClose={onClose}
        onGraded={async () => { await refetch() }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(1,41,112,0.35)" }}>
      <div className="bg-white rounded-[14px] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {t("typeContentOq.grading.title")}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {t("typeContentOq.grading.subtitle", { title: content.title, count: submissions.length })}{avg != null ? t("typeContentOq.grading.avgSuffix", { avg }) : ""}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#f0f5ff] transition-colors">
            <X className="w-5 h-5" style={{ color: "#7293b9" }} />
          </button>
        </div>

        {loading ? <Loading /> : error ? <ApiError message={error} onRetry={refetch} /> : submissions.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("typeContentOq.grading.noSubmissions")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[10px]" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f6f9ff", borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                  {["#", t("typeContentOq.grading.colStudent"), t("typeContentOq.grading.colScore"), t("typeContentOq.grading.colPercent"), t("typeContentOq.grading.colSubmitted"), t("typeContentOq.grading.colView")].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                      style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub, i) => {
                  const pct = content.maxScore && sub.grade != null
                    ? `${Math.round(sub.grade / content.maxScore * 100)}%` : "—"
                  return (
                    <tr key={sub.id} style={{ borderBottom: i < submissions.length - 1 ? "1px solid rgba(1,41,112,0.06)" : "none" }}>
                      <td className="px-4 py-3 text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{i + 1}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{sub.studentFullName}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: sub.grade != null ? "#012970" : "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        {sub.grade ?? "—"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{pct}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        {formatDateTime(sub.submittedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setViewSub(sub)}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors hover:bg-[#f0f5ff]"
                          style={{ color: "#0e58a8", border: "1px solid #d8e6f7", fontFamily: "var(--font-poppins)" }}>
                          <BarChart2 className="w-3.5 h-3.5" />
                          {t("typeContentOq.grading.view")}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("typeContentOq.grading.total", { count: submissions.length })}
          </span>
          <button onClick={onClose}
            className="px-4 py-1.5 rounded-[6px] text-sm font-medium transition-colors hover:bg-[#f0f5ff]"
            style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  )
}

function SubmissionDetailModal({ content, sub, readOnly, onBack, onClose, onGraded }: {
  content: TeacherContent
  sub: TeachingSubmission
  readOnly: boolean
  onBack: () => void
  onClose: () => void
  onGraded: () => Promise<void>
}) {
  const { t } = useLanguage()
  const isExam = content.type === "exam" && Array.isArray(sub.questionIds) && Array.isArray(sub.answers)

  const { data: questionsData, loading: qLoading } = useApi(
    () => isExam
      ? teachingApi.questions(content.id) as Promise<{ data: ExamQuestion[] }>
      : Promise.resolve({ data: [] as ExamQuestion[] }),
    [content.id, isExam]
  )
  const questions = questionsData?.data ?? []

  const questionsMap = useMemo(() => {
    const m = new Map<number, ExamQuestion>()
    for (const q of questions) { if (q.id != null) m.set(q.id, q) }
    return m
  }, [questions])

  const questionResults = useMemo(() => {
    if (!isExam || !sub.questionIds || !sub.answers || !sub.optionPerms) return []
    return sub.questionIds.map((qId, i) => {
      const q = questionsMap.get(qId)
      const shuffledAnswer = sub.answers![i] ?? -1
      const optionPerm = sub.optionPerms![qId] ?? []
      const originalAnswer = shuffledAnswer >= 0 && shuffledAnswer < optionPerm.length
        ? optionPerm[shuffledAnswer] : -1
      const isCorrect = q != null && originalAnswer === q.correctIndex
      return { q, qId, originalAnswer, isCorrect }
    })
  }, [isExam, sub, questionsMap])

  const [grade, setGrade] = useState(sub.grade != null ? String(sub.grade) : "")
  const [feedback, setFeedback] = useState(sub.feedback ?? "")
  const [saving, setSaving] = useState(false)
  const [gradeError, setGradeError] = useState<string | null>(null)

  async function saveGrade() {
    const num = Number(grade)
    if (!grade.trim() || Number.isNaN(num)) { setGradeError(t("typeContentOq.submission.enterGrade")); return }
    setSaving(true)
    try {
      await teachingApi.grade(sub.id, { grade: num, feedback: feedback.trim() || undefined })
      await onGraded()
      onBack()
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : t("typeContentOq.submission.gradeError"))
    } finally {
      setSaving(false)
    }
  }

  const correct = questionResults.filter(r => r.isCorrect).length
  const total = questionResults.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(1,41,112,0.35)" }}>
      <div className="bg-white rounded-[14px] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors hover:bg-[#f0f5ff]"
              style={{ color: "#445b7a", border: "1px solid #d8e6f7", fontFamily: "var(--font-poppins)" }}>
              <ArrowLeft className="w-3.5 h-3.5" />
              {t("typeContentOq.submission.back")}
            </button>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {sub.studentFullName}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {content.title} · {t("typeContentOq.submission.submittedAt", { date: formatDateTime(sub.submittedAt) })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#f0f5ff] transition-colors">
            <X className="w-5 h-5" style={{ color: "#7293b9" }} />
          </button>
        </div>

        {/* Score summary */}
        {(sub.grade != null || total > 0) && (
          <div className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-[10px]" style={{ backgroundColor: "#f6f9ff" }}>
            {sub.grade != null && (
              <div className="flex flex-col">
                <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{t("typeContentOq.submission.score")}</span>
                <span className="text-xl font-bold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {sub.grade}{content.maxScore ? `/${content.maxScore}` : ""}
                </span>
              </div>
            )}
            {total > 0 && !qLoading && (
              <div className="flex flex-col">
                <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{t("typeContentOq.submission.correctAnswers")}</span>
                <span className="text-xl font-bold" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                  {correct}/{total}
                </span>
              </div>
            )}
            {sub.feedback && (
              <div className="flex flex-col">
                <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{t("typeContentOq.submission.comment")}</span>
                <span className="text-sm italic" style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{sub.feedback}</span>
              </div>
            )}
          </div>
        )}

        {/* Exam Q&A */}
        {isExam && (
          qLoading ? <Loading /> : (
            <div className="flex flex-col gap-3">
              {questionResults.map(({ q, qId, originalAnswer, isCorrect }, i) => (
                <div key={i} className="rounded-[10px] p-4 flex flex-col gap-2"
                  style={{ border: `1px solid ${isCorrect ? "#bbf7d0" : "#fecaca"}`, backgroundColor: isCorrect ? "#f0fdf4" : "#fff5f5" }}>
                  <div className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    {i + 1}. {q?.questionText ?? t("typeContentOq.submission.questionFallback", { id: qId })}
                  </div>
                  {q?.options && (
                    <div className="flex flex-col gap-1 mt-1">
                      {q.options.map((opt, oi) => {
                        const isStudentChoice = oi === originalAnswer
                        const isCorrectOpt = oi === q.correctIndex
                        const bg = isCorrectOpt ? "#dcfce7" : isStudentChoice ? "#fee2e2" : "transparent"
                        const color = isCorrectOpt ? "#15803d" : isStudentChoice ? "#dc2626" : "#445b7a"
                        return (
                          <div key={oi} className="text-sm px-3 py-1.5 rounded-[6px]"
                            style={{ backgroundColor: bg, color, fontFamily: "var(--font-poppins)", fontWeight: isStudentChoice || isCorrectOpt ? 600 : 400 }}>
                            {String.fromCharCode(65 + oi)}. {opt}
                            {isStudentChoice && !isCorrectOpt && ` ${t("typeContentOq.submission.studentAnswer")}`}
                            {isCorrectOpt && " ✓"}
                            {isStudentChoice && isCorrectOpt && ` ${t("typeContentOq.submission.studentAnswer")} ✓`}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* File */}
        {sub.file && (
          <a href={teachingApi.fileUrl(sub.file.url)} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-medium w-fit px-3 py-1.5 rounded-[6px]"
            style={{ color: "#0e58a8", backgroundColor: "#f0f5ff", fontFamily: "var(--font-poppins)" }}>
            <Download className="w-3.5 h-3.5" />
            {sub.file.originalName}
          </a>
        )}

        {/* Comment */}
        {sub.comment && (
          <p className="text-sm" style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{sub.comment}</p>
        )}

        {/* Grading form */}
        {!readOnly && (
          <div className="flex flex-col gap-2 pt-2" style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t("typeContentOq.submission.grading")}</h3>
            {gradeError && (
              <div className="text-xs px-3 py-1.5 rounded-[6px]" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                {gradeError}
              </div>
            )}
            <div className="flex gap-2">
              <input type="number" min={0} placeholder={t("typeContentOq.submission.gradePlaceholder")} value={grade} onChange={e => setGrade(e.target.value)}
                className={inputCls} style={{ fontFamily: "var(--font-poppins)", maxWidth: 120 }} />
              <input placeholder={t("typeContentOq.submission.commentPlaceholder")} value={feedback} onChange={e => setFeedback(e.target.value)}
                className={inputCls} style={{ fontFamily: "var(--font-poppins)" }} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onBack} className="px-3 py-1.5 rounded-[6px] text-xs font-medium"
                style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>{t("common.cancel")}</button>
              <button onClick={saveGrade} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] text-xs font-medium disabled:opacity-60"
                style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t("common.save")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

