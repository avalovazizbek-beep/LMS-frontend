import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { downloadXlsx, type XCell, type XSheet, type XStyle } from "@/lib/xlsxWriter"
import type { SurveyExport, SurveyResults, SurveyBreakdownRow } from "@/lib/api"
import { fmtDateTime, ROLE_LABEL, STATE_LABEL, QUESTION_TYPE_LABEL, percent, safeFileName } from "@/components/surveys/surveyUi"

/* So'rovnoma natijalarini Excel (.xlsx, bezakli) va PDF'ga eksport.
   Ma'lumot backend'dan tayyor keladi (anonim so'rovnomada ismsiz,
   kichik kesimlar yashirilgan) — bu yerda faqat formatlanadi. */

const HEAD: XStyle = { font: { bold: true, color: "FFFFFF" }, fill: "0E58A8", border: { color: "C9D6EA" }, v: "center", wrap: true }
const CELL: XStyle = { border: { color: "DCE4F2" }, v: "top", wrap: true }
const NUM: XStyle = { ...CELL, h: "right" }
const TITLE: XStyle = { font: { bold: true, size: 14, color: "012970" } }
const SUB: XStyle = { font: { bold: true, color: "012970" }, fill: "EEF3FB", border: { color: "DCE4F2" } }
const LABEL: XStyle = { font: { bold: true }, border: { color: "DCE4F2" } }

const c = (v: string | number | null | undefined, s: XStyle = CELL): XCell => ({ v: v ?? "", s })

function breakdownRows(title: string, rows: SurveyBreakdownRow[]): (XCell | null)[][] {
  if (!rows.length) return []
  return [
    [c(title, SUB), c("", SUB), c("", SUB), c("", SUB), c("", SUB)],
    [c("Nomi", HEAD), c("Maqsadli", HEAD), c("Javob berdi", HEAD), c("Javob bermadi", HEAD), c("Foiz", HEAD)],
    ...rows.map((r) => [c(r.key), c(r.total, NUM), c(r.completed, NUM), c(r.total - r.completed, NUM), c(`${percent(r.completed, r.total)}%`, NUM)]),
    [],
  ]
}

