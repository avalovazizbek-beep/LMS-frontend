"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, GraduationCap, Lock, User, UserCog } from "lucide-react"
import { authApi, hemisApi } from "@/lib/api"

type LoginMethod = "login" | "hemis" | "face"
type HemisRole   = "student" | "employee"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [activeMethod, setActiveMethod] = useState<LoginMethod>("login")

  /* ─── local admin ─── */
  const [username, setUsername]   = useState("")
  const [password, setPassword]   = useState("")
  const [loading,  setLoading]    = useState(false)
  const [error,    setError]      = useState<string | null>(null)

  /* ─── HEMIS (talaba / xodim) ─── */
  const [hemisRole,     setHemisRole]     = useState<HemisRole>("student")
  const [hemisLogin,    setHemisLogin]    = useState("")
  const [hemisPassword, setHemisPassword] = useState("")
  const [hemisLoading,  setHemisLoading]  = useState(false)
  const [hemisError,    setHemisError]    = useState<string | null>(null)
  const [showHemisPwd,  setShowHemisPwd]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await authApi.login(username.trim(), password.trim())
      localStorage.setItem("lms_token", res.token)
      router.push("/dashboard")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login yoki parol noto'g'ri")
    } finally {
      setLoading(false)
    }
  }

  const handleHemisSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hemisLogin.trim() || !hemisPassword.trim()) return
    setHemisLoading(true)
    setHemisError(null)
    try {
      const res = hemisRole === "student"
        ? await hemisApi.login(hemisLogin.trim(), hemisPassword.trim())
        : await hemisApi.employeeLogin(hemisLogin.trim(), hemisPassword.trim())

      localStorage.setItem("lms_token", res.token)
      localStorage.setItem("lms_role", hemisRole)
      router.push("/dashboard")
    } catch (err: unknown) {
      setHemisError(err instanceof Error ? err.message : "Login yoki parol noto'g'ri")
    } finally {
      setHemisLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f6f9ff" }}>
      <div className="w-full max-w-[480px] px-4">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: "#0e58a8" }}>
            <GraduationCap className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-center text-[28px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Masofaviy Ta&apos;lim
          </h1>
          <p className="mt-1 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Tizimga kirish
          </p>
        </div>

        <div className="rounded-[10px] bg-white p-8" style={{ boxShadow: "0px 0px 20px rgba(1,41,112,0.1)" }}>
          {/* Method tabs */}
          <div className="mb-6 flex overflow-hidden rounded-[10px]" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            {([ { key: "login", label: "Login" }, { key: "hemis", label: "HEMIS" }, { key: "face", label: "Face ID" } ] as const).map((m) => (
              <button key={m.key} type="button" onClick={() => setActiveMethod(m.key)}
                className="flex-1 py-2.5 text-sm font-medium transition-colors"
                style={{ fontFamily: "var(--font-poppins)", backgroundColor: activeMethod === m.key ? "#0e58a8" : "transparent", color: activeMethod === m.key ? "#fff" : "#7293b9" }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* ── Local admin login ── */}
          {activeMethod === "login" && (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-[5px] px-3 py-2.5 text-sm" style={{ backgroundColor: "#fff0f0", color: "#ef4444", border: "1px solid #ef4444", fontFamily: "var(--font-poppins)" }}>
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="username" className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Foydalanuvchi nomi</label>
                <div className="flex items-center gap-3 rounded-[5px] bg-white px-3 py-2.5" style={{ border: "1px solid rgba(1,41,112,0.3)" }}>
                  <User className="h-5 w-5 shrink-0" style={{ color: "#7293b9" }} />
                  <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="Login kiriting" className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Parol</label>
                <div className="flex items-center gap-3 rounded-[5px] bg-white px-3 py-2.5" style={{ border: "1px solid rgba(1,41,112,0.3)" }}>
                  <Lock className="h-5 w-5 shrink-0" style={{ color: "#7293b9" }} />
                  <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Parol kiriting" className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password">
                    {showPassword ? <EyeOff className="h-5 w-5" style={{ color: "#7293b9" }} /> : <Eye className="h-5 w-5" style={{ color: "#7293b9" }} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="mt-2 flex items-center justify-center rounded-[5px] py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                {loading ? "Kirish..." : "Kirish"}
              </button>
              <p className="text-center text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Demo: <strong>admin</strong> / <strong>admin123</strong>
              </p>
            </form>
          )}

          {/* ── HEMIS login (talaba / xodim) ── */}
          {activeMethod === "hemis" && (
            <div className="flex flex-col gap-4">
              {/* Role toggle */}
              <div className="flex rounded-[8px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.15)" }}>
                <button type="button" onClick={() => { setHemisRole("student"); setHemisError(null) }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors"
                  style={{ fontFamily: "var(--font-poppins)", backgroundColor: hemisRole === "student" ? "#0e58a8" : "transparent", color: hemisRole === "student" ? "#fff" : "#7293b9" }}>
                  <User className="w-4 h-4" /> Talaba
                </button>
                <button type="button" onClick={() => { setHemisRole("employee"); setHemisError(null) }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors"
                  style={{ fontFamily: "var(--font-poppins)", backgroundColor: hemisRole === "employee" ? "#1cc2dc" : "transparent", color: hemisRole === "employee" ? "#fff" : "#7293b9" }}>
                  <UserCog className="w-4 h-4" /> Xodim
                </button>
              </div>

              <form className="flex flex-col gap-4" onSubmit={handleHemisSubmit}>
                {hemisError && (
                  <div className="rounded-[5px] px-3 py-2.5 text-sm" style={{ backgroundColor: "#fff0f0", color: "#ef4444", border: "1px solid #ef4444", fontFamily: "var(--font-poppins)" }}>
                    {hemisError}
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="hemis-login" className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    HEMIS Login
                  </label>
                  <div className="flex items-center gap-3 rounded-[5px] bg-white px-3 py-2.5" style={{ border: "1px solid rgba(1,41,112,0.3)" }}>
                    {hemisRole === "student"
                      ? <User className="h-5 w-5 shrink-0" style={{ color: "#7293b9" }} />
                      : <UserCog className="h-5 w-5 shrink-0" style={{ color: "#7293b9" }} />}
                    <input id="hemis-login" type="text" value={hemisLogin} onChange={(e) => setHemisLogin(e.target.value)}
                      placeholder={hemisRole === "student" ? "Talaba login" : "Xodim login"}
                      className="flex-1 bg-transparent text-sm outline-none"
                      style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="hemis-password" className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Parol</label>
                  <div className="flex items-center gap-3 rounded-[5px] bg-white px-3 py-2.5" style={{ border: "1px solid rgba(1,41,112,0.3)" }}>
                    <Lock className="h-5 w-5 shrink-0" style={{ color: "#7293b9" }} />
                    <input id="hemis-password" type={showHemisPwd ? "text" : "password"} value={hemisPassword} onChange={(e) => setHemisPassword(e.target.value)}
                      placeholder="Parol kiriting" className="flex-1 bg-transparent text-sm outline-none"
                      style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
                    <button type="button" onClick={() => setShowHemisPwd(!showHemisPwd)} aria-label="Toggle password">
                      {showHemisPwd ? <EyeOff className="h-5 w-5" style={{ color: "#7293b9" }} /> : <Eye className="h-5 w-5" style={{ color: "#7293b9" }} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={hemisLoading}
                  className="mt-2 flex items-center justify-center rounded-[5px] py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: hemisRole === "student" ? "#0e58a8" : "#1cc2dc", fontFamily: "var(--font-poppins)" }}>
                  {hemisLoading ? "Kirish..." : hemisRole === "student" ? "Talaba sifatida kirish" : "Xodim sifatida kirish"}
                </button>
                <p className="text-center text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {hemisRole === "student"
                    ? "Universitet talaba login va parolini kiriting"
                    : "Universitet xodim login va parolini kiriting"}
                </p>
              </form>
            </div>
          )}

          {/* ── Face ID ── */}
          {activeMethod === "face" && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-32 w-32 items-center justify-center rounded-full"
                style={{ backgroundColor: "#f6f9ff", border: "2px dashed #1cc2dc" }}>
                <User className="h-16 w-16" style={{ color: "#1cc2dc" }} />
              </div>
              <p className="text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Kamera yoqiladi va yuzingiz skanerlanadi
              </p>
              <button type="button"
                className="flex w-full items-center justify-center rounded-[5px] py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>
                Kamerani yoqish
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
