"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import {
  Lock, CheckCircle2, Clock, Download, Paperclip, X, Loader2, Send, AlertCircle,
  Video, Link as LinkIcon, FileText,
} from "lucide-react"
import { teachingApi, type TeacherContent, type TeachingSubmission, type ContentStatus } from "@/lib/api"
import { useApi } from "@/hooks/useApi"

const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string; bg: string; Icon: typeof Lock }> = {
  locked: { label: "Qulflangan", color: "#b91c1c", bg: "#fef2f2", Icon: Lock },
  open:   { label: "Ochiq",      color: "#15803d", bg: "#f0fdf4", Icon: CheckCircle2 },
  closed: { label: "Muddat tugagan", color: "#92400e", bg: "#fffbeb", Icon: Clock },
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function isVideoFile(mimeType: string, name: string): boolean {
  return mimeType.startsWith("video/") || /\.(mp4|avi|mov|mkv|webm)$/i.test(name)
}

interface SubmitState {
  file: File | null
  comment: string
  loading: boolean
  error: string | null
  success: boolean
}

const defaultSubmit = (): SubmitState => ({ file: null, comment: "", loading: false, error: null, success: false })

interface Props {
  item: TeacherContent
  /** assignment/exam — talaba topshirishi mumkin bo'lgan turlar */
  submittable?: boolean
}

export function StudentContentCard({ item, submittable = false }: Props) {
  const st = STATUS_CONFIG[item.status]
  const locked = item.status === "locked"

  const shouldFetchSubmission = submittable && !locked
  const { data: subRes, loading: subLoading, refetch: refetchSubmission } = useApi(
    () => (shouldFetchSubmission ? teachingApi.mySubmission(item.id) : Promise.resolve({ success: true, data: null })),
    [item.id, shouldFetchSubmission]
  )
  const mySubmission: TeachingSubmission | null = subRes?.data ?? null

  const [formOpen, setFormOpen] = useState(false)
  const [sub, setSub] = useState<SubmitState>(defaultSubmit())
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const canSubmit = submittable && item.status === "open"

  async function handleSubmit() {
    if (!sub.file && !sub.comment.trim()) {
      setSub(prev => ({ ...prev, error: "Fayl yoki izoh kiriting" }))
      return
    }
    setSub(prev => ({ ...prev, loading: true, error: null }))
    try {
      await teachingApi.submit(item.id, { file: sub.file, comment: sub.comment || undefined })
      setSub(prev => ({ ...prev, loading: false, success: true }))
      setTimeout(() => {
        setFormOpen(false)
        setSub(defaultSubmit())
        refetchSubmission()
      }, 1500)
    } catch (err) {
      setSub(prev => ({ ...prev, loading: false, error: err instanceof Error ? err.message : "Yuborishda xatolik" }))
    }
  }

  return (
    <div className="bg-white rounded-[10px] overflow-hidden"
      style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.05)" }}>
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: st.bg }}>
              <st.Icon className="w-5 h-5" style={{ color: st.color }} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                {item.title}
              </h3>
              {!locked && item.description && (
                <p className="text-xs mt-1 line-clamp-2" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {item.description}
                </p>
              )}
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold shrink-0"
            style={{ backgroundColor: st.bg, color: st.color, border: `1px solid ${st.color}`, fontFamily: "var(--font-poppins)" }}>
            {st.label}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
          {locked ? (
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Ochiladi: <strong style={{ color: "#012970" }}>{formatDateTime(item.availableFrom)}</strong>
            </span>
          ) : (
            <>
              <span>Ochilgan: <strong style={{ color: "#012970" }}>{formatDateTime(item.availableFrom)}</strong></span>
              {item.deadline && (
                <span className="flex items-center gap-1">
                  {item.status === "closed" && <AlertCircle className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />}
                  Muddat: <strong style={{ color: item.status === "closed" ? "#ef4444" : "#012970" }}>{formatDateTime(item.deadline)}</strong>
                </span>
              )}
              {item.maxScore != null && <span>Maks. ball: <strong style={{ color: "#012970" }}>{item.maxScore}</strong></span>}
              {item.durationMinutes != null && <span>Davomiyligi: <strong style={{ color: "#012970" }}>{item.durationMinutes} daq.</strong></span>}
            </>
          )}
        </div>

        {locked && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-[8px]" style={{ backgroundColor: "#fef2f2" }}>
            <Lock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#b91c1c" }} />
            <p className="text-xs" style={{ color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
              Bu kontent hali ochilmagan. Belgilangan vaqtda mavjud bo&apos;ladi.
            </p>
          </div>
        )}

        {!locked && (item.docFile || item.videoFile || item.meetingLink) && (
          <div className="flex flex-col gap-2">
            {/* Hujjat fayli */}
            {item.docFile && (
              <a href={teachingApi.fileUrl(item.docFile.url)} target="_blank" rel="noreferrer" download
                className="flex items-center gap-2 w-fit px-3 py-2 rounded-[6px] text-xs font-medium"
                style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <FileText className="w-3.5 h-3.5" />
                {item.docFile.originalName}
              </a>
            )}

            {/* Video darslik */}
            {item.videoFile && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#7c3aed", fontFamily: "var(--font-poppins)" }}>
                  <Video className="w-3.5 h-3.5" />
                  Video darslik
                </div>
                <video controls preload="metadata" className="aspect-video w-full rounded-[8px] bg-black"
                  src={teachingApi.fileUrl(item.videoFile.url)} />
              </div>
            )}

            {/* Online meeting */}
            {item.meetingLink && (
              <a
                href={item.meetingLink.startsWith("http") ? item.meetingLink : `https://${item.meetingLink}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-2 w-fit px-3 py-2 rounded-[6px] text-xs font-medium"
                style={{ backgroundColor: "#ecfeff", color: "#0891b2", fontFamily: "var(--font-poppins)" }}>
                <LinkIcon className="w-3.5 h-3.5" />
                Online darsg&apos;a kirish
              </a>
            )}
          </div>
        )}

        {!locked && submittable && item.type === "exam" && item.questionCount > 0 && (
          <div className="pt-3" style={{ borderTop: "1px solid rgba(1,41,112,0.06)" }}>
            {subLoading ? (
              <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Yuklanmoqda…</p>
            ) : mySubmission ? (() => {
              const maxAttempts = item.attemptsCount && item.attemptsCount > 0 ? item.attemptsCount : null
              const used = mySubmission.attemptsUsed ?? 1
              const passThreshold = (item.maxScore && item.maxScore > 0) ? item.maxScore * 0.6 : 60
              const alreadyPassed = mySubmission.grade !== null && mySubmission.grade !== undefined && mySubmission.grade >= passThreshold
              const canRetry = !alreadyPassed && item.status === "open" && (maxAttempts === null || used < maxAttempts)
              return (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />
                    <span className="text-xs font-medium" style={{ color: "#22c55e", fontFamily: "var(--font-poppins)" }}>
                      Topshirildi: {formatDateTime(mySubmission.submittedAt)}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                      Natija: {mySubmission.grade}{item.maxScore ? ` / ${item.maxScore}` : ""}
                    </span>
                    {maxAttempts !== null && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                        {used}/{maxAttempts} urinish
                      </span>
                    )}
                  </div>
                  {canRetry && (
                    <Link href={`/imtihonlar/${item.id}`}
                      className="flex items-center gap-2 w-fit px-4 py-2 rounded-[8px] text-sm font-medium"
                      style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                      <Send className="w-4 h-4" /> Qayta topshirish ({maxAttempts! - used} urinish qoldi)
                    </Link>
                  )}
                  {!canRetry && alreadyPassed && (
                    <p className="text-xs font-medium" style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                      ✓ Test muvaffaqiyatli topshirildi
                    </p>
                  )}
                  {!canRetry && !alreadyPassed && maxAttempts !== null && used >= maxAttempts && (
                    <p className="text-xs" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
                      Barcha {maxAttempts} ta urinish ishlatildi
                    </p>
                  )}
                </div>
              )
            })() : item.status === "open" ? (
              <Link href={`/imtihonlar/${item.id}`}
                className="flex items-center gap-2 w-fit px-4 py-2 rounded-[8px] text-sm font-medium"
                style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                <Send className="w-4 h-4" /> Imtihonni boshlash
              </Link>
            ) : (
              <p className="text-xs" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
                Topshirish muddati tugagan — siz ulgurmadingiz.
              </p>
            )}
          </div>
        )}

        {!locked && submittable && !(item.type === "exam" && item.questionCount > 0) && (
          <div className="pt-3" style={{ borderTop: "1px solid rgba(1,41,112,0.06)" }}>
            {subLoading ? (
              <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>Yuklanmoqda…</p>
            ) : mySubmission ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />
                  <span className="text-xs font-medium" style={{ color: "#22c55e", fontFamily: "var(--font-poppins)" }}>
                    Topshirilgan: {formatDateTime(mySubmission.submittedAt)}
                  </span>
                  {mySubmission.grade != null && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontFamily: "var(--font-poppins)" }}>
                      Baho: {mySubmission.grade}{item.maxScore ? ` / ${item.maxScore}` : ""}
                    </span>
                  )}
                </div>
                {mySubmission.comment && (
                  <p className="text-xs" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{mySubmission.comment}</p>
                )}
                {mySubmission.file && (
                  <a href={teachingApi.fileUrl(mySubmission.file.url)} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 w-fit px-2.5 py-1.5 rounded-[5px] text-xs"
                    style={{ backgroundColor: "#f0f5ff", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                    <Paperclip className="w-3.5 h-3.5" />
                    {mySubmission.file.originalName}
                  </a>
                )}
                {mySubmission.feedback && (
                  <p className="text-xs italic" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                    O&apos;qituvchi izohi: {mySubmission.feedback}
                  </p>
                )}
                {canSubmit && (
                  <button onClick={() => setFormOpen(o => !o)}
                    className="w-fit text-xs font-medium px-3 py-1.5 rounded-[6px] mt-1"
                    style={{ color: "#0e58a8", border: "1px solid #d8e6f7", fontFamily: "var(--font-poppins)" }}>
                    {formOpen ? "Bekor qilish" : "Qayta topshirish"}
                  </button>
                )}
              </div>
            ) : canSubmit ? (
              <button onClick={() => setFormOpen(o => !o)}
                className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-medium transition-colors"
                style={{
                  backgroundColor: formOpen ? "#f6f9ff" : "#0e58a8",
                  color: formOpen ? "#0e58a8" : "#fff",
                  border: formOpen ? "1px solid rgba(1,41,112,0.2)" : "none",
                  fontFamily: "var(--font-poppins)",
                }}>
                {formOpen ? <><X className="w-4 h-4" /> Bekor qilish</> : <><Send className="w-4 h-4" /> Topshirish</>}
              </button>
            ) : (
              <p className="text-xs" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
                Topshirish muddati tugagan — siz ulgurmadingiz.
              </p>
            )}
          </div>
        )}
      </div>

      {canSubmit && formOpen && !mySubmission && (
        <div className="px-5 pb-5">
          <div className="rounded-[10px] p-4 flex flex-col gap-3" style={{ backgroundColor: "#f6f9ff", border: "1px solid rgba(1,41,112,0.1)" }}>
            {sub.success ? (
              <div className="flex items-center gap-2 py-2">
                <CheckCircle2 className="w-5 h-5" style={{ color: "#22c55e" }} />
                <p className="text-sm font-medium" style={{ color: "#22c55e", fontFamily: "var(--font-poppins)" }}>
                  Muvaffaqiyatli yuborildi!
                </p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                    Fayl (ixtiyoriy)
                  </p>
                  <input ref={fileInputRef} type="file" className="hidden"
                    onChange={e => setSub(prev => ({ ...prev, file: e.target.files?.[0] ?? null, error: null }))} />
                  {sub.file ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-[8px]" style={{ backgroundColor: "#fff", border: "1px solid rgba(1,41,112,0.15)" }}>
                      <Paperclip className="w-4 h-4 shrink-0" style={{ color: "#0e58a8" }} />
                      <span className="text-xs flex-1 truncate" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{sub.file.name}</span>
                      <span className="text-xs shrink-0" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                        {(sub.file.size / 1024).toFixed(0)} KB
                      </span>
                      <button onClick={() => setSub(prev => ({ ...prev, file: null }))}>
                        <X className="w-3.5 h-3.5" style={{ color: "#7293b9" }} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-[8px] text-sm transition-colors hover:opacity-80"
                      style={{ backgroundColor: "#fff", border: "1.5px dashed rgba(14,88,168,0.35)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                      <Paperclip className="w-4 h-4" />
                      Fayl tanlash...
                    </button>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Izoh (ixtiyoriy)</p>
                  <textarea rows={2} value={sub.comment}
                    onChange={e => setSub(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Izoh qoldiring..."
                    className="w-full px-3 py-2 rounded-[8px] text-sm resize-none outline-none"
                    style={{ border: "1px solid rgba(1,41,112,0.15)", color: "#012970", fontFamily: "var(--font-poppins)", backgroundColor: "#fff" }} />
                </div>

                {sub.error && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-[8px]" style={{ backgroundColor: "#fff5f5", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "#ef4444" }} />
                    <p className="text-xs" style={{ color: "#ef4444", fontFamily: "var(--font-poppins)" }}>{sub.error}</p>
                  </div>
                )}

                <button onClick={handleSubmit} disabled={sub.loading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[8px] text-sm font-medium transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)" }}>
                  {sub.loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Yuborilmoqda...</> : <><Send className="w-4 h-4" /> Yuborish</>}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export { formatDateTime, STATUS_CONFIG }
