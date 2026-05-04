"use client"

import { useMemo, useState } from "react"
import { Search, Plus, ChevronUp, ChevronDown, MoreHorizontal, Pencil, Trash2, Shield } from "lucide-react"

type Admin = { id: number; fullName: string; username: string; phone: string; role: string }

const admins: Admin[] = [
  { id: 1, fullName: "Yusupov Kamol", username: "@admin_kamol", phone: "+998 (90) 111 22 33", role: "Super Admin" },
  { id: 2, fullName: "Normatova Zulfiya", username: "@admin_z", phone: "+998 (91) 222 33 44", role: "Admin" },
  { id: 3, fullName: "Qodirov Mansur", username: "@admin_mansur", phone: "+998 (93) 333 44 55", role: "Admin" },
]

export default function AdminlarPage() {
  const [search, setSearch] = useState("")
  const [openId, setOpenId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? admins.filter((a) => [a.fullName, a.username, a.phone, a.role].join(" ").toLowerCase().includes(q)) : admins
  }, [search])

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      <header className="flex flex-col gap-[15px] pt-[25px] pb-5 px-5 bg-white" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h1 className="font-medium text-[28px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Adminlar</h1>
      </header>

      <div className="p-[30px]">
        <div className="bg-white rounded-[5px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-[22px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Barcha adminlar</h2>
              <div className="flex w-[33px] h-[33px] items-center justify-center rounded-full" style={{ backgroundColor: "rgba(114,147,185,0.2)" }}>
                <span className="font-semibold text-lg" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{admins.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <label className="w-[400px] px-2.5 py-2 rounded-[5px] border flex items-center" style={{ borderColor: "rgba(1,41,112,0.3)" }}>
                <Search className="w-5 h-5 shrink-0" style={{ color: "#7293b9" }} />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="flex-1 ml-2 bg-transparent outline-none text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
              </label>
              <button className="flex items-center gap-2 h-[42px] px-[15px] rounded-[5px] text-white text-base" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Plus className="w-5 h-5" /> Admin qo&apos;shish
              </button>
            </div>
          </div>

          <div className="overflow-x-auto px-2.5 pb-4">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                  {["#", "F.I.O", "Username", "Telefon", "Rol", "Amal"].map((h) => (
                    <th key={h} className="px-4 py-[18px] text-left text-sm font-medium whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{a.id}</td>
                    <td className="px-4 h-14 text-sm font-medium whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{a.fullName}</td>
                    <td className="px-4 h-14 text-sm" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{a.username}</td>
                    <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{a.phone}</td>
                    <td className="px-4 h-14">
                      <div className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-[10px] border" style={{ backgroundColor: a.role === "Super Admin" ? "#fff8e6" : "#f6f9ff", borderColor: a.role === "Super Admin" ? "#f59e0b" : "#1cc2dc" }}>
                        <Shield className="w-3.5 h-3.5" style={{ color: a.role === "Super Admin" ? "#f59e0b" : "#1cc2dc" }} />
                        <span className="text-xs font-semibold" style={{ color: a.role === "Super Admin" ? "#f59e0b" : "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{a.role}</span>
                      </div>
                    </td>
                    <td className="px-4 h-14 relative">
                      <button onClick={() => setOpenId(openId === a.id ? null : a.id)} className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff]">
                        <MoreHorizontal className="w-5 h-5" style={{ color: "#012970" }} />
                      </button>
                      {openId === a.id && (
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
