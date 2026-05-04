"use client"

import { useState } from "react"
import { Camera, CheckCircle2, AlertTriangle, ChevronRight, RefreshCw, User } from "lucide-react"

type Step = "intro" | "capture" | "processing" | "done" | "error"

export default function FaceSetupPage() {
  const [step, setStep] = useState<Step>("intro")
  const [progress, setProgress] = useState(0)

  const startCapture = () => {
    setStep("capture")
  }

  const capturePhoto = () => {
    setStep("processing")
    let p = 0
    const interval = setInterval(() => {
      p += 10
      setProgress(p)
      if (p >= 100) {
        clearInterval(interval)
        setStep("done")
      }
    }, 200)
  }

  const retry = () => {
    setProgress(0)
    setStep("intro")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#f6f9ff" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: "#0e58a8" }}>
              <span className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-poppins)" }}>L</span>
            </div>
            <span className="font-semibold text-xl" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>LMS Pro</span>
          </div>
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Face ID sozlash</p>
        </div>

        <div className="bg-white rounded-[15px] p-8" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 30px rgba(1,41,112,0.08)" }}>
          {step === "intro" && (
            <div className="flex flex-col items-center text-center gap-5">
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ backgroundColor: "#f0f5ff", border: "3px solid rgba(14,88,168,0.2)" }}>
                <Camera className="w-12 h-12" style={{ color: "#0e58a8" }} />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Face ID ni sozlang</h2>
                <p className="text-sm leading-relaxed" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  Tizimga kirish va imtihon monitoring uchun yuz tasvirini ro&apos;yxatga olishingiz kerak. Jarayon bir necha soniya davom etadi.
                </p>
              </div>
              <div className="w-full flex flex-col gap-3 text-left">
                {[
                  "Yaxshi yoritilgan joyda turing",
                  "Kamera oldida to'g'ri qaragan holda turing",
                  "Ko'zoynak yoki niqob kiymasligingiz tavsiya etiladi",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-[8px]" style={{ backgroundColor: "#f6f9ff" }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: "#f0fbfd" }}>
                      <span className="text-xs font-semibold" style={{ color: "#1cc2dc" }}>{i + 1}</span>
                    </div>
                    <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{tip}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={startCapture}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-[8px] text-white font-medium"
                style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}
              >
                Boshlash <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === "capture" && (
            <div className="flex flex-col items-center gap-5">
              <h2 className="text-xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Kamerani yoqing</h2>
              {/* Camera preview placeholder */}
              <div
                className="w-full aspect-[4/3] rounded-[12px] flex flex-col items-center justify-center relative overflow-hidden"
                style={{ backgroundColor: "#0a0a1a", border: "2px solid rgba(14,88,168,0.3)" }}
              >
                {/* Face outline guide */}
                <div className="w-40 h-52 rounded-[50%] flex items-center justify-center" style={{ border: "2px dashed rgba(28,194,220,0.6)" }}>
                  <User className="w-16 h-16" style={{ color: "rgba(28,194,220,0.4)" }} />
                </div>
                <p className="text-xs mt-3 absolute bottom-4" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-poppins)" }}>
                  Yuzingizni oval ichiga joylashtiring
                </p>
                {/* Corner indicators */}
                {["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"].map((pos, i) => (
                  <div key={i} className={`absolute ${pos} w-6 h-6`} style={{ border: "2px solid #1cc2dc", borderRadius: i < 2 ? "4px 0 0 0" : "0 0 4px 0" }} />
                ))}
              </div>
              <button
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                style={{ backgroundColor: "#0e58a8", boxShadow: "0 0 0 4px rgba(14,88,168,0.2)" }}
              >
                <Camera className="w-7 h-7 text-white" />
              </button>
              <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Suratga olish uchun bosing</p>
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center gap-5">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "#f0f5ff" }}>
                <RefreshCw className="w-10 h-10 animate-spin" style={{ color: "#0e58a8" }} />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-1" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Qayta ishlanmoqda...</h2>
                <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Yuz ma&apos;lumotlari tahlil qilinmoqda</p>
              </div>
              <div className="w-full">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Jarayon</span>
                  <span className="text-xs font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: "#f6f9ff" }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: "#0e58a8" }} />
                </div>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center text-center gap-5">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "#f0fff4" }}>
                <CheckCircle2 className="w-12 h-12" style={{ color: "#22c55e" }} />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Muvaffaqiyatli!</h2>
                <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  Face ID muvaffaqiyatli ro&apos;yxatga olindi. Endi tizimga yuz orqali kirishingiz mumkin.
                </p>
              </div>
              <div className="w-full p-4 rounded-[8px] flex items-center gap-3" style={{ backgroundColor: "#f0fff4", border: "1px solid rgba(34,197,94,0.2)" }}>
                <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#22c55e" }} />
                <p className="text-sm" style={{ color: "#22c55e", fontFamily: "var(--font-poppins)" }}>Yuz ma&apos;lumotlari xavfsiz saqlandi</p>
              </div>
              <a
                href="/login"
                className="w-full flex items-center justify-center gap-2 h-12 rounded-[8px] text-white font-medium"
                style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}
              >
                Kirish sahifasiga o&apos;tish
              </a>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center text-center gap-5">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "#fff0f0" }}>
                <AlertTriangle className="w-12 h-12" style={{ color: "#ef4444" }} />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Xatolik yuz berdi</h2>
                <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  Yuz aniqlanmadi yoki sifat yetarli emas. Iltimos, qayta urinib ko&apos;ring.
                </p>
              </div>
              <button
                onClick={retry}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-[8px] font-medium"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }}
              >
                <RefreshCw className="w-4 h-4" /> Qayta urinish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
