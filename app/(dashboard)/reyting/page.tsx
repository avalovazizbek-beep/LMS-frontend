"use client"

import { useState } from "react"
import { Download, GraduationCap, ClipboardList } from "lucide-react"
import { hemisApi, type HemisGrade } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import SemesterTabs from "@/components/ui/SemesterTabs"
import { useCurrentSemester } from "@/hooks/useCurrentSemester"

function gradeColor(grade: number | null): string {
  if (grade == null) return "#7293b9"
  if (grade >= 4) return "#15803d"
  if (grade >= 3) return "#0e58a8"
  return "#b91c1c"
}

function downloadPdf(semesterCode: number, groupName: string, rows: HemisGrade[]) {
  const win = window.open("", "_blank")
  if (!win) return
  const rowsHtml = rows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.subject_name ?? "—"}</td>
      <td>${r.subject_type ?? "—"}</td>
      <td style="text-align:center">${r.total_acload ?? "—"}</td>
      <td style="text-align:center">${r.credit ?? "—"}</td>
      <td style="text-align:center;font-weight:600">${r.total_point ?? "—"}</td>
      <td style="text-align:center;font-weight:700;color:${r.grade != null && r.grade >= 4 ? "#15803d" : r.grade != null && r.grade >= 3 ? "#0e58a8" : "#b91c1c"}">${r.grade ?? "—"}</td>
    </tr>`).join("")
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Reyting Daftarcha ${semesterCode}-semestr</title>
    <style>
      body{font-family:Arial,sans-serif;margin:24px;color:#111}
      h2{color:#012970;margin-bottom:4px}p{margin:0 0 14px;color:#555;font-size:13px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th,td{border:1px solid #ccc;padding:7px 10px;text-align:left}
      th{background:#f0f5ff;color:#012970;font-weight:600}
      tr:nth-child(even){background:#fafcff}
      @media print{@page{margin:12mm}button{display:none}}
    </style></head><body>
    <h2>Reyting Daftarcha</h2>
    <p>Guruh: <strong>${groupName}</strong> &nbsp;|&nbsp; ${semesterCode}-semestr</p>
    <table><thead><tr>
      <th>#</th><th>Fanlar</th><th>Fan turi</th><th>Yuklama</th><th>Kredit</th><th>Ball</th><th>Baho</th>
    </tr></thead><tbody>${rowsHtml}</tbody></table>
    <script>window.onload=function(){window.print()}<\/script>
    </body></html>`)
  win.document.close()
}

export default function Reyting() {
  const { data: meRes, loading: lMe, error: eMe, refetch: rMe } = useApi(() => hemisApi.me(), [])
  const { currentCode, getSemesterId } = useCurrentSemester()
  const [selectedCode, setSelectedCode] = useState<number | null>(null)

  const activeCode = selectedCode ?? currentCode
  const semId = activeCode > 0 ? getSemesterId(activeCode) : undefined
  const semParam = semId ? { _semester: semId } : {}

  const { data, loading, error, refetch } = useApi(() => hemisApi.grades(semParam), [semId])
  const rows: HemisGrade[] = data?.data ?? []

  if (lMe) return <Loading />
  if (eMe) return <ApiError message={eMe} onRetry={rMe} />

  const groupName = meRes?.data?.group?.name ?? "—"

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Reyting daftarcha
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          Semestrlar bo&apos;yicha reyting ko&apos;rsatkichlari
        </p>
      </div>

      {/* Guruh + semestr tablari */}
      <div className="bg-white rounded-[10px] px-5 py-3 flex items-center justify-between gap-4 flex-wrap"
        style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#22c55e" }}>
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {groupName}
          </span>
        </div>
        <SemesterTabs currentCode={currentCode} value={activeCode} onChange={code => setSelectedCode(code)} />
      </div>

      {/* Jadval */}
      <div className="bg-white rounded-[10px] overflow-hidden"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
        <div className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {activeCode}-semestr
          </span>
          <button
            onClick={() => downloadPdf(activeCode, groupName, rows)}
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-[8px] text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
            <Download className="w-4 h-4" />
            Yuklab olish
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-6"><Loading /></div>
        ) : error ? (
          <div className="px-5 py-6"><ApiError message={error} onRetry={refetch} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(1,41,112,0.1)", backgroundColor: "#f6f9ff" }}>
                  {["#", "Fanlar", "Fan turi", "Yuklama", "Kredit", "Reyting / Ball", "Baho"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                      style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      <div className="flex flex-col items-center gap-2">
                        <ClipboardList className="w-8 h-8" style={{ color: "#d8e6f7" }} />
                        <span className="text-sm">Ma&apos;lumot topilmadi</span>
                      </div>
                    </td>
                  </tr>
                ) : rows.map((r, i) => (
                  <tr key={`${r.id}-${i}`} className="hover:bg-[#f6f9ff]/50 transition-colors"
                    style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                    <td className="px-4 py-3 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium max-w-[240px]" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                      {r.subject_name}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {r.subject_type || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {r.total_acload || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {r.credit || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {r.total_point ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold" style={{ color: gradeColor(r.grade), fontFamily: "var(--font-poppins)" }}>
                        {r.grade ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
