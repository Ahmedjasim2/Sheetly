import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { translate as coreTranslate } from './translations'
import type { Language } from './translations'

export type { Language } from './translations'
export { translate } from './translations'

export interface I18n {
  readonly lang: Language
  readonly dir: 'ltr' | 'rtl'
  readonly t: (key: string, params?: Record<string, string | number>) => string
}

const defaultI18n: I18n = {
  lang: 'en',
  dir: 'ltr',
  t: (key, params) => coreTranslate('en', key, params),
}

const I18nContext = createContext<I18n>(defaultI18n)

export function I18nProvider(props: { readonly lang: Language; readonly children: ReactNode }) {
  const dir: 'ltr' | 'rtl' = props.lang === 'ar' ? 'rtl' : 'ltr'
  const t = (key: string, params?: Record<string, string | number>): string =>
    coreTranslate(props.lang, key, params)

  return (
    <I18nContext.Provider value={{ lang: props.lang, dir, t }}>
      {props.children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18n {
  return useContext(I18nContext)
}
