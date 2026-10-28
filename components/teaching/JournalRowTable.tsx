"use client"

import type { JournalData, JournalStudent } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { journalLayout, studentTotals, fmtBall } from "@/lib/gradeTotals"
import { TopicCell, BallCell, BahoCell, AttCell } from "./JournalCells"

/* Talabaning o'z qatori — o'qituvchi jurnalidagi jadval bilan bir xil
   ustunlar: Ma'ruza (ON1, ON2, mustaqil ishlar, jami) → amaliy mavzular →
   Amaliyot (JN, mustaqil ishlar, jami) → Joriy → Yakuniy → Ball → Baho →
   Davomat. Faqat o'qish uchun. */

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

interface Col { key: string; label: string; title?: string; bg: string; br: string }

export function JournalRowTable({ data, student }: {
  data: Pick<JournalData, "topics" | "scale"> & Partial<Pick<JournalData, "miColumns" | "periodItems">>
  student: JournalStudent
}) {
  const { t } = useLanguage()
  const { topics, scale } = data
  const layout = journalLayout(scale, data.miColumns ?? [], data.periodItems)
  const { lectureMi, practiceMi, lectureMax, practiceMax, joriyMax, ballMax } = layout
  const r = studentTotals(layout, student, { on1: student.on1, on2: student.on2, yn: student.yn })

  const groups = [
    { label: t("natijalarOq.colLecture"), span: 3 + lectureMi.length, bg: "#fef9c3" },
    ...(topics.length ? [{ label: t("natijalarOq.colPracticeTopics"), span: topics.length, bg: "#dbeafe" }] : []),
    { label: t("natijalarOq.colPractice"), span: 2 + practiceMi.length, bg: "#dcfce7" },
    { label: t("natijalarOq.colJoriy"), span: 1, bg: "#e0e7ff" },
    { label: t("natijalarOq.colYn"), span: 1, bg: "#fce7f3" },
    { label: t("natijalarOq.colBall"), span: 1, bg: "#ede9fe" },
    { label: t("natijalarOq.colBaho"), span: 1, bg: "#f5f3ff" },
    { label: t("natijalarOq.colAttendance"), span: 1, bg: "#f0fdf4" },
  ]
  const lectureCols: Col[] = [
    { key: "on1", label: `ON1 /${scale.on1}`, bg: "#fefce8", br: "rgba(1,41,112,0.08)" },
    { key: "on2", label: `ON2 /${scale.on2}`, bg: "#fefce8", br: "rgba(1,41,112,0.08)" },
    ...lectureMi.map(c => ({ key: `mi-${c.id}`, label: `${c.label} /${c.points}`, title: c.title, bg: "#fefce8", br: "rgba(1,41,112,0.08)" })),
    { key: "lecture", label: `${t("natijalarOq.colPartTotal")} /${lectureMax}`, bg: "#fef9c3", br: "rgba(1,41,112,0.15)" },
  ]
  const restCols: Col[] = [
    { key: "jn", label: `JN /${scale.jn}`, bg: "#f0fdf4", br: "rgba(1,41,112,0.08)" },
    ...practiceMi.map(c => ({ key: `mi-${c.id}`, label: `${c.label} /${c.points}`, title: c.title, bg: "#f0fdf4", br: "rgba(1,41,112,0.08)" })),
    { key: "practice", label: `${t("natijalarOq.colPartTotal")} /${practiceMax}`, bg: "#dcfce7", br: "rgba(1,41,112,0.15)" },
    { key: "joriy", label: `/${joriyMax}`, bg: "#eef2ff", br: "rgba(1,41,112,0.12)" },
    { key: "yn", label: `/${scale.yn}`, bg: "#fdf2f8", br: "rgba(1,41,112,0.12)" },
    { key: "ball", label: `/${ballMax}`, bg: "#f5f3ff", br: "rgba(1,41,112,0.12)" },
    { key: "baho", label: "2–5", bg: "#f5f3ff", br: "rgba(1,41,112,0.12)" },
    { key: "att", label: t("natijalarOq.colAttendanceShort"), bg: "#f0fdf4", br: "transparent" },
  ]
  const colTh = (col: Col) => (
    <th key={col.key} title={col.title} className="px-2 py-2 text-center text-[10px] font-semibold"
      style={{ ...T, minWidth: 50, backgroundColor: col.bg, borderRight: `1px solid ${col.br}` }}>
      {col.label}
    </th>
  )

  return (
    <div className="rounded-[10px] bg-white overflow-hidden"
      style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
      <div className="px-4 py-3 flex items-center gap-2 flex-wrap" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
        <span className="text-sm font-semibold" style={T}>{t("ozlashtirish.journalTitle")}</span>
        <span className="text-xs" style={L}>{t("ozlashtirish.journalHint")}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr style={{ backgroundColor: "#e8f0fe", borderBottom: "1px solid rgba(1,41,112,0.12)" }}>
              {groups.map(g => (
                <th key={g.label} colSpan={g.span} className="px-2 py-1.5 text-center text-xs font-semibold"
                  style={{ ...T, borderRight: "1px solid rgba(1,41,112,0.12)", backgroundColor: g.bg }}>
                  {g.label}
                </th>
              ))}
            </tr>
            <tr style={{ backgroundColor: "#f0f5ff", borderBottom: "2px solid rgba(1,41,112,0.12)" }}>
              {lectureCols.map(colTh)}
              {topics.map(tp => (
                <th key={tp.key} className="px-1 py-2 text-center text-[10px] font-semibold"
                  style={{ ...T, minWidth: 52, borderRight: "1px solid rgba(1,41,112,0.08)", backgroundColor: "#f0f5ff" }}
                  title={tp.title}>
                  <div className="font-semibold">{t("natijalarOq.topicN", { n: tp.idx })}</div>
                  <div className="font-normal" style={L}>/{fmtBall(tp.points ?? tp.maxScore)}</div>
                </th>
              ))}
              {restCols.map(colTh)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <BallCell value={r.on1} max={scale.on1} />
              <BallCell value={r.on2} max={scale.on2} />
              {lectureMi.map(c => <BallCell key={c.id} value={r.mi(c)} max={c.points} />)}
              <BallCell value={r.lecture} max={lectureMax} />
              {topics.map(tp => (
                <TopicCell key={tp.key} score={student.topicPoints?.[tp.key] ?? null} max={tp.points ?? tp.maxScore} />
              ))}
              <BallCell value={student.jn} max={scale.jn} />
              {practiceMi.map(c => <BallCell key={c.id} value={r.mi(c)} max={c.points} />)}
              <BallCell value={r.practice} max={practiceMax} />
              <BallCell value={r.joriy} max={joriyMax} />
              <BallCell value={r.yn} max={scale.yn} />
              <BallCell value={r.ball} max={ballMax} />
              <BahoCell value={r.baho} />
              <AttCell pct={student.attendancePct} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
