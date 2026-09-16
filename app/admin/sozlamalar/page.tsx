"use client"

import { useEffect, useState } from "react"
import { Settings, RefreshCw, Save, ShieldAlert, FileText, CheckCircle2, Video, ClipboardCheck } from "lucide-react"
import { adminApi } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"

export default function AdminSozlamalar() {
  const { t } = useLanguage()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [faceThreshold, setFaceThreshold] = useState("3")
  const [testAttempts, setTestAttempts] = useState("1")
  const [meetingMinutes, setMeetingMinutes] = useState("70")
  const [attendanceMode, setAttendanceMode] = useState<"auto" | "manual">("auto")

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
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await adminApi.saveSettings({
        face_block_threshold: faceThreshold,
        test_max_attempts: testAttempts,
        meeting_attendance_minutes: meetingMinutes,
        attendance_mode: attendanceMode,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      /* error shown by api layer */
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8 max-w-[700px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {t("adminSozlamalar.pageTitle")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("adminSozlamalar.pageSubtitle")}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px]"
          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
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

          {/* Face ID block threshold */}
          <div className="bg-white rounded-[12px] p-6" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#fef2f2" }}>
                <ShieldAlert className="w-5 h-5" style={{ color: "#b91c1c" }} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {t("adminSozlamalar.faceThresholdTitle")}
                </div>
                <div className="text-xs mt-0.5 leading-5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {t("adminSozlamalar.faceThresholdDesc")}
                  {" "}{t("adminSozlamalar.currentValueLabel")} <strong>{settings.face_block_threshold ?? "3"}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium shrink-0" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {t("adminSozlamalar.errorCountLabel")}
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={faceThreshold}
                onChange={e => setFaceThreshold(e.target.value)}
                className="w-24 px-3 py-2 text-sm rounded-[8px] outline-none"
                style={{
                  border: "1px solid rgba(1,41,112,0.2)",
                  color: "#012970",
                  fontFamily: "var(--font-poppins)"
                }}
              />
              <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {t("adminSozlamalar.rangeHint1to20")}
              </span>
            </div>
          </div>

          {/* Test max attempts */}
          <div className="bg-white rounded-[12px] p-6" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#eef4ff" }}>
                <FileText className="w-5 h-5" style={{ color: "#0e58a8" }} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {t("adminSozlamalar.testAttemptsTitle")}
                </div>
                <div className="text-xs mt-0.5 leading-5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {t("adminSozlamalar.testAttemptsDesc")} {t("adminSozlamalar.currentValueLabel")} <strong>{settings.test_max_attempts ?? "1"}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium shrink-0" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {t("adminSozlamalar.attemptsLabel")}
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={testAttempts}
                onChange={e => setTestAttempts(e.target.value)}
                className="w-24 px-3 py-2 text-sm rounded-[8px] outline-none"
                style={{
                  border: "1px solid rgba(1,41,112,0.2)",
                  color: "#012970",
                  fontFamily: "var(--font-poppins)"
                }}
              />
              <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {t("adminSozlamalar.rangeHint1to10")}
              </span>
            </div>
          </div>

          {/* Meeting attendance threshold */}
          <div className="bg-white rounded-[12px] p-6" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#eef4ff" }}>
                <Video className="w-5 h-5" style={{ color: "#0e58a8" }} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {t("adminSozlamalar.meetingAttendanceTitle")}
                </div>
                <div className="text-xs mt-0.5 leading-5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {t("adminSozlamalar.meetingAttendanceDesc")}
                  {" "}{t("adminSozlamalar.currentValueLabel")} <strong>{settings.meeting_attendance_minutes ?? "70"}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium shrink-0" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {t("adminSozlamalar.minutesLabel")}
              </label>
              <input
                type="number"
                min={5}
                max={180}
                value={meetingMinutes}
                onChange={e => setMeetingMinutes(e.target.value)}
                className="w-24 px-3 py-2 text-sm rounded-[8px] outline-none"
                style={{
                  border: "1px solid rgba(1,41,112,0.2)",
                  color: "#012970",
                  fontFamily: "var(--font-poppins)"
                }}
              />
              <span className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {t("adminSozlamalar.rangeHint5to180")}
              </span>
            </div>
          </div>

          {/* Meeting attendance mode */}
          <div className="bg-white rounded-[12px] p-6" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#f0fdf4" }}>
                <ClipboardCheck className="w-5 h-5" style={{ color: "#15803d" }} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                  {t("adminSozlamalar.attendanceModeTitle")}
                </div>
                <div className="text-xs mt-0.5 leading-5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {t("adminSozlamalar.attendanceModeDesc")}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {([
                { v: "auto" as const, label: t("adminSozlamalar.attendanceModeAuto"), desc: t("adminSozlamalar.attendanceModeAutoDesc") },
                { v: "manual" as const, label: t("adminSozlamalar.attendanceModeManual"), desc: t("adminSozlamalar.attendanceModeManualDesc") },
              ]).map(opt => {
                const active = attendanceMode === opt.v
                return (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setAttendanceMode(opt.v)}
                    className="flex-1 text-left px-4 py-3 rounded-[10px] transition-colors"
                    style={{
                      border: active ? "2px solid #0e58a8" : "1px solid rgba(1,41,112,0.15)",
                      backgroundColor: active ? "#eef4ff" : "#fff",
                    }}>
                    <div className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                      {opt.label}
                    </div>
                    <div className="text-xs mt-1 leading-5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                      {opt.desc}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-[8px] disabled:opacity-60 transition-colors"
              style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
              {saving
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : saved
                  ? <CheckCircle2 className="w-4 h-4" />
                  : <Save className="w-4 h-4" />}
              {saving ? t("adminSozlamalar.savingLabel") : saved ? t("adminSozlamalar.savedLabel") : t("adminSozlamalar.saveSettingsBtn")}
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
