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

/** Bitta jadvalni sarlavha bilan PDF fayliga eksport qiladi. */
export function exportToPdf(
  filename: string,
  title: string,
  columns: string[],
  rows: (string | number)[][]
) {
  const doc = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait" })
  doc.setFontSize(14)
  doc.text(title, 14, 15)
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 20,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [14, 88, 168] },
  })
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`)
}
