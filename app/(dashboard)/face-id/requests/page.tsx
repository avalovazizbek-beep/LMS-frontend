"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, Clock, User, MessageSquare, RefreshCw } from "lucide-react"
import { faceApi, ReRegRequest } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

function formatDate(ts?: number): string {
  if (!ts) return "—"
  return new Date(ts).toLocaleString("uz-UZ", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

const statusConfig = {
  pending:  { label: "Kutilmoqda", bg: "#fff8e6", color: "#f59e0b", icon: Clock },
  approved: { label: "Tasdiqlandi", bg: "#f0fff4", color: "#22c55e", icon: CheckCircle2 },
  rejected: { label: "Rad etildi",  bg: "#fff5f5", color: "#ef4444", icon: XCircle },
}

export default function FaceRequestsPage() {
  const { data, loading, error, refetch } = useApi(() => faceApi.getRequests())
  const requests: ReRegRequest[] = data?.data ?? []

  const [reviewingId,  setReviewingId]  = useState<string | null>(null)
  const [adminNote,    setAdminNote]    = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter)
  const pending = requests.filter(r => r.status === "pending").length

  async function handleAction(id: string, action: "approve" | "reject") {
    setActionLoading(true)
    try {
      await faceApi.reviewRequest(id, action, adminNote)
      setReviewingId(null)
      setAdminNote("")
      refetch()
    } catch {
      //
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Face ID Arizalar
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Qayta ro&apos;yxatdan o&apos;tish arizalari
          </p>
        </div>
        <button onClick={refetch}
          className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm hover:opacity-80 transition-opacity"
          style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <RefreshCw className="w-4 h-4" />
          Yangilash
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Jami",       value: requests.length,                                          color: "#012970" },
          { label: "Kutilmoqda", value: pending,                                                   color: "#f59e0b" },
          { label: "Hal qilingan", value: requests.length - pending,                              color: "#22c55e" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-[10px] p-4 text-center"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <p className="text-2xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "approved", "rejected"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-[8px] text-sm font-medium transition-colors"
            style={{
              backgroundColor: filter === f ? "#0e58a8" : "#fff",
              color: filter === f ? "#fff" : "#7293b9",
              border: filter === f ? "1px solid #0e58a8" : "1px solid rgba(1,41,112,0.15)",
              fontFamily: "var(--font-poppins)",
            }}>
            {f === "all" ? "Barchasi" : f === "pending" ? "Kutilmoqda" : f === "approved" ? "Tasdiqlangan" : "Rad etilgan"}
          </button>
        ))}
      </div>

      {/* Request list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Arizalar topilmadi</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(req => {
            const sc  = statusConfig[req.status]
            const Icon = sc.icon
            const isReviewing = reviewingId === req.id

            return (
              <div key={req.id} className="bg-white rounded-[10px] overflow-hidden"
                style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "#f6f9ff" }}>
                        <User className="w-5 h-5" style={{ color: "#0e58a8" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                          {req.username}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                          {formatDate(req.createdAt)}
                        </p>
                        <div className="flex items-start gap-2 mt-2">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#7293b9" }} />
                          <p className="text-xs" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                            {req.reason}
                          </p>
                        </div>
                        {req.adminNote && req.adminNote !== "(qayta ro'yxatdan o'tish tugallandi)" && (
                          <div className="mt-2 px-3 py-1.5 rounded-[6px]"
                            style={{ backgroundColor: "#f6f9ff" }}>
                            <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                              Admin izohi: {req.adminNote}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.color}` }}>
                        <Icon className="w-3.5 h-3.5" />
                        {sc.label}
                      </span>
                      {req.reviewedAt && (
                        <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                          {formatDate(req.reviewedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pending: action buttons */}
                  {req.status === "pending" && !isReviewing && (
                    <div className="flex gap-2 mt-4 pt-3"
                      style={{ borderTop: "1px solid rgba(1,41,112,0.06)" }}>
                      <button onClick={() => { setReviewingId(req.id); setAdminNote("") }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium transition-opacity hover:opacity-80"
                        style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                        Ko&apos;rib chiqish
                      </button>
                    </div>
                  )}
                </div>

                {/* Review panel */}
                {isReviewing && (
                  <div className="px-5 pb-5 pt-0">
                    <div className="rounded-[10px] p-4 flex flex-col gap-3"
                      style={{ backgroundColor: "#f6f9ff", border: "1px solid rgba(1,41,112,0.1)" }}>
                      <p className="text-xs font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                        Admin izohi (ixtiyoriy)
                      </p>
                      <textarea rows={2} value={adminNote}
                        onChange={e => setAdminNote(e.target.value)}
                        placeholder="Ariza haqida izoh yozing..."
                        className="w-full px-3 py-2 rounded-[8px] text-sm resize-none outline-none"
                        style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }} />
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(req.id, "approve")}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium flex-1 justify-center transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: "#22c55e", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                          <CheckCircle2 className="w-4 h-4" />
                          Tasdiqlash
                        </button>
                        <button onClick={() => handleAction(req.id, "reject")}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium flex-1 justify-center transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: "#ef4444", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                          <XCircle className="w-4 h-4" />
                          Rad etish
                        </button>
                        <button onClick={() => setReviewingId(null)}
                          className="px-3 py-2 rounded-[8px] text-sm transition-opacity hover:opacity-80"
                          style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                          Bekor
                        </button>
                      </div>
                    </div>
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
