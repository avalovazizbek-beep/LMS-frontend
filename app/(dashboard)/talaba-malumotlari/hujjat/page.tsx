"use client"

import { FileText, Download } from "lucide-react"
import { hemisApi, HemisStudentDoc, hemisDownloadUrl } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const docTypeLabels: Record<string, string> = {
  academic_sheet: "O'quv varaqa",
  academic_data:  "Reyting daftarcha",
  "call-sheet":   "Chaqiruv qog'ozi",
}

export default function TalabaHujjat() {
  const { data, loading, error, refetch } = useApi(() => hemisApi.documents())
  const docs: HemisStudentDoc[] = data?.data ?? []

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Talaba Hujjatlari</h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Rasmiy hujjatlar va varaqa</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.length === 0 ? (
          <div className="col-span-2 bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
            <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Hujjatlar topilmadi</p>
          </div>
        ) : docs.map((d, i) => (
          <div key={`${d.id}-${i}`} className="bg-white rounded-[10px] p-5"
            style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#f0f5ff" }}>
                <FileText className="w-5 h-5" style={{ color: "#0e58a8" }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {d.name ?? docTypeLabels[d.type ?? ""] ?? "Hujjat"}
                </p>
                {d.type && (
                  <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {docTypeLabels[d.type] ?? d.type}
                  </span>
                )}
              </div>
            </div>
            {(d.attributes ?? []).length > 0 && (
              <div className="flex flex-col gap-1.5 mb-4">
                {d.attributes!.map(a => (
                  <div key={a.label} className="flex items-center justify-between py-1"
                    style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{a.label}</span>
                    <span className="text-xs font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{a.value}</span>
                  </div>
                ))}
              </div>
            )}
            {d.file && (
              <a href={hemisDownloadUrl(d.file, d.name ?? "hujjat")} download
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[5px] text-sm font-medium transition-opacity hover:opacity-90"
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
