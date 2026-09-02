"use client"

import { useEffect, useRef, useState } from "react"
import {
  Megaphone, RefreshCw, Send, Paperclip, X, Video, Image as ImageIcon,
  FileText, Trash2, CheckCircle2,
} from "lucide-react"
import { adminApi, type AdminAnnouncement, type AnnouncementAudience } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { Modal } from "@/components/ui/Modal"

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function audienceBadgeColor(audience: AnnouncementAudience) {
  if (audience === "student") return "#0e58a8"
  if (audience === "employee") return "#7c3aed"
  return "#15803d"
}

function mediaIcon(kind: "image" | "video" | "file" | undefined) {
  if (kind === "video") return Video
  if (kind === "image") return ImageIcon
  return FileText
}

export default function AdminElonlar() {
  const { t } = useLanguage()
  const [items, setItems] = useState<AdminAnnouncement[]>([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [audience, setAudience] = useState<AnnouncementAudience>("all")
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  function load() {
    setLoading(true)
    adminApi.announcements()
      .then(res => setItems(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setTitle("")
    setMessage("")
    setAudience("all")
    setFile(null)
    setProgress(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleCreate() {
    setError("")
    if (!title.trim() && !message.trim() && !file) {
      setError(t("adminElonlar.validationMsg"))
      return
    }
    setSaving(true)
    setSaved(false)
    try {
      if (file) {
        setProgress(0)
        await adminApi.uploadAnnouncement(
          file,
          { audience, title: title.trim() || undefined, message: message.trim() || undefined },
          pct => setProgress(pct)
        )
      } else {
        await adminApi.createAnnouncement({
          audience,
          title: title.trim() || undefined,
          message: message.trim() || undefined,
        })
      }
      resetForm()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("adminElonlar.validationMsg"))
    } finally {
      setSaving(false)
      setProgress(null)
    }
  }

  async function handleToggle(id: number) {
    setItems(prev => prev.map(a => (a.id === id ? { ...a, isActive: !a.isActive } : a)))
    try {
      await adminApi.toggleAnnouncement(id)
    } catch {
      load()
    }
  }

  async function handleDelete() {
    if (confirmDeleteId == null) return
    setDeleting(true)
    try {
      await adminApi.deleteAnnouncement(confirmDeleteId)
      setItems(prev => prev.filter(a => a.id !== confirmDeleteId))
      setConfirmDeleteId(null)
    } catch {
      /* error shown by api layer */
    } finally {
      setDeleting(false)
    }
  }

  const audienceOptions: { value: AnnouncementAudience; labelKey: string }[] = [
    { value: "all", labelKey: "adminElonlar.audienceAll" },
    { value: "student", labelKey: "adminElonlar.audienceStudent" },
    { value: "employee", labelKey: "adminElonlar.audienceEmployee" },
  ]

  return (
    <div className="flex flex-col gap-6 p-8 max-w-[900px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold flex items-center gap-2.5" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            <Megaphone className="w-6 h-6" style={{ color: "#0e58a8" }} />
            {t("adminElonlar.pageTitle")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("adminElonlar.pageSubtitle")}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-[8px] shrink-0"
          style={{ backgroundColor: "#eef4ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-[12px] p-6 flex flex-col gap-4"
        style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0 0 6px rgba(1,41,112,0.04)" }}>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("adminElonlar.titleLabel")}
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t("adminElonlar.titlePlaceholder")}
            className="w-full px-3 py-2.5 rounded-[5px] text-sm outline-none"
            style={{ border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)" }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("adminElonlar.messageLabel")}
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t("adminElonlar.messagePlaceholder")}
            rows={4}
            className="w-full px-3 py-2.5 rounded-[5px] text-sm outline-none resize-none"
            style={{ border: "1px solid rgba(1,41,112,0.25)", color: "#012970", fontFamily: "var(--font-poppins)" }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("adminElonlar.audienceLabel")}
          </label>
          <div className="flex gap-2">
            {audienceOptions.map(opt => {
              const active = audience === opt.value
              const color = audienceBadgeColor(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAudience(opt.value)}
                  className="px-4 py-2 rounded-full text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: active ? color : `${color}14`,
                    color: active ? "#fff" : color,
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  {t(opt.labelKey)}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <input ref={fileInputRef} type="file" className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)} />
          {file ? (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-[8px]" style={{ border: "1px solid rgba(1,41,112,0.15)" }}>
              <Paperclip className="w-4 h-4 shrink-0" style={{ color: "#0e58a8" }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{file.name}</div>
                <div className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{formatSize(file.size)}</div>
              </div>
              <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = "" }}
                className="p-1 rounded-full hover:bg-[#f0f5ff] shrink-0">
                <X className="w-4 h-4" style={{ color: "#7293b9" }} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 self-start text-sm font-medium px-4 py-2.5 rounded-[8px]"
              style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              <Paperclip className="w-4 h-4" />
              {t("adminElonlar.filePickBtn")}
            </button>
          )}
        </div>

        {progress !== null && (
          <div style={{ height: 6, backgroundColor: "#e8f0fb", borderRadius: 3 }}>
            <div style={{ height: "100%", borderRadius: 3, backgroundColor: "#0e58a8", width: `${progress}%`, transition: "width 0.2s" }} />
          </div>
        )}

        {error && (
          <div className="text-xs font-medium" style={{ color: "#dc2626", fontFamily: "var(--font-poppins)" }}>{error}</div>
        )}

        <div>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-[8px] disabled:opacity-60 transition-colors"
            style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
            {saving
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : saved
                ? <CheckCircle2 className="w-4 h-4" />
                : <Send className="w-4 h-4" />}
            {saving ? t("adminElonlar.uploadingLabel") : saved ? t("adminElonlar.createdMsg") : t("adminElonlar.createBtn")}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        <div className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
          {t("adminElonlar.listTitle")}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#0e58a8" }} />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-sm py-12 bg-white rounded-[12px]" style={{ color: "#7293b9", border: "1px solid rgba(1,41,112,0.08)", fontFamily: "var(--font-poppins)" }}>
            {t("adminElonlar.emptyState")}
          </div>
        ) : (
          items.map(a => {
            const MediaIcon = mediaIcon(a.file?.mediaKind)
            const badgeColor = audienceBadgeColor(a.audience)
            const audienceLabelKey =
              a.audience === "student" ? "adminElonlar.audienceStudent"
              : a.audience === "employee" ? "adminElonlar.audienceEmployee"
              : "adminElonlar.audienceAll"
            return (
              <div key={a.id} className="bg-white rounded-[12px] p-5 flex items-start gap-4"
                style={{ border: "1px solid rgba(1,41,112,0.08)", boxShadow: "0px 0px 6px rgba(1,41,112,0.04)" }}>
                <div className="w-11 h-11 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#f0f5ff" }}>
                  <MediaIcon className="w-5 h-5" style={{ color: "#0e58a8" }} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.title && (
                      <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{a.title}</span>
                    )}
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${badgeColor}18`, color: badgeColor, fontFamily: "var(--font-poppins)" }}>
                      {t(audienceLabelKey)}
                    </span>
                  </div>
                  {a.message && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{a.message}</p>
                  )}
                  <div className="text-[11px] mt-1.5" style={{ color: "#9db3cf", fontFamily: "var(--font-poppins)" }}>
                    {a.file ? `${a.file.originalName} · ${formatSize(a.file.size)}` : t("adminElonlar.noFileLabel")}
                    {a.createdByName ? ` · ${a.createdByName}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleToggle(a.id)}
                    className="relative w-10 h-5.5 rounded-full transition-colors"
                    style={{ backgroundColor: a.isActive ? "#0e58a8" : "#d8e6f7", height: 22, width: 40 }}
                    aria-label={a.isActive ? t("adminElonlar.activeLabel") : t("adminElonlar.inactiveLabel")}
                  >
                    <span className="absolute top-0.5 rounded-full bg-white transition-transform"
                      style={{ width: 18, height: 18, left: 2, transform: a.isActive ? "translateX(18px)" : "translateX(0px)" }} />
                  </button>
                  <button onClick={() => setConfirmDeleteId(a.id)} className="p-2 rounded-[8px] hover:bg-[#fef2f2] transition-colors">
                    <Trash2 className="w-4 h-4" style={{ color: "#dc2626" }} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <Modal open={confirmDeleteId != null} title={t("adminElonlar.deleteConfirmTitle")} onClose={() => setConfirmDeleteId(null)}>
        <p className="text-sm mb-5" style={{ color: "#516a8f", fontFamily: "var(--font-poppins)" }}>
          {t("adminElonlar.deleteConfirmBody")}
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setConfirmDeleteId(null)}
            className="h-[38px] px-4 rounded-[5px] text-sm transition-colors hover:bg-[#f6f9ff]"
            style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
            {t("common.cancel")}
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="h-[38px] px-5 rounded-[5px] text-sm text-white disabled:opacity-60 transition-opacity"
            style={{ backgroundColor: "#dc2626", fontFamily: "var(--font-poppins)" }}>
            {deleting ? t("adminElonlar.uploadingLabel") : t("adminElonlar.deleteBtn")}
          </button>
        </div>
      </Modal>
    </div>
  )
}
