"use client"

import { useMemo, useState } from "react"
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Calendar, Clock, BookOpen } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { examsApi, Exam } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { Modal, FInput, FSelect, ModalFooter } from "@/components/ui/Modal"

type ExamStatus = Exam["status"]

const statusConfig: Record<ExamStatus, { label: string; bg: string; color: string; border: string }> = {
  scheduled: { label: "Rejalashtirilgan", bg: "#f0f5ff", color: "#0e58a8", border: "#0e58a8" },
  ongoing:   { label: "Davom etmoqda",    bg: "#fff8e6", color: "#f59e0b", border: "#f59e0b" },
  completed: { label: "Yakunlandi",       bg: "#f0fbfd", color: "#1cc2dc", border: "#1cc2dc" },
  cancelled: { label: "Bekor qilindi",    bg: "#fff0f0", color: "#ef4444", border: "#ef4444" },
}

const typeColors: Record<string, { bg: string; color: string }> = {
  "Yozma":   { bg: "#f0f5ff", color: "#0e58a8" },
  "Og'zaki": { bg: "#fff8e6", color: "#f59e0b" },
  "Test":    { bg: "#f0fbfd", color: "#1cc2dc" },
}

const EMPTY = { subject: "", group: "", date: "", time: "", duration: "2 soat", room: "", teacher: "", type: "Yozma", status: "scheduled" }

