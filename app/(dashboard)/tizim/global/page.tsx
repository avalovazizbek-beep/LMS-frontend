"use client"

import { Globe } from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { PageHero } from "@/components/layout/PageHero"
import { MySurveysList } from "@/components/surveys/MySurveys"

/* "Global so'rovnoma" — avval bo'sh joy edi ("topilmadi"); endi LMS
   so'rovnomalari (admin/dekanat e'lon qilgan) shu yerda ham ko'rinadi. */
export default function GlobalSorovnoma() {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-[30px]">
      <PageHero icon={Globe} title={t("globalSorovnoma.title")} subtitle={t("globalSorovnoma.subtitle")} />
      <MySurveysList />
    </div>
  )
}
