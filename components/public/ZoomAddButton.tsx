"use client"

import { useRouter } from "next/navigation"
import { ExternalLink } from "lucide-react"

/** /zoom landing sahifasidan kelgan foydalanuvchini HEMIS login'dan keyin
 *  Profil → Integratsiyalar kartasiga qaytarish uchun belgi (sessionStorage).
 *  OAuth callback faqat shu aniq yo'lni qabul qiladi — ochiq redirect emas. */
export const AFTER_LOGIN_KEY = "lms_after_login"
export const ZOOM_SETUP_PATH = "/tizim/profil"

export function ZoomAddButton({ label }: { label: string }) {
  const router = useRouter()

  function handleClick() {
    let token: string | null = null
    try { token = localStorage.getItem("lms_token") } catch { /* storage yopiq */ }
    if (token) {
      router.push(ZOOM_SETUP_PATH)
      return
    }
    try { sessionStorage.setItem(AFTER_LOGIN_KEY, ZOOM_SETUP_PATH) } catch { /* storage yopiq */ }
    router.push("/login")
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-sm font-medium text-white"
      style={{ backgroundColor: "#0e58a8", fontFamily: "var(--font-poppins)" }}
    >
      <ExternalLink className="w-4 h-4" />
      {label}
    </button>
  )
}
