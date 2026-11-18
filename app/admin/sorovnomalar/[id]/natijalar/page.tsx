"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  BarChart3, ArrowLeft, Pencil, FileSpreadsheet, FileDown, RefreshCw, AlertCircle, CheckCircle2, Users, UserCheck, UserX, Percent,
  ShieldCheck, Eye, Search, MessageSquareText, ChevronLeft, ChevronRight, Filter, EyeOff, CalendarClock, Clock,
} from "lucide-react"
import { surveysApi, type SurveyResults, type SurveySegment, type SurveyParticipant, type SurveyQuestionResult } from "@/lib/api"
import { TintStat, PageHeader, Notice, Field, FieldSelect, EmptyCard, type CssVars } from "@/components/admin/AdminUi"
import { Meter } from "@/components/admin/DashboardCharts"
import { OptionBars, DistributionBars, TrendBars, BreakdownTable } from "@/components/surveys/ResultCharts"
import { TYPE_ICON } from "@/components/surveys/QuestionBuilder"
import { STATE_LABEL, STATE_COLOR, QUESTION_TYPE_LABEL, ROLE_LABEL, fmtDateTime, timeLeft, percent, takeFlash } from "@/components/surveys/surveyUi"
import { exportSurveyExcel, exportSurveyPdf } from "@/lib/surveyExport"

const NUM = { fontVariantNumeric: "tabular-nums" } as const
type Tab = "answers" | "participation" | "people"

function TextAnswers({ texts, total }: { texts: string[]; total: number }) {
  const [q, setQ] = useState("")
  const [limit, setLimit] = useState(20)
  const shown = texts.filter((t) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase()))
  if (!texts.length) return <p className="text-sm text-[var(--adm-muted)]">Yozma javob yo&apos;q</p>
  return (
    <div className="flex flex-col gap-2">
      {texts.length > 5 && (
        <label className="adm-input flex h-9 items-center gap-2 rounded-xl px-3 sm:max-w-xs">
          <Search className="h-4 w-4 text-[var(--adm-muted)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Javoblar ichidan qidirish"
            className="w-full bg-transparent text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]" />
        </label>
      )}
      <ul className="flex max-h-[360px] flex-col gap-1.5 overflow-y-auto pr-1">
        {shown.slice(0, limit).map((t, i) => (
          <li key={i} className="whitespace-pre-wrap break-words rounded-xl px-3.5 py-2.5 text-sm text-[var(--adm-text)]" style={{ backgroundColor: "var(--adm-grid)" }}>{t}</li>
        ))}
      </ul>
      <div className="flex items-center justify-between text-xs text-[var(--adm-muted)]">
        <span>{shown.length < texts.length ? `${shown.length} ta topildi · ` : ""}Jami {total} ta yozma javob{texts.length < total ? ` (ko'rsatilgani ${texts.length} — to'liq ro'yxat Excel'da)` : ""}</span>
        {shown.length > limit && <button onClick={() => setLimit((l) => l + 30)} className="font-semibold text-[var(--adm-accent)]">Yana ko&apos;rsatish</button>}
      </div>
    </div>
  )
}

