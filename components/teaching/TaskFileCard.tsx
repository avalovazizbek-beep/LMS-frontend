"use client"

import { Download, FileText } from "lucide-react"
import { teachingApi, type TeachingFile } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"

/* Topshiriq (oraliq / mustaqil ish / mavzu topshirig'i) uchun o'qituvchi
   biriktirgan vazifa fayli. Kichik havola ko'rinishida talabalar uni
   topa olmasdi — alohida, sarlavhali blok va katta "Yuklab olish" tugmasi. */

const FONT = { fontFamily: "var(--font-poppins)" } as const

function fileKind(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (ext === "doc" || ext === "docx") return "Word"
  if (ext === "xls" || ext === "xlsx") return "Excel"
  if (ext === "ppt" || ext === "pptx") return "PowerPoint"
  return ext.toUpperCase()
}

export function TaskFileCard({ files, controlType, audience }: {
  files: TeachingFile[]
  controlType?: string | null
  /** student — "yuklab oling, bajaring, topshiring"; teacher — "talabalar shuni oladi" */
  audience: "student" | "teacher"
}) {
  const { t } = useLanguage()
  if (!files.length) return null
  const title = controlType === "oraliq" ? t("taskFile.title.oraliq")
    : controlType === "mustaqil" ? t("taskFile.title.mustaqil")
    : t("taskFile.title.default")

  return (
    <div className="rounded-[10px] p-4 flex flex-col gap-3"
      style={{ backgroundColor: "#eef4ff", border: "1.5px solid rgba(14,88,168,0.35)" }}>
      <div style={FONT}>
        <p className="text-sm font-bold uppercase tracking-wide" style={{ color: "#0e58a8" }}>{title}</p>
        <p className="text-xs mt-1 leading-5" style={{ color: "#445b7a" }}>
          {audience === "student" ? t("taskFile.hintStudent") : t("taskFile.hintTeacher")}
        </p>
      </div>
      {files.map(f => (
        <a key={f.url} href={teachingApi.fileUrl(f.url)} target="_blank" rel="noreferrer" download
          className="flex items-center gap-3 rounded-[8px] bg-white p-3 transition-shadow hover:shadow-md"
          style={{ border: "1px solid rgba(14,88,168,0.2)" }}>
          <span className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#0e58a8" }}>
            <FileText className="w-5 h-5 text-white" />
          </span>
          <span className="flex-1 min-w-0" style={FONT}>
            <span className="block text-sm font-semibold truncate" style={{ color: "#012970" }}>{f.originalName}</span>
            <span className="block text-xs" style={{ color: "#7293b9" }}>{fileKind(f.originalName)}</span>
          </span>
          <span className="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-[8px] text-sm font-semibold text-white"
            style={{ backgroundColor: "#0e58a8", ...FONT }}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t("taskFile.download")}</span>
          </span>
        </a>
      ))}
    </div>
  )
}
