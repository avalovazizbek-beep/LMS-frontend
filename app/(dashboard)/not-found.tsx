import { Construction, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-[30px]" style={{ backgroundColor: "#f6f9ff" }}>
      <div
        className="bg-white rounded-[15px] p-12 flex flex-col items-center text-center max-w-md w-full"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 30px rgba(1,41,112,0.08)" }}
      >
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: "#f0f5ff" }}
        >
          <Construction className="w-10 h-10" style={{ color: "#0e58a8" }} />
        </div>

        {/* Text */}
        <h2
          className="text-2xl font-semibold mb-2"
          style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}
        >
          Sahifa tayyorlanmoqda
        </h2>
        <p
          className="text-sm leading-relaxed mb-8"
          style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}
        >
          Bu bo&apos;lim hozircha ishlab chiqilmoqda. Tez orada foydalanishga tayyor bo&apos;ladi.
        </p>

        {/* Divider */}
        <div className="w-full h-px mb-8" style={{ backgroundColor: "rgba(1,41,112,0.08)" }} />

        {/* Back button */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-6 py-2.5 rounded-[8px] text-white text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboardga qaytish
        </Link>
      </div>
    </div>
  )
}
