const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
const MEETING_BASE =
  process.env.NEXT_PUBLIC_MEETING_API_URL || "/api/meeting"

function getToken() {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem("lms_token")
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  // Only redirect to login on 401 if a session token already exists
  // (prevents redirect when wrong credentials are entered on login page)
  if (res.status === 401 && typeof window !== "undefined" && sessionStorage.getItem("lms_token")) {
    sessionStorage.removeItem("lms_token")
    sessionStorage.removeItem("lms_role")
    localStorage.removeItem("lms_token")
    localStorage.removeItem("lms_role")
    window.location.href = "/login"
    throw new Error("Sessiya tugadi")
  }
  if (!res.ok) {
    const error = new Error(readApiMessage(data) || "Xatolik yuz berdi") as Error & {
      status?: number
      data?: unknown
    }
    error.status = res.status
    error.data = data
    throw error
  }
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

async function rawUpload<T>(path: string, file: File): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    body: file,
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(readApiMessage(data) || "Fayl yuklashda xatolik")
  return data
}

async function meetingRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const res = await fetch(`${MEETING_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  let data: unknown = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) throw new Error(readApiMessage(data) || "Meeting API xatoligi")
  return data as T
}

const meetingGet = <T>(path: string) => meetingRequest<T>(path)
const meetingPost = <T>(path: string, body?: unknown) =>
  meetingRequest<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  })

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null
}

function textValue(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
    if (!value || typeof value !== "object" || Array.isArray(value)) continue

    const record = asRecord(value)
    const nested = textValue(
      record.fullName,
      record.full_name,
      record.name,
      record.title,
      record.username
    )
    if (nested) return nested
  }
  return undefined
}

function numberValue(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return undefined
}

function readApiMessage(value: unknown): string | undefined {
  const record = asRecord(value)
  const message = textValue(record.message, record.error, record.detail)
  const details = asArray(record.details)
    ?.map((item) => textValue(item))
    .filter(Boolean)
    .slice(0, 3)
    .join("; ")
  return details ? `${message || "Xatolik yuz berdi"}: ${details}` : message
}

function unwrapData(value: unknown): unknown {
  const record = asRecord(value)
  return "data" in record ? record.data : value
}

function formatDateValue(...values: unknown[]): string {
  const rawNumber = numberValue(...values)
  const rawText = textValue(...values)
  const raw = rawNumber ?? rawText
  if (!raw) return "-"

  const date =
    typeof raw === "number"
      ? new Date(raw < 1_000_000_000_000 ? raw * 1000 : raw)
      : new Date(raw)

  if (Number.isNaN(date.getTime())) return String(raw)
  return date.toISOString().slice(0, 10)
}

function formatTimeValue(...values: unknown[]): string {
  const rawNumber = numberValue(...values)
  const rawText = textValue(...values)
  const raw = rawNumber ?? rawText
  if (!raw) return "-"

  const date =
    typeof raw === "number"
      ? new Date(raw < 1_000_000_000_000 ? raw * 1000 : raw)
      : new Date(raw)

  if (Number.isNaN(date.getTime())) return String(raw)
  return date.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function normalizeDuration(...values: unknown[]): string {
  const rawNumber = numberValue(...values)
  const rawText = textValue(...values)
  if (rawNumber !== undefined) return `${rawNumber} daqiqa`
  return rawText || "60 daqiqa"
}

function normalizeDurationFromRange(startValue: unknown, endValue: unknown) {
  const startRaw = textValue(startValue)
  const endRaw = textValue(endValue)
  if (!startRaw || !endRaw) return undefined

  const start = new Date(startRaw)
  const end = new Date(endRaw)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return undefined
  }

  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
  return `${minutes} daqiqa`
}

function combineArrays(...values: unknown[]) {
  const items = values.flatMap((value) => asArray(value) ?? [])
  return items.length ? items : null
}

function normalizeMeeting(value: unknown, index = 0): Meeting {
  const raw = asRecord(value)
  const settings = asRecord(raw.settings)
  const permissions = asRecord(raw.permissions)
  const groupIds = asArray(raw.groupIds)
  const startsAt =
    raw.startTime ?? raw.startsAt ?? raw.startAt ?? raw.scheduledAt ?? raw.start_time
  const endsAt = raw.endTime ?? raw.endsAt ?? raw.endAt ?? raw.end_time
  const participantArray = asArray(raw.participants)
  const participantCount =
    numberValue(
      raw.participants,
      raw.participantsCount,
      raw.participantCount,
      raw.attendeesCount,
      raw.membersCount
    ) ??
    participantArray?.length ??
    0
  const rawStatus = (textValue(raw.status, raw.state) || "scheduled").toLowerCase()
  const doneStatuses = new Set([
    "done",
    "ended",
    "completed",
    "finished",
    "cancelled",
  ])
  const normalizedDuration =
    normalizeDurationFromRange(startsAt, endsAt) ??
    normalizeDuration(
      raw.duration,
      raw.durationMinutes,
      settings.duration,
      settings.durationMinutes
    )

  return {
    id: textValue(raw.id, raw._id, raw.meetingId, raw.uuid) || `meeting-${index}`,
    title: textValue(raw.title, raw.name, raw.topic) || "Meeting",
    subject:
      textValue(raw.subject, raw.course, raw.lesson, raw.description) || "",
    host:
      textValue(
        raw.host,
        raw.hostName,
        raw.teacher,
        raw.teacherName,
        raw.createdBy,
        raw.createdByUserId,
        raw.owner,
        raw.user
      ) || "",
    date: formatDateValue(raw.date, raw.meetingDate, startsAt),
    time: formatTimeValue(raw.time, raw.startTime, startsAt),
    duration: normalizedDuration,
    participants: participantCount,
    link: textValue(raw.link, raw.url, raw.joinUrl, raw.meetingUrl) || "#",
    status: doneStatuses.has(rawStatus) ? "done" : "upcoming",
    description: textValue(raw.description),
    startTime: textValue(raw.startTime, startsAt),
    endTime: textValue(raw.endTime, endsAt),
    groupIds: groupIds?.map((item) => numberValue(item) ?? item) ?? [],
    settings,
    permissions,
    canJoinNow: Boolean(raw.canJoinNow),
    rawStatus,
  }
}

function normalizeMeetingGroups(payload: unknown): {
  upcoming: Meeting[]
  past: Meeting[]
} {
  const body = unwrapData(payload)
  const record = asRecord(body)
  const upcomingRaw = combineArrays(record.upcoming, record.scheduled, record.live)
  const pastRaw = combineArrays(
    record.past,
    record.done,
    record.completed,
    record.ended,
    record.cancelled
  )

  if (upcomingRaw || pastRaw) {
    return {
      upcoming: (upcomingRaw || []).map((item, index) =>
        normalizeMeeting(item, index)
      ),
      past: (pastRaw || []).map((item, index) => normalizeMeeting(item, index)),
    }
  }

  const items =
    asArray(body) ||
    asArray(record.items) ||
    asArray(record.meetings) ||
    asArray(record.rows) ||
    []
  const meetings = items.map((item, index) => normalizeMeeting(item, index))

  return {
    upcoming: meetings.filter((meeting) => meeting.status !== "done"),
    past: meetings.filter((meeting) => meeting.status === "done"),
  }
}

function meetingItemResponse(payload: unknown): ItemRes<Meeting> {
  return { success: true, data: normalizeMeeting(unwrapData(payload)) }
}

function joinTokenResponse(payload: unknown): ItemRes<JoinTokenResponse> {
  const body = unwrapData(payload)
  const record = asRecord(body)
  const meeting = "meeting" in record ? normalizeMeeting(record.meeting) : undefined
  const permissions = asRecord(record.permissions)

  return {
    success: true,
    data: {
      token: textValue(record.token, record.joinToken, record.accessToken) || "",
      meeting,
      permissions,
      meetingId: textValue(record.meetingId, record.id, meeting?.id),
      expiresIn: textValue(record.expiresIn),
      expiresAt: textValue(record.expiresAt, record.expireAt, record.expires_at),
      socketUrl: textValue(record.socketUrl, record.wsUrl, record.realtimeUrl),
      raw: body,
    },
  }
}

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
async function getStudentMeetings() {
  const res = await meetingGet<unknown>("/api/meetings/my")
  return { success: true, data: normalizeMeetingGroups(res) }
}

async function getMeetingJoinToken(id: string) {
  const res = await meetingPost<unknown>(`/api/meetings/${id}/join-token`)
  return joinTokenResponse(res)
}

export const meetingsApi = {
  health: () => meetingGet<SuccessEnvelope<{ status?: string }>>("/health"),
  getStudentMeetings,
  getAll: getStudentMeetings,
  getOne: async (id: string) => {
    const res = await meetingGet<unknown>(`/api/meetings/${id}`)
    return meetingItemResponse(res)
  },
  create: async (body: CreateMeetingRequest | Partial<Meeting>) => {
    const res = await meetingPost<unknown>("/api/meetings", body)
    return meetingItemResponse(res)
  },
  start: async (id: string) => {
    const res = await meetingPost<unknown>(`/api/meetings/${id}/start`)
    return meetingItemResponse(res)
  },
  end: async (id: string) => {
    const res = await meetingPost<unknown>(`/api/meetings/${id}/end`)
    return meetingItemResponse(res)
  },
  studentJoinToken: getMeetingJoinToken,
  joinToken: getMeetingJoinToken,
  attendance: (id: string) =>
    meetingGet<SuccessEnvelope<AttendanceSummary[] | AttendanceSummary>>(
      `/api/meetings/${id}/attendance`
    ),
  remove: (id: string) =>
    meetingRequest<{ success: boolean; message: string }>(`/api/meetings/${id}`, { method: "DELETE" }),

  syncAttendance: () =>
    meetingPost<SuccessEnvelope<{ queued?: number }>>(
      "/api/internal/attendance/sync"
    ),
  devUsers: () => meetingGet<SuccessEnvelope<unknown[]>>("/api/dev/users"),
  devToken: (body: { userId?: string; role?: string; username?: string }) =>
    meetingPost<SuccessEnvelope<{ token: string }>>("/api/dev/token", body),
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
export type SuccessEnvelope<T = unknown> = {
  success: boolean
  data: T
  message?: string
}
export type ErrorEnvelope = {
  success: false
  message: string
  error?: string
}

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
  description?: string
  startTime?: string
  endTime?: string
  groupIds?: unknown[]
  settings?: Record<string, unknown>
  permissions?: Record<string, unknown>
  canJoinNow?: boolean
  rawStatus?: string
}
export interface MeetingSettings {
  allowCamera?: boolean
  allowMicrophone?: boolean
  allowScreenShare?: boolean
  allowChat?: boolean
  [key: string]: unknown
}
export interface CreateMeetingRequest {
  title: string
  description?: string
  startTime: string
  endTime: string
  groupIds: Array<number | string>
  settings?: MeetingSettings
  [key: string]: unknown
}
export interface MeetingPermissions extends MeetingSettings {
  canManageMeeting?: boolean
}
export interface AttendanceSession {
  id?: string
  sessionId?: number
  joinedAt?: string
  leftAt?: string | null
  totalSeconds?: number
  totalMinutes?: number
  totalDurationLabel?: string
  status?: string
  durationSeconds?: number
  durationMinutes?: number
  [key: string]: unknown
}
export interface AttendanceSummary {
  attendanceId?: number
  meetingId?: number
  userId?: number
  groupId?: number | null
  studentId?: string
  fullName?: string
  firstName?: string
  lastName?: string
  firstJoinedAt?: string | null
  lastLeftAt?: string | null
  totalSeconds?: number
  totalMinutes?: number
  totalDurationLabel?: string
  sessionCount?: number
  currentlyInMeeting?: boolean
  isPresent?: boolean
  syncedToMainBackend?: boolean
  totalDurationSeconds?: number
  totalDurationMinutes?: number
  sessions?: AttendanceSession[]
  [key: string]: unknown
}
export interface JoinTokenResponse {
  token: string
  meeting?: Meeting
  permissions?: MeetingPermissions | Record<string, unknown>
  meetingId?: string
  expiresIn?: string
  expiresAt?: string
  socketUrl?: string
  raw?: unknown
  [key: string]: unknown
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
  confirmed?: boolean
  registeredAt?: number
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
    post<{ success: boolean; message: string }>("/api/face/register", { descriptors }),
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
  autoLogin: (login: string, password: string) =>
    hemisPost<{ success: boolean; token: string; role: "student" | "employee"; source?: string }>("/api/hemis/auto-login", { login, password }),

  login: (login: string, password: string) =>
    hemisPost<{ success: boolean; token: string }>("/api/hemis/login", { login, password }),

  employeeLogin: (login: string, password: string) =>
    hemisPost<{ success: boolean; token: string }>("/api/hemis/employee-login", { login, password }),

  oauthUrl: (role: "student" | "employee" | "tutor" | "auto") => {
    const q = new URLSearchParams({ role }).toString()
    return hemisGet<{ success: boolean; url: string; state: string; redirectUri: string }>(`/api/hemis/oauth/url?${q}`)
  },

  oauthStartUrl: (role: "student" | "employee" | "tutor", login?: string) => {
    const q = login ? `?${new URLSearchParams({ login }).toString()}` : ""
    return `${BASE}/api/hemis/oauth/start/${role}${q}`
  },

  oauthCallback: (role: "student" | "employee" | "tutor" | "auto", code: string, redirectUri: string, state: string) =>
    hemisPost<{ success: boolean; token: string; role: "student" | "employee" }>("/api/hemis/oauth/callback", {
      role,
      code,
      redirectUri,
      state,
    }),

  me: () =>
    hemisGet<{ success: boolean; data: HemisStudent }>("/api/hemis/me"),

  employeeMe: () =>
    hemisGet<{ success: boolean; data: HemisEmployee }>("/api/hemis/employee-me"),

  employeeData: (resource: string, params?: Record<string, string>) => {
    const q = new URLSearchParams(params ?? {}).toString()
    return hemisGet<{ success: boolean; data: unknown; source?: string }>(
      `/api/hemis/employee/${resource}${q ? `?${q}` : ""}`
    )
  },

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

  localResources: (params?: { subject?: string; kind?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    return hemisGet<{ success: boolean; data: LocalResource[] }>(`/api/local-resources${q ? `?${q}` : ""}`)
  },

  uploadResourceVideo: (input: {
    file: File
    subjectName: string
    subjectId?: string
    title?: string
    comment?: string
    kind: LocalResourceKind
    trainingType?: string
    meetingId?: string
  }) => {
    const q = new URLSearchParams({
      subjectName: input.subjectName,
      filename: input.file.name,
      kind: input.kind,
      ...(input.subjectId ? { subjectId: input.subjectId } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.comment ? { comment: input.comment } : {}),
      ...(input.trainingType ? { trainingType: input.trainingType } : {}),
      ...(input.meetingId ? { meetingId: input.meetingId } : {}),
    }).toString()
    return rawUpload<{ success: boolean; data: LocalResource }>(`/api/local-resources/upload?${q}`, input.file)
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

export type LocalResourceKind =
  | "lecture"
  | "presentation"
  | "laboratory"
  | "video_lesson"
  | "meeting_video"
  | "other"

export interface LocalResource {
  id: string
  subjectId?: string
  subjectName: string
  title: string
  comment?: string
  kind: LocalResourceKind
  trainingTypeName: string
  employeeName?: string
  meetingId?: string
  file: {
    name: string
    originalName: string
    mimeType: string
    size: number
    relativePath: string
    url: string
  }
  createdAt: string
  updatedAt: string
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
  endRestDebetAmount?: string | number
  creditAmount?: string | number
  status?: string
  course?: string
  speciality?: string
  pdfLink?: string
  contractUrl?: string
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
