"use client"

import { useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ChevronRight, Plus, BookOpen, BookMarked, ArrowLeft,
  Pencil, Trash2, Check, X, Loader2,
} from "lucide-react"
import { teachingApi, type TeacherScheduleItem } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const labelStyle = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const
const titleStyle = { color: "#012970", fontFamily: "var(--font-poppins)" } as const

interface Topic {
  topicKey: string
  title: string
  markerId: number | null
}

/* ── Fanlar ro'yxati ko'rinishi ─────────────────────────────────────── */
function SubjectsList({
  groups, schedule, onSelect,
}: {
  groups: { id: number; name: string; direction?: string | null }[]
  schedule: TeacherScheduleItem[]
  onSelect: (subject: string, groupId: number, groupName: string) => void
}) {
  const [groupId, setGroupId] = useState<number | null>(groups[0]?.id ?? null)
  const activeGroupId = groupId ?? groups[0]?.id ?? null
  const activeGroup = groups.find(g => g.id === activeGroupId)

  const subjects = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const item of schedule) {
      if (activeGroupId !== null && item.groupId !== activeGroupId) continue
      if (!seen.has(item.subjectName)) {
        seen.add(item.subjectName)
        list.push(item.subjectName)
      }
    }
    return list.sort()
  }, [schedule, activeGroupId])

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={titleStyle}>Fan mavzulari</h1>
        <p className="text-sm mt-1" style={labelStyle}>Fanni tanlang va mavzularini boshqaring</p>
      </div>

      <div className="rounded-[10px] bg-white p-4 flex flex-wrap items-center gap-3"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={labelStyle}>Guruh</label>
          <select
            value={activeGroupId ?? ""}
            onChange={e => setGroupId(Number(e.target.value))}
            className="px-3 py-2 rounded-[5px] text-sm outline-none min-w-[200px]"
            style={{ border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)" }}
          >
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        {activeGroup?.direction && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium" style={labelStyle}>Yo&apos;nalish</span>
            <span className="px-3 py-2 rounded-[5px] text-sm"
              style={{ backgroundColor: "#f6f9ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              {activeGroup.direction}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-[10px] bg-white"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <h2 className="text-base font-semibold" style={titleStyle}>
            Fanlar {subjects.length > 0 && <span className="text-sm font-normal" style={labelStyle}>({subjects.length} ta)</span>}
          </h2>
        </div>

        {subjects.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <BookMarked className="w-10 h-10 mx-auto mb-3" style={{ color: "#c2cfe0" }} />
            <p className="text-sm" style={labelStyle}>
              {activeGroupId ? "Bu guruh uchun fan topilmadi" : "Guruhni tanlang"}
            </p>
            <p className="text-xs mt-1" style={labelStyle}>HEMIS jadval sinxronizatsiyasi kerak bo&apos;lishi mumkin</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {subjects.map(subject => (
              <button
                key={subject}
                onClick={() => activeGroupId && onSelect(subject, activeGroupId, activeGroup?.name ?? "")}
                className="flex items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[#f6f9ff]"
                style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-[8px]"
                    style={{ backgroundColor: "#eef4ff" }}>
                    <BookOpen className="w-4 h-4" style={{ color: "#0e58a8" }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                    {subject}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#7293b9" }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Mavzular ko'rinishi ─────────────────────────────────────────────── */
function TopicsView({
  subjectName, groupId, groupName, onBack,
}: {
  subjectName: string
  groupId: number
  groupName: string
  onBack: () => void
}) {
  const { data: contentRes, loading: lContent, error: eContent, refetch: rContent } = useApi(
    () => teachingApi.content({ group: groupId, subject: subjectName }),
    [groupId, subjectName]
  )
  const items = contentRes?.data ?? []

  const topics = useMemo<Topic[]>(() => {
    const map = new Map<string, Topic>()
    items.forEach(item => {
      if (!item.topicKey) return
      if (!map.has(item.topicKey)) {
        const markerId = (item.type === "mavzu" && item.kind === "topic") ? item.id : null
        map.set(item.topicKey, { topicKey: item.topicKey, title: item.title, markerId })
      } else if (item.type === "mavzu" && item.kind === "topic") {
        const t = map.get(item.topicKey)!
        map.set(item.topicKey, { ...t, markerId: item.id, title: item.title })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.topicKey.localeCompare(b.topicKey, undefined, { numeric: true }))
  }, [items])

  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  const [editKey, setEditKey] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  const [deleteKey, setDeleteKey] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [opError, setOpError] = useState<string | null>(null)

  async function handleAddTopic() {
    if (!newTitle.trim()) return
    setAddError(null)
    setAddLoading(true)
    try {
      const topicKey = `${subjectName}__${groupId}__${Date.now()}`
      await teachingApi.createContent({
        type: "mavzu",
        kind: "topic",
        groupId,
        subjectName,
        topicKey,
        title: newTitle.trim(),
        availableFrom: new Date().toISOString(),
      })
      setNewTitle("")
      setAdding(false)
      await rContent()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Mavzu qo'shishda xatolik yuz berdi")
    } finally {
      setAddLoading(false)
    }
  }

  function startEdit(topic: Topic) {
    setEditKey(topic.topicKey)
    setEditTitle(topic.title)
    setOpError(null)
  }

  async function saveEdit(topic: Topic) {
    if (!editTitle.trim() || !topic.markerId) return
    setEditLoading(true)
    setOpError(null)
    try {
      await teachingApi.updateContent(topic.markerId, { title: editTitle.trim() })
      setEditKey(null)
      await rContent()
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Tahrirlashda xatolik yuz berdi")
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete(topicKey: string) {
    setDeleteLoading(true)
    setOpError(null)
    try {
      const toDelete = items.filter(i => i.topicKey === topicKey)
      await Promise.all(toDelete.map(i => teachingApi.removeContent(i.id)))
      setDeleteKey(null)
      await rContent()
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "O'chirishda xatolik yuz berdi")
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-[8px] transition-colors hover:bg-[#f0f5ff] shrink-0"
          style={{ border: "1px solid rgba(1,41,112,0.15)" }}>
          <ArrowLeft className="w-4 h-4" style={{ color: "#0e58a8" }} />
        </button>
        <div>
          <h1 className="text-[22px] font-medium leading-snug" style={titleStyle}>{subjectName}</h1>
          <p className="text-sm mt-0.5" style={labelStyle}>{groupName} — Mavzular</p>
        </div>
      </div>

      <div className="rounded-[10px] bg-white"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <h2 className="text-base font-semibold" style={titleStyle}>
            Mavzular
            {topics.length > 0 && (
              <span className="ml-2 text-sm font-normal" style={labelStyle}>({topics.length} ta)</span>
            )}
          </h2>
          <button onClick={() => { setAdding(v => !v); setAddError(null) }}
            className="flex items-center gap-2 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors hover:bg-[#f6f9ff]"
            style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            <Plus className="w-4 h-4" />
            Mavzu qo&apos;shish
          </button>
        </div>

        {(opError) && (
          <div className="px-5 py-2 text-sm" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
            {opError}
          </div>
        )}

        {adding && (
          <div className="px-5 py-4 flex flex-col gap-2" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
            {addError && (
              <div className="text-sm px-3 py-2 rounded-[6px]"
                style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                {addError}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddTopic()}
                placeholder="Mavzu nomi"
                className="flex-1 px-3 py-2.5 rounded-[5px] text-sm outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)" }}
                autoFocus
              />
              <button onClick={handleAddTopic} disabled={addLoading}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-[6px] text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Qo&apos;shish
              </button>
              <button onClick={() => { setAdding(false); setNewTitle("") }}
                className="px-3 py-2.5 rounded-[6px] text-sm font-medium"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Bekor
              </button>
            </div>
          </div>
        )}

        {lContent ? (
          <Loading />
        ) : eContent ? (
          <ApiError message={eContent} onRetry={rContent} />
        ) : topics.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#c2cfe0" }} />
            <p className="text-sm font-medium" style={titleStyle}>Hali mavzu qo&apos;shilmagan</p>
            <p className="text-xs mt-1" style={labelStyle}>Yuqoridagi tugma orqali birinchi mavzuni qo&apos;shing</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {topics.map((topic, idx) => (
              <div
                key={topic.topicKey}
                className="flex items-center gap-3 px-5 py-3.5"
                style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-xs font-semibold"
                  style={{ backgroundColor: "#eef4ff", color: "#0e58a8" }}>
                  {idx + 1}
                </span>

                {editKey === topic.topicKey ? (
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(topic); if (e.key === "Escape") setEditKey(null) }}
                      className="flex-1 px-3 py-1.5 rounded-[5px] text-sm outline-none"
                      style={{ border: "1px solid rgba(1,41,112,0.35)", color: "#012970", fontFamily: "var(--font-poppins)" }}
                      autoFocus
                    />
                    <button onClick={() => saveEdit(topic)} disabled={editLoading}
                      className="flex items-center justify-center w-8 h-8 rounded-[6px] transition-colors hover:bg-green-50 disabled:opacity-60">
                      {editLoading ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#16a34a" }} /> : <Check className="w-4 h-4" style={{ color: "#16a34a" }} />}
                    </button>
                    <button onClick={() => setEditKey(null)}
                      className="flex items-center justify-center w-8 h-8 rounded-[6px] transition-colors hover:bg-red-50">
                      <X className="w-4 h-4" style={{ color: "#dc2626" }} />
                    </button>
                  </div>
                ) : deleteKey === topic.topicKey ? (
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      <span className="font-medium" style={{ color: "#b91c1c" }}>&quot;{topic.title}&quot;</span> ni o&apos;chirasizmi?
                    </span>
                    <button onClick={() => handleDelete(topic.topicKey)} disabled={deleteLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-sm font-medium text-white disabled:opacity-60"
                      style={{ backgroundColor: "#dc2626", fontFamily: "var(--font-poppins)" }}>
                      {deleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Ha, o&apos;chir
                    </button>
                    <button onClick={() => setDeleteKey(null)}
                      className="px-3 py-1.5 rounded-[6px] text-sm"
                      style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      Bekor
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium truncate"
                      style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {topic.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEdit(topic)}
                        className="flex items-center justify-center w-8 h-8 rounded-[6px] transition-colors hover:bg-[#f0f5ff]"
                        title="Tahrirlash">
                        <Pencil className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
                      </button>
                      <button onClick={() => { setDeleteKey(topic.topicKey); setOpError(null) }}
                        className="flex items-center justify-center w-8 h-8 rounded-[6px] transition-colors hover:bg-red-50"
                        title="O'chirish">
                        <Trash2 className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Bosh sahifa ─────────────────────────────────────────────────────── */
export default function MavzularPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const urlSubject = searchParams.get("subject") ?? ""
  const urlGroupId = Number(searchParams.get("group") ?? "0")
  const urlGroupName = searchParams.get("groupName") ?? ""

  const [selected, setSelected] = useState<{ subject: string; groupId: number; groupName: string } | null>(
    urlSubject && urlGroupId ? { subject: urlSubject, groupId: urlGroupId, groupName: urlGroupName } : null
  )

  const { data: groupsRes, loading: lGroups, error: eGroups, refetch: rGroups } = useApi(() => teachingApi.groups(), [])
  const { data: scheduleRes, loading: lSchedule, error: eSchedule, refetch: rSchedule } = useApi(() => teachingApi.schedule(), [])

  const groups = groupsRes?.data ?? []
  const schedule = scheduleRes?.data ?? []

  function handleSelect(subject: string, groupId: number, groupName: string) {
    setSelected({ subject, groupId, groupName })
    router.replace(`/oqituvchi-kabineti/mavzular?subject=${encodeURIComponent(subject)}&group=${groupId}&groupName=${encodeURIComponent(groupName)}`)
  }

  function handleBack() {
    setSelected(null)
    router.replace("/oqituvchi-kabineti/mavzular")
  }

  if (lGroups || lSchedule) return <Loading />
  if (eGroups) return (
    <div className="p-[30px]">
      <ApiError message={eGroups} onRetry={rGroups} />
    </div>
  )
  if (eSchedule) return (
    <div className="p-[30px]">
      <ApiError message={eSchedule} onRetry={rSchedule} />
    </div>
  )

  if (selected) {
    return (
      <TopicsView
        subjectName={selected.subject}
        groupId={selected.groupId}
        groupName={selected.groupName}
        onBack={handleBack}
      />
    )
  }

  return (
    <SubjectsList
      groups={groups}
      schedule={schedule}
      onSelect={handleSelect}
    />
  )
}
