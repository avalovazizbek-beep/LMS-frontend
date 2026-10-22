"use client"

import { useEffect, useRef, useState } from "react"

/* Logo — qo'lda chizilgandek animatsiya (public/logo-draw.svg).
   Tartib: halqalar → binolar → noutbuk va kitob → quloqchin → "SamISI" →
   "Masofaviy Ta'lim" → tarmoq → yulduzlar; keyin rangli logo markazdan
   ochiladi va chiziqlar so'nadi. Chiziqlar logo.png'dan avtomatik ajratilgan
   (logo o'zgarsa SVG qayta yaratiladi — "logo animatsiya" papkasidagi skriptlar).
   SVG sahifaga ichki (inline) qo'yiladi — <img> bo'lsa brauzer bir xil
   rasmning animatsiyasini qayta boshlamay qo'yishi mumkin edi. To'q fon uchun
   mo'ljallangan (chiziqlar och rangda). */

export const HAND_DRAWN_LOGO_MS = 8400

let svgText: Promise<string> | null = null
function loadSvg() {
  svgText ??= fetch("/logo-draw.svg").then(r => {
    if (!r.ok) throw new Error(String(r.status))
    return r.text()
  })
  return svgText
}

export default function HandDrawnLogo({ size = 320, className, onDone }: {
  /** Kenglik va balandlik (px yoki CSS qiymati) */
  size?: number | string
  className?: string
  /** Animatsiya tugagach (rangli logo to'liq ko'ringach) */
  onDone?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadSvg()
      .then(text => {
        const host = ref.current
        if (cancelled || !host) return
        // O'zimizning statik faylimiz (public/logo-draw.svg) — tashqi kontent emas
        host.innerHTML = text // nosemgrep
        const svg = host.querySelector("svg")
        // Ichki SVG'ning SMIL vaqti (rangli logo ochilishi) shu joydan boshlansin
        svg?.setCurrentTime(0)
        setReady(true)
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!onDone || (!ready && !failed)) return
    const timer = window.setTimeout(onDone, failed ? 0 : HAND_DRAWN_LOGO_MS)
    return () => window.clearTimeout(timer)
  }, [ready, failed, onDone])

  if (failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/logo.png" alt="SamISI — Masofaviy Ta'lim" className={className} style={{ width: size, height: size }} />
  }
  return (
    <div ref={ref} role="img" aria-label="SamISI — Masofaviy Ta'lim" className={className}
      style={{ width: size, height: size }} />
  )
}
