/* Bezakli .xlsx yozuvchi — kutubxonasiz.
   SheetJS'ning bepul versiyasi katak uslublarini (rang, chegara, shrift)
   yozmaydi, shuning uchun jurnal eksporti uchun kichik OOXML yozuvchi:
   inline matnlar, uslublar jadvali, birlashtirilgan kataklar, muzlatilgan
   sarlavha, chop etish sozlamalari. Fayl ZIP (STORE, siqilmagan) ko'rinishida
   yig'iladi — Excel, LibreOffice, Google Sheets va telefon ko'ruvchilari ochadi. */

export interface XFont { bold?: boolean; italic?: boolean; size?: number; color?: string; name?: string }
export interface XBorder { color?: string; style?: "thin" | "medium" | "hair"; top?: boolean; bottom?: boolean; left?: boolean; right?: boolean; bottomStyle?: "thin" | "medium"; bottomColor?: string }
export interface XStyle {
  font?: XFont
  fill?: string
  border?: XBorder
  h?: "left" | "center" | "right"
  v?: "top" | "center" | "bottom"
  wrap?: boolean
  indent?: number
  numFmt?: string
}

export type XValue = string | number | null | undefined

/** Bir katak ichida turli shriftli bo'laklar (masalan "Guruh:" qalin + qiymat) */
export interface XRun { t: string; bold?: boolean; italic?: boolean; color?: string; size?: number }

export interface XCell { v: XValue; s?: XStyle; rich?: XRun[] }

export interface XSheet {
  name: string
  /** 1-qatordan boshlab, har bir qatorning kataklari (A ustundan) */
  rows: (XCell | null)[][]
  rowHeights?: Record<number, number>   // 1-asosli qator → balandlik (pt)
  colWidths?: number[]                  // belgi kengligida
  merges?: string[]                     // "A1:F1"
  freeze?: { row: number; col: number } // shu qator/ustundan oldingisi muzlaydi (0-asosli soni)
  printTitleRows?: [number, number]     // har sahifada takrorlanadigan qatorlar (1-asosli)
  landscape?: boolean
  footer?: string
  showGridLines?: boolean
  /** Varaq himoyasi: kataklarni belgilash va nusxalash mumkin, o'zgartirish —
      parolsiz yo'q. Ustun/qator kengligini o'zgartirish ruxsat (ballarga ta'sir qilmaydi). */
  protect?: { password: string }
}

/** Excel'ning varaq paroli xeshi (ECMA-376, sheetProtection@password; openpyxl
    hash_password bilan bir xil). Parol bu yerda saqlanmaydi — faqat xesh. */
export function legacyPasswordHash(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    let value = password.charCodeAt(i) << (i + 1)
    const rotated = value >> 15
    value &= 0x7fff
    hash ^= value | rotated
  }
  hash ^= password.length
  hash ^= 0xce4b
  return hash.toString(16).toUpperCase()
}

/** Tasodifiy parol — hech qayerda ko'rsatilmaydi, ya'ni himoyani hech kim ochmaydi */
export function randomPassword(length = 24): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => chars[b % chars.length]).join("")
}

export interface XWorkbook { sheets: XSheet[]; title?: string; creator?: string }

/* ── Yordamchilar ────────────────────────────────────────────────────── */

function esc(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export function colName(idx: number): string {
  let n = idx + 1, s = ""
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) }
  return s
}

function argb(hex: string): string {
  return "FF" + hex.replace("#", "").toUpperCase()
}

/** "B3:D5" → kataklar ro'yxati */
function parseRange(ref: string): { r1: number; c1: number; r2: number; c2: number } {
  const [a, b = a] = ref.split(":")
  const p = (x: string) => {
    const m = /^([A-Z]+)(\d+)$/.exec(x)!
    let c = 0
    for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64)
    return { c: c - 1, r: Number(m[2]) }
  }
  const s = p(a), e = p(b)
  return { r1: s.r, c1: s.c, r2: e.r, c2: e.c }
}

