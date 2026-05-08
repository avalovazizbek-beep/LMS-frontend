"use client"

import { Award } from "lucide-react"
import { hemisApi } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

interface HemisCertificate {
  id: number | string
  name?: string
  type?: string
  file?: string
  date?: number
  organization?: string
  score?: string
}

function formatDate(ts?: number): string {
  if (!ts) return "—"
  return new Date(ts * 1000).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function FanSertifikatlari() {
  const { data, loading, error, refetch } = useApi(() => hemisApi.reference())
  const certs: HemisCertificate[] = (data?.data as any) ?? []

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Fan Sertifikatlari
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Akademik sertifikatlar ro&apos;yxati
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {certs.length === 0 ? (
          <div className="col-span-3 bg-white rounded-[10px] p-14 text-center"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <Award className="w-12 h-12 mx-auto mb-3" style={{ color: "#7293b9" }} />
            <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              Sertifikatlar topilmadi
            </p>
            <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              Sizda hali sertifikatlar mavjud emas
            </p>
          </div>
        ) : certs.map(c => (
          <div key={String(c.id)} className="bg-white rounded-[10px] p-4 flex flex-col gap-3"
            style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
            <div className="w-10 h-10 rounded-[8px] flex items-center justify-center"
              style={{ backgroundColor: "#f0fbfd" }}>
              <Award className="w-5 h-5" style={{ color: "#1cc2dc" }} />
            </div>
            <div>
              <p className="font-medium text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {c.name ?? "Sertifikat"}
              </p>
              {c.date && (
                <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {formatDate(c.date)}
                </p>
              )}
            </div>
            {c.file && (
              <a href={c.file} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-[5px] text-sm font-medium transition-opacity hover:opacity-90 mt-auto"
                style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                Ko&apos;rish
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
