"use client"

import { useState } from "react"
import { MessageSquarePlus, RefreshCw, Send, X, CheckCircle2, AlertCircle } from "lucide-react"
import { supportApi, type SupportRecipientType, type SupportTeacherOption } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import ConversationThread from "@/components/support/ConversationThread"

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

const RECIPIENT_OPTIONS: { value: SupportRecipientType; label: string }[] = [
  { value: "teacher", label: "O'qituvchi" },
  { value: "dean", label: "Dekanat" },
  { value: "admin", label: "Admin" },
]

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function ComposeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [recipientType, setRecipientType] = useState<SupportRecipientType>("teacher")
  const [teacherId, setTeacherId] = useState<number | "">("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [teachers, setTeachers] = useState<SupportTeacherOption[] | null>(null)
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function ensureTeachers() {
    if (teachers !== null || loadingTeachers) return
    setLoadingTeachers(true)
    try {
      const res = await supportApi.teachers()
      setTeachers(res.data)
    } catch {
      setTeachers([])
    } finally {
      setLoadingTeachers(false)
    }
  }

  function selectRecipient(v: SupportRecipientType) {
    setRecipientType(v)
    setError(null)
    if (v === "teacher") void ensureTeachers()
  }

  async function handleSubmit() {
    if (!subject.trim() || !message.trim()) { setError("Mavzu va xabar matnini to'ldiring"); return }
    if (recipientType === "teacher" && !teacherId) { setError("O'qituvchini tanlang"); return }
    setSending(true)
    setError(null)
    try {
      const res = await supportApi.create({
        recipientType,
        recipientUserId: recipientType === "teacher" ? Number(teacherId) : undefined,
        subject: subject.trim(),
        message: message.trim(),
      })
      onCreated(res.data.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yuborishda xato")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(1,41,112,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg rounded-[14px] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <h2 className="text-base font-semibold" style={T}>Yangi murojaat</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f0f5ff] transition-colors">
            <X className="w-4 h-4" style={{ color: "#7293b9" }} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium mb-2 block" style={T}>Kimga murojaat qilyapsiz?</label>
            <div className="flex gap-2 flex-wrap">
              {RECIPIENT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => selectRecipient(opt.value)}
                  className="text-sm font-medium px-3.5 py-2 rounded-[8px] transition-colors"
                  style={{
                    backgroundColor: recipientType === opt.value ? "#0e58a8" : "#eef4ff",
                    color: recipientType === opt.value ? "#fff" : "#0e58a8",
                    fontFamily: "var(--font-poppins)",
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {recipientType === "teacher" && (
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={T}>O'qituvchi</label>
              <select value={teacherId} onChange={e => setTeacherId(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2.5 rounded-[8px] text-sm outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }}>
                <option value="">{loadingTeachers ? "Yuklanmoqda…" : "Tanlang"}</option>
                {teachers?.map(t => <option key={t.userId} value={t.userId}>{t.fullName}</option>)}
              </select>
              {teachers?.length === 0 && !loadingTeachers && (
                <p className="text-xs mt-1.5" style={L}>Sizga biriktirilgan o'qituvchi topilmadi</p>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={T}>Mavzu</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Masalan: Baholash bo'yicha savol"
              className="w-full px-3 py-2.5 rounded-[8px] text-sm outline-none"
              style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={T}>Xabar matni</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Murojaatingizni batafsil yozing…"
              className="w-full px-3 py-2.5 rounded-[8px] text-sm outline-none resize-none"
              style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-[8px]" style={{ backgroundColor: "#fef2f2", color: "#b91c1c" }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 flex justify-end" style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
          <button onClick={handleSubmit} disabled={sending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            <Send className="w-4 h-4" /> {sending ? "Yuborilmoqda…" : "Yuborish"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MurojaatlarPage() {
  const { data, loading, error, refetch } = useApi(() => supportApi.list(), [])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)

  const items = data?.data ?? []

  if (selectedId !== null) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-8 h-[calc(100vh-64px)]">
        <ConversationThread
          conversationId={selectedId}
          onBack={() => { setSelectedId(null); refetch() }}
          onClosed={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold" style={T}>Murojaatlar</h1>
          <p className="text-sm mt-1" style={L}>O'qituvchi, dekanat yoki admin bilan bog'laning</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px]"
            style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setComposeOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-[8px] text-white"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            <MessageSquarePlus className="w-4 h-4" /> Yangi murojaat
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} /></div>
      ) : error ? (
        <div className="rounded-[12px] p-6 text-sm" style={{ backgroundColor: "#fef2f2", color: "#b91c1c" }}>{error}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-[12px] p-16 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <MessageSquarePlus className="w-10 h-10 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm font-semibold" style={T}>Hali murojaat yubormagansiz</p>
          <p className="text-xs mt-1" style={L}>Yuqoridagi "Yangi murojaat" tugmasi orqali boshlang</p>
        </div>
      ) : (
        <div className="bg-white rounded-[12px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
          {items.map(c => (
            <button key={c.id} onClick={() => setSelectedId(c.id)}
              className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 flex-wrap hover:bg-[#f6f9ff]/50 transition-colors"
              style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate" style={T}>{c.subject}</span>
                  {c.hasUnread && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#0e58a8" }} />}
                </div>
                <div className="text-xs mt-1" style={L}>
                  {c.recipientType === "teacher" ? "O'qituvchi" : c.recipientType === "dean" ? "Dekanat" : "Admin"}
                  {c.recipientName ? ` — ${c.recipientName}` : ""} · {fmtDate(c.lastMessageAt)}
                </div>
              </div>
              {c.status === "open" ? (
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0" style={{ backgroundColor: "#f0fdf4", color: "#15803d" }}>Ochiq</span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0" style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>
                  <CheckCircle2 className="w-3 h-3" /> Yakunlangan
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onCreated={(id) => { setComposeOpen(false); refetch(); setSelectedId(id) }}
        />
      )}
    </div>
  )
}
