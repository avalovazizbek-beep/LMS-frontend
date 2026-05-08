"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen, RefreshCw, Wallet, User, Mail, Video,
  Settings, Search, ChevronDown, GraduationCap, LayoutDashboard,
} from "lucide-react"

type NavItem = { label: string; href: string }
type Section = {
  title: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  items: NavItem[]
}

const studentSections: Section[] = [
  {
    title: "O'quv reja",
    icon: BookOpen,
    items: [
      { label: "O'quv reja",        href: "/o-qish-rejasi" },
      { label: "Dars jadvali",      href: "/dars-jadvali" },
      { label: "Nazorat jadvali",   href: "/nazorat-jadvali" },
      { label: "Fanlar resurslari", href: "/fan-resurslari" },
      { label: "Topshiriqlar",      href: "/topshiriqlar" },
      { label: "Davomat",           href: "/davomat" },
      { label: "Davomat hisoboti",  href: "/davomat-hisoboti" },
      { label: "O'zlashtirish",     href: "/o-zlashtirish" },
      { label: "Shaxsiy qaydnoma",  href: "/shaxsiy-qaydnoma" },
      { label: "Imtihonlar",        href: "/imtihonlar" },
      { label: "Reyting daftarcha", href: "/reyting" },
      { label: "Fan tanlovi",       href: "/fan-tanlovi" },
    ],
  },
  {
    title: "Qayta o'qish",
    icon: RefreshCw,
    items: [
      { label: "Ariza qayta o'qish",       href: "/qayta-o-qish" },
      { label: "Q.O'qish mashg'ulotlari",  href: "/qayta-o-qish/mashgulotlar" },
      { label: "Q.O'qish nazorat jadvali", href: "/qayta-o-qish/nazorat-jadvali" },
      { label: "Q.O'qish o'zlashtirish",   href: "/qayta-o-qish/ozlashtirish" },
    ],
  },
  {
    title: "Talaba ma'lumoti",
    icon: User,
    items: [
      { label: "Rezyume",                   href: "/talaba-malumotlari" },
      { label: "Buyruqlar",                 href: "/talaba-malumotlari/buyruqlar" },
      { label: "Shartnomalar",              href: "/talaba-malumotlari/shartnomalar" },
      { label: "Ma'lumotnomalar",           href: "/talaba-malumotlari/malumotnomalar" },
      { label: "Talaba hujjati",            href: "/talaba-malumotlari/hujjat" },
      { label: "Bitiruv varaqa",            href: "/talaba-malumotlari/bitiruv-varaqa" },
      { label: "Talaba GPA bali",           href: "/talaba-malumotlari/gpa" },
      { label: "Fan sertifikatlari",        href: "/talaba-malumotlari/sertifikatlar" },
      { label: "Plagiat ma'lumotlari",      href: "/talaba-malumotlari/plagiat" },
      { label: "Shaxsiy ma'lumotlar",       href: "/talaba-malumotlari/shaxsiy" },
      { label: "Bitiruv ishi",              href: "/talaba-malumotlari/bitiruv-ishi" },
      { label: "Ijtimoiy faollik arizasi",  href: "/talaba-malumotlari/ijtimoiy-faollik" },
      { label: "Student Grant Application", href: "/talaba-malumotlari/grant" },
    ],
  },
  {
    title: "Moliyaviy to'lov",
    icon: Wallet,
    items: [
      { label: "Kontraktlar ro'yxati", href: "/moliyaviy" },
      { label: "Stipendiya hisobi",    href: "/moliyaviy/stipendiya" },
    ],
  },
  {
    title: "Xabarlar",
    icon: Mail,
    items: [
      { label: "Mening xabarlarim", href: "/xabarnoma" },
      { label: "Xabar yaratish",    href: "/xabarnoma/yaratish" },
    ],
  },
  {
    title: "Tizim",
    icon: Settings,
    items: [
      { label: "Profil",            href: "/tizim/profil" },
      { label: "Hemis so'rovnoma",  href: "/tizim/hemis" },
      { label: "Global so'rovnoma", href: "/tizim/global" },
      { label: "Kirish tarixi",     href: "/tizim/kirish-tarixi" },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  // Accordion: faqat bitta bo'lim ochiq bo'ladi
  const [openSection, setOpenSection] = useState<string | null>("O'quv reja")

  const toggle = (title: string) =>
    setOpenSection((prev) => (prev === title ? null : title))

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href))

  return (
    <aside
      className="flex flex-col w-[300px] h-screen bg-white shrink-0"
      style={{ boxShadow: "0px 0px 20px rgba(1,41,112,0.1)" }}
    >
      {/* Logo + Search — qotgan, scroll bo'lmaydi */}
      <div className="shrink-0 flex flex-col gap-4 px-[25px] pt-5 pb-3">
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: "#0e58a8" }}
          >
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className="font-semibold text-base leading-tight truncate"
              style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
            >
              LMS Portal
            </span>
            <span
              className="text-xs truncate"
              style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}
            >
              Ta&apos;lim Tizimi
            </span>
          </div>
        </motion.div>

        <form
          className="h-9 px-2.5 py-2 w-full bg-white rounded-[5px] border border-[#104475] flex items-center gap-2"
          role="search"
        >
          <Search className="w-[18px] h-[18px] text-[#104475] shrink-0" />
          <input
            type="search"
            placeholder="Search"
            className="flex-1 bg-transparent outline-none text-sm font-medium text-[#104475] placeholder:text-[#104475]"
            style={{ fontFamily: "var(--font-poppins)" }}
          />
        </form>
      </div>

      {/* Nav — scrollable */}
      <div className="flex-1 overflow-y-auto px-[25px] pb-4 min-h-0">
        <nav className="flex flex-col gap-0.5">

          {/* Dashboard */}
          <Link
            href="/dashboard"
            className="flex items-center gap-[15px] px-[15px] py-2.5 rounded-[5px] transition-colors group"
            style={{ backgroundColor: isActive("/dashboard") ? "#f6f9ff" : "transparent" }}
          >
            <LayoutDashboard
              className="w-[22px] h-[22px] shrink-0 transition-transform group-hover:scale-110"
              style={{ color: isActive("/dashboard") ? "#1cc2dc" : "#012970" }}
            />
            <span
              className="text-[14px] font-medium truncate"
              style={{
                color: isActive("/dashboard") ? "#1cc2dc" : "#012970",
                fontFamily: "var(--font-poppins)",
              }}
            >
              Dashboard
            </span>
          </Link>

          {/* Accordion sections */}
          {studentSections.map((section) => {
            const SectionIcon = section.icon
            const isOpen = openSection === section.title
            return (
              <div key={section.title}>
                {/* Header */}
                <button
                  onClick={() => toggle(section.title)}
                  className="flex items-center gap-[15px] w-full px-[15px] py-2.5 rounded-[5px] transition-colors hover:bg-[#f6f9ff]/60 mt-1 group"
                >
                  <SectionIcon
                    className="w-[22px] h-[22px] shrink-0 transition-transform group-hover:scale-110"
                    style={{ color: "#012970" }}
                  />
                  <span
                    className="flex-1 text-left text-[14px] font-medium"
                    style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
                  >
                    {section.title}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 0 : -90 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                  >
                    <ChevronDown className="w-4 h-4" style={{ color: "#7293b9" }} />
                  </motion.div>
                </button>

                {/* Items — accordion animatsiya */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="items"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="flex flex-col ml-[37px]">
                        {section.items.map((item, iIdx) => {
                          const active = isActive(item.href)
                          return (
                            <motion.div
                              key={item.href}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.18, delay: iIdx * 0.025 }}
                            >
                              <Link
                                href={item.href}
                                className="flex items-center gap-2.5 px-[15px] py-[7px] rounded-[5px] transition-all hover:bg-[#f6f9ff] group"
                                style={{ backgroundColor: active ? "#f6f9ff" : "transparent" }}
                              >
                                <motion.span
                                  className="w-[6px] h-[6px] rounded-full shrink-0"
                                  style={{
                                    backgroundColor: active ? "#1cc2dc" : "#7293b9",
                                    opacity: active ? 1 : 0.45,
                                  }}
                                  animate={{ scale: active ? 1.35 : 1 }}
                                  transition={{ duration: 0.2 }}
                                />
                                <span
                                  className="text-[13px] transition-colors group-hover:text-[#1cc2dc]"
                                  style={{
                                    color: active ? "#1cc2dc" : "#012970",
                                    fontFamily: "var(--font-poppins)",
                                    fontWeight: active ? 500 : 400,
                                  }}
                                >
                                  {item.label}
                                </span>
                              </Link>
                            </motion.div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}

          {/* Meeting — standalone */}
          <Link
            href="/meeting"
            className="flex items-center gap-[15px] px-[15px] py-2.5 rounded-[5px] transition-colors mt-1 group"
            style={{ backgroundColor: isActive("/meeting") ? "#f6f9ff" : "transparent" }}
          >
            <Video
              className="w-[22px] h-[22px] shrink-0 transition-transform group-hover:scale-110"
              style={{ color: isActive("/meeting") ? "#1cc2dc" : "#012970" }}
            />
            <span
              className="text-[14px] font-medium"
              style={{
                color: isActive("/meeting") ? "#1cc2dc" : "#012970",
                fontFamily: "var(--font-poppins)",
              }}
            >
              Meeting
            </span>
          </Link>
        </nav>
      </div>
    </aside>
  )
}
