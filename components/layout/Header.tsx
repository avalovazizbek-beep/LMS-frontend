"use client"

import { useEffect, useRef, useState } from "react"
import { Bell, Menu, ChevronDown, LogOut, User as UserIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { authApi, hemisApi, notificationsApi, HemisStudent } from "@/lib/api"
import { useApi } from "@/hooks/useApi"

interface HeaderProps { onMenuClick?: () => void }

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: meData }    = useApi(() => authApi.me())
  const { data: hemisData } = useApi(() => {
    if (typeof window !== "undefined" && localStorage.getItem("lms_role") === "student") {
      return hemisApi.me()
    }
    return Promise.resolve(null)
  })
  const { data: notifData } = useApi(() => {
    if (typeof window !== "undefined" && localStorage.getItem("lms_role")) {
      return Promise.resolve({ success: true, data: [], unread: 0 })
    }
    return notificationsApi.getAll()
  })

  const adminUser  = meData?.user
  const hemisUser  = (hemisData as { success: boolean; data: HemisStudent } | null)?.data
  const unread     = notifData?.unread ?? 0

  const fullName = hemisUser?.full_name || adminUser?.fullName || ""

  const initial     = fullName.charAt(0).toUpperCase() || "U"
  const displayName = fullName
    ? fullName.split(" ").slice(0, 2).map((w: string, i: number) => i === 0 ? w : w.charAt(0) + ".").join(" ")
    : (adminUser?.username ?? "Foydalanuvchi")

  const user = adminUser

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
    router.push("/login")
  }

  return (
    <header className="flex w-full items-center justify-between bg-white px-5 py-[22px]"
      style={{ borderBottom: "1px solid rgba(1,41,112,0.1)" }}>

      {/* Chapdan: Menu */}
      <button type="button" aria-label="Open menu" onClick={onMenuClick}
        className="flex h-[30px] w-[30px] items-center justify-center transition-opacity hover:opacity-70">
        <Menu className="h-6 w-6 text-[#012970]" />
      </button>

      {/* O'ngdan: Bildirishnoma + Avatar + Dropdown */}
      <div className="flex items-center gap-4">

        {/* Bildirishnoma */}
        <button type="button" aria-label="Notifications"
          onClick={() => router.push("/xabarnoma")}
          className="relative transition-opacity hover:opacity-70">
          <Bell className="h-6 w-6 text-[#012970]" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#1cc2dc] px-1">
              <span className="text-[9px] font-medium text-white" style={{ fontFamily: "var(--font-poppins)" }}>
                {unread > 99 ? "99+" : unread}
              </span>
            </span>
          )}
        </button>

        {/* Foydalanuvchi dropdown */}
        <div ref={ref} className="relative">
          <button type="button" onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0e58a8] text-sm font-semibold text-white">
              {initial}
            </div>
            <span className="text-sm font-normal text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>
              {displayName}
            </span>
            <ChevronDown className={`h-4 w-4 text-[#012970] transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[180px] overflow-hidden rounded-[8px] bg-white"
                style={{ boxShadow: "0 4px 24px rgba(1,41,112,0.15)", border: "1px solid rgba(1,41,112,0.1)" }}>

                {/* Foydalanuvchi ma'lumoti */}
                <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
                  <p className="text-sm font-medium text-[#012970]" style={{ fontFamily: "var(--font-poppins)" }}>
                    {user?.fullName ?? "Admin"}
                  </p>
                  <p className="text-xs text-[#7293b9] mt-0.5" style={{ fontFamily: "var(--font-poppins)" }}>
                    {user?.role === "super_admin" ? "Super Admin" : user?.role ?? "Admin"}
                  </p>
                </div>

                {/* Profilga o'tish */}
                <button onClick={() => { setOpen(false) }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[#f6f9ff] transition-colors"
                  style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  <UserIcon className="h-4 w-4 text-[#7293b9]" />
                  Profil
                </button>

                {/* Chiqish */}
                <button onClick={logout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors"
                  style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }}>
                  <LogOut className="h-4 w-4" />
                  Chiqish
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
