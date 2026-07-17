"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen, RefreshCw, Wallet, User, Video,
  Settings, Search, ChevronDown, GraduationCap, LayoutDashboard, ScanFace,
  CalendarDays, ClipboardCheck, ClipboardList, UserCog, ShieldCheck,
} from "lucide-react"
import { adminApi } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ""

type NavItem = { label: string; href: string; tKey?: string }
type Section = {
  title: string
  tKey?: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  items: NavItem[]
}

const studentSections: Section[] = [
  {
    title: "O'quv reja",
    tKey: "sidebar.section.studyPlan",
    icon: BookOpen,
    items: [
      { label: "O'quv reja",        href: "/o-qish-rejasi",   tKey: "sidebar.item.studyPlan" },
      { label: "Dars jadvali",      href: "/dars-jadvali",    tKey: "sidebar.item.schedule" },
      { label: "Nazorat jadvali",   href: "/nazorat-jadvali", tKey: "sidebar.item.controlSchedule" },
      { label: "Fanlar resurslari", href: "/fan-resurslari",  tKey: "sidebar.item.subjectResources" },
      { label: "Davomat",           href: "/davomat",         tKey: "sidebar.item.attendance" },
      { label: "O'zlashtirish",     href: "/o-zlashtirish",   tKey: "sidebar.item.performance" },
      { label: "Imtihonlar",        href: "/imtihonlar",      tKey: "sidebar.item.exams" },
      { label: "Reyting daftarcha", href: "/reyting",         tKey: "sidebar.item.rating" },
    ],
  },
  {
    title: "Qayta o'qish",
    tKey: "sidebar.section.retake",
    icon: RefreshCw,
    items: [
      { label: "Ariza qayta o'qish",       href: "/qayta-o-qish",                tKey: "sidebar.item.retakeApplication" },
      { label: "Q.O'qish mashg'ulotlari",  href: "/qayta-o-qish/mashgulotlar",   tKey: "sidebar.item.retakeLessons" },
      { label: "Q.O'qish nazorat jadvali", href: "/qayta-o-qish/nazorat-jadvali", tKey: "sidebar.item.retakeControlSchedule" },
      { label: "Q.O'qish o'zlashtirish",   href: "/qayta-o-qish/ozlashtirish",   tKey: "sidebar.item.retakePerformance" },
    ],
  },
  {
    title: "Talaba ma'lumoti",
    tKey: "sidebar.section.studentInfo",
    icon: User,
    items: [
      { label: "Rezyume",                   href: "/talaba-malumotlari",                     tKey: "sidebar.item.resume" },
      { label: "Buyruqlar",                 href: "/talaba-malumotlari/buyruqlar",           tKey: "sidebar.item.orders" },
      { label: "Shartnomalar",              href: "/talaba-malumotlari/shartnomalar",        tKey: "sidebar.item.contracts" },
      { label: "Ma'lumotnomalar",           href: "/talaba-malumotlari/malumotnomalar",      tKey: "sidebar.item.references" },
      { label: "Talaba hujjati",            href: "/talaba-malumotlari/hujjat",              tKey: "sidebar.item.studentDocument" },
      { label: "Bitiruv varaqa",            href: "/talaba-malumotlari/bitiruv-varaqa",      tKey: "sidebar.item.graduationSheet" },
      { label: "Talaba GPA bali",           href: "/talaba-malumotlari/gpa",                 tKey: "sidebar.item.gpa" },
      { label: "Fan sertifikatlari",        href: "/talaba-malumotlari/sertifikatlar",       tKey: "sidebar.item.subjectCertificates" },
      { label: "Plagiat ma'lumotlari",      href: "/talaba-malumotlari/plagiat",             tKey: "sidebar.item.plagiarism" },
      { label: "Shaxsiy ma'lumotlar",       href: "/talaba-malumotlari/shaxsiy",             tKey: "sidebar.item.personalInfo" },
      { label: "Bitiruv ishi",              href: "/talaba-malumotlari/bitiruv-ishi",        tKey: "sidebar.item.thesis" },
      { label: "Ijtimoiy faollik arizasi",  href: "/talaba-malumotlari/ijtimoiy-faollik",    tKey: "sidebar.item.socialActivity" },
      { label: "Student Grant Application", href: "/talaba-malumotlari/grant",               tKey: "sidebar.item.grantApplication" },
    ],
  },
  {
    title: "Moliyaviy to'lov",
    tKey: "sidebar.section.finance",
    icon: Wallet,
    items: [
      { label: "Kontraktlar ro'yxati", href: "/moliyaviy",             tKey: "sidebar.item.contractsList" },
      { label: "Stipendiya hisobi",    href: "/moliyaviy/stipendiya",  tKey: "sidebar.item.scholarship" },
    ],
  },
  {
    title: "Tizim",
    tKey: "sidebar.section.system",
    icon: Settings,
    items: [
      { label: "Profil",            href: "/tizim/profil",         tKey: "sidebar.item.profile" },
      { label: "Hemis so'rovnoma",  href: "/tizim/hemis",          tKey: "sidebar.item.hemisSurvey" },
      { label: "Global so'rovnoma", href: "/tizim/global",         tKey: "sidebar.item.globalSurvey" },
      { label: "Kirish tarixi",     href: "/tizim/kirish-tarixi",  tKey: "sidebar.item.loginHistory" },
    ],
  },
  {
    title: "Face ID",
    tKey: "sidebar.section.faceId",
    icon: ScanFace,
    items: [
      { label: "Face ID holati",     href: "/face-id",             tKey: "sidebar.item.faceIdStatus" },
      { label: "Yuzni ro'yxatdan o'tkazish", href: "/face-id/register",   tKey: "sidebar.item.faceIdRegister" },
      { label: "Qayta ro'yxatdan o'tish",    href: "/face-id/re-register", tKey: "sidebar.item.faceIdReregister" },
      { label: "Arizalar",           href: "/face-id/requests",    tKey: "sidebar.item.applications" },
    ],
  },
]

