"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { teachingApi } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"

const inputCls =
  "w-full px-3 py-2 rounded-[5px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none transition-colors text-[#445b7a]"
const labelCls = "text-sm font-medium mb-1.5 block"

const TRAINING_TYPE_OPTIONS = ["Ma'ruza", "Amaliy", "Laboratoriya", "Seminar", "Mustaqil ta'lim"]
const RESOURCE_TYPE_OPTIONS = ["Video material", "Hujjat", "Taqdimot", "Havola", "Audio meeting"]
const LANGUAGE_OPTIONS = ["O'zbek", "Rus", "Ingliz"]

export default function FanResurslariYaratishPage() {
  const router = useRouter()
  const { data, loading, error } = useApi(() => teachingApi.groups(), [])
  const groups = data?.data ?? []

  const [groupId, setGroupId] = useState("")
  const [subjectName, setSubjectName] = useState("")
  const [trainingType, setTrainingType] = useState(TRAINING_TYPE_OPTIONS[0])
  const [title, setTitle] = useState("")
  const [language, setLanguage] = useState(LANGUAGE_OPTIONS[0])
  const [resourceType, setResourceType] = useState(RESOURCE_TYPE_OPTIONS[0])
  const [comment, setComment] = useState("")
  const [url, setUrl] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (loading) return <Loading />
  if (error) return <ApiError message={error} />

  async function handleSave() {
    if (!groupId || !subjectName.trim() || !title.trim()) {
      setFormError("Guruh, fan nomi va sarlavha to'ldirilishi shart")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const [firstFile, ...restFiles] = files
      const created = await teachingApi.createContent({
        type: "lesson",
        groupId,
        subjectName: subjectName.trim(),
        title: title.trim(),
        description: comment.trim() || undefined,
        kind: trainingType,
        resourceType,
        availableFrom: new Date().toISOString(),
        meetingLink: url.trim() || undefined,
        docFile: firstFile ?? null,
      })
      for (const extraFile of restFiles) {
        await teachingApi.addContentFile(created.data.id, extraFile)
      }
      router.push("/xodim/fan-resurslari")
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik yuz berdi")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div className="flex items-center gap-2 text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
        <Link href="/dashboard" className="hover:underline">Asosiy</Link>
        <span>/</span>
        <Link href="/xodim/fan-resurslari" className="hover:underline">Fan resurslari</Link>
        <span>/</span>
        <span style={{ color: "#012970" }}>Yaratish</span>
      </div>

      {formError && (
        <div className="text-sm px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-[10px] bg-white p-5 flex flex-col gap-4"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Guruh</label>
            <select className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
              value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">Guruhni tanlang</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Fan nomi</label>
              <input className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
                value={subjectName} onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Fan nomini kiriting" />
            </div>
            <div>
              <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Mashg'ulot</label>
              <select className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
                value={trainingType} onChange={(e) => setTrainingType(e.target.value)}>
                {TRAINING_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Sarlavha</label>
            <input className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Resurs sarlavhasini kiriting" />
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Til</label>
            <select className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
              value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-[10px] bg-white p-5 flex flex-col gap-4"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Resurs turi</label>
            <select className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
              value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
              {RESOURCE_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Izoh</label>
            <textarea className={inputCls} style={{ fontFamily: "var(--font-poppins)", minHeight: 90 }}
              value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Resurs haqida izoh" />
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Url</label>
            <input className={inputCls} style={{ fontFamily: "var(--font-poppins)" }}
              value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..." />
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Fayllar</label>
            <div className="flex flex-col gap-2">
              {files.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-2 rounded-[5px] border border-[#d8e6f7] bg-[#f6f9ff] px-3 py-2 text-sm text-[#104475]"
                  style={{ fontFamily: "var(--font-poppins)" }}>
                  <span className="truncate">{item.name}</span>
                  <button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                    className="shrink-0 text-xs" style={{ color: "#b91c1c" }}>
                    Olib tashlash
                  </button>
                </div>
              ))}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-[5px] border border-[#d8e6f7] bg-[#f6f9ff] px-3 py-2 text-sm text-[#104475]"
                style={{ fontFamily: "var(--font-poppins)" }}>
                <Plus className="h-4 w-4" />
                Fayllarni qo'shish
                <input type="file" multiple className="hidden"
                  onChange={(e) => setFiles((current) => [...current, ...Array.from(e.target.files ?? [])])} />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 rounded-[5px] bg-[#0e58a8] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          style={{ fontFamily: "var(--font-poppins)" }}>
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </div>
    </div>
  )
}
