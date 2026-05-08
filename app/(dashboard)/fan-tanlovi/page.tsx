"use client"

import { BookMarked, CheckCircle2 } from "lucide-react"
import { hemisApi, HemisGrade } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { useCurrentSemester } from "@/hooks/useCurrentSemester"

export default function FanTanlovi() {
  const { currentCode, getSemesterId } = useCurrentSemester()
  const semId = currentCode > 0 ? getSemesterId(currentCode) : undefined

  const { data, loading, error, refetch } = useApi(
    () => hemisApi.grades(semId ? { _semester: semId } : {}),
    [semId]
  )
  const subjects: HemisGrade[] = (data?.data ?? []).filter(g => !g.finish_credit_status)

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Fan Tanlovi
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Tanlangan fanlar ro&apos;yxati
        </p>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white rounded-[10px] p-14 text-center"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "#f0f5ff" }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: "#22c55e" }} />
          </div>
          <p className="text-base font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Barcha fanlar bajarilgan
          </p>
          <p className="text-sm mt-2" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Joriy semestrdagi barcha fanlarni yakunladingiz
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(g => (
            <div key={String(g.id)} className="bg-white rounded-[10px] p-4"
              style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
              <div className="w-10 h-10 rounded-[8px] flex items-center justify-center mb-3"
                style={{ backgroundColor: "#f0f5ff" }}>
                <BookMarked className="w-5 h-5" style={{ color: "#0e58a8" }} />
              </div>
              <p className="font-semibold text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {g.subject_name}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {g.credit} kredit · {g.total_acload}h
                </span>
                {g.subject_type && (
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                    {g.subject_type}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
