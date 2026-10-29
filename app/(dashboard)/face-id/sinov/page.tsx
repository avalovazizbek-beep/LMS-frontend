"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ScanFace, ShieldCheck, ShieldX, Camera, Users, Maximize, AlertTriangle, CheckCircle2,
  XCircle, RefreshCw, ArrowRight, Info,
} from "lucide-react"
import { faceApi, teachingApi, type FacePracticeIssue, type FacePracticeStatus } from "@/lib/api"
import { useApi } from "@/hooks/useApi"
import { Loading, ApiError } from "@/components/ui/ApiState"
import FaceProctor, { type FaceViolationType } from "@/components/ui/FaceProctor"
import { useLanguage } from "@/lib/i18n/LanguageContext"

/* "Yuzni sinab ko'rish" — oraliqdan oldingi demo test (baho qo'yilmaydi).
   Haqiqiy imtihondagi nazorat ishlaydi: kamera, Face ID, kadrda boshqa odam,
   to'liq ekran va oynadan chiqish. Farqi — talabani chiqarib yubormaydi:
   muammoni ko'rsatib, "haqiqiy imtihonda nima bo'lardi" deb ogohlantiradi.
   O'tish qoidasi imtihondagidek: yuz tasdiqlandi va xatoliklar chegaraga
   yetmadi. Natija serverga yoziladi — oraliq oldidagi tekshiruv shunga qaraydi. */

type Phase = "intro" | "face_scan" | "exam" | "done"

const MIN_SECONDS = 60          // shuncha vaqt kamera va yuz kuzatiladi
const SLOW_SCAN_SECONDS = 20    // yuz tasdiqlanmasa — "yakunlash" tugmasi chiqadi
const QUESTIONS = [
  { key: "facePractice.q1", correct: 0 },
  { key: "facePractice.q2", correct: 1 },
  { key: "facePractice.q3", correct: 2 },
  { key: "facePractice.q4", correct: 0 },
  { key: "facePractice.q5", correct: 1 },
]
const BLOCKING: FacePracticeIssue[] = ["camera", "not_registered", "not_verified", "mismatch", "multi_face"]
const WARNINGS: FacePracticeIssue[] = ["no_face", "fullscreen", "tab_blur"]

const FONT = { fontFamily: "var(--font-poppins)" } as const

