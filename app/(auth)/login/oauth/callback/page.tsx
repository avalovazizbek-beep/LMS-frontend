"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { GraduationCap, RefreshCw } from "lucide-react"
import { hemisApi } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"

type HemisRole = "student" | "employee" | "tutor" | "auto"

function CallbackCard({ message, error }: { message: string; error?: string | null }) {
  const isSessionMismatch = Boolean(error?.includes("HEMIS sessiyasida boshqa foydalanuvchi ochiq"))
  const expectedLogin = error?.match(/Kiritilgan login:\s*([^.\s]+)/)?.[1]
  const activeLogin = error?.match(/HEMISdan qaytgan foydalanuvchi:\s*([^.]*)\./)?.[1]

  return (
    <main className="relative flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--lms-bg)" }}>
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[420px] px-4">
        <div className="rounded-[10px] bg-[var(--lms-cell)] p-8 text-center" style={{ boxShadow: "var(--lms-shadow)" }}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--lms-button)" }}>
            {isSessionMismatch ? <RefreshCw className="h-7 w-7 text-white" /> : <GraduationCap className="h-8 w-8 text-white" />}
          </div>
          <h1 className="text-[22px] font-semibold" style={{ color: "var(--lms-primary)", fontFamily: "var(--font-poppins)" }}>
            {isSessionMismatch ? "HEMIS akkauntini almashtiring" : "HEMIS Login"}
          </h1>
          <p className="mt-2 text-sm leading-6" style={{ color: error ? "#ef4444" : "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}>
            {isSessionMismatch
              ? "Brauzeringizda HEMISda boshqa foydalanuvchi ochiq qolgan. Kerakli akkauntga qayta kirib, LMS loginni yana bosing."
              : error || message}
          </p>
          {isSessionMismatch && (
            <div className="mt-5 flex flex-col gap-2">
              <div className="rounded-[8px] p-3 text-left text-xs leading-5" style={{ backgroundColor: "var(--lms-bg)", color: "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}>
                {expectedLogin && <p>Kiritilgan login: <span style={{ color: "var(--lms-primary)" }}>{expectedLogin}</span></p>}
                {activeLogin && <p>HEMISdagi joriy akkaunt: <span style={{ color: "var(--lms-primary)" }}>{activeLogin}</span></p>}
              </div>
              <a
                href="https://hemis.sies.uz"
                target="_blank"
                rel="noreferrer"
                className="rounded-[5px] px-4 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: "var(--lms-button)", fontFamily: "var(--font-poppins)" }}
              >
                HEMISni ochib akkauntni almashtirish
              </a>
              <Link
                href="/login"
                className="rounded-[5px] px-4 py-2.5 text-sm font-semibold"
                style={{ color: "var(--lms-button)", border: "1px solid var(--lms-border)", fontFamily: "var(--font-poppins)" }}
              >
                LMS login sahifasiga qaytish
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function OAuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState("HEMIS javobi tekshirilmoqda...")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function finishLogin() {
      const directToken = searchParams.get("token")
      const directRole = (searchParams.get("role") || "employee") as HemisRole
      const code = searchParams.get("code")?.replace(/ /g, "+")
      const state = searchParams.get("state")
      const oauthError = searchParams.get("error")
      const oauthDescription = searchParams.get("error_description") || searchParams.get("message")
      const storedState = sessionStorage.getItem("hemis_oauth_state")
      const role = (sessionStorage.getItem("hemis_oauth_role") || "employee") as HemisRole
      const redirectUri = sessionStorage.getItem("hemis_oauth_redirect_uri") || `${window.location.origin}/login/oauth/callback`

      if (directToken) {
        localStorage.removeItem("lms_token")
        localStorage.removeItem("lms_role")
        sessionStorage.setItem("lms_token", directToken)
        sessionStorage.setItem("lms_role", directRole)
        sessionStorage.removeItem("hemis_oauth_state")
        sessionStorage.removeItem("hemis_oauth_role")
        sessionStorage.removeItem("hemis_oauth_redirect_uri")
        router.replace("/dashboard")
        return
      }

      if (oauthError) {
        const description = oauthDescription ? ` - ${oauthDescription}` : ""
        const message = `HEMIS OAuth xatosi: ${oauthError}${description}`
        setError(
          message.includes("HEMIS sessiyasida boshqa foydalanuvchi ochiq")
            ? message
            : `${message}. Client ID/client code yoki callback URL HEMIS OAuth klient sozlamasiga mos emas.`
        )
        return
      }
      if (!code || !state) {
        setError("HEMIS OAuth javobida code yoki state yo'q. HEMIS OAuth klientidagi URL aynan shu callback manziliga teng bo'lishi kerak.")
        return
      }
      if (storedState && storedState !== state) {
        setError("HEMIS OAuth state mos kelmadi")
        return
      }

      try {
        setMessage("HEMIS token olinmoqda...")
        const res = await hemisApi.oauthCallback(role, code, redirectUri, state)
        if (cancelled) return

        localStorage.removeItem("lms_token")
        localStorage.removeItem("lms_role")
        sessionStorage.setItem("lms_token", res.token)
        sessionStorage.setItem("lms_role", res.role || role)
        sessionStorage.removeItem("hemis_oauth_state")
        sessionStorage.removeItem("hemis_oauth_role")
        sessionStorage.removeItem("hemis_oauth_redirect_uri")
        router.replace("/dashboard")
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "HEMIS OAuth orqali kirishda xatolik")
        }
      }
    }

    finishLogin()
    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  return <CallbackCard message={message} error={error} />
}

export default function HemisOAuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackCard message="HEMIS javobi tekshirilmoqda..." />}>
      <OAuthCallbackContent />
    </Suspense>
  )
}
