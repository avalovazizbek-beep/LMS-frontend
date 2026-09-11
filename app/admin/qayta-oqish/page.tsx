"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, RefreshCw, Repeat, Search, UserPlus, ChevronRight, Layers } from "lucide-react"
import { reeduApi, type ReeduDebtor, type ReeduGroup } from "@/lib/api"

const SEMESTERS = ["11", "12", "13", "14", "15", "16", "17", "18"]

export default function QaytaOqishAdmin() {
  const router = useRouter()
  const [semester, setSemester] = useState("")
  const [debtors, setDebtors] = useState<ReeduDebtor[]>([])
  const [departmentId, setDepartmentId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loadingDebtors, setLoadingDebtors] = useState(false)
  const [debtorsError, setDebtorsError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [groups, setGroups] = useState<ReeduGroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)

  const [creating, setCreating] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")

  function loadGroups() {
    setLoadingGroups(true)
    reeduApi.groups().then(res => setGroups(res.data ?? [])).finally(() => setLoadingGroups(false))
  }

  useEffect(() => { loadGroups() }, [])

  function loadDebtors() {
    setLoadingDebtors(true)
    setDebtorsError(null)
    setMessage(null)
    setSelected(new Set())
    reeduApi.debtors(semester || undefined)
      .then(res => {
        setDebtors(res.data.debtors ?? [])
        setDepartmentId(res.data.departmentId)
        setMessage(res.data.message ?? null)
      })
      .catch(e => setDebtorsError(e instanceof Error ? e.message : "Yuklashda xato"))
      .finally(() => setLoadingDebtors(false))
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return debtors
    return debtors.filter(d => d.studentFullName.toLowerCase().includes(q) || d.subjectName.toLowerCase().includes(q) || d.groupName.toLowerCase().includes(q))
  }, [debtors, search])

  const selectable = filtered.filter(d => !d.alreadyEnrolled)
  const allSelected = selectable.length > 0 && selectable.every(d => selected.has(keyOf(d)))

  function toggle(d: ReeduDebtor) {
    if (d.alreadyEnrolled) return
    const k = keyOf(d)
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k); else next.add(k)
      return next
    })
  }

  function toggleAll() {
    setSelected(prev => {
      if (allSelected) return new Set()
      return new Set(selectable.map(keyOf))
    })
  }

  const selectedDebtors = filtered.filter(d => selected.has(keyOf(d)))
  const suggestedSubject = selectedDebtors[0]?.subjectName ?? ""

  async function createGroupAndEnroll() {
    if (!selectedDebtors.length) return
    const name = newGroupName.trim() || `${suggestedSubject} — qayta o'qish`
    setCreating(true)
    try {
      const subjectNames = new Set(selectedDebtors.map(d => d.subjectName))
      const subjectName = subjectNames.size === 1 ? suggestedSubject : "Aralash fanlar"
      const created = await reeduApi.createGroup({ name, subjectName, semester: semester || undefined })
      await reeduApi.enroll(created.data.id, selectedDebtors)
      router.push(`/admin/qayta-oqish/${created.data.id}`)
    } catch (e) {
      setDebtorsError(e instanceof Error ? e.message : "Guruh yaratishda xato")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-[28px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Qayta o'qish
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Akademik qarzdorlarni (jami ball 55dan past) HEMIS'dan aniqlash, reedu guruhga biriktirish va jarayonni yuritish
        </p>
      </div>

      {/* 1-bosqich: qarzdorlarni topish */}
      <div className="bg-white rounded-[12px]" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
        <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: "#0e58a8" }}>1</div>
            <h2 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Akademik qarzdorlar</h2>
          </div>
          <div className="flex items-center gap-2">
            <select value={semester} onChange={e => setSemester(e.target.value)}
              className="px-3 py-2 rounded-[8px] text-sm outline-none" style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }}>
              <option value="">Barcha semestrlar</option>
              {SEMESTERS.map(s => <option key={s} value={s}>{s}-semestr</option>)}
            </select>
            <button onClick={loadDebtors} disabled={loadingDebtors}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px]"
              style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDebtors ? "animate-spin" : ""}`} />
              Qidirish
            </button>
          </div>
        </div>

        {debtorsError ? (
          <div className="p-6 text-sm" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{debtorsError}</div>
        ) : message ? (
          <div className="p-6 flex items-start gap-3" style={{ backgroundColor: "#fff7ed" }}>
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#92400e" }} />
            <div className="text-sm" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>{message}</div>
          </div>
        ) : debtors.length === 0 && !loadingDebtors ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            "Qidirish" tugmasini bosing — HEMIS'dan real vaqtda tekshiriladi
          </div>
        ) : (
          <>
            <div className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#7293b9" }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Talaba, fan yoki guruh"
                  className="pl-8 pr-3 py-2 rounded-[8px] text-sm outline-none w-64" style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
              </div>
              {selectedDebtors.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                    placeholder={`${suggestedSubject || "Fan"} — qayta o'qish`}
                    className="px-3 py-2 rounded-[8px] text-sm outline-none w-56" style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
                  <button onClick={createGroupAndEnroll} disabled={creating}
                    className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px] text-white disabled:opacity-60"
                    style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                    <UserPlus className="w-3.5 h-3.5" />
                    {creating ? "Yaratilmoqda…" : `Reedu guruh yaratish (${selectedDebtors.length})`}
                  </button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)", backgroundColor: "#f6f9ff" }}>
                    <th className="px-4 py-3 w-10"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                    {["Talaba", "Guruh", "Fan", "Semestr", "Jami ball"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d, i) => (
                    <tr key={keyOf(d) + i} className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                      <td className="px-4 py-3"><input type="checkbox" disabled={d.alreadyEnrolled} checked={selected.has(keyOf(d))} onChange={() => toggle(d)} /></td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{d.studentFullName}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{d.groupName}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{d.subjectName}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{d.semester}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold px-2 py-0.5 rounded-full" style={{ color: "#b91c1c", backgroundColor: "#fff0f0" }}>{d.totalPoint}</span>
                        {d.alreadyEnrolled && <span className="ml-2 text-xs" style={{ color: "#22c55e" }}>reedu'da bor</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Mavjud reedu guruhlar */}
      <div className="bg-white rounded-[12px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
          <Layers className="w-4 h-4" style={{ color: "#0e58a8" }} />
          <h2 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Reedu guruhlar</h2>
        </div>
        {loadingGroups ? (
          <div className="flex items-center justify-center py-14"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} /></div>
        ) : groups.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Hali reedu guruh yaratilmagan
          </div>
        ) : (
          groups.map(g => (
            <button key={g.id} onClick={() => router.push(`/admin/qayta-oqish/${g.id}`)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#f6f9ff]/50 transition-colors text-left"
              style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: g.status === "active" ? "#eef4ff" : "#f1f5f9" }}>
                  <Repeat className="w-5 h-5" style={{ color: g.status === "active" ? "#0e58a8" : "#94a3b8" }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.name}</p>
                  <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {g.subjectName} · {g.studentCount} talaba{g.teacherFullName ? ` · ${g.teacherFullName}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{
                  backgroundColor: g.status === "active" ? "#f0fbfd" : "#f1f5f9",
                  color: g.status === "active" ? "#1cc2dc" : "#64748b",
                }}>{g.status === "active" ? "Faol" : "Yopilgan"}</span>
                <ChevronRight className="w-4 h-4" style={{ color: "#94a3b8" }} />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function keyOf(d: ReeduDebtor): string {
  return `${d.studentUserId}:${d.groupId}:${d.subjectName}`
}
