"use client"

import { useMemo, useState } from "react"
import { Search, Plus, MoreHorizontal, Pencil, Trash2, FileText, Download, Eye, File, FileImage, FileCode } from "lucide-react"

type DocType = "pdf" | "word" | "excel" | "image" | "other"

type Document = {
  id: number
  title: string
  category: string
  type: DocType
  size: string
  author: string
  date: string
  downloads: number
}

const docs: Document[] = [
  { id: 1, title: "O'quv yili rejasi 2023-2024", category: "O'quv reja", type: "pdf", size: "2.4 MB", author: "Dekanat", date: "2024-01-10", downloads: 145 },
  { id: 2, title: "Talabalar nizomi", category: "Nizom", type: "word", size: "1.1 MB", author: "Rektorat", date: "2024-01-05", downloads: 89 },
  { id: 3, title: "To'lov shartnomalari namunasi", category: "Shartnoma", type: "word", size: "0.8 MB", author: "Moliya bo'limi", date: "2024-02-01", downloads: 212 },
  { id: 4, title: "Imtihon jadvali — May 2024", category: "Jadval", type: "excel", size: "0.5 MB", author: "O'quv bo'limi", date: "2024-04-15", downloads: 330 },
  { id: 5, title: "Davomat hisoboti Q1", category: "Hisobot", type: "excel", size: "1.8 MB", author: "Tarbiya bo'limi", date: "2024-04-01", downloads: 67 },
  { id: 6, title: "Universitetning fotogalereyasi", category: "Media", type: "image", size: "15.2 MB", author: "PR bo'limi", date: "2024-03-20", downloads: 45 },
  { id: 7, title: "LMS API hujjatlari", category: "Texnik", type: "other", size: "3.1 MB", author: "IT bo'limi", date: "2024-04-10", downloads: 28 },
]

const typeConfig: Record<DocType, { Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>, bg: string, color: string, label: string }> = {
  pdf:   { Icon: FileText,  bg: "#fff0f0", color: "#ef4444", label: "PDF" },
  word:  { Icon: File,      bg: "#f0f5ff", color: "#0e58a8", label: "Word" },
  excel: { Icon: FileCode,  bg: "#f0fff4", color: "#22c55e", label: "Excel" },
  image: { Icon: FileImage, bg: "#fff8e6", color: "#f59e0b", label: "Rasm" },
  other: { Icon: FileText,  bg: "#f6f9ff", color: "#7293b9", label: "Boshqa" },
}

const categories = ["Barchasi", "O'quv reja", "Nizom", "Shartnoma", "Jadval", "Hisobot", "Media", "Texnik"]

export default function DocumentationPage() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("Barchasi")
  const [openId, setOpenId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return docs.filter((d) => {
      const matchCat = category === "Barchasi" || d.category === category
      const matchSearch = !q || [d.title, d.author, d.category].join(" ").toLowerCase().includes(q)
      return matchCat && matchSearch
    })
  }, [search, category])

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      <header className="flex flex-col gap-[15px] pt-[25px] pb-5 px-5 bg-white" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h1 className="font-medium text-[28px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Hujjatlar</h1>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 px-[30px] pt-[30px]">
        {[
          { label: "Jami hujjatlar", value: docs.length, color: "#012970" },
          { label: "Jami yuklamalar", value: docs.reduce((s, d) => s + d.downloads, 0), color: "#0e58a8" },
          { label: "Kategoriyalar", value: categories.length - 1, color: "#1cc2dc" },
          { label: "Bu oy qo'shildi", value: 3, color: "#22c55e" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="text-3xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
            <div className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="px-[30px] pt-5 pb-[30px]">
        <div className="bg-white rounded-[5px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
          <div className="flex items-center justify-between p-5 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-[22px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Barcha hujjatlar</h2>
              <div className="flex w-[33px] h-[33px] items-center justify-center rounded-full" style={{ backgroundColor: "rgba(114,147,185,0.2)" }}>
                <span className="font-semibold text-lg" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{docs.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <label className="w-[300px] px-2.5 py-2 rounded-[5px] border flex items-center" style={{ borderColor: "rgba(1,41,112,0.3)" }}>
                <Search className="w-5 h-5 shrink-0" style={{ color: "#7293b9" }} />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="flex-1 ml-2 bg-transparent outline-none text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
              </label>
              <button className="flex items-center gap-2 h-[42px] px-[15px] rounded-[5px] text-white text-sm" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Plus className="w-5 h-5" /> Hujjat yuklash
              </button>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto px-5 pb-4">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="px-3 py-1.5 rounded-full whitespace-nowrap text-xs font-medium transition-colors"
                style={{
                  backgroundColor: category === c ? "#0e58a8" : "#f6f9ff",
                  color: category === c ? "#fff" : "#7293b9",
                  fontFamily: "var(--font-poppins)",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto px-2.5 pb-4">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                  {["#", "Hujjat nomi", "Kategoriya", "Tur", "Hajm", "Muallif", "Sana", "Yuklamalar", "Amal"].map((h) => (
                    <th key={h} className="px-4 py-[18px] text-left text-sm font-medium whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const tc = typeConfig[d.type]
                  const Icon = tc.Icon
                  return (
                    <tr key={d.id} className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                      <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{d.id}</td>
                      <td className="px-4 h-14">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0" style={{ backgroundColor: tc.bg }}>
                            <Icon className="w-4 h-4" style={{ color: tc.color }} />
                          </div>
                          <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{d.title}</span>
                        </div>
                      </td>
                      <td className="px-4 h-14">
                        <span className="px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: "#f6f9ff", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{d.category}</span>
                      </td>
                      <td className="px-4 h-14">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: tc.bg, color: tc.color }}>{tc.label}</span>
                      </td>
                      <td className="px-4 h-14 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{d.size}</td>
                      <td className="px-4 h-14 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{d.author}</td>
                      <td className="px-4 h-14 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{d.date}</td>
                      <td className="px-4 h-14">
                        <div className="flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
                          <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{d.downloads}</span>
                        </div>
                      </td>
                      <td className="px-4 h-14 relative">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff]">
                            <Eye className="w-4 h-4" style={{ color: "#0e58a8" }} />
                          </button>
                          <button className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff]">
                            <Download className="w-4 h-4" style={{ color: "#1cc2dc" }} />
                          </button>
                          <button onClick={() => setOpenId(openId === d.id ? null : d.id)} className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff]">
                            <MoreHorizontal className="w-4 h-4" style={{ color: "#012970" }} />
                          </button>
                        </div>
                        {openId === d.id && (
                          <div className="absolute right-4 top-[calc(100%-4px)] z-10 bg-white rounded-[5px] overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(1,41,112,0.15)", border: "1px solid rgba(1,41,112,0.1)", minWidth: 140 }}>
                            <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-[#f6f9ff]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} onClick={() => setOpenId(null)}><Pencil className="w-4 h-4" /> Tahrirlash</button>
                            <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-red-50" style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }} onClick={() => setOpenId(null)}><Trash2 className="w-4 h-4" /> O&apos;chirish</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
