import type { Language } from './i18n'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'sheetly-theme'
const LANG_KEY = 'sheetly-lang'

export function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
  } catch {
    // localStorage unavailable; fall back to system preference.
  }

  try {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light'
    }
  } catch {
    // matchMedia unavailable.
  }
  return 'dark'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // ignore storage failures
  }
}

export function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANG_KEY)
    if (stored === 'en' || stored === 'ar') {
      return stored
    }
  } catch {
    // ignore storage failures
  }
  return 'en'
}

export function applyLanguage(language: Language): void {
  document.documentElement.lang = language
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  try {
    localStorage.setItem(LANG_KEY, language)
  } catch {
    // ignore storage failures
  }
}
