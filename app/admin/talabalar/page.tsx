"use client"

import { useEffect, useState } from "react"
import { Users, RefreshCw, GraduationCap, AlertTriangle, X, ScanFace, CheckCircle2, AlertCircle, Send } from "lucide-react"
import { adminApi, type StudentFaceRow } from "@/lib/api"

interface GroupRow { groupId: number; groupName: string; studentCount: number }

function RosterModal({ group, onClose }: { group: GroupRow; onClose: () => void }) {
  const [students, setStudents] = useState<StudentFaceRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    adminApi.studentFaceRoster(group.groupId)
      .then(res => { if (!cancelled) setStudents(res.students) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Yuklashda xato") })
    return () => { cancelled = true }
  }, [group.groupId])

  async function handleRequest(hemisId: number) {
    setSendingId(hemisId)
    try {
      await adminApi.requestFaceReregister(hemisId)
      setStudents(prev => prev?.map(s => s.hemisId === hemisId ? { ...s, adminRequestPending: true } : s) ?? prev)
    } catch {
      // jimgina — tugma yana bosiladigan holatga qaytadi, qayta urinish mumkin
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(1,41,112,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl rounded-[14px] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{group.groupName}</h2>
            <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Face ID holati</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f0f5ff] transition-colors">
            <X className="w-4 h-4" style={{ color: "#7293b9" }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {error ? (
            <div className="p-6 text-sm" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{error}</div>
          ) : students === null ? (
            <div className="flex items-center justify-center py-14">
              <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} />
            </div>
          ) : students.length === 0 ? (
            <div className="p-10 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              Bu guruhda talaba topilmadi
            </div>
          ) : (
            <table className="w-full">
              <tbody>
                {students.map(s => (
                  <tr key={s.hemisId} className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.fullName}</div>
                      {s.studentIdNumber && (
                        <div className="text-xs mt-0.5" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>{s.studentIdNumber}</div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {s.faceRegistered ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                          style={{ backgroundColor: "#f0fff4", color: "#166534", fontFamily: "var(--font-poppins)" }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ro&apos;yxatdan o&apos;tgan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                          style={{ backgroundColor: "#fff8e6", color: "#92400e", fontFamily: "var(--font-poppins)" }}>
                          <AlertCircle className="w-3.5 h-3.5" /> O&apos;tmagan
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {s.adminRequestPending ? (
                        <span className="text-xs italic" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>So&apos;rov yuborilgan</span>
                      ) : sendingId === s.hemisId ? (
                        <RefreshCw className="w-4 h-4 animate-spin ml-auto" style={{ color: "#0e58a8" }} />
                      ) : (
                        <button onClick={() => handleRequest(s.hemisId)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[6px] transition-opacity hover:opacity-90"
                          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                          <Send className="w-3.5 h-3.5" />
                          {s.faceRegistered ? "Qayta so'rash" : "So'rash"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminTalabalar() {
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [total, setTotal] = useState(0)
  const [departmentId, setDepartmentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    adminApi.hemisStudents()
      .then(res => {
        setGroups(res.groups ?? [])
        setTotal(res.totalStudents ?? 0)
        setDepartmentId(res.departmentId ?? null)
      })
      .catch(e => setError(e instanceof Error ? e.message : "Yuklashda xato"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = groups.filter(g => g.groupName.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div className="flex flex-col gap-5 p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Talabalar ro'yxati
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            HEMIS'dan olingan guruhlar va talaba soni — Face ID holatini ko'rish uchun guruhni bosing
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px]"
          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Yangilash
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} />
        </div>
      ) : error ? (
        <div className="rounded-[12px] p-6 text-sm" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
          {error}
        </div>
      ) : !departmentId ? (
        <div className="rounded-[12px] p-6 flex items-start gap-3" style={{ backgroundColor: "#fff7ed", border: "1px solid rgba(217,119,6,0.2)" }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#92400e" }} />
          <div className="text-sm" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
            Bu ma'lumotni ko'rsatish uchun sizning HEMIS profilingizda departament (fakultet/institut) aniqlanmagan.
            Bu ro'yxat faqat HEMIS orqali (OAuth) kirgan, haqiqiy xodim profiliga ega admin hisobida ishlaydi.
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-[12px] p-6 flex items-center gap-4 w-fit"
            style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
            <div className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#eef4ff" }}>
              <Users className="w-6 h-6" style={{ color: "#0e58a8" }} />
            </div>
            <div>
              <div className="text-3xl font-bold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{total}</div>
              <div className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Jami talaba ({groups.length} guruhda)
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[12px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
            <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
              <h2 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                Guruhlar bo'yicha
              </h2>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Guruh nomi bo'yicha qidirish"
                className="px-3 py-2 rounded-[8px] text-sm outline-none w-56"
                style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)", backgroundColor: "#f6f9ff" }}>
                    {["#", "Guruh", "Talaba soni", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-14 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        <div className="flex flex-col items-center gap-2">
                          <GraduationCap className="w-8 h-8" style={{ color: "#d8e6f7" }} />
                          Guruh topilmadi
                        </div>
                      </td>
                    </tr>
                  ) : filtered.map((g, i) => (
                    <tr key={g.groupId} onClick={() => setSelectedGroup(g)}
                      className="hover:bg-[#f6f9ff]/50 transition-colors cursor-pointer" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                      <td className="px-4 py-3 text-xs" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.groupName}</td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{g.studentCount}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                          <ScanFace className="w-3.5 h-3.5" /> Face ID
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedGroup && <RosterModal group={selectedGroup} onClose={() => setSelectedGroup(null)} />}
    </div>
  )
}
