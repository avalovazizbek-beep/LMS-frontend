"use client"

import { useMemo, useState } from "react"
import { Search, Plus, ChevronUp, ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { usersApi, User } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { Modal, FInput, FSelect, ModalFooter } from "@/components/ui/Modal"

type TabKey = "table" | "card"
type SortKey = "fullName" | "username" | "phone" | null
type SortDir = "asc" | "desc"

const EMPTY = { fullName: "", username: "", phone: "", password: "", status: "active" }

function SortIcon({ column, sortKey, sortDir }: { column: string; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== column) return <span className="flex flex-col opacity-30"><ChevronUp className="w-3 h-3 -mb-0.5" /><ChevronDown className="w-3 h-3" /></span>
  return sortDir === "asc" ? <ChevronUp className="w-4 h-4" style={{ color: "#1cc2dc" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#1cc2dc" }} />
}

export default function ModeratorsPage() {
  const { data, loading, error, refetch } = useApi(() => usersApi.getModerators())
  const moderators: User[] = data?.data ?? []
  const [activeTab, setActiveTab] = useState<TabKey>("table")
  const [search, setSearch]       = useState("")
  const [sortKey, setSortKey]     = useState<SortKey>(null)
  const [sortDir, setSortDir]     = useState<SortDir>("asc")
  const [openId, setOpenId]       = useState<string | null>(null)
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState<User | null>(null)
  const [form, setForm]           = useState<typeof EMPTY>({ ...EMPTY })
  const [saving, setSaving]       = useState(false)
  const [formErr, setFormErr]     = useState("")

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = q ? moderators.filter((m) => [m.fullName, m.username, m.phone].join(" ").toLowerCase().includes(q)) : [...moderators]
    if (sortKey) list = list.sort((a, b) => sortDir === "asc" ? a[sortKey].localeCompare(b[sortKey]) : b[sortKey].localeCompare(a[sortKey]))
    return list
  }, [search, sortKey, sortDir, moderators])

  const openAdd = () => { setForm({ ...EMPTY }); setEditing(null); setFormErr(""); setModal(true) }
  const openEdit = (m: User) => {
    setForm({ fullName: m.fullName, username: m.username, phone: m.phone, password: "", status: m.status })
    setEditing(m); setFormErr(""); setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.username || !form.phone) { setFormErr("Barcha majburiy maydonlarni to'ldiring"); return }
    if (!editing && !form.password) { setFormErr("Yangi moderator uchun parol kerak"); return }
    setSaving(true); setFormErr("")
    try {
      const body: Partial<User> & { password?: string } = {
        fullName: form.fullName, username: form.username, phone: form.phone,
        role: "moderator", status: form.status as "active" | "inactive",
        ...(form.password ? { password: form.password } : {}),
      }
      editing ? await usersApi.updateModerator(editing.id, body) : await usersApi.createModerator(body)
      closeModal(); refetch()
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : "Xatolik")
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return
    try { await usersApi.deleteModerator(id); refetch() } catch {}
  }

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      <header className="flex flex-col items-start gap-[15px] pt-[25px] pb-5 px-5 bg-white" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h1 className="font-medium text-[28px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Moderatorlar</h1>
        <div className="flex items-start justify-between self-stretch w-full">
          <div className="inline-flex items-center gap-[15px]">
            {(["table", "card"] as TabKey[]).map((key) => (
              <button key={key} onClick={() => setActiveTab(key)} className="px-5 h-[45px] inline-flex items-center justify-center rounded-[10px] border transition-colors"
                style={{ backgroundColor: activeTab === key ? "#0e58a8" : "#fff", borderColor: activeTab === key ? "rgba(1,41,112,0.3)" : "rgba(1,41,112,0.1)", fontFamily: "var(--font-poppins)" }}>
                <span className="font-semibold text-base" style={{ color: activeTab === key ? "#fff" : "#7293b9" }}>{key === "table" ? "Jadval" : "Card"}</span>
              </button>
            ))}
          </div>
          <label className="w-[500px] px-2.5 py-2 rounded-[5px] border flex items-center bg-white" style={{ borderColor: "rgba(1,41,112,0.3)" }}>
            <Search className="w-5 h-5 shrink-0" style={{ color: "#7293b9" }} />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="flex-1 ml-2 bg-transparent outline-none text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
          </label>
        </div>
      </header>

      <div className="pl-[30px] pr-0 pt-[30px] pb-0">
        <div className="bg-white rounded-[5px] max-w-[1086px]" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-[22px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Barcha moderatorlar</h2>
              <div className="flex w-[33px] h-[33px] items-center justify-center rounded-full" style={{ backgroundColor: "rgba(114,147,185,0.2)" }}>
                <span className="font-semibold text-lg" style={{ color: "#7293b9" }}>{moderators.length}</span>
              </div>
            </div>
            <button onClick={openAdd} className="inline-flex h-[42px] items-center gap-2.5 px-[15px] rounded-[5px]" style={{ backgroundColor: "#0e58a8" }}>
              <Plus className="w-6 h-6 text-white" />
              <span className="text-base text-white" style={{ fontFamily: "var(--font-poppins)" }}>Moderator qo&apos;shish</span>
            </button>
          </div>

          {activeTab === "table" && (
            <div className="overflow-x-auto px-2.5 pb-4">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                    <th className="px-4 py-[18px] text-left text-sm font-medium" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>#</th>
                    {[["fullName", "FIO"], ["username", "Username"], ["phone", "Telefon"]].map(([key, label]) => (
                      <th key={key} className="px-4 py-[18px] text-left" style={{ color: "#7293b9" }}>
                        <button className="flex items-center gap-1" onClick={() => handleSort(key as SortKey)}>
                          <span className="text-sm font-medium whitespace-nowrap" style={{ fontFamily: "var(--font-poppins)" }}>{label}</span>
                          <SortIcon column={key} sortKey={sortKey} sortDir={sortDir} />
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-[18px] text-left text-sm font-medium whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Status</th>
                    <th className="px-4 py-[18px] text-left text-sm font-medium whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Account Permission</th>
                    <th className="px-4 py-[18px] text-left text-sm font-medium" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, idx) => (
                    <motion.tr key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                      className="hover:bg-[#f6f9ff]/60 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                      <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{idx + 1}</td>
                      <td className="px-4 h-14 text-sm font-medium whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{m.fullName}</td>
                      <td className="px-4 h-14 text-sm" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{m.username}</td>
                      <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{m.phone}</td>
                      <td className="px-4 h-14">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: m.status === "active" ? "#f0fbfd" : "#f6f9ff", color: m.status === "active" ? "#1cc2dc" : "#7293b9", border: `1px solid ${m.status === "active" ? "#1cc2dc" : "#7293b9"}` }}>
                          {m.status === "active" ? "Aktiv" : "Nofaol"}
                        </span>
                      </td>
                      <td className="px-4 h-14">
                        <div className="inline-flex h-[30px] items-center justify-center px-5 rounded-[10px] border" style={{ backgroundColor: "#f6f9ff", borderColor: "#1cc2dc" }}>
                          <span className="font-semibold text-sm" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>Moderator</span>
                        </div>
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
          )}

          {activeTab === "card" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 p-5">
              {filtered.map((m, idx) => (
                <motion.div key={m.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
                  className="flex flex-col gap-3 p-4 bg-white rounded-[10px]" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white text-sm" style={{ backgroundColor: "#0e58a8" }}>
                        {m.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{m.fullName}</p>
                        <p className="text-xs" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{m.username}</p>
                      </div>
                    </div>
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff]">
                      <Pencil className="w-4 h-4" style={{ color: "#7293b9" }} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{m.phone}</p>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex h-[26px] items-center justify-center px-3 rounded-[10px] w-fit border" style={{ backgroundColor: "#f6f9ff", borderColor: "#1cc2dc" }}>
                        <span className="font-semibold text-xs" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>Moderator</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: m.status === "active" ? "#f0fbfd" : "#f6f9ff", color: m.status === "active" ? "#1cc2dc" : "#7293b9", border: `1px solid ${m.status === "active" ? "#1cc2dc" : "#7293b9"}` }}>
                        {m.status === "active" ? "Aktiv" : "Nofaol"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={modal} title={editing ? "Moderator tahrirlash" : "Moderator qo'shish"} onClose={closeModal}>
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
