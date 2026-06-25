"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronDown, Save, History, Users, RefreshCw } from "lucide-react"
import {
  teachingApi,
  gradeApi,
  type GradeRosterItem,
} from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

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

function gradeColor(grade: number): string {
  if (grade >= 90) return "#15803d"
  if (grade >= 60) return "#0e58a8"
  return "#b91c1c"
}

export default function OqituvchiBaholash() {
  const searchParams = useSearchParams()
  const initialGroup = searchParams.get("group")
  const initialSubject = searchParams.get("subject") ?? ""

  const { data: groupsRes, loading: lGroups, error: eGroups, refetch: rGroups } = useApi(() => teachingApi.groups(), [])
  const { data: scheduleRes } = useApi(() => teachingApi.schedule(), [])

  const groups = groupsRes?.data ?? []
  const schedule = scheduleRes?.data ?? []

  const [groupId, setGroupId] = useState<number | "">(initialGroup ? Number(initialGroup) : "")
  const [subjectName, setSubjectName] = useState(initialSubject)
  const [date, setDate] = useState(todayStr())

  const subjects = useMemo(() => {
    if (groupId === "") return []
    return [...new Set(schedule.filter((s) => s.groupId === groupId).map((s) => s.subjectName))].sort()
  }, [schedule, groupId])

  const [roster, setRoster] = useState<GradeRosterItem[]>([])
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [rosterError, setRosterError] = useState<string | null>(null)
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const { data: historyRes, loading: lHistory, refetch: refetchHistory } = useApi(
    () =>
      groupId !== "" && subjectName
        ? gradeApi.history({ groupId, subject: subjectName })
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
      const res = await gradeApi.roster(groupId, subjectName, date)
      setRoster(res.data)
      setLoadedOnce(true)
    } catch (e) {
      setRosterError(e instanceof Error ? e.message : "Xatolik yuz berdi")
    } finally {
      setLoadingRoster(false)
    }
  }

  function setGrade(studentUserId: number, raw: string) {
    let grade: number | null = null
    if (raw.trim() !== "") {
      const num = Number(raw)
      if (!Number.isNaN(num)) grade = Math.max(0, Math.min(100, Math.round(num)))
    }
    setRoster((prev) => prev.map((r) => (r.studentUserId === studentUserId ? { ...r, grade } : r)))
  }

  function setComment(studentUserId: number, comment: string) {
    setRoster((prev) => prev.map((r) => (r.studentUserId === studentUserId ? { ...r, comment } : r)))
  }

  async function handleSave() {
    if (groupId === "" || !subjectName || !date) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await gradeApi.save({
        groupId,
        subjectName,
        date,
        records: roster.map((r) => ({
          studentUserId: r.studentUserId,
          fullName: r.fullName,
          grade: r.grade ?? null,
          comment: r.comment ?? undefined,
        })),
      })
      setSaveMsg("Baholar saqlandi")
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
          Baholash
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Guruh, fan va sanani tanlab, talabalarga baho qo'ying
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
                  {["#", "F.I.Sh.", "Baho", "Izoh"].map((h) => (
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
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={s.grade ?? ""}
                        onChange={(e) => setGrade(s.studentUserId, e.target.value)}
                        placeholder="0-100"
                        className="w-20 px-2.5 py-1.5 rounded-[6px] text-sm font-medium border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none text-center"
                        style={{ color: s.grade !== null ? gradeColor(s.grade) : "#012970", fontFamily: "var(--font-poppins)" }}
                      />
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
                <span className="text-sm" style={{ color: saveMsg === "Baholar saqlandi" ? "#15803d" : "#b91c1c", fontFamily: "var(--font-poppins)" }}>
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
                const grades = h.records.map((r) => r.grade).filter((g): g is number => g !== null)
                const average = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : null
                return (
                  <div key={`${h.lessonDate}-${h.subjectName}`} className="px-5 py-3 flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium w-28 shrink-0" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {fmtDate(h.lessonDate)}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                      Baholandi: {grades.length}
                    </span>
                    {average !== null && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                        O'rtacha: {average.toFixed(1)}
                      </span>
                    )}
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
