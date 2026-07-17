import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

/** Bir yoki bir nechta jadvalni Excel (.xlsx) fayliga eksport qiladi. */
export function exportToExcel(
  filename: string,
  sheets: { name: string; rows: Record<string, string | number>[] }[]
) {
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows)
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31))
  }
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`)
}

const BRAND_BLUE: [number, number, number] = [1, 41, 112]
const BRAND_ACCENT: [number, number, number] = [14, 88, 168]
const BRAND_CYAN: [number, number, number] = [28, 194, 220]

/** Umumiy, chiroyli qilib formatlangan PDF hujjat quradi (saqlash yoki yuborish uchun). */
function buildPdf(title: string, subtitle: string | undefined, columns: string[], rows: (string | number)[][]) {
  const doc = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait" })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Sarlavha paneli
  doc.setFillColor(...BRAND_BLUE)
  doc.rect(0, 0, pageWidth, 24, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(title, 14, 12)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  const generatedAt = new Date().toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
  doc.text(subtitle ? `${subtitle}  ·  ${generatedAt}` : `SamISI LMS  ·  ${generatedAt}`, 14, 19)
  doc.setTextColor(0, 0, 0)

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 30,
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 3, textColor: [30, 41, 59] },
    headStyles: { fillColor: BRAND_ACCENT, textColor: [255, 255, 255], fontStyle: "bold", halign: "left" },
    alternateRowStyles: { fillColor: [240, 245, 255] },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages()
      const pageHeight = doc.internal.pageSize.getHeight()
      doc.setFontSize(8)
      doc.setTextColor(...BRAND_CYAN)
      doc.text(`SamISI LMS — ${pageCount}`, 14, pageHeight - 8)
    },
  })

  return doc
}

/** Bitta jadvalni sarlavha bilan PDF fayliga eksport qiladi (yuklab olish). */
export function exportToPdf(
  filename: string,
  title: string,
  columns: string[],
  rows: (string | number)[][],
  subtitle?: string
) {
  const doc = buildPdf(title, subtitle, columns, rows)
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`)
}

/** Xuddi shu PDF'ni fayl sifatida saqlamasdan, base64 matn ko'rinishida qaytaradi
 *  (masalan Telegramga yuborish uchun). */
export function buildPdfBase64(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  subtitle?: string
): string {
  const doc = buildPdf(title, subtitle, columns, rows)
  return doc.output("datauristring").split(",")[1] ?? ""
}
