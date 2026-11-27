"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  RefreshCw, Save, FileText, CheckCircle2, Video, Award, Upload, RotateCcw, ArrowRight, Loader2,
  Send, Search, ScanFace, ShieldCheck, CircleCheck, CalendarCheck, BarChart3, Eye, Download,
} from "lucide-react"
import { adminApi, type CertificateTopicPart } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { CertificatePreview, CertificateModal, downloadCertificatePdf } from "@/components/teaching/TeacherCertificate"
import { AssistantAccessSection } from "@/components/admin/AssistantAccessSection"

const font = { fontFamily: "var(--font-poppins)" } as const
const inputStyle = { border: "1px solid #d6e2f3", color: "#0b2a8a", backgroundColor: "#fff", ...font } as const
const CERT_PARTS: CertificateTopicPart[] = ["media", "presentation", "guide", "check"]

function parseParts(value?: string): CertificateTopicPart[] {
  const list = (value ?? "").split(",").map(s => s.trim())
  const parts = CERT_PARTS.filter(p => list.includes(p))
  return parts.length ? parts : CERT_PARTS
}

/* Maketdagi karta: rangli ikonka plitkasi, qalin sarlavha, kichik izoh */
function SettingCard({ icon, tone, toneBg, title, desc, children, className = "", clamp = true }: {
  icon: ReactNode
  tone: string
  toneBg: string
  title: string
  desc: ReactNode
  children: ReactNode
  className?: string
  /** Kichik kartada izoh 3 qatorgacha (to'liq matni — sichqoncha ustida) */
  clamp?: boolean
}) {
  return (
    <div className={`bg-white rounded-[16px] p-4 sm:p-5 flex flex-col gap-4 ${className}`}
      style={{ border: "1px solid rgba(1,41,112,0.06)", boxShadow: "0 6px 22px -14px rgba(1,41,112,0.28)" }}>
      <div className="flex items-start gap-3.5">
        <div className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0" style={{ backgroundColor: toneBg, color: tone }}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-bold leading-snug" style={{ color: "#0b2a8a", ...font }}>{title}</div>
          <div className={`text-xs mt-1 leading-[18px] ${clamp ? "line-clamp-3" : ""}`} title={clamp && typeof desc === "string" ? desc : undefined}
            style={{ color: "#5d7393", ...font }}>{desc}</div>
        </div>
      </div>
      <div className="mt-auto">{children}</div>
    </div>
  )
}

function NumberField({ label, value, onChange, min, max, hint, wide = false }: {
  label: string
  value: string
  onChange: (v: string) => void
  min: number
  max: number
  hint: string
  /** Keng kartada yorliq ustuni bir xil kenglikda turadi */
  wide?: boolean
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <label className={`text-sm font-medium shrink-0 ${wide ? "sm:w-[230px]" : ""}`} style={{ color: "#0b2a8a", ...font }}>{label}</label>
      <input type="number" min={min} max={max} value={value} onChange={e => onChange(e.target.value)}
        className="w-[84px] h-10 px-3 text-sm rounded-[10px] outline-none focus:border-[#1d5fd6]" style={inputStyle} />
      <span className="text-xs" style={{ color: "#5d7393", ...font }}>{hint}</span>
    </div>
  )
}

