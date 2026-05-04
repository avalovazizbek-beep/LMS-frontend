"use client"

import { useMemo, useState } from "react"
import { Search, Plus, MoreHorizontal, Pencil, Trash2, ShoppingBag } from "lucide-react"

type Seller = { id: number; fullName: string; username: string; phone: string; sales: number; status: "active" | "inactive" }

const sellers: Seller[] = [
  { id: 1, fullName: "Rahimov Nodir", username: "@seller_nodir", phone: "+998 (90) 444 55 66", sales: 142, status: "active" },
  { id: 2, fullName: "Mirzaeva Gulnora", username: "@seller_gul", phone: "+998 (91) 555 66 77", sales: 98, status: "active" },
  { id: 3, fullName: "Tursunov Bekzod", username: "@seller_bek", phone: "+998 (93) 666 77 88", sales: 73, status: "inactive" },
  { id: 4, fullName: "Xolmatova Shahnoza", username: "@seller_shax", phone: "+998 (99) 777 88 99", sales: 211, status: "active" },
]

export default function SotuvchilarPage() {
  const [search, setSearch] = useState("")
  const [openId, setOpenId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? sellers.filter((s) => [s.fullName, s.username, s.phone].join(" ").toLowerCase().includes(q)) : sellers
  }, [search])

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      <header className="flex flex-col gap-[15px] pt-[25px] pb-5 px-5 bg-white" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h1 className="font-medium text-[28px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Sotuvchilar</h1>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5 px-[30px] pt-[30px]">
        {[
          { label: "Jami sotuvchilar", value: sellers.length, color: "#012970" },
          { label: "Aktiv", value: sellers.filter((s) => s.status === "active").length, color: "#22c55e" },
          { label: "Jami savdo", value: sellers.reduce((s, sel) => s + sel.sales, 0), color: "#1cc2dc" },
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
              <h2 className="font-medium text-[22px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Barcha sotuvchilar</h2>
              <div className="flex w-[33px] h-[33px] items-center justify-center rounded-full" style={{ backgroundColor: "rgba(114,147,185,0.2)" }}>
                <span className="font-semibold text-lg" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{sellers.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <label className="w-[350px] px-2.5 py-2 rounded-[5px] border flex items-center" style={{ borderColor: "rgba(1,41,112,0.3)" }}>
                <Search className="w-5 h-5 shrink-0" style={{ color: "#7293b9" }} />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="flex-1 ml-2 bg-transparent outline-none text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
              </label>
              <button className="flex items-center gap-2 h-[42px] px-[15px] rounded-[5px] text-white text-sm" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Plus className="w-5 h-5" /> Sotuvchi qo&apos;shish
              </button>
            </div>
          </div>
          <div className="overflow-x-auto px-2.5 pb-4">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                  {["#", "F.I.O", "Username", "Telefon", "Savdolar", "Status", "Amal"].map((h) => (
                    <th key={h} className="px-4 py-[18px] text-left text-sm font-medium whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.id}</td>
                    <td className="px-4 h-14 text-sm font-medium whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.fullName}</td>
                    <td className="px-4 h-14 text-sm" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{s.username}</td>
                    <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.phone}</td>
                    <td className="px-4 h-14">
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4" style={{ color: "#7293b9" }} />
                        <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.sales}</span>
                      </div>
                    </td>
                    <td className="px-4 h-14">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: s.status === "active" ? "#f0fbfd" : "#f6f9ff", color: s.status === "active" ? "#1cc2dc" : "#7293b9", border: `1px solid ${s.status === "active" ? "#1cc2dc" : "#7293b9"}` }}>
                        {s.status === "active" ? "Aktiv" : "Nofaol"}
                      </span>
                    </td>
                    <td className="px-4 h-14 relative">
                      <button onClick={() => setOpenId(openId === s.id ? null : s.id)} className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff]">
                        <MoreHorizontal className="w-5 h-5" style={{ color: "#012970" }} />
                      </button>
                      {openId === s.id && (
                        <div className="absolute right-4 top-[calc(100%-4px)] z-10 bg-white rounded-[5px]" style={{ boxShadow: "0 4px 20px rgba(1,41,112,0.15)", border: "1px solid rgba(1,41,112,0.1)", minWidth: 140 }}>
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
