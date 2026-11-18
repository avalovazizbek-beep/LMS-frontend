"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ListChecks, Plus, RefreshCw, Search, BarChart3, Pencil, PauseCircle, PlayCircle, Archive, ArchiveRestore, Copy, Trash2,
  CheckCircle2, AlertCircle, Users, GraduationCap, ShieldCheck, Eye, CalendarClock, Activity, FileEdit, Clock, Building2, Save,
} from "lucide-react"
import { surveysApi, type SurveyListItem, type SurveySummary, type SurveyManagerInfo, type SurveyState, type DeanFacultyRow } from "@/lib/api"
import { TintStat, EmptyCard, PageHeader, Notice, type CssVars } from "@/components/admin/AdminUi"
import { Meter } from "@/components/admin/DashboardCharts"
import { Modal } from "@/components/ui/Modal"
import { STATE_LABEL, STATE_COLOR, fmtDateTime, timeLeft, percent } from "@/components/surveys/surveyUi"

const NUM = { fontVariantNumeric: "tabular-nums" } as const

type Tab = "active" | "scheduled" | "draft" | "paused" | "archive" | "all"
const TABS: { key: Tab; label: string; match: (s: SurveyState) => boolean }[] = [
  { key: "active", label: "Faol", match: (s) => s === "active" },
  { key: "scheduled", label: "Rejalashtirilgan", match: (s) => s === "scheduled" },
  { key: "draft", label: "Qoralamalar", match: (s) => s === "draft" },
  { key: "paused", label: "To'xtatilgan", match: (s) => s === "paused" },
  { key: "archive", label: "Arxiv", match: (s) => s === "finished" || s === "archived" },
  { key: "all", label: "Barchasi", match: () => true },
]

