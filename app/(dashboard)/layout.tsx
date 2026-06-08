"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname, useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [checkedAuth, setCheckedAuth] = useState(false)
  const pathname = usePathname()
  const isMeetingRoute = pathname === "/meeting"

  useEffect(() => {
    const token = sessionStorage.getItem("lms_token")
    localStorage.removeItem("lms_token")
    localStorage.removeItem("lms_role")

    if (!token) {
      router.replace("/login")
      return
    }

    const id = window.setTimeout(() => setCheckedAuth(true), 0)
    return () => window.clearTimeout(id)
  }, [router])

  if (!checkedAuth) return null

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--lms-bg)" }}
    >
      {/* Sidebar вЂ” fixed height, slides in/out */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="h-screen shrink-0"
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content вЂ” fills remaining width, scrolls independently */}
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={
              isMeetingRoute
                ? "flex-1 overflow-hidden"
                : "flex-1 overflow-y-auto"
            }
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  )
}
