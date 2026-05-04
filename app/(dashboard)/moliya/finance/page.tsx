"use client"

import { useMemo, useState } from "react"
import { Search, Plus, MoreHorizontal, Pencil, Trash2, CreditCard, TrendingUp, TrendingDown, DollarSign } from "lucide-react"

type PaymentStatus = "paid" | "pending" | "overdue" | "partial"

type Payment = {
  id: number
  student: string
  group: string
  semester: number
  total: number
  paid: number
  dueDate: string
  status: PaymentStatus
}

const payments: Payment[] = [
  { id: 1, student: "Aliyev Jasur", group: "AT-101", semester: 1, total: 4500000, paid: 4500000, dueDate: "2024-02-01", status: "paid" },
  { id: 2, student: "Karimova Dilnoza", group: "AT-201", semester: 2, total: 4500000, paid: 2250000, dueDate: "2024-03-15", status: "partial" },
  { id: 3, student: "Toshmatov Behruz", group: "FM-101", semester: 1, total: 3800000, paid: 0, dueDate: "2024-02-28", status: "overdue" },
  { id: 4, student: "Nazarova Shahlo", group: "IQ-102", semester: 2, total: 3200000, paid: 3200000, dueDate: "2024-03-01", status: "paid" },
  { id: 5, student: "Rустамов Sherzod", group: "FM-301", semester: 3, total: 4000000, paid: 0, dueDate: "2024-04-30", status: "pending" },
  { id: 6, student: "Mirzayeva Feruza", group: "IQ-202", semester: 2, total: 3200000, paid: 1600000, dueDate: "2024-03-20", status: "partial" },
]

const statusConfig: Record<PaymentStatus, { label: string; bg: string; color: string; border: string }> = {
  paid:    { label: "To'landi",    bg: "#f0fbfd", color: "#1cc2dc", border: "#1cc2dc" },
  pending: { label: "Kutilmoqda", bg: "#fff8e6", color: "#f59e0b", border: "#f59e0b" },
  overdue: { label: "Muddati o'tdi", bg: "#fff0f0", color: "#ef4444", border: "#ef4444" },
  partial: { label: "Qisman",     bg: "#f0f5ff", color: "#0e58a8", border: "#0e58a8" },
}

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(n) + " so'm"
}

export default function FinancePage() {
  const [search, setSearch] = useState("")
  const [openId, setOpenId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? payments.filter((p) => [p.student, p.group].join(" ").toLowerCase().includes(q)) : payments
  }, [search])

  const totalRevenue = payments.reduce((s, p) => s + p.total, 0)
  const totalPaid = payments.reduce((s, p) => s + p.paid, 0)
  const totalDebt = totalRevenue - totalPaid

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      <header className="flex flex-col gap-[15px] pt-[25px] pb-5 px-5 bg-white" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h1 className="font-medium text-[28px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Moliya</h1>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 px-[30px] pt-[30px]">
        {[
          { label: "Umumiy kontrakt", value: fmt(totalRevenue), color: "#012970", Icon: DollarSign },
          { label: "To'langan", value: fmt(totalPaid), color: "#22c55e", Icon: TrendingUp },
          { label: "Qoldiq qarz", value: fmt(totalDebt), color: "#ef4444", Icon: TrendingDown },
          { label: "To'liq to'lagan", value: payments.filter((p) => p.status === "paid").length, color: "#1cc2dc", Icon: CreditCard },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#f6f9ff" }}>
                <s.Icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
            </div>
            <div className="text-xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
            <div className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="px-[30px] pt-5">
        <div className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Umumiy to&apos;lov holati</p>
            <p className="text-sm font-semibold" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{Math.round((totalPaid / totalRevenue) * 100)}%</p>
          </div>
          <div className="w-full h-2 rounded-full" style={{ backgroundColor: "#f6f9ff" }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${(totalPaid / totalRevenue) * 100}%`, backgroundColor: "#1cc2dc" }} />
          </div>
        </div>
      </div>

      <div className="px-[30px] pt-5 pb-[30px]">
        <div className="bg-white rounded-[5px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-[22px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>To&apos;lov tarixi</h2>
              <div className="flex w-[33px] h-[33px] items-center justify-center rounded-full" style={{ backgroundColor: "rgba(114,147,185,0.2)" }}>
                <span className="font-semibold text-lg" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{payments.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <label className="w-[350px] px-2.5 py-2 rounded-[5px] border flex items-center" style={{ borderColor: "rgba(1,41,112,0.3)" }}>
                <Search className="w-5 h-5 shrink-0" style={{ color: "#7293b9" }} />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="flex-1 ml-2 bg-transparent outline-none text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
              </label>
              <button className="flex items-center gap-2 h-[42px] px-[15px] rounded-[5px] text-white text-sm" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Plus className="w-5 h-5" /> To&apos;lov qo&apos;shish
              </button>
            </div>
          </div>

          <div className="overflow-x-auto px-2.5 pb-4">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                  {["#", "Talaba", "Guruh", "Semestr", "Jami summa", "To'langan", "Qoldiq", "Muddat", "Status", "Amal"].map((h) => (
                    <th key={h} className="px-4 py-[18px] text-left text-sm font-medium whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const sc = statusConfig[p.status]
                  return (
                    <tr key={p.id} className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                      <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{p.id}</td>
                      <td className="px-4 h-14 text-sm font-medium whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{p.student}</td>
                      <td className="px-4 h-14 text-sm font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{p.group}</td>
                      <td className="px-4 h-14 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{p.semester}-semestr</td>
                      <td className="px-4 h-14 text-sm font-medium whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{fmt(p.total)}</td>
                      <td className="px-4 h-14 text-sm font-medium whitespace-nowrap" style={{ color: "#22c55e", fontFamily: "var(--font-poppins)" }}>{fmt(p.paid)}</td>
                      <td className="px-4 h-14 text-sm font-medium whitespace-nowrap" style={{ color: p.total - p.paid > 0 ? "#ef4444" : "#7293b9", fontFamily: "var(--font-poppins)" }}>{fmt(p.total - p.paid)}</td>
                      <td className="px-4 h-14 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{p.dueDate}</td>
                      <td className="px-4 h-14">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 h-14 relative">
                        <button onClick={() => setOpenId(openId === p.id ? null : p.id)} className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff]">
                          <MoreHorizontal className="w-5 h-5" style={{ color: "#012970" }} />
                        </button>
                        {openId === p.id && (
                          <div className="absolute right-4 top-[calc(100%-4px)] z-10 bg-white rounded-[5px] overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(1,41,112,0.15)", border: "1px solid rgba(1,41,112,0.1)", minWidth: 140 }}>
                            <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-[#f6f9ff]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} onClick={() => setOpenId(null)}><Pencil className="w-4 h-4" /> Tahrirlash</button>
                            <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-red-50" style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }} onClick={() => setOpenId(null)}><Trash2 className="w-4 h-4" /> O&apos;chirish</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
