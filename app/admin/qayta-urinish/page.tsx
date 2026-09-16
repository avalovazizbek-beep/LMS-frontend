"use client"

import { useMemo, useState } from "react"
import {
  RefreshCw, Search, Clock, CheckCircle2, AlertCircle, Lock,
  FileText, HelpCircle, ShieldAlert,
} from "lucide-react"
import { adminApi, type AdminTeacherStat, type AdminTopicRow } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const
const sel = "w-full px-3 py-2.5 rounded-[8px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none bg-white"

function fmtDeadline(iso: string | null) {
  if (!iso) return "Muddat belgilanmagan"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function AdminQaytaUrinish() {
  const [teacherId, setTeacherId] = useState<number | "">("")
  const [subjectName, setSubjectName] = useState("")
  const [groupId, setGroupId] = useState<number | "">("")
  const [toggling, setToggling] = useState<string | null>(null)
  const [toggleErr, setToggleErr] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const { data: teachersRes, loading: lTeachers, error: eTeachers } = useApi(() => adminApi.teacherStats(), [])
  const teachers: AdminTeacherStat[] = teachersRes?.data ?? []

  const { data: infoRes } = useApi(
    () => teacherId !== "" ? adminApi.teacherInfo(teacherId) : Promise.resolve(null),
    [teacherId]
  )
  const subjects = infoRes?.data?.subjects ?? []
  const groups = infoRes?.data?.groups ?? []

  function handleTeacherChange(val: string) {
    setTeacherId(val === "" ? "" : Number(val))
    setSubjectName("")
    setGroupId("")
  }

  const ready = teacherId !== "" && subjectName !== "" && groupId !== ""

  const { data: topicsRes, loading: lTopics, error: eTopics, refetch: refetchTopics } = useApi(
    () => ready ? adminApi.teacherTopicsList({ teacherId, subject: subjectName, groupId }) : Promise.resolve(null),
    [teacherId, subjectName, groupId, ready]
  )
  const topics: AdminTopicRow[] = topicsRes?.data ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return topics
    return topics.filter(t => t.title.toLowerCase().includes(q))
  }, [topics, search])

  async function toggleTopic(topic: AdminTopicRow) {
    setToggling(topic.topicKey)
    setToggleErr(null)
    try {
      if (topic.isReopened) await adminApi.closeTopic(topic.topicKey)
      else await adminApi.reopenTopic(topic.topicKey)
      await refetchTopics()
    } catch (e) {
      setToggleErr(e instanceof Error ? e.message : "Xatolik yuz berdi")
    } finally {
      setToggling(null)
    }
  }

  if (lTeachers) return <Loading />
  if (eTeachers) return <ApiError message={eTeachers} onRetry={() => window.location.reload()} />

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={T}>Qayta topshirish</h1>
        <p className="text-sm mt-1" style={L}>
          Mavzu deadline'i o'tgandan keyin talabalar test/topshiriqni qayta topshira olishi uchun ruxsat bering
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-[10px] bg-white p-4" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1 min-w-[220px] flex-1">
            <label className="text-xs font-medium" style={L}>O'qituvchi</label>
            <select value={teacherId} onChange={e => handleTeacherChange(e.target.value)}
              className={sel} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              <option value="">Tanlang...</option>
              {teachers.map(tc => <option key={tc.hemisId} value={tc.hemisId}>{tc.fullName}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[200px] flex-1">
            <label className="text-xs font-medium" style={L}>Fan</label>
            <select value={subjectName} onChange={e => { setSubjectName(e.target.value); setGroupId("") }}
              disabled={teacherId === ""}
              className={sel} style={{ color: "#012970", fontFamily: "var(--font-poppins)", opacity: teacherId === "" ? 0.5 : 1 }}>
              <option value="">Tanlang...</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[200px] flex-1">
            <label className="text-xs font-medium" style={L}>Guruh</label>
            <select value={groupId} onChange={e => setGroupId(e.target.value === "" ? "" : Number(e.target.value))}
              disabled={subjectName === ""}
              className={sel} style={{ color: "#012970", fontFamily: "var(--font-poppins)", opacity: subjectName === "" ? 0.5 : 1 }}>
              <option value="">Tanlang...</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {toggleErr && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] text-sm"
          style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5", fontFamily: "var(--font-poppins)" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {toggleErr}
        </div>
      )}

      {!ready ? (
        <div className="rounded-[10px] bg-white p-14 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm font-medium" style={T}>O'qituvchi, fan va guruhni tanlang</p>
        </div>
      ) : lTopics ? (
        <div className="rounded-[10px] bg-white p-4 sm:p-8 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="w-7 h-7 border-2 border-[#0e58a8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={L}>Yuklanmoqda…</p>
        </div>
      ) : eTopics ? (
        <ApiError message={eTopics} onRetry={refetchTopics} />
      ) : topics.length === 0 ? (
        <div className="rounded-[10px] bg-white p-14 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm font-medium" style={T}>Bu kombinatsiyada mavzu topilmadi</p>
        </div>
      ) : (
        <>
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#b0c2d8" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Mavzu nomi bo'yicha qidirish"
              className="w-full pl-9 pr-3 py-2.5 rounded-[8px] text-sm outline-none"
              style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }}
            />
          </div>

          <div className="flex flex-col gap-3">
            {filtered.map(topic => {
              const isBusy = toggling === topic.topicKey
              return (
                <div key={topic.topicKey} className="rounded-[10px] bg-white p-4 flex items-center justify-between gap-4 flex-wrap"
                  style={{
                    border: `1px solid ${topic.isReopened ? "rgba(21,128,61,0.25)" : "rgba(1,41,112,0.1)"}`,
                    boxShadow: "0px 0px 5px rgba(1,41,112,0.05)",
                  }}>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold" style={T}>{topic.title}</div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs" style={L}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {fmtDeadline(topic.deadline)}
                        {topic.deadlinePassed && <span style={{ color: "#b91c1c" }}> · o'tgan</span>}
                      </span>
                      {topic.hasTest && (
                        <span className="flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" /> Test bor</span>
                      )}
                      {topic.hasAssignment && (
                        <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Topshiriq bor</span>
                      )}
                      {!topic.hasTest && !topic.hasAssignment && (
                        <span className="flex items-center gap-1" style={{ color: "#94a3b8" }}>
                          <ShieldAlert className="w-3.5 h-3.5" /> Test/topshiriq yo'q
                        </span>
                      )}
                    </div>
                    {topic.isReopened && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs font-medium" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Qayta ochilgan{topic.reopenedBy ? ` — ${topic.reopenedBy}` : ""}
                      </div>
                    )}
                  </div>

                  {!topic.hasTest && !topic.hasAssignment ? (
                    <span className="shrink-0 text-xs px-3 py-2 rounded-[6px]" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>
                      Faollashtirib bo'lmaydi
                    </span>
                  ) : (
                    <button onClick={() => toggleTopic(topic)} disabled={isBusy}
                      className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-semibold disabled:opacity-60 transition-colors"
                      style={{
                        backgroundColor: topic.isReopened ? "#fff0f0" : "#0e58a8",
                        color: topic.isReopened ? "#b91c1c" : "#fff",
                        fontFamily: "var(--font-poppins)",
                      }}>
                      {isBusy ? <RefreshCw className="w-4 h-4 animate-spin" /> : topic.isReopened ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      {topic.isReopened ? "Yopish" : "Faollikni yoqish"}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
