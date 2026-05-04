"use client"

import { useMemo, useState } from "react"
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react"

type Group = { id: number; name: string; course: number; direction: string; students: number; tutor: string; status: "active" | "inactive" }

const groups: Group[] = [
  { id: 1, name: "AT-101", course: 1, direction: "Axborot texnologiyalari", students: 25, tutor: "Rahimov D.", status: "active" },
  { id: 2, name: "AT-201", course: 2, direction: "Axborot texnologiyalari", students: 22, tutor: "Nazarov B.", status: "active" },
  { id: 3, name: "FM-101", course: 1, direction: "Fizika-matematika", students: 20, tutor: "Karimov A.", status: "active" },
  { id: 4, name: "FM-301", course: 3, direction: "Fizika-matematika", students: 18, tutor: "Tosheva G.", status: "inactive" },
  { id: 5, name: "IQ-102", course: 1, direction: "Iqtisodiyot", students: 28, tutor: "Yusupov S.", status: "active" },
  { id: 6, name: "IQ-202", course: 2, direction: "Iqtisodiyot", students: 24, tutor: "Mirzaeva N.", status: "active" },
]

export default function GroupsPage() {
  const [search, setSearch] = useState("")
  const [openId, setOpenId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? groups.filter((g) => [g.name, g.direction, g.tutor].join(" ").toLowerCase().includes(q)) : groups
  }, [search])

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      <header className="flex flex-col gap-[15px] pt-[25px] pb-5 px-5 bg-white" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h1 className="font-medium text-[28px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Guruhlar</h1>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 px-[30px] pt-[30px]">
        {[
          { label: "Jami guruhlar", value: groups.length, color: "#012970" },
          { label: "Aktiv guruhlar", value: groups.filter((g) => g.status === "active").length, color: "#22c55e" },
          { label: "Jami talabalar", value: groups.reduce((s, g) => s + g.students, 0), color: "#1cc2dc" },
          { label: "O'rtacha talaba", value: Math.round(groups.reduce((s, g) => s + g.students, 0) / groups.length), color: "#0e58a8" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="text-3xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
            <div className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="px-[30px] pt-5 pb-[30px]">
        <div className="bg-white rounded-[5px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-[22px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Barcha guruhlar</h2>
              <div className="flex w-[33px] h-[33px] items-center justify-center rounded-full" style={{ backgroundColor: "rgba(114,147,185,0.2)" }}>
                <span className="font-semibold text-lg" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{groups.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <label className="w-[350px] px-2.5 py-2 rounded-[5px] border flex items-center" style={{ borderColor: "rgba(1,41,112,0.3)" }}>
                <Search className="w-5 h-5 shrink-0" style={{ color: "#7293b9" }} />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="flex-1 ml-2 bg-transparent outline-none text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
              </label>
              <button className="flex items-center gap-2 h-[42px] px-[15px] rounded-[5px] text-white text-sm" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Plus className="w-5 h-5" /> Guruh qo&apos;shish
              </button>
            </div>
          </div>

          <div className="overflow-x-auto px-2.5 pb-4">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                  {["#", "Guruh nomi", "Kurs", "Yo'nalish", "Talabalar", "Kurator", "Status", "Amal"].map((h) => (
                    <th key={h} className="px-4 py-[18px] text-left text-sm font-medium whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.id}</td>
                    <td className="px-4 h-14">
                      <span className="text-sm font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{g.name}</span>
                    </td>
                    <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.course}-kurs</td>
                    <td className="px-4 h-14 text-sm whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{g.direction}</td>
                    <td className="px-4 h-14">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" style={{ color: "#7293b9" }} />
                        <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.students}</span>
                      </div>
                    </td>
                    <td className="px-4 h-14 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{g.tutor}</td>
                    <td className="px-4 h-14">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: g.status === "active" ? "#f0fbfd" : "#f6f9ff", color: g.status === "active" ? "#1cc2dc" : "#7293b9", border: `1px solid ${g.status === "active" ? "#1cc2dc" : "#7293b9"}` }}>
                        {g.status === "active" ? "Aktiv" : "Nofaol"}
                      </span>
                    </td>
                    <td className="px-4 h-14 relative">
                      <button onClick={() => setOpenId(openId === g.id ? null : g.id)} className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff]">
                        <MoreHorizontal className="w-5 h-5" style={{ color: "#012970" }} />
                      </button>
                      {openId === g.id && (
                        <div className="absolute right-4 top-[calc(100%-4px)] z-10 bg-white rounded-[5px] overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(1,41,112,0.15)", border: "1px solid rgba(1,41,112,0.1)", minWidth: 140 }}>
                          <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-[#f6f9ff]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} onClick={() => setOpenId(null)}><Pencil className="w-4 h-4" /> Tahrirlash</button>
                          <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-red-50" style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }} onClick={() => setOpenId(null)}><Trash2 className="w-4 h-4" /> O&apos;chirish</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
