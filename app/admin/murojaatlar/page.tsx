"use client"

import { useEffect, useState } from "react"
import { MessageSquareText, RefreshCw, CheckCircle2 } from "lucide-react"
import { supportApi } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import ConversationThread from "@/components/support/ConversationThread"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function AdminMurojaatlar() {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useApi(() => supportApi.list(), [])
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Bildirishnomadan kelganda (?c=<id>) — o'sha suhbatni darhol ochish
  useEffect(() => {
    const c = Number(new URLSearchParams(window.location.search).get("c"))
    if (Number.isFinite(c) && c > 0) setSelectedId(c)
  }, [])

  const items = data?.data ?? []

  if (selectedId !== null) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-8 h-[calc(100vh-64px)]">
        <ConversationThread
          conversationId={selectedId}
          showStudentInfo
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
          <p className="text-sm mt-1" style={L}>{t("support.adminSubtitle")}</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px]"
          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> {t("common.refresh")}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} /></div>
      ) : error ? (
        <div className="rounded-[12px] p-6 text-sm" style={{ backgroundColor: "#fef2f2", color: "#b91c1c" }}>{error}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-[12px] p-16 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <MessageSquareText className="w-10 h-10 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm font-semibold" style={T}>{t("support.noneInbox")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-[12px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
          {items.map(c => (
            <button key={c.id} onClick={() => setSelectedId(c.id)}
              className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 flex-wrap hover:bg-[#f6f9ff]/50 transition-colors"
              style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate" style={T}>{c.studentName}</span>
                  {c.studentGroupName && <span className="text-xs" style={L}>({c.studentGroupName})</span>}
                  {c.hasUnread && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#0e58a8" }} />}
                </div>
                <div className="text-xs mt-1 truncate" style={L}>
                  {t(`support.recipient.${c.recipientType}`)} · {c.subject} · {fmtDate(c.lastMessageAt)}
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
    </div>
  )
}
