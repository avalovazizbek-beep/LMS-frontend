"use client"

import { useState } from "react"
import { Shield, Check, Minus } from "lucide-react"

type Role = "super_admin" | "admin" | "moderator" | "seller" | "master"
type Permission = { key: string; label: string; group: string }

const roles: { key: Role; label: string; color: string; bg: string }[] = [
  { key: "super_admin", label: "Super Admin", color: "#f59e0b", bg: "#fff8e6" },
  { key: "admin",       label: "Admin",       color: "#0e58a8", bg: "#f0f5ff" },
  { key: "moderator",   label: "Moderator",   color: "#1cc2dc", bg: "#f0fbfd" },
  { key: "seller",      label: "Sotuvchi",    color: "#22c55e", bg: "#f0fff4" },
  { key: "master",      label: "Usta",        color: "#7293b9", bg: "#f6f9ff" },
]

const permissions: Permission[] = [
  { key: "view_dashboard",    label: "Dashboard ko'rish",         group: "Asosiy" },
  { key: "manage_users",      label: "Foydalanuvchilarni boshqarish", group: "Foydalanuvchilar" },
  { key: "view_users",        label: "Foydalanuvchilarni ko'rish", group: "Foydalanuvchilar" },
  { key: "manage_groups",     label: "Guruhlarni boshqarish",     group: "Ta'lim" },
  { key: "view_groups",       label: "Guruhlarni ko'rish",        group: "Ta'lim" },
  { key: "manage_exams",      label: "Imtihonlarni boshqarish",   group: "Ta'lim" },
  { key: "view_exams",        label: "Imtihonlarni ko'rish",      group: "Ta'lim" },
  { key: "manage_finance",    label: "Moliyani boshqarish",       group: "Moliya" },
  { key: "view_finance",      label: "Moliyani ko'rish",          group: "Moliya" },
  { key: "manage_docs",       label: "Hujjatlarni boshqarish",    group: "Hujjatlar" },
  { key: "view_docs",         label: "Hujjatlarni ko'rish",       group: "Hujjatlar" },
  { key: "manage_settings",   label: "Sozlamalarni boshqarish",   group: "Tizim" },
  { key: "view_reports",      label: "Hisobotlarni ko'rish",      group: "Tizim" },
  { key: "manage_board",      label: "Xabarni boshqarish",        group: "Kontent" },
  { key: "manage_meetings",   label: "Yig'ilishlarni boshqarish", group: "Kontent" },
]

const defaultPerms: Record<Role, Set<string>> = {
  super_admin: new Set(permissions.map((p) => p.key)),
  admin:       new Set(["view_dashboard","manage_users","view_users","manage_groups","view_groups","manage_exams","view_exams","manage_finance","view_finance","manage_docs","view_docs","view_reports","manage_board","manage_meetings"]),
  moderator:   new Set(["view_dashboard","view_users","view_groups","view_exams","view_finance","view_docs","view_reports","manage_board"]),
  seller:      new Set(["view_dashboard","view_groups","view_docs","manage_meetings"]),
  master:      new Set(["view_dashboard","view_groups","view_exams","view_docs"]),
}

const groups = Array.from(new Set(permissions.map((p) => p.group)))

