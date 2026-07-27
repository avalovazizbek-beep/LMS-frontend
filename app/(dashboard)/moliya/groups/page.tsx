"use client"

import { useMemo, useState } from "react"
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { groupsApi, Group } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { Modal, FInput, FSelect, ModalFooter } from "@/components/ui/Modal"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const EMPTY = { name: "", course: "1", direction: "", students: "0", tutor: "", status: "active" }

export default function GroupsPage() {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useApi(() => groupsApi.getAll())
  const groups: Group[] = data?.data ?? []
  const [search, setSearch]   = useState("")
  const [openId, setOpenId]   = useState<string | null>(null)
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState<Group | null>(null)
  const [form, setForm]       = useState<typeof EMPTY>({ ...EMPTY })
  const [saving, setSaving]   = useState(false)
  const [formErr, setFormErr] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? groups.filter((g) => [g.name, g.direction, g.tutor].join(" ").toLowerCase().includes(q)) : groups
  }, [search, groups])

  const openAdd = () => { setForm({ ...EMPTY }); setEditing(null); setFormErr(""); setModal(true) }
  const openEdit = (g: Group) => {
    setForm({ name: g.name, course: String(g.course), direction: g.direction, students: String(g.students), tutor: g.tutor, status: g.status })
    setEditing(g); setFormErr(""); setModal(true)
  }
  const closeModal = () => { setModal(false); setEditing(null) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.direction || !form.tutor) { setFormErr(t("moliyaGroups.fillRequired")); return }
    setSaving(true); setFormErr("")
    try {
      const body: Partial<Group> = {
        name: form.name, course: Number(form.course), direction: form.direction,
        students: Number(form.students), tutor: form.tutor, status: form.status as "active" | "inactive",
      }
      editing ? await groupsApi.update(editing.id, body) : await groupsApi.create(body)
      closeModal(); refetch()
    } catch (err: unknown) {
      setFormErr(err instanceof Error ? err.message : t("moliyaGroups.errorGeneric"))
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t("moliyaDoc.confirmDelete"))) return
    try { await groupsApi.remove(id); refetch() } catch {}
  }

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      <header className="flex flex-col gap-[15px] pt-[25px] pb-5 px-5 bg-white" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h1 className="font-medium text-[28px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t("moliyaGroups.title")}</h1>
      </header>
      <div className="grid grid-cols-4 gap-5 px-[30px] pt-[30px]">
        {[
          { label: t("moliyaGroups.totalGroups"),   value: groups.length,                                                                                                             color: "#012970" },
          { label: t("moliyaGroups.active"),        value: groups.filter((g) => g.status === "active").length,                                                                        color: "#22c55e" },
          { label: t("moliyaGroups.totalStudents"), value: groups.reduce((s, g) => s + g.students, 0),                                                                                color: "#1cc2dc" },
          { label: t("moliyaGroups.avgStudents"),   value: groups.length ? Math.round(groups.reduce((s, g) => s + g.students, 0) / groups.length) : 0,                               color: "#0e58a8" },
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
              <h2 className="font-medium text-[22px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t("moliyaGroups.allGroups")}</h2>
              <div className="flex w-[33px] h-[33px] items-center justify-center rounded-full" style={{ backgroundColor: "rgba(114,147,185,0.2)" }}>
                <span className="font-semibold text-lg" style={{ color: "#7293b9" }}>{groups.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <label className="w-[350px] px-2.5 py-2 rounded-[5px] border flex items-center" style={{ borderColor: "rgba(1,41,112,0.3)" }}>
                <Search className="w-5 h-5 shrink-0" style={{ color: "#7293b9" }} />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("moliyaDoc.search")} className="flex-1 ml-2 bg-transparent outline-none text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} />
              </label>
              <button onClick={openAdd} className="flex items-center gap-2 h-[42px] px-[15px] rounded-[5px] text-white text-sm" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <Plus className="w-5 h-5" /> {t("moliyaGroups.addGroup")}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto px-2.5 pb-4">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                  {[t("moliyaGroups.col.hash"), t("moliyaGroups.col.groupName"), t("moliyaGroups.col.course"), t("moliyaGroups.col.direction"), t("moliyaGroups.col.students"), t("moliyaGroups.col.tutor"), t("moliyaGroups.col.status"), t("moliyaGroups.col.action")].map((h) => (
                    <th key={h} className="px-4 py-[18px] text-left text-sm font-medium whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((g, idx) => (
                  <motion.tr key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                    className="hover:bg-[#f6f9ff]/50 transition-colors" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{idx + 1}</td>
                    <td className="px-4 h-14"><span className="text-sm font-semibold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>{g.name}</span></td>
                    <td className="px-4 h-14 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t("moliyaGroups.courseSuffix", { n: g.course })}</td>
                    <td className="px-4 h-14 text-sm whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{g.direction}</td>
                    <td className="px-4 h-14">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" style={{ color: "#7293b9" }} />
                        <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g.students}</span>
                      </div>
                    </td>
                    <td className="px-4 h-14 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{g.tutor}</td>
                    <td className="px-4 h-14">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: g.status === "active" ? "#f0fbfd" : "#f6f9ff", color: g.status === "active" ? "#1cc2dc" : "#7293b9", border: `1px solid ${g.status === "active" ? "#1cc2dc" : "#7293b9"}` }}>
                        {g.status === "active" ? t("moliyaGroups.statusActive") : t("moliyaGroups.statusInactive")}
                      </span>
                    </td>
                    <td className="px-4 h-14 relative">
                      <button onClick={() => setOpenId(openId === g.id ? null : g.id)} className="p-1.5 rounded-[5px] hover:bg-[#f6f9ff]">
                        <MoreHorizontal className="w-5 h-5" style={{ color: "#012970" }} />
                      </button>
                      <AnimatePresence>
                        {openId === g.id && (
                          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.15 }}
                            className="absolute right-4 top-[calc(100%-4px)] z-10 bg-white rounded-[5px] overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(1,41,112,0.15)", border: "1px solid rgba(1,41,112,0.1)", minWidth: 140 }}>
                            <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-[#f6f9ff]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }} onClick={() => { setOpenId(null); openEdit(g) }}><Pencil className="w-4 h-4" /> {t("moliyaDoc.edit")}</button>
                            <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-red-50" style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }} onClick={() => { setOpenId(null); handleDelete(g.id) }}><Trash2 className="w-4 h-4" /> {t("moliyaDoc.delete")}</button>
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

      <Modal open={modal} title={editing ? t("moliyaGroups.editGroup") : t("moliyaGroups.addGroup")} onClose={closeModal} maxWidth={520}>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <FInput label={`${t("moliyaGroups.col.groupName")} *`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t("moliyaGroups.groupNamePlaceholder")} />
          <div className="grid grid-cols-2 gap-4">
            <FSelect label={t("moliyaGroups.col.course")} value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))}>
              {[1, 2, 3, 4].map(n => <option key={n} value={n}>{t("moliyaGroups.courseSuffix", { n })}</option>)}
            </FSelect>
            <FInput label={t("moliyaGroups.studentCount")} type="number" min="0" value={form.students} onChange={e => setForm(f => ({ ...f, students: e.target.value }))} placeholder="0" />
          </div>
          <FInput label={`${t("moliyaGroups.col.direction")} *`} value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))} placeholder={t("moliyaGroups.directionPlaceholder")} />
          <FInput label={`${t("moliyaGroups.col.tutor")} *`} value={form.tutor} onChange={e => setForm(f => ({ ...f, tutor: e.target.value }))} placeholder={t("moliyaGroups.tutorPlaceholder")} />
          <FSelect label={t("moliyaGroups.col.status")} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="active">{t("moliyaGroups.statusActive")}</option>
            <option value="inactive">{t("moliyaGroups.statusInactive")}</option>
          </FSelect>
          {formErr && <p className="text-xs text-red-500" style={{ fontFamily: "var(--font-poppins)" }}>{formErr}</p>}
          <ModalFooter onClose={closeModal} saving={saving} />
        </form>
      </Modal>
    </section>
  )
}