/** Faqat imtihon sahifasiga qaytariladi (tashqi manzilga emas) */
function safeBack(raw: string | null): string | null {
  return raw && /^\/imtihonlar\/[\w-]+$/.test(raw) ? raw : null
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "—"
  return new Date(ts).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

interface PracticeResult {
  passed: boolean
  violations: number
  confidence: number | null
  issues: FacePracticeIssue[]
  correct: number
  saveFailed: boolean
}

export default function FacePracticePage() {
  const { t } = useLanguage()
  const router = useRouter()
  const back = safeBack(useSearchParams().get("back"))

  const { data: statusRes, loading: lStatus, error: eStatus, refetch: refetchStatus } = useApi(() => faceApi.status(), [])
  const { data: practiceRes, refetch: refetchPractice } = useApi(() => faceApi.practiceStatus(), [])
  const { data: settingsRes } = useApi(() => teachingApi.examSettings(), [])
  const registered = statusRes?.registered === true
  const practice: FacePracticeStatus | null = practiceRes?.data ?? null
  const maxViolations = settingsRes?.data?.faceBlockThreshold ?? 3

  const [phase, setPhase] = useState<Phase>("intro")
  const phaseRef = useRef<Phase>("intro")
  useEffect(() => { phaseRef.current = phase }, [phase])
  const [runKey, setRunKey] = useState(0)

  // Sinov davomida yig'iladi
  const issuesRef = useRef<Set<FacePracticeIssue>>(new Set())
  const violationsRef = useRef(0)
  const verifiedRef = useRef(false)
  const bestConfRef = useRef<number | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [elapsed, setElapsed] = useState(0)
  const [cameraError, setCameraError] = useState(false)
  const [fsExited, setFsExited] = useState(false)
  const [winHidden, setWinHidden] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<PracticeResult | null>(null)

  const inTest = phase === "face_scan" || phase === "exam"

  function requestFS() {
    document.documentElement.requestFullscreen?.()?.catch(() => {})
    setFsExited(false)
  }
  function exitFS() {
    if (document.fullscreenElement) document.exitFullscreen?.()?.catch(() => {})
  }

  function start() {
    issuesRef.current = new Set()
    violationsRef.current = 0
    verifiedRef.current = false
    bestConfRef.current = null
    setAnswers({})
    setElapsed(0)
    setCameraError(false)
    setFsExited(false)
    setWinHidden(false)
    setResult(null)
    setRunKey(k => k + 1)
    requestFS()
    setPhase("face_scan")
  }

  /* ── vaqt: yuz tekshiruvidan boshlab hisoblanadi ───────────────────── */
  useEffect(() => {
    if (!inTest) return
    const timer = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [inTest])

  /* ── to'liq ekran va oynadan chiqish (imtihondagidek, lekin qayd etilmaydi) ── */
  useEffect(() => {
    if (!inTest) return
    const coarse = window.matchMedia("(pointer: coarse)").matches
    const onFs = () => {
      if (document.fullscreenElement) return
      issuesRef.current.add("fullscreen")
      if (!coarse) setFsExited(true)
    }
    const onBlur = () => { issuesRef.current.add("tab_blur"); setWinHidden(true) }
    const onHide = () => { if (document.hidden) onBlur() }
    document.addEventListener("fullscreenchange", onFs)
    window.addEventListener("blur", onBlur)
    document.addEventListener("visibilitychange", onHide)
    return () => {
      document.removeEventListener("fullscreenchange", onFs)
      window.removeEventListener("blur", onBlur)
      document.removeEventListener("visibilitychange", onHide)
    }
  }, [inTest])

  /* ── ekran o'chib qolmasin (telefonda) — imtihondagidek ─────────────── */
  useEffect(() => {
    if (!inTest || !("wakeLock" in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = () => {
      if (document.visibilityState !== "visible" || (sentinel && !sentinel.released)) return
      navigator.wakeLock.request("screen")
        .then(s => { if (cancelled) s.release().catch(() => {}); else sentinel = s })
        .catch(() => {})
    }
    acquire()
    document.addEventListener("visibilitychange", acquire)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", acquire)
      sentinel?.release().catch(() => {})
    }
  }, [inTest])

  const handleViolation = useCallback((type: FaceViolationType) => {
    if (type === "face_mismatch") {
      violationsRef.current += 1
      // "ro'yxatdan o'tmagan" sababi oldinroq onVerifyResult'dan keladi
      issuesRef.current.add(issuesRef.current.has("not_registered") ? "not_registered" : "mismatch")
    } else if (type === "multi_face") {
      violationsRef.current += 1
      issuesRef.current.add("multi_face")
    } else if (type === "no_face") {
      issuesRef.current.add("no_face")
    }
  }, [])

  const handleVerifyResult = useCallback((verified: boolean, confidence: number | null, reason?: string) => {
    if (verified) {
      verifiedRef.current = true
      if (confidence !== null) bestConfRef.current = Math.max(bestConfRef.current ?? 0, confidence)
    } else if (reason === "not_registered") {
      issuesRef.current.add("not_registered")
    }
  }, [])

  const handleCameraError = useCallback(() => {
    issuesRef.current.add("camera")
    setCameraError(true)
  }, [])

  const finish = useCallback(async () => {
    if (phaseRef.current !== "face_scan" && phaseRef.current !== "exam") return
    exitFS()
    const issues = issuesRef.current
    if (!verifiedRef.current && !issues.has("camera") && !issues.has("not_registered")) issues.add("not_verified")
    const list = [...issues]
    const violations = violationsRef.current
    const passed = verifiedRef.current && violations < maxViolations && !list.some(i => i === "camera" || i === "not_registered" || i === "not_verified")
    const correct = QUESTIONS.filter((q, i) => answers[i] === q.correct).length
    setPhase("done")
    setSaving(true)
    let saveFailed = false
    let passedNow = passed
    try {
      const res = await faceApi.savePractice({ passed, violations, maxViolations, confidence: bestConfRef.current, issues: list })
      passedNow = res.data.passedNow
      refetchPractice()
    } catch {
      saveFailed = true
    } finally {
      setSaving(false)
    }
    setResult({ passed: passedNow, violations, confidence: bestConfRef.current, issues: list, correct, saveFailed })
  }, [answers, maxViolations, refetchPractice])

  if (lStatus) return <Loading />
  if (eStatus) return <ApiError message={eStatus} onRetry={refetchStatus} />

  const card = "bg-white rounded-[12px] p-6 sm:p-8 w-full max-w-2xl"
  const cardStyle = { border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 0px 20px rgba(1,41,112,0.08)" }

  /* ── Natija ───────────────────────────────────────────────────────── */
  if (phase === "done") {
    if (saving || !result) return <Loading />
    const blocking = BLOCKING.filter(i => result.issues.includes(i))
    const warnings = WARNINGS.filter(i => result.issues.includes(i))
    const limitHit = result.violations >= maxViolations
    const rows = [
      { Icon: Camera, label: t("facePractice.row.camera"), ok: !result.issues.includes("camera"),
        value: result.issues.includes("camera") ? t("facePractice.notWorking") : t("facePractice.ok") },
      { Icon: ScanFace, label: t("facePractice.row.face"), ok: result.confidence !== null,
        value: result.confidence !== null ? t("facePractice.matched", { conf: result.confidence }) : t("facePractice.notMatched") },
      { Icon: ShieldCheck, label: t("facePractice.row.errors"), ok: !limitHit,
        value: t("facePractice.errorsOf", { n: result.violations, max: maxViolations }) },
      { Icon: CheckCircle2, label: t("facePractice.row.answers"), ok: true,
        value: t("facePractice.answersOf", { n: result.correct, total: QUESTIONS.length }) },
    ]
    return (
      <div className="min-h-full flex items-center justify-center p-4 sm:p-[30px]">
        <div className={card} style={cardStyle}>
          <div className="flex flex-col items-center text-center gap-2">
            {result.passed
              ? <CheckCircle2 className="w-16 h-16" style={{ color: "#22c55e" }} />
              : <ShieldX className="w-16 h-16" style={{ color: "#ef4444" }} />}
            <h2 className="text-2xl font-semibold" style={{ color: "#012970", ...FONT }}>
              {result.passed ? t("facePractice.passTitle") : t("facePractice.failTitle")}
            </h2>
            <p className="text-sm max-w-lg" style={{ color: "#445b7a", ...FONT }}>
              {result.passed ? t("facePractice.passDesc") : t("facePractice.failDesc")}
            </p>
          </div>

          <div className="mt-6 flex flex-col rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(1,41,112,0.08)" }}>
            {rows.map(r => (
              <div key={r.label} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.06)" }}>
                <r.Icon className="w-4 h-4 shrink-0" style={{ color: "#0e58a8" }} />
                <span className="text-sm flex-1" style={{ color: "#445b7a", ...FONT }}>{r.label}</span>
                <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: r.ok ? "#15803d" : "#b91c1c", ...FONT }}>
                  {r.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}{r.value}
                </span>
              </div>
            ))}
          </div>

          {(blocking.length > 0 || limitHit) && (
            <div className="mt-4 flex flex-col gap-2">
              {limitHit && (
                <IssueRow tone="red" text={t("facePractice.issue.limit", { max: maxViolations })} />
              )}
              {blocking.map(i => (
                <IssueRow key={i} tone="red" text={t(`facePractice.issue.${i}`)}
                  link={i === "not_registered" ? { href: "/face-id/register", label: t("facePractice.registerNow") }
                    : i === "mismatch" ? { href: "/face-id/re-register", label: t("facePractice.reregister") } : undefined} />
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-xs font-semibold" style={{ color: "#92400e", ...FONT }}>{t("facePractice.warnTitle")}</p>
              {warnings.map(i => <IssueRow key={i} tone="amber" text={t(`facePractice.warn.${i}`)} />)}
            </div>
          )}

          {result.saveFailed && (
            <p className="mt-4 text-sm px-3 py-2 rounded-[8px]" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", ...FONT }}>
              {t("facePractice.saveFailed")}
            </p>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {result.passed && !result.saveFailed ? (
              <button onClick={() => router.push(back ?? "/imtihonlar")}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-[8px] text-white font-semibold"
                style={{ backgroundColor: "#0e58a8", ...FONT }}>
                {back ? t("facePractice.backToExam") : t("facePractice.toExams")}<ArrowRight className="w-4 h-4" />
              </button>
            ) : null}
            <button onClick={start}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-[8px] font-semibold"
              style={result.passed && !result.saveFailed
                ? { border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", ...FONT }
                : { backgroundColor: "#0e58a8", color: "#fff", ...FONT }}>
              <RefreshCw className="w-4 h-4" />{t("facePractice.retry")}
            </button>
            {!result.passed && (
              <Link href="/face-id"
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-[8px] font-medium"
                style={{ border: "1px solid rgba(1,41,112,0.2)", color: "#0e58a8", ...FONT }}>
                <ScanFace className="w-4 h-4" />{t("facePractice.faceStatus")}
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ── Kirish ───────────────────────────────────────────────────────── */
  if (phase === "intro") {
    const checks = [
      { Icon: Camera, text: t("facePractice.check.camera") },
      { Icon: ScanFace, text: t("facePractice.check.face") },
      { Icon: Users, text: t("facePractice.check.alone") },
      { Icon: Maximize, text: t("facePractice.check.window") },
    ]
    return (
      <div className="min-h-full flex items-center justify-center p-4 sm:p-[30px]">
        <div className={card} style={cardStyle}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: "#eef4ff" }}>
              <ScanFace className="w-7 h-7" style={{ color: "#0e58a8" }} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold" style={{ color: "#012970", ...FONT }}>{t("facePractice.introTitle")}</h1>
              <p className="text-sm mt-0.5" style={{ color: "#7293b9", ...FONT }}>{t("facePractice.subtitle")}</p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6" style={{ color: "#445b7a", ...FONT }}>{t("facePractice.introDesc")}</p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {checks.map(c => (
              <div key={c.text} className="flex items-center gap-2.5 px-3 py-2.5 rounded-[8px]" style={{ backgroundColor: "#f6f9ff" }}>
                <c.Icon className="w-4 h-4 shrink-0" style={{ color: "#0e58a8" }} />
                <span className="text-sm" style={{ color: "#012970", ...FONT }}>{c.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 px-4 py-3 rounded-[8px] text-sm flex gap-2" style={{ backgroundColor: "#fff7ed", border: "1px solid rgba(234,88,12,0.25)" }}>
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#c2410c" }} />
            <div className="flex flex-col gap-1.5" style={{ color: "#9a3412", ...FONT }}>
              <span>{t("facePractice.sameDevice")}</span>
              <span>{t("examTake.cameraTips")}</span>
            </div>
          </div>

          {practice?.passed && (
            <div className="mt-3 px-4 py-3 rounded-[8px] text-sm flex items-center gap-2" style={{ backgroundColor: "#f0fdf4", border: "1px solid rgba(34,197,94,0.25)" }}>
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#15803d" }} />
              <span style={{ color: "#15803d", ...FONT }}>{t("facePractice.lastPassed", { date: formatDate(practice.lastPassedAt) })}</span>
            </div>
          )}

          {!registered && (
            <div className="mt-3 px-4 py-3 rounded-[8px] text-sm flex flex-col sm:flex-row sm:items-center gap-3" style={{ backgroundColor: "#fef2f2", border: "1px solid rgba(185,28,28,0.2)" }}>
              <span className="flex-1" style={{ color: "#b91c1c", ...FONT }}>{t("facePractice.notRegistered")}</span>
              <Link href="/face-id/register" className="shrink-0 px-4 py-2 rounded-[8px] text-white text-sm font-semibold text-center"
                style={{ backgroundColor: "#b91c1c", ...FONT }}>
                {t("facePractice.registerNow")}
              </Link>
            </div>
          )}

          <button onClick={start} disabled={!registered}
            className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-[8px] text-white font-semibold disabled:opacity-50"
            style={{ backgroundColor: "#0e58a8", ...FONT }}>
            <ScanFace className="w-5 h-5" />{t("facePractice.start")}
          </button>
        </div>
      </div>
    )
  }

  /* ── Sinov (yuz tekshiruvi + demo savollar) ──────────────────────── */
  const left = Math.max(0, MIN_SECONDS - elapsed)
  const canFinish = phase === "exam" ? left === 0 : elapsed >= SLOW_SCAN_SECONDS || cameraError
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#f6f9ff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* To'liq ekrandan chiqildi — imtihondagi oyna, ustiga "bu sinov" izohi */}
      {fsExited && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10002, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center", backgroundColor: "rgba(1,41,112,0.88)", backdropFilter: "blur(8px)" }}>
          <Maximize className="w-14 h-14" style={{ color: "#fff" }} />
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0, ...FONT }}>{t("examTake.fullscreenStopped")}</h2>
          <p style={{ color: "#fde68a", fontSize: 14, maxWidth: 440, margin: 0, ...FONT }}>{t("facePractice.realNote.window")}</p>
          <button onClick={requestFS} style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 8, backgroundColor: "#0e58a8", color: "#fff", fontWeight: 600, fontSize: 15, border: "none", cursor: "pointer", ...FONT }}>
            <Maximize className="w-5 h-5" /> {t("examTake.returnFullscreen")}
          </button>
        </div>
      )}
      {winHidden && !fsExited && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10002, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center", backgroundColor: "rgba(220,38,38,0.92)", backdropFilter: "blur(12px)" }}>
          <AlertTriangle className="w-16 h-16" style={{ color: "#fbbf24" }} />
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0, ...FONT }}>{t("examTake.leftWindow")}</h2>
          <p style={{ color: "#fde68a", fontSize: 14, maxWidth: 440, margin: 0, ...FONT }}>{t("facePractice.realNote.window")}</p>
          <button onClick={() => { setWinHidden(false); window.focus() }} style={{ marginTop: 12, padding: "12px 28px", borderRadius: 8, backgroundColor: "#fff", color: "#dc2626", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", ...FONT }}>
            {t("examTake.returnToExam")}
          </button>
        </div>
      )}

      <FaceProctor
        key={runKey}
        fixed
        practice
        maxViolations={maxViolations}
        onFirstVerified={() => { if (phaseRef.current === "face_scan") setPhase("exam") }}
        onViolation={handleViolation}
        onVerifyResult={handleVerifyResult}
        onError={handleCameraError}
      >
        {phase === "face_scan" ? (
          <div className="exam-vh-fix" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24, textAlign: "center" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(14,88,168,0.1)" }}>
              <ScanFace className="w-10 h-10" style={{ color: "#0e58a8" }} />
            </div>
            <div>
              <h2 style={{ color: "#012970", fontSize: 22, fontWeight: 700, margin: "0 0 8px", ...FONT }}>{t("examTake.faceScan")}</h2>
              <p style={{ color: "#7293b9", fontSize: 14, maxWidth: 380, margin: 0, ...FONT }}>{t("examTake.faceScanDesc")}</p>
            </div>
            {canFinish && (
              <>
                <p style={{ color: "#9a3412", fontSize: 13, maxWidth: 400, margin: 0, padding: "10px 14px", borderRadius: 10, backgroundColor: "#fff7ed", border: "1px solid rgba(234,88,12,0.3)", ...FONT }}>
                  {t("facePractice.scanSlow")}
                </p>
                <button onClick={finish} style={{ padding: "10px 22px", borderRadius: 8, border: "1px solid rgba(1,41,112,0.2)", backgroundColor: "#fff", color: "#0e58a8", fontWeight: 600, fontSize: 14, cursor: "pointer", ...FONT }}>
                  {t("facePractice.finish")}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="exam-vh-fix" style={{ overflowY: "auto", padding: "24px 16px 32px" }}>
            <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, backgroundColor: "#eef4ff", color: "#0e58a8", fontSize: 12, fontWeight: 600, ...FONT }}>
                <Info className="w-3.5 h-3.5" />{t("facePractice.examHeader")}
              </div>
              {QUESTIONS.map((q, i) => (
                <div key={q.key} style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid rgba(1,41,112,0.1)", padding: 16 }}>
                  <p style={{ color: "#012970", fontSize: 15, fontWeight: 600, margin: "0 0 10px", ...FONT }}>{i + 1}. {t(q.key)}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[0, 1, 2].map(o => {
                      const active = answers[i] === o
                      return (
                        <button key={o} onClick={() => setAnswers(a => ({ ...a, [i]: o }))}
                          style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontSize: 14,
                            border: `1px solid ${active ? "#0e58a8" : "rgba(1,41,112,0.15)"}`, backgroundColor: active ? "#eef4ff" : "#fff",
                            color: active ? "#0e58a8" : "#445b7a", fontWeight: active ? 600 : 400, ...FONT }}>
                          {String.fromCharCode(65 + o)}. {t(`${q.key}.a${o}`)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              <button onClick={finish} disabled={!canFinish}
                style={{ marginTop: 6, padding: "13px 20px", borderRadius: 8, border: "none", backgroundColor: "#0e58a8", color: "#fff", fontWeight: 600, fontSize: 15,
                  cursor: canFinish ? "pointer" : "not-allowed", opacity: canFinish ? 1 : 0.55, ...FONT }}>
                {t("facePractice.finish")}
              </button>
              {!canFinish && (
                <p style={{ color: "#7293b9", fontSize: 12.5, textAlign: "center", margin: 0, ...FONT }}>
                  {t("facePractice.minTime", { s: left })}
                </p>
              )}
            </div>
          </div>
        )}
      </FaceProctor>

      <style>{`
        .exam-vh-fix { height: 100vh; height: 100dvh; }
      `}</style>
    </div>
  )
}

function IssueRow({ tone, text, link }: { tone: "red" | "amber"; text: string; link?: { href: string; label: string } }) {
  const red = tone === "red"
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 rounded-[8px] text-sm"
      style={{ backgroundColor: red ? "#fef2f2" : "#fffbeb", border: `1px solid ${red ? "rgba(185,28,28,0.2)" : "rgba(217,119,6,0.25)"}` }}>
      <span className="flex items-start gap-2 flex-1" style={{ color: red ? "#b91c1c" : "#92400e", ...FONT }}>
        {red ? <XCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}{text}
      </span>
      {link && (
        <Link href={link.href} className="shrink-0 px-3 py-1.5 rounded-[6px] text-xs font-semibold text-center"
          style={{ backgroundColor: red ? "#b91c1c" : "#d97706", color: "#fff", ...FONT }}>
          {link.label}
        </Link>
      )}
    </div>
  )
}
