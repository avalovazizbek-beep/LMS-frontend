"use client"

import { useEffect, useState } from "react"
import { MessageSquarePlus, RefreshCw, Send, X, CheckCircle2, AlertCircle } from "lucide-react"
import { supportApi, type SupportRecipientType, type SupportTeacherOption } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import ConversationThread from "@/components/support/ConversationThread"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

const RECIPIENT_OPTIONS: SupportRecipientType[] = ["teacher", "dean", "admin"]

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function ComposeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const { t } = useLanguage()
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
    if (!subject.trim() || !message.trim()) { setError(t("support.errFillAll")); return }
    if (recipientType === "teacher" && !teacherId) { setError(t("support.errPickTeacher")); return }
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
      setError(e instanceof Error ? e.message : t("support.errSend"))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(1,41,112,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg rounded-[14px] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <h2 className="text-base font-semibold" style={T}>{t("support.newRequest")}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f0f5ff] transition-colors">
            <X className="w-4 h-4" style={{ color: "#7293b9" }} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium mb-2 block" style={T}>{t("support.whoTo")}</label>
            <div className="flex gap-2 flex-wrap">
              {RECIPIENT_OPTIONS.map(opt => (
                <button key={opt} onClick={() => selectRecipient(opt)}
                  className="text-sm font-medium px-3.5 py-2 rounded-[8px] transition-colors"
                  style={{
                    backgroundColor: recipientType === opt ? "#0e58a8" : "#eef4ff",
                    color: recipientType === opt ? "#fff" : "#0e58a8",
                    fontFamily: "var(--font-poppins)",
                  }}>
                  {t(`support.recipient.${opt}`)}
                </button>
              ))}
            </div>
          </div>

          {recipientType === "teacher" && (
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={T}>{t("support.recipient.teacher")}</label>
              <select value={teacherId} onChange={e => setTeacherId(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2.5 rounded-[8px] text-sm outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }}>
                <option value="">{loadingTeachers ? t("common.loading") : t("common.select")}</option>
                {teachers?.map(tc => <option key={tc.userId} value={tc.userId}>{tc.fullName}</option>)}
              </select>
              {teachers?.length === 0 && !loadingTeachers && (
                <p className="text-xs mt-1.5" style={L}>{t("support.noTeachers")}</p>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={T}>{t("support.subject")}</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t("support.subjectPh")}
              className="w-full px-3 py-2.5 rounded-[8px] text-sm outline-none"
              style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block" style={T}>{t("support.message")}</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder={t("support.messagePh")}
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
            <Send className="w-4 h-4" /> {sending ? t("support.sending") : t("common.send")}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MurojaatlarPage() {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useApi(() => supportApi.list(), [])
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Bildirishnomadan kelganda (?c=<id>) — o'sha suhbatni darhol ochish
  useEffect(() => {
    const c = Number(new URLSearchParams(window.location.search).get("c"))
    if (Number.isFinite(c) && c > 0) setSelectedId(c)
  }, [])
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
          <h1 className="text-[28px] font-semibold" style={T}>{t("support.title")}</h1>
          <p className="text-sm mt-1" style={L}>{t("support.studentSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px]"
            style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setComposeOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-[8px] text-white"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            <MessageSquarePlus className="w-4 h-4" /> {t("support.newRequest")}
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
          <p className="text-sm font-semibold" style={T}>{t("support.noneYet")}</p>
          <p className="text-xs mt-1" style={L}>{t("support.noneYetHint")}</p>
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
                  {t(`support.recipient.${c.recipientType}`)}
                  {c.recipientName ? ` — ${c.recipientName}` : ""} · {fmtDate(c.lastMessageAt)}
                </div>
              </div>
              {c.status === "open" ? (
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0" style={{ backgroundColor: "#f0fdf4", color: "#15803d" }}>{t("support.open")}</span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0" style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>
                  <CheckCircle2 className="w-3 h-3" /> {t("support.closed")}
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
