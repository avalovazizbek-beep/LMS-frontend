"use client"

import { Clock, Monitor, Smartphone } from "lucide-react"

const mockHistory = [
  { id: 1, date: "2026-05-08 09:14",  device: "PC", browser: "Chrome 124",        ip: "192.168.1.1",   status: "success" },
  { id: 2, date: "2026-05-07 18:32",  device: "Mobile", browser: "Safari iOS",    ip: "192.168.1.2",   status: "success" },
  { id: 3, date: "2026-05-06 11:05",  device: "PC", browser: "Firefox 125",       ip: "192.168.1.1",   status: "success" },
  { id: 4, date: "2026-05-05 08:47",  device: "PC", browser: "Chrome 124",        ip: "192.168.1.3",   status: "failed"  },
  { id: 5, date: "2026-05-04 15:22",  device: "Mobile", browser: "Chrome Mobile", ip: "192.168.1.2",   status: "success" },
]

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

      <div className="bg-white rounded-[10px] overflow-hidden"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)", backgroundColor: "#f6f9ff" }}>
                {["#", "Sana", "Qurilma", "Brauzer", "IP manzil", "Holat"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockHistory.map((h, i) => (
                <tr key={h.id} className="hover:bg-[#f6f9ff]/50 transition-colors"
                  style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                  <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{i + 1}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: "#7293b9" }} />
                      {h.date}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    <div className="flex items-center gap-1.5">
                      {h.device === "Mobile"
                        ? <Smartphone className="w-3.5 h-3.5 shrink-0" style={{ color: "#0e58a8" }} />
                        : <Monitor className="w-3.5 h-3.5 shrink-0" style={{ color: "#0e58a8" }} />
                      }
                      {h.device}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{h.browser}</td>
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{h.ip}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: h.status === "success" ? "#f0fff4" : "#fff0f0",
                        color: h.status === "success" ? "#22c55e" : "#ef4444",
                      }}>
                      {h.status === "success" ? "Muvaffaqiyatli" : "Muvaffaqiyatsiz"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
