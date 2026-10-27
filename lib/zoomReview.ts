/** Zoom Marketplace tekshiruvchilari uchun test hisobi (backend:
 *  services/zoomReview.ts). Bu hisob faqat Zoom oqimini — Profil
 *  (ulash/uzish) va Meeting (yaratish/boshlash) — ko'radi; backend qolgan
 *  API'larni baribir 403 bilan yopadi, bu yerdagi cheklov faqat menyu va
 *  sahifalarni toza ko'rsatish uchun. */

export const ZOOM_REVIEW_LOGIN_PATH = "/zoom/review-login"
export const ZOOM_REVIEW_HOME = "/tizim/profil"
const ZOOM_REVIEW_PAGES = ["/tizim/profil", "/meeting"]

export function isZoomReviewSession(): boolean {
  try {
    const payload = localStorage.getItem("lms_token")?.split(".")[1]
    if (!payload) return false
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
    return json?.zoomReview === true
  } catch {
    return false
  }
}

export function isZoomReviewPage(pathname: string): boolean {
  return ZOOM_REVIEW_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
