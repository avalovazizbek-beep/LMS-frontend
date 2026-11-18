"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { ArrowDownUp } from "lucide-react"
import type { SurveyBreakdownRow } from "@/lib/api"
import { Meter } from "@/components/admin/DashboardCharts"
import { percent } from "./surveyUi"

/* Natijalar grafiklari — bitta seriya, bitta rang (--adm-accent), ingichka
   ustunlar, yumaloq uchlar; har ustunda hover tooltip (soni va foizi).
   Matnlar faqat matn tokenlarida, rang — faqat ustunda. */

const NUM = { fontVariantNumeric: "tabular-nums" } as const
const EASE = [0.22, 1, 0.36, 1] as const

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute -top-8 right-0 z-10 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium shadow-lg"
      style={{ backgroundColor: "var(--adm-text)", color: "var(--adm-card)" }}>
      {children}
    </span>
  )
}

/** Variantlar bo'yicha gorizontal ustunlar (bitta javobli / ko'p javobli / ha-yo'q) */
export function OptionBars({ rows, total }: { rows: { key: string | number; label: string; count: number; percent: number }[]; total: number }) {
  const [hover, setHover] = useState<string | number | null>(null)
  const top = rows.reduce((best, r) => (r.count > best ? r.count : best), 0)
  return (
    <div className="flex flex-col gap-3" onPointerLeave={() => setHover(null)}>
      {rows.map((r) => {
        const active = hover === r.key
        const dim = hover !== null && !active
        return (
          <div key={r.key} className="group relative cursor-default" onPointerEnter={() => setHover(r.key)}
            style={{ opacity: dim ? 0.55 : 1, transition: "opacity 0.15s" }}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className={`min-w-0 break-words ${r.count === top && top > 0 ? "font-semibold text-[var(--adm-text)]" : "text-[var(--adm-text-2)]"}`}>{r.label}</span>
              <span className="shrink-0 text-[var(--adm-text)]" style={NUM}>
                <b>{r.percent}%</b> <span className="text-xs text-[var(--adm-muted)]">({r.count})</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--adm-grid)" }}>
              <motion.div className="h-full rounded-full" style={{ backgroundColor: "var(--adm-accent)" }}
                initial={{ width: 0 }} animate={{ width: `${Math.min(100, r.percent)}%` }} transition={{ duration: 0.7, ease: EASE }} />
            </div>
            {active && <Tooltip>{r.count} ta javob · {total ? `${r.percent}% javob berganlardan` : "javob yo'q"}</Tooltip>}
          </div>
        )
      })}
    </div>
  )
}

