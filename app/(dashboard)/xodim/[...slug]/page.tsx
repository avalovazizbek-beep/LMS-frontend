"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { FileVideo, Filter, Plus, Search, Upload } from "lucide-react"
import { hemisApi, type LocalResourceKind } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

type Field = { label: string; keys: string[] }
type PageConfig = {
  title: string
  description: string
  resource: string
  action?: string
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
    filters: ["O'quv reja", "O'quv yili", "Semestr", "Fan"],
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
      ...commonSubjectFields,
      { label: "Talaba", keys: ["student.name", "student"] },
      { label: "Ball", keys: ["grade", "mark", "score"] },
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

export default function EmployeeWorkspacePage() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug.join("/") : String(params.slug ?? "")
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
        {data?.source && (
          <span className="self-start rounded-[5px] border border-[#d8e6f7] bg-white px-3 py-2 text-xs text-[#104475]"
            style={{ fontFamily: "var(--font-poppins)" }}>
            Manba: {data.source}
          </span>
        )}
      </div>

      <div className="rounded-[10px] bg-white" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <div className="flex flex-wrap gap-2">
            {config.action && (
              <button className="inline-flex items-center gap-2 rounded-[5px] bg-[#0e58a8] px-3 py-2 text-sm font-medium text-white"
                style={{ fontFamily: "var(--font-poppins)" }}>
                <Plus className="h-4 w-4" />
                {config.action}
              </button>
            )}
            <button className="inline-flex items-center gap-2 rounded-[5px] border border-[#d8e6f7] bg-white px-3 py-2 text-sm text-[#104475]"
              style={{ fontFamily: "var(--font-poppins)" }}>
              <Filter className="h-4 w-4" />
              Filtrlar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {config.filters.map((filter) => {
              const param = filterParam(filter)
              if (param === "_education_year") {
                const start = academicYearStart()
                return (
                  <select
                    key={filter}
                    value={filters[param] ?? ""}
                    onChange={(event) => setFilters((current) => ({ ...current, [param]: event.target.value }))}
                    className="min-w-[180px] rounded-[5px] border border-[#d8e6f7] bg-white px-3 py-2 text-sm text-[#104475] outline-none"
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
                    className="min-w-[180px] rounded-[5px] border border-[#d8e6f7] bg-white px-3 py-2 text-sm text-[#104475] outline-none"
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
                    className="min-w-[220px] rounded-[5px] border border-[#d8e6f7] bg-white px-3 py-2 text-sm text-[#104475] outline-none"
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
                    className="min-w-[180px] rounded-[5px] border border-[#d8e6f7] bg-white px-3 py-2 text-sm text-[#104475] outline-none placeholder:text-[#7293b9]"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  />
                )
              }
              return (
                <div key={filter} className="min-w-[180px] rounded-[5px] border border-[#d8e6f7] bg-white px-3 py-2 text-sm text-[#7293b9]"
                  style={{ fontFamily: "var(--font-poppins)" }}>
                  {filter}
                </div>
              )
            })}
            <label className="flex min-w-[220px] items-center gap-2 rounded-[5px] border border-[#d8e6f7] bg-white px-3 py-2 text-[#7293b9]">
              <Search className="h-4 w-4" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Qidirish"
                className="min-w-0 flex-1 bg-transparent text-sm text-[#104475] outline-none placeholder:text-[#7293b9]"
                style={{ fontFamily: "var(--font-poppins)" }}
              />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>#</th>
                {config.fields.map((field) => (
                  <th key={field.label} className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    {field.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((item, index) => (
                  <tr key={index} className="hover:bg-[#f6f9ff]" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{index + 1}</td>
                    {config.fields.map((field) => (
                      <td key={field.label} className="px-4 py-3 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                        {itemValue(item, field.keys)}
                      </td>
                    ))}
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
