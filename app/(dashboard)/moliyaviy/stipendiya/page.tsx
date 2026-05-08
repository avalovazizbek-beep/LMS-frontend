"use client"

import { Wallet, TrendingUp, CheckCircle2 } from "lucide-react"
import { hemisApi } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

function formatSum(val?: number): string {
  if (val == null) return "—"
  return val.toLocaleString("uz-UZ") + " so'm"
}

export default function StipendiyaHisobi() {
  const { data, loading, error, refetch } = useApi(() => hemisApi.billing())
  const billing = data?.data

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  const rows = billing ? [
    { label: "Subsidiya (ijara)",  data: billing.subsidy_rent,   color: "#1cc2dc" },
    { label: "Kredit moduli",      data: billing.credit_module,  color: "#0e58a8" },
    { label: "Turar joy",          data: billing.residence,       color: "#22c55e" },
  ].filter(r => r.data) : []

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Stipendiya Hisobi
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Moliyaviy hisoblar va to&apos;lovlar
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-[10px] p-14 text-center"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <Wallet className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Moliyaviy ma&apos;lumotlar topilmadi
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {rows.map(row => {
            if (!row.data) return null
            const { amount, paid, debt } = row.data
            const pct = amount > 0 ? Math.round((paid / amount) * 100) : 0
            return (
              <div key={row.label} className="bg-white rounded-[10px] p-5"
                style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
                <h3 className="font-semibold text-base mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {row.label}
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { icon: Wallet,       label: "Jami",     value: formatSum(amount), color: "#012970" },
                    { icon: CheckCircle2, label: "To'langan", value: formatSum(paid),   color: "#22c55e" },
                    { icon: TrendingUp,   label: "Qarz",      value: formatSum(debt),   color: debt > 0 ? "#ef4444" : "#22c55e" },
                  ].map(s => {
                    const Icon = s.icon
                    return (
                      <div key={s.label} className="rounded-[8px] p-3" style={{ backgroundColor: "#f6f9ff" }}>
                        <Icon className="w-4 h-4 mb-1" style={{ color: s.color }} />
                        <p className="text-xs font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>
                          {s.value}
                        </p>
                        <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</p>
                      </div>
                    )
                  })}
                </div>
                <div className="w-full h-2 rounded-full mb-1" style={{ backgroundColor: "rgba(1,41,112,0.08)" }}>
                  <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: row.color }} />
                </div>
                <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {pct}% to&apos;langan
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
