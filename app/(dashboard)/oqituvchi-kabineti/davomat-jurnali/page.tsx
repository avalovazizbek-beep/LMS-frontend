"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronDown, ChevronRight, Save, History, Users, RefreshCw, Info, Lock, Unlock, Clock, Send, CheckCheck } from "lucide-react"
import {
  teachingApi,
  attendanceApi,
  type AttendanceStatus,
  type AttendanceRosterItem,
  type AttendanceEditRequest,
} from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { sortByName } from "@/lib/utils"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const inputCls =
  "w-full px-3 py-2.5 rounded-[8px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none transition-colors"
const labelCls = "text-xs font-medium mb-1.5 block"

function todayStr() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fmtDate(value: string) {
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/** Saqlangan kun qulflanadi; o'zgartirish faqat admin tasdiqlagan so'rov bilan */
interface SheetState {
  saved: boolean
  locked: boolean
  editRequest: AttendanceEditRequest | null
}
const EMPTY_SHEET: SheetState = { saved: false, locked: false, editRequest: null }

const TRAINING_TYPE_OPTIONS = [
  { value: "Ma'ruza", labelKey: "xodimFanResurslariYaratish.trainingType.lecture" },
  { value: "Amaliy", labelKey: "xodimFanResurslariYaratish.trainingType.practice" },
  { value: "Laboratoriya", labelKey: "xodimFanResurslariYaratish.trainingType.laboratory" },
  { value: "Seminar", labelKey: "xodimFanResurslariYaratish.trainingType.seminar" },
  { value: "Mustaqil ta'lim", labelKey: "xodimFanResurslariYaratish.trainingType.independentStudy" },
] as const

export default function DavomatJurnaliPage() {
  const { t } = useLanguage()
  const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string; bg: string }[] = [
    { value: "present", label: t("oqDavomat.status.present"), color: "#15803d", bg: "#f0fdf4" },
    { value: "absent",  label: t("oqDavomat.status.absent"),  color: "#b91c1c", bg: "#fef2f2" },
    { value: "excused", label: t("oqDavomat.status.excused"), color: "#92400e", bg: "#fffbeb" },
    { value: "late",    label: t("oqDavomat.status.late"),    color: "#0e58a8", bg: "#eef4ff" },
  ]
  const STATUS_MAP = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s])) as Record<AttendanceStatus, typeof STATUS_OPTIONS[number]>

  const searchParams = useSearchParams()
  const today = todayStr()
  const initialGroup = searchParams.get("group")
  const initialSubject = searchParams.get("subject") ?? ""
  const initialTraining = searchParams.get("training") ?? ""
  const initialDate = (() => {
    const d = searchParams.get("date")
    return d && d <= today ? d : today
  })()

  const { data: groupsRes, loading: lGroups, error: eGroups, refetch: rGroups } = useApi(() => teachingApi.groups(), [])
  const groups = groupsRes?.data ?? []

  const [groupId, setGroupId] = useState<number | "">(initialGroup ? Number(initialGroup) : "")
  const [subjectName, setSubjectName] = useState(initialSubject)
  const [trainingType, setTrainingType] = useState(initialTraining)
  const [date, setDate] = useState(initialDate)
  const isToday = date === today
  const isFuture = date > today

  const { data: subjectsRes } = useApi(
    () => groupId !== "" ? teachingApi.mySubjects(groupId as number) : Promise.resolve(null),
    [groupId]
  )
  const subjects = useMemo(() => {
    const list = subjectsRes?.data?.map(s => s.subjectName) ?? []
    return [...new Set(list)].sort()
  }, [subjectsRes])

  const [roster, setRoster] = useState<AttendanceRosterItem[]>([])
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [rosterError, setRosterError] = useState<string | null>(null)
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)
  const [confirmingSave, setConfirmingSave] = useState(false)
  const [sheet, setSheet] = useState<SheetState>(EMPTY_SHEET)
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestReason, setRequestReason] = useState("")
  const [requestSending, setRequestSending] = useState(false)
  const [requestMsg, setRequestMsg] = useState<string | null>(null)
  const [requestOk, setRequestOk] = useState(false)
  // Bugun yoki istalgan o'tgan kun belgilanadi; saqlangan kun — faqat admin
  // ruxsati (tasdiqlangan so'rov) bilan bir marta o'zgartiriladi
  const editable = loadedOnce && !sheet.locked && !isFuture

  const { data: historyRes, loading: lHistory, refetch: refetchHistory } = useApi(
    () =>
      groupId !== "" && subjectName
        ? attendanceApi.history({ groupId, subject: subjectName })
        : Promise.resolve({ success: true, data: [] }),
    [groupId, subjectName]
  )
  const history = historyRes?.data ?? []

  // Sana/guruh/fan o'zgarganda — oldingi kunning ro'yxati va holati tozalanadi
  function resetSheet() {
    setRoster([])
    setLoadedOnce(false)
    setSheet(EMPTY_SHEET)
    setConfirmingSave(false)
    setRequestOpen(false)
    setRequestReason("")
    setRequestMsg(null)
    setSaveMsg(null)
  }

  async function loadRoster(forDate: string = date, keepMsg = false) {
    if (groupId === "" || !subjectName || !forDate || forDate > today) return
    setLoadingRoster(true)
    setRosterError(null)
    if (!keepMsg) setSaveMsg(null)
    setConfirmingSave(false)
    try {
      const res = await attendanceApi.roster(groupId, subjectName, forDate)
      setRoster(sortByName(res.data, (s) => s.fullName))
      // Saqlangan kunda — o'sha kunning mashg'ulot turi ko'rsatiladi
      if (res.saved || !trainingType) setTrainingType(res.trainingType || (res.saved ? "" : trainingType))
      setSheet({ saved: !!res.saved, locked: !!res.locked, editRequest: res.editRequest ?? null })
      setLoadedOnce(true)
    } catch (e) {
      setRosterError(e instanceof Error ? e.message : t("oqBaholash.error"))
    } finally {
      setLoadingRoster(false)
    }
  }

  // Guruh/fan/sana tayyor holda (masalan meeting kartasidan, jurnal
  // ro'yxatidan yoki admin javobi haqidagi xabardan) kelganda ro'yxatni
  // darhol ochib beradi.
  useEffect(() => {
    if (initialGroup && initialSubject) loadRoster()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setStatus(studentUserId: number, status: AttendanceStatus) {
    if (!editable) return
    setRoster((prev) => prev.map((r) => (r.studentUserId === studentUserId ? { ...r, status } : r)))
  }

  function markAllPresent() {
    if (!editable) return
    setRoster((prev) => prev.map((r) => ({ ...r, status: "present" })))
  }

  function setComment(studentUserId: number, comment: string) {
    if (!editable) return
    setRoster((prev) => prev.map((r) => (r.studentUserId === studentUserId ? { ...r, comment } : r)))
  }

  async function sendEditRequest() {
    if (groupId === "" || !subjectName || !requestReason.trim()) return
    setRequestSending(true)
    setRequestMsg(null)
    try {
      const res = await attendanceApi.requestEdit({ groupId, subjectName, date, reason: requestReason.trim() })
      setSheet((prev) => ({ ...prev, editRequest: res.data }))
      setRequestOpen(false)
      setRequestReason("")
      setRequestOk(true)
      setRequestMsg(t("davomatJurnaliOq.requestSent"))
    } catch (e) {
      setRequestOk(false)
      setRequestMsg(e instanceof Error ? e.message : t("oqBaholash.error"))
    } finally {
      setRequestSending(false)
    }
  }

  async function handleSave() {
    if (groupId === "" || !subjectName || !date || !editable) return
    setConfirmingSave(false)
    setSaving(true)
    setSaveMsg(null)
    try {
      await attendanceApi.save({
        groupId,
        subjectName,
        date,
        trainingType: trainingType || undefined,
        records: roster.map((r) => ({
          studentUserId: r.studentUserId,
          fullName: r.fullName,
          status: r.status ?? "absent",
          comment: r.comment ?? undefined,
        })),
      })
      setSaveOk(true)
      setSaveMsg(t("oqDavomat.attendanceSaved"))
      refetchHistory()
      // Saqlangach kun qulflanadi — holatni serverdan qayta o'qiymiz
      await loadRoster(date, true)
    } catch (e) {
      setSaveOk(false)
      setSaveMsg(e instanceof Error ? e.message : t("oqBaholash.error"))
      // 409 — kun allaqachon qulflangan (masalan boshqa oynada saqlangan)
      if ((e as { status?: number }).status === 409) await loadRoster(date, true)
    } finally {
      setSaving(false)
    }
  }

  if (lGroups) return <Loading />
  if (eGroups) return <ApiError message={eGroups} onRetry={rGroups} />

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div className="flex items-center gap-2 text-sm flex-wrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
        <Link href="/xodim/davomat-jurnali" className="flex items-center gap-1 hover:underline">
          <ChevronLeft className="w-4 h-4" />
          {t("davomatJurnaliOq.breadcrumb")}
        </Link>
      </div>

      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {t("davomatJurnaliOq.title")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("oqDavomat.subtitle")}
        </p>
      </div>

      {/* Filtrlar */}
      <div className="bg-white rounded-[10px] p-4 flex flex-col gap-4"
        style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t("oqBaholash.group")}</label>
            <div className="relative">
              <select
                value={groupId}
                onChange={(e) => { setGroupId(e.target.value ? Number(e.target.value) : ""); setSubjectName(""); resetSheet() }}
                className={`${inputCls} appearance-none pr-8`}
                style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                <option value="">{t("oqBaholash.selectGroup")}</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#7293b9" }} />
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t("oqBaholash.subject")}</label>
            {subjects.length > 0 ? (
              <div className="relative">
                <select
                  value={subjectName}
                  onChange={(e) => { setSubjectName(e.target.value); resetSheet() }}
                  className={`${inputCls} appearance-none pr-8`}
                  style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  <option value="">{t("oqBaholash.selectSubject")}</option>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#7293b9" }} />
              </div>
            ) : (
              <input
                type="text"
                value={subjectName}
                onChange={(e) => { setSubjectName(e.target.value); resetSheet() }}
                placeholder={t("oqBaholash.subjectPlaceholder")}
                className={inputCls}
                style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
              />
            )}
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t("oqDavomat.trainingType")}</label>
            <div className="relative">
              <select
                value={trainingType}
                onChange={(e) => setTrainingType(e.target.value)}
                disabled={loadedOnce && !editable}
                className={`${inputCls} appearance-none pr-8 disabled:bg-[#f6f9ff] disabled:cursor-not-allowed`}
                style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                <option value="">{t("oqDavomat.trainingTypePlaceholder")}</option>
                {TRAINING_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#7293b9" }} />
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t("oqBaholash.date")}</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { setDate((d) => addDays(d, -1)); resetSheet() }}
                className="shrink-0 rounded-[8px] border border-[#d8e6f7] p-2.5 hover:bg-[#f6f9ff]"
                title={t("davomatJurnaliOq.prevDay")}>
                <ChevronLeft className="w-4 h-4" style={{ color: "#0e58a8" }} />
              </button>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => { const v = e.target.value || today; setDate(v > today ? today : v); resetSheet() }}
                className={inputCls}
                style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
              />
              <button
                type="button"
                onClick={() => { if (!isToday) { setDate((d) => addDays(d, 1)); resetSheet() } }}
                disabled={isToday}
                className="shrink-0 rounded-[8px] border border-[#d8e6f7] p-2.5 hover:bg-[#f6f9ff] disabled:opacity-40 disabled:cursor-not-allowed"
                title={t("davomatJurnaliOq.nextDay")}>
                <ChevronRight className="w-4 h-4" style={{ color: "#0e58a8" }} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 px-3 py-2 rounded-[8px] text-xs" style={{ backgroundColor: "#f0f7ff", color: "#0e58a8", border: "1px solid rgba(14,88,168,0.15)", fontFamily: "var(--font-poppins)" }}>
          <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
          {t("davomatJurnaliOq.manualNotice")}
        </div>

        <div>
          <button
            onClick={() => loadRoster()}
            disabled={groupId === "" || !subjectName || !date || loadingRoster}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
            <Users className="w-4 h-4" />
            {loadingRoster ? t("oqBaholash.loading") : t("oqBaholash.loadRoster")}
          </button>
        </div>
      </div>

      {/* Ro'yxat */}
      {rosterError && <ApiError message={rosterError} onRetry={() => loadRoster()} />}

      {/* Qulf holati: saqlangan kun faqat admin ruxsati bilan o'zgaradi */}
      {!rosterError && loadedOnce && sheet.saved && (
        sheet.locked ? (
          <div className="rounded-[10px] p-4 flex flex-col gap-3" style={{ backgroundColor: "#fffbeb", border: "1px solid rgba(146,64,14,0.2)" }}>
            <div className="flex items-start gap-2 text-sm" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t("davomatJurnaliOq.lockedNotice", { date: fmtDate(date) })}</span>
            </div>

            {sheet.editRequest?.status === "pending" ? (
              <div className="flex items-start gap-2 text-xs px-3 py-2 rounded-[8px] bg-white" style={{ color: "#0e58a8", border: "1px solid rgba(14,88,168,0.15)", fontFamily: "var(--font-poppins)" }}>
                <Clock className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>
                  {t("davomatJurnaliOq.pendingNotice", { date: fmtDateTime(sheet.editRequest.createdAt) })}
                  <span className="block mt-0.5" style={{ color: "#7293b9" }}>{t("davomatJurnaliOq.yourReason", { reason: sheet.editRequest.reason })}</span>
                </span>
              </div>
            ) : (
              <>
                {sheet.editRequest?.status === "rejected" && (
                  <div className="text-xs px-3 py-2 rounded-[8px] bg-white" style={{ color: "#b91c1c", border: "1px solid rgba(185,28,28,0.2)", fontFamily: "var(--font-poppins)" }}>
                    {t("davomatJurnaliOq.rejectedNotice")}
                    {sheet.editRequest.adminNote && (
                      <span className="block mt-0.5" style={{ color: "#7293b9" }}>{t("davomatJurnaliOq.adminNote", { note: sheet.editRequest.adminNote })}</span>
                    )}
                  </div>
                )}
                {requestOpen ? (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium block" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {t("davomatJurnaliOq.reasonLabel")}
                    </label>
                    <textarea
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder={t("davomatJurnaliOq.reasonPlaceholder")}
                      className={`${inputCls} bg-white resize-y`}
                      style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={sendEditRequest}
                        disabled={requestSending || !requestReason.trim()}
                        className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-medium disabled:opacity-50"
                        style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                        <Send className="w-4 h-4" />
                        {requestSending ? t("oqBaholash.saving") : t("davomatJurnaliOq.sendRequest")}
                      </button>
                      <button
                        onClick={() => { setRequestOpen(false); setRequestReason("") }}
                        className="px-4 py-2 rounded-[8px] text-sm font-medium"
                        style={{ backgroundColor: "#fff", color: "#7293b9", border: "1px solid rgba(1,41,112,0.12)", fontFamily: "var(--font-poppins)" }}>
                        {t("davomatJurnaliOq.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => { setRequestOpen(true); setRequestMsg(null) }}
                      className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-medium"
                      style={{ backgroundColor: "#92400e", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                      <Send className="w-4 h-4" />
                      {t("davomatJurnaliOq.requestEditBtn")}
                    </button>
                  </div>
                )}
              </>
            )}
            {requestMsg && (
              <span className="text-xs" style={{ color: requestOk ? "#15803d" : "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                {requestMsg}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-[10px] px-4 py-3 text-sm" style={{ backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid rgba(21,128,61,0.2)", fontFamily: "var(--font-poppins)" }}>
            <Unlock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {t("davomatJurnaliOq.approvedNotice")}
              {sheet.editRequest?.adminNote && (
                <span className="block text-xs mt-0.5" style={{ color: "#7293b9" }}>{t("davomatJurnaliOq.adminNote", { note: sheet.editRequest.adminNote })}</span>
              )}
            </span>
          </div>
        )
      )}

      {!rosterError && loadedOnce && (
        <div className="bg-white rounded-[10px] overflow-hidden"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)", backgroundColor: "#f6f9ff" }}>
                  {[t("oqBaholash.col.hash"), t("oqBaholash.col.fullName"), t("oqDavomat.col.status"), t("oqBaholash.col.comment")].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roster.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-14 text-center text-sm"
                      style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {t("oqBaholash.noStudents")}
                    </td>
                  </tr>
                ) : roster.map((s, i) => (
                  <tr key={s.studentUserId} className="hover:bg-[#f6f9ff]/50 transition-colors"
                    style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {s.fullName}
                      {s.studentIdNumber && (
                        <div className="text-xs font-normal" style={{ color: "#7293b9" }}>{s.studentIdNumber}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editable ? (
                        <div className="flex flex-wrap gap-1.5">
                          {STATUS_OPTIONS.map((opt) => {
                            const active = (s.status ?? "absent") === opt.value
                            return (
                              <button
                                key={opt.value}
                                onClick={() => setStatus(s.studentUserId, opt.value)}
                                className="text-xs font-medium px-2.5 py-1 rounded-full transition-all"
                                style={{
                                  backgroundColor: active ? opt.bg : "transparent",
                                  color: active ? opt.color : "#7293b9",
                                  border: active ? `1px solid ${opt.color}33` : "1px solid rgba(1,41,112,0.12)",
                                  fontFamily: "var(--font-poppins)",
                                }}>
                                {opt.label}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{
                          backgroundColor: s.status ? STATUS_MAP[s.status].bg : "transparent",
                          color: s.status ? STATUS_MAP[s.status].color : "#7293b9",
                          border: s.status ? `1px solid ${STATUS_MAP[s.status].color}33` : "1px solid rgba(1,41,112,0.12)",
                          fontFamily: "var(--font-poppins)",
                        }}>
                          {s.status ? STATUS_MAP[s.status].label : t("davomatJurnaliOq.noMark")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editable ? (
                        <input
                          type="text"
                          value={s.comment ?? ""}
                          onChange={(e) => setComment(s.studentUserId, e.target.value)}
                          placeholder={t("oqBaholash.commentPlaceholder")}
                          className="w-full px-2.5 py-1.5 rounded-[6px] text-xs border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none"
                          style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
                        />
                      ) : (
                        <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.comment || "-"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {roster.length > 0 && (editable || saveMsg) && (
            <div className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap"
              style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
              {saveMsg && (
                <span className="text-sm" style={{ color: saveOk ? "#15803d" : "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                  {saveMsg}
                </span>
              )}
              {editable && (confirmingSave ? (
                <div className="flex items-center gap-2 flex-wrap ml-auto">
                  <span className="text-xs font-medium" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
                    {t("davomatJurnaliOq.confirmSave")}
                  </span>
                  <button
                    onClick={() => setConfirmingSave(false)}
                    className="px-3 py-2 rounded-[8px] text-sm font-medium"
                    style={{ backgroundColor: "#fff", color: "#7293b9", border: "1px solid rgba(1,41,112,0.12)", fontFamily: "var(--font-poppins)" }}>
                    {t("davomatJurnaliOq.cancel")}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: "#15803d", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                    <Save className="w-4 h-4" />
                    {saving ? t("oqBaholash.saving") : t("davomatJurnaliOq.confirmSaveBtn")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap ml-auto">
                  <button
                    onClick={markAllPresent}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium"
                    style={{ backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid rgba(21,128,61,0.25)", fontFamily: "var(--font-poppins)" }}>
                    <CheckCheck className="w-4 h-4" />
                    {t("davomatJurnaliOq.markAllPresent")}
                  </button>
                  <button
                    onClick={() => { setConfirmingSave(true); setSaveMsg(null) }}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: "#15803d", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                    <Save className="w-4 h-4" />
                    {saving ? t("oqBaholash.saving") : t("oqBaholash.save")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tarix */}
      {groupId !== "" && subjectName && (
        <div className="bg-white rounded-[10px] overflow-hidden"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
            <History className="w-4 h-4" style={{ color: "#0e58a8" }} />
            <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {t("oqBaholash.previousDates")}
            </span>
            <button onClick={() => refetchHistory()} className="ml-auto" title={t("oqBaholash.refresh")}>
              <RefreshCw className="w-4 h-4" style={{ color: "#7293b9" }} />
            </button>
          </div>
          {lHistory ? (
            <div className="px-5 py-6"><Loading /></div>
          ) : history.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {t("oqBaholash.noRecordsYet")}
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(1,41,112,0.06)" }}>
              {history.map((h) => {
                const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, excused: 0, late: 0 }
                h.records.forEach((r) => { counts[r.status]++ })
                return (
                  <button
                    key={`${h.lessonDate}-${h.subjectName}`}
                    onClick={() => { setDate(h.lessonDate); resetSheet(); void loadRoster(h.lessonDate) }}
                    className="w-full text-left px-5 py-3 flex items-center gap-3 flex-wrap hover:bg-[#f6f9ff]/50 transition-colors"
                  >
                    <span className="text-sm font-medium w-28 shrink-0" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {fmtDate(h.lessonDate)}
                    </span>
                    {h.trainingType && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                        {h.trainingType}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map((opt) => counts[opt.value] > 0 && (
                        <span key={opt.value} className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: opt.bg, color: opt.color, fontFamily: "var(--font-poppins)" }}>
                          {STATUS_MAP[opt.value].label}: {counts[opt.value]}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
