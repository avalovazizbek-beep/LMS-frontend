import { Wallet, CreditCard, FileText, TrendingDown, CheckCircle2, AlertCircle, Clock } from "lucide-react"

const payments = [
  { id: 1, description: "1-semestr to'lovi", amount: 3500000, date: "2023-09-01", status: "paid", method: "Payme" },
  { id: 2, description: "2-semestr to'lovi", amount: 3500000, date: "2024-02-01", status: "paid", method: "Click" },
  { id: 3, description: "3-semestr to'lovi", amount: 3500000, date: "2024-09-01", status: "pending", method: null },
]

const contract = {
  number: "2023-MT21-0042",
  totalAmount: 14000000,
  paidAmount: 7000000,
  discount: 10,
  startDate: "2023-09-01",
  endDate: "2027-06-30",
}

function formatSum(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm"
}

export default function Moliyaviy() {
  const remaining = contract.totalAmount - contract.paidAmount

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Moliyaviy</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>To&apos;lov holati va ma&apos;lumotlar</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: "Jami to'lov", value: formatSum(contract.totalAmount), icon: Wallet, color: "#012970" },
          { label: "To'langan", value: formatSum(contract.paidAmount), icon: CheckCircle2, color: "#22c55e" },
          { label: "Qoldiq", value: formatSum(remaining), icon: TrendingDown, color: remaining > 0 ? "#ef4444" : "#22c55e" },
        ].map((s) => {
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
          <span className="text-sm font-semibold" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{Math.round((contract.paidAmount / contract.totalAmount) * 100)}%</span>
        </div>
        <div className="w-full h-3 rounded-full" style={{ backgroundColor: "rgba(1,41,112,0.08)" }}>
          <div className="h-3 rounded-full" style={{ width: `${(contract.paidAmount / contract.totalAmount) * 100}%`, backgroundColor: "#1cc2dc" }} />
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          <span>{formatSum(contract.paidAmount)} to&apos;langan</span>
          <span>{formatSum(contract.totalAmount)} jami</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Contract */}
        <div className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5" style={{ color: "#0e58a8" }} />
            <h2 className="text-base font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Kontrakt</h2>
          </div>
          {[
            { label: "Kontrakt raqami", value: contract.number },
            { label: "Jami summa", value: formatSum(contract.totalAmount) },
            { label: "Chegirma", value: `${contract.discount}%` },
            { label: "Boshlanish", value: contract.startDate },
            { label: "Tugash", value: contract.endDate },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
              <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{item.label}</span>
              <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Payment history */}
        <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
            <CreditCard className="w-5 h-5" style={{ color: "#0e58a8" }} />
            <h2 className="text-base font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>To&apos;lov tarixi</h2>
          </div>
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
              <div className="flex items-center gap-3">
                {p.status === "paid"
                  ? <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />
                  : p.status === "pending"
                  ? <Clock className="w-4 h-4" style={{ color: "#f59e0b" }} />
                  : <AlertCircle className="w-4 h-4" style={{ color: "#ef4444" }} />}
                <div>
                  <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{p.description}</p>
                  <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{p.date}{p.method ? ` · ${p.method}` : ""}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{formatSum(p.amount)}</p>
                <p className="text-xs" style={{ color: p.status === "paid" ? "#22c55e" : p.status === "pending" ? "#f59e0b" : "#ef4444", fontFamily: "var(--font-poppins)" }}>
                  {p.status === "paid" ? "To'langan" : p.status === "pending" ? "Kutilmoqda" : "Muddati o'tgan"}
                </p>
              </div>
            </div>
          ))}
          {payments.some((p) => p.status === "pending") && (
            <div className="px-5 py-4">
              <button className="w-full py-2.5 rounded-[5px] text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                To&apos;lash
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