/* ── Uslublar jadvali ────────────────────────────────────────────────── */

class StyleTable {
  fonts: string[] = ['<font><sz val="10"/><color rgb="FF1E293B"/><name val="Calibri"/><family val="2"/></font>']
  fills: string[] = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>']
  borders: string[] = ["<border><left/><right/><top/><bottom/><diagonal/></border>"]
  numFmts: string[] = []
  xfs: string[] = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>']
  private xfIndex = new Map<string, number>()

  private add(list: string[], xml: string): number {
    const i = list.indexOf(xml)
    if (i >= 0) return i
    list.push(xml)
    return list.length - 1
  }

  id(s?: XStyle): number {
    if (!s) return 0
    const key = JSON.stringify(s)
    const cached = this.xfIndex.get(key)
    if (cached !== undefined) return cached

    const f = s.font ?? {}
    const fontXml = `<font>${f.bold ? "<b/>" : ""}${f.italic ? "<i/>" : ""}<sz val="${f.size ?? 10}"/><color rgb="${argb(f.color ?? "#1E293B")}"/><name val="${esc(f.name ?? "Calibri")}"/><family val="2"/></font>`
    const fontId = this.add(this.fonts, fontXml)

    const fillId = s.fill
      ? this.add(this.fills, `<fill><patternFill patternType="solid"><fgColor rgb="${argb(s.fill)}"/><bgColor indexed="64"/></patternFill></fill>`)
      : 0

    let borderId = 0
    if (s.border) {
      const b = s.border
      const st = b.style ?? "thin"
      const c = argb(b.color ?? "#C9D6EA")
      const side = (tag: string, on: boolean | undefined, style = st, color = c) =>
        on === false ? `<${tag}/>` : `<${tag} style="${style}"><color rgb="${color}"/></${tag}>`
      borderId = this.add(this.borders,
        `<border>${side("left", b.left)}${side("right", b.right)}${side("top", b.top)}${side("bottom", b.bottom, b.bottomStyle ?? st, b.bottomColor ? argb(b.bottomColor) : c)}<diagonal/></border>`)
    }

    let numFmtId = 0
    if (s.numFmt) {
      const builtIn: Record<string, number> = { "0": 1, "0.00": 2, "0%": 9 }
      if (builtIn[s.numFmt] !== undefined) numFmtId = builtIn[s.numFmt]
      else {
        let i = this.numFmts.indexOf(s.numFmt)
        if (i < 0) { this.numFmts.push(s.numFmt); i = this.numFmts.length - 1 }
        numFmtId = 164 + i
      }
    }

    const align = s.h || s.v || s.wrap || s.indent
      ? `<alignment${s.h ? ` horizontal="${s.h}"` : ""} vertical="${s.v ?? "center"}"${s.wrap ? ' wrapText="1"' : ""}${s.indent ? ` indent="${s.indent}"` : ""}/>`
      : ""
    const xf = `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"${numFmtId ? ' applyNumberFormat="1"' : ""} applyFont="1"${fillId ? ' applyFill="1"' : ""}${borderId ? ' applyBorder="1"' : ""}${align ? ' applyAlignment="1">' + align + "</xf>" : "/>"}`
    this.xfs.push(xf)
    const idx = this.xfs.length - 1
    this.xfIndex.set(key, idx)
    return idx
  }

