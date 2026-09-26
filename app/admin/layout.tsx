"use client"

import { useEffect, useState } from "react"
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
  ChevronRight,
  ShieldCheck,
  Settings,
  ClipboardCheck,
  BarChart3,
  BookCheck,
  RefreshCw,
  Megaphone,
  ArrowLeftRight,
  UsersRound,
  Repeat,
  ShieldHalf,
  History,
  MessageSquareText,
} from "lucide-react"
import { adminApi } from "@/lib/api"
import { IdleLogout } from "@/components/layout/IdleLogout"
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { useLanguage } from "@/lib/i18n/LanguageContext"


const NAV = [
  { href: "/admin/dashboard", labelKey: "adminNav.dashboard", icon: LayoutDashboard },
  { href: "/admin/foydalanuvchilar", labelKey: "adminNav.users", icon: Users },
  { href: "/admin/talabalar", labelKey: "adminNav.students", icon: UsersRound },
  { href: "/admin/oqituvchilar", labelKey: "adminNav.teachers", icon: GraduationCap },
  { href: "/admin/hisobot", labelKey: "adminNav.results", icon: BarChart3 },
  { href: "/admin/davomatlar", labelKey: "adminNav.attendance", icon: ClipboardCheck },
  { href: "/admin/baholash", labelKey: "adminNav.grading", icon: BookCheck },
  { href: "/admin/qayta-urinish", labelKey: "adminNav.retries", icon: RefreshCw },
  { href: "/admin/qayta-oqish", labelKey: "adminNav.retake", icon: Repeat },
  { href: "/admin/face-id", labelKey: "adminNav.faceId", icon: ShieldAlert },
  { href: "/admin/elonlar", labelKey: "adminNav.announcements", icon: Megaphone },
  { href: "/admin/murojaatlar", labelKey: "adminNav.support", icon: MessageSquareText },
  { href: "/admin/ruxsatlar", labelKey: "adminNav.permissions", icon: ShieldHalf },
  { href: "/admin/audit-log", labelKey: "adminNav.auditLog", icon: History },
  { href: "/admin/sozlamalar", labelKey: "adminNav.settings", icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()
  const [checked, setChecked] = useState(false)
  const [adminName, setAdminName] = useState("")
  const [isAlsoEmployee, setIsAlsoEmployee] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("lms_token")
    if (!token) { router.replace("/login"); return }

    adminApi.check()
      .then(res => {
        if (!res.isAdmin) { router.replace("/dashboard"); return }
        setAdminName(res.name)
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
  }, [pathname, isMobile])

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#f0f5ff" }}>
        <div className="flex flex-col items-center gap-3">
          <ShieldCheck className="w-10 h-10 animate-pulse" style={{ color: "#0e58a8" }} />
          <span className="text-sm font-medium" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
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

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#f0f5ff" }}>
      <IdleLogout />
      {/* Mobilda sidebar ochiq bo'lsa — orqa fon, bosilsa yopiladi */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — desktopda kontentni suradi, mobilda ustidan qoplaydi (drawer) */}
      {sidebarOpen && (
        <aside
          className={`h-screen w-[240px] shrink-0 flex flex-col ${isMobile ? "fixed inset-y-0 left-0 z-50" : ""}`}
          style={{ backgroundColor: "#012970" }}
        >
          {/* Logo */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-2 min-w-0">
              <Image src="/logo.png" alt="SamISI" width={32} height={32} className="w-8 h-8 object-contain shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate" style={{ fontFamily: "var(--font-poppins)" }}>
                  SamISI Admin
                </span>
                <span className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-poppins)" }}>{t("adminNav.brandSubtitle")}</span>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="text-white/60 hover:text-white shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
            {NAV.map(({ href, labelKey, icon: Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: active ? "rgba(255,255,255,0.12)" : "transparent",
                    color: active ? "#fff" : "rgba(255,255,255,0.6)",
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {t(labelKey)}
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                </Link>
              )
            })}
          </nav>

          {/* User footer */}
          <div className="px-4 py-4 flex flex-col gap-1" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="text-xs font-medium mb-2 truncate" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-poppins)" }}>
              {adminName || t("header.roleAdmin")}
            </div>
            {isAlsoEmployee && (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-[6px] w-full hover:bg-white/10 transition-colors"
                style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-poppins)" }}>
                <ArrowLeftRight className="w-3.5 h-3.5" />
                {t("adminNav.toTeacherPanel")}
              </Link>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-[6px] w-full hover:bg-white/10 transition-colors"
              style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-poppins)" }}>
              <LogOut className="w-3.5 h-3.5" />
              {t("adminNav.logout")}
            </button>
          </div>
        </aside>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        {/* Topbar */}
        <header className="shrink-0 flex items-center gap-2 px-3 py-3 bg-white sm:gap-3 sm:px-6"
          style={{ borderBottom: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 1px 4px rgba(1,41,112,0.06)" }}>
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-[6px] hover:bg-[#f0f5ff] transition-colors shrink-0">
              <Menu className="w-5 h-5" style={{ color: "#7293b9" }} />
            </button>
          )}
          <div className="flex items-center gap-2 text-sm font-semibold min-w-0 flex-1" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: "#0e58a8" }} />
            <span className="truncate">{t(NAV.find(n => pathname.startsWith(n.href))?.labelKey ?? "adminNav.adminPanel")}</span>
          </div>
          <div className="ml-auto shrink-0">
            <LanguageSwitcher />
          </div>
          <div className="shrink-0">
            <NotificationBell />
          </div>
          <div className="hidden sm:block shrink-0 max-w-[220px] truncate text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {adminName}
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
