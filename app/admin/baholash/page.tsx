"use client"

import { useState, useCallback, useMemo } from "react"
import {
  Lock, LockOpen, CheckCircle, AlertCircle, RefreshCw, Search, BookOpen, User, UsersRound,
  LayoutGrid, GraduationCap, ChevronLeft, ChevronRight, RotateCcw, CalendarClock, BookCheck,
} from "lucide-react"
import { adminApi, type AdminLockedAssignment } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { trainingTypeLabelKey, normalizeTrainingType } from "@/lib/attendanceTrainingTypes"
import { motion, pageVariants } from "@/components/ui/motion"
import { PersonAvatar } from "@/components/ui/PersonAvatar"
import { Field, FieldSelect, TintStat, EmptyCard, PageHeader, Notice, type CssVars } from "@/components/admin/AdminUi"

const PAGE_SIZE = 20
const NUM = { fontVariantNumeric: "tabular-nums" } as const
const pad = (n: number) => String(n).padStart(2, "0")

/** Intl'siz (brauzerda uz locale ma'lumotlari yo'q): 25.11.2026 */
function fmtDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** Muddatdan beri necha kun o'tgan (kelajakdagi muddat — null) */
function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  return diff >= 0 ? diff : null
}

export default function AdminBaholash() {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useApi(() => adminApi.lockedAssignments(), [])
  const items: AdminLockedAssignment[] = useMemo(() => data?.data ?? [], [data])

  const [unlocking, setUnlocking] = useState<Record<number, boolean>>({})
  const [unlocked, setUnlocked] = useState<Set<number>>(new Set())
  const [unlockError, setUnlockError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [subjectF, setSubjectF] = useState("")
  const [teacherF, setTeacherF] = useState("")
  const [groupF, setGroupF] = useState("")
  const [page, setPage] = useState(0)

  const handleUnlock = useCallback(async (id: number) => {
    setUnlocking(prev => ({ ...prev, [id]: true }))
    setUnlockError(null)
    try {
      await adminApi.unlockContent(id)
      setUnlocked(prev => new Set(prev).add(id))
      setTimeout(() => refetch(), 600)
    } catch (e) {
      setUnlockError(e instanceof Error ? e.message : t("adminBaholash.errorDefault"))
    } finally {
      setUnlocking(prev => ({ ...prev, [id]: false }))
    }
  }, [refetch]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tanlov ro'yxatlari
  const subjects = useMemo(() => [...new Set(items.map(i => i.subjectName))].sort((a, b) => a.localeCompare(b)), [items])
  const teachers = useMemo(() => {
    const m = new Map<number, string>()
    for (const i of items) if (!subjectF || i.subjectName === subjectF) m.set(i.teacherUserId, i.teacherName || `#${i.teacherUserId}`)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [items, subjectF])
  const groups = useMemo(() => {
    const m = new Map<number, string>()
    for (const i of items) {
      if (subjectF && i.subjectName !== subjectF) continue
      if (teacherF && String(i.teacherUserId) !== teacherF) continue
      m.set(i.groupId, i.groupName || `#${i.groupId}`)
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }))
  }, [items, subjectF, teacherF])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(i =>
      (!q || i.title.toLowerCase().includes(q)) &&
      (!subjectF || i.subjectName === subjectF) &&
      (!teacherF || String(i.teacherUserId) === teacherF) &&
      (!groupF || String(i.groupId) === groupF)
    )
  }, [items, search, subjectF, teacherF, groupF])

  const stats = useMemo(() => ({
    subjects: new Set(items.map(i => i.subjectName)).size,
    groups: new Set(items.map(i => i.groupId)).size,
    teachers: new Set(items.map(i => i.teacherUserId)).size,
  }), [items])

  const hasFilter = !!(search || subjectF || teacherF || groupF)
  function resetFilters() { setSearch(""); setSubjectF(""); setTeacherF(""); setGroupF(""); setPage(0) }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage = Math.min(page, pageCount - 1)
  const slice = filtered.slice(curPage * PAGE_SIZE, (curPage + 1) * PAGE_SIZE)

  const headers = ["#", t("adminBaholash.colTopic"), t("adminBaholash.subjectLabel"), t("adminBaholash.groupLabel"),
    t("adminBaholash.teacherLabel"), t("adminBaholash.colMaxScore"), t("adminBaholash.colDeadline"), t("adminBaholash.colAction")]

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="flex flex-col gap-5 px-4 pb-8 pt-2 sm:px-8">
      <PageHeader icon={BookCheck} title={t("adminBaholash.pageTitle")} subtitle={t("adminBaholash.pageSubtitle")}>
        <button onClick={() => refetch()}
          className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          style={{ boxShadow: "var(--adm-shadow)" }}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> {t("adminBaholash.refresh")}
        </button>
      </PageHeader>

      {/* Qisqa xulosa */}
      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="adm-card h-[84px] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <TintStat icon={Lock} color="var(--role-admin)" label={t("adminBaholash.statFinished")} value={items.length} />
          <TintStat icon={BookOpen} color="var(--adm-accent)" label={t("adminBaholash.statSubjects")} value={stats.subjects} />
          <TintStat icon={LayoutGrid} color="var(--role-dean)" label={t("adminBaholash.statGroups")} value={stats.groups} />
          <TintStat icon={GraduationCap} color="var(--adm-up)" label={t("adminBaholash.statTeachers")} value={stats.teachers} />
        </div>
      )}

      {/* Filtrlar */}
      <div className="adm-card grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-[1.3fr_1fr_1.2fr_1fr_auto]">
        <Field icon={Search} label={t("adminBaholash.colTopic")}>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder={t("adminBaholash.searchPh")}
            className="w-full bg-transparent text-sm font-semibold text-[var(--adm-text)] outline-none placeholder:font-normal placeholder:text-[var(--adm-muted)]" />
        </Field>
        <Field icon={BookOpen} label={t("adminBaholash.subjectLabel")}>
          <FieldSelect value={subjectF} onChange={v => { setSubjectF(v); setTeacherF(""); setGroupF(""); setPage(0) }}>
            <option value="">{t("adminBaholash.allSubjects")}</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </FieldSelect>
        </Field>
        <Field label={t("adminBaholash.teacherLabel")}
          iconNode={teacherF ? (
            <PersonAvatar kind="employee" id={teacherF} className="h-9 w-9 rounded-lg">
              <span className="adm-icon-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ "--c": "var(--adm-accent)" } as CssVars}><User className="h-[18px] w-[18px]" /></span>
            </PersonAvatar>
          ) : undefined}
          icon={User}>
          <FieldSelect value={teacherF} onChange={v => { setTeacherF(v); setGroupF(""); setPage(0) }}>
            <option value="">{t("adminBaholash.allTeachers")}</option>
            {teachers.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
          </FieldSelect>
        </Field>
        <Field icon={UsersRound} label={t("adminBaholash.groupLabel")}>
          <FieldSelect value={groupF} onChange={v => { setGroupF(v); setPage(0) }}>
            <option value="">{t("adminBaholash.allGroups")}</option>
            {groups.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
          </FieldSelect>
        </Field>
        <button type="button" onClick={resetFilters} disabled={!hasFilter} title={t("adminBaholash.reset")} aria-label={t("adminBaholash.reset")}
          className="adm-btn-outline flex h-[56px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-40 sm:col-span-2 xl:col-span-1 xl:w-[56px] xl:px-0"
          style={{ color: "var(--adm-text-2)" }}>
          <RotateCcw className="h-4 w-4" /><span className="xl:hidden">{t("adminBaholash.reset")}</span>
        </button>
      </div>

      {unlockError && (
        <Notice ok={false}><AlertCircle className="h-4 w-4 shrink-0" />{unlockError}</Notice>
      )}

      {error ? (
        <div className="adm-card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm" style={{ color: "var(--role-admin)" }}>{error}</p>
          <button onClick={() => refetch()} className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <RefreshCw className="h-4 w-4" /> {t("adminBaholash.refresh")}
          </button>
        </div>
      ) : loading && !data ? (
        <div className="adm-card h-[360px] animate-pulse" />
      ) : items.length === 0 ? (
        <div className="adm-card p-14 text-center">
          <CheckCircle className="mx-auto mb-3 h-10 w-10 text-[var(--adm-up)] opacity-60" />
          <p className="text-sm font-semibold text-[var(--adm-text)]">{t("adminBaholash.emptyTitle")}</p>
          <p className="mt-1 text-xs text-[var(--adm-muted)]">{t("adminBaholash.emptyDesc")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyCard icon={Search} text={t("adminBaholash.noMatch")} />
      ) : (
        <div className="adm-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--adm-border)" }}>
            <h2 className="text-[15px] font-semibold text-[var(--adm-text)]">{t("adminBaholash.listTitle")}</h2>
            <span className="adm-pill" style={{ "--c": "var(--role-admin)" } as CssVars}>
              <Lock className="h-3 w-3" /> {t("adminBaholash.totalCount", { n: filtered.length })}
            </span>
          </div>
          <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-50" : ""}`}>
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
                  {headers.map((h, i) => (
                    <th key={i} className={`whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--adm-muted)] ${i === 5 ? "text-center" : i === 7 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slice.map((item, i) => {
                  const isUnlocking = unlocking[item.id]
                  const isUnlocked = unlocked.has(item.id)
                  const ago = daysSince(item.deadline)
                  const typeKey = trainingTypeLabelKey(item.trainingType)
                  return (
                    <tr key={item.id} className="adm-hover-row" style={{
                      borderBottom: "1px solid var(--adm-border)",
                      ...(isUnlocked ? { backgroundColor: "color-mix(in srgb, var(--adm-up) 6%, transparent)" } : {}),
                    }}>
                      <td className="w-12 px-4 py-3 text-xs text-[var(--adm-muted)]" style={NUM}>{curPage * PAGE_SIZE + i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="adm-icon-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                            style={{ "--c": isUnlocked ? "var(--adm-up)" : "var(--role-admin)" } as CssVars}>
                            {isUnlocked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="max-w-[340px] truncate text-[13px] font-semibold text-[var(--adm-text)]" title={item.title}>{item.title}</div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="adm-pill" style={{ "--c": "var(--adm-accent)", padding: "0 8px", fontSize: 11 } as CssVars}>
                                {t("adminBaholash.practicalAssignment")}
                              </span>
                              {/* "Amaliy" — "Amaliy topshiriq" bilan takror; boshqa tur bo'lsa ko'rsatiladi */}
                              {item.trainingType && normalizeTrainingType(item.trainingType) !== "Amaliy" && (
                                <span className="adm-pill" style={{ padding: "0 8px", fontSize: 11 }}>
                                  {typeKey ? t(typeKey) : item.trainingType}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="min-w-[150px] max-w-[220px] px-4 py-3 text-[13px] text-[var(--adm-text-2)]">{item.subjectName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] font-medium text-[var(--adm-text)]">{item.groupName ?? `#${item.groupId}`}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <PersonAvatar kind="employee" id={item.teacherUserId} className="h-8 w-8 rounded-full"
                            style={{ boxShadow: "0 0 0 2px var(--adm-card), 0 0 0 3px var(--adm-border-strong)" }}>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                              style={{ background: "linear-gradient(135deg, #34d399, #059669)" }}>
                              {(item.teacherName ?? "?").charAt(0).toUpperCase()}
                            </div>
                          </PersonAvatar>
                          <span className="max-w-[180px] truncate text-xs font-medium text-[var(--adm-text)]">{item.teacherName ?? `#${item.teacherUserId}`}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-[13px] font-semibold text-[var(--adm-text)]" style={NUM}>{item.maxScore ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {item.deadline ? (
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 shrink-0 text-[var(--adm-muted)]" />
                            <div>
                              <div className="text-[13px] font-medium text-[var(--adm-text)]" style={NUM}>{fmtDate(item.deadline)}</div>
                              {ago !== null && (
                                <div className="text-[11px] text-[var(--adm-muted)]" style={NUM}>
                                  {ago === 0 ? t("adminBaholash.today") : t("adminBaholash.daysAgo", { n: ago })}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : <span className="text-[var(--adm-muted)]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isUnlocked ? (
                          <span className="adm-pill font-semibold" style={{ "--c": "var(--adm-up)" } as CssVars}>
                            <CheckCircle className="h-3.5 w-3.5" /> {t("adminBaholash.unlockedLabel")}
                          </span>
                        ) : (
                          <button onClick={() => handleUnlock(item.id)} disabled={isUnlocking}
                            className="adm-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold disabled:opacity-60">
                            {isUnlocking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LockOpen className="h-4 w-4" />}
                            {isUnlocking ? t("adminBaholash.unlockingLabel") : t("adminBaholash.unlockBtn")}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3" style={{ borderTop: "1px solid var(--adm-border)" }}>
              <span className="text-xs text-[var(--adm-muted)]" style={NUM}>
                {t("adminBaholash.shownRange", { total: filtered.length, from: curPage * PAGE_SIZE + 1, to: Math.min(filtered.length, (curPage + 1) * PAGE_SIZE) })}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(curPage - 1)} disabled={curPage <= 0} aria-label="←"
                  className="adm-btn-outline flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[56px] text-center text-xs font-semibold text-[var(--adm-text)]" style={NUM}>{curPage + 1} / {pageCount}</span>
                <button onClick={() => setPage(curPage + 1)} disabled={curPage >= pageCount - 1} aria-label="→"
                  className="adm-btn-outline flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
