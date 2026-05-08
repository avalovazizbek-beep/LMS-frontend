"use client"

import { GraduationCap, Download } from "lucide-react"
import { hemisApi, HemisStudentDoc, hemisDownloadUrl } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

export default function BitiruVaraqa() {
  const { data, loading, error, refetch } = useApi(() => hemisApi.documents())
  const docs: HemisStudentDoc[] = (data?.data ?? []).filter(d => d.type === "academic_sheet")

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Bitiruv Varaqa
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Akademik varaqa va bitiruv hujjatlari
        </p>
      </div>

      {docs.length === 0 ? (
        <div className="bg-white rounded-[10px] p-14 text-center"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "#f6f9ff" }}>
            <GraduationCap className="w-8 h-8" style={{ color: "#7293b9" }} />
          </div>
          <p className="text-base font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Bitiruv varaqasi topilmadi
          </p>
          <p className="text-sm mt-2" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Bitiruv varaqasi hali tayyorlanmagan
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.map(d => (
            <div key={String(d.id)} className="bg-white rounded-[10px] p-5"
              style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#f6f9ff" }}>
                  <GraduationCap className="w-5 h-5" style={{ color: "#0e58a8" }} />
                </div>
                <p className="font-semibold text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {d.name ?? "Bitiruv varaqa"}
                </p>
              </div>
              {(d.attributes ?? []).map(a => (
                <div key={a.label} className="flex items-center justify-between py-1.5"
                  style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                  <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{a.label}</span>
                  <span className="text-xs font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{a.value}</span>
                </div>
              ))}
              {d.file && (
                <a href={hemisDownloadUrl(d.file, d.name ?? "bitiruv-varaqa")} download
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[5px] text-sm font-medium transition-opacity hover:opacity-90 mt-4"
                  style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                  <Download className="w-4 h-4" />
                  Yuklab olish
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
