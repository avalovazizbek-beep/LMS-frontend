"use client"

import { useEffect, useId, useState } from "react"
import { Bot, CircleAlert, CircleCheck, Plus, RefreshCw, Search, Trash2, X } from "lucide-react"
import { adminApi, type AssistantAccessCandidate, type AssistantAccessRow } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"

/* O'qituvchi yordamchisi (AI) — kimga ko'rinishini admin belgilaydi.
   To'liq admin har doim ko'radi; qolgan xodimlar faqat shu ro'yxatda bo'lsa.
   Backend: services/assistantAccess.ts, routes/admin.ts (/assistant-access) */
export function AssistantAccessSection() {
  const { t } = useLanguage()
  const searchId = useId()
  const [rows, setRows] = useState<AssistantAccessRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [query, setQuery] = useState("")
  const [found, setFound] = useState<AssistantAccessCandidate[] | null>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    let cancelled = false
    adminApi.assistantAccessList()
      .then(res => { if (!cancelled) setRows(res.teachers) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : t("assistantAccess.errLoad")) })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Qidiruv — yozish to'xtagach 350 ms dan keyin
  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) { setFound(null); setSearching(false); return }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      adminApi.assistantAccessSearch(q)
        .then(res => { if (!cancelled) setFound(res.teachers) })
        .catch(() => { if (!cancelled) setFound([]) })
        .finally(() => { if (!cancelled) setSearching(false) })
    }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query])

  const sorted = (list: AssistantAccessRow[]) => [...list].sort((a, b) => a.fullName.localeCompare(b.fullName))

  async function grant(c: AssistantAccessCandidate) {
    setBusyId(c.teacherUserId)
    setNotice(null)
    try {
      const res = await adminApi.assistantAccessGrant(c.teacherUserId)
      setRows(prev => sorted([...(prev ?? []).filter(r => r.teacherUserId !== c.teacherUserId), res.teacher]))
      setFound(prev => prev?.map(x => x.teacherUserId === c.teacherUserId ? { ...x, granted: true } : x) ?? prev)
      setNotice({ ok: true, text: t("assistantAccess.granted", { name: c.fullName }) })
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusyId(null)
    }
  }

  async function revoke(row: AssistantAccessRow) {
    if (!window.confirm(t("assistantAccess.confirmRevoke", { name: row.fullName }))) return
    setBusyId(row.teacherUserId)
    setNotice(null)
    try {
      await adminApi.assistantAccessRevoke(row.teacherUserId)
      setRows(prev => (prev ?? []).filter(r => r.teacherUserId !== row.teacherUserId))
      setFound(prev => prev?.map(x => x.teacherUserId === row.teacherUserId ? { ...x, granted: false } : x) ?? prev)
      setNotice({ ok: true, text: t("assistantAccess.revoked", { name: row.fullName }) })
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section aria-labelledby="assistant-access-title" className="rounded-[12px] bg-white shadow-sm" style={{ border: "1px solid #e5eaf2" }}>
      <div className="flex items-start gap-3 px-5 py-4" style={{ borderBottom: "1px solid #e5eaf2" }}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#eef4ff" }}>
          <Bot className="h-5 w-5" style={{ color: "#0e58a8" }} aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 id="assistant-access-title" className="text-[15px] font-semibold" style={{ color: "#012970" }}>{t("assistantAccess.title")}</h2>
          <p className="mt-0.5 max-w-[760px] text-xs leading-5" style={{ color: "#7293b9" }}>{t("assistantAccess.subtitle")}</p>
        </div>
      </div>

      <div role="status" aria-live="polite">
        {notice && (
          <div className="flex items-start gap-2 px-5 py-2.5 text-[13px] font-medium"
            style={{ borderBottom: "1px solid #e5eaf2", color: notice.ok ? "#15803d" : "#b91c1c", backgroundColor: notice.ok ? "#f0fdf4" : "#fef2f2" }}>
            {notice.ok ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
            <span className="flex-1">{notice.text}</span>
            <button onClick={() => setNotice(null)} aria-label={t("common.close")} className="shrink-0 opacity-70 hover:opacity-100">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {/* Xodim qidirish va ruxsat berish */}
      <div className="px-5 py-3" style={{ borderBottom: "1px solid #e5eaf2" }}>
        <label htmlFor={searchId} className="mb-1.5 block text-[13px] font-medium" style={{ color: "#3b5a82" }}>{t("assistantAccess.searchLabel")}</label>
        <div className="flex h-10 w-full items-center gap-2 rounded-xl px-3 sm:w-[420px]" style={{ border: "1px solid #d5deec" }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: "#7293b9" }} aria-hidden />
          <input id={searchId} value={query} onChange={e => setQuery(e.target.value)} placeholder={t("assistantAccess.searchPlaceholder")}
            autoComplete="off" className="w-full bg-transparent text-sm outline-none" style={{ color: "#012970" }} />
          {searching && <RefreshCw className="h-4 w-4 shrink-0 animate-spin" style={{ color: "#0e58a8" }} aria-hidden />}
        </div>
        {found && (
          found.length === 0 ? (
            <p className="mt-2 text-[13px]" style={{ color: "#7293b9" }}>{t("assistantAccess.searchEmpty")}</p>
          ) : (
            <ul className="mt-2 flex max-h-[260px] flex-col overflow-y-auto rounded-xl" style={{ border: "1px solid #e5eaf2" }}>
              {found.map(c => (
                <li key={c.teacherUserId} className="flex flex-wrap items-center gap-3 px-3 py-2" style={{ borderBottom: "1px solid #e5eaf2" }}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold" style={{ color: "#012970" }}>{c.fullName}</div>
                    <div className="text-xs" style={{ color: "#7293b9" }}>{[c.department, c.position].filter(Boolean).join(" · ")}</div>
                  </div>
                  {c.granted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#15803d" }}>
                      <CircleCheck className="h-3.5 w-3.5" aria-hidden /> {t("assistantAccess.alreadyGranted")}
                    </span>
                  ) : (
                    <button onClick={() => grant(c)} disabled={busyId === c.teacherUserId}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                      style={{ backgroundColor: "#eef4ff", color: "#0e58a8" }}>
                      <Plus className="h-3.5 w-3.5" aria-hidden /> {t("assistantAccess.grant")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      {/* Ruxsat berilganlar */}
      {error ? (
        <div role="alert" className="p-5 text-sm" style={{ color: "#b91c1c" }}>{error}</div>
      ) : !rows ? (
        <div className="px-5 py-4"><div className="h-3 w-1/3 animate-pulse rounded bg-[#e5eaf2]" /></div>
      ) : rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm" style={{ color: "#7293b9" }}>{t("assistantAccess.empty")}</p>
      ) : (
        <ul>
          {rows.map((r, i) => (
            <li key={r.teacherUserId} className="flex flex-wrap items-center gap-3 px-5 py-2.5" style={{ borderBottom: "1px solid #e5eaf2" }}>
              <span className="w-6 text-xs" style={{ color: "#7293b9" }}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold" style={{ color: "#012970" }} title={r.fullName}>{r.fullName}</div>
                <div className="text-xs" style={{ color: "#7293b9" }}>{r.department ?? "—"}</div>
              </div>
              {busyId === r.teacherUserId ? (
                <RefreshCw className="h-4 w-4 animate-spin" style={{ color: "#0e58a8" }} aria-hidden />
              ) : (
                <button onClick={() => revoke(r)}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{ border: "1px solid #e5eaf2", color: "#b91c1c" }}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> {t("assistantAccess.revoke")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
