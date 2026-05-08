"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, GraduationCap, Lock, User, UserCog, ShieldCheck } from "lucide-react"
import { authApi, hemisApi } from "@/lib/api"

type LoginMethod = "hemis" | "system"
type HemisRole   = "student" | "employee"

export default function LoginPage() {
  const router = useRouter()

  const [activeMethod, setActiveMethod] = useState<LoginMethod>("hemis")

  /* ─── HEMIS login ─── */
  const [hemisRole,     setHemisRole]     = useState<HemisRole>("student")
  const [hemisLogin,    setHemisLogin]    = useState("")
  const [hemisPassword, setHemisPassword] = useState("")
  const [hemisLoading,  setHemisLoading]  = useState(false)
  const [hemisError,    setHemisError]    = useState<string | null>(null)
  const [showHemisPwd,  setShowHemisPwd]  = useState(false)

  /* ─── System (admin) login ─── */
  const [username,    setUsername]    = useState("")
  const [password,    setPassword]    = useState("")
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [showPwd,     setShowPwd]     = useState(false)

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

  const handleSystemSubmit = async (e: React.FormEvent) => {
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

  return (
    <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f6f9ff" }}>
      <div className="w-full max-w-[480px] px-4">
        {/* Logo */}
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
            {([
              { key: "hemis",  label: "HEMIS orqali" },
              { key: "system", label: "Tizim kirish" },
            ] as const).map(m => (
              <button key={m.key} type="button"
                onClick={() => { setActiveMethod(m.key); setHemisError(null); setError(null) }}
                className="flex-1 py-2.5 text-sm font-medium transition-colors"
                style={{
                  fontFamily: "var(--font-poppins)",
                  backgroundColor: activeMethod === m.key ? "#0e58a8" : "transparent",
                  color: activeMethod === m.key ? "#fff" : "#7293b9",
                }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* ── HEMIS login ── */}
          {activeMethod === "hemis" && (
            <div className="flex flex-col gap-4">
              {/* Role toggle */}
              <div className="flex rounded-[8px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.15)" }}>
                <button type="button"
                  onClick={() => { setHemisRole("student"); setHemisError(null) }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    fontFamily: "var(--font-poppins)",
                    backgroundColor: hemisRole === "student" ? "#0e58a8" : "transparent",
                    color: hemisRole === "student" ? "#fff" : "#7293b9",
                  }}>
                  <User className="w-4 h-4" /> Talaba
                </button>
                <button type="button"
                  onClick={() => { setHemisRole("employee"); setHemisError(null) }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    fontFamily: "var(--font-poppins)",
                    backgroundColor: hemisRole === "employee" ? "#1cc2dc" : "transparent",
                    color: hemisRole === "employee" ? "#fff" : "#7293b9",
                  }}>
                  <UserCog className="w-4 h-4" /> Xodim
                </button>
              </div>

              <form className="flex flex-col gap-4" onSubmit={handleHemisSubmit}>
                {hemisError && (
                  <div className="rounded-[5px] px-3 py-2.5 text-sm"
                    style={{ backgroundColor: "#fff0f0", color: "#ef4444", border: "1px solid #ef4444", fontFamily: "var(--font-poppins)" }}>
                    {hemisError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    HEMIS Login
                  </label>
                  <div className="flex items-center gap-3 rounded-[5px] px-3 py-2.5"
                    style={{ border: "1px solid rgba(1,41,112,0.3)", backgroundColor: "#fff" }}>
                    {hemisRole === "student"
                      ? <User className="h-5 w-5 shrink-0" style={{ color: "#7293b9" }} />
                      : <UserCog className="h-5 w-5 shrink-0" style={{ color: "#7293b9" }} />}
                    <input type="text" value={hemisLogin}
                      onChange={e => setHemisLogin(e.target.value)}
                      placeholder={hemisRole === "student" ? "Talaba login" : "Xodim login"}
                      className="flex-1 bg-transparent text-sm outline-none"
                      style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    Parol
                  </label>
                  <div className="flex items-center gap-3 rounded-[5px] px-3 py-2.5"
                    style={{ border: "1px solid rgba(1,41,112,0.3)", backgroundColor: "#fff" }}>
                    <Lock className="h-5 w-5 shrink-0" style={{ color: "#7293b9" }} />
                    <input type={showHemisPwd ? "text" : "password"} value={hemisPassword}
                      onChange={e => setHemisPassword(e.target.value)}
                      placeholder="Parol kiriting"
                      className="flex-1 bg-transparent text-sm outline-none"
                      style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
                    <button type="button" onClick={() => setShowHemisPwd(v => !v)}>
                      {showHemisPwd
                        ? <EyeOff className="h-5 w-5" style={{ color: "#7293b9" }} />
                        : <Eye    className="h-5 w-5" style={{ color: "#7293b9" }} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={hemisLoading}
                  className="mt-2 flex items-center justify-center rounded-[5px] py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{
                    backgroundColor: hemisRole === "student" ? "#0e58a8" : "#1cc2dc",
                    fontFamily: "var(--font-poppins)",
                  }}>
                  {hemisLoading
                    ? "Kirish..."
                    : hemisRole === "student" ? "Talaba sifatida kirish" : "Xodim sifatida kirish"}
                </button>

                <p className="text-center text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {hemisRole === "student"
                    ? "Universitet talaba login va parolini kiriting"
                    : "Universitet xodim login va parolini kiriting"}
                </p>
              </form>
            </div>
          )}

          {/* ── System / Admin login ── */}
          {activeMethod === "system" && (
            <form className="flex flex-col gap-4" onSubmit={handleSystemSubmit}>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5" style={{ color: "#0e58a8" }} />
                <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  Tizim administratori
                </p>
              </div>

              {error && (
                <div className="rounded-[5px] px-3 py-2.5 text-sm"
                  style={{ backgroundColor: "#fff0f0", color: "#ef4444", border: "1px solid #ef4444", fontFamily: "var(--font-poppins)" }}>
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  Foydalanuvchi nomi
                </label>
                <div className="flex items-center gap-3 rounded-[5px] px-3 py-2.5"
                  style={{ border: "1px solid rgba(1,41,112,0.3)", backgroundColor: "#fff" }}>
                  <User className="h-5 w-5 shrink-0" style={{ color: "#7293b9" }} />
                  <input type="text" value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Login kiriting"
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  Parol
                </label>
                <div className="flex items-center gap-3 rounded-[5px] px-3 py-2.5"
                  style={{ border: "1px solid rgba(1,41,112,0.3)", backgroundColor: "#fff" }}>
                  <Lock className="h-5 w-5 shrink-0" style={{ color: "#7293b9" }} />
                  <input type={showPwd ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Parol kiriting"
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}>
                    {showPwd
                      ? <EyeOff className="h-5 w-5" style={{ color: "#7293b9" }} />
                      : <Eye    className="h-5 w-5" style={{ color: "#7293b9" }} />}
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
        </div>
      </div>
    </main>
  )
}
