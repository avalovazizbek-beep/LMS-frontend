"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react"

const days = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma"]

const schedule: Record<string, { time: string; subject: string; teacher: string; room: string; type: string }[]> = {
  Dushanba: [
    { time: "08:00–09:30", subject: "Matematika", teacher: "Prof. Karimov A.", room: "311-xona", type: "Ma'ruza" },
    { time: "10:00–11:30", subject: "Fizika", teacher: "Prof. Nazarov B.", room: "Lab-1", type: "Laboratoriya" },
    { time: "14:00–15:30", subject: "Ingliz tili", teacher: "Dos. Tosheva G.", room: "215-xona", type: "Seminar" },
  ],
  Seshanba: [
    { time: "08:00–09:30", subject: "Informatika", teacher: "Dos. Rahimov D.", room: "Komp lab", type: "Amaliy" },
    { time: "10:00–11:30", subject: "Matematika", teacher: "Prof. Karimov A.", room: "311-xona", type: "Seminar" },
  ],
  Chorshanba: [
    { time: "09:00–10:30", subject: "Fizika", teacher: "Prof. Nazarov B.", room: "101-xona", type: "Ma'ruza" },
    { time: "11:00–12:30", subject: "Tarix", teacher: "Prof. Usmonov I.", room: "205-xona", type: "Ma'ruza" },
    { time: "14:00–15:30", subject: "Ingliz tili", teacher: "Dos. Tosheva G.", room: "215-xona", type: "Amaliy" },
  ],
  Payshanba: [
    { time: "08:00–09:30", subject: "Falsafa", teacher: "Dos. Qodirov M.", room: "110-xona", type: "Ma'ruza" },
    { time: "10:00–11:30", subject: "Informatika", teacher: "Dos. Rahimov D.", room: "Komp lab", type: "Laboratoriya" },
  ],
  Juma: [
    { time: "09:00–10:30", subject: "Matematika", teacher: "Prof. Karimov A.", room: "311-xona", type: "Amaliy" },
    { time: "11:00–12:30", subject: "Fizika", teacher: "Prof. Nazarov B.", room: "Lab-1", type: "Ma'ruza" },
  ],
}

const typeColors: Record<string, { bg: string; color: string }> = {
  "Ma'ruza": { bg: "#f0f5ff", color: "#0e58a8" },
  Seminar: { bg: "#f0fbfd", color: "#1cc2dc" },
  Amaliy: { bg: "#f6f9ff", color: "#012970" },
  Laboratoriya: { bg: "rgba(114,147,185,0.1)", color: "#7293b9" },
}

export default function DarsJadvali() {
  const [activeDay, setActiveDay] = useState("Dushanba")

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Dars Jadvali</h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>2023–2024, 2-semestr</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-[5px] border hover:bg-[#f6f9ff] transition-colors" style={{ borderColor: "rgba(1,41,112,0.2)" }}>
            <ChevronLeft className="w-4 h-4" style={{ color: "#012970" }} />
          </button>
          <span className="text-sm font-medium px-3" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Aprel, 2024</span>
          <button className="p-2 rounded-[5px] border hover:bg-[#f6f9ff] transition-colors" style={{ borderColor: "rgba(1,41,112,0.2)" }}>
            <ChevronRight className="w-4 h-4" style={{ color: "#012970" }} />
          </button>
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className="px-5 py-2.5 rounded-[10px] whitespace-nowrap border transition-colors font-medium text-sm"
            style={{
              backgroundColor: activeDay === day ? "#0e58a8" : "#fff",
              color: activeDay === day ? "#fff" : "#7293b9",
              borderColor: activeDay === day ? "rgba(1,41,112,0.3)" : "rgba(1,41,112,0.1)",
              fontFamily: "var(--font-poppins)",
            }}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Classes */}
      <div className="flex flex-col gap-4">
        {(schedule[activeDay] || []).length === 0 ? (
          <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Bu kuni dars yo&apos;q</p>
          </div>
        ) : (
          (schedule[activeDay] || []).map((cls, i) => {
            const typeStyle = typeColors[cls.type] || { bg: "#f6f9ff", color: "#012970" }
            return (
              <div key={i} className="bg-white rounded-[10px] p-5 flex items-start gap-4" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
                <div className="flex flex-col items-center gap-1 shrink-0 w-20">
                  <Clock className="w-4 h-4" style={{ color: "#7293b9" }} />
                  <span className="text-xs font-medium text-center" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{cls.time}</span>
                </div>
                <div className="w-px self-stretch" style={{ backgroundColor: "rgba(1,41,112,0.1)" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <h3 className="font-semibold text-base" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{cls.subject}</h3>
                    <span className="px-3 py-0.5 rounded-full text-xs font-medium shrink-0" style={{ backgroundColor: typeStyle.bg, color: typeStyle.color }}>{cls.type}</span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{cls.teacher}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <MapPin className="w-3.5 h-3.5" style={{ color: "#1cc2dc" }} />
                    <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{cls.room}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
