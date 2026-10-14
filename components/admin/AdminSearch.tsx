"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, CornerDownLeft, UserSearch } from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageContext"

export interface AdminSearchItem {
  href: string
  labelKey: string
  icon: React.ElementType
}

/**
 * Yuqori paneldagi qidiruv: admin bo'limlarini nomi bo'yicha topadi va
 * foydalanuvchilarni qidirish uchun /admin/foydalanuvchilar?q=... ga
 * o'tkazadi (o'sha sahifa `q` ni o'z qidiruv maydoniga qo'yadi).
 */
export function AdminSearch({ items }: { items: AdminSearchItem[] }) {
  const router = useRouter()
  const { t } = useLanguage()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const q = query.trim()
  const results = useMemo(() => {
    if (!q) return []
    const needle = q.toLocaleLowerCase()
    const sections = items
      .filter(i => t(i.labelKey).toLocaleLowerCase().includes(needle))
      .slice(0, 6)
      .map(i => ({ key: i.href, href: i.href, label: t(i.labelKey), icon: i.icon }))
    return [
      ...sections,
      {
        key: "users",
        href: `/admin/foydalanuvchilar?q=${encodeURIComponent(q)}`,
        label: t("adminNav.searchUsers", { q }),
        icon: UserSearch,
      },
    ]
  }, [q, items, t])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function go(href: string) {
    setOpen(false)
    setQuery("")
    inputRef.current?.blur()
    router.push(href)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); return }
    if (results.length === 0) return
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setCursor(c => (c + 1) % results.length) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => (c - 1 + results.length) % results.length) }
    else if (e.key === "Enter") { e.preventDefault(); go(results[Math.min(cursor, results.length - 1)].href) }
  }

  const sectionCount = results.length - 1

  return (
    <div ref={ref} className="relative w-full max-w-[460px]">
      <div className="flex h-11 items-center gap-2.5 rounded-full px-4 transition-shadow focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]"
        style={{ backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border)", boxShadow: "var(--adm-shadow)" }}>
        <Search className="h-[18px] w-[18px] shrink-0 text-[var(--adm-muted)]" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => { setQuery(e.target.value); setCursor(0); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t("adminNav.searchPlaceholder")}
          aria-label={t("adminNav.searchPlaceholder")}
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]"
        />
      </div>

      {open && results.length > 0 && (
        <div className="adm-pop absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden py-1.5" role="listbox">
          {sectionCount > 0 && (
            <div className="px-4 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--adm-muted)]">
              {t("adminNav.searchSections")}
            </div>
          )}
          {results.map((r, i) => {
            const Icon = r.icon
            const isUsers = r.key === "users"
            return (
              <button
                key={r.key}
                type="button"
                role="option"
                aria-selected={i === cursor}
                data-active={i === cursor}
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(r.href)}
                className={`adm-hover-row flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[var(--adm-text)] ${isUsers && sectionCount > 0 ? "mt-1 border-t border-[var(--adm-border)]" : ""}`}
              >
                <Icon className="h-4 w-4 shrink-0 text-[var(--adm-accent)]" />
                <span className="min-w-0 flex-1 truncate">{r.label}</span>
                {i === cursor && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-[var(--adm-muted)]" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
