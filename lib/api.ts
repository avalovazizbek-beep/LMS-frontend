const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("lms_token")
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  // Only redirect to login on 401 if a session token already exists
  // (prevents redirect when wrong credentials are entered on login page)
  if (res.status === 401 && typeof window !== "undefined" && localStorage.getItem("lms_token")) {
    localStorage.removeItem("lms_token")
    localStorage.removeItem("lms_role")
    window.location.href = "/login"
    throw new Error("Sessiya tugadi")
  }
  if (!res.ok) throw new Error((data as Record<string, unknown>).message as string || "Xatolik yuz berdi")
  return data
}

// HEMIS API — Express backend orqali (localhost:5000)
const hemisGet  = <T>(path: string) => get<T>(path)
const hemisPost = <T>(path: string, body: unknown) => post<T>(path, body)

const get = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) })
const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PUT", body: JSON.stringify(body) })
const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  })
const del = <T>(path: string) => request<T>(path, { method: "DELETE" })

/* ── Auth ───────────────────────────────────────────────────────── */
export const authApi = {
  login: (username: string, password: string) =>
    post<{ success: boolean; token: string; user: User }>("/api/auth/login", {
      username,
      password,
    }),
  me: () => get<{ success: boolean; user: User }>("/api/auth/me"),
}

/* ── Users ──────────────────────────────────────────────────────── */
export const usersApi = {
  getAdmins: () => get<ListRes<User>>("/api/users/admins"),
  createAdmin: (body: Partial<User>) =>
    post<ItemRes<User>>("/api/users/admins", body),
  updateAdmin: (id: string, body: Partial<User>) =>
    put<ItemRes<User>>(`/api/users/admins/${id}`, body),
  deleteAdmin: (id: string) => del<MsgRes>(`/api/users/admins/${id}`),

  getModerators: () => get<ListRes<User>>("/api/users/moderators"),
  createModerator: (body: Partial<User>) =>
    post<ItemRes<User>>("/api/users/moderators", body),
  updateModerator: (id: string, body: Partial<User>) =>
    put<ItemRes<User>>(`/api/users/moderators/${id}`, body),
  deleteModerator: (id: string) => del<MsgRes>(`/api/users/moderators/${id}`),

  getSellers: () => get<ListRes<User>>("/api/users/sellers"),
  createSeller: (body: Partial<User>) =>
    post<ItemRes<User>>("/api/users/sellers", body),
  updateSeller: (id: string, body: Partial<User>) =>
    put<ItemRes<User>>(`/api/users/sellers/${id}`, body),
  deleteSeller: (id: string) => del<MsgRes>(`/api/users/sellers/${id}`),

  getMasters: () => get<ListRes<User>>("/api/users/masters"),
  createMaster: (body: Partial<User>) =>
    post<ItemRes<User>>("/api/users/masters", body),
  updateMaster: (id: string, body: Partial<User>) =>
    put<ItemRes<User>>(`/api/users/masters/${id}`, body),
  deleteMaster: (id: string) => del<MsgRes>(`/api/users/masters/${id}`),
}

/* ── Groups ─────────────────────────────────────────────────────── */
export const groupsApi = {
  getAll: () => get<ListRes<Group>>("/api/groups"),
  create: (body: Partial<Group>) => post<ItemRes<Group>>("/api/groups", body),
  update: (id: string, body: Partial<Group>) =>
    put<ItemRes<Group>>(`/api/groups/${id}`, body),
  remove: (id: string) => del<MsgRes>(`/api/groups/${id}`),
}

/* ── Exams ──────────────────────────────────────────────────────── */
export const examsApi = {
  getAll: () => get<ListRes<Exam>>("/api/exams"),
  create: (body: Partial<Exam>) => post<ItemRes<Exam>>("/api/exams", body),
  update: (id: string, body: Partial<Exam>) =>
    put<ItemRes<Exam>>(`/api/exams/${id}`, body),
  remove: (id: string) => del<MsgRes>(`/api/exams/${id}`),
}

/* ── Finance ────────────────────────────────────────────────────── */
export const financeApi = {
  getAll: () =>
    get<
      ListRes<Payment> & {
        stats: { total: number; paid: number; debt: number }
      }
    >("/api/finance"),
  create: (body: Partial<Payment>) =>
    post<ItemRes<Payment>>("/api/finance", body),
  pay: (id: string, amount: number) =>
    patch<ItemRes<Payment>>(`/api/finance/${id}/pay`, { amount }),
  update: (id: string, body: Partial<Payment>) =>
    put<ItemRes<Payment>>(`/api/finance/${id}`, body),
  remove: (id: string) => del<MsgRes>(`/api/finance/${id}`),
}

