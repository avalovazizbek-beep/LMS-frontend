"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"
import { teachingApi } from "@/lib/api"
import { Loading, ApiError } from "@/components/ui/ApiState"

const inputCls =
  "w-full px-3 py-2.5 rounded-[8px] text-sm border border-[#d8e6f7] focus:border-[#0e58a8] focus:outline-none transition-colors"
const labelCls = "text-sm font-semibold mb-1.5 block"

const TASK_TYPE_OPTIONS = [
  "Kurs ishi (loyihasi)",
  "Malaka amaliyoti",
  "Amaliy topshiriq",
  "Yozma ish",
  "Test",
]

const CONTROL_TYPE_OPTIONS = ["Umumiy", "Joriy nazorat", "Oraliq nazorat", "Yakuniy nazorat"]

const LANGUAGE_OPTIONS = ["O'zbek", "Rus", "Ingliz"]

function toLocalDateTime(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalDateTime(value: string): string | null {
  if (!value.trim()) return null
  const normalized = value.trim().replace(" ", "T")
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export default function YangiKursTopshirigiPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const groupId = searchParams.get("group") ?? ""
  const groupNames = searchParams.get("groupNames") ?? ""
  const trainingName = searchParams.get("trainingName") ?? ""
  const semester = searchParams.get("semester") ?? ""
  const name = searchParams.get("name") ?? ""
  const editId = searchParams.get("id") ?? ""

  const semesterLabel = useMemo(() => {
    const code = Number(semester)
    return Number.isFinite(code) && code >= 11 && code <= 20 ? `${code - 10}-semestr` : ""
  }, [semester])

  const breadcrumbDetails = [trainingName, semesterLabel, groupNames].filter(Boolean).join(" | ")

  const detailHref = `/oqituvchi-kabineti/kurs-topshiriqlari?${searchParams.toString()}`

  const [taskType, setTaskType] = useState("")
  const [controlType, setControlType] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [deadline, setDeadline] = useState("")
  const [maxScore, setMaxScore] = useState("100")
  const [attemptsCount, setAttemptsCount] = useState("")
  const [language, setLanguage] = useState("O'zbek")
  const [docFiles, setDocFiles] = useState<File[]>([])

  const [loading, setLoading] = useState(Boolean(editId))
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!editId) return
    let cancelled = false
    setLoading(true)
    teachingApi.contentItem(editId)
      .then((res) => {
        if (cancelled) return
        const item = res.data
        if (!item) return
        setTaskType(item.kind ?? "")
        setControlType(item.controlType ?? "")
        setTitle(item.title)
        setDescription(item.description ?? "")
        setDeadline(toLocalDateTime(item.deadline))
        setMaxScore(item.maxScore != null ? String(item.maxScore) : "100")
        setAttemptsCount(item.attemptsCount != null ? String(item.attemptsCount) : "")
        setLanguage(item.language ?? "O'zbek")
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Yuklashda xatolik")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [editId])

  async function handleSubmit() {
    setFormError(null)
    if (!title.trim()) { setFormError("Nomini kiriting"); return }

    const deadlineIso = fromLocalDateTime(deadline)
    if (deadline.trim() && !deadlineIso) { setFormError("Muddat formati noto'g'ri (YYYY-MM-DD H:M)"); return }

    setSaving(true)
    try {
      if (editId) {
        await teachingApi.updateContent(editId, {
          title: title.trim(),
          description: description.trim() || null,
          kind: taskType || null,
          controlType: controlType || null,
          deadline: deadlineIso,
          maxScore: maxScore ? Number(maxScore) : null,
          attemptsCount: attemptsCount ? Number(attemptsCount) : null,
          language: language || null,
        })
        for (const file of docFiles) {
          await teachingApi.addContentFile(editId, file)
        }
      } else {
        const res = await teachingApi.createContent({
          type: "kurs-topshiriq",
          groupId: groupId || 0,
          subjectName: name,
          title: title.trim(),
          description: description.trim() || undefined,
          kind: taskType || undefined,
          controlType: controlType || undefined,
          availableFrom: new Date().toISOString(),
          deadline: deadlineIso,
          maxScore: maxScore ? Number(maxScore) : null,
          attemptsCount: attemptsCount ? Number(attemptsCount) : null,
          language: language || undefined,
          docFile: docFiles[0] ?? null,
        })
        const newId = res.data?.id
        if (newId) {
          for (const file of docFiles.slice(1)) {
            await teachingApi.addContentFile(newId, file)
          }
        }
      }
      router.push(detailHref)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Saqlashda xatolik yuz berdi")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />
  if (loadError) return <ApiError message={loadError} />

  return (
    <div className="flex flex-col gap-5 p-[30px]">
      <div className="flex items-center gap-2 text-sm flex-wrap" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
        <Link href="/dashboard" className="hover:underline">Asosiy</Link>
        <span>/</span>
        <Link href="/oqituvchi-kabineti/kurs-topshiriqlar" className="hover:underline">Kurs topshiriqlari</Link>
        {name && (
          <>
            <span>/</span>
            <Link href={detailHref} className="hover:underline">
              {name}{breadcrumbDetails ? ` (${breadcrumbDetails})` : ""}
            </Link>
          </>
        )}
        <span>/</span>
        <span style={{ color: "#012970" }}>{editId ? "Topshiriqni tahrirlash" : "Yangi topshiriq yaratish"}</span>
      </div>

      <div className="rounded-[10px] bg-white" style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 5px rgba(1,41,112,0.08)" }}>
        <div className="p-4" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
          <h1 className="text-base font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            Topshiriq ma&apos;lumoti
          </h1>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {formError && (
            <div className="text-sm px-3 py-2 rounded-[6px]" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontFamily: "var(--font-poppins)" }}>
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Topshiriq turi</label>
              <select
                className={inputCls}
                style={{ fontFamily: "var(--font-poppins)" }}
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
              >
                <option value="">Topshiriq turini tanlang</option>
                {TASK_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Nazorat turi</label>
              <select
                className={inputCls}
                style={{ fontFamily: "var(--font-poppins)" }}
                value={controlType}
                onChange={(e) => setControlType(e.target.value)}
              >
                <option value="">Nazorat turini tanlang</option>
                {CONTROL_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              Nomi <sup style={{ color: "#dc2626" }}>°</sup>
            </label>
            <input
              className={inputCls}
              style={{ fontFamily: "var(--font-poppins)" }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Izoh</label>
            <textarea
              className={inputCls}
              style={{ fontFamily: "var(--font-poppins)", minHeight: 90 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Muddat</label>
            <div className="flex items-stretch gap-0">
              <input
                className={`${inputCls} rounded-r-none`}
                style={{ fontFamily: "var(--font-poppins)", backgroundColor: "#f3f6fb" }}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="YYYY-MM-DD H:M"
              />
              <input
                type="datetime-local"
                className="px-2 border-y border-r border-[#d8e6f7] text-sm outline-none"
                style={{ fontFamily: "var(--font-poppins)" }}
                onChange={(e) => {
                  const value = e.target.value
                  if (!value) return
                  setDeadline(value.replace("T", " "))
                }}
              />
              <button
                type="button"
                onClick={() => setDeadline("")}
                className="px-3 border-y border-r border-[#d8e6f7] rounded-r-[8px] flex items-center justify-center"
                style={{ backgroundColor: "#f3f6fb" }}
                title="Tozalash"
              >
                <X className="w-4 h-4" style={{ color: "#7293b9" }} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Maks. ball</label>
              <input
                type="number"
                className={inputCls}
                style={{ fontFamily: "var(--font-poppins)" }}
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Urinishlar soni</label>
              <input
                type="number"
                className={inputCls}
                style={{ fontFamily: "var(--font-poppins)" }}
                value={attemptsCount}
                onChange={(e) => setAttemptsCount(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Til</label>
              <select
                className={inputCls}
                style={{ fontFamily: "var(--font-poppins)" }}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>Fayl nomi</label>
            <div className="flex flex-wrap gap-3">
              <label
                className="flex flex-col items-center justify-center gap-2 w-[180px] h-[140px] rounded-[8px] border-2 border-dashed cursor-pointer transition-colors"
                style={{ borderColor: "#cbd5e1", backgroundColor: "#fafbfd" }}
              >
                <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e2e8f0" }}>
                  <span className="text-2xl leading-none" style={{ color: "#94a3b8" }}>+</span>
                </span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? [])
                    if (selected.length) setDocFiles((prev) => [...prev, ...selected])
                    e.target.value = ""
                  }}
                />
              </label>
              {docFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="relative flex flex-col items-center justify-center gap-2 w-[180px] h-[140px] rounded-[8px] border-2 border-dashed"
                  style={{ borderColor: "#cbd5e1", backgroundColor: "#fafbfd" }}
                >
                  <button
                    type="button"
                    onClick={() => setDocFiles((prev) => prev.filter((_, i) => i !== index))}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full hover:bg-[#fee2e2]"
                    title="O'chirish"
                  >
                    <X className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
                  </button>
                  <span className="text-xs text-center px-2 break-all" style={{ color: "#445b7a", fontFamily: "var(--font-poppins)" }}>
                    {file.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4" style={{ borderTop: "1px solid rgba(1,41,112,0.08)" }}>
          <Link
            href={detailHref}
            className="px-4 py-2 rounded-[8px] text-sm font-medium"
            style={{ color: "#445b7a", border: "1px solid #d8e6f7", fontFamily: "var(--font-poppins)" }}
          >
            Bekor qilish
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-[8px] text-sm font-medium"
            style={{ backgroundColor: "#0e58a8", color: "#fff", fontFamily: "var(--font-poppins)", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </div>
  )
}
