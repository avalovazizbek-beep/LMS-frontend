"use client"

import { useState } from "react"
import { Bell, BellOff, Trash2, CheckCheck, AlertCircle, Calendar, BookOpen, Info } from "lucide-react"

type NotifType = "system" | "teacher" | "schedule" | "reminder"

const allNotifs = [
  { id: 1, type: "system" as NotifType, title: "Tizim yangilandi", body: "LMS tizimiga yangi funksiyalar qo'shildi. Yangiliklar bilan tanishib chiqing.", time: "2 daqiqa oldin", read: false },
  { id: 2, type: "teacher" as NotifType, title: "Prof. Karimov xabari", body: "Matematika fanidan uy vazifasi: 5.1-5.3 mashqlarni bajaring. Topshirish muddati: erta.", time: "1 soat oldin", read: false },
  { id: 3, type: "schedule" as NotifType, title: "Dars jadvali o'zgardi", body: "Chorshanba kuni Fizika darsi 09:00 dan 11:00 ga o'tkazildi. Xonasi: Lab-2.", time: "3 soat oldin", read: false },
  { id: 4, type: "reminder" as NotifType, title: "Imtihon eslatmasi", body: "Matematika yakuniy imtihoni 20-may kuni. 3 kun qoldi!", time: "5 soat oldin", read: true },
  { id: 5, type: "teacher" as NotifType, title: "Dos. Tosheva xabari", body: "Ingliz tili fanidan mustaqil ish topshirildi. Baholanmoqda.", time: "1 kun oldin", read: true },
  { id: 6, type: "system" as NotifType, title: "To'lov eslatmasi", body: "3-semestr to'lovi muddati yaqinlashmoqda. 30-aprelgacha to'lang.", time: "1 kun oldin", read: true },
  { id: 7, type: "schedule" as NotifType, title: "Guruh yig'ilishi", body: "Dekanat yig'ilishi 15-aprel soat 14:00 da bo'lib o'tadi. 305-xona.", time: "2 kun oldin", read: true },
]

const typeConfig: Record<NotifType, { icon: React.ComponentType<{className?:string}>, bg: string, color: string }> = {
  system:   { icon: Info,         bg: "#f0f5ff", color: "#0e58a8" },
  teacher:  { icon: BookOpen,     bg: "#f0fbfd", color: "#1cc2dc" },
  schedule: { icon: Calendar,     bg: "#fff8e6", color: "#f59e0b" },
  reminder: { icon: AlertCircle,  bg: "#fff0f0", color: "#ef4444" },
}

const filterTabs = [
  { key: "all", label: "Barchasi" },
  { key: "unread", label: "O'qilmagan" },
  { key: "system", label: "Tizim" },
  { key: "teacher", label: "O'qituvchi" },
  { key: "schedule", label: "Jadval" },
]

export default function Xabarnoma() {
  const [filter, setFilter] = useState("all")
  const [notifs, setNotifs] = useState(allNotifs)

  const filtered = notifs.filter((n) => {
    if (filter === "all") return true
    if (filter === "unread") return !n.read
    return n.type === filter
  })

  const unreadCount = notifs.filter((n) => !n.read).length

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
  const deleteNotif = (id: number) => setNotifs((prev) => prev.filter((n) => n.id !== id))
  const markRead = (id: number) => setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Xabarnomalar</h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {unreadCount > 0 ? <><strong>{unreadCount}</strong> ta o&apos;qilmagan xabar</> : "Barcha xabarlar o'qildi"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2.5 rounded-[5px] text-sm font-medium transition-colors hover:bg-[#f6f9ff]" style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }}>
            <CheckCheck className="w-4 h-4" />
            Barchasini o&apos;qildi
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className="px-4 py-2 rounded-[10px] whitespace-nowrap border transition-colors text-sm font-medium"
            style={{
              backgroundColor: filter === t.key ? "#0e58a8" : "#fff",
              color: filter === t.key ? "#fff" : "#7293b9",
              borderColor: filter === t.key ? "rgba(1,41,112,0.3)" : "rgba(1,41,112,0.1)",
              fontFamily: "var(--font-poppins)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Notifications */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <BellOff className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
            <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Xabarnoma topilmadi</p>
          </div>
        ) : (
          filtered.map((n) => {
            const cfg = typeConfig[n.type]
            const Icon = cfg.icon
            return (
              <div
                key={n.id}
                className="bg-white rounded-[10px] p-4 flex items-start gap-4 transition-colors cursor-pointer"
                style={{ border: `1px solid ${!n.read ? "rgba(28,194,220,0.3)" : "rgba(1,41,112,0.1)"}`, backgroundColor: !n.read ? "rgba(28,194,220,0.02)" : "#fff" }}
                onClick={() => markRead(n.id)}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg }}>
                  <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {n.title}
                      {!n.read && <span className="inline-block w-2 h-2 rounded-full ml-2 mb-0.5 align-middle" style={{ backgroundColor: "#1cc2dc" }} />}
                    </p>
                    <button onClick={(e) => { e.stopPropagation(); deleteNotif(n.id) }} className="p-1 rounded hover:bg-[#f6f9ff] transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
                    </button>
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{n.body}</p>
                  <p className="text-xs mt-1.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{n.time}</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
