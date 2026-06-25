"use client"

import { useMemo, useState } from "react"
import { Search, Clock, CheckCircle2, Lock, Users, ExternalLink } from "lucide-react"
import Link from "next/link"
import { teachingApi, type TeacherContent, type TeacherGroup, type ContentStatus } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const STATUS_LABEL: Record<ContentStatus, { label: string; color: string; bg: string }> = {
  locked: { label: "Qulflangan", color: "#b91c1c", bg: "#fef2f2" },
  open:   { label: "Ochiq",      color: "#15803d", bg: "#f0fdf4" },
  closed: { label: "Yopilgan",   color: "#92400e", bg: "#fffbeb" },
}

function fmt(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function ImtihonlarRoyxati() {
  const { data: contentRes, loading, error, refetch } = useApi(
    () => teachingApi.content({ type: "exam" }),
    []
  )
  const { data: groupsRes } = useApi(() => teachingApi.groups(), [])

  const items: TeacherContent[] = contentRes?.data ?? []
  const groups: TeacherGroup[] = groupsRes?.data ?? []

  const [search, setSearch] = useState("")
  const [filterGroup, setFilterGroup] = useState("")
  const [filterSubject, setFilterSubject] = useState("")

  const subjects = useMemo(() => {
    const set = new Set(items.map(i => i.subjectName).filter(Boolean))
    return Array.from(set).sort()
  }, [items])

  const rows = useMemo(() => {
    let list = items
    if (filterGroup) list = list.filter(i => String(i.groupId) === filterGroup)
    if (filterSubject) list = list.filter(i => i.subjectName === filterSubject)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.subjectName.toLowerCase().includes(q)
      )
    }
    return list
  }, [items, filterGroup, filterSubject, search])

  if (loading) return <Loading />
  if (error) return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Imtihonlar ro&apos;yxati
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            O&apos;qituvchi tomonidan yaratilgan barcha imtihonlar
          </p>
        </div>
        <Link
          href="/oqituvchi-kabineti/imtihonlar"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-medium self-start"
          style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}
        >
          <ExternalLink className="w-4 h-4" />
          Imtihon yaratish
        </Link>
      </div>

      {/* Filtrlar */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterSubject}
          onChange={e => setFilterSubject(e.target.value)}
          className="rounded-[6px] border border-[#d8e6f7] bg-white px-3 py-2 text-sm text-[#104475] outline-none min-w-[200px]"
          style={{ fontFamily: "var(--font-poppins)" }}
        >
          <option value="">Barcha fanlar</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filterGroup}
          onChange={e => setFilterGroup(e.target.value)}
          className="rounded-[6px] border border-[#d8e6f7] bg-white px-3 py-2 text-sm text-[#104475] outline-none min-w-[180px]"
          style={{ fontFamily: "var(--font-poppins)" }}
        >
          <option value="">Barcha guruhlar</option>
          {groups.map(g => <option key={g.id} value={String(g.id)}>{g.name}</option>)}
        </select>

        <label className="flex items-center gap-2 rounded-[6px] border border-[#d8e6f7] bg-white px-3 py-2 min-w-[220px]"
          style={{ color: "#7293b9" }}>
          <Search className="w-4 h-4" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sarlavha yoki fan bo'yicha qidirish"
            className="min-w-0 flex-1 bg-transparent text-sm text-[#104475] outline-none placeholder:text-[#7293b9]"
            style={{ fontFamily: "var(--font-poppins)" }}
          />
        </label>
      </div>

      {/* Jadval */}
      <div className="rounded-[10px] bg-white overflow-hidden"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                {["#", "Fan", "Sarlavha", "Guruh", "Ochilish vaqti", "Muddat", "Maks. ball", "Davomiyligi", "Holat"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap"
                    style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((item, idx) => {
                const st = STATUS_LABEL[item.status]
                const groupName = groups.find(g => g.id === item.groupId)?.name ?? `#${item.groupId}`
                return (
                  <tr key={item.id} className="hover:bg-[#f6f9ff]"
                    style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 text-sm max-w-[160px]" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {item.subjectName || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium max-w-[200px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {item.title}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 shrink-0" style={{ color: "#7293b9" }} />
                        {groupName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {fmt(item.availableFrom)}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {fmt(item.deadline)}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {item.maxScore != null ? item.maxScore : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#104475", fontFamily: "var(--font-poppins)" }}>
                      {item.durationMinutes != null ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
                          {item.durationMinutes} daq.
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{ color: st.color, backgroundColor: st.bg, fontFamily: "var(--font-poppins)" }}>
                        {item.status === "open" ? <CheckCircle2 className="w-3 h-3" /> :
                         item.status === "locked" ? <Lock className="w-3 h-3" /> :
                         <Clock className="w-3 h-3" />}
                        {st.label}
                      </span>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm"
                    style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {items.length === 0
                      ? "Hozircha imtihon yaratilmagan. \"Imtihon yaratish\" tugmasi orqali qo'shing."
                      : "Filtr bo'yicha imtihon topilmadi"}
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
