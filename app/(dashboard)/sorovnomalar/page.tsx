"use client"

import { ClipboardList } from "lucide-react"
import { PageHero } from "@/components/layout/PageHero"
import { MySurveysList } from "@/components/surveys/MySurveys"

export default function SorovnomalarPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-[30px]">
      <PageHero icon={ClipboardList} title="So'rovnomalar" subtitle="Fikringiz ta'lim sifatini yaxshilashga yordam beradi. Qatnashish ixtiyoriy." />
      <MySurveysList />
    </div>
  )
}
