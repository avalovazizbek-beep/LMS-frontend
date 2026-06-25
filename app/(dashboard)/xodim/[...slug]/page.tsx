"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ChevronLeft, ChevronRight, FileVideo, Filter, Plus, Search, Upload } from "lucide-react"
import { hemisApi, teachingApi, type LocalResourceKind, type HemisSchedule } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

type Field = { label: string; keys: string[] }
type PageConfig = {
  title: string
  description: string
  resource: string
  action?: string
  actionHref?: string
  filters: string[]
  fields: Field[]
}

const commonSubjectFields: Field[] = [
  { label: "Fanlar", keys: ["subject.name", "subject_name", "name", "fan"] },
  { label: "O'quv reja", keys: ["curriculum.name", "curriculumSubject.curriculum.name", "curriculumSubjectDetail.curriculum.name", "educationPlan.name", "curriculum", "plan"] },
  { label: "Guruh", keys: ["group.name", "groups", "group"] },
  { label: "Mashg'ulot", keys: ["trainingType.name", "lessonType.name", "training_type", "lesson_type"] },
  { label: "Semestr", keys: ["semester.name", "_semester", "semester"] },
]

const pageConfigs: Record<string, PageConfig> = {
  "hujjat-imzolash": {
    title: "Hujjatni imzolash",
    description: "HEMIS e-hujjatlar bo'limi",
    resource: "document-signing",
    filters: ["Hujjat turini tanlang", "Holatini tanlang", "Nom va Raqam bo'yicha qidirish"],
    fields: [
      { label: "Hujjat nomi", keys: ["name", "title", "document.name"] },
      { label: "Hujjat holati", keys: ["status.name", "status"] },
      { label: "Toifa", keys: ["category.name", "category", "type.name"] },
      { label: "Imzo", keys: ["signature", "sign", "signed"] },
      { label: "Imzo sanasi", keys: ["signed_at", "signedAt", "signature_date"] },
    ],
  },
  "shaxsiy-ish-reja": {
    title: "Shaxsiy ish reja",
    description: "O'qituvchi shaxsiy ish rejasi",
    resource: "personal-plan",
    filters: ["Mehnat shaklini tanlang", "Stavkani tanlang"],
    fields: [
      { label: "Xodim", keys: ["employee.name", "employee", "full_name"] },
      { label: "Kafedra", keys: ["department.name", "department"] },
      { label: "O'quv yili", keys: ["educationYear.name", "education_year"] },
      { label: "Lavozim", keys: ["staffPosition.name", "position"] },
      { label: "Stavka", keys: ["rate", "stavka"] },
      { label: "Umumiy yuklama", keys: ["total_load", "load"] },
      { label: "Ilmiy / Uslubiy", keys: ["scientific_methodic", "methodic"] },
      { label: "Shaxsiy reja", keys: ["plan", "file"] },
    ],
  },
  "fan-mavzulari": {
    title: "Fan mavzulari",
    description: "Fan mavzulari ro'yxati",
    resource: "subject-topics",
    filters: ["O'quv reja", "O'quv yili", "Semestr"],
    fields: [
      { label: "Fanlar", keys: ["subject.name", "subject"] },
      { label: "O'quv reja", keys: ["curriculum.name", "_curriculum"] },
      { label: "O'quv yili", keys: ["educationYear.name", "educationYear.code"] },
      { label: "Ta'lim turi", keys: ["educationType.name", "educationForm.name"] },
      { label: "Kafedra / Bo'lim", keys: ["department.name", "department"] },
      { label: "Mashg'ulotlar", keys: ["trainings_label", "subjectDetails"] },
    ],
  },
  "fan-resurslari": {
    title: "Fan resurslari",
    description: "Fanlar bo'yicha resurslar",
    resource: "subject-resources",
    action: "Yaratish",
    actionHref: "/xodim/fan-resurslari/yaratish",
    filters: ["Fakultet", "O'quv reja", "Fanlar ro'yxati", "Mashg'ulot", "Xodim", "Til", "Qidirish"],
    fields: [
      { label: "Sarlavha", keys: ["title", "name", "comment"] },
      { label: "Fanlar ro'yxati", keys: ["subject.name", "subjects", "subject"] },
      { label: "Files", keys: ["file_count", "files", "subjectFileResourceItems", "file"] },
      { label: "Yaratilgan", keys: ["created_label", "created_at", "updated_at", "createdAt"] },
      { label: "Faol", keys: ["active", "status"] },
    ],
  },
  "fan-topshiriqlari": {
    title: "Fan topshiriqlari",
    description: "Fan topshiriqlari ro'yxati",
    resource: "subject-tasks",
    filters: ["O'quv yili", "Semestr", "Guruh", "Fan"],
    fields: [
      ...commonSubjectFields,
      { label: "Topshiriqlar", keys: ["task_count", "tasks_count", "task.name", "name", "title"] },
      { label: "Ta'lim tili", keys: ["educationLang.name", "group.educationLang.name", "language"] },
    ],
  },
  "kurs-topshiriqlari": {
    title: "Kurs topshiriqlari",
    description: "Kurs ishlari va topshiriqlar",
    resource: "course-tasks",
    filters: ["O'quv yili", "Semestr", "Guruh", "Fan"],
    fields: [
      ...commonSubjectFields.slice(0, 3),
      { label: "Nazorat turi", keys: ["controlType.name", "examType.name", "control_type"] },
      { label: "Topshiriqlar", keys: ["task_count", "tasks_count", "task.name", "name", "title"] },
      { label: "Semestr", keys: ["semester.name", "_semester", "semester"] },
      { label: "Ta'lim tili", keys: ["educationLang.name", "group.educationLang.name", "language"] },
    ],
  },
  "kalendar-reja": {
    title: "Kalendar reja",
    description: "Fanlar kalendar rejasi",
    resource: "calendar-plan",
    filters: ["O'quv yili", "Semestr", "Guruh", "Fan"],
    fields: [
      { label: "Fanlar", keys: ["subject.name", "subject_name", "name", "fan"] },
      { label: "O'quv reja", keys: ["curriculum.name", "curriculumSubject.curriculum.name", "curriculumSubjectDetail.curriculum.name", "_curriculum", "curriculum"] },
      { label: "Guruh", keys: ["group.name", "groups", "group"] },
      { label: "Mashg'ulot", keys: ["trainingType.name", "_training_type", "lessonType.name"] },
      { label: "Semestr", keys: ["semester.name", "_semester", "semester"] },
      { label: "Fayl nomi", keys: ["file.name", "filename", "file"] },
    ],
  },
  "fan-malumotlari": {
    title: "Fan ma'lumotlari",
    description: "O'qituvchi fanlari",
    resource: "subject-info",
    filters: ["O'quv yili", "Semestr", "Guruh", "Fan"],
    fields: [
      { label: "Fanlar", keys: ["subject.name", "name", "subject"] },
      { label: "O'quv reja", keys: ["curriculum.name", "curriculumSubject.curriculum.name", "curriculumSubjectDetail.curriculum.name", "educationPlan.name", "curriculum"] },
      { label: "Ta'lim turi", keys: ["educationType.name", "curriculum.educationType.name", "education_type"] },
      { label: "Semestr", keys: ["semester.name", "_semester", "semester"] },
    ],
  },
  imtihonlar: {
    title: "Imtihonlar ro'yxati",
    description: "O'qituvchi yaratgan imtihonlar",
    resource: "exams",
    action: "Imtihon yaratish",
    filters: ["O'quv yilini tanlang", "Guruhni tanlang", "Nom bo'yicha qidirish"],
    fields: [
      { label: "Nomi", keys: ["name", "title", "subject.name"] },
      { label: "O'quv yili", keys: ["educationYear.name", "education_year"] },
      { label: "Guruhlar", keys: ["groups", "group.name", "group"] },
      { label: "Savollar soni", keys: ["question_count", "questions_count"] },
      { label: "Boshlanish", keys: ["start_at", "startTime", "begin_at"] },
      { label: "Tugash", keys: ["end_at", "endTime"] },
      { label: "Vaqti (daqiqa)", keys: ["duration", "duration_minutes"] },
      { label: "FaceID", keys: ["face_id", "faceId"] },
      { label: "Faol", keys: ["active", "status"] },
    ],
  },
  "fan-talabalari": {
    title: "Fan talabalari",
    description: "Fanlarga biriktirilgan talabalar",
    resource: "single-students",
    filters: ["O'quv yili", "Semestr", "Fan", "Talaba"],
    fields: [
      { label: "Talaba", keys: ["student.name", "student.full_name", "student"] },
      { label: "Guruh", keys: ["group.name", "group"] },
      { label: "Fan", keys: ["subject.name", "subject"] },
      { label: "Semestr", keys: ["semester.name", "semester"] },
    ],
  },
  "yakka-dars-jadvali": {
    title: "Yakka dars jadvali",
    description: "Yakka darslar jadvali",
    resource: "single-schedule",
    filters: ["O'quv yili", "Semestr", "Fan", "Mashg'ulot"],
    fields: [
      ...commonSubjectFields,
      { label: "Dars sanasi", keys: ["lesson_date", "date"] },
      { label: "Auditoriya", keys: ["auditorium.name", "room"] },
    ],
  },
  "yakka-dars-davomat": {
    title: "Yakka dars davomat",
    description: "Yakka dars davomatlari",
    resource: "single-attendance",
    filters: ["O'quv yili", "Semestr", "Fan", "Mashg'ulot", "Talaba"],
    fields: [
      { label: "O'quv yili", keys: ["educationYear.name", "education_year"] },
      { label: "Semestr", keys: ["semester.name", "semester"] },
      { label: "Dars sanasi", keys: ["lesson_date", "date"] },
      { label: "Fanlar", keys: ["subject.name", "subject"] },
      { label: "Mashg'ulot", keys: ["trainingType.name", "training_type"] },
      { label: "Juftlik", keys: ["lessonPair.name", "pair"] },
      { label: "Auditoriya", keys: ["auditorium.name", "room"] },
      { label: "Xodim", keys: ["employee.name", "employee"] },
      { label: "Talaba", keys: ["student.name", "student"] },
      { label: "Qoldirdi (S/SZ)", keys: ["absent", "absent_off", "absent_on"] },
    ],
  },
  "qayta-oqish": {
    title: "Qayta o'qish",
    description: "Qayta o'qish ro'yxati",
    resource: "retraining",
    filters: ["O'quv yili", "Semestr", "Guruh", "Fan"],
    fields: commonSubjectFields,
  },
  "shaxsiy-qaydnoma-kiritish": {
    title: "Shaxsiy qaydnoma kiritish",
    description: "Baholarni kiritish oynasi",
    resource: "personal-records",
    filters: ["O'quv yili", "Semestr", "Guruh", "Fan"],
    fields: [
      ...commonSubjectFields,
      { label: "Talaba", keys: ["student.name", "student"] },
      { label: "Ball", keys: ["score", "mark", "grade"] },
    ],
  },
  "baholash-sorovlari": {
    title: "Baholash so'rovlari",
    description: "Talaba baholash so'rovlari",
    resource: "grading-surveys",
    filters: ["O'quv yili", "Semestr", "Fan"],
    fields: [
      { label: "Fan", keys: ["subject.name", "subject"] },
      { label: "Talaba", keys: ["student.name", "student"] },
      { label: "Holat", keys: ["status.name", "status"] },
    ],
  },
  mashgulotlar: {
    title: "Mashg'ulotlar",
    description: "Mashg'ulotlar ro'yxati",
    resource: "lesson-list",
    filters: ["O'quv yili", "Semestr", "Guruh", "Fan"],
    fields: [
      ...commonSubjectFields,
      { label: "Dars sanasi", keys: ["lesson_date", "date"] },
      { label: "Auditoriya", keys: ["auditorium.name", "room"] },
    ],
  },
  "dars-jadvali": {
    title: "Dars jadvali",
    description: "O'qituvchi dars jadvali",
    resource: "lesson-schedule",
    filters: ["O'quv yili", "Semestr", "Guruh", "Fan"],
    fields: [
      ...commonSubjectFields,
      { label: "Dars sanasi", keys: ["lesson_date", "date"] },
      { label: "Auditoriya", keys: ["auditorium.name", "room"] },
    ],
  },
  "dars-otish": {
    title: "Dars o'tish",
    description: "Darslar ro'yxati",
    resource: "lesson-list",
    filters: ["O'quv yili", "Semestr", "Guruh", "Fan"],
    fields: [
      ...commonSubjectFields,
      { label: "Dars sanasi", keys: ["lesson_date", "date"] },
      { label: "Auditoriya", keys: ["auditorium.name", "room"] },
    ],
  },
  "davomat-jurnali": {
    title: "Davomat jurnali",
    description: "Davomat jurnali ro'yxati",
    resource: "attendance-journal",
    filters: ["O'quv yili", "Semestr", "Guruh", "Fan"],
    fields: [
      { label: "Guruh", keys: ["group.name", "group"] },
      { label: "Fanlar", keys: ["subject.name", "subject"] },
      { label: "Mashg'ulot", keys: ["trainingType.name", "training_type"] },
      { label: "O'quv yili", keys: ["educationYear.name", "education_year"] },
      { label: "Semestr", keys: ["semester.name", "semester"] },
    ],
  },
  "baholash-jurnali": {
    title: "Baholash jurnali",
    description: "Baholash jurnali ro'yxati",
    resource: "grade-journal",
    filters: ["O'quv yili", "Semestr", "Guruh", "Fan"],
    fields: [
      { label: "Guruh", keys: ["group.name", "group"] },
      { label: "Fanlar", keys: ["subject.name", "subject"] },
      { label: "Mashg'ulot", keys: ["trainingType.name", "training_type"] },
      { label: "O'quv yili", keys: ["educationYear.name", "education_year"] },
      { label: "Semestr", keys: ["semester.name", "semester"] },
    ],
  },
  nazoratlar: {
    title: "Nazoratlar",
    description: "Nazorat ishlari ro'yxati",
    resource: "controls",
    filters: ["O'quv yili", "Semestr", "Guruh", "Fan"],
    fields: [
      ...commonSubjectFields,
      { label: "Nazorat turi", keys: ["controlType.name", "examType.name", "control_type"] },
      { label: "Holat", keys: ["status.name", "status"] },
    ],
  },
  "oraliq-nazorat": {
    title: "Oraliq nazorat",
    description: "Oraliq nazoratlar ro'yxati",
    resource: "midterm-controls",
    filters: ["O'quv yili", "Semestr", "Guruh", "Fan"],
    fields: [
      ...commonSubjectFields,
      { label: "Nazorat turi", keys: ["examType.name", "finalExamType.name"] },
      { label: "Sana", keys: ["examDate", "exam_date", "date"] },
      { label: "Auditoriya", keys: ["auditorium.name", "room"] },
    ],
  },
  "yakuniy-nazorat": {
    title: "Yakuniy nazorat",
    description: "Yakuniy nazoratlar ro'yxati",
    resource: "final-controls",
    filters: ["O'quv yili", "Semestr", "Guruh", "Fan"],
    fields: [
      ...commonSubjectFields,
      { label: "Nazorat turi", keys: ["examType.name", "finalExamType.name"] },
      { label: "Sana", keys: ["examDate", "exam_date", "date"] },
      { label: "Auditoriya", keys: ["auditorium.name", "room"] },
    ],
  },
  "boshqa-nazoratlar": {
    title: "Boshqa nazoratlar",
    description: "Boshqa nazoratlar ro'yxati",
    resource: "other-controls",
    filters: ["O'quv yili", "Semestr", "Guruh", "Fan"],
    fields: [
      ...commonSubjectFields,
      { label: "Nazorat turi", keys: ["examType.name", "finalExamType.name"] },
      { label: "Sana", keys: ["examDate", "exam_date", "date"] },
      { label: "Auditoriya", keys: ["auditorium.name", "room"] },
    ],
  },
  "ilmiy-faoliyat": {
    title: "Ilmiy faoliyat",
    description: "Ilmiy faoliyat ma'lumotlari",
    resource: "scientific-activity",
    filters: ["O'quv yili", "Turi", "Qidirish"],
    fields: [
      { label: "Nomi", keys: ["name", "title"] },
      { label: "Turi", keys: ["type.name", "type"] },
      { label: "Yaratilgan", keys: ["created_at", "date"] },
      { label: "Holat", keys: ["status.name", "status"] },
    ],
  },
  statistika: {
    title: "Statistika",
    description: "O'qituvchi statistikasi",
    resource: "statistics",
    filters: ["O'quv yili", "Semestr"],
    fields: [
      { label: "Ko'rsatkich", keys: ["name", "title", "metric"] },
      { label: "Qiymat", keys: ["value", "count"] },
    ],
  },
  hisobotlar: {
    title: "Hisobotlar",
    description: "Hisobotlar ro'yxati",
    resource: "reports",
    filters: ["O'quv yili", "Turi", "Qidirish"],
    fields: [
      { label: "Hisobot", keys: ["name", "title"] },
      { label: "Turi", keys: ["type.name", "type"] },
      { label: "Yaratilgan", keys: ["created_at", "date"] },
      { label: "Fayl", keys: ["file.name", "file"] },
    ],
  },
  xabarlar: {
    title: "Xabarlar",
    description: "O'qituvchi xabarlari",
    resource: "messages",
    filters: ["Holat", "Qidirish"],
    fields: [
      { label: "Mavzu", keys: ["title", "subject"] },
      { label: "Xabar", keys: ["message", "body", "text"] },
      { label: "Vaqt", keys: ["created_at", "date"] },
      { label: "Holat", keys: ["status.name", "status"] },
    ],
  },
  tizim: {
    title: "Tizim",
    description: "O'qituvchi tizim sozlamalari",
    resource: "settings",
    filters: ["Qidirish"],
    fields: [
      { label: "Parametr", keys: ["name", "title", "full_name"] },
      { label: "Qiymat", keys: ["value", "employee_id_number"] },
    ],
  },
}

