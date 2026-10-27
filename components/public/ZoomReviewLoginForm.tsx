"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { LogIn } from "lucide-react"
import { zoomApi } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { ZOOM_REVIEW_HOME } from "@/lib/zoomReview"

/** Zoom Marketplace tekshiruvchilari uchun login formasi. Asosiy /login
 *  sahifasi faqat HEMIS OAuth bo'lib qoladi — bu forma faqat shu alohida
 *  sahifada va faqat backend'dagi bitta test hisobini taniydi. */
export function ZoomReviewLoginForm() {
  const router = useRouter()
  const { setLang } = useLanguage()
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await zoomApi.reviewLogin(login.trim(), password)
      localStorage.setItem("lms_token", res.token)
      localStorage.setItem("lms_role", res.role)
      // Tekshiruvchi interfeysni inglizcha ko'rsin
      setLang("en")
      router.push(ZOOM_REVIEW_HOME)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed")
      setLoading(false)
    }
  }

  const input = "w-full rounded-[8px] px-3 py-2.5 text-sm outline-none bg-white"
  const inputStyle = { border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <label className="flex flex-col gap-1 text-xs font-medium" style={{ color: "#33415c" }}>
        Username
        <input type="text" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username"
          required className={input} style={inputStyle} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium" style={{ color: "#33415c" }}>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
          required className={input} style={inputStyle} />
      </label>
      {error && <p className="text-xs" style={{ color: "#b91c1c" }}>{error}</p>}
      <button type="submit" disabled={loading || !login || !password}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
        <LogIn className="w-4 h-4" />
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  )
}
