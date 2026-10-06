"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  RefreshCw, Save, ShieldAlert, FileText, CheckCircle2, Video, ClipboardCheck, Award, Upload, RotateCcw, ArrowRight, Loader2,
} from "lucide-react"
import { adminApi, type CertificateTopicPart } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { CertificatePreview } from "@/components/teaching/TeacherCertificate"

const font = { fontFamily: "var(--font-poppins)" } as const
const inputStyle = { border: "1px solid rgba(1,41,112,0.2)", color: "#012970", ...font } as const
const CERT_PARTS: CertificateTopicPart[] = ["media", "presentation", "guide", "check"]

function parseParts(value?: string): CertificateTopicPart[] {
  const list = (value ?? "").split(",").map(s => s.trim())
  const parts = CERT_PARTS.filter(p => list.includes(p))
  return parts.length ? parts : CERT_PARTS
}

function SettingCard({ icon, iconBg, title, desc, children, className = "" }: {
  icon: ReactNode
  iconBg: string
  title: string
  desc: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white rounded-[12px] p-6 flex flex-col gap-4 ${className}`}
      style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: "#012970", ...font }}>{title}</div>
          <div className="text-xs mt-0.5 leading-5" style={{ color: "#7293b9", ...font }}>{desc}</div>
        </div>
      </div>
      {children}
    </div>
  )
}

function NumberField({ label, value, onChange, min, max, hint }: {
  label: string
  value: string
  onChange: (v: string) => void
  min: number
  max: number
  hint: string
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <label className="text-sm font-medium shrink-0" style={{ color: "#012970", ...font }}>{label}</label>
      <input type="number" min={min} max={max} value={value} onChange={e => onChange(e.target.value)}
        className="w-24 px-3 py-2 text-sm rounded-[8px] outline-none" style={inputStyle} />
      <span className="text-xs" style={{ color: "#7293b9", ...font }}>{hint}</span>
    </div>
  )
}

export default function AdminSozlamalar() {
  const { t } = useLanguage()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [faceThreshold, setFaceThreshold] = useState("3")
  const [testAttempts, setTestAttempts] = useState("1")
  const [meetingMinutes, setMeetingMinutes] = useState("70")
  const [attendanceMode, setAttendanceMode] = useState<"auto" | "manual">("auto")

  const [certAuto, setCertAuto] = useState(true)
  const [certGoal, setCertGoal] = useState("15")
  const [certParts, setCertParts] = useState<CertificateTopicPart[]>(CERT_PARTS)
  const [templateVersion, setTemplateVersion] = useState(0)
  const [templateBusy, setTemplateBusy] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function load() {
    setLoading(true)
    adminApi.getSettings()
      .then(res => {
        const d = res.data ?? {}
        setSettings(d)
        setFaceThreshold(d.face_block_threshold ?? "3")
        setTestAttempts(d.test_max_attempts ?? "1")
        setMeetingMinutes(d.meeting_attendance_minutes ?? "70")
        setAttendanceMode(d.attendance_mode === "manual" ? "manual" : "auto")
        setCertAuto(d.certificate_auto !== "0")
        setCertGoal(d.certificate_topic_goal ?? "15")
        setCertParts(parseParts(d.certificate_parts))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    setSaveError(null)
    if (!certParts.length) {
      setSaveError(t("adminSozlamalar.cert.partsError"))
      return
    }
    setSaving(true)
    setSaved(false)
    try {
      await adminApi.saveSettings({
        face_block_threshold: faceThreshold,
        test_max_attempts: testAttempts,
        meeting_attendance_minutes: meetingMinutes,
        attendance_mode: attendanceMode,
        certificate_auto: certAuto ? "1" : "0",
        certificate_topic_goal: certGoal,
        certificate_parts: certParts.join(","),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : null)
    } finally {
      setSaving(false)
    }
  }

  async function changeTemplate(action: () => Promise<unknown>) {
    setTemplateBusy(true)
    setTemplateError(null)
    try {
      await action()
      const res = await adminApi.getSettings()
      setSettings(res.data ?? {})
      setTemplateVersion(v => v + 1)
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : null)
    } finally {
      setTemplateBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function togglePart(part: CertificateTopicPart) {
    setCertParts(prev => prev.includes(part) ? prev.filter(p => p !== part) : CERT_PARTS.filter(p => p === part || prev.includes(p)))
  }

  const current = (key: string, fallback: string) => (
    <>{" "}{t("adminSozlamalar.currentValueLabel")} <strong>{settings[key] ?? fallback}</strong></>
  )
  const hasCustomTemplate = Boolean(settings.certificate_template)
  const smallBtn = "flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-[8px] transition-opacity disabled:opacity-60"

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8 max-w-[1200px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold" style={{ color: "#012970", ...font }}>
            {t("adminSozlamalar.pageTitle")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", ...font }}>
            {t("adminSozlamalar.pageSubtitle")}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px]"
          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", ...font }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("adminSozlamalar.refresh")}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SettingCard icon={<ShieldAlert className="w-5 h-5" style={{ color: "#b91c1c" }} />} iconBg="#fef2f2"
              title={t("adminSozlamalar.faceThresholdTitle")}
              desc={<>{t("adminSozlamalar.faceThresholdDesc")}{current("face_block_threshold", "3")}</>}>
              <NumberField label={t("adminSozlamalar.errorCountLabel")} value={faceThreshold} onChange={setFaceThreshold}
                min={1} max={20} hint={t("adminSozlamalar.rangeHint1to20")} />
            </SettingCard>

            <SettingCard icon={<FileText className="w-5 h-5" style={{ color: "#0e58a8" }} />} iconBg="#eef4ff"
              title={t("adminSozlamalar.testAttemptsTitle")}
              desc={<>{t("adminSozlamalar.testAttemptsDesc")}{current("test_max_attempts", "1")}</>}>
              <NumberField label={t("adminSozlamalar.attemptsLabel")} value={testAttempts} onChange={setTestAttempts}
                min={1} max={10} hint={t("adminSozlamalar.rangeHint1to10")} />
            </SettingCard>

            <SettingCard icon={<Video className="w-5 h-5" style={{ color: "#0e58a8" }} />} iconBg="#eef4ff"
              title={t("adminSozlamalar.meetingAttendanceTitle")}
              desc={<>{t("adminSozlamalar.meetingAttendanceDesc")}{current("meeting_attendance_minutes", "70")}</>}>
              <NumberField label={t("adminSozlamalar.minutesLabel")} value={meetingMinutes} onChange={setMeetingMinutes}
                min={5} max={180} hint={t("adminSozlamalar.rangeHint5to180")} />
            </SettingCard>

            <SettingCard icon={<ClipboardCheck className="w-5 h-5" style={{ color: "#15803d" }} />} iconBg="#f0fdf4"
              title={t("adminSozlamalar.attendanceModeTitle")} desc={t("adminSozlamalar.attendanceModeDesc")}>
              <div className="flex flex-col sm:flex-row gap-3">
                {([
                  { v: "auto" as const, label: t("adminSozlamalar.attendanceModeAuto"), desc: t("adminSozlamalar.attendanceModeAutoDesc") },
                  { v: "manual" as const, label: t("adminSozlamalar.attendanceModeManual"), desc: t("adminSozlamalar.attendanceModeManualDesc") },
                ]).map(opt => {
                  const active = attendanceMode === opt.v
                  return (
                    <button key={opt.v} type="button" onClick={() => setAttendanceMode(opt.v)}
                      className="flex-1 text-left px-4 py-3 rounded-[10px] transition-colors"
                      style={{ border: active ? "2px solid #0e58a8" : "1px solid rgba(1,41,112,0.15)", backgroundColor: active ? "#eef4ff" : "#fff" }}>
                      <div className="text-sm font-semibold" style={{ color: "#012970", ...font }}>{opt.label}</div>
                      <div className="text-xs mt-1 leading-5" style={{ color: "#7293b9", ...font }}>{opt.desc}</div>
                    </button>
                  )
                })}
              </div>
            </SettingCard>
          </div>

          {/* Tashakkurnoma */}
          <SettingCard icon={<Award className="w-5 h-5" style={{ color: "#b8862f" }} />} iconBg="#fdf6e7"
            title={t("adminSozlamalar.cert.title")} desc={t("adminSozlamalar.cert.desc")}>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6">
              <div className="flex flex-col gap-5">
                <div className="flex items-start gap-3">
                  <button type="button" role="switch" aria-checked={certAuto} onClick={() => setCertAuto(v => !v)}
                    className="relative w-11 h-6 rounded-full shrink-0 transition-colors mt-0.5"
                    style={{ backgroundColor: certAuto ? "#0e58a8" : "#cbd5e1" }}>
                    <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                      style={{ left: certAuto ? 22 : 2 }} />
                  </button>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "#012970", ...font }}>{t("adminSozlamalar.cert.auto")}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#7293b9", ...font }}>{t("adminSozlamalar.cert.autoHint")}</div>
                  </div>
                </div>

                <NumberField label={t("adminSozlamalar.cert.goal")} value={certGoal} onChange={setCertGoal}
                  min={1} max={200} hint={t("adminSozlamalar.cert.goalHint")} />

                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium" style={{ color: "#012970", ...font }}>{t("adminSozlamalar.cert.parts")}</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CERT_PARTS.map(part => {
                      const on = certParts.includes(part)
                      return (
                        <label key={part} className="flex items-center gap-2 px-3 py-2 rounded-[8px] cursor-pointer text-sm"
                          style={{ ...font, color: "#012970", border: on ? "1px solid #0e58a8" : "1px solid rgba(1,41,112,0.15)", backgroundColor: on ? "#eef4ff" : "#fff" }}>
                          <input type="checkbox" checked={on} onChange={() => togglePart(part)} className="accent-[#0e58a8]" />
                          <span className="first-letter:uppercase">{t(`certificate.part.${part}`)}</span>
                        </label>
                      )
                    })}
                  </div>
                  {!certParts.length && (
                    <span className="text-xs" style={{ color: "#b91c1c", ...font }}>{t("adminSozlamalar.cert.partsError")}</span>
                  )}
                </div>

                <Link href="/admin/tashakkurnomalar"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-[8px] text-sm font-semibold w-fit transition-colors hover:bg-[#fdf6e7]"
                  style={{ ...font, color: "#b8862f", border: "1px solid rgba(184,134,47,0.45)" }}>
                  {t("adminSozlamalar.cert.manage")} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-medium" style={{ color: "#012970", ...font }}>
                    {t("adminSozlamalar.cert.template")}:{" "}
                    <span style={{ color: "#7293b9" }}>
                      {hasCustomTemplate ? t("adminSozlamalar.cert.templateCustom") : t("adminSozlamalar.cert.templateDefault")}
                    </span>
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) void changeTemplate(() => adminApi.uploadCertificateTemplate(file))
                      }} />
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={templateBusy} className={`${smallBtn} text-white`}
                      style={{ ...font, backgroundColor: "#0e58a8" }}>
                      {templateBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {t("adminSozlamalar.cert.upload")}
                    </button>
                    {hasCustomTemplate && (
                      <button type="button" onClick={() => void changeTemplate(() => adminApi.resetCertificateTemplate())}
                        disabled={templateBusy} className={smallBtn}
                        style={{ ...font, color: "#0e58a8", border: "1px solid rgba(14,88,168,0.35)" }}>
                        <RotateCcw className="w-3.5 h-3.5" /> {t("adminSozlamalar.cert.reset")}
                      </button>
                    )}
                  </div>
                </div>
                <CertificatePreview fullName={t("adminSozlamalar.cert.sampleName")} version={templateVersion} />
                {templateError && <span className="text-xs" style={{ color: "#b91c1c", ...font }}>{templateError}</span>}
                <p className="text-xs leading-5" style={{ color: "#7293b9", ...font }}>{t("adminSozlamalar.cert.templateHint")}</p>
              </div>
            </div>
          </SettingCard>

          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-[8px] disabled:opacity-60 transition-colors"
              style={{ backgroundColor: "#0e58a8", color: "#fff", ...font }}>
              {saving
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : saved
                  ? <CheckCircle2 className="w-4 h-4" />
                  : <Save className="w-4 h-4" />}
              {saving ? t("adminSozlamalar.savingLabel") : saved ? t("adminSozlamalar.savedLabel") : t("adminSozlamalar.saveSettingsBtn")}
            </button>
            {saveError && <span className="text-sm" style={{ color: "#b91c1c", ...font }}>{saveError}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