function QuestionResultCard({ q, index }: { q: SurveyQuestionResult; index: number }) {
  const Icon = TYPE_ICON[q.type]
  return (
    <div className="adm-card p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #3b74f0, #1e40af)" }}>{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap break-words text-[15px] font-semibold text-[var(--adm-text)]">{q.text}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--adm-muted)]">
            <span className="inline-flex items-center gap-1"><Icon className="h-3.5 w-3.5" /> {QUESTION_TYPE_LABEL[q.type]}</span>
            <span style={NUM}>{q.answered} ta javob</span>
            {q.skipped > 0 && <span style={NUM}>{q.skipped} ta o&apos;tkazib yuborgan</span>}
          </div>
        </div>
      </div>
      {q.options ? (
        <>
          <OptionBars total={q.answered} rows={[
            ...q.options.map((o) => ({ key: o.id, label: o.text, count: o.count, percent: o.percent })),
            ...(q.otherCount ? [{ key: "other", label: "Boshqa (o'zi yozgan)", count: q.otherCount, percent: percent(q.otherCount, q.answered) }] : []),
          ]} />
          {q.type === "multiple" && <p className="mt-3 text-[11px] text-[var(--adm-muted)]">Bir nechta javob tanlash mumkin bo&apos;lgani uchun foizlar yig&apos;indisi 100% dan oshishi mumkin.</p>}
          {!!q.otherTexts?.length && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-semibold text-[var(--adm-accent)]">«Boshqa» javoblari ({q.otherCount})</summary>
              <div className="mt-2"><TextAnswers texts={q.otherTexts} total={q.otherCount ?? q.otherTexts.length} /></div>
            </details>
          )}
        </>
      ) : q.type === "yesno" && q.distribution ? (
        <OptionBars total={q.answered} rows={[...q.distribution].reverse().map((d) => ({ key: d.value, label: d.value === 1 ? "Ha" : "Yo'q", count: d.count, percent: d.percent }))} />
      ) : q.distribution ? (
        <DistributionBars dist={q.distribution} average={q.average} max={q.scaleMax ?? 5} star={q.type === "rating"} />
      ) : (
        <TextAnswers texts={q.texts ?? []} total={q.textTotal ?? 0} />
      )}
    </div>
  )
}

