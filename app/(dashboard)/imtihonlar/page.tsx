"use client"

import { useMemo } from "react"
import { GraduationCap, Lock, CheckCircle2, Clock } from "lucide-react"
import { motion } from "framer-motion"
import { teachingApi, type TeacherContent, type ContentStatus } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { StudentContentCard } from "@/components/teaching/StudentContentCard"

const SECTIONS: Array<{ key: ContentStatus; label: string; emptyText: string }> = [
  { key: "open",   label: "Joriy imtihonlar",     emptyText: "Hozirda ochiq imtihonlar yo'q" },
  { key: "locked", label: "Kelgusi imtihonlar",   emptyText: "Kelgusi imtihonlar yo'q" },
  { key: "closed", label: "Yakunlangan imtihonlar", emptyText: "Yakunlangan imtihonlar yo'q" },
]

export default function Imtihonlar() {
  const { data, loading, error, refetch } = useApi(() => teachingApi.content({ type: "exam" }), [])
  const exams: TeacherContent[] = (data?.data ?? []).filter(e => !e.topicKey)

  const grouped = useMemo(() => {
    const map: Record<ContentStatus, TeacherContent[]> = { locked: [], open: [], closed: [] }
    exams.forEach(e => map[e.status].push(e))
    return map
  }, [exams])

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Imtihonlar</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          O&apos;qituvchi yuklagan imtihon vazifalari va natijalari
        </p>
      </motion.div>

      <div className="grid grid-cols-3 gap-5">
        {[
          { label: "Joriy",        value: grouped.open.length,   color: "#15803d", Icon: Clock },
          { label: "Kelgusi",      value: grouped.locked.length, color: "#b91c1c", Icon: Lock },
          { label: "Yakunlangan",  value: grouped.closed.length, color: "#92400e", Icon: CheckCircle2 },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white rounded-[10px] p-5 text-center flex flex-col items-center gap-1" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <s.Icon className="w-5 h-5 mb-1" style={{ color: s.color }} />
            <div className="text-3xl font-semibold" style={{ color: s.color, fontFamily: "var(--font-poppins)" }}>{s.value}</div>
            <div className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {exams.length === 0 ? (
        <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <GraduationCap className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
          <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Imtihonlar mavjud emas
          </p>
          <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            O&apos;qituvchingiz hali imtihon vazifasi yuklamagan
          </p>
        </div>
      ) : (
        SECTIONS.map(section => {
          const list = grouped[section.key]
          if (list.length === 0) return null
          return (
            <div key={section.key}>
              <h2 className="text-lg font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {section.label}
              </h2>
              <div className="flex flex-col gap-4">
                {list.map(item => (
                  <StudentContentCard key={item.id} item={item} submittable />
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
