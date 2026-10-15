"use client"

import { useEffect, useState } from "react"
import { photosApi, type PhotoLookupResponse } from "@/lib/api"

/* ── HEMIS suratlarini yuklash ─────────────────────────────────────────
 * Sahifadagi barcha avatarlar (masalan 20 qatorli jadval) bittadan emas,
 * qisqa kutishdan keyin bitta /api/photos so'roviga yig'iladi. Natija
 * modul darajasida keshlanadi — sahifalar o'rtasida qayta so'ralmaydi. */

export type PhotoKind = "student" | "employee" | "login"

const PARAM: Record<PhotoKind, keyof PhotoLookupResponse> = {
  student: "students",
  employee: "employees",
  login: "logins",
}
const CHUNK = 100
const BATCH_DELAY_MS = 25

const cache = new Map<string, string | null>()
const waiters = new Map<string, Array<(url: string | null) => void>>()
const queue: Record<PhotoKind, Set<string>> = { student: new Set(), employee: new Set(), login: new Set() }
let timer: ReturnType<typeof setTimeout> | null = null

const keyOf = (kind: PhotoKind, id: string) => `${kind}:${id}`

function settle(key: string, url: string | null, remember = true) {
  if (remember) cache.set(key, url)
  const list = waiters.get(key)
  waiters.delete(key)
  list?.forEach(fn => fn(url))
}

function flush() {
  timer = null
  const batch = {
    student: [...queue.student],
    employee: [...queue.employee],
    login: [...queue.login],
  }
  queue.student.clear(); queue.employee.clear(); queue.login.clear()

  const longest = Math.max(batch.student.length, batch.employee.length, batch.login.length)
  for (let i = 0; i < longest; i += CHUNK) {
    const part = {
      student: batch.student.slice(i, i + CHUNK),
      employee: batch.employee.slice(i, i + CHUNK),
      login: batch.login.slice(i, i + CHUNK),
    }
    photosApi.lookup({ students: part.student, employees: part.employee, logins: part.login })
      .then(res => {
        for (const kind of Object.keys(part) as PhotoKind[]) {
          const map = res[PARAM[kind]] ?? {}
          for (const id of part[kind]) settle(keyOf(kind, id), map[id] ?? null)
        }
      })
      .catch(() => {
        // Tarmoq xatosi — keshlanmaydi, keyingi safar qayta urinadi
        for (const kind of Object.keys(part) as PhotoKind[]) {
          for (const id of part[kind]) settle(keyOf(kind, id), null, false)
        }
      })
  }
}

function loadPhoto(kind: PhotoKind, id: string): Promise<string | null> {
  const key = keyOf(kind, id)
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null)
  return new Promise(resolve => {
    const list = waiters.get(key)
    if (list) { list.push(resolve); return }
    waiters.set(key, [resolve])
    queue[kind].add(id)
    if (!timer) timer = setTimeout(flush, BATCH_DELAY_MS)
  })
}

/* Joriy foydalanuvchining o'z surati — token bo'yicha bir marta */
let mine: { tag: string; promise: Promise<string | null> } | null = null
let mineValue: { tag: string; url: string | null } | null = null

function tokenTag() {
  try { return (localStorage.getItem("lms_token") ?? "").slice(-24) } catch { return "" }
}

function loadMyPhoto(): Promise<string | null> {
  const tag = tokenTag()
  if (!tag) return Promise.resolve(null)
  if (mine?.tag === tag) return mine.promise
  const promise = photosApi.me()
    .then(res => {
      const url = res.url ?? null
      mineValue = { tag, url }
      return url
    })
    .catch(() => { mine = null; return null })
  mine = { tag, promise }
  return promise
}

function peek(key: string): string | null | undefined {
  if (key === "me") return mineValue && mineValue.tag === tokenTag() ? mineValue.url : undefined
  return cache.has(key) ? cache.get(key) ?? null : undefined
}

/** Surat havolasi: undefined — hali yuklanmoqda, null — surat yo'q */
export function usePhoto(opts: { kind?: PhotoKind; id?: string | number | null; me?: boolean }): string | null | undefined {
  const idText = opts.id == null ? "" : String(opts.id).trim()
  const key = opts.me ? "me" : opts.kind && idText ? keyOf(opts.kind, idText) : null

  // Keshda bo'lsa darhol (miltillamasdan) ko'rsatiladi. Sahifa yangi
  // ochilganda kesh bo'sh — server render bilan farq qilmaydi (hydration).
  const [state, setState] = useState<{ key: string | null; url: string | null | undefined }>(
    () => ({ key, url: key ? peek(key) : null })
  )
  let current = state
  if (state.key !== key) {
    current = { key, url: key ? peek(key) : null }
    setState(current)
  }

  useEffect(() => {
    if (!key) return
    let cancelled = false
    const promise = key === "me" ? loadMyPhoto() : loadPhoto(opts.kind as PhotoKind, idText)
    promise.then(url => {
      if (!cancelled) setState(s => (s.key === key && s.url === url ? s : { key, url }))
    })
    return () => { cancelled = true }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return current.url
}
