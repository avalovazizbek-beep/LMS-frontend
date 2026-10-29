"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Users, BookOpen, Video, CalendarCheck, ShieldAlert,
  ClipboardList, CheckCircle2, TrendingUp, ArrowRight, ArrowUp, ArrowDown,
  GraduationCap, ShieldCheck, ScanFace, UsersRound, ChevronRight,
  CalendarDays, PlayCircle, FileCheck2, BarChart3, LayoutGrid,
} from "lucide-react"
import { adminApi, type AdminStats } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { motion, pageVariants, staggerContainer, staggerItem, fadeUp } from "@/components/ui/motion"
import { CountUp, TrendAreaChart, StackedBreakdownBar, SimpleBarChart, Sparkline, Meter, type BreakdownSegment, type TrendPoint } from "@/components/admin/DashboardCharts"

// Oy nomlari lug'atdan — Intl'da uz/kaa locale ma'lumotlari brauzerda bo'lmasligi mumkin
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

type CssVars = React.CSSProperties & Record<`--${string}`, string>

/* ── Yuqori qator: rangli KPI kartasi ──────────────────────────── */

function KpiCard({
  icon: Icon,
  color,
  label,
  sub,
  children,
  value,
  badge,
}: {
  icon: React.ElementType
  color: string
  label: string
  sub: string
  /** Kartaning pastki qismi — sparkline yoki ulush chizig'i */
  children: React.ReactNode
  value: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="adm-tint flex flex-col gap-3 p-4"
      style={{ "--c": color } as CssVars}
    >
      <div className="flex items-start gap-3">
        <div className="adm-icon-grad flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <Icon className="h-[22px] w-[22px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-[var(--adm-text-2)]">{label}</div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
            <span className="text-[26px] font-bold leading-tight text-[var(--adm-text)]">{value}</span>
            {badge}
          </div>
          <div className="mt-0.5 text-[11px] leading-4 text-[var(--adm-muted)]">{sub}</div>
        </div>
      </div>
      <div className="mt-auto">{children}</div>
    </motion.div>
  )
}

/** Ulush kartalarining pastki qismi: "490 / 803" va ulush chizig'i */
function RatioMeter({ part, total, percent, color }: { part: number; total: number; percent: number; color: string }) {
  const { locale } = useLanguage()
  return (
    <div className="flex h-[38px] flex-col justify-end gap-1.5">
      <div className="text-right text-[11px] font-medium text-[var(--adm-muted)]" style={{ fontVariantNumeric: "tabular-nums" }}>
        {part.toLocaleString(locale)} / {total.toLocaleString(locale)}
      </div>
      <Meter percent={percent} color={color} />
    </div>
  )
}

/** O'tgan davrga nisbatan o'zgarish — o'sish yashil, kamayish qizil */
function DeltaBadge({ delta, title }: { delta: number; title: string }) {
  const up = delta >= 0
  const Arrow = up ? ArrowUp : ArrowDown
  return (
    <span title={title} className="inline-flex items-center gap-0.5 text-xs font-semibold"
      style={{ color: up ? "var(--adm-up)" : "var(--adm-down)" }}>
      <Arrow className="h-3.5 w-3.5" strokeWidth={2.5} />
      {up ? "+" : "−"}{Math.abs(Math.round(delta))}%
    </span>
  )
}

/* ── Ikkinchi qator: gradientli katta karta ───────────────────── */

function HeroStat({
  icon: Icon,
  label,
  value,
  g1,
  g2,
  href,
}: {
  icon: React.ElementType
  label: string
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
        <div className="truncate text-sm font-medium opacity-90">{label}</div>
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

/* ── Pastki qator: kichik statistik karta ─────────────────────── */

function MiniStat({
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
    <div className="adm-tint flex h-full items-center gap-3.5 p-4" style={{ "--c": color } as CssVars}>
      <div className="adm-icon-soft flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
        <Icon className="h-[22px] w-[22px]" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold leading-tight text-[var(--adm-text)]">
          <CountUp value={value} />
        </div>
        <div className="line-clamp-2 text-xs leading-4 text-[var(--adm-text-2)]">{label}</div>
      </div>
      {href && <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[var(--adm-muted)]" />}
    </div>
  )
  return (
    <motion.div variants={staggerItem} whileHover={{ y: -2 }}>
      {href ? <Link href={href} className="block h-full">{content}</Link> : content}
    </motion.div>
  )
}

/* ── Grafik kartasining sarlavhasi ─────────────────────────────── */

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
  const { t, locale } = useLanguage()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loginTrend, setLoginTrend] = useState<Record<string, number>>({})
  const [monthlyTrend, setMonthlyTrend] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  // Sana faqat brauzerda hisoblanadi — server (UTC) bilan farq hydration xatosini bermasin
  const [today, setToday] = useState<Date | null>(null)

  useEffect(() => {
    const tid = window.setTimeout(() => setToday(new Date()), 0)
    Promise.allSettled([adminApi.stats(), adminApi.loginTrend(7), adminApi.loginTrendMonthly(6)])
      .then(([statsRes, trendRes, monthlyRes]) => {
        if (statsRes.status === "fulfilled") setStats(statsRes.value.data)
        if (trendRes.status === "fulfilled") setLoginTrend(trendRes.value.data)
        if (monthlyRes.status === "fulfilled") setMonthlyTrend(monthlyRes.value.data)
      })
      .finally(() => setLoading(false))
    return () => window.clearTimeout(tid)
  }, [])

  // Kunlik nuqtalar — har kuni kirgan foydalanuvchilar (takrorsiz)
  const trendData: TrendPoint[] = useMemo(() => {
    const points: TrendPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      points.push({ label: `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`, value: loginTrend[dayKey(d)] ?? 0 })
    }
    return points
  }, [loginTrend])

  // 7 kun ichida kirganlar (bir kishi bir marta) — kunlik sonlar yig'indisi emas
  const trendTotal = stats?.activeUsers7d ?? 0
  // Talabalar kirishi qayd etila boshlangan kundan oldingi davr bilan
  // solishtirish soxta o'sish ko'rsatardi — oldingi 7 kun to'liq bo'lsagina
  const prevWindowStart = new Date()
  prevWindowStart.setDate(prevWindowStart.getDate() - 13)
  const prevComplete = !!stats?.trackedSince && stats.trackedSince <= dayKey(prevWindowStart)
  const activityDelta = stats && prevComplete && stats.activeUsersPrev7d > 0
    ? ((stats.activeUsers7d - stats.activeUsersPrev7d) / stats.activeUsersPrev7d) * 100
    : null
  const monthlyStart = new Date()
  monthlyStart.setMonth(monthlyStart.getMonth() - 5, 1)
  const trackedNote = stats?.trackedSince && stats.trackedSince > dayKey(monthlyStart)
    ? t("adminDashboard.trackedSinceNote", { date: stats.trackedSince.split("-").reverse().join(".") })
    : null

  const monthlyData: TrendPoint[] = useMemo(() => {
    const now = new Date()
    const months: TrendPoint[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const name = t(`xodimSlug.month.${MONTH_KEYS[d.getMonth()]}`)
      months.push({ label: name.charAt(0).toLocaleUpperCase() + name.slice(1), value: monthlyTrend[key] ?? 0 })
    }
    return months
  }, [monthlyTrend, t])

  // O'qituvchi hisobotidagi qoida bilan (noyob mavzu, fayli bor material, savoli bor test)
  const breakdown: BreakdownSegment[] = useMemo(() => {
    const c = stats?.content
    return [
      { key: "video", label: t("adminDashboard.contentTypeVideo"), value: c?.videos ?? 0, color: "var(--cat-1)" },
      { key: "audio", label: t("adminDashboard.contentTypeAudio"), value: c?.audios ?? 0, color: "var(--cat-2)" },
      { key: "presentation", label: t("adminDashboard.contentTypePresentation"), value: c?.presentations ?? 0, color: "var(--cat-3)" },
      { key: "guide", label: t("adminDashboard.contentTypeGuide"), value: c?.guides ?? 0, color: "var(--cat-4)" },
      { key: "test", label: t("adminDashboard.contentTypeTest"), value: c?.tests ?? 0, color: "var(--cat-5)" },
      { key: "practice", label: t("adminDashboard.contentTypePractice"), value: c?.assignments ?? 0, color: "var(--cat-6)" },
    ]
  }, [stats, t])

  const contentTotal = stats?.totalContent ?? 0
  const videoCount = stats?.totalVideos ?? 0

  const pct = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0)
  const videoShare = pct(videoCount, contentTotal)
  const gradedShare = stats ? pct(stats.gradedSubmissions, stats.totalSubmissions) : 0
  const faceIdShare = stats ? pct(stats.faceRegistered, stats.totalStudents) : 0
  const activeStudentShare = stats ? pct(stats.activeStudents30d, stats.totalStudents) : 0
  const comprehension = stats ? Math.round(pct(stats.totalCompletions, stats.possibleCompletions)) : 0

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="adm-card h-[150px] animate-pulse" />)}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="adm-card h-[96px] animate-pulse" />)}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="adm-card h-[300px] animate-pulse lg:col-span-3" />
            <div className="adm-card h-[300px] animate-pulse lg:col-span-2" />
          </div>
        </div>
      ) : stats ? (
        <>
          {/* Qisqa xulosa qatori — 5 ta karta */}
          <motion.div variants={staggerContainer} initial="hidden" animate="visible"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
              icon={Users}
              color="#2563eb"
              label={t("adminDashboard.summary.activityTitle")}
              sub={t("adminDashboard.summary.activitySub")}
              value={<CountUp value={trendTotal} />}
              badge={activityDelta !== null ? <DeltaBadge delta={activityDelta} title={t("adminDashboard.vsPrevWeek")} /> : undefined}
            >
              <Sparkline data={trendData} color="#2563eb" />
            </KpiCard>
            <KpiCard
              icon={PlayCircle}
              color="#a855f7"
              label={t("adminDashboard.summary.contentTitle")}
              sub={t("adminDashboard.summary.contentSub")}
              value={<><CountUp value={Math.round(videoShare)} />%</>}
            >
              <RatioMeter part={videoCount} total={contentTotal} percent={videoShare} color="#a855f7" />
            </KpiCard>
            <KpiCard
              icon={FileCheck2}
              color="#16a34a"
              label={t("adminDashboard.summary.controlTitle")}
              sub={t("adminDashboard.summary.controlSub")}
              value={<><CountUp value={Math.round(gradedShare)} />%</>}
            >
              <RatioMeter part={stats.gradedSubmissions} total={stats.totalSubmissions} percent={gradedShare} color="#16a34a" />
            </KpiCard>
            <KpiCard
              icon={ScanFace}
              color="#7c3aed"
              label={t("adminDashboard.summary.faceIdTitle")}
              sub={t("adminDashboard.summary.faceIdSub")}
              value={<><CountUp value={Math.round(faceIdShare)} />%</>}
            >
              <RatioMeter part={stats.faceRegistered} total={stats.totalStudents} percent={faceIdShare} color="#7c3aed" />
            </KpiCard>
            <KpiCard
              icon={UsersRound}
              color="#f97316"
              label={t("adminDashboard.summary.studentsTitle")}
              sub={t("adminDashboard.summary.studentsSub")}
              value={<><CountUp value={Math.round(activeStudentShare)} />%</>}
            >
              <RatioMeter part={stats.activeStudents30d} total={stats.totalStudents} percent={activeStudentShare} color="#f97316" />
            </KpiCard>
          </motion.div>

          {/* Hero KPI row */}
          <motion.div variants={staggerContainer} initial="hidden" animate="visible"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <HeroStat icon={Users} label={t("adminDashboard.statStudents")} value={stats.totalStudents}
              g1="#3b7cf5" g2="#1d4ed8" href="/admin/foydalanuvchilar" />
            <HeroStat icon={GraduationCap} label={t("adminDashboard.statEmployees")} value={stats.totalEmployees}
              g1="#9b6cf6" g2="#6d28d9" href="/admin/foydalanuvchilar" />
            <HeroStat icon={BookOpen} label={t("adminDashboard.statTotalContent")} value={stats.totalContent}
              g1="#22b45f" g2="#13803f" href="/admin/oqituvchilar" />
            <HeroStat icon={CheckCircle2} label={t("adminDashboard.statCompletions")} value={stats.totalCompletions}
              g1="#fb8a3c" g2="#e05a0c" />
          </motion.div>

          {/* Analytics row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <motion.div variants={fadeUp} initial="hidden" animate="visible" className="adm-card p-5 sm:p-6 lg:col-span-3">
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

            <motion.div variants={fadeUp} initial="hidden" animate="visible" className="adm-card p-5 sm:p-6 lg:col-span-2">
              <SectionHeader
                icon={LayoutGrid}
                title={t("adminDashboard.sectionContentTitle")}
                subtitle={t("adminDashboard.sectionContentSubtitle")}
                right={
                  <span className="shrink-0 text-xs font-medium text-[var(--adm-muted)]">
                    {t("adminDashboard.total")}: <span className="text-sm font-bold text-[var(--adm-text)]">{contentTotal.toLocaleString(locale)}</span>
                  </span>
                }
              />
              <div className="mt-6">
                <StackedBreakdownBar segments={breakdown} />
              </div>
            </motion.div>
          </div>

          {/* Oylik faollik */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="adm-card p-5 sm:p-6">
            <SectionHeader
              icon={BarChart3}
              title={t("adminDashboard.sectionMonthlyTitle")}
              subtitle={trackedNote ? `${t("adminDashboard.sectionMonthlySubtitle")} · ${trackedNote}` : t("adminDashboard.sectionMonthlySubtitle")}
            />
            <div className="mt-4">
              <SimpleBarChart data={monthlyData} color="#2563eb" height={140} />
            </div>
          </motion.div>

          {/* Comprehension rate */}
          {stats.possibleCompletions > 0 && stats.totalCompletions > 0 && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible"
              className="adm-card flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="flex shrink-0 items-center gap-3">
                <div className="adm-icon-soft flex h-9 w-9 items-center justify-center rounded-xl" style={{ "--c": "var(--adm-accent)" } as CssVars}>
                  <TrendingUp className="h-[18px] w-[18px]" />
                </div>
                <span className="text-sm font-semibold text-[var(--adm-text)]">
                  {t("adminDashboard.comprehensionLabel")}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="truncate text-[11px] text-[var(--adm-muted)]">
                    {t("adminDashboard.completionsRatio", { completed: stats.totalCompletions.toLocaleString(locale), total: stats.possibleCompletions.toLocaleString(locale) })}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-[var(--adm-accent)]">
                    {comprehension}%
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--adm-accent) 14%, transparent)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, comprehension)}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #4f8df7, #2563eb)" }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Remaining KPIs */}
          <motion.div variants={staggerContainer} initial="hidden" animate="visible"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MiniStat icon={ShieldCheck} label={t("adminDashboard.statGrantedAdmins")} value={stats.grantedAdmins} color="#2563eb" href="/admin/foydalanuvchilar" />
            <MiniStat icon={Video} label={t("adminDashboard.statVideos")} value={stats.totalVideos} color="#a855f7" href="/admin/oqituvchilar" />
            <MiniStat icon={CalendarCheck} label={t("adminDashboard.statMeetings")} value={stats.totalMeetings} color="#16a34a" />
            <MiniStat icon={ClipboardList} label={t("adminDashboard.statSubmissions")} value={stats.totalSubmissions} color="#f97316" />
            <MiniStat icon={ShieldAlert} label={t("adminDashboard.statFaceRequests")} value={stats.facePending} color={stats.facePending > 0 ? "#e11d48" : "#64748b"} href="/admin/face-id" />
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
