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
      })
    })

    return () => {
      cancelled = true
      dotLottie?.destroy()
    }
  }, [])

  // Manba animatsiyaning o'zida qulf belgisi 256x256 kompozitsiyaning
  // kichik bir qismini egallaydi (atrofida bo'sh joy ko'p) — shu sabab
  // canvas'ning o'zi kattalashtirilib (scale), atrofdagi bo'sh joy
  // tashqi konteynerning overflow:hidden bilan kesib tashlanadi.
  return (
    <div className="security-canvas-wrap">
      <canvas ref={canvasRef} className="security-canvas" />
    </div>
  )
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

// Masofaviy-cheklov uchun alohida, illyustratsiyali ekran — foydalanuvchi
// so'ragan aniq dizayn bo'yicha. Boshqa xato holatlaridan (sessiya
// almashinuvi, umumiy OAuth xatosi) ataylab ajratilgan — chunki bu
// haqiqiy "xato" emas, balki tizimning ataylab qilingan qarori.
function NotMasofaviyScreen({ message }: { message: string }) {
  return (
    <div className="masofaviy-wrap">
      <main className="page">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE_PATH}/gradcap-brand.png`} alt="" className="brand-icon" />
          <div>
            <strong>SIES</strong>
            <span>Masofaviy ta&apos;lim</span>
          </div>
        </div>

        <section className="card">
          <div className="illustration">
            <div className="blob" />
            <SecurityAnimation />
          </div>

          <div className="content">
            <div className="shield">
              <svg viewBox="0 0 100 100" fill="none">
                <path d="M50 9L81 21V45C81 65 68 81 50 90C32 81 19 65 19 45V21L50 9Z" fill="#2563EB" />
                <rect x="36" y="42" width="28" height="23" rx="5" fill="white" />
                <path d="M42 42V35C42 30.6 45.6 27 50 27C54.4 27 58 30.6 58 35V42" stroke="white" strokeWidth={6} strokeLinecap="round" />
                <circle cx="50" cy="52" r="3" fill="#2563EB" />
                <path d="M50 55V59" stroke="#2563EB" strokeWidth={3} strokeLinecap="round" />
              </svg>
            </div>

            <h1>Kirish imkoni <span>yo&apos;q</span></h1>

            <p>{message}</p>

            <Link href="/login" className="back-btn">
              <span className="arrow" style={{ transform: "none" }}>&larr;</span>
              <span>Login sahifasiga qaytish</span>
            </Link>
          </div>

          <div className="footer">
            <span className="book">&#9634;</span>
            <span>Ta&apos;lim – kelajak kaliti</span>
          </div>
        </section>
      </main>

      <style jsx>{`
        .masofaviy-wrap {
          --blue: #2563eb;
          --navy: #172554;
          --text: #294477;
          --bg: #f3f7ff;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          overflow-x: hidden;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          color: var(--text);
          background:
            radial-gradient(circle at 5% 5%, #dce8ff 0 13%, transparent 13.2%),
            radial-gradient(circle at 100% 100%, #dce8ff 0 16%, transparent 16.2%),
            var(--bg);
        }
        .masofaviy-wrap * { box-sizing: border-box; }

        .page { width: min(1420px, 100%); position: relative; }

        .brand {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          margin: 0 20px 24px;
          color: var(--navy);
        }
        .brand-icon {
          width: 42px;
          height: 42px;
          object-fit: contain;
        }
        .brand strong { display: block; font-size: 25px; line-height: 1; letter-spacing: .5px; }
        .brand span { display: block; margin-top: 5px; font-size: 14px; color: #58709f; }

        .card {
          min-height: 730px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 45px;
          align-items: center;
          padding: 62px 75px 42px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.9);
          border-radius: 32px;
          background: rgba(255,255,255,.88);
          box-shadow: 0 25px 70px rgba(37, 99, 235, .12), inset 0 1px 0 rgba(255,255,255,.95);
          backdrop-filter: blur(12px);
          position: relative;
        }
        .card::before, .card::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(2px);
        }
        .card::before { width: 300px; height: 300px; left: -170px; top: -170px; background: #eaf1ff; }
        .card::after { width: 240px; height: 240px; right: -120px; bottom: -120px; background: #edf3ff; }

        .illustration {
          min-height: 500px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          isolation: isolate;
        }

        .blob {
          position: absolute;
          width: 460px;
          height: 380px;
          border-radius: 48% 52% 60% 40% / 48% 42% 58% 52%;
          background: linear-gradient(145deg, #eef4ff, #dbe8ff);
          animation: blobMove 8s ease-in-out infinite;
          z-index: -2;
        }

        .security-canvas-wrap {
          position: relative;
          width: 100%;
          height: 100%;
          max-width: 500px;
          max-height: 500px;
          aspect-ratio: 1 / 1;
          overflow: hidden;
        }
        .security-canvas {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          transform: translate(-50%, -50%) scale(3.5);
        }

        .content { position: relative; z-index: 2; text-align: center; }

        .shield {
          width: 108px;
          height: 108px;
          margin: 0 auto 28px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #f0f5ff;
          animation: shieldPulse 3s ease-in-out infinite;
        }
        .shield svg { width: 66px; height: 66px; filter: drop-shadow(0 7px 5px rgba(37, 99, 235, .15)); }

        .content h1 {
          margin: 0 0 25px;
          color: var(--navy);
          font-size: clamp(35px, 4vw, 62px);
          line-height: 1.08;
          letter-spacing: -2px;
          font-weight: 800;
        }
        .content h1 span { color: var(--blue); }
        .content p { max-width: 570px; margin: 0 auto; color: #38558b; font-size: clamp(16px, 1.35vw, 21px); line-height: 1.8; }

        .back-btn {
          margin: 38px auto 0;
          min-width: 350px;
          border: 0;
          border-radius: 15px;
          padding: 20px 30px;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          color: white;
          background: linear-gradient(100deg, #3b82f6, #2563eb);
          box-shadow: 0 14px 25px rgba(37, 99, 235, .23);
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: .25s ease;
          text-decoration: none;
        }
        .back-btn:hover { transform: translateY(-4px); box-shadow: 0 18px 32px rgba(37, 99, 235, .3); }
        .back-btn:active { transform: translateY(-1px) scale(.98); }
        .back-btn .arrow { font-size: 25px; transition: transform .25s ease; }
        .back-btn:hover .arrow { transform: translateX(-5px); }

        .footer {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 25px;
          margin-top: -5px;
          color: #a6b9e5;
          font-size: 16px;
          font-style: italic;
        }
        .footer::before, .footer::after { content: ""; width: 130px; height: 1px; background: #d6e2fa; }
        .book { font-size: 24px; font-style: normal; }

        @keyframes blobMove { 0%, 100% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(5deg) scale(1.04); } }
        @keyframes shieldPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }

        @media (max-width: 1050px) {
          .card { grid-template-columns: 1fr; padding: 50px 35px 35px; }
          .illustration { min-height: 480px; }
          .footer { grid-column: auto; margin-top: 25px; }
        }

        @media (max-width: 560px) {
          .masofaviy-wrap { padding: 14px; }
          .brand { margin-bottom: 16px; }
          .brand strong { font-size: 21px; }
          .card { padding: 35px 15px 28px; border-radius: 24px; }
          .illustration { min-height: 370px; transform: scale(.72); transform-origin: center; margin: -50px 0; }
          .content h1 { letter-spacing: -1px; }
          .content p { line-height: 1.65; }
          .back-btn { width: 100%; min-width: 0; font-size: 16px; }
          .footer::before, .footer::after { width: 45px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .masofaviy-wrap * { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
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
