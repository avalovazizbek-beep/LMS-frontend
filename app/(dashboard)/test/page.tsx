import { Clock, BookOpen, Users, ChevronRight, CheckCircle2, AlertCircle, Lock } from "lucide-react"

type TestStatus = "available" | "upcoming" | "completed" | "locked"

type Test = {
  id: number
  title: string
  subject: string
  questions: number
  duration: number
  attempts: number
  maxAttempts: number
  score?: number
  startDate: string
  endDate: string
  status: TestStatus
}

const tests: Test[] = [
  { id: 1, title: "Matematika — Oraliq nazorat", subject: "Matematika", questions: 30, duration: 45, attempts: 0, maxAttempts: 1, startDate: "2024-04-10", endDate: "2024-04-20", status: "available" },
  { id: 2, title: "Fizika — Laboratoriya testi", subject: "Fizika", questions: 20, duration: 30, attempts: 1, maxAttempts: 2, score: 85, startDate: "2024-04-05", endDate: "2024-04-15", status: "completed" },
  { id: 3, title: "Ingliz tili — Grammar Test", subject: "Ingliz tili", questions: 40, duration: 60, attempts: 0, maxAttempts: 1, startDate: "2024-04-22", endDate: "2024-04-30", status: "upcoming" },
  { id: 4, title: "Informatika — Python asoslari", subject: "Informatika", questions: 25, duration: 40, attempts: 1, maxAttempts: 1, score: 92, startDate: "2024-03-28", endDate: "2024-04-08", status: "completed" },
  { id: 5, title: "Kimyo — Element tahlili", subject: "Kimyo", questions: 35, duration: 50, attempts: 0, maxAttempts: 2, startDate: "2024-05-01", endDate: "2024-05-10", status: "locked" },
  { id: 6, title: "Matematika — Yakuniy test", subject: "Matematika", questions: 50, duration: 90, attempts: 0, maxAttempts: 1, startDate: "2024-05-20", endDate: "2024-05-25", status: "upcoming" },
]

const statusConfig: Record<TestStatus, { label: string; bg: string; color: string; border: string }> = {
  available: { label: "Mavjud",       bg: "#f0fbfd", color: "#1cc2dc", border: "#1cc2dc" },
  upcoming:  { label: "Kutilmoqda",  bg: "#fff8e6", color: "#f59e0b", border: "#f59e0b" },
  completed: { label: "Bajarildi",   bg: "#f0fff4", color: "#22c55e", border: "#22c55e" },
  locked:    { label: "Qulflangan",  bg: "#f6f9ff", color: "#7293b9", border: "#7293b9" },
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? "#22c55e" : score >= 70 ? "#1cc2dc" : score >= 55 ? "#f59e0b" : "#ef4444"
  const bg = score >= 90 ? "#f0fff4" : score >= 70 ? "#f0fbfd" : score >= 55 ? "#fff8e6" : "#fff0f0"
  return (
    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full shrink-0" style={{ backgroundColor: bg, border: `2px solid ${color}` }}>
      <span className="text-base font-bold leading-none" style={{ color, fontFamily: "var(--font-poppins)" }}>{score}</span>
      <span className="text-[9px]" style={{ color, fontFamily: "var(--font-poppins)" }}>ball</span>
    </div>
  )
}

export default function TestListPage() {
  const available = tests.filter((t) => t.status === "available")
  const upcoming  = tests.filter((t) => t.status === "upcoming")
  const completed = tests.filter((t) => t.status === "completed")
  const locked    = tests.filter((t) => t.status === "locked")

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Testlar</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Onlayn testlar va nazorat ishlari</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: "Jami testlar", value: tests.length, color: "#012970" },
          { label: "Bajarildi", value: completed.length, color: "#22c55e" },
          { label: "Mavjud", value: available.length, color: "#1cc2dc" },
          { label: "Kutilmoqda", value: upcoming.length, color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-[10px] p-5 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="text-3xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
            <div className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Available tests */}
      {available.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            <AlertCircle className="w-5 h-5" style={{ color: "#1cc2dc" }} /> Mavjud testlar
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {available.map((t) => <TestCard key={t.id} test={t} />)}
          </div>
        </div>
      )}

      {/* Upcoming tests */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Kutilayotgan testlar</h2>
          <div className="grid grid-cols-2 gap-4">
            {upcoming.map((t) => <TestCard key={t.id} test={t} />)}
          </div>
        </div>
      )}

      {/* Completed tests */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Bajarilgan testlar</h2>
          <div className="grid grid-cols-2 gap-4">
            {completed.map((t) => <TestCard key={t.id} test={t} />)}
          </div>
        </div>
      )}

      {/* Locked tests */}
      {locked.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Qulflangan testlar</h2>
          <div className="grid grid-cols-2 gap-4">
            {locked.map((t) => <TestCard key={t.id} test={t} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function TestCard({ test: t }: { test: Test }) {
  const sc = statusConfig[t.status]
  return (
    <div className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.label}</span>
          <h3 className="font-semibold text-base mt-2 leading-snug" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t.title}</h3>
        </div>
        {t.status === "completed" && t.score !== undefined ? (
          <ScoreBadge score={t.score} />
        ) : t.status === "locked" ? (
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#f6f9ff" }}>
            <Lock className="w-5 h-5" style={{ color: "#7293b9" }} />
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
          <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{t.questions} savol</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
          <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{t.duration} daqiqa</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
          <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{t.attempts}/{t.maxAttempts} urinish</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs mb-4" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
        <span>{t.startDate} — {t.endDate}</span>
        <span>{t.subject}</span>
      </div>

      {t.status === "available" ? (
        <a
          href={`/test/${t.id}`}
          className="flex items-center justify-center gap-2 w-full h-10 rounded-[5px] text-white text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}
        >
          Testni boshlash <ChevronRight className="w-4 h-4" />
        </a>
      ) : t.status === "completed" ? (
        <div className="flex items-center justify-center gap-2 w-full h-10 rounded-[5px] text-sm font-medium" style={{ backgroundColor: "#f0fff4", color: "#22c55e", fontFamily: "var(--font-poppins)" }}>
          <CheckCircle2 className="w-4 h-4" /> Yakunlangan
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 w-full h-10 rounded-[5px] text-sm" style={{ backgroundColor: "#f6f9ff", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t.status === "locked" ? <><Lock className="w-4 h-4" /> Qulflangan</> : "Kutilmoqda"}
        </div>
      )}
    </div>
  )
}