export function exportSurveyExcel(results: SurveyResults, data: SurveyExport) {
  const s = data.survey
  const p = results.participation
  const anonymous = s.isAnonymous

  const summary: XSheet = {
    name: "Umumiy",
    colWidths: [30, 60],
    rows: [
      [c(s.title, TITLE)],
      [],
      [c("Turi", LABEL), c(s.surveyTypeLabel)],
      [c("Holati", LABEL), c(STATE_LABEL[s.state])],
      [c("Javoblar", LABEL), c(anonymous ? "Anonim (javoblar ismsiz saqlanadi)" : "Ochiq (ismli)")],
      [c("Boshlanish", LABEL), c(fmtDateTime(s.startAt))],
      [c("Tugash", LABEL), c(fmtDateTime(s.endAt))],
      [c("Yaratgan", LABEL), c(`${s.createdByName ?? "—"} (${s.createdByRole === "dean" ? "dekanat" : "admin"})`)],
      ...(s.description ? [[c("Tavsif", LABEL), c(s.description)]] : []),
      [],
      [c("Jami maqsadli ishtirokchilar", LABEL), c(p.total, NUM)],
      [c("Javob berganlar", LABEL), c(p.completed, NUM)],
      [c("Javob bermaganlar", LABEL), c(p.pending, NUM)],
      [c("Ishtirok foizi", LABEL), c(`${p.rate}%`, NUM)],
      ...p.byRole.map((r) => [c(`${ROLE_LABEL[r.key] ?? r.key}lar`, LABEL), c(`${r.completed} / ${r.total} (${percent(r.completed, r.total)}%)`, NUM)]),
      [],
      [c(`Eksport: ${fmtDateTime(new Date().toISOString())} · SamISI LMS`, { font: { italic: true, color: "7293B9" } })],
    ],
  }

  const qRows: (XCell | null)[][] = []
  results.answers.questions.forEach((q, i) => {
    qRows.push([c(`${i + 1}. ${q.text}`, SUB), c(QUESTION_TYPE_LABEL[q.type], SUB), c(`Javob: ${q.answered}`, SUB)])
    if (q.options) {
      qRows.push([c("Variant", HEAD), c("Soni", HEAD), c("Foiz", HEAD)])
      for (const o of q.options) qRows.push([c(o.text), c(o.count, NUM), c(`${o.percent}%`, NUM)])
      if (q.otherCount) qRows.push([c("Boshqa (o'zi yozgan)"), c(q.otherCount, NUM), c(`${percent(q.otherCount, q.answered)}%`, NUM)])
    } else if (q.distribution) {
      qRows.push([c(q.type === "yesno" ? "Javob" : "Ball", HEAD), c("Soni", HEAD), c("Foiz", HEAD)])
      for (const d of q.distribution) qRows.push([c(q.type === "yesno" ? (d.value === 1 ? "Ha" : "Yo'q") : d.value, q.type === "yesno" ? CELL : NUM), c(d.count, NUM), c(`${d.percent}%`, NUM)])
      if (q.average != null) qRows.push([c("O'rtacha ball", LABEL), c(q.average, NUM), c("")])
    } else {
      qRows.push([c("Yozma javoblar soni", LABEL), c(q.textTotal ?? 0, NUM), c("«Javoblar» varag'ida", CELL)])
    }
    qRows.push([])
  })
  const questionSheet: XSheet = { name: "Savollar natijasi", colWidths: [70, 22, 16], rows: qRows }

  const extraHead = anonymous ? ["Fakultet", "Kurs"] : ["F.I.Sh", "Fakultet", "Kurs", "Yo'nalish", "Guruh / Kafedra", "Yuborilgan"]
  const answersSheet: XSheet = {
    name: "Javoblar",
    freeze: { row: 1, col: 0 },
    colWidths: [6, 12, ...extraHead.map((h) => (h === "F.I.Sh" ? 32 : 20)), ...data.questions.map(() => 28)],
    rows: [
      [c("№", HEAD), c("Rol", HEAD), ...extraHead.map((h) => c(h, HEAD)), ...data.questions.map((q, i) => c(`${i + 1}. ${q.text}`, HEAD))],
      ...data.responses.map((r) => [
        c(r.index, NUM),
        c(ROLE_LABEL[r.role] ?? r.role),
        ...(anonymous
          ? [c(r.faculty ?? "—"), c(r.course ?? "—")]
          : [c(r.fullName ?? ""), c(r.faculty ?? ""), c(r.course ?? ""), c(r.specialty ?? ""), c(r.groupName ?? r.department ?? ""), c(fmtDateTime(r.submittedAt))]),
        ...data.questions.map((q) => {
          const v = r.answers[String(q.id)]
          return c(v === undefined ? "" : v, typeof v === "number" ? NUM : CELL)
        }),
      ]),
    ],
  }

  const breakdownSheet: XSheet = {
    name: "Ishtirok kesimi",
    colWidths: [40, 12, 14, 16, 10],
    rows: [
      ...breakdownRows("Fakultetlar (talabalar)", p.byFaculty),
      ...breakdownRows("Yo'nalishlar", p.bySpecialty),
      ...breakdownRows("Kurslar", p.byCourse),
      ...breakdownRows("Guruhlar", p.byGroup),
      ...breakdownRows("Kafedralar (o'qituvchilar)", p.byDepartment),
    ],
  }

  const participantsSheet: XSheet = {
    name: "Ishtirokchilar",
    freeze: { row: 1, col: 0 },
    colWidths: [6, 34, 16, 12, 28, 10, 22, 16, 18],
    rows: [
      ["№", "F.I.Sh", "ID raqam", "Rol", "Fakultet", "Kurs", "Guruh / Kafedra", "Holat", "Javob vaqti"].map((h) => c(h, HEAD)),
      ...data.participants.map((pt, i) => [
        c(i + 1, NUM), c(pt.fullName), c(pt.idNumber ?? ""), c(ROLE_LABEL[pt.role] ?? pt.role), c(pt.faculty ?? ""),
        c(pt.course ?? ""), c(pt.groupName ?? pt.department ?? ""),
        c(pt.status === "completed" ? "Javob berdi" : "Javob bermadi", { ...CELL, font: { color: pt.status === "completed" ? "15803D" : "B91C1C" } }),
        c(pt.status === "completed" ? fmtDateTime(pt.completedAt) : ""),
      ]),
    ],
  }

  downloadXlsx(
    { title: s.title, sheets: [summary, questionSheet, answersSheet, breakdownSheet, participantsSheet] },
    `${safeFileName(s.title)} - natijalar.xlsx`
  )
}

/* ── PDF ─────────────────────────────────────────────────────────────── */

/** jsPDF'ning standart shrifti faqat Latin-1: o'zbekcha tutuq belgilari
    (ʻ ʼ ‘ ’) va boshqa belgilar oddiy apostrofga keltiriladi */
