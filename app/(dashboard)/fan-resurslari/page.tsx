"use client"

import { useState } from "react"
import { FileText, Video, Link2, Download, Search, BookOpen } from "lucide-react"

const subjects = ["Barchasi", "Matematika", "Fizika", "Informatika", "Ingliz tili", "Tarix"]

const resources = [
  { subject: "Matematika", title: "Differensial tenglamalar - Ma'ruza 1", type: "pdf", size: "2.4 MB", date: "2024-04-01", downloads: 45 },
  { subject: "Matematika", title: "Integrallash usullari - Amaliy", type: "pdf", size: "1.8 MB", date: "2024-04-03", downloads: 38 },
  { subject: "Fizika", title: "Elektromagnit to'lqinlar - Video", type: "video", size: "125 MB", date: "2024-03-28", downloads: 22 },
  { subject: "Fizika", title: "Optika qonunlari - Konspekt", type: "pdf", size: "980 KB", date: "2024-04-05", downloads: 31 },
  { subject: "Informatika", title: "Python dasturlash - Modul 3", type: "link", size: "—", date: "2024-04-02", downloads: 67 },
  { subject: "Informatika", title: "Ma'lumotlar tuzilmasi - Laboratoriya", type: "pdf", size: "3.1 MB", date: "2024-04-06", downloads: 29 },
  { subject: "Ingliz tili", title: "Business English - Unit 5", type: "pdf", size: "4.2 MB", date: "2024-03-25", downloads: 53 },
  { subject: "Tarix", title: "O'rta Osiyo tarixi - Ma'ruza", type: "video", size: "89 MB", date: "2024-03-20", downloads: 18 },
]

const typeConfig: Record<string, { icon: React.ComponentType<{className?:string}>, bg: string, color: string }> = {
  pdf:   { icon: FileText, bg: "#fff0f0", color: "#ef4444" },
  video: { icon: Video,    bg: "#f0f5ff", color: "#0e58a8" },
  link:  { icon: Link2,    bg: "#f0fbfd", color: "#1cc2dc" },
}

export default function FanResurslari() {
  const [activeSubject, setActiveSubject] = useState("Barchasi")
  const [search, setSearch] = useState("")

  const filtered = resources.filter((r) => {
    const matchSubject = activeSubject === "Barchasi" || r.subject === activeSubject
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase())
    return matchSubject && matchSearch
  })

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Fan Resurslari</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>O&apos;quv materiallari va resurslar</p>
      </div>

      {/* Search */}
      <label className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-[5px] max-w-lg" style={{ border: "1px solid rgba(1,41,112,0.3)" }}>
        <Search className="w-5 h-5 shrink-0" style={{ color: "#7293b9" }} />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Resurs qidirish..."
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
        />
      </label>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {subjects.map((s) => (
          <button
            key={s}
            onClick={() => setActiveSubject(s)}
            className="px-4 py-2 rounded-[10px] whitespace-nowrap border transition-colors text-sm font-medium"
            style={{
              backgroundColor: activeSubject === s ? "#0e58a8" : "#fff",
              color: activeSubject === s ? "#fff" : "#7293b9",
              borderColor: activeSubject === s ? "rgba(1,41,112,0.3)" : "rgba(1,41,112,0.1)",
              fontFamily: "var(--font-poppins)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Resources grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-3 bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
            <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Resurs topilmadi</p>
          </div>
        ) : (
          filtered.map((r, i) => {
            const cfg = typeConfig[r.type]
            const Icon = cfg.icon
            return (
              <div key={i} className="bg-white rounded-[10px] p-4 flex flex-col gap-3" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg }}>
                    <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{r.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{r.subject}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  <span>{r.size} · {r.date}</span>
                  <span>{r.downloads} yuklab olindi</span>
                </div>
                <button className="flex items-center justify-center gap-2 w-full py-2 rounded-[5px] text-sm font-medium transition-opacity hover:opacity-90" style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                  <Download className="w-4 h-4" />
                  Yuklab olish
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
