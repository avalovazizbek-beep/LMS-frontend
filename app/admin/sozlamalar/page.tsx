"use client"

import { useEffect, useState } from "react"
import { Settings, RefreshCw, Save, ShieldAlert, FileText, CheckCircle2 } from "lucide-react"
import { adminApi } from "@/lib/api"

export default function AdminSozlamalar() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [faceThreshold, setFaceThreshold] = useState("3")
  const [testAttempts, setTestAttempts] = useState("1")

  function load() {
    setLoading(true)
    adminApi.getSettings()
      .then(res => {
        const d = res.data ?? {}
        setSettings(d)
        setFaceThreshold(d.face_block_threshold ?? "3")
        setTestAttempts(d.test_max_attempts ?? "1")
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
    <div className="flex flex-col gap-6 p-8 max-w-[700px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Tizim sozlamalari
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            Imtihon va xavfsizlik parametrlarini sozlash
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px]"
          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Yangilash
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
                  Face ID xato chegarasi
                </div>
                <div className="text-xs mt-0.5 leading-5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  Imtihon davomida yuz tekshiruvi shu marta xato bo'lsa, talaba imtihondan bloklanadi.
                  Hozirgi qiymat: <strong>{settings.face_block_threshold ?? "3"}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium shrink-0" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                Xatolar soni:
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
                (1–20 oralig'ida)
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
                  Test urinish soni
                </div>
                <div className="text-xs mt-0.5 leading-5" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  Talaba testni necha marta topshira oladi. Hozirgi qiymat: <strong>{settings.test_max_attempts ?? "1"}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium shrink-0" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                Urinishlar:
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
                (1–10 oralig'ida)
              </span>
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
              {saving ? "Saqlanmoqda…" : saved ? "Saqlandi!" : "Sozlamalarni saqlash"}
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
