"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Paperclip, Send, CheckCircle2, FileText, Users, Phone, X } from "lucide-react"
import { supportApi, type ConversationDetail } from "@/lib/api"

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

const RECIPIENT_LABEL: Record<string, string> = {
  teacher: "O'qituvchi",
  dean: "Dekanat",
  admin: "Admin",
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ConversationThread({
  conversationId,
  showStudentInfo = false,
  onBack,
  onClosed,
}: {
  conversationId: number
  showStudentInfo?: boolean
  onBack: () => void
  onClosed?: () => void
}) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function load(silent = false) {
    if (!silent) setError(null)
    try {
      const res = await supportApi.detail(conversationId)
      setDetail(res.data)
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : "Yuklashda xato")
    }
  }

  useEffect(() => {
    load()
    // Real-vaqtli socket yo'q — ochiq suhbatda har 5 soniyada yangi xabar
    // bor-yo'qligini tekshirib turadi (yopilgandan keyin to'xtaydi).
    const timer = setInterval(() => {
      setDetail(prev => {
        if (prev && prev.status === "closed") return prev
        load(true)
        return prev
      })
    }, 5000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [detail?.messages.length])

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await supportApi.sendMessage(conversationId, text.trim())
      setText("")
      await load(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yuborishda xato")
    } finally {
      setSending(false)
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setSending(true)
    try {
      await supportApi.sendAttachment(conversationId, file)
      await load(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fayl yuborishda xato")
    } finally {
      setSending(false)
    }
  }

  async function handleClose() {
    if (!window.confirm("Suhbatni yakunlaysizmi? Yakunlangandan keyin xabar yozib bo'lmaydi.")) return
    setClosing(true)
    try {
      await supportApi.close(conversationId)
      await load(true)
      onClosed?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yakunlashda xato")
    } finally {
      setClosing(false)
    }
  }

  if (error && !detail) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm" style={L}>
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </button>
        <div className="rounded-[10px] p-6 text-sm" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{error}</div>
      </div>
    )
  }

  if (!detail) {
    return <div className="p-10 text-center text-sm" style={L}>Yuklanmoqda…</div>
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-[12px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 flex-wrap" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
        <div className="flex items-start gap-3 min-w-0">
          <button onClick={onBack} className="mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f0f5ff] transition-colors">
            <ArrowLeft className="w-4 h-4" style={{ color: "#7293b9" }} />
          </button>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate" style={T}>{detail.subject}</div>
            <div className="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap" style={L}>
              <span>{RECIPIENT_LABEL[detail.recipientType] ?? detail.recipientType}{detail.recipientName ? ` — ${detail.recipientName}` : ""}</span>
              <span>·</span>
              {detail.status === "open" ? (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f0fdf4", color: "#15803d" }}>Ochiq</span>
              ) : (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>
                  Yakunlangan{detail.closedByName ? ` — ${detail.closedByName}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>
        {detail.canClose && detail.status === "open" && (
          <button onClick={handleClose} disabled={closing}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[6px] shrink-0 disabled:opacity-60"
            style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
            <X className="w-3.5 h-3.5" /> {closing ? "Yakunlanmoqda…" : "Suhbatni yakunlash"}
          </button>
        )}
      </div>

      {/* Talaba haqida ma'lumot — faqat qabul qiluvchi tomon uchun */}
      {showStudentInfo && (
        <div className="px-5 py-3 flex items-center gap-4 flex-wrap text-xs" style={{ backgroundColor: "#f6f9ff", borderBottom: "1px solid rgba(1,41,112,0.06)", ...L }}>
          <span className="font-semibold" style={T}>{detail.student.fullName}</span>
          {detail.student.groupName && (
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {detail.student.groupName}</span>
          )}
          {detail.student.phone && (
            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {detail.student.phone}</span>
          )}
          {detail.student.studentIdNumber && <span>ID: {detail.student.studentIdNumber}</span>}
        </div>
      )}

      {/* Xabarlar */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3" style={{ minHeight: 280 }}>
        {detail.messages.map(m => (
          <div key={m.id} className={`flex flex-col ${m.isMine ? "items-end" : "items-start"}`}>
            <div className="max-w-[80%] rounded-[12px] px-3.5 py-2.5"
              style={{
                backgroundColor: m.isMine ? "#0e58a8" : "#f0f5ff",
                color: m.isMine ? "#fff" : "#012970",
                fontFamily: "var(--font-poppins)",
              }}>
              {!m.isMine && <div className="text-[11px] font-semibold mb-0.5 opacity-70">{m.senderName}</div>}
              {m.body && <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>}
              {m.attachment && (
                <a href={supportApi.attachmentUrl(m.attachment.url)} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 mt-1.5 text-xs px-2.5 py-1.5 rounded-[8px]"
                  style={{ backgroundColor: m.isMine ? "rgba(255,255,255,0.15)" : "rgba(1,41,112,0.06)" }}>
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{m.attachment.name}</span>
                  <span className="opacity-70 shrink-0">{fmtSize(m.attachment.size)}</span>
                </a>
              )}
            </div>
            <span className="text-[10px] mt-1" style={L}>{fmtTime(m.createdAt)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="px-5 py-2 text-xs" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>{error}</div>
      )}

      {/* Yozish qatori */}
      {detail.canReply ? (
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFile} />
          <button onClick={() => fileInputRef.current?.click()} disabled={sending}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f0f5ff] transition-colors disabled:opacity-50">
            <Paperclip className="w-4 h-4" style={{ color: "#7293b9" }} />
          </button>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Xabar yozing…"
            className="flex-1 min-w-0 px-3.5 py-2.5 rounded-[10px] text-sm outline-none"
            style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }}
          />
          <button onClick={handleSend} disabled={sending || !text.trim()}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-50"
            style={{ backgroundColor: "#0e58a8" }}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 px-4 py-4 text-xs" style={L}>
          <CheckCircle2 className="w-4 h-4" /> Suhbat yakunlangan — tarix saqlanadi, yangi xabar yozib bo'lmaydi
        </div>
      )}
    </div>
  )
}