  xml(): string {
    const nf = this.numFmts.length
      ? `<numFmts count="${this.numFmts.length}">${this.numFmts.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(f)}"/>`).join("")}</numFmts>`
      : ""
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${nf}<fonts count="${this.fonts.length}">${this.fonts.join("")}</fonts><fills count="${this.fills.length}">${this.fills.join("")}</fills><borders count="${this.borders.length}">${this.borders.join("")}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${this.xfs.length}">${this.xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
  }
}

/* ── Varaq XML ───────────────────────────────────────────────────────── */

function sheetXml(sh: XSheet, styles: StyleTable): string {
  // Birlashtirilgan oraliqdagi bo'sh kataklarga ham chap-yuqori katak uslubi —
  // aks holda chegara va fon faqat birinchi katakda chiqadi
  const rows = sh.rows.map(r => [...r])
  for (const m of sh.merges ?? []) {
    const { r1, c1, r2, c2 } = parseRange(m)
    const s = rows[r1 - 1]?.[c1]?.s
    for (let r = r1; r <= r2; r++) {
      rows[r - 1] = rows[r - 1] ?? []
      for (let c = c1; c <= c2; c++) {
        if (r === r1 && c === c1) continue
        rows[r - 1][c] = { v: null, s }
      }
    }
  }

  let maxCol = 0
  const body: string[] = []
  rows.forEach((row, ri) => {
    const r = ri + 1
    const cells: string[] = []
    row.forEach((cell, ci) => {
      if (!cell) return
      maxCol = Math.max(maxCol, ci + 1)
      const ref = `${colName(ci)}${r}`
      const s = styles.id(cell.s)
      const sAttr = s ? ` s="${s}"` : ""
      const v = cell.v
      if (cell.rich?.length) {
        const base = cell.s?.font ?? {}
        const runs = cell.rich.map(run => {
          const pr = `<rPr>${run.bold ?? base.bold ? "<b/>" : ""}${run.italic ?? base.italic ? "<i/>" : ""}<sz val="${run.size ?? base.size ?? 10}"/><color rgb="${argb(run.color ?? base.color ?? "#1E293B")}"/><rFont val="${esc(base.name ?? "Calibri")}"/><family val="2"/></rPr>`
          return `<r>${pr}<t xml:space="preserve">${esc(run.t)}</t></r>`
        }).join("")
        cells.push(`<c r="${ref}"${sAttr} t="inlineStr"><is>${runs}</is></c>`)
      }
      else if (v === null || v === undefined || v === "") cells.push(`<c r="${ref}"${sAttr}/>`)
      else if (typeof v === "number" && Number.isFinite(v)) cells.push(`<c r="${ref}"${sAttr}><v>${v}</v></c>`)
      else {
        const text = String(v)
        const space = /^\s|\s$|\n/.test(text) ? ' xml:space="preserve"' : ""
        cells.push(`<c r="${ref}"${sAttr} t="inlineStr"><is><t${space}>${esc(text)}</t></is></c>`)
      }
    })
    const ht = sh.rowHeights?.[r]
    body.push(`<row r="${r}"${ht ? ` ht="${ht}" customHeight="1"` : ""}>${cells.join("")}</row>`)
  })

  const lastRef = `${colName(Math.max(0, maxCol - 1))}${Math.max(1, rows.length)}`
  const fz = sh.freeze
  const pane = fz && (fz.row || fz.col)
    ? `<pane${fz.col ? ` xSplit="${fz.col}"` : ""}${fz.row ? ` ySplit="${fz.row}"` : ""} topLeftCell="${colName(fz.col)}${fz.row + 1}" activePane="${fz.row && fz.col ? "bottomRight" : fz.row ? "bottomLeft" : "topRight"}" state="frozen"/>`
    : ""
  const cols = sh.colWidths?.length
    ? `<cols>${sh.colWidths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`
    : ""
  const merges = sh.merges?.length
    ? `<mergeCells count="${sh.merges.length}">${sh.merges.map(m => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>`
    : ""
  // sheetProtection — sheetData'dan keyin, mergeCells'dan oldin (OOXML tartibi).
  // Qulflangan kataklarni belgilash ochiq qoladi (selectLockedCells=0) — nusxalash ishlaydi.
  const protection = sh.protect
    ? `<sheetProtection password="${legacyPasswordHash(sh.protect.password)}" sheet="1" objects="1" scenarios="1" formatColumns="0" formatRows="0" selectLockedCells="0" selectUnlockedCells="0"/>`
    : ""
  const footer = sh.footer
    ?`<headerFooter><oddFooter>${esc(`&L&8${sh.footer}&R&8&P / &N`)}</oddFooter></headerFooter>`
    : ""

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${lastRef}"/><sheetViews><sheetView workbookViewId="0"${sh.showGridLines === false ? ' showGridLines="0"' : ""} zoomScale="100">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${body.join("")}</sheetData>${protection}${merges}<printOptions horizontalCentered="1"/><pageMargins left="0.35" right="0.35" top="0.45" bottom="0.55" header="0.25" footer="0.25"/><pageSetup paperSize="9" orientation="${sh.landscape ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/>${footer}</worksheet>`
}

/* ── ZIP (STORE) ─────────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function zipStore(files: { name: string; data: string }[]): Uint8Array {
  const enc = new TextEncoder()
  const now = new Date()
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()

  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const name = enc.encode(f.name)
    const data = enc.encode(f.data)
    const crc = crc32(data)

    const lh = new DataView(new ArrayBuffer(30))
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true)
    lh.setUint16(8, 0, true); lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true)
    lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true)
    lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true)
    const local = new Uint8Array(30 + name.length + data.length)
    local.set(new Uint8Array(lh.buffer), 0); local.set(name, 30); local.set(data, 30 + name.length)
    locals.push(local)

    const ch = new DataView(new ArrayBuffer(46))
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true)
    ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, dosTime, true)
    ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true)
    ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true)
    ch.setUint32(42, offset, true)
    const central = new Uint8Array(46 + name.length)
    central.set(new Uint8Array(ch.buffer), 0); central.set(name, 46)
    centrals.push(central)

    offset += local.length
  }
  const cdSize = centrals.reduce((a, c) => a + c.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true); end.setUint16(10, files.length, true)
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true)

  const out = new Uint8Array(offset + cdSize + 22)
  let p = 0
  for (const l of locals) { out.set(l, p); p += l.length }
  for (const c of centrals) { out.set(c, p); p += c.length }
  out.set(new Uint8Array(end.buffer), p)
  return out
}

/* ── Kitob ───────────────────────────────────────────────────────────── */

function sheetRef(name: string): string {
  return `'${name.replace(/'/g, "''")}'`
}

