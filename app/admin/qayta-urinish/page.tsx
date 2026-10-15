"use client"

import { useMemo, useState } from "react"
import {
  RefreshCw, Search, Clock, CheckCircle2, AlertCircle, Lock, LockOpen,
  FileText, HelpCircle, ShieldAlert, Users, ChevronDown, ChevronUp, CalendarDays, Save,
  User, BookOpen, UsersRound, RotateCcw, ListChecks, CalendarX2, X,
} from "lucide-react"
import { adminApi, teachingApi, type AdminTeacherStat, type AdminTopicRow } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { RetakeTable } from "@/components/teaching/RetakeTable"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { tr } from "@/lib/i18n/translations"
import { motion, pageVariants } from "@/components/ui/motion"
import { PersonAvatar } from "@/components/ui/PersonAvatar"
import { Field, FieldSelect, TintStat, EmptyCard, PageHeader, Notice, type CssVars } from "@/components/admin/AdminUi"

const NUM = { fontVariantNumeric: "tabular-nums" } as const
const pad = (n: number) => String(n).padStart(2, "0")

/** Intl'siz (brauzerda uz locale ma'lumotlari yo'q): 15.10.2026 23:50 */
function fmtDeadline(iso: string | null) {
  if (!iso) return tr("adminRetry.noDeadline")
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* datetime-local qiymati mahalliy vaqtda (ISO'ni .slice qilish 5 soat siljitadi) */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* Bitta mavzu testining natijalari: kim o'tdi / yiqildi, aynan tanlangan
   talabalarga bittadan qo'shimcha urinish berish */
function TopicTestResults({ topic }: { topic: AdminTopicRow }) {
  const testId = topic.testId!
  const { data, loading, error, refetch } = useApi(() => adminApi.contentSubmissions(testId), [testId])
  const { data: violData } = useApi(
    () => teachingApi.violations(testId).catch(() => ({ success: true, data: [] })), [testId]
  )
  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <RefreshCw className="h-5 w-5 animate-spin text-[var(--adm-accent)]" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <p className="text-sm" style={{ color: "var(--role-admin)" }}>{error}</p>
        <button onClick={() => refetch()} className="adm-btn-outline flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold">
          <RefreshCw className="h-3.5 w-3.5" /> {tr("common.refresh")}
        </button>
      </div>
    )
  }
  return (
    <RetakeTable
      submissions={data?.data ?? []}
      maxScore={topic.testMaxScore}
      attemptsCount={topic.testAttemptsCount}
      grant={(ids) => adminApi.grantRetake(testId, ids)}
      revoke={(studentUserId) => adminApi.revokeRetake(testId, studentUserId)}
      onChanged={refetch}
      violations={violData?.data ?? []}
    />
  )
}

type TopicFilter = "all" | "passed" | "reopened" | "test"

