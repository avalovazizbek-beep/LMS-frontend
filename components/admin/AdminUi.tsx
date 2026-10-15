"use client"

import { ChevronDown } from "lucide-react"

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

export function FieldSelect({ value, onChange, children, disabled }: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="w-full cursor-pointer appearance-none truncate bg-transparent pr-6 text-sm font-semibold text-[var(--adm-text)] outline-none disabled:cursor-default disabled:opacity-60">
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--adm-muted)]" />
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
