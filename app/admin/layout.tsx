"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
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
} from "lucide-react"
import { adminApi } from "@/lib/api"

const NAV = [
  { href: "/admin/dashboard", label: "Boshqaruv paneli", icon: LayoutDashboard },
  { href: "/admin/foydalanuvchilar", label: "Foydalanuvchilar", icon: Users },
  { href: "/admin/oqituvchilar", label: "O'qituvchi hisoboti", icon: GraduationCap },
  { href: "/admin/hisobot", label: "Natijalar jurnali", icon: BarChart3 },
  { href: "/admin/davomatlar", label: "Davomatlar", icon: ClipboardCheck },
  { href: "/admin/baholash", label: "Baholashlar", icon: BookCheck },
  { href: "/admin/face-id", label: "Face ID so'rovlari", icon: ShieldAlert },
  { href: "/admin/sozlamalar", label: "Sozlamalar", icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)
  const [adminName, setAdminName] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem("lms_token")
    if (!token) { router.replace("/login"); return }

    adminApi.check()
      .then(res => {
        if (!res.isAdmin) { router.replace("/dashboard"); return }
        setAdminName(res.name)
        setChecked(true)
      })
      .catch(() => router.replace("/dashboard"))
  }, [router])

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#f0f5ff" }}>
        <div className="flex flex-col items-center gap-3">
          <ShieldCheck className="w-10 h-10 animate-pulse" style={{ color: "#0e58a8" }} />
          <span className="text-sm font-medium" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Admin huquqlari tekshirilmoqda…
          </span>
        </div>
      </div>
    )
  }

  function logout() {
    sessionStorage.removeItem("lms_token")
    sessionStorage.removeItem("lms_role")
    router.replace("/login")
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#f0f5ff" }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="h-screen w-[240px] shrink-0 flex flex-col" style={{ backgroundColor: "#012970" }}>
          {/* Logo */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="SamISI" className="w-8 h-8 rounded-full object-cover shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-poppins)" }}>
                  SamISI Admin
                </span>
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-poppins)" }}>Boshqaruv paneli</span>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
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
                  {label}
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                </Link>
              )
            })}
          </nav>

          {/* User footer */}
          <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="text-xs font-medium mb-3 truncate" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-poppins)" }}>
              {adminName || "Admin"}
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-[6px] w-full hover:bg-white/10 transition-colors"
              style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-poppins)" }}>
              <LogOut className="w-3.5 h-3.5" />
              Chiqish
            </button>
          </div>
        </aside>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        {/* Topbar */}
        <header className="shrink-0 flex items-center gap-3 px-6 py-3 bg-white"
          style={{ borderBottom: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 1px 4px rgba(1,41,112,0.06)" }}>
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-[6px] hover:bg-[#f0f5ff] transition-colors">
              <Menu className="w-5 h-5" style={{ color: "#7293b9" }} />
            </button>
          )}
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            <ShieldCheck className="w-4 h-4" style={{ color: "#0e58a8" }} />
            {NAV.find(n => pathname.startsWith(n.href))?.label ?? "Admin Panel"}
          </div>
          <div className="ml-auto text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {adminName}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
