"use client"

import { useEffect, useId, useRef, useState } from "react"
import { animate } from "framer-motion"
import { motion } from "@/components/ui/motion"
import { useLanguage } from "@/lib/i18n/LanguageContext"

/* Ranglar admin.css'dagi tokenlardan olinadi (--adm-*), shuning uchun
   grafiklar yorug' va qorong'i rejimda bir xil ishlaydi. */

/* ── Animated number ───────────────────────────────────────────── */

export function CountUp({ value, duration = 0.9 }: { value: number; duration?: number }) {
  const { locale } = useLanguage()
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { node.textContent = Math.round(v).toLocaleString(locale) },
    })
    return () => controls.stop()
  }, [value, duration, locale])

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

/* ── Yordamchilar ──────────────────────────────────────────────── */

export interface TrendPoint {
  label: string
  value: number
}

/** Elementning haqiqiy kengligi — SVG'ni cho'zmasdan (nuqtalar ellips bo'lib
 *  qolmasligi uchun) aniq piksel o'lchamida chizish uchun. */
function useMeasuredWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** SVG gradient id — useId() belgilarini url(#...) uchun tozalaydi */
function useSvgId(prefix: string) {
  return prefix + useId().replace(/[^a-zA-Z0-9_-]/g, "")
}

/** Monoton kubik egri chiziq (d3 curveMonotoneX bilan bir xil): nuqtalar
 *  orasida silliq, lekin hech qachon nuqtalardan yuqori/past "otilib"
 *  ketmaydi — 0 qiymatli kunlarda chiziq o'qdan pastga tushmaydi. */
function monotonePath(pts: { x: number; y: number }[]): string {
  const n = pts.length
  if (n === 0) return ""
  if (n === 1) return `M${pts[0].x},${pts[0].y}`
  if (n === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`

  const h: number[] = []
  const s: number[] = []
  for (let i = 0; i < n - 1; i++) {
    h.push(pts[i + 1].x - pts[i].x)
    s.push(h[i] ? (pts[i + 1].y - pts[i].y) / h[i] : 0)
  }
  const tan: number[] = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    const p = (s[i - 1] * h[i] + s[i] * h[i - 1]) / (h[i - 1] + h[i])
    tan[i] = (Math.sign(s[i - 1]) + Math.sign(s[i])) * Math.min(Math.abs(s[i - 1]), Math.abs(s[i]), 0.5 * Math.abs(p)) || 0
  }
  tan[0] = (3 * s[0] - tan[1]) / 2
  tan[n - 1] = (3 * s[n - 2] - tan[n - 2]) / 2
  // Chetki nuqtalarda ham monotonlik buzilmasin
  if (Math.sign(tan[0]) !== Math.sign(s[0])) tan[0] = 0
  if (Math.sign(tan[n - 1]) !== Math.sign(s[n - 2])) tan[n - 1] = 0

  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < n - 1; i++) {
    const dx = h[i] / 3
    d += `C${pts[i].x + dx},${pts[i].y + tan[i] * dx} ${pts[i + 1].x - dx},${pts[i + 1].y - tan[i + 1] * dx} ${pts[i + 1].x},${pts[i + 1].y}`
  }
  return d
}

/** Y o'qi uchun "chiroyli" qadam va maksimum (0, 50, 100, 150 ...) */
function niceScale(maxValue: number, intervals = 3) {
  if (maxValue <= 0) return { max: intervals, step: 1 }
  const raw = maxValue / intervals
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = Math.max(1, (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag)
  return { max: Math.ceil(maxValue / step) * step, step }
}

const EASE = [0.16, 1, 0.3, 1] as const

/* ── Trend area chart (single series) ──────────────────────────── */

export function TrendAreaChart({
  data,
  color = "var(--adm-accent)",
  height = 220,
}: {
  data: TrendPoint[]
  color?: string
  height?: number
}) {
  const { locale } = useLanguage()
  const [ref, width] = useMeasuredWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const gradId = useSvgId("trend")

  const padTop = 12
  const padBottom = 30
  const padLeft = 40
  const padRight = 14
  const inset = 14
  const plotH = height - padTop - padBottom
  const { max, step } = niceScale(Math.max(0, ...data.map((d) => d.value)))
  const ticks: number[] = []
  for (let v = 0; v <= max; v += step) ticks.push(v)

  const plotW = Math.max(1, width - padLeft - padRight - inset * 2)
  const xAt = (i: number) => padLeft + inset + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2)
  const yAt = (v: number) => padTop + plotH - (v / max) * plotH
  const pts = data.map((d, i) => ({ x: xAt(i), y: yAt(d.value) }))
  const line = monotonePath(pts)
  const baseY = padTop + plotH
  const area = pts.length > 1 ? `${line}L${pts[pts.length - 1].x},${baseY}L${pts[0].x},${baseY}Z` : ""

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    if (data.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = e.clientX - rect.left
    let best = 0
    for (let i = 1; i < pts.length; i++) {
      if (Math.abs(pts[i].x - relX) < Math.abs(pts[best].x - relX)) best = i
    }
    setHover(best)
  }

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && data.length > 0 && (
        <svg width={width} height={height} className="block touch-none" onPointerMove={handleMove} onPointerLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.22 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>

          {/* Gridlines + Y-axis yorliqlari — recessive, hairline */}
          {ticks.map((v) => (
            <g key={v}>
              <line x1={padLeft} y1={yAt(v)} x2={width - padRight} y2={yAt(v)} style={{ stroke: "var(--adm-grid)" }} strokeWidth={1} />
              <text x={padLeft - 10} y={yAt(v) + 4} textAnchor="end" fontSize={11} style={{ fill: "var(--adm-muted)", fontVariantNumeric: "tabular-nums" }}>
                {v.toLocaleString(locale)}
              </text>
            </g>
          ))}

          <motion.path d={area} fill={`url(#${gradId})`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }} />

          <motion.path
            d={line}
            fill="none"
            style={{ stroke: color }}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: EASE }}
          />

          {hover !== null && (
            <line x1={pts[hover].x} y1={padTop} x2={pts[hover].x} y2={baseY} style={{ stroke: color }} strokeOpacity={0.35} strokeDasharray="4 4" strokeWidth={1} />
          )}

          {pts.map((p, i) => (
            <circle key={data[i].label} cx={p.x} cy={p.y} r={hover === i ? 6 : 4.5}
              style={{ fill: color, stroke: "var(--adm-card)" }} strokeWidth={2.5} />
          ))}

          {data.map((d, i) => (
            <text key={d.label} x={xAt(i)} y={height - 8} textAnchor="middle" fontSize={11} style={{ fill: "var(--adm-muted)" }}>
              {d.label}
            </text>
          ))}
        </svg>
      )}

      {hover !== null && width > 0 && (
        <div
          className="pointer-events-none absolute rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-lg"
          style={{
            left: pts[hover].x,
            top: pts[hover].y - 12,
            transform: "translate(-50%, -100%)",
            backgroundColor: "var(--adm-text)",
            color: "var(--adm-card)",
            whiteSpace: "nowrap",
          }}
        >
          <span className="font-bold">{data[hover].value.toLocaleString(locale)}</span>
          <span style={{ opacity: 0.7 }}> · {data[hover].label}</span>
        </div>
      )}
    </div>
  )
}

