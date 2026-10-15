"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Users, UsersRound, RefreshCw, GraduationCap, ChevronLeft, ChevronRight, X, ScanFace,
  CircleCheck, CircleAlert, Send, Search, LayoutGrid, Gauge,
} from "lucide-react"
import { adminApi, type StudentFaceRow } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { tr } from "@/lib/i18n/translations"
import { motion, pageVariants } from "@/components/ui/motion"
import { PersonAvatar } from "@/components/ui/PersonAvatar"

const PAGE_SIZE = 20

type CssVars = React.CSSProperties & Record<`--${string}`, string>

interface GroupRow { groupId: number; groupName: string; studentCount: number }

function Initial({ name, className = "h-9 w-9 text-[13px]" }: { name: string; className?: string }) {
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  )
}

function RosterModal({ group, onClose }: { group: GroupRow; onClose: () => void }) {
  const { t } = useLanguage()
  const [students, setStudents] = useState<StudentFaceRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    adminApi.studentFaceRoster(group.groupId)
      .then(res => { if (!cancelled) setStudents(res.students) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : tr("adminStudents.errLoad")) })
    return () => { cancelled = true }
  }, [group.groupId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleRequest(hemisId: number, fullName: string, alreadyRegistered: boolean) {
    const confirmMsg = alreadyRegistered
      ? t("adminStudents.confirmReset", { name: fullName })
      : t("adminStudents.confirmRequest", { name: fullName })
    if (!window.confirm(confirmMsg)) return

    setSendingId(hemisId)
    try {
      await adminApi.requestFaceReregister(hemisId)
      setStudents(prev => prev?.map(s => s.hemisId === hemisId ? { ...s, faceRegistered: false, adminRequestPending: false } : s) ?? prev)
    } catch {
      // jimgina — tugma yana bosiladigan holatga qaytadi, qayta urinish mumkin
    } finally {
      setSendingId(null)
    }
  }

  const registered = students?.filter(s => s.faceRegistered).length ?? 0
  const total = students?.length ?? 0
  const share = total ? Math.round((registered / total) * 100) : 0

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(8,15,40,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="adm-card flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden"
        style={{ boxShadow: "var(--adm-shadow-pop)" }}>
        <div className="flex items-start justify-between gap-4 px-5 py-4" style={{ borderBottom: "1px solid var(--adm-border)" }}>
          <div className="flex items-center gap-3">
            <div className="adm-icon-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ "--c": "var(--adm-accent)" } as CssVars}>
              <ScanFace className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-[var(--adm-text)]">{group.groupName}</h2>
              <p className="text-xs text-[var(--adm-muted)]">{t("adminStudents.faceStatus")}</p>
            </div>
          </div>
          <button onClick={onClose} className="adm-btn-outline flex h-9 w-9 shrink-0 items-center justify-center rounded-full" aria-label={t("common.close")}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {students && total > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
            <span className="adm-pill" style={{ "--c": "var(--adm-up)" } as CssVars}>
              <CircleCheck className="h-3.5 w-3.5" /> {t("adminStudents.registered")}: {registered}
            </span>
            <span className="adm-pill" style={{ "--c": "var(--role-pending)" } as CssVars}>
              <CircleAlert className="h-3.5 w-3.5" /> {t("adminStudents.notRegistered")}: {total - registered}
            </span>
            <div className="flex min-w-[140px] flex-1 items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--adm-grid)]">
                <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: "var(--adm-up)" }} />
              </div>
              <span className="text-xs font-semibold text-[var(--adm-text-2)]" style={{ fontVariantNumeric: "tabular-nums" }}>{share}%</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="p-6 text-sm" style={{ color: "var(--role-admin)" }}>{error}</div>
          ) : students === null ? (
            <div className="flex flex-col">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                  <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--adm-grid)]" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--adm-grid)]" />
                    <div className="h-2.5 w-1/4 animate-pulse rounded bg-[var(--adm-grid)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="p-10 text-center text-sm text-[var(--adm-muted)]">
              {t("adminStudents.noStudents")}
            </div>
          ) : (
            <div className="flex flex-col">
              {students.map((s, i) => (
                <div key={s.hemisId} className="adm-hover-row flex flex-wrap items-center gap-3 px-5 py-2.5" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                  <span className="w-5 shrink-0 text-xs text-[var(--adm-muted)]" style={{ fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                  <PersonAvatar kind="student" id={s.hemisId} className="h-10 w-10 rounded-full"
                    style={{ boxShadow: "0 0 0 2px var(--adm-card), 0 0 0 3px var(--adm-border-strong)" }}>
                    <Initial name={s.fullName} className="h-10 w-10 text-sm" />
                  </PersonAvatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-[var(--adm-text)]">{s.fullName}</div>
                    {s.studentIdNumber && (
                      <div className="mt-0.5 text-xs text-[var(--adm-muted)]" style={{ fontVariantNumeric: "tabular-nums" }}>{s.studentIdNumber}</div>
                    )}
                  </div>
                  {s.faceRegistered ? (
                    <span className="adm-pill" style={{ "--c": "var(--adm-up)" } as CssVars}>
                      <CircleCheck className="h-3.5 w-3.5" /> {t("adminStudents.registered")}
                    </span>
                  ) : (
                    <span className="adm-pill" style={{ "--c": "var(--role-pending)" } as CssVars}>
                      <CircleAlert className="h-3.5 w-3.5" /> {t("adminStudents.notRegistered")}
                    </span>
                  )}
                  <div className="flex min-w-[150px] justify-end">
                    {s.adminRequestPending ? (
                      <span className="text-xs italic text-[var(--adm-muted)]">{t("adminStudents.requestSent")}</span>
                    ) : sendingId === s.hemisId ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-[var(--adm-accent)]" />
                    ) : (
                      <button onClick={() => handleRequest(s.hemisId, s.fullName, s.faceRegistered)}
                        className="adm-btn-outline inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold"
                        style={s.faceRegistered ? { color: "var(--role-admin)" } : undefined}>
                        <Send className="h-3.5 w-3.5" />
                        {s.faceRegistered ? t("adminStudents.reregister") : t("adminStudents.request")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function StatCard({ icon: Icon, color, value, label, loading }: {
  icon: React.ElementType
  color: string
  value: React.ReactNode
  label: string
  loading: boolean
}) {
  return (
    <div className="adm-card flex items-center gap-3 p-3.5 sm:gap-3.5 sm:p-5" style={{ "--c": color } as CssVars}>
      <div className="adm-icon-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12">
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="min-w-0">
        {loading ? (
          <div className="my-1 h-6 w-14 animate-pulse rounded-md bg-[var(--adm-grid)]" />
        ) : (
          <div className="text-2xl font-bold leading-tight text-[var(--adm-text)]" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</div>
        )}
        <div className="truncate text-sm text-[var(--adm-text-2)]">{label}</div>
      </div>
    </div>
  )
}

export default function AdminTalabalar() {
  const { t } = useLanguage()
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [totalGroups, setTotalGroups] = useState(0)
  const [totalStudents, setTotalStudents] = useState(0)
  const [courses, setCourses] = useState<{ code: string; name: string }[]>([])
  const [degrees, setDegrees] = useState<{ code: string; name: string }[]>([])
  const [courseFilter, setCourseFilter] = useState("")
  const [degreeFilter, setDegreeFilter] = useState("")
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  // Birinchi yuklash tugaguncha skelet; keyingi yangilashlarda jadval xira tortadi xolos
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null)

  function load(courseArg?: string, degreeArg?: string, pageArg?: number) {
    setLoading(true)
    setError(null)
    const p = pageArg ?? page
    adminApi.hemisStudents({
      course: courseArg ?? courseFilter,
      degree: degreeArg ?? degreeFilter,
      limit: PAGE_SIZE,
      offset: p * PAGE_SIZE,
    })
      .then(res => {
        setGroups(res.groups ?? [])
        setTotalGroups(res.totalGroups ?? 0)
        setTotalStudents(res.totalStudents ?? 0)
        setCourses(res.courses ?? [])
        setDegrees(res.degrees ?? [])
        setLoaded(true)
      })
      .catch(e => setError(e instanceof Error ? e.message : tr("adminStudents.errLoad")))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(totalGroups / PAGE_SIZE))

  function goToPage(p: number) {
    const clamped = Math.min(Math.max(p, 0), totalPages - 1)
    setPage(clamped)
    load(courseFilter, degreeFilter, clamped)
  }

  function applyCourse(code: string) {
    setCourseFilter(code)
    setPage(0)
    load(code, degreeFilter, 0)
  }

  // Daraja o'zgarganda kurs tanlovi ham tozalanadi — kurslar ro'yxati
  // darajaga bog'liq (Bakalavr va Magistr har xil kurslarga ega), eski
  // tanlov yangi darajada mavjud bo'lmasligi mumkin.
  function applyDegree(name: string) {
    setDegreeFilter(name)
    setCourseFilter("")
    setPage(0)
    load("", name, 0)
  }

  const filtered = groups.filter(g => g.groupName.toLowerCase().includes(search.trim().toLowerCase()))
  const maxCount = useMemo(() => Math.max(1, ...groups.map(g => g.studentCount)), [groups])
  const avg = totalGroups ? Math.round(totalStudents / totalGroups) : 0

  const headers = ["#", t("common.group"), t("adminStudents.studentCount"), ""]

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="flex flex-col gap-5 px-4 pb-8 pt-2 sm:px-8">
      {/* Sarlavha */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="adm-icon-soft flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ "--c": "var(--adm-accent)" } as CssVars}>
            <UsersRound className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-[var(--adm-text)] sm:text-[30px]">
              {t("adminStudents.title")}
            </h1>
            <p className="mt-0.5 text-sm text-[var(--adm-muted)]">{t("adminStudents.subtitle")}</p>
          </div>
        </div>
        <button onClick={() => load(courseFilter, degreeFilter, page)}
          className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          style={{ boxShadow: "var(--adm-shadow)" }}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> {t("common.refresh")}
        </button>
      </div>

      {/* Qisqa xulosa */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard icon={Users} color="var(--role-student)" value={totalStudents} label={t("adminStudents.statStudents")} loading={!loaded} />
        <StatCard icon={LayoutGrid} color="var(--role-dean)" value={totalGroups} label={t("adminStudents.statGroups")} loading={!loaded} />
        <StatCard icon={Gauge} color="var(--role-teacher)" value={avg} label={t("adminStudents.statAvg")} loading={!loaded} />
      </div>

      {/* Qidiruv va filtrlar — daraja avval tanlanadi, kurs ro'yxati shunga
          qarab o'zgaradi (Bakalavr va Magistr'ning kurslari har xil) */}
      <div className="adm-card flex flex-wrap items-center gap-3 p-3 sm:p-4">
        <label className="adm-input flex h-10 w-full items-center gap-2 rounded-xl px-3 sm:w-[300px]">
          <Search className="h-4 w-4 shrink-0 text-[var(--adm-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("adminStudents.searchPage")}
            className="w-full bg-transparent text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[var(--adm-muted)]">{t("adminStudents.degree")}</span>
          <select value={degreeFilter} onChange={e => applyDegree(e.target.value)}
            className="adm-input h-10 rounded-xl px-3 text-sm outline-none">
            <option value="">{t("common.all")}</option>
            {degrees.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[var(--adm-muted)]">{t("adminStudents.course")}</span>
          <select value={courseFilter} onChange={e => applyCourse(e.target.value)}
            className="adm-input h-10 rounded-xl px-3 text-sm outline-none">
            <option value="">{t("common.all")}</option>
            {courses.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </label>
      </div>

      {error ? (
        <div className="adm-card p-6 text-sm" style={{ color: "var(--role-admin)" }}>{error}</div>
      ) : (
        <div className="adm-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--adm-border)" }}>
            <h2 className="text-[15px] font-semibold text-[var(--adm-text)]">{t("adminStudents.byGroups")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
                  {headers.map((h, i) => (
                    <th key={i} className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--adm-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`transition-opacity ${loading && loaded ? "opacity-50" : ""}`}>
                {!loaded ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--adm-border)" }}>
                      <td colSpan={headers.length} className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 animate-pulse rounded-xl bg-[var(--adm-grid)]" />
                          <div className="h-3 w-1/5 animate-pulse rounded bg-[var(--adm-grid)]" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} className="px-5 py-16 text-center text-sm text-[var(--adm-muted)]">
                      <div className="flex flex-col items-center gap-2">
                        <GraduationCap className="h-9 w-9 opacity-40" />
                        {t("adminStudents.noGroups")}
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((g, i) => (
                  <tr key={g.groupId} onClick={() => setSelectedGroup(g)}
                    className="adm-hover-row cursor-pointer" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                    <td className="w-12 px-5 py-3 text-xs text-[var(--adm-muted)]" style={{ fontVariantNumeric: "tabular-nums" }}>{page * PAGE_SIZE + i + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="adm-icon-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ "--c": "var(--role-student)" } as CssVars}>
                          <UsersRound className="h-[18px] w-[18px]" />
                        </div>
                        <span className="text-sm font-semibold text-[var(--adm-text)]">{g.groupName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 text-sm font-bold text-[var(--adm-text)]" style={{ fontVariantNumeric: "tabular-nums" }}>{g.studentCount}</span>
                        <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-[var(--adm-grid)] sm:block">
                          <div className="h-full rounded-full" style={{ width: `${Math.round((g.studentCount / maxCount) * 100)}%`, backgroundColor: "var(--adm-accent)" }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="adm-btn-outline inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold">
                        <ScanFace className="h-3.5 w-3.5" /> Face ID
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loaded && totalGroups > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3" style={{ borderTop: "1px solid var(--adm-border)" }}>
              <span className="text-xs text-[var(--adm-muted)]" style={{ fontVariantNumeric: "tabular-nums" }}>
                {t("adminStudents.pageRange", { from: page * PAGE_SIZE + 1, to: Math.min(totalGroups, page * PAGE_SIZE + PAGE_SIZE), total: totalGroups })}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => goToPage(page - 1)} disabled={page <= 0} aria-label="←"
                  className="adm-btn-outline flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[56px] text-center text-xs font-semibold text-[var(--adm-text)]" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {page + 1} / {totalPages}
                </span>
                <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages - 1} aria-label="→"
                  className="adm-btn-outline flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedGroup && <RosterModal group={selectedGroup} onClose={() => setSelectedGroup(null)} />}
    </motion.div>
  )
}
