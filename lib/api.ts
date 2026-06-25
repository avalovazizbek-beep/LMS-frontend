const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
const PUBLIC_BASE = process.env.NEXT_PUBLIC_PUBLIC_API_URL || BASE
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

/** Fayl yuklash, foiz progress bilan (XMLHttpRequest orqali — fetch upload progressni qo'llamaydi) */
function rawUploadWithProgress<T>(path: string, file: File, onProgress: (percent: number) => void): Promise<T> {
  const token = getToken()
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${BASE}${path}`)
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
    xhr.setRequestHeader("ngrok-skip-browser-warning", "true")
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      let data: unknown = null
      try { data = JSON.parse(xhr.responseText) } catch {}
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T)
      } else {
        reject(new Error(readApiMessage(data) || "Fayl yuklashda xatolik"))
      }
    }
    xhr.onerror = () => reject(new Error("Fayl yuklashda xatolik"))
    xhr.send(file)
  })
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

async function meetingUpload<T>(path: string, blob: Blob, filename: string): Promise<T> {
  const token = getToken()
  const url = `${MEETING_BASE}${path}${path.includes("?") ? "&" : "?"}filename=${encodeURIComponent(filename)}`
  const res = await fetch(url, {
    method: "POST",
    body: blob,
    headers: {
      "Content-Type": blob.type || "application/octet-stream",
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  if (!res.ok) throw new Error(readApiMessage(data) || "Yozuvni yuklashda xatolik")
  return data as T
}

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
  const groupNames = asArray(raw.groupNames)?.map(n => textValue(n)).filter(Boolean) as string[] | undefined
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
    subjectName: textValue(raw.subjectName, raw.subject_name) || "",
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
    groupNames: groupNames ?? [],
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

function recordingFileUrl(id: string): string {
  const token = getToken()
  return `${MEETING_BASE}/api/meetings/recordings/${id}/file${token ? `?token=${encodeURIComponent(token)}` : ""}`
}

function normalizeRecording(value: unknown): MeetingRecording {
  const raw = asRecord(value)
  const groupIds = asArray(raw.groupIds)
  const id = textValue(raw.id) || ""

  return {
    id,
    meetingId: textValue(raw.meetingId) || "",
    title: textValue(raw.title) || "Dars",
    subjectName: textValue(raw.subjectName, raw.subject_name) || "",
    groupIds: groupIds?.map((item) => numberValue(item) ?? 0) ?? [],
    date: formatDateValue(raw.startTime, raw.createdAt),
    time: formatTimeValue(raw.startTime, raw.createdAt),
    fileUrl: id ? recordingFileUrl(id) : "",
    createdAt: textValue(raw.createdAt) || "",
  }
}

function recordingsResponse(payload: unknown): ListRes<MeetingRecording> {
  const body = unwrapData(payload)
  const items = asArray(body) || []
  return { success: true, data: items.map(normalizeRecording) }
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

  recordings: async (meetingId: string) => {
    const res = await meetingGet<unknown>(`/api/meetings/${meetingId}/recordings`)
    return recordingsResponse(res)
  },
  myRecordings: async () => {
    const res = await meetingGet<unknown>("/api/meetings/recordings/mine")
    return recordingsResponse(res)
  },
  recordingsBySubject: (subject: string) =>
    meetingGet<{ success: boolean; data: SubjectRecording[] }>(
      `/api/meetings/recordings/by-subject?subject=${encodeURIComponent(subject)}`
    ),
  uploadRecording: (meetingId: string, blob: Blob, filename: string) =>
    meetingUpload<SuccessEnvelope<unknown>>(`/api/meetings/${meetingId}/recordings`, blob, filename),
  recordingFileUrl,
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
  subjectName?: string
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
  groupNames?: string[]
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
  subjectName?: string
  startTime: string
  endTime: string
  groupIds: Array<number | string>
  settings?: MeetingSettings
  [key: string]: unknown
}
export interface MeetingRecording {
  id: string
  meetingId: string
  title: string
  subjectName: string
  groupIds: number[]
  date: string
  time: string
  fileUrl: string
  createdAt: string
}

export interface SubjectRecording {
  id: string
  meetingId: string
  title: string
  subjectName: string
  groupIds: number[]
  groupNames: string[]
  startTime: string
  fileUrl: string
  originalName: string
  mimeType: string
  createdAt: string
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

// Bir nechta faylni bitta zip arxiv qilib yuklab olish uchun link yaratadi
export function hemisDownloadZipUrl(files: Array<{ file?: string; name?: string }>, zipName?: string): string {
  const validFiles = files.filter((f): f is { file: string; name?: string } => Boolean(f.file))
  if (!validFiles.length) return "#"
  const token = getToken() ?? ""
  const params = new URLSearchParams({
    files: JSON.stringify(validFiles.map((f) => ({ url: f.file, name: f.name }))),
    token,
  })
  if (zipName) params.set("filename", zipName)
  return `${BASE}/api/hemis/download-zip?${params.toString()}`
}

// HEMIS "Kalendar reja" sahifasidagi Calendar_plan-<Fan>.pdf faylini yuklab olish uchun link yaratadi
export function hemisCalendarPlanPdfUrl(params: {
  curriculum?: string | null
  semester?: string | null
  educationYear?: string | null
  subject?: string | null
  group?: string | null
  trainingType?: string | null
  educationLang?: string | null
  filename?: string
}): string {
  if (!params.curriculum || !params.subject) return "#"
  const token = getToken() ?? ""
  const qp = new URLSearchParams({ token })
  if (params.curriculum) qp.set("curriculum", params.curriculum)
  if (params.semester) qp.set("semester", params.semester)
  if (params.educationYear) qp.set("educationYear", params.educationYear)
  if (params.subject) qp.set("subject", params.subject)
  if (params.group) qp.set("group", params.group)
  if (params.trainingType) qp.set("training_type", params.trainingType)
  if (params.educationLang) qp.set("education_lang", params.educationLang)
  if (params.filename) qp.set("filename", params.filename)
  return `${BASE}/api/hemis/calendar-plan-pdf?${qp.toString()}`
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
    url?: string
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
      ...(input.url ? { url: input.url } : {}),
    }).toString()
    return rawUpload<{ success: boolean; data: LocalResource }>(`/api/local-resources/upload?${q}`, input.file)
  },

  createResourceLink: (input: {
    subjectName: string
    url: string
    subjectId?: string
    title?: string
    comment?: string
    kind?: LocalResourceKind
    trainingType?: string
    meetingId?: string
  }) =>
    post<{ success: boolean; data: LocalResource }>("/api/local-resources/url", input),

  toggleResource: (id: string) =>
    patch<{ success: boolean; data: LocalResource }>(`/api/local-resources/${id}/toggle`, {}),

  updateResource: (
    id: string,
    body: Partial<{ title: string; comment: string | null; externalUrl: string | null; isActive: boolean }>
  ) => put<{ success: boolean; data: LocalResource }>(`/api/local-resources/${id}`, body),

  deleteResource: (id: string) => del<MsgRes>(`/api/local-resources/${id}`),

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

  taskSubmissions: (params?: { taskId?: string; groupId?: number }) => {
    const q = new URLSearchParams()
    if (params?.taskId)  q.set("taskId",  String(params.taskId))
    if (params?.groupId) q.set("groupId", String(params.groupId))
    return get<{ success: boolean; data: HemisTaskSubmission[] }>(`/api/hemis/task-submissions${q.toString() ? "?" + q : ""}`)
  },

  taskSubmissionFileUrl: (fileName: string) => {
    const token = getToken()
    return `${BASE}/api/hemis/task-submission-file/${encodeURIComponent(fileName)}${token ? "?token=" + encodeURIComponent(token) : ""}`
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

/* ── Teaching (LMS'ning o'z bazasi: darslar/topshiriqlar/imtihonlar) ──
   HEMIS bilan aloqa faqat guruh + dars jadvali uchun (login paytida bir
   marta sinxronlanadi + qo'lda "yangilash"). Qolgan hamma narsa — darslik,
   topshiriq, imtihon, baholash, topshirish — shu yerda, LMS'ning o'z
   bazasida saqlanadi va dedline (availableFrom/deadline) bilan boshqariladi. */
export type ContentStatus = "locked" | "open" | "closed"
export type TeachingContentType =
  | "lesson"           // Fan resurslari (darslar)
  | "assignment"       // Fan topshiriqlari
  | "exam"             // Fan imtihonlari
  | "mavzu"            // Fan mavzulari
  | "kurs-topshiriq"   // Kurs topshiriqlari
  | "kalendar"         // Kalendar reja
  | "malumot"          // Fan ma'lumotlari

export interface TeachingFile {
  name: string
  originalName: string
  mimeType: string
  size: number
  relativePath: string
  url: string
}

export interface TeacherGroup {
  id: number
  name: string
  direction?: string | null
  course?: number | null
}

export interface TeacherScheduleItem {
  id: number
  groupId: number | null
  subjectName: string
  weekDay: string | null
  lessonDate: string | null
  startTime: string | null
  endTime: string | null
  room: string | null
  syncedAt: string
}

export interface TeacherContent {
  id: number
  uuid: string
  type: TeachingContentType
  teacherUserId: number
  groupId: number
  subjectName: string
  topicKey: string | null
  title: string
  description: string | null
  kind: string | null
  controlType: string | null       // Nazorat turi (kurs-topshiriq uchun)
  resourceType: string | null      // Resurs turi (Video material, Hujjat, Audio meeting...)
  file: TeachingFile | null        // backward compat: docFile ?? videoFile
  files: TeachingFile[]            // qo'shimcha biriktirilgan fayllar
  docFile: TeachingFile | null     // hujjat (PDF, Word, PPT...)
  videoFile: TeachingFile | null   // video darslik
  meetingLink: string | null       // online meeting havolasi
  meetingId: string | null
  availableFrom: string
  deadline: string | null
  maxScore: number | null
  attemptsCount: number | null     // Urinishlar soni
  questionDisplayCount: number | null  // Ko'rsatiladigan savollar soni
  language: string | null
  completionPoints: number | null  // Resurs uchun ball (ketma-ket qulflash uchun)
  durationMinutes: number | null
  trainingLoad: number | null      // Yuklama (soat)
  lessonDate: string | null        // Dars sanasi (kalendar reja)
  delivered: boolean               // O'tildi
  isActive: boolean                // Faol
  status: ContentStatus
  questionCount: number
  createdAt: string
  updatedAt: string
}

export interface TeachingSubmission {
  id: number
  contentId: number
  studentUserId: number
  studentFullName: string
  groupId: number | null
  file: TeachingFile | null
  comment: string | null
  submittedAt: string
  grade: number | null
  feedback: string | null
  gradedAt: string | null
  gradedByUserId: number | null
  answers: number[] | null
  autoGraded: boolean
  attemptsUsed: number
  questionIds: number[] | null
  optionPerms: Record<number, number[]> | null
}

export interface ExamResultsTopic {
  id: number
  title: string
  topicKey: string | null
  maxScore: number | null
  availableFrom: string
  totalSubmitted: number
}

export interface ExamResultsStudent {
  userId: number
  fullName: string
  studentIdNumber: string | null
  scores: Record<number, number | null>
  total: number
}

export interface ExamResultsData {
  topics: ExamResultsTopic[]
  students: ExamResultsStudent[]
}

/* ── Jurnal (mavzular + JN + ON + YN + davomat) ─────────────────────── */
export interface JournalTopic {
  key: string
  idx: number
  title: string
  maxScore: number
}

export interface JournalStudent {
  userId: number
  fullName: string
  studentIdNumber: string | null
  topicScores: Record<string, number | null>
  jn: number | null
  on1: number | null
  on2: number | null
  yn: number | null
  attendancePct: number | null
}

export interface JournalData {
  topics: JournalTopic[]
  students: JournalStudent[]
}

export interface PptxRun { t: string; b: boolean; i: boolean; sz: number; c: string | null }
export interface PptxPara { r: PptxRun[]; a: string; ls: number | null }
export interface PptxShape { x: number; y: number; w: number; h: number; fill: string | null; p: PptxPara[] }
export interface PptxSlide { bg: string; shapes: PptxShape[] }

export interface ContentProgress {
  contentId: number
  studentUserId: number
  maxPositionSeconds: number
  durationSeconds: number | null
  pagesRead: number[]
  totalPages: number | null
  completed: boolean
  completedAt: string | null
}

export interface StudentTopicSection extends TeacherContent {
  progress?: ContentProgress | null
  submission?: TeachingSubmission | null
}

export interface StudentTopicSectionWithLock extends StudentTopicSection {
  sectionLocked?: boolean
}

export interface StudentTopic {
  topicKey: string
  title: string
  locked: boolean
  completed: boolean
  sections: {
    video: StudentTopicSectionWithLock | null
    audio: StudentTopicSectionWithLock | null
    theory: StudentTopicSectionWithLock | null
    qollanma: StudentTopicSectionWithLock | null
    test: StudentTopicSectionWithLock | null
    assignment: StudentTopicSectionWithLock | null
  }
}

/* ── Imtihon savollari (MCQ) ─────────────────────────────────────────── */
export interface ExamQuestion {
  id?: number
  questionText: string
  imageUrl?: string | null
  optionImages?: (string | null)[] | null
  options: string[]
  correctIndex: number
  correctIndexes?: number[]
  points: number
}

export interface ExamQuestionPublic {
  id: number
  questionText: string
  imageUrl: string | null
  optionImages: (string | null)[] | null
  options: string[]
  optionPerm: number[]   // shuffled indices: optionPerm[shuffledPos] = originalIdx
  points: number
}

function buildParams(input: Record<string, string | number | null | undefined>): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined || value === "") continue
    params[key] = String(value)
  }
  return params
}

export const teachingApi = {
  groups: () => get<ListRes<TeacherGroup>>("/api/teaching/groups"),

  sync: () =>
    post<{ success: boolean; message: string; data: { groups: TeacherGroup[]; schedule: TeacherScheduleItem[] } }>(
      "/api/teaching/sync",
      {}
    ),

  schedule: () => get<ListRes<TeacherScheduleItem>>("/api/teaching/schedule"),

  content: (params?: { type?: TeachingContentType; group?: number | string; subject?: string }) => {
    const q = new URLSearchParams(buildParams(params ?? {})).toString()
    return get<ListRes<TeacherContent>>(`/api/teaching/content${q ? `?${q}` : ""}`)
  },

  contentItem: (id: number | string) => get<ItemRes<TeacherContent>>(`/api/teaching/content/${id}`),

  /** Bitta mavzuga (topicKey) tegishli barcha qismlarni (video/audio/nazariy/test/topshiriq) olish */
  contentByTopic: (params: { topicKey: string; groupId: number | string }) => {
    const q = new URLSearchParams(buildParams(params)).toString()
    return get<ListRes<TeacherContent>>(`/api/teaching/content/by-topic?${q}`)
  },

  createContent: (input: {
    type: TeachingContentType
    groupId: number | string
    subjectName: string
    topicKey?: string
    title: string
    description?: string
    kind?: string
    controlType?: string
    resourceType?: string
    availableFrom: string
    deadline?: string | null
    maxScore?: number | null
    attemptsCount?: number | null
    language?: string
    completionPoints?: number | null
    durationMinutes?: number | null
    trainingLoad?: number | null
    lessonDate?: string | null
    delivered?: boolean
    /** Hujjat fayli (PDF, Word, PPT va h.k.) */
    docFile?: File | null
    /** Eski nom — docFile bilan bir xil, backward compat */
    file?: File | null
    meetingLink?: string | null
    /** Fayl yuklash foizini kuzatish (faqat docFile/file berilganda ishlaydi) */
    onUploadProgress?: (percent: number) => void
  }) => {
    const meta = buildParams({
      type: input.type,
      groupId: input.groupId,
      subjectName: input.subjectName,
      topicKey: input.topicKey,
      title: input.title,
      description: input.description,
      kind: input.kind,
      controlType: input.controlType,
      resourceType: input.resourceType,
      availableFrom: input.availableFrom,
      deadline: input.deadline,
      maxScore: input.maxScore,
      attemptsCount: input.attemptsCount,
      language: input.language,
      completionPoints: input.completionPoints,
      durationMinutes: input.durationMinutes,
      trainingLoad: input.trainingLoad,
      lessonDate: input.lessonDate,
      delivered: input.delivered === undefined ? undefined : String(input.delivered),
      meetingLink: input.meetingLink,
    })

    const docFile = input.docFile ?? input.file ?? null
    if (docFile) {
      const q = new URLSearchParams({ ...meta, filename: docFile.name, materialType: "document" }).toString()
      if (input.onUploadProgress) {
        return rawUploadWithProgress<ItemRes<TeacherContent>>(`/api/teaching/content?${q}`, docFile, input.onUploadProgress)
      }
      return rawUpload<ItemRes<TeacherContent>>(`/api/teaching/content?${q}`, docFile)
    }
    return post<ItemRes<TeacherContent>>("/api/teaching/content", meta)
  },

  /** Mavjud kontentga qo'shimcha fayl biriktirish (bir nechta chaqirilishi mumkin) */
  addContentFile: (id: number | string, file: File) => {
    const q = new URLSearchParams({ filename: file.name }).toString()
    return rawUpload<{ success: boolean; data: TeachingFile[] }>(`/api/teaching/content/${id}/files?${q}`, file)
  },

  removeContentFile: (id: number | string, fileId: number | string) =>
    del<MsgRes>(`/api/teaching/content/${id}/files/${fileId}`),

  uploadDocFile: (id: number | string, file: File) => {
    const q = new URLSearchParams({ filename: file.name }).toString()
    return rawUpload<ItemRes<TeacherContent>>(`/api/teaching/content/${id}/upload-doc?${q}`, file)
  },

  uploadVideoFile: (id: number | string, file: File) => {
    const q = new URLSearchParams({ filename: file.name }).toString()
    return rawUpload<ItemRes<TeacherContent>>(`/api/teaching/content/${id}/upload-video?${q}`, file)
  },

  updateContent: (
    id: number | string,
    body: Partial<{
      title: string
      description: string | null
      subjectName: string
      kind: string | null
      controlType: string | null
      availableFrom: string
      deadline: string | null
      maxScore: number | null
      attemptsCount: number | null
      questionDisplayCount: number | null
      language: string | null
      completionPoints: number | null
      durationMinutes: number | null
      trainingLoad: number | null
      lessonDate: string | null
      delivered: boolean
      isActive: boolean
      meetingLink: string | null
    }>
  ) => put<ItemRes<TeacherContent>>(`/api/teaching/content/${id}`, body),

  toggleContent: (id: number | string) =>
    patch<ItemRes<TeacherContent>>(`/api/teaching/content/${id}/toggle`, {}),

  removeContent: (id: number | string) => del<MsgRes>(`/api/teaching/content/${id}`),

  submit: (contentId: number | string, input: { comment?: string; file?: File | null }) => {
    if (input.file) {
      const q = new URLSearchParams(buildParams({ filename: input.file.name, comment: input.comment })).toString()
      return rawUpload<ItemRes<TeachingSubmission>>(`/api/teaching/content/${contentId}/submit?${q}`, input.file)
    }
    return post<ItemRes<TeachingSubmission>>(`/api/teaching/content/${contentId}/submit`, {
      comment: input.comment ?? "",
    })
  },

  mySubmissions: () =>
    get<ListRes<TeachingSubmission>>(`/api/teaching/submissions/mine`),

  mySubmission: (contentId: number | string) =>
    get<ItemRes<TeachingSubmission | null>>(`/api/teaching/content/${contentId}/submissions/me`),

  submissions: (contentId: number | string) =>
    get<ListRes<TeachingSubmission>>(`/api/teaching/content/${contentId}/submissions`),

  grade: (submissionId: number | string, body: { grade: number; feedback?: string }) =>
    put<ItemRes<TeachingSubmission>>(`/api/teaching/submissions/${submissionId}/grade`, body),

  examResults: (groupId: number | string, subject: string) => {
    const q = new URLSearchParams({ groupId: String(groupId), subject }).toString()
    return get<{ success: boolean; data: ExamResultsData }>(`/api/teaching/exam-results?${q}`)
  },

  mySubjects: (groupId?: number) => {
    const q = groupId !== undefined ? `?groupId=${groupId}` : ""
    return get<{ success: boolean; data: { groupId: number; subjectName: string }[] }>(`/api/teaching/my-subjects${q}`)
  },

  gradeJournal: (groupId: number | string, subject: string) => {
    const q = new URLSearchParams({ groupId: String(groupId), subject }).toString()
    return get<{ success: boolean; data: JournalData }>(`/api/teaching/grade-journal?${q}`)
  },

  myTopicScores: (subject: string) => {
    const q = new URLSearchParams({ subject }).toString()
    return get<{ success: boolean; data: { topics: Array<{ key: string; idx: number; title: string; maxScore: number; score: number | null }>; on1: number | null; on2: number | null; yn: number | null } }>(`/api/teaching/my-topic-scores?${q}`)
  },

  savePeriodGrade: (body: {
    groupId: number
    subjectName: string
    studentUserId: number
    gradeType: "ON1" | "ON2" | "YN"
    grade: number | null
  }) => post<{ success: boolean }>("/api/teaching/period-grade", body),

  /** O'qituvchi: to'liq (correctIndex bilan) | Talaba: javobsiz (faqat status="open" bo'lsa) */
  questions: (contentId: number | string) =>
    get<ListRes<ExamQuestion | ExamQuestionPublic>>(`/api/teaching/content/${contentId}/questions`),

  saveQuestions: (contentId: number | string, questions: ExamQuestion[]) =>
    put<ListRes<ExamQuestion>>(`/api/teaching/content/${contentId}/questions`, { questions }),

  submitExam: (contentId: number | string, answers: number[]) =>
    post<ItemRes<{ submission: TeachingSubmission; maxScore: number | null }>>(
      `/api/teaching/content/${contentId}/exam-submit`,
      { answers }
    ),

  /** Talaba: bitta fan bo'yicha mavzular ro'yxati (ketma-ket qulflash holati bilan) */
  studentTopics: (subject: string) => {
    const q = new URLSearchParams(buildParams({ subject })).toString()
    return get<ListRes<StudentTopic>>(`/api/teaching/content/topics?${q}`)
  },

  /** Talaba: video/audio/hujjat ko'rish progresini olish */
  getProgress: (contentId: number | string) =>
    get<ItemRes<ContentProgress>>(`/api/teaching/content/${contentId}/progress`),

  /** Talaba: video/audio/hujjat ko'rish progresini saqlash */
  saveProgress: (
    contentId: number | string,
    patch: { positionSeconds?: number; durationSeconds?: number; pagesRead?: number[]; totalPages?: number }
  ) => put<ItemRes<ContentProgress>>(`/api/teaching/content/${contentId}/progress`, patch),

  /** Talaba: qo'llanmani "Ko'rib chiqdim" deb belgilash (completed = true) */
  markProgress: (contentId: number | string, completed: boolean) =>
    put<ItemRes<ContentProgress>>(`/api/teaching/content/${contentId}/progress`, { completed }),

  /** Qulflanmagan fayllarni token bilan ochish uchun to'liq URL (video/pdf src, <a href> uchun). */
  fileUrl: (relativeUrl: string) => {
    if (!relativeUrl) return ""
    const token = getToken()
    const sep = relativeUrl.includes("?") ? "&" : "?"
    return `${BASE}${relativeUrl}${token ? `${sep}token=${encodeURIComponent(token)}` : ""}`
  },

  pptxSlides: (contentId: number | string) =>
    get<{ count: number; slides: string[] }>(`/api/teaching/content/${contentId}/pptx-slides`),

  pptxRichSlides: (contentId: number | string) =>
    get<{ count: number; slides: PptxSlide[] }>(`/api/teaching/content/${contentId}/pptx-rich-slides`),

  pptxAsPdfUrl: (contentId: number | string) => {
    const token = getToken()
    return `${BASE}/api/teaching/content/${contentId}/pptx-as-pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`
  },

  /** Tashqi ko'ruvchilar (Office Online) uchun ommaviy URL — ngrok orqali. */
  publicFileUrl: (relativeUrl: string) => {
    if (!relativeUrl) return ""
    const token = getToken()
    const sep = relativeUrl.includes("?") ? "&" : "?"
    return `${PUBLIC_BASE}${relativeUrl}${token ? `${sep}token=${encodeURIComponent(token)}` : ""}`
  },

  /** Savol rasmi yuklash — /api/teaching/question-image */
  uploadQuestionImage: (file: File) => {
    const q = new URLSearchParams({ filename: file.name }).toString()
    return rawUpload<{ success: boolean; data: { url: string } }>(`/api/teaching/question-image?${q}`, file)
  },

  notifyStudent: (body: {
    studentName: string
    message: string
    stats?: {
      subject?: string
      jn?: number | null
      topics?: string
      on1?: number | null
      on2?: number | null
      yn?: number | null
      attendance?: number | null
    }
  }) => post<{ success: boolean; message: string }>("/api/teaching/notify-student", body),
}

/* ── Davomat (qo'lda) ───────────────────────────────────────────────── */
export type AttendanceStatus = "present" | "absent" | "excused" | "late"

export interface AttendanceRosterItem {
  studentUserId: number
  fullName: string
  studentIdNumber: string | null
  status: AttendanceStatus | null
  comment: string | null
}

export interface AttendanceHistoryEntry {
  lessonDate: string
  subjectName: string
  records: {
    studentUserId: number
    studentFullName: string
    status: AttendanceStatus
    comment: string | null
  }[]
}

export interface StudentAttendanceEntry {
  lessonDate: string
  subjectName: string
  status: AttendanceStatus
  comment: string | null
}

export const attendanceApi = {
  roster: (groupId: number | string, subject: string, date: string) => {
    const q = new URLSearchParams(buildParams({ groupId, subject, date })).toString()
    return get<ListRes<AttendanceRosterItem>>(`/api/teaching/attendance/roster?${q}`)
  },

  save: (body: {
    groupId: number | string
    subjectName: string
    date: string
    records: { studentUserId: number; fullName: string; status: AttendanceStatus; comment?: string }[]
  }) => post<MsgRes>("/api/teaching/attendance", body),

  history: (params: { groupId: number | string; subject?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams(buildParams(params)).toString()
    return get<ListRes<AttendanceHistoryEntry>>(`/api/teaching/attendance?${q}`)
  },

  me: (params?: { subject?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams(buildParams(params ?? {})).toString()
    return get<ListRes<StudentAttendanceEntry>>(`/api/teaching/attendance/me${q ? `?${q}` : ""}`)
  },

  sessionsMe: (params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams(buildParams(params ?? {})).toString()
    return get<ListRes<PlatformSessionEntry>>(`/api/teaching/attendance/sessions/me${q ? `?${q}` : ""}`)
  },
}

export interface PlatformSessionEntry {
  sessionId: number
  userId: number
  fullName: string
  groupId: number | null
  role: string
  loginAt: string
  lastSeenAt: string
  logoutAt: string | null
  durationMinutes: number
}

/* ── Baholash (qo'lda) ──────────────────────────────────────────────── */
export interface GradeRosterItem {
  studentUserId: number
  fullName: string
  studentIdNumber: string | null
  grade: number | null
  comment: string | null
}

export interface GradeHistoryEntry {
  lessonDate: string
  subjectName: string
  records: {
    studentUserId: number
    studentFullName: string
    grade: number | null
    comment: string | null
  }[]
}

export const gradeApi = {
  roster: (groupId: number | string, subject: string, date: string) => {
    const q = new URLSearchParams(buildParams({ groupId, subject, date })).toString()
    return get<ListRes<GradeRosterItem>>(`/api/teaching/grades/roster?${q}`)
  },

  save: (body: {
    groupId: number | string
    subjectName: string
    date: string
    records: { studentUserId: number; fullName: string; grade: number | null; comment?: string }[]
  }) => post<MsgRes>("/api/teaching/grades", body),

  history: (params: { groupId: number | string; subject?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams(buildParams(params)).toString()
    return get<ListRes<GradeHistoryEntry>>(`/api/teaching/grades?${q}`)
  },
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
  externalUrl?: string
  isActive: boolean
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

export interface HemisTaskSubmission {
  id: number
  hemisTaskId: string
  studentUserId: number
  studentName: string
  groupId: number | null
  fileName: string | null
  originalName: string | null
  mimeType: string | null
  fileSize: number | null
  comment: string | null
  submittedAt: string
  downloadUrl: string | null
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

/* ── Admin Panel ─────────────────────────────────────────────────────── */
export interface AdminUser {
  hemisId: string
  fullName: string
  username: string
  hemisRole: string
  hemisRoleCodes: string[]
  lmsRole: string | null
  isAutoAdmin: boolean
  grantedBy: string | null
  grantedAt: string | null
  note: string | null
  contentCount: number
  sessionCount: number
  lastSeen: string
  createdAt: string
}

export interface AdminStats {
  totalStudents: number
  totalEmployees: number
  grantedAdmins: number
  totalContent: number
  totalVideos: number
  totalMeetings: number
  facePending: number
  totalSubmissions: number
  totalCompletions: number
}

export interface AdminTeacherStat {
  hemisId: string
  fullName: string
  lastSeen: string
  mavzular: number
  videolar: number
  audiolar: number
  taqdimotlar: number
  qollanmalar: number
  testlar: number
  amaliy: number
  guruhlar: number
  studentsCompleted: number
  studentsSubmitted: number
  meetingCount: number
}

export interface AdminTeacherTotals {
  totalContent: number
  totalTopics: number
  totalExams: number
  totalVideos: number
  totalAssignments: number
}

export interface AdminStudentStat {
  studentId: number
  studentName: string
  doneTopics: number
  doneSubmissions: number
  avgGrade: number | null
  watchMinutes: number
}

export interface AdminAttendanceRow {
  groupId: number
  groupName: string
  subjectName: string
  lessonDate: string
  total: number
  present: number
  absent: number
  excused: number
  late: number
  presentPct: number
}

export interface PlatformAttendanceStudent {
  studentId: number
  studentName: string
  status: "present" | "absent"
}

export interface PlatformAttendanceDay {
  lessonDate: string
  subjectName: string
  total: number
  present: number
  absent: number
  presentPct: number
  isMeetingDay: boolean
  meetingMinutes: number
  students: PlatformAttendanceStudent[]
}

export interface AdminFaceRequest {
  id: string
  username: string
  reason: string | null
  status: "pending" | "approved" | "rejected"
  admin_note: string
  created_at: number
  reviewed_at: number | null
}

export const adminApi = {
  check: () => get<{ isAdmin: boolean; name: string; role: string; hemisRoles: string[]; lmsRole: string }>("/api/admin/check"),

  users: (params?: { search?: string; lms_role?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams(buildParams(params ?? {})).toString()
    return get<{ data: AdminUser[]; total: number }>(`/api/admin/users${q ? `?${q}` : ""}`)
  },

  setRole: (hemisId: string, lmsRole: string, note?: string) =>
    patch<MsgRes>(`/api/admin/users/${encodeURIComponent(hemisId)}/role`, { lmsRole, note }),

  stats: () => get<{ data: AdminStats }>("/api/admin/stats"),

  teacherStats: () => get<{ data: AdminTeacherStat[] }>("/api/admin/teacher-stats"),

  teacherStudents: (teacherId: number | string) =>
    get<{ totals: AdminTeacherTotals; data: AdminStudentStat[] }>(`/api/admin/teacher-stats/${teacherId}/students`),

  getSettings: () => get<{ data: Record<string, string> }>("/api/admin/settings"),
  saveSettings: (settings: Record<string, unknown>) => put<MsgRes>("/api/admin/settings", settings),

  faceRequests: (status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : ""
    return get<{ data: AdminFaceRequest[] }>(`/api/admin/face-requests${q}`)
  },

  reviewFaceRequest: (id: string, action: "approve" | "reject", note?: string) =>
    patch<MsgRes>(`/api/admin/face-requests/${id}`, { action, note }),

  sessions: (limit?: number) => {
    const q = limit ? `?limit=${limit}` : ""
    return get<{ data: unknown[] }>(`/api/admin/sessions${q}`)
  },

  attendance: (params?: { groupId?: number; subject?: string; date?: string }) => {
    const q = new URLSearchParams(buildParams(params ?? {})).toString()
    return get<{ data: AdminAttendanceRow[] }>(`/api/admin/attendance${q ? `?${q}` : ""}`)
  },

  teacherJournal: (params: { teacherId: number; groupId: number; subject: string }) => {
    const q = new URLSearchParams(buildParams(params)).toString()
    return get<{ data: JournalData }>(`/api/admin/teacher-journal?${q}`)
  },

  hemisSync: () => post<{ success: boolean; message: string; data: Record<string, unknown> }>("/api/admin/hemis-sync", {}),

  teacherInfo: (teacherId: number | string) =>
    get<{ data: { groups: { id: number; name: string }[]; subjects: string[] } }>(`/api/admin/teacher-info?teacherId=${teacherId}`),

  platformAttendance: (params: { groupId: number; subject?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams(buildParams(params)).toString()
    return get<{ data: PlatformAttendanceDay[] }>(`/api/admin/platform-attendance?${q}`)
  },

  lockedAssignments: () =>
    get<ListRes<TeacherContent>>("/api/admin/locked-assignments"),

  unlockContent: (id: number | string) =>
    patch<ItemRes<TeacherContent>>(`/api/admin/content/${id}/toggle`, {}),
}
