import { Video, Clock, Users, Calendar, ExternalLink, CheckCircle2 } from "lucide-react"

const upcomingMeetings = [
  { id: 1, title: "Matematika — Oraliq muhokama", subject: "Matematika", host: "Prof. Karimov A.", date: "2024-04-15", time: "10:00", duration: "60 daqiqa", participants: 24, link: "#", status: "upcoming" },
  { id: 2, title: "Fizika laboratoriya taqdimoti", subject: "Fizika", host: "Prof. Nazarov B.", date: "2024-04-17", time: "14:00", duration: "90 daqiqa", participants: 18, link: "#", status: "upcoming" },
  { id: 3, title: "Ingliz tili — Speaking Practice", subject: "Ingliz tili", host: "Dos. Tosheva G.", date: "2024-04-18", time: "09:00", duration: "45 daqiqa", participants: 12, link: "#", status: "upcoming" },
]

const pastMeetings = [
  { id: 4, title: "Informatika: Python loyihasi", subject: "Informatika", host: "Dos. Rahimov D.", date: "2024-04-08", time: "11:00", duration: "75 daqiqa", participants: 20, status: "done" },
  { id: 5, title: "Guruh yig'ilishi — Dekanat", subject: "Umumiy", host: "Dekan Yusupov K.", date: "2024-04-05", time: "15:00", duration: "30 daqiqa", participants: 35, status: "done" },
]

export default function Meeting() {
  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Yig&apos;ilishlar</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Onlayn darslar va yig&apos;ilishlar</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: "Kelgusi yig'ilishlar", value: upcomingMeetings.length, color: "#0e58a8" },
          { label: "Jami qatnashgan", value: 12, color: "#22c55e" },
          { label: "O'tkazib yuborilgan", value: 1, color: "#ef4444" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-[10px] p-5 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="text-3xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
            <div className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Upcoming meetings */}
      <div>
        <h2 className="text-lg font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Kelgusi yig&apos;ilishlar</h2>
        <div className="flex flex-col gap-4">
          {upcomingMeetings.map((m) => (
            <div key={m.id} className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#f0f5ff" }}>
                    <Video className="w-6 h-6" style={{ color: "#0e58a8" }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{m.title}</h3>
                    <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{m.host}</p>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" style={{ color: "#1cc2dc" }} />
                        <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{m.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" style={{ color: "#1cc2dc" }} />
                        <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{m.time} · {m.duration}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" style={{ color: "#1cc2dc" }} />
                        <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{m.participants} ishtirokchi</span>
                      </div>
                    </div>
                  </div>
                </div>
                <a
                  href={m.link}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-[5px] text-white text-sm font-medium transition-opacity hover:opacity-90 shrink-0"
                  style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Qo&apos;shilish
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past meetings */}
      <div>
        <h2 className="text-lg font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>O&apos;tgan yig&apos;ilishlar</h2>
        <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          {pastMeetings.map((m, i) => (
            <div key={m.id} className="flex items-center justify-between px-5 py-4" style={{ borderBottom: i < pastMeetings.length - 1 ? "1px solid rgba(1,41,112,0.06)" : undefined }}>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#22c55e" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{m.title}</p>
                  <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{m.date} · {m.time} · {m.duration}</p>
                </div>
              </div>
              <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{m.participants} kishi</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