/* ── Documents ──────────────────────────────────────────────────── */
export const documentsApi = {
  getAll: () => get<ListRes<Doc>>("/api/documents"),
  create: (body: Partial<Doc>) => post<ItemRes<Doc>>("/api/documents", body),
  download: (id: string) =>
    patch<ItemRes<Doc>>(`/api/documents/${id}/download`),
  update: (id: string, body: Partial<Doc>) =>
    put<ItemRes<Doc>>(`/api/documents/${id}`, body),
  remove: (id: string) => del<MsgRes>(`/api/documents/${id}`),
}

/* ── Meetings ───────────────────────────────────────────────────── */
export const meetingsApi = {
  getAll: () =>
    get<{ success: boolean; data: { upcoming: Meeting[]; past: Meeting[] } }>(
      "/api/meetings"
    ),
  create: (body: Partial<Meeting>) =>
    post<ItemRes<Meeting>>("/api/meetings", body),
  markDone: (id: string) => patch<ItemRes<Meeting>>(`/api/meetings/${id}/done`),
  remove: (id: string) => del<MsgRes>(`/api/meetings/${id}`),
}

/* ── Notifications ──────────────────────────────────────────────── */
export const notificationsApi = {
  getAll: () => get<ListRes<Notif> & { unread: number }>("/api/notifications"),
  markRead: (id: string) =>
    patch<ItemRes<Notif>>(`/api/notifications/${id}/read`),
  markAllRead: () => patch<MsgRes>("/api/notifications/read-all"),
  remove: (id: string) => del<MsgRes>(`/api/notifications/${id}`),
}

/* ── Board ──────────────────────────────────────────────────────── */
export const boardApi = {
  getAll: () => get<ListRes<BoardPost>>("/api/board"),
  create: (body: Partial<BoardPost>) =>
    post<ItemRes<BoardPost>>("/api/board", body),
  pin: (id: string) => patch<ItemRes<BoardPost>>(`/api/board/${id}/pin`),
  update: (id: string, body: Partial<BoardPost>) =>
    put<ItemRes<BoardPost>>(`/api/board/${id}`, body),
  remove: (id: string) => del<MsgRes>(`/api/board/${id}`),
}

/* ── Schedule / Attendance / Grades ────────────────────────────── */
export const scheduleApi = {
  getAll: () => get<ListRes<Schedule>>("/api/schedule"),
  create: (body: Partial<Schedule>) =>
    post<ItemRes<Schedule>>("/api/schedule", body),
  remove: (id: string) => del<MsgRes>(`/api/schedule/${id}`),
  getAttendance: (studentId?: string) =>
    get<ListRes<Attendance>>(
      `/api/schedule/attendance${studentId ? `?studentId=${studentId}` : ""}`
    ),
  addAttendance: (body: Partial<Attendance>) =>
    post<ItemRes<Attendance>>("/api/schedule/attendance", body),
  getGrades: (studentId?: string) =>
    get<ListRes<Grade> & { gpa: number }>(
      `/api/schedule/grades${studentId ? `?studentId=${studentId}` : ""}`
    ),
  updateGrade: (id: string, body: Partial<Grade>) =>
    put<ItemRes<Grade>>(`/api/schedule/grades/${id}`, body),
}

/* ── Shared Types ───────────────────────────────────────────────── */
export type ListRes<T> = { success: boolean; data: T[] }
export type ItemRes<T> = { success: boolean; data: T }
export type MsgRes = { success: boolean; message: string }

export interface User {
  id: string
  fullName: string
  username: string
  phone: string
  role: string
  status: "active" | "inactive"
  createdAt: string
}
export interface Group {
  id: string
  name: string
  course: number
  direction: string
  students: number
  tutor: string
  status: "active" | "inactive"
  createdAt: string
}
export interface Exam {
  id: string
  subject: string
  group: string
  date: string
  time: string
  duration: string
  room: string
  teacher: string
  type: "Yozma" | "Og'zaki" | "Test"
  status: "scheduled" | "ongoing" | "completed" | "cancelled"
  createdAt: string
}
export interface Payment {
  id: string
  student: string
  group: string
  semester: number
  total: number
  paid: number
  dueDate: string
  status: "paid" | "pending" | "overdue" | "partial"
  createdAt: string
}
export interface Doc {
  id: string
  title: string
  category: string
  type: "pdf" | "word" | "excel" | "image" | "other"
  size: string
  author: string
  date: string
  downloads: number
}
export interface Meeting {
  id: string
  title: string
  subject: string
  host: string
  date: string
  time: string
  duration: string
  participants: number
  link: string
  status: "upcoming" | "done"
}
export interface Notif {
  id: string
  type: "system" | "teacher" | "schedule" | "reminder"
  title: string
  body: string
  time: string
  read: boolean
  userId: string
}
export interface BoardPost {
  id: string
  title: string
  body: string
  tag: string
  date: string
  pinned: boolean
  author: string
}
export interface Schedule {
  id: string
  day: string
  subject: string
  type: "Ma'ruza" | "Seminar" | "Amaliy" | "Laboratoriya"
  time: string
  room: string
  teacher: string
  group: string
}
export interface Attendance {
  id: string
  studentId: string
  subject: string
  date: string
  status: "present" | "absent" | "excused"
}
export interface Grade {
  id: string
  studentId: string
  subject: string
  teacher: string
  credits: number
  midterm?: number
  final?: number
  independent?: number
  total?: number
  grade?: string
}

