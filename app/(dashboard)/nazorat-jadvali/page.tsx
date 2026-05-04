import { Calendar, Clock, FileText, AlertCircle } from "lucide-react"

const controls = [
  { subject: "Matematika", type: "Oraliq nazorat", date: "2024-04-15", time: "10:00", room: "311-xona", status: "upcoming", maxScore: 30 },
  { subject: "Fizika", type: "Mustaqil ish", date: "2024-04-18", time: "09:00", room: "Lab-1", status: "upcoming", maxScore: 20 },
  { subject: "Ingliz tili", type: "Test", date: "2024-04-20", time: "14:00", room: "215-xona", status: "upcoming", maxScore: 15 },
  { subject: "Informatika", type: "Laboratoriya ishi", date: "2024-04-10", time: "10:00", room: "Komp lab", status: "done", score: 18, maxScore: 20 },
  { subject: "Tarix", type: "Referат", date: "2024-04-05", time: "09:00", room: "205-xona", status: "done", score: 14, maxScore: 20 },
  { subject: "Falsafa", type: "Oraliq nazorat", date: "2024-03-28", time: "11:00", room: "110-xona", status: "done", score: 27, maxScore: 30 },
]

const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  upcoming: { label: "Kutilmoqda", bg: "#fff8e6", color: "#f59e0b", border: "#f59e0b" },
  done: { label: "Bajarildi", bg: "#f0fbfd", color: "#1cc2dc", border: "#1cc2dc" },
}

export default function NazoratJadvali() {
  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Nazorat Jadvali</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Joriy semestr nazorat tadbirlari</p>
      </div>

      {/* Alert */}
      <div className="flex items-start gap-3 p-4 rounded-[10px]" style={{ backgroundColor: "#fff8e6", border: "1px solid #f59e0b" }}>
        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#f59e0b" }} />
        <p className="text-sm" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
          Yaqinlashayotgan nazoratlar: <strong>3 ta</strong>. Tayyorgarlik ko&apos;rishni unutmang!
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4">
        {controls.map((c, i) => {
          const st = statusConfig[c.status]
          return (
            <div key={i} className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#f6f9ff" }}>
                    <FileText className="w-5 h-5" style={{ color: "#0e58a8" }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{c.subject}</h3>
                    <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{c.type}</p>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" style={{ color: "#1cc2dc" }} />
                        <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{c.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" style={{ color: "#1cc2dc" }} />
                        <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{c.time}</span>
                      </div>
                      <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{c.room}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
                  {c.status === "done" && c.score !== undefined && (
                    <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {c.score} / {c.maxScore}
                    </span>
                  )}
                  {c.status === "upcoming" && (
                    <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Max: {c.maxScore} ball</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
