"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Clock, ChevronLeft, ChevronRight, CheckCircle2, Flag,
  GraduationCap, RefreshCw, ShieldAlert, Maximize, AlertTriangle,
} from "lucide-react"
import { teachingApi, type ExamQuestionPublic } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import FaceProctor from "@/components/ui/FaceProctor"

type Phase = "intro" | "face_scan" | "exam" | "submitted_now"

export default function ImtihonTopshirish() {
  const params  = useParams<{ id: string }>()
  const router  = useRouter()
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : ""

  const { data: contentRes, loading: lContent, error: eContent } = useApi(() => teachingApi.contentItem(id), [id])
  const content = contentRes?.data ?? null

  const { data: subRes, loading: lSub, refetch: refetchSub } = useApi(() => teachingApi.mySubmission(id), [id])
  const mySubmission = subRes?.data ?? null

  const [attemptKey, setAttemptKey]   = useState(0)

  const { data: questionsRes, loading: lQuestions } = useApi(
    () => (attemptKey > 0 && content?.status === "open" ? teachingApi.questions(id) : Promise.resolve({ success: true, data: [] })),
    [id, content?.status, attemptKey]
  )
  const questions = (questionsRes?.data ?? []) as ExamQuestionPublic[]

  const [phase,         setPhase]         = useState<Phase>("intro")
  const [answers,       setAnswers]       = useState<Record<number, number>>({})
  const [current,       setCurrent]       = useState(0)
  const [flagged,       setFlagged]       = useState<Set<number>>(new Set())
  const [timeLeft,      setTimeLeft]      = useState<number | null>(null)
  const [submitting,    setSubmitting]    = useState(false)
  const submittingRef = useRef(false)   // ikki marta yuborishdan himoya (race condition)
  const [submitError,   setSubmitError]   = useState<string | null>(null)
  const [result,        setResult]        = useState<{ grade: number | null; maxScore: number | null; attemptsUsed: number } | null>(null)
  const [fsExited,      setFsExited]      = useState(false)   // to'liq ekrandan chiqildi
  const [winHidden,     setWinHidden]     = useState(false)   // Alt+Tab: oyna yashirildi

  const phaseRef = useRef<Phase>("intro")
  useEffect(() => { phaseRef.current = phase }, [phase])

  const screenshotOverlayRef = useRef<HTMLDivElement>(null)   // DOM ref — React re-render kutilmaydi
  const contentHideRef       = useRef<HTMLDivElement>(null)   // kontent berkilash (snipping tool uchun)

  const maxAttempts  = content?.attemptsCount && content.attemptsCount > 0 ? content.attemptsCount : null
  const attemptsUsed = mySubmission?.attemptsUsed ?? 0
  const canRetry     = content?.status === "open" && mySubmission !== null && (maxAttempts === null || attemptsUsed < maxAttempts)

  /* ── To'liq ekran lock ────────────────────────────────────────────── */
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement &&
          (phaseRef.current === "exam" || phaseRef.current === "face_scan")) {
        setFsExited(true)
      }
    }
    document.addEventListener("fullscreenchange", onFsChange)
    return () => document.removeEventListener("fullscreenchange", onFsChange)
  }, [])

  function requestFS() {
    document.documentElement.requestFullscreen().catch(() => {})
    setFsExited(false)
  }
  function exitFS() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }

  /* ── Alt+Tab / oyna yashirish aniqlash ───────────────────────────── */
  useEffect(() => {
    if (phase !== "exam" && phase !== "face_scan") return

    // Ref orqali darhol DOM → React re-render'dan tezroq (Snipping Tool uchun kritik)
    function showHideOverlay(show: boolean) {
      const el = contentHideRef.current
      if (el) el.style.display = show ? "flex" : "none"
      // React state ham yangilanadi (qaytish tugmasi uchun)
      setWinHidden(show)
    }

    const onBlur = () => showHideOverlay(true)
    const onHide = () => { if (document.hidden) showHideOverlay(true) }
    // Focus/visibility qaytganda AVTOMATIK yashirmaymiz — faqat "Imtihonga qaytish" tugmasi yashiradi.
    // Shunday qilmasak Win+Shift+S bossa 1 soniya qizarib so'nadi — himoya ishlamaydi.
    window.addEventListener("blur", onBlur)
    document.addEventListener("visibilitychange", onHide)

    // Ekran yozish APIni bloklash — brauzer screen share urinishlarini oldini olish
    try {
      const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia?: unknown }
      if (md && "getDisplayMedia" in md) {
        Object.defineProperty(md, "getDisplayMedia", {
          value: () => Promise.reject(new DOMException("Imtihon vaqtida ekran yozish taqiqlangan", "NotAllowedError")),
          configurable: true, writable: true,
        })
      }
    } catch { /* brauzer ruxsat bermasa ignore */ }

    return () => {
      window.removeEventListener("blur", onBlur)
      document.removeEventListener("visibilitychange", onHide)
    }
  }, [phase])

  /* ── Klaviatura + sichqoncha o'ng tugma bloklash ────────────────── */
  useEffect(() => {
    if (phase !== "exam" && phase !== "face_scan") return
    const blockKey = (e: KeyboardEvent) => {
      if (e.key === "F12") { e.preventDefault(); e.stopPropagation(); return }
      if (e.key === "PrintScreen") {
        e.preventDefault(); e.stopPropagation()
        // Ref orqali to'g'ridan-to'g'ri DOM — React re-render kechikishisiz darhol ko'rsatish
        const el = screenshotOverlayRef.current
        if (el) {
          el.style.display = "flex"
          setTimeout(() => { if (el) el.style.display = "none" }, 3000)
        }
        return
      }
      if (e.ctrlKey && !e.altKey) {
        const k = e.key.toLowerCase()
        if (["c", "u", "p", "a", "s", "r"].includes(k)) { e.preventDefault(); e.stopPropagation(); return }
        if (e.shiftKey && ["i", "j", "c"].includes(k)) { e.preventDefault(); e.stopPropagation(); return }
      }
      if (e.altKey && (e.key === "Tab" || e.key === "F4")) { e.preventDefault(); e.stopPropagation(); return }
    }
    const blockMenu = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation() }
    window.addEventListener("keydown", blockKey, { capture: true })
    document.addEventListener("contextmenu", blockMenu, { capture: true })
    return () => {
      window.removeEventListener("keydown", blockKey, { capture: true })
      document.removeEventListener("contextmenu", blockMenu, { capture: true })
    }
  }, [phase])

  /* ── Imtihon boshqarish ───────────────────────────────────────────── */
  function startExam() {
    setAttemptKey(k => k + 1)
    setAnswers({})
    setCurrent(0)
    setFlagged(new Set())
    setSubmitError(null)
    setResult(null)
    setTimeLeft(content?.durationMinutes ? content.durationMinutes * 60 : null)
    setFsExited(false)
    setWinHidden(false)
    requestFS()
    setPhase("face_scan")
  }

  function handleFirstVerified() {
    if (phaseRef.current === "face_scan") setPhase("exam")
  }

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return   // ref bilan himoya — state race condition'dan xavfsiz
    submittingRef.current = true
    setSubmitting(true)
    setSubmitError(null)
    try {
      const ordered = questions.map((_, i) => answers[i] ?? -1)
      const res = await teachingApi.submitExam(id, ordered)
      setResult({
        grade:        res.data.submission.grade,
        maxScore:     res.data.maxScore,
        attemptsUsed: res.data.submission.attemptsUsed ?? 1,
      })
      setPhase("submitted_now")
      refetchSub()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Yuborishda xatolik yuz berdi")
      setPhase("submitted_now")
    } finally {
      submittingRef.current = false
      setSubmitting(false)
      exitFS()
    }
  }, [questions, answers, id, refetchSub])

  const handleTerminate = useCallback(() => {
    if (phase === "exam" || phase === "face_scan") handleSubmit()
  }, [phase, handleSubmit])

  useEffect(() => {
    if (phase !== "exam" || timeLeft === null) return
    if (timeLeft <= 0) { handleSubmit(); return }
    const t = setInterval(() => setTimeLeft(v => (v === null ? null : v - 1)), 1000)
    return () => clearInterval(t)
  }, [phase, timeLeft, handleSubmit])

  /* ── Umumiy hisob ─────────────────────────────────────────────────── */
  const mm            = timeLeft != null ? String(Math.floor(timeLeft / 60)).padStart(2, "0") : null
  const ss            = timeLeft != null ? String(timeLeft % 60).padStart(2, "0") : null
  const isLow         = timeLeft != null && timeLeft < 300
  const answeredCount = Object.keys(answers).length

  if (lContent || lSub) return <Loading />
  if (eContent)         return <ApiError message={eContent} />
  if (!content)         return <ApiError message="Imtihon topilmadi" />

  /* ── Topshirildi ──────────────────────────────────────────────────── */
  if (phase === "submitted_now") {
    const usedNow      = result?.attemptsUsed ?? (attemptsUsed + 1)
    const canRetryNow  = content.status === "open" && (maxAttempts === null || usedNow < maxAttempts)
    return (
      <div className="min-h-full flex items-center justify-center p-[30px]">
        <div className="bg-white rounded-[10px] p-10 text-center max-w-md w-full"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 20px rgba(1,41,112,0.1)" }}>
          {result ? (
            <>
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: "#22c55e" }} />
              <h2 className="text-2xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
                Imtihon yakunlandi!
              </h2>
              <p className="text-base mt-3 font-semibold" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>
                Natija: {result.grade ?? "—"}{result.maxScore != null ? ` / ${result.maxScore}` : ""}
              </p>
              {maxAttempts !== null && (
                <p className="text-sm mt-1" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                  {usedNow}/{maxAttempts} urinish ishlatildi
                </p>
              )}
            </>
          ) : (
            <ApiError message={submitError ?? "Yuborishda xatolik yuz berdi"} />
          )}
          <div className="flex flex-col gap-3 mt-6">
            {canRetryNow && result && (
              <button onClick={startExam}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-[5px] text-white font-medium"
                style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <RefreshCw className="w-4 h-4" />
                Qayta topshirish ({maxAttempts! - usedNow} urinish qoldi)
              </button>
            )}
            <button onClick={() => router.push("/imtihonlar")}
              className="px-6 py-2.5 rounded-[5px] font-medium"
              style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              Imtihonlarga qaytish
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Allaqachon topshirilgan ──────────────────────────────────────── */
  if (mySubmission && phase === "intro") {
    if (!canRetry) {
      return (
        <div className="min-h-full flex items-center justify-center p-[30px]">
          <div className="bg-white rounded-[10px] p-10 text-center max-w-md w-full"
            style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 20px rgba(1,41,112,0.1)" }}>
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: "#22c55e" }} />
            <h2 className="text-2xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {content.title}
            </h2>
            <p className="text-base mt-3 font-semibold" style={{ color: "#1cc2dc", fontFamily: "var(--font-poppins)" }}>
              Natija: {mySubmission.grade ?? "—"}{content.maxScore != null ? ` / ${content.maxScore}` : ""}
            </p>
            {mySubmission.feedback && (
              <p className="text-sm mt-2" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{mySubmission.feedback}</p>
            )}
            {maxAttempts !== null && (
              <p className="text-sm mt-1" style={{ color: "#92400e", fontFamily: "var(--font-poppins)" }}>
                Barcha {maxAttempts} ta urinish ishlatildi
              </p>
            )}
            <button onClick={() => router.push("/imtihonlar")}
              className="inline-block mt-6 px-6 py-2.5 rounded-[5px] text-white font-medium"
              style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              Imtihonlarga qaytish
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-full flex items-center justify-center p-[30px]">
        <div className="bg-white rounded-[10px] p-10 text-center max-w-md w-full"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 20px rgba(1,41,112,0.1)" }}>
          <GraduationCap className="w-14 h-14 mx-auto mb-4" style={{ color: "#0e58a8" }} />
          <h2 className="text-2xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{content.title}</h2>
          <p className="text-sm mt-2" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{content.subjectName}</p>
          <div className="mt-4 px-4 py-3 rounded-[8px] text-sm"
            style={{ backgroundColor: "#f0fdf4", border: "1px solid rgba(34,197,94,0.2)" }}>
            <span style={{ color: "#15803d", fontFamily: "var(--font-poppins)" }}>
              Oldingi natija: <strong>{mySubmission.grade ?? "—"}{content.maxScore ? ` / ${content.maxScore}` : ""}</strong>
              {maxAttempts !== null && ` · ${attemptsUsed}/${maxAttempts} urinish`}
            </span>
          </div>
          <div className="flex flex-col gap-1 mt-4 text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {content.durationMinutes != null && <span>Davomiyligi: <strong>{content.durationMinutes} daqiqa</strong></span>}
            {content.maxScore != null && <span>Maksimal ball: <strong>{content.maxScore}</strong></span>}
            {maxAttempts !== null && <span>Qolgan urinishlar: <strong>{maxAttempts - attemptsUsed}</strong></span>}
          </div>
          <div className="flex flex-col gap-3 mt-6">
            <button onClick={startExam}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-[5px] text-white font-medium"
              style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              <RefreshCw className="w-4 h-4" /> Qayta topshirish
            </button>
            <button onClick={() => router.push("/imtihonlar")}
              className="px-6 py-2 rounded-[5px] text-sm font-medium"
              style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
              Imtihonlarga qaytish
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Imtihon hali ochiq emas ──────────────────────────────────────── */
  if (content.status !== "open") {
    return (
      <div className="min-h-full flex items-center justify-center p-[30px]">
        <div className="bg-white rounded-[10px] p-10 text-center max-w-md w-full"
          style={{ border: "1px solid rgba(1,41,112,0.1)" }}>
          <GraduationCap className="w-12 h-12 mx-auto mb-3" style={{ color: "#7293b9" }} />
          <p className="text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {content.status === "locked" ? "Bu imtihon hali ochilmagan" : "Bu imtihonning muddati tugagan"}
          </p>
          <button onClick={() => router.push("/imtihonlar")}
            className="inline-block mt-6 px-6 py-2.5 rounded-[5px] text-white font-medium"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            Imtihonlarga qaytish
          </button>
        </div>
      </div>
    )
  }

  /* ── Intro ────────────────────────────────────────────────────────── */
  if (phase === "intro") {
    return (
      <div className="min-h-full flex items-center justify-center p-[30px]">
        <div className="bg-white rounded-[10px] p-10 text-center max-w-md w-full"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 20px rgba(1,41,112,0.1)" }}>
          <GraduationCap className="w-14 h-14 mx-auto mb-4" style={{ color: "#0e58a8" }} />
          <h2 className="text-2xl font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{content.title}</h2>
          <p className="text-sm mt-2" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{content.subjectName}</p>
          <div className="flex flex-col gap-1 mt-4 text-sm" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
            {content.questionCount > 0 && (
              <span>Savollar soni: <strong>
                {(content.questionDisplayCount && content.questionDisplayCount > 0)
                  ? content.questionDisplayCount
                  : content.questionCount}
              </strong></span>
            )}
            {content.durationMinutes != null && <span>Davomiyligi: <strong>{content.durationMinutes} daqiqa</strong></span>}
            {content.maxScore != null && <span>Maksimal ball: <strong>{content.maxScore}</strong></span>}
            {maxAttempts !== null && <span>Urinishlar: <strong>{maxAttempts} marta</strong></span>}
          </div>
          <div className="mt-4 px-4 py-3 rounded-[8px] text-sm"
            style={{ backgroundColor: "#f0f5ff", border: "1px solid rgba(14,88,168,0.15)" }}>
            <p style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)", margin: 0 }}>
              Imtihon to&apos;liq ekran rejimida boshlanadi. Yuz tekshiruvidan o&apos;tganingizdan so&apos;ng savollar ochiladi.
            </p>
          </div>
          <button onClick={startExam}
            className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 rounded-[5px] text-white font-medium"
            style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
            Imtihonni boshlash
          </button>
        </div>
      </div>
    )
  }

  /* ── To'liq ekran overlay (face_scan + exam) ──────────────────────── */
  const q           = phase === "exam" && questions.length > 0 ? questions[current] : null
  const toggleFlag  = () => setFlagged(f => { const n = new Set(f); n.has(current) ? n.delete(current) : n.add(current); return n })

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#f6f9ff", display: "flex", flexDirection: "column", overflow: "hidden", userSelect: "none", WebkitUserSelect: "none" }}>

      {/* === Watermark (skrinshot oldini olish) === */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 10000, pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="260" height="130"><text transform="rotate(-30,130,65)" x="5" y="70" font-size="14" fill="rgba(1,41,112,0.13)" font-family="sans-serif" font-weight="bold">SamISI LMS imtihon nazorati</text></svg>')}")`,
        backgroundRepeat: "repeat",
      }} />

      {/* === PrintScreen bloklash overlay (ref orqali darhol ko'rsatiladi) === */}
      <div ref={screenshotOverlayRef} style={{
        display: "none", position: "fixed", inset: 0, zIndex: 10003,
        flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
        backgroundColor: "rgba(220,38,38,0.95)", backdropFilter: "blur(12px)",
      }}>
        <ShieldAlert className="w-20 h-20" style={{ color: "#fde68a" }} />
        <p style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: 0, fontFamily: "var(--font-poppins)" }}>
          Skrinshot taqiqlangan!
        </p>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, margin: 0, fontFamily: "var(--font-poppins)" }}>
          Imtihon davomida ekran suratga olish taqiqlangan. Bu harakat qayd etildi.
        </p>
      </div>

      {/* === Oynadan chiqildi ogohlantirishlar === */}

      {/* To'liq ekrandan chiqildi */}
      {fsExited && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10002,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          backgroundColor: "rgba(1,41,112,0.88)", backdropFilter: "blur(8px)",
        }}>
          <Maximize className="w-14 h-14 mb-4" style={{ color: "#fff" }} />
          <h2 style={{ color: "#fff", fontFamily: "var(--font-poppins)", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            To&apos;liq ekran rejimi to&apos;xtatildi
          </h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-poppins)", marginBottom: 24 }}>
            Imtihon davomida ekrandan chiqish taqiqlangan
          </p>
          <button onClick={requestFS} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 28px", borderRadius: 8, backgroundColor: "#0e58a8",
            color: "#fff", fontFamily: "var(--font-poppins)", fontWeight: 600, fontSize: 15,
            border: "none", cursor: "pointer",
          }}>
            <Maximize className="w-5 h-5" /> To&apos;liq ekranga qaytish
          </button>
        </div>
      )}

      {/* Alt+Tab / Snipping Tool — ref orqali darhol DOM (React re-render kutilmaydi, Snipping Tool uchun kritik) */}
      <div ref={contentHideRef} style={{
        display: "none", position: "fixed", inset: 0, zIndex: 10002,
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(220,38,38,0.92)", backdropFilter: "blur(12px)",
      }}>
        <AlertTriangle className="w-16 h-16 mb-4" style={{ color: "#fbbf24" }} />
        <h2 style={{ color: "#fff", fontFamily: "var(--font-poppins)", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Ekrandan chiqdingiz!
        </h2>
        <p style={{ color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-poppins)", marginBottom: 24, textAlign: "center" }}>
          Imtihon davomida boshqa oyna yoki dasturga o&apos;tish taqiqlangan
        </p>
        <button onClick={() => {
          const el = contentHideRef.current
          if (el) el.style.display = "none"
          setWinHidden(false)
          window.focus()
        }} style={{
          padding: "12px 28px", borderRadius: 8, backgroundColor: "#fff",
          color: "#dc2626", fontFamily: "var(--font-poppins)", fontWeight: 700, fontSize: 15,
          border: "none", cursor: "pointer",
        }}>
          Imtihonga qaytish
        </button>
      </div>

      {/* === FaceProctor (katta, fixed top-right) === */}
      <FaceProctor
        key={attemptKey}
        fixed
        onFirstVerified={handleFirstVerified}
        onTerminate={handleTerminate}
      >
        {/* ── Yuz tekshiruvi fazasi ───────────────────────────────── */}
        {phase === "face_scan" && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: "100vh", gap: 20, textAlign: "center", padding: 32,
            background: "#f6f9ff",
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: "rgba(14,88,168,0.1)",
            }}>
              <ShieldAlert className="w-10 h-10" style={{ color: "#0e58a8" }} />
            </div>
            <div>
              <h2 style={{ color: "#012970", fontFamily: "var(--font-poppins)", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                Yuz tekshiruvi
              </h2>
              <p style={{ color: "#7293b9", fontFamily: "var(--font-poppins)", fontSize: 14, maxWidth: 380 }}>
                Kameraga qarang — yuzingiz tasdiqlanganidan so&apos;ng imtihon boshlanadi
              </p>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%", backgroundColor: "#0e58a8",
                  animation: `examDotPulse 1.4s ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
            {lQuestions && (
              <p style={{ color: "#b0c4de", fontFamily: "var(--font-poppins)", fontSize: 12 }}>
                Savollar yuklanmoqda...
              </p>
            )}
          </div>
        )}

        {/* ── Imtihon fazasi — ESKI dizayn (chap panel) ──────────── */}
        {phase === "exam" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 24px",
              paddingRight: 234,           /* kamera vidgeti uchun bo'sh joy */
              backgroundColor: "white",
              borderBottom: "1px solid rgba(1,41,112,0.1)",
              flexShrink: 0,
            }}>
              <div>
                <h1 style={{ color: "#012970", fontFamily: "var(--font-poppins)", fontWeight: 700, fontSize: 15, margin: 0 }}>
                  {content.title}
                </h1>
                <p style={{ color: "#7293b9", fontFamily: "var(--font-poppins)", fontSize: 11, margin: 0 }}>
                  {questions.length} ta savol · {answeredCount} ta javoblandi
                </p>
              </div>
              {timeLeft != null && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 14px", borderRadius: 20,
                  backgroundColor: isLow ? "#fff0f0" : "#f0f5ff",
                  border: `1px solid ${isLow ? "rgba(239,68,68,0.3)" : "rgba(14,88,168,0.15)"}`,
                }}>
                  <Clock className="w-4 h-4" style={{ color: isLow ? "#ef4444" : "#0e58a8" }} />
                  <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 15, color: isLow ? "#ef4444" : "#0e58a8" }}>
                    {mm}:{ss}
                  </span>
                </div>
              )}
            </div>

            {/* Asosiy kontent: chap panel + savol maydoni */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

              {/* Chap panel: savol raqamlari */}
              <div style={{
                width: 230, flexShrink: 0,
                borderRight: "1px solid rgba(1,41,112,0.1)",
                padding: "14px 14px 14px 56px", overflowY: "auto",
                backgroundColor: "white",
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#7293b9", margin: "0 0 8px", fontFamily: "var(--font-poppins)" }}>
                  Savollar
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
                  {questions.map((_, i) => (
                    <button key={i} onClick={() => setCurrent(i)} style={{
                      width: 36, height: 36, borderRadius: 6, fontSize: 11, fontWeight: 700,
                      cursor: "pointer", fontFamily: "var(--font-poppins)",
                      backgroundColor:
                        i === current           ? "#0e58a8"
                        : answers[i] !== undefined ? "#f0fbfd"
                        : "#f6f9ff",
                      color:
                        i === current           ? "#fff"
                        : answers[i] !== undefined ? "#1cc2dc"
                        : "#7293b9",
                      border: flagged.has(i)
                        ? "2px solid #f59e0b"
                        : "1px solid rgba(1,41,112,0.1)",
                    }}>
                      {i + 1}
                    </button>
                  ))}
                </div>

                {/* Izoh */}
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    { color: "#0e58a8", bg: "#f0f5ff", label: "Joriy" },
                    { color: "#1cc2dc", bg: "#f0fbfd", label: "Javoblandi" },
                    { color: "#7293b9", bg: "#f6f9ff", label: "Javoblanmadi" },
                    { color: "#f59e0b", bg: "#fff8e6", label: "Belgilangan" },
                  ].map(l => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: l.bg, border: `1px solid ${l.color}` }} />
                      <span style={{ fontSize: 11, color: "#7293b9", fontFamily: "var(--font-poppins)" }}>{l.label}</span>
                    </div>
                  ))}
                </div>

                {maxAttempts !== null && (
                  <div style={{ marginTop: 12, padding: "6px 8px", borderRadius: 6, backgroundColor: "#f0f5ff", textAlign: "center" }}>
                    <span style={{ fontSize: 11, color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                      {attemptsUsed + 1}-urinish / {maxAttempts} ta
                    </span>
                  </div>
                )}
              </div>

              {/* O'ng: savol maydoni */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 20px", paddingRight: 234 }}>
                {lQuestions || questions.length === 0 ? (
                  <Loading />
                ) : q ? (
                  <div style={{
                    backgroundColor: "white", borderRadius: 10, padding: "24px",
                    border: "1px solid rgba(1,41,112,0.1)",
                    boxShadow: "0px 0px 5px rgba(1,41,112,0.05)",
                  }}>
                    {/* Savol matni */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1 }}>
                        <span style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 32, height: 32, borderRadius: "50%",
                          backgroundColor: "#0e58a8", color: "#fff",
                          fontSize: 13, fontWeight: 700, flexShrink: 0, fontFamily: "var(--font-poppins)",
                        }}>{current + 1}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: "#012970", fontFamily: "var(--font-poppins)", fontSize: 15, fontWeight: 500, margin: "4px 0 0", lineHeight: 1.55 }}>
                            {q.questionText}
                          </p>
                          {q.imageUrl && (
                            <img
                              src={q.imageUrl.startsWith("/api/") ? teachingApi.fileUrl(q.imageUrl) : q.imageUrl}
                              alt="savol rasmi"
                              style={{ marginTop: 10, maxHeight: 200, width: "auto", borderRadius: 8, objectFit: "contain",
                                border: "1px solid rgba(1,41,112,0.1)" }}
                            />
                          )}
                        </div>
                      </div>
                      <button onClick={toggleFlag} style={{ padding: 6, border: "none", background: "none", cursor: "pointer", borderRadius: 6 }}>
                        <Flag className="w-4 h-4" style={{ color: flagged.has(current) ? "#f59e0b" : "#c4cfe0" }} />
                      </button>
                    </div>

                    {/* Javob variantlari */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {(q.optionPerm ?? q.options.map((_, i) => i)).map((origIdx, shuffledPos) => {
                        const opt        = q.options[origIdx]
                        const optImg     = q.optionImages?.[origIdx] ?? null
                        const isSelected = answers[current] === origIdx
                        return (
                          <label key={shuffledPos} style={{
                            display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px",
                            borderRadius: 8, cursor: "pointer",
                            border: `1.5px solid ${isSelected ? "#1cc2dc" : "rgba(1,41,112,0.1)"}`,
                            backgroundColor: isSelected ? "rgba(28,194,220,0.05)" : "#fff",
                            transition: "all 0.12s",
                          }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              border: `2px solid ${isSelected ? "#1cc2dc" : "rgba(1,41,112,0.2)"}`,
                            }}>
                              {isSelected && <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#1cc2dc" }} />}
                            </div>
                            <input type="radio" style={{ display: "none" }} checked={isSelected}
                              onChange={() => setAnswers(a => ({ ...a, [current]: origIdx }))} />
                            <div style={{ flex: 1 }}>
                              <span style={{ color: "#012970", fontFamily: "var(--font-poppins)", fontSize: 14, lineHeight: 1.5 }}>{opt}</span>
                              {optImg && (
                                <img
                                  src={optImg.startsWith("/api/") ? teachingApi.fileUrl(optImg) : optImg}
                                  alt={`variant ${shuffledPos + 1} rasmi`}
                                  style={{ marginTop: 8, maxHeight: 120, width: "auto", maxWidth: "100%", display: "block",
                                    borderRadius: 6, objectFit: "contain", border: "1px solid rgba(1,41,112,0.1)" }}
                                />
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>

                    {submitError && <div style={{ marginTop: 12 }}><ApiError message={submitError} /></div>}

                    {/* Navigatsiya — javoblar PASTIDA */}
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      marginTop: 24, paddingTop: 16,
                      borderTop: "1px solid rgba(1,41,112,0.08)",
                    }}>
                      <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "9px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600,
                          border: "1px solid rgba(1,41,112,0.2)", color: "#012970", backgroundColor: "white",
                          cursor: current === 0 ? "not-allowed" : "pointer",
                          opacity: current === 0 ? 0.4 : 1, fontFamily: "var(--font-poppins)",
                        }}>
                        <ChevronLeft className="w-4 h-4" /> Oldingi
                      </button>

                      <button onClick={handleSubmit} disabled={submitting} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "9px 22px", borderRadius: 7, fontSize: 13, fontWeight: 600,
                        backgroundColor: answeredCount === questions.length ? "#22c55e" : "rgba(34,197,94,0.15)",
                        color: answeredCount === questions.length ? "#fff" : "#15803d",
                        border: answeredCount === questions.length ? "none" : "1px solid rgba(34,197,94,0.3)",
                        cursor: "pointer", fontFamily: "var(--font-poppins)",
                        opacity: submitting ? 0.7 : 1,
                      }}>
                        <CheckCircle2 className="w-4 h-4" />
                        {submitting ? "Yuborilmoqda..." : `Yakunlash (${answeredCount}/${questions.length})`}
                      </button>

                      {current < questions.length - 1 ? (
                        <button onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))} style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "9px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600,
                          backgroundColor: "#0e58a8", color: "#fff", border: "none",
                          cursor: "pointer", fontFamily: "var(--font-poppins)",
                        }}>
                          Keyingi <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <div style={{ width: 100 }} />
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </FaceProctor>

      <style>{`
        @keyframes examDotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
