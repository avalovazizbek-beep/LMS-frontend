"use client"

import { useEffect, useState } from "react"
import { RefreshCw, ShieldHalf, Eye, Plus, Pencil, Trash2, Lock } from "lucide-react"
import { adminApi, type AdminModule, type ModulePermission } from "@/lib/api"
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
  settings: "adminNav.settings",
  permissions: "adminNav.permissions",
}

const ACTIONS: { key: keyof Pick<ModulePermission, "canView" | "canCreate" | "canEdit" | "canDelete">; label: string; icon: typeof Eye }[] = [
  { key: "canView", label: "adminPerm.view", icon: Eye },
  { key: "canCreate", label: "adminPerm.create", icon: Plus },
  { key: "canEdit", label: "adminPerm.edit", icon: Pencil },
  { key: "canDelete", label: "adminPerm.delete", icon: Trash2 },
]

export default function RuxsatlarBoshqaruvi() {
  const { t } = useLanguage()
  const [modules, setModules] = useState<AdminModule[]>([])
  const [roles, setRoles] = useState<Record<"admin" | "dean", ModulePermission[]> | null>(null)
  const [loading, setLoading] = useState(true)
  const [canEditGrid, setCanEditGrid] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [role, setRole] = useState<"admin" | "dean">("dean")

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
    const current = roles[role].find(p => p.module === mod)
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

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {t("adminPerm.title")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("adminPerm.subtitle")}
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px]"
          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </button>
      </div>

      {!canEditGrid && !loading && (
        <div className="rounded-[10px] p-4 flex items-center gap-3" style={{ backgroundColor: "#fff8e6" }}>
          <Lock className="w-4 h-4 shrink-0" style={{ color: "#92400e" }} />
          <p className="text-sm" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
            {t("adminPerm.readOnly")}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        {(["dean", "admin"] as const).map(r => (
          <button key={r} onClick={() => setRole(r)}
            className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-[8px] transition-colors"
            style={{
              backgroundColor: role === r ? "#0e58a8" : "#eef4ff",
              color: role === r ? "#fff" : "#0e58a8",
              fontFamily: "var(--font-poppins)",
            }}>
            <ShieldHalf className="w-3.5 h-3.5" />
            {r === "dean" ? t("adminPerm.roleDean") : t("adminPerm.roleAdmin")}
          </button>
        ))}
      </div>

      {role === "admin" && (
        <p className="text-xs" style={{ color: "#94a3b8", fontFamily: "var(--font-poppins)" }}>
          {t("adminPerm.adminNote")}
        </p>
      )}

      {loading || !roles ? (
        <div className="flex items-center justify-center py-20"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} /></div>
      ) : (
        <div className="bg-white rounded-[12px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.08)", backgroundColor: "#f6f9ff" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{t("adminPerm.module")}</th>
                {ACTIONS.map(a => (
                  <th key={a.key} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{t(a.label)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map(mod => {
                const perm = roles[role].find(p => p.module === mod)
                if (!perm) return null
                return (
                  <tr key={mod} style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{MODULE_LABEL_KEYS[mod] ? t(MODULE_LABEL_KEYS[mod]) : mod}</td>
                    {ACTIONS.map(a => {
                      const active = perm[a.key]
                      const disabled = !canEditGrid || role === "admin"
                      const key = `${role}:${mod}:${a.key}`
                      return (
                        <td key={a.key} className="px-4 py-3 text-center">
                          <button onClick={() => toggle(mod, a.key)} disabled={disabled}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] transition-colors disabled:cursor-not-allowed"
                            style={{
                              backgroundColor: active ? "#f0fdf4" : "#f1f5f9",
                              color: active ? "#22c55e" : "#94a3b8",
                              opacity: disabled && role === "dean" ? 0.7 : 1,
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
