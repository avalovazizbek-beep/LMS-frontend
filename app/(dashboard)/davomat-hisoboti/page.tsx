import { CheckCircle2, XCircle, MinusCircle, TrendingUp, TrendingDown, Users, Calendar } from "lucide-react"

const subjects = [
  { id: 1, name: "Matematika", teacher: "Karimov A.", total: 28, attended: 26, missed: 2 },
  { id: 2, name: "Fizika", teacher: "Nazarov B.", total: 20, attended: 17, missed: 3 },
  { id: 3, name: "Ingliz tili", teacher: "Tosheva G.", total: 24, attended: 24, missed: 0 },
  { id: 4, name: "Informatika", teacher: "Rahimov D.", total: 30, attended: 25, missed: 5 },
  { id: 5, name: "Kimyo", teacher: "Yusupov S.", total: 16, attended: 12, missed: 4 },
]

const recentLog = [
  { date: "2024-04-10", subject: "Matematika", status: "present" as const, time: "08:00" },
  { date: "2024-04-10", subject: "Fizika", status: "present" as const, time: "10:00" },
  { date: "2024-04-10", subject: "Ingliz tili", status: "absent" as const, time: "12:00" },
  { date: "2024-04-09", subject: "Informatika", status: "present" as const, time: "09:00" },
  { date: "2024-04-09", subject: "Kimyo", status: "excused" as const, time: "11:00" },
  { date: "2024-04-08", subject: "Matematika", status: "present" as const, time: "08:00" },
  { date: "2024-04-08", subject: "Fizika", status: "absent" as const, time: "10:00" },
]

const totalAttended = subjects.reduce((s, x) => s + x.attended, 0)
const totalClasses  = subjects.reduce((s, x) => s + x.total, 0)
const overallPct    = Math.round((totalAttended / totalClasses) * 100)

export default function DavomatHisobotiPage() {
  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Davomat hisoboti</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>2023–2024 o'quv yili, Bahor semestri</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: "Umumiy davomat", value: `${overallPct}%`, color: overallPct >= 85 ? "#22c55e" : "#ef4444", Icon: TrendingUp },
          { label: "Qatnashilgan", value: totalAttended, color: "#1cc2dc", Icon: CheckCircle2 },
          { label: "Qatnashilmagan", value: totalClasses - totalAttended, color: "#ef4444", Icon: XCircle },
          { label: "Jami darslar", value: totalClasses, color: "#012970", Icon: Calendar },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="flex items-center justify-between mb-2">
              <s.Icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div className="text-3xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
            <div className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Per-subject breakdown */}
      <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
        <div className="p-5 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
          <Users className="w-5 h-5" style={{ color: "#7293b9" }} />
          <h2 className="font-medium text-lg" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Fanlarga ko&apos;ra davomat</h2>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {subjects.map((s) => {
            const pct = Math.round((s.attended / s.total) * 100)
            const isLow = pct < 85
            return (
              <div key={s.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.name}</span>
                    <span className="text-xs ml-2" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.teacher}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.attended}/{s.total} dars</span>
                    <span className="text-sm font-semibold w-10 text-right" style={{ color: isLow ? "#ef4444" : "#22c55e", fontFamily: "var(--font-poppins)" }}>{pct}%</span>
                    {isLow && <TrendingDown className="w-4 h-4" style={{ color: "#ef4444" }} />}
                  </div>
                </div>
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: "#f6f9ff" }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: isLow ? "#ef4444" : "#22c55e" }} />
                </div>
                {isLow && (
                  <p className="text-xs mt-1" style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }}>
                    Ogohlantirish: davomat 85% dan past ({s.missed} dars o&apos;tkazildi)
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent log */}
      <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="p-5" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
          <h2 className="font-medium text-lg" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>So&apos;nggi davomat</h2>
        </div>
        {recentLog.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: i < recentLog.length - 1 ? "1px solid rgba(1,41,112,0.06)" : undefined }}
          >
            <div className="flex items-center gap-3">
              {r.status === "present" ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#22c55e" }} />
              ) : r.status === "absent" ? (
                <XCircle className="w-5 h-5 shrink-0" style={{ color: "#ef4444" }} />
              ) : (
                <MinusCircle className="w-5 h-5 shrink-0" style={{ color: "#f59e0b" }} />
              )}
              <div>
                <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{r.subject}</p>
                <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{r.date} · {r.time}</p>
              </div>
            </div>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: r.status === "present" ? "#f0fff4" : r.status === "absent" ? "#fff0f0" : "#fff8e6",
                color: r.status === "present" ? "#22c55e" : r.status === "absent" ? "#ef4444" : "#f59e0b",
              }}
            >
              {r.status === "present" ? "Qatnashdi" : r.status === "absent" ? "Kelmadi" : "Uzrli"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
