"use client"

import { useEffect, useId, useState } from "react"
import { Accessibility, CircleAlert, CircleCheck, Plus, RefreshCw, Search, Trash2, X } from "lucide-react"
import { adminApi, type AccessibilityCandidate, type AccessibilityStudentRow } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { tr } from "@/lib/i18n/translations"

type CssVars = React.CSSProperties & Record<`--${string}`, string>

const TIME_OPTIONS = [100, 150, 200, 300]

/* Maxsus ehtiyojli (ko'zi ojiz / zaif ko'ruvchi) talabalar — admin belgilaydi.
   Belgilangan talaba uchun test sahifasi moslashadi (qo'shimcha vaqt, Face ID'siz,
   oynadan chiqish chegarasisiz) — backend: services/accessibilityStore.ts */
export function AccessibilityStudentsSection({ onTotal }: { onTotal?: (n: number) => void }) {
  const { t } = useLanguage()
  const searchId = useId()
  const [rows, setRows] = useState<AccessibilityStudentRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [query, setQuery] = useState("")
  const [found, setFound] = useState<AccessibilityCandidate[] | null>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    let cancelled = false
    adminApi.accessibilityStudents()
      .then(res => { if (!cancelled) { setRows(res.students); onTotal?.(res.students.length) } })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : tr("adminStudents.errLoad")) })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Qidiruv — yozish to'xtagach 350 ms dan keyin
  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) { setFound(null); setSearching(false); return }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      adminApi.searchAccessibilityCandidates(q)
        .then(res => { if (!cancelled) setFound(res.students) })
        .catch(() => { if (!cancelled) setFound([]) })
        .finally(() => { if (!cancelled) setSearching(false) })
    }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query])

  function applyRows(next: AccessibilityStudentRow[]) {
    const sorted = [...next].sort((a, b) => a.fullName.localeCompare(b.fullName))
    setRows(sorted)
    onTotal?.(sorted.length)
  }

  async function save(id: number, name: string, body: Parameters<typeof adminApi.saveAccessibilityStudent>[1], isNew: boolean) {
    setBusyId(id)
    setNotice(null)
    try {
      const res = await adminApi.saveAccessibilityStudent(id, body)
      applyRows([...(rows ?? []).filter(r => r.studentUserId !== id), res.student])
      setFound(prev => prev?.map(c => c.studentUserId === id ? { ...c, marked: true } : c) ?? prev)
      setNotice({ ok: true, text: t(isNew ? "a11y.markedDone" : "a11y.saved", { name }) })
    } catch (e) {
      setNotice({ ok: false, text: t("adminStudents.actionFailed", { name, error: e instanceof Error ? e.message : String(e) }) })
    } finally {
      setBusyId(null)
    }
  }

  async function unmark(row: AccessibilityStudentRow) {
    if (!window.confirm(t("a11y.confirmUnmark", { name: row.fullName }))) return
    setBusyId(row.studentUserId)
    setNotice(null)
    try {
      await adminApi.removeAccessibilityStudent(row.studentUserId)
      applyRows((rows ?? []).filter(r => r.studentUserId !== row.studentUserId))
      setFound(prev => prev?.map(c => c.studentUserId === row.studentUserId ? { ...c, marked: false } : c) ?? prev)
      setNotice({ ok: true, text: t("a11y.unmarkedDone", { name: row.fullName }) })
    } catch (e) {
      setNotice({ ok: false, text: t("adminStudents.actionFailed", { name: row.fullName, error: e instanceof Error ? e.message : String(e) }) })
    } finally {
      setBusyId(null)
    }
  }

  const headers = ["#", t("a11y.colStudent"), t("common.group"), t("a11y.colTime"), t("a11y.colFace"), t("a11y.colTab"), ""]

  return (
    <section id="maxsus-ehtiyojli" aria-labelledby="a11y-title" className="adm-card overflow-hidden">
      <div className="flex items-start gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--adm-border)" }}>
        <div className="adm-icon-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ "--c": "var(--adm-accent)" } as CssVars}>
          <Accessibility className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 id="a11y-title" className="text-[15px] font-semibold text-[var(--adm-text)]">{t("a11y.adminTitle")}</h2>
          <p className="mt-0.5 max-w-[760px] text-xs leading-5 text-[var(--adm-muted)]">{t("a11y.adminSubtitle")}</p>
        </div>
      </div>

      {/* Holat xabari — ekran o'quvchi ham o'qiydi */}
      <div role="status" aria-live="polite">
        {notice && (
          <div className="flex items-start gap-2 px-5 py-2.5 text-[13px] font-medium"
            style={{
              borderBottom: "1px solid var(--adm-border)",
              color: notice.ok ? "var(--adm-up)" : "var(--role-admin)",
              backgroundColor: `color-mix(in srgb, ${notice.ok ? "var(--adm-up)" : "var(--role-admin)"} 8%, transparent)`,
            }}>
            {notice.ok ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
            <span className="flex-1">{notice.text}</span>
            <button onClick={() => setNotice(null)} aria-label={t("common.close")} className="shrink-0 opacity-70 hover:opacity-100">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {/* Talaba qidirish va belgilash */}
      <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
        <label htmlFor={searchId} className="mb-1.5 block text-[13px] font-medium text-[var(--adm-text-2)]">{t("a11y.searchLabel")}</label>
        <div className="adm-input flex h-10 w-full items-center gap-2 rounded-xl px-3 sm:w-[420px]">
          <Search className="h-4 w-4 shrink-0 text-[var(--adm-muted)]" aria-hidden />
          <input id={searchId} value={query} onChange={e => setQuery(e.target.value)} placeholder={t("a11y.searchPlaceholder")}
            autoComplete="off"
            className="w-full bg-transparent text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]" />
          {searching && <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-[var(--adm-accent)]" aria-hidden />}
        </div>
        {found && (
          found.length === 0 ? (
            <p className="mt-2 text-[13px] text-[var(--adm-muted)]">{t("a11y.searchEmpty")}</p>
          ) : (
            <ul className="mt-2 flex max-h-[260px] flex-col overflow-y-auto rounded-xl" style={{ border: "1px solid var(--adm-border)" }}>
              {found.map(c => (
                <li key={c.studentUserId} className="adm-hover-row flex flex-wrap items-center gap-3 px-3 py-2" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-[var(--adm-text)]">{c.fullName}</div>
                    <div className="text-xs text-[var(--adm-muted)]">{[c.studentIdNumber, c.groupName].filter(Boolean).join(" · ")}</div>
                  </div>
                  {c.marked ? (
                    <span className="adm-pill" style={{ "--c": "var(--adm-up)" } as CssVars}><CircleCheck className="h-3.5 w-3.5" aria-hidden /> {t("a11y.alreadyMarked")}</span>
                  ) : (
                    <button onClick={() => save(c.studentUserId, c.fullName, {}, true)} disabled={busyId === c.studentUserId}
                      className="adm-btn-outline inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60">
                      <Plus className="h-3.5 w-3.5" aria-hidden /> {t("a11y.mark")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      {error ? (
        <div role="alert" className="p-6 text-sm" style={{ color: "var(--role-admin)" }}>{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
                {headers.map((h, i) => (
                  <th key={i} scope="col" className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--adm-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!rows ? (
                <tr><td colSpan={headers.length} className="px-4 py-3.5"><div className="h-3 w-1/3 animate-pulse rounded bg-[var(--adm-grid)]" /></td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="px-5 py-12 text-center text-sm text-[var(--adm-muted)]">
                    <div className="flex flex-col items-center gap-2">
                      <Accessibility className="h-8 w-8 opacity-40" aria-hidden />
                      {t("a11y.empty")}
                    </div>
                  </td>
                </tr>
              ) : rows.map((s, i) => {
                const busy = busyId === s.studentUserId
                return (
                  <tr key={s.studentUserId} className="adm-hover-row" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                    <td className="w-10 px-4 py-2.5 text-xs text-[var(--adm-muted)]">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="max-w-[300px] truncate text-[13px] font-semibold text-[var(--adm-text)]" title={s.fullName}>{s.fullName}</div>
                      {s.studentIdNumber && <div className="mt-0.5 text-xs text-[var(--adm-muted)]">{s.studentIdNumber}</div>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[13px] text-[var(--adm-text-2)]">{s.groupName ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <select value={s.timePercent} disabled={busy} aria-label={`${t("a11y.colTime")}: ${s.fullName}`}
                        onChange={e => save(s.studentUserId, s.fullName, { timePercent: Number(e.target.value) }, false)}
                        className="adm-input h-9 rounded-lg px-2 text-[13px]">
                        {[...new Set([...TIME_OPTIONS, s.timePercent])].sort((a, b) => a - b).map(n => (
                          <option key={n} value={n}>{t("a11y.timeOption", { n, x: n / 100 })}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[var(--adm-text-2)]">
                        <input type="checkbox" checked={s.skipFace} disabled={busy} className="h-4 w-4"
                          aria-label={`${t("a11y.colFace")}: ${s.fullName}`}
                          onChange={e => save(s.studentUserId, s.fullName, { skipFace: e.target.checked }, false)} />
                        {s.skipFace ? t("a11y.on") : t("a11y.off")}
                      </label>
                    </td>
                    <td className="px-4 py-2.5">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[var(--adm-text-2)]">
                        <input type="checkbox" checked={s.noTabLimit} disabled={busy} className="h-4 w-4"
                          aria-label={`${t("a11y.colTab")}: ${s.fullName}`}
                          onChange={e => save(s.studentUserId, s.fullName, { noTabLimit: e.target.checked }, false)} />
                        {s.noTabLimit ? t("a11y.on") : t("a11y.off")}
                      </label>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {busy ? (
                        <RefreshCw className="ml-auto h-4 w-4 animate-spin text-[var(--adm-accent)]" aria-hidden />
                      ) : (
                        <button onClick={() => unmark(s)}
                          className="adm-btn-outline inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold"
                          style={{ color: "var(--role-admin)" }}>
                          <Trash2 className="h-3.5 w-3.5" aria-hidden /> {t("a11y.unmark")}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
