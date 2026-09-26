"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  DEFAULT_LANG, LANG_COOKIE, isLang, languageInfo, setActiveLang, translate, type Lang,
} from "./translations"

const STORAGE_KEY = "lms_lang"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

type LanguageContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string, params?: Record<string, string | number>) => string
  /** Sana/son formatlash uchun Intl locale: toLocaleDateString(locale, ...) */
  locale: string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function persist(lang: Lang) {
  try { window.localStorage.setItem(STORAGE_KEY, lang) } catch { /* private rejim */ }
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
}

/**
 * `initialLang` — root layout cookie'dan o'qib beradi, shuning uchun sahifa
 * serverdayoq tanlangan tilda chiziladi (avval o'zbekcha ko'rinib, keyin
 * almashib qolmaydi).
 */
export function LanguageProvider({ children, initialLang }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang ?? DEFAULT_LANG)

  // React'dan tashqaridagi kod (tr(), api xato matnlari) ham joriy tilni bilsin
  if (typeof window !== "undefined") setActiveLang(lang)

  // Cookie paydo bo'lishidan oldin tilni tanlaganlar: localStorage'dagi
  // tanlovni tiklab, cookie'ga ko'chiramiz
  useEffect(() => {
    if (initialLang) return
    let saved: string | null = null
    try { saved = window.localStorage.getItem(STORAGE_KEY) } catch { /* private rejim */ }
    if (isLang(saved) && saved !== DEFAULT_LANG) {
      setLangState(saved)
      persist(saved)
    }
  }, [initialLang])

  useEffect(() => {
    document.documentElement.lang = languageInfo(lang).htmlLang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    persist(next)
  }, [])

  const value = useMemo<LanguageContextValue>(() => ({
    lang,
    setLang,
    t: (key, params) => translate(lang, key, params),
    locale: languageInfo(lang).intl,
  }), [lang, setLang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage LanguageProvider ichida ishlatilishi kerak")
  return ctx
}
