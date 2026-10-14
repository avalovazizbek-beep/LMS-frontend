/* ── Zoom'ga ilova orqali qo'shilish ─────────────────────────────────
   Zoom bergan join_url (https://us05web.zoom.us/j/81234567890?pwd=...)
   brauzerda Zoom'ning oraliq sahifasini ochadi. Talaba to'g'ridan-to'g'ri
   ilovaga tushishi uchun shu havoladan deep link yasaymiz:
     - kompyuter: zoommtg://  (Zoom Workplace desktop ilovasi)
     - iPhone/iPad: zoomus:// (Zoom mobil ilovasi)
     - Android: intent:// — ilova o'rnatilmagan bo'lsa Chrome o'zi
       join_url'ga qaytadi (S.browser_fallback_url).
   pwd — join_url'dagi shifrlangan parol; ilovalar ham shuni qabul qiladi
   (talabaga ko'rinadigan raqamli kod emas). ─────────────────────────── */

export type ZoomDevice = "android" | "ios" | "desktop"

export function detectZoomDevice(): ZoomDevice {
  if (typeof navigator === "undefined") return "desktop"
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return "android"
  // iPadOS 13+ o'zini Mac deb ko'rsatadi — sensorli ekran bo'yicha ajratamiz
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios"
  return "desktop"
}

function parseJoinUrl(joinUrl: string, meetingId: string | null) {
  let url: URL
  try { url = new URL(joinUrl) } catch { return null }
  const confno = url.pathname.match(/\/(?:j|w)\/(\d+)/)?.[1] ?? meetingId?.replace(/\D/g, "")
  if (!confno) return null
  return { confno, pwd: url.searchParams.get("pwd") }
}

export function zoomAppUrl(joinUrl: string, meetingId: string | null, device: ZoomDevice): string | null {
  const p = parseJoinUrl(joinUrl, meetingId)
  if (!p) return null
  const query = new URLSearchParams()
  if (device === "desktop") query.set("action", "join")
  query.set("confno", p.confno)
  if (p.pwd) query.set("pwd", p.pwd)

  if (device === "desktop") return `zoommtg://zoom.us/join?${query}`
  if (device === "android") {
    return `intent://zoom.us/join?${query}#Intent;scheme=zoomus;S.browser_fallback_url=${encodeURIComponent(joinUrl)};end`
  }
  return `zoomus://zoom.us/join?${query}`
}

/** Tugma bosilganda chaqiriladi (foydalanuvchi harakati ichida — aks holda
 *  brauzer tashqi ilovani ochishga ruxsat bermaydi). Havoladan ID topilmasa
 *  join_url'ning o'zi yangi oynada ochiladi. */
export function launchZoom(joinUrl: string, meetingId: string | null): void {
  const appUrl = zoomAppUrl(joinUrl, meetingId, detectZoomDevice())
  if (!appUrl) {
    window.open(joinUrl, "_blank", "noopener,noreferrer")
    return
  }
  window.location.href = appUrl
}

/** Zoom ko'rsatadigan ko'rinish: 81234567890 -> "812 3456 7890" */
export function formatZoomMeetingId(id: string): string {
  const d = id.replace(/\D/g, "")
  if (d.length === 11) return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`
  if (d.length === 10) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
  if (d.length === 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
  return id
}