/* ── Face ID API ─────────────────────────────────────────────────── */
export interface FaceStatus {
  registered: boolean
  expired?: boolean
  registeredAt?: number
  expiresAt?: number
  hasPendingRequest?: boolean
  hasApprovedRequest?: boolean
}
export interface ReRegRequest {
  id: string
  username: string
  reason: string
  status: "pending" | "approved" | "rejected"
  adminNote: string
  createdAt: number
  reviewedAt?: number
}

export const faceApi = {
  status: () =>
    get<{ success: boolean } & FaceStatus>("/api/face/status"),
  register: (descriptors: number[][]) =>
    post<{ success: boolean; message: string; expiresAt?: number }>("/api/face/register", { descriptors }),
  verify: (descriptor: number[]) =>
    post<{ success: boolean; verified: boolean; confidence?: number; distance?: number; reason?: string; message?: string }>("/api/face/verify", { descriptor }),
  requestReRegister: (reason: string) =>
    post<{ success: boolean; message: string }>("/api/face/re-register-request", { reason }),
  getRequests: () =>
    get<{ success: boolean; data: ReRegRequest[] }>("/api/face/requests"),
  reviewRequest: (id: string, action: "approve" | "reject", adminNote?: string) =>
    put<{ success: boolean; message: string }>(`/api/face/requests/${id}`, { action, adminNote }),
}

// Builds an authenticated download URL by passing the JWT token as a query param
// (browser <a href> can't set Authorization headers, so we use ?token=)
export function hemisDownloadUrl(fileUrl?: string, filename?: string): string {
  if (!fileUrl) return "#"
  const token = getToken() ?? ""
  const params = new URLSearchParams({ url: fileUrl, token })
  if (filename) params.set("filename", filename)
  return `${BASE}/api/hemis/download?${params.toString()}`
}

/* ── HEMIS Proxy API ────────────────────────────────────────────────
 *  Frontend → bizning backend → HEMIS API (CORS yo'q)
 *  Token: HEMIS tokeni bizning JWT ichida saqlanadi
 * ─────────────────────────────────────────────────────────────────── */