const employeeSections: Section[] = [
  {
    title: "Fanlar bazasi",
    tKey: "sidebar.section.subjectBase",
    icon: BookOpen,
    items: [
      { label: "Fan mavzulari",            href: "/oqituvchi-kabineti/mavzular",         tKey: "sidebar.item.subjectTopics" },
      { label: "Fan resurslari",           href: "/oqituvchi-kabineti/fan-resurslari",   tKey: "sidebar.item.subjectResources" },
      { label: "Baholash",                 href: "/oqituvchi-kabineti/baholash-page",    tKey: "sidebar.item.grading" },
      { label: "Mavzular bo'yicha natijalar", href: "/oqituvchi-kabineti/natijalar",     tKey: "sidebar.item.topicResults" },
    ],
  },
  {
    title: "O'quv jarayoni",
    tKey: "sidebar.section.studyProcess",
    icon: GraduationCap,
    items: [
      { label: "Imtihonlar ro'yxati", href: "/oqituvchi-kabineti/oraliq-nazorat", tKey: "sidebar.item.examsList" },
      { label: "Fan imtihonlari",     href: "/oqituvchi-kabineti/imtihonlar",    tKey: "sidebar.item.subjectExams" },
    ],
  },
  {
    title: "Qayta o'qish",
    tKey: "sidebar.section.retake",
    icon: RefreshCw,
    items: [
      { label: "Qayta o'qish ro'yxati", href: "/xodim/qayta-oqish", tKey: "sidebar.item.retakeList" },
    ],
  },
  {
    title: "O'zlashtirish",
    tKey: "sidebar.item.performance",
    icon: ClipboardCheck,
    items: [
      { label: "Shaxsiy qaydnoma kiritish", href: "/xodim/shaxsiy-qaydnoma-kiritish", tKey: "sidebar.item.personalRecordEntry" },
      { label: "Baholash so'rovlari", href: "/xodim/baholash-sorovlari",              tKey: "sidebar.item.gradingRequests" },
    ],
  },
  {
    title: "Mashg'ulotlar",
    tKey: "sidebar.section.lessons",
    icon: CalendarDays,
    items: [
      { label: "Dars jadvali",    href: "/xodim/dars-jadvali",     tKey: "sidebar.item.schedule" },
      { label: "Davomat jurnali", href: "/xodim/davomat-jurnali",  tKey: "dashboard.attendanceJournal" },
    ],
  },
  {
    title: "Nazoratlar",
    tKey: "dashboard.controlsSection",
    icon: ClipboardList,
    items: [
      { label: "Oraliq nazorat", href: "/xodim/oraliq-nazorat",     tKey: "dashboard.midtermControl" },
      { label: "Yakuniy nazorat", href: "/xodim/yakuniy-nazorat",   tKey: "dashboard.finalControl" },
      { label: "Boshqa nazoratlar", href: "/xodim/boshqa-nazoratlar", tKey: "dashboard.otherControls" },
    ],
  },
  {
    title: "Tizim",
    tKey: "sidebar.section.system",
    icon: Settings,
    items: [
      { label: "Profil", href: "/tizim/profil",   tKey: "sidebar.item.profile" },
      { label: "Sozlamalar", href: "/xodim/tizim", tKey: "sidebar.item.settings" },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [role, setRole] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const sections = role === "employee" ? employeeSections : studentSections

  const [openSection, setOpenSection] = useState<string | null>(() => {
    const allSections = [...studentSections, ...employeeSections]
    const match = allSections.find(s => s.items.some(i => pathname === i.href || pathname.startsWith(i.href + "/")))
    return match?.title ?? "O'quv reja"
  })

  useEffect(() => {
    const id = window.setTimeout(() => setRole(sessionStorage.getItem("lms_role")), 0)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    adminApi.check().then(r => setIsAdmin(r.isAdmin)).catch(() => {})
  }, [])

  useEffect(() => {
    const match = sections.find(s => s.items.some(i => pathname === i.href || pathname.startsWith(i.href + "/")))
    if (!match) return
    const id = window.setTimeout(() => setOpenSection(match.title), 0)
    return () => window.clearTimeout(id)
  }, [pathname, sections])

  const toggle = (title: string) =>
    setOpenSection((prev) => (prev === title ? null : title))

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"))

  return (
    <aside
      className="flex flex-col w-[300px] h-screen bg-[var(--lms-cell)] shrink-0"
      style={{ boxShadow: "var(--lms-shadow)" }}
    >
      {/* Logo + Search — qotgan, scroll bo'lmaydi */}
      <div className="shrink-0 flex flex-col gap-4 px-[25px] pt-5 pb-3">
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Image src={`${BASE_PATH}/logo.png`} alt="SamISI" width={40} height={40} className="w-10 h-10 shrink-0 object-contain" />
          <div className="flex flex-col min-w-0">
            <span
              className="font-semibold text-base leading-tight truncate"
              style={{ color: "var(--lms-primary)", fontFamily: "var(--font-poppins)" }}
            >
              SamISI
            </span>
            <span
              className="text-xs truncate"
              style={{ color: "var(--lms-muted)", fontFamily: "var(--font-poppins)" }}
            >
              {t("sidebar.appSubtitle")}
            </span>
          </div>
        </motion.div>

        <form
          className="h-9 px-2.5 py-2 w-full bg-[var(--lms-cell)] rounded-[5px] border border-[var(--lms-border)] flex items-center gap-2"
          role="search"
        >
          <Search className="w-[18px] h-[18px] text-[var(--lms-primary)] shrink-0" />
          <input
            type="search"
            placeholder={t("sidebar.searchPlaceholder")}
            className="flex-1 bg-transparent outline-none text-sm font-medium text-[var(--lms-primary)] placeholder:text-[var(--lms-muted)]"
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
              {t("sidebar.dashboard")}
            </span>
          </Link>

          {/* Admin Panel link */}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-[15px] px-[15px] py-2.5 rounded-[5px] transition-colors group mt-1"
              style={{ backgroundColor: pathname.startsWith("/admin") ? "#fef2f2" : "transparent" }}
            >
              <ShieldCheck
                className="w-[22px] h-[22px] shrink-0 transition-transform group-hover:scale-110"
                style={{ color: pathname.startsWith("/admin") ? "#b91c1c" : "#012970" }}
              />
              <span
                className="text-[14px] font-medium truncate"
                style={{
                  color: pathname.startsWith("/admin") ? "#b91c1c" : "#012970",
                  fontFamily: "var(--font-poppins)",
                }}>
                {t("sidebar.adminPanel")}
              </span>
            </Link>
          )}

          {/* Accordion sections */}
          {sections.map((section) => {
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
                    {section.tKey ? t(section.tKey) : section.title}
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
                                  {item.tKey ? t(item.tKey) : item.label}
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
              {t("sidebar.meeting")}
            </span>
          </Link>
        </nav>
      </div>
    </aside>
  )
}
