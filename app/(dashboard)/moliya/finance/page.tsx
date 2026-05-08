"use client"

import { useMemo, useState } from "react"
import { Search, Plus, MoreHorizontal, Pencil, Trash2, CreditCard, TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { financeApi, Payment } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { Modal, FInput, FSelect, ModalFooter } from "@/components/ui/Modal"

type PaymentStatus = Payment["status"]
const statusConfig: Record<PaymentStatus, { label: string; bg: string; color: string; border: string }> = {
  paid:    { label: "To'landi",       bg: "#f0fbfd", color: "#1cc2dc", border: "#1cc2dc" },
  pending: { label: "Kutilmoqda",     bg: "#fff8e6", color: "#f59e0b", border: "#f59e0b" },
  overdue: { label: "Muddati o'tdi",  bg: "#fff0f0", color: "#ef4444", border: "#ef4444" },
  partial: { label: "Qisman",         bg: "#f0f5ff", color: "#0e58a8", border: "#0e58a8" },
}
const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n) + " so'm"

const EMPTY_PAY  = { student: "", group: "", semester: "1", total: "", paid: "0", dueDate: "", status: "pending" }
const EMPTY_CASH = { amount: "" }

export default function FinancePage() {
  const { data, loading, error, refetch } = useApi(() => financeApi.getAll())
  const payments: Payment[] = data?.data ?? []
  const stats = data?.stats ?? { total: 0, paid: 0, debt: 0 }

  const [search, setSearch]     = useState("")
  const [openId, setOpenId]     = useState<string | null>(null)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState<Payment | null>(null)
  const [form, setForm]         = useState<typeof EMPTY_PAY>({ ...EMPTY_PAY })
  const [saving, setSaving]     = useState(false)
  const [formErr, setFormErr]   = useState("")
  const [payModal, setPayModal] = useState(false)
  const [payTarget, setPayTarget] = useState<Payment | null>(null)
  const [cashForm, setCashForm] = useState<typeof EMPTY_CASH>({ ...EMPTY_CASH })
  const [cashErr, setCashErr]   = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? payments.filter((p) => [p.student, p.group].join(" ").toLowerCase().includes(q)) : payments
  }, [search, payments])

  const openAdd = () => { setForm({ ...EMPTY_PAY }); setEditing(null); setFormErr(""); setModal(true) }
  const openEdit = (p: Payment) => {
    setForm({ student: p.student, group: p.group, semester: String(p.semester), total: String(p.total), paid: String(p.paid), dueDate: p.dueDate, status: p.status })
    setEditing(p); setFormErr(""); setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null) }

  const openPay = (p: Payment) => { setPayTarget(p); setCashForm({ ...EMPTY_CASH }); setCashErr(""); setPayModal(true) }
  const closePay = () => { setPayModal(false); setPayTarget(null) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.student || !form.group || !form.total || !form.dueDate) { setFormErr("Barcha majburiy maydonlarni to'ldiring"); return }
    setSaving(true); setFormErr("")
    try {
      const body: Partial<Payment> = {
        student: form.student, group: form.group, semester: Number(form.semester),
        total: Number(form.total), paid: Number(form.paid), dueDate: form.dueDate,
        status: form.status as PaymentStatus,
      }
      editing ? await financeApi.update(editing.id, body) : await financeApi.create(body)
      closeModal(); refetch()
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : "Xatolik")
    } finally { setSaving(false) }
  }

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cashForm.amount || Number(cashForm.amount) <= 0) { setCashErr("To'lov miqdorini kiriting"); return }
    setSaving(true); setCashErr("")
    try {
      await financeApi.pay(payTarget!.id, Number(cashForm.amount))
      closePay(); refetch()
    } catch (err: unknown) {
      setCashErr(err instanceof Error ? err.message : "Xatolik")
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return
    try { await financeApi.remove(id); refetch() } catch {}
  }

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  const paidPct = stats.total ? Math.round((stats.paid / stats.total) * 100) : 0

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      <header className="flex flex-col gap-[15px] pt-[25px] pb-5 px-5 bg-white" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h1 className="font-medium text-[28px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Moliya</h1>
      </header>

      <div className="grid grid-cols-4 gap-5 px-[30px] pt-[30px]">
        {[
          { label: "Umumiy kontrakt", value: fmt(stats.total), color: "#012970",  Icon: DollarSign  },
          { label: "To'langan",       value: fmt(stats.paid),  color: "#22c55e",  Icon: TrendingUp  },
          { label: "Qoldiq qarz",     value: fmt(stats.debt),  color: "#ef4444",  Icon: TrendingDown },
          { label: "To'liq to'lagan", value: payments.filter((p) => p.status === "paid").length, color: "#1cc2dc", Icon: CreditCard },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#f6f9ff" }}>
                <s.Icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
            </div>
            <div className="text-xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
            <div className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="px-[30px] pt-5">
        <div className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Umumiy to&apos;lov holati</p>
            <p className="text-sm font-semibold" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{paidPct}%</p>
          </div>
          <div className="w-full h-2 rounded-full" style={{ backgroundColor: "#f6f9ff" }}>
            <motion.div className="h-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${paidPct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} style={{ backgroundColor: "#1cc2dc" }} />
          </div>
        </div>
      </div>

      <div className="px-[30px] pt-5 pb-[30px]">
        <div className="bg-white rounded-[5px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-medium text-[22px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>To&apos;lov tarixi</h2>
              <div className="flex w-[33px] h-[33px] items-center justify-center rounded-full" style={{ backgroundColor: "rgba(114,147,185,0.2)" }}>
                <span className="font-semibold text-lg" style={{ color: "#7293b9" }}>{payments.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <label className="w-[350px] px-2.5 py-2 rounded-[5px] border flex items-center" style={{ borderColor: "rgba(1,41,112,0.3)" }}>
                <Search className="w-5 h-5 shrink-0" style={{ color: "#7293b9" }} />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="flex-1 ml-2 bg-transparent outline-none text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
              </label>
              <button onClick={openAdd} className="flex items-center gap-2 h-[42px] px-[15px] rounded-[5px] text-white text-sm" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Plus className="w-5 h-5" /> To&apos;lov qo&apos;shish
              </button>
            </div>
          </div>
          <div className="overflow-x-auto px-2.5 pb-4">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                  {["#","Talaba","Guruh","Semestr","Jami","To'langan","Qoldiq","Muddat","Status","Amal"].map((h) => (
                    <th key={h} className="px-4 py-[18px] text-left text-sm font-medium whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => {
                  const sc = statusConfig[p.status]
                  return (
                    <motion.tr key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                      className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                      <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{idx + 1}</td>
                      <td className="px-4 h-14 text-sm font-medium whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{p.student}</td>
                      <td className="px-4 h-14 text-sm font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{p.group}</td>
                      <td className="px-4 h-14 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{p.semester}-semestr</td>
                      <td className="px-4 h-14 text-sm font-medium whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{fmt(p.total)}</td>
                      <td className="px-4 h-14 text-sm font-medium whitespace-nowrap" style={{ color: "#22c55e", fontFamily: "var(--font-poppins)" }}>{fmt(p.paid)}</td>
                      <td className="px-4 h-14 text-sm font-medium whitespace-nowrap" style={{ color: p.total - p.paid > 0 ? "#ef4444" : "#7293b9", fontFamily: "var(--font-poppins)" }}>{fmt(p.total - p.paid)}</td>
                      <td className="px-4 h-14 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{p.dueDate}</td>
                      <td className="px-4 h-14">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                      </td>
                      <td className="px-4 h-14 relative">
                        <button onClick={() => setOpenId(openId === p.id ? null : p.id)} className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff]">
                          <MoreHorizontal className="w-5 h-5" style={{ color: "#012970" }} />
                        </button>
                        <AnimatePresence>
                          {openId === p.id && (
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.15 }}
                              className="absolute right-4 top-[calc(100%-4px)] z-10 bg-white rounded-[5px] overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(1,41,112,0.15)", border: "1px solid rgba(1,41,112,0.1)", minWidth: 150 }}>
                              <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-[#f0fbfd]" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }} onClick={() => { setOpenId(null); openPay(p) }}><CreditCard className="w-4 h-4" /> To&apos;lov qilish</button>
                              <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-[#f6f9ff]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} onClick={() => { setOpenId(null); openEdit(p) }}><Pencil className="w-4 h-4" /> Tahrirlash</button>
                              <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-red-50" style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }} onClick={() => { setOpenId(null); handleDelete(p.id) }}><Trash2 className="w-4 h-4" /> O&apos;chirish</button>
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

      {/* Add/Edit modal */}
      <Modal open={modal} title={editing ? "To'lovni tahrirlash" : "To'lov qo'shish"} onClose={closeModal} maxWidth={520}>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FInput label="Talaba *" value={form.student} onChange={e => setForm(f => ({ ...f, student: e.target.value }))} placeholder="Talaba F.I.O" />
            <FInput label="Guruh *" value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))} placeholder="Guruh nomi" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FSelect label="Semestr" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}>
              {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}-semestr</option>)}
            </FSelect>
            <FInput label="Muddat *" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FInput label="Jami summa *" type="number" min="0" value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} placeholder="0" />
            <FInput label="To'langan" type="number" min="0" value={form.paid} onChange={e => setForm(f => ({ ...f, paid: e.target.value }))} placeholder="0" />
          </div>
          <FSelect label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="pending">Kutilmoqda</option>
            <option value="partial">Qisman</option>
            <option value="paid">To&apos;landi</option>
            <option value="overdue">Muddati o&apos;tdi</option>
          </FSelect>
          {formErr && <p className="text-xs text-red-500" style={{ fontFamily: "var(--font-poppins)" }}>{formErr}</p>}
          <ModalFooter onClose={closeModal} saving={saving} />
        </form>
      </Modal>

      {/* Pay modal */}
      <Modal open={payModal} title="To'lov qilish" onClose={closePay} maxWidth={400}>
        <form onSubmit={handlePay} className="flex flex-col gap-4">
          {payTarget && (
            <div className="p-3 rounded-[5px]" style={{ backgroundColor: "#f6f9ff", border: "1px solid rgba(1,41,112,0.1)" }}>
              <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{payTarget.student}</p>
              <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Qoldiq: <span style={{ color: "#ef4444" }}>{fmt(payTarget.total - payTarget.paid)}</span>
              </p>
            </div>
          )}
          <FInput label="To'lov miqdori (so'm) *" type="number" min="1" value={cashForm.amount} onChange={e => setCashForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
          {cashErr && <p className="text-xs text-red-500" style={{ fontFamily: "var(--font-poppins)" }}>{cashErr}</p>}
          <ModalFooter onClose={closePay} saving={saving} />
        </form>
      </Modal>
    </section>
  )
}
