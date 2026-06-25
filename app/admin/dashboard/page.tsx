"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Users, BookOpen, Video, CalendarCheck, ShieldAlert,
  ClipboardList, CheckCircle2, TrendingUp, ArrowRight,
} from "lucide-react"
import { adminApi, type AdminStats } from "@/lib/api"

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
    <div
      className="bg-white rounded-[12px] p-5 flex items-start gap-4 hover:shadow-md transition-shadow cursor-default"
      style={{ border: "1px solid rgba(1,41,112,0.08)", boxShadow: "0px 0px 6px rgba(1,41,112,0.04)" }}
    >
      <div className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {value.toLocaleString()}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {label}
        </div>
      </div>
      {href && <ArrowRight className="w-4 h-4 ml-auto shrink-0 mt-1" style={{ color: "#d8e6f7" }} />}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.stats()
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-[28px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Boshqaruv paneli
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Tizim statistikasi va umumiy ko'rsatkichlar
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white rounded-[12px] p-5 h-[88px] animate-pulse"
              style={{ border: "1px solid rgba(1,41,112,0.08)" }} />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={Users} label="Talabalar" value={stats.totalStudents} color="#0e58a8" href="/admin/foydalanuvchilar" />
            <StatCard icon={GraduationCapIcon} label="Xodimlar" value={stats.totalEmployees} color="#7c3aed" href="/admin/foydalanuvchilar" />
            <StatCard icon={ShieldCheckIcon} label="Berilgan adminlar" value={stats.grantedAdmins} color="#0891b2" href="/admin/foydalanuvchilar" />
            <StatCard icon={BookOpen} label="Jami kontent" value={stats.totalContent} color="#15803d" href="/admin/oqituvchilar" />
            <StatCard icon={Video} label="Video darslar" value={stats.totalVideos} color="#ea580c" href="/admin/oqituvchilar" />
            <StatCard icon={CalendarCheck} label="Meetinglar" value={stats.totalMeetings} color="#db2777" />
            <StatCard icon={ClipboardList} label="Topshirishlar" value={stats.totalSubmissions} color="#b45309" />
            <StatCard icon={CheckCircle2} label="Tugatilgan materiallar" value={stats.totalCompletions} color="#16a34a" />
            <StatCard icon={ShieldAlert} label="Face ID so'rovlar" value={stats.facePending} color={stats.facePending > 0 ? "#dc2626" : "#6b7280"} href="/admin/face-id" />
          </div>

          {/* Comprehension rate */}
          {stats.totalContent > 0 && stats.totalCompletions > 0 && (
            <div className="bg-white rounded-[12px] p-5 flex items-center gap-5"
              style={{ border: "1px solid rgba(1,41,112,0.08)" }}>
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6" style={{ color: "#0e58a8" }} />
                <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  Umumiy o'zlashtirish:
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {stats.totalCompletions} ta tugatilgan / {stats.totalContent} ta kontent
                  </span>
                  <span className="text-sm font-bold" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                    {Math.round((stats.totalCompletions / Math.max(stats.totalContent, 1)) * 100)}%
                  </span>
                </div>
                <div style={{ height: 6, backgroundColor: "#e8f0fb", borderRadius: 3 }}>
                  <div style={{
                    height: "100%",
                    borderRadius: 3,
                    backgroundColor: "#0e58a8",
                    width: `${Math.min(100, Math.round((stats.totalCompletions / Math.max(stats.totalContent, 1)) * 100))}%`,
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/admin/oqituvchilar"
              className="bg-white rounded-[12px] p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
              style={{ border: "1px solid rgba(1,41,112,0.08)" }}>
              <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#eef4ff" }}>
                <TrendingUp className="w-5 h-5" style={{ color: "#0e58a8" }} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>O'qituvchi hisoboti</div>
                <div className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Kim qancha material yuklagan, video darslar</div>
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
                <div className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Foydalanuvchilar</div>
                <div className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Ruxsatlar berish, rollarni boshqarish</div>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto shrink-0" style={{ color: "#d8e6f7" }} />
            </Link>
          </div>
        </>
      ) : (
        <div className="text-center text-sm py-16" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Statistika yuklanmadi
        </div>
      )}
    </div>
  )
}

function GraduationCapIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  )
}
function ShieldCheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
    </svg>
  )
}
