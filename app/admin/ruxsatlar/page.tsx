"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw, ShieldHalf, Eye, Plus, Pencil, Trash2, Lock, UserPlus, UserMinus, Search, Users, Sparkles, Loader2 } from "lucide-react"
import {
  adminApi,
  MANAGED_ADMIN_ROLES,
  type AdminModule,
  type AdminPanelRole,
  type ManagedAdminRole,
  type ModulePermission,
  type AdminRoleMember,
  type AdminRoleSuggestion,
  type AdminRoleCandidate,
} from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"

// Modul nomlari admin menyusi bilan bir xil kalitlardan olinadi
const MODULE_LABEL_KEYS: Record<AdminModule, string> = {
  users: "adminNav.users",
  students: "adminNav.students",
  teachers: "adminNav.teachers",
  results: "adminNav.results",
  attendance: "adminNav.attendance",
  grading: "adminNav.grading",
  retake: "adminNav.retries",
  reedu: "adminNav.retake",
  faceid: "adminNav.faceId",
  announcements: "adminNav.announcements",
  surveys: "adminNav.surveys",
  settings: "adminNav.settings",
  permissions: "adminNav.permissions",
}

const ACTIONS: { key: keyof Pick<ModulePermission, "canView" | "canCreate" | "canEdit" | "canDelete">; label: string; icon: typeof Eye }[] = [
  { key: "canView", label: "adminPerm.view", icon: Eye },
  { key: "canCreate", label: "adminPerm.create", icon: Plus },
  { key: "canEdit", label: "adminPerm.edit", icon: Pencil },
  { key: "canDelete", label: "adminPerm.delete", icon: Trash2 },
]

const ROLE_LABEL_KEY: Record<AdminPanelRole, string> = {
  dean: "adminPerm.roleDean",
  prorector: "adminPerm.roleProrector",
  quality: "adminPerm.roleQuality",
  methodist: "adminPerm.roleMethodist",
  admin: "adminPerm.roleAdmin",
}
/** Foydalanuvchilar sahifasidagi rol nomlari (tavsiyadagi "Hozir: …" uchun) */
const USER_ROLE_LABEL_KEY: Record<string, string> = {
  admin: "adminFoydalanuvchilar.roleAdmin",
  dean: "adminFoydalanuvchilar.roleDean",
  prorector: "adminFoydalanuvchilar.roleProrector",
  quality: "adminFoydalanuvchilar.roleQuality",
  methodist: "adminFoydalanuvchilar.roleMethodist",
  teacher: "adminFoydalanuvchilar.roleTeacher",
  student: "adminFoydalanuvchilar.roleStudent",
  blocked: "adminFoydalanuvchilar.roleBlocked",
  pending: "adminFoydalanuvchilar.rolePending",
}
const FONT = { fontFamily: "var(--font-poppins)" } as const

