"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FlaskConical, LogIn } from "lucide-react"
import { sinovApi } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { AFTER_LOGIN_KEY } from "@/components/public/ZoomAddButton"

/* Sinov (demo) talabasi uchun kirish — talaba tomonini ko'rib chiqish uchun.
   Asosiy /login faqat HEMIS OAuth bo'lib qoladi; bu sahifaga havola yo'q.
   Login-parolni backend'dagi scripts/sinov-guruh.ts --student beradi. */
export default function SinovLoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      localStorage.removeItem("lms_token")
      localStorage.removeItem("lms_role")
      const res = await sinovApi.login(login.trim(), password)
      localStorage.setItem("lms_token", res.token)
      localStorage.setItem("lms_role", res.role)
      try { sessionStorage.removeItem(AFTER_LOGIN_KEY) } catch { /* storage yopiq */ }
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sinovLogin.error"))
      setLoading(false)
    }
  }

  const inputStyle = { border: "1px solid var(--lms-border)", backgroundColor: "var(--lms-cell)", color: "var(--lms-primary)", fontFamily: "var(--font-poppins)" }

  return (
    <main className="relative flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--lms-bg)" }}>
      <div className="absolute right-5 top-5 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[420px] px-4">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: "#7c3aed" }}>
            <FlaskConical className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-center text-[24px] font-semibold" style={{ color: "var(--lms-primary)", fontFamily: "var(--font-poppins)" }}>
            {t("sinovLogin.title")}
          </h1>
          <p className="mt-1 text-center text-sm" style={{ color: "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}>
            {t("sinovLogin.subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-[10px] bg-[var(--lms-cell)] p-7" style={{ boxShadow: "var(--lms-shadow)" }}>
          {error && (
            <div className="rounded-[5px] px-3 py-2.5 text-sm"
              style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid #ef4444", fontFamily: "var(--font-poppins)" }}>
              {error}
            </div>
          )}
          <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}>
            {t("sinovLogin.login")}
            <input type="text" value={login} onChange={e => setLogin(e.target.value)} autoComplete="username" required
              placeholder="sinov.talaba" className="w-full rounded-[6px] px-3 py-2.5 text-sm outline-none" style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium" style={{ color: "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}>
            {t("sinovLogin.password")}
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required
              className="w-full rounded-[6px] px-3 py-2.5 text-sm outline-none" style={inputStyle} />
          </label>
          <button type="submit" disabled={loading || !login || !password}
            className="flex items-center justify-center gap-2 rounded-[6px] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "#7c3aed", fontFamily: "var(--font-poppins)" }}>
            <LogIn className="h-4 w-4" />
            {loading ? t("sinovLogin.signingIn") : t("sinovLogin.submit")}
          </button>
          <p className="text-center text-xs" style={{ color: "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}>
            {t("sinovLogin.note")}{" "}
            <Link href="/login" className="font-medium underline" style={{ color: "var(--lms-primary)" }}>{t("sinovLogin.mainLogin")}</Link>
          </p>
        </form>
      </div>
    </main>
  )
}
