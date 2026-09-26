"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { GraduationCap, RefreshCw } from "lucide-react"
import { hemisApi, adminApi, faceApi } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { tr } from "@/lib/i18n/translations"

type HemisRole = "student" | "employee" | "tutor" | "auto"

function CallbackCard({ message, error }: { message: string; error?: string | null }) {
  const { t } = useLanguage()
  // Backend xabari o'zbekcha keladi — aniqlash shu matn bo'yicha, ko'rsatish tarjimada
  const isSessionMismatch = Boolean(error?.includes("HEMIS sessiyasida boshqa foydalanuvchi ochiq"))
  const expectedLogin = error?.match(/Kiritilgan login:\s*([^.\s]+)/)?.[1]
  const activeLogin = error?.match(/HEMISdan qaytgan foydalanuvchi:\s*([^.]*)\./)?.[1]

  return (
    <main className="relative flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--lms-bg)" }}>
      <div className="absolute right-5 top-5 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[420px] px-4">
        <div className="rounded-[10px] bg-[var(--lms-cell)] p-8 text-center" style={{ boxShadow: "var(--lms-shadow)" }}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--lms-button)" }}>
            {isSessionMismatch ? <RefreshCw className="h-7 w-7 text-white" /> : <GraduationCap className="h-8 w-8 text-white" />}
          </div>
          <h1 className="text-[22px] font-semibold" style={{ color: "var(--lms-primary)", fontFamily: "var(--font-poppins)" }}>
            {isSessionMismatch ? t("oauthCallback.switchTitle") : t("oauthCallback.title")}
          </h1>
          <p className="mt-2 text-sm leading-6" style={{ color: error ? "#ef4444" : "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}>
            {isSessionMismatch
              ? t("oauthCallback.switchDesc")
              : error || message}
          </p>
          {isSessionMismatch && (
            <div className="mt-5 flex flex-col gap-2">
              <div className="rounded-[8px] p-3 text-left text-xs leading-5" style={{ backgroundColor: "var(--lms-bg)", color: "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}>
                {expectedLogin && <p>{t("oauthCallback.enteredLogin")} <span style={{ color: "var(--lms-primary)" }}>{expectedLogin}</span></p>}
                {activeLogin && <p>{t("oauthCallback.activeAccount")} <span style={{ color: "var(--lms-primary)" }}>{activeLogin}</span></p>}
              </div>
              <a
                href="https://hemis.sies.uz"
                target="_blank"
                rel="noreferrer"
                className="rounded-[5px] px-4 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: "var(--lms-button)", fontFamily: "var(--font-poppins)" }}
              >
                {t("oauthCallback.openHemis")}
              </a>
              <Link
                href="/login"
                className="rounded-[5px] px-4 py-2.5 text-sm font-semibold"
                style={{ color: "var(--lms-button)", border: "1px solid var(--lms-border)", fontFamily: "var(--font-poppins)" }}
              >
                {t("oauthCallback.backToLms")}
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
function NotMasofaviyScreen() {
  const { t } = useLanguage()
  return (
    <div className="masofaviy-wrap">
      <main className="page">
        <div className="brand">
          <div className="brand-icon" />
          <div>
            <strong>SIES</strong>
            <span>{t("oauthCallback.brandSubtitle")}</span>
          </div>
        </div>

        <section className="card">
          <div className="illustration">
            <div className="blob" />
            <div className="question">?</div>

            <div className="browser">
              <div className="browser-top">
                <i /><i /><i />
              </div>
              <div className="lock" />
            </div>

            <div className="person">
              <div className="hair" />
              <div className="head">
                <div className="eyebrow left" />
                <div className="eyebrow right" />
                <div className="eye left" />
                <div className="eye right" />
                <div className="mouth" />
              </div>

              <div className="body">
                <div className="hood" />
                <div className="arm left" />
                <div className="arm right" />
              </div>

              <div className="hand left" />
              <div className="hand right" />

              <div className="laptop">
                <div className="laptop-screen" />
                <div className="laptop-base" />
              </div>

              <div className="mug">SIES</div>

              <div className="plant">
                <div className="leaf" />
                <div className="leaf" />
                <div className="leaf" />
                <div className="leaf" />
                <div className="pot" />
              </div>
            </div>
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

            <h1>{t("oauthCallback.noAccessTitle")} <span>{t("oauthCallback.noAccessTitleEm")}</span></h1>

            <p>{t("oauthCallback.notMasofaviy")}</p>

            <Link href="/login" className="back-btn">
              <span className="arrow" style={{ transform: "none" }}>&larr;</span>
              <span>{t("oauthCallback.backToLogin")}</span>
            </Link>
          </div>

          <div className="footer">
            <span className="book">&#9634;</span>
            <span>{t("oauthCallback.slogan")}</span>
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
          display: grid;
          place-items: center;
          color: white;
          background: linear-gradient(145deg, #3b82f6, #1d4ed8);
          clip-path: polygon(50% 0, 100% 25%, 50% 50%, 0 25%);
          position: relative;
        }
        .brand-icon::after {
          content: "";
          position: absolute;
          width: 5px;
          height: 16px;
          top: 20px;
          background: #1d4ed8;
          transform: rotate(30deg);
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

        .browser {
          position: absolute;
          width: 390px;
          height: 260px;
          top: 30px;
          left: 5px;
          border-radius: 22px;
          background: linear-gradient(145deg, #789bff, #426be5);
          box-shadow: 0 25px 40px rgba(54, 94, 208, .2);
          transform: rotate(7deg);
          animation: browserFloat 5s ease-in-out infinite;
          z-index: -1;
        }
        .browser::before {
          content: "";
          position: absolute;
          inset: 48px 12px 12px;
          border-radius: 10px;
          background: linear-gradient(135deg, #f9fbff, #dbe7ff);
        }
        .browser-top { position: absolute; top: 17px; left: 20px; display: flex; gap: 8px; }
        .browser-top i { width: 14px; height: 14px; border-radius: 50%; background: #ff9b9b; }
        .browser-top i:nth-child(2) { background: #ffd36b; }
        .browser-top i:nth-child(3) { background: #8ce2c0; }

        .lock {
          position: absolute;
          left: 50%;
          top: 53%;
          width: 94px;
          height: 78px;
          transform: translate(-50%, -50%);
          border-radius: 17px;
          background: linear-gradient(145deg, #6366d9, #414bb4);
          box-shadow: 0 12px 20px rgba(49, 60, 161, .25);
        }
        .lock::before {
          content: "";
          position: absolute;
          width: 43px;
          height: 45px;
          left: 25px;
          top: -33px;
          border: 11px solid #515ac7;
          border-bottom: 0;
          border-radius: 30px 30px 0 0;
        }
        .lock::after {
          content: "\\00d7";
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          color: #ff7185;
          font-size: 60px;
          font-weight: 800;
          line-height: 1;
        }

        .person { position: absolute; width: 330px; height: 330px; left: 50px; bottom: 15px; animation: personFloat 5s ease-in-out infinite; }

        .head {
          position: absolute;
          width: 142px;
          height: 155px;
          left: 95px;
          top: 15px;
          border-radius: 48% 48% 45% 45%;
          background: #ffc39f;
          box-shadow: inset -12px -8px 0 rgba(226, 133, 96, .12);
          z-index: 2;
        }
        .hair {
          position: absolute;
          width: 150px;
          height: 105px;
          left: 89px;
          top: 3px;
          border-radius: 60% 45% 30% 25%;
          background: #3b292b;
          transform: rotate(-5deg);
          z-index: 3;
        }
        .hair::after {
          content: "";
          position: absolute;
          width: 60px;
          height: 100px;
          left: -7px;
          top: 35px;
          border-radius: 50%;
          background: #3b292b;
          transform: rotate(25deg);
        }
        .eyebrow { position: absolute; top: 58px; width: 34px; height: 8px; border-radius: 10px; background: #432c2a; z-index: 4; }
        .eyebrow.left { left: 22px; transform: rotate(-14deg); }
        .eyebrow.right { right: 22px; transform: rotate(14deg); }
        .eye { position: absolute; top: 78px; width: 19px; height: 24px; border-radius: 50%; background: #342422; z-index: 4; }
        .eye::after { content: ""; position: absolute; width: 6px; height: 7px; left: 4px; top: 4px; border-radius: 50%; background: white; }
        .eye.left { left: 31px; }
        .eye.right { right: 31px; }
        .mouth { position: absolute; left: 58px; top: 121px; width: 28px; height: 13px; border-top: 4px solid #9d4e4e; border-radius: 50%; z-index: 4; }

        .body {
          position: absolute;
          left: 32px;
          bottom: -20px;
          width: 270px;
          height: 210px;
          border-radius: 110px 110px 25px 25px;
          background: linear-gradient(145deg, #243b75, #172554);
          z-index: 1;
        }
        .hood { position: absolute; width: 160px; height: 100px; left: 55px; top: -32px; border: 18px solid #20366d; border-bottom: 0; border-radius: 90px 90px 0 0; }
        .arm { position: absolute; width: 55px; height: 155px; border-radius: 30px; background: #172554; top: 55px; z-index: 3; }
        .arm.left { left: -15px; transform: rotate(17deg); }
        .arm.right { right: -15px; transform: rotate(-17deg); }
        .hand { position: absolute; width: 52px; height: 43px; border-radius: 50%; background: #ffc39f; z-index: 5; }
        .hand.left { left: 88px; top: 132px; transform: rotate(-25deg); }
        .hand.right { right: 60px; top: 115px; transform: rotate(-30deg); }

        .laptop { position: absolute; width: 350px; height: 190px; left: 0; bottom: -5px; z-index: 6; }
        .laptop-screen {
          position: absolute;
          width: 285px;
          height: 170px;
          left: 32px;
          top: 0;
          border: 10px solid #b5b8ca;
          border-bottom-width: 14px;
          border-radius: 12px;
          background: linear-gradient(135deg, #dce1ef, #9da5bd);
          transform: perspective(600px) rotateX(-4deg);
          box-shadow: 0 8px 15px rgba(0,0,0,.08);
        }
        .laptop-screen::after { content: "\\2726"; position: absolute; inset: 0; display: grid; place-items: center; color: rgba(255,255,255,.25); font-size: 52px; }
        .laptop-base { position: absolute; width: 350px; height: 20px; bottom: 0; border-radius: 5px 5px 25px 25px; background: #c5c9d8; box-shadow: 0 8px 12px rgba(0,0,0,.12); }

        .mug {
          position: absolute;
          bottom: 2px;
          left: -40px;
          width: 80px;
          height: 78px;
          border-radius: 8px 8px 22px 22px;
          background: #1e315e;
          color: white;
          font-weight: 800;
          font-size: 17px;
          display: grid;
          place-items: center;
          z-index: 7;
        }
        .mug::after {
          content: "";
          position: absolute;
          width: 28px;
          height: 34px;
          right: -24px;
          top: 18px;
          border: 9px solid #1e315e;
          border-left: 0;
          border-radius: 0 20px 20px 0;
        }

        .plant { position: absolute; right: 5px; bottom: 0; width: 100px; height: 150px; z-index: 7; }
        .pot { position: absolute; bottom: 0; width: 100px; height: 70px; border-radius: 8px 8px 28px 28px; background: linear-gradient(145deg, #ffffff, #d9deed); }
        .leaf { position: absolute; width: 42px; height: 85px; bottom: 52px; left: 35px; border-radius: 100% 0 100% 0; background: linear-gradient(145deg, #9edc88, #3e9e65); transform-origin: bottom; }
        .leaf:nth-child(2) { transform: rotate(-35deg); left: 5px; height: 70px; }
        .leaf:nth-child(3) { transform: rotate(35deg); left: 60px; height: 75px; }
        .leaf:nth-child(4) { transform: rotate(-65deg); left: 22px; height: 60px; }

        .question {
          position: absolute;
          left: 0;
          top: 5px;
          width: 95px;
          height: 95px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #2563eb;
          background: white;
          box-shadow: 0 12px 30px rgba(37, 99, 235, .13);
          font-size: 58px;
          font-weight: 800;
          animation: questionFloat 4s ease-in-out infinite;
        }
        .question::after {
          content: "";
          position: absolute;
          bottom: -10px;
          right: 5px;
          width: 28px;
          height: 28px;
          background: white;
          clip-path: polygon(0 0, 100% 0, 100% 100%);
          transform: rotate(20deg);
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
        @keyframes browserFloat { 0%, 100% { transform: rotate(7deg) translateY(0); } 50% { transform: rotate(4deg) translateY(-10px); } }
        @keyframes personFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        @keyframes questionFloat { 0%, 100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-14px) rotate(5deg); } }
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
  const { t } = useLanguage()
  // Xabar kaliti saqlanadi — til almashsa ham to'g'ri tilda ko'rinadi
  const [messageKey, setMessageKey] = useState("oauthCallback.checking")
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
          return
        }
        const description = oauthDescription ? ` - ${oauthDescription}` : ""
        const message = tr("oauthCallback.oauthError", { error: `${oauthError}${description}` })
        setError(
          message.includes("HEMIS sessiyasida boshqa foydalanuvchi ochiq")
            ? message
            : `${message}. ${tr("oauthCallback.clientMismatch")}`
        )
        return
      }
      if (!code || !state) {
        setError(tr("oauthCallback.missingCode"))
        return
      }
      if (storedState && storedState !== state) {
        setError(tr("oauthCallback.stateMismatch"))
        return
      }

      try {
        setMessageKey("oauthCallback.gettingToken")
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
          setError(err instanceof Error ? err.message : tr("login.hemisError"))
        }
      }
    }

    finishLogin()
    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  if (notMasofaviy) {
    return <NotMasofaviyScreen />
  }

  return <CallbackCard message={t(messageKey)} error={error} />
}

function CallbackFallback() {
  const { t } = useLanguage()
  return <CallbackCard message={t("oauthCallback.checking")} />
}

export default function HemisOAuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <OAuthCallbackContent />
    </Suspense>
  )
}