export default function RuxsatlarBoshqaruvi() {
  const { t } = useLanguage()
  const [modules, setModules] = useState<AdminModule[]>([])
  const [roles, setRoles] = useState<Record<AdminPanelRole, ModulePermission[]> | null>(null)
  const [loading, setLoading] = useState(true)
  const [canEditGrid, setCanEditGrid] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [role, setRole] = useState<AdminPanelRole>("dean")

  function load() {
    setLoading(true)
    Promise.all([adminApi.permissions(), adminApi.check()])
      .then(([permRes, checkRes]) => {
        setModules(permRes.data.modules)
        setRoles(permRes.data.roles)
        setCanEditGrid(checkRes.lmsRole === "admin")
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function toggle(mod: AdminModule, action: keyof Pick<ModulePermission, "canView" | "canCreate" | "canEdit" | "canDelete">) {
    if (!roles || !canEditGrid) return
    const current = roles[role]?.find(p => p.module === mod)
    if (!current) return
    const next = { ...current, [action]: !current[action] }
    const key = `${role}:${mod}:${action}`
    setSavingKey(key)
    setRoles(prev => prev ? { ...prev, [role]: prev[role].map(p => p.module === mod ? next : p) } : prev)
    try {
      await adminApi.setPermission(role, mod, {
        canView: next.canView, canCreate: next.canCreate, canEdit: next.canEdit, canDelete: next.canDelete,
      })
    } catch {
      // xato bo'lsa qayta yuklab, haqiqiy holatga qaytaramiz
      load()
    } finally {
      setSavingKey(null)
    }
  }

  // So'rovnomalarni faqat admin va dekanat boshqaradi — boshqa rollarda bu qator yopiq
  const surveysClosed = role !== "admin" && role !== "dean"

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold" style={{ color: "#012970", ...FONT }}>
            {t("adminPerm.title")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", ...FONT }}>
            {t("adminPerm.subtitle")}
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px]"
          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", ...FONT }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </button>
      </div>

      {!canEditGrid && !loading && (
        <div className="rounded-[10px] p-4 flex items-center gap-3" style={{ backgroundColor: "#fff8e6" }}>
          <Lock className="w-4 h-4 shrink-0" style={{ color: "#92400e" }} />
          <p className="text-sm" style={{ color: "#92400e", ...FONT }}>
            {t("adminPerm.readOnly")}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {([...MANAGED_ADMIN_ROLES, "admin"] as AdminPanelRole[]).map(r => (
          <button key={r} onClick={() => setRole(r)}
            className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-[8px] transition-colors"
            style={{
              backgroundColor: role === r ? "#0e58a8" : "#eef4ff",
              color: role === r ? "#fff" : "#0e58a8",
              ...FONT,
            }}>
            <ShieldHalf className="w-3.5 h-3.5" />
            {t(ROLE_LABEL_KEY[r])}
          </button>
        ))}
      </div>

      <p className="text-xs" style={{ color: "#94a3b8", ...FONT }}>
        {role === "admin" ? t("adminPerm.adminNote") : t(`adminPerm.hint.${role}`)}
      </p>

      {role !== "admin" && (
        <RoleMembers key={role} role={role} roleLabel={t(ROLE_LABEL_KEY[role])} canManage={canEditGrid} />
      )}

      {loading || !roles ? (
        <div className="flex items-center justify-center py-20"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} /></div>
      ) : (
        <div className="bg-white rounded-[12px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)", backgroundColor: "#f6f9ff" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#1cc2dc", ...FONT }}>{t("adminPerm.module")}</th>
                {ACTIONS.map(a => (
                  <th key={a.key} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: "#1cc2dc", ...FONT }}>{t(a.label)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map(mod => {
                const perm = roles[role]?.find(p => p.module === mod)
                if (!perm) return null
                const closedRow = mod === "surveys" && surveysClosed
                return (
                  <tr key={mod} style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#012970", ...FONT }}>
                      {MODULE_LABEL_KEYS[mod] ? t(MODULE_LABEL_KEYS[mod]) : mod}
                      {closedRow && <div className="text-[11px] font-normal mt-0.5" style={{ color: "#94a3b8" }}>{t("adminPerm.surveysOnlyDean")}</div>}
                    </td>
                    {ACTIONS.map(a => {
                      const active = perm[a.key] && !closedRow
                      const disabled = !canEditGrid || role === "admin" || closedRow
                      const key = `${role}:${mod}:${a.key}`
                      return (
                        <td key={a.key} className="px-4 py-3 text-center">
                          <button onClick={() => toggle(mod, a.key)} disabled={disabled}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] transition-colors disabled:cursor-not-allowed"
                            style={{
                              backgroundColor: active ? "#f0fdf4" : "#f1f5f9",
                              color: active ? "#22c55e" : "#94a3b8",
                              opacity: disabled && role !== "admin" ? 0.7 : 1,
                            }}>
                            {savingKey === key ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <a.icon className="w-4 h-4" />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Shu roldagi xodimlar + HEMIS bo'yicha tavsiya + qidirib qo'shish ─────
   HEMIS'da prorektor / ta'lim sifati / o'quv-uslubiy bo'lim alohida rol
   emas (lavozim va bo'lim) — tavsiya shu bo'yicha, rolni admin beradi. */
function RoleMembers({ role, roleLabel, canManage }: { role: ManagedAdminRole; roleLabel: string; canManage: boolean }) {
  const { t } = useLanguage()
  const [members, setMembers] = useState<AdminRoleMember[]>([])
  const [suggestions, setSuggestions] = useState<AdminRoleSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [candidates, setCandidates] = useState<AdminRoleCandidate[] | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminApi.roleMembers(role)
      .then((res) => { setMembers(res.data.members); setSuggestions(res.data.suggestions) })
      .catch((e) => setError(e instanceof Error ? e.message : t("common.error")))
      .finally(() => setLoading(false))
  }, [role, t])

  useEffect(() => { load() }, [load])

  // Qidiruv (kamida 2 harf, biroz kutib)
  useEffect(() => {
    const q = query.trim()
    if (!canManage || q.length < 2) { setCandidates(null); return }
    const h = setTimeout(() => {
      adminApi.roleCandidates(q).then((res) => setCandidates(res.data)).catch(() => setCandidates([]))
    }, 300)
    return () => clearTimeout(h)
  }, [query, canManage])

  async function setUserRole(hemisId: string, next: string) {
    setBusyId(hemisId)
    setError(null)
    try {
      await adminApi.setRole(hemisId, next)
      setQuery("")
      setCandidates(null)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"))
    } finally {
      setBusyId(null)
    }
  }

  const roleName = (r: string | null) => (r && USER_ROLE_LABEL_KEY[r] ? t(USER_ROLE_LABEL_KEY[r]) : r ?? "")
  const sub = (p: { position: string | null; department: string | null }) => [p.position, p.department].filter(Boolean).join(" · ")

  return (
    <div className="bg-white rounded-[12px] p-4 sm:p-5 flex flex-col gap-4" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
      {error && <p className="text-sm px-3 py-2 rounded-[8px]" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", ...FONT }}>{error}</p>}

      {/* Shu roldagilar */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "#012970", ...FONT }}>
          <Users className="w-4 h-4" style={{ color: "#0e58a8" }} />
          {t("adminPerm.members.title", { n: members.length })}
        </h2>
        {loading ? (
          <div className="py-3"><Loader2 className="w-4 h-4 animate-spin" style={{ color: "#0e58a8" }} /></div>
        ) : members.length === 0 ? (
          <p className="text-sm" style={{ color: "#94a3b8", ...FONT }}>{t("adminPerm.members.empty")}</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {members.map((m) => (
              <div key={m.hemisId} className="flex items-center gap-3 px-3 py-2.5 rounded-[10px]" style={{ backgroundColor: "#f6f9ff", border: "1px solid #e5edf7" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0" style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}>
                  {m.fullName.trim().charAt(0) || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate" style={{ color: "#012970", ...FONT }}>{m.fullName}</div>
                  {sub(m) && <div className="text-xs truncate" style={{ color: "#7293b9", ...FONT }}>{sub(m)}</div>}
                </div>
                {canManage && (
                  <button
                    onClick={() => { if (window.confirm(t("adminPerm.members.removeConfirm", { name: m.fullName, role: roleLabel }))) void setUserRole(m.hemisId, "teacher") }}
                    disabled={busyId === m.hemisId}
                    title={t("adminPerm.members.remove")}
                    className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-[8px] disabled:opacity-50"
                    style={{ color: "#dc2626", backgroundColor: "#fff", border: "1px solid #fecaca", ...FONT }}>
                    {busyId === m.hemisId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                    {t("adminPerm.members.remove")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* HEMIS bo'yicha tavsiya */}
      <section className="flex flex-col gap-2 pt-3" style={{ borderTop: "1px solid #eef3fa" }}>
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "#012970", ...FONT }}>
          <Sparkles className="w-4 h-4" style={{ color: "#d97706" }} />
          {t("adminPerm.suggest.title", { n: suggestions.length })}
        </h2>
        <p className="text-xs" style={{ color: "#7293b9", ...FONT }}>{t("adminPerm.suggest.hint")}</p>
        {!loading && suggestions.length === 0 ? (
          <p className="text-sm" style={{ color: "#94a3b8", ...FONT }}>{t("adminPerm.suggest.empty")}</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {suggestions.map((s, i) => (
              <div key={s.hemisId ?? `x${i}`} className="flex items-center gap-3 px-3 py-2.5 rounded-[10px]" style={{ border: "1px dashed #d8e6f7" }}>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate" style={{ color: "#012970", ...FONT }}>{s.fullName}</div>
                  <div className="text-xs truncate" style={{ color: "#7293b9", ...FONT }}>{sub(s)}</div>
                  {s.currentRole && <div className="text-[11px]" style={{ color: "#94a3b8", ...FONT }}>{t("adminPerm.currentRole", { role: roleName(s.currentRole) })}</div>}
                </div>
                {!s.loggedIn ? (
                  <span className="text-[11px] text-right max-w-[160px]" style={{ color: "#94a3b8", ...FONT }}>{t("adminPerm.notLoggedIn")}</span>
                ) : canManage && s.hemisId ? (
                  <button onClick={() => void setUserRole(s.hemisId!, role)} disabled={busyId === s.hemisId}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-[8px] disabled:opacity-50"
                    style={{ color: "#fff", backgroundColor: "#0e58a8", ...FONT }}>
                    {busyId === s.hemisId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    {t("adminPerm.grant")}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Boshqa xodimni qidirib qo'shish */}
      {canManage && (
        <section className="flex flex-col gap-2 pt-3" style={{ borderTop: "1px solid #eef3fa" }}>
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "#012970", ...FONT }}>
            <UserPlus className="w-4 h-4" style={{ color: "#0e58a8" }} />
            {t("adminPerm.add.title")}
          </h2>
          <label className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] max-w-[520px]" style={{ border: "1px solid #d8e6f7" }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: "#7293b9" }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("adminPerm.add.ph")}
              className="w-full bg-transparent text-sm outline-none" style={{ color: "#012970", ...FONT }} />
          </label>
          {candidates && (
            candidates.length === 0 ? (
              <p className="text-sm" style={{ color: "#94a3b8", ...FONT }}>{t("adminPerm.add.none")}</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-w-[720px]">
                {candidates.map((c) => (
                  <div key={c.hemisId} className="flex items-center gap-3 px-3 py-2 rounded-[10px]" style={{ backgroundColor: "#f8fbff", border: "1px solid #eef3fa" }}>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate" style={{ color: "#012970", ...FONT }}>{c.fullName}</div>
                      <div className="text-xs truncate" style={{ color: "#7293b9", ...FONT }}>
                        {[sub(c), c.currentRole ? t("adminPerm.currentRole", { role: roleName(c.currentRole) }) : ""].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    {c.currentRole === role ? (
                      <span className="text-xs font-medium" style={{ color: "#15803d", ...FONT }}>✓ {roleLabel}</span>
                    ) : (
                      <button onClick={() => void setUserRole(c.hemisId, role)} disabled={busyId === c.hemisId}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-[8px] disabled:opacity-50"
                        style={{ color: "#fff", backgroundColor: "#0e58a8", ...FONT }}>
                        {busyId === c.hemisId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                        {t("adminPerm.grant")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </section>
      )}
    </div>
  )
}
