"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ""

export default function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1800)
    const hide = setTimeout(() => setVisible(false), 2300)
    return () => { clearTimeout(timer); clearTimeout(hide) }
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "radial-gradient(circle at 50% 42%, #123a7a 0%, #012970 55%, #010f38 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        transition: "opacity 0.5s ease",
        opacity: fadeOut ? 0 : 1,
        pointerEvents: "none",
      }}
    >
      <div style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "splashPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
      }}>
        <div style={{
          position: "absolute",
          inset: "-30px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(28,194,220,0.35) 0%, rgba(28,194,220,0) 70%)",
          filter: "blur(4px)",
        }} />
        <Image
          src={`${BASE_PATH}/logo.png`}
          alt="SamISI"
          width={140}
          height={140}
          style={{ objectFit: "contain", position: "relative" }}
        />
      </div>
      <div style={{
        color: "#ffffff",
        fontSize: "22px",
        fontWeight: 700,
        fontFamily: "sans-serif",
        letterSpacing: "0.5px",
        animation: "splashFadeUp 0.6s 0.2s ease both",
      }}>
        SamISI
      </div>
      <div style={{
        color: "rgba(255,255,255,0.6)",
        fontSize: "13px",
        fontFamily: "sans-serif",
        animation: "splashFadeUp 0.6s 0.35s ease both",
      }}>
        Masofaviy Ta&apos;lim Tizimi
      </div>
      <style>{`
        @keyframes splashPop {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes splashFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
