"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck } from "lucide-react"
import { notificationsApi, type Notif } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { notifBody, notifTime, notifTitle } from "@/lib/notifText"

const POLL_MS = 30_000

/**
 * Yuqori paneldagi qo'ng'iroqcha — o'qilmaganlar soni va bosilganda so'nggi
 * bildirishnomalar ro'yxati. Talaba/o'qituvchi (Header) va admin panelda
 * bir xil ishlaydi; har kim faqat o'z bildirishnomalarini ko'radi.
 */
export function NotificationBell() {
  const router = useRouter()
  const { t, locale } = useLanguage()
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    notificationsApi.getAll()
      .then(r => { setItems(r.data ?? []); setUnread(r.unread ?? 0) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const id = window.setInterval(load, POLL_MS)
    return () => window.clearInterval(id)
  }, [load])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  async function openItem(n: Notif) {
    setOpen(false)
    if (!n.read) {
      setItems(prev => prev.map(x => (x.id === n.id ? { ...x, read: true } : x)))
      setUnread(u => Math.max(0, u - 1))
      notificationsApi.markRead(n.id).catch(() => {})
    }
    router.push(n.link || "/xabarnoma")
  }

  async function markAll() {
    setItems(prev => prev.map(x => ({ ...x, read: true })))
    setUnread(0)
    await notificationsApi.markAllRead().catch(() => {})
  }

  const latest = items.slice(0, 8)

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={t("header.notifications")} aria-expanded={open}
        onClick={() => { setOpen(o => !o); if (!open) load() }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[var(--lms-bg)]">
        <Bell className="h-[19px] w-[19px] text-[var(--lms-primary)]" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{ backgroundColor: "#ef4444", fontFamily: "var(--font-poppins)" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[10px] bg-white"
          style={{ boxShadow: "0 8px 28px rgba(1,41,112,0.16)", border: "1px solid rgba(1,41,112,0.1)" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(1,41,112,0.08)" }}>
            <span className="text-sm font-semibold" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>
              {t("header.notifications")}
            </span>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="flex items-center gap-1 text-xs font-medium"
                style={{ color: "#0e58a8", fontFamily: "var(--font-poppins)" }}>
                <CheckCheck className="h-3.5 w-3.5" /> {t("notifBell.markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {latest.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm" style={{ color: "#7293b9", fontFamily: "var(--font-poppins)" }}>
                {t("notifBell.empty")}
              </p>
            ) : latest.map(n => (
              <button key={n.id} type="button" onClick={() => openItem(n)}
                className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-[#f6f9ff]"
                style={{ borderBottom: "1px solid rgba(1,41,112,0.05)", backgroundColor: n.read ? undefined : "rgba(28,194,220,0.05)" }}>
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: n.read ? "transparent" : "#1cc2dc" }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium" style={{ color: "#012970", fontFamily: "var(--font-poppins)" }}>{notifTitle(t, n)}</span>
                  {n.body && <span className="mt-0.5 block text-xs line-clamp-2" style={{ color: "#516a8f", fontFamily: "var(--font-poppins)" }}>{notifBody(t, n)}</span>}
                  <span className="mt-1 block text-[11px]" style={{ color: "#9db3cf", fontFamily: "var(--font-poppins)" }}>{notifTime(n, locale)}</span>
                </span>
              </button>
            ))}
          </div>

          <button type="button" onClick={() => { setOpen(false); router.push("/xabarnoma") }}
            className="block w-full px-4 py-2.5 text-center text-xs font-medium transition-colors hover:bg-[#f6f9ff]"
            style={{ color: "#0e58a8", borderTop: "1px solid rgba(1,41,112,0.08)", fontFamily: "var(--font-poppins)" }}>
            {t("notifBell.viewAll")}
          </button>
        </div>
      )}
    </div>
  )
}
