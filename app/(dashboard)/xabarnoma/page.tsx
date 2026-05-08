"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, BellOff, Trash2, CheckCheck, AlertCircle, Calendar, BookOpen, Info } from "lucide-react"
import { notificationsApi, Notif } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>, bg: string, color: string }> = {
  system:   { icon: Info,        bg: "#f0f5ff", color: "#0e58a8" },
  teacher:  { icon: BookOpen,    bg: "#f0fbfd", color: "#1cc2dc" },
  schedule: { icon: Calendar,    bg: "#fff8e6", color: "#f59e0b" },
  reminder: { icon: AlertCircle, bg: "#fff0f0", color: "#ef4444" },
}

const filterTabs = [
  { key: "all",      label: "Barchasi"    },
  { key: "unread",   label: "O'qilmagan" },
  { key: "system",   label: "Tizim"       },
  { key: "teacher",  label: "O'qituvchi"  },
  { key: "schedule", label: "Jadval"      },
]

export default function XabarnomPage() {
  const { data, loading, error, refetch } = useApi(() => notificationsApi.getAll())
  const [filter, setFilter] = useState("all")
  const notifs: Notif[] = data?.data ?? []

  const filtered = useMemo(() => notifs.filter((n) => {
    if (filter === "all")    return true
    if (filter === "unread") return !n.read
    return n.type === filter
  }), [notifs, filter])

  const unreadCount = notifs.filter((n) => !n.read).length

  const markAllRead = async () => { await notificationsApi.markAllRead(); refetch() }
  const markRead    = async (id: string) => { await notificationsApi.markRead(id); refetch() }
  const deleteNotif = async (id: string) => { await notificationsApi.remove(id); refetch() }

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <motion.div className="flex items-start justify-between gap-4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Xabarnomalar</h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {unreadCount > 0 ? <><strong>{unreadCount}</strong> ta o&apos;qilmagan xabar</> : "Barcha xabarlar o'qildi"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2.5 rounded-[5px] text-sm font-medium transition-colors hover:bg-[#f6f9ff]" style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }}>
            <CheckCheck className="w-4 h-4" /> Barchasini o&apos;qildi
          </button>
        )}
      </motion.div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterTabs.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className="px-4 py-2 rounded-[10px] whitespace-nowrap border transition-colors text-sm font-medium"
            style={{ backgroundColor: filter === t.key ? "#0e58a8" : "#fff", color: filter === t.key ? "#fff" : "#7293b9", borderColor: filter === t.key ? "rgba(1,41,112,0.3)" : "rgba(1,41,112,0.1)", fontFamily: "var(--font-poppins)" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <BellOff className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
            <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Xabarnoma topilmadi</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((n, i) => {
              const cfg = typeConfig[n.type] || typeConfig.system
              const Icon = cfg.icon
              return (
                <motion.div key={n.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-[10px] p-4 flex items-start gap-4 cursor-pointer"
                  style={{ border: `1px solid ${!n.read ? "rgba(28,194,220,0.3)" : "rgba(1,41,112,0.1)"}`, backgroundColor: !n.read ? "rgba(28,194,220,0.02)" : "#fff" }}
                  onClick={() => markRead(n.id)}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg }}>
                    <Icon className="w-5 h-5" style={{ color: cfg.color } as React.CSSProperties} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                        {n.title}
                        {!n.read && <span className="inline-block w-2 h-2 rounded-full ml-2 mb-0.5 align-middle" style={{ backgroundColor: "#1cc2dc" }} />}
                      </p>
                      <button onClick={(e) => { e.stopPropagation(); deleteNotif(n.id) }} className="p-1 rounded hover:bg-[#f6f9ff] shrink-0">
                        <Trash2 className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
                      </button>
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{n.body}</p>
                    <p className="text-xs mt-1.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{n.time}</p>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