/* ── Sparkline (KPI kartasi pastidagi kichik trend) ───────────── */

export function Sparkline({
  data,
  color,
  height = 38,
}: {
  data: TrendPoint[]
  color: string
  height?: number
}) {
  const { locale } = useLanguage()
  const [ref, width] = useMeasuredWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const gradId = useSvgId("spark")

  const pad = 5
  const maxV = Math.max(1, ...data.map((d) => d.value))
  const xAt = (i: number) => pad + (data.length > 1 ? (i / (data.length - 1)) * (width - pad * 2) : (width - pad * 2) / 2)
  const yAt = (v: number) => pad + (height - pad * 2) * (1 - v / maxV)
  const pts = data.map((d, i) => ({ x: xAt(i), y: yAt(d.value) }))
  const line = monotonePath(pts)
  const area = pts.length > 1 ? `${line}L${pts[pts.length - 1].x},${height}L${pts[0].x},${height}Z` : ""

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    if (pts.length === 0) return
    const relX = e.clientX - e.currentTarget.getBoundingClientRect().left
    let best = 0
    for (let i = 1; i < pts.length; i++) {
      if (Math.abs(pts[i].x - relX) < Math.abs(pts[best].x - relX)) best = i
    }
    setHover(best)
  }

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && data.length > 0 && (
        <svg width={width} height={height} className="block touch-none overflow-visible" onPointerMove={handleMove} onPointerLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.2 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradId})`} />
          <motion.path d={line} fill="none" style={{ stroke: color }} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: EASE }} />
          {pts.map((p, i) => (
            <circle key={data[i].label} cx={p.x} cy={p.y} r={hover === i || i === pts.length - 1 ? 3.5 : 2.5}
              style={{ fill: color, stroke: "var(--adm-card)" }} strokeWidth={1.5} />
          ))}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <div
          className="pointer-events-none absolute z-10 rounded-md px-2 py-1 text-[11px] font-medium shadow-lg"
          style={{
            left: pts[hover].x,
            top: pts[hover].y - 8,
            transform: "translate(-50%, -100%)",
            backgroundColor: "var(--adm-text)",
            color: "var(--adm-card)",
            whiteSpace: "nowrap",
          }}
        >
          <span className="font-bold">{data[hover].value.toLocaleString(locale)}</span>
          <span style={{ opacity: 0.7 }}> · {data[hover].label}</span>
        </div>
      )}
    </div>
  )
}

/* ── Ulush chizig'i (meter) — KPI kartalaridagi foizlar uchun ──── */

export function Meter({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${color} 70%, #ffffff), ${color})` }}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
      />
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
  const { locale } = useLanguage()
  const [hover, setHover] = useState<string | null>(null)
  const total = Math.max(1, segments.reduce((s, seg) => s + seg.value, 0))
  const visible = segments.filter((s) => s.value > 0)
  const dim = (key: string) => (hover !== null && hover !== key ? 0.4 : 1)

  return (
    <div className="w-full">
      {/* Segmentlar orasidagi 2px oraliq karta fonini ko'rsatadi; bo'sh holatda — kulrang trek */}
      <div className="flex h-[18px] w-full gap-[2px] overflow-hidden rounded-full"
        style={{ backgroundColor: visible.length ? "transparent" : "var(--adm-grid)" }}>
        {visible.map((seg) => (
          <motion.div
            key={seg.key}
            className="h-full cursor-default"
            style={{ backgroundColor: seg.color, opacity: dim(seg.key), transition: "opacity 0.15s" }}
            initial={{ width: "0%" }}
            animate={{ width: `${(seg.value / total) * 100}%` }}
            transition={{ duration: 0.7, ease: EASE }}
            onPointerEnter={() => setHover(seg.key)}
            onPointerLeave={() => setHover(null)}
            title={`${seg.label}: ${seg.value.toLocaleString(locale)} (${Math.round((seg.value / total) * 100)}%)`}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3.5">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-2.5 text-[13px] cursor-default"
            style={{ opacity: dim(seg.key), transition: "opacity 0.15s" }}
            onPointerEnter={() => setHover(seg.key)}
            onPointerLeave={() => setHover(null)}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="truncate text-[var(--adm-text-2)]">{seg.label}</span>
            <span className="ml-auto shrink-0 font-semibold text-[var(--adm-text)]">
              {seg.value.toLocaleString(locale)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Oddiy ustunli grafik (vaqt bo'yicha, bitta seriya) ──────────── */

export function SimpleBarChart({
  data,
  color = "var(--adm-accent)",
  height = 140,
}: {
  data: TrendPoint[]
  color?: string
  height?: number
}) {
  const { locale } = useLanguage()
  if (data.length === 0) return null
  const max = Math.max(1, ...data.map((d) => d.value))
  const labelSpace = 44

  return (
    <div className="flex w-full items-end justify-between gap-2" style={{ height }}>
      {data.map((d) => {
        const barH = d.value > 0 ? Math.max(8, (d.value / max) * (height - labelSpace)) : 4
        return (
          <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" title={`${d.label}: ${d.value.toLocaleString(locale)}`}>
            <span className="text-xs font-semibold text-[var(--adm-text)]">
              {d.value.toLocaleString(locale)}
            </span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: barH }}
              transition={{ duration: 0.7, ease: EASE }}
              style={{
                width: 30,
                maxWidth: "70%",
                background: d.value > 0 ? `linear-gradient(180deg, color-mix(in srgb, ${color} 75%, #ffffff), ${color})` : color,
                borderRadius: d.value > 0 ? "6px 6px 3px 3px" : 9999,
              }}
            />
            <span className="truncate text-xs text-[var(--adm-muted)]">
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
