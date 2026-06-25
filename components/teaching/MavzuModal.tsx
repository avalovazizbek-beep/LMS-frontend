"use client"

import { useState } from "react"
import {
  Video, Music, BookOpen, HelpCircle, ClipboardList, Library,
  Upload, Trash2, CheckCircle2, Loader2, ExternalLink,
} from "lucide-react"
import { teachingApi, type TeacherContent } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Modal } from "@/components/ui/Modal"
import { Loading, ApiError } from "@/components/ui/ApiState"
import { QuestionsModal } from "@/components/teaching/QuestionsModal"

interface MavzuModalProps {
  open: boolean
  onClose: () => void
  topicKey: string
  topicName: string
  groupId: number
  subjectName: string
}

const labelStyle = { color: "#7293b9", fontFamily: "var(--font-poppins)" } as const
const titleStyle = { color: "#012970", fontFamily: "var(--font-poppins)" } as const

function UploadSection({
  icon, title, description, item, accept, noFile, uploading, progress, disabled, disabledMessage,
  onUpload, onCreate, onDelete, extra,
}: {
  icon: React.ReactNode
  title: string
  description: string
  item?: TeacherContent
  accept: string
  /** Fayl shart emas — bosilganda to'g'ridan-to'g'ri yozuv yaratiladi (masalan Test) */
  noFile?: boolean
  uploading: boolean
  /** Yuklash foizi (0-100), faqat fayl yuklanayotganda */
  progress?: number | null
  disabled?: boolean
  disabledMessage?: string
  onUpload: (file: File) => void
  onCreate?: () => void
  onDelete: () => void
  extra?: React.ReactNode
}) {
  return (
    <div className="rounded-[10px] p-4 flex flex-col gap-2"
      style={{ border: "1px solid rgba(1,41,112,0.1)", opacity: disabled ? 0.55 : 1 }}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold" style={titleStyle}>{title}</span>
        {item && <CheckCircle2 className="w-4 h-4 ml-auto" style={{ color: "#22c55e" }} />}
      </div>
      <p className="text-xs" style={labelStyle}>{description}</p>

      {disabled ? (
        <p className="text-xs px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#fff7ed", color: "#92400e", fontFamily: "var(--font-poppins)" }}>
          {disabledMessage}
        </p>
      ) : item ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#f6f9ff" }}>
          <span className="text-sm truncate" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            {item.file?.originalName ?? item.title}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {item.file && (
              <a href={teachingApi.fileUrl(item.file.url)} target="_blank" rel="noreferrer"
                className="p-1.5 rounded hover:bg-white transition-colors">
                <ExternalLink className="w-4 h-4" style={{ color: "#0e58a8" }} />
              </a>
            )}
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-white transition-colors">
              <Trash2 className="w-4 h-4" style={{ color: "#dc2626" }} />
            </button>
          </div>
        </div>
      ) : noFile ? (
        <button onClick={onCreate} disabled={uploading}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-[6px] text-sm font-medium w-fit transition-colors hover:bg-[#f6f9ff] disabled:opacity-60"
          style={{ border: "1px dashed rgba(1,41,112,0.25)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Yaratilmoqda..." : "Test yaratish"}
        </button>
      ) : uploading ? (
        <div className="flex flex-col gap-1.5 w-full max-w-[260px]">
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            Yuklanmoqda... {progress != null ? `${progress}%` : ""}
          </div>
          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#eef4ff" }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${progress ?? 0}%`, backgroundColor: "#0e58a8" }} />
          </div>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-[6px] text-sm font-medium cursor-pointer w-fit transition-colors hover:bg-[#f6f9ff]"
          style={{ border: "1px dashed rgba(1,41,112,0.25)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
          <Upload className="w-4 h-4" />
          Fayl yuklash
          <input type="file" accept={accept} className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
        </label>
      )}

      {extra}
    </div>
  )
}

export function MavzuModal({ open, onClose, topicKey, topicName, groupId, subjectName }: MavzuModalProps) {
  const { data, loading, error, refetch } = useApi(
    () => teachingApi.contentByTopic({ topicKey, groupId }),
    [topicKey, groupId, open]
  )
  const items = data?.data ?? []

  const [uploadingKind, setUploadingKind] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [opErr, setOpErr] = useState<string | null>(null)
  const [showQuestions, setShowQuestions] = useState(false)

  const video = items.find(i => i.type === "mavzu" && i.kind === "video_lesson")
  const audio = items.find(i => i.type === "mavzu" && i.kind === "audio")
  const theory = items.find(i => i.type === "mavzu" && i.kind === "theory")
  const qollanma = items.find(i => i.type === "mavzu" && i.kind === "qollanma")
  const test = items.find(i => i.type === "exam")
  const assignment = items.find(i => i.type === "assignment")

  const now = () => new Date().toISOString()

  async function upload(kind: string, type: "mavzu" | "exam" | "assignment", file: File | null) {
    setOpErr(null)
    setUploadingKind(kind)
    setUploadProgress(file ? 0 : null)
    try {
      await teachingApi.createContent({
        type,
        groupId,
        subjectName,
        topicKey,
        title: topicName,
        kind,
        availableFrom: now(),
        docFile: file,
        onUploadProgress: file ? setUploadProgress : undefined,
      })
      await refetch()
    } catch (err) {
      setOpErr(err instanceof Error ? err.message : "Yuklashda xatolik yuz berdi")
    } finally {
      setUploadingKind(null)
      setUploadProgress(null)
    }
  }

  async function remove(item?: TeacherContent) {
    if (!item) return
    setOpErr(null)
    try {
      await teachingApi.removeContent(item.id)
      await refetch()
    } catch (err) {
      setOpErr(err instanceof Error ? err.message : "O'chirishda xatolik yuz berdi")
    }
  }

  return (
    <Modal open={open} title={topicName} onClose={onClose} maxWidth={620}>
      {loading ? (
        <Loading />
      ) : error ? (
        <ApiError message={error} onRetry={refetch} />
      ) : (
        <div className="flex flex-col gap-3">
          {opErr && (
            <div className="text-sm px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
              {opErr}
            </div>
          )}

          <UploadSection
            icon={<Video className="w-4 h-4" style={{ color: "#0e58a8" }} />}
            title="Video"
            description="Mavzu bo'yicha video dars"
            item={video}
            accept="video/*"
            uploading={uploadingKind === "video_lesson"}
            progress={uploadingKind === "video_lesson" ? uploadProgress : null}
            onUpload={f => upload("video_lesson", "mavzu", f)}
            onDelete={() => remove(video)}
          />

          <UploadSection
            icon={<Music className="w-4 h-4" style={{ color: "#0e58a8" }} />}
            title="Audio"
            description="Mavzu bo'yicha audio material"
            item={audio}
            accept="audio/*"
            uploading={uploadingKind === "audio"}
            progress={uploadingKind === "audio" ? uploadProgress : null}
            onUpload={f => upload("audio", "mavzu", f)}
            onDelete={() => remove(audio)}
          />

          <UploadSection
            icon={<BookOpen className="w-4 h-4" style={{ color: "#0e58a8" }} />}
            title="Taqdimot (Prezentatsiya)"
            description="Talaba video ko'rgandan keyin ochiladi — PDF, PPT, PPTX"
            item={theory}
            accept=".pdf,.ppt,.pptx"
            uploading={uploadingKind === "theory"}
            progress={uploadingKind === "theory" ? uploadProgress : null}
            onUpload={f => upload("theory", "mavzu", f)}
            onDelete={() => remove(theory)}
          />

          <UploadSection
            icon={<Library className="w-4 h-4" style={{ color: "#0e58a8" }} />}
            title="Qo'llanma (Adabiyotlar)"
            description="Qo'shimcha adabiyot va materiallar — PDF, Word, ZIP"
            item={qollanma}
            accept=".pdf,.doc,.docx,.zip,.rar"
            uploading={uploadingKind === "qollanma"}
            progress={uploadingKind === "qollanma" ? uploadProgress : null}
            onUpload={f => upload("qollanma", "mavzu", f)}
            onDelete={() => remove(qollanma)}
          />

          <UploadSection
            icon={<HelpCircle className="w-4 h-4" style={{ color: "#0e58a8" }} />}
            title="Test"
            description="MCQ test — yuklansa, shu mavzu uchun Topshiriq bloklanadi"
            item={test}
            accept=""
            noFile
            uploading={uploadingKind === "test"}
            disabled={!!assignment && !test}
            disabledMessage="Bu mavzuga Topshiriq yuklangan — Test qo'shib bo'lmaydi"
            onUpload={() => {}}
            onCreate={() => upload("test", "exam", null)}
            onDelete={() => remove(test)}
            extra={test && (
              <>
                <button onClick={() => setShowQuestions(true)}
                  className="px-3 py-2 rounded-[6px] text-sm font-medium w-fit transition-colors hover:bg-[#f6f9ff]"
                  style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                  Savollarni tahrirlash
                </button>
                {showQuestions && (
                  <QuestionsModal content={test} onClose={() => setShowQuestions(false)} onSaved={refetch} />
                )}
              </>
            )}
          />
          <UploadSection
            icon={<ClipboardList className="w-4 h-4" style={{ color: "#0e58a8" }} />}
            title="Topshiriq"
            description="Talaba bajarib topshiradigan vazifa fayli"
            item={assignment}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar"
            uploading={uploadingKind === "assignment"}
            progress={uploadingKind === "assignment" ? uploadProgress : null}
            disabled={!!test && !assignment}
            disabledMessage="Bu mavzuga Test yuklangan — Topshiriq qo'shib bo'lmaydi"
            onUpload={f => upload("assignment", "assignment", f)}
            onDelete={() => remove(assignment)}
          />
        </div>
      )}
    </Modal>
  )
}
