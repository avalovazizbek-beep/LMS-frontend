"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { GraduationCap, RefreshCw } from "lucide-react"
import { hemisApi, adminApi, faceApi } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"

type HemisRole = "student" | "employee" | "tutor" | "auto"

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ""

// "Kirish imkoni yo'q" ekranidagi qulf/karta animatsiyasi (public/lock-card.json).
// @lottiefiles/dotlottie-web WASM orqali ishlaydi — faqat brauzerda,
// shuning uchun dinamik import qilinadi.
function SecurityAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let dotLottie: import("@lottiefiles/dotlottie-web").DotLottie | null = null
    let cancelled = false

    import("@lottiefiles/dotlottie-web").then(({ DotLottie }) => {
      if (cancelled || !canvasRef.current) return
      dotLottie = new DotLottie({
        canvas: canvasRef.current,
        src: `${BASE_PATH}/lock-card.json`,
        loop: true,
        autoplay: true,
        speed: 0.6,
        // Original artwork has a lot of built-in padding around the icon
        // (it doesn't fill its own 256x256 frame) — hand-editing the
        // animation's internal transforms to compensate produced distorted,
        // clipped frames instead, so this uses the player's own supported
        // "cover" fit (uniform scale-to-fill, like CSS object-fit: cover)
        // rather than guessing at the artwork's bounding box ourselves.
        layout: { fit: "cover", align: [0.5, 0.5] },
        // Without this, the canvas's internal render buffer is sized once
        // at construction time and never kept in sync with its actual
        // CSS-rendered size — "cover" then fits against that stale, much
        // smaller buffer, which is why the icon rendered tiny and pinned
        // to a corner instead of filling the visible box.
        renderConfig: { autoResize: true },
      })
    })

    return () => {
      cancelled = true
      dotLottie?.destroy()
    }
  }, [])

  return <canvas ref={canvasRef} className="security-canvas" />
}

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

