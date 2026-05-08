"use client"

import { FileText, Download, Calendar } from "lucide-react"
import { hemisApi, HemisDecree, hemisDownloadUrl } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

function formatDate(ts?: number): string {
  if (!ts) return "—"
  return new Date(ts * 1000).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function Buyruqlar() {
  const { data, loading, error, refetch } = useApi(() => hemisApi.decree())
  const decrees: HemisDecree[] = data?.data ?? []

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Buyruqlar</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Universitet buyruqlari ro&apos;yxati</p>
      </div>

      <div className="flex flex-col gap-4">
        {decrees.length === 0 ? (
          <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
            <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Buyruqlar topilmadi</p>
          </div>
        ) : decrees.map(d => (
          <div key={d.id} className="bg-white rounded-[10px] p-5 flex items-start justify-between gap-4"
            style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#f0f5ff" }}>
                <FileText className="w-5 h-5" style={{ color: "#0e58a8" }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {d.name ?? "Buyruq"}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  № {d.number ?? "—"}
                </p>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {d.decreeType?.name && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: "#f0fbfd", color: "#1cc2dc" }}>
                      {d.decreeType.name}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
                    <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {formatDate(d.date)}
                    </span>
                  </div>
                  {d.department?.name && (
                    <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {d.department.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {d.file && (
              <a href={hemisDownloadUrl(d.file, d.name ?? "buyruq")} download
                className="flex items-center gap-2 px-4 py-2 rounded-[5px] text-sm font-medium transition-opacity hover:opacity-90 shrink-0"
                style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                <Download className="w-4 h-4" />
                Ko&apos;rish
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
