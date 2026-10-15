"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Search, ChevronDown, ChevronLeft, ChevronRight, UserRound, UsersRound, Shield, GraduationCap,
  BookOpen, Ban, Clock, RefreshCw, Users as UsersIcon, CircleCheck, CircleAlert, Filter, Check,
} from "lucide-react"
import { adminApi, type AdminUser } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { motion, pageVariants } from "@/components/ui/motion"

const PAGE_SIZE = 20

type CssVars = React.CSSProperties & Record<`--${string}`, string>

// Ranglar admin.css'dagi --role-* tokenlaridan — qorong'i rejimda o'zi almashadi
const ROLE_CONFIG: Record<string, { labelKey: string; color: string; icon: React.ElementType }> = {
  admin:   { labelKey: "adminFoydalanuvchilar.roleAdmin",   color: "var(--role-admin)",   icon: Shield },
  dean:    { labelKey: "adminFoydalanuvchilar.roleDean",    color: "var(--role-dean)",    icon: GraduationCap },
  teacher: { labelKey: "adminFoydalanuvchilar.roleTeacher", color: "var(--role-teacher)", icon: BookOpen },
  student: { labelKey: "adminFoydalanuvchilar.roleStudent", color: "var(--role-student)", icon: UsersRound },
  blocked: { labelKey: "adminFoydalanuvchilar.roleBlocked", color: "var(--role-blocked)", icon: Ban },
  pending: { labelKey: "adminFoydalanuvchilar.rolePending", color: "var(--role-pending)", icon: Clock },
}

const LMS_ROLES = ["admin", "dean", "teacher", "student", "blocked", "pending"]
const STAT_ROLES = ["admin", "dean", "teacher", "student", "blocked"] as const
const HEMIS_ROLE_LABEL_KEY: Record<string, string> = {
  employee: "adminFoydalanuvchilar.hemisEmployee",
  student: "adminFoydalanuvchilar.hemisStudent",
  super_admin: "adminFoydalanuvchilar.hemisSuperAdmin",
  api: "adminFoydalanuvchilar.hemisApi",
}

/** 2026.10.15 14:32 — Intl'siz (brauzerda uz locale ma'lumotlari yo'q, "M10" chiqarardi) */
function formatDateTime(s: string) {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return "—"
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** HEMIS surati; yuklanmasa (yo'q/buzuq havola) — ismning bosh harfi */
function UserAvatar({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false)
  const initial = name.trim().charAt(0).toUpperCase() || "?"
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
        style={{ boxShadow: "0 0 0 2px var(--adm-card), 0 0 0 3px var(--adm-border-strong)", backgroundColor: "var(--adm-grid)" }}
      />
    )
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
      style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}>
      {initial}
    </div>
  )
}

