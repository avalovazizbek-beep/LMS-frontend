import { CheckCircle2, XCircle, MinusCircle, TrendingDown, AlertCircle } from "lucide-react"

const attendanceData = [
  { subject: "Matematika", total: 30, attended: 28, missed: 2, percentage: 93 },
  { subject: "Fizika", total: 24, attended: 22, missed: 2, percentage: 92 },
  { subject: "Informatika", total: 18, attended: 18, missed: 0, percentage: 100 },
  { subject: "Ingliz tili", total: 18, attended: 14, missed: 4, percentage: 78 },
  { subject: "Tarix", total: 12, attended: 10, missed: 2, percentage: 83 },
  { subject: "Falsafa", total: 12, attended: 11, missed: 1, percentage: 92 },
]

const recentAttendance = [
  { date: "2024-04-08", subject: "Matematika", status: "present" },
  { date: "2024-04-08", subject: "Fizika", status: "present" },
  { date: "2024-04-09", subject: "Informatika", status: "present" },
  { date: "2024-04-09", subject: "Ingliz tili", status: "absent" },
  { date: "2024-04-10", subject: "Matematika", status: "present" },
  { date: "2024-04-10", subject: "Tarix", status: "excused" },
  { date: "2024-04-11", subject: "Fizika", status: "absent" },
]

const statusConfig = {
  present: { icon: CheckCircle2, color: "#22c55e", label: "Keldi" },
  absent: { icon: XCircle, color: "#ef4444", label: "Kelmadi" },
  excused: { icon: MinusCircle, color: "#f59e0b", label: "Uzrli" },
}

export default function Davomat() {
  const totalClasses = attendanceData.reduce((s, d) => s + d.total, 0)
  const totalAttended = attendanceData.reduce((s, d) => s + d.attended, 0)
  const overallPct = Math.round((totalAttended / totalClasses) * 100)

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Davomat</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>2-semestr davomati</p>
      </div>

      {/* Warning */}
      {overallPct < 85 && (
        <div className="flex items-start gap-3 p-4 rounded-[10px]" style={{ backgroundColor: "#fff0f0", border: "1px solid #ef4444" }}>
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#ef4444" }} />
          <p className="text-sm" style={{ color: "#7f1d1d", fontFamily: "var(--font-poppins)" }}>
            Davomat foizi <strong>85%</strong> dan past. Imtihonga kirish xavf ostida!
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Jami darslar", value: totalClasses, color: "#012970" },
          { label: "Qatnashdi", value: totalAttended, color: "#22c55e" },
          { label: "Qoldirildi", value: totalClasses - totalAttended, color: "#ef4444" },
          { label: "Davomat %", value: `${overallPct}%`, color: overallPct >= 85 ? "#1cc2dc" : "#ef4444" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-[10px] p-5 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="text-3xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
            <div className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Per subject */}
        <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
            <h2 className="text-lg font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Fanlar bo&apos;yicha</h2>
          </div>
          <div className="flex flex-col divide-y" style={{ borderColor: "rgba(1,41,112,0.06)" }}>
            {attendanceData.map((d) => (
              <div key={d.subject} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{d.subject}</span>
                  <span className="text-sm font-semibold" style={{ color: d.percentage >= 85 ? "#22c55e" : "#ef4444", fontFamily: "var(--font-poppins)" }}>{d.percentage}%</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: "rgba(1,41,112,0.08)" }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${d.percentage}%`, backgroundColor: d.percentage >= 85 ? "#1cc2dc" : "#ef4444" }} />
                </div>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Jami: {d.total}</span>
                  <span className="text-xs" style={{ color: "#22c55e", fontFamily: "var(--font-poppins)" }}>✓ {d.attended}</span>
                  {d.missed > 0 && <span className="text-xs" style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }}>✗ {d.missed}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent */}
        <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
            <h2 className="text-lg font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>So&apos;nggi darslar</h2>
          </div>
          <div className="flex flex-col divide-y" style={{ borderColor: "rgba(1,41,112,0.06)" }}>
            {recentAttendance.map((r, i) => {
              const st = statusConfig[r.status as keyof typeof statusConfig]
              const Icon = st.icon
              return (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{r.subject}</p>
                    <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{r.date}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-4 h-4" style={{ color: st.color }} />
                    <span className="text-xs font-medium" style={{ color: st.color, fontFamily: "var(--font-poppins)" }}>{st.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