// Masofaviy-cheklov uchun alohida ekran — foydalanuvchi so'ragan bo'yicha
// atrofidagi barcha dekorativ "ramka" (karta foni, soya, xira doiralar,
// qalqon ikonkasi) olib tashlangan — faqat animatsiya va uning yonidagi
// matn qoladi. Boshqa xato holatlaridan (sessiya almashinuvi, umumiy OAuth
// xatosi) ataylab ajratilgan — chunki bu haqiqiy "xato" emas, balki
// tizimning ataylab qilingan qarori.
function NotMasofaviyScreen({ message }: { message: string }) {
  return (
    <div className="masofaviy-wrap">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE_PATH}/gradcap-brand.png`} alt="" className="brand-icon" />
        <div>
          <strong>SIES</strong>
          <span>Masofaviy ta&apos;lim</span>
        </div>
      </div>

      <main className="row">
        <div className="illustration">
          <SecurityAnimation />
        </div>

        <div className="content">
          <h1>Kirish imkoni <span>yo&apos;q</span></h1>
          <p>{message}</p>
          <Link href="/login" className="back-btn">
            <span>&larr;</span>
            <span>Login sahifasiga qaytish</span>
          </Link>
        </div>
      </main>

      <style jsx>{`
        .masofaviy-wrap {
          --blue: #2563eb;
          --navy: #172554;
          --text: #294477;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 32px;
          padding: 32px;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          color: var(--text);
          background: #f3f7ff;
        }
        .masofaviy-wrap * { box-sizing: border-box; }

        .brand {
          width: min(1100px, 100%);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          color: var(--navy);
        }
        .brand-icon { width: 36px; height: 36px; object-fit: contain; }
        .brand strong { display: block; font-size: 20px; line-height: 1; letter-spacing: .5px; }
        .brand span { display: block; margin-top: 3px; font-size: 13px; color: #58709f; }

        .row {
          width: min(1100px, 100%);
          display: flex;
          align-items: center;
          gap: 48px;
        }

        .illustration { flex: 1 1 320px; max-width: 460px; }
        .security-canvas { display: block; width: 100%; aspect-ratio: 1 / 1; }

        .content { flex: 1 1 320px; }

        .content h1 {
          margin: 0 0 20px;
          color: var(--navy);
          font-size: clamp(30px, 4vw, 52px);
          line-height: 1.1;
          font-weight: 800;
        }
        .content h1 span { color: var(--blue); }
        .content p { max-width: 520px; margin: 0 0 28px; color: #38558b; font-size: 17px; line-height: 1.7; }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          padding: 16px 28px;
          border-radius: 12px;
          color: white;
          background: linear-gradient(100deg, #3b82f6, #2563eb);
          font-size: 16px;
          font-weight: 700;
          text-decoration: none;
          transition: transform .2s ease;
        }
        .back-btn:hover { transform: translateY(-2px); }

        @media (max-width: 720px) {
          .row { flex-direction: column; text-align: center; }
          .content p { margin-left: auto; margin-right: auto; }
        }
      `}</style>
    </div>
  )
}

function OAuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState("HEMIS javobi tekshirilmoqda...")
  const [error, setError] = useState<string | null>(null)
  const [notMasofaviy, setNotMasofaviy] = useState(false)

  useEffect(() => {
    let cancelled = false

    // Admin bo'lsa /admin, talaba bo'lib Face ID hali ro'yxatdan
    // o'tmagan bo'lsa /face-setup, aks holda /dashboard. Parol bilan
    // kirishdagi mantiq bilan bir xil — bu tekshiruv avval shu OAuth
    // yo'lida umuman yo'q edi, shuning uchun OAuth orqali kirgan
    // talabalar Face ID'ni hech qachon so'ralmasdan o'tib ketayotgan edi.
    async function redirectAfterLogin(role: string) {
      try {
        const adminCheck = await adminApi.check()
        if (adminCheck.isAdmin) { router.replace("/admin"); return }
      } catch { /* not admin */ }
      if (role === "student") {
        try {
          const faceStatus = await faceApi.status()
          if (!faceStatus.registered) { router.replace("/face-setup"); return }
        } catch { /* Face ID tekshirishda xato bo'lsa dashboardga o'taveramiz */ }
      }
      router.replace("/dashboard")
    }

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
        localStorage.setItem("lms_token", directToken)
        localStorage.setItem("lms_role", directRole)
        sessionStorage.removeItem("hemis_oauth_state")
        sessionStorage.removeItem("hemis_oauth_role")
        sessionStorage.removeItem("hemis_oauth_redirect_uri")
        await redirectAfterLogin(directRole)
        return
      }

      if (oauthError) {
        // Masofaviy-cheklov — bu HEMIS'ning o'z sozlama xatosi emas, bizning
        // ilovamizning ataylab qilingan qarori, shuning uchun umumiy "Client
        // ID/callback URL mos emas" degan (bu holatda noto'g'ri va
        // chalg'ituvchi) qo'shimcha matnsiz, o'z holicha ko'rsatiladi.
        if (oauthError === "not_masofaviy") {
          setNotMasofaviy(true)
          setError(oauthDescription || "Bu platforma faqat Masofaviy ta'lim yo'nalishi talabalari uchun mo'ljallangan.")
          return
        }
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

        localStorage.setItem("lms_token", res.token)
        localStorage.setItem("lms_role", res.role || role)
        sessionStorage.removeItem("hemis_oauth_state")
        sessionStorage.removeItem("hemis_oauth_role")
        sessionStorage.removeItem("hemis_oauth_redirect_uri")
        await redirectAfterLogin(res.role || role)
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

  if (notMasofaviy) {
    return <NotMasofaviyScreen message={error ?? "Bu platforma faqat Masofaviy ta'lim yo'nalishi talabalari uchun mo'ljallangan."} />
  }

  return <CallbackCard message={message} error={error} />
}

export default function HemisOAuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackCard message="HEMIS javobi tekshirilmoqda..." />}>
      <OAuthCallbackContent />
    </Suspense>
  )
}
