"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronDown, Save, History, Users, RefreshCw } from "lucide-react"
import {
  teachingApi,
  attendanceApi,
  type AttendanceStatus,
  type AttendanceRosterItem,
} from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string; bg: string }[] = [
  { value: "present", label: "Keldi",      color: "#15803d", bg: "#f0fdf4" },
  { value: "absent",  label: "Kelmadi",    color: "#b91c1c", bg: "#fef2f2" },
  { value: "excused", label: "Sababli",    color: "#92400e", bg: "#fffbeb" },
  { value: "late",    label: "Kech qoldi", color: "#0e58a8", bg: "#eef4ff" },
]

const STATUS_MAP = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s])) as Record<AttendanceStatus, typeof STATUS_OPTIONS[number]>

const inputCls =
  "w-full px-3 py-2.5 rounded-[8px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none transition-colors"
const labelCls = "text-xs font-medium mb-1.5 block"

function todayStr() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fmtDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function OqituvchiDavomat() {
  const searchParams = useSearchParams()
  const initialGroup = searchParams.get("group")
  const initialSubject = searchParams.get("subject") ?? ""

  const { data: groupsRes, loading: lGroups, error: eGroups, refetch: rGroups } = useApi(() => teachingApi.groups(), [])

  const groups = groupsRes?.data ?? []

  const [groupId, setGroupId] = useState<number | "">(initialGroup ? Number(initialGroup) : "")
  const [subjectName, setSubjectName] = useState(initialSubject)
  const [date, setDate] = useState(todayStr())

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

  const { data: historyRes, loading: lHistory, refetch: refetchHistory } = useApi(
    () =>
      groupId !== "" && subjectName
        ? attendanceApi.history({ groupId, subject: subjectName })
        : Promise.resolve({ success: true, data: [] }),
    [groupId, subjectName]
  )
  const history = historyRes?.data ?? []

  async function loadRoster() {
    if (groupId === "" || !subjectName || !date) return
    setLoadingRoster(true)
    setRosterError(null)
    setSaveMsg(null)
    try {
      const res = await attendanceApi.roster(groupId, subjectName, date)
      setRoster(res.data)
      setLoadedOnce(true)
    } catch (e) {
      setRosterError(e instanceof Error ? e.message : "Xatolik yuz berdi")
    } finally {
      setLoadingRoster(false)
    }
  }

  function setStatus(studentUserId: number, status: AttendanceStatus) {
    setRoster((prev) => prev.map((r) => (r.studentUserId === studentUserId ? { ...r, status } : r)))
  }

  function setComment(studentUserId: number, comment: string) {
    setRoster((prev) => prev.map((r) => (r.studentUserId === studentUserId ? { ...r, comment } : r)))
  }

  async function handleSave() {
    if (groupId === "" || !subjectName || !date) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await attendanceApi.save({
        groupId,
        subjectName,
        date,
        records: roster.map((r) => ({
          studentUserId: r.studentUserId,
          fullName: r.fullName,
          status: r.status ?? "absent",
          comment: r.comment ?? undefined,
        })),
      })
      setSaveMsg("Davomat saqlandi")
      refetchHistory()
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Xatolik yuz berdi")
    } finally {
      setSaving(false)
    }
  }

  if (lGroups) return <Loading />
  if (eGroups) return <ApiError message={eGroups} onRetry={rGroups} />

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Davomat
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Guruh, fan va sanani tanlab, talabalar davomatini belgilang
        </p>
      </div>

      {/* Filtrlar */}
      <div className="bg-white rounded-[10px] p-4 flex flex-col gap-4"
        style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Guruh</label>
            <div className="relative">
              <select
                value={groupId}
                onChange={(e) => { setGroupId(e.target.value ? Number(e.target.value) : ""); setSubjectName(""); setRoster([]); setLoadedOnce(false) }}
                className={`${inputCls} appearance-none pr-8`}
                style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                <option value="">Guruhni tanlang</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#7293b9" }} />
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Fan</label>
            {subjects.length > 0 ? (
              <div className="relative">
                <select
                  value={subjectName}
                  onChange={(e) => { setSubjectName(e.target.value); setRoster([]); setLoadedOnce(false) }}
                  className={`${inputCls} appearance-none pr-8`}
                  style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  <option value="">Fanni tanlang</option>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#7293b9" }} />
              </div>
            ) : (
              <input
                type="text"
                value={subjectName}
                onChange={(e) => { setSubjectName(e.target.value); setRoster([]); setLoadedOnce(false) }}
                placeholder="Fan nomini kiriting"
                className={inputCls}
                style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
              />
            )}
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Sana</label>
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setRoster([]); setLoadedOnce(false) }}
              className={inputCls}
              style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
            />
          </div>
        </div>

        <div>
          <button
            onClick={loadRoster}
            disabled={groupId === "" || !subjectName || !date || loadingRoster}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
            <Users className="w-4 h-4" />
            {loadingRoster ? "Yuklanmoqda..." : "Ro'yxatni yuklash"}
          </button>
        </div>
      </div>

      {/* Ro'yxat */}
      {rosterError && <ApiError message={rosterError} onRetry={loadRoster} />}

      {!rosterError && loadedOnce && (
        <div className="bg-white rounded-[10px] overflow-hidden"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)", backgroundColor: "#f6f9ff" }}>
                  {["#", "F.I.Sh.", "Holat", "Izoh"].map((h) => (
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
                      Bu guruhda talaba topilmadi
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
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={s.comment ?? ""}
                        onChange={(e) => setComment(s.studentUserId, e.target.value)}
                        placeholder="Izoh (ixtiyoriy)"
                        className="w-full px-2.5 py-1.5 rounded-[6px] text-xs border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none"
                        style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {roster.length > 0 && (
            <div className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap"
              style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
              {saveMsg && (
                <span className="text-sm" style={{ color: saveMsg === "Davomat saqlandi" ? "#15803d" : "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                  {saveMsg}
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium transition-opacity disabled:opacity-50 ml-auto"
                style={{ backgroundColor: "#15803d", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                <Save className="w-4 h-4" />
                {saving ? "Saqlanmoqda..." : "Saqlash"}
              </button>
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
              Oldingi sanalar
            </span>
            <button onClick={() => refetchHistory()} className="ml-auto" title="Yangilash">
              <RefreshCw className="w-4 h-4" style={{ color: "#7293b9" }} />
            </button>
          </div>
          {lHistory ? (
            <div className="px-5 py-6"><Loading /></div>
          ) : history.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              Hozircha yozuv yo'q
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(1,41,112,0.06)" }}>
              {history.map((h) => {
                const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, excused: 0, late: 0 }
                h.records.forEach((r) => { counts[r.status]++ })
                return (
                  <div key={`${h.lessonDate}-${h.subjectName}`} className="px-5 py-3 flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium w-28 shrink-0" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {fmtDate(h.lessonDate)}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map((opt) => counts[opt.value] > 0 && (
                        <span key={opt.value} className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: opt.bg, color: opt.color, fontFamily: "var(--font-poppins)" }}>
                          {STATUS_MAP[opt.value].label}: {counts[opt.value]}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
