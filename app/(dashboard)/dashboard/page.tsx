"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Users, UserCog, ShoppingBag, Wrench, TrendingUp, FileText, Wallet, ClipboardList,
  CalendarDays, ClipboardCheck, BookOpen, GraduationCap, BarChart2, CreditCard,
} from "lucide-react"
import Link from "next/link"
import { usersApi, hemisApi } from "@/lib/api"
import { useApi } from "@/hooks/useApi"

const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } }
const cardItem = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } } }

/* ── Admin Dashboard ─────────────────────────────────────────────── */
function AdminDashboard() {
  const { data: adminsData }     = useApi(() => usersApi.getAdmins())
  const { data: moderatorsData } = useApi(() => usersApi.getModerators())
  const { data: sellersData }    = useApi(() => usersApi.getSellers())
  const { data: mastersData }    = useApi(() => usersApi.getMasters())

  const stats = [
    { label: "Jami adminlar",  value: adminsData?.data?.length     ?? "—", icon: Users,      color: "#0e58a8", bg: "#f0f5ff", href: "/foydalanuvchilar/adminlar" },
    { label: "Moderatorlar",   value: moderatorsData?.data?.length ?? "—", icon: UserCog,    color: "#1cc2dc", bg: "#f0fbfd", href: "/foydalanuvchilar/moderatorlar" },
    { label: "Sotuvchilar",    value: sellersData?.data?.length    ?? "—", icon: ShoppingBag, color: "#012970", bg: "#f6f9ff", href: "/foydalanuvchilar/sotuvchilar" },
    { label: "Ustalar",        value: mastersData?.data?.length    ?? "—", icon: Wrench,     color: "#7293b9", bg: "#f6f9ff", href: "/foydalanuvchilar/ustalar" },
  ]

  const quickActions = [
    { label: "Guruhlar",  icon: Users,        href: "/moliya/groups",        color: "#0e58a8" },
    { label: "Imtihonlar", icon: ClipboardList, href: "/moliya/exams",        color: "#1cc2dc" },
    { label: "Moliya",    icon: Wallet,       href: "/moliya/finance",       color: "#012970" },
    { label: "Hujjatlar", icon: FileText,     href: "/moliya/documentation", color: "#7293b9" },
  ]

  const activity = [
    { text: "Yangi moderator qo'shildi: Samiddin Ravshanov",    time: "2 daqiqa oldin",  color: "#1cc2dc" },
    { text: "Shahob Berdiqulov profili yangilandi",             time: "15 daqiqa oldin", color: "#0e58a8" },
    { text: "Guruh #5 imtihon jadvali o'zgartirildi",          time: "1 soat oldin",    color: "#012970" },
    { text: "Moliyaviy hisobot yuborildi",                     time: "3 soat oldin",    color: "#7293b9" },
  ]

  return (
    <div className="flex flex-col gap-[30px] p-[30px]">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Tizim umumiy ko&apos;rinishi</p>
      </motion.div>

      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" variants={staggerContainer} initial="hidden" animate="visible">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} variants={cardItem}>
              <Link href={stat.href} className="flex flex-col gap-4 p-5 bg-white rounded-[10px] transition-all hover:shadow-lg hover:-translate-y-0.5 block"
                style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
                <div className="flex items-center justify-between">
                  <motion.div className="w-12 h-12 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: stat.bg }}
                    whileHover={{ scale: 1.1, rotate: 5 }} transition={{ type: "spring", stiffness: 300 }}>
                    <Icon className="w-6 h-6" style={{ color: stat.color }} />
                  </motion.div>
                  <TrendingUp className="w-5 h-5" style={{ color: "#1cc2dc" }} />
                </div>
                <div>
                  <div className="text-3xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{stat.value}</div>
                  <div className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{stat.label}</div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-5" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={cardItem} className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
          <h2 className="text-[18px] font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Tezkor havolalar</h2>
          <div className="flex flex-col gap-2">
            {quickActions.map((action, i) => {
              const Icon = action.icon
              return (
                <motion.div key={action.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.07, duration: 0.25 }}>
                  <Link href={action.href} className="flex items-center gap-3 px-3 py-2.5 rounded-[5px] hover:bg-[#f6f9ff] transition-all group">
                    <motion.div className="w-8 h-8 rounded-[5px] flex items-center justify-center" style={{ backgroundColor: "#f6f9ff" }} whileHover={{ scale: 1.12 }}>
                      <Icon className="w-4 h-4" style={{ color: action.color }} />
                    </motion.div>
                    <span className="text-sm font-medium group-hover:text-[#0e58a8] transition-colors" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{action.label}</span>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        <motion.div variants={cardItem} className="lg:col-span-2 bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
          <h2 className="text-[18px] font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>So&apos;nggi faoliyat</h2>
          <div className="flex flex-col gap-3">
            {activity.map((item, i) => (
              <motion.div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.08, duration: 0.28 }}>
                <motion.div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: item.color }}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.45 + i * 0.08, type: "spring", stiffness: 400 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{item.text}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{item.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

/* ── Student Dashboard ───────────────────────────────────────────── */
function StudentDashboard() {
  const { data: meData } = useApi(() => hemisApi.me())
  const student = meData?.data

  const links = [
    { label: "Dars jadvali",   icon: CalendarDays,   href: "/dars-jadvali",     color: "#0e58a8", bg: "#f0f5ff" },
    { label: "Davomat",        icon: ClipboardCheck, href: "/davomat",          color: "#1cc2dc", bg: "#f0fbfd" },
    { label: "Baholar",        icon: BookOpen,        href: "/o-zlashtirish",    color: "#012970", bg: "#f6f9ff" },
    { label: "Imtihonlar",     icon: GraduationCap,  href: "/imtihonlar",       color: "#7293b9", bg: "#f6f9ff" },
    { label: "O'zlashtirish",  icon: BarChart2,       href: "/o-zlashtirish",    color: "#0e58a8", bg: "#f0f5ff" },
    { label: "Moliyaviy",      icon: CreditCard,     href: "/moliyaviy",        color: "#1cc2dc", bg: "#f0fbfd" },
  ]

  return (
    <div className="flex flex-col gap-[30px] p-[30px]">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Xush kelibsiz{student?.full_name ? `, ${student.full_name.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {student?.group?.name ? `Guruh: ${student.group.name}` : "Talaba kabineti"}
        </p>
      </motion.div>

      {/* Student info card */}
      {student && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.35 }}
          className="bg-white rounded-[10px] p-5 flex flex-col sm:flex-row gap-4"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}>
          <div className="w-16 h-16 rounded-full bg-[#0e58a8] flex items-center justify-center text-white text-2xl font-semibold shrink-0">
            {student.full_name?.charAt(0).toUpperCase() ?? "T"}
          </div>
          <div className="flex flex-col gap-1 justify-center">
            <p className="text-lg font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{student.full_name}</p>
            {student.faculty?.name && (
              <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{student.faculty.name}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-1">
              {student.group?.name && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  {student.group.name}
                </span>
              )}
              {student.semester?.name && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "#f0fbfd", color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>
                  {student.semester.name}
                </span>
              )}
              {student.gpa !== undefined && student.gpa > 0 && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "#f0fff4", color: "#22c55e", fontFamily: "var(--font-poppins)" }}>
                  GPA: {student.gpa.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick links */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4" variants={staggerContainer} initial="hidden" animate="visible">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <motion.div key={link.label} variants={cardItem}>
              <Link href={link.href}
                className="flex flex-col items-center gap-3 p-4 bg-white rounded-[10px] transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
                <div className="w-12 h-12 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: link.bg }}>
                  <Icon className="w-6 h-6" style={{ color: link.color }} />
                </div>
                <span className="text-xs font-medium text-center leading-tight" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {link.label}
                </span>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

/* ── Main export ─────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    setRole(localStorage.getItem("lms_role") ?? "admin")
  }, [])

  if (role === null) return null

  if (role === "student" || role === "employee") {
    return <StudentDashboard />
  }

  return <AdminDashboard />
}