function Toggle({ on, onClick, label, hint }: { on: boolean; onClick: () => void; label: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <button type="button" role="switch" aria-checked={on} onClick={onClick}
        className="relative w-12 h-7 rounded-full shrink-0 transition-colors"
        style={{ backgroundColor: on ? "#1d5fd6" : "#cbd5e1" }}>
        <span className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: on ? 25 : 3 }} />
      </button>
      <div>
        <div className="text-sm font-semibold" style={{ color: "#0b2a8a", ...font }}>{label}</div>
        <div className="text-xs mt-0.5 leading-[18px]" style={{ color: "#5d7393", ...font }}>{hint}</div>
      </div>
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
  const [facePractice, setFacePractice] = useState(true)
  const [tabLimit, setTabLimit] = useState("3")
  const [testAttempts, setTestAttempts] = useState("1")
  const [meetingMinutes, setMeetingMinutes] = useState("2")
  const [attendanceMode, setAttendanceMode] = useState<"auto" | "manual">("auto")
  const [platformMinutes, setPlatformMinutes] = useState("40")
  const [platformMeetingPct, setPlatformMeetingPct] = useState("100")

  const [certAuto, setCertAuto] = useState(true)
  const [certGoal, setCertGoal] = useState("15")
  const [certParts, setCertParts] = useState<CertificateTopicPart[]>(CERT_PARTS)
  const [templateVersion, setTemplateVersion] = useState(0)
  const [templateBusy, setTemplateBusy] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Telegram: token hech qachon to'liq qaytmaydi — maydon faqat yangi token uchun
  const [tgToken, setTgToken] = useState("")
  const [tgChat, setTgChat] = useState("")
  const [tgTesting, setTgTesting] = useState(false)
  const [tgResult, setTgResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [tgFinding, setTgFinding] = useState(false)
  const [tgFound, setTgFound] = useState<{ botUsername: string | null; chats: { id: string; title: string; type: string }[] } | null>(null)

  function load() {
    setLoading(true)
    adminApi.getSettings()
      .then(res => {
        const d = res.data ?? {}
        setSettings(d)
        setFaceThreshold(d.face_block_threshold ?? "3")
        setFacePractice(d.face_practice_required !== "0")
        setTabLimit(d.tab_leave_limit ?? "3")
        setTestAttempts(d.test_max_attempts ?? "1")
        setMeetingMinutes(d.meeting_attendance_minutes ?? "2")
        setAttendanceMode(d.attendance_mode === "manual" ? "manual" : "auto")
        setPlatformMinutes(d.platform_attendance_minutes ?? "40")
        setPlatformMeetingPct(d.platform_meeting_percent ?? "100")
        setCertAuto(d.certificate_auto !== "0")
        setCertGoal(d.certificate_topic_goal ?? "15")
        setCertParts(parseParts(d.certificate_parts))
        setTgToken("")
        setTgChat(d.telegram_chat_id ?? "")
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
        face_practice_required: facePractice ? "1" : "0",
        // Face ID testni hech qachon yakunlamaydi (2026-11-05) — eski qattiq rejim o'chiriladi
        face_terminate: "0",
        tab_leave_limit: tabLimit,
        test_max_attempts: testAttempts,
        meeting_attendance_minutes: meetingMinutes,
        attendance_mode: attendanceMode,
        platform_attendance_minutes: platformMinutes,
        platform_meeting_percent: platformMeetingPct,
        certificate_auto: certAuto ? "1" : "0",
        certificate_topic_goal: certGoal,
        certificate_parts: certParts.join(","),
        telegram_chat_id: tgChat.trim(),
        ...(tgToken.trim() ? { telegram_bot_token: tgToken.trim() } : {}),
      })
      setTgToken("")
      adminApi.getSettings().then(res => setSettings(res.data ?? {})).catch(() => {})
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

  async function testTelegram() {
    setTgTesting(true)
    setTgResult(null)
    try {
      const res = await adminApi.testTelegram({ botToken: tgToken.trim() || undefined, chatId: tgChat.trim() || undefined })
      setTgResult({ ok: true, text: res.message })
    } catch (err) {
      setTgResult({ ok: false, text: err instanceof Error ? err.message : "" })
    } finally {
      setTgTesting(false)
    }
  }

  // Bot qo'shilgan guruhlarni Telegram'dan olib, Chat ID'ni tanlatish
  async function findTelegramChats() {
    setTgFinding(true)
    setTgResult(null)
    setTgFound(null)
    try {
      const res = await adminApi.findTelegramChats({ botToken: tgToken.trim() || undefined })
      setTgFound(res.data)
    } catch (err) {
      setTgResult({ ok: false, text: err instanceof Error ? err.message : "" })
    } finally {
      setTgFinding(false)
    }
  }

  const tgTypeLabel = (type: string) => type === "private"
    ? t("adminSozlamalar.tg.typePrivate")
    : type === "channel" ? t("adminSozlamalar.tg.typeChannel") : t("adminSozlamalar.tg.typeGroup")

  function togglePart(part: CertificateTopicPart) {
    setCertParts(prev => prev.includes(part) ? prev.filter(p => p !== part) : CERT_PARTS.filter(p => p === part || prev.includes(p)))
  }

  const smallBtn = "flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-[8px] transition-opacity disabled:opacity-60"
  const hasCustomTemplate = Boolean(settings.certificate_template)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const sampleName = t("adminSozlamalar.cert.sampleName")

  async function downloadSamplePdf() {
    setPdfBusy(true)
    setTemplateError(null)
    try {
      await downloadCertificatePdf(sampleName, new Date().toISOString(), `Tashakkurnoma - ${t("adminSozlamalar.cert.templateDefault")}`)
    } catch {
      setTemplateError(t("certificate.renderError"))
    } finally {
      setPdfBusy(false)
    }
  }

  const saveButton = (
    <button onClick={handleSave} disabled={saving}
      className="flex items-center gap-2 text-sm font-semibold px-5 h-11 rounded-[12px] disabled:opacity-60 transition-colors"
      style={{ backgroundColor: "#1450c8", color: "#fff", boxShadow: "0 8px 18px -10px rgba(20,80,200,0.8)", ...font }}>
      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
      {saving ? t("adminSozlamalar.savingLabel") : saved ? t("adminSozlamalar.savedLabel") : t("adminSozlamalar.saveSettingsBtn")}
    </button>
  )

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8">
      {/* Sarlavha — maketdagidek: chapda nom, o'ngda Yangilash va Saqlash */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-bold leading-tight" style={{ color: "#0b2a8a", ...font }}>
            {t("adminSozlamalar.pageTitle")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#5d7393", ...font }}>
            {t("adminSozlamalar.pageSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 text-sm font-semibold px-4 h-11 rounded-[12px] bg-white"
            style={{ color: "#0b2a8a", border: "1px solid rgba(1,41,112,0.08)", boxShadow: "0 4px 14px rgba(1,41,112,0.06)", ...font }}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {t("adminSozlamalar.refresh")}
          </button>
          {!loading && saveButton}
        </div>
      </div>
      {saveError && <span className="text-sm -mt-3" style={{ color: "#b91c1c", ...font }}>{saveError}</span>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(340px,480px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(400px,560px)] gap-6 items-start">
            {/* ── Chap: sozlamalar ── */}
            <div className="flex flex-col gap-4 min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                <SettingCard icon={<ShieldCheck className="w-5 h-5" />} tone="#1d5fd6" toneBg="#e8f0fe"
                  title={t("adminSozlamalar.faceThresholdTitle")} desc={t("adminSozlamalar.faceThresholdDesc")}>
                  <NumberField label={t("adminSozlamalar.errorCountLabel")} value={faceThreshold} onChange={setFaceThreshold}
                    min={1} max={20} hint={t("adminSozlamalar.rangeHint1to20")} />
                </SettingCard>

                {/* Testni faqat oynadan chiqish yakunlaydi (shu marta chiqqanda) — Face ID emas */}
                <SettingCard icon={<CircleCheck className="w-5 h-5" />} tone="#1d5fd6" toneBg="#e8f0fe"
                  title={t("adminSozlamalar.tabLimitTitle")} desc={t("adminSozlamalar.tabLimitDesc")}>
                  <NumberField label={t("adminSozlamalar.tabLimitLabel")} value={tabLimit} onChange={setTabLimit}
                    min={1} max={20} hint={t("adminSozlamalar.rangeHint1to20")} />
                </SettingCard>

                {/* Oraliq / mustaqil ish testidan oldin "Yuzni sinab ko'rish" demo testi */}
                <SettingCard icon={<ScanFace className="w-5 h-5" />} tone="#ea580c" toneBg="#fff1e7"
                  title={t("adminSozlamalar.facePracticeTitle")} desc={t("adminSozlamalar.facePracticeDesc")}>
                  <Toggle on={facePractice} onClick={() => setFacePractice(v => !v)}
                    label={t("adminSozlamalar.facePracticeToggle")}
                    hint={facePractice ? t("adminSozlamalar.facePracticeOn") : t("adminSozlamalar.facePracticeOff")} />
                </SettingCard>

                <SettingCard icon={<FileText className="w-5 h-5" />} tone="#7c3aed" toneBg="#f1ecfe"
                  title={t("adminSozlamalar.testAttemptsTitle")} desc={t("adminSozlamalar.testAttemptsDesc")}>
                  <NumberField label={t("adminSozlamalar.attemptsLabel")} value={testAttempts} onChange={setTestAttempts}
                    min={1} max={10} hint={t("adminSozlamalar.rangeHint1to10")} />
                </SettingCard>

                <SettingCard icon={<Video className="w-5 h-5" />} tone="#16a34a" toneBg="#e7f8ee"
                  title={t("adminSozlamalar.meetingAttendanceTitle")} desc={t("adminSozlamalar.meetingAttendanceDesc")}>
                  <NumberField label={t("adminSozlamalar.minutesLabel")} value={meetingMinutes} onChange={setMeetingMinutes}
                    min={1} max={180} hint={t("adminSozlamalar.rangeHint1to180")} />
                </SettingCard>

                <SettingCard icon={<CalendarCheck className="w-5 h-5" />} tone="#7c3aed" toneBg="#f1ecfe"
                  title={t("adminSozlamalar.attendanceModeTitle")} desc={t("adminSozlamalar.attendanceModeDesc")}>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { v: "auto" as const, label: t("adminSozlamalar.attendanceModeAuto"), desc: t("adminSozlamalar.attendanceModeAutoDesc") },
                      { v: "manual" as const, label: t("adminSozlamalar.attendanceModeManual"), desc: t("adminSozlamalar.attendanceModeManualDesc") },
                    ]).map(opt => {
                      const active = attendanceMode === opt.v
                      return (
                        <button key={opt.v} type="button" onClick={() => setAttendanceMode(opt.v)}
                          className="text-left px-3 py-2.5 rounded-[10px] transition-colors"
                          style={{ border: active ? "1.5px solid #1d5fd6" : "1px solid rgba(1,41,112,0.12)", backgroundColor: active ? "#eef4ff" : "#fff" }}>
                          <div className="flex items-start gap-2">
                            <span className="mt-1 w-3 h-3 rounded-full shrink-0 flex items-center justify-center"
                              style={{ border: `2px solid ${active ? "#1d5fd6" : "#c3cfe2"}` }}>
                              {active && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#1d5fd6" }} />}
                            </span>
                            <span>
                              <span className="block text-[13px] font-semibold leading-tight" style={{ color: "#0b2a8a", ...font }}>{opt.label}</span>
                              <span className="block text-[11px] mt-1 leading-4 line-clamp-3" title={opt.desc} style={{ color: "#5d7393", ...font }}>{opt.desc}</span>
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </SettingCard>
              </div>

              {/* Admin → Davomatlar: platforma asosidagi davomat qoidasi */}
              <SettingCard icon={<BarChart3 className="w-5 h-5" />} tone="#7c3aed" toneBg="#f1ecfe"
                title={t("adminSozlamalar.platformAttendanceTitle")} desc={t("adminSozlamalar.platformAttendanceDesc")} clamp={false}>
                <div className="flex flex-col gap-3">
                  <NumberField label={t("adminSozlamalar.platformMinutesLabel")} value={platformMinutes} onChange={setPlatformMinutes}
                    min={1} max={600} hint={t("adminSozlamalar.platformMinutesHint")} wide />
                  <NumberField label={t("adminSozlamalar.platformMeetingPctLabel")} value={platformMeetingPct} onChange={setPlatformMeetingPct}
                    min={1} max={100} hint={t("adminSozlamalar.platformMeetingPctHint")} wide />
                </div>
              </SettingCard>

              {/* Tashakkurnoma qoidalari */}
              <SettingCard icon={<Award className="w-5 h-5" />} tone="#d97706" toneBg="#fff1e0"
                title={t("adminSozlamalar.cert.title")} desc={t("adminSozlamalar.cert.desc")} clamp={false}>
                <div className="flex flex-col gap-4">
                  <Toggle on={certAuto} onClick={() => setCertAuto(v => !v)}
                    label={t("adminSozlamalar.cert.auto")} hint={t("adminSozlamalar.cert.autoHint")} />
                  <NumberField label={t("adminSozlamalar.cert.goal")} value={certGoal} onChange={setCertGoal}
                    min={1} max={200} hint={t("adminSozlamalar.cert.goalHint")} />
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold" style={{ color: "#0b2a8a", ...font }}>{t("adminSozlamalar.cert.parts")}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CERT_PARTS.map(part => {
                        const on = certParts.includes(part)
                        return (
                          <label key={part} className="relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] cursor-pointer text-sm"
                            style={{ ...font, color: "#0b2a8a", border: on ? "1px solid #b9cdf5" : "1px solid rgba(1,41,112,0.1)", backgroundColor: on ? "#f5f9ff" : "#fff" }}>
                            <input type="checkbox" checked={on} onChange={() => togglePart(part)} className="w-4 h-4 accent-[#1d5fd6]" />
                            <span className="first-letter:uppercase">{t(`certificate.part.${part}`)}</span>
                          </label>
                        )
                      })}
                    </div>
                    {!certParts.length && (
                      <span className="text-xs" style={{ color: "#b91c1c", ...font }}>{t("adminSozlamalar.cert.partsError")}</span>
                    )}
                  </div>
                </div>
              </SettingCard>

              <div className="flex items-center gap-3 flex-wrap">
                <Link href="/admin/tashakkurnomalar"
                  className="flex items-center gap-2 px-5 h-12 rounded-[12px] text-sm font-semibold text-white"
                  style={{ ...font, backgroundColor: "#1450c8", boxShadow: "0 8px 18px -10px rgba(20,80,200,0.8)" }}>
                  <Send className="w-4 h-4" />
                  {t("adminSozlamalar.cert.manage")}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* ── O'ng: tashakkurnoma shabloni (maketdagidek yon panel) ── */}
            <div className="xl:sticky xl:top-4 flex flex-col gap-4 rounded-[18px] p-4 sm:p-5 bg-white"
              style={{ border: "1px solid rgba(1,41,112,0.06)", boxShadow: "0 10px 30px -14px rgba(1,41,112,0.25)" }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="flex items-center gap-2 text-sm" style={{ color: "#0b2a8a", ...font }}>
                  <Eye className="w-4 h-4" style={{ color: "#1d5fd6" }} />
                  <span className="font-semibold">{t("adminSozlamalar.cert.template")}:</span>
                  {hasCustomTemplate ? t("adminSozlamalar.cert.templateCustom") : t("adminSozlamalar.cert.templateDefault")}
                </span>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) void changeTemplate(() => adminApi.uploadCertificateTemplate(file))
                  }} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={templateBusy}
                  className="flex items-center gap-2 text-[13px] font-semibold px-4 h-10 rounded-[10px] text-white disabled:opacity-60"
                  style={{ ...font, backgroundColor: "#1450c8" }}>
                  {templateBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {t("adminSozlamalar.cert.uploadShort")}
                </button>
              </div>

              <div className="rounded-[12px] overflow-hidden" style={{ boxShadow: "0 6px 20px -10px rgba(1,41,112,0.35)" }}>
                <CertificatePreview fullName={sampleName} version={templateVersion} />
              </div>
              {templateError && <span className="text-xs" style={{ color: "#b91c1c", ...font }}>{templateError}</span>}

              <div className="flex items-start gap-3 rounded-[12px] px-4 py-3" style={{ backgroundColor: "#f0f6ff", border: "1px solid #dce8fb" }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold" style={{ backgroundColor: "#1d5fd6" }}>i</span>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs leading-5" style={{ color: "#334a6b", ...font }}>{t("adminSozlamalar.cert.templateHint")}</p>
                  {hasCustomTemplate && (
                    <button type="button" onClick={() => void changeTemplate(() => adminApi.resetCertificateTemplate())}
                      disabled={templateBusy} className="flex items-center gap-1.5 text-xs font-semibold w-fit disabled:opacity-60"
                      style={{ ...font, color: "#1d5fd6" }}>
                      <RotateCcw className="w-3.5 h-3.5" /> {t("adminSozlamalar.cert.reset")}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setPreviewOpen(true)}
                  className="flex items-center justify-center gap-2 h-12 rounded-[12px] text-sm font-semibold bg-white"
                  style={{ ...font, color: "#0b2a8a", border: "1.5px solid #b9cdf5" }}>
                  <Eye className="w-4 h-4" style={{ color: "#1d5fd6" }} />
                  {t("adminSozlamalar.cert.previewBtn")}
                </button>
                <button type="button" onClick={() => void downloadSamplePdf()} disabled={pdfBusy}
                  className="flex items-center justify-center gap-2 h-12 rounded-[12px] text-sm font-semibold text-white disabled:opacity-60"
                  style={{ ...font, backgroundColor: "#1450c8", boxShadow: "0 8px 18px -10px rgba(20,80,200,0.8)" }}>
                  {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {t("adminSozlamalar.cert.downloadPdfBtn")}
                </button>
              </div>
            </div>
          </div>

          {/* Telegram bot: hisobot va talaba xabarlari shu chatga boradi */}
          <SettingCard icon={<Send className="w-5 h-5" />} tone="#0284c7" toneBg="#e0f2fe"
            title={t("adminSozlamalar.tg.title")} desc={t("adminSozlamalar.tg.desc")} clamp={false}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "#0b2a8a", ...font }}>{t("adminSozlamalar.tg.token")}</label>
                <input type="password" autoComplete="off" value={tgToken} onChange={e => setTgToken(e.target.value)}
                  placeholder={t("adminSozlamalar.tg.tokenPh")}
                  className="w-full px-3 h-10 text-sm rounded-[10px] outline-none" style={inputStyle} />
                <span className="text-xs leading-5" style={{ color: settings.telegram_bot_token_source === "none" ? "#b91c1c" : "#5d7393", ...font }}>
                  {settings.telegram_bot_token_source === "settings"
                    ? t("adminSozlamalar.tg.tokenSaved", { hint: settings.telegram_bot_token_hint ?? "" })
                    : settings.telegram_bot_token_source === "env"
                      ? t("adminSozlamalar.tg.tokenEnv", { hint: settings.telegram_bot_token_hint ?? "" })
                      : t("adminSozlamalar.tg.tokenNone")}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "#0b2a8a", ...font }}>{t("adminSozlamalar.tg.chat")}</label>
                <input value={tgChat} onChange={e => setTgChat(e.target.value)} placeholder="-1001234567890"
                  className="w-full px-3 h-10 text-sm rounded-[10px] outline-none" style={inputStyle} />
                {/^\d+$/.test(tgChat.trim()) ? (
                  <span className="text-xs leading-5" style={{ color: "#b45309", ...font }}>{t("adminSozlamalar.tg.privateWarn")}</span>
                ) : (
                  <span className="text-xs leading-5" style={{ color: "#5d7393", ...font }}>
                    {settings.telegram_chat_source === "env" ? `${t("adminSozlamalar.tg.chatEnv")}. ` : ""}{t("adminSozlamalar.tg.chatHint")}
                  </span>
                )}
              </div>
            </div>
            {tgFound && (
              <div className="flex flex-col gap-2 rounded-[10px] p-3" style={{ backgroundColor: "#f6f9ff", border: "1px solid rgba(1,41,112,0.1)" }}>
                {tgFound.chats.some(c => c.type !== "private") ? (
                  <>
                    <span className="text-xs font-medium" style={{ color: "#0b2a8a", ...font }}>{t("adminSozlamalar.tg.findPick")}</span>
                    {tgFound.chats.map(c => {
                      const on = tgChat.trim() === c.id
                      return (
                        <button key={c.id} type="button" onClick={() => { setTgChat(c.id); setTgResult(null) }}
                          className="flex items-center justify-between gap-3 text-left px-3 py-2 rounded-[8px] bg-white text-sm"
                          style={{ ...font, color: "#0b2a8a", border: on ? "1px solid #1d5fd6" : "1px solid rgba(1,41,112,0.15)" }}>
                          <span className="min-w-0 truncate">{c.title}</span>
                          <span className="text-xs shrink-0" style={{ color: "#5d7393" }}>{tgTypeLabel(c.type)} · {c.id}</span>
                        </button>
                      )
                    })}
                  </>
                ) : (
                  <span className="text-xs leading-5" style={{ color: "#b45309", ...font }}>
                    {t("adminSozlamalar.tg.findEmpty", { cmd: tgFound.botUsername ? `/start@${tgFound.botUsername}` : "/start" })}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" onClick={findTelegramChats} disabled={tgFinding} className={`${smallBtn} text-white`}
                style={{ ...font, backgroundColor: "#0284c7" }}>
                {tgFinding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                {t("adminSozlamalar.tg.find")}
              </button>
              <button type="button" onClick={testTelegram} disabled={tgTesting} className={smallBtn}
                style={{ ...font, color: "#0284c7", border: "1px solid rgba(2,132,199,0.4)" }}>
                {tgTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {t("adminSozlamalar.tg.test")}
              </button>
              {tgResult
                ? <span className="text-xs" style={{ color: tgResult.ok ? "#15803d" : "#b91c1c", ...font }}>{tgResult.text}</span>
                : <span className="text-xs" style={{ color: "#5d7393", ...font }}>{t("adminSozlamalar.tg.testHint")}</span>}
            </div>
          </SettingCard>

          {/* O'qituvchi yordamchisi (AI): kimga ko'rinishi — o'z API'si bor, "Saqlash" tugmasiga bog'liq emas */}
          <AssistantAccessSection />

          <div className="flex items-center gap-3 pt-1 flex-wrap">
            {saveButton}
            {saveError && <span className="text-sm" style={{ color: "#b91c1c", ...font }}>{saveError}</span>}
          </div>
        </div>
      )}

      {previewOpen && (
        <CertificateModal fullName={sampleName} issuedAt={new Date().toISOString()}
          title={t("adminSozlamalar.cert.previewBtn")} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  )
}
