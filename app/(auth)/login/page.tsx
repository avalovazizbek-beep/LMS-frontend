"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, GraduationCap, KeyRound, Lock, User } from "lucide-react"
import { hemisApi, faceApi } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export default function LoginPage() {
  const router = useRouter()
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPwd, setShowPwd] = useState(false)

  const startHemisOAuth = async () => {
    setOauthLoading(true)
    setError(null)
    try {
      sessionStorage.removeItem("lms_token")
      sessionStorage.removeItem("lms_role")
      localStorage.removeItem("lms_token")
      localStorage.removeItem("lms_role")
      sessionStorage.removeItem("hemis_oauth_state")
      sessionStorage.removeItem("hemis_oauth_role")
      sessionStorage.removeItem("hemis_oauth_redirect_uri")
      window.location.href = hemisApi.oauthStartUrl("employee")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "HEMIS orqali kirishda xatolik")
      setOauthLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!login.trim() || !password.trim()) {
      setError("Talaba sifatida kirish uchun login va parolni kiriting")
      return
    }

    setLoading(true)
    setError(null)
    try {
      sessionStorage.removeItem("lms_token")
      sessionStorage.removeItem("lms_role")
      localStorage.removeItem("lms_token")
      localStorage.removeItem("lms_role")
      const res = await hemisApi.autoLogin(login.trim(), password.trim())
      sessionStorage.setItem("lms_token", res.token)
      sessionStorage.setItem("lms_role", res.role)
      if (res.role === "student") {
        try {
          const faceStatus = await faceApi.status()
          if (!faceStatus.registered) {
            router.push("/face-setup")
            return
          }
        } catch {
          // Face ID tekshirishda xato bo'lsa dashboardga o'taveramiz
        }
      }
      router.push("/dashboard")
    } catch (err: unknown) {
      const data = asRecord((err as { data?: unknown })?.data)
      if (data.oauthRequired) {
        setError(
          typeof data.message === "string"
            ? data.message
            : "O'qituvchi yoki xodim HEMIS orqali kirish tugmasi bilan kiradi"
        )
        return
      }
      setError(err instanceof Error ? err.message : "Login yoki parol noto'g'ri")
    } finally {
      setLoading(false)
    }
  }

  const handleHemisOAuth = async () => {
    await startHemisOAuth()
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--lms-bg)" }}>
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[480px] px-4">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: "#0e58a8" }}>
            <GraduationCap className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-center text-[28px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Masofaviy Ta&apos;lim
          </h1>
          <p className="mt-1 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Talaba login/paroli yoki HEMIS OAuth orqali kirish
          </p>
        </div>

        <div className="rounded-[10px] bg-[var(--lms-cell)] p-8" style={{ boxShadow: "var(--lms-shadow)" }}>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-[5px] px-3 py-2.5 text-sm"
                style={{ backgroundColor: "#fff0f0", color: "#ef4444", border: "1px solid #ef4444", fontFamily: "var(--font-poppins)" }}>
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                HEMIS Login
              </label>
              <div className="flex items-center gap-3 rounded-[5px] px-3 py-2.5"
                style={{ border: "1px solid rgba(1,41,112,0.3)", backgroundColor: "#fff" }}>
                <User className="h-5 w-5 shrink-0" style={{ color: "#7293b9" }} />
                <input
                  type="text"
                  value={login}
                  onChange={e => setLogin(e.target.value)}
                  placeholder="Login kiriting"
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                Parol
              </label>
              <div className="flex items-center gap-3 rounded-[5px] px-3 py-2.5"
                style={{ border: "1px solid rgba(1,41,112,0.3)", backgroundColor: "#fff" }}>
                <Lock className="h-5 w-5 shrink-0" style={{ color: "#7293b9" }} />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Parol kiriting"
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} aria-label={showPwd ? "Parolni yashirish" : "Parolni ko'rsatish"}>
                  {showPwd
                    ? <EyeOff className="h-5 w-5" style={{ color: "#7293b9" }} />
                    : <Eye className="h-5 w-5" style={{ color: "#7293b9" }} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="mt-2 flex items-center justify-center rounded-[5px] py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              {loading ? "Tekshirilmoqda..." : "Kirish"}
            </button>

            <button type="button" onClick={handleHemisOAuth} disabled={oauthLoading}
              className="flex items-center justify-center gap-2 rounded-[5px] py-3 text-base font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{
                backgroundColor: "#f0f5ff",
                color: "#0e58a8",
                border: "1px solid rgba(14,88,168,0.18)",
                fontFamily: "var(--font-poppins)",
              }}>
              <KeyRound className="h-5 w-5" />
              {oauthLoading ? "HEMIS login sahifasi ochilmoqda..." : "HEMIS orqali kirish"}
            </button>

          </form>
        </div>
      </div>
    </main>
  )
}
