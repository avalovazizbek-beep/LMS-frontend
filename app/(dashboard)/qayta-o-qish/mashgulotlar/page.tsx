"use client"

import { RefreshCw } from "lucide-react"

export default function QaytaOqishMashgulotlar() {
  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Q.O&apos;qish Mashg&apos;ulotlari
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Qayta o&apos;qish mashg&apos;ulotlari jadvali
        </p>
      </div>

      <div className="bg-white rounded-[10px] p-14 text-center"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "#f0f5ff" }}>
          <RefreshCw className="w-8 h-8" style={{ color: "#0e58a8" }} />
        </div>
        <p className="text-base font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Qayta o&apos;qish mashg&apos;ulotlari topilmadi
        </p>
        <p className="text-sm mt-2 max-w-sm mx-auto" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Siz hozirda qayta o&apos;qish dasturida qatnashmayapsiz
        </p>
      </div>
    </div>
  )
}
