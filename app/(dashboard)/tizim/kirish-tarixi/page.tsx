"use client"

import { Clock } from "lucide-react"

export default function KirishTarixi() {
  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Kirish Tarixi
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Hisobga kirish loglari
        </p>
      </div>

      <div className="bg-white rounded-[10px] p-10 text-center"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
        <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
        <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Kirish tarixi mavjud emas
        </p>
        <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Bu funksiya keyingi versiyada qo&apos;shiladi
        </p>
      </div>
    </div>
  )
}
