import { Calendar, Clock, MapPin, FileText, CheckCircle2, AlertCircle } from "lucide-react"

const exams = [
  { subject: "Matematika", type: "Yakuniy imtihon", date: "2024-05-20", time: "09:00", room: "Auditoriya 1", duration: "3 soat", status: "upcoming", format: "Yozma" },
  { subject: "Fizika", type: "Yakuniy imtihon", date: "2024-05-22", time: "10:00", room: "Auditoriya 3", duration: "3 soat", status: "upcoming", format: "Yozma + Amaliy" },
  { subject: "Informatika", type: "Yakuniy imtihon", date: "2024-05-24", time: "14:00", room: "Komp lab", duration: "2 soat", status: "upcoming", format: "Kompyuter" },
  { subject: "Ingliz tili", type: "Yakuniy imtihon", date: "2024-05-26", time: "09:00", room: "215-xona", duration: "2.5 soat", status: "upcoming", format: "Og'zaki + Yozma" },
  { subject: "Tarix", type: "Yakuniy imtihon", date: "2024-01-15", time: "10:00", room: "205-xona", duration: "2 soat", status: "done", score: 40, maxScore: 50, format: "Og'zaki" },
  { subject: "Falsafa", type: "Yakuniy imtihon", date: "2024-01-18", time: "11:00", room: "110-xona", duration: "2 soat", status: "done", score: 44, maxScore: 50, format: "Og'zaki" },
]

export default function Imtihonlar() {
  const upcoming = exams.filter((e) => e.status === "upcoming")
  const done = exams.filter((e) => e.status === "done")

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Imtihonlar</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Imtihon jadvali va natijalari</p>
      </div>

      {/* Upcoming banner */}
      <div className="flex items-start gap-3 p-4 rounded-[10px]" style={{ backgroundColor: "#f0f5ff", border: "1px solid rgba(14,88,168,0.3)" }}>
        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#0e58a8" }} />
        <p className="text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Yaqinlashayotgan imtihonlar: <strong>{upcoming.length} ta</strong>. Imtihon oyligi: <strong>May 2024</strong>
        </p>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="text-lg font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Kelgusi imtihonlar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcoming.map((e, i) => (
            <div key={i} className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-base" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{e.subject}</h3>
                  <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{e.type} · {e.format}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: "#fff8e6", color: "#f59e0b", border: "1px solid #f59e0b" }}>Kutilmoqda</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "#1cc2dc" }} />
                  <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{e.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: "#1cc2dc" }} />
                  <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{e.time} · {e.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "#1cc2dc" }} />
                  <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{e.room}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Done */}
      <div>
        <h2 className="text-lg font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>O&apos;tgan imtihonlar</h2>
        <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          {done.map((e, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4" style={{ borderBottom: i < done.length - 1 ? "1px solid rgba(1,41,112,0.06)" : undefined }}>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" style={{ color: "#22c55e" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{e.subject}</p>
                  <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{e.date} · {e.format}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{e.score} / {e.maxScore}</span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: "#f0fbfd", color: "#1cc2dc", border: "1px solid #1cc2dc" }}>O&apos;tdi</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
