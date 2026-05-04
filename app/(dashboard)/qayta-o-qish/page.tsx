"use client"

import { useState } from "react"
import { RefreshCw, FileText, Send, CheckCircle2, Clock } from "lucide-react"

const applications = [
  { id: 1, subject: "Ingliz tili", semester: "1-semestr", reason: "Kasallik", submittedDate: "2024-03-01", status: "approved", score: 76, newScore: 82 },
  { id: 2, subject: "Tarix", semester: "1-semestr", reason: "Oilaviy holat", submittedDate: "2024-03-05", status: "pending", score: 68, newScore: null },
]

const failedSubjects = [
  { subject: "Iqtisodiyot asoslari", semester: "1-semestr", score: 52, minPass: 55, credits: 3 },
]

export default function QaytaOqish() {
  const [showForm, setShowForm] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState("")
  const [reason, setReason] = useState("")

  const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
    approved: { label: "Tasdiqlandi", bg: "#f0fbfd", color: "#1cc2dc", border: "#1cc2dc" },
    pending: { label: "Ko'rib chiqilmoqda", bg: "#fff8e6", color: "#f59e0b", border: "#f59e0b" },
    rejected: { label: "Rad etildi", bg: "#fff0f0", color: "#ef4444", border: "#ef4444" },
  }

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Qayta O&apos;qish</h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Qayta o&apos;qish arizalari</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[5px] text-white text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}
        >
          <FileText className="w-4 h-4" />
          Ariza yuborish
        </button>
      </div>

      {/* New application form */}
      {showForm && (
        <div className="bg-white rounded-[10px] p-6" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 10px rgba(1,41,112,0.08)" }}>
          <h2 className="text-lg font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Yangi ariza</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Fan</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[5px] text-sm outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.3)", color: "#012970", fontFamily: "var(--font-poppins)" }}
              >
                <option value="">Fan tanlang...</option>
                {failedSubjects.map((f) => (
                  <option key={f.subject} value={f.subject}>{f.subject} ({f.semester})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Sabab</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Qayta o'qish sababini kiriting..."
                className="w-full px-3 py-2.5 rounded-[5px] text-sm outline-none resize-none"
                style={{ border: "1px solid rgba(1,41,112,0.3)", color: "#012970", fontFamily: "var(--font-poppins)" }}
              />
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-[5px] text-white text-sm font-medium" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Send className="w-4 h-4" /> Yuborish
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-[5px] text-sm font-medium" style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Failed subjects */}
      {failedSubjects.length > 0 && (
        <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
            <h2 className="text-lg font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Qayta topshirish kerak</h2>
          </div>
          {failedSubjects.map((f, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[8px] flex items-center justify-center" style={{ backgroundColor: "#fff0f0" }}>
                  <RefreshCw className="w-5 h-5" style={{ color: "#ef4444" }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{f.subject}</p>
                  <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{f.semester} · {f.credits} kredit</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm" style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }}>Ball: {f.score} / min: {f.minPass}</span>
                <button className="px-3 py-1.5 rounded-[5px] text-xs font-medium text-white" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>Ariza</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Applications */}
      <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
          <h2 className="text-lg font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Mening arizalarim</h2>
        </div>
        {applications.map((a) => {
          const st = statusConfig[a.status]
          return (
            <div key={a.id} className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
              <div className="flex items-center gap-3">
                {a.status === "approved" ? <CheckCircle2 className="w-5 h-5" style={{ color: "#22c55e" }} /> : <Clock className="w-5 h-5" style={{ color: "#f59e0b" }} />}
                <div>
                  <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{a.subject} · {a.semester}</p>
                  <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Yuborildi: {a.submittedDate} · Sabab: {a.reason}</p>
                  {a.newScore && <p className="text-xs mt-0.5" style={{ color: "#22c55e", fontFamily: "var(--font-poppins)" }}>Yangi ball: {a.newScore} (+{a.newScore - a.score})</p>}
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
