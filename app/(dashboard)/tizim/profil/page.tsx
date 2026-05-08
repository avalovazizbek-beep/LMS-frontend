"use client"

import { User, Shield, Key } from "lucide-react"
import { hemisApi, HemisStudent } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

export default function TizimProfil() {
  const { data, loading, error, refetch } = useApi(() => hemisApi.me())
  const s: HemisStudent | null = data?.data ?? null

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Profil
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Foydalanuvchi profili va sozlamalari
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Avatar */}
        <div className="bg-white rounded-[10px] p-6 flex flex-col items-center gap-3"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold"
            style={{ backgroundColor: "#0e58a8" }}>
            {s?.first_name?.charAt(0)?.toUpperCase() ?? "T"}
          </div>
          <div className="text-center">
            <p className="font-semibold text-base" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {s?.full_name ?? "—"}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {s?.group?.name ?? "Talaba"}
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {s?.semester?.name ?? "—"}
          </span>
        </div>

        {/* Info */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div className="bg-white rounded-[10px] p-5"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5" style={{ color: "#1cc2dc" }} />
              <h3 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                Asosiy ma&apos;lumotlar
              </h3>
            </div>
            {[
              { label: "To'liq ism",     value: s?.full_name },
              { label: "HEMIS ID",       value: s?.student_id_number },
              { label: "Telefon",        value: s?.phone },
              { label: "Email",          value: s?.email },
              { label: "Fakultet",       value: s?.faculty?.name },
              { label: "Guruh",          value: s?.group?.name },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2.5"
                style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{item.label}</span>
                <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {item.value || "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[10px] p-5"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5" style={{ color: "#0e58a8" }} />
              <h3 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                Xavfsizlik
              </h3>
            </div>
            <div className="flex items-center justify-between py-3"
              style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4" style={{ color: "#7293b9" }} />
                <span className="text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Parol</span>
              </div>
              <button className="text-xs font-medium px-3 py-1.5 rounded-[5px] transition-opacity hover:opacity-80"
                style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                O&apos;zgartirish
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
