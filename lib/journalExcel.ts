/* Talabalar ballari jurnali → bezakli Excel (.xlsx).
   Ko'rinishi sahifadagi jadvalga mos: bo'limlar ranglari (Ma'ruza sariq,
   Amaliyot yashil, Joriy, Yakuniy, Ball...), har bir ball foiziga qarab
   rangli, guruh o'rtachasi, ranglar izohi va imzo joyi. Ikkinchi varaqda —
   ustunlar izohi (ON1, MI-1, 3-mavzu... aslida qaysi nazorat/mavzu). */

import type { JournalData, JournalMiColumn, JournalScale, JournalStudent, JournalTopic } from "@/lib/api"
import { PASS_BALL, fmtBall, type JournalLayout } from "@/lib/gradeTotals"
import { colName, downloadXlsx, type XCell, type XSheet, type XStyle } from "@/lib/xlsxWriter"

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
  teacherName?: string
  topics: JournalTopic[]
  students: JournalStudent[]
  scale: JournalScale
  layout: JournalLayout
  periodItems?: JournalData["periodItems"]
  totals: (s: JournalStudent) => JournalRowTotals
  /** Ball taqsimoti bannerining ikki qatori (sahifadagi matn) */
  splitLines: string[]
}

/* ── Ranglar (sahifadagi jadval bilan bir xil) ───────────────────────── */
const NAVY = "#012970"
const ACCENT = "#0E58A8"
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

  /* ── Sarlavha bloki ── */
  fullRow(1, { v: t("natijalarOq.journalTitle").toUpperCase(), s: { font: { bold: true, size: 15, color: "#FFFFFF" }, fill: NAVY, h: "left", indent: 1 } }, 30)
  fullRow(2, { v: t("natijalarOq.xlsx.subtitle"), s: { font: { size: 10, color: "#DCE8FF" }, fill: ACCENT, h: "left", indent: 1 } }, 18)
  heights[3] = 8

  // Ma'lumot qatorlari: chap yarmi va o'ng yarmi
  const split = Math.max(2, Math.ceil(cols.length / 2))
  const infoStyle: XStyle = { font: { size: 10, color: NAVY }, h: "left", indent: 1, fill: "#F6F9FF", border: { color: "#E2EAF6" } }
  const now = new Date()
  const dateText = now.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " +
    now.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
  const passed = students.filter(s => (totals(s).ball ?? 0) >= PASS_BALL).length
  const info: [string, string][][] = [
    [[t("natijalarOq.group"), inp.groupName], [t("natijalarOq.xlsx.exportedAt"), dateText]],
    [[t("natijalarOq.subject"), inp.subjectName], [t("natijalarOq.xlsx.teacher"), inp.teacherName || "—"]],
    [[t("natijalarOq.totalStudents"), String(students.length)], [t("natijalarOq.xlsx.passedShort", { n: PASS_BALL }), `${passed} / ${students.length}`]],
  ]
  info.forEach((pair, i) => {
    const r = 4 + i
    heights[r] = 18
    const [left, right] = pair
    put(r, 0, { v: null, s: infoStyle, rich: [{ t: `${left[0]}:  `, bold: true, color: MUTED }, { t: left[1], bold: true }] })
    merges.push(`A${r}:${colName(split - 1)}${r}`)
    if (split <= last) {
      put(r, split, { v: null, s: infoStyle, rich: [{ t: `${right[0]}:  `, bold: true, color: MUTED }, { t: right[1], bold: true }] })
      if (split < last) merges.push(`${colName(split)}${r}:${lastCol}${r}`)
    }
  })

  // Ball taqsimoti (sahifadagi ko'k banner)
  const splitRow = 8
  fullRow(splitRow, {
    v: inp.splitLines.map(l => `•  ${l}`).join("\n"),
    s: { font: { size: 9, color: NAVY }, fill: "#F0F7FF", h: "left", v: "center", wrap: true, indent: 1, border: { color: "#CFE0F5" } },
  }, 16 * Math.max(1, inp.splitLines.length) + 6)
  heights[9] = 8

  /* ── Jadval sarlavhasi: 10 — bo'limlar, 11 — ustunlar ── */
  const H1 = 10, H2 = 11
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
  const bahoCount: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0 }
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
        bahoCount[num] = (bahoCount[num] ?? 0) + 1
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

  let r = firstData + students.length
  if (students.length === 0) {
    fullRow(r, { v: t("natijalarOq.noResults"), s: { font: { italic: true, color: MUTED }, h: "center", border: { color: GRID } } }, 24)
    r++
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
    r++
  }

  /* ── Qisqacha, ranglar izohi, imzo ── */
  r++
  const noteStyle: XStyle = { font: { size: 9, color: "#445B7A" }, h: "left", indent: 1 }
  const nameSpan = hasIds ? 2 : 1   // B (va C) — legend matni shu yerda
  const graded = Object.values(bahoCount).reduce((a, b) => a + b, 0)
  if (graded > 0) {
    put(r, 1, { v: null, s: noteStyle, rich: [
      { t: `${t("natijalarOq.colBaho")}:  `, bold: true, color: NAVY },
      { t: "«5» ", bold: true, color: BAHO_TONE[5].color }, { t: `— ${bahoCount[5]}    ` },
      { t: "«4» ", bold: true, color: BAHO_TONE[4].color }, { t: `— ${bahoCount[4]}    ` },
      { t: "«3» ", bold: true, color: BAHO_TONE[3].color }, { t: `— ${bahoCount[3]}    ` },
      { t: "«2» ", bold: true, color: BAHO_TONE[2].color }, { t: `— ${bahoCount[2]}` },
    ] })
    merges.push(`B${r}:${colName(Math.min(last, nameSpan + 6))}${r}`)
    heights[r] = 18
    r++
  }

  // Ranglar izohi: rangli namunaviy katak + matn
  put(r, 1, { v: t("natijalarOq.xlsx.legendTitle"), s: { font: { bold: true, size: 9, color: NAVY }, h: "left", indent: 1 } })
  heights[r] = 16
  r++
  const legend: { label: string; tone: { color: string; fill?: string } }[] = [
    { label: "86–100%", tone: pctTone(90) },
    { label: "71–85%", tone: pctTone(75) },
    { label: "56–70%", tone: pctTone(60) },
    { label: t("natijalarOq.xlsx.legendLow"), tone: pctTone(10) },
  ]
  legend.forEach(l => {
    put(r, 1, { v: l.label, s: { font: { bold: true, size: 9, color: l.tone.color }, fill: l.tone.fill, h: "center", border: { color: GRID } } })
    heights[r] = 15
    r++
  })
  put(r, 1, { v: `—  ${t("natijalarOq.xlsx.legendEmpty")}`, s: { font: { size: 9, color: MUTED }, h: "left", indent: 1 } })
  r += 3

  // Imzo
  heights[r] = 22
  put(r, 1, { v: null, s: { font: { size: 10, color: NAVY }, h: "left", indent: 1, v: "bottom" }, rich: [
    { t: `${t("natijalarOq.xlsx.teacher")}:  `, bold: true },
    { t: inp.teacherName ? `${inp.teacherName}` : "________________________________" },
  ] })
  const signCol = Math.min(last, Math.max(nameSpan + 2, split))
  put(r, signCol, { v: `${t("natijalarOq.xlsx.signature")}:  ____________________`, s: { font: { size: 10, bold: true, color: NAVY }, h: "left", v: "bottom" } })
  if (signCol + 4 <= last) merges.push(`${colName(signCol)}${r}:${colName(signCol + 4)}${r}`)

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
  }

  return [journal, columnsSheet(inp)]
}

