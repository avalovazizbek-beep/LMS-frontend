"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Users, BookOpen, Video, TrendingUp, ArrowRight, GraduationCap, ChevronRight,
  CalendarDays, LogIn, Radio, Presentation, Layers, ListChecks, ClipboardList, ShieldAlert,
} from "lucide-react"
import { adminApi, type AdminStats } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { motion, pageVariants, staggerContainer, staggerItem, fadeUp } from "@/components/ui/motion"
import { CountUp, TrendAreaChart } from "@/components/admin/DashboardCharts"

// Oy nomlari lug'atdan — Intl'da uz/kaa locale ma'lumotlari brauzerda bo'lmasligi mumkin
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

type CssVars = React.CSSProperties & Record<`--${string}`, string>

/* ── Foydalanuvchilar: gradientli katta karta ──────────────────── */

function HeroStat({
  icon: Icon,
  label,
  hint,
  value,
  g1,
  g2,
  href,
}: {
  icon: React.ElementType
  label: string
  hint: string
  value: number
  g1: string
  g2: string
  href?: string
}) {
  const content = (
    <div className="adm-hero flex h-full min-h-[96px] items-center gap-4 px-5 py-4" style={{ "--g1": g1, "--g2": g2 } as CssVars}>
      <div className="relative z-[1] flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/25">
        <Icon className="h-6 w-6" />
      </div>
      <div className="relative z-[1] min-w-0">
        <div className="text-[28px] font-bold leading-tight">
          <CountUp value={value} />
        </div>
        <div className="truncate text-sm font-semibold">{label}</div>
        <div className="truncate text-[11px] opacity-80">{hint}</div>
      </div>
      {href && (
        <div className="relative z-[1] ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
          <ArrowRight className="h-4 w-4" />
        </div>
      )}
    </div>
  )
  return (
    <motion.div variants={staggerItem} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
      {href ? <Link href={href} className="block h-full">{content}</Link> : content}
    </motion.div>
  )
}

/* ── Kontent: turi bo'yicha son ────────────────────────────────── */

function ContentStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
}) {
  return (
    <motion.div variants={staggerItem} whileHover={{ y: -2 }}>
      <Link href="/admin/oqituvchilar" className="block h-full">
        <div className="adm-tint flex h-full items-center gap-3.5 p-4" style={{ "--c": color } as CssVars}>
          <div className="adm-icon-soft flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
            <Icon className="h-[22px] w-[22px]" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold leading-tight text-[var(--adm-text)]">
              <CountUp value={value} />
            </div>
            <div className="truncate text-[13px] text-[var(--adm-text-2)]">{label}</div>
          </div>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[var(--adm-muted)]" />
        </div>
      </Link>
    </motion.div>
  )
}

/* ── Bo'lim sarlavhasi ─────────────────────────────────────────── */

function SectionHeader({ icon: Icon, title, subtitle, right }: {
  icon: React.ElementType
  title: string
  subtitle: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="adm-icon-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ "--c": "var(--adm-accent)" } as CssVars}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-[var(--adm-text)]">{title}</div>
          <p className="text-xs text-[var(--adm-muted)]">{subtitle}</p>
        </div>
      </div>
      {right}
    </div>
  )
}

