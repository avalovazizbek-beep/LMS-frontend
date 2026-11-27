"use client"

import { Children, Fragment, isValidElement, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown, Search } from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageContext"

/* Admin sahifalarida qayta ishlatiladigan bo'laklar (app/admin/admin.css
   tokenlari bilan — faqat .admin-shell ichida to'g'ri ko'rinadi). */

export type CssVars = React.CSSProperties & Record<`--${string}`, string>

/** Filtr maydoni — ikonka (yoki avatar), kichik sarlavha va ichida select/input */
export function Field({ icon: Icon, iconNode, label, children, className = "" }: {
  icon?: React.ElementType
  /** Ikonka o'rniga (masalan tanlangan o'qituvchi surati) */
  iconNode?: React.ReactNode
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`adm-input flex min-h-[56px] items-center gap-3 rounded-xl px-3 py-1.5 ${className}`}>
      {iconNode ?? (Icon && (
        <span className="adm-icon-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ "--c": "var(--adm-accent)" } as CssVars}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      ))}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium leading-4 text-[var(--adm-muted)]">{label}</div>
        {children}
      </div>
    </div>
  )
}

interface SelectOption { value: string; label: string; disabled: boolean }

/** <option> bolalaridan (massiv va Fragment ichidagilar ham) qiymat/yozuv ro'yxati */
function readOptions(children: ReactNode): SelectOption[] {
  const out: SelectOption[] = []
  const walk = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return
      const props = child.props as { value?: unknown; children?: ReactNode; disabled?: boolean }
      if (child.type === Fragment) { walk(props.children); return }
      if (child.type !== "option") return
      const label = Children.toArray(props.children).map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : "")).join("")
      out.push({ value: props.value == null ? label : String(props.value), label, disabled: !!props.disabled })
    })
  }
  walk(children)
  return out
}

