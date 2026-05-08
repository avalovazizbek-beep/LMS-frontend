"use client"

import { useMemo, useState } from "react"
import { Search, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { usersApi, User } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { Modal, FInput, FSelect, ModalFooter } from "@/components/ui/Modal"

const EMPTY = { fullName: "", username: "", phone: "", password: "", status: "active" }

export default function UstalarPage() {
  const { data, loading, error, refetch } = useApi(() => usersApi.getMasters())
  const masters: User[] = data?.data ?? []
  const [search, setSearch]   = useState("")
  const [openId, setOpenId]   = useState<string | null>(null)
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm]       = useState<typeof EMPTY>({ ...EMPTY })
  const [saving, setSaving]   = useState(false)
  const [formErr, setFormErr] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? masters.filter((m) => [m.fullName, m.username, m.phone].join(" ").toLowerCase().includes(q)) : masters
  }, [search, masters])

  const openAdd = () => { setForm({ ...EMPTY }); setEditing(null); setFormErr(""); setModal(true) }
  const openEdit = (m: User) => {
    setForm({ fullName: m.fullName, username: m.username, phone: m.phone, password: "", status: m.status })
    setEditing(m); setFormErr(""); setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.username || !form.phone) { setFormErr("Barcha majburiy maydonlarni to'ldiring"); return }
    if (!editing && !form.password) { setFormErr("Yangi usta uchun parol kerak"); return }
    setSaving(true); setFormErr("")
    try {
      const body: Partial<User> & { password?: string } = {
        fullName: form.fullName, username: form.username, phone: form.phone,
        role: "master", status: form.status as "active" | "inactive",
        ...(form.password ? { password: form.password } : {}),
      }
      editing ? await usersApi.updateMaster(editing.id, body) : await usersApi.createMaster(body)
      closeModal(); refetch()
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : "Xatolik")
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return
    try { await usersApi.deleteMaster(id); refetch() } catch {}
  }

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      <header className="flex flex-col gap-[15px] pt-[25px] pb-5 px-5 bg-white" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h1 className="font-medium text-[28px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Ustalar</h1>
      </header>

      <div className="grid grid-cols-3 gap-5 px-[30px] pt-[30px]">
        {[
          { label: "Jami ustalar", value: masters.length,                                            color: "#012970" },
          { label: "Aktiv",        value: masters.filter((m) => m.status === "active").length,   color: "#22c55e" },
          { label: "Nofaol",       value: masters.filter((m) => m.status === "inactive").length, color: "#ef4444" },
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
              <h2 className="font-medium text-[22px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Barcha ustalar</h2>
              <div className="flex w-[33px] h-[33px] items-center justify-center rounded-full" style={{ backgroundColor: "rgba(114,147,185,0.2)" }}>
                <span className="font-semibold text-lg" style={{ color: "#7293b9" }}>{masters.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <label className="w-[350px] px-2.5 py-2 rounded-[5px] border flex items-center" style={{ borderColor: "rgba(1,41,112,0.3)" }}>
                <Search className="w-5 h-5 shrink-0" style={{ color: "#7293b9" }} />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="flex-1 ml-2 bg-transparent outline-none text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
              </label>
              <button onClick={openAdd} className="flex items-center gap-2 h-[42px] px-[15px] rounded-[5px] text-white text-sm" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Plus className="w-5 h-5" /> Usta qo&apos;shish
              </button>
            </div>
          </div>

          <div className="overflow-x-auto px-2.5 pb-4">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                  {["#", "F.I.O", "Username", "Telefon", "Status", "Amal"].map((h) => (
                    <th key={h} className="px-4 py-[18px] text-left text-sm font-medium whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, idx) => (
                  <motion.tr key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{idx + 1}</td>
                    <td className="px-4 h-14 text-sm font-medium whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{m.fullName}</td>
                    <td className="px-4 h-14 text-sm" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{m.username}</td>
                    <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{m.phone}</td>
                    <td className="px-4 h-14">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: m.status === "active" ? "#f0fbfd" : "#f6f9ff", color: m.status === "active" ? "#1cc2dc" : "#7293b9", border: `1px solid ${m.status === "active" ? "#1cc2dc" : "#7293b9"}` }}>
                        {m.status === "active" ? "Aktiv" : "Nofaol"}
                      </span>
                    </td>
                    <td className="px-4 h-14 relative">
                      <button onClick={() => setOpenId(openId === m.id ? null : m.id)} className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff]">
                        <MoreHorizontal className="w-5 h-5" style={{ color: "#012970" }} />
                      </button>
                      <AnimatePresence>
                        {openId === m.id && (
                          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.15 }}
                            className="absolute right-4 top-[calc(100%-4px)] z-10 bg-white rounded-[5px] overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(1,41,112,0.15)", border: "1px solid rgba(1,41,112,0.1)", minWidth: 140 }}>
                            <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-[#f6f9ff]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} onClick={() => { setOpenId(null); openEdit(m) }}><Pencil className="w-4 h-4" /> Tahrirlash</button>
                            <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-red-50" style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }} onClick={() => { setOpenId(null); handleDelete(m.id) }}><Trash2 className="w-4 h-4" /> O&apos;chirish</button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={modal} title={editing ? "Usta tahrirlash" : "Usta qo'shish"} onClose={closeModal}>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <FInput label="F.I.O *" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="To'liq ism familiya" />
          <FInput label="Username *" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="foydalanuvchi_nomi" />
          <FInput label="Telefon *" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+998901234567" />
          <FInput label={editing ? "Parol (o'zgartirish uchun)" : "Parol *"} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
          <FSelect label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="active">Aktiv</option>
            <option value="inactive">Nofaol</option>
          </FSelect>
          {formErr && <p className="text-xs text-red-500" style={{ fontFamily: "var(--font-poppins)" }}>{formErr}</p>}
          <ModalFooter onClose={closeModal} saving={saving} />
        </form>
      </Modal>
    </section>
  )
}
