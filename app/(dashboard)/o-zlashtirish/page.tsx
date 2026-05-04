import { TrendingUp, Award, BarChart2 } from "lucide-react"

const grades = [
  { subject: "Matematika", midterm: 27, final: 0, independent: 18, total: 45, maxTotal: 100, grade: null, gpa: null },
  { subject: "Fizika", midterm: 24, final: 0, independent: 15, total: 39, maxTotal: 100, grade: null, gpa: null },
  { subject: "Informatika", midterm: 28, final: 42, independent: 19, total: 89, maxTotal: 100, grade: "A", gpa: 4.0 },
  { subject: "Ingliz tili", midterm: 22, final: 38, independent: 16, total: 76, maxTotal: 100, grade: "B+", gpa: 3.5 },
  { subject: "Tarix", midterm: 25, final: 40, independent: 17, total: 82, maxTotal: 100, grade: "A-", gpa: 3.7 },
  { subject: "Falsafa", midterm: 26, final: 44, independent: 18, total: 88, maxTotal: 100, grade: "A", gpa: 4.0 },
]

function gradeColor(g: string | null) {
  if (!g) return { bg: "#f6f9ff", color: "#7293b9", border: "rgba(1,41,112,0.2)" }
  if (g.startsWith("A")) return { bg: "#f0fbfd", color: "#1cc2dc", border: "#1cc2dc" }
  if (g.startsWith("B")) return { bg: "#f0f5ff", color: "#0e58a8", border: "#0e58a8" }
  return { bg: "#fff8e6", color: "#f59e0b", border: "#f59e0b" }
}

export default function Ozlashtirish() {
  const completedGrades = grades.filter((g) => g.grade)
  const avgGpa = completedGrades.length
    ? (completedGrades.reduce((s, g) => s + (g.gpa ?? 0), 0) / completedGrades.length).toFixed(2)
    : "—"

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>O&apos;zlashtirish</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>2-semestr baholari</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: "GPA (joriy)", value: avgGpa, icon: Award, color: "#1cc2dc" },
          { label: "Baholangan", value: completedGrades.length, icon: BarChart2, color: "#0e58a8" },
          { label: "Kutilmoqda", value: grades.length - completedGrades.length, icon: TrendingUp, color: "#7293b9" },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-[10px] p-5 flex items-center gap-4" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
              <div className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#f6f9ff" }}>
                <Icon className="w-6 h-6" style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-2xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.value}</div>
                <div className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Grades table */}
      <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
          <h2 className="text-lg font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Fanlar bo&apos;yicha baholar</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                {["Fan", "Oraliq (30)", "Yakuniy (50)", "Mustaqil (20)", "Jami (100)", "Baho", "GPA"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grades.map((g) => {
                const gc = gradeColor(g.grade)
                return (
                  <tr key={g.subject} className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.subject}</td>
                    <td className="px-4 py-3 text-sm text-center font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.midterm}</td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: g.final ? "#012970" : "#7293b9", fontFamily: "var(--font-poppins)" }}>{g.final || "—"}</td>
                    <td className="px-4 py-3 text-sm text-center font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.independent}</td>
                    <td className="px-4 py-3 text-sm text-center font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.total}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: gc.bg, color: gc.color, border: `1px solid ${gc.border}` }}>
                        {g.grade || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: g.gpa ? "#1cc2dc" : "#7293b9", fontFamily: "var(--font-poppins)" }}>{g.gpa ?? "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
