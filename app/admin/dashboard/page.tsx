"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Users, BookOpen, Video, CalendarCheck, ShieldAlert,
  ClipboardList, CheckCircle2, TrendingUp, ArrowRight,
  GraduationCap, ShieldCheck, LogIn, Circle,
} from "lucide-react"
import { adminApi, type AdminStats, type AdminTeacherStat } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { motion, pageVariants, staggerContainer, staggerItem, fadeUp } from "@/components/ui/motion"
import { CountUp, TrendAreaChart, StackedBreakdownBar, useTimeAgo, type BreakdownSegment, type TrendPoint } from "@/components/admin/DashboardCharts"

interface SessionRow {
  user_id: number
  full_name: string
  role: string
  group_id: number | null
  login_at: string
  last_seen_at: string
  logout_at: string | null
  group_name: string | null
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function HeroStat({
  icon: Icon,
  label,
  value,
  gradient,
  href,
}: {
  icon: React.ElementType
  label: string
  value: number
  gradient: string
  href?: string
}) {
  const content = (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="rounded-[14px] p-5 flex items-center gap-4 text-white cursor-default relative overflow-hidden"
      style={{ background: gradient, boxShadow: "0px 8px 20px -8px rgba(1,41,112,0.35)" }}
    >
      <div className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <div className="text-[26px] font-bold leading-tight" style={{ fontFamily: "var(--font-poppins)" }}>
          <CountUp value={value} />
        </div>
        <div className="text-xs mt-0.5" style={{ opacity: 0.85, fontFamily: "var(--font-poppins)" }}>{label}</div>
      </div>
      {href && <ArrowRight className="w-4 h-4 ml-auto shrink-0" style={{ opacity: 0.6 }} />}
    </motion.div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
  href?: string
}) {
  const content = (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -2 }}
      className="bg-white rounded-[12px] p-5 flex items-start gap-4 hover:shadow-md transition-shadow cursor-default"
      style={{ border: "1px solid rgba(1,41,112,0.08)", boxShadow: "0px 0px 6px rgba(1,41,112,0.04)" }}
    >
      <div className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          <CountUp value={value} />
        </div>
        <div className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {label}
        </div>
      </div>
      {href && <ArrowRight className="w-4 h-4 ml-auto shrink-0 mt-1" style={{ color: "#d8e6f7" }} />}
    </motion.div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

export default function AdminDashboard() {
  const { t } = useLanguage()
  const timeAgo = useTimeAgo()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [teacherStats, setTeacherStats] = useState<AdminTeacherStat[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([adminApi.stats(), adminApi.teacherStats(), adminApi.sessions(80)])
      .then(([statsRes, teacherRes, sessionsRes]) => {
        if (statsRes.status === "fulfilled") setStats(statsRes.value.data)
        if (teacherRes.status === "fulfilled") setTeacherStats(teacherRes.value.data)
        if (sessionsRes.status === "fulfilled") setSessions(sessionsRes.value.data as SessionRow[])
      })
      .finally(() => setLoading(false))
  }, [])

