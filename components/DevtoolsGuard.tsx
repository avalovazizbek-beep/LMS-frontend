"use client"

import { useEffect } from "react"

/**
 * Sayt egasining talabi: brauzer dasturchi vositalari (DevTools) va
 * sichqonchaning o'ng tugmasi menyusi ishlamasin.
 *  - F12, Ctrl+Shift+I/J/C/K, Ctrl+U (Mac'da Cmd+Option+I/J/C/U) bloklanadi;
 *  - o'ng tugma menyusi (contextmenu) ochilmaydi;
 *  - DevTools brauzer menyusidan baribir ochilsa, `debugger` har soniyada
 *    sahifani to'xtatadi (DevTools yopiq bo'lsa hech qanday ta'siri yo'q).
 * Bu faqat to'siq, himoya emas: haqiqiy himoya backend'dagi login va rol
 * tekshiruvlarida. Lokal ishlab chiqishda (next dev) o'chiq.
 */
const BLOCKED_WITH_CTRL_SHIFT = new Set(["KeyI", "KeyJ", "KeyC", "KeyK"])
const BLOCKED_WITH_CMD_ALT = new Set(["KeyI", "KeyJ", "KeyC", "KeyU"])

export default function DevtoolsGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return

    const onKeyDown = (e: KeyboardEvent) => {
      const ctrlOrCmd = e.ctrlKey || e.metaKey
      const blocked =
        e.key === "F12" ||
        (ctrlOrCmd && e.shiftKey && BLOCKED_WITH_CTRL_SHIFT.has(e.code)) ||
        (e.metaKey && e.altKey && BLOCKED_WITH_CMD_ALT.has(e.code)) ||
        (ctrlOrCmd && !e.shiftKey && !e.altKey && e.code === "KeyU")
      if (blocked) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const onContextMenu = (e: MouseEvent) => e.preventDefault()

    window.addEventListener("keydown", onKeyDown, true)
    window.addEventListener("contextmenu", onContextMenu, true)

    // Minifikator oddiy `debugger`ni olib tashlaydi — shuning uchun Function orqali
    const pause = Function("debugger")
    const timer = window.setInterval(() => pause(), 1000)

    return () => {
      window.removeEventListener("keydown", onKeyDown, true)
      window.removeEventListener("contextmenu", onContextMenu, true)
      window.clearInterval(timer)
    }
  }, [])

  return null
}