export const hemisApi = {
  login: (login: string, password: string) =>
    hemisPost<{ success: boolean; token: string }>("/api/hemis/login", { login, password }),

  employeeLogin: (login: string, password: string) =>
    hemisPost<{ success: boolean; token: string }>("/api/hemis/employee-login", { login, password }),

  me: () =>
    hemisGet<{ success: boolean; data: HemisStudent }>("/api/hemis/me"),

  employeeMe: () =>
    hemisGet<{ success: boolean; data: HemisEmployee }>("/api/hemis/employee-me"),

  schedule: (params?: { _week?: string; _group?: string; _semester?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    return hemisGet<{ success: boolean; data: HemisSchedule[] }>(`/api/hemis/schedule${q ? `?${q}` : ""}`)
  },

  attendance: (params?: { _semester?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    return hemisGet<{ success: boolean; data: HemisAttendance[] }>(`/api/hemis/attendance${q ? `?${q}` : ""}`)
  },

  grades: (params?: { _semester?: string; _education_year?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    return hemisGet<{ success: boolean; data: HemisGrade[] }>(`/api/hemis/grades${q ? `?${q}` : ""}`)
  },

  performance: (params?: { _semester?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    return hemisGet<{ success: boolean; data: HemisPerformance[] }>(`/api/hemis/performance${q ? `?${q}` : ""}`)
  },

  gpa: () =>
    hemisGet<{ success: boolean; data: HemisGpa[] }>("/api/hemis/gpa"),

  billing: (params?: { eduYear?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    return hemisGet<{ success: boolean; data: HemisBilling }>(`/api/hemis/billing${q ? `?${q}` : ""}`)
  },

  exams: (params?: { _semester?: string; _group?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    return hemisGet<{ success: boolean; data: HemisExam[] }>(`/api/hemis/exams${q ? `?${q}` : ""}`)
  },

  absence: (params?: { semester?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    return hemisGet<{ success: boolean; data: HemisAbsence }>(`/api/hemis/absence${q ? `?${q}` : ""}`)
  },

  semesters: () =>
    hemisGet<{ success: boolean; data: HemisSemester[] }>("/api/hemis/semesters"),

  resources: (params?: { _semester?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    return hemisGet<{ success: boolean; data: HemisResource[] }>(`/api/hemis/resources${q ? `?${q}` : ""}`)
  },

  tasks: (params?: { _semester?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    return hemisGet<{ success: boolean; data: HemisTask[] }>(`/api/hemis/tasks${q ? `?${q}` : ""}`)
  },

  submitTask: async (taskId: number | string, file: File, comment?: string) => {
    const fileData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve((reader.result as string).split(",")[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    return hemisPost<{ success: boolean; data: unknown }>("/api/hemis/task-submit", {
      task_id:   taskId,
      comment:   comment ?? "",
      filename:  file.name,
      file_type: file.type || "application/octet-stream",
      file_data: fileData,
    })
  },

  contractList: () =>
    hemisGet<{ success: boolean; data: { items: HemisContractItem[]; attributes: Record<string, string> } }>("/api/hemis/contract-list"),

  decree: () =>
    hemisGet<{ success: boolean; data: HemisDecree[] }>("/api/hemis/decree"),

  documents: () =>
    hemisGet<{ success: boolean; data: HemisStudentDoc[] }>("/api/hemis/documents"),

  reference: () =>
    hemisGet<{ success: boolean; data: HemisReference[] }>("/api/hemis/reference"),

  certificate: () =>
    hemisGet<{ success: boolean; data: HemisCertificate[] }>("/api/hemis/certificate"),
}

/* ── HEMIS Types ─────────────────────────────────────────────────── */
export interface HemisStudent {
  id: number | string
  first_name: string
  second_name: string
  third_name: string
  full_name: string
  short_name?: string
  student_id_number?: string
  passport_pin?: string
  email?: string
  phone?: string
  image?: string
  birth_date?: number
  avg_gpa?: string | number
  gpa?: number
  gender?: { id: number | string; name: string; code?: string }
  group?: { id: number | string; name: string; code?: string }
  faculty?: { id: number | string; name: string; code?: string }
  specialty?: { id: number | string; name: string }
  department?: { id: number | string; name: string }
  educationType?: { id: number | string; name: string; code?: string }
  educationForm?: { id: number | string; name: string; code?: string }
  educationLang?: { id: number | string; name: string; code?: string }
  paymentForm?: { id: number | string; name: string; code?: string }
  level?: { id: number | string; name: string; code?: string }
  semester?: { id: number | string; name: string; code: number }
  country?: { code: string; name: string }
  accommodation?: { code: string; name: string }
}

export interface HemisSchedule {
  id: number | string
  subject: { id: number | string; code?: string; name: string }
  group: { id: number | string; name: string }
  employee: { id: number | string; name: string }
  auditorium?: { id: number | string; name: string }
  lessonPair: { id?: number | string; name: string; start_time?: string; end_time?: string }
  lesson_date: number  // Unix timestamp (seconds)
  trainingType: { id?: number | string; code?: string; name: string }
  semester?: { id: number | string; name: string; code?: number }
  faculty?: { id: number | string; name: string }
  educationYear?: { id: number | string; name: string }
  _week?: number | null
  weekStartTime?: number
  weekEndTime?: number
}

export interface HemisAttendance {
  id?: number | string
  subject: { id: number | string; code?: string; name: string }
  semester?: { id: number | string; name: string; code?: number }
  trainingType?: { id: number | string; name: string; code?: string }
  employee?: { id: number | string; name: string }
  lessonPair?: { name: string; start_time: string; end_time: string }
  lesson_date: number  // Unix timestamp (seconds)
  absent_on: number   // 0 or 1 — absent with reason
  absent_off: number  // 0 or 1 — absent without reason
  explicable?: boolean
  hours?: number
  academic_hours?: number
}

export interface HemisGrade {
  id: number | string
  subject_name: string
  subject_code: string
  subject_type?: string
  employee_name: string
  semester_name: string
  total_acload: number
  credit: number
  total_point: number  // 0–100 score
  grade: number | null
  finish_credit_status: boolean
  retraining_status?: boolean
  _semester: string
  _education_year: string
}

export interface HemisPerformance {
  id: string
  student: { id: string; name: string }
  subject: { id: string; name: string }
  examDate: string
  score: number
  examType: { id: string; name: string }
  employee: { id: string; name: string }
}

export interface HemisGpa {
  id: string
  student: { id: string; name: string }
  gpa: number
  educationYear: { id: string; name: string }
  level: { id: string; name: string }
}

export interface HemisBilling {
  subsidy_rent?: { amount: number; paid: number; debt: number }
  credit_module?: { amount: number; paid: number; debt: number }
  residence?: { amount: number; paid: number; debt: number }
}

export interface HemisExam {
  id: number | string
  subject: { id: number | string; name: string; code?: string }
  group?: { id: number | string; name: string }
  examType: { id: number | string; name: string }
  finalExamType?: { id: number | string; name: string }
  auditorium?: { id: number | string; name: string }
  employee: { id: number | string; name: string }
  semester?: { id: number | string; name: string }
  lessonPair?: { name: string; start_time: string; end_time: string }
  examDate?: number  // Unix timestamp (seconds)
  faculty?: { id: number | string; name: string }
  educationYear?: { id: number | string; name: string }
}

export interface HemisAbsence {
  student_id: string
  full_name: string
  absent_without_reason: number
  absent_with_reason: number
  total_absent: number
}

export interface HemisSemester {
  id: number | string
  name: string
  code: number
  educationYear?: { id: number | string; name: string }
  current?: boolean
}

export interface HemisResourceFile {
  name: string
  size: string | number
  url: string
}

export interface HemisResourceItem {
  id: number | string
  comment?: string
  resourceType?: { code: string; name: string }
  url?: string
  files?: HemisResourceFile[]
  updated_at?: number
}

export interface HemisResource {
  id: number | string
  title?: string
  comment?: string
  subject?: { id: number | string; name: string; code?: string }
  trainingType?: { code: string; name: string }
  employee?: { id: number | string; name: string }
  subjectFileResourceItems?: HemisResourceItem[]
  active?: boolean
  updated_at?: number
}

export interface HemisTask {
  id: number | string
  _student?: number | string
  subject?: { id: number | string; name: string; code?: string }
  name?: string
  comment?: string
  max_ball?: number
  deadline?: number
  trainingType?: { code: string; name: string }
  attempt_limit?: number
  attempt_count?: number | null
  files?: HemisResourceFile[]
  taskType?: { code: string; name: string }
  taskStatus?: { code: string; name: string }
  employee?: { id: number | string; name: string }
  updated_at?: number
  studentTaskActivity?: {
    id: number | string
    comment?: string
    send_date?: number
    files?: HemisResourceFile[]
    mark?: number | null
    marked_comment?: string
    marked_date?: number
  } | null
}

export interface HemisContractData {
  contractNumber?: string
  contractAmount?: string | number
  paidAmount?: string | number
  debitAmount?: string | number
  creditAmount?: string | number
  status?: string
  course?: string
  speciality?: string
  pdfLink?: string
  lastPaymentDate?: string
  eduYear?: string
  fullName?: string
}

export interface HemisContractItem {
  id: number | string
  _data?: HemisContractData
  created_at?: number
  updated_at?: number
}

export interface HemisDecree {
  id: number | string
  number?: string
  name?: string
  department?: { id: number | string; name: string }
  decreeType?: { code: string; name: string }
  file?: string
  date?: number
}

export interface HemisStudentDoc {
  type?: string
  id: number | string
  name?: string
  attributes?: { label: string; value: string }[]
  file?: string
  link?: string
}

export interface HemisReference {
  id: number | string
  name?: string
  type?: string
  file?: string
  created_at?: number
}

export interface HemisCertificate {
  id: number | string
  name?: string
  certificateType?: { code: string; name: string }
  organization?: string
  score?: string | number
  file?: string
  date?: number
  created_at?: number
}

export interface HemisEmployee {
  id: number | string
  meta_id?: number | string
  first_name: string
  second_name: string
  third_name?: string
  full_name: string
  short_name?: string
  image?: string
  employee_id_number?: number | string
  gender?: { id: number | string; name: string; code?: string }
  department?: { id: number | string; name: string }
  academicDegree?: { id: number | string; name: string }
  academicRank?: { id: number | string; name: string }
  employmentForm?: { id: number | string; name: string }
  staffPosition?: { id: number | string; name: string }
  employeeStatus?: { id: number | string; name: string }
  employeeType?: { id: number | string; name: string }
  specialty?: string
  active?: boolean
  birth_date?: number
}