const fold = (v: string) => v.toLowerCase().replace(/[‘’ʻʼ`´']/g, "'")

/** Filtr ichidagi tanlov. Avval brauzerning oddiy <select>i edi — Windows'da
    ochilgan ro'yxatda ismlar chap chetga yopishib chiqardi (uslub berib
    bo'lmaydi). Endi o'z ro'yxatimiz: chetdan bo'sh joy, tanlangani belgilangan,
    ko'p bo'lsa qidiruv. Chaqiruvchi sahifalar o'zgarmaydi — <option>'lar o'qiladi. */
export function FieldSelect({ value, onChange, children, disabled }: {
  value: string
  onChange: (v: string) => void
  children: ReactNode
  disabled?: boolean
}) {
  const { t } = useLanguage()
  const options = useMemo(() => readOptions(children), [children])
  const selected = options.find((o) => o.value === value) ?? options[0]
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<{ left: number; top: number; width: number; maxHeight: number; up: boolean } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchable = options.length > 8

  const visible = useMemo(() => {
    const q = fold(query.trim())
    return q ? options.filter((o) => fold(o.label).includes(q)) : options
  }, [options, query])

  function place() {
    const anchor = btnRef.current?.closest<HTMLElement>(".adm-input") ?? btnRef.current
    if (!anchor) return
    const r = anchor.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - 12
    const above = r.top - 12
    const up = below < 260 && above > below
    setPos({ left: r.left, top: up ? r.top - 6 : r.bottom + 6, width: Math.max(r.width, 260), maxHeight: Math.min(380, up ? above : below), up })
  }

  function openList() {
    if (disabled) return
    place()
    setQuery("")
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  function choose(o: SelectOption) {
    if (o.disabled) return
    setOpen(false)
    if (o.value !== value) onChange(o.value)
    btnRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (listRef.current?.contains(target) || btnRef.current?.contains(target)) return
      setOpen(false)
    }
    const onMove = (e: Event) => {
      // Ro'yxatning o'zi aylantirilsa — joyi o'zgarmaydi
      if (e.type === "scroll" && listRef.current?.contains(e.target as Node)) return
      place()
    }
    document.addEventListener("mousedown", onDown)
    window.addEventListener("resize", onMove)
    window.addEventListener("scroll", onMove, true)
    return () => {
      document.removeEventListener("mousedown", onDown)
      window.removeEventListener("resize", onMove)
      window.removeEventListener("scroll", onMove, true)
    }
  }, [open])

  // Klaviatura bilan tanlangan qator ko'rinib tursin
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" })
  }, [active, open])

  function onKey(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); openList() }
      return
    }
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); btnRef.current?.focus() }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(visible.length - 1, i + 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
    else if (e.key === "Enter") { e.preventDefault(); const o = visible[active]; if (o) choose(o) }
  }

  // Portal .admin-shell ichiga — rang tokenlari (--adm-*) shu yerda aniqlangan
  const host = typeof document !== "undefined" ? (document.querySelector(".admin-shell") as HTMLElement | null) ?? document.body : null

  return (
    <div className="relative">
      <button ref={btnRef} type="button" disabled={disabled} onClick={() => (open ? setOpen(false) : openList())} onKeyDown={onKey}
        aria-haspopup="listbox" aria-expanded={open}
        className="flex w-full items-center gap-2 bg-transparent text-left text-sm font-semibold text-[var(--adm-text)] outline-none disabled:cursor-default disabled:opacity-60">
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? ""}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--adm-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && pos && host && createPortal(
        <div ref={listRef} role="listbox" onKeyDown={onKey}
          className="fixed z-[80] flex flex-col overflow-hidden rounded-xl"
          style={{
            left: pos.left, top: pos.top, width: pos.width, maxHeight: pos.maxHeight,
            transform: pos.up ? "translateY(-100%)" : undefined,
            backgroundColor: "var(--adm-card)", border: "1px solid var(--adm-border-strong)", boxShadow: "var(--adm-shadow-pop)",
          }}>
          {searchable && (
            <label className="m-2 flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "var(--adm-grid)" }}>
              <Search className="h-4 w-4 shrink-0 text-[var(--adm-muted)]" />
              <input autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setActive(0) }}
                placeholder={t("adminSelect.search")}
                className="w-full bg-transparent text-sm text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-muted)]" />
            </label>
          )}
          <div className="overflow-y-auto p-1.5 [scrollbar-width:thin]">
            {visible.length === 0 ? (
              <div className="px-3.5 py-3 text-sm text-[var(--adm-muted)]">{t("adminSelect.empty")}</div>
            ) : visible.map((o, i) => {
              const isSel = o.value === value
              const isPlaceholder = o.value === ""
              return (
                <button key={`${o.value}-${i}`} type="button" role="option" aria-selected={isSel} data-idx={i}
                  disabled={o.disabled} onMouseEnter={() => setActive(i)} onClick={() => choose(o)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-[13.5px] leading-snug disabled:opacity-50"
                  style={{
                    backgroundColor: isSel ? "color-mix(in srgb, var(--adm-accent) 12%, transparent)" : i === active ? "var(--adm-grid)" : "transparent",
                    color: isPlaceholder ? "var(--adm-muted)" : isSel ? "var(--adm-accent)" : "var(--adm-text)",
                    fontWeight: isSel ? 600 : 500,
                  }}>
                  <span className="min-w-0 flex-1">{o.label}</span>
                  {isSel && !isPlaceholder && <Check className="h-4 w-4 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>,
        host
      )}
    </div>
  )
}

/** Rangli (och fonli) statistika kartasi */
export function TintStat({ icon: Icon, color, label, value, sub }: {
  icon: React.ElementType
  color: string
  label: string
  value: React.ReactNode
  sub?: string
}) {
  return (
    <div className="adm-tint flex items-center gap-3.5 p-4" style={{ "--c": color } as CssVars}>
      <div className="adm-icon-grad flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
        <Icon className="h-5 w-5" strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold" style={{ color }}>{label}</div>
        <div className="text-2xl font-bold leading-tight text-[var(--adm-text)]" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</div>
        {sub && <div className="truncate text-[11px] text-[var(--adm-muted)]" style={{ fontVariantNumeric: "tabular-nums" }}>{sub}</div>}
      </div>
    </div>
  )
}

export function EmptyCard({ icon: Icon, text, hint }: { icon: React.ElementType; text: string; hint?: string }) {
  return (
    <div className="adm-card p-12 text-center">
      <Icon className="mx-auto mb-3 h-9 w-9 text-[var(--adm-muted)] opacity-40" />
      <p className="text-sm text-[var(--adm-muted)]">{text}</p>
      {hint && <p className="mt-1 text-xs text-[var(--adm-muted)]">{hint}</p>}
    </div>
  )
}

/** Sahifa sarlavhasi: ikonka + nom + izoh, o'ngda ixtiyoriy tugmalar */
export function PageHeader({ icon: Icon, title, subtitle, children }: {
  icon: React.ElementType
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="adm-icon-soft flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ "--c": "var(--adm-accent)" } as CssVars}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-[var(--adm-text)] sm:text-[30px]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-[var(--adm-muted)]">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

/** Xabar qatori (muvaffaqiyat / xato) */
export function Notice({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div className="adm-tint flex items-center gap-2.5 px-4 py-3 text-sm font-medium"
      style={{ "--c": ok ? "var(--adm-up)" : "var(--role-admin)", color: ok ? "var(--adm-up)" : "var(--role-admin)" } as CssVars}>
      {children}
    </div>
  )
}
