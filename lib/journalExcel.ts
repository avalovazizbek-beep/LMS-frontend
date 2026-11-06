/* Talabalar ballari jurnali → bezakli Excel (.xlsx).
   Faqat natijalar jadvali (foydalanuvchi so'rovi, 2026-11-06: sarlavha
   bloki, ranglar izohi va imzo kerak emas). Ko'rinishi sahifadagi jadvalga
   mos: bo'limlar ranglari (Ma'ruza sariq, Amaliyot yashil, Joriy, Yakuniy,
   Ball...), har bir ball foiziga qarab rangli, oxirida guruh o'rtachasi. */

import type { JournalMiColumn, JournalScale, JournalStudent, JournalTopic } from "@/lib/api"
import { fmtBall, type JournalLayout } from "@/lib/gradeTotals"
import { colName, downloadXlsx, randomPassword, type XCell, type XSheet, type XStyle } from "@/lib/xlsxWriter"

type TFunc = (key: string, params?: Record<string, string | number>) => string

export interface JournalRowTotals {
  on1: number | null; on2: number | null; yn: number | null
  mi: (c: JournalMiColumn) => number | null
  lecture: number | null; practice: number | null; joriy: number | null; ball: number | null; baho: number | null
}

export interface JournalExcelInput {
  t: TFunc
  groupName: string
  subjectName: string
  topics: JournalTopic[]
  students: JournalStudent[]
  scale: JournalScale
  layout: JournalLayout
  totals: (s: JournalStudent) => JournalRowTotals
}

/* ── Ranglar (sahifadagi jadval bilan bir xil) ───────────────────────── */
const NAVY = "#012970"
const MUTED = "#7293B9"
const GRID = "#C9D6EA"
const ZEBRA = "#F8FAFF"

type GroupKey = "base" | "lecture" | "topics" | "practice" | "joriy" | "yn" | "ball" | "baho" | "att"
const GROUP_FILL: Record<GroupKey, { head: string; sub: string }> = {
  base:     { head: "#E8F0FE", sub: "#E8F0FE" },
  lecture:  { head: "#FEF9C3", sub: "#FEFCE8" },
  topics:   { head: "#DBEAFE", sub: "#F0F5FF" },
  practice: { head: "#DCFCE7", sub: "#F0FDF4" },
  joriy:    { head: "#E0E7FF", sub: "#EEF2FF" },
  yn:       { head: "#FCE7F3", sub: "#FDF2F8" },
  ball:     { head: "#EDE9FE", sub: "#F5F3FF" },
  baho:     { head: "#F5F3FF", sub: "#F5F3FF" },
  att:      { head: "#F0FDF4", sub: "#F0FDF4" },
}

/** pctColor/pctBg (JournalCells) — Excel'da shaffoflik yo'q, oq fonga aralashtirilgan */
function pctTone(pct: number | null): { color: string; fill?: string } {
  if (pct === null) return { color: "#94A3B8" }
  if (pct >= 86) return { color: "#15803D", fill: "#E9F3EC" }
  if (pct >= 71) return { color: "#16A34A", fill: "#E9F3EC" }
  if (pct >= 56) return { color: "#B45309", fill: "#FBF0E1" }
  return { color: "#B91C1C", fill: "#F7E5E5" }
}
function attTone(pct: number | null): { color: string; fill?: string } {
  if (pct === null) return { color: "#94A3B8" }
  if (pct >= 75) return { color: "#15803D", fill: "#E9F3EC" }
  if (pct >= 60) return { color: "#B45309", fill: "#FBF0E1" }
  return { color: "#B91C1C", fill: "#F7E5E5" }
}
const BAHO_TONE: Record<number, { color: string; fill: string }> = {
  5: { color: "#15803D", fill: "#DCFCE7" },
  4: { color: "#166534", fill: "#E9F3EC" },
  3: { color: "#B45309", fill: "#FEF3C7" },
  2: { color: "#B91C1C", fill: "#FEE2E2" },
}

const round2 = (n: number) => Math.round(n * 100) / 100

