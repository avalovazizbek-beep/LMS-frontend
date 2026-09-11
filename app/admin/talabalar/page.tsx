"use client"

import { useEffect, useState } from "react"
import { Users, RefreshCw, GraduationCap, AlertTriangle } from "lucide-react"
import { adminApi } from "@/lib/api"

interface GroupRow { groupId: number; groupName: string; studentCount: number }

export default function AdminTalabalar() {
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [total, setTotal] = useState(0)
  const [departmentId, setDepartmentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

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
            HEMIS'dan olingan guruhlar va talaba soni
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
                    {["#", "Guruh", "Talaba soni"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-14 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        <div className="flex flex-col items-center gap-2">
                          <GraduationCap className="w-8 h-8" style={{ color: "#d8e6f7" }} />
                          Guruh topilmadi
                        </div>
                      </td>
                    </tr>
                  ) : filtered.map((g, i) => (
                    <tr key={g.groupId} className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                      <td className="px-4 py-3 text-xs" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.groupName}</td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{g.studentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
