"use client"

import { useEffect, useRef, useState } from "react"
import { animate } from "framer-motion"
import { motion, staggerItem } from "@/components/ui/motion"
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

/** Gridlines uchun "chiroyli" yumaloq maksimal qiymat (0, 1, 2, 5, 10, 20, 25, 50, 100...) */
function niceMax(value: number): number {
  if (value <= 5) return Math.max(2, value)
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

export function TrendAreaChart({
  data,
  color = "#0e58a8",
  height = 220,
}: {
  data: TrendPoint[]
  color?: string
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  if (data.length === 0) return null
  const width = 600
  const padTop = 16
  const padBottom = 28
  const padLeft = 28
  const padRight = 36
  const plotH = height - padTop - padBottom
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)))
  const gridSteps = [0, 0.5, 1]

  const xAt = (i: number) => padLeft + (i / Math.max(1, data.length - 1)) * (width - padLeft - padRight)
  const yAt = (v: number) => padTop + plotH - (v / max) * plotH

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(2)} ${yAt(d.value).toFixed(2)}`).join(" ")
  const areaPath = `${linePath} L ${xAt(data.length - 1).toFixed(2)} ${padTop + plotH} L ${xAt(0).toFixed(2)} ${padTop + plotH} Z`
  const last = data[data.length - 1]

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * width
    const step = (width - padLeft - padRight) / Math.max(1, data.length - 1)
    const idx = Math.round((relX - padLeft) / step)
    setHover(Math.min(data.length - 1, Math.max(0, idx)))
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full touch-none"
        style={{ height }}
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        {/* Gridlines + Y-axis qiymat yorliqlari — recessive, hairline */}
        {gridSteps.map((step) => {
          const y = padTop + plotH - step * plotH
          const val = Math.round(max * step)
          return (
            <g key={step}>
              <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#eef2f8" strokeWidth={1} />
              <text x={padLeft - 8} y={y + 3} textAnchor="end" fontSize={10} fill="#a9bcd6" fontFamily="var(--font-poppins)">
                {val}
              </text>
            </g>
          )
        })}

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

        {/* Har bir nuqtada doim ko'rinadigan belgi — grafik hech qachon "bo'sh" ko'rinmasin */}
        {data.map((d, i) => (
          <circle key={`dot-${d.label}`} cx={xAt(i)} cy={yAt(d.value)} r={3} fill={color} stroke="#fff" strokeWidth={1.5} />
        ))}

        {/* Oxirgi qiymat — chiziq oxirida to'g'ridan-to'g'ri yorliq */}
        <text x={xAt(data.length - 1) + 8} y={yAt(last.value) + 3} fontSize={11} fontWeight={600} fill="#012970" fontFamily="var(--font-poppins)">
          {last.value}
        </text>

        {hover !== null && (
          <g>
            <line x1={xAt(hover)} y1={padTop} x2={xAt(hover)} y2={padTop + plotH} stroke={color} strokeOpacity={0.25} strokeWidth={1} />
            <circle cx={xAt(hover)} cy={yAt(data[hover].value)} r={5} fill={color} stroke="#fff" strokeWidth={2} />
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

/* ── Radial stat card (bosh sahifa tepasidagi qisqa xulosa kartasi) ── */

export function RadialStatCard({
  icon,
  label,
  sublabel,
  percent,
  color = "#0e58a8",
}: {
  icon: React.ReactNode
  label: string
  sublabel: string
  percent: number
  color?: string
}) {
  const clamped = Math.max(0, Math.min(100, percent))
  const r = 26
  const circumference = 2 * Math.PI * r

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -2 }}
      className="bg-white rounded-[12px] p-4 flex flex-col gap-3"
      style={{ border: "1px solid rgba(1,41,112,0.08)", boxShadow: "0px 0px 6px rgba(1,41,112,0.04)" }}
    >
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-[6px]" style={{ backgroundColor: `${color}14` }}>
          {icon}
        </div>
        <span className="text-sm font-semibold truncate" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {label}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <svg width={64} height={64} viewBox="0 0 64 64" className="shrink-0">
          <circle cx={32} cy={32} r={r} fill="none" stroke="#eef2f8" strokeWidth={6} />
          <motion.circle
            cx={32} cy={32} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - (clamped / 100) * circumference }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            transform="rotate(-90 32 32)"
          />
          <text x={32} y={36} textAnchor="middle" fontSize={15} fontWeight={700} fill="#012970" fontFamily="var(--font-poppins)">
            {Math.round(clamped)}%
          </text>
        </svg>
        <div className="text-xs leading-5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {sublabel}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Oddiy ustunli grafik (vaqt bo'yicha, bitta seriya) ──────────── */

export function SimpleBarChart({
  data,
  color = "#0e58a8",
  height = 160,
}: {
  data: TrendPoint[]
  color?: string
  height?: number
}) {
  if (data.length === 0) return null
  const max = Math.max(1, ...data.map((d) => d.value))
  const barW = 28

  return (
    <div className="flex items-end justify-between gap-2 w-full" style={{ height }}>
      {data.map((d) => {
        const barH = Math.max(4, (d.value / max) * (height - 28))
        return (
          <div key={d.label} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
            <span className="text-xs font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {d.value}
            </span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: barH }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: barW, maxWidth: "70%", backgroundColor: color, borderRadius: "4px 4px 0 0" }}
            />
            <span className="text-xs truncate" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
