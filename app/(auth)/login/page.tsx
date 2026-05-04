"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, GraduationCap, Lock, User } from "lucide-react"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [activeMethod, setActiveMethod] = useState<"login" | "hemis" | "face">(
    "login"
  )

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#f6f9ff" }}
    >
      <div className="w-full max-w-[480px] px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: "#0e58a8" }}
          >
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1
            className="text-[28px] font-semibold text-center"
            style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
          >
            Masofaviy Ta&apos;lim
          </h1>
          <p
            className="text-sm mt-1 text-center"
            style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}
          >
            Tizimga kirish
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-[10px] p-8"
          style={{ boxShadow: "0px 0px 20px rgba(1,41,112,0.1)" }}
        >
          {/* Method tabs */}
          <div
            className="flex rounded-[10px] overflow-hidden mb-6"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}
          >
            {(
              [
                { key: "login", label: "Login" },
                { key: "hemis", label: "HEMIS" },
                { key: "face", label: "Face ID" },
              ] as const
            ).map((method) => (
              <button
                key={method.key}
                type="button"
                onClick={() => setActiveMethod(method.key)}
                className="flex-1 py-2.5 text-sm font-medium transition-colors"
                style={{
                  fontFamily: "var(--font-poppins)",
                  backgroundColor:
                    activeMethod === method.key ? "#0e58a8" : "transparent",
                  color: activeMethod === method.key ? "#fff" : "#7293b9",
                }}
              >
                {method.label}
              </button>
            ))}
          </div>

          {activeMethod === "login" && (
            <form className="flex flex-col gap-4">
              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="username"
                  className="text-sm font-medium"
                  style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
                >
                  Foydalanuvchi nomi
                </label>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[5px] bg-white"
                  style={{ border: "1px solid rgba(1,41,112,0.3)" }}
                >
                  <User className="w-5 h-5 shrink-0" style={{ color: "#7293b9" }} />
                  <input
                    id="username"
                    type="text"
                    placeholder="Login kiriting"
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{
                      color: "#012970",
                      fontFamily: "var(--font-poppins)",
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-medium"
                  style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
                >
                  Parol
                </label>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[5px] bg-white"
                  style={{ border: "1px solid rgba(1,41,112,0.3)" }}
                >
                  <Lock className="w-5 h-5 shrink-0" style={{ color: "#7293b9" }} />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Parol kiriting"
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{
                      color: "#012970",
                      fontFamily: "var(--font-poppins)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" style={{ color: "#7293b9" }} />
                    ) : (
                      <Eye className="w-5 h-5" style={{ color: "#7293b9" }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Link
                href="/dashboard"
                className="flex items-center justify-center py-3 rounded-[5px] mt-2 text-white font-semibold text-base transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: "#0e58a8",
                  fontFamily: "var(--font-poppins)",
                }}
              >
                Kirish
              </Link>
            </form>
          )}

          {activeMethod === "hemis" && (
            <div className="flex flex-col gap-4">
              <p
                className="text-sm text-center"
                style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}
              >
                HEMIS tizimi orqali kirish uchun quyidagi tugmani bosing
              </p>
              <button
                type="button"
                className="flex items-center justify-center py-3 rounded-[5px] text-white font-semibold text-base transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: "#0e58a8",
                  fontFamily: "var(--font-poppins)",
                }}
              >
                HEMIS orqali kirish
              </button>
            </div>
          )}

          {activeMethod === "face" && (
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#f6f9ff", border: "2px dashed #1cc2dc" }}
              >
                <User className="w-16 h-16" style={{ color: "#1cc2dc" }} />
              </div>
              <p
                className="text-sm text-center"
                style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}
              >
                Kamera yoqiladi va yuzingiz skanerlanadi
              </p>
              <button
                type="button"
                className="flex items-center justify-center w-full py-3 rounded-[5px] text-white font-semibold text-base transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: "#1cc2dc",
                  fontFamily: "var(--font-poppins)",
                }}
              >
                Kamerani yoqish
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