export default function AdminQaytaUrinish() {
  const { t } = useLanguage()
  const [teacherId, setTeacherId] = useState<number | "">("")
  const [subjectName, setSubjectName] = useState("")
  const [groupId, setGroupId] = useState<number | "">("")
  const [toggling, setToggling] = useState<string | null>(null)
  const [resultsFor, setResultsFor] = useState<string | null>(null)
  const [toggleErr, setToggleErr] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [topicFilter, setTopicFilter] = useState<TopicFilter>("all")
  // Mavzu muddatini o'zgartirish (uzaytirish / muddatsiz qilish)
  const [deadlineFor, setDeadlineFor] = useState<string | null>(null)
  const [deadlineDraft, setDeadlineDraft] = useState("")
  const [deadlineSaving, setDeadlineSaving] = useState(false)
  // Har guruhda mavzu alohida nusxa — odatda hammasiga bir xil muddat kerak
  const [deadlineAllGroups, setDeadlineAllGroups] = useState(true)
  const [deadlineMsg, setDeadlineMsg] = useState<string | null>(null)

  const { data: teachersRes, loading: lTeachers, error: eTeachers } = useApi(() => adminApi.teacherStats(), [])
  const teachers: AdminTeacherStat[] = teachersRes?.data ?? []

  const { data: infoRes } = useApi(
    () => teacherId !== "" ? adminApi.teacherInfo(teacherId) : Promise.resolve(null),
    [teacherId]
  )
  const subjects = infoRes?.data?.subjects ?? []
  const groups = infoRes?.data?.groups ?? []

  function handleTeacherChange(val: string) {
    setTeacherId(val === "" ? "" : Number(val))
    setSubjectName("")
    setGroupId("")
  }

  const ready = teacherId !== "" && subjectName !== "" && groupId !== ""

  const { data: topicsRes, loading: lTopics, error: eTopics, refetch: refetchTopics } = useApi(
    () => ready ? adminApi.teacherTopicsList({ teacherId, subject: subjectName, groupId }) : Promise.resolve(null),
    [teacherId, subjectName, groupId, ready]
  )
  const topics: AdminTopicRow[] = useMemo(() => topicsRes?.data ?? [], [topicsRes])

  const counts = useMemo(() => ({
    all: topics.length,
    passed: topics.filter(tp => tp.deadlinePassed).length,
    reopened: topics.filter(tp => tp.isReopened).length,
    test: topics.filter(tp => tp.hasTest).length,
  }), [topics])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return topics.filter(tp =>
      (!q || tp.title.toLowerCase().includes(q)) &&
      (topicFilter === "all" ||
        (topicFilter === "passed" && tp.deadlinePassed) ||
        (topicFilter === "reopened" && tp.isReopened) ||
        (topicFilter === "test" && tp.hasTest))
    )
  }, [topics, search, topicFilter])

  async function toggleTopic(topic: AdminTopicRow) {
    setToggling(topic.topicKey)
    setToggleErr(null)
    try {
      if (topic.isReopened) await adminApi.closeTopic(topic.topicKey)
      else await adminApi.reopenTopic(topic.topicKey)
      await refetchTopics()
    } catch (e) {
      setToggleErr(e instanceof Error ? e.message : t("common.error"))
    } finally {
      setToggling(null)
    }
  }

  function startEditDeadline(topic: AdminTopicRow) {
    setDeadlineFor(topic.topicKey)
    setDeadlineDraft(toLocalInputValue(topic.deadline))
    setDeadlineAllGroups(true)
    setDeadlineMsg(null)
    setToggleErr(null)
  }

  async function saveDeadline(topic: AdminTopicRow, localValue: string | null) {
    setDeadlineSaving(true)
    setToggleErr(null)
    try {
      const res = await adminApi.setTopicDeadline(topic.topicKey, localValue ? new Date(localValue).toISOString() : null, deadlineAllGroups)
      setDeadlineFor(null)
      setDeadlineMsg(res.message ?? null)
      await refetchTopics()
    } catch (e) {
      setToggleErr(e instanceof Error ? e.message : t("common.error"))
    } finally {
      setDeadlineSaving(false)
    }
  }

  const teacherIcon = teacherId !== "" ? (
    <PersonAvatar kind="employee" id={teacherId} className="h-9 w-9 rounded-lg">
      <span className="adm-icon-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ "--c": "var(--adm-accent)" } as CssVars}><User className="h-[18px] w-[18px]" /></span>
    </PersonAvatar>
  ) : undefined

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="flex flex-col gap-5 px-4 pb-8 pt-2 sm:px-8">
      <PageHeader icon={RotateCcw} title={t("adminRetry.title")} subtitle={t("adminRetry.subtitle")}>
        {ready && (
          <button onClick={() => refetchTopics()}
            className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            style={{ boxShadow: "var(--adm-shadow)" }}>
            <RefreshCw className={`h-4 w-4 ${lTopics ? "animate-spin" : ""}`} /> {t("common.refresh")}
          </button>
        )}
      </PageHeader>

      {/* Filtrlar: o'qituvchi → fan → guruh */}
      <div className="adm-card grid grid-cols-1 gap-3 p-3 sm:p-4 md:grid-cols-3">
        <Field icon={User} iconNode={teacherIcon} label={t("adminRetry.teacherLabel")}>
          <FieldSelect value={String(teacherId)} onChange={handleTeacherChange} disabled={lTeachers}>
            <option value="">{lTeachers ? t("common.loading") : t("adminRetry.selectPh")}</option>
            {teachers.map(tc => <option key={tc.hemisId} value={tc.hemisId}>{tc.fullName}</option>)}
          </FieldSelect>
        </Field>
        <Field icon={BookOpen} label={t("adminRetry.subjectLabel")}>
          <FieldSelect value={subjectName} onChange={v => { setSubjectName(v); setGroupId("") }} disabled={teacherId === ""}>
            <option value="">{t("adminRetry.selectPh")}</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </FieldSelect>
        </Field>
        <Field icon={UsersRound} label={t("adminRetry.groupLabel")}>
          <FieldSelect value={String(groupId)} onChange={v => setGroupId(v === "" ? "" : Number(v))} disabled={subjectName === ""}>
            <option value="">{t("adminRetry.selectPh")}</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </FieldSelect>
        </Field>
      </div>

      {eTeachers && <Notice ok={false}><AlertCircle className="h-4 w-4 shrink-0" />{eTeachers}</Notice>}
      {deadlineMsg && <Notice ok><CheckCircle2 className="h-4 w-4 shrink-0" />{deadlineMsg}</Notice>}
      {toggleErr && <Notice ok={false}><AlertCircle className="h-4 w-4 shrink-0" />{toggleErr}</Notice>}

      {!ready ? (
        <EmptyCard icon={ListChecks} text={t("adminRetry.pickAll")} hint={t("adminRetry.pickHint")} />
      ) : lTopics && !topicsRes ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="adm-card h-[84px] animate-pulse" />)}
          </div>
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="adm-card h-[96px] animate-pulse" />)}
        </div>
      ) : eTopics ? (
        <div className="adm-card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm" style={{ color: "var(--role-admin)" }}>{eTopics}</p>
          <button onClick={() => refetchTopics()} className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <RefreshCw className="h-4 w-4" /> {t("common.refresh")}
          </button>
        </div>
      ) : topics.length === 0 ? (
        <EmptyCard icon={FileText} text={t("adminRetry.noTopics")} />
      ) : (
        <>
          {/* Qisqa xulosa */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <TintStat icon={ListChecks} color="var(--adm-accent)" label={t("adminRetry.statTopics")} value={counts.all} />
            <TintStat icon={CalendarX2} color="var(--role-admin)" label={t("adminRetry.statPassed")} value={counts.passed} />
            <TintStat icon={LockOpen} color="var(--adm-up)" label={t("adminRetry.reopened")} value={counts.reopened} />
            <TintStat icon={HelpCircle} color="var(--role-dean)" label={t("adminRetry.statWithTest")} value={counts.test} />
          </div>

          {/* Qidiruv va holat bo'yicha filtr */}
          <div className="adm-card flex flex-wrap items-center gap-3 p-3 sm:p-4">
            <label className="adm-input flex h-10 w-full items-center gap-2 rounded-xl px-3 sm:w-[340px]">
              <Search className="h-4 w-4 shrink-0 text-[var(--adm-muted)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("adminRetry.searchPh")}
                className="w-full bg-transparent text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]" />
              {search && (
                <button onClick={() => setSearch("")} aria-label="×" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--adm-grid)] text-[var(--adm-muted)]">
                  <X className="h-3 w-3" />
                </button>
              )}
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {([
                { key: "all", label: t("adminRetry.filterAll"), n: counts.all },
                { key: "passed", label: t("adminRetry.statPassed"), n: counts.passed },
                { key: "reopened", label: t("adminRetry.reopened"), n: counts.reopened },
                { key: "test", label: t("adminRetry.hasTest"), n: counts.test },
              ] as { key: TopicFilter; label: string; n: number }[]).map(f => (
                <button key={f.key} onClick={() => setTopicFilter(f.key)} data-active={topicFilter === f.key}
                  className="adm-chip flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium">
                  {f.label}
                  <span className="rounded-full px-1.5 text-[11px] font-semibold leading-4"
                    style={{ backgroundColor: topicFilter === f.key ? "rgba(255,255,255,0.25)" : "var(--adm-grid)", ...NUM }}>{f.n}</span>
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyCard icon={Search} text={t("adminRetry.noTopics")} />
          ) : (
            <div className={`flex flex-col gap-3 transition-opacity ${lTopics ? "opacity-60" : ""}`}>
              {filtered.map((topic, idx) => {
                const isBusy = toggling === topic.topicKey
                const showResults = resultsFor === topic.topicKey
                const canToggle = topic.hasTest || topic.hasAssignment
                const stateColor = topic.isReopened ? "var(--adm-up)" : topic.deadlinePassed ? "var(--role-admin)" : "var(--adm-accent)"
                const StateIcon = topic.isReopened ? LockOpen : topic.deadlinePassed ? Lock : Clock
                return (
                  <div key={topic.topicKey} className="adm-card overflow-hidden"
                    style={{ boxShadow: `inset 3px 0 0 ${stateColor}, var(--adm-shadow)` }}>
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:px-5">
                      <div className="flex min-w-0 items-start gap-3.5">
                        <div className="adm-icon-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ "--c": stateColor } as CssVars}>
                          <StateIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-[var(--adm-text)]">
                            <span className="mr-1.5 text-[var(--adm-muted)]" style={NUM}>{idx + 1}.</span>{topic.title}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="adm-pill" style={{ "--c": topic.deadlinePassed ? "var(--role-admin)" : "var(--adm-muted)" } as CssVars}>
                              <Clock className="h-3 w-3" />
                              <span style={NUM}>{fmtDeadline(topic.deadline)}</span>
                              {topic.deadlinePassed && <span>{t("adminRetry.passed")}</span>}
                            </span>
                            {deadlineFor !== topic.topicKey && (
                              <button onClick={() => startEditDeadline(topic)}
                                className="adm-pill transition-opacity hover:opacity-80" style={{ "--c": "var(--adm-accent)" } as CssVars}>
                                <CalendarDays className="h-3 w-3" /> {t("adminRetry.changeDeadline")}
                              </button>
                            )}
                            {topic.hasTest && (
                              <span className="adm-pill" style={{ "--c": "var(--role-dean)" } as CssVars}><HelpCircle className="h-3 w-3" /> {t("adminRetry.hasTest")}</span>
                            )}
                            {topic.hasAssignment && (
                              <span className="adm-pill" style={{ "--c": "var(--role-pending)" } as CssVars}><FileText className="h-3 w-3" /> {t("adminRetry.hasAssignment")}</span>
                            )}
                            {!canToggle && (
                              <span className="adm-pill"><ShieldAlert className="h-3 w-3" /> {t("adminRetry.nothing")}</span>
                            )}
                          </div>
                          {topic.isReopened && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--adm-up)]">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {topic.reopenedBy ? t("adminRetry.reopenedBy", { name: topic.reopenedBy }) : t("adminRetry.reopened")}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {topic.hasTest && topic.testId !== null && (
                          <button onClick={() => setResultsFor(showResults ? null : topic.topicKey)} data-active={showResults}
                            className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold">
                            <Users className="h-4 w-4" />
                            {t("retake.showResults")}
                            {showResults ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        )}
                        {!canToggle ? (
                          <span className="px-3 py-2 text-xs text-[var(--adm-muted)]">{t("adminRetry.cannot")}</span>
                        ) : topic.isReopened ? (
                          <button onClick={() => toggleTopic(topic)} disabled={isBusy}
                            className="adm-btn-outline flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold disabled:opacity-60"
                            style={{ color: "var(--role-admin)" }}>
                            {isBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                            {t("adminRetry.close")}
                          </button>
                        ) : (
                          <button onClick={() => toggleTopic(topic)} disabled={isBusy}
                            className="adm-btn-primary flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold disabled:opacity-60">
                            {isBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            {t("adminRetry.enable")}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Muddatni o'zgartirish */}
                    {deadlineFor === topic.topicKey && (
                      <div className="flex flex-col gap-2.5 px-4 py-4 sm:px-5"
                        style={{ borderTop: "1px solid var(--adm-border)", backgroundColor: "color-mix(in srgb, var(--adm-accent) 4%, var(--adm-card))" }}>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="adm-input flex h-10 items-center gap-2 rounded-xl px-3">
                            <CalendarDays className="h-4 w-4 text-[var(--adm-muted)]" />
                            <input type="datetime-local" value={deadlineDraft} onChange={e => setDeadlineDraft(e.target.value)}
                              className="bg-transparent text-sm font-semibold text-[var(--adm-text)] outline-none" />
                          </label>
                          <button onClick={() => saveDeadline(topic, deadlineDraft)} disabled={deadlineSaving || !deadlineDraft}
                            className="adm-btn-primary flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold disabled:opacity-60">
                            {deadlineSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {t("common.save")}
                          </button>
                          {topic.deadline && (
                            <button onClick={() => saveDeadline(topic, null)} disabled={deadlineSaving}
                              className="adm-btn-outline h-10 rounded-xl px-3.5 text-sm font-semibold disabled:opacity-60">
                              {t("adminRetry.clearDeadline")}
                            </button>
                          )}
                          <button onClick={() => setDeadlineFor(null)} disabled={deadlineSaving}
                            className="h-10 rounded-xl px-3 text-sm font-medium text-[var(--adm-muted)] hover:text-[var(--adm-text)]">
                            {t("common.cancel")}
                          </button>
                        </div>
                        <label className="flex w-fit cursor-pointer items-center gap-2 text-xs font-medium text-[var(--adm-text)]">
                          <input type="checkbox" checked={deadlineAllGroups} onChange={e => setDeadlineAllGroups(e.target.checked)}
                            className="h-4 w-4" style={{ accentColor: "var(--adm-accent)" }} />
                          {t("adminRetry.deadlineAllGroups")}
                        </label>
                        <p className="text-[11px] text-[var(--adm-muted)]">{t("adminRetry.deadlineHint")}</p>
                      </div>
                    )}

                    {/* Test natijalari va qayta urinish */}
                    {showResults && (
                      <div className="px-4 pb-4 pt-4 sm:px-5" style={{ borderTop: "1px solid var(--adm-border)" }}>
                        <TopicTestResults topic={topic} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
