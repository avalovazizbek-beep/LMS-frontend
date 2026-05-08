"use client"

import { Users, Plus } from "lucide-react"

export default function IjtimoiyFaollik() {
  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Ijtimoiy Faollik Arizasi
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Ijtimoiy faollik va ko&apos;ngillilik ishlari
        </p>
      </div>

      <div className="bg-white rounded-[10px] p-14 text-center"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "#f0fbfd" }}>
          <Users className="w-8 h-8" style={{ color: "#1cc2dc" }} />
        </div>
        <p className="text-base font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Ijtimoiy faollik arizalari topilmadi
        </p>
        <p className="text-sm mt-2 max-w-sm mx-auto" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Ijtimoiy faollik arizasini yuborish uchun quyidagi tugmani bosing
        </p>
        <button
          className="mt-6 flex items-center gap-2 px-6 py-2.5 rounded-[5px] text-sm font-medium text-white mx-auto transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>
          <Plus className="w-4 h-4" />
          Ariza yuborish
        </button>
      </div>
    </div>
  )
}