/** Shkala / yulduz taqsimoti: vertikal ustunlar + o'rtacha ball */
export function DistributionBars({ dist, average, max, star }: {
  dist: { value: number; count: number; percent: number }[]
  average: number | null | undefined
  max: number
  star?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const peak = Math.max(1, ...dist.map((d) => d.count))
  const height = 120
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="shrink-0 sm:w-36">
        <div className="text-[11px] font-medium text-[var(--adm-muted)]">O&apos;rtacha ball</div>
        <div className="text-4xl font-bold leading-tight text-[var(--adm-text)]" style={NUM}>{average ?? "—"}</div>
        <div className="text-xs text-[var(--adm-muted)]">{max} balldan{star ? " (yulduz)" : ""}</div>
      </div>
      <div className="flex min-w-0 flex-1 items-end gap-1.5" style={{ height: height + 22 }} onPointerLeave={() => setHover(null)}>
        {dist.map((d) => {
          const h = d.count > 0 ? Math.max(6, (d.count / peak) * height) : 3
          const active = hover === d.value
          return (
            <div key={d.value} className="relative flex min-w-0 flex-1 cursor-default flex-col items-center gap-1.5"
              onPointerEnter={() => setHover(d.value)} style={{ opacity: hover !== null && !active ? 0.55 : 1 }}>
              {active && (
                <span className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium shadow-lg"
                  style={{ bottom: h + 26, backgroundColor: "var(--adm-text)", color: "var(--adm-card)" }}>
                  {d.value} ball: {d.count} ta · {d.percent}%
                </span>
              )}
              <motion.div className="w-full max-w-[34px]" style={{ backgroundColor: d.count ? "var(--adm-accent)" : "var(--adm-grid)", borderRadius: "4px 4px 2px 2px" }}
                initial={{ height: 0 }} animate={{ height: h }} transition={{ duration: 0.6, ease: EASE }} />
              <span className="text-xs text-[var(--adm-muted)]" style={NUM}>{d.value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Kunlik javoblar (bitta seriya): faqat hover'da qiymat, o'qda birinchi/oxirgi sana */
export function TrendBars({ points: raw }: { points: { date: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  // Birinchi va oxirgi kun orasidagi javobsiz kunlar 0 bilan to'ldiriladi (ko'pi bilan 90 kun)
  const points = useMemo(() => {
    if (raw.length < 2) return raw
    const byDate = new Map(raw.map((p) => [p.date, p.count]))
    const out: { date: string; count: number }[] = []
    const d = new Date(`${raw[0].date}T00:00:00`)
    const last = raw[raw.length - 1].date
    const pad = (n: number) => String(n).padStart(2, "0")
    for (let i = 0; i < 90; i += 1) {
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      out.push({ date: key, count: byDate.get(key) ?? 0 })
      if (key >= last) break
      d.setDate(d.getDate() + 1)
    }
    return out
  }, [raw])
  if (!points.length) return <p className="py-6 text-center text-xs text-[var(--adm-muted)]">Hali javob yo&apos;q</p>
  const peak = Math.max(1, ...points.map((p) => p.count))
  const height = 110
  const label = (iso: string) => { const [, m, d] = iso.split("-"); return `${d}.${m}` }
  return (
    <div>
      <div className="relative flex items-end gap-[3px]" style={{ height }} onPointerLeave={() => setHover(null)}>
        {points.map((p, i) => {
          const h = p.count > 0 ? Math.max(4, (p.count / peak) * height) : 2
          return (
            <div key={p.date} className="relative flex h-full min-w-0 flex-1 cursor-default items-end justify-center" onPointerEnter={() => setHover(i)}>
              {hover === i && (
                <span className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium shadow-lg"
                  style={{ bottom: h + 6, backgroundColor: "var(--adm-text)", color: "var(--adm-card)" }}>
                  {label(p.date)}: {p.count} ta javob
                </span>
              )}
              <div className="w-full max-w-[28px]" style={{ height: h, backgroundColor: p.count ? "var(--adm-accent)" : "var(--adm-grid)", opacity: hover !== null && hover !== i ? 0.5 : 1, borderRadius: "4px 4px 2px 2px" }} />
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-[var(--adm-muted)]" style={NUM}>
        <span>{label(points[0].date)}</span>
        {points.length > 1 && <span>{label(points[points.length - 1].date)}</span>}
      </div>
    </div>
  )
}

/** Kesim jadvali: nomi, maqsadli, javob berdi, ulush (meter) — saralanadi */
export function BreakdownTable({ title, rows, nameLabel }: { title: string; rows: SurveyBreakdownRow[]; nameLabel: string }) {
  const [sort, setSort] = useState<"name" | "rate" | "total">("rate")
  const sorted = useMemo(() => {
    const list = [...rows]
    if (sort === "name") list.sort((a, b) => a.key.localeCompare(b.key, "uz"))
    if (sort === "total") list.sort((a, b) => b.total - a.total)
    if (sort === "rate") list.sort((a, b) => percent(a.completed, a.total) - percent(b.completed, b.total) || b.total - a.total)
    return list
  }, [rows, sort])
  if (!rows.length) return null
  return (
    <div className="adm-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
        <h3 className="text-sm font-bold text-[var(--adm-text)]">{title}</h3>
        <label className="flex items-center gap-1.5 text-xs text-[var(--adm-muted)]">
          <ArrowDownUp className="h-3.5 w-3.5" />
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="cursor-pointer bg-transparent text-xs font-semibold text-[var(--adm-text-2)] outline-none">
            <option value="rate">Eng past ishtirok</option>
            <option value="total">Eng ko&apos;p a&apos;zo</option>
            <option value="name">Nomi bo&apos;yicha</option>
          </select>
        </label>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead className="sticky top-0" style={{ backgroundColor: "var(--adm-grid)" }}>
            <tr>
              {[nameLabel, "Maqsadli", "Javob berdi", "Ishtirok"].map((h, i) => (
                <th key={h} className={`whitespace-nowrap px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--adm-muted)] ${i === 0 ? "text-left" : i === 3 ? "w-[34%] text-left" : "text-right"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const rate = percent(r.completed, r.total)
              return (
                <tr key={r.key} className="adm-hover-row" style={{ borderTop: "1px solid var(--adm-border)" }}>
                  <td className="px-4 py-2.5 text-[13px] font-medium text-[var(--adm-text)]">{r.key}</td>
                  <td className="px-4 py-2.5 text-right text-[13px] text-[var(--adm-text-2)]" style={NUM}>{r.total}</td>
                  <td className="px-4 py-2.5 text-right text-[13px] text-[var(--adm-text-2)]" style={NUM}>{r.completed}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1"><Meter percent={rate} color="var(--adm-accent)" /></div>
                      <span className="w-12 text-right text-xs font-semibold text-[var(--adm-text)]" style={NUM}>{rate}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