/* ── Ustunlar ────────────────────────────────────────────────────────── */
interface Col {
  key: string
  group: GroupKey
  sub: string
  width: number
  kind: "index" | "name" | "id" | "score" | "baho" | "att"
  max?: number
  strong?: boolean
  /** Guruh o'rtachasini hisoblash */
  avg?: boolean
  get: (s: JournalStudent, r: JournalRowTotals, i: number) => number | string | null
}

export function buildJournalSheets(inp: JournalExcelInput): XSheet[] {
  const { t, topics, students, scale, layout, totals } = inp
  const { lectureMi, practiceMi, lectureMax, practiceMax, joriyMax, ballMax } = layout
  const hasIds = students.some(s => !!s.studentIdNumber)
  // F.I.Sh. ustuni eng uzun ismga moslanadi (qalin shrift ~1.15 belgi)
  const longestName = students.reduce((m, s) => Math.max(m, s.fullName.length), 0)
  const nameWidth = Math.min(55, Math.max(30, Math.ceil(longestName * 1.15) + 4))

  const cols: Col[] = [
    { key: "idx", group: "base", sub: "№", width: 5, kind: "index", get: (_s, _r, i) => i + 1 },
    { key: "name", group: "base", sub: t("natijalarOq.xlsx.colStudent"), width: nameWidth, kind: "name", get: s => s.fullName },
    ...(hasIds ? [{ key: "id", group: "base" as const, sub: t("natijalarOq.xlsx.colId"), width: 15, kind: "id" as const, get: (s: JournalStudent) => s.studentIdNumber ?? "" }] : []),

    { key: "on1", group: "lecture", sub: `ON1\n/${fmtBall(scale.on1)}`, width: 8, kind: "score", max: scale.on1, avg: true, get: (_s, r) => r.on1 },
    { key: "on2", group: "lecture", sub: `ON2\n/${fmtBall(scale.on2)}`, width: 8, kind: "score", max: scale.on2, avg: true, get: (_s, r) => r.on2 },
    ...lectureMi.map((c): Col => ({ key: `mi-${c.id}`, group: "lecture", sub: `${c.label}\n/${fmtBall(c.points)}`, width: 8, kind: "score", max: c.points, avg: true, get: (_s, r) => r.mi(c) })),
    { key: "lecture", group: "lecture", sub: `${t("natijalarOq.colPartTotal")}\n/${fmtBall(lectureMax)}`, width: 8.5, kind: "score", max: lectureMax, strong: true, avg: true, get: (_s, r) => r.lecture },

    ...topics.map((tp): Col => {
      const max = tp.points ?? tp.maxScore
      return {
        key: `tp-${tp.key}`, group: "topics", sub: `${t("natijalarOq.topicN", { n: tp.idx })}\n/${fmtBall(max > 0 ? max : 100)}`, width: 8, kind: "score",
        max: max > 0 ? max : 100, avg: true,
        get: s => s.topicPoints ? s.topicPoints[tp.key] ?? null : s.topicScores[tp.key] ?? null,
      }
    }),

    { key: "jn", group: "practice", sub: `JN\n/${fmtBall(scale.jn)}`, width: 8, kind: "score", max: scale.jn, avg: true, get: s => s.jn },
    ...practiceMi.map((c): Col => ({ key: `mi-${c.id}`, group: "practice", sub: `${c.label}\n/${fmtBall(c.points)}`, width: 8, kind: "score", max: c.points, avg: true, get: (_s, r) => r.mi(c) })),
    { key: "practice", group: "practice", sub: `${t("natijalarOq.colPartTotal")}\n/${fmtBall(practiceMax)}`, width: 8.5, kind: "score", max: practiceMax, strong: true, avg: true, get: (_s, r) => r.practice },

    { key: "joriy", group: "joriy", sub: `/${fmtBall(joriyMax)}`, width: 9, kind: "score", max: joriyMax, strong: true, avg: true, get: (_s, r) => r.joriy },
    { key: "yn", group: "yn", sub: `/${fmtBall(scale.yn)}`, width: 9, kind: "score", max: scale.yn, avg: true, get: (_s, r) => r.yn },
    { key: "ball", group: "ball", sub: `/${fmtBall(ballMax)}`, width: 9, kind: "score", max: ballMax, strong: true, avg: true, get: (_s, r) => r.ball },
    { key: "baho", group: "baho", sub: "2–5", width: 8, kind: "baho", get: (_s, r) => r.baho },
    { key: "att", group: "att", sub: "%", width: 12, kind: "att", avg: true, get: s => s.attendancePct },
  ]

  const groupLabel: Record<GroupKey, string> = {
    base: "",
    lecture: t("natijalarOq.colLecture"),
    topics: t("natijalarOq.colPracticeTopics"),
    practice: t("natijalarOq.colPractice"),
    joriy: t("natijalarOq.colJoriy"),
    yn: t("natijalarOq.colYn"),
    ball: t("natijalarOq.colBall"),
    baho: t("natijalarOq.colBaho"),
    att: t("natijalarOq.colAttendance"),
  }

  const last = cols.length - 1
  const lastCol = colName(last)
  const rows: (XCell | null)[][] = []
  const merges: string[] = []
  const heights: Record<number, number> = {}
  const put = (r: number, c: number, cell: XCell) => { rows[r - 1] = rows[r - 1] ?? []; rows[r - 1][c] = cell }
  const fullRow = (r: number, cell: XCell, h?: number) => {
    put(r, 0, cell)
    if (last > 0) merges.push(`A${r}:${lastCol}${r}`)
    if (h) heights[r] = h
  }

  /* ── Jadval sarlavhasi: 1 — bo'limlar, 2 — ustunlar ── */
  const H1 = 1, H2 = 2
  heights[H1] = 22
  heights[H2] = 32
  const headBorder = { color: "#B7C7E2", bottomStyle: "medium" as const, bottomColor: NAVY }
  let c = 0
  while (c <= last) {
    const g = cols[c].group
    let end = c
    while (end + 1 <= last && cols[end + 1].group === g && g !== "base") end++
    if (g === "base") {
      // №, Talaba, ID — ikki qatorga birlashtirilgan
      put(H1, c, { v: cols[c].sub, s: { font: { bold: true, size: 10, color: NAVY }, fill: GROUP_FILL.base.head, h: cols[c].kind === "name" ? "left" : "center", indent: cols[c].kind === "name" ? 1 : 0, wrap: true, border: headBorder } })
      merges.push(`${colName(c)}${H1}:${colName(c)}${H2}`)
      end = c
    } else {
      put(H1, c, { v: groupLabel[g], s: { font: { bold: true, size: 10, color: NAVY }, fill: GROUP_FILL[g].head, h: "center", border: { color: "#B7C7E2" } } })
      if (end > c) merges.push(`${colName(c)}${H1}:${colName(end)}${H1}`)
      for (let k = c; k <= end; k++) {
        put(H2, k, {
          v: cols[k].sub,
          s: { font: { bold: true, size: 9, color: cols[k].strong ? NAVY : "#334E7A" }, fill: cols[k].strong ? GROUP_FILL[g].head : GROUP_FILL[g].sub, h: "center", wrap: true, border: headBorder },
        })
      }
    }
    c = end + 1
  }

  /* ── Talabalar ── */
  const firstData = H2 + 1
  const sums = cols.map(() => ({ sum: 0, n: 0 }))
  students.forEach((s, i) => {
    const r = firstData + i
    heights[r] = 18
    const tot = totals(s)
    const zebra = i % 2 === 1 ? ZEBRA : "#FFFFFF"
    cols.forEach((col, ci) => {
      const raw = col.get(s, tot, i)
      const border = { color: GRID }
      if (col.kind === "index") { put(r, ci, { v: raw, s: { font: { size: 9, color: MUTED }, fill: zebra, h: "center", border } }); return }
      if (col.kind === "name") { put(r, ci, { v: raw, s: { font: { size: 10, color: NAVY, bold: true }, fill: zebra, h: "left", indent: 1, border } }); return }
      if (col.kind === "id") { put(r, ci, { v: raw || "—", s: { font: { size: 9, color: MUTED }, fill: zebra, h: "center", border } }); return }

      const num = typeof raw === "number" && Number.isFinite(raw) ? round2(raw) : null
      if (num !== null && col.avg) { sums[ci].sum += num; sums[ci].n++ }
      if (num === null) { put(r, ci, { v: "—", s: { font: { size: 10, color: "#B6C2D4" }, fill: zebra, h: "center", border } }); return }

      if (col.kind === "baho") {
        const tone = BAHO_TONE[num] ?? { color: NAVY, fill: zebra }
        put(r, ci, { v: num, s: { font: { size: 11, bold: true, color: tone.color }, fill: tone.fill, h: "center", border } })
        return
      }
      if (col.kind === "att") {
        const tone = attTone(num)
        put(r, ci, { v: num / 100, s: { font: { size: 10, bold: true, color: tone.color }, fill: tone.fill ?? zebra, h: "center", border, numFmt: "0%" } })
        return
      }
      const pct = col.max && col.max > 0 ? Math.min(100, (num / col.max) * 100) : null
      const tone = pctTone(pct)
      put(r, ci, { v: num, s: { font: { size: 10, bold: !!col.strong, color: pct === null ? NAVY : tone.color }, fill: tone.fill ?? zebra, h: "center", border } })
    })
  })

  const r = firstData + students.length
  if (students.length === 0) {
    fullRow(r, { v: t("natijalarOq.noResults"), s: { font: { italic: true, color: MUTED }, h: "center", border: { color: GRID } } }, 24)
  } else {
    // Guruh o'rtachasi
    heights[r] = 20
    const avgBorder = { color: "#B7C7E2", top: true, bottom: true, left: true, right: true }
    cols.forEach((col, ci) => {
      const st: XStyle = { font: { bold: true, size: 10, color: NAVY }, fill: "#E8F0FE", h: "center", border: { ...avgBorder, style: "thin" } }
      if (col.kind === "name") { put(r, ci, { v: t("natijalarOq.xlsx.average"), s: { ...st, h: "left", indent: 1 } }); return }
      if (col.kind === "index" || col.kind === "id") { put(r, ci, { v: null, s: st }); return }
      const { sum, n } = sums[ci]
      if (!col.avg || n === 0) { put(r, ci, { v: "—", s: { ...st, font: { ...st.font, color: "#94A3B8" } } }); return }
      const avg = sum / n
      if (col.kind === "att") { put(r, ci, { v: Math.round(avg) / 100, s: { ...st, numFmt: "0%" } }); return }
      put(r, ci, { v: Math.round(avg * 10) / 10, s: { ...st, numFmt: "0.0" } })
    })
    if (hasIds) merges.push(`B${r}:C${r}`)
  }

  const journal: XSheet = {
    name: t("natijalarOq.xlsx.sheetJournal"),
    rows,
    merges,
    rowHeights: heights,
    colWidths: cols.map(col => col.width),
    freeze: { row: H2, col: hasIds ? 3 : 2 },
    printTitleRows: [H1, H2],
    landscape: true,
    footer: `SamISI LMS · ${inp.groupName} · ${inp.subjectName}`,
    showGridLines: false,
    // Ko'rish va nusxalash mumkin, ballarni o'zgartirib bo'lmaydi. Parol har
    // safar tasodifiy va hech qayerda saqlanmaydi (2026-11-06 so'rov).
    protect: { password: randomPassword() },
  }

  return [journal]
}

function safeFilePart(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, "_").slice(0, 60)
}

export function downloadJournalExcel(inp: JournalExcelInput): void {
  const sheets = buildJournalSheets(inp)
  downloadXlsx(
    { sheets, title: `${inp.t("natijalarOq.journalTitle")} — ${inp.groupName} — ${inp.subjectName}` },
    `jurnal_${safeFilePart(inp.groupName)}_${safeFilePart(inp.subjectName)}.xlsx`,
  )
}
