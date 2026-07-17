"use client"

import { useState, useRef, useEffect } from "react"
import { Languages, ChevronDown } from "lucide-react"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { LANGUAGES } from "@/lib/i18n/translations"

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0]

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-xs font-medium transition-colors hover:bg-[#f6f9ff]"
        style={{ color: "var(--lms-primary, #012970)", fontFamily: "var(--font-poppins)", border: "1px solid rgba(1,41,112,0.15)" }}
      >
        <Languages className="w-3.5 h-3.5" />
        {current.label}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-40 rounded-[8px] bg-white overflow-hidden z-50"
          style={{ border: "1px solid rgba(1,41,112,0.1)", boxShadow: "0px 4px 16px rgba(1,41,112,0.12)" }}
        >
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              type="button"
              onClick={() => { setLang(l.code); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[#f6f9ff]"
              style={{
                color: l.code === lang ? "#1cc2dc" : "#012970",
                fontWeight: l.code === lang ? 600 : 400,
                fontFamily: "var(--font-poppins)",
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