/* ── Dekanat fakultetlari (faqat admin) ───────────────────────────────── */
function DeanFacultiesPanel() {
  const [deans, setDeans] = useState<DeanFacultyRow[] | null>(null)
  const [faculties, setFaculties] = useState<string[]>([])
  const [draft, setDraft] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    surveysApi.deans()
      .then((r) => {
        setDeans(r.data.deans)
        setFaculties(r.data.faculties)
        setDraft(Object.fromEntries(r.data.deans.map((d) => [d.hemisId, d.faculties])))
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Yuklab bo'lmadi"))
  }, [])

  async function save(d: DeanFacultyRow) {
    setSaving(d.hemisId)
    setMsg(null)
    try {
      await surveysApi.setDeanFaculties(d.hemisId, draft[d.hemisId] ?? [])
      setDeans((prev) => prev?.map((x) => (x.hemisId === d.hemisId ? { ...x, faculties: draft[d.hemisId] ?? [] } : x)) ?? null)
      setMsg({ ok: true, text: `${d.fullName}: fakultetlar saqlandi` })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Saqlab bo'lmadi" })
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="adm-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="adm-icon-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ "--c": "var(--role-dean)" } as CssVars}>
          <Building2 className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-[var(--adm-text)]">Dekanat fakultetlari</h2>
          <p className="text-xs text-[var(--adm-muted)]">
            Dekanat xodimi faqat shu yerda biriktirilgan fakultet talabalari va ularning o&apos;qituvchilari uchun so&apos;rovnoma yaratadi va natijasini ko&apos;radi.
            Dekanat roli «Foydalanuvchilar» bo&apos;limida beriladi.
          </p>
        </div>
      </div>
      {msg && <div className="mb-3"><Notice ok={msg.ok}>{msg.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{msg.text}</Notice></div>}
      {error ? (
        <p className="text-sm" style={{ color: "var(--role-admin)" }}>{error}</p>
      ) : !deans ? (
        <div className="flex justify-center py-6"><RefreshCw className="h-5 w-5 animate-spin text-[var(--adm-accent)]" /></div>
      ) : deans.length === 0 ? (
        <p className="rounded-xl px-4 py-6 text-center text-sm text-[var(--adm-muted)]" style={{ border: "1px dashed var(--adm-border-strong)" }}>
          Hozircha dekanat roli berilgan xodim yo&apos;q.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {deans.map((d) => {
            const selected = new Set(draft[d.hemisId] ?? [])
            const changed = JSON.stringify([...selected].sort()) !== JSON.stringify([...d.faculties].sort())
            return (
              <div key={d.hemisId} className="flex flex-col gap-3 rounded-xl p-3.5 lg:flex-row lg:items-center" style={{ border: "1px solid var(--adm-border)" }}>
                <div className="min-w-0 lg:w-64">
                  <div className="truncate text-sm font-semibold text-[var(--adm-text)]">{d.fullName}</div>
                  <div className="truncate text-xs text-[var(--adm-muted)]">{d.department ?? `ID ${d.hemisId}`}</div>
                </div>
                <div className="flex flex-1 flex-wrap gap-1.5">
                  {faculties.map((f) => {
                    const on = selected.has(f)
                    return (
                      <button key={f} type="button" data-active={on}
                        onClick={() => setDraft((prev) => {
                          const next = new Set(prev[d.hemisId] ?? [])
                          if (next.has(f)) next.delete(f)
                          else next.add(f)
                          return { ...prev, [d.hemisId]: [...next] }
                        })}
                        className="adm-chip rounded-full px-3 py-1.5 text-xs font-medium">
                        {on && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}{f}
                      </button>
                    )
                  })}
                  {!selected.size && <span className="self-center text-xs font-medium" style={{ color: "var(--role-pending)" }}>Fakultet biriktirilmagan — so&apos;rovnoma yarata olmaydi</span>}
                </div>
                <button type="button" onClick={() => save(d)} disabled={!changed || saving === d.hemisId}
                  className="adm-btn-primary flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold disabled:opacity-40">
                  {saving === d.hemisId ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Saqlash
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/* ── Bitta so'rovnoma qatori ──────────────────────────────────────────── */
function SurveyRow({ s, info, busy, onAction }: {
  s: SurveyListItem
  info: SurveyManagerInfo
  busy: boolean
  onAction: (action: "pause" | "resume" | "archive" | "unarchive" | "duplicate" | "delete" | "publish", s: SurveyListItem) => void
}) {
  const rate = percent(s.completedTotal, s.targetTotal)
  const color = STATE_COLOR[s.state]
  const published = s.status === "published"
  return (
    <div className="adm-card flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="adm-pill" style={{ "--c": color } as CssVars}>
            {s.state === "active" ? <Activity className="h-3 w-3" /> : s.state === "draft" ? <FileEdit className="h-3 w-3" /> : s.state === "scheduled" ? <Clock className="h-3 w-3" /> : s.state === "paused" ? <PauseCircle className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
            {STATE_LABEL[s.state]}
          </span>
          <span className="adm-pill">{s.surveyTypeLabel}</span>
          {s.isAnonymous ? (
            <span className="adm-pill" style={{ "--c": "var(--adm-up)" } as CssVars}><ShieldCheck className="h-3 w-3" /> Anonim</span>
          ) : (
            <span className="adm-pill" style={{ "--c": "var(--role-pending)" } as CssVars}><Eye className="h-3 w-3" /> Ochiq</span>
          )}
          {s.audiences.includes("student") && <span className="adm-pill" style={{ "--c": "var(--role-student)" } as CssVars}><Users className="h-3 w-3" /> Talabalar</span>}
          {s.audiences.includes("teacher") && <span className="adm-pill" style={{ "--c": "var(--role-teacher)" } as CssVars}><GraduationCap className="h-3 w-3" /> O&apos;qituvchilar</span>}
          {s.createdByRole === "dean" && <span className="adm-pill" style={{ "--c": "var(--role-dean)" } as CssVars}>Dekanat</span>}
        </div>
        <Link href={published ? `/admin/sorovnomalar/${s.id}/natijalar` : `/admin/sorovnomalar/${s.id}`}
          className="block break-words text-[15px] font-semibold text-[var(--adm-text)] hover:text-[var(--adm-accent)]">
          {s.title}
        </Link>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--adm-muted)]">
          <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> {fmtDateTime(s.startAt)} — {fmtDateTime(s.endAt)}</span>
          {s.state === "active" && <span className="font-medium text-[var(--adm-text-2)]">{timeLeft(s.endAt)}</span>}
          <span>{s.questionCount} savol</span>
          {s.createdByName && <span>Muallif: {s.createdByName}</span>}
        </div>
      </div>

      {published && (
        <div className="w-full shrink-0 lg:w-56">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-[var(--adm-muted)]">Javob berdi</span>
            <span className="font-semibold text-[var(--adm-text)]" style={NUM}>{s.completedTotal} / {s.targetTotal} · {rate}%</span>
          </div>
          <Meter percent={rate} color="var(--adm-accent)" />
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {published ? (
          <Link href={`/admin/sorovnomalar/${s.id}/natijalar`} className="adm-btn-primary flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold">
            <BarChart3 className="h-3.5 w-3.5" /> Natijalar
          </Link>
        ) : info.canEdit && (
          <button onClick={() => onAction("publish", s)} disabled={busy} className="adm-btn-primary flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold disabled:opacity-60">
            <PlayCircle className="h-3.5 w-3.5" /> E&apos;lon qilish
          </button>
        )}
        {info.canEdit && s.state !== "archived" && (
          <Link href={`/admin/sorovnomalar/${s.id}`} className="adm-btn-outline flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold" title="Tahrirlash">
            <Pencil className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Tahrirlash</span>
          </Link>
        )}
        {info.canEdit && published && (s.state === "active" || s.state === "scheduled") && (
          <button onClick={() => onAction("pause", s)} disabled={busy} title="To'xtatish" className="adm-btn-outline flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-60">
            <PauseCircle className="h-4 w-4" />
          </button>
        )}
        {info.canEdit && s.state === "paused" && (
          <button onClick={() => onAction("resume", s)} disabled={busy} title="Davom ettirish" className="adm-btn-outline flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-60">
            <PlayCircle className="h-4 w-4" />
          </button>
        )}
        {info.canEdit && s.state !== "archived" && s.state !== "draft" && (
          <button onClick={() => onAction("archive", s)} disabled={busy} title="Arxivlash" className="adm-btn-outline flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-60">
            <Archive className="h-4 w-4" />
          </button>
        )}
        {info.canEdit && s.state === "archived" && (
          <button onClick={() => onAction("unarchive", s)} disabled={busy} title="Arxivdan chiqarish" className="adm-btn-outline flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-60">
            <ArchiveRestore className="h-4 w-4" />
          </button>
        )}
        {info.canCreate && (
          <button onClick={() => onAction("duplicate", s)} disabled={busy} title="Nusxa olish (yangi qoralama)" className="adm-btn-outline flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-60">
            <Copy className="h-4 w-4" />
          </button>
        )}
        {info.canDelete && (
          <button onClick={() => onAction("delete", s)} disabled={busy} title="O'chirish"
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors disabled:opacity-60"
            style={{ color: "var(--role-admin)", border: "1px solid color-mix(in srgb, var(--role-admin) 25%, transparent)" }}>
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdminSorovnomalar() {
  const router = useRouter()
  const [info, setInfo] = useState<SurveyManagerInfo | null>(null)
  const [items, setItems] = useState<SurveyListItem[] | null>(null)
  const [summary, setSummary] = useState<SurveySummary | null>(null)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<Tab>("active")
  const [query, setQuery] = useState("")
  const [busyId, setBusyId] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirm, setConfirm] = useState<{ kind: "delete" | "archive" | "publish"; s: SurveyListItem } | null>(null)

  // Birinchi yuklashda faol so'rovnoma bo'lmasa — birinchi bo'sh bo'lmagan tab
  const tabChosen = useRef(false)

  async function load() {
    try {
      const [me, list] = await Promise.all([surveysApi.managerInfo(), surveysApi.list()])
      setInfo(me.data)
      setItems(list.data)
      setSummary(list.summary)
      setError("")
      if (!tabChosen.current) {
        tabChosen.current = true
        if (!list.data.some((s) => s.state === "active")) {
          const first = TABS.find((t) => list.data.some((s) => t.match(s.state)))
          if (first) setTab(first.key)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yuklab bo'lmadi")
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [])

  const filtered = useMemo(() => {
    const t = TABS.find((x) => x.key === tab)!
    const q = query.trim().toLowerCase()
    return (items ?? []).filter((s) => t.match(s.state) && (!q || s.title.toLowerCase().includes(q)))
  }, [items, tab, query])

  async function run(action: "pause" | "resume" | "archive" | "unarchive" | "duplicate" | "delete" | "publish", s: SurveyListItem, force = false) {
    setBusyId(s.id)
    setMsg(null)
    try {
      if (action === "pause") await surveysApi.setActive(s.id, false)
      if (action === "resume") await surveysApi.setActive(s.id, true)
      if (action === "archive") await surveysApi.setArchived(s.id, true)
      if (action === "unarchive") await surveysApi.setArchived(s.id, false)
      if (action === "delete") await surveysApi.remove(s.id, force)
      if (action === "publish") {
        const r = await surveysApi.publish(s.id)
        setMsg({ ok: true, text: `«${s.title}» e'lon qilindi — ${r.data.participants} kishiga yuborildi` })
      }
      if (action === "duplicate") {
        const r = await surveysApi.duplicate(s.id)
        router.push(`/admin/sorovnomalar/${r.data.id}`)
        return
      }
      if (action !== "publish") {
        const text: Record<string, string> = {
          pause: "To'xtatildi — foydalanuvchilar hozircha javob bera olmaydi",
          resume: "Davom ettirildi",
          archive: "Arxivga o'tkazildi",
          unarchive: "Arxivdan chiqarildi",
          delete: "O'chirildi",
        }
        setMsg({ ok: true, text: text[action] })
      }
      await load()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Amal bajarilmadi" })
    } finally {
      setBusyId(null)
      setConfirm(null)
    }
  }

  function onAction(action: Parameters<typeof run>[0], s: SurveyListItem) {
    if (action === "delete" || action === "archive" || action === "publish") setConfirm({ kind: action, s })
    else void run(action, s)
  }

  const deanWithoutFaculty = info?.role === "dean" && !(info.faculties?.length)

  return (
    <div className="flex flex-col gap-6 px-3 pb-10 pt-2 sm:px-8">
      <PageHeader icon={ListChecks} title="So'rovnomalar"
        subtitle={info?.role === "dean"
          ? `Dekanat · ${info.faculties?.length ? info.faculties.join(", ") : "fakultet biriktirilmagan"}`
          : "Talabalar va o'qituvchilar uchun ixtiyoriy so'rovnomalar, ishtirok va natijalar"}>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} className="adm-round-btn" title="Yangilash" aria-label="Yangilash"><RefreshCw className="h-4 w-4" /></button>
          {info?.canCreate && !deanWithoutFaculty && (
            <Link href="/admin/sorovnomalar/yangi" className="adm-btn-primary flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold">
              <Plus className="h-4 w-4" /> Yangi so&apos;rovnoma
            </Link>
          )}
        </div>
      </PageHeader>

      {deanWithoutFaculty && (
        <Notice ok={false}><AlertCircle className="h-4 w-4 shrink-0" /> Sizga hali fakultet biriktirilmagan. Admin «Dekanat fakultetlari» bo&apos;limida biriktirgandan so&apos;ng so&apos;rovnoma yarata olasiz.</Notice>
      )}
      {msg && <Notice ok={msg.ok}>{msg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}{msg.text}</Notice>}

      {error ? (
        <div className="adm-card flex flex-col items-center gap-3 p-10 text-center">
          <AlertCircle className="h-8 w-8" style={{ color: "var(--role-admin)" }} />
          <p className="text-sm text-[var(--adm-text)]">{error}</p>
          <button onClick={() => void load()} className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4" /> Qayta urinish</button>
        </div>
      ) : !items || !info || !summary ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="adm-card h-[84px] animate-pulse" />)}</div>
          {[0, 1, 2].map((i) => <div key={i} className="adm-card h-28 animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <TintStat icon={Activity} color="var(--adm-up)" label="Faol so'rovnomalar" value={summary.active} sub={summary.scheduled ? `+${summary.scheduled} rejalashtirilgan` : undefined} />
            <TintStat icon={Users} color="var(--adm-accent)" label="Faollarda ishtirok" value={`${summary.activeRate}%`} sub={`${summary.activeCompleted} / ${summary.activeTarget} kishi`} />
            <TintStat icon={FileEdit} color="var(--role-pending)" label="Qoralamalar" value={summary.drafts} />
            <TintStat icon={Archive} color="var(--role-blocked)" label="Arxiv" value={summary.archive} sub={`Jami: ${summary.total}`} />
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {TABS.map((t) => {
                const n = items.filter((s) => t.match(s.state)).length
                return (
                  <button key={t.key} data-active={tab === t.key} onClick={() => setTab(t.key)} className="adm-chip rounded-full px-3.5 py-2 text-xs font-semibold">
                    {t.label} <span className="ml-1 opacity-70" style={NUM}>{n}</span>
                  </button>
                )
              })}
            </div>
            <label className="adm-input flex h-10 items-center gap-2 rounded-xl px-3 lg:w-72">
              <Search className="h-4 w-4 text-[var(--adm-muted)]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nomi bo'yicha qidirish"
                className="w-full bg-transparent text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]" />
            </label>
          </div>

          {filtered.length === 0 ? (
            <EmptyCard icon={ListChecks}
              text={items.length === 0 ? "Hali so'rovnoma yaratilmagan" : "Bu bo'limda so'rovnoma yo'q"}
              hint={items.length === 0 && info.canCreate && !deanWithoutFaculty ? "«Yangi so'rovnoma» tugmasi orqali birinchisini yarating" : undefined} />
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((s) => <SurveyRow key={s.id} s={s} info={info} busy={busyId === s.id} onAction={onAction} />)}
            </div>
          )}

          {info.role === "admin" && <DeanFacultiesPanel />}
        </>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)}
        title={confirm?.kind === "delete" ? "So'rovnomani o'chirish" : confirm?.kind === "archive" ? "Arxivga o'tkazish" : "E'lon qilish"}>
        {confirm && (
          <div className="flex flex-col gap-4 text-sm" style={{ color: "#46557a" }}>
            <p className="font-semibold" style={{ color: "#012970" }}>«{confirm.s.title}»</p>
            {confirm.kind === "delete" && (
              <p>{confirm.s.completedTotal > 0
                ? `Bu so'rovnomaga ${confirm.s.completedTotal} ta javob kelgan. O'chirilsa barcha javoblar va statistika qaytarib bo'lmas darajada yo'qoladi. Odatda arxivlash tavsiya etiladi.`
                : "So'rovnoma butunlay o'chiriladi."}</p>
            )}
            {confirm.kind === "archive" && <p>So&apos;rovnoma yopiladi va «Arxiv» bo&apos;limiga o&apos;tadi. Natijalar saqlanib qoladi, foydalanuvchilar endi javob bera olmaydi.</p>}
            {confirm.kind === "publish" && <p>E&apos;lon qilingach auditoriyadagi har bir kishiga bildirishnoma boradi (boshlanish vaqti kelganda). Savollarni javoblar kelgunicha o&apos;zgartirish mumkin.</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirm(null)} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970" }}>Bekor qilish</button>
              {confirm.kind === "delete" && confirm.s.completedTotal > 0 && info?.role === "admin" ? (
                <>
                  <button onClick={() => void run("archive", confirm.s)} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: "#0e58a8" }}>Arxivlash</button>
                  <button onClick={() => void run("delete", confirm.s, true)} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: "#e11d48" }}>Baribir o&apos;chirish</button>
                </>
              ) : (
                <button disabled={busyId === confirm.s.id}
                  onClick={() => void run(confirm.kind, confirm.s)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: confirm.kind === "delete" ? "#e11d48" : "#0e58a8" }}>
                  {confirm.kind === "delete" ? "O'chirish" : confirm.kind === "archive" ? "Arxivlash" : "E'lon qilish"}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
