"use client"

import { useMemo, useState } from "react"
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Calendar, Clock, BookOpen } from "lucide-react"

type ExamStatus = "scheduled" | "ongoing" | "completed" | "cancelled"

type Exam = {
  id: number
  subject: string
  group: string
  date: string
  time: string
  duration: string
  room: string
  teacher: string
  type: "Yozma" | "Og'zaki" | "Test"
  status: ExamStatus
}

const exams: Exam[] = [
  { id: 1, subject: "Matematika", group: "AT-101", date: "2024-05-20", time: "09:00", duration: "2 soat", room: "101-xona", teacher: "Karimov A.", type: "Yozma", status: "scheduled" },
  { id: 2, subject: "Fizika", group: "FM-101", date: "2024-05-22", time: "11:00", duration: "1.5 soat", room: "Lab-1", teacher: "Nazarov B.", type: "Test", status: "scheduled" },
  { id: 3, subject: "Ingliz tili", group: "AT-201", date: "2024-05-18", time: "14:00", duration: "1 soat", room: "205-xona", teacher: "Tosheva G.", type: "Og'zaki", status: "ongoing" },
  { id: 4, subject: "Informatika", group: "IQ-102", date: "2024-05-15", time: "10:00", duration: "2 soat", room: "Komp-1", teacher: "Rahimov D.", type: "Test", status: "completed" },
  { id: 5, subject: "Kimyo", group: "FM-301", date: "2024-05-10", time: "09:00", duration: "2 soat", room: "Lab-2", teacher: "Yusupov S.", type: "Yozma", status: "completed" },
  { id: 6, subject: "Iqtisodiyot", group: "IQ-202", date: "2024-05-25", time: "13:00", duration: "2 soat", room: "301-xona", teacher: "Mirzaeva N.", type: "Yozma", status: "cancelled" },
]

const statusConfig: Record<ExamStatus, { label: string; bg: string; color: string; border: string }> = {
  scheduled: { label: "Rejalashtirilgan", bg: "#f0f5ff", color: "#0e58a8", border: "#0e58a8" },
  ongoing:   { label: "Davom etmoqda",    bg: "#fff8e6",  color: "#f59e0b", border: "#f59e0b" },
  completed: { label: "Yakunlandi",       bg: "#f0fbfd",  color: "#1cc2dc", border: "#1cc2dc" },
  cancelled: { label: "Bekor qilindi",   bg: "#fff0f0",  color: "#ef4444", border: "#ef4444" },
}

const typeColors: Record<string, { bg: string; color: string }> = {
  "Yozma":   { bg: "#f0f5ff", color: "#0e58a8" },
  "Og'zaki": { bg: "#fff8e6", color: "#f59e0b" },
  "Test":    { bg: "#f0fbfd", color: "#1cc2dc" },
}

export default function ExamsPage() {
  const [search, setSearch] = useState("")
  const [openId, setOpenId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? exams.filter((e) => [e.subject, e.group, e.teacher, e.room].join(" ").toLowerCase().includes(q)) : exams
  }, [search])

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      <header className="flex flex-col gap-[15px] pt-[25px] pb-5 px-5 bg-white" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h1 className="font-medium text-[28px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Imtihonlar</h1>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 px-[30px] pt-[30px]">
        {[
          { label: "Jami imtihonlar", value: exams.length, color: "#012970" },
          { label: "Rejalashtirilgan", value: exams.filter((e) => e.status === "scheduled").length, color: "#0e58a8" },
          { label: "Yakunlandi", value: exams.filter((e) => e.status === "completed").length, color: "#1cc2dc" },
          { label: "Davom etmoqda", value: exams.filter((e) => e.status === "ongoing").length, color: "#f59e0b" },
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
              <h2 className="font-medium text-[22px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Barcha imtihonlar</h2>
              <div className="flex w-[33px] h-[33px] items-center justify-center rounded-full" style={{ backgroundColor: "rgba(114,147,185,0.2)" }}>
                <span className="font-semibold text-lg" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{exams.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <label className="w-[350px] px-2.5 py-2 rounded-[5px] border flex items-center" style={{ borderColor: "rgba(1,41,112,0.3)" }}>
                <Search className="w-5 h-5 shrink-0" style={{ color: "#7293b9" }} />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="flex-1 ml-2 bg-transparent outline-none text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
              </label>
              <button className="flex items-center gap-2 h-[42px] px-[15px] rounded-[5px] text-white text-sm" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Plus className="w-5 h-5" /> Imtihon qo&apos;shish
              </button>
            </div>
          </div>

          <div className="overflow-x-auto px-2.5 pb-4">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                  {["#", "Fan", "Guruh", "Sana", "Vaqt", "Davomiylik", "Xona", "O'qituvchi", "Tur", "Status", "Amal"].map((h) => (
                    <th key={h} className="px-4 py-[18px] text-left text-sm font-medium whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const sc = statusConfig[e.status]
                  const tc = typeColors[e.type]
                  return (
                    <tr key={e.id} className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                      <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{e.id}</td>
                      <td className="px-4 h-14">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 shrink-0" style={{ color: "#7293b9" }} />
                          <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{e.subject}</span>
                        </div>
                      </td>
                      <td className="px-4 h-14 text-sm font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{e.group}</td>
                      <td className="px-4 h-14">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
                          <span className="text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{e.date}</span>
                        </div>
                      </td>
                      <td className="px-4 h-14">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
                          <span className="text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{e.time}</span>
                        </div>
                      </td>
                      <td className="px-4 h-14 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{e.duration}</td>
                      <td className="px-4 h-14 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{e.room}</td>
                      <td className="px-4 h-14 text-sm whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{e.teacher}</td>
                      <td className="px-4 h-14">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: tc.bg, color: tc.color }}>
                          {e.type}
                        </span>
                      </td>
                      <td className="px-4 h-14">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 h-14 relative">
                        <button onClick={() => setOpenId(openId === e.id ? null : e.id)} className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff]">
                          <MoreHorizontal className="w-5 h-5" style={{ color: "#012970" }} />
                        </button>
                        {openId === e.id && (
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