  const trendData: TrendPoint[] = useMemo(() => {
    const days: { key: string; label: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push({ key: dayKey(d), label: `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}` })
    }
    const counts = new Map(days.map((d) => [d.key, 0]))
    for (const s of sessions) {
      const k = dayKey(new Date(s.login_at))
      if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return days.map((d) => ({ label: d.label, value: counts.get(d.key) ?? 0 }))
  }, [sessions])

  const breakdown: BreakdownSegment[] = useMemo(() => {
    const sum = teacherStats.reduce(
      (acc, s) => ({
        video: acc.video + (s.videolar || 0),
        audio: acc.audio + (s.audiolar || 0),
        presentation: acc.presentation + (s.taqdimotlar || 0),
        guide: acc.guide + (s.qollanmalar || 0),
        test: acc.test + (s.testlar || 0),
        practice: acc.practice + (s.amaliy || 0),
      }),
      { video: 0, audio: 0, presentation: 0, guide: 0, test: 0, practice: 0 }
    )
    return [
      { key: "video", label: t("adminDashboard.contentTypeVideo"), value: sum.video, color: "#2a78d6" },
      { key: "audio", label: t("adminDashboard.contentTypeAudio"), value: sum.audio, color: "#eb6834" },
      { key: "presentation", label: t("adminDashboard.contentTypePresentation"), value: sum.presentation, color: "#1baf7a" },
      { key: "guide", label: t("adminDashboard.contentTypeGuide"), value: sum.guide, color: "#eda100" },
      { key: "test", label: t("adminDashboard.contentTypeTest"), value: sum.test, color: "#e87ba4" },
      { key: "practice", label: t("adminDashboard.contentTypePractice"), value: sum.practice, color: "#008300" },
    ]
  }, [teacherStats, t])

  const contentTotal = breakdown.reduce((s, b) => s + b.value, 0)
  const recentActivity = sessions.slice(0, 6)

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-[28px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {t("adminDashboard.pageTitle")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("adminDashboard.pageSubtitle")}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-[14px] p-5 h-[88px] animate-pulse"
              style={{ border: "1px solid rgba(1,41,112,0.08)" }} />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Hero KPI row */}
          <motion.div variants={staggerContainer} initial="hidden" animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <HeroStat icon={Users} label={t("adminDashboard.statStudents")} value={stats.totalStudents}
              gradient="linear-gradient(135deg, #1a6fc4, #012970)" href="/admin/foydalanuvchilar" />
            <HeroStat icon={GraduationCap} label={t("adminDashboard.statEmployees")} value={stats.totalEmployees}
              gradient="linear-gradient(135deg, #8b5cf6, #5b21b6)" href="/admin/foydalanuvchilar" />
            <HeroStat icon={BookOpen} label={t("adminDashboard.statTotalContent")} value={stats.totalContent}
              gradient="linear-gradient(135deg, #22c55e, #15803d)" href="/admin/oqituvchilar" />
            <HeroStat icon={CheckCircle2} label={t("adminDashboard.statCompletions")} value={stats.totalCompletions}
              gradient="linear-gradient(135deg, #fb923c, #c2410c)" />
          </motion.div>

          {/* Analytics row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <motion.div variants={fadeUp} initial="hidden" animate="visible"
              className="lg:col-span-2 bg-white rounded-[14px] p-5"
              style={{ border: "1px solid rgba(1,41,112,0.08)", boxShadow: "0px 0px 6px rgba(1,41,112,0.04)" }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4" style={{ color: "#0e58a8" }} />
                <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {t("adminDashboard.sectionActivityTitle")}
                </span>
              </div>
              <p className="text-xs mb-2" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {t("adminDashboard.sectionActivitySubtitle")}
              </p>
              <TrendAreaChart data={trendData} color="#0e58a8" height={200} />
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="visible"
              className="bg-white rounded-[14px] p-5"
              style={{ border: "1px solid rgba(1,41,112,0.08)", boxShadow: "0px 0px 6px rgba(1,41,112,0.04)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {t("adminDashboard.sectionContentTitle")}
                </span>
                <span className="text-xs font-semibold" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {t("adminDashboard.total")}: {contentTotal}
                </span>
              </div>
              <p className="text-xs mb-4" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {t("adminDashboard.sectionContentSubtitle")}
              </p>
              <StackedBreakdownBar segments={breakdown} />
            </motion.div>
          </div>

          {/* Comprehension rate */}
          {stats.totalContent > 0 && stats.totalCompletions > 0 && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible"
              className="bg-white rounded-[12px] p-5 flex items-center gap-5"
              style={{ border: "1px solid rgba(1,41,112,0.08)" }}>
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6" style={{ color: "#0e58a8" }} />
                <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {t("adminDashboard.comprehensionLabel")}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {t("adminDashboard.completionsRatio", { completed: stats.totalCompletions, total: stats.totalContent })}
                  </span>
                  <span className="text-sm font-bold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                    {Math.round((stats.totalCompletions / Math.max(stats.totalContent, 1)) * 100)}%
                  </span>
                </div>
                <div style={{ height: 6, backgroundColor: "#e8f0fb", borderRadius: 3 }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.round((stats.totalCompletions / Math.max(stats.totalContent, 1)) * 100))}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                    style={{ height: "100%", borderRadius: 3, backgroundColor: "#0e58a8" }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Remaining KPIs */}
          <motion.div variants={staggerContainer} initial="hidden" animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard icon={ShieldCheck} label={t("adminDashboard.statGrantedAdmins")} value={stats.grantedAdmins} color="#0891b2" href="/admin/foydalanuvchilar" />
            <StatCard icon={Video} label={t("adminDashboard.statVideos")} value={stats.totalVideos} color="#ea580c" href="/admin/oqituvchilar" />
            <StatCard icon={CalendarCheck} label={t("adminDashboard.statMeetings")} value={stats.totalMeetings} color="#db2777" />
            <StatCard icon={ClipboardList} label={t("adminDashboard.statSubmissions")} value={stats.totalSubmissions} color="#b45309" />
            <StatCard icon={ShieldAlert} label={t("adminDashboard.statFaceRequests")} value={stats.facePending} color={stats.facePending > 0 ? "#dc2626" : "#6b7280"} href="/admin/face-id" />
          </motion.div>

          {/* Recent activity + quick links */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <motion.div variants={fadeUp} initial="hidden" animate="visible"
              className="lg:col-span-2 bg-white rounded-[14px] p-5"
              style={{ border: "1px solid rgba(1,41,112,0.08)", boxShadow: "0px 0px 6px rgba(1,41,112,0.04)" }}>
              <div className="text-sm font-semibold mb-0.5" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {t("adminDashboard.sectionRecentActivityTitle")}
              </div>
              <p className="text-xs mb-4" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {t("adminDashboard.sectionRecentActivitySubtitle")}
              </p>

              {recentActivity.length === 0 ? (
                <div className="text-center text-sm py-8" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {t("adminDashboard.noActivity")}
                </div>
              ) : (
                <motion.ul variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-1">
                  {recentActivity.map((s, i) => {
                    const isEmployee = s.role === "employee"
                    const color = isEmployee ? "#7c3aed" : "#0e58a8"
                    const online = !s.logout_at
                    return (
                      <motion.li key={`${s.user_id}-${s.login_at}-${i}`} variants={staggerItem}
                        className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < recentActivity.length - 1 ? "1px solid rgba(1,41,112,0.06)" : "none" }}>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
                          <LogIn className="w-4 h-4" style={{ color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                            {s.full_name} <span className="font-normal" style={{ color: "#7293b9" }}>{t("adminDashboard.loggedIn")}</span>
                          </div>
                          <div className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: "#9db3cf", fontFamily: "var(--font-poppins)" }}>
                            <span>{isEmployee ? t("adminDashboard.roleEmployee") : t("adminDashboard.roleStudent")}</span>
                            {s.group_name && <><span>·</span><span className="truncate">{s.group_name}</span></>}
                            <span>·</span>
                            <span>{timeAgo(s.login_at)}</span>
                          </div>
                        </div>
                        {online && (
                          <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full shrink-0" style={{ backgroundColor: "#ecfdf5", color: "#15803d" }}>
                            <Circle className="w-1.5 h-1.5 fill-current" />
                            {t("adminDashboard.onlineNow")}
                          </span>
                        )}
                      </motion.li>
                    )
                  })}
                </motion.ul>
              )}
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col gap-4">
              <div className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {t("adminDashboard.quickLinksTitle")}
              </div>
              <Link href="/admin/oqituvchilar"
                className="bg-white rounded-[12px] p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
                style={{ border: "1px solid rgba(1,41,112,0.08)" }}>
                <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#eef4ff" }}>
                  <TrendingUp className="w-5 h-5" style={{ color: "#0e58a8" }} />
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t("adminDashboard.quickLinkTeacherReportTitle")}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{t("adminDashboard.quickLinkTeacherReportDesc")}</div>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto shrink-0" style={{ color: "#d8e6f7" }} />
              </Link>
              <Link href="/admin/foydalanuvchilar"
                className="bg-white rounded-[12px] p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
                style={{ border: "1px solid rgba(1,41,112,0.08)" }}>
                <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#f0fdf4" }}>
                  <Users className="w-5 h-5" style={{ color: "#15803d" }} />
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t("adminDashboard.quickLinkUsersTitle")}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{t("adminDashboard.quickLinkUsersDesc")}</div>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto shrink-0" style={{ color: "#d8e6f7" }} />
              </Link>
            </motion.div>
          </div>
        </>
      ) : (
        <div className="text-center text-sm py-16" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("adminDashboard.statsLoadFailed")}
        </div>
      )}
    </motion.div>
  )
}
