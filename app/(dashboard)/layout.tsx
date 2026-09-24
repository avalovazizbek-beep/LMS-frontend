"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname, useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { MeetingReminder } from "@/components/layout/MeetingReminder"
import { AnnouncementModal } from "@/components/layout/AnnouncementModal"
import { FaceReregisterModal } from "@/components/layout/FaceReregisterModal"
import { MeetingCallProvider, useMeetingCall } from "@/components/layout/MeetingCallContext"
import { IdleLogout } from "@/components/layout/IdleLogout"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MeetingCallProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </MeetingCallProvider>
  )
}

function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [checkedAuth, setCheckedAuth] = useState(false)
  const pathname = usePathname()
  const { inCall } = useMeetingCall()
  // Meeting sahifasida sidebar/header faqat HAQIQIY qo'ng'iroq (Call bosqichi)
  // paytida yashiriladi — lobby/prejoin bosqichlarida odatdagidek ko'rinadi.
  const isMeetingRoute = pathname === "/meeting" && inCall

  useEffect(() => {
    const token = localStorage.getItem("lms_token")

    if (!token) {
      router.replace("/login")
      return
    }

    const id = window.setTimeout(() => setCheckedAuth(true), 0)
    return () => window.clearTimeout(id)
  }, [router])

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

  // Sahifa almashganda mobil ekranda menyu avtomatik yopiladi
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [pathname, isMobile])

  if (!checkedAuth) return null

  // Online dars va imtihon paytida harakatsizlik hisoblanmaydi (talaba
  // shunchaki tinglayotgan yoki savol ustida o'ylayotgan bo'lishi mumkin)
  const idlePaused = inCall || /^\/(test|imtihonlar)\/[^/]+/.test(pathname)

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--lms-bg)" }}
    >
      <IdleLogout paused={idlePaused} />
      {!isMeetingRoute && <MeetingReminder />}
      {/* MeetingReminder bilan bir xil z-[5000] fixed overlay — bir nechtasi bir
          vaqtda chiqib qolsa (kamdan-kam), keyingisi DOM tartibida keyinroq
          turgani uchun ustida chiqadi. */}
      {!isMeetingRoute && <AnnouncementModal />}
      {!isMeetingRoute && <FaceReregisterModal />}

      {/* Mobilda menyu ochiq bo'lsa — orqa fon (backdrop), bosilsa yopiladi */}
      {!isMeetingRoute && (
        <AnimatePresence>
          {isMobile && sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>
      )}

      {/* Sidebar — desktopda kontentni suradi, mobilda ustidan qoplaydi (drawer).
          Meeting sahifasida umuman ko'rsatilmaydi — chaqiruv butun ekranni egallaydi. */}
      {!isMeetingRoute && (
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={isMobile ? "fixed inset-y-0 left-0 z-50 h-screen" : "h-screen shrink-0"}
            >
              <Sidebar onNavigate={() => isMobile && setSidebarOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Main content вЂ” fills remaining width, scrolls independently */}
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        {!isMeetingRoute && <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />}
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
