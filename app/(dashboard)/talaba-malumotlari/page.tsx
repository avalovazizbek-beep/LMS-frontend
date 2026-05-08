"use client"

import { useState } from "react"
import {
  User, FileText, Award, GraduationCap, Briefcase,
  Phone, Mail, BookOpen, Star, Hash, CreditCard, Globe, Calendar, Download,
} from "lucide-react"
import { motion } from "framer-motion"
import { hemisApi, HemisStudent, HemisStudentDoc, HemisCertificate, hemisDownloadUrl } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const tabs = [
  { key: "profile",      label: "Shaxsiy ma'lumotlar", icon: User },
  { key: "academic",     label: "O'quv ma'lumotlari",  icon: BookOpen },
  { key: "documents",    label: "Hujjatlar",            icon: FileText },
  { key: "certificates", label: "Sertifikatlar",        icon: Award },
  { key: "thesis",       label: "Bitiruv ishi",         icon: GraduationCap },
]

function formatDate(ts?: number): string {
  if (!ts) return "—"
  return new Date(ts * 1000).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}
const formatBirthDate = formatDate

function getInitial(s: HemisStudent | null): string {
  return s?.first_name?.charAt(0)?.toUpperCase() ?? "T"
}

export default function TalabaMalumotlari() {
  const [activeTab, setActiveTab] = useState("profile")
  const { data, loading, error, refetch } = useApi(() => hemisApi.me())
  const student: HemisStudent | null = data?.data ?? null
  const { data: docsData  } = useApi(() => hemisApi.documents())
  const { data: certsData } = useApi(() => hemisApi.certificate())

  const gpa = student?.avg_gpa ?? student?.gpa

  if (loading) return <Loading />
  if (error)   return <ApiError message={error} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 p-[30px]">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-[28px] font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          Talaba Ma&apos;lumotlari
        </h1>
        <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Shaxsiy kabinet</p>
      </motion.div>

      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white rounded-[10px] p-5 flex items-center gap-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0"
          style={{ backgroundColor: "#0e58a8" }}>
          {getInitial(student)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {student?.full_name ?? "—"}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {[student?.group?.name, student?.level?.name, student?.faculty?.name].filter(Boolean).join(" · ") || "—"}
          </p>
          {gpa != null && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4" style={{ color: "#f59e0b" }} />
              <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                GPA: {Number(gpa).toFixed(2)}
              </span>
            </div>
          )}
        </div>
        {student?.semester?.name && (
          <span className="px-3 py-1.5 rounded-full text-xs font-medium shrink-0"
            style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", border: "1px solid rgba(14,88,168,0.2)", fontFamily: "var(--font-poppins)" }}>
            {student.semester.name}
          </span>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] whitespace-nowrap border transition-colors text-sm font-medium"
              style={{
                backgroundColor: activeTab === t.key ? "#0e58a8" : "#fff",
                color: activeTab === t.key ? "#fff" : "#7293b9",
                borderColor: activeTab === t.key ? "rgba(1,41,112,0.3)" : "rgba(1,41,112,0.1)",
                fontFamily: "var(--font-poppins)",
              }}>
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Shaxsiy ma'lumotlar ── */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <h3 className="text-base font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Asosiy ma&apos;lumotlar
          </h3>
          {[
            { icon: User,       label: "To'liq ism",     value: student?.full_name || "—" },
            { icon: User,       label: "Familiya",        value: student?.second_name || "—" },
            { icon: User,       label: "Ism",             value: student?.first_name || "—" },
            { icon: User,       label: "Otasining ismi",  value: student?.third_name || "—" },
            { icon: Calendar,   label: "Tug'ilgan sana",  value: formatBirthDate(student?.birth_date) },
            { icon: Globe,      label: "Jinsi",           value: student?.gender?.name || "—" },
            { icon: Phone,      label: "Telefon",         value: student?.phone || "—" },
            { icon: Mail,       label: "Email",           value: student?.email || "—" },
            { icon: Hash,       label: "HEMIS ID",        value: student?.student_id_number || "—" },
            { icon: Globe,      label: "Davlat",          value: student?.country?.name || "—" },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="flex items-start gap-3 py-2.5"
                style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#1cc2dc" }} />
                <div>
                  <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{item.label}</p>
                  <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{item.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── O'quv ma'lumotlari ── */}
      {activeTab === "academic" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <h3 className="text-base font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              O&apos;quv ma&apos;lumotlari
            </h3>
            {[
              { label: "Fakultet",       value: student?.faculty?.name || "—" },
              { label: "Guruh",          value: student?.group?.name || "—" },
              { label: "Kurs",           value: student?.level?.name || "—" },
              { label: "Semestr",        value: student?.semester?.name || "—" },
              { label: "Ta'lim shakli",  value: student?.educationForm?.name || "—" },
              { label: "Ta'lim turi",    value: student?.educationType?.name || "—" },
              { label: "Ta'lim tili",    value: student?.educationLang?.name || "—" },
              { label: "To'lov shakli",  value: student?.paymentForm?.name || "—" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2.5"
                style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{item.label}</span>
                <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[10px] p-5" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
            <h3 className="text-base font-medium mb-4" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              Akademik ko&apos;rsatkichlar
            </h3>
            {[
              { label: "GPA",              value: gpa != null ? Number(gpa).toFixed(2) : "—" },
              { label: "Yo'nalish",        value: student?.specialty?.name || "—" },
              { label: "Turar joy",        value: student?.accommodation?.name || "—" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2.5"
                style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                <span className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{item.label}</span>
                <span className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{item.value}</span>
              </div>
            ))}
            <div className="mt-4 p-4 rounded-[8px]" style={{ backgroundColor: "#f0f5ff" }}>
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-5 h-5" style={{ color: "#f59e0b" }} />
                <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  O'rtacha GPA: {gpa != null ? Number(gpa).toFixed(2) : "—"}
                </span>
              </div>
              <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                Barcha semestrlar bo'yicha o'rtacha baho
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Hujjatlar ── */}
      {activeTab === "documents" && (() => {
        const docs: HemisStudentDoc[] = docsData?.data ?? []
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docs.length === 0 ? (
              <div className="col-span-2 bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
                <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
                <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Hujjatlar topilmadi</p>
              </div>
            ) : docs.map((d, i) => (
              <div key={`${d.id}-${i}`} className="bg-white rounded-[10px] p-4" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#f6f9ff" }}>
                    <FileText className="w-5 h-5" style={{ color: "#0e58a8" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{d.name ?? "Hujjat"}</p>
                    {(d.attributes ?? []).map(a => (
                      <p key={a.label} className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        {a.label}: {a.value}
                      </p>
                    ))}
                  </div>
                </div>
                {d.file && (
                  <a href={hemisDownloadUrl(d.file, d.name ?? "hujjat")} download
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-[5px] text-sm font-medium transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                    <Download className="w-4 h-4" />
                    Yuklab olish
                  </a>
                )}
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── Sertifikatlar ── */}
      {activeTab === "certificates" && (() => {
        const certs: HemisCertificate[] = certsData?.data ?? []
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certs.length === 0 ? (
              <div className="col-span-3 bg-white rounded-[10px] p-12 text-center"
                style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
                <Award className="w-10 h-10 mx-auto mb-3" style={{ color: "#7293b9" }} />
                <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  Sertifikatlar topilmadi
                </p>
                <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  Sizda hali sertifikatlar mavjud emas
                </p>
              </div>
            ) : certs.map((c, i) => (
              <div key={`${c.id}-${i}`} className="bg-white rounded-[10px] p-4 flex flex-col gap-3"
                style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
                <div className="w-10 h-10 rounded-[8px] flex items-center justify-center"
                  style={{ backgroundColor: "#f0fbfd" }}>
                  <Award className="w-5 h-5" style={{ color: "#1cc2dc" }} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    {c.name ?? "Sertifikat"}
                  </p>
                  {c.certificateType?.name && (
                    <p className="text-xs mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {c.certificateType.name}
                    </p>
                  )}
                  {c.organization && (
                    <p className="text-xs mt-0.5" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                      {c.organization}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2"
                  style={{ borderTop: "1px solid rgba(1,41,112,0.07)" }}>
                  <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    {formatDate(c.date ?? c.created_at)}
                  </span>
                  {c.score != null && (
                    <span className="text-xs font-semibold" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>
                      {c.score}
                    </span>
                  )}
                </div>
                {c.file && (
                  <a href={hemisDownloadUrl(c.file, c.name ?? "sertifikat")} download
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-[5px] text-sm font-medium transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                    <Download className="w-4 h-4" />
                    Yuklab olish
                  </a>
                )}
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── Bitiruv ishi ── */}
      {activeTab === "thesis" && (
        <div className="bg-white rounded-[10px] p-10 text-center" style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#f6f9ff" }}>
            <GraduationCap className="w-6 h-6" style={{ color: "#7293b9" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Bitiruv ishi hali topshirilmagan
          </p>
          <p className="text-xs mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Yuklash uchun quyidagi tugmani bosing</p>
          <button className="mt-4 px-4 py-2 rounded-[5px] text-sm font-medium text-white"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            <Briefcase className="w-4 h-4 inline mr-1.5" />
            Yuklash
          </button>
        </div>
      )}
    </div>
  )
}
