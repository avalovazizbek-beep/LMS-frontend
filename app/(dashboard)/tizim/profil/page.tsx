"use client"

import { useEffect, useState } from "react"
import { Key, Shield, User, Video, CheckCircle2, AlertTriangle, Circle, ExternalLink } from "lucide-react"
import { hemisApi, zoomApi, type HemisEmployee, type HemisStudent, type ZoomConnectionStatus } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { useLanguage } from "@/lib/i18n/LanguageContext"

type ProfileData = HemisStudent | HemisEmployee | null

function nestedName(value?: { name?: string } | string) {
  if (!value) return undefined
  return typeof value === "string" ? value : value.name
}

/** Faqat o'qituvchi profilida ko'rinadi — "Integratsiyalar" bo'limi.
 *  Bitta umumiy Zoom hisobi emas: HAR BIR o'qituvchi shu yerdan o'z Zoom
 *  hisobini OAuth orqali ulaydi, keyin meeting yaratganda ANIQ shu
 *  o'qituvchining hisobi nomidan Zoom meeting ochiladi. */
function ZoomIntegrationCard() {
  const { data, loading, error, refetch } = useApi(() => zoomApi.status(), [])
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // OAuth callback shu sahifaga ?zoom=connected yoki ?zoom=error&message=...
  // bilan qaytaradi (backend redirect qiladi, brauzer to'g'ridan-to'g'ri
  // Zoom'dan qaytgani uchun bu holatni faqat URL orqali bilib olamiz).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const zoom = params.get("zoom")
    if (!zoom) return
    if (zoom === "connected") {
      setBanner({ type: "success", text: "Zoom account muvaffaqiyatli ulandi" })
      refetch()
    } else if (zoom === "error") {
      setBanner({ type: "error", text: params.get("message") || "Zoom account ulanmadi" })
    }
    params.delete("zoom")
    params.delete("message")
    const qs = params.toString()
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleConnect() {
    setConnecting(true)
    setBanner(null)
    try {
      const res = await zoomApi.connect()
      window.location.href = res.data.url
    } catch (e) {
      setBanner({ type: "error", text: e instanceof Error ? e.message : "Ulanishda xato" })
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Zoom account'ni uzasizmi? Eski yaratilgan meetinglarning havolalari saqlanib qoladi.")) return
    setDisconnecting(true)
    try {
      await zoomApi.disconnect()
      await refetch()
    } catch (e) {
      setBanner({ type: "error", text: e instanceof Error ? e.message : "Uzishda xato" })
    } finally {
      setDisconnecting(false)
    }
  }

  const status: ZoomConnectionStatus | undefined = data?.data

  return (
    <div className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Video className="w-5 h-5" style={{ color: "#0e58a8" }} />
        <h3 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Integratsiyalar
        </h3>
      </div>

      {banner && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-[8px] text-xs"
          style={{
            backgroundColor: banner.type === "success" ? "#f0fdf4" : "#fef2f2",
            color: banner.type === "success" ? "#15803d" : "#b91c1c",
            fontFamily: "var(--font-poppins)",
          }}>
          {banner.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
          {banner.text}
        </div>
      )}

      {loading ? (
        <div className="py-4 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Yuklanmoqda…</div>
      ) : error ? (
        <ApiError message={error} onRetry={refetch} />
      ) : (
        <div className="flex items-center justify-between py-3 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Zoom:</span>
            {status?.status === "active" ? (
              <span className="flex items-center gap-1.5 text-sm" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                <CheckCircle2 className="w-4 h-4" /> Ulangan {status.email ? `(${status.email})` : ""}
              </span>
            ) : status?.status === "needs_reconnect" ? (
              <span className="flex items-center gap-1.5 text-sm" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
                <AlertTriangle className="w-4 h-4" /> Qayta ulash kerak
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                <Circle className="w-4 h-4" /> Ulanmagan
              </span>
            )}
          </div>

          {status?.status === "active" ? (
            <button onClick={handleDisconnect} disabled={disconnecting}
              className="text-xs font-medium px-3.5 py-2 rounded-[6px] disabled:opacity-60"
              style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
              {disconnecting ? "Uzilmoqda…" : "Zoomni uzish"}
            </button>
          ) : (
            <button onClick={handleConnect} disabled={connecting || !status?.configured}
              className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-[6px] disabled:opacity-60"
              style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
              <ExternalLink className="w-3.5 h-3.5" />
              {connecting ? "O'tilmoqda…" : status?.status === "needs_reconnect" ? "Zoomni qayta ulash" : "Zoom account'ni ulash"}
            </button>
          )}
        </div>
      )}
      {!loading && !error && status && !status.configured && (
        <p className="text-xs mt-1" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
          Zoom integratsiyasi hali serverda sozlanmagan (admin bilan bog'laning)
        </p>
      )}
    </div>
  )
}

export default function TizimProfil() {
  const { t } = useLanguage()
  const profileName = (profile: ProfileData) => profile?.full_name || t("tizimProfil.user")
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    setRole(localStorage.getItem("lms_role") ?? "student")
  }, [])

  const { data, loading, error, refetch } = useApi(
    () => {
      if (!role) return Promise.resolve({ success: true, data: null as ProfileData })
      return role === "employee" ? hemisApi.employeeMe() : hemisApi.me()
    },
    [role]
  )

  const profile = data?.data as ProfileData
  const isEmployee = role === "employee"

  if (role === null || loading) return <Loading />
  if (error) return <ApiError message={error} onRetry={refetch} />

  const student = !isEmployee ? (profile as HemisStudent | null) : null
  const employee = isEmployee ? (profile as HemisEmployee | null) : null
  const badge = isEmployee
    ? nestedName(employee?.staffPosition) || nestedName(employee?.employeeType) || t("tizimProfil.teacher")
    : student?.semester?.name || t("tizimProfil.student")

  const rows = isEmployee
    ? [
        { label: t("tizimProfil.fullName"), value: employee?.full_name },
        { label: t("tizimProfil.hemisId"), value: employee?.employee_id_number },
        { label: t("tizimProfil.department"), value: nestedName(employee?.department) },
        { label: t("tizimProfil.position"), value: nestedName(employee?.staffPosition) },
        { label: t("tizimProfil.employeeType"), value: nestedName(employee?.employeeType) },
        { label: t("tizimProfil.employmentForm"), value: nestedName(employee?.employmentForm) },
        { label: t("tizimProfil.academicDegree"), value: nestedName(employee?.academicDegree) },
        { label: t("tizimProfil.academicRank"), value: nestedName(employee?.academicRank) },
        { label: t("tizimProfil.status"), value: nestedName(employee?.employeeStatus) },
      ]
    : [
        { label: t("tizimProfil.fullName"), value: student?.full_name },
        { label: t("tizimProfil.hemisId"), value: student?.student_id_number },
        { label: t("tizimProfil.phone"), value: student?.phone },
        { label: t("tizimProfil.email"), value: student?.email },
        { label: t("tizimProfil.faculty"), value: student?.faculty?.name },
        { label: t("tizimProfil.group"), value: student?.group?.name },
      ]

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {t("tizimProfil.title")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {isEmployee ? t("tizimProfil.teacherSubtitle") : t("tizimProfil.studentSubtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-[10px] p-6 flex flex-col items-center gap-3"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold"
            style={{ backgroundColor: "#0e58a8" }}>
            {profileName(profile).charAt(0).toUpperCase()}
          </div>
          <div className="text-center">
            <p className="font-semibold text-base" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {profileName(profile)}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
              {isEmployee ? nestedName(employee?.department) || t("tizimProfil.staff") : student?.group?.name || t("tizimProfil.student")}
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {badge}
          </span>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-5">
          <div className="bg-white rounded-[10px] p-5"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5" style={{ color: "#1cc2dc" }} />
              <h3 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {t("tizimProfil.mainInfo")}
              </h3>
            </div>
            {rows.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 py-2.5"
                style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{item.label}</span>
                <span className="text-sm font-medium text-right" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {item.value || "-"}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[10px] p-5"
            style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5" style={{ color: "#0e58a8" }} />
              <h3 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {t("tizimProfil.security")}
              </h3>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4" style={{ color: "#7293b9" }} />
                <span className="text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{t("tizimProfil.hemisSession")}</span>
              </div>
              <span className="text-xs font-medium px-3 py-1.5 rounded-[5px]"
                style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                {t("tizimProfil.active")}
              </span>
            </div>
          </div>

          {isEmployee && <ZoomIntegrationCard />}
        </div>
      </div>
    </div>
  )
}