/** Varaq nomi: Excel cheklovlari — 31 belgi, []:*?/\ taqiqlangan */
export function safeSheetName(name: string): string {
  return name.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Sheet"
}

export function buildXlsx(wb: XWorkbook): Uint8Array {
  const styles = new StyleTable()
  const sheets = wb.sheets.map(s => ({ ...s, name: safeSheetName(s.name) }))
  const sheetFiles = sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s, styles) }))

  const defined = sheets
    .map((s, i) => s.printTitleRows
      ? `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${esc(sheetRef(s.name))}!$${s.printTitleRows[0]}:$${s.printTitleRows[1]}</definedName>`
      : "")
    .join("")

  const iso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
  const files = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
    },
    {
      name: "docProps/core.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(wb.title ?? "")}</dc:title><dc:creator>${esc(wb.creator ?? "SamISI LMS")}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified></cp:coreProperties>`,
    },
    {
      name: "docProps/app.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>SamISI LMS</Application></Properties>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>${defined ? `<definedNames>${defined}</definedNames>` : ""}</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    ...sheetFiles,
    // styles.xml oxirida — varaqlar yozilganda yig'ilgan uslublar bilan
    { name: "xl/styles.xml", data: styles.xml() },
  ]
  return zipStore(files)
}

/** Brauzerda faylni yuklab berish */
export function downloadXlsx(wb: XWorkbook, filename: string): void {
  const bytes = buildXlsx(wb)
  const blob = new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
