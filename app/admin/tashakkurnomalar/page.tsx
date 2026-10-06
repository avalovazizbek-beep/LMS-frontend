"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Award, Search, Loader2, Eye, Ban, Settings } from "lucide-react"
import { adminApi, type AdminCertificateItem } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { CertificateModal, formatCertificateDate } from "@/components/teaching/TeacherCertificate"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const font = { fontFamily: "var(--font-poppins)" } as const
const btn = "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[6px] transition-opacity disabled:opacity-60 whitespace-nowrap"

export default function AdminTashakkurnomalar() {
  const { t } = useLanguage()
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState("")
  useEffect(() => {
    const id = setTimeout(() => setSearch(query), 350)
    return () => clearTimeout(id)
  }, [query])

  const { data, loading, error, refetch } = useApi(() => adminApi.certificates(search), [search])
  const items = data?.data.items ?? []
  const config = data?.data.config
  const [busyId, setBusyId] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [viewing, setViewing] = useState<AdminCertificateItem | null>(null)
  const [opError, setOpError] = useState<string | null>(null)

  async function run(id: number, action: () => Promise<unknown>) {
    setBusyId(id)
    setOpError(null)
    try {
      await action()
      await refetch()
    } catch (err) {
      setOpError(err instanceof Error ? err.message : null)
    } finally {
      setBusyId(null)
      setConfirmId(null)
    }
  }

  function statusOf(item: AdminCertificateItem) {
    const cert = item.certificate
    if (!cert) return <span style={{ color: "#94a3b8" }}>{t("adminCertificates.status.none")}</span>
    if (cert.revoked) {
      return <span title={t("adminCertificates.revokedHint")} style={{ color: "#b91c1c" }}>{t("adminCertificates.status.revoked")}</span>
    }
    const date = formatCertificateDate(cert.issuedAt)
    return (
      <span className="font-medium" style={{ color: "#15803d" }}>
        {cert.issuedBy ? t("adminCertificates.status.manual", { by: cert.issuedBy, date }) : t("adminCertificates.status.auto", { date })}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold" style={{ color: "#012970", ...font }}>{t("adminCertificates.pageTitle")}</h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", ...font }}>{t("adminCertificates.pageSubtitle")}</p>
        </div>
        {config && (
          <Link href="/admin/sozlamalar"
            className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-[8px]"
            style={{ backgroundColor: config.auto ? "#fdf6e7" : "#f1f5f9", color: config.auto ? "#92400e" : "#475569", ...font }}>
            <Settings className="w-4 h-4" />
            {config.auto ? t("adminCertificates.autoOn", { goal: config.goal }) : t("adminCertificates.autoOff")}
          </Link>
        )}
      </div>

      <div className="relative max-w-[420px]">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#7293b9" }} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t("adminCertificates.search")}
          className="w-full pl-9 pr-3 py-2.5 rounded-[8px] text-sm outline-none bg-white"
          style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", ...font }} />
      </div>

      {opError && (
        <div className="px-4 py-2.5 rounded-[8px] text-sm" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", ...font }}>{opError}</div>
      )}

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ApiError message={error} onRetry={refetch} />
      ) : (
        <div className="bg-white rounded-[12px] overflow-x-auto" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          {/* Telefonda ustunlar ezilmasin — jadval gorizontal suriladi */}
          <table className="w-full min-w-[760px] text-sm" style={font}>
            <thead>
              <tr style={{ backgroundColor: "#f6f9ff", color: "#445b7a" }}>
                <th className="text-left font-semibold px-4 py-3">{t("adminCertificates.col.teacher")}</th>
                <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">{t("adminCertificates.col.topics")}</th>
                <th className="text-left font-semibold px-4 py-3">{t("adminCertificates.col.status")}</th>
                <th className="text-right font-semibold px-4 py-3">{t("adminCertificates.col.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center" style={{ color: "#7293b9" }}>{t("adminCertificates.empty")}</td></tr>
              ) : items.map(item => {
                const active = item.certificate && !item.certificate.revoked
                const reached = config ? item.completedTopics >= config.goal : false
                const busy = busyId === item.teacherUserId
                return (
                  <tr key={item.teacherUserId} style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {active && <Award className="w-4 h-4 shrink-0" style={{ color: "#b8862f" }} />}
                        <span className="font-medium" style={{ color: "#012970" }}>{item.fullName || `#${item.teacherUserId}`}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="whitespace-nowrap">
                        <span className="font-semibold" style={{ color: reached ? "#15803d" : "#0e58a8" }}>{item.completedTopics}</span>
                        {config && <span style={{ color: "#94a3b8" }}> / {config.goal}</span>}
                      </div>
                      {/* Nima yetishmayotgani: jami mavzu va har bir majburiy qism nechta mavzuda bor */}
                      {config && item.partCounts && item.totalTopics > 0 && (
                        <div className="mt-1 text-[11px] leading-snug" style={{ color: "#7293b9" }}>
                          {t("adminCertificates.topicsTotal", { n: item.totalTopics })}
                          {config.parts.map(p => {
                            const n = item.partCounts[p] ?? 0
                            return (
                              <span key={p}> · {t(`certificate.part.${p}`)}{" "}
                                <span className="font-semibold" style={{ color: n === 0 ? "#b91c1c" : n < item.totalTopics ? "#b45309" : "#15803d" }}>{n}</span>
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{statusOf(item)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {busy && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#7293b9" }} />}
                        {active ? (
                          confirmId === item.teacherUserId ? (
                            <>
                              <span className="text-xs" style={{ color: "#b91c1c" }}>{t("adminCertificates.revokeConfirm")}</span>
                              <button onClick={() => run(item.teacherUserId, () => adminApi.revokeCertificate(item.teacherUserId))}
                                disabled={busy} className={`${btn} text-white`} style={{ backgroundColor: "#dc2626" }}>
                                {t("adminCertificates.yes")}
                              </button>
                              <button onClick={() => setConfirmId(null)} disabled={busy} className={btn}
                                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9" }}>
                                {t("adminCertificates.no")}
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setViewing(item)} className={btn}
                                style={{ border: "1px solid rgba(14,88,168,0.35)", color: "#0e58a8" }}>
                                <Eye className="w-3.5 h-3.5" /> {t("adminCertificates.view")}
                              </button>
                              <button onClick={() => setConfirmId(item.teacherUserId)} disabled={busy} className={btn}
                                style={{ border: "1px solid rgba(220,38,38,0.35)", color: "#dc2626" }}>
                                <Ban className="w-3.5 h-3.5" /> {t("adminCertificates.revoke")}
                              </button>
                            </>
                          )
                        ) : (
                          <button onClick={() => run(item.teacherUserId, () => adminApi.issueCertificate(item.teacherUserId))}
                            disabled={busy} className={`${btn} text-white`} style={{ backgroundColor: "#b8862f" }}>
                            <Award className="w-3.5 h-3.5" />
                            {item.certificate?.revoked ? t("adminCertificates.reissue") : t("adminCertificates.issue")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewing?.certificate && (
        <CertificateModal fullName={viewing.fullName} issuedAt={viewing.certificate.issuedAt} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}
