"use client"

import { useEffect, useRef, useState } from "react"
import { animate } from "framer-motion"
import { motion } from "@/components/ui/motion"
import { useLanguage } from "@/lib/i18n/LanguageContext"

/* ── Animated number ───────────────────────────────────────────── */

export function CountUp({ value, duration = 0.9 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { node.textContent = Math.round(v).toLocaleString() },
    })
    return () => controls.stop()
  }, [value, duration])

  return <span ref={ref}>0</span>
}

/* ── Relative time ("5 daqiqa oldin") ──────────────────────────── */

export function useTimeAgo() {
  const { t } = useLanguage()
  return (iso: string | number | Date) => {
    const then = new Date(iso).getTime()
    if (Number.isNaN(then)) return ""
    const diffMs = Date.now() - then
    const minutes = Math.floor(diffMs / 60000)
    if (minutes < 1) return t("adminDashboard.timeJustNow")
    if (minutes < 60) return t("adminDashboard.timeMinutesAgo", { count: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t("adminDashboard.timeHoursAgo", { count: hours })
    const days = Math.floor(hours / 24)
    return t("adminDashboard.timeDaysAgo", { count: days })
  }
}

/* ── Trend area chart (single series) ──────────────────────────── */

export interface TrendPoint {
  label: string
  value: number
}

export function TrendAreaChart({
  data,
  color = "#0e58a8",
  height = 200,
}: {
  data: TrendPoint[]
  color?: string
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const width = 600
  const padTop = 16
  const padBottom = 28
  const padX = 4
  const plotH = height - padTop - padBottom
  const max = Math.max(1, ...data.map((d) => d.value))

  const xAt = (i: number) => padX + (i / Math.max(1, data.length - 1)) * (width - padX * 2)
  const yAt = (v: number) => padTop + plotH - (v / max) * plotH

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(2)} ${yAt(d.value).toFixed(2)}`).join(" ")
  const areaPath = `${linePath} L ${xAt(data.length - 1).toFixed(2)} ${padTop + plotH} L ${xAt(0).toFixed(2)} ${padTop + plotH} Z`

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * width
    const step = (width - padX * 2) / Math.max(1, data.length - 1)
    const idx = Math.round((relX - padX) / step)
    setHover(Math.min(data.length - 1, Math.max(0, idx)))
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none"
        style={{ height }}
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <line x1={padX} y1={padTop + plotH} x2={width - padX} y2={padTop + plotH} stroke="#e3ecf7" strokeWidth={1} />

        <motion.g initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: `0px ${padTop + plotH}px` }}>
          <path d={areaPath} fill={color} opacity={0.1} />
        </motion.g>

        <motion.path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />

        {hover !== null && (
          <g>
            <line x1={xAt(hover)} y1={padTop} x2={xAt(hover)} y2={padTop + plotH} stroke={color} strokeOpacity={0.25} strokeWidth={1} />
            <circle cx={xAt(hover)} cy={yAt(data[hover].value)} r={4} fill={color} stroke="#fff" strokeWidth={2} />
          </g>
        )}

        {data.map((d, i) => (
          <text key={d.label} x={xAt(i)} y={height - 6} textAnchor="middle" fontSize={10} fill="#7293b9" fontFamily="var(--font-poppins)">
            {d.label}
          </text>
        ))}
      </svg>

      {hover !== null && (
        <div
          className="absolute pointer-events-none rounded-[8px] px-2.5 py-1.5 text-xs font-medium shadow-lg"
          style={{
            left: `${(xAt(hover) / width) * 100}%`,
            top: 0,
            transform: `translate(-50%, ${yAt(data[hover].value) > height / 2 ? "-100%" : "0%"})`,
            backgroundColor: "#012970",
            color: "#fff",
            fontFamily: "var(--font-poppins)",
            whiteSpace: "nowrap",
          }}
        >
          <span className="font-bold">{data[hover].value}</span>
          <span style={{ opacity: 0.7 }}> · {data[hover].label}</span>
        </div>
      )}
    </div>
  )
}

/* ── Stacked breakdown bar (part-to-whole, categorical) ────────── */

export interface BreakdownSegment {
  key: string
  label: string
  value: number
  color: string
}

export function StackedBreakdownBar({ segments }: { segments: BreakdownSegment[] }) {
  const [hover, setHover] = useState<string | null>(null)
  const total = Math.max(1, segments.reduce((s, seg) => s + seg.value, 0))
  const visible = segments.filter((s) => s.value > 0)

  return (
    <div className="w-full">
      <div className="flex w-full h-4 rounded-full overflow-hidden gap-[2px]" style={{ backgroundColor: "#eef4ff" }}>
        {visible.map((seg) => (
          <motion.div
            key={seg.key}
            className="h-full cursor-default"
            style={{ backgroundColor: seg.color, filter: hover === seg.key ? "brightness(1.12)" : "none" }}
            initial={{ width: "0%" }}
            animate={{ width: `${(seg.value / total) * 100}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            onPointerEnter={() => setHover(seg.key)}
            onPointerLeave={() => setHover(null)}
            title={`${seg.label}: ${seg.value} (${Math.round((seg.value / total) * 100)}%)`}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="truncate" style={{ color: "#516a8f", fontFamily: "var(--font-poppins)" }}>{seg.label}</span>
            <span className="ml-auto font-semibold shrink-0" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {seg.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
