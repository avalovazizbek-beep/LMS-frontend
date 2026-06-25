"use client"

import { useEffect, useState } from "react"
import { ShieldAlert, CheckCircle2, XCircle, Clock, RefreshCw, User } from "lucide-react"
import { adminApi, type AdminFaceRequest } from "@/lib/api"

const STATUS_CONFIG = {
  pending:  { label: "Kutilmoqda", bg: "#fffbeb", color: "#92400e", icon: Clock },
  approved: { label: "Tasdiqlandi", bg: "#f0fdf4", color: "#15803d", icon: CheckCircle2 },
  rejected: { label: "Rad etildi", bg: "#fef2f2", color: "#b91c1c", icon: XCircle },
}

export default function AdminFaceId() {
  const [requests, setRequests] = useState<AdminFaceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState<"pending" | "approved" | "rejected">("pending")
  const [actionId, setActionId] = useState<string | null>(null)
  const [note, setNote] = useState("")

  const load = (s = statusTab) => {
    setLoading(true)
    adminApi.faceRequests(s)
      .then(res => setRequests(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusTab]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAction(id: string, action: "approve" | "reject") {
    setActionId(id)
    try {
      await adminApi.reviewFaceRequest(id, action, note)
      setRequests(prev => prev.filter(r => r.id !== id))
      setNote("")
    } finally {
      setActionId(null)
    }
  }

  function fmtTs(ts: number) {
    if (!ts) return "—"
    return new Date(ts * 1000).toLocaleString("uz-UZ", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    })
  }

  return (
    <div className="flex flex-col gap-5 p-8">
      <div>
        <h1 className="text-[28px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Face ID So'rovlari
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Yuz ro'yxatdan o'tish so'rovlarini ko'rib chiqish
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {(["pending", "approved", "rejected"] as const).map(s => {
          const cfg = STATUS_CONFIG[s]
          const Icon = cfg.icon
          return (
            <button
              key={s}
              onClick={() => setStatusTab(s)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-[8px] transition-colors"
              style={{
                backgroundColor: statusTab === s ? "#0e58a8" : "#f0f5ff",
                color: statusTab === s ? "#fff" : "#0e58a8",
                fontFamily: "var(--font-poppins)",
              }}>
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
            </button>
          )
        })}
        <button onClick={() => load()} className="ml-auto text-xs flex items-center gap-1.5 px-3 py-2 rounded-[8px]"
          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <RefreshCw className="w-3 h-3" /> Yangilash
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-[12px] p-12 text-center" style={{ border: "1px solid rgba(1,41,112,0.08)" }}>
          <ShieldAlert className="w-8 h-8 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {STATUS_CONFIG[statusTab].label} so'rovlar yo'q
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map(r => {
            const cfg = STATUS_CONFIG[r.status]
            const Icon = cfg.icon
            const isActing = actionId === r.id
            return (
              <div key={r.id} className="bg-white rounded-[12px] p-5 flex flex-col gap-4"
                style={{ border: "1px solid rgba(1,41,112,0.08)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#f0f5ff" }}>
                    <User className="w-5 h-5" style={{ color: "#0e58a8" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                        {r.username}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: cfg.bg, color: cfg.color, fontFamily: "var(--font-poppins)" }}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                    {r.reason && (
                      <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        Sabab: {r.reason}
                      </p>
                    )}
                    <p className="text-xs mt-1" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>
                      So'rov sanasi: {fmtTs(r.created_at)}
                    </p>
                  </div>
                </div>

                {r.status === "pending" && (
                  <div className="flex flex-col gap-2">
                    <input
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Izoh (ixtiyoriy)…"
                      className="w-full px-3 py-2 text-sm rounded-[6px] outline-none"
                      style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)" }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAction(r.id, "approve")}
                        disabled={isActing}
                        className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-[8px] disabled:opacity-60"
                        style={{ backgroundColor: "#15803d", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                        {isActing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Tasdiqlash
                      </button>
                      <button
                        onClick={() => handleAction(r.id, "reject")}
                        disabled={isActing}
                        className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-[8px] disabled:opacity-60"
                        style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid rgba(185,28,28,0.3)", fontFamily: "var(--font-poppins)" }}>
                        {isActing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Rad etish
                      </button>
                    </div>
                  </div>
                )}

                {r.admin_note && r.status !== "pending" && (
                  <div className="text-xs px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#f6f9ff", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    Admin izohi: {r.admin_note}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
