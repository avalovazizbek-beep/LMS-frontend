"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Pin, Calendar, Tag } from "lucide-react"
import { boardApi, BoardPost } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const tags = ["Muhim", "E'lon", "Moliya", "Sport", "Texnik", "Boshqa"]
const tagStyles: Record<string, { color: string; bg: string }> = {
  "Muhim":  { color: "#ef4444", bg: "#fff0f0" },
  "E'lon":  { color: "#0e58a8", bg: "#f0f5ff" },
  "Moliya": { color: "#22c55e", bg: "#f0fff4" },
  "Sport":  { color: "#f59e0b", bg: "#fff8e6" },
  "Texnik": { color: "#1cc2dc", bg: "#f0fbfd" },
  "Boshqa": { color: "#7293b9", bg: "#f6f9ff" },
}

export default function BoardPage() {
  const { data, loading, error, refetch } = useApi(() => boardApi.getAll())
  const posts: BoardPost[] = data?.data ?? []
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newBody, setNewBody]   = useState("")
  const [newTag, setNewTag]     = useState("E'lon")

  const addPost = async () => {
    if (!newTitle.trim() || !newBody.trim()) return
    await boardApi.create({ title: newTitle, body: newBody, tag: newTag, author: "Admin" })
    setNewTitle(""); setNewBody(""); setNewTag("E'lon"); setShowForm(false)
    refetch()
  }
  const togglePin   = async (id: string) => { await boardApi.pin(id); refetch() }
  const deletePost  = async (id: string) => { await boardApi.remove(id); refetch() }

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      <header className="flex items-center justify-between pt-[25px] pb-5 px-5 bg-white" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h1 className="font-medium text-[28px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Xabarlar taxtasi</h1>
        <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-2 h-[42px] px-[15px] rounded-[5px] text-white text-sm" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <Plus className="w-5 h-5" /> E&apos;lon qo&apos;shish
        </button>
      </header>

      <div className="p-[30px] flex flex-col gap-5">
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -10, height: 0 }}
              className="bg-white rounded-[10px] p-5 overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.2)" }}>
              <h3 className="font-semibold text-base mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Yangi e&apos;lon</h3>
              <div className="flex flex-col gap-3">
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Sarlavha..."
                  className="w-full px-3 py-2.5 rounded-[5px] text-sm outline-none" style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
                <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="Matn..." rows={3}
                  className="w-full px-3 py-2.5 rounded-[5px] text-sm outline-none resize-none" style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4 shrink-0" style={{ color: "#7293b9" }} />
                  <select value={newTag} onChange={(e) => setNewTag(e.target.value)} className="px-3 py-2 rounded-[5px] text-sm outline-none" style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    {tags.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <div className="flex gap-2 ml-auto">
                    <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-[5px] text-sm" style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Bekor</button>
                    <button onClick={addPost} className="px-4 py-2 rounded-[5px] text-sm text-white" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>Saqlash</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-5">
          {[
            { label: "Jami e'lonlar", value: posts.length,                              color: "#012970" },
            { label: "Muhim (pin)",   value: posts.filter((p) => p.pinned).length,       color: "#f59e0b" },
            { label: "Bu oy",         value: posts.filter((p) => p.date.startsWith("2024-04")).length, color: "#1cc2dc" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
              <div className="text-3xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
              <div className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {posts.map((p, i) => {
            const ts = tagStyles[p.tag] || tagStyles["Boshqa"]
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-[10px] p-5"
                style={{ border: `1px solid ${p.pinned ? "rgba(245,158,11,0.3)" : "rgba(1,41,112,0.1)"}`, boxShadow: p.pinned ? "0px 0px 10px rgba(245,158,11,0.1)" : "0px 0px 5px rgba(1,41,112,0.05)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {p.pinned && <Pin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: ts.bg, color: ts.color }}>{p.tag}</span>
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
                    <button onClick={() => togglePin(p.id)} className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff]">
                      <Pin className="w-4 h-4" style={{ color: p.pinned ? "#f59e0b" : "#7293b9" }} />
                    </button>
                    <button onClick={() => deletePost(p.id)} className="p-1.5 rounded-[5px] hover:bg-red-50">
                      <Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </section>
  )
}