function RoleBadge({ role, auto }: { role: string | null; auto?: boolean }) {
  const { t } = useLanguage()
  if (!role) return <span className="text-xs text-[var(--adm-muted)]">—</span>
  const cfg = ROLE_CONFIG[role]
  const Icon = cfg?.icon ?? Clock
  const label = cfg ? t(cfg.labelKey) : role
  return (
    <span className="adm-pill" style={{ "--c": cfg?.color ?? "var(--adm-muted)" } as CssVars}
      title={auto ? `${label} (${t("adminFoydalanuvchilar.autoSuffix")})` : undefined}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

/** Menyu jadval kartasi (overflow) ichida kesilib qolmasligi uchun `fixed`
 *  — tugma joylashuvidan hisoblanadi, pastda joy bo'lmasa tepaga ochiladi. */
function RoleDropdown({ current, onSet }: { current: string | null; onSet: (role: string) => void }) {
  const { t } = useLanguage()
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const MENU_H = LMS_ROLES.length * 36 + 10

  function toggle() {
    if (pos) { setPos(null); return }
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const below = window.innerHeight - r.bottom
    setPos({
      top: below < MENU_H + 12 ? Math.max(8, r.top - MENU_H - 6) : r.bottom + 6,
      right: Math.max(8, window.innerWidth - r.right),
    })
  }

  useEffect(() => {
    if (!pos) return
    const close = () => setPos(null)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [pos])

  return (
    <>
      <button ref={btnRef} onClick={toggle} data-active={!!pos}
        className="adm-btn-outline flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold">
        {t("adminFoydalanuvchilar.assignRole")}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${pos ? "rotate-180" : ""}`} />
      </button>
      {pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPos(null)} />
          <div className="adm-pop fixed z-50 min-w-[170px] overflow-hidden p-1" style={{ top: pos.top, right: pos.right }}>
            {LMS_ROLES.map(r => {
              const cfg = ROLE_CONFIG[r]
              const Icon = cfg.icon
              const active = current === r
              return (
                <button
                  key={r}
                  onClick={() => { onSet(r); setPos(null) }}
                  data-active={active}
                  className="adm-hover-row flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px]"
                  style={{ color: active ? "var(--adm-accent)" : "var(--adm-text)", fontWeight: active ? 600 : 500 }}>
                  <Icon className="h-4 w-4 shrink-0" style={{ color: cfg.color }} />
                  <span className="flex-1">{t(cfg.labelKey)}</span>
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

export default function AdminFoydalanuvchilar() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const qParam = searchParams.get("q")
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({ admin: 0, dean: 0, teacher: 0, student: 0, blocked: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  // Birinchi yuklash tugaguncha skelet; keyingi yangilashlarda jadval xira tortadi xolos
  const [loaded, setLoaded] = useState(false)
  // Admin yuqori panelidagi qidiruvdan kelganda (?q=...) matn shu yerga qo'yiladi
  const [search, setSearch] = useState(qParam ?? "")
  const [roleFilter, setRoleFilter] = useState("")
  const [faceFilter, setFaceFilter] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [saving, setSaving] = useState<string | null>(null)

  const load = (q?: string, role?: string, pageArg?: number, face?: string) => {
    setLoading(true)
    const p = pageArg ?? page
    adminApi.users({ search: q ?? search, lms_role: role ?? roleFilter, face_id: face ?? faceFilter, limit: PAGE_SIZE, offset: p * PAGE_SIZE })
      .then(res => { setUsers(res.data); setTotal(res.total); setRoleCounts(res.roleCounts); setLoaded(true) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Shu sahifada turganda yuqoridan yana qidirilsa — yangi `q` maydonga tushadi
  // (render paytida solishtiriladi — effekt ichida setState o'rniga)
  const [prevQParam, setPrevQParam] = useState(qParam)
  if (qParam !== prevQParam) {
    setPrevQParam(qParam)
    if (qParam !== null) setSearch(qParam)
  }

  // Qidiruv matni o'zgarganda serverdan qayta so'raladi (0-sahifadan) —
  // sahifalash kiritilgach, endi faqat ekrandagi 20 tani emas, BARCHA
  // foydalanuvchilar orasidan qidirish kerak.
  useEffect(() => {
    const timer = setTimeout(() => { setPage(0); load(search, roleFilter, 0, faceFilter) }, 400)
    return () => clearTimeout(timer)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function goToPage(p: number) {
    const clamped = Math.min(Math.max(p, 0), totalPages - 1)
    setPage(clamped)
    load(search, roleFilter, clamped, faceFilter)
  }

  function applyRoleFilter(r: string) {
    setRoleFilter(r)
    setPage(0)
    // Face ID faqat talabalarga tegishli — boshqa rolga o'tilsa, eskirib
    // qolgan filtr sukut-ostida qo'llanib "0 ta natija" chiqarib qo'ymasligi
    // uchun tozalanadi ("Barchasi"da qoladi — server o'zi talabalar bilan
    // cheklaydi).
    const nextFace = r === "student" || r === "" ? faceFilter : ""
    setFaceFilter(nextFace)
    load(search, r, 0, nextFace)
  }

  function applyFaceFilter(f: string) {
    setFaceFilter(f)
    setPage(0)
    // Face ID tanlansa natija baribir faqat talabalar — o'qituvchi/admin
    // tabida qolib "0 ta" ko'rsatmaslik uchun talabaga o'tkaziladi
    const nextRole = f && roleFilter !== "" && roleFilter !== "student" ? "student" : roleFilter
    setRoleFilter(nextRole)
    load(search, nextRole, 0, f)
  }

  async function handleSetRole(user: AdminUser, role: string) {
    setSaving(user.hemisId)
    try {
      await adminApi.setRole(user.hemisId, role)
      setUsers(prev => prev.map(u => u.hemisId === user.hemisId ? { ...u, lmsRole: role, roleIsDefault: false } : u))
    } finally {
      setSaving(null)
    }
  }

  const headers = [
    t("adminFoydalanuvchilar.colIndex"),
    t("adminFoydalanuvchilar.colFullName"),
    t("adminFoydalanuvchilar.colHemisRole"),
    t("adminFoydalanuvchilar.colLmsRole"),
    t("adminFoydalanuvchilar.colGroup"),
    t("adminFoydalanuvchilar.colFaceId"),
    t("adminFoydalanuvchilar.colContent"),
    t("adminFoydalanuvchilar.colLastSeen"),
    t("adminFoydalanuvchilar.colAction"),
  ]

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="flex flex-col gap-5 px-4 pb-8 pt-2 sm:px-8">
      {/* Sarlavha */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="adm-icon-soft flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ "--c": "var(--adm-accent)" } as CssVars}>
            <UserRound className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-[var(--adm-text)] sm:text-[30px]">
              {t("adminFoydalanuvchilar.pageTitle")}
            </h1>
            <p className="mt-0.5 text-sm text-[var(--adm-muted)]">
              {t("adminFoydalanuvchilar.totalUsers", { total })}
            </p>
          </div>
        </div>
        <button onClick={() => load(search, roleFilter, page)}
          className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          style={{ boxShadow: "var(--adm-shadow)" }}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> {t("adminFoydalanuvchilar.refresh")}
        </button>
      </div>

      {/* Rol bo'yicha qisqa xulosa — bosilsa shu rol bo'yicha filtrlanadi */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
        {STAT_ROLES.map(r => {
          const cfg = ROLE_CONFIG[r]
          const Icon = cfg.icon
          const active = roleFilter === r
          return (
            <button key={r} onClick={() => applyRoleFilter(active ? "" : r)}
              className="adm-card flex items-center gap-3 p-3.5 text-left transition-transform hover:-translate-y-0.5 sm:gap-3.5 sm:p-5"
              style={{ "--c": cfg.color, ...(active ? { borderColor: "color-mix(in srgb, var(--c) 45%, transparent)" } : {}) } as CssVars}>
              <div className="adm-icon-soft flex h-10 w-10 shrink-0 sm:h-12 sm:w-12 items-center justify-center rounded-xl">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                {loaded ? (
                  <div className="text-2xl font-bold leading-tight text-[var(--adm-text)]" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {roleCounts[r] ?? 0}
                  </div>
                ) : (
                  <div className="my-1 h-6 w-12 animate-pulse rounded-md bg-[var(--adm-grid)]" />
                )}
                <div className="truncate text-sm text-[var(--adm-text-2)]">{t(cfg.labelKey)}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Qidiruv va filtrlar */}
      <div className="adm-card flex flex-wrap items-center gap-3 p-3 sm:p-4">
        <label className="adm-input flex h-10 w-full items-center gap-2 rounded-xl px-3 sm:w-[340px]">
          <Search className="h-4 w-4 shrink-0 text-[var(--adm-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("adminFoydalanuvchilar.searchPlaceholder")}
            className="w-full bg-transparent text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]"
          />
        </label>

        <div className="flex flex-wrap items-center gap-1.5">
          {["", ...LMS_ROLES].map(r => (
            <button
              key={r || "all"}
              onClick={() => applyRoleFilter(r)}
              data-active={roleFilter === r}
              className="adm-chip flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium">
              {r ? (ROLE_CONFIG[r] ? t(ROLE_CONFIG[r].labelKey) : r) : t("adminFoydalanuvchilar.filterAll")}
              {/* Kutilayotganlar soni kartalarda yo'q — shu yerda ko'rinadi */}
              {r === "pending" && roleCounts.pending > 0 && (
                <span className="rounded-full px-1.5 text-[11px] font-semibold leading-4"
                  style={{ backgroundColor: roleFilter === r ? "rgba(255,255,255,0.25)" : "var(--role-pending)", color: "#fff" }}>
                  {roleCounts.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Face ID holati bo'yicha filtr */}
        <div className="relative ml-auto">
          <button onClick={() => setFiltersOpen(v => !v)} data-active={filtersOpen || !!faceFilter}
            className="adm-btn-outline flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold">
            <Filter className="h-4 w-4" />
            {t("adminFoydalanuvchilar.filters")}
            {faceFilter && <span className="h-2 w-2 rounded-full bg-[var(--adm-accent)]" />}
          </button>
          {filtersOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFiltersOpen(false)} />
              <div className="adm-pop absolute right-0 top-[calc(100%+8px)] z-50 w-[230px] p-2">
                <div className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--adm-muted)]">
                  {t("adminFoydalanuvchilar.colFaceId")}
                </div>
                {[
                  { value: "", label: t("common.all"), icon: UsersIcon, color: "var(--adm-muted)" },
                  { value: "registered", label: t("adminUsers.faceRegistered"), icon: CircleCheck, color: "var(--adm-up)" },
                  { value: "not_registered", label: t("adminUsers.faceNotRegistered"), icon: CircleAlert, color: "var(--role-pending)" },
                ].map(o => {
                  const Icon = o.icon
                  const active = faceFilter === o.value
                  return (
                    <button key={o.value || "all"} data-active={active}
                      onClick={() => { applyFaceFilter(o.value); setFiltersOpen(false) }}
                      className="adm-hover-row flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px]"
                      style={{ color: active ? "var(--adm-accent)" : "var(--adm-text)", fontWeight: active ? 600 : 500 }}>
                      <Icon className="h-4 w-4 shrink-0" style={{ color: o.color }} />
                      <span className="flex-1">{o.label}</span>
                      {active && <Check className="h-3.5 w-3.5" />}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Jadval */}
      <div className="adm-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
                {headers.map((h, i) => (
                  <th key={i} className="whitespace-nowrap px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--adm-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`transition-opacity ${loading && loaded ? "opacity-50" : ""}`}>
              {!loaded ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--adm-border)" }}>
                    <td colSpan={headers.length} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 animate-pulse rounded-full bg-[var(--adm-grid)]" />
                        <div className="flex flex-1 flex-col gap-1.5">
                          <div className="h-3 w-1/4 animate-pulse rounded bg-[var(--adm-grid)]" />
                          <div className="h-2.5 w-1/6 animate-pulse rounded bg-[var(--adm-grid)]" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="px-4 py-16 text-center text-sm text-[var(--adm-muted)]">
                    <div className="flex flex-col items-center gap-2">
                      <UsersIcon className="h-9 w-9 opacity-40" />
                      {t("adminFoydalanuvchilar.noUsersFound")}
                    </div>
                  </td>
                </tr>
              ) : users.map((u, i) => {
                const displayName = u.fullName || u.username || "—"
                return (
                  <tr key={u.hemisId} className="adm-hover-row" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                    <td className="px-4 py-2.5 text-xs text-[var(--adm-muted)]" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {page * PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <UserAvatar key={u.photoUrl ?? "none"} src={u.photoUrl} name={displayName} />
                        <div className="min-w-0">
                          <div className="max-w-[300px] truncate text-[13px] font-semibold text-[var(--adm-text)]">
                            {displayName}
                          </div>
                          {u.username && u.fullName && (
                            <div className="mt-0.5 max-w-[300px] truncate text-xs text-[var(--adm-muted)]">
                              {u.username}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <span className="adm-pill">
                          {HEMIS_ROLE_LABEL_KEY[u.hemisRole] ? t(HEMIS_ROLE_LABEL_KEY[u.hemisRole]) : u.hemisRole}
                        </span>
                        {u.hemisRoleCodes.filter(c => c !== u.hemisRole).map(c => (
                          <span key={c} className="adm-pill" style={{ "--c": "var(--role-admin)" } as CssVars}>{c}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <RoleBadge role={u.lmsRole} auto={u.isAutoAdmin || u.roleIsDefault} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[13px] text-[var(--adm-text-2)]">
                      {u.groupName ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {u.hemisRole !== "student" ? (
                        <span className="text-[13px] text-[var(--adm-muted)]">—</span>
                      ) : u.faceRegistered ? (
                        <span className="adm-pill" style={{ "--c": "var(--adm-up)" } as CssVars}>
                          <CircleCheck className="h-3.5 w-3.5" /> {t("adminUsers.faceRegistered")}
                        </span>
                      ) : (
                        <span className="adm-pill" style={{ "--c": "var(--role-pending)" } as CssVars}>
                          <CircleAlert className="h-3.5 w-3.5" /> {t("adminUsers.faceNotRegistered")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-[var(--adm-text-2)]" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {u.contentCount > 0 ? u.contentCount : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[13px] text-[var(--adm-text-2)]" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatDateTime(u.lastSeen)}
                    </td>
                    <td className="px-4 py-2.5">
                      {u.isAutoAdmin ? (
                        <span className="whitespace-nowrap text-xs italic text-[var(--adm-muted)]">
                          {t("adminFoydalanuvchilar.autoAdminLabel")}
                        </span>
                      ) : saving === u.hemisId ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-[var(--adm-accent)]" />
                      ) : (
                        <RoleDropdown current={u.lmsRole} onSet={role => handleSetRole(u, role)} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {loaded && total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ borderTop: "1px solid var(--adm-border)" }}>
            <span className="text-xs text-[var(--adm-muted)]" style={{ fontVariantNumeric: "tabular-nums" }}>
              {page * PAGE_SIZE + 1}–{Math.min(total, page * PAGE_SIZE + PAGE_SIZE)} / {total}
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
    </motion.div>
  )
}
