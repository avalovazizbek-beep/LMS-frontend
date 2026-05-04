import { BookOpen, Clock, CheckCircle2, Circle } from "lucide-react"

const subjects = [
  { name: "Matematika", credits: 5, type: "Majburiy", teacher: "Prof. Karimov A.", hours: 90, status: "active" },
  { name: "Fizika", credits: 4, type: "Majburiy", teacher: "Prof. Nazarov B.", hours: 72, status: "active" },
  { name: "Informatika", credits: 3, type: "Tanlov", teacher: "Dos. Rahimov D.", hours: 54, status: "active" },
  { name: "Ingliz tili", credits: 3, type: "Majburiy", teacher: "Dos. Tosheva G.", hours: 54, status: "active" },
  { name: "Tarix", credits: 2, type: "Majburiy", teacher: "Prof. Usmonov I.", hours: 36, status: "completed" },
  { name: "Falsafa", credits: 2, type: "Majburiy", teacher: "Dos. Qodirov M.", hours: 36, status: "completed" },
]

export default function OqishRejasi() {
  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          O&apos;qish Rejasi
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          2023–2024 o&apos;quv yili, 2-semestr
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Jami fanlar", value: "6", icon: BookOpen, color: "#0e58a8" },
          { label: "Jami kreditlar", value: "19", icon: CheckCircle2, color: "#1cc2dc" },
          { label: "Haftalik soatlar", value: "26", icon: Clock, color: "#012970" },
          { label: "Bajarilgan", value: "2", icon: Circle, color: "#7293b9" },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
              <div className="flex items-center justify-between mb-3">
                <Icon className="w-6 h-6" style={{ color: s.color }} />
              </div>
              <div className="text-3xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.value}</div>
              <div className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* Subject list */}
      <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
          <h2 className="text-lg font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Fanlar ro&apos;yxati</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                {["#", "Fan nomi", "Kredit", "Turi", "O'qituvchi", "Soatlar", "Holat"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <tr key={s.name} className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.name}</td>
                  <td className="px-4 py-3 text-sm text-center font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{s.credits}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: s.type === "Majburiy" ? "#f0f5ff" : "#f0fbfd", color: s.type === "Majburiy" ? "#0e58a8" : "#1cc2dc" }}>{s.type}</span>
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.teacher}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.hours}h</td>
                  <td className="px-4 py-3">
                    {s.status === "active"
                      ? <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: "#f0fbfd", color: "#1cc2dc", border: "1px solid #1cc2dc" }}>Aktiv</span>
                      : <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", border: "1px solid #0e58a8" }}>Bajarildi</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
