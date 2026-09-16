"use client"

import { useEffect, useState } from "react"
import { RefreshCw, History, Globe } from "lucide-react"
import { adminApi, type AuditLogRow } from "@/lib/api"

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    adminApi.auditLog({ limit: 200 }).then(res => setRows(res.data ?? [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function formatDateTime(iso: string) {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "—"
    return d.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Audit log
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Admin panelidagi sezilarli amallar — kim, qachon, qaysi IP'dan
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px]"
          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Yangilash
        </button>
      </div>

      <div className="bg-white rounded-[12px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} /></div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            <History className="w-8 h-8 mx-auto mb-2" style={{ color: "#d8e6f7" }} />
            Hali yozuv yo'q
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)", backgroundColor: "#f6f9ff" }}>
                  {["Vaqt", "Bajardi", "Rol", "Amal", "Modul", "Nishon", "IP"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-3 text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{formatDateTime(r.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {r.actorName || r.actorHemisId}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#eef4ff", color: "#0e58a8" }}>
                        {r.actorRole ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{r.action}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{r.module ?? "—"}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{r.target ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        <Globe className="w-3 h-3" /> {r.ipAddress ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
