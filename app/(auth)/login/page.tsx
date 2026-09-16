"use client"

import { useState } from "react"
import { GraduationCap, KeyRound } from "lucide-react"
import { hemisApi } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LoginPage() {
  const [oauthLoading, setOauthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // HEMIS talaba (student.sies.uz) va xodim (hemis.sies.uz) uchun
  // ALOHIDA-ALOHIDA tizimlar — bitta OAuth so'rovi ikkalasini ham
  // aniqlay olmaydi (talaba login-paroli hodim tizimida "topilmadi"
  // deb rad etiladi). Shu sabab foydalanuvchi avval o'z rolini tanlaydi.
  const startHemisOAuth = async (role: "student" | "employee") => {
    setOauthLoading(true)
    setError(null)
    try {
      localStorage.removeItem("lms_token")
      localStorage.removeItem("lms_role")
      sessionStorage.removeItem("hemis_oauth_state")
      sessionStorage.removeItem("hemis_oauth_role")
      sessionStorage.removeItem("hemis_oauth_redirect_uri")
      window.location.href = hemisApi.oauthStartUrl(role)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "HEMIS orqali kirishda xatolik")
      setOauthLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--lms-bg)" }}>
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[480px] px-4">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--lms-button)" }}>
            <GraduationCap className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-center text-[28px] font-semibold" style={{ color: "var(--lms-primary)", fontFamily: "var(--font-poppins)" }}>
            Masofaviy Ta&apos;lim
          </h1>
          <p className="mt-1 text-center text-sm" style={{ color: "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}>
            HEMIS orqali kiring
          </p>
        </div>

        <div className="rounded-[10px] bg-[var(--lms-cell)] p-8" style={{ boxShadow: "var(--lms-shadow)" }}>
          <div className="flex flex-col gap-4">
            {error && (
              <div className="rounded-[5px] px-3 py-2.5 text-sm"
                style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid #ef4444", fontFamily: "var(--font-poppins)" }}>
                {error}
              </div>
            )}

            <p className="text-center text-sm" style={{ color: "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}>
              {oauthLoading ? "HEMIS login sahifasi ochilmoqda..." : "Kim sifatida kirmoqchisiz?"}
            </p>

            <button type="button" onClick={() => startHemisOAuth("student")} disabled={oauthLoading}
              className="flex items-center justify-center gap-2 rounded-[5px] py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "var(--lms-button)", fontFamily: "var(--font-poppins)" }}>
              <KeyRound className="h-5 w-5" />
              HEMIS orqali talaba sifatida kirish
            </button>

            <button type="button" onClick={() => startHemisOAuth("employee")} disabled={oauthLoading}
              className="flex items-center justify-center gap-2 rounded-[5px] py-3 text-base font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{
                backgroundColor: "var(--lms-soft)",
                color: "var(--lms-button)",
                border: "1px solid var(--lms-border)",
                fontFamily: "var(--font-poppins)",
              }}>
              <KeyRound className="h-5 w-5" />
              HEMIS orqali xodim sifatida kirish
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
