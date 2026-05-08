"use client"

import { useState, useEffect } from "react"
import { hemisApi } from "@/lib/api"

// id   = HEMIS code field ("11","12",...,"18") — passed as ?semester=11 to the API
// code = display tab number (1,2,...,8) — parsed from name "2-semestr" → 2
interface SemesterEntry { id: string; code: number; name: string }
interface SemesterData { semesters: SemesterEntry[]; currentCode: number; currentId: string }

let _cache: SemesterData | null = null
let _pending: Promise<SemesterData> | null = null

function readLocalCache(): SemesterData {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("_hemis_sem_v2") : null
    if (raw) {
      const p = JSON.parse(raw)
      return {
        semesters: Array.isArray(p.semesters) ? p.semesters : [],
        currentCode: Number(p.currentCode) || 0,
        currentId:   String(p.currentId   || ""),
      }
    }
  } catch {}
  return { semesters: [], currentCode: 0, currentId: "" }
}

function parseSemesterEntry(s: any): SemesterEntry | null {
  const name = String(s.name ?? "")

  // Tab display number: parse leading digit from name ("2-semestr" → 2, "1 semestr" → 1)
  const m = name.match(/^(\d+)/)
  const displayCode = m ? Number(m[1]) : 0
  if (!displayCode || displayCode > 8) return null

  // API semester parameter: HEMIS "code" field ("11","12",...,"18")
  // Fall back to _id or id if code field is missing
  const apiId = String(s.code ?? s._id ?? s.id ?? "")
  if (!apiId) return null

  return { id: apiId, code: displayCode, name }
}

async function loadSemesterData(): Promise<SemesterData> {
  if (_cache) return _cache
  if (_pending) return _pending

  _pending = Promise.all([
    hemisApi.semesters().catch(() => ({ data: [] as any[] })),
    hemisApi.me().catch(() => ({ data: null as any })),
  ]).then(([semRes, meRes]) => {
    const semesters: SemesterEntry[] = (semRes.data ?? [])
      .map(parseSemesterEntry)
      .filter((s): s is SemesterEntry => s !== null)

    const student = meRes.data
    const rawSem  = student?.semester ?? {}

    // API parameter for current semester: HEMIS code field ("12" for 2-semestr)
    const currentId = String(rawSem.code ?? rawSem._id ?? rawSem.id ?? "")

    // Tab display number: parse from name "2-semestr" → 2
    const semName = String(rawSem.name ?? "")
    const semM    = semName.match(/^(\d+)/)
    const currentCode = semM ? Number(semM[1]) : 0

    // Inject current semester if not in list
    if (currentId && currentCode > 0 && !semesters.find(s => s.id === currentId)) {
      semesters.push({ id: currentId, code: currentCode, name: semName || `${currentCode}-semestr` })
    }

    const data: SemesterData = { semesters, currentCode, currentId }
    _cache = data
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("_hemis_sem") // clear old v1 cache
        localStorage.setItem("_hemis_sem_v2", JSON.stringify(data))
      }
    } catch {}
    return data
  }).finally(() => { _pending = null })

  return _pending
}

export function useCurrentSemester() {
  const [state, setState] = useState<SemesterData>(readLocalCache)

  useEffect(() => {
    const cached = readLocalCache()
    if (cached.semesters.length === 0 && cached.currentId === "") {
      try { localStorage.removeItem("_hemis_sem_v2") } catch {}
    }
    loadSemesterData().then(setState).catch(() => {})
  }, [])

  // Returns HEMIS code ("11","12",...) for tab number (1,2,...,8) → used as ?semester=12
  function getSemesterId(tabCode: number): string | undefined {
    const sem = state.semesters.find(s => s.code === tabCode)
    if (sem) return sem.id
    if (tabCode === state.currentCode && state.currentId) return state.currentId
    return undefined
  }

  return { currentCode: state.currentCode, getSemesterId }
}
