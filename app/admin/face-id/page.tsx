"use client"

import { useEffect, useState } from "react"
import { ShieldAlert, CheckCircle2, XCircle, Clock, RefreshCw, User, Send, ChevronLeft, ChevronRight, UserX } from "lucide-react"
import { adminApi, type AdminFaceRequest } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const PAGE_SIZE = 20

const STATUS_CONFIG = {
  pending:  { labelKey: "adminFaceId.statusPending",  bg: "#fffbeb", color: "#92400e", icon: Clock },
  approved: { labelKey: "adminFaceId.statusApproved", bg: "#f0fdf4", color: "#15803d", icon: CheckCircle2 },
  rejected: { labelKey: "adminFaceId.statusRejected", bg: "#fef2f2", color: "#b91c1c", icon: XCircle },
}

interface NotRegisteredStudent {
  hemisId: number
  fullName: string
  groupName: string | null
  studentIdNumber: string | null
  adminRequestPending: boolean
}

function NotRegisteredTab() {
  const { t } = useLanguage()
  const [students, setStudents] = useState<NotRegisteredStudent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState<number | null>(null)

  const load = (p = page) => {
    setLoading(true)
    adminApi.notRegisteredFace({ limit: PAGE_SIZE, offset: p * PAGE_SIZE })
      .then(res => { setStudents(res.students); setTotal(res.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  function goToPage(p: number) {
    const clamped = Math.min(Math.max(p, 0), totalPages - 1)
    setPage(clamped)
    load(clamped)
  }

  async function handleRequest(hemisId: number) {
    setSendingId(hemisId)
    try {
      await adminApi.requestFaceReregister(hemisId)
      setStudents(prev => prev.map(s => s.hemisId === hemisId ? { ...s, adminRequestPending: true } : s))
    } finally {
      setSendingId(null)
    }
  }

  return (
    <>
      <div className="bg-white rounded-[12px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.08)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} />
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldAlert className="w-8 h-8 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
            <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {t("adminFaceId.allRegistered")}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <tbody>
              {students.map(s => (
                <tr key={s.hemisId} className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{s.fullName}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>
                      {s.groupName ?? "—"}{s.studentIdNumber ? ` · ${s.studentIdNumber}` : ""}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {s.adminRequestPending ? (
                      <span className="text-xs italic" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>{t("adminFaceId.requestSent")}</span>
                    ) : sendingId === s.hemisId ? (
                      <RefreshCw className="w-4 h-4 animate-spin ml-auto" style={{ color: "#0e58a8" }} />
                    ) : (
                      <button onClick={() => handleRequest(s.hemisId)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[6px] transition-opacity hover:opacity-90"
                        style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                        <Send className="w-3.5 h-3.5" /> {t("adminFaceId.request")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && total > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {page * PAGE_SIZE + 1}–{Math.min(total, page * PAGE_SIZE + PAGE_SIZE)} / {total}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => goToPage(page - 1)} disabled={page <= 0}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-[6px] disabled:opacity-40"
              style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {page + 1} / {totalPages}
            </span>
            <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages - 1}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-[6px] disabled:opacity-40"
              style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default function AdminFaceId() {
  const { t } = useLanguage()
  const [requests, setRequests] = useState<AdminFaceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState<"pending" | "approved" | "rejected" | "not_registered">("pending")
  const [actionId, setActionId] = useState<string | null>(null)
  const [note, setNote] = useState("")

  const load = (s: "pending" | "approved" | "rejected") => {
    setLoading(true)
    adminApi.faceRequests(s)
      .then(res => setRequests(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (statusTab !== "not_registered") load(statusTab)
  }, [statusTab]) // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="flex flex-col gap-5 p-4 sm:p-8">
      <div>
        <h1 className="text-[28px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {t("adminFaceId.pageTitle")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("adminFaceId.pageSubtitle")}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
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
              {t(cfg.labelKey)}
            </button>
          )
        })}
        <button
          onClick={() => setStatusTab("not_registered")}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-[8px] transition-colors"
          style={{
            backgroundColor: statusTab === "not_registered" ? "#0e58a8" : "#f0f5ff",
            color: statusTab === "not_registered" ? "#fff" : "#0e58a8",
            fontFamily: "var(--font-poppins)",
          }}>
          <UserX className="w-3.5 h-3.5" />
          {t("adminFaceId.notRegisteredTab")}
        </button>
        {statusTab !== "not_registered" && (
          <button onClick={() => load(statusTab)} className="ml-auto text-xs flex items-center gap-1.5 px-3 py-2 rounded-[8px]"
            style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            <RefreshCw className="w-3 h-3" /> {t("adminFaceId.refresh")}
          </button>
        )}
      </div>

      {statusTab === "not_registered" ? (
        <NotRegisteredTab />
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-[12px] p-12 text-center" style={{ border: "1px solid rgba(1,41,112,0.08)" }}>
          <ShieldAlert className="w-8 h-8 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("adminFaceId.noRequestsOfStatus", { status: t(STATUS_CONFIG[statusTab].labelKey) })}
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
                        {t(cfg.labelKey)}
                      </span>
                    </div>
                    {r.reason && (
                      <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        {t("adminFaceId.reasonLabel", { reason: r.reason })}
                      </p>
                    )}
                    <p className="text-xs mt-1" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>
                      {t("adminFaceId.requestDateLabel", { date: fmtTs(r.created_at) })}
                    </p>
                  </div>
                </div>

                {r.status === "pending" && (
                  <div className="flex flex-col gap-2">
                    <input
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder={t("adminFaceId.notePlaceholder")}
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
                        {t("adminFaceId.approveBtn")}
                      </button>
                      <button
                        onClick={() => handleAction(r.id, "reject")}
                        disabled={isActing}
                        className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-[8px] disabled:opacity-60"
                        style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid rgba(185,28,28,0.3)", fontFamily: "var(--font-poppins)" }}>
                        {isActing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        {t("adminFaceId.rejectBtn")}
                      </button>
                    </div>
                  </div>
                )}

                {r.admin_note && r.status !== "pending" && (
                  <div className="text-xs px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#f6f9ff", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {t("adminFaceId.adminNoteLabel", { note: r.admin_note })}
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
