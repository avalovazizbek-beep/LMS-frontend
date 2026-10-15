"use client"

import { useState, type CSSProperties, type ReactNode } from "react"
import { usePhoto, type PhotoKind } from "@/lib/photos"

/**
 * Foydalanuvchining HEMIS surati. Manba tartibi:
 *   1) `src` — ma'lumotning o'zida kelgan havola (masalan HEMIS profil `image`),
 *   2) `me` — joriy foydalanuvchi, yoki `kind` + `id` — /api/photos orqali.
 * Surat topilmasa yoki yuklanmasa `children` (bosh harf / ikonka) chiqadi.
 * `className` faqat <img>ga qo'llanadi — o'lcham va shaklni bering
 * (masalan "h-9 w-9 rounded-full").
 */
export function PersonAvatar({
  kind,
  id,
  me,
  src,
  className,
  style,
  children,
}: {
  kind?: PhotoKind
  id?: string | number | null
  me?: boolean
  src?: string | null
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const [failed, setFailed] = useState<string[]>([])
  const direct = src && !failed.includes(src) ? src : null
  // To'g'ridan-to'g'ri havola ishlasa, qo'shimcha so'rov yuborilmaydi
  const resolved = usePhoto(direct ? {} : { kind, id, me })
  const url = direct ?? (resolved && !failed.includes(resolved) ? resolved : null)

  if (!url) return <>{children}</>
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setFailed(f => [...f, url])}
      className={`shrink-0 object-cover ${className ?? ""}`}
      style={style}
    />
  )
}