/* ── 2-varaq: ustunlar izohi ─────────────────────────────────────────── */
function columnsSheet(inp: JournalExcelInput): XSheet {
  const { t, topics, scale, layout, periodItems } = inp
  const rows: (XCell | null)[][] = []
  const merges: string[] = []
  const heights: Record<number, number> = {}
  const head: XStyle = { font: { bold: true, size: 10, color: NAVY }, fill: "#E8F0FE", h: "center", border: { color: "#B7C7E2", bottomStyle: "medium", bottomColor: NAVY } }

  rows.push([{ v: t("natijalarOq.xlsx.sheetColumns").toUpperCase(), s: { font: { bold: true, size: 13, color: "#FFFFFF" }, fill: NAVY, h: "left", indent: 1 } }])
  merges.push("A1:D1"); heights[1] = 26
  rows.push([{ v: `${inp.groupName} · ${inp.subjectName}`, s: { font: { size: 10, color: "#DCE8FF" }, fill: ACCENT, h: "left", indent: 1 } }])
  merges.push("A2:D2"); heights[2] = 18
  rows.push([])
  rows.push([
    { v: t("natijalarOq.xlsx.colCode"), s: head },
    { v: t("natijalarOq.xlsx.colName"), s: { ...head, h: "left", indent: 1 } },
    { v: t("natijalarOq.xlsx.colPart"), s: head },
    { v: t("natijalarOq.xlsx.colMax"), s: head },
  ])
  heights[4] = 22

  const lecture = t("natijalarOq.xlsx.partLecture")
  const practice = t("natijalarOq.xlsx.partPractice")
  const items: { code: string; name: string; part: string; max: number; group: GroupKey }[] = [
    { code: "ON1", name: periodItems?.ON1?.title ?? t("natijalarOq.xlsx.notCreated"), part: lecture, max: scale.on1, group: "lecture" },
    { code: "ON2", name: periodItems?.ON2?.title ?? t("natijalarOq.xlsx.notCreated"), part: lecture, max: scale.on2, group: "lecture" },
    ...layout.lectureMi.map(c => ({ code: c.label, name: c.title, part: lecture, max: c.points, group: "lecture" as const })),
    ...topics.map(tp => ({ code: t("natijalarOq.topicN", { n: tp.idx }), name: tp.title, part: practice, max: tp.points ?? (tp.maxScore || 100), group: "topics" as const })),
    { code: "JN", name: t("natijalarOq.xlsx.jnName"), part: practice, max: scale.jn, group: "practice" },
    ...layout.practiceMi.map(c => ({ code: c.label, name: c.title, part: practice, max: c.points, group: "practice" as const })),
    { code: "YN", name: periodItems?.YN?.title ?? t("natijalarOq.xlsx.notCreated"), part: t("natijalarOq.xlsx.partFinal"), max: scale.yn, group: "yn" },
  ]
  items.forEach((it, i) => {
    const fill = i % 2 ? ZEBRA : "#FFFFFF"
    const b = { color: GRID }
    rows.push([
      { v: it.code, s: { font: { bold: true, size: 10, color: NAVY }, fill: GROUP_FILL[it.group].sub, h: "center", border: b } },
      { v: it.name, s: { font: { size: 10, color: "#1E293B" }, fill, h: "left", indent: 1, wrap: true, border: b } },
      { v: it.part, s: { font: { size: 9, color: "#445B7A" }, fill, h: "center", border: b } },
      { v: round2(it.max), s: { font: { bold: true, size: 10, color: NAVY }, fill, h: "center", border: b } },
    ])
  })

  return {
    name: t("natijalarOq.xlsx.sheetColumns"),
    rows,
    merges,
    rowHeights: heights,
    colWidths: [12, 70, 14, 12],
    freeze: { row: 4, col: 0 },
    printTitleRows: [4, 4],
    landscape: false,
    footer: `SamISI LMS · ${inp.groupName} · ${inp.subjectName}`,
    showGridLines: false,
  }
}

function safeFilePart(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, "_").slice(0, 60)
}

export function downloadJournalExcel(inp: JournalExcelInput): void {
  const sheets = buildJournalSheets(inp)
  downloadXlsx(
    { sheets, title: `${inp.t("natijalarOq.journalTitle")} — ${inp.groupName} — ${inp.subjectName}`, creator: inp.teacherName || "SamISI LMS" },
    `jurnal_${safeFilePart(inp.groupName)}_${safeFilePart(inp.subjectName)}.xlsx`,
  )
}