function ParticipantsTab({ id, results }: { id: number; results: SurveyResults }) {
  const [status, setStatus] = useState("")
  const [q, setQ] = useState("")
  const [faculty, setFaculty] = useState("")
  const [course, setCourse] = useState("")
  const [group, setGroup] = useState("")
  const [role, setRole] = useState("")
  const [page, setPage] = useState(0)
  const [data, setData] = useState<{ total: number; items: SurveyParticipant[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const limit = 50
  const p = results.participation

  useEffect(() => {
    let alive = true
    const t = window.setTimeout(() => {
      setLoading(true)
      surveysApi.participants(id, { status, q: q.trim(), faculty, course, group, role, limit, offset: page * limit })
        .then((r) => { if (alive) { setData({ total: r.total, items: r.items }); setError("") } })
        .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Yuklab bo'lmadi") })
        .finally(() => { if (alive) setLoading(false) })
    }, q ? 300 : 0)
    return () => { alive = false; window.clearTimeout(t) }
  }, [id, status, q, faculty, course, group, role, page])

  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(0) }
  const pages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {([["", `Barchasi (${p.total})`], ["completed", `Javob berganlar (${p.completed})`], ["pending", `Javob bermaganlar (${p.pending})`]] as const).map(([v, label]) => (
          <button key={v} data-active={status === v} onClick={() => resetPage(setStatus)(v)} className="adm-chip rounded-full px-3.5 py-2 text-xs font-semibold">{label}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
        <Field icon={Search} label="Qidirish" className="xl:col-span-1">
          <input value={q} onChange={(e) => resetPage(setQ)(e.target.value)} placeholder="F.I.Sh yoki ID"
            className="w-full bg-transparent text-sm font-semibold text-[var(--adm-text)] outline-none placeholder:font-normal placeholder:text-[var(--adm-muted)]" />
        </Field>
        <Field icon={Users} label="Rol">
          <FieldSelect value={role} onChange={resetPage(setRole)}>
            <option value="">Barchasi</option>
            <option value="student">Talabalar</option>
            <option value="employee">O&apos;qituvchilar</option>
          </FieldSelect>
        </Field>
        <Field icon={Filter} label="Fakultet">
          <FieldSelect value={faculty} onChange={resetPage(setFaculty)}>
            <option value="">Barchasi</option>
            {p.byFaculty.map((f) => <option key={f.key} value={f.key}>{f.key}</option>)}
          </FieldSelect>
        </Field>
        <Field icon={Filter} label="Kurs">
          <FieldSelect value={course} onChange={resetPage(setCourse)}>
            <option value="">Barchasi</option>
            {p.byCourse.map((f) => <option key={f.key} value={f.key}>{f.key}</option>)}
          </FieldSelect>
        </Field>
        <Field icon={Filter} label="Guruh / kafedra">
          <FieldSelect value={group} onChange={resetPage(setGroup)}>
            <option value="">Barchasi</option>
            {[...p.byGroup, ...p.byDepartment].map((f) => <option key={f.key} value={f.key}>{f.key}</option>)}
          </FieldSelect>
        </Field>
      </div>

      {error ? (
        <Notice ok={false}><AlertCircle className="h-4 w-4" /> {error}</Notice>
      ) : !data ? (
        <div className="flex justify-center py-10"><RefreshCw className="h-5 w-5 animate-spin text-[var(--adm-accent)]" /></div>
      ) : data.items.length === 0 ? (
        <EmptyCard icon={Users} text="Bu filtr bo'yicha hech kim topilmadi" />
      ) : (
        <div className="adm-card overflow-hidden" style={{ opacity: loading ? 0.6 : 1 }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "var(--adm-grid)" }}>
                <tr>
                  {["#", "F.I.Sh", "Rol", "Fakultet", "Kurs", "Guruh / Kafedra", "Holat", "Javob vaqti"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--adm-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, i) => (
                  <tr key={`${it.role}:${it.userId}`} className="adm-hover-row" style={{ borderTop: "1px solid var(--adm-border)" }}>
                    <td className="px-3 py-2.5 text-xs text-[var(--adm-muted)]" style={NUM}>{page * limit + i + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-[13px] font-medium text-[var(--adm-text)]">{it.fullName}</div>
                      {it.idNumber && <div className="text-[11px] text-[var(--adm-muted)]" style={NUM}>{it.idNumber}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[var(--adm-text-2)]">{ROLE_LABEL[it.role] ?? it.role}</td>
                    <td className="px-3 py-2.5 text-xs text-[var(--adm-text-2)]">{it.faculty ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--adm-text-2)]">{it.course ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-[var(--adm-text-2)]">{it.groupName ?? it.department ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {it.status === "completed" ? (
                        <span className="adm-pill" style={{ "--c": "var(--adm-up)" } as CssVars}><CheckCircle2 className="h-3 w-3" /> Javob berdi</span>
                      ) : it.openedAt ? (
                        <span className="adm-pill" style={{ "--c": "var(--role-pending)" } as CssVars}><Eye className="h-3 w-3" /> Ochgan, yubormagan</span>
                      ) : (
                        <span className="adm-pill" style={{ "--c": "var(--adm-muted)" } as CssVars}><UserX className="h-3 w-3" /> Javob bermagan</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--adm-text-2)]" style={NUM}>{it.completedAt ? fmtDateTime(it.completedAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-[var(--adm-muted)]" style={{ borderTop: "1px solid var(--adm-border)" }}>
            <span style={NUM}>{data.total} kishi · {page + 1}/{pages}-sahifa</span>
            <div className="flex gap-1.5">
              <button disabled={page === 0} onClick={() => setPage((x) => x - 1)} className="adm-btn-outline flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-40" aria-label="Oldingi"><ChevronLeft className="h-4 w-4" /></button>
              <button disabled={page + 1 >= pages} onClick={() => setPage((x) => x + 1)} className="adm-btn-outline flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-40" aria-label="Keyingi"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}
      {results.survey.isAnonymous && (
        <p className="flex items-start gap-2 text-xs text-[var(--adm-muted)]">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Anonim so&apos;rovnoma: bu ro&apos;yxat faqat kim qatnashganini ko&apos;rsatadi. Javoblar ismsiz saqlangan va hech kimga bog&apos;lanmaydi.
        </p>
      )}
    </div>
  )
}

export default function SurveyResultsPage() {
  const params = useParams<{ id: string }>()
  const id = Number(params?.id)
  const validId = Number.isInteger(id) && id > 0
  const [results, setResults] = useState<SurveyResults | null>(null)
  const [segment, setSegmentState] = useState<SurveySegment>({})
  const [canEdit, setCanEdit] = useState(false)
  const [tab, setTab] = useState<Tab>("answers")
  const [fetchError, setFetchError] = useState("")
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const error = validId ? fetchError : "So'rovnoma topilmadi"

  const fetchResults = useCallback((seg: SurveySegment) => {
    return surveysApi.results(id, seg)
      .then((r) => { setResults(r.data); setFetchError("") })
      .catch((e) => setFetchError(e instanceof Error ? e.message : "Yuklab bo'lmadi"))
      .finally(() => setLoading(false))
  }, [id])

  /** Kesim o'zgarishi va "Qayta urinish" — foydalanuvchi amali */
  function setSegment(next: SurveySegment | ((s: SurveySegment) => SurveySegment)) {
    setLoading(true)
    setSegmentState(next)
  }
  function load(seg: SurveySegment) {
    setLoading(true)
    void fetchResults(seg)
  }

  useEffect(() => {
    if (!validId) return
    surveysApi.managerInfo().then((r) => setCanEdit(r.data.canEdit)).catch(() => {})
    const t = window.setTimeout(() => { const flash = takeFlash(); if (flash) setMsg(flash) }, 0)
    return () => window.clearTimeout(t)
  }, [validId])

  useEffect(() => {
    if (validId) void fetchResults(segment)
  }, [validId, segment, fetchResults])

  async function doExport(kind: "excel" | "pdf") {
    if (!results) return
    setExporting(kind)
    setMsg(null)
    try {
      if (kind === "excel") {
        const [full, data] = await Promise.all([surveysApi.results(id), surveysApi.exportData(id)])
        exportSurveyExcel(full.data, data.data)
      } else {
        exportSurveyPdf(results)
      }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Eksport qilib bo'lmadi" })
    } finally {
      setExporting(null)
    }
  }

  if (error && !results) {
    return (
      <div className="px-3 pt-2 sm:px-8">
        <div className="adm-card flex flex-col items-center gap-3 p-10 text-center">
          <AlertCircle className="h-8 w-8" style={{ color: "var(--role-admin)" }} />
          <p className="text-sm text-[var(--adm-text)]">{error}</p>
          <div className="flex gap-2">
            <button onClick={() => load(segment)} className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4" /> Qayta urinish</button>
            <Link href="/admin/sorovnomalar" className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Ro&apos;yxat</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="flex flex-col gap-4 px-3 pt-2 sm:px-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="adm-card h-[84px] animate-pulse" />)}</div>
        {[0, 1].map((i) => <div key={i} className="adm-card h-48 animate-pulse" />)}
      </div>
    )
  }

  const s = results.survey
  const p = results.participation
  const a = results.answers
  const anon = s.isAnonymous
  const choices = a.segmentChoices
  const segActive = Object.values(segment).some(Boolean)

  return (
    <div className="flex flex-col gap-5 px-3 pb-10 pt-2 sm:px-8">
      <PageHeader icon={BarChart3} title={s.title} subtitle={`${s.surveyTypeLabel} · ${s.questionCount} savol`}>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => void doExport("excel")} disabled={!!exporting} className="adm-btn-outline flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold disabled:opacity-60">
            {exporting === "excel" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Excel
          </button>
          <button onClick={() => void doExport("pdf")} disabled={!!exporting} className="adm-btn-outline flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold disabled:opacity-60">
            {exporting === "pdf" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} PDF
          </button>
          {canEdit && s.state !== "archived" && (
            <Link href={`/admin/sorovnomalar/${s.id}`} className="adm-btn-outline flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold"><Pencil className="h-4 w-4" /> Tahrirlash</Link>
          )}
          <Link href="/admin/sorovnomalar" className="adm-btn-outline flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Ro&apos;yxat</Link>
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="adm-pill" style={{ "--c": STATE_COLOR[s.state] } as CssVars}>{STATE_LABEL[s.state]}</span>
        {anon
          ? <span className="adm-pill" style={{ "--c": "var(--adm-up)" } as CssVars}><ShieldCheck className="h-3 w-3" /> Anonim</span>
          : <span className="adm-pill" style={{ "--c": "var(--role-pending)" } as CssVars}><Eye className="h-3 w-3" /> Ochiq (ismli)</span>}
        <span className="adm-pill"><CalendarClock className="h-3 w-3" /> {fmtDateTime(s.startAt)} — {fmtDateTime(s.endAt)}</span>
        {s.state === "active" && <span className="adm-pill" style={{ "--c": "var(--adm-accent)" } as CssVars}><Clock className="h-3 w-3" /> {timeLeft(s.endAt)}</span>}
      </div>

      {msg && <Notice ok={msg.ok}>{msg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}{msg.text}</Notice>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TintStat icon={Users} color="var(--adm-accent)" label="Maqsadli ishtirokchilar" value={p.total}
          sub={p.byRole.map((r) => `${ROLE_LABEL[r.key] ?? r.key}: ${r.total}`).join(" · ")} />
        <TintStat icon={UserCheck} color="var(--adm-up)" label="Javob berganlar" value={p.completed}
          sub={p.byRole.map((r) => `${ROLE_LABEL[r.key] ?? r.key}: ${r.completed}`).join(" · ")} />
        <TintStat icon={UserX} color="var(--role-admin)" label="Javob bermaganlar" value={p.pending}
          sub={p.openedNotCompleted ? `${p.openedNotCompleted} kishi ochib, yubormagan` : undefined} />
        <div className="adm-tint flex flex-col justify-center gap-2 p-4" style={{ "--c": "var(--role-dean)" } as CssVars}>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--role-dean)" }}><Percent className="h-4 w-4" /> Ishtirok foizi</div>
          <div className="text-2xl font-bold leading-tight text-[var(--adm-text)]" style={NUM}>{p.rate}%</div>
          <Meter percent={p.rate} color="var(--role-dean)" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {([["answers", "Javoblar tahlili", MessageSquareText], ["participation", "Ishtirok kesimi", BarChart3], ["people", "Ishtirokchilar", Users]] as const).map(([key, label, Icon]) => (
          <button key={key} data-active={tab === key} onClick={() => setTab(key)} className="adm-chip flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold">
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "answers" && (
        <div className="flex flex-col gap-4">
          <div className="adm-card flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--adm-text)]"><Filter className="h-4 w-4 text-[var(--adm-accent)]" /> Kesim bo&apos;yicha tahlil</p>
              {segActive && <button onClick={() => setSegment({})} className="text-xs font-semibold text-[var(--adm-accent)]">Filtrni tozalash</button>}
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
              <Field icon={Users} label="Rol">
                <FieldSelect value={segment.role ?? ""} onChange={(v) => setSegment((x) => ({ ...x, role: v || undefined }))}>
                  <option value="">Barchasi</option>
                  <option value="student">Talabalar</option>
                  <option value="employee">O&apos;qituvchilar</option>
                </FieldSelect>
              </Field>
              <Field icon={Filter} label="Fakultet">
                <FieldSelect value={segment.faculty ?? ""} onChange={(v) => setSegment((x) => ({ ...x, faculty: v || undefined }))}>
                  <option value="">Barchasi</option>
                  {choices.faculty.map((c) => <option key={c.key} value={c.key}>{c.key} ({c.responses})</option>)}
                </FieldSelect>
              </Field>
              <Field icon={Filter} label="Kurs">
                <FieldSelect value={segment.course ?? ""} onChange={(v) => setSegment((x) => ({ ...x, course: v || undefined }))}>
                  <option value="">Barchasi</option>
                  {choices.course.map((c) => <option key={c.key} value={c.key}>{c.key} ({c.responses})</option>)}
                </FieldSelect>
              </Field>
              {!anon && (
                <>
                  <Field icon={Filter} label="Yo'nalish">
                    <FieldSelect value={segment.specialty ?? ""} onChange={(v) => setSegment((x) => ({ ...x, specialty: v || undefined }))}>
                      <option value="">Barchasi</option>
                      {choices.specialty.map((c) => <option key={c.key} value={c.key}>{c.key} ({c.responses})</option>)}
                    </FieldSelect>
                  </Field>
                  <Field icon={Filter} label="Guruh">
                    <FieldSelect value={segment.group ?? ""} onChange={(v) => setSegment((x) => ({ ...x, group: v || undefined }))}>
                      <option value="">Barchasi</option>
                      {choices.group.map((c) => <option key={c.key} value={c.key}>{c.key} ({c.responses})</option>)}
                    </FieldSelect>
                  </Field>
                </>
              )}
            </div>
            {anon && (
              <p className="flex items-start gap-2 text-[11px] text-[var(--adm-muted)]">
                <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Anonim so&apos;rovnoma: javoblar faqat rol, fakultet va kurs kesimida tahlil qilinadi; {a.minGroup} tadan kam javobli kesim ko&apos;rsatilmaydi (shaxsni aniqlab bo&apos;lmasligi uchun).
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm" style={{ opacity: loading ? 0.6 : 1 }}>
            <span className="text-[var(--adm-text-2)]">Tahlil qilingan javoblar: <b className="text-[var(--adm-text)]" style={NUM}>{a.responseTotal}</b></span>
            {loading && <RefreshCw className="h-4 w-4 animate-spin text-[var(--adm-accent)]" />}
          </div>

          {a.suppressed ? (
            <EmptyCard icon={EyeOff} text={`Bu kesimda ${a.minGroup} tadan kam javob bor`} hint="Anonimlikni saqlash uchun natija ko'rsatilmaydi — kengroq kesim tanlang" />
          ) : a.responseTotal === 0 ? (
            <EmptyCard icon={MessageSquareText} text="Hali javob kelmagan" hint={s.state === "active" ? "Javoblar kelishi bilan shu yerda paydo bo'ladi" : undefined} />
          ) : (
            <div className="flex flex-col gap-4" style={{ opacity: loading ? 0.6 : 1 }}>
              {a.questions.map((q, i) => <QuestionResultCard key={q.id} q={q} index={i} />)}
            </div>
          )}
        </div>
      )}

      {tab === "participation" && (
        <div className="flex flex-col gap-4">
          <div className="adm-card p-4 sm:p-5">
            <h3 className="mb-3 text-sm font-bold text-[var(--adm-text)]">Kunlar bo&apos;yicha javoblar</h3>
            <TrendBars points={p.trend} />
          </div>
          {p.byRole.length > 1 && <BreakdownTable title="Rol bo'yicha" nameLabel="Rol" rows={p.byRole.map((r) => ({ ...r, key: ROLE_LABEL[r.key] ?? r.key }))} />}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <BreakdownTable title="Fakultetlar" nameLabel="Fakultet" rows={p.byFaculty} />
            <BreakdownTable title="Kurslar" nameLabel="Kurs" rows={p.byCourse} />
            <BreakdownTable title="Yo'nalishlar" nameLabel="Yo'nalish" rows={p.bySpecialty} />
            <BreakdownTable title="Kafedralar (o'qituvchilar)" nameLabel="Kafedra" rows={p.byDepartment} />
          </div>
          <BreakdownTable title="Guruhlar" nameLabel="Guruh" rows={p.byGroup} />
        </div>
      )}

      {tab === "people" && <ParticipantsTab id={id} results={results} />}
    </div>
  )
}
