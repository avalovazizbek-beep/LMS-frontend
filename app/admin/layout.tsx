"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Settings,
  ClipboardCheck,
  ClipboardList,
  BarChart3,
  BookCheck,
  RefreshCw,
  Megaphone,
  ArrowLeftRight,
  UsersRound,
  Repeat,
  ShieldHalf,
  MessageSquareText,
  Award,
  ChevronDown,
  PanelLeftClose,
  Sunrise,
  Sun,
  Moon,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { adminApi } from "@/lib/api"
import { IdleLogout } from "@/components/layout/IdleLogout"
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { ThemeToggle } from "@/components/theme-toggle"
import { AdminSearch } from "@/components/admin/AdminSearch"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { PersonAvatar } from "@/components/ui/PersonAvatar"
import "./admin.css"


const NAV = [
  { href: "/admin/dashboard", labelKey: "adminNav.dashboard", icon: LayoutDashboard },
  { href: "/admin/foydalanuvchilar", labelKey: "adminNav.users", icon: Users },
  { href: "/admin/talabalar", labelKey: "adminNav.students", icon: UsersRound },
  { href: "/admin/oqituvchilar", labelKey: "adminNav.teachers", icon: GraduationCap },
  { href: "/admin/hisobot", labelKey: "adminNav.results", icon: BarChart3 },
  { href: "/admin/davomatlar", labelKey: "adminNav.attendance", icon: ClipboardCheck },
  { href: "/admin/baholash", labelKey: "adminNav.grading", icon: BookCheck },
  { href: "/admin/qayta-urinish", labelKey: "adminNav.retries", icon: RefreshCw },
  { href: "/admin/oraliqlar", labelKey: "adminNav.midterms", icon: ClipboardList },
  { href: "/admin/qayta-oqish", labelKey: "adminNav.retake", icon: Repeat },
  { href: "/admin/face-id", labelKey: "adminNav.faceId", icon: ShieldAlert },
  { href: "/admin/elonlar", labelKey: "adminNav.announcements", icon: Megaphone },
  { href: "/admin/murojaatlar", labelKey: "adminNav.support", icon: MessageSquareText },
  { href: "/admin/ruxsatlar", labelKey: "adminNav.permissions", icon: ShieldHalf },
  { href: "/admin/tashakkurnomalar", labelKey: "adminNav.certificates", icon: Award },
  { href: "/admin/sozlamalar", labelKey: "adminNav.settings", icon: Settings },
]

