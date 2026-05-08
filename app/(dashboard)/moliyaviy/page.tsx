"use client"

import { Wallet, CreditCard, FileText, TrendingDown, CheckCircle2, ExternalLink } from "lucide-react"
import { hemisApi, HemisContractItem } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

function formatSum(val?: string | number): string {
  if (val == null) return "—"
  const n = Number(val)
  if (isNaN(n)) return String(val)
  return n.toLocaleString("uz-UZ") + " so'm"
}

export default function Moliyaviy() {
  const { data, loading, error, refetch } = useApi(() => hemisApi.contractList())
  const contracts: HemisContractItem[] = (data?.data as any)?.items ?? []
  const contract = contracts[0]?._data

  const totalAmount = Number(contract?.contractAmount ?? 0)
  const paidAmount  = Number(contract?.paidAmount ?? 0)
  const debtAmount  = Number(contract?.debitAmount ?? contract?.endRestDebetAmount ?? 0)
  const pct         = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  if (!contract) {
    return (
      <div className="flex flex-col gap-6 p-[30px]">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Moliyaviy</h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>To&apos;lov holati va ma&apos;lumotlar</p>
        </div>
        <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <Wallet className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Kontrakt ma&apos;lumotlari topilmadi</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Moliyaviy</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>To&apos;lov holati va ma&apos;lumotlar</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: "Jami to'lov",  value: formatSum(totalAmount), icon: Wallet,       color: "#012970" },
          { label: "To'langan",    value: formatSum(paidAmount),  icon: CheckCircle2, color: "#22c55e" },
          { label: "Qoldiq qarz",  value: formatSum(debtAmount),  icon: TrendingDown, color: debtAmount > 0 ? "#ef4444" : "#22c55e" },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-[8px] flex items-center justify-center" style={{ backgroundColor: "#f6f9ff" }}>
                  <Icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</span>
              </div>
              <p className="text-xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</p>
            </div>
          )
        })}
      </div>

      {/* Progress */}
      <div className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>To&apos;lov jarayoni</h2>
          <span className="text-sm font-semibold" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{pct}%</span>
        </div>
        <div className="w-full h-3 rounded-full" style={{ backgroundColor: "rgba(1,41,112,0.08)" }}>
          <div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: "#1cc2dc" }} />
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          <span>{formatSum(paidAmount)} to&apos;langan</span>
          <span>{formatSum(totalAmount)} jami</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Contract details */}
        <div className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5" style={{ color: "#0e58a8" }} />
            <h2 className="text-base font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Kontrakt ma&apos;lumotlari</h2>
          </div>
          {[
            { label: "Kontrakt №",       value: contract.contractNumber },
            { label: "Holati",           value: contract.status },
            { label: "Bosqich",          value: contract.course },
            { label: "Yo'nalish",        value: contract.speciality },
            { label: "Jami summa",       value: formatSum(contract.contractAmount) },
            { label: "To'langan",        value: formatSum(contract.paidAmount) },
            { label: "Qarz",             value: formatSum(contract.debitAmount) },
            { label: "Oxirgi to'lov",    value: contract.lastPaymentDate ?? "—" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2.5"
              style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
              <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{item.label}</span>
              <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{item.value ?? "—"}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-[10px] p-5 flex flex-col gap-4" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-5 h-5" style={{ color: "#0e58a8" }} />
            <h2 className="text-base font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Amallar</h2>
          </div>
          {contract.pdfLink && (
            <a href={contract.pdfLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-[5px] text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
              <ExternalLink className="w-4 h-4" />
              Kontrakt PDF ni ko&apos;rish
            </a>
          )}
          {contract.contractUrl && (
            <a href={contract.contractUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-[5px] text-sm font-medium transition-opacity hover:opacity-90"
              style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              <ExternalLink className="w-4 h-4" />
              Kontrakt saytiga o&apos;tish
            </a>
          )}
          <div className="mt-2 p-4 rounded-[8px]" style={{ backgroundColor: "#f6f9ff" }}>
            <p className="text-xs font-medium mb-1" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              To&apos;lov muddati
            </p>
            <p className="text-sm font-semibold" style={{ color: debtAmount > 0 ? "#ef4444" : "#22c55e", fontFamily: "var(--font-poppins)" }}>
              {contract.lastPaymentDate ?? "—"}
            </p>
            <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {debtAmount > 0 ? `Qoldiq: ${formatSum(debtAmount)}` : "To'lov to'liq amalga oshirilgan"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
