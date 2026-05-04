"use client"

import { motion } from "framer-motion"
import {
  Users, UserCog, ShoppingBag, Wrench,
  TrendingUp, FileText, Wallet, ClipboardList,
} from "lucide-react"
import Link from "next/link"

const stats = [
  { label: "Jami adminlar",  value: "12", icon: Users,      color: "#0e58a8", bg: "#f0f5ff", href: "/foydalanuvchilar/adminlar" },
  { label: "Moderatorlar",   value: "8",  icon: UserCog,    color: "#1cc2dc", bg: "#f0fbfd", href: "/foydalanuvchilar/moderatorlar" },
  { label: "Sotuvchilar",    value: "34", icon: ShoppingBag, color: "#012970", bg: "#f6f9ff", href: "/foydalanuvchilar/sotuvchilar" },
  { label: "Ustalar",        value: "21", icon: Wrench,     color: "#7293b9", bg: "#f6f9ff", href: "/foydalanuvchilar/ustalar" },
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

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
}
const cardItem = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-[30px] p-[30px]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Tizim umumiy ko&apos;rinishi
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} variants={cardItem}>
              <Link
                href={stat.href}
                className="flex flex-col gap-4 p-5 bg-white rounded-[10px] transition-all hover:shadow-lg hover:-translate-y-0.5 block"
                style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}
              >
                <div className="flex items-center justify-between">
                  <motion.div
                    className="w-12 h-12 rounded-[10px] flex items-center justify-center"
                    style={{ backgroundColor: stat.bg }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Icon className="w-6 h-6" style={{ color: stat.color }} />
                  </motion.div>
                  <TrendingUp className="w-5 h-5" style={{ color: "#1cc2dc" }} />
                </div>
                <div>
                  <div className="text-3xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    {stat.value}
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {stat.label}
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Bottom row */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Quick actions */}
        <motion.div
          variants={cardItem}
          className="bg-white rounded-[10px] p-5"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}
        >
          <h2 className="text-[18px] font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Tezkor havolalar
          </h2>
          <div className="flex flex-col gap-2">
            {quickActions.map((action, i) => {
              const Icon = action.icon
              return (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.07, duration: 0.25 }}
                >
                  <Link
                    href={action.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-[5px] hover:bg-[#f6f9ff] transition-all group"
                  >
                    <motion.div
                      className="w-8 h-8 rounded-[5px] flex items-center justify-center"
                      style={{ backgroundColor: "#f6f9ff" }}
                      whileHover={{ scale: 1.12 }}
                    >
                      <Icon className="w-4 h-4" style={{ color: action.color }} />
                    </motion.div>
                    <span className="text-sm font-medium group-hover:text-[#0e58a8] transition-colors" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {action.label}
                    </span>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Recent activity */}
        <motion.div
          variants={cardItem}
          className="lg:col-span-2 bg-white rounded-[10px] p-5"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.1)" }}
        >
          <h2 className="text-[18px] font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            So&apos;nggi faoliyat
          </h2>
          <div className="flex flex-col gap-3">
            {activity.map((item, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-3 py-2"
                style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.08, duration: 0.28 }}
              >
                <motion.div
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: item.color }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.45 + i * 0.08, type: "spring", stiffness: 400 }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    {item.text}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {item.time}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
