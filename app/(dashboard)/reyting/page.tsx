import { Trophy, TrendingUp, Medal, Star } from "lucide-react"

const ratings = [
  { rank: 1, name: "Aliyeva Zulfiya", group: "MT-21", gpa: 4.0, score: 98.5 },
  { rank: 2, name: "Karimov Bobur", group: "MT-21", gpa: 3.95, score: 97.2 },
  { rank: 3, name: "Rahimov Sardor", group: "MT-21", gpa: 3.9, score: 96.1 },
  { rank: 4, name: "Toshmatov Jasur", group: "MT-21", gpa: 3.85, score: 95.4, isCurrentUser: true },
  { rank: 5, name: "Nazarova Dilnoza", group: "MT-21", gpa: 3.8, score: 94.7 },
  { rank: 6, name: "Umarov Sherzod", group: "MT-21", gpa: 3.75, score: 93.8 },
  { rank: 7, name: "Xasanova Malika", group: "MT-21", gpa: 3.7, score: 92.5 },
  { rank: 8, name: "Ismoilov Temur", group: "MT-21", gpa: 3.65, score: 91.3 },
  { rank: 9, name: "Qodirov Nodir", group: "MT-21", gpa: 3.6, score: 90.1 },
  { rank: 10, name: "Yunusova Feruza", group: "MT-21", gpa: 3.55, score: 89.4 },
]

const rankColors = [
  { bg: "#fff8e6", color: "#f59e0b", border: "#f59e0b" },
  { bg: "#f6f9ff", color: "#7293b9", border: "#7293b9" },
  { bg: "#fff0f0", color: "#ef4444", border: "#ef4444" },
]

export default function Reyting() {
  const me = ratings.find((r) => r.isCurrentUser)

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Reyting Darjasi</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>MT-21 guruh reytingi</p>
      </div>

      {/* My position */}
      {me && (
        <div className="bg-white rounded-[10px] p-5 flex items-center justify-between gap-4 flex-wrap" style={{ border: "2px solid #1cc2dc" }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg" style={{ backgroundColor: "#0e58a8" }}>
              {me.rank}
            </div>
            <div>
              <p className="font-semibold text-base" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Sizning o&apos;rningiz: <strong>#{me.rank}</strong></p>
              <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>GPA: {me.gpa} · Umumiy ball: {me.score}</p>
            </div>
          </div>
          <Star className="w-8 h-8" style={{ color: "#1cc2dc" }} />
        </div>
      )}

      {/* Top 3 */}
      <div className="grid grid-cols-3 gap-4">
        {ratings.slice(0, 3).map((r, i) => {
          const rc = rankColors[i]
          const icons = [Trophy, Medal, Medal]
          const Icon = icons[i]
          return (
            <div key={r.rank} className="bg-white rounded-[10px] p-5 text-center" style={{ border: `1px solid ${rc.border}`, backgroundColor: i === 0 ? "#fff8e6" : "#fff" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: rc.bg }}>
                <Icon className="w-5 h-5" style={{ color: rc.color }} />
              </div>
              <p className="font-semibold text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{r.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>GPA: {r.gpa}</p>
              <div className="mt-2 text-lg font-bold" style={{ color: rc.color, fontFamily: "var(--font-poppins)" }}>{r.score}</div>
            </div>
          )
        })}
      </div>

      {/* Full list */}
      <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
          <h2 className="text-lg font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>To&apos;liq reyting</h2>
        </div>
        {ratings.map((r) => (
          <div key={r.rank} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[#f6f9ff]/50" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)", backgroundColor: r.isCurrentUser ? "rgba(28,194,220,0.06)" : undefined }}>
            <div className="flex items-center gap-3">
              <span className="w-8 text-center text-sm font-semibold" style={{ color: r.rank <= 3 ? rankColors[r.rank - 1].color : "#7293b9", fontFamily: "var(--font-poppins)" }}>#{r.rank}</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-medium text-white text-xs shrink-0" style={{ backgroundColor: r.isCurrentUser ? "#1cc2dc" : "#0e58a8" }}>
                {r.name.charAt(0)}
              </div>
              <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{r.name} {r.isCurrentUser && <span style={{ color: "#1cc2dc" }}>(Siz)</span>}</p>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>GPA: <strong style={{ color: "#012970" }}>{r.gpa}</strong></span>
              <span className="text-sm font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{r.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
