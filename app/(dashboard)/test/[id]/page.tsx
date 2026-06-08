"use client"

import { useState, useEffect, useCallback } from "react"
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, Flag } from "lucide-react"
import FaceProctor from "@/components/ui/FaceProctor"

const questions = [
  {
    id: 1,
    text: "Quyidagi formulalardan qaysi biri Newton'ning ikkinchi qonunini ifodalaydi?",
    options: ["F = m × v", "F = m × a", "F = m × g", "F = m × v²"],
    correct: 1,
  },
  {
    id: 2,
    text: "Integral hisob qanday sohalarda qo'llaniladi?",
    options: ["Faqat fizikada", "Faqat matematikada", "Matematika, fizika, muhandislik va boshqalarda", "Faqat kimyoda"],
    correct: 2,
  },
  {
    id: 3,
    text: "Python dasturlash tilida ro'yxat (list) qanday e'lon qilinadi?",
    options: ['list = (1, 2, 3)', 'list = {1, 2, 3}', 'list = [1, 2, 3]', 'list = <1, 2, 3>'],
    correct: 2,
  },
  {
    id: 4,
    text: "Vodorodning atom massasi qancha?",
    options: ["2", "4", "1", "3"],
    correct: 2,
  },
  {
    id: 5,
    text: "Quyidagi qaysi ifoda JavaScript-da to'g'ri shartli operator?",
    options: ["if x > 5 then", "if (x > 5) {}", "if x > 5:", "if x > 5;"],
    correct: 1,
  },
]

export default function TestPage() {
  const [answers,   setAnswers]   = useState<Record<number, number>>({})
  const [current,   setCurrent]   = useState(0)
  const [timeLeft,  setTimeLeft]  = useState(30 * 60)
  const [submitted, setSubmitted] = useState(false)
  const [flagged,   setFlagged]   = useState<Set<number>>(new Set())

  const handleTerminate = useCallback(() => setSubmitted(true), [])

  useEffect(() => {
    if (submitted) return
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 0) { clearInterval(timer); setSubmitted(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [submitted])

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0")
  const ss = String(timeLeft % 60).padStart(2, "0")
  const isLow = timeLeft < 300

  if (submitted) {
    const correct = questions.filter((q) => answers[q.id] === q.correct).length
    return (
      <div className="min-h-full flex items-center justify-center p-[30px]">
        <div className="bg-white rounded-[10px] p-10 text-center max-w-md w-full" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 20px rgba(1,41,112,0.1)" }}>
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: "#22c55e" }} />
          <h2 className="text-2xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Test yakunlandi!</h2>
          <p className="text-base mt-3 font-semibold" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{correct} / {questions.length} to'g'ri javob</p>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Ball: {Math.round((correct / questions.length) * 100)}</p>
          <a href="/dashboard" className="inline-block mt-6 px-6 py-2.5 rounded-[5px] text-white font-medium" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>Dashboardga qaytish</a>
        </div>
      </div>
    )
  }

  const q = questions[current]
  const toggleFlag = () => setFlagged((f) => { const n = new Set(f); n.has(current) ? n.delete(current) : n.add(current); return n })

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      {/* Test header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <div>
          <h1 className="font-semibold text-base" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Matematika — Yakuniy test</h1>
          <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{questions.length} ta savol · {Object.keys(answers).length} ta javoblandi</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: isLow ? "#fff0f0" : "#f0f5ff" }}>
            <Clock className="w-4 h-4" style={{ color: isLow ? "#ef4444" : "#0e58a8" }} />
            <span className="text-sm font-semibold font-mono" style={{ color: isLow ? "#ef4444" : "#0e58a8", fontFamily: "var(--font-poppins)" }}>{mm}:{ss}</span>
          </div>
        </div>
      </div>

      <FaceProctor onTerminate={handleTerminate}>
      <div className="flex flex-1 gap-5 p-6">
        {/* Question nav */}
        <div className="w-48 shrink-0">
          <div className="bg-white rounded-[10px] p-4" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <p className="text-xs font-medium mb-3" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Savollar</p>
            <div className="grid grid-cols-4 gap-1.5">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className="w-9 h-9 rounded-[5px] text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: i === current ? "#0e58a8" : answers[questions[i].id] !== undefined ? "#f0fbfd" : "#f6f9ff",
                    color: i === current ? "#fff" : answers[questions[i].id] !== undefined ? "#1cc2dc" : "#7293b9",
                    border: flagged.has(i) ? "2px solid #f59e0b" : "1px solid rgba(1,41,112,0.1)",
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-1.5">
              {[
                { color: "#0e58a8", bg: "#f0f5ff", label: "Joriy" },
                { color: "#1cc2dc", bg: "#f0fbfd", label: "Javoblandi" },
                { color: "#7293b9", bg: "#f6f9ff", label: "Javoblanmadi" },
                { color: "#f59e0b", bg: "#fff8e6", label: "Belgilangan" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: l.bg, border: `1px solid ${l.color}` }} />
                  <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Question card */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-white rounded-[10px] p-6" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
            <div className="flex items-start justify-between gap-3 mb-6">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold text-white shrink-0" style={{ backgroundColor: "#0e58a8" }}>{current + 1}</span>
                <p className="text-base font-medium pt-1" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{q.text}</p>
              </div>
              <button onClick={toggleFlag} className="shrink-0 p-1.5 rounded hover:bg-[#f6f9ff]">
                <Flag className="w-4 h-4" style={{ color: flagged.has(current) ? "#f59e0b" : "#7293b9" }} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {q.options.map((opt, i) => {
                const isSelected = answers[q.id] === i
                return (
                  <label
                    key={i}
                    className="flex items-center gap-3 p-4 rounded-[8px] cursor-pointer transition-colors"
                    style={{
                      border: `1.5px solid ${isSelected ? "#1cc2dc" : "rgba(1,41,112,0.1)"}`,
                      backgroundColor: isSelected ? "rgba(28,194,220,0.05)" : "#fff",
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                      style={{ border: `2px solid ${isSelected ? "#1cc2dc" : "rgba(1,41,112,0.2)"}` }}
                    >
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#1cc2dc" }} />}
                    </div>
                    <input type="radio" className="sr-only" checked={isSelected} onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))} />
                    <span className="text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{opt}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[5px] text-sm font-medium transition-colors disabled:opacity-40"
              style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }}
            >
              <ChevronLeft className="w-4 h-4" /> Oldingi
            </button>
            {current === questions.length - 1 ? (
              <button
                onClick={() => setSubmitted(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-[5px] text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#22c55e", fontFamily: "var(--font-poppins)" }}
              >
                <CheckCircle2 className="w-4 h-4" /> Testni yakunlash
              </button>
            ) : (
              <button
                onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[5px] text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}
              >
                Keyingi <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      </FaceProctor>
    </div>
  )
}
