"use client"

import { Award, Download } from "lucide-react"
import { hemisApi, HemisReference } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

function formatDate(ts?: number): string {
  if (!ts) return "—"
  return new Date(ts * 1000).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function Malumotnomalar() {
  const { data, loading, error, refetch } = useApi(() => hemisApi.reference())
  const refs: HemisReference[] = data?.data ?? []

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Ma&apos;lumotnomalar</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Sertifikat va ma&apos;lumotnomalar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {refs.length === 0 ? (
          <div className="col-span-3 bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <Award className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
            <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Ma&apos;lumotnomalar topilmadi</p>
          </div>
        ) : refs.map((r, i) => (
          <div key={`${r.id}-${i}`} className="bg-white rounded-[10px] p-4 flex flex-col gap-3"
            style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
            <div className="w-10 h-10 rounded-[8px] flex items-center justify-center" style={{ backgroundColor: "#f0fbfd" }}>
              <Award className="w-5 h-5" style={{ color: "#1cc2dc" }} />
            </div>
            <div>
              <p className="font-medium text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {r.name ?? "Ma'lumotnoma"}
              </p>
              {r.created_at && (
                <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {formatDate(r.created_at)}
                </p>
              )}
            </div>
            {r.file && (
              <a href={r.file} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-[5px] text-sm font-medium transition-opacity hover:opacity-90 mt-auto"
                style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                <Download className="w-4 h-4" />
                Yuklab olish
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
