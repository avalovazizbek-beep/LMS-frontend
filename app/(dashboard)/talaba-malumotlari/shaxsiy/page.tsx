"use client"

import { User, Phone, Mail, Calendar, Globe, Hash, MapPin } from "lucide-react"
import { hemisApi, HemisStudent } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

function formatDate(ts?: number): string {
  if (!ts) return "—"
  return new Date(ts * 1000).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function ShaxsiyMalumotlar() {
  const { data, loading, error, refetch } = useApi(() => hemisApi.me())
  const s: HemisStudent | null = data?.data ?? null

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Shaxsiy Ma&apos;lumotlar
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Shaxsiy kabinet ma&apos;lumotlari
        </p>
      </div>

      {/* Avatar card */}
      <div className="bg-white rounded-[10px] p-5 flex items-center gap-5"
        style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shrink-0"
          style={{ backgroundColor: "#0e58a8" }}>
          {s?.first_name?.charAt(0)?.toUpperCase() ?? "T"}
        </div>
        <div>
          <h2 className="text-xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {s?.full_name ?? "—"}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {s?.group?.name ?? "—"} · {s?.faculty?.name ?? "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Personal info */}
        <div className="bg-white rounded-[10px] p-5"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
          <h3 className="text-base font-semibold mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Asosiy ma&apos;lumotlar
          </h3>
          {[
            { icon: User,     label: "Familiya",        value: s?.second_name },
            { icon: User,     label: "Ism",             value: s?.first_name },
            { icon: User,     label: "Otasining ismi",  value: s?.third_name },
            { icon: Calendar, label: "Tug'ilgan sana",  value: formatDate(s?.birth_date) },
            { icon: Globe,    label: "Jinsi",           value: s?.gender?.name },
            { icon: Globe,    label: "Millati/Davlat",  value: s?.country?.name },
            { icon: MapPin,   label: "Turar joy",       value: s?.accommodation?.name },
          ].map(item => {
            const Icon = item.icon
            return (
              <div key={item.label} className="flex items-center gap-3 py-2.5"
                style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                <Icon className="w-4 h-4 shrink-0" style={{ color: "#1cc2dc" }} />
                <span className="text-sm flex-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{item.label}</span>
                <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {item.value || "—"}
                </span>
              </div>
            )
          })}
        </div>

        {/* Contact & IDs */}
        <div className="bg-white rounded-[10px] p-5"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
          <h3 className="text-base font-semibold mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Aloqa va identifikatsiya
          </h3>
          {[
            { icon: Phone,  label: "Telefon",       value: s?.phone },
            { icon: Mail,   label: "Email",          value: s?.email },
            { icon: Hash,   label: "HEMIS ID",       value: s?.student_id_number },
            { icon: Hash,   label: "Passport PIN",   value: s?.passport_pin },
          ].map(item => {
            const Icon = item.icon
            return (
              <div key={item.label} className="flex items-center gap-3 py-2.5"
                style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                <Icon className="w-4 h-4 shrink-0" style={{ color: "#0e58a8" }} />
                <span className="text-sm flex-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{item.label}</span>
                <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {item.value || "—"}
                </span>
              </div>
            )
          })}
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(1,41,112,0.06)" }}>
            <h4 className="text-sm font-semibold mb-3" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              O&apos;quv ma&apos;lumotlari
            </h4>
            {[
              { label: "Fakultet",      value: s?.faculty?.name },
              { label: "Yo'nalish",     value: s?.specialty?.name },
              { label: "Guruh",         value: s?.group?.name },
              { label: "Kurs",          value: s?.level?.name },
              { label: "Ta'lim shakli", value: s?.educationForm?.name },
              { label: "Ta'lim tili",   value: s?.educationLang?.name },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2"
                style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{item.label}</span>
                <span className="text-xs font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {item.value || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