function pdfText(v: unknown): string {
  return String(v ?? "")
    .replace(/[ʻʼ‘’`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\n -ÿ]/g, "?")
}

const BLUE: [number, number, number] = [1, 41, 112]
const ACCENT: [number, number, number] = [14, 88, 168]

export function exportSurveyPdf(results: SurveyResults) {
  const s = results.survey
  const p = results.participation
  const doc = new jsPDF({ orientation: "portrait" })
  const width = doc.internal.pageSize.getWidth()

  doc.setFillColor(...BLUE)
  doc.rect(0, 0, width, 30, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(15)
  doc.text(doc.splitTextToSize(pdfText(s.title), width - 28).slice(0, 2), 14, 12)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(pdfText(`${s.surveyTypeLabel} · ${s.isAnonymous ? "Anonim" : "Ochiq"} · ${fmtDateTime(s.startAt)} - ${fmtDateTime(s.endAt)} · ${STATE_LABEL[s.state]}`), 14, 25)
  doc.setTextColor(0, 0, 0)

  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 36
  const head = { fillColor: ACCENT, textColor: [255, 255, 255] as [number, number, number], fontStyle: "bold" as const }

  autoTable(doc, {
    startY: 36,
    head: [["Ko'rsatkich", "Qiymat"].map(pdfText)],
    body: [
      ["Jami maqsadli ishtirokchilar", p.total],
      ["Javob berganlar", p.completed],
      ["Javob bermaganlar", p.pending],
      ["Ishtirok foizi", `${p.rate}%`],
      ...p.byRole.map((r) => [`${ROLE_LABEL[r.key] ?? r.key}lar`, `${r.completed} / ${r.total} (${percent(r.completed, r.total)}%)`]),
    ].map((row) => row.map(pdfText)),
    theme: "grid",
    headStyles: head,
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" } },
  })

  const segment = results.answers.segment
  const segText = Object.entries(segment).filter(([, v]) => v).map(([, v]) => v).join(", ")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text(pdfText(`Savollar bo'yicha natijalar${segText ? ` (${segText})` : ""}`), 14, lastY() + 10)

  if (results.answers.suppressed) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(pdfText(`Tanlangan kesimda ${results.answers.minGroup} tadan kam javob bor — anonimlik uchun ko'rsatilmaydi.`), 14, lastY() + 17)
  }

  let y = lastY() + 14
  results.answers.questions.forEach((q, i) => {
    let body: string[][] = []
    let cols = ["Variant", "Soni", "Foiz"]
    if (q.options) {
      body = q.options.map((o) => [o.text, String(o.count), `${o.percent}%`])
      if (q.otherCount) body.push(["Boshqa (o'zi yozgan)", String(q.otherCount), `${percent(q.otherCount, q.answered)}%`])
    } else if (q.distribution) {
      cols = [q.type === "yesno" ? "Javob" : "Ball", "Soni", "Foiz"]
      body = q.distribution.map((d) => [q.type === "yesno" ? (d.value === 1 ? "Ha" : "Yo'q") : String(d.value), String(d.count), `${d.percent}%`])
      if (q.average != null) body.push(["O'rtacha ball", String(q.average), ""])
    } else {
      cols = ["Yozma javoblar", "Soni", ""]
      body = [["Ochiq matnli javoblar (to'liq ro'yxat — Excel'da)", String(q.textTotal ?? 0), ""]]
      for (const t of (q.texts ?? []).slice(0, 15)) body.push([t.length > 300 ? `${t.slice(0, 300)}...` : t, "", ""])
    }
    autoTable(doc, {
      startY: y,
      head: [[{ content: pdfText(`${i + 1}. ${q.text}`), colSpan: 3 }]],
      body: [cols.map(pdfText), ...body.map((r) => r.map(pdfText))],
      theme: "grid",
      headStyles: { ...head, fillColor: BLUE },
      styles: { fontSize: 8.5, cellPadding: 2.2 },
      columnStyles: { 0: { cellWidth: 120 }, 1: { halign: "right" }, 2: { halign: "right" } },
      didParseCell: (cell) => {
        if (cell.section === "body" && cell.row.index === 0) { cell.cell.styles.fontStyle = "bold"; cell.cell.styles.fillColor = [238, 243, 251] }
      },
    })
    y = lastY() + 6
  })

  const sections: [string, SurveyBreakdownRow[]][] = [
    ["Fakultetlar (talabalar)", p.byFaculty],
    ["Kurslar", p.byCourse],
    ["Yo'nalishlar", p.bySpecialty],
    ["Guruhlar", p.byGroup],
    ["Kafedralar (o'qituvchilar)", p.byDepartment],
  ]
  for (const [title, rows] of sections) {
    if (!rows.length) continue
    autoTable(doc, {
      startY: lastY() + 8,
      head: [[title, "Maqsadli", "Javob berdi", "Foiz"].map(pdfText)],
      body: rows.map((r) => [r.key, String(r.total), String(r.completed), `${percent(r.completed, r.total)}%`].map(pdfText)),
      theme: "striped",
      headStyles: head,
      styles: { fontSize: 8.5 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    })
  }

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(114, 147, 185)
    doc.text(pdfText(`SamISI LMS · ${fmtDateTime(new Date().toISOString())} · ${i}/${pages}`), 14, doc.internal.pageSize.getHeight() - 8)
  }
  doc.save(`${safeFileName(s.title)} - natijalar.pdf`)
}
