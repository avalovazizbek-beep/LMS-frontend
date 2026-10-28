"use client"

import { BookOpen, ClipboardCheck, Calculator } from "lucide-react"
import type { JournalData, JournalStudent, TeachingContentType } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { journalLayout, studentTotals, fmtBall } from "@/lib/gradeTotals"

/* Talabaning baholari batafsil: ma'ruza (oraliqlar, mustaqil ishlar) va
   amaliyot (har topshiriqdan olgan bali, mustaqil ishlar) jadvallari va
   "Ma'ruza + Amaliyot = Joriy, + Yakuniy = Ball → Baho" qatori. O'qituvchi
   jurnalida talaba qatori ochilganda va talabaning "O'zlashtirish"
   sahifasida bir xil ko'rinadi. */

const FONT = { fontFamily: "var(--font-poppins)" } as const

interface Row { key: string; title: string; sub: string; max: number; got: number | null }

function pctOf(got: number | null, max: number): number | null {
  return got === null || max <= 0 ? null : Math.min(100, Math.round((got / max) * 100))
}

function PartTable({ title, Icon, color, soft, rows, totalLabel, total, totalMax, note }: {
  title: string
  Icon: typeof BookOpen
  color: string
  soft: string
  rows: Row[]
  totalLabel: string
  total: number | null
  totalMax: number
  note?: string
}) {
  const { t } = useLanguage()
  const totalPct = pctOf(total, totalMax)
  return (
    <div className="rounded-[10px] bg-white overflow-hidden flex flex-col" style={{ border: `1px solid ${soft}` }}>
      <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap" style={{ backgroundColor: soft }}>
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-sm font-semibold" style={{ color: "#012970", ...FONT }}>{title}</span>
        {note && <span className="text-[11px]" style={{ color: "#445b7a", ...FONT }}>· {note}</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs" style={FONT}>
          <thead>
            <tr style={{ color: "#7293b9", borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
              <th className="px-3 py-2 text-left font-medium w-8">№</th>
              <th className="px-3 py-2 text-left font-medium">{t("gradeBreakdown.colItem")}</th>
              <th className="px-3 py-2 text-center font-medium">{t("gradeBreakdown.colMax")}</th>
              <th className="px-3 py-2 text-center font-medium">{t("gradeBreakdown.colGot")}</th>
              <th className="px-3 py-2 text-left font-medium min-w-[140px]">{t("gradeBreakdown.colResult")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-4 text-center" style={{ color: "#94a3b8" }}>{t("gradeBreakdown.empty")}</td></tr>
            ) : rows.map((r, i) => {
              const pct = pctOf(r.got, r.max)
              return (
                <tr key={r.key} style={{ borderBottom: "1px solid rgba(1,41,112,0.05)" }}>
                  <td className="px-3 py-2" style={{ color: "#7293b9" }}>{i + 1}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium" style={{ color: "#012970" }}>{r.title}</div>
                    {r.sub && <div className="text-[11px]" style={{ color: "#7293b9" }}>{r.sub}</div>}
                  </td>
                  <td className="px-3 py-2 text-center" style={{ color: "#445b7a" }}>{fmtBall(r.max)}</td>
                  <td className="px-3 py-2 text-center font-semibold" style={{ color: "#012970" }}>{r.got === null ? "—" : fmtBall(r.got)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ backgroundColor: "#eef2f7" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct ?? 0}%`, backgroundColor: color }} />
                      </div>
                      <span className="w-9 text-right" style={{ color: "#445b7a" }}>{pct === null ? "—" : `${pct}%`}</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: soft }}>
              <td colSpan={2} className="px-3 py-2 font-semibold" style={{ color }}>{totalLabel}</td>
              <td colSpan={2} className="px-3 py-2 text-center font-semibold" style={{ color: "#012970" }}>
                {total === null ? "—" : fmtBall(total)} / {fmtBall(totalMax)}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.7)" }}>
                    <div className="h-full rounded-full" style={{ width: `${totalPct ?? 0}%`, backgroundColor: color }} />
                  </div>
                  <span className="w-9 text-right" style={{ color: "#445b7a" }}>{totalPct === null ? "—" : `${totalPct}%`}</span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export function GradeBreakdown({ data, student, values }: {
  data: Pick<JournalData, "topics" | "scale"> & Partial<Pick<JournalData, "miColumns" | "periodItems">>
  student: JournalStudent
  /** Jurnalda qo'lda o'zgartirilgan ON1/ON2/YN (berilmasa — talaba qatoridagi) */
  values?: { on1: number | null; on2: number | null; yn: number | null }
}) {
  const { t } = useLanguage()
  const { scale } = data
  const layout = journalLayout(scale, data.miColumns ?? [])
  const r = studentTotals(layout, student, values ?? { on1: student.on1, on2: student.on2, yn: student.yn })
  const typeLabel = (type?: TeachingContentType) =>
    t(type === "assignment" ? "typeContentOq.form.formatAssignment" : "typeContentOq.form.formatTest")

  const onRow = (slot: "ON1" | "ON2", n: number, max: number, got: number | null): Row => {
    const item = data.periodItems?.[slot] ?? null
    const sub = item
      ? [typeLabel(item.type), item.type === "exam" && item.questionCount > 0 ? t("gradeBreakdown.questions", { n: item.questionCount }) : ""].filter(Boolean).join(" · ")
      : t("gradeBreakdown.notCreated")
    return { key: slot, title: item?.title || t("gradeBreakdown.onN", { n }), sub, max, got }
  }
  const lectureRows: Row[] = [
    onRow("ON1", 1, scale.on1, r.on1),
    onRow("ON2", 2, scale.on2, r.on2),
    ...layout.lectureMi.map((c, i) => ({
      key: `mi-${c.id}`, title: t("gradeBreakdown.miN", { n: i + 1 }), sub: `${typeLabel(c.type)} · ${c.title}`, max: c.points, got: r.mi(c),
    })),
  ]
  const practiceRows: Row[] = [
    ...data.topics.map(tp => ({
      key: tp.key, title: tp.title,
      sub: (tp.types ?? []).map(typeLabel).join(" · "),
      max: tp.points ?? 0, got: student.topicPoints?.[tp.key] ?? null,
    })),
    ...layout.practiceMi.map((c, i) => ({
      key: `mi-${c.id}`, title: t("gradeBreakdown.practiceMiN", { n: i + 1 }), sub: `${typeLabel(c.type)} · ${c.title}`, max: c.points, got: r.mi(c),
    })),
  ]
  const each = data.topics[0]?.points

  const summary = [
    { label: t("gradeBreakdown.lecture"), got: r.lecture, max: layout.lectureMax },
    { op: "+" },
    { label: t("gradeBreakdown.practice"), got: r.practice, max: layout.practiceMax },
    { op: "=" },
    { label: t("gradeBreakdown.joriy"), got: r.joriy, max: layout.joriyMax },
    { op: "+" },
    { label: t("gradeBreakdown.yakuniy"), got: r.yn, max: scale.yn },
    { op: "=" },
    { label: t("gradeBreakdown.ball"), got: r.ball, max: layout.ballMax, strong: true },
  ] as const

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <PartTable
          title={t("gradeBreakdown.lectureTitle", { n: fmtBall(layout.lectureMax) })}
          Icon={BookOpen} color="#0e58a8" soft="#eef4ff"
          rows={lectureRows}
          totalLabel={t("gradeBreakdown.lectureTotal")} total={r.lecture} totalMax={layout.lectureMax}
        />
        <PartTable
          title={t("gradeBreakdown.practiceTitle", { n: fmtBall(layout.practiceMax) })}
          Icon={ClipboardCheck} color="#15803d" soft="#ecfdf3"
          rows={practiceRows}
          note={each != null && data.topics.length > 0 ? t("gradeBreakdown.eachTopic", { n: fmtBall(each), jn: scale.jn, count: data.topics.length }) : undefined}
          totalLabel={t("gradeBreakdown.practiceTotal")} total={r.practice} totalMax={layout.practiceMax}
        />
      </div>

      <div className="rounded-[10px] px-4 py-3 flex items-center gap-x-4 gap-y-2 flex-wrap" style={{ backgroundColor: "#f5f3ff", border: "1px solid #e9d5ff", ...FONT }}>
        <span className="flex items-center gap-2 text-sm font-semibold mr-2" style={{ color: "#6d28d9" }}>
          <Calculator className="w-4 h-4" /> {t("gradeBreakdown.summaryTitle")}
        </span>
        {summary.map((p, i) => "op" in p ? (
          <span key={i} className="text-sm" style={{ color: "#a78bfa" }}>{p.op}</span>
        ) : (
          <span key={i} className="flex flex-col">
            <span className="text-[11px]" style={{ color: "#7293b9" }}>{p.label}</span>
            <span className={`text-sm ${"strong" in p ? "font-bold" : "font-semibold"}`} style={{ color: "#012970" }}>
              {p.got === null ? "—" : fmtBall(p.got)} / {fmtBall(p.max)}
            </span>
          </span>
        ))}
        <span className="flex flex-col ml-auto">
          <span className="text-[11px]" style={{ color: "#7293b9" }}>{t("gradeBreakdown.baho")}</span>
          <span className="text-base font-bold" style={{ color: r.baho === null ? "#94a3b8" : r.baho >= 4 ? "#15803d" : r.baho === 3 ? "#d97706" : "#b91c1c" }}>
            {r.baho ?? "—"}
          </span>
        </span>
      </div>
    </div>
  )
}
