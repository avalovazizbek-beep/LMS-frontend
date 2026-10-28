"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  Video, Music, BookOpen, HelpCircle, ClipboardList, Library,
  Upload, Trash2, CheckCircle2, Loader2, ExternalLink,
  BookMarked, CalendarDays, VideoIcon, Save, BarChart3,
  Check, X, Users, ChevronLeft, ChevronDown, ChevronUp, CirclePlus, Pencil, Plus, Clock, Link2, FolderOpen, ArrowRightLeft,
} from "lucide-react"
import {
  teachingApi, meetingsApi, zoomApi, googleMeetApi, authApi,
  type TeacherContent, type CreateMeetingRequest, type SubjectRecording,
  type TeachingSubmission, type ExamQuestion, type TeacherGroup,
  type ZoomConnectionStatus, type GoogleMeetConnectionStatus,
} from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { QuestionsModal } from "@/components/teaching/QuestionsModal"
import { TestFileImport, type ExamSettingsPatch, type TestImportMode } from "@/components/teaching/TestFileImport"
import { RetakeTable } from "@/components/teaching/RetakeTable"
import { TeacherCertificateCard } from "@/components/teaching/TeacherCertificate"
import RichTextEditor from "@/components/ui/RichTextEditor"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const labelStyle = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const
const titleStyle = { color: "#012970", fontFamily: "var(--font-poppins)" } as const

// HEMIS'da o'quv yili sentyabrdan boshlanadi — boshqa "xodim" sahifalaridagi
// bilan bir xil hisoblash (masalan app/(dashboard)/xodim/[...slug]/page.tsx).
function academicYearStart() {
  const now = new Date()
  const year = now.getFullYear()
  return now.getMonth() >= 8 ? year : year - 1
}
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => academicYearStart() - i)

