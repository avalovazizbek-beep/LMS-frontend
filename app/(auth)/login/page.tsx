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
  // HEMIS'ning parol-orqali-kirish endpointi ko'p urinishda vaqtincha
  // bloklab qo'yishi mumkin (1000+ talaba bir vaqtda urinsa reallashadi).
  // OAuth esa kirish ma'lumotlarini to'g'ridan-to'g'ri HEMIS'ning o'z
  // sahifasida, har bir talabaning o'z brauzeridan (bizning umumiy server
  // IP'imiz orqali EMAS) qabul qiladi — shu limitga tegmaydi. Shuning
  // uchun OAuth ASOSIY, login-parol esa zaxira usul sifatida ko'rsatiladi.
  const [passwordFormOpen, setPasswordFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorRateLimited, setErrorRateLimited] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  // HEMIS talaba (student.sies.uz) va xodim (hemis.sies.uz) uchun
  // ALOHIDA-ALOHIDA tizimlar — bitta OAuth so'rovi ikkalasini ham
  // aniqlay olmaydi (talaba login-paroli hodim tizimida "topilmadi"
  // deb rad etiladi). Shu sabab foydalanuvchi avval o'z rolini tanlaydi.
  const startHemisOAuth = async (role: "student" | "employee") => {
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
      window.location.href = hemisApi.oauthStartUrl(role)
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
    setErrorRateLimited(false)
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
      setErrorRateLimited(data.rateLimited === true)
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
            HEMIS orqali kirish tavsiya etiladi — tezroq va band bo&apos;lmaydi
          </p>
        </div>

        <div className="rounded-[10px] bg-[var(--lms-cell)] p-8" style={{ boxShadow: "var(--lms-shadow)" }}>
          <div className="flex flex-col gap-2">
            <p className="text-center text-sm font-medium" style={{ color: "var(--lms-primary)", fontFamily: "var(--font-poppins)" }}>
              {oauthLoading ? "HEMIS login sahifasi ochilmoqda..." : "Kim sifatida kirmoqchisiz?"}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => startHemisOAuth("student")} disabled={oauthLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-[5px] py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "var(--lms-button)", fontFamily: "var(--font-poppins)" }}>
                <KeyRound className="h-5 w-5" />
                Talaba
              </button>
              <button type="button" onClick={() => startHemisOAuth("employee")} disabled={oauthLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-[5px] py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "var(--lms-button)", fontFamily: "var(--font-poppins)" }}>
                <KeyRound className="h-5 w-5" />
                Xodim
              </button>
            </div>
            <p className="text-center text-xs" style={{ color: "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}>
              HEMIS o&apos;z sahifasida login-parolni so&apos;raydi, LMS unga tegmaydi — shu sabab band bo&apos;lmaydi.
            </p>
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1" style={{ backgroundColor: "var(--lms-border)" }} />
            <span className="text-xs" style={{ color: "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}>yoki</span>
            <div className="h-px flex-1" style={{ backgroundColor: "var(--lms-border)" }} />
          </div>

          {!passwordFormOpen ? (
            <button type="button" onClick={() => setPasswordFormOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-[5px] py-3 text-base font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--lms-soft)",
                color: "var(--lms-button)",
                border: "1px solid var(--lms-border)",
                fontFamily: "var(--font-poppins)",
              }}>
              <User className="h-5 w-5" />
              Login va parol bilan kirish
            </button>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {error && (
                <div className="flex flex-col gap-2 rounded-[5px] px-3 py-2.5 text-sm"
                  style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid #ef4444", fontFamily: "var(--font-poppins)" }}>
                  <span>{error}</span>
                  {errorRateLimited && (
                    <>
                      <span className="text-xs opacity-90">
                        HEMIS ko&apos;p urinishdan band. O&apos;rniga HEMIS orqali kiring — bu limitga tegmaydi:
                      </span>
                      <button type="button" onClick={() => startHemisOAuth("student")} disabled={oauthLoading}
                        className="flex items-center justify-center gap-2 self-start rounded-[5px] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                        style={{ backgroundColor: "var(--lms-button)", fontFamily: "var(--font-poppins)" }}>
                        <KeyRound className="h-3.5 w-3.5" />
                        HEMIS orqali kirish
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--lms-primary)", fontFamily: "var(--font-poppins)" }}>
                  HEMIS Login
                </label>
                <div className="flex items-center gap-3 rounded-[5px] px-3 py-2.5"
                  style={{ border: "1px solid var(--lms-border)", backgroundColor: "var(--lms-cell)" }}>
                  <User className="h-5 w-5 shrink-0" style={{ color: "var(--lms-muted)" }} />
                  <input
                    type="text"
                    value={login}
                    onChange={e => setLogin(e.target.value)}
                    placeholder="Login kiriting"
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "var(--lms-primary)", fontFamily: "var(--font-poppins)" }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--lms-primary)", fontFamily: "var(--font-poppins)" }}>
                  Parol
                </label>
                <div className="flex items-center gap-3 rounded-[5px] px-3 py-2.5"
                  style={{ border: "1px solid var(--lms-border)", backgroundColor: "var(--lms-cell)" }}>
                  <Lock className="h-5 w-5 shrink-0" style={{ color: "var(--lms-muted)" }} />
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Parol kiriting"
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "var(--lms-primary)", fontFamily: "var(--font-poppins)" }}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)} aria-label={showPwd ? "Parolni yashirish" : "Parolni ko'rsatish"}>
                    {showPwd
                      ? <EyeOff className="h-5 w-5" style={{ color: "var(--lms-muted)" }} />
                      : <Eye className="h-5 w-5" style={{ color: "var(--lms-muted)" }} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="mt-2 flex items-center justify-center rounded-[5px] py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "var(--lms-button)", fontFamily: "var(--font-poppins)" }}>
                {loading ? "Tekshirilmoqda..." : "Kirish"}
              </button>

              <button type="button" onClick={() => { setPasswordFormOpen(false); setError(null); setErrorRateLimited(false) }}
                className="text-center text-xs underline"
                style={{ color: "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}>
                Bekor qilish
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
