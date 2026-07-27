"use client"

import { useEffect, useState } from "react"
import { Key, Shield, User } from "lucide-react"
import { hemisApi, type HemisEmployee, type HemisStudent } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { useLanguage } from "@/lib/i18n/LanguageContext"

type ProfileData = HemisStudent | HemisEmployee | null

function nestedName(value?: { name?: string } | string) {
  if (!value) return undefined
  return typeof value === "string" ? value : value.name
}

export default function TizimProfil() {
  const { t } = useLanguage()
  const profileName = (profile: ProfileData) => profile?.full_name || t("tizimProfil.user")
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    setRole(sessionStorage.getItem("lms_role") ?? "student")
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
        </div>
      </div>
    </div>
  )
}