/* datetime-local qiymati MAHALLIY vaqtda bo'lishi kerak — ISO (UTC) satrini
   .slice(0, 16) qilish vaqtni 5 soatga (Toshkent UTC+5) siljitib, har
   saqlashda deadline'ni shuncha erta surib qo'yardi. */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDeadline(iso: string) {
  return new Date(iso).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const isPast = (iso: string | null) => iso !== null && new Date(iso).getTime() < Date.now()

/* Talabaga test/topshiriqning O'Z muddati qo'llanadi (backend'dagi
   effectiveTopicDeadline bilan bir xil): ular bo'lsa — eng erta muddati, yo'q
   bo'lsa — mavzuniki. Boshqa guruhdan nusxalangan test manba guruh muddati
   bilan kelib qolishi mumkin edi — mavzuda "muddatsiz" ko'rinib, test esa
   yopilib qolardi va o'qituvchi uzaytirishni ko'rmasdi. */
function effectiveDeadline(markerDeadline: string | null, items: TeacherContent[]): string | null {
  const graded = items.filter(i => i.type === "exam" || i.type === "assignment")
  if (!graded.length) return markerDeadline
  let earliest: string | null = null
  for (const item of graded) {
    if (!item.deadline) continue
    if (earliest === null || new Date(item.deadline).getTime() < new Date(earliest).getTime()) earliest = item.deadline
  }
  return earliest
}

interface Selection {
  groupId: number
  groupName: string
  subjectName: string
  topicKey: string
  topicTitle: string
}

/* ── Bir nechta guruhni bitta select ichida tanlash (checkbox ro'yxati) ──
   Birinchi belgilangan guruh "asosiy" (mavzular shu guruh bo'yicha
   ko'rsatiladi), qolganlari "qo'shimcha" (shu yerga yuklangan resurslar
   ularga ham nusxalanadi). */
function GroupMultiSelect({
  groups, selectedIds, onChange, placeholder,
}: {
  groups: TeacherGroup[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  function toggle(id: number) {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id])
  }

  const selectedNames = groups.filter(g => selectedIds.includes(g.id)).map(g => g.name)
  const label = selectedNames.length ? selectedNames.join(", ") : placeholder

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)} title={selectedNames.join(", ")}
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-[6px] text-sm text-left"
        style={{ border: "1px solid rgba(1,41,112,0.2)", color: selectedNames.length ? "#012970" : "#7293b9", fontFamily: "var(--font-poppins)", minWidth: 180, maxWidth: 260, backgroundColor: "white" }}>
        <span className="truncate">{label}</span>
        <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#7293b9" }} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 py-1 rounded-[8px] bg-white overflow-y-auto"
          style={{ border: "1px solid rgba(1,41,112,0.15)", boxShadow: "0 8px 24px rgba(1,41,112,0.15)", minWidth: 220, maxHeight: 260 }}>
          {groups.length === 0 ? (
            <div className="px-3 py-2 text-sm" style={labelStyle}>—</div>
          ) : groups.map(g => {
            const checked = selectedIds.includes(g.id)
            return (
              <button key={g.id} type="button" onClick={() => toggle(g.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[#f6f9ff] transition-colors"
                style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                <span className="w-4 h-4 rounded-[4px] flex items-center justify-center shrink-0"
                  style={{ border: `1px solid ${checked ? "#0e58a8" : "rgba(1,41,112,0.3)"}`, backgroundColor: checked ? "#0e58a8" : "white" }}>
                  {checked && <Check className="w-3 h-3" style={{ color: "white" }} />}
                </span>
                <span className="truncate">{g.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── FileDropZone — fayl yuklash/almashtirish/o'chirish (drag & drop) ── */
function FileDropZone({
  item, accept, uploading, progress, onUpload, onReplace, onDelete,
}: {
  item?: TeacherContent
  accept: string
  uploading: boolean
  progress?: number | null
  onUpload: (file: File) => void
  onReplace?: (file: File) => void
  onDelete: () => void
}) {
  const { t } = useLanguage()
  const replaceRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onUpload(f)
  }

  if (item) {
    return (
      <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-[8px]"
        style={{ backgroundColor: "#f6f9ff", border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#22c55e" }} />
          <span className="text-sm truncate min-w-0" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {item.file?.originalName ?? item.title}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {item.file && (
            <a href={teachingApi.fileUrl(item.file.url)} target="_blank" rel="noreferrer"
              className="p-1.5 rounded hover:bg-white transition-colors" title={t("fanResurslariOq.upload.openFile")}>
              <ExternalLink className="w-4 h-4" style={{ color: "#0e58a8" }} />
            </a>
          )}
          {onReplace && (
            <>
              <input ref={replaceRef} type="file" accept={accept} className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) { onReplace(f); replaceRef.current!.value = "" } }} />
              <button onClick={() => replaceRef.current?.click()}
                className="p-1.5 rounded hover:bg-white transition-colors" title={t("fanResurslariOq.upload.replace")}>
                <Pencil className="w-4 h-4" style={{ color: "#d97706" }} />
              </button>
            </>
          )}
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-white transition-colors" title={t("fanResurslariOq.upload.delete")}>
            <Trash2 className="w-4 h-4" style={{ color: "#dc2626" }} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <label
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className="flex flex-col items-center justify-center gap-2 py-9 rounded-[10px] cursor-pointer transition-colors"
      style={{
        border: `2px dashed ${dragOver ? "#0e58a8" : "rgba(1,41,112,0.22)"}`,
        backgroundColor: dragOver ? "#f0f5ff" : "#f8fafc",
      }}>
      {uploading ? (
        <>
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#0e58a8" }} />
          <span className="text-sm font-medium" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {t("fanResurslariOq.upload.uploading")} {progress != null ? `${progress}%` : ""}
          </span>
          {progress != null && (
            <div className="h-1.5 w-40 rounded-full overflow-hidden" style={{ backgroundColor: "#eef4ff" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: "#0e58a8" }} />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#eef4ff" }}>
            <Upload className="w-5 h-5" style={{ color: "#0e58a8" }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {t("fanResurslariOq.upload.uploadFile")}
          </span>
          <span className="text-xs" style={{ color: "#a9bcd6", fontFamily: "var(--font-poppins)" }}>
            {t("fanResurslariOq.form.dropHint")}
          </span>
        </>
      )}
      <input type="file" accept={accept} className="hidden" disabled={uploading}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
    </label>
  )
}

/* ── Meeting section ────────────────────────────────────────────────── */
function MeetingSection({
  meetingItem, groupId, subjectName, topicKey, topicTitle, trainingType, topicDeadline, parallelGroupIds, onRefetch, bare = false,
}: {
  meetingItem?: TeacherContent
  groupId: number
  subjectName: string
  topicKey: string
  topicTitle: string
  trainingType: string
  topicDeadline: string | null
  /** Yuqorida tanlangan qo'shimcha guruhlar — parallel sifatida oldindan belgilanadi */
  parallelGroupIds: number[]
  onRefetch: () => void
  /** Tab panel ichiga joylanganda — tashqi ramka/sarlavha bosilmaydi, chunki
      panelning o'zi allaqachon ikonka+sarlavha+tavsifni ko'rsatgan bo'ladi. */
  bare?: boolean
}) {
  const { t } = useLanguage()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: topicTitle,
    date: new Date().toISOString().slice(0, 10),
    startTime: "09:00",
    endTime: "10:30",
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [uploadingRec, setUploadingRec] = useState(false)

  // Google Meet / Zoom — Meeting sahifasidagi kabi shu dars bilan birga
  // yaratiladi (backend: createGoogleMeetMeeting/createZoomMeeting); talabalar
  // havolani o'z "Meeting" sahifasida ko'radi.
  const [wantsGoogleMeet, setWantsGoogleMeet] = useState(false)
  const [wantsZoom, setWantsZoom] = useState(false)
  const [googleMeetStatus, setGoogleMeetStatus] = useState<GoogleMeetConnectionStatus | null>(null)
  const [zoomStatus, setZoomStatus] = useState<ZoomConnectionStatus | null>(null)
  const [providerBusy, setProviderBusy] = useState<"google" | "zoom" | null>(null)
  useEffect(() => {
    if (!creating) return
    setWantsGoogleMeet(false)
    setWantsZoom(false)
    googleMeetApi.status().then(r => setGoogleMeetStatus(r.data)).catch(() => setGoogleMeetStatus(null))
    zoomApi.status().then(r => setZoomStatus(r.data)).catch(() => setZoomStatus(null))
  }, [creating])

  // Mavzudagi meeting qatori LMS meeting ID'sini saqlaydi (eski yozuvlarda
  // "#" yoki havola bo'lishi mumkin — ularda Meet/Zoom holati ko'rsatilmaydi).
  const lmsMeetingId = meetingItem?.meetingLink && /^\d+$/.test(meetingItem.meetingLink) ? meetingItem.meetingLink : null
  const { data: meetingInfoRes, refetch: refetchMeetingInfo } = useApi(
    () => lmsMeetingId ? meetingsApi.getOne(lmsMeetingId) : Promise.resolve(null),
    [lmsMeetingId]
  )
  const meetingInfo = meetingInfoRes?.data ?? null

  async function addProvider(kind: "google" | "zoom") {
    if (!lmsMeetingId) return
    setProviderBusy(kind)
    setErr(null)
    try {
      const res = kind === "google" ? await meetingsApi.retryGoogleMeet(lmsMeetingId) : await meetingsApi.retryZoom(lmsMeetingId)
      if (!res.success) setErr(res.message)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("fanResurslariOq.meeting.createError"))
    } finally {
      await refetchMeetingInfo()
      setProviderBusy(null)
    }
  }

  // Parallel dars — bir nechta guruhga birdan (masalan potok/oqim darsi) o'tkazish uchun
  // joriy guruhdan tashqari o'qituvchining boshqa guruhlarini ham tanlash mumkin
  const { data: allGroupsRes } = useApi(() => teachingApi.groups(), [])
  const otherGroups = (allGroupsRes?.data ?? []).filter(g => g.id !== groupId)
  const [extraGroupIds, setExtraGroupIds] = useState<number[]>(parallelGroupIds)
  const parallelKey = parallelGroupIds.join(",")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setExtraGroupIds(parallelGroupIds), [parallelKey])

  function toggleExtraGroup(id: number) {
    setExtraGroupIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleCreate() {
    setErr(null)
    if (wantsGoogleMeet && googleMeetStatus?.status !== "active") { setErr(t("fanResurslariOq.meeting.googleNotConnected")); return }
    if (wantsZoom && zoomStatus?.status !== "active") { setErr(t("fanResurslariOq.meeting.zoomNotConnected")); return }
    setLoading(true)
    try {
      // Meeting sahifasidagi kabi brauzer vaqtidan ISO (UTC) — server vaqt
      // mintaqasiga bog'liq bo'lmasin
      const startTime = new Date(`${form.date}T${form.startTime}:00`).toISOString()
      const endTime = new Date(`${form.date}T${form.endTime}:00`).toISOString()
      const meetReq: CreateMeetingRequest = {
        title: form.title || topicTitle,
        subjectName,
        startTime,
        endTime,
        groupIds: [groupId, ...extraGroupIds],
        createGoogleMeetMeeting: wantsGoogleMeet,
        createZoomMeeting: wantsZoom,
      }
      const meetRes = await meetingsApi.create(meetReq)

      const input = {
        type: "mavzu" as const,
        kind: "meeting",
        subjectName,
        title: form.title || topicTitle,
        trainingType: trainingType || undefined,
        availableFrom: startTime,
        deadline: topicDeadline,
        // LMS meeting ID — yozuv yuklash va Meet/Zoom holati shu orqali olinadi
        // (avval `link || id` yozilardi; javobda link yo'q bo'lgani uchun "#" tushardi)
        meetingLink: meetRes.data.id,
      }
      await teachingApi.createContent({ ...input, groupId, topicKey })
      // Yuqorida tanlangan guruhlarda mavzu ichida ham ko'rinsin
      for (const gid of extraGroupIds.filter(id => parallelGroupIds.includes(id))) {
        const key = await ensureTopicKeyForGroup(gid, subjectName, topicTitle, topicDeadline, trainingType)
        await teachingApi.createContent({ ...input, groupId: gid, topicKey: key })
      }
      setCreating(false)
      setExtraGroupIds(parallelGroupIds)
      onRefetch()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("fanResurslariOq.meeting.createError"))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!meetingItem) return
    setLoading(true)
    try {
      await teachingApi.removeContent(meetingItem.id)
      for (const extra of await loadExtraTopics(parallelGroupIds, subjectName, topicTitle, trainingType)) {
        for (const other of extra.items.filter(o => sameSlot(o, meetingItem))) await teachingApi.removeContent(other.id)
      }
      onRefetch()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("fanResurslariOq.meeting.deleteError"))
    } finally {
      setLoading(false)
    }
  }

  async function handleRecordingUpload(file: File) {
    if (!meetingItem?.meetingLink) return
    setUploadingRec(true)
    try {
      await meetingsApi.uploadRecording(meetingItem.meetingLink, file, file.name)
      onRefetch()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("fanResurslariOq.meeting.recordingUploadError"))
    } finally {
      setUploadingRec(false)
    }
  }

  const content = (
    <>
      {!bare && (
        <div className="flex items-center gap-2">
          <VideoIcon className="w-4 h-4" style={{ color: "#0e58a8" }} />
          <span className="text-sm font-semibold" style={titleStyle}>{t("fanResurslariOq.meeting.title")}</span>
          {meetingItem && <CheckCircle2 className="w-4 h-4 ml-auto" style={{ color: "#22c55e" }} />}
        </div>
      )}
      {!bare && <p className="text-xs" style={labelStyle}>{t("fanResurslariOq.meeting.description")}</p>}

      {err && (
        <p className="text-xs px-3 py-2 rounded-[6px]"
          style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
          {err}
        </p>
      )}

      {meetingItem ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#f6f9ff" }}>
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays className="w-4 h-4 shrink-0" style={{ color: "#0e58a8" }} />
              <span className="text-sm truncate min-w-0" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                {meetingItem.title}
              </span>
              {meetingItem.meetingLink?.startsWith("http") && (
                <a href={meetingItem.meetingLink}
                  target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-white transition-colors shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" style={{ color: "#0e58a8" }} />
                </a>
              )}
            </div>
            <button onClick={handleDelete} disabled={loading}
              className="p-1.5 rounded hover:bg-white transition-colors shrink-0">
              <Trash2 className="w-4 h-4" style={{ color: "#dc2626" }} />
            </button>
          </div>

          {/* Google Meet / Zoom — havolalar yoki keyin qo'shish */}
          {meetingInfo && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {meetingInfo.googleMeet?.status === "created" && meetingInfo.googleMeet.meetingUri ? (
                  <a href={meetingInfo.googleMeet.meetingUri} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold"
                    style={{ backgroundColor: "#e8f0fe", color: "#1a73e8", fontFamily: "var(--font-poppins)" }}>
                    <VideoIcon className="w-3.5 h-3.5" /> {t("fanResurslariOq.meeting.joinGoogleMeet")}
                  </a>
                ) : (
                  <button onClick={() => addProvider("google")} disabled={providerBusy !== null}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium disabled:opacity-60"
                    style={{ border: "1px dashed rgba(26,115,232,0.45)", color: "#1a73e8", fontFamily: "var(--font-poppins)" }}>
                    {providerBusy === "google" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {meetingInfo.googleMeet?.status === "failed" ? t("fanResurslariOq.meeting.retryGoogleMeet") : t("fanResurslariOq.meeting.addGoogleMeet")}
                  </button>
                )}
                {meetingInfo.zoom?.status === "created" && meetingInfo.zoom.joinUrl ? (
                  // Zoom uchun bitta tugma: host havolasi bo'lsa "boshlash", aks holda "kirish"
                  meetingInfo.zoom.startUrl ? (
                    <a href={meetingInfo.zoom.startUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold text-white"
                      style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                      <VideoIcon className="w-3.5 h-3.5" /> {t("fanResurslariOq.meeting.startZoom")}
                    </a>
                  ) : (
                    <a href={meetingInfo.zoom.joinUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold"
                      style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                      <VideoIcon className="w-3.5 h-3.5" /> {t("fanResurslariOq.meeting.joinZoom")}
                    </a>
                  )
                ) : (
                  <button onClick={() => addProvider("zoom")} disabled={providerBusy !== null}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium disabled:opacity-60"
                    style={{ border: "1px dashed rgba(14,88,168,0.4)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                    {providerBusy === "zoom" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {meetingInfo.zoom?.status === "failed" ? t("fanResurslariOq.meeting.retryZoom") : t("fanResurslariOq.meeting.addZoom")}
                  </button>
                )}
              </div>
              {meetingInfo.googleMeet?.status === "failed" && meetingInfo.googleMeet.errorMessage && (
                <p className="text-[11px]" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>Google Meet: {meetingInfo.googleMeet.errorMessage}</p>
              )}
              {meetingInfo.zoom?.status === "failed" && meetingInfo.zoom.errorMessage && (
                <p className="text-[11px]" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>Zoom: {meetingInfo.zoom.errorMessage}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.meeting.recording")}</p>
            {uploadingRec ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Loader2 className="w-4 h-4 animate-spin" /> {t("fanResurslariOq.meeting.uploading")}
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 rounded-[6px] text-sm font-medium cursor-pointer w-fit transition-colors hover:bg-[#f6f9ff]"
                style={{ border: "1px dashed rgba(1,41,112,0.25)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Upload className="w-4 h-4" />
                {t("fanResurslariOq.meeting.uploadRecording")}
                <input type="file" accept="video/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleRecordingUpload(f) }} />
              </label>
            )}
          </div>
        </div>
      ) : creating ? (
        <div className="flex flex-col gap-3 p-3 rounded-[8px]"
          style={{ backgroundColor: "#f8fafc", border: "1px solid rgba(1,41,112,0.08)" }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.meeting.titleLabel")}</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full min-w-0 px-3 py-2 rounded-[5px] text-base sm:text-sm outline-none"
              style={{ border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)" }}
            />
          </div>
          {/* Telefonda: sana to'liq kenglikda, boshlanish/tugash yonma-yon */}
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.meeting.dateLabel")}</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full min-w-0 appearance-none bg-white px-3 py-2 rounded-[5px] text-base sm:text-sm outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.meeting.startLabel")}</label>
              <input type="time" value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full min-w-0 appearance-none bg-white px-3 py-2 rounded-[5px] text-base sm:text-sm outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.meeting.endLabel")}</label>
              <input type="time" value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full min-w-0 appearance-none bg-white px-3 py-2 rounded-[5px] text-base sm:text-sm outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
            </div>
          </div>
          {otherGroups.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={labelStyle}>
                {t("fanResurslariOq.parallelGroups")}
              </label>
              <div className="flex flex-wrap gap-2">
                {otherGroups.map(g => {
                  const checked = extraGroupIds.includes(g.id)
                  return (
                    <button key={g.id} type="button" onClick={() => toggleExtraGroup(g.id)}
                      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors"
                      style={{
                        border: `1px solid ${checked ? "#0e58a8" : "rgba(1,41,112,0.2)"}`,
                        backgroundColor: checked ? "#0e58a8" : "transparent",
                        color: checked ? "#fff" : "#445b7a",
                        fontFamily: "var(--font-poppins)",
                      }}>
                      {checked && <Check className="w-3 h-3" />}
                      {g.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {([
              { key: "google", checked: wantsGoogleMeet, set: setWantsGoogleMeet, label: t("fanResurslariOq.meeting.alsoGoogleMeet"),
                notConnected: wantsGoogleMeet && googleMeetStatus?.status !== "active", warn: t("fanResurslariOq.meeting.googleNotConnected"),
                color: "#1a73e8", border: "#d2e3fc", bg: "#f8fafe" },
              { key: "zoom", checked: wantsZoom, set: setWantsZoom, label: t("fanResurslariOq.meeting.alsoZoom"),
                notConnected: wantsZoom && zoomStatus?.status !== "active", warn: t("fanResurslariOq.meeting.zoomNotConnected"),
                color: "#0e58a8", border: "#d8e6f7", bg: "white" },
            ] as const).map(opt => (
              <div key={opt.key} className="flex flex-col gap-1 px-3 py-2.5 rounded-[8px]"
                style={{ border: `1px solid ${opt.border}`, backgroundColor: opt.bg }}>
                <label className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ fontFamily: "var(--font-poppins)" }}>
                  <input type="checkbox" checked={opt.checked} onChange={e => opt.set(e.target.checked)}
                    className="w-4 h-4 rounded" style={{ accentColor: opt.color }} />
                  <span className="font-medium" style={{ color: "#012970" }}>{opt.label}</span>
                </label>
                {opt.notConnected && (
                  <p className="text-[11px] pl-6" style={{ color: "#dc2626", fontFamily: "var(--font-poppins)" }}>{opt.warn}</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleCreate} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
              {loading ? t("fanResurslariOq.meeting.creating") : t("fanResurslariOq.meeting.create")}
            </button>
            <button onClick={() => { setCreating(false); setErr(null); setExtraGroupIds(parallelGroupIds) }}
              className="px-3 py-2 rounded-[6px] text-sm"
              style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {t("fanResurslariOq.meeting.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-3 py-2.5 rounded-[6px] text-sm font-medium w-fit transition-colors hover:bg-[#f6f9ff]"
          style={{ border: "1px dashed rgba(1,41,112,0.25)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <CalendarDays className="w-4 h-4" />
          {t("fanResurslariOq.meeting.create")}
        </button>
      )}
    </>
  )

  return (
    <div className={bare ? "flex flex-col gap-3" : "rounded-[10px] p-4 flex flex-col gap-3"}
      style={bare ? undefined : { border: "1px solid rgba(1,41,112,0.1)" }}>
      {content}
    </div>
  )
}

/* ── Test natijalari modali ──────────────────────────────────────────── */
function TestResultsModal({ test, onClose }: { test: TeacherContent; onClose: () => void }) {
  const { t } = useLanguage()
  const [selectedSub, setSelectedSub] = useState<TeachingSubmission | null>(null)

  const { data: subsData, loading: lSubs, refetch: refetchSubs } = useApi(
    () => teachingApi.submissions(test.id), [test.id]
  )
  const { data: qData, loading: lQ } = useApi(
    () => teachingApi.questions(test.id), [test.id]
  )
  // Qoidabuzarliklar ustuni ixtiyoriy — so'rov xato bersa ham jadval chiqaveradi
  const { data: violData } = useApi(
    () => teachingApi.violations(test.id).catch(() => ({ success: true, data: [] })), [test.id]
  )

  const submissions = (subsData?.data ?? []) as TeachingSubmission[]
  const allQuestions = (qData?.data ?? []) as ExamQuestion[]
  const loading = lSubs || lQ

  const questionsForSub = (sub: TeachingSubmission): ExamQuestion[] => {
    if (sub.questionIds?.length) {
      const byId = new Map(allQuestions.map(q => [q.id, q]))
      return sub.questionIds.map(id => byId.get(id)).filter(Boolean) as ExamQuestion[]
    }
    return allQuestions
  }

  function fmtDate(iso: string) {
    const d = new Date(iso)
    return `${d.getDate().toString().padStart(2,"0")}.${(d.getMonth()+1).toString().padStart(2,"0")}.${d.getFullYear()} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`
  }

  const avgScore = submissions.length
    ? Math.round(submissions.reduce((s, sub) => s + (sub.grade ?? 0), 0) / submissions.length)
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(1,41,112,0.35)" }}>
      <div className="bg-white rounded-[14px] w-full max-w-4xl max-h-[90vh] flex flex-col"
        style={{ boxShadow: "0 16px 48px rgba(1,41,112,0.18)" }}>

        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <div className="flex items-center gap-3">
            {selectedSub && (
              <button onClick={() => setSelectedSub(null)}
                className="p-1.5 rounded-[6px] hover:bg-[#f0f5ff] transition-colors">
                <ChevronLeft className="w-4 h-4" style={{ color: "#0e58a8" }} />
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold" style={titleStyle}>
                {selectedSub ? selectedSub.studentFullName : t("fanResurslariOq.results.title")}
              </h2>
              <p className="text-xs mt-0.5" style={labelStyle}>
                {selectedSub
                  ? t("fanResurslariOq.results.scoreLine", { grade: selectedSub.grade ?? "—", max: test.maxScore ?? "?", date: fmtDate(selectedSub.submittedAt) })
                  : t("fanResurslariOq.results.summaryLine", { title: test.title, count: submissions.length, avg: avgScore })}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#f0f5ff] transition-colors shrink-0">
            <X className="w-5 h-5" style={{ color: "#7293b9" }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2" style={labelStyle}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{t("fanResurslariOq.results.loading")}</span>
            </div>
          ) : selectedSub ? (
            /* ── Talaba javoblari ── */
            <div className="flex flex-col gap-5">
              {questionsForSub(selectedSub).map((q, qi) => {
                const chosen  = selectedSub.answers?.[qi] ?? -1
                const correct = q.correctIndexes ?? [q.correctIndex]
                const isRight = correct.includes(chosen)
                // Use student's shuffled option order if stored, otherwise original order
                const perm: number[] = selectedSub.optionPerms?.[q.id!] ?? q.options.map((_, i) => i)
                return (
                  <div key={q.id} className="rounded-[10px] p-4"
                    style={{ border: `1.5px solid ${isRight ? "rgba(34,197,94,0.3)" : "rgba(185,28,28,0.3)"}`, backgroundColor: isRight ? "rgba(240,253,244,0.5)" : "rgba(254,242,242,0.5)" }}>
                    <div className="flex items-start gap-2 mb-3">
                      <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: isRight ? "rgba(34,197,94,0.15)" : "rgba(185,28,28,0.15)", color: isRight ? "#15803d" : "#b91c1c" }}>
                        {qi + 1}
                      </span>
                      <p className="text-sm font-medium" style={titleStyle}>{q.questionText}</p>
                    </div>
                    <div className="flex flex-col gap-2 pl-8">
                      {perm.map((origIdx, shuffledPos) => {
                        const opt = q.options[origIdx]
                        const isChosen  = chosen === origIdx
                        const isCorrect = correct.includes(origIdx)
                        return (
                          <div key={shuffledPos}
                            className="flex items-center gap-2 px-3 py-2 rounded-[6px] text-sm"
                            style={{
                              backgroundColor: isCorrect ? "rgba(34,197,94,0.12)" : isChosen ? "rgba(185,28,28,0.08)" : "rgba(1,41,112,0.03)",
                              border: isCorrect ? "1px solid rgba(34,197,94,0.4)" : isChosen ? "1px solid rgba(185,28,28,0.3)" : "1px solid transparent",
                              fontFamily: "var(--font-poppins)",
                            }}>
                            {isCorrect
                              ? <Check className="w-4 h-4 shrink-0" style={{ color: "#15803d" }} />
                              : isChosen
                                ? <X className="w-4 h-4 shrink-0" style={{ color: "#b91c1c" }} />
                                : <span className="w-4 h-4 shrink-0" />}
                            <span style={{ color: isCorrect ? "#15803d" : isChosen ? "#b91c1c" : "#445b7a" }}>
                              {String.fromCharCode(65 + shuffledPos)}){" "}{opt}
                            </span>
                            {isChosen && !isCorrect && <span className="ml-auto text-xs" style={{ color: "#b91c1c" }}>{t("fanResurslariOq.results.studentChose")}</span>}
                            {isCorrect && <span className="ml-auto text-xs font-semibold" style={{ color: "#15803d" }}>{t("fanResurslariOq.results.correctAnswer")}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* ── Talabalar ro'yxati (F.I.Sh. bo'yicha) + qayta urinish ruxsati ── */
            <RetakeTable
              submissions={submissions}
              maxScore={test.maxScore}
              attemptsCount={test.attemptsCount}
              grant={(ids) => teachingApi.grantRetake(test.id, ids)}
              revoke={(studentUserId) => teachingApi.revokeRetake(test.id, studentUserId)}
              onChanged={refetchSubs}
              onView={setSelectedSub}
              violations={violData?.data ?? []}
            />
          )}
        </div>

        <div className="px-5 py-3 shrink-0 flex items-center justify-between text-xs"
          style={{ borderTop: "1px solid rgba(1,41,112,0.08)", ...labelStyle }}>
          <span>{t("fanResurslariOq.results.totalSubmitted", { n: submissions.length })}</span>
          <button onClick={onClose}
            className="px-4 py-2 rounded-[8px] text-sm font-medium"
            style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>
            {t("fanResurslariOq.results.close")}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Resurs tablari ───────────────────────────────────────────────────── */
const RESOURCE_TABS = [
  { kind: "video_lesson", contentType: "mavzu" as const, icon: Video, labelKey: "fanResurslariOq.video.title", descKey: "fanResurslariOq.video.description", accept: "video/*" },
  { kind: "audio", contentType: "mavzu" as const, icon: Music, labelKey: "fanResurslariOq.audio.title", descKey: "fanResurslariOq.audio.description", accept: "audio/*" },
  { kind: "theory", contentType: "mavzu" as const, icon: BookOpen, labelKey: "fanResurslariOq.presentation.title", descKey: "fanResurslariOq.presentation.description", accept: ".pdf,.ppt,.pptx" },
  { kind: "qollanma", contentType: "mavzu" as const, icon: Library, labelKey: "fanResurslariOq.guide.title", descKey: "fanResurslariOq.guide.description", accept: ".pdf,.doc,.docx,.zip,.rar" },
  { kind: "exam", contentType: "exam" as const, icon: HelpCircle, labelKey: "fanResurslariOq.test.title", descKey: "fanResurslariOq.test.description", accept: "" },
  { kind: "assignment", contentType: "assignment" as const, icon: ClipboardList, labelKey: "fanResurslariOq.assignment.title", descKey: "fanResurslariOq.assignment.description", accept: ".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar" },
  { kind: "meeting", contentType: "mavzu" as const, icon: VideoIcon, labelKey: "fanResurslariOq.meeting.title", descKey: "fanResurslariOq.meeting.description", accept: "" },
] as const
type TabKind = typeof RESOURCE_TABS[number]["kind"]

/* ── Mashg'ulot turi (ma'ruza/amaliyot) — resurs qaysi mashg'ulot uchun
   ekanini belgilash, resurs formatidan (video/hujjat/...) mustaqil.
   Mustaqil ish bu yerda yaratilmaydi — u Nazoratlar → Imtihonlar
   ro'yxatida, oraliq bilan bir joyda. Avval yaratilgan "Mustaqil ish"
   mavzulari ro'yxatda ko'rinadi va ochiladi (tanlovga qo'shib ko'rsatiladi). ── */
const TRAINING_TYPE_OPTIONS = [
  { value: "Ma'ruza", labelKey: "fanResurslariOq.trainingType.lecture" },
  { value: "Amaliyot", labelKey: "fanResurslariOq.trainingType.practice" },
] as const

function isOldMustaqil(trainingType: string | null | undefined): boolean {
  return /mustaqil/i.test(trainingType ?? "")
}

/* Boshqa (qo'shimcha) guruhda shu nomdagi VA shu mashg'ulot turidagi mavzu
   bo'lmasa yaratadi, bo'lsa uning topicKey'ini qaytaradi — parallel
   guruhlarga resurs nusxalash uchun (ma'ruza/amaliyot/mustaqil ish
   aralashib ketmasligi uchun turi ham solishtiriladi). */
async function findTopicKeyInGroup(
  groupId: number, subjectName: string, topicTitle: string, trainingType: string
): Promise<string | null> {
  const res = await teachingApi.content({ group: groupId, subject: subjectName })
  const normalized = topicTitle.trim().toLowerCase()
  const match = (res.data ?? []).find(i =>
    i.type === "mavzu" && i.kind === "topic" &&
    i.title.trim().toLowerCase() === normalized &&
    (i.trainingType ?? "") === trainingType
  )
  return match?.topicKey ?? null
}

async function ensureTopicKeyForGroup(
  groupId: number, subjectName: string, topicTitle: string, deadline: string | null, trainingType: string
): Promise<string> {
  const existingKey = await findTopicKeyInGroup(groupId, subjectName, topicTitle, trainingType)
  if (existingKey) return existingKey
  const newKey = `${subjectName}__${groupId}__${Date.now()}`
  const res = await teachingApi.createContent({
    type: "mavzu", kind: "topic", groupId, subjectName, topicKey: newKey,
    title: topicTitle, trainingType: trainingType || undefined, availableFrom: new Date().toISOString(), deadline,
  })
  // Backend shu guruhda shu nomdagi mavzu allaqachon bo'lsa, yangisini
  // yaratmay mavjudini qaytaradi — resurslar o'sha mavzuga tushishi kerak.
  return res.data?.topicKey ?? newKey
}

/* Tanlangan parallel guruhlardagi shu mavzu (nomi + turi bo'yicha) va uning
   qismlari — o'chirish/almashtirish/tahrirlash hamma tanlangan guruhda
   birdan bajarilishi uchun. Mavzusi yo'q guruh o'tkazib yuboriladi. */
interface ExtraTopic { groupId: number; topicKey: string; items: TeacherContent[] }

async function loadExtraTopics(
  groupIds: number[], subjectName: string, topicTitle: string, trainingType: string
): Promise<ExtraTopic[]> {
  const out: ExtraTopic[] = []
  for (const gid of groupIds) {
    const topicKey = await findTopicKeyInGroup(gid, subjectName, topicTitle, trainingType)
    if (!topicKey) continue
    const res = await teachingApi.contentByTopic({ topicKey, groupId: gid })
    out.push({ groupId: gid, topicKey, items: res.data ?? [] })
  }
  return out
}

/* Parallel guruhdagi "mos" qism: video↔video, test↔test va h.k.;
   uchrashuv havolalari bir nechta bo'lishi mumkin — URL bo'yicha. */
function sameSlot(a: Pick<TeacherContent, "type" | "kind" | "meetingLink">, b: Pick<TeacherContent, "type" | "kind" | "meetingLink">) {
  if (a.type !== b.type) return false
  if (a.type === "exam" || a.type === "assignment") return true
  if (a.kind !== b.kind || a.kind === "topic") return false
  if (a.kind === "uchrashuv") return (a.meetingLink ?? "") === (b.meetingLink ?? "")
  return true
}

/* ── Resurslar panel ─────────────────────────────────────────────────── */
function ResourcesPanel({ sel, extraGroupIds, trainingType, onChanged }: {
  sel: Selection
  extraGroupIds: number[]
  trainingType: string
  /** Mavzular gridi (material soni/ikonkalari, muddat) ham yangilanishi uchun */
  onChanged: () => void
}) {
  const { t } = useLanguage()
  const { data, loading, error, refetch: refetchPanel } = useApi(
    () => teachingApi.contentByTopic({ topicKey: sel.topicKey, groupId: sel.groupId }),
    [sel.topicKey, sel.groupId]
  )
  const items = data?.data ?? []
  async function refetch() {
    await refetchPanel()
    onChanged()
  }
  const extraTopics = () => loadExtraTopics(extraGroupIds, sel.subjectName, sel.topicTitle, trainingType)

  /* Shu o'zgarishni tanlangan parallel guruhlardagi mos qismga ham qo'llaydi */
  async function forEachExtraMatch(item: TeacherContent, fn: (other: TeacherContent, extra: ExtraTopic) => Promise<unknown>) {
    if (!extraGroupIds.length) return
    for (const extra of await extraTopics()) {
      for (const other of extra.items.filter(o => sameSlot(o, item))) await fn(other, extra)
    }
  }

  const [activeTab, setActiveTab] = useState<TabKind>("video_lesson")
  const [uploadingKind, setUploadingKind] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [opErr, setOpErr] = useState<string | null>(null)
  const [showQuestions, setShowQuestions] = useState(false)
  const [showTestResults, setShowTestResults] = useState(false)
  const [confirmDeleteTest, setConfirmDeleteTest] = useState(false)
  const [deletingTest, setDeletingTest] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsErr, setSettingsErr] = useState<string | null>(null)
  const [settingsOk, setSettingsOk] = useState(false)
  const [titleDraft, setTitleDraft] = useState(sel.topicTitle)
  const [descDraft, setDescDraft] = useState("")
  const [metaSaving, setMetaSaving] = useState(false)
  const [metaSaved, setMetaSaved] = useState(false)

  const video      = items.find(i => i.type === "mavzu" && i.kind === "video_lesson")
  const audio      = items.find(i => i.type === "mavzu" && i.kind === "audio")
  const theory     = items.find(i => i.type === "mavzu" && i.kind === "theory")
  const qollanma   = items.find(i => i.type === "mavzu" && i.kind === "qollanma")
  const test       = items.find(i => i.type === "exam")
  const assignment = items.find(i => i.type === "assignment")
  const meeting    = items.find(i => i.type === "mavzu" && i.kind === "meeting")
  const meetingLinks = items.filter(i => i.type === "mavzu" && i.kind === "uchrashuv")
  const topicMarker = items.find(i => i.type === "mavzu" && i.kind === "topic")

  const topicDeadline = effectiveDeadline(topicMarker?.deadline ?? null, items)
  const deadlinePassed = isPast(topicDeadline)
  const [reopenLoading, setReopenLoading] = useState(false)
  const [reopenErr, setReopenErr] = useState<string | null>(null)
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [deadlineDraft, setDeadlineDraft] = useState("")
  const [deadlineSaving, setDeadlineSaving] = useState(false)

  function startEditDeadline() {
    setDeadlineDraft(toLocalInputValue(topicDeadline))
    setReopenErr(null)
    setEditingDeadline(true)
  }

  // Muddat o'tgan bo'lsa ham o'qituvchi o'zi uzaytira oladi — yangi muddat
  // mavzuning barcha qismlariga (test, topshiriq) va tanlangan parallel
  // guruhlardagi shu nomli mavzuga ham qo'llanadi.
  async function saveDeadline(localValue: string | null) {
    setDeadlineSaving(true)
    setReopenErr(null)
    try {
      const deadline = localValue ? new Date(localValue).toISOString() : null
      await teachingApi.updateTopic(sel.topicKey, { deadline })
      for (const gid of extraGroupIds) {
        const key = await findTopicKeyInGroup(gid, sel.subjectName, sel.topicTitle, trainingType)
        if (key) await teachingApi.updateTopic(key, { deadline })
      }
      setEditingDeadline(false)
      await refetch()
    } catch (e) {
      setReopenErr(e instanceof Error ? e.message : t("fanResurslariOq.deadline.saveError"))
    } finally {
      setDeadlineSaving(false)
    }
  }

  async function toggleReopen() {
    if (!topicMarker) return
    setReopenLoading(true)
    setReopenErr(null)
    try {
      const apply = (key: string) => topicMarker.isReopened ? teachingApi.closeTopic(key) : teachingApi.reopenTopic(key)
      await apply(sel.topicKey)
      for (const gid of extraGroupIds) {
        const key = await findTopicKeyInGroup(gid, sel.subjectName, sel.topicTitle, trainingType)
        if (key) await apply(key)
      }
      await refetch()
    } catch (e) {
      setReopenErr(e instanceof Error ? e.message : "Xatolik yuz berdi")
    } finally {
      setReopenLoading(false)
    }
  }

  const itemByTab: Record<TabKind, TeacherContent | undefined> = {
    video_lesson: video, audio, theory, qollanma, exam: test, assignment, meeting,
  }
  const activeMeta = RESOURCE_TABS.find(tb => tb.kind === activeTab)!
  const activeItem = itemByTab[activeTab]
  const ActiveIcon = activeMeta.icon

  // Har bir tab o'zining nomlanishi/tavsifini eslab qoladi — item mavjud
  // bo'lsa saqlangan qiymatdan, aks holda mavzu nomidan boshlanadi.
  useEffect(() => {
    setTitleDraft(activeItem?.title ?? sel.topicTitle)
    setDescDraft(activeItem?.description ?? "")
    setMetaSaved(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeItem?.id, sel.topicTitle])

  async function saveMeta() {
    if (!activeItem) return
    setMetaSaving(true)
    setMetaSaved(false)
    try {
      const patch = { title: titleDraft, description: descDraft }
      await teachingApi.updateContent(activeItem.id, patch)
      await forEachExtraMatch(activeItem, other => teachingApi.updateContent(other.id, patch))
      await refetch()
      setMetaSaved(true)
    } catch (err) {
      setOpErr(err instanceof Error ? err.message : t("fanResurslariOq.errors.saveError"))
    } finally {
      setMetaSaving(false)
    }
  }

  // Unified settings state — only test has saveable settings
  const [settings, setSettings] = useState({
    testMaxScore: 0, testDuration: 0, testAttempts: 0, testDisplayCount: 0,
  })

  // Sync settings from loaded data
  useEffect(() => {
    setSettings({
      testMaxScore:     test?.maxScore              ?? 0,
      testDuration:     test?.durationMinutes        ?? 0,
      testAttempts:     test?.attemptsCount          ?? 0,
      testDisplayCount: test?.questionDisplayCount   ?? 0,
    })
    setSettingsOk(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test?.id])

  const setSt = <K extends keyof typeof settings>(key: K, v: number) =>
    setSettings(s => ({ ...s, [key]: v }))

  async function saveAllSettings() {
    if (!test) return
    setSavingSettings(true)
    setSettingsErr(null)
    setSettingsOk(false)
    try {
      const patch = {
        maxScore:             settings.testMaxScore     || null,
        durationMinutes:      settings.testDuration     || null,
        attemptsCount:        settings.testAttempts     || null,
        questionDisplayCount: settings.testDisplayCount || null,
      }
      await teachingApi.updateContent(test.id, patch)
      await forEachExtraMatch(test, other => teachingApi.updateContent(other.id, patch))
      await refetch()
      setSettingsOk(true)
    } catch (e) {
      setSettingsErr(e instanceof Error ? e.message : t("fanResurslariOq.errors.saveError"))
    } finally {
      setSavingSettings(false)
    }
  }

  // Savollar saqlangach — tanlangan parallel guruhlardagi testga ham xuddi
  // shu savollar yoziladi (test o'zi upload() orqali u yerda ham yaratilgan).
  async function onQuestionsSaved() {
    try {
      if (test && extraGroupIds.length) {
        const res = await teachingApi.questions(test.id)
        const questions = ((res.data ?? []) as ExamQuestion[]).map(({ id: _id, ...q }) => q)
        await forEachExtraMatch(test, other => teachingApi.saveQuestions(other.id, questions))
      }
    } catch (err) {
      setOpErr(err instanceof Error ? err.message : t("fanResurslariOq.errors.saveError"))
    }
    await refetch()
  }

  const now = () => new Date().toISOString()

  /* Asosiy guruhda yaratadi va tanlangan parallel guruhlarga nusxalaydi;
     asosiy guruhdagi yangi yozuvni qaytaradi (test importi savollarini
     shunga yozadi). `extra` — test sozlamalari kabi qo'shimcha maydonlar. */
  async function createResource(
    kind: string, type: "mavzu" | "exam" | "assignment", file: File | null, extra: ExamSettingsPatch = {}
  ): Promise<TeacherContent | undefined> {
    const created = await teachingApi.createContent({
      type, groupId: sel.groupId, subjectName: sel.subjectName,
      topicKey: sel.topicKey, title: titleDraft.trim() || sel.topicTitle, description: descDraft || undefined, kind,
      trainingType: trainingType || undefined,
      availableFrom: now(), deadline: topicDeadline, docFile: file,
      onUploadProgress: file ? setUploadProgress : undefined,
      ...extra,
    })
    // Tanlangan qo'shimcha guruhlarga ham xuddi shunday qo'shiladi (test
    // ham — savollari "Savollarni tahrirlash"da saqlanganda nusxalanadi;
    // kerak bo'lsa o'sha guruhda shu nomdagi mavzu ham avtomatik yaratiladi).
    for (const gid of extraGroupIds) {
      const groupTopicKey = await ensureTopicKeyForGroup(gid, sel.subjectName, sel.topicTitle, topicDeadline, trainingType)
      const existing = (await teachingApi.contentByTopic({ topicKey: groupTopicKey, groupId: gid })).data ?? []
      const old = existing.filter(o => sameSlot(o, { type, kind, meetingLink: null }))
      // Test/topshiriqqa talaba natijalari bog'langan — o'sha guruhda allaqachon
      // bo'lsa (yoki test↔topshiriq bir-birini istisno qilsa) tegmaymiz.
      if (type !== "mavzu" && (old.length || existing.some(o => o.type === (type === "exam" ? "assignment" : "exam")))) continue
      await teachingApi.createContent({
        type, groupId: gid, subjectName: sel.subjectName,
        topicKey: groupTopicKey, title: titleDraft.trim() || sel.topicTitle, description: descDraft || undefined, kind,
        trainingType: trainingType || undefined,
        availableFrom: now(), deadline: topicDeadline, docFile: file,
        ...extra,
      })
      // Video/audio/taqdimot/qo'llanma — eski nusxa bo'lsa yangisi bilan almashadi
      for (const o of old) await teachingApi.removeContent(o.id)
    }
    return created.data
  }

  async function upload(kind: string, type: "mavzu" | "exam" | "assignment", file: File | null) {
    setOpErr(null)
    setUploadingKind(kind)
    setUploadProgress(file ? 0 : null)
    try {
      await createResource(kind, type, file)
      await refetch()
    } catch (err) {
      setOpErr(err instanceof Error ? err.message : t("fanResurslariOq.errors.uploadError"))
    } finally {
      setUploadingKind(null)
      setUploadProgress(null)
    }
  }

  /* Test faylidan import: test yo'q bo'lsa sozlamalari bilan yaratiladi,
     bor bo'lsa sozlamalari yangilanadi; savollar asosiy va parallel
     guruhlardagi testga yoziladi (onQuestionsSaved bilan bir xil). Xato
     TestFileImport'ga qaytadi va o'sha yerda ko'rsatiladi. */
  async function importTestFile(questions: ExamQuestion[], patch: ExamSettingsPatch, mode: TestImportMode) {
    let target = test
    if (!target) {
      target = await createResource("test", "exam", null, patch)
      if (!target) throw new Error(t("fanResurslariOq.errors.uploadError"))
    } else if (Object.keys(patch).length) {
      await teachingApi.updateContent(target.id, patch)
      await forEachExtraMatch(target, other => teachingApi.updateContent(other.id, patch))
    }
    let all = questions
    if (mode === "append" && test) {
      const res = await teachingApi.questions(test.id)
      all = [...((res.data ?? []) as ExamQuestion[]).map(({ id: _id, ...q }) => q), ...questions]
    }
    await teachingApi.saveQuestions(target.id, all)
    await forEachExtraMatch(target, other => teachingApi.saveQuestions(other.id, all))
    // Sozlama maydonlari test.id o'zgarmasa qayta sinxronlanmaydi
    setSettings(s => ({
      testMaxScore:     "maxScore" in patch ? patch.maxScore ?? 0 : s.testMaxScore,
      testDuration:     "durationMinutes" in patch ? patch.durationMinutes ?? 0 : s.testDuration,
      testAttempts:     "attemptsCount" in patch ? patch.attemptsCount ?? 0 : s.testAttempts,
      testDisplayCount: "questionDisplayCount" in patch ? patch.questionDisplayCount ?? 0 : s.testDisplayCount,
    }))
    await refetch()
  }

  async function remove(item?: TeacherContent) {
    if (!item) return
    setOpErr(null)
    try {
      await teachingApi.removeContent(item.id)
      // Tanlangan parallel guruhlardagi nusxasi ham o'chadi — aks holda o'sha
      // guruh talabalarida qolib ketardi.
      await forEachExtraMatch(item, other => teachingApi.removeContent(other.id))
      await refetch()
    } catch (err) {
      setOpErr(err instanceof Error ? err.message : t("fanResurslariOq.errors.deleteError"))
    }
  }

  // Test↔topshiriq bir-birini istisno qiladi — o'qituvchi adashib test
  // yaratgan bo'lsa, uni o'chirib o'rniga topshiriq yuklay olishi kerak.
  async function deleteTest() {
    setDeletingTest(true)
    await remove(test)
    setDeletingTest(false)
    setConfirmDeleteTest(false)
  }

  async function replace(item: TeacherContent, kind: string, type: "mavzu" | "exam" | "assignment", file: File) {
    setOpErr(null)
    setUploadingKind(kind)
    setUploadProgress(0)
    try {
      // Avval YANGI faylni yuklaymiz, faqat muvaffaqiyatli bo'lsa eskisini
      // o'chiramiz — aks holda internet uzilib yuklash muvaffaqiyatsiz
      // tugasa, o'qituvchi eski faylini butunlay yo'qotib qo'yardi.
      // trainingType/deadline ham saqlanadi — avval almashtirilgan fayl
      // turisiz qolib, talabada alohida "arvoh" mavzu sifatida chiqardi.
      // Mustaqil ish balli eskisi o'chgach qo'yiladi — aks holda ikkalasi
      // birga 35 ballik taqsimotga sig'may qolardi.
      const fresh = await teachingApi.createContent({
        type, groupId: sel.groupId, subjectName: sel.subjectName,
        topicKey: sel.topicKey, title: titleDraft.trim() || sel.topicTitle, description: descDraft || undefined, kind,
        trainingType: item.trainingType ?? (trainingType || undefined),
        availableFrom: item.availableFrom ?? new Date().toISOString(),
        deadline: topicDeadline,
        docFile: file,
        onUploadProgress: setUploadProgress,
      })
      await teachingApi.removeContent(item.id)
      if (item.gradePoints != null && fresh.data) {
        await teachingApi.updateContent(fresh.data.id, { gradePoints: item.gradePoints, gradePart: item.gradePart })
      }
      // Parallel guruhlarda ham xuddi shunday: avval yangisi, keyin eskisi
      await forEachExtraMatch(item, async (other, extra) => {
        const copy = await teachingApi.createContent({
          type, groupId: extra.groupId, subjectName: sel.subjectName,
          topicKey: extra.topicKey, title: titleDraft.trim() || sel.topicTitle, description: descDraft || undefined, kind,
          trainingType: other.trainingType ?? (trainingType || undefined),
          availableFrom: other.availableFrom ?? new Date().toISOString(),
          deadline: other.deadline,
          docFile: file,
        })
        await teachingApi.removeContent(other.id)
        if (other.gradePoints != null && copy.data) {
          await teachingApi.updateContent(copy.data.id, { gradePoints: other.gradePoints, gradePart: other.gradePart })
        }
      })
      await refetch()
    } catch (err) {
      setOpErr(err instanceof Error ? err.message : t("fanResurslariOq.errors.replaceError"))
    } finally {
      setUploadingKind(null)
      setUploadProgress(null)
    }
  }

  if (loading) return <Loading />
  if (error) return <ApiError message={error} onRetry={refetch} />

  const examDisabled = !!assignment && !test
  const assignmentDisabled = !!test && !assignment

  return (
    <div className="flex flex-col gap-4">
      {opErr && (
        <div className="text-sm px-3 py-2 rounded-[6px]"
          style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
          {opErr}
        </div>
      )}

      {/* Mavzu muddati (o'qituvchi o'zi o'zgartiradi/uzaytiradi) + qayta ochish */}
      {topicMarker && (
        <div className="flex flex-col gap-3 px-4 py-3 rounded-[10px]"
          style={{ backgroundColor: topicMarker.isReopened ? "#f0fdf4" : deadlinePassed ? "#fff7ed" : "#f6f9ff", border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="flex items-center gap-3 flex-wrap">
            <Clock className="w-4 h-4 shrink-0" style={{ color: deadlinePassed && !topicMarker.isReopened ? "#c2410c" : "#0e58a8" }} />
            <span className="text-xs font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {topicDeadline
                ? `${t("fanResurslariOq.deadline.current", { date: formatDeadline(topicDeadline) })}${deadlinePassed ? ` — ${t("fanResurslariOq.deadline.passed")}` : ""}`
                : t("fanResurslariOq.deadline.unlimited")}
            </span>
            {topicMarker.isReopened && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#dcfce7", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                {t("fanResurslariOq.reopen.badge")}{topicMarker.reopenedBy ? ` — ${topicMarker.reopenedBy}` : ""}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {!editingDeadline && (
                <button onClick={startEditDeadline}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors hover:bg-white"
                  style={{ border: "1px solid rgba(14,88,168,0.3)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  <CalendarDays className="w-3.5 h-3.5" />
                  {topicDeadline ? t("fanResurslariOq.deadline.change") : t("fanResurslariOq.deadline.set")}
                </button>
              )}
              {(test || assignment) && (
                <button onClick={toggleReopen} disabled={reopenLoading}
                  className="text-xs font-medium px-3 py-1.5 rounded-[6px] transition-colors disabled:opacity-60"
                  style={{
                    backgroundColor: topicMarker.isReopened ? "#fff0f0" : "#eef4ff",
                    color: topicMarker.isReopened ? "#b91c1c" : "#0e58a8",
                    fontFamily: "var(--font-poppins)",
                  }}>
                  {reopenLoading ? "…" : topicMarker.isReopened ? t("fanResurslariOq.reopen.close") : t("fanResurslariOq.reopen.allow")}
                </button>
              )}
            </div>
          </div>

          {deadlinePassed && !topicMarker.isReopened && !editingDeadline && (
            <p className="text-xs" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
              {t("fanResurslariOq.deadline.passedHint")}
            </p>
          )}

          {editingDeadline && (
            <div className="flex flex-col gap-2 pt-3" style={{ borderTop: "1px solid rgba(1,41,112,0.1)" }}>
              <div className="flex items-center gap-2 flex-wrap">
                <input type="datetime-local" value={deadlineDraft} onChange={e => setDeadlineDraft(e.target.value)}
                  className="px-3 py-2 rounded-[6px] text-sm outline-none bg-white"
                  style={{ border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
                <button onClick={() => saveDeadline(deadlineDraft)} disabled={deadlineSaving || !deadlineDraft}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] text-sm font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  {deadlineSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t("fanResurslariOq.form.saveMeta")}
                </button>
                {topicDeadline && (
                  <button onClick={() => saveDeadline(null)} disabled={deadlineSaving}
                    className="px-3 py-2 rounded-[6px] text-sm font-medium bg-white disabled:opacity-60"
                    style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                    {t("fanResurslariOq.deadline.clear")}
                  </button>
                )}
                <button onClick={() => setEditingDeadline(false)} disabled={deadlineSaving}
                  className="px-3 py-2 rounded-[6px] text-sm"
                  style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {t("mavzularOq.cancel")}
                </button>
              </div>
              <p className="text-[11px]" style={labelStyle}>{t("fanResurslariOq.deadline.appliesToAll")}</p>
            </div>
          )}

          {reopenErr && <span className="text-xs" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{reopenErr}</span>}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-[10px] flex-wrap" style={{ backgroundColor: "#eef4ff" }}>
        {RESOURCE_TABS.map(tab => {
          const Icon = tab.icon
          const isActive = tab.kind === activeTab
          const hasItem = !!itemByTab[tab.kind]
          return (
            <button key={tab.kind} onClick={() => setActiveTab(tab.kind)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? "#0e58a8" : "transparent",
                color: isActive ? "#fff" : "#445b7a",
                fontFamily: "var(--font-poppins)",
              }}>
              <Icon className="w-4 h-4" />
              {t(tab.labelKey)}
              {hasItem && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: isActive ? "#fff" : "#22c55e" }} />}
            </button>
          )
        })}
      </div>

      {/* Active panel */}
      <div className="rounded-[12px] bg-white p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-[6px]" style={{ backgroundColor: "#eef4ff" }}>
            <ActiveIcon className="w-4 h-4" style={{ color: "#0e58a8" }} />
          </div>
          <span className="text-sm font-semibold" style={titleStyle}>{t(activeMeta.labelKey)}</span>
        </div>
        <p className="text-xs mb-4" style={labelStyle}>{t(activeMeta.descKey)}</p>

        {activeTab === "meeting" ? (
          <div className="flex flex-col gap-5">
            <MeetingSection
              bare
              meetingItem={meeting}
              groupId={sel.groupId}
              subjectName={sel.subjectName}
              topicKey={sel.topicKey}
              topicTitle={sel.topicTitle}
              trainingType={trainingType}
              topicDeadline={topicDeadline}
              parallelGroupIds={extraGroupIds}
              onRefetch={refetch}
            />
            <div className="pt-4" style={{ borderTop: "1px solid rgba(1,41,112,0.1)" }}>
              <MeetingLinksSection
                items={meetingLinks}
                groupId={sel.groupId}
                subjectName={sel.subjectName}
                topicKey={sel.topicKey}
                topicTitle={sel.topicTitle}
                trainingType={trainingType}
                topicDeadline={topicDeadline}
                parallelGroupIds={extraGroupIds}
                onRefetch={refetch}
              />
            </div>
          </div>
        ) : activeTab === "exam" ? (
          examDisabled ? (
            <div className="flex items-center gap-3 flex-wrap px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#fff7ed" }}>
              <p className="text-xs flex-1" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
                {t("fanResurslariOq.test.disabledMessage")}
              </p>
              <button onClick={() => setActiveTab("assignment")}
                className="text-xs font-medium px-3 py-1.5 rounded-[6px] bg-white"
                style={{ border: "1px solid rgba(146,64,14,0.3)", color: "#92400e", fontFamily: "var(--font-poppins)" }}>
                {t("fanResurslariOq.test.goToAssignment")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {!test ? (
                <button onClick={() => upload("test", "exam", null)} disabled={uploadingKind === "test"}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-[8px] text-sm font-medium w-fit transition-colors hover:bg-[#f6f9ff] disabled:opacity-60"
                  style={{ border: "1px dashed rgba(1,41,112,0.25)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  {uploadingKind === "test" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingKind === "test" ? t("fanResurslariOq.upload.creating") : t("fanResurslariOq.upload.createTest")}
                </button>
              ) : (
                <>
                {test.questionCount === 0 && (
                  <p className="text-xs px-3 py-2 rounded-[6px]"
                    style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                    {t("fanResurslariOq.test.noQuestionsWarn")}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setShowQuestions(true)}
                    className="px-3 py-2 rounded-[6px] text-sm font-medium transition-colors hover:bg-[#f6f9ff]"
                    style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                    {t("fanResurslariOq.test.editQuestions")}
                  </button>
                  <button onClick={() => setShowTestResults(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors hover:bg-[#f6f9ff]"
                    style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                    <BarChart3 className="w-4 h-4" />
                    {t("fanResurslariOq.test.resultsBtn")}
                  </button>
                  <button onClick={() => setConfirmDeleteTest(true)} disabled={confirmDeleteTest}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors hover:bg-[#fef2f2] disabled:opacity-60"
                    style={{ border: "1px solid rgba(220,38,38,0.3)", color: "#dc2626", fontFamily: "var(--font-poppins)" }}>
                    <Trash2 className="w-4 h-4" />
                    {t("fanResurslariOq.test.deleteBtn")}
                  </button>
                </div>
                {confirmDeleteTest && (
                  <div className="flex flex-col gap-2 px-4 py-3 rounded-[10px]"
                    style={{ backgroundColor: "#fef2f2", border: "1px solid rgba(220,38,38,0.25)" }}>
                    <p className="text-xs" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                      {t("fanResurslariOq.test.deleteConfirm")}
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={deleteTest} disabled={deletingTest}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] text-xs font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: "#dc2626", fontFamily: "var(--font-poppins)" }}>
                        {deletingTest && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {t("mavzularOq.yesDelete")}
                      </button>
                      <button onClick={() => setConfirmDeleteTest(false)} disabled={deletingTest}
                        className="px-3 py-2 rounded-[6px] text-xs font-medium bg-white"
                        style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        {t("mavzularOq.cancel")}
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.test.maxScoreLabel")}</label>
                    <input type="number" min={0} max={1000} value={settings.testMaxScore} disabled={deadlinePassed}
                      onChange={e => setSt("testMaxScore", Math.max(0, Number(e.target.value) || 0))}
                      className="w-24 px-2 py-1.5 rounded-[5px] text-sm outline-none disabled:opacity-50"
                      style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.test.durationLabel")}</label>
                    <input type="number" min={0} max={300} value={settings.testDuration} disabled={deadlinePassed}
                      onChange={e => setSt("testDuration", Math.max(0, Number(e.target.value) || 0))}
                      className="w-24 px-2 py-1.5 rounded-[5px] text-sm outline-none disabled:opacity-50"
                      style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.test.attemptsLabel")}</label>
                    <input type="number" min={0} max={10} value={settings.testAttempts} disabled={deadlinePassed}
                      onChange={e => setSt("testAttempts", Math.max(0, Number(e.target.value) || 0))}
                      className="w-24 px-2 py-1.5 rounded-[5px] text-sm outline-none disabled:opacity-50"
                      style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium" style={labelStyle}>
                      {t("fanResurslariOq.test.questionCountLabel", {
                        extra: test?.questionCount ? t("fanResurslariOq.test.questionCountExtra", { n: test.questionCount }) : "",
                      })}
                    </label>
                    <input type="number" min={0} max={test?.questionCount || 9999} value={settings.testDisplayCount} disabled={deadlinePassed}
                      onChange={e => setSt("testDisplayCount", Math.max(0, Number(e.target.value) || 0))}
                      className="w-24 px-2 py-1.5 rounded-[5px] text-sm outline-none disabled:opacity-50"
                      style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
                  </div>
                </div>
                <p className="text-xs" style={labelStyle}>
                  {t("fanResurslariOq.test.summaryMaxScore", { n: settings.testMaxScore > 0 ? settings.testMaxScore : 100 })} ·{" "}
                  {settings.testDuration > 0 ? t("fanResurslariOq.test.durationMinutes", { n: settings.testDuration }) : t("fanResurslariOq.test.unlimitedTime")} ·{" "}
                  {settings.testAttempts > 0 ? t("fanResurslariOq.test.attemptsTimes", { n: settings.testAttempts }) : t("fanResurslariOq.test.unlimitedAttempts")} ·{" "}
                  {settings.testDisplayCount > 0
                    ? t("fanResurslariOq.test.questionsShown", { n: settings.testDisplayCount })
                    : t("fanResurslariOq.test.allQuestions", { n: test?.questionCount ?? 0 })}
                </p>
                <div className="flex items-center gap-3 flex-wrap px-4 py-3 rounded-[10px]"
                  style={{ backgroundColor: "#f6f9ff", border: "1px solid rgba(1,41,112,0.12)" }}>
                  <button onClick={saveAllSettings} disabled={savingSettings || deadlinePassed}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                    {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {savingSettings ? t("fanResurslariOq.saveBar.saving") : t("fanResurslariOq.saveBar.save")}
                  </button>
                  {settingsOk && !savingSettings && (
                    <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                      <CheckCircle2 className="w-4 h-4" /> {t("fanResurslariOq.saveBar.saved")}
                    </span>
                  )}
                  {settingsErr && (
                    <span className="text-sm" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{settingsErr}</span>
                  )}
                  <span className="text-xs ml-auto" style={labelStyle}>
                    {deadlinePassed ? t("fanResurslariOq.test.frozenHint") : t("fanResurslariOq.saveBar.hint")}
                  </span>
                </div>
                {showQuestions && (
                  <QuestionsModal content={test} onClose={() => setShowQuestions(false)} onSaved={onQuestionsSaved} />
                )}
                {showTestResults && (
                  <TestResultsModal test={test} onClose={() => setShowTestResults(false)} />
                )}
                </>
              )}
              {/* Qo'shimcha usul — oddiy (qo'lda) usul tepada o'zgarishsiz qoladi.
                  Test yaratilgandan keyin ham shu joyda turadi — "yuklandi"
                  xabari yo'qolib ketmasligi uchun. */}
              <div className="flex flex-col gap-2 pt-4" style={{ borderTop: "1px solid rgba(1,41,112,0.1)" }}>
                <span className="text-xs font-semibold" style={titleStyle}>{t("testImport.sectionTitle")}</span>
                <TestFileImport
                  existingCount={test?.questionCount ?? 0}
                  settingsLocked={!!test && deadlinePassed}
                  compact={!!test && test.questionCount > 0}
                  onImport={importTestFile}
                />
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.form.titleLabel")}</label>
              <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                className="px-3 py-2 rounded-[8px] text-sm outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.form.descriptionLabel")}</label>
              <RichTextEditor value={descDraft} onChange={setDescDraft} placeholder={t("fanResurslariOq.form.descriptionPlaceholder")} />
            </div>

            {activeItem && (
              <div className="flex items-center gap-3">
                <button onClick={saveMeta} disabled={metaSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  {metaSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t("fanResurslariOq.form.saveMeta")}
                </button>
                {metaSaved && !metaSaving && (
                  <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                    <CheckCircle2 className="w-4 h-4" /> {t("fanResurslariOq.form.metaSaved")}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.form.fileLabel")}</label>
              {activeTab === "assignment" && assignmentDisabled ? (
                <div className="flex items-center gap-3 flex-wrap px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#fff7ed" }}>
                  <p className="text-xs flex-1" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
                    {t("fanResurslariOq.assignment.disabledMessage")}
                  </p>
                  <button onClick={() => setActiveTab("exam")}
                    className="text-xs font-medium px-3 py-1.5 rounded-[6px] bg-white"
                    style={{ border: "1px solid rgba(146,64,14,0.3)", color: "#92400e", fontFamily: "var(--font-poppins)" }}>
                    {t("fanResurslariOq.assignment.goToTest")}
                  </button>
                </div>
              ) : (
                <FileDropZone
                  item={activeItem}
                  accept={activeMeta.accept}
                  uploading={uploadingKind === activeTab}
                  progress={uploadingKind === activeTab ? uploadProgress : null}
                  onUpload={f => upload(activeTab, activeMeta.contentType, f)}
                  onReplace={activeItem ? f => replace(activeItem, activeTab, activeMeta.contentType, f) : undefined}
                  onDelete={() => remove(activeItem)}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Yozuvlar */}
      <TeacherRecordingsSection subjectName={sel.subjectName} topicTitle={sel.topicTitle} />
    </div>
  )
}

/* ── Uchrashuvlar — Zoom/Google Meet va h.k. tashqi havolalar ─────────
   "Meeting (Online dars)" tabidan farqli — u LMS'ning o'z ichki meeting
   tizimini boshqaradi, bu esa shunchaki tashqi ilova havolalarini
   (bitta yoki bir nechtasini) saqlab, talabalarga ko'rsatadi. ── */
/* "21.10.2026, 18:00–19:30" — mahalliy vaqt bilan (Intl'da uz-Latn yo'q) */
function formatLessonRange(startIso: string, endIso?: string) {
  const pad = (n: number) => String(n).padStart(2, "0")
  const s = new Date(startIso)
  if (Number.isNaN(s.getTime())) return ""
  const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const e = endIso ? new Date(endIso) : null
  return `${pad(s.getDate())}.${pad(s.getMonth() + 1)}.${s.getFullYear()}, ${hm(s)}${e && !Number.isNaN(e.getTime()) ? `–${hm(e)}` : ""}`
}

function MeetingLinksSection({
  items, groupId, subjectName, topicKey, topicTitle, trainingType, topicDeadline, parallelGroupIds, onRefetch,
}: {
  items: TeacherContent[]
  groupId: number
  subjectName: string
  topicKey: string
  topicTitle: string
  trainingType: string
  topicDeadline: string | null
  /** Yuqorida tanlangan qo'shimcha guruhlar — havola ularga ham qo'shiladi/o'chadi */
  parallelGroupIds: number[]
  onRefetch: () => void | Promise<unknown>
}) {
  const { t } = useLanguage()
  const [label, setLabel] = useState("")
  const [url, setUrl] = useState("")
  // Dars vaqti — havola talabaning Meeting bo'limi va dars jadvalida shu vaqtga chiqadi
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("10:30")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  // Har bir havolaning dars vaqti — unga bog'langan LMS meeting'dan (contentId;
  // parallel guruh nusxasida — bir xil havola va nom bo'yicha)
  const { data: meetingsRes, refetch: refetchMeetings } = useApi(() => meetingsApi.getAll(), [])
  const meetingOf = (item: TeacherContent) => {
    const list = [...(meetingsRes?.data.upcoming ?? []), ...(meetingsRes?.data.past ?? [])]
    return list.find(m => m.contentId === item.id)
      ?? list.find(m => m.link === item.meetingLink && m.title === item.title)
  }

  async function addLink() {
    if (!url.trim()) return
    // Brauzer vaqtidan ISO (UTC) — MeetingSection'dagi kabi
    const start = new Date(`${date}T${startTime}:00`)
    const end = new Date(`${date}T${endTime}:00`)
    if (!date || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setErr(t("fanResurslariOq.meetingLinks.timeError"))
      return
    }
    const link = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`
    setSaving(true)
    setErr(null)
    try {
      const title = label.trim() || `${topicTitle} — ${t("fanResurslariOq.meetingLinks.defaultTitle", { n: items.length + 1 })}`
      const input = {
        type: "mavzu" as const,
        subjectName,
        title,
        kind: "uchrashuv",
        trainingType: trainingType || undefined,
        availableFrom: new Date().toISOString(),
        deadline: topicDeadline,
        docFile: null,
        meetingLink: link,
      }
      const created = await teachingApi.createContent({ ...input, groupId, topicKey })
      for (const gid of parallelGroupIds) {
        const key = await ensureTopicKeyForGroup(gid, subjectName, topicTitle, topicDeadline, trainingType)
        await teachingApi.createContent({ ...input, groupId: gid, topicKey: key })
      }
      // Sanali dars — talabalarning Meeting bo'limi va dars jadvalida havola bilan
      // chiqadi; mavzudagi havola o'chirilsa backend uni ham o'chiradi (contentId).
      try {
        await meetingsApi.create({
          title, subjectName,
          startTime: start.toISOString(), endTime: end.toISOString(),
          groupIds: [groupId, ...parallelGroupIds],
          externalUrl: link, contentId: created.data.id,
        })
      } catch (e) {
        setErr(t("fanResurslariOq.meetingLinks.scheduleError", { error: e instanceof Error ? e.message : "" }))
      }
      setLabel("")
      setUrl("")
      await Promise.all([onRefetch(), refetchMeetings()])
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("fanResurslariOq.errors.uploadError"))
    } finally {
      setSaving(false)
    }
  }

  async function removeLink(item: TeacherContent) {
    setErr(null)
    try {
      await teachingApi.removeContent(item.id)
      for (const extra of await loadExtraTopics(parallelGroupIds, subjectName, topicTitle, trainingType)) {
        for (const other of extra.items.filter(o => sameSlot(o, item))) await teachingApi.removeContent(other.id)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("fanResurslariOq.errors.deleteError"))
    }
    await Promise.all([onRefetch(), refetchMeetings()])
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="text-xs" style={labelStyle}>{t("fanResurslariOq.meetingLinks.empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const meeting = meetingOf(item)
            return (
            <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-[8px]"
              style={{ backgroundColor: "#f8fbff", border: "1px solid rgba(1,41,112,0.07)" }}>
              <Link2 className="w-4 h-4 shrink-0" style={{ color: "#0e58a8" }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={titleStyle}>{item.title}</div>
                {item.meetingLink && <div className="text-xs truncate" style={labelStyle}>{item.meetingLink}</div>}
                {meeting?.startTime && (
                  <div className="flex items-center gap-1 text-xs mt-0.5" style={labelStyle}>
                    <CalendarDays className="w-3 h-3 shrink-0" />
                    {formatLessonRange(meeting.startTime, meeting.endTime)}
                  </div>
                )}
              </div>
              {item.meetingLink && (
                <a href={item.meetingLink} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold shrink-0 text-white"
                  style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  <ExternalLink className="w-3.5 h-3.5" /> {t("fanResurslariOq.recordings.view")}
                </a>
              )}
              <button onClick={() => removeLink(item)} className="shrink-0 text-xs"
                style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                {t("fanResurslariOq.meetingLinks.remove")}
              </button>
            </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-col gap-2 p-3 rounded-[10px]" style={{ border: "1px dashed rgba(1,41,112,0.2)" }}>
        <input value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder={t("fanResurslariOq.meetingLinks.labelPlaceholder")}
          className="px-3 py-2 rounded-[8px] text-sm outline-none"
          style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
        <input value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://zoom.us/... yoki https://meet.google.com/..."
          className="px-3 py-2 rounded-[8px] text-sm outline-none"
          style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {([
            { key: "date", type: "date", value: date, set: setDate, labelKey: "fanResurslariOq.meetingLinks.date" },
            { key: "start", type: "time", value: startTime, set: setStartTime, labelKey: "fanResurslariOq.meetingLinks.start" },
            { key: "end", type: "time", value: endTime, set: setEndTime, labelKey: "fanResurslariOq.meetingLinks.end" },
          ] as const).map(f => (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="text-[11px] font-medium" style={labelStyle}>{t(f.labelKey)}</span>
              <input type={f.type} value={f.value} onChange={(e) => f.set(e.target.value)}
                className="px-3 py-2 rounded-[8px] text-sm outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
            </label>
          ))}
        </div>
        <p className="text-[11px]" style={labelStyle}>{t("fanResurslariOq.meetingLinks.scheduleHint")}</p>
        <button onClick={addLink} disabled={saving || !url.trim()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium w-fit disabled:opacity-60"
          style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {t("fanResurslariOq.meetingLinks.add")}
        </button>
        {err && <span className="text-xs" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{err}</span>}
      </div>
    </div>
  )
}

/* ── Mavzu yozuvlari (o'qituvchi uchun) ─────────────────────────────── */
function TeacherRecordingsSection({ subjectName, topicTitle }: { subjectName: string; topicTitle: string }) {
  const { t } = useLanguage()
  const { data } = useApi(() => meetingsApi.recordingsBySubject(subjectName), [subjectName])
  const all: SubjectRecording[] = data?.data ?? []

  const filtered = all.filter(r => {
    const a = r.title.toLowerCase()
    const b = topicTitle.toLowerCase()
    return a === b || a.includes(b) || b.includes(a)
  })

  if (filtered.length === 0) return null

  return (
    <div className="rounded-[10px] p-4 flex flex-col gap-3"
      style={{ border: "1px solid rgba(1,41,112,0.1)", backgroundColor: "white" }}>
      <div className="flex items-center gap-2">
        <VideoIcon className="w-4 h-4" style={{ color: "#0e58a8" }} />
        <span className="text-sm font-semibold" style={titleStyle}>{t("fanResurslariOq.recordings.title")}</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-auto"
          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          {t("fanResurslariOq.recordings.count", { n: filtered.length })}
        </span>
      </div>
      {filtered.map(r => (
        <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-[8px]"
          style={{ backgroundColor: "#f8fbff", border: "1px solid rgba(1,41,112,0.07)" }}>
          <VideoIcon className="w-4 h-4 shrink-0" style={{ color: "#0e58a8" }} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={titleStyle}>{r.title || r.originalName}</div>
            <div className="text-xs mt-0.5" style={labelStyle}>
              {new Date(r.startTime).toLocaleDateString("uz-UZ")} · {r.groupNames?.join(", ")}
            </div>
          </div>
          <a href={r.fileUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold shrink-0 text-white"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            <ExternalLink className="w-3.5 h-3.5" /> {t("fanResurslariOq.recordings.view")}
          </a>
        </div>
      ))}
    </div>
  )
}

/* ── Mavzular gridi (kataklar) ──────────────────────────────────────── */
/* Bitta guruhdagi mavzu (topicKey) */
interface TopicInstance {
  groupId: number
  key: string
  title: string
  markerId: number | null
  deadline: string | null
  isReopened: boolean
  trainingType: string | null
  ownerId: number
  /** Mavzuning resurslari (marker qatorisiz) */
  items: TeacherContent[]
  firstId: number
  /** Mavzu (marker yoki birinchi qismi) yaratilgan vaqt */
  createdAt: string
}

/* Grid katagi — tanlangan guruhlardagi bir xil nom + turdagi mavzular birlashmasi.
   Asosiy nusxa (base) — birinchi tanlangan guruhdagisi, u yo'q bo'lsa keyingisi;
   ochish/ko'rsatish shu orqali, tahrirlash/o'chirish esa hamma nusxada. */
interface TopicInfo {
  id: string
  key: string
  title: string
  markerId: number | null
  deadline: string | null
  isReopened: boolean
  trainingType: string | null
  ownerId: number
  base: TopicInstance
  instances: TopicInstance[]
}

type GroupState = "ok" | "partial" | "missing"

const slotOf = (i: TeacherContent) =>
  i.type === "exam" || i.type === "assignment" ? i.type : `${i.type}:${i.kind ?? ""}:${i.kind === "uchrashuv" ? i.meetingLink ?? "" : ""}`

function buildTopicInstances(items: TeacherContent[]): TopicInstance[] {
  const map = new Map<string, TopicInstance>()
  items.forEach(item => {
    if (!item.topicKey) return
    const isMarker = item.type === "mavzu" && item.kind === "topic"
    let inst = map.get(item.topicKey)
    if (!inst) {
      inst = {
        groupId: item.groupId, key: item.topicKey, title: item.title, markerId: null, deadline: item.deadline,
        isReopened: false, trainingType: item.trainingType ?? null, ownerId: item.teacherUserId, items: [], firstId: item.id,
        createdAt: item.createdAt,
      }
      map.set(item.topicKey, inst)
    }
    inst.firstId = Math.min(inst.firstId, item.id)
    if (Date.parse(item.createdAt) < Date.parse(inst.createdAt)) inst.createdAt = item.createdAt
    if (isMarker) {
      // Mavzu turi/nomi/muddati marker'dan (backend'dagi topicTrainingType bilan bir xil)
      Object.assign(inst, { markerId: item.id, title: item.title, deadline: item.deadline, isReopened: item.isReopened, trainingType: item.trainingType ?? null })
    } else {
      inst.items.push(item)
      if (inst.markerId === null && !inst.trainingType && item.trainingType) inst.trainingType = item.trainingType
    }
  })
  const list = Array.from(map.values())
  for (const inst of list) inst.deadline = effectiveDeadline(inst.deadline, inst.items)
  return list
}

function mergeTopics(instances: TopicInstance[], groupOrder: number[]): TopicInfo[] {
  const map = new Map<string, TopicInstance[]>()
  for (const inst of instances) {
    const id = `${inst.ownerId}|${inst.trainingType ?? ""}|${inst.title.trim().toLowerCase()}`
    if (!map.has(id)) map.set(id, [])
    map.get(id)!.push(inst)
  }
  return Array.from(map.entries())
    .map(([id, list]) => {
      list.sort((a, b) => groupOrder.indexOf(a.groupId) - groupOrder.indexOf(b.groupId))
      const base = list[0]
      return {
        id, key: base.key, title: base.title, markerId: base.markerId, deadline: base.deadline,
        isReopened: base.isReopened, trainingType: base.trainingType, ownerId: base.ownerId, base, instances: list,
      }
    })
    .sort((a, b) => Math.min(...a.instances.map(i => i.firstId)) - Math.min(...b.instances.map(i => i.firstId)))
}

/* Har bir tanlangan guruhda mavzu bormi va barcha resurslari to'liqmi */
function topicGroupStates(tp: TopicInfo, groupIds: number[]): { groupId: number; state: GroupState }[] {
  const allSlots = new Set(tp.instances.flatMap(i => i.items.map(slotOf)))
  return groupIds.map(groupId => {
    const inst = tp.instances.find(i => i.groupId === groupId)
    if (!inst) return { groupId, state: "missing" as const }
    const have = new Set(inst.items.map(slotOf))
    return { groupId, state: [...allSlots].every(s => have.has(s)) ? "ok" as const : "partial" as const }
  })
}

const inputStyle = { border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)" } as const
const CARD_MIN_HEIGHT = 184

const MATERIAL_ICONS: { match: (i: TeacherContent) => boolean; icon: typeof Video }[] = [
  { match: i => i.kind === "video_lesson", icon: Video },
  { match: i => i.kind === "audio", icon: Music },
  { match: i => i.kind === "theory", icon: BookOpen },
  { match: i => i.kind === "qollanma", icon: Library },
  { match: i => i.type === "exam", icon: HelpCircle },
  { match: i => i.type === "assignment", icon: ClipboardList },
]

/* Tahrirlash/o'chirish/qo'shish holatidagi katak ramkasi */
function CardShell({ children, variant = "edit" }: { children: React.ReactNode; variant?: "edit" | "add" | "danger" }) {
  const border = variant === "add" ? "2px dashed rgba(14,88,168,0.35)"
    : variant === "danger" ? "1px solid rgba(220,38,38,0.35)"
    : "1px solid rgba(14,88,168,0.35)"
  return (
    <div className="flex flex-col gap-3 p-4 rounded-[12px] bg-white"
      style={{ border, boxShadow: "0 4px 14px rgba(1,41,112,0.08)", minHeight: CARD_MIN_HEIGHT }}>
      {children}
    </div>
  )
}

/* Mavzu nomi + muddat — yangi mavzu qo'shish va tahrirlash uchun bir xil forma */
function TopicForm({
  title, deadline, onTitle, onDeadline, onSubmit, onCancel, loading, submitLabel,
}: {
  title: string
  deadline: string
  onTitle: (v: string) => void
  onDeadline: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
  loading: boolean
  submitLabel: string
}) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-2.5">
      <input value={title} onChange={e => onTitle(e.target.value)} autoFocus
        onKeyDown={e => { if (e.key === "Enter") onSubmit(); if (e.key === "Escape") onCancel() }}
        placeholder={t("mavzularOq.topicName")}
        className="w-full px-3 py-2 rounded-[6px] text-sm outline-none" style={inputStyle} />
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium" style={labelStyle}>{t("fanResurslariOq.deadline.label")}</label>
        <input type="datetime-local" value={deadline} onChange={e => onDeadline(e.target.value)}
          className="w-full px-3 py-2 rounded-[6px] text-sm outline-none" style={inputStyle} />
      </div>
      <div className="flex items-center gap-2 mt-1">
        <button onClick={onSubmit} disabled={loading || !title.trim()}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] text-xs font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {submitLabel}
        </button>
        <button onClick={onCancel} disabled={loading}
          className="px-3 py-2 rounded-[6px] text-xs font-medium"
          style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("mavzularOq.cancel")}
        </button>
      </div>
    </div>
  )
}

/* Bitta mavzu katagi — bosilganda mavzu resurslari ochiladi */
const GROUP_STATE_STYLE: Record<GroupState, { bg: string; color: string; border: string; titleKey: string }> = {
  ok:      { bg: "#f0fdf4", color: "#15803d", border: "1px solid rgba(21,128,61,0.25)", titleKey: "fanResurslariOq.grid.inGroup" },
  partial: { bg: "#fffbeb", color: "#b45309", border: "1px solid rgba(180,83,9,0.3)",   titleKey: "fanResurslariOq.grid.partialInGroup" },
  missing: { bg: "white",   color: "#b91c1c", border: "1px dashed rgba(185,28,28,0.45)", titleKey: "fanResurslariOq.grid.missingInGroup" },
}

function TopicCard({ index, topic, items, onOpen, onEdit, onDelete, footer, groups, onSync, syncing, ownerName, duplicateGroups, onMergeDuplicates, merging, large, meta }: {
  index: number
  topic: TopicInfo
  /** Mavzuning resurslari (marker qatorisiz) */
  items: TeacherContent[]
  onOpen?: () => void
  onEdit?: () => void
  onDelete?: () => void
  footer?: React.ReactNode
  /** Bir nechta guruh tanlanganda — har birida mavzu bor/to'liq/yo'q */
  groups?: { name: string; state: GroupState }[]
  onSync?: () => void
  syncing?: boolean
  /** Boshqa o'qituvchining mavzusi — faqat ko'rish uchun */
  ownerName?: string
  /** Shu mavzu bir necha marta bor guruhlar (talabalar ikkalasini ko'radi) */
  duplicateGroups?: string[]
  onMergeDuplicates?: () => void
  merging?: boolean
  /** Barcha mavzular ro'yxatida tanlangan mavzu — kattaroq katak, guruhlari doim ko'rinadi */
  large?: boolean
  /** Sarlavha ostidagi qo'shimcha belgilar (fan, mashg'ulot turi) */
  meta?: React.ReactNode
}) {
  const { t } = useLanguage()
  const count = items.length
  const passed = isPast(topic.deadline)
  const icons = MATERIAL_ICONS.filter(m => items.some(m.match))
  const deadlineColor = topic.isReopened ? "#15803d" : passed ? "#c2410c" : "#445b7a"
  const deadlineBg = topic.isReopened ? "#f0fdf4" : passed ? "#fff7ed" : "#f6f9ff"
  const readOnly = !onOpen
  const needsSync = !!groups?.some(g => g.state !== "ok")

  return (
    <div role={readOnly ? undefined : "button"} tabIndex={readOnly ? undefined : 0} onClick={onOpen}
      onKeyDown={e => { if (onOpen && e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onOpen() } }}
      className={`group flex flex-col rounded-[12px] bg-white text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#0e58a8] ${large ? "gap-4 p-6" : "gap-3 p-4"} ${readOnly ? "" : large ? "cursor-pointer hover:shadow-md" : "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"}`}
      style={{
        border: large ? "1px solid rgba(14,88,168,0.35)" : "1px solid rgba(1,41,112,0.12)",
        boxShadow: large ? "0 6px 20px rgba(1,41,112,0.10)" : "0 1px 4px rgba(1,41,112,0.06)",
        minHeight: large ? 280 : CARD_MIN_HEIGHT, opacity: readOnly ? 0.9 : 1,
      }}>
      <div className="flex items-start justify-between gap-2">
        <span className={`${large ? "w-11 h-11 text-base" : "w-9 h-9 text-sm"} rounded-[10px] flex items-center justify-center font-bold shrink-0`}
          style={{
            backgroundColor: count > 0 ? "rgba(34,197,94,0.12)" : "#eef4ff",
            color: count > 0 ? "#15803d" : "#0e58a8",
            fontFamily: "var(--font-poppins)",
          }}>
          {index}
        </span>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-0.5 shrink-0">
            {onEdit && (
              <button onClick={e => { e.stopPropagation(); onEdit() }} title={t("mavzularOq.edit")}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] transition-colors hover:bg-[#f0f5ff]">
                <Pencil className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
              </button>
            )}
            {onDelete && (
              <button onClick={e => { e.stopPropagation(); onDelete() }} title={t("mavzularOq.delete")}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] transition-colors hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-1">
        <p className={`font-semibold leading-snug break-words ${large ? "text-lg" : "text-sm line-clamp-3"}`} style={titleStyle} title={topic.title}>
          {topic.title}
        </p>
        {meta}
        {ownerName && (
          <p className="text-[11px] flex items-center gap-1" style={labelStyle}>
            <Users className="w-3 h-3 shrink-0" /> {ownerName}
          </p>
        )}
      </div>

      {groups && (groups.length > 1 || (large && groups.length > 0)) && (
        <div className="flex flex-wrap gap-1">
          {groups.map(g => {
            const st = GROUP_STATE_STYLE[g.state]
            return (
              <span key={g.name} title={t(st.titleKey)}
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[5px]"
                style={{ backgroundColor: st.bg, color: st.color, border: st.border, fontFamily: "var(--font-poppins)" }}>
                {g.name}
              </span>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs" style={{ color: count > 0 ? "#15803d" : "#b0c2d8", fontFamily: "var(--font-poppins)" }}>
          {count > 0 ? t("fanResurslariOq.sidebar.materialCount", { n: count }) : t("fanResurslariOq.sidebar.empty")}
        </span>
        <div className="flex items-center gap-1">
          {icons.map(({ icon: Icon }, i) => <Icon key={i} className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />)}
        </div>
      </div>

      {items.some(i => i.type === "exam" && i.questionCount === 0) && (
        <p className="text-[11px] font-medium" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
          {t("fanResurslariOq.grid.emptyTest")}
        </p>
      )}

      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-xs font-medium"
        style={{ backgroundColor: deadlineBg, color: deadlineColor, fontFamily: "var(--font-poppins)" }}>
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">
          {!topic.deadline
            ? t("fanResurslariOq.deadline.none")
            : passed
              ? `${t("fanResurslariOq.deadline.passed")} · ${formatDeadline(topic.deadline)}`
              : t("fanResurslariOq.deadline.until", { date: formatDeadline(topic.deadline) })}
        </span>
        {topic.isReopened && <span className="ml-auto shrink-0 font-semibold">{t("fanResurslariOq.reopen.badge")}</span>}
      </div>

      {duplicateGroups && duplicateGroups.length > 0 && (
        <div className="flex flex-col gap-2 px-2.5 py-2 rounded-[8px]"
          style={{ backgroundColor: "#fef2f2", border: "1px solid rgba(185,28,28,0.25)" }}>
          <span className="text-[11px] font-semibold" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}
            title={t("fanResurslariOq.dup.hint")}>
            {t("fanResurslariOq.dup.badge", { groups: duplicateGroups.join(", ") })}
          </span>
          {onMergeDuplicates && (
            <button onClick={e => { e.stopPropagation(); onMergeDuplicates() }} disabled={merging}
              className="flex items-center justify-center gap-1.5 w-full px-3 py-1.5 rounded-[6px] text-xs font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "#dc2626", fontFamily: "var(--font-poppins)" }}>
              {merging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
              {t("fanResurslariOq.dup.merge")}
            </button>
          )}
        </div>
      )}

      {needsSync && onSync && (
        <button onClick={e => { e.stopPropagation(); onSync() }} disabled={syncing}
          className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-[8px] text-xs font-semibold transition-opacity disabled:opacity-60"
          style={{ backgroundColor: "#fffbeb", color: "#b45309", border: "1px solid rgba(180,83,9,0.3)", fontFamily: "var(--font-poppins)" }}>
          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
          {t("fanResurslariOq.grid.syncAll")}
        </button>
      )}

      {footer}
    </div>
  )
}

/* ── Barcha mavzular ro'yxati (filtrlar to'liq tanlanmaganda) ────────── */
/* O'qituvchining hamma guruh va fanlardagi o'z mavzulari. Bir mavzu nechta
   guruhda bo'lsa ham bir marta chiqadi (fan + tur + nom bo'yicha birlashadi). */
interface OverviewTopic {
  id: string
  subjectName: string
  topic: TopicInfo
  /** Fan + mashg'ulot turi ichidagi tartib raqami — mavzular gridi bilan bir xil */
  index: number
}

const TYPE_ORDER: string[] = TRAINING_TYPE_OPTIONS.map(o => o.value)

function buildOverviewTopics(items: TeacherContent[], groupOrder: number[]): OverviewTopic[] {
  const bySubject = new Map<string, TeacherContent[]>()
  for (const item of items) {
    if (!bySubject.has(item.subjectName)) bySubject.set(item.subjectName, [])
    bySubject.get(item.subjectName)!.push(item)
  }
  const out: OverviewTopic[] = []
  for (const [subjectName, list] of bySubject) {
    const counters = new Map<string, number>()
    for (const topic of mergeTopics(buildTopicInstances(list), groupOrder)) {
      const n = (counters.get(topic.trainingType ?? "") ?? 0) + 1
      counters.set(topic.trainingType ?? "", n)
      out.push({ id: `${subjectName}|${topic.id}`, subjectName, topic, index: n })
    }
  }
  return out
}

type OverviewSort = "type" | "createdDesc" | "createdAsc"

function topicCreatedAt(o: OverviewTopic): number {
  const times = o.topic.instances.map(i => Date.parse(i.createdAt)).filter(n => !Number.isNaN(n))
  return times.length ? Math.min(...times) : 0
}

/* Standart tartib: avval Ma'ruza, keyin Amaliyot, Mustaqil ish; boshqa turlar
   va turi belgilanmaganlar oxirida, tur ichida — fan, so'ng mavzu tartibi.
   "Yaratilgan" ustuni bosilsa — yaratilgan vaqti bo'yicha. */
function sortOverview(list: OverviewTopic[], mode: OverviewSort): OverviewTopic[] {
  if (mode !== "type") {
    const dir = mode === "createdDesc" ? -1 : 1
    return [...list].sort((a, b) => dir * (topicCreatedAt(a) - topicCreatedAt(b)))
  }
  const rank = (type: string | null) =>
    type === null ? TYPE_ORDER.length + 1 : TYPE_ORDER.includes(type) ? TYPE_ORDER.indexOf(type) : TYPE_ORDER.length
  return [...list].sort((a, b) => {
    const ta = a.topic.trainingType || null
    const tb = b.topic.trainingType || null
    return rank(ta) - rank(tb) || (ta ?? "").localeCompare(tb ?? "")
      || a.subjectName.localeCompare(b.subjectName) || a.index - b.index
  })
}

/* "18.10.2026 17:53:01" — mahalliy vaqt bilan (Intl'da uz-Latn yo'q) */
function formatDateTime(ms: number) {
  if (!ms) return "—"
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/* "Yaratish" — yangi mavzu tanlangan guruh(lar)da, fan va mashg'ulot turi bilan.
   Filtrlardagi "Mavzu qo'shish" bilan bir xil: shu nom + turdagi mavzu guruhda
   allaqachon bo'lsa, qayta yaratilmaydi. */
function CreateTopicDialog({ groups, hemisSubjectsOf, onClose, onCreated }: {
  groups: TeacherGroup[]
  /** O'quv yili tanlangan bo'lsa — HEMIS'dagi shu guruh fanlari */
  hemisSubjectsOf: (groupId: number) => string[]
  onClose: () => void
  onCreated: (topic: { subjectName: string; trainingType: string; title: string }) => void | Promise<void>
}) {
  const { t } = useLanguage()
  const [groupIds, setGroupIds] = useState<number[]>([])
  const [subjectName, setSubjectName] = useState("")
  const [trainingType, setTrainingType] = useState("")
  const [title, setTitle] = useState("")
  const [deadline, setDeadline] = useState("")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const primary = groupIds[0] ?? null
  const { data: subjectsRes } = useApi(
    () => primary ? teachingApi.mySubjects(primary) : Promise.resolve(null),
    [primary]
  )
  const subjects = [...new Set([
    ...(subjectsRes?.data?.map(s => s.subjectName) ?? []),
    ...(primary ? hemisSubjectsOf(primary) : []),
  ])].sort()

  function changeGroups(ids: number[]) {
    if ((ids[0] ?? null) !== primary) setSubjectName("")
    setGroupIds(ids)
  }

  async function submit() {
    if (!groupIds.length || !subjectName || !trainingType || !title.trim()) {
      setErr(t("fanResurslariOq.create.fillAll"))
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const deadlineIso = deadline ? new Date(deadline).toISOString() : null
      for (const gid of groupIds) {
        await ensureTopicKeyForGroup(gid, subjectName, title.trim(), deadlineIso, trainingType)
      }
      await onCreated({ subjectName, trainingType, title: title.trim() })
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("mavzularOq.addError"))
    } finally {
      setSaving(false)
    }
  }

  const fieldClass = "w-full px-3 py-2 rounded-[6px] text-sm outline-none disabled:opacity-50"
  const selectStyle = { ...inputStyle, backgroundColor: "white" }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(1,41,112,0.35)" }} onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
        className="w-full max-w-[520px] rounded-[12px] bg-white p-5 sm:p-6 flex flex-col gap-4"
        style={{ boxShadow: "0 12px 40px rgba(1,41,112,0.2)" }}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold" style={titleStyle}>{t("fanResurslariOq.create.title")}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-[6px] transition-colors hover:bg-[#f0f5ff]">
            <X className="w-4 h-4" style={{ color: "#7293b9" }} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.group")}</label>
          <GroupMultiSelect groups={groups} selectedIds={groupIds} onChange={changeGroups}
            placeholder={t("fanResurslariOq.selectPlaceholder")} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.subjectName")}</label>
            <select value={subjectName} onChange={e => setSubjectName(e.target.value)} disabled={!primary || !subjects.length}
              className={fieldClass} style={selectStyle}>
              <option value="">{t("fanResurslariOq.selectPlaceholder")}</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.form.trainingTypeLabel")}</label>
            <select value={trainingType} onChange={e => setTrainingType(e.target.value)} className={fieldClass} style={selectStyle}>
              <option value="">{t("fanResurslariOq.form.trainingTypeUnset")}</option>
              {TRAINING_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={labelStyle}>{t("mavzularOq.topicName")}</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit() }}
            className={fieldClass} style={inputStyle} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.deadline.label")}</label>
          <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)}
            className={fieldClass} style={inputStyle} />
        </div>

        {err && (
          <p className="text-xs px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
            {err}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={saving}
            className="px-3.5 py-2 rounded-[6px] text-sm font-medium"
            style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("mavzularOq.cancel")}
          </button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "#16a34a", fontFamily: "var(--font-poppins)" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CirclePlus className="w-4 h-4" />}
            {t("fanResurslariOq.table.create")}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Bosh sahifa ─────────────────────────────────────────────────────── */
const PAGE_TOP_ID = "fan-resurslari-top"

export default function FanResurslariPage() {
  const { t } = useLanguage()
  const { data: groupsRes, loading: lGroups, error: eGroups } = useApi(() => teachingApi.groups(), [])

  const groups = groupsRes?.data ?? []

  // Bir nechta guruh tanlanishi mumkin — birinchisi "asosiy" (mavzular shu
  // guruh bo'yicha ko'rsatiladi), qolganlari "qo'shimcha" (shu yerga
  // yuklangan mavzu/resurslar ularga ham avtomatik nusxalanadi).
  const [groupIds, setGroupIds] = useState<number[]>([])
  const [academicYear, setAcademicYear] = useState("")
  const [subjectName, setSubjectName] = useState("")
  const [topicKey, setTopicKey] = useState("")
  // Mashg'ulot turi — fan tanlangach belgilanadi, shu yerda yuklanadigan
  // har bir resursga (video/audio/taqdimot/qo'llanma/topshiriq) qo'llanadi.
  const [trainingType, setTrainingType] = useState("")

  // Faqat aniq bir yil tanlanganda HEMIS'dan so'raladi (join sahifa
  // yuklanishida emas) — o'sha yilda o'qituvchi dars bergan guruhlar,
  // o'tganlari ham (joriy /groups faqat so'nggi sinxronizatsiya + kontenti
  // bor guruhlarni beradi).
  const { data: yearGroupsRes, loading: lYearGroups } = useApi(
    () => academicYear ? teachingApi.groupsByYear(academicYear) : Promise.resolve(null),
    [academicYear]
  )
  const yearGroups = yearGroupsRes?.data ?? []

  const displayGroups = useMemo<TeacherGroup[]>(() => {
    if (!academicYear) return groups
    return [...yearGroups].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  }, [academicYear, groups, yearGroups])

  const activeGroupId = groupIds[0] ?? null

  const { data: subjectsRes } = useApi(
    () => activeGroupId ? teachingApi.mySubjects(activeGroupId as number) : Promise.resolve(null),
    [activeGroupId]
  )

  // Bazamizda hali kontenti yo'q guruh uchun mySubjects bo'sh qaytadi — bunday
  // holatda HEMIS'dan (groupsByYear orqali) shu guruhga o'qitilgan fanlar
  // ro'yxatini qo'shib, tanlashni ishga tushirib beramiz.
  const subjects = useMemo<string[]>(() => {
    const fromContent = subjectsRes?.data?.map(s => s.subjectName) ?? []
    const fromHemis = academicYear
      ? (yearGroups.find(g => g.id === activeGroupId)?.subjects ?? [])
      : []
    return [...new Set([...fromContent, ...fromHemis])].sort()
  }, [subjectsRes, academicYear, yearGroups, activeGroupId])

  // Tanlangan HAMMA guruhlardagi shu fan kontenti (boshqa o'qituvchilarniki ham) —
  // avval faqat asosiy (birinchi) guruhniki olinar edi: boshqa guruhlarda bor,
  // asosiyda yo'q mavzular o'qituvchiga umuman ko'rinmas, talabalarda esa bor edi.
  const groupKey = groupIds.join(",")
  const { data: contentRes, loading: lTopics, refetch: refetchTopics } = useApi(
    () => groupIds.length && subjectName
      ? teachingApi.groupContent(groupIds, subjectName)
      : Promise.resolve({ success: true, data: [] as TeacherContent[], owners: {} as Record<number, string>, me: 0 }),
    [groupKey, subjectName]
  )
  const allItems = useMemo(() => contentRes?.data ?? [], [contentRes])
  const owners = contentRes?.owners ?? {}
  // O'qituvchining o'z kontenti (hamma guruh va fanlar) — barcha mavzular ro'yxati uchun
  const { data: mineRes, loading: lMine, error: eMine, refetch: refetchMine } = useApi(() => teachingApi.content(), [])
  // Filtrlar tanlanmaganda group-content so'ralmaydi (me = 0) — shunda o'z ID'si
  // o'z kontentidan olinadi, aks holda ro'yxatdagi mavzular "boshqa o'qituvchiniki" bo'lib qolardi.
  const me = contentRes?.me || mineRes?.data?.[0]?.teacherUserId || 0

  const topicInstances = useMemo(() => buildTopicInstances(allItems), [allItems])
  // O'qituvchining o'z mavzulari — guruhlar bo'yicha birlashtirilgan (nomi + turi)
  const ownTopics = useMemo(
    () => mergeTopics(topicInstances.filter(i => i.ownerId === me), groupIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topicInstances, me, groupKey]
  )
  // Tanlangan turdagi mavzular — ma'ruza/amaliyot/mustaqil ish aralashmaydi.
  const typedTopics = useMemo(() => ownTopics.filter(tp => tp.trainingType === trainingType), [ownTopics, trainingType])
  // Turi belgilanmagan (eski) mavzular — talabada "Boshqa materiallar"da chiqadi;
  // alohida bo'limda: turga o'tkazish yoki o'chirish mumkin.
  const legacyTopics = useMemo(() => ownTopics.filter(tp => !tp.trainingType), [ownTopics])
  // Boshqa o'qituvchilarning shu guruhlardagi mavzulari — talabalar ko'radi,
  // o'qituvchiga faqat ko'rish uchun (tahrirlashni faqat muallif qila oladi).
  const otherTopics = useMemo(
    () => mergeTopics(topicInstances.filter(i => i.ownerId !== me), groupIds)
      .filter(tp => !tp.trainingType || tp.trainingType === trainingType),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topicInstances, me, groupKey, trainingType]
  )

  const groupNameOf = (id: number) => displayGroups.find(g => g.id === id)?.name ?? String(id)

  // Filtrlar to'liq tanlanmaganda — o'qituvchining barcha mavzulari ro'yxati.
  // Tanlangan filtrlar (yil, guruh, fan) ro'yxatni toraytiradi.
  const groupOrder = useMemo(
    () => [...groups].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(g => g.id),
    [groups]
  )
  const overviewTopics = useMemo(() => buildOverviewTopics(mineRes?.data ?? [], groupOrder), [mineRes, groupOrder])
  // Eski "Mustaqil ish" mavzulari — endi baholanmaydi (mustaqil ish Nazoratlar
  // bo'limida yaratiladi); o'qituvchi ularni shu ro'yxatdan topib o'chiradi
  const oldMiCount = useMemo(() => overviewTopics.filter(o => isOldMustaqil(o.topic.trainingType)).length, [overviewTopics])
  const [onlyOldMi, setOnlyOldMi] = useState(false)
  const filteredOverview = useMemo(() => {
    const yearGroupIds = new Set(displayGroups.map(g => g.id))
    return overviewTopics.filter(o => {
      const gids = o.topic.instances.map(i => i.groupId)
      if (onlyOldMi && !isOldMustaqil(o.topic.trainingType)) return false
      if (academicYear && !gids.some(g => yearGroupIds.has(g))) return false
      if (groupIds.length && !gids.some(g => groupIds.includes(g))) return false
      if (subjectName && o.subjectName !== subjectName) return false
      return true
    })
  }, [overviewTopics, academicYear, displayGroups, groupIds, subjectName, onlyOldMi])
  const [overviewSort, setOverviewSort] = useState<OverviewSort>("type")
  const sortedOverview = useMemo(() => sortOverview(filteredOverview, overviewSort), [filteredOverview, overviewSort])
  // Jadvalda bosilgan mavzu — katagi alohida oynada ochiladi
  const [overviewSel, setOverviewSel] = useState<string | null>(null)
  const selectedOverview = filteredOverview.find(o => o.id === overviewSel) ?? null
  useEffect(() => {
    if (!overviewSel) return
    // Esc — oynani yopadi (mavzu nomini tahrirlash maydonidagi Esc faqat tahrirni bekor qiladi)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !(e.target instanceof HTMLInputElement)) setOverviewSel(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [overviewSel])
  // Mavzu ro'yxatdan ochilgan bo'lsa, "orqaga" filtrsiz ro'yxatga qaytaradi
  const [fromOverview, setFromOverview] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  // Jadvaldagi "Fan" ustuni uchun o'qituvchining ismi (o'z mavzulari)
  const { data: meUserRes } = useApi(() => authApi.me(), [])
  const myName = meUserRes?.user?.fullName ?? ""

  async function refetchAll() {
    await Promise.all([refetchTopics(), refetchMine()])
  }

  // "Yaratish" oynasidan yangi mavzu — jadvalda shu qator ochilib turadi
  async function handleTopicCreated(tp: { subjectName: string; trainingType: string; title: string }) {
    setCreateOpen(false)
    await refetchAll()
    if (me) setOverviewSel(`${tp.subjectName}|${me}|${tp.trainingType}|${tp.title.toLowerCase()}`)
  }

  const [addingTopic, setAddingTopic] = useState(false)
  const [newTopicTitle, setNewTopicTitle] = useState("")
  const [newTopicDeadline, setNewTopicDeadline] = useState("")
  const [addTopicLoading, setAddTopicLoading] = useState(false)
  const [editTopicKey, setEditTopicKey] = useState<string | null>(null)
  const [editTopicTitle, setEditTopicTitle] = useState("")
  const [editTopicDeadline, setEditTopicDeadline] = useState("")
  const [editTopicLoading, setEditTopicLoading] = useState(false)
  const [deleteTopicKey, setDeleteTopicKey] = useState<string | null>(null)
  const [deleteTopicLoading, setDeleteTopicLoading] = useState(false)
  const [assigningKey, setAssigningKey] = useState<string | null>(null)
  const [syncingKey, setSyncingKey] = useState<string | null>(null)
  const [mergingKey, setMergingKey] = useState<string | null>(null)
  const [topicOpError, setTopicOpError] = useState<string | null>(null)
  const [topicOpInfo, setTopicOpInfo] = useState<string | null>(null)

  function resetTopicUi() {
    setTopicKey("")
    setAddingTopic(false)
    setEditTopicKey(null)
    setDeleteTopicKey(null)
    setTopicOpError(null)
    setTopicOpInfo(null)
  }

  function scrollToTop() {
    // ref emas, id orqali — render paytida chaqiriladigan katak funksiyalari ref'ga tegmasin
    document.getElementById(PAGE_TOP_ID)?.scrollIntoView({ block: "start" })
  }

  function openTopic(key: string) {
    setEditTopicKey(null)
    setDeleteTopicKey(null)
    setTopicKey(key)
    scrollToTop()
  }

  // Ro'yxatdan ochilganda filtrlar shu mavzuga moslab qo'yiladi (u bor hamma
  // guruhlar, fani, turi) — resurslar paneli odatdagidek ishlaydi. Turi
  // belgilanmagan eski mavzu Ma'ruza filtrida ochiladi (u yerda turga o'tkaziladi).
  function openFromOverview(o: OverviewTopic) {
    const ids = [...new Set([o.topic.base.groupId, ...o.topic.instances.map(i => i.groupId)])]
    setAddingTopic(false)
    setEditTopicKey(null)
    setDeleteTopicKey(null)
    setTopicOpError(null)
    setTopicOpInfo(null)
    setGroupIds(ids)
    setSubjectName(o.subjectName)
    setTrainingType(o.topic.trainingType || TRAINING_TYPE_OPTIONS[0].value)
    setTopicKey(o.topic.base.key)
    setFromOverview(true)
    setOverviewSel(null)
    scrollToTop()
  }

  // Filtrlarni tozalab barcha mavzular ro'yxatiga qaytish (tanlangan mavzu saqlanadi)
  function backToOverview() {
    setGroupIds([])
    setSubjectName("")
    setTrainingType("")
    resetTopicUi()
    setFromOverview(false)
    scrollToTop()
  }

  function cancelAddTopic() {
    setAddingTopic(false)
    setNewTopicTitle("")
    setNewTopicDeadline("")
  }

  // Tanlangan HAMMA guruhda yaratiladi; guruhda shu nomli va turdagi mavzu
  // allaqachon bo'lsa, qayta yaratilmaydi (dublikat bo'lmasin).
  async function handleAddTopic() {
    if (!newTopicTitle.trim() || !groupIds.length || !subjectName || !trainingType) return
    setTopicOpError(null)
    setAddTopicLoading(true)
    try {
      const deadlineIso = newTopicDeadline ? new Date(newTopicDeadline).toISOString() : null
      for (const gid of groupIds) {
        await ensureTopicKeyForGroup(gid, subjectName, newTopicTitle.trim(), deadlineIso, trainingType)
      }
      cancelAddTopic()
      await refetchAll()
    } catch (err) {
      setTopicOpError(err instanceof Error ? err.message : t("mavzularOq.addError"))
    } finally {
      setAddTopicLoading(false)
    }
  }

  function startEditTopic(tp: TopicInfo) {
    setDeleteTopicKey(null)
    setEditTopicKey(tp.key)
    setEditTopicTitle(tp.title)
    setEditTopicDeadline(toLocalInputValue(tp.deadline))
    setTopicOpError(null)
  }

  // Muddat o'tgan bo'lsa ham o'qituvchi o'zi o'zgartira oladi. Nom va muddat
  // mavzuning tanlangan guruhlardagi hamma nusxasiga qo'llanadi.
  async function saveEditTopic(tp: TopicInfo) {
    if (!editTopicTitle.trim()) return
    setEditTopicLoading(true)
    setTopicOpError(null)
    try {
      const body = {
        title: editTopicTitle.trim(),
        deadline: editTopicDeadline ? new Date(editTopicDeadline).toISOString() : null,
      }
      for (const inst of tp.instances) await teachingApi.updateTopic(inst.key, body)
      setEditTopicKey(null)
      await refetchAll()
    } catch (err) {
      setTopicOpError(err instanceof Error ? err.message : t("mavzularOq.editError"))
    } finally {
      setEditTopicLoading(false)
    }
  }

  // Mavzu tanlangan hamma guruhdagi nusxalari bilan (serverda, barcha qismlari
  // bilan) o'chiriladi — aks holda o'sha guruh talabalarida qolib ketardi.
  async function handleDeleteTopic(tp: TopicInfo) {
    setDeleteTopicLoading(true)
    setTopicOpError(null)
    setTopicOpInfo(null)
    try {
      if (tp.ownerId !== me) {
        // Boshqa o'qituvchining mavzusi — backend faqat o'z guruhingizda ruxsat beradi
        for (const inst of tp.instances) await teachingApi.deleteTopic(inst.key, { othersInMyGroup: true })
      } else {
        // O'z mavzusi — barcha guruhlaridan (tanlanmaganlaridan va takrorlari
        // bilan ham): "o'chirdim" = talabada, adminda, o'zida hech qayerda yo'q
        const res = await teachingApi.deleteTopic(tp.key, { everywhere: true })
        setTopicOpInfo(t("fanResurslariOq.deletedResult", { n: res.data?.groups ?? tp.instances.length }))
      }
      setDeleteTopicKey(null)
      if (tp.instances.some(i => i.key === topicKey)) setTopicKey("")
      await refetchAll()
    } catch (err) {
      setTopicOpError(err instanceof Error ? err.message : t("mavzularOq.deleteError"))
    } finally {
      setDeleteTopicLoading(false)
    }
  }

  async function assignLegacyTopic(tp: TopicInfo) {
    if (!trainingType) return
    setAssigningKey(tp.key)
    setTopicOpError(null)
    try {
      for (const inst of tp.instances) await teachingApi.updateTopic(inst.key, { trainingType })
      await refetchAll()
    } catch (err) {
      setTopicOpError(err instanceof Error ? err.message : t("mavzularOq.editError"))
    } finally {
      setAssigningKey(null)
    }
  }

  // Bir guruhda takrorlangan shu mavzularni bittaga birlashtiradi (backend:
  // eng to'liq mavzu qoladi, qolganlaridagi yetishmayotgan qismlar ko'chadi).
  async function mergeDuplicates(tp: TopicInfo) {
    setMergingKey(tp.key)
    setTopicOpError(null)
    setTopicOpInfo(null)
    try {
      const res = await teachingApi.mergeDuplicateTopics(tp.key)
      setTopicOpInfo(t("fanResurslariOq.dup.result", { topics: res.data.removedTopics, moved: res.data.movedItems }))
      await refetchAll()
    } catch (err) {
      setTopicOpError(err instanceof Error ? err.message : t("fanResurslariOq.errors.saveError"))
    } finally {
      setMergingKey(null)
    }
  }

  // Yetishmayotgan guruhlarga mavzu va resurslarni (fayllari, test savollari
  // bilan) serverda nusxalaydi. Eng to'liq nusxadan boshlab har bir nusxa
  // qolganlarga moslanadi — qaysi guruhda nima bo'lsa, hammasiga tarqaladi.
  async function syncTopicToGroups(tp: TopicInfo, scope: number[] = groupIds) {
    setSyncingKey(tp.key)
    setTopicOpError(null)
    setTopicOpInfo(null)
    try {
      let topicsCreated = 0
      let itemsCopied = 0
      const sources = [...tp.instances].sort((a, b) => b.items.length - a.items.length)
      for (const source of sources) {
        const res = await teachingApi.syncTopic(source.key, scope.filter(g => g !== source.groupId))
        topicsCreated += res.data.topicsCreated
        itemsCopied += res.data.itemsCopied
      }
      setTopicOpInfo(t("fanResurslariOq.grid.syncResult", { topics: topicsCreated, items: itemsCopied }))
      await refetchAll()
    } catch (err) {
      setTopicOpError(err instanceof Error ? err.message : t("fanResurslariOq.errors.saveError"))
    } finally {
      setSyncingKey(null)
    }
  }

  const selectedTopic = ownTopics.find(tp => tp.instances.some(i => i.key === topicKey))
  const selectedInstance = selectedTopic?.instances.find(i => i.key === topicKey)
  const trainingTypeOption = TRAINING_TYPE_OPTIONS.find(o => o.value === trainingType)
  const trainingTypeLabel = trainingTypeOption ? t(trainingTypeOption.labelKey) : trainingType

  function handleYearChange(val: string) {
    setAcademicYear(val)
    setGroupIds([])
    setSubjectName("")
    setTrainingType("")
    resetTopicUi()
    setFromOverview(false)
  }

  // Faqat "asosiy" guruh (birinchisi) o'zgarganda fan/mavzu/turni tozalaymiz
  // — qo'shimcha guruh qo'shish/olib tashlash tanlangan fan/mavzuni
  // buzmasligi kerak.
  function handleGroupIdsChange(ids: number[]) {
    const newPrimary = ids[0] ?? null
    if (newPrimary !== activeGroupId) {
      setSubjectName("")
      setTrainingType("")
      resetTopicUi()
    }
    setGroupIds(ids)
    setFromOverview(false)
  }

  function handleSubjectChange(val: string) {
    setSubjectName(val)
    setTrainingType("")
    resetTopicUi()
    setFromOverview(false)
  }

  function handleTrainingTypeChange(val: string) {
    setTrainingType(val)
    resetTopicUi()
    setFromOverview(false)
  }

  if (lGroups) return <Loading />
  if (eGroups) return <div className="p-[30px]"><ApiError message={eGroups} onRetry={() => {}} /></div>

  // Ochilgan mavzu qaysi guruhdagi nusxa bo'lsa, panel o'sha guruhda ishlaydi;
  // qolgan tanlangan guruhlar — "parallel" (o'zgarishlar ularga ham tarqaladi).
  const selection: Selection | null = selectedInstance && subjectName && trainingType
    ? { groupId: selectedInstance.groupId, groupName: groupNameOf(selectedInstance.groupId), subjectName, topicKey, topicTitle: selectedInstance.title }
    : null
  const panelExtraGroupIds = selection ? groupIds.filter(g => g !== selection.groupId) : []

  // opts — barcha mavzular ro'yxatidagi katta katak uchun: guruhlar doirasi
  // (filtrdagi emas, mavzu bor guruhlar), ochish amali va qo'shimcha belgilar.
  function renderTopicCell(tp: TopicInfo, index: number, footer?: React.ReactNode,
    opts?: { scope?: number[]; large?: boolean; onOpen?: () => void; meta?: React.ReactNode }) {
    const scope = opts?.scope ?? groupIds
    if (editTopicKey === tp.key) {
      return (
        <CardShell key={tp.key}>
          <TopicForm
            title={editTopicTitle} deadline={editTopicDeadline}
            onTitle={setEditTopicTitle} onDeadline={setEditTopicDeadline}
            onSubmit={() => saveEditTopic(tp)} onCancel={() => setEditTopicKey(null)}
            loading={editTopicLoading} submitLabel={t("fanResurslariOq.form.saveMeta")}
          />
        </CardShell>
      )
    }
    if (deleteTopicKey === tp.key) {
      return (
        <CardShell key={tp.key} variant="danger">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: "#fef2f2" }}>
            <Trash2 className="w-4 h-4" style={{ color: "#dc2626" }} />
          </div>
          <p className="flex-1 text-sm font-medium break-words" style={titleStyle}>
            {t("mavzularOq.deleteConfirm", { title: tp.title })}
          </p>
          {tp.ownerId !== me ? (
            <p className="text-xs" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
              {t("fanResurslariOq.others.deleteConfirm", {
                author: owners[tp.ownerId] ?? t("fanResurslariOq.others.unknown"),
                groups: tp.instances.map(i => groupNameOf(i.groupId)).join(", "),
              })}
            </p>
          ) : (
            <p className="text-xs" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
              {t("fanResurslariOq.deleteEverywhere")}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => handleDeleteTopic(tp)} disabled={deleteTopicLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] text-xs font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "#dc2626", fontFamily: "var(--font-poppins)" }}>
              {deleteTopicLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t("mavzularOq.yesDelete")}
            </button>
            <button onClick={() => setDeleteTopicKey(null)} disabled={deleteTopicLoading}
              className="px-3 py-2 rounded-[6px] text-xs font-medium"
              style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {t("mavzularOq.cancel")}
            </button>
          </div>
        </CardShell>
      )
    }
    const groups = topicGroupStates(tp, scope).map(g => ({ name: groupNameOf(g.groupId), state: g.state }))
    const onDelete = () => { setEditTopicKey(null); setDeleteTopicKey(tp.key); setTopicOpError(null) }
    // Boshqa o'qituvchining mavzusi — ochish/tahrirlash/moslash yo'q, faqat o'chirish
    if (tp.ownerId !== me) {
      return (
        <TopicCard key={tp.key} index={index} topic={tp} items={tp.base.items} groups={groups}
          ownerName={owners[tp.ownerId] ?? t("fanResurslariOq.others.unknown")} onDelete={onDelete} />
      )
    }
    const duplicateGroups = scope
      .filter(gid => tp.instances.filter(i => i.groupId === gid).length > 1)
      .map(groupNameOf)
    return (
      <TopicCard key={tp.key} index={index} topic={tp} items={tp.base.items}
        onOpen={opts?.onOpen ?? (() => openTopic(tp.key))}
        onEdit={() => startEditTopic(tp)}
        onDelete={onDelete}
        groups={groups}
        duplicateGroups={duplicateGroups}
        onMergeDuplicates={() => mergeDuplicates(tp)} merging={mergingKey === tp.key}
        // Takror bo'lsa avval birlashtirish kerak — keyin moslash
        onSync={duplicateGroups.length ? undefined : () => syncTopicToGroups(tp, scope)} syncing={syncingKey === tp.key}
        large={opts?.large} meta={opts?.meta}
        footer={footer} />
    )
  }

  const addCell = addingTopic ? (
    <CardShell key="__add" variant="add">
      <TopicForm
        title={newTopicTitle} deadline={newTopicDeadline}
        onTitle={setNewTopicTitle} onDeadline={setNewTopicDeadline}
        onSubmit={handleAddTopic} onCancel={cancelAddTopic}
        loading={addTopicLoading} submitLabel={t("mavzularOq.add")}
      />
    </CardShell>
  ) : (
    <button key="__add" onClick={() => { setAddingTopic(true); setTopicOpError(null) }}
      className="flex flex-col items-center justify-center gap-2 rounded-[12px] transition-colors hover:bg-white"
      style={{ border: "2px dashed rgba(14,88,168,0.3)", minHeight: CARD_MIN_HEIGHT, color: "#0e58a8", backgroundColor: "rgba(255,255,255,0.55)", fontFamily: "var(--font-poppins)" }}>
      <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#eef4ff" }}>
        <Plus className="w-5 h-5" />
      </span>
      <span className="text-sm font-semibold">{t("mavzularOq.addTopic")}</span>
    </button>
  )

  const gridStyle = { gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" } as const
  const chipStyle = { backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" } as const

  const typeLabelOf = (type: string | null) => {
    const option = TRAINING_TYPE_OPTIONS.find(o => o.value === type)
    return option ? t(option.labelKey) : type || t("fanResurslariOq.legacy.title")
  }

  function groupsLabelOf(o: OverviewTopic) {
    const names = [...new Set(o.topic.instances.map(i => i.groupId))].map(groupNameOf)
    return names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2}`
  }

  // Ro'yxatda tanlangan mavzu — kattaroq katak: tahrirlash, o'chirish, guruhlarga
  // moslash shu yerda; bosilsa resurslari ochiladi.
  function renderOverviewCard(o: OverviewTopic) {
    const scope = [...new Set(o.topic.instances.map(i => i.groupId))]
    return renderTopicCell(o.topic, o.index, (
      <button onClick={e => { e.stopPropagation(); openFromOverview(o) }}
        className="flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rounded-[8px] text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
        <FolderOpen className="w-4 h-4" /> {t("fanResurslariOq.overview.open")}
      </button>
    ), {
      scope,
      large: true,
      onOpen: () => openFromOverview(o),
      meta: (
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={chipStyle}>{o.subjectName}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={chipStyle}>{typeLabelOf(o.topic.trainingType)}</span>
        </div>
      ),
    })
  }

  const opBanners = (
    <>
      {topicOpError && (
        <div className="px-4 py-2.5 rounded-[8px] text-sm" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
          {topicOpError}
        </div>
      )}
      {topicOpInfo && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm" style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {topicOpInfo}
        </div>
      )}
    </>
  )

  return (
    <div id={PAGE_TOP_ID} className="flex flex-col" style={{ minHeight: "100vh", backgroundColor: "#f0f4fa" }}>

      {/* ── Top header bar ── */}
      <div className="px-4 sm:px-8 py-5 bg-white shrink-0"
        style={{ borderBottom: "1px solid rgba(1,41,112,0.08)", boxShadow: "0 1px 4px rgba(1,41,112,0.06)" }}>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-[22px] font-semibold" style={titleStyle}>{t("fanResurslariOq.pageTitle")}</h1>
            <p className="text-xs mt-0.5" style={labelStyle}>{t("fanResurslariOq.pageSubtitle")}</p>
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.academicYear")}</label>
              <select value={academicYear} onChange={e => handleYearChange(e.target.value)}
                className="px-3 py-2 rounded-[6px] text-sm outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", minWidth: 140, backgroundColor: "white" }}>
                <option value="">{t("fanResurslariOq.allYears")}</option>
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}-{y + 1}</option>)}
              </select>
              {lYearGroups && (
                <Loader2 className="w-3.5 h-3.5 animate-spin mt-1" style={{ color: "#7293b9" }} />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.group")}</label>
              <GroupMultiSelect groups={displayGroups} selectedIds={groupIds} onChange={handleGroupIdsChange}
                placeholder={t("fanResurslariOq.selectPlaceholder")} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.subjectName")}</label>
              <select value={subjectName} onChange={e => handleSubjectChange(e.target.value)}
                disabled={!activeGroupId || subjects.length === 0}
                className="px-3 py-2 rounded-[6px] text-sm outline-none disabled:opacity-50"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", minWidth: 200, backgroundColor: "white" }}>
                <option value="">{t("fanResurslariOq.selectPlaceholder")}</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={labelStyle}>{t("fanResurslariOq.form.trainingTypeLabel")}</label>
              <select value={trainingType} onChange={e => handleTrainingTypeChange(e.target.value)}
                disabled={!subjectName}
                className="px-3 py-2 rounded-[6px] text-sm outline-none disabled:opacity-50"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)", minWidth: 160, backgroundColor: "white" }}>
                <option value="">{t("fanResurslariOq.form.trainingTypeUnset")}</option>
                {TRAINING_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                ))}
                {/* Ro'yxatdan ochilgan eski "Mustaqil ish" mavzusi — tanlovda ham ko'rinsin */}
                {trainingType && !TRAINING_TYPE_OPTIONS.some(o => o.value === trainingType) && (
                  <option value={trainingType}>{trainingTypeLabel}</option>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {!activeGroupId || !subjectName || !trainingType ? (
        /* ── Filtrlar to'liq tanlanmagan — barcha mavzular jadvali (HEMIS
           "Resurslar" sahifasi ko'rinishida). Qator bosilsa — shu mavzu katagi
           ostida ochiladi, undan resurslarga o'tiladi. ── */
        <div className="flex-1 px-4 sm:px-8 py-5 sm:py-6">
          <div className="w-full flex flex-col gap-5">
            <TeacherCertificateCard refreshKey={mineRes} />

            {opBanners}

            {oldMiCount > 0 && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-[10px] text-xs flex-wrap"
                style={{ backgroundColor: "#fff7ed", border: "1px solid rgba(146,64,14,0.2)", color: "#92400e", fontFamily: "var(--font-poppins)" }}>
                <span className="flex-1 min-w-[260px]">{t("fanResurslariOq.oldMi.notice", { n: oldMiCount })}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setOnlyOldMi(v => !v)}
                    className="px-3 py-1.5 rounded-[6px] font-semibold transition-colors"
                    style={onlyOldMi
                      ? { backgroundColor: "#c2410c", color: "#fff" }
                      : { backgroundColor: "#fff", color: "#c2410c", border: "1px solid rgba(194,65,12,0.35)" }}>
                    {onlyOldMi ? t("fanResurslariOq.oldMi.showAll") : t("fanResurslariOq.oldMi.showOnly", { n: oldMiCount })}
                  </button>
                  <Link href="/oqituvchi-kabineti/oraliq-nazorat"
                    className="px-3 py-1.5 rounded-[6px] font-semibold text-white" style={{ backgroundColor: "#7c3aed" }}>
                    {t("fanResurslariOq.oldMi.goControls")}
                  </Link>
                </div>
              </div>
            )}

            <div className="rounded-[12px] bg-white overflow-hidden"
              style={{ border: "1px solid rgba(1,41,112,0.08)", boxShadow: "0 1px 4px rgba(1,41,112,0.06)" }}>
              <div className="flex items-center gap-2 px-4 sm:px-5 py-4 flex-wrap">
                <button onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] text-sm font-semibold text-white transition-colors hover:bg-[#15803d]"
                  style={{ backgroundColor: "#16a34a", fontFamily: "var(--font-poppins)" }}>
                  <CirclePlus className="w-4 h-4" /> {t("fanResurslariOq.table.create")}
                </button>
                <span className="ml-auto flex items-center gap-2 text-xs" style={labelStyle}>
                  {lMine && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {mineRes && t("fanResurslariOq.grid.count", { n: filteredOverview.length })}
                </span>
              </div>

              {eMine ? (
                <div className="px-5 pb-5"><ApiError message={eMine} onRetry={refetchMine} /></div>
              ) : !mineRes ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#7293b9" }} />
                </div>
              ) : filteredOverview.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#eef4ff" }}>
                    <BookOpen className="w-7 h-7" style={{ color: "#0e58a8" }} />
                  </div>
                  <p className="text-base font-semibold" style={titleStyle}>
                    {overviewTopics.length ? t("fanResurslariOq.overview.emptyFiltered") : t("fanResurslariOq.overview.empty")}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse" style={{ fontFamily: "var(--font-poppins)" }}>
                    <thead>
                      <tr className="text-left" style={{ color: "#1e293b", borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                        <th className="font-semibold px-4 py-2.5 w-12">#</th>
                        <th className="font-semibold px-4 py-2.5">{t("fanResurslariOq.table.title")}</th>
                        <th className="font-semibold px-4 py-2.5 hidden md:table-cell">{t("fanResurslariOq.table.subject")}</th>
                        <th className="font-semibold px-4 py-2.5 text-center w-24">{t("fanResurslariOq.table.resources")}</th>
                        <th className="font-semibold px-4 py-2.5 hidden md:table-cell whitespace-nowrap">
                          <button onClick={() => setOverviewSort(cur => cur === "type" ? "createdDesc" : cur === "createdDesc" ? "createdAsc" : "type")}
                            className="inline-flex items-center gap-1 font-semibold" title={t("fanResurslariOq.table.sortHint")}>
                            {t("fanResurslariOq.table.created")}
                            {overviewSort === "createdAsc"
                              ? <ChevronUp className="w-3.5 h-3.5" />
                              : <ChevronDown className="w-3.5 h-3.5" style={{ opacity: overviewSort === "createdDesc" ? 1 : 0.35 }} />}
                          </button>
                        </th>
                        <th className="font-semibold px-4 py-2.5 hidden lg:table-cell">{t("fanResurslariOq.table.deadline")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedOverview.map((o, i) => {
                        const open = o.id === overviewSel
                        const items = o.topic.base.items
                        const emptyTest = items.some(it => it.type === "exam" && it.questionCount === 0)
                        const passed = isPast(o.topic.deadline)
                        return (
                          <Fragment key={o.id}>
                            <tr onClick={() => setOverviewSel(o.id)}
                              className="cursor-pointer transition-colors hover:bg-[#eef4ff]"
                              style={{
                                backgroundColor: open ? "#eef4ff" : i % 2 === 0 ? "#f8fafc" : undefined,
                                borderBottom: "1px solid rgba(1,41,112,0.06)",
                              }}>
                              <td className="px-4 py-2 align-top" style={{ color: "#334e68" }}>{i + 1}</td>
                              <td className="px-4 py-2 align-top">
                                <button className="text-left font-medium leading-snug hover:underline" style={{ color: "#1d6fd8" }}
                                  aria-haspopup="dialog">
                                  {o.topic.title}
                                </button>
                                <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                                  <span className="md:hidden">{o.subjectName} · </span>{groupsLabelOf(o)}
                                </div>
                              </td>
                              <td className="px-4 py-2 align-top hidden md:table-cell">
                                <div style={{ color: "#334e68" }}>{o.subjectName}</div>
                                <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                                  {typeLabelOf(o.topic.trainingType)}{myName ? ` / ${myName}` : ""}
                                </div>
                              </td>
                              <td className="px-4 py-2 align-top text-center">
                                <span className="inline-flex items-center justify-center min-w-[26px] px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                                  style={{ backgroundColor: items.length ? "#64748b" : "#cbd5e1" }}>
                                  {items.length}
                                </span>
                                {emptyTest && (
                                  <span className="inline-block w-2 h-2 rounded-full ml-1.5 align-middle" style={{ backgroundColor: "#dc2626" }}
                                    title={t("fanResurslariOq.grid.emptyTest")} />
                                )}
                              </td>
                              <td className="px-4 py-2 align-top hidden md:table-cell whitespace-nowrap" style={{ color: "#334e68" }}>
                                {formatDateTime(topicCreatedAt(o))}
                              </td>
                              <td className="px-4 py-2 align-top hidden lg:table-cell text-xs whitespace-nowrap"
                                style={{ color: o.topic.isReopened ? "#15803d" : passed ? "#c2410c" : "#64748b" }}>
                                {!o.topic.deadline
                                  ? t("fanResurslariOq.deadline.none")
                                  : passed
                                    ? `${t("fanResurslariOq.deadline.passed")} · ${formatDeadline(o.topic.deadline)}`
                                    : t("fanResurslariOq.deadline.until", { date: formatDeadline(o.topic.deadline) })}
                              </td>
                            </tr>
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Bosilgan mavzu katagi — jadvaldan alohida oynada */}
          {selectedOverview && (
            <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-6"
              style={{ backgroundColor: "rgba(1,41,112,0.35)" }} onClick={() => setOverviewSel(null)}>
              <div role="dialog" aria-modal="true" className="w-full max-w-[560px] my-auto flex flex-col gap-2"
                onClick={e => e.stopPropagation()}>
                <div className="flex justify-end">
                  <button onClick={() => setOverviewSel(null)} aria-label={t("mavzularOq.cancel")}
                    className="w-9 h-9 rounded-full bg-white flex items-center justify-center transition-colors hover:bg-[#f0f5ff]"
                    style={{ boxShadow: "0 2px 8px rgba(1,41,112,0.15)" }}>
                    <X className="w-4 h-4" style={{ color: "#445b7a" }} />
                  </button>
                </div>
                {renderOverviewCard(selectedOverview)}
              </div>
            </div>
          )}

          {createOpen && (
            <CreateTopicDialog groups={displayGroups}
              hemisSubjectsOf={gid => academicYear ? (yearGroups.find(g => g.id === gid)?.subjects ?? []) : []}
              onClose={() => setCreateOpen(false)} onCreated={handleTopicCreated} />
          )}
        </div>
      ) : selection && selectedTopic && selectedInstance ? (
        /* ── Tanlangan mavzu resurslari ── */
        <div className="flex-1 px-4 sm:px-8 py-5 sm:py-6">
          <div className="max-w-[1100px] mx-auto flex flex-col gap-4">
            <button onClick={() => { if (fromOverview) backToOverview(); else { setTopicKey(""); scrollToTop() } }}
              className="flex items-center gap-1.5 text-sm font-medium w-fit px-3 py-2 rounded-[8px] bg-white transition-colors hover:bg-[#f6f9ff]"
              style={{ border: "1px solid rgba(1,41,112,0.12)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              <ChevronLeft className="w-4 h-4" /> {t("fanResurslariOq.grid.back")}
            </button>

            {/* Topic header */}
            <div className="rounded-[12px] bg-white px-5 py-4 flex items-center gap-3 flex-wrap"
              style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 1px 4px rgba(1,41,112,0.06)" }}>
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#0e58a8" }}>
                <BookMarked className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold break-words" style={titleStyle}>{selection.topicTitle}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={chipStyle}>
                    {selection.subjectName}
                  </span>
                  {selectedTopic.trainingType && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={chipStyle}>{trainingTypeLabel}</span>
                  )}
                  <span className="text-xs" style={labelStyle}>{selection.groupName}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {MATERIAL_ICONS.map(({ match, icon: Icon }, i) => {
                  const has = selectedInstance.items.some(match)
                  return (
                    <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: has ? "rgba(34,197,94,0.12)" : "rgba(1,41,112,0.06)", color: has ? "#15803d" : "#b0c2d8" }}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  )
                })}
              </div>
            </div>

            <ResourcesPanel key={selection.topicKey} sel={selection} extraGroupIds={panelExtraGroupIds}
              trainingType={selectedTopic.trainingType ?? ""} onChanged={refetchAll} />
          </div>
        </div>
      ) : (
        /* ── Mavzular gridi ── */
        <div className="flex-1 px-4 sm:px-8 py-5 sm:py-6">
          <div className="max-w-[1200px] mx-auto flex flex-col gap-5">
            <TeacherCertificateCard refreshKey={allItems} />

            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold" style={titleStyle}>{t("mavzularOq.topics")}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={chipStyle}>{subjectName}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={chipStyle}>{trainingTypeLabel}</span>
                  <span className="text-xs" style={labelStyle}>
                    {groupIds.map(groupNameOf).join(", ")} · {t("fanResurslariOq.grid.count", { n: typedTopics.length })}
                  </span>
                  {lTopics && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#7293b9" }} />}
                </div>
              </div>
              <button onClick={backToOverview}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-[8px] bg-white transition-colors hover:bg-[#f6f9ff]"
                style={{ border: "1px solid rgba(1,41,112,0.12)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <ChevronLeft className="w-3.5 h-3.5" /> {t("fanResurslariOq.overview.showAll")}
              </button>
            </div>

            {topicOpError && (
              <div className="px-4 py-2.5 rounded-[8px] text-sm" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                {topicOpError}
              </div>
            )}
            {topicOpInfo && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm" style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {topicOpInfo}
              </div>
            )}

            {typedTopics.length === 0 && !lTopics && !addingTopic && (
              <p className="text-sm" style={labelStyle}>
                {t("fanResurslariOq.sidebar.noTopicsYet")} — {t("fanResurslariOq.grid.emptyHint")}
              </p>
            )}

            <div className="grid gap-4" style={gridStyle}>
              {typedTopics.map((tp, idx) => renderTopicCell(tp, idx + 1))}
              {addCell}
            </div>

            {legacyTopics.length > 0 && (
              <section className="flex flex-col gap-3 pt-2">
                <div className="flex items-start gap-3 px-4 py-3 rounded-[10px]"
                  style={{ backgroundColor: "#f8fafc", border: "1px dashed rgba(1,41,112,0.2)" }}>
                  <FolderOpen className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#64748b" }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={titleStyle}>
                      {t("fanResurslariOq.legacy.title")} ({legacyTopics.length})
                    </p>
                    <p className="text-xs mt-0.5" style={labelStyle}>
                      {t("fanResurslariOq.legacy.hint", { type: trainingTypeLabel })}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4" style={gridStyle}>
                  {legacyTopics.map((tp, idx) => renderTopicCell(tp, idx + 1, (
                    <button onClick={e => { e.stopPropagation(); assignLegacyTopic(tp) }} disabled={assigningKey === tp.key}
                      className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-[8px] text-xs font-semibold text-white transition-opacity disabled:opacity-60"
                      style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                      {assigningKey === tp.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                      {t("fanResurslariOq.legacy.assign", { type: trainingTypeLabel })}
                    </button>
                  )))}
                </div>
              </section>
            )}

            {otherTopics.length > 0 && (
              <section className="flex flex-col gap-3 pt-2">
                <div className="flex items-start gap-3 px-4 py-3 rounded-[10px]"
                  style={{ backgroundColor: "#f8fafc", border: "1px dashed rgba(1,41,112,0.2)" }}>
                  <Users className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#64748b" }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={titleStyle}>
                      {t("fanResurslariOq.others.title")} ({otherTopics.length})
                    </p>
                    <p className="text-xs mt-0.5" style={labelStyle}>{t("fanResurslariOq.others.hint")}</p>
                  </div>
                </div>
                <div className="grid gap-4" style={gridStyle}>
                  {otherTopics.map((tp, idx) => renderTopicCell(tp, idx + 1))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
