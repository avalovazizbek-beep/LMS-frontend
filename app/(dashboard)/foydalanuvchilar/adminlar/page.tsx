"use client"

import { useMemo, useState } from "react"
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Shield } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { usersApi, User } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { Modal, FInput, FSelect, ModalFooter } from "@/components/ui/Modal"

const EMPTY = { fullName: "", username: "", phone: "", password: "", role: "admin", status: "active" }

export default function AdminlarPage() {
  const { data, loading, error, refetch } = useApi(() => usersApi.getAdmins())
  const admins: User[] = data?.data ?? []
  const [search, setSearch]       = useState("")
  const [openId, setOpenId]       = useState<string | null>(null)
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState<User | null>(null)
  const [form, setForm]           = useState<typeof EMPTY>({ ...EMPTY })
  const [saving, setSaving]       = useState(false)
  const [formErr, setFormErr]     = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? admins.filter((a) => [a.fullName, a.username, a.phone].join(" ").toLowerCase().includes(q)) : admins
  }, [search, admins])

  const openAdd = () => { setForm({ ...EMPTY }); setEditing(null); setFormErr(""); setModal(true) }
  const openEdit = (a: User) => {
    setForm({ fullName: a.fullName, username: a.username, phone: a.phone, password: "", role: a.role, status: a.status })
    setEditing(a); setFormErr(""); setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.username || !form.phone) { setFormErr("Barcha majburiy maydonlarni to'ldiring"); return }
    if (!editing && !form.password) { setFormErr("Yangi admin uchun parol kerak"); return }
    setSaving(true); setFormErr("")
    try {
      const body: Partial<User> & { password?: string } = {
        fullName: form.fullName, username: form.username, phone: form.phone,
        role: form.role, status: form.status as "active" | "inactive",
        ...(form.password ? { password: form.password } : {}),
      }
      editing ? await usersApi.updateAdmin(editing.id, body) : await usersApi.createAdmin(body)
      closeModal(); refetch()
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : "Xatolik")
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return
    try { await usersApi.deleteAdmin(id); refetch() } catch {}
  }

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      <header className="flex flex-col gap-[15px] pt-[25px] pb-5 px-5 bg-white" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h1 className="font-medium text-[28px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Adminlar</h1>
      </header>
      <div className="p-[30px]">
        <div className="bg-white rounded-[5px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-[22px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Barcha adminlar</h2>
              <div className="flex w-[33px] h-[33px] items-center justify-center rounded-full" style={{ backgroundColor: "rgba(114,147,185,0.2)" }}>
                <span className="font-semibold text-lg" style={{ color: "#7293b9" }}>{admins.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <label className="w-[400px] px-2.5 py-2 rounded-[5px] border flex items-center" style={{ borderColor: "rgba(1,41,112,0.3)" }}>
                <Search className="w-5 h-5 shrink-0" style={{ color: "#7293b9" }} />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="flex-1 ml-2 bg-transparent outline-none text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
              </label>
              <button onClick={openAdd} className="flex items-center gap-2 h-[42px] px-[15px] rounded-[5px] text-white text-base" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Plus className="w-5 h-5" /> Admin qo&apos;shish
              </button>
            </div>
          </div>
          <div className="overflow-x-auto px-2.5 pb-4">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                  {["#", "F.I.O", "Username", "Telefon", "Rol", "Status", "Amal"].map((h) => (
                    <th key={h} className="px-4 py-[18px] text-left text-sm font-medium whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, idx) => (
                  <motion.tr key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{idx + 1}</td>
                    <td className="px-4 h-14 text-sm font-medium whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{a.fullName}</td>
                    <td className="px-4 h-14 text-sm" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>@{a.username}</td>
                    <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{a.phone}</td>
                    <td className="px-4 h-14">
                      <div className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-[10px] border" style={{ backgroundColor: a.role === "super_admin" ? "#fff8e6" : "#f6f9ff", borderColor: a.role === "super_admin" ? "#f59e0b" : "#1cc2dc" }}>
                        <Shield className="w-3.5 h-3.5" style={{ color: a.role === "super_admin" ? "#f59e0b" : "#1cc2dc" }} />
                        <span className="text-xs font-semibold" style={{ color: a.role === "super_admin" ? "#f59e0b" : "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{a.role === "super_admin" ? "Super Admin" : "Admin"}</span>
                      </div>
                    </td>
                    <td className="px-4 h-14">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: a.status === "active" ? "#f0fbfd" : "#f6f9ff", color: a.status === "active" ? "#1cc2dc" : "#7293b9", border: `1px solid ${a.status === "active" ? "#1cc2dc" : "#7293b9"}` }}>
                        {a.status === "active" ? "Aktiv" : "Nofaol"}
                      </span>
                    </td>
                    <td className="px-4 h-14 relative">
                      <button onClick={() => setOpenId(openId === a.id ? null : a.id)} className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff]">
                        <MoreHorizontal className="w-5 h-5" style={{ color: "#012970" }} />
                      </button>
                      <AnimatePresence>
                        {openId === a.id && (
                          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.15 }}
                            className="absolute right-4 top-[calc(100%-4px)] z-10 bg-white rounded-[5px] overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(1,41,112,0.15)", border: "1px solid rgba(1,41,112,0.1)", minWidth: 140 }}>
                            <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-[#f6f9ff]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} onClick={() => { setOpenId(null); openEdit(a) }}><Pencil className="w-4 h-4" /> Tahrirlash</button>
                            <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-red-50" style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }} onClick={() => { setOpenId(null); handleDelete(a.id) }}><Trash2 className="w-4 h-4" /> O&apos;chirish</button>
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

      <Modal open={modal} title={editing ? "Admin tahrirlash" : "Admin qo'shish"} onClose={closeModal}>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <FInput label="F.I.O *" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="To'liq ism familiya" />
          <FInput label="Username *" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="foydalanuvchi_nomi" />
          <FInput label="Telefon *" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+998901234567" />
          <FInput label={editing ? "Parol (o'zgartirish uchun)" : "Parol *"} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
          <div className="grid grid-cols-2 gap-4">
            <FSelect label="Rol" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </FSelect>
            <FSelect label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Aktiv</option>
              <option value="inactive">Nofaol</option>
            </FSelect>
          </div>
          {formErr && <p className="text-xs text-red-500" style={{ fontFamily: "var(--font-poppins)" }}>{formErr}</p>}
          <ModalFooter onClose={closeModal} saving={saving} />
        </form>
      </Modal>
    </section>
  )
}
