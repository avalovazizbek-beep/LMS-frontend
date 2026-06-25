"use client"

import { useState, useCallback } from "react"
import { Lock, LockOpen, FileText, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { adminApi, type TeacherContent } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const T = { color: "#012970", fontFamily: "var(--font-poppins)" } as const
const L = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function AdminBaholash() {
  const { data, loading, error, refetch } = useApi(() => adminApi.lockedAssignments(), [])
  const items: TeacherContent[] = data?.data ?? []

  const [unlocking, setUnlocking] = useState<Record<number, boolean>>({})
  const [unlocked, setUnlocked] = useState<Set<number>>(new Set())
  const [unlockError, setUnlockError] = useState<string | null>(null)

  const handleUnlock = useCallback(async (id: number) => {
    setUnlocking(prev => ({ ...prev, [id]: true }))
    setUnlockError(null)
    try {
      await adminApi.unlockContent(id)
      setUnlocked(prev => new Set(prev).add(id))
      setTimeout(() => refetch(), 600)
    } catch (e) {
      setUnlockError(e instanceof Error ? e.message : "Xatolik yuz berdi")
    } finally {
      setUnlocking(prev => ({ ...prev, [id]: false }))
    }
  }, [refetch])

  if (loading) return <Loading />
  if (error) return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-medium" style={T}>Yakunlangan baholashlar</h1>
          <p className="text-sm mt-1" style={L}>
            O'qituvchilar yakunlagan amaliy topshiriqlar — qulfni ochish uchun "Ochish" tugmasini bosing
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 rounded-[8px] text-sm font-medium transition-colors hover:bg-[#eef4ff]"
          style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Yangilash
        </button>
      </div>

      {unlockError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] text-sm"
          style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5", fontFamily: "var(--font-poppins)" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {unlockError}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-[10px] bg-white p-16 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "#d8e6f7" }} />
          <p className="text-sm font-semibold" style={T}>Yakunlangan baholashlar yo'q</p>
          <p className="text-xs mt-1" style={L}>Hozircha hech bir topshiriq yakunlanmagan</p>
        </div>
      ) : (
        <>
          <div className="text-xs px-1" style={L}>
            Jami {items.length} ta yakunlangan amaliy topshiriq
          </div>

          <div className="flex flex-col gap-3">
            {items.map(item => {
              const isUnlocking = unlocking[item.id]
              const isUnlocked = unlocked.has(item.id)
              return (
                <div
                  key={item.id}
                  className="rounded-[10px] bg-white p-4 flex items-center justify-between gap-4 flex-wrap"
                  style={{
                    border: `1px solid ${isUnlocked ? "rgba(21,128,61,0.2)" : "rgba(1,41,112,0.1)"}`,
                    boxShadow: "0px 0px 5px rgba(1,41,112,0.05)",
                  }}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="shrink-0 w-9 h-9 rounded-[8px] flex items-center justify-center mt-0.5"
                      style={{ backgroundColor: "#fef2f2" }}>
                      <Lock className="w-4 h-4" style={{ color: "#b91c1c" }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={T}>{item.title}</div>
                      <div className="text-xs mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5" style={L}>
                        <span>{item.subjectName}</span>
                        {item.maxScore !== null && <span>Maks: {item.maxScore} ball</span>}
                        {item.deadline && <span>Muddat: {fmtDate(item.deadline)}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
                          <Lock className="w-2.5 h-2.5 inline mr-1" />
                          Yakunlangan
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                          Amaliy topshiriq
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {isUnlocked ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                        style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Ochildi
                      </span>
                    ) : (
                      <button
                        onClick={() => handleUnlock(item.id)}
                        disabled={isUnlocking}
                        className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-semibold text-white disabled:opacity-60 transition-colors"
                        style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}
                      >
                        <LockOpen className="w-4 h-4" />
                        {isUnlocking ? "Ochilmoqda..." : "Ochish"}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
