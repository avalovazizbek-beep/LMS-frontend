"use client"

import { useEffect, useState } from "react"
import { Key, Shield, User } from "lucide-react"
import { hemisApi, type HemisEmployee, type HemisStudent } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

type ProfileData = HemisStudent | HemisEmployee | null

function nestedName(value?: { name?: string } | string) {
  if (!value) return undefined
  return typeof value === "string" ? value : value.name
}

function profileName(profile: ProfileData) {
  return profile?.full_name || "Foydalanuvchi"
}

export default function TizimProfil() {
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
    ? nestedName(employee?.staffPosition) || nestedName(employee?.employeeType) || "O'qituvchi"
    : student?.semester?.name || "Talaba"

  const rows = isEmployee
    ? [
        { label: "To'liq ism", value: employee?.full_name },
        { label: "HEMIS ID", value: employee?.employee_id_number },
        { label: "Kafedra/bo'lim", value: nestedName(employee?.department) },
        { label: "Lavozim", value: nestedName(employee?.staffPosition) },
        { label: "Xodim turi", value: nestedName(employee?.employeeType) },
        { label: "Ish shakli", value: nestedName(employee?.employmentForm) },
        { label: "Ilmiy daraja", value: nestedName(employee?.academicDegree) },
        { label: "Ilmiy unvon", value: nestedName(employee?.academicRank) },
        { label: "Holati", value: nestedName(employee?.employeeStatus) },
      ]
    : [
        { label: "To'liq ism", value: student?.full_name },
        { label: "HEMIS ID", value: student?.student_id_number },
        { label: "Telefon", value: student?.phone },
        { label: "Email", value: student?.email },
        { label: "Fakultet", value: student?.faculty?.name },
        { label: "Guruh", value: student?.group?.name },
      ]

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <div>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Profil
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {isEmployee ? "O'qituvchi profili va HEMIS ma'lumotlari" : "Talaba profili va sozlamalari"}
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
              {isEmployee ? nestedName(employee?.department) || "Xodim" : student?.group?.name || "Talaba"}
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
                Asosiy ma'lumotlar
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
                Xavfsizlik
              </h3>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4" style={{ color: "#7293b9" }} />
                <span className="text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>HEMIS token sessiyasi</span>
              </div>
              <span className="text-xs font-medium px-3 py-1.5 rounded-[5px]"
                style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                Faol
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
