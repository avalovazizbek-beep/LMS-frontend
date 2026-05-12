"use client"

import Link from "next/link"
import { CheckCircle2, AlertCircle, Clock, ScanFace, RefreshCw, ClipboardList, ShieldCheck } from "lucide-react"
import { faceApi, FaceStatus } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

function formatDate(ts?: number): string {
  if (!ts) return "—"
  return new Date(ts).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function FaceIdPage() {
  const { data, loading, error, refetch } = useApi(() => faceApi.status())
  const st: FaceStatus = data ?? { registered: false }

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  const canRegister = !st.registered || st.hasApprovedRequest

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Face ID
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Yuz identifikatsiyasi tizimi
        </p>
      </div>

      {/* Status card */}
      <div className="bg-white rounded-[10px] p-6"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-[12px] flex items-center justify-center"
            style={{ backgroundColor: st.registered ? "#f0fff4" : "#fff8e6" }}>
            {st.registered
              ? <CheckCircle2 className="w-7 h-7" style={{ color: "#22c55e" }} />
              : <AlertCircle  className="w-7 h-7" style={{ color: "#f59e0b" }} />}
          </div>
          <div>
            <p className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {st.registered ? "Yuz tasdiqlangan" : "Yuz ro'yxatdan o'tkazilmagan"}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {st.registered
                ? `Ro'yxatga olingan: ${formatDate(st.registeredAt)}`
                : "Imtihon oldidan yuzingizni ro'yxatdan o'tkazing"}
            </p>
          </div>
        </div>

        {/* Info rows */}
        {st.registered && (
          <div className="flex flex-col gap-2 mb-5">
            {[
              { label: "Ro'yxatga olingan", value: formatDate(st.registeredAt) },
              { label: "Holati",            value: "Tasdiqlangan" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2"
                style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{row.label}</span>
                <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pending request notice */}
        {st.hasPendingRequest && (
          <div className="flex items-center gap-3 p-3 rounded-[8px] mb-4"
            style={{ backgroundColor: "#fff8e6", border: "1px solid rgba(245,158,11,0.3)" }}>
            <Clock className="w-5 h-5 shrink-0" style={{ color: "#f59e0b" }} />
            <p className="text-sm" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
              Ariza ko'rib chiqilmoqda. Admin tasdiqlashini kuting.
            </p>
          </div>
        )}

        {/* Approved notice */}
        {st.hasApprovedRequest && (
          <div className="flex items-center gap-3 p-3 rounded-[8px] mb-4"
            style={{ backgroundColor: "#f0fff4", border: "1px solid rgba(34,197,94,0.3)" }}>
            <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#22c55e" }} />
            <p className="text-sm" style={{ color: "#166534", fontFamily: "var(--font-poppins)" }}>
              Qayta ro'yxatdan o'tishingiz tasdiqlandi! Endi ro'yxatdan o'tishingiz mumkin.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          {canRegister && (
            <Link href="/face-id/register"
              className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
              <ScanFace className="w-4 h-4" />
              {st.registered ? "Qayta ro'yxatdan o'tish" : "Yuzni ro'yxatdan o'tkazish"}
            </Link>
          )}
          {st.registered && !st.hasPendingRequest && !st.hasApprovedRequest && (
            <Link href="/face-id/re-register"
              className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-medium transition-opacity hover:opacity-90"
              style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              <RefreshCw className="w-4 h-4" />
              Qayta ro'yxatdan o'tish uchun ariza
            </Link>
          )}
        </div>
      </div>

      {/* Quick info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: ScanFace,
            title: "Ro'yxatdan o'tish",
            desc: "Kamera orqali yuzingizni ro'yxatdan o'tkazing. 3 ta surat olinadi.",
            color: "#0e58a8", bg: "#f0f5ff",
          },
          {
            icon: ShieldCheck,
            title: "Imtihon oldidan tekshirish",
            desc: "Har bir imtihon oldidan yuz tasdiqlanadigan bo'ladi.",
            color: "#1cc2dc", bg: "#f0fbfd",
          },
          {
            icon: ClipboardList,
            title: "Arizalar",
            desc: "Qayta ro'yxatdan o'tish arizalarini boshqaring.",
            color: "#22c55e", bg: "#f0fff4",
            href: "/face-id/requests",
          },
        ].map(c => {
          const Icon = c.icon
          const inner = (
            <div className="bg-white rounded-[10px] p-5 flex flex-col gap-3 h-full"
              style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
              <div className="w-10 h-10 rounded-[8px] flex items-center justify-center"
                style={{ backgroundColor: c.bg }}>
                <Icon className="w-5 h-5" style={{ color: c.color }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{c.title}</p>
                <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{c.desc}</p>
              </div>
            </div>
          )
          return c.href
            ? <Link key={c.title} href={c.href} className="hover:opacity-90 transition-opacity">{inner}</Link>
            : <div key={c.title}>{inner}</div>
        })}
      </div>
    </div>
  )
}
