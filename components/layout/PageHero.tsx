"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, type LucideIcon } from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { HeroArt, tint } from "@/components/teaching/ExamBoardArt"

const QUOTES = ["pageHero.quote.0", "pageHero.quote.1", "pageHero.quote.2", "pageHero.quote.3"]

/** Sahifa sarlavhasi (talaba sahifalari uchun yagona ko'rinish): chapda belgi,
    nom va izoh; o'ngda sahifa tugmalari (children) yoki shior + rasm.
    Shior sahifa manzili bo'yicha tanlanadi — har sahifada o'zi, til
    almashsa ham o'zgarmaydi. */
export function PageHero({ icon: Icon, title, subtitle, children, onBack, badge }: {
  icon: LucideIcon
  title: ReactNode
  subtitle?: ReactNode
  /** O'ng tomondagi tugmalar / tablar */
  children?: ReactNode
  /** Berilsa — belgidan oldin "orqaga" tugmasi */
  onBack?: () => void
  /** Nom yonidagi kichik belgi (masalan mashg'ulot turi) */
  badge?: ReactNode
}) {
  const { t } = useLanguage()
  const pathname = usePathname() ?? ""
  let h = 0
  for (const ch of pathname) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const quote = t(QUOTES[h % QUOTES.length])
  const BLUE = "#2563eb"

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl px-4 py-4 sm:px-7 sm:py-5"
      style={{
        background: `linear-gradient(105deg, var(--lms-cell) 0%, ${tint(BLUE, 7)} 55%, ${tint(BLUE, 16)} 100%)`,
        border: "1px solid var(--lms-border)",
        fontFamily: "var(--font-poppins)",
      }}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          {onBack && (
            <button type="button" onClick={onBack} aria-label="←"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors"
              style={{ background: "var(--lms-cell)", border: "1px solid var(--lms-border)" }}>
              <ArrowLeft className="h-4 w-4" style={{ color: BLUE }} />
            </button>
          )}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-16 sm:w-16"
            style={{ background: "linear-gradient(135deg, #2563eb, #1e3a8a)", boxShadow: "0 10px 24px rgba(37,99,235,0.28)" }}>
            <Icon className="h-6 w-6 text-white sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[20px] font-semibold leading-tight sm:text-[28px]" style={{ color: "var(--lms-primary)" }}>
              <span className="min-w-0 break-words">{title}</span>
              {badge}
            </h1>
            {subtitle && <div className="mt-1 text-[13px] sm:text-sm" style={{ color: "var(--lms-muted)" }}>{subtitle}</div>}
          </div>
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
        <div className={`${children ? "hidden 2xl:flex" : "hidden lg:flex"} items-center gap-3`} aria-hidden>
          <div className="flex flex-col items-end">
            <p className="whitespace-nowrap text-[20px] leading-none"
              style={{ color: "var(--lms-primary)", fontFamily: "'Segoe Script','Snell Roundhand','Brush Script MT',cursive", fontStyle: "italic" }}>
              &ldquo;{quote}&rdquo;
            </p>
            <svg viewBox="0 0 160 14" className="mt-1.5 h-3 w-[150px]">
              <path d="M2 10 Q60 0 158 7" stroke={BLUE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </svg>
          </div>
          <HeroArt className="h-[104px] w-[190px]" />
        </div>
      </div>
    </motion.div>
  )
}
