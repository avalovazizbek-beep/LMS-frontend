"use client"

import { teachingApi, type GradeBudget, type TeacherContent } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { useLanguage } from "@/lib/i18n/LanguageContext"

/* Ma'ruza / amaliyot 35 balining taqsimoti (backend: services/periodGrades.ts).
   Ma'ruza: ON1 + ON2 + ma'ruzadan mustaqil ishlar. Amaliyot: amaliyotdan
   mustaqil ishlar, qolgani — JN. Oraliq va mustaqil ish formasida o'qituvchi
   qancha ball band va qancha qolganini ko'rib turadi. */

export const LECTURE_PART = "Ma'ruza"
export const PRACTICE_PART = "Amaliyot"
export const PART_TOTAL = 35
const LEGACY_SLOT_POINTS: Record<string, number> = { ON1: 17, ON2: 18 }

/** Oraliqning jurnaldagi balli — ball qo'yilmagan eski oraliqlar 17 / 18 */
export function oraliqPoints(item: Pick<TeacherContent, "gradePoints" | "kind">): number | null {
  return item.gradePoints ?? LEGACY_SLOT_POINTS[item.kind ?? ""] ?? null
}

export function isMustaqilType(trainingType: string | null | undefined): boolean {
  return /mustaqil/i.test(trainingType ?? "")
}

export function useGradeBudget(groupId: number | string | null | undefined, subjectName: string | null | undefined) {
  const { data, refetch } = useApi(
    () => groupId && subjectName ? teachingApi.gradeBudget(groupId, subjectName) : Promise.resolve(null),
    [groupId, subjectName]
  )
  return { budget: data?.data ?? null, refetch }
}

/** Qismda boshqa yozuvlar band qilgan ball va bo'sh qolgani (tahrirlanayotgan yozuvsiz) */
export function budgetFree(budget: GradeBudget | null, part: string, excludeId?: number | null) {
  const p = part === PRACTICE_PART ? budget?.practice : budget?.lecture
  const items = (p?.items ?? []).filter(i => i.id !== excludeId)
  const used = items.reduce((s, i) => s + i.points, 0)
  return { items, used, free: Math.max(0, (p?.total ?? PART_TOTAL) - used), total: p?.total ?? PART_TOTAL }
}

export function GradeBudgetLine({ budget, part, excludeId, points }: {
  budget: GradeBudget | null
  part: string
  excludeId?: number | null
  /** Formaga kiritilayotgan ball — qolgan ballni jonli ko'rsatish uchun */
  points: number | null
}) {
  const { t } = useLanguage()
  if (!budget) return null
  const { items, used, free, total } = budgetFree(budget, part, excludeId)
  const over = points != null && points > free
  const after = points != null && !over ? free - points : null
  const practice = part === PRACTICE_PART

  const none = free === 0 && !points

  return (
    <div className="flex flex-col gap-1.5 text-xs px-3 py-2.5 rounded-[8px]"
      style={{ backgroundColor: over || none ? "#fef2f2" : "#f0f5ff", color: over || none ? "#b91c1c" : "#0e58a8", fontFamily: "var(--font-poppins)" }}>
      <span className="font-medium">
        {t(practice ? "gradeSplit.practiceLine" : "gradeSplit.lectureLine", { total, used, free })}
      </span>
      {/* Shu qismda yaratilganlar: ON1, ON2, MI-1, ... — turi va bali bilan */}
      {items.length > 0 && (
        <div className="flex flex-col gap-0.5 pl-1" style={{ color: "#445b7a" }}>
          {items.map(i => (
            <div key={i.id} className="flex items-center gap-2">
              <span className="font-semibold w-12 shrink-0" style={{ color: "#012970" }}>{i.label}</span>
              <span className="flex-1 min-w-0 truncate" title={i.title}>{i.title}</span>
              <span className="shrink-0">{t(i.type === "assignment" ? "typeContentOq.form.formatAssignment" : "typeContentOq.form.formatTest")}</span>
              <span className="font-semibold w-14 shrink-0 text-right" style={{ color: "#012970" }}>{t("gradeSplit.points", { n: i.points })}</span>
            </div>
          ))}
        </div>
      )}
      {over ? (
        <span className="font-medium">{t("gradeSplit.over", { free })}</span>
      ) : none ? (
        <span className="font-medium">{t("gradeSplit.none")}</span>
      ) : after != null && (
        <span>{t(practice ? "gradeSplit.afterPractice" : "gradeSplit.afterLecture", { n: after })}</span>
      )}
    </div>
  )
}