export default function ExamsPage() {
  const { data, loading, error, refetch } = useApi(() => examsApi.getAll())
  const exams: Exam[] = data?.data ?? []
  const [search, setSearch]   = useState("")
  const [openId, setOpenId]   = useState<string | null>(null)
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState<Exam | null>(null)
  const [form, setForm]       = useState<typeof EMPTY>({ ...EMPTY })
  const [saving, setSaving]   = useState(false)
  const [formErr, setFormErr] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? exams.filter((e) => [e.subject, e.group, e.teacher, e.room].join(" ").toLowerCase().includes(q)) : exams
  }, [search, exams])

  const openAdd = () => { setForm({ ...EMPTY }); setEditing(null); setFormErr(""); setModal(true) }
  const openEdit = (e: Exam) => {
    setForm({ subject: e.subject, group: e.group, date: e.date, time: e.time, duration: e.duration, room: e.room, teacher: e.teacher, type: e.type, status: e.status })
    setEditing(e); setFormErr(""); setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.subject || !form.group || !form.date || !form.time || !form.room || !form.teacher) { setFormErr("Barcha majburiy maydonlarni to'ldiring"); return }
    setSaving(true); setFormErr("")
    try {
      const body: Partial<Exam> = { ...form, type: form.type as Exam["type"], status: form.status as ExamStatus }
      editing ? await examsApi.update(editing.id, body) : await examsApi.create(body)
      closeModal(); refetch()
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : "Xatolik")
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return
    try { await examsApi.remove(id); refetch() } catch {}
  }

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      <header className="flex flex-col gap-[15px] pt-[25px] pb-5 px-5 bg-white" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h1 className="font-medium text-[28px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Imtihonlar</h1>
      </header>

      <div className="grid grid-cols-4 gap-5 px-[30px] pt-[30px]">
        {[
          { label: "Jami imtihonlar",  value: exams.length,                                         color: "#012970" },
          { label: "Rejalashtirilgan", value: exams.filter((e) => e.status === "scheduled").length, color: "#0e58a8" },
          { label: "Yakunlandi",       value: exams.filter((e) => e.status === "completed").length, color: "#1cc2dc" },
          { label: "Davom etmoqda",    value: exams.filter((e) => e.status === "ongoing").length,   color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="text-3xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
            <div className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="px-[30px] pt-5 pb-[30px]">
        <div className="bg-white rounded-[5px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-[22px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Barcha imtihonlar</h2>
              <div className="flex w-[33px] h-[33px] items-center justify-center rounded-full" style={{ backgroundColor: "rgba(114,147,185,0.2)" }}>
                <span className="font-semibold text-lg" style={{ color: "#7293b9" }}>{exams.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <label className="w-[350px] px-2.5 py-2 rounded-[5px] border flex items-center" style={{ borderColor: "rgba(1,41,112,0.3)" }}>
                <Search className="w-5 h-5 shrink-0" style={{ color: "#7293b9" }} />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="flex-1 ml-2 bg-transparent outline-none text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
              </label>
              <button onClick={openAdd} className="flex items-center gap-2 h-[42px] px-[15px] rounded-[5px] text-white text-sm" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Plus className="w-5 h-5" /> Imtihon qo&apos;shish
              </button>
            </div>
          </div>

          <div className="overflow-x-auto px-2.5 pb-4">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                  {["#", "Fan", "Guruh", "Sana", "Vaqt", "Davomiylik", "Xona", "O'qituvchi", "Tur", "Status", "Amal"].map((h) => (
                    <th key={h} className="px-4 py-[18px] text-left text-sm font-medium whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, idx) => {
                  const sc = statusConfig[e.status]
                  const tc = typeColors[e.type] || typeColors["Yozma"]
                  return (
                    <motion.tr key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                      className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                      <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{idx + 1}</td>
                      <td className="px-4 h-14">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 shrink-0" style={{ color: "#7293b9" }} />
                          <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{e.subject}</span>
                        </div>
                      </td>
                      <td className="px-4 h-14 text-sm font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{e.group}</td>
                      <td className="px-4 h-14">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
                          <span className="text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{e.date}</span>
                        </div>
                      </td>
                      <td className="px-4 h-14">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
                          <span className="text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{e.time}</span>
                        </div>
                      </td>
                      <td className="px-4 h-14 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{e.duration}</td>
                      <td className="px-4 h-14 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{e.room}</td>
                      <td className="px-4 h-14 text-sm whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{e.teacher}</td>
                      <td className="px-4 h-14">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: tc.bg, color: tc.color }}>{e.type}</span>
                      </td>
                      <td className="px-4 h-14">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                      </td>
                      <td className="px-4 h-14 relative">
                        <button onClick={() => setOpenId(openId === e.id ? null : e.id)} className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff]">
                          <MoreHorizontal className="w-5 h-5" style={{ color: "#012970" }} />
                        </button>
                        <AnimatePresence>
                          {openId === e.id && (
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.15 }}
                              className="absolute right-4 top-[calc(100%-4px)] z-10 bg-white rounded-[5px] overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(1,41,112,0.15)", border: "1px solid rgba(1,41,112,0.1)", minWidth: 140 }}>
                              <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-[#f6f9ff]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} onClick={() => { setOpenId(null); openEdit(e) }}><Pencil className="w-4 h-4" /> Tahrirlash</button>
                              <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-red-50" style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }} onClick={() => { setOpenId(null); handleDelete(e.id) }}><Trash2 className="w-4 h-4" /> O&apos;chirish</button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={modal} title={editing ? "Imtihon tahrirlash" : "Imtihon qo'shish"} onClose={closeModal} maxWidth={560}>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FInput label="Fan *" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Fan nomi" />
            <FInput label="Guruh *" value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))} placeholder="Guruh nomi" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FInput label="Sana *" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            <FInput label="Vaqt *" type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FInput label="Xona *" value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="Masalan: 101-xona" />
            <FInput label="Davomiylik" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="Masalan: 2 soat" />
          </div>
          <FInput label="O'qituvchi *" value={form.teacher} onChange={e => setForm(f => ({ ...f, teacher: e.target.value }))} placeholder="O'qituvchi F.I.O" />
          <div className="grid grid-cols-2 gap-4">
            <FSelect label="Tur" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="Yozma">Yozma</option>
              <option value="Og'zaki">Og&apos;zaki</option>
              <option value="Test">Test</option>
            </FSelect>
            <FSelect label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="scheduled">Rejalashtirilgan</option>
              <option value="ongoing">Davom etmoqda</option>
              <option value="completed">Yakunlandi</option>
              <option value="cancelled">Bekor qilindi</option>
            </FSelect>
          </div>
          {formErr && <p className="text-xs text-red-500" style={{ fontFamily: "var(--font-poppins)" }}>{formErr}</p>}
          <ModalFooter onClose={closeModal} saving={saving} />
        </form>
      </Modal>
    </section>
  )
}
