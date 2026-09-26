"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { GraduationCap, KeyRound } from "lucide-react"
import { hemisApi } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher"
import { useLanguage } from "@/lib/i18n/LanguageContext"

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [oauthLoading, setOauthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 30 daqiqa harakatsizlikdan keyin chiqarilgan bo'lsa (IdleLogout)
  const [idleNotice, setIdleNotice] = useState(false)
  useEffect(() => {
    setIdleNotice(new URLSearchParams(window.location.search).get("reason") === "idle")
  }, [])

  // Faqat Zoom Marketplace ko'rib chiqish (va shunga o'xshash tashqi test)
  // uchun — HEMIS'ga bog'liq bo'lmagan, oldindan yaratilgan demo login/parol
  // hisoblari (backend/scripts/seed-demo.ts). Har qanday boshqa login/parol
  // bilan urinish shunchaki oddiy HEMIS login sifatida rad etiladi.
  const [showDemoForm, setShowDemoForm] = useState(false)
  const [demoLogin, setDemoLogin] = useState("")
  const [demoPassword, setDemoPassword] = useState("")
  const [demoLoading, setDemoLoading] = useState(false)

  const handleDemoLogin = async () => {
    setDemoLoading(true)
    setError(null)
    try {
      const res = await hemisApi.autoLogin(demoLogin.trim(), demoPassword)
      localStorage.setItem("lms_token", res.token)
      localStorage.setItem("lms_role", res.role)
      router.push("/dashboard")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("login.error"))
      setDemoLoading(false)
    }
  }

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
      setError(err instanceof Error ? err.message : t("login.hemisError"))
      setOauthLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--lms-bg)" }}>
      <div className="absolute right-5 top-5 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[480px] px-4">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--lms-button)" }}>
            <GraduationCap className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-center text-[28px] font-semibold" style={{ color: "var(--lms-primary)", fontFamily: "var(--font-poppins)" }}>
            {t("login.title")}
          </h1>
          <p className="mt-1 text-center text-sm" style={{ color: "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}>
            {t("login.subtitle")}
          </p>
        </div>

        <div className="rounded-[10px] bg-[var(--lms-cell)] p-8" style={{ boxShadow: "var(--lms-shadow)" }}>
          <div className="flex flex-col gap-4">
            {idleNotice && !error && (
              <div className="rounded-[5px] px-3 py-2.5 text-sm"
                style={{ backgroundColor: "rgba(234,179,8,0.12)", color: "#a16207", border: "1px solid #eab308", fontFamily: "var(--font-poppins)" }}>
                {t("login.idleNotice")}
              </div>
            )}
            {error && (
              <div className="rounded-[5px] px-3 py-2.5 text-sm"
                style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid #ef4444", fontFamily: "var(--font-poppins)" }}>
                {error}
              </div>
            )}

            <p className="text-center text-sm" style={{ color: "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}>
              {oauthLoading ? t("login.opening") : t("login.chooseRole")}
            </p>

            <button type="button" onClick={() => startHemisOAuth("student")} disabled={oauthLoading}
              className="flex items-center justify-center gap-2 rounded-[5px] py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "var(--lms-button)", fontFamily: "var(--font-poppins)" }}>
              <KeyRound className="h-5 w-5" />
              {t("login.asStudent")}
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
              {t("login.asEmployee")}
            </button>

            {!showDemoForm ? (
              <button type="button" onClick={() => setShowDemoForm(true)}
                className="text-center text-xs underline decoration-dotted"
                style={{ color: "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}>
                {t("login.demo")}
              </button>
            ) : (
              <div className="flex flex-col gap-2.5 border-t pt-4" style={{ borderColor: "var(--lms-border)" }}>
                <input type="text" value={demoLogin} onChange={(e) => setDemoLogin(e.target.value)}
                  placeholder={t("login.loginPlaceholder")} autoComplete="username"
                  className="rounded-[5px] px-3 py-2.5 text-sm outline-none"
                  style={{ border: "1px solid var(--lms-border)", backgroundColor: "var(--lms-cell)", color: "var(--lms-primary)", fontFamily: "var(--font-poppins)" }} />
                <input type="password" value={demoPassword} onChange={(e) => setDemoPassword(e.target.value)}
                  placeholder={t("login.passwordPlaceholder")} autoComplete="current-password"
                  onKeyDown={(e) => { if (e.key === "Enter" && demoLogin && demoPassword && !demoLoading) handleDemoLogin() }}
                  className="rounded-[5px] px-3 py-2.5 text-sm outline-none"
                  style={{ border: "1px solid var(--lms-border)", backgroundColor: "var(--lms-cell)", color: "var(--lms-primary)", fontFamily: "var(--font-poppins)" }} />
                <button type="button" onClick={handleDemoLogin} disabled={demoLoading || !demoLogin || !demoPassword}
                  className="rounded-[5px] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "var(--lms-button)", fontFamily: "var(--font-poppins)" }}>
                  {demoLoading ? t("login.signingIn") : t("login.signIn")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
