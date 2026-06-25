"use client"

import { useEffect, useState, useMemo } from "react"
import { Search, ChevronDown, UserCheck, Shield, BookOpen, Ban, Clock, RefreshCw } from "lucide-react"
import { adminApi, type AdminUser } from "@/lib/api"

const ROLE_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  admin:   { label: "Admin",     bg: "#fef2f2", color: "#b91c1c", icon: Shield },
  teacher: { label: "O'qituvchi", bg: "#f0fdf4", color: "#15803d", icon: BookOpen },
  student: { label: "Talaba",    bg: "#eef4ff", color: "#0e58a8", icon: UserCheck },
  blocked: { label: "Bloklangan", bg: "#f1f5f9", color: "#64748b", icon: Ban },
  pending: { label: "Kutilmoqda", bg: "#fffbeb", color: "#92400e", icon: Clock },
}

const LMS_ROLES = ["admin", "teacher", "student", "blocked", "pending"]
const HEMIS_ROLE_LABEL: Record<string, string> = {
  employee: "Xodim", student: "Talaba", super_admin: "Super Admin", api: "API User",
}

function RoleBadge({ role, auto }: { role: string | null; auto?: boolean }) {
  if (!role) return <span className="text-xs" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>—</span>
  const cfg = ROLE_CONFIG[role] ?? { label: role, bg: "#f1f5f9", color: "#64748b", icon: Clock }
  const Icon = cfg.icon
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: cfg.bg, color: cfg.color, fontFamily: "var(--font-poppins)" }}>
      <Icon className="w-3 h-3" />
      {cfg.label}
      {auto && <span className="opacity-60 ml-0.5">(auto)</span>}
    </span>
  )
}

function RoleDropdown({ current, onSet }: { current: string | null; onSet: (role: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-[6px] border transition-colors hover:bg-[#f0f5ff]"
        style={{ borderColor: "rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
        Rol berish <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-[8px] overflow-hidden min-w-[140px]"
            style={{ border: "1px solid rgba(1,41,112,0.12)", boxShadow: "0 4px 16px rgba(1,41,112,0.12)" }}>
            {LMS_ROLES.map(r => {
              const cfg = ROLE_CONFIG[r]
              const Icon = cfg.icon
              return (
                <button
                  key={r}
                  onClick={() => { onSet(r); setOpen(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-[#f0f5ff] transition-colors"
                  style={{
                    color: current === r ? "#0e58a8" : "#012970",
                    fontWeight: current === r ? 600 : 400,
                    fontFamily: "var(--font-poppins)",
                  }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function AdminFoydalanuvchilar() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [saving, setSaving] = useState<string | null>(null)

  const load = (q?: string, role?: string) => {
    setLoading(true)
    adminApi.users({ search: q ?? search, lms_role: role ?? roleFilter, limit: 200 })
      .then(res => { setUsers(res.data); setTotal(res.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(u =>
      u.fullName?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.hemisId?.includes(q)
    )
  }, [users, search])

  async function handleSetRole(user: AdminUser, role: string) {
    setSaving(user.hemisId)
    try {
      await adminApi.setRole(user.hemisId, role)
      setUsers(prev => prev.map(u => u.hemisId === user.hemisId ? { ...u, lmsRole: role } : u))
    } finally {
      setSaving(null)
    }
  }

  function formatDate(s: string) {
    if (!s) return "—"
    const d = new Date(s)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <div className="flex flex-col gap-5 p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Foydalanuvchilar
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Jami: {total} ta foydalanuvchi
          </p>
        </div>
        <button onClick={() => load()} className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px]"
          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <RefreshCw className="w-3.5 h-3.5" /> Yangilash
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-white"
          style={{ border: "1px solid rgba(1,41,112,0.15)" }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: "#7293b9" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ism, login, ID bo'yicha qidirish"
            className="outline-none bg-transparent text-sm w-56"
            style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
          />
        </label>

        <div className="flex items-center gap-1">
          {["", "admin", "teacher", "student", "blocked", "pending"].map(r => (
            <button
              key={r || "all"}
              onClick={() => { setRoleFilter(r); load(search, r) }}
              className="text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors"
              style={{
                backgroundColor: roleFilter === r ? "#0e58a8" : "#eef4ff",
                color: roleFilter === r ? "#fff" : "#0e58a8",
                fontFamily: "var(--font-poppins)",
              }}>
              {r ? (ROLE_CONFIG[r]?.label ?? r) : "Barchasi"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[12px] overflow-hidden"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)", backgroundColor: "#f6f9ff" }}>
                  {["#", "To'liq ism", "HEMIS roli", "LMS roli", "Kontent", "So'nggi kirish", "Amal"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      Foydalanuvchilar topilmadi
                    </td>
                  </tr>
                ) : filtered.map((u, i) => (
                  <tr key={u.hemisId}
                    className="hover:bg-[#f6f9ff]/50 transition-colors"
                    style={{ borderBottom: "1px solid rgba(1,41,112,0.05)" }}>
                    <td className="px-4 py-3 text-xs" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                        {u.fullName || u.username || "—"}
                      </div>
                      {u.username && u.fullName && (
                        <div className="text-xs mt-0.5" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>
                          {u.username}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#f1f5f9", color: "#64748b", fontFamily: "var(--font-poppins)" }}>
                        {HEMIS_ROLE_LABEL[u.hemisRole] ?? u.hemisRole}
                      </span>
                      {u.hemisRoleCodes.filter(c => c !== u.hemisRole).map(c => (
                        <span key={c} className="ml-1 text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                          {c}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.lmsRole} auto={u.isAutoAdmin} />
                    </td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {u.contentCount > 0 ? u.contentCount : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {formatDate(u.lastSeen)}
                    </td>
                    <td className="px-4 py-3">
                      {u.isAutoAdmin ? (
                        <span className="text-xs italic" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>
                          Avtomatik admin
                        </span>
                      ) : saving === u.hemisId ? (
                        <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#0e58a8" }} />
                      ) : (
                        <RoleDropdown current={u.lmsRole} onSet={role => handleSetRole(u, role)} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
