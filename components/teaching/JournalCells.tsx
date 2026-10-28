"use client"

/* Baholar jurnali kataklari — o'qituvchi jurnali (Natijalar) va talabaning
   "O'zlashtirish" sahifasidagi jadval bir xil ko'rinsin. */

/* ─── Rang yordamchi ─────────────────────────────────────────────────── */
export function pctColor(pct: number | null): string {
  if (pct === null) return "#94a3b8"
  if (pct >= 86) return "#15803d"
  if (pct >= 71) return "#16a34a"
  if (pct >= 56) return "#d97706"
  return "#b91c1c"
}
export function pctBg(pct: number | null): string {
  if (pct === null) return "transparent"
  if (pct >= 71) return "rgba(21,128,61,0.09)"
  if (pct >= 56) return "rgba(217,119,6,0.09)"
  return "rgba(185,28,28,0.09)"
}

/* ─── Mavzu score cell ───────────────────────────────────────────────── */
export function TopicCell({ score, max }: { score: number | null; max: number }) {
  if (score === null)
    return (
      <td className="text-center px-1 py-2 border-r border-[rgba(1,41,112,0.06)]">
        <span style={{ color: "#d1d5db", fontSize: 13 }}>—</span>
      </td>
    )
  const effectiveMax = max > 0 ? max : 100
  const pct = Math.min(100, (score / effectiveMax) * 100)
  const c = pctColor(pct); const bg = pctBg(pct)
  return (
    <td className="text-center px-1 py-2 border-r border-[rgba(1,41,112,0.06)]">
      <span className="inline-block min-w-[32px] rounded-[4px] text-xs font-semibold px-1 py-0.5"
        style={{ color: c, backgroundColor: bg, fontFamily: "var(--font-poppins)" }}>
        {score}
      </span>
    </td>
  )
}

/* ─── Hisoblangan ball katagi (JN / Umumiy / Ball) ───────────────────── */
export function BallCell({ value, max }: { value: number | null; max: number }) {
  if (value === null) return (
    <td className="text-center px-2 py-2 border-r border-[rgba(1,41,112,0.1)]">
      <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
    </td>
  )
  const pct = max > 0 ? (value / max) * 100 : 0
  const c = pctColor(pct); const bg = pctBg(pct)
  return (
    <td className="text-center px-2 py-2 border-r border-[rgba(1,41,112,0.1)]">
      <span className="inline-block px-1.5 py-0.5 rounded-[4px] text-xs font-bold"
        style={{ color: c, backgroundColor: bg, fontFamily: "var(--font-poppins)" }}>
        {value}
      </span>
    </td>
  )
}

/* ─── Baho katagi (5 / 4 / 3 / 2) ────────────────────────────────────── */
export const BAHO_COLOR: Record<number, string> = { 5: "#15803d", 4: "#16a34a", 3: "#d97706", 2: "#b91c1c" }

export function BahoCell({ value }: { value: number | null }) {
  return (
    <td className="text-center px-2 py-2 border-r border-[rgba(1,41,112,0.1)]">
      {value === null
        ? <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
        : <span className="text-sm font-bold" style={{ color: BAHO_COLOR[value], fontFamily: "var(--font-poppins)" }}>{value}</span>}
    </td>
  )
}

/* ─── Davomat cell ───────────────────────────────────────────────────── */
export function AttCell({ pct }: { pct: number | null }) {
  if (pct === null) return (
    <td className="text-center px-2 py-2">
      <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
    </td>
  )
  const c = pct >= 75 ? "#15803d" : pct >= 60 ? "#d97706" : "#b91c1c"
  const bg = pct >= 75 ? "rgba(21,128,61,0.09)" : pct >= 60 ? "rgba(217,119,6,0.09)" : "rgba(185,28,28,0.09)"
  return (
    <td className="text-center px-2 py-2">
      <span className="inline-block px-1.5 py-0.5 rounded-[4px] text-xs font-semibold"
        style={{ color: c, backgroundColor: bg, fontFamily: "var(--font-poppins)" }}>
        {pct}%
      </span>
    </td>
  )
}