function recordId(value: unknown): string {
  const id = asRecord(value).id
  return typeof id === "string" || typeof id === "number" ? String(id) : ""
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function itemValue(item: unknown, keys: string[]): string {
  const read = (source: unknown, path: string): unknown => {
    return path.split(".").reduce<unknown>((current, key) => {
      const record = asRecord(current)
      return record[key]
    }, source)
  }

  for (const key of keys) {
    const value = read(item, key)
    if (value === null || value === undefined || value === "") continue
    if (Array.isArray(value)) {
      const text: string = value
        .map((entry) => {
          if (typeof entry === "string" || typeof entry === "number") return String(entry)
          return itemValue(entry, ["name", "title", "full_name", "file.name", "files"])
        })
        .filter((entry) => entry && entry !== "-")
        .join(", ")
      if (text) return text
      if (value.length) return String(value.length)
      continue
    }
    if (typeof value === "object") {
      const nested: string = itemValue(value, ["name", "title", "full_name", "label", "url"])
      if (nested && nested !== "-") return nested
      continue
    }
    if (typeof value === "boolean") return value ? "Ha" : "Yo'q"
    return String(value)
  }
  return "-"
}

function normalizeItems(data: unknown) {
  if (Array.isArray(data)) return data
  const record = asRecord(data)
  if (Array.isArray(record.items)) return record.items
  if (Array.isArray(record.rows)) return record.rows
  if (Array.isArray(record.data)) return record.data
  if (Object.keys(record).length) return [record]
  return []
}

function filterOptions(data: unknown, param: string) {
  const options = asRecord(asRecord(data).options)[param]
  if (!Array.isArray(options)) return []
  return options
    .map((item) => {
      const record = asRecord(item)
      const value = typeof item === "string" || typeof item === "number" ? String(item) : itemValue(record, ["value", "id", "code"])
      const label = typeof item === "string" || typeof item === "number" ? String(item) : itemValue(record, ["label", "name", "title"])
      return value && label && value !== "-" && label !== "-" ? { value, label } : undefined
    })
    .filter((item): item is { value: string; label: string } => Boolean(item))
}

function academicYearStart() {
  const now = new Date()
  const year = now.getFullYear()
  return now.getMonth() >= 8 ? year : year - 1
}

function filterParam(label: string) {
  const normalized = label.toLowerCase()
  if (normalized.includes("o'quv reja") || normalized.includes("o‘quv reja")) return "_curriculum"
  if (normalized.includes("o'quv yil") || normalized.includes("o‘quv yil")) return "_education_year"
  if (normalized.includes("semestr")) return "_semester"
  if (normalized.includes("guruh")) return "_group"
  if (normalized.includes("fan")) return "_subject"
  if (normalized.includes("mashg'ulot") || normalized.includes("mashg‘ulot")) return "_training_type"
  return null
}

const resourceKindOptions: Array<{ value: LocalResourceKind; label: string; trainingType: string }> = [
  { value: "lecture", label: "Ma'ruza videosi", trainingType: "Ma'ruza" },
  { value: "presentation", label: "Taqdimot videosi", trainingType: "Taqdimot" },
  { value: "laboratory", label: "Laboratoriya videosi", trainingType: "Laboratoriya" },
  { value: "video_lesson", label: "Video dars", trainingType: "Video dars" },
  { value: "meeting_video", label: "Meeting video", trainingType: "Meeting video" },
]

function LocalResourceUploadCard({ onUploaded }: { onUploaded: () => void }) {
  const [subjectName, setSubjectName] = useState("")
  const [title, setTitle] = useState("")
  const [kind, setKind] = useState<LocalResourceKind>("video_lesson")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")

  const selectedKind = resourceKindOptions.find((item) => item.value === kind) ?? resourceKindOptions[3]

  async function handleUpload() {
    setMessage("")
    if (!subjectName.trim()) {
      setMessage("Fan nomini kiriting")
      return
    }
    if (!file) {
      setMessage("Video fayl tanlang")
      return
    }
    if (file.size > 2 * 1024 * 1024 * 1024) {
      setMessage("Video hajmi 2GB dan oshmasligi kerak")
      return
    }

    try {
      setUploading(true)
      await hemisApi.uploadResourceVideo({
        file,
        subjectName: subjectName.trim(),
        title: title.trim() || file.name,
        kind,
        trainingType: selectedKind.trainingType,
      })
      setFile(null)
      setTitle("")
      setMessage("Video saqlandi. Talabalar fan resurslarida ko'radi.")
      onUploaded()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Video yuklanmadi")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-[10px] bg-white p-4" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#eef4ff]">
          <FileVideo className="h-5 w-5 text-[#0e58a8]" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>
            Video resurs yuklash
          </h2>
          <p className="text-xs text-[#7293b9]" style={{ fontFamily: "var(--font-poppins)" }}>
            Video dars yoki meeting yozuvi 2GB gacha local backendda saqlanadi.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <input
          value={subjectName}
          onChange={(event) => setSubjectName(event.target.value)}
          placeholder="Fan nomi"
          className="rounded-[5px] border border-[#d8e6f7] px-3 py-2 text-sm text-[#104475] outline-none"
          style={{ fontFamily: "var(--font-poppins)" }}
        />
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Sarlavha"
          className="rounded-[5px] border border-[#d8e6f7] px-3 py-2 text-sm text-[#104475] outline-none"
          style={{ fontFamily: "var(--font-poppins)" }}
        />
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as LocalResourceKind)}
          className="rounded-[5px] border border-[#d8e6f7] bg-white px-3 py-2 text-sm text-[#104475] outline-none"
          style={{ fontFamily: "var(--font-poppins)" }}
        >
          {resourceKindOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#d8e6f7] px-3 py-2 text-sm text-[#104475]">
          <Upload className="h-4 w-4" />
          <span className="min-w-0 truncate">{file?.name || "Video tanlash"}</span>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#7293b9]" style={{ fontFamily: "var(--font-poppins)" }}>
          {message || "Meeting yozuvi uchun turini \"Meeting video\" qilib yuklang."}
        </p>
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-[5px] bg-[#0e58a8] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ fontFamily: "var(--font-poppins)" }}
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Yuklanmoqda..." : "Yuklash"}
        </button>
      </div>
    </div>
  )
}

const UZ_MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"]
const DAYS_UZ = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"]

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function lessonTypeColors(name: string) {
  const n = (name ?? "").toLowerCase()
  if (n.includes("ma'ruza") || n.includes("maruza") || n.includes("lecture"))
    return { bg: "#e3f2fd", border: "#2196f3", text: "#0d47a1", badge: "#bbdefb" }
  if (n.includes("seminar") || n.includes("amaliy") || n.includes("prakt"))
    return { bg: "#e8f5e9", border: "#4caf50", text: "#1b5e20", badge: "#c8e6c9" }
  if (n.includes("lab"))
    return { bg: "#fff3e0", border: "#ff9800", text: "#e65100", badge: "#ffe0b2" }
  return { bg: "#f3e5f5", border: "#9c27b0", text: "#4a148c", badge: "#e1bee7" }
}

function DarsJadvaliCalendar() {
  const today = new Date()
  const [weekOffset, setWeekOffset] = useState(0)
  const [edYear, setEdYear] = useState(String(academicYearStart()))
  const [semesterVal, setSemesterVal] = useState("")

  const weekStart = useMemo(() => {
    const mon = getMonday(today)
    mon.setDate(mon.getDate() + weekOffset * 7)
    return mon
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset])

  const weekStartTs = useMemo(() => Math.floor(weekStart.getTime() / 1000), [weekStart])

  const weekEndTs = useMemo(() => {
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59)
    return Math.floor(end.getTime() / 1000)
  }, [weekStart])

  const queryParams = useMemo(() => {
    const p: Record<string, string> = { lesson_date_from: String(weekStartTs), lesson_date_to: String(weekEndTs), limit: "200" }
    if (edYear) p._education_year = edYear
    if (semesterVal) p._semester = semesterVal
    return p
  }, [weekStartTs, weekEndTs, edYear, semesterVal])

  const { data, loading, error, refetch } = useApi(
    () => hemisApi.employeeData("lesson-schedule", queryParams),
    [weekStartTs, weekEndTs, edYear, semesterVal]
  )

  const allItems = useMemo(() => normalizeItems(data?.data) as HemisSchedule[], [data?.data])
  const items = allItems

  const weekDates = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    }), [weekStart]
  )

  const pairs = useMemo(() => {
    const map = new Map<string, { name: string; start_time?: string; end_time?: string; sortKey: number }>()
    allItems.forEach(item => {
      const p = item.lessonPair
      if (!p) return
      if (!map.has(p.name)) {
        map.set(p.name, {
          name: p.name,
          start_time: p.start_time,
          end_time: p.end_time,
          sortKey: typeof p.id === "number" ? p.id : (parseInt(String(p.id ?? "")) || map.size + 1),
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.sortKey - b.sortKey)
  }, [allItems])

  const grid = useMemo(() => {
    const map = new Map<string, HemisSchedule[]>()
    items.forEach(item => {
      const d = new Date(item.lesson_date * 1000)
      const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1
      const pairName = item.lessonPair?.name ?? ""
      const key = `${dayIdx}:${pairName}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    })
    return map
  }, [items])

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 5)
    return d
  }, [weekStart])

  const startYear = academicYearStart()

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Dars jadvali
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Haftalik dars jadvali
        </p>
      </div>

      <div className="rounded-[10px] bg-white p-3" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-[#d8e6f7] bg-white text-[#104475] hover:bg-[#f0f7ff]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-[#012970]" style={{ fontFamily: "var(--font-poppins)", minWidth: 190, textAlign: "center" }}>
              {weekStart.getDate()} {UZ_MONTHS_SHORT[weekStart.getMonth()]} — {weekEnd.getDate()} {UZ_MONTHS_SHORT[weekEnd.getMonth()]} {weekEnd.getFullYear()}
            </span>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-[#d8e6f7] bg-white text-[#104475] hover:bg-[#f0f7ff]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="rounded-[5px] border border-[#d8e6f7] bg-white px-3 py-1.5 text-xs text-[#104475] hover:bg-[#f0f7ff]"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Bugun
            </button>
          </div>
          <div className="flex flex-1 flex-wrap gap-2">
            <select
              value={edYear}
              onChange={e => setEdYear(e.target.value)}
              className="rounded-[5px] border border-[#d8e6f7] bg-white px-2 py-1.5 text-xs text-[#104475] outline-none"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              {[startYear, startYear - 1, startYear - 2, startYear - 3].map(y => (
                <option key={y} value={y}>{y}-{y + 1}</option>
              ))}
            </select>
            <select
              value={semesterVal}
              onChange={e => setSemesterVal(e.target.value)}
              className="rounded-[5px] border border-[#d8e6f7] bg-white px-2 py-1.5 text-xs text-[#104475] outline-none"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              <option value="">Barcha semestrlar</option>
              {Array.from({ length: 8 }, (_, i) => i + 1).map(s => (
                <option key={s} value={10 + s}>{s}-semestr</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ApiError message={error} onRetry={refetch} />
      ) : (
        <div className="rounded-[10px] bg-white overflow-x-auto" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
          <table className="w-full border-collapse" style={{ minWidth: 820 }}>
            <thead>
              <tr>
                <th
                  className="w-[110px] border-b border-r p-2 text-left text-xs font-semibold"
                  style={{ borderColor: "rgba(1,41,112,0.1)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#f6f9ff" }}
                >
                  Vaqt
                </th>
                {weekDates.map((d, i) => {
                  const isToday = d.toDateString() === today.toDateString()
                  return (
                    <th
                      key={i}
                      className="border-b border-r p-2 text-center text-xs font-semibold"
                      style={{ borderColor: "rgba(1,41,112,0.1)", color: isToday ? "#0e58a8" : "#012970", fontFamily: "var(--font-poppins)", backgroundColor: isToday ? "#e8f4ff" : "#f6f9ff", minWidth: 120 }}
                    >
                      <div>{DAYS_UZ[i]}</div>
                      <div className="mt-0.5 font-normal" style={{ color: isToday ? "#0e58a8" : "#7293b9" }}>
                        {d.getDate()} {UZ_MONTHS_SHORT[d.getMonth()]}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {pairs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    Bu hafta dars topilmadi
                  </td>
                </tr>
              ) : (
                pairs.map(pair => (
                  <tr key={pair.name}>
                    <td
                      className="border-b border-r p-2 align-top"
                      style={{ borderColor: "rgba(1,41,112,0.08)", backgroundColor: "#fafbff", verticalAlign: "top" }}
                    >
                      <div className="text-xs font-semibold text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>{pair.name}</div>
                      {pair.start_time && (
                        <div className="mt-0.5 text-[10px] text-[#7293b9]" style={{ fontFamily: "var(--font-poppins)" }}>
                          {pair.start_time}{pair.end_time ? ` — ${pair.end_time}` : ""}
                        </div>
                      )}
                    </td>
                    {weekDates.map((d, dayIdx) => {
                      const key = `${dayIdx}:${pair.name}`
                      const cell = grid.get(key) ?? []
                      const isToday = d.toDateString() === today.toDateString()
                      return (
                        <td
                          key={dayIdx}
                          className="border-b border-r p-1.5"
                          style={{ borderColor: "rgba(1,41,112,0.08)", backgroundColor: isToday ? "#f8fbff" : "transparent", verticalAlign: "top" }}
                        >
                          <div className="flex flex-col gap-1">
                            {cell.map((item, idx) => {
                              const colors = lessonTypeColors(item.trainingType?.name ?? "")
                              return (
                                <div key={idx} style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 5, padding: "4px 6px" }}>
                                  <div className="text-xs font-semibold leading-tight" style={{ color: colors.text, fontFamily: "var(--font-poppins)" }}>
                                    {item.subject?.name ?? "—"}
                                  </div>
                                  <div className="mt-0.5 text-[10px]" style={{ color: colors.text, opacity: 0.85, fontFamily: "var(--font-poppins)" }}>
                                    {item.group?.name ?? ""}
                                  </div>
                                  {item.trainingType?.name && (
                                    <span className="mt-0.5 inline-block rounded px-1 py-0.5 text-[9px] font-medium" style={{ backgroundColor: colors.badge, color: colors.text, fontFamily: "var(--font-poppins)" }}>
                                      {item.trainingType.name}
                                    </span>
                                  )}
                                  {item.auditorium?.name && (
                                    <div className="mt-0.5 text-[9px]" style={{ color: colors.text, opacity: 0.7, fontFamily: "var(--font-poppins)" }}>
                                      {item.auditorium.name}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DavomatJurnaliSelector() {
  const [groupId, setGroupId] = useState<number | "">("")
  const { data: groupsRes, loading: lGroups } = useApi(() => teachingApi.groups(), [])
  const groups = groupsRes?.data ?? []

  const { data: subjectsRes, loading: lSubjects } = useApi(
    () => groupId !== "" ? teachingApi.mySubjects(groupId as number) : Promise.resolve(null),
    [groupId]
  )
  const subjects = useMemo(() => {
    const list = subjectsRes?.data?.map(s => s.subjectName) ?? []
    return [...new Set(list)].sort()
  }, [subjectsRes])

  const selectedGroup = groups.find(g => g.id === groupId)

  const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
  const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const
  const sel = "w-full px-3 py-2.5 rounded-[8px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none bg-white"

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={T}>Davomat jurnali</h1>
        <p className="text-sm mt-1" style={L}>Guruh va fanni tanlang</p>
      </div>

      <div className="rounded-[10px] bg-white p-4" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="flex flex-col gap-1 min-w-[200px] max-w-xs">
          <label className="text-xs font-medium" style={L}>O'quv guruhi</label>
          <select
            value={groupId}
            onChange={e => setGroupId(Number(e.target.value) || "")}
            className={sel}
            style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
          >
            <option value="">— Guruhni tanlang —</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      {lGroups && <div className="text-sm" style={L}>Yuklanmoqda...</div>}

      {groupId !== "" && (
        <div className="rounded-[10px] bg-white overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
            <span className="text-sm font-semibold" style={T}>{selectedGroup?.name} — fanlar</span>
          </div>
          {lSubjects ? (
            <div className="p-6 text-center text-sm" style={L}>Yuklanmoqda...</div>
          ) : subjects.length === 0 ? (
            <div className="p-6 text-center text-sm" style={L}>Fanlar topilmadi</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(1,41,112,0.06)" }}>
              {subjects.map(subject => (
                <a
                  key={subject}
                  href={`/oqituvchi-kabineti/davomat-jurnali?group=${groupId}&subject=${encodeURIComponent(subject)}&groupName=${encodeURIComponent(selectedGroup?.name ?? "")}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[#f6f9ff] transition-colors"
                >
                  <span className="text-sm font-medium" style={T}>{subject}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                    Ochish →
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmployeeGenericPage({ slug }: { slug: string }) {
  const config = pageConfigs[slug] ?? pageConfigs.tizim
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<Record<string, string>>({
    _education_year: String(academicYearStart()),
  })
  const queryParams = useMemo(() => {
    return Object.fromEntries(Object.entries(filters).filter(([, value]) => value.trim()))
  }, [filters])
  const { data, loading, error, refetch } = useApi(
    () => hemisApi.employeeData(config.resource, queryParams),
    [config.resource, queryParams._education_year, queryParams._semester, queryParams._group, queryParams._subject, queryParams._training_type, queryParams._curriculum]
  )

  const rows = useMemo(() => {
    const items = normalizeItems(data?.data)
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter((item) =>
      config.fields.some((field) => itemValue(item, field.keys).toLowerCase().includes(query))
    )
  }, [config.fields, data?.data, search])

  if (loading) return <Loading />
  if (error) return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {config.title}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {config.description}
          </p>
        </div>
      </div>

      <div className="rounded-[10px] bg-white" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
        <div className="flex flex-nowrap items-center gap-1.5 p-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <div className="flex flex-nowrap shrink-0 gap-1.5">
            {config.action && config.actionHref && (
              <Link href={config.actionHref} className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#0e58a8] px-2.5 py-1.5 text-xs font-medium text-white"
                style={{ fontFamily: "var(--font-poppins)" }}>
                <Plus className="h-3.5 w-3.5" />
                {config.action}
              </Link>
            )}
            {config.action && !config.actionHref && (
              <button className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#0e58a8] px-2.5 py-1.5 text-xs font-medium text-white"
                style={{ fontFamily: "var(--font-poppins)" }}>
                <Plus className="h-3.5 w-3.5" />
                {config.action}
              </button>
            )}
            <button className="inline-flex items-center gap-1.5 rounded-[5px] border border-[#d8e6f7] bg-white px-2.5 py-1.5 text-xs text-[#104475]"
              style={{ fontFamily: "var(--font-poppins)" }}>
              <Filter className="h-3.5 w-3.5" />
              Filtrlar
            </button>
          </div>
          <div className="flex flex-1 flex-nowrap gap-1.5 min-w-0">
            {config.filters.map((filter) => {
              const param = filterParam(filter)
              if (param === "_education_year") {
                const start = academicYearStart()
                return (
                  <select
                    key={filter}
                    value={filters[param] ?? ""}
                    onChange={(event) => setFilters((current) => ({ ...current, [param]: event.target.value }))}
                    className="w-0 min-w-[90px] flex-1 rounded-[5px] border border-[#d8e6f7] bg-white px-2 py-1.5 text-xs text-[#104475] outline-none"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    <option value="">O'quv yili</option>
                    {[start, start - 1, start - 2, start - 3].map((year) => (
                      <option key={year} value={year}>{year}-{year + 1}</option>
                    ))}
                  </select>
                )
              }
              if (param === "_semester") {
                return (
                  <select
                    key={filter}
                    value={filters[param] ?? ""}
                    onChange={(event) => setFilters((current) => ({ ...current, [param]: event.target.value }))}
                    className="w-0 min-w-[80px] flex-1 rounded-[5px] border border-[#d8e6f7] bg-white px-2 py-1.5 text-xs text-[#104475] outline-none"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    <option value="">Semestr</option>
                    {Array.from({ length: 8 }, (_, index) => {
                      const semester = index + 1
                      return <option key={semester} value={10 + semester}>{semester}-semestr</option>
                    })}
                  </select>
                )
              }
              if (param === "_curriculum") {
                const options = filterOptions(data, param)
                return (
                  <select
                    key={filter}
                    value={filters[param] ?? ""}
                    onChange={(event) => setFilters((current) => ({ ...current, [param]: event.target.value }))}
                    className="w-0 min-w-[100px] flex-1 rounded-[5px] border border-[#d8e6f7] bg-white px-2 py-1.5 text-xs text-[#104475] outline-none"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    <option value="">O'quv reja</option>
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                )
              }
              if (param) {
                return (
                  <input
                    key={filter}
                    value={filters[param] ?? ""}
                    onChange={(event) => setFilters((current) => ({ ...current, [param]: event.target.value }))}
                    placeholder={filter}
                    className="w-0 min-w-[80px] flex-1 rounded-[5px] border border-[#d8e6f7] bg-white px-2 py-1.5 text-xs text-[#104475] outline-none placeholder:text-[#7293b9]"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  />
                )
              }
              return (
                <div key={filter} className="w-0 min-w-[80px] flex-1 rounded-[5px] border border-[#d8e6f7] bg-white px-2 py-1.5 text-xs text-[#7293b9]"
                  style={{ fontFamily: "var(--font-poppins)" }}>
                  {filter}
                </div>
              )
            })}
            <label className="flex w-0 min-w-[100px] flex-1 items-center gap-1.5 rounded-[5px] border border-[#d8e6f7] bg-white px-2 py-1.5 text-[#7293b9]">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Qidirish"
                className="min-w-0 flex-1 bg-transparent text-xs text-[#104475] outline-none placeholder:text-[#7293b9]"
                style={{ fontFamily: "var(--font-poppins)" }}
              />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>#</th>
                {config.fields.map((field) => (
                  <th key={field.label} className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    {field.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((item, index) => (
                  <tr key={index} className="hover:bg-[#f6f9ff]" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{index + 1}</td>
                    {config.fields.map((field) => {
                      const value = itemValue(item, field.keys)
                      if (config.resource === "subject-topics" && field.label === "Fanlar" && value !== "-") {
                        const record = asRecord(item)
                        const subjectName = itemValue(record.subject, ["name"])
                        const curriculumName = itemValue(record.curriculum, ["name", "code"])
                        const semesterName = itemValue(record.semester, ["name", "code"])
                        const href = `/oqituvchi-kabineti/mavzular?subject=${encodeURIComponent(subjectName !== "-" ? subjectName : value)}&curriculum=${encodeURIComponent(curriculumName !== "-" ? curriculumName : "")}&semester=${encodeURIComponent(semesterName !== "-" ? semesterName : "")}`
                        return (
                          <td key={field.label} className="px-4 py-2.5 text-sm">
                            <Link href={href} className="font-medium hover:underline" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                              {value}
                            </Link>
                          </td>
                        )
                      }
                      if (config.resource === "attendance-journal" && field.label === "Fanlar" && value !== "-") {
                        const record = asRecord(item)
                        const groupId = recordId(record.group)
                        const groupName = itemValue(record.group, ["name"])
                        const subjectName = itemValue(record.subject, ["name"])
                        const trainingName = itemValue(record.trainingType, ["name"])
                        const query = new URLSearchParams()
                        if (groupId) query.set("group", groupId)
                        if (groupName !== "-") query.set("groupName", groupName)
                        if (subjectName !== "-") query.set("subject", subjectName)
                        if (trainingName !== "-") query.set("training", trainingName)
                        const href = `/oqituvchi-kabineti/davomat-jurnali?${query.toString()}`
                        return (
                          <td key={field.label} className="px-4 py-2.5 text-sm">
                            <Link href={href} className="font-medium hover:underline" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                              {value}
                            </Link>
                          </td>
                        )
                      }
                      if (config.resource === "grade-journal" && field.label === "Fanlar" && value !== "-") {
                        const record = asRecord(item)
                        const groupId = recordId(record.group)
                        const groupName = itemValue(record.group, ["name"])
                        const subjectName = itemValue(record.subject, ["name"])
                        const trainingName = itemValue(record.trainingType, ["name"])
                        const query = new URLSearchParams()
                        if (groupId) query.set("group", groupId)
                        if (groupName !== "-") query.set("groupName", groupName)
                        if (subjectName !== "-") query.set("subject", subjectName)
                        if (trainingName !== "-") query.set("training", trainingName)
                        const href = `/oqituvchi-kabineti/baholash-jurnali?${query.toString()}`
                        return (
                          <td key={field.label} className="px-4 py-2.5 text-sm">
                            <Link href={href} className="font-medium hover:underline" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                              {value}
                            </Link>
                          </td>
                        )
                      }
                      if (config.resource === "subject-tasks" && field.label === "Fanlar" && value !== "-") {
                        const record = asRecord(item)
                        const subjectId = recordId(record.subject)
                        const groupId = recordId(record.group)
                        const curriculumId = recordId(record.curriculum) || recordId(asRecord(record.curriculumSubject).curriculum) || recordId(asRecord(record.curriculumSubjectDetail).curriculum)
                        const trainingCode = itemValue(record.trainingType, ["code"])
                        const semesterCode = itemValue(record.semester, ["code"])
                        const eduYearCode = itemValue(record.educationYear, ["code"])
                        const maxBall = itemValue(record, ["max_ball"])
                        const query = new URLSearchParams()
                        if (subjectId) query.set("subject", subjectId)
                        if (groupId) query.set("group", groupId)
                        if (curriculumId) query.set("curriculum", curriculumId)
                        if (trainingCode !== "-") query.set("training", trainingCode)
                        if (semesterCode !== "-") query.set("semester", semesterCode)
                        if (eduYearCode !== "-") query.set("eduYear", eduYearCode)
                        if (maxBall !== "-") query.set("maxBall", maxBall)
                        query.set("name", value)
                        const href = `/oqituvchi-kabineti/fan-topshiriqlari?${query.toString()}`
                        return (
                          <td key={field.label} className="px-4 py-2.5 text-sm">
                            <Link href={href} className="font-medium hover:underline" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                              {value}
                            </Link>
                          </td>
                        )
                      }
                      if (field.label === "Mashg'ulotlar" && value !== "-") {
                        return (
                          <td key={field.label} className="px-4 py-2.5 text-sm">
                            <div className="flex flex-wrap gap-1.5">
                              {value.split(",").map((part) => part.trim()).filter(Boolean).map((part, partIndex) => (
                                <span
                                  key={partIndex}
                                  className="rounded-[4px] bg-[#28a745] px-2 py-0.5 text-xs font-medium text-white whitespace-nowrap"
                                  style={{ fontFamily: "var(--font-poppins)" }}
                                >
                                  {part}
                                </span>
                              ))}
                            </div>
                          </td>
                        )
                      }
                      return (
                        <td key={field.label} className="px-4 py-2.5 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                          {value}
                        </td>
                      )
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={config.fields.length + 1} className="px-4 py-12 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    Hech narsa topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function EmployeeWorkspacePage() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug.join("/") : String(params.slug ?? "")
  if (slug === "dars-jadvali") return <DarsJadvaliCalendar />
  if (slug === "davomat-jurnali") return <DavomatJurnaliSelector />
  return <EmployeeGenericPage slug={slug} />
}
