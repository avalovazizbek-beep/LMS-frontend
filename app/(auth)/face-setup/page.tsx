"use client"

import { useState } from "react"
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  User,
} from "lucide-react"

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
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ backgroundColor: "#f6f9ff" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-2 inline-flex items-center gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: "#0e58a8" }}
            >
              <span
                className="text-lg font-bold text-white"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                L
              </span>
            </div>
            <span
              className="text-xl font-semibold"
              style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
            >
              LMS Pro
            </span>
          </div>
          <p
            className="text-sm"
            style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}
          >
            Face ID sozlash
          </p>
        </div>

        <div
          className="rounded-[15px] bg-white p-8"
          style={{
            border: "1px solid rgba(1,41,112,0.1)",
            boxShadow: "0px 0px 30px rgba(1,41,112,0.08)",
          }}
        >
          {step === "intro" && (
            <div className="flex flex-col items-center gap-5 text-center">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full"
                style={{
                  backgroundColor: "#f0f5ff",
                  border: "3px solid rgba(14,88,168,0.2)",
                }}
              >
                <Camera className="h-12 w-12" style={{ color: "#0e58a8" }} />
              </div>
              <div>
                <h2
                  className="mb-2 text-xl font-semibold"
                  style={{
                    color: "#012970",
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  Face ID ni sozlang
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    color: "#7293b9",
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  Tizimga kirish va imtihon monitoring uchun yuz tasvirini
                  ro&apos;yxatga olishingiz kerak. Jarayon bir necha soniya
                  davom etadi.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 text-left">
                {[
                  "Yaxshi yoritilgan joyda turing",
                  "Kamera oldida to'g'ri qaragan holda turing",
                  "Ko'zoynak yoki niqob kiymasligingiz tavsiya etiladi",
                ].map((tip, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-[8px] p-3"
                    style={{ backgroundColor: "#f6f9ff" }}
                  >
                    <div
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: "#f0fbfd" }}
                    >
                      <span
                        className="text-xs font-semibold"
                        style={{ color: "#1cc2dc" }}
                      >
                        {i + 1}
                      </span>
                    </div>
                    <p
                      className="text-sm"
                      style={{
                        color: "#7293b9",
                        fontFamily: "var(--font-poppins)",
                      }}
                    >
                      {tip}
                    </p>
                  </div>
                ))}
              </div>
              <button
                onClick={startCapture}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] font-medium text-white"
                style={{
                  backgroundColor: "#0e58a8",
                  fontFamily: "var(--font-poppins)",
                }}
              >
                Boshlash <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === "capture" && (
            <div className="flex flex-col items-center gap-5">
              <h2
                className="text-xl font-semibold"
                style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
              >
                Kamerani yoqing
              </h2>
              {/* Camera preview placeholder */}
              <div
                className="relative flex aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden rounded-[12px]"
                style={{
                  backgroundColor: "#0a0a1a",
                  border: "2px solid rgba(14,88,168,0.3)",
                }}
              >
                {/* Face outline guide */}
                <div
                  className="flex h-52 w-40 items-center justify-center rounded-[50%]"
                  style={{ border: "2px dashed rgba(28,194,220,0.6)" }}
                >
                  <User
                    className="h-16 w-16"
                    style={{ color: "rgba(28,194,220,0.4)" }}
                  />
                </div>
                <p
                  className="absolute bottom-4 mt-3 text-xs"
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  Yuzingizni oval ichiga joylashtiring
                </p>
                {/* Corner indicators */}
                {[
                  "top-3 left-3",
                  "top-3 right-3",
                  "bottom-3 left-3",
                  "bottom-3 right-3",
                ].map((pos, i) => (
                  <div
                    key={i}
                    className={`absolute ${pos} h-6 w-6`}
                    style={{
                      border: "2px solid #1cc2dc",
                      borderRadius: i < 2 ? "4px 0 0 0" : "0 0 4px 0",
                    }}
                  />
                ))}
              </div>
              <button
                onClick={capturePhoto}
                className="flex h-16 w-16 items-center justify-center rounded-full transition-transform hover:scale-105"
                style={{
                  backgroundColor: "#0e58a8",
                  boxShadow: "0 0 0 4px rgba(14,88,168,0.2)",
                }}
              >
                <Camera className="h-7 w-7 text-white" />
              </button>
              <p
                className="text-sm"
                style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}
              >
                Suratga olish uchun bosing
              </p>
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center gap-5">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full"
                style={{ backgroundColor: "#f0f5ff" }}
              >
                <RefreshCw
                  className="h-10 w-10 animate-spin"
                  style={{ color: "#0e58a8" }}
                />
              </div>
              <div className="text-center">
                <h2
                  className="mb-1 text-xl font-semibold"
                  style={{
                    color: "#012970",
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  Qayta ishlanmoqda...
                </h2>
                <p
                  className="text-sm"
                  style={{
                    color: "#7293b9",
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  Yuz ma&apos;lumotlari tahlil qilinmoqda
                </p>
              </div>
              <div className="w-full">
                <div className="mb-1.5 flex justify-between">
                  <span
                    className="text-xs"
                    style={{
                      color: "#7293b9",
                      fontFamily: "var(--font-poppins)",
                    }}
                  >
                    Jarayon
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color: "#0e58a8",
                      fontFamily: "var(--font-poppins)",
                    }}
                  >
                    {progress}%
                  </span>
                </div>
                <div
                  className="h-2 w-full rounded-full"
                  style={{ backgroundColor: "#f6f9ff" }}
                >
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: "#0e58a8",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-5 text-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full"
                style={{ backgroundColor: "#f0fff4" }}
              >
                <CheckCircle2
                  className="h-12 w-12"
                  style={{ color: "#22c55e" }}
                />
              </div>
              <div>
                <h2
                  className="mb-2 text-xl font-semibold"
                  style={{
                    color: "#012970",
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  Muvaffaqiyatli!
                </h2>
                <p
                  className="text-sm"
                  style={{
                    color: "#7293b9",
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  Face ID muvaffaqiyatli ro&apos;yxatga olindi. Endi tizimga yuz
                  orqali kirishingiz mumkin.
                </p>
              </div>
              <div
                className="flex w-full items-center gap-3 rounded-[8px] p-4"
                style={{
                  backgroundColor: "#f0fff4",
                  border: "1px solid rgba(34,197,94,0.2)",
                }}
              >
                <CheckCircle2
                  className="h-5 w-5 shrink-0"
                  style={{ color: "#22c55e" }}
                />
                <p
                  className="text-sm"
                  style={{
                    color: "#22c55e",
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  Yuz ma&apos;lumotlari xavfsiz saqlandi
                </p>
              </div>
              <a
                href="/login"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] font-medium text-white"
                style={{
                  backgroundColor: "#0e58a8",
                  fontFamily: "var(--font-poppins)",
                }}
              >
                Kirish sahifasiga o&apos;tish
              </a>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-5 text-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full"
                style={{ backgroundColor: "#fff0f0" }}
              >
                <AlertTriangle
                  className="h-12 w-12"
                  style={{ color: "#ef4444" }}
                />
              </div>
              <div>
                <h2
                  className="mb-2 text-xl font-semibold"
                  style={{
                    color: "#012970",
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  Xatolik yuz berdi
                </h2>
                <p
                  className="text-sm"
                  style={{
                    color: "#7293b9",
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  Yuz aniqlanmadi yoki sifat yetarli emas. Iltimos, qayta urinib
                  ko&apos;ring.
                </p>
              </div>
              <button
                onClick={retry}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] font-medium"
                style={{
                  border: "1px solid rgba(1,41,112,0.2)",
                  color: "#012970",
                  fontFamily: "var(--font-poppins)",
                }}
              >
                <RefreshCw className="h-4 w-4" /> Qayta urinish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
