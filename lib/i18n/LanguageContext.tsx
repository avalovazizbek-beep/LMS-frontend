"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { DEFAULT_LANG, translate, type Lang } from "./translations"

const STORAGE_KEY = "lms_lang"

type LanguageContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null
    if (saved === "uz" || saved === "ru" || saved === "en" || saved === "kaa") {
      setLangState(saved)
    }
  }, [])

  const setLang = (next: Lang) => {
    setLangState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    setLang,
    t: (key, params) => translate(lang, key, params),
  }), [lang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage LanguageProvider ichida ishlatilishi kerak")
  return ctx
}
