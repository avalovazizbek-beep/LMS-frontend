"use client"

import { useEffect, useRef, useState } from "react"
import { Menu, ChevronDown, LogOut, User as UserIcon, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { authApi, hemisApi, adminApi, HemisEmployee, HemisStudent } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { useLanguage } from "@/lib/i18n/LanguageContext"

interface HeaderProps { onMenuClick?: () => void }

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Bir odam ham o'qituvchi, ham admin bo'lishi mumkin (admin huquqi
  // HEMIS rolining ustiga qo'shiladi) — shunday holatda dropdown'da admin
  // panelga o'tish tugmasi ham chiqishi kerak.
  useEffect(() => {
    adminApi.check().then(res => setIsAdmin(res.isAdmin)).catch(() => {})
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => setRole(localStorage.getItem("lms_role")), 0)
    return () => window.clearTimeout(id)
  }, [])

  const { data: meData }    = useApi(() => authApi.me())
  const { data: hemisData } = useApi<{ success: boolean; data: HemisStudent | HemisEmployee } | null>(() => {
    if (role === "student") {
      return hemisApi.me()
    }
    if (role === "employee") {
      return hemisApi.employeeMe()
    }
    return Promise.resolve(null)
  }, [role])
  const adminUser  = meData?.user
  const hemisUser  = (hemisData as { success: boolean; data: HemisStudent | HemisEmployee } | null)?.data

  const fullName = hemisUser?.full_name || adminUser?.fullName || ""
  const userRoleLabel =
    role === "student"
      ? t("common.student")
      : role === "employee"
        ? t("common.teacher")
        : adminUser?.role === "super_admin"
          ? t("header.roleSuperAdmin")
          : t("header.roleAdmin")

  const initial     = fullName.charAt(0).toUpperCase() || "U"
  const displayName = fullName
    ? fullName.split(" ").slice(0, 2).map((w: string, i: number) => i === 0 ? w : w.charAt(0) + ".").join(" ")
    : (adminUser?.username ?? t("common.user"))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const logout = () => {
    localStorage.removeItem("lms_token")
    localStorage.removeItem("lms_role")
    sessionStorage.removeItem("lms_token")
    sessionStorage.removeItem("lms_role")
    localStorage.removeItem("_hemis_sem")
    localStorage.removeItem("_hemis_sem_v2")
    sessionStorage.removeItem("hemis_oauth_state")
    sessionStorage.removeItem("hemis_oauth_role")
    sessionStorage.removeItem("hemis_oauth_redirect_uri")
    router.push("/login")
  }

  return (
    <header className="flex w-full items-center justify-between bg-[var(--lms-cell)] px-5 py-[22px]"
      style={{ borderBottom: "1px solid var(--lms-border)" }}>

      {/* Chapdan: Menu */}
      <button type="button" aria-label={t("header.openMenu")} onClick={onMenuClick}
        className="flex h-[30px] w-[30px] items-center justify-center transition-opacity hover:opacity-70">
        <Menu className="h-6 w-6 text-[var(--lms-primary)]" />
      </button>

      {/* O'ngdan: Bildirishnoma + Avatar + Dropdown */}
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <ThemeToggle />

        {/* Bildirishnoma */}
        <NotificationBell />

        {/* Foydalanuvchi dropdown */}
        <div ref={ref} className="relative">
          <button type="button" onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--lms-button)] text-sm font-semibold text-white">
              {initial}
            </div>
            <span className="text-sm font-normal text-[var(--lms-primary)]" style={{ fontFamily: "var(--font-poppins)" }}>
              {displayName}
            </span>
            <ChevronDown className={`h-4 w-4 text-[var(--lms-primary)] transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[180px] overflow-hidden rounded-[8px] bg-[var(--lms-cell)]"
                style={{ boxShadow: "var(--lms-shadow)", border: "1px solid var(--lms-border)" }}>

                {/* Foydalanuvchi ma'lumoti */}
                <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--lms-border)" }}>
                  <p className="text-sm font-medium text-[var(--lms-primary)]" style={{ fontFamily: "var(--font-poppins)" }}>
                    {fullName || t("common.user")}
                  </p>
                  <p className="text-xs text-[var(--lms-muted)] mt-0.5" style={{ fontFamily: "var(--font-poppins)" }}>
                    {userRoleLabel}
                  </p>
                </div>

                {/* Profilga o'tish */}
                <button onClick={() => { setOpen(false); router.push("/tizim/profil") }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--lms-primary)] hover:bg-[var(--lms-bg)] transition-colors"
                  style={{ fontFamily: "var(--font-poppins)" }}>
                  <UserIcon className="h-4 w-4 text-[var(--lms-muted)]" />
                  {t("header.profile")}
                </button>

                {/* Admin huquqi bo'lganlar uchun — admin panelga o'tish */}
                {isAdmin && (
                  <button onClick={() => { setOpen(false); router.push("/admin/dashboard") }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--lms-primary)] hover:bg-[var(--lms-bg)] transition-colors"
                    style={{ fontFamily: "var(--font-poppins)" }}>
                    <ShieldCheck className="h-4 w-4 text-[var(--lms-muted)]" />
                    {t("header.toAdminPanel")}
                  </button>
                )}

                {/* Chiqish */}
                <button onClick={logout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors"
                  style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }}>
                  <LogOut className="h-4 w-4" />
                  {t("header.logout")}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