/** Kun vaqtiga qarab salomlashish (yon menyu pastidagi karta) */
function useGreeting() {
  const [hour, setHour] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setHour(new Date().getHours())
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])
  if (hour === null) return { key: "adminNav.greetDay", icon: Sun }
  if (hour >= 5 && hour < 12) return { key: "adminNav.greetMorning", icon: Sunrise }
  if (hour >= 12 && hour < 18) return { key: "adminNav.greetDay", icon: Sun }
  return { key: "adminNav.greetEvening", icon: Moon }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()
  const greeting = useGreeting()
  const [checked, setChecked] = useState(false)
  const [adminName, setAdminName] = useState("")
  const [lmsRole, setLmsRole] = useState("")
  const [isAlsoEmployee, setIsAlsoEmployee] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = localStorage.getItem("lms_token")
    if (!token) { router.replace("/login"); return }

    adminApi.check()
      .then(res => {
        if (!res.isAdmin) { router.replace("/dashboard"); return }
        setAdminName(res.name)
        setLmsRole(res.lmsRole)
        // Admin huquqi HEMIS rolining ustiga qo'shiladi — shu odam ayni
        // paytda o'qituvchi (employee) ham bo'lishi mumkin. Shunday holatda
        // o'qituvchi paneliga qaytish tugmasi ko'rsatiladi.
        setIsAlsoEmployee(res.role === "employee")
        setChecked(true)
      })
      .catch(() => router.replace("/dashboard"))
  }, [router])

  // Mobilda 240px sidebar ekranning aksariyat qismini yeb qo'yardi (jadval
  // va statistika kartalari siqilib, o'qib bo'lmas holga kelardi) — talaba
  // paneli (`(dashboard)/layout.tsx`)dagi bilan bir xil naqsh: mobilda
  // yopiq boshlanadi, tugma bosilganda orqa fon bilan drawer sifatida ochiladi.
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)")
    const apply = () => {
      setIsMobile(mql.matches)
      setSidebarOpen(!mql.matches)
    }
    apply()
    mql.addEventListener("change", apply)
    return () => mql.removeEventListener("change", apply)
  }, [])

  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
    setUserMenuOpen(false)
  }, [pathname, isMobile])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  if (!checked) {
    return (
      <div className="admin-shell flex h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <ShieldCheck className="w-10 h-10 animate-pulse text-[var(--adm-accent)]" />
          <span className="text-sm font-medium text-[var(--adm-muted)]">
            {t("adminNav.checking")}
          </span>
        </div>
      </div>
    )
  }

  function logout() {
    localStorage.removeItem("lms_token")
    localStorage.removeItem("lms_role")
    router.replace("/login")
  }

  const roleLabel = lmsRole === "super_admin" ? t("header.roleSuperAdmin") : t("header.roleAdmin")
  const initial = (adminName.trim().charAt(0) || "A").toUpperCase()
  const shortName = adminName
    ? adminName.split(" ").filter(Boolean).slice(0, 2).map((w, i) => (i === 0 ? w : w.charAt(0) + ".")).join(" ")
    : roleLabel
  const GreetingIcon = greeting.icon

  return (
    <div className="admin-shell flex h-dvh overflow-hidden">
      <IdleLogout />
      {/* Mobilda sidebar ochiq bo'lsa — orqa fon, bosilsa yopiladi */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — desktopda kontentni suradi, mobilda ustidan qoplaydi (drawer) */}
      {sidebarOpen && (
        <aside className={`adm-sidebar h-dvh w-[252px] shrink-0 flex flex-col ${isMobile ? "fixed inset-y-0 left-0 z-50" : ""}`}>
          {/* Logo — bg-[#fff]: globals.css'dagi `.dark .bg-white` qoidasi doirani qoraytirmasin */}
          <div className="shrink-0 flex items-center gap-3 px-5 pt-5 pb-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff] shadow-[0_6px_16px_-6px_rgba(47,107,242,0.8)] ring-2 ring-[#2f6bf2]/40">
              <Image src="/logo.png" alt="SamISI" width={30} height={30} className="h-[30px] w-[30px] object-contain" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-bold leading-tight text-white">SamISI LMS</span>
              <span className="truncate text-[11px] text-[var(--adm-side-text)]">{t("adminNav.brandSubtitle")}</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label={t("adminNav.collapseMenu")}
              title={t("adminNav.collapseMenu")}
              className="shrink-0 rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
              {isMobile ? <X className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>

          {/* Nav — faqat shu qism suriladi; logo va pastki qism (chiqish) doim
              ko'rinadi. h-dvh: iPhone Safari'da pastki panel ostida qolmaydi. */}
          <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 py-2 flex flex-col gap-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
            {NAV.map(({ href, labelKey, icon: Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                  className="adm-nav-link flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium"
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">{t(labelKey)}</span>
                </Link>
              )
            })}
          </nav>

          {/* Salomlashish kartasi — past ekranlarda menyuga joy qoldirish uchun yashiriladi */}
          <div className="shrink-0 px-3.5 pt-3 [@media(max-height:720px)]:hidden">
            <div className="flex items-center gap-3 rounded-2xl px-3.5 py-3" style={{ backgroundColor: "var(--adm-side-card)", border: "1px solid var(--adm-side-border)" }}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2f6bf2] text-white shadow-[0_6px_14px_-6px_rgba(47,107,242,0.9)]">
                <GreetingIcon className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-[var(--adm-side-text)]">{t("adminNav.today")}</div>
                <div className="truncate text-[13px] font-semibold text-white">{t(greeting.key)}</div>
              </div>
            </div>
          </div>

          {/* User footer */}
          <div className="shrink-0 px-3.5 pt-3 pb-4">
            {isAlsoEmployee && (
              <Link
                href="/dashboard"
                className="adm-nav-link mb-1 flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-medium">
                <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t("adminNav.toTeacherPanel")}</span>
              </Link>
            )}
            <div className="flex items-center gap-3 px-2 pt-2" style={{ borderTop: "1px solid var(--adm-side-border)" }}>
              <PersonAvatar me className="h-10 w-10 rounded-full" style={{ boxShadow: "0 0 0 2px rgba(255,255,255,0.85)" }}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff] text-[15px] font-bold text-[#0e1d52]">
                  {initial}
                </div>
              </PersonAvatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-white" title={adminName}>{shortName}</div>
                <div className="truncate text-[11px] text-[var(--adm-side-text)]">{roleLabel}</div>
              </div>
              <button
                onClick={logout}
                aria-label={t("adminNav.logout")}
                title={t("adminNav.logout")}
                className="shrink-0 rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 h-dvh overflow-hidden">
        {/* Topbar */}
        <header className="shrink-0 flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-8 sm:py-4">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} aria-label={t("adminNav.openMenu")} className="adm-round-btn shrink-0">
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <AdminSearch items={NAV} />
          </div>
          <div className="shrink-0">
            <NotificationBell buttonClassName="adm-round-btn" />
          </div>
          <div className="hidden shrink-0 sm:block">
            <ThemeToggle className="adm-round-btn" />
          </div>
          <div className="shrink-0">
            <LanguageSwitcher buttonClassName="adm-round-btn !w-auto gap-1.5 px-3.5 text-xs font-semibold" />
          </div>

          <div className="hidden sm:block h-8 w-px shrink-0 bg-[var(--adm-border-strong)] mx-1" />

          {/* Foydalanuvchi menyusi */}
          <div ref={userMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setUserMenuOpen(o => !o)}
              aria-expanded={userMenuOpen}
              className="flex items-center gap-2.5 rounded-full p-1 pr-1 transition-opacity hover:opacity-85 sm:pr-2">
              <PersonAvatar me className="h-9 w-9 rounded-full shadow-[0_6px_14px_-6px_rgba(37,99,235,0.8)]">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#3b74f0] to-[#1e40af] text-sm font-bold text-white shadow-[0_6px_14px_-6px_rgba(37,99,235,0.8)]">
                  {initial}
                </span>
              </PersonAvatar>
              <span className="hidden max-w-[160px] truncate text-sm font-semibold text-[var(--adm-text)] sm:block">{shortName}</span>
              <ChevronDown className={`hidden h-4 w-4 text-[var(--adm-muted)] transition-transform sm:block ${userMenuOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.14 }}
                  className="adm-pop absolute right-0 top-[calc(100%+8px)] z-50 w-[230px] overflow-hidden">
                  <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                    <p className="truncate text-sm font-semibold text-[var(--adm-text)]">{adminName || roleLabel}</p>
                    <p className="mt-0.5 text-xs text-[var(--adm-muted)]">{roleLabel}</p>
                  </div>
                  {isAlsoEmployee && (
                    <Link href="/dashboard"
                      className="adm-hover-row flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--adm-text)]">
                      <ArrowLeftRight className="h-4 w-4 text-[var(--adm-muted)]" />
                      {t("adminNav.toTeacherPanel")}
                    </Link>
                  )}
                  <button onClick={logout}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--adm-down)] transition-colors hover:bg-[color-mix(in_srgb,var(--adm-down)_8%,transparent)]">
                    <LogOut className="h-4 w-4" />
                    {t("adminNav.logout")}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
