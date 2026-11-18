/* <input accept="..."> faqat fayl tanlash oynasini cheklaydi — sudrab
   tashlangan (drag & drop) faylni brauzer tekshirmaydi. Shu sabab Video
   bo'limiga Word fayl ham yuklanib ketardi. Bu yerda accept qatoriga
   ko'ra faylni o'zimiz tekshiramiz (kengaytma yoki MIME). */

const VIDEO_EXT = /\.(mp4|m4v|mov|avi|mkv|webm|wmv|mpe?g|3gp)$/i
const AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|wma|weba)$/i
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|heic)$/i

export function fileMatchesAccept(file: File, accept: string): boolean {
  const rules = accept.split(",").map((r) => r.trim().toLowerCase()).filter(Boolean)
  if (!rules.length) return true
  const name = file.name.toLowerCase()
  const type = (file.type || "").toLowerCase()
  return rules.some((rule) => {
    if (rule.startsWith(".")) return name.endsWith(rule)
    if (rule === "video/*") return type.startsWith("video/") || VIDEO_EXT.test(name)
    if (rule === "audio/*") return type.startsWith("audio/") || AUDIO_EXT.test(name)
    if (rule === "image/*") return type.startsWith("image/") || IMAGE_EXT.test(name)
    if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1))
    return type === rule
  })
}

/** Foydalanuvchiga ko'rsatish uchun: "video/*" → "video", ".pdf,.pptx" → "PDF, PPTX" */
export function acceptLabel(accept: string, names: { video: string; audio: string; image: string }): string {
  return accept.split(",").map((r) => r.trim().toLowerCase()).filter(Boolean).map((r) => {
    if (r === "video/*") return names.video
    if (r === "audio/*") return names.audio
    if (r === "image/*") return names.image
    return r.replace(/^\./, "").toUpperCase()
  }).join(", ")
}