export default function AdminDashboard() {
  const { t } = useLanguage()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loginTrend, setLoginTrend] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  // Sana faqat brauzerda hisoblanadi — server (UTC) bilan farq hydration xatosini bermasin
  const [today, setToday] = useState<Date | null>(null)

  useEffect(() => {
    const tid = window.setTimeout(() => setToday(new Date()), 0)
    Promise.allSettled([adminApi.stats(), adminApi.loginTrend(7)])
      .then(([statsRes, trendRes]) => {
        if (statsRes.status === "fulfilled") setStats(statsRes.value.data)
        if (trendRes.status === "fulfilled") setLoginTrend(trendRes.value.data)
      })
      .finally(() => setLoading(false))
    return () => window.clearTimeout(tid)
  }, [])

  const { trendData, trendTotal } = useMemo(() => {
    const points = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      points.push({
        label: `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`,
        value: loginTrend[dayKey(d)] ?? 0,
      })
    }
    return { trendData: points, trendTotal: points.reduce((sum, d) => sum + d.value, 0) }
  }, [loginTrend])

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="flex flex-col gap-5 px-4 pb-8 pt-2 sm:px-8 sm:gap-6">
      {/* Sarlavha */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-[38px] leading-none select-none" aria-hidden>👋</span>
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-[var(--adm-text)] sm:text-[30px]">
              {t("adminDashboard.pageTitle")}
            </h1>
            <p className="mt-0.5 text-sm text-[var(--adm-muted)]">
              {t("adminDashboard.pageSubtitle")}
            </p>
          </div>
        </div>
        {today && (
          <div className="adm-card flex items-center gap-3 px-4 py-2.5">
            <div className="adm-icon-soft flex h-9 w-9 items-center justify-center rounded-xl" style={{ "--c": "var(--adm-accent)" } as CssVars}>
              <CalendarDays className="h-[18px] w-[18px]" />
            </div>
            <div>
              <div className="text-[11px] text-[var(--adm-muted)]">{t("adminNav.today")}</div>
              <div className="text-[13px] font-semibold text-[var(--adm-text)]">
                {t("adminDashboard.dateFormat", {
                  day: today.getDate(),
                  month: t(`adminDashboard.monthLong.${MONTH_KEYS[today.getMonth()]}`),
                  year: today.getFullYear(),
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="adm-card h-[96px] animate-pulse" />)}
          </div>
          <div className="adm-card h-[220px] animate-pulse" />
          <div className="adm-card h-[300px] animate-pulse" />
        </div>
      ) : stats ? (
        <>
          {/* Kutilayotgan Face ID so'rovlari — faqat bor bo'lsa */}
          {stats.facePending > 0 && (
            <Link href="/admin/face-id"
              className="adm-tint flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[var(--adm-text)]"
              style={{ "--c": "var(--role-admin)" } as CssVars}>
              <ShieldAlert className="h-5 w-5 shrink-0" style={{ color: "var(--role-admin)" }} />
              {t("adminDashboard.facePendingNotice", { n: stats.facePending })}
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[var(--adm-muted)]" />
            </Link>
          )}

          {/* Foydalanuvchilar */}
          <motion.div variants={staggerContainer} initial="hidden" animate="visible"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <HeroStat icon={Users} label={t("adminDashboard.statStudents")} hint={t("adminDashboard.statStudentsHint")}
              value={stats.totalStudents} g1="#3b7cf5" g2="#1d4ed8" href="/admin/talabalar" />
            <HeroStat icon={GraduationCap} label={t("adminDashboard.statTeachers")} hint={t("adminDashboard.statTeachersHint")}
              value={stats.totalTeachers} g1="#9b6cf6" g2="#6d28d9" href="/admin/oqituvchilar" />
            <HeroStat icon={LogIn} label={t("adminDashboard.statTodayUsers")} hint={t("adminDashboard.statTodayUsersHint")}
              value={stats.todayUsers} g1="#22b45f" g2="#13803f" />
            <HeroStat icon={Radio} label={t("adminDashboard.statOnlineNow")} hint={t("adminDashboard.statOnlineNowHint")}
              value={stats.onlineNow} g1="#fb8a3c" g2="#e05a0c" />
          </motion.div>

          {/* Platformadagi kontent */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="adm-card flex flex-col gap-4 p-5 sm:p-6">
            <SectionHeader
              icon={BookOpen}
              title={t("adminDashboard.contentTitle")}
              subtitle={t("adminOqituvchilar.countRuleHint")}
            />
            <motion.div variants={staggerContainer} initial="hidden" animate="visible"
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
              <ContentStat icon={BookOpen} label={t("adminOqituvchilar.reportColTopics")} value={stats.content.topics} color="var(--adm-accent)" />
              <ContentStat icon={Video} label={t("adminOqituvchilar.reportColVideos")} value={stats.content.videos} color="var(--cat-2)" />
              <ContentStat icon={Presentation} label={t("adminOqituvchilar.reportColPresentations")} value={stats.content.presentations} color="var(--role-dean)" />
              <ContentStat icon={Layers} label={t("adminOqituvchilar.reportColGuides")} value={stats.content.guides} color="#0891b2" />
              <ContentStat icon={ListChecks} label={t("adminOqituvchilar.reportColTests")} value={stats.content.tests} color="var(--role-admin)" />
              <ContentStat icon={ClipboardList} label={t("adminOqituvchilar.reportColAssignments")} value={stats.content.assignments} color="var(--role-pending)" />
            </motion.div>
          </motion.div>

          {/* Kirishlar — so'nggi 7 kun */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="adm-card p-5 sm:p-6">
            <SectionHeader
              icon={TrendingUp}
              title={t("adminDashboard.sectionActivityTitle")}
              subtitle={t("adminDashboard.sectionActivitySubtitle")}
              right={
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-bold leading-none text-[var(--adm-text)]">
                    <CountUp value={trendTotal} />
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--adm-muted)]">{t("adminDashboard.total")}</div>
                </div>
              }
            />
            <div className="mt-4">
              <TrendAreaChart data={trendData} color="#2563eb" height={230} />
            </div>
          </motion.div>
        </>
      ) : (
        <div className="adm-card py-16 text-center text-sm text-[var(--adm-muted)]">
          {t("adminDashboard.statsLoadFailed")}
        </div>
      )}
    </motion.div>
  )
}
