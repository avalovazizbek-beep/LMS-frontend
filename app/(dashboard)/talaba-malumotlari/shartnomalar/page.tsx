"use client"

import { FileText, ExternalLink, Wallet, CheckCircle2, TrendingDown } from "lucide-react"
import { hemisApi, HemisContractItem } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

function formatSum(val?: string | number): string {
  if (val == null) return "—"
  const n = Number(val)
  if (isNaN(n)) return String(val)
  return n.toLocaleString("uz-UZ") + " so'm"
}

export default function Shartnomalar() {
  const { data, loading, error, refetch } = useApi(() => hemisApi.contractList())
  const contracts: HemisContractItem[] = (data?.data as any)?.items ?? []

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Shartnomalar</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Kontrakt ro&apos;yxati</p>
      </div>

      <div className="flex flex-col gap-5">
        {contracts.length === 0 ? (
          <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
            <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Shartnomalar topilmadi</p>
          </div>
        ) : contracts.map(c => {
          const d = c._data
          if (!d) return null
          const totalAmount = Number(d.contractAmount ?? 0)
          const paidAmount  = Number(d.paidAmount ?? 0)
          const debtAmount  = Number(d.debitAmount ?? 0)
          const pct = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0
          return (
            <div key={c.id} className="bg-white rounded-[10px] p-5"
              style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: "#f0f5ff" }}>
                    <FileText className="w-5 h-5" style={{ color: "#0e58a8" }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      Kontrakt № {d.contractNumber ?? "—"}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {d.course} · {d.speciality}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold shrink-0"
                  style={{ backgroundColor: "#f0fff4", color: "#22c55e", border: "1px solid #22c55e" }}>
                  {d.status ?? "—"}
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { icon: Wallet,       label: "Jami",     value: formatSum(totalAmount), color: "#012970" },
                  { icon: CheckCircle2, label: "To'langan", value: formatSum(paidAmount),  color: "#22c55e" },
                  { icon: TrendingDown, label: "Qarz",      value: formatSum(debtAmount),  color: debtAmount > 0 ? "#ef4444" : "#22c55e" },
                ].map(s => {
                  const Icon = s.icon
                  return (
                    <div key={s.label} className="rounded-[8px] p-3" style={{ backgroundColor: "#f6f9ff" }}>
                      <Icon className="w-4 h-4 mb-1" style={{ color: s.color }} />
                      <p className="text-xs font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</p>
                      <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</p>
                    </div>
                  )
                })}
              </div>

              {/* Progress */}
              <div className="w-full h-2 rounded-full mb-1" style={{ backgroundColor: "rgba(1,41,112,0.08)" }}>
                <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: "#1cc2dc" }} />
              </div>
              <div className="flex justify-between text-xs mb-4" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                <span>{pct}% to&apos;langan</span>
                <span>Muddat: {d.lastPaymentDate ?? "—"}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {d.pdfLink && (
                  <a href={d.pdfLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-[5px] text-sm font-medium transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                    <ExternalLink className="w-4 h-4" /> PDF ko&apos;rish
                  </a>
                )}
                {d.contractUrl && (
                  <a href={d.contractUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-[5px] text-sm font-medium transition-opacity hover:opacity-90"
                    style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                    <ExternalLink className="w-4 h-4" /> Kontrakt sayti
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
