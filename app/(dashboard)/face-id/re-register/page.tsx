"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Send, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"
import { faceApi } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"

export default function ReRegisterPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const REASONS = [
    t("reRegister.reason.expired"),
    t("reRegister.reason.otherPerson"),
    t("reRegister.reason.cameraIssue"),
    t("reRegister.reason.appearanceChanged"),
    t("reRegister.reason.other"),
  ]
  const [selectedReason, setSelectedReason] = useState("")
  const [customReason,   setCustomReason]   = useState("")
  const [loading,        setLoading]        = useState(false)
  const [success,        setSuccess]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  const finalReason = selectedReason === t("reRegister.reason.other") ? customReason : selectedReason

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!finalReason.trim()) return
    setLoading(true)
    setError(null)
    try {
      await faceApi.requestReRegister(finalReason.trim())
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("reRegister.genericError"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-[30px] max-w-[600px]">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-[8px] hover:bg-[#f0f5ff] transition-colors shrink-0"
          style={{ border: "1px solid rgba(1,41,112,0.15)" }}>
          <ArrowLeft className="w-4 h-4" style={{ color: "#0e58a8" }} />
        </button>
        <div>
          <h1 className="text-[24px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {t("reRegister.title")}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("reRegister.subtitle")}
          </p>
        </div>
      </div>

      {success ? (
        <div className="bg-white rounded-[10px] p-8 flex flex-col items-center gap-4 text-center"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#f0fff4" }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: "#22c55e" }} />
          </div>
          <p className="text-lg font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {t("reRegister.submitted")}
          </p>
          <p className="text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("reRegister.submittedDesc")}
          </p>
          <button onClick={() => router.push("/face-id")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
            {t("reRegister.backToFaceId")}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}
          className="bg-white rounded-[10px] p-6 flex flex-col gap-5"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>

          {/* Info */}
          <div className="flex items-start gap-3 p-3 rounded-[8px]"
            style={{ backgroundColor: "#f0f5ff", border: "1px solid rgba(14,88,168,0.2)" }}>
            <RefreshCw className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#0e58a8" }} />
            <p className="text-xs" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {t("reRegister.infoNotice")}
            </p>
          </div>

          {/* Reason selection */}
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {t("reRegister.selectReason")} <span style={{ color: "#ef4444" }}>*</span>
            </p>
            <div className="flex flex-col gap-2">
              {REASONS.map(r => (
                <label key={r}
                  className="flex items-center gap-3 p-3 rounded-[8px] cursor-pointer transition-colors"
                  style={{
                    border: selectedReason === r
                      ? "1.5px solid #0e58a8"
                      : "1px solid rgba(1,41,112,0.15)",
                    backgroundColor: selectedReason === r ? "#f0f5ff" : "#fff",
                  }}>
                  <input type="radio" name="reason" value={r}
                    checked={selectedReason === r}
                    onChange={() => setSelectedReason(r)}
                    className="accent-[#0e58a8]" />
                  <span className="text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{r}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom reason */}
          {selectedReason === t("reRegister.reason.other") && (
            <div>
              <p className="text-sm font-medium mb-1.5" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {t("reRegister.writeReason")} <span style={{ color: "#ef4444" }}>*</span>
              </p>
              <textarea rows={3} value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder={t("reRegister.reasonPlaceholder")}
                className="w-full px-3 py-2.5 rounded-[8px] text-sm resize-none outline-none"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#012970", fontFamily: "var(--font-poppins)" }} />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-[8px]"
              style={{ backgroundColor: "#fff5f5", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "#ef4444" }} />
              <p className="text-sm" style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }}>{error}</p>
            </div>
          )}

          <button type="submit"
            disabled={!finalReason.trim() || loading}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-[8px] text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
            <Send className="w-4 h-4" />
            {loading ? t("reRegister.submitting") : t("reRegister.submit")}
          </button>
        </form>
      )}
    </div>
  )
}
