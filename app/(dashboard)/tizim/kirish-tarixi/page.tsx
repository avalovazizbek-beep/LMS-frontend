"use client"

import { Clock, Monitor, Smartphone } from "lucide-react"
import { authApi } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { useLanguage } from "@/lib/i18n/LanguageContext"

/* "17.10.2026 09:41" — mahalliy vaqt bilan (Intl'da uz-Latn yo'q) */
function formatDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* Brauzer va tizim — User-Agent'dan ("Chrome · Android") */
function describeDevice(ua: string | null): { label: string | null; mobile: boolean } {
  if (!ua) return { label: null, mobile: false }
  const browser = /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /YaBrowser/.test(ua) ? "Yandex"
    : /SamsungBrowser/.test(ua) ? "Samsung Internet"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : null
  const os = /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Windows/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : null
  return { label: [browser, os].filter(Boolean).join(" · ") || null, mobile: /Mobi|Android|iPhone|iPad/.test(ua) }
}

export default function KirishTarixi() {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useApi(() => authApi.loginHistory(), [])
  const rows = data?.data ?? []

  if (loading) return <Loading />
  if (error) return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {t("kirishTarixi.title")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {t("kirishTarixi.subtitle")}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-[10px] p-10 text-center"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
          <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
          <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {t("kirishTarixi.notFound")}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[10px] overflow-hidden"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
          <table className="w-full text-sm" style={{ fontFamily: "var(--font-poppins)" }}>
            <thead className="hidden sm:table-header-group">
              <tr className="text-left" style={{ color: "#012970", borderBottom: "1px solid rgba(1,41,112,0.1)" }}>
                <th className="font-semibold px-5 py-3 w-12">#</th>
                <th className="font-semibold px-5 py-3">{t("kirishTarixi.time")}</th>
                <th className="font-semibold px-5 py-3">{t("kirishTarixi.device")}</th>
                <th className="font-semibold px-5 py-3">{t("kirishTarixi.ip")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const device = describeDevice(row.userAgent)
                const Icon = device.mobile ? Smartphone : Monitor
                return (
                  <tr key={`${row.loginAt}-${i}`} className="flex flex-col gap-1 px-4 py-3 sm:table-row sm:p-0"
                    style={{ borderBottom: "1px solid rgba(1,41,112,0.06)", backgroundColor: i % 2 === 0 ? "#f8fafc" : undefined }}>
                    <td className="hidden sm:table-cell px-5 py-3" style={{ color: "#7293b9" }}>{i + 1}</td>
                    <td className="sm:px-5 sm:py-3 font-medium whitespace-nowrap" style={{ color: "#012970" }}>
                      {formatDateTime(row.loginAt)}
                    </td>
                    <td className="sm:px-5 sm:py-3">
                      <span className="inline-flex items-center gap-2" style={{ color: "#334e68" }}>
                        <Icon className="w-4 h-4 shrink-0" style={{ color: "#7293b9" }} />
                        {device.label ?? t("kirishTarixi.unknownDevice")}
                      </span>
                    </td>
                    <td className="sm:px-5 sm:py-3 text-xs sm:text-sm" style={{ color: "#64748b" }}>
                      <span className="sm:hidden">{t("kirishTarixi.ip")}: </span>{row.ip ?? "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="px-5 py-3 text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("kirishTarixi.lastN", { n: rows.length })}
          </p>
        </div>
      )}
    </div>
  )
}
