"use client"

import { useState } from "react"
import { Plus, Trash2, Pin, Calendar, Tag } from "lucide-react"

type BoardPost = {
  id: number
  title: string
  body: string
  tag: string
  tagColor: string
  tagBg: string
  date: string
  pinned: boolean
  author: string
}

const initialPosts: BoardPost[] = [
  { id: 1, title: "Imtihon jadvali e'lon qilindi", body: "May oyida bo'ladigan yakuniy imtihonlar jadvali e'lon qilindi. Barcha talabalar shaxsiy kabineti orqali o'z jadvalini ko'rib chiqishlari so'raladi.", tag: "Muhim", tagColor: "#ef4444", tagBg: "#fff0f0", date: "2024-04-10", pinned: true, author: "O'quv bo'limi" },
  { id: 2, title: "Yangi seminarlar ro'yxati", body: "2024-yilning bahor semestri uchun qo'shimcha seminarlar rejalashtirildi. Matematika, Fizika va Ingliz tili fanlarida ixtiyoriy seminarlar bo'lib o'tadi.", tag: "E'lon", tagColor: "#0e58a8", tagBg: "#f0f5ff", date: "2024-04-08", pinned: false, author: "Dekanat" },
  { id: 3, title: "Stipendiya to'lovlari haqida", body: "Aprel oyiga mo'ljallangan stipendiya to'lovlari 15-apreldan boshlab amalga oshiriladi. To'lovlar bank kartangizga o'tkaziladi.", tag: "Moliya", tagColor: "#22c55e", tagBg: "#f0fff4", date: "2024-04-07", pinned: false, author: "Moliya bo'limi" },
  { id: 4, title: "Sport musobaqalari haqida", body: "Universitetlararo sport musobaqasi 20-aprelda bo'lib o'tadi. Qatnashish uchun dekanat ofisiga murojaat qiling.", tag: "Sport", tagColor: "#f59e0b", tagBg: "#fff8e6", date: "2024-04-05", pinned: false, author: "Tarbiya bo'limi" },
  { id: 5, title: "LMS tizimi yangilandi", body: "LMS tizimiga yangi imkoniyatlar qo'shildi: onlayn test o'tkazish, video darslar va resurslar bo'limi. Barcha funksiyalarni sinab ko'ring.", tag: "Texnik", tagColor: "#1cc2dc", tagBg: "#f0fbfd", date: "2024-04-03", pinned: true, author: "IT bo'limi" },
]

const tags = ["Muhim", "E'lon", "Moliya", "Sport", "Texnik", "Boshqa"]

export default function BoardPage() {
  const [posts, setPosts] = useState<BoardPost[]>(initialPosts)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newBody, setNewBody] = useState("")
  const [newTag, setNewTag] = useState("E'lon")

  const tagStyles: Record<string, { color: string; bg: string }> = {
    "Muhim":   { color: "#ef4444", bg: "#fff0f0" },
    "E'lon":   { color: "#0e58a8", bg: "#f0f5ff" },
    "Moliya":  { color: "#22c55e", bg: "#f0fff4" },
    "Sport":   { color: "#f59e0b", bg: "#fff8e6" },
    "Texnik":  { color: "#1cc2dc", bg: "#f0fbfd" },
    "Boshqa":  { color: "#7293b9", bg: "#f6f9ff" },
  }

  const addPost = () => {
    if (!newTitle.trim() || !newBody.trim()) return
    const ts = tagStyles[newTag] || tagStyles["Boshqa"]
    setPosts((prev) => [{
      id: Date.now(),
      title: newTitle,
      body: newBody,
      tag: newTag,
      tagColor: ts.color,
      tagBg: ts.bg,
      date: new Date().toISOString().slice(0, 10),
      pinned: false,
      author: "Admin",
    }, ...prev])
    setNewTitle(""); setNewBody(""); setNewTag("E'lon"); setShowForm(false)
  }

  const togglePin = (id: number) => setPosts((prev) => prev.map((p) => p.id === id ? { ...p, pinned: !p.pinned } : p))
  const deletePost = (id: number) => setPosts((prev) => prev.filter((p) => p.id !== id))

  const sorted = [...posts].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      <header className="flex items-center justify-between pt-[25px] pb-5 px-5 bg-white" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h1 className="font-medium text-[28px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Xabarlar taxtasi</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 h-[42px] px-[15px] rounded-[5px] text-white text-sm"
          style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}
        >
          <Plus className="w-5 h-5" /> E&apos;lon qo&apos;shish
        </button>
      </header>

      <div className="p-[30px] flex flex-col gap-5">
        {/* New post form */}
        {showForm && (
          <div className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.2)", boxShadow: "0px 0px 10px rgba(1,41,112,0.08)" }}>
            <h3 className="font-semibold text-base mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Yangi e&apos;lon</h3>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Sarlavha..."
                className="w-full px-3 py-2.5 rounded-[5px] text-sm outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }}
              />
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Matn..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-[5px] text-sm outline-none resize-none"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }}
              />
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 shrink-0" style={{ color: "#7293b9" }} />
                <select
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="px-3 py-2 rounded-[5px] text-sm outline-none"
                  style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }}
                >
                  {tags.map((t) => <option key={t}>{t}</option>)}
                </select>
                <div className="flex gap-2 ml-auto">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-[5px] text-sm" style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Bekor</button>
                  <button onClick={addPost} className="px-4 py-2 rounded-[5px] text-sm text-white" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>Saqlash</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-5">
          {[
            { label: "Jami e'lonlar", value: posts.length, color: "#012970" },
            { label: "Muhim (pin)", value: posts.filter((p) => p.pinned).length, color: "#f59e0b" },
            { label: "Bu oy", value: posts.filter((p) => p.date.startsWith("2024-04")).length, color: "#1cc2dc" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
              <div className="text-3xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
              <div className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Posts */}
        <div className="flex flex-col gap-4">
          {sorted.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-[10px] p-5"
              style={{
                border: `1px solid ${p.pinned ? "rgba(245,158,11,0.3)" : "rgba(1,41,112,0.1)"}`,
                boxShadow: p.pinned ? "0px 0px 10px rgba(245,158,11,0.1)" : "0px 0px 5px rgba(1,41,112,0.05)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {p.pinned && (
                    <div className="shrink-0 mt-0.5">
                      <Pin className="w-4 h-4" style={{ color: "#f59e0b" }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: p.tagBg, color: p.tagColor }}>{p.tag}</span>
                      <h3 className="font-semibold text-base" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{p.title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{p.body}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
                        <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{p.date}</span>
                      </div>
                      <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{p.author}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => togglePin(p.id)} className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff] transition-colors">
                    <Pin className="w-4 h-4" style={{ color: p.pinned ? "#f59e0b" : "#7293b9" }} />
                  </button>
                  <button onClick={() => deletePost(p.id)} className="p-1.5 rounded-[5px] hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