export default function PermissionPage() {
  const [perms, setPerms] = useState<Record<Role, Set<string>>>(() => {
    const copy: Record<string, Set<string>> = {}
    for (const k of Object.keys(defaultPerms)) copy[k] = new Set(defaultPerms[k as Role])
    return copy as Record<Role, Set<string>>
  })
  const [activeRole, setActiveRole] = useState<Role>("admin")

  const toggle = (key: string) => {
    if (activeRole === "super_admin") return
    setPerms((prev) => {
      const next = new Set(prev[activeRole])
      next.has(key) ? next.delete(key) : next.add(key)
      return { ...prev, [activeRole]: next }
    })
  }

  const groupPerms = (g: string) => permissions.filter((p) => p.group === g)
  const groupAllChecked = (g: string) => groupPerms(g).every((p) => perms[activeRole].has(p.key))
  const groupSomeChecked = (g: string) => groupPerms(g).some((p) => perms[activeRole].has(p.key)) && !groupAllChecked(g)

  const toggleGroup = (g: string) => {
    if (activeRole === "super_admin") return
    const gp = groupPerms(g)
    const allChecked = groupAllChecked(g)
    setPerms((prev) => {
      const next = new Set(prev[activeRole])
      gp.forEach((p) => allChecked ? next.delete(p.key) : next.add(p.key))
      return { ...prev, [activeRole]: next }
    })
  }

  return (
    <section className="flex flex-col min-h-full" style={{ backgroundColor: "#f6f9ff" }}>
      <header className="flex flex-col gap-[15px] pt-[25px] pb-5 px-5 bg-white" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
        <h1 className="font-medium text-[28px]" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Ruxsatlar</h1>
      </header>

      <div className="flex flex-1 gap-5 p-[30px]">
        {/* Role list */}
        <div className="w-56 shrink-0 flex flex-col gap-3">
          {roles.map((r) => (
            <button
              key={r.key}
              onClick={() => setActiveRole(r.key)}
              className="flex items-center gap-3 p-4 rounded-[10px] text-left transition-all"
              style={{
                backgroundColor: activeRole === r.key ? r.bg : "#fff",
                border: `1px solid ${activeRole === r.key ? r.color : "rgba(1,41,112,0.1)"}`,
              }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: r.bg }}>
                <Shield className="w-4 h-4" style={{ color: r.color }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{r.label}</p>
                <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{perms[r.key].size} ruxsat</p>
              </div>
            </button>
          ))}
        </div>

        {/* Permissions table */}
        <div className="flex-1 bg-white rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
          <div className="p-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
            {(() => {
              const role = roles.find((r) => r.key === activeRole)!
              return (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: role.bg }}>
                    <Shield className="w-5 h-5" style={{ color: role.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-base" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{role.label}</p>
                    <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{perms[activeRole].size} / {permissions.length} ruxsat berilgan</p>
                  </div>
                </div>
              )
            })()}
            {activeRole === "super_admin" && (
              <span className="text-xs px-3 py-1.5 rounded-full" style={{ backgroundColor: "#fff8e6", color: "#f59e0b", border: "1px solid #f59e0b", fontFamily: "var(--font-poppins)" }}>
                Barcha ruxsatlar mavjud
              </span>
            )}
          </div>

          <div className="p-5 flex flex-col gap-6">
            {groups.map((g) => (
              <div key={g}>
                <div
                  className="flex items-center gap-3 mb-3 cursor-pointer"
                  onClick={() => toggleGroup(g)}
                >
                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: groupAllChecked(g) ? "#0e58a8" : groupSomeChecked(g) ? "#f6f9ff" : "#f6f9ff", border: `1.5px solid ${groupAllChecked(g) ? "#0e58a8" : "rgba(1,41,112,0.2)"}` }}>
                    {groupAllChecked(g) ? <Check className="w-3 h-3 text-white" /> : groupSomeChecked(g) ? <Minus className="w-3 h-3" style={{ color: "#7293b9" }} /> : null}
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{g}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pl-8">
                  {groupPerms(g).map((p) => {
                    const checked = perms[activeRole].has(p.key)
                    return (
                      <label
                        key={p.key}
                        className="flex items-center gap-3 p-3 rounded-[8px] cursor-pointer transition-colors"
                        style={{ backgroundColor: checked ? "rgba(14,88,168,0.04)" : "#f6f9ff", border: `1px solid ${checked ? "rgba(14,88,168,0.2)" : "rgba(1,41,112,0.06)"}` }}
                        onClick={() => toggle(p.key)}
                      >
                        <div className="w-4 h-4 rounded shrink-0 flex items-center justify-center" style={{ backgroundColor: checked ? "#0e58a8" : "#fff", border: `1.5px solid ${checked ? "#0e58a8" : "rgba(1,41,112,0.2)"}` }}>
                          {checked && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{p.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {activeRole !== "super_admin" && (
            <div className="p-5 flex justify-end" style={{ borderTop: "1px solid rgba(1,41,112,0.1)" }}>
              <button className="px-6 py-2.5 rounded-[5px] text-white text-sm font-medium" style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                Saqlash
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
