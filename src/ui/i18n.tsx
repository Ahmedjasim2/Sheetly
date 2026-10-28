import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

export type Language = 'en' | 'ar'

// Arabic strings keyed by their English source text. English falls back to the
// key itself, so default English output is unchanged.
const ar: Record<string, string> = {
  'Save CSV': 'حفظ CSV',
  'Save XLSX': 'حفظ XLSX',
  'Unsaved changes': 'تغييرات غير محفوظة',
  Saved: 'محفوظ',

  File: 'ملف',
  Edit: 'تحرير',
  View: 'عرض',
  Insert: 'إدراج',
  Sheet: 'ورقة',
  Data: 'بيانات',
  Calculate: 'حساب',
  Help: 'مساعدة',

  Undo: 'تراجع',
  Redo: 'إعادة',
  New: 'جديد',
  Find: 'بحث',
  Filter: 'تصفية',
  Sum: 'مجموع',
  Average: 'متوسط',
  Minimum: 'أدنى',
  Maximum: 'أقصى',
  Count: 'عدد',

  Apply: 'تطبيق',
  Cancel: 'إلغاء',

  Selection: 'التحديد',
  'No numeric values in selection': 'لا توجد قيم رقمية في التحديد',

  Ready: 'جاهز',
  of: 'من',

  'Sheetly AI': 'Sheetly AI',
  Properties: 'الخصائص',
  Styles: 'الأنماط',
  Close: 'إغلاق',

  'Local AI is not ready': 'Local AI غير جاهز',
  'Local AI setup will be available in a later phase.': 'سيتوفر إعداد Local AI في مرحلة لاحقة.',
  'Local AI — data stays on this device.': 'Local AI — تبقى البيانات على هذا الجهاز.',
  Ask: 'اسأل',
  'Explain selection': 'اشرح التحديد',
  'Ask about selection': 'اسأل عن التحديد',
  'Suggest changes': 'اقترح تغييرات',
  'Clear conversation': 'مسح المحادثة',
}

export interface I18n {
  readonly lang: Language
  readonly dir: 'ltr' | 'rtl'
  readonly t: (key: string) => string
}

const I18nContext = createContext<I18n>({ lang: 'en', dir: 'ltr', t: (key) => key })

export function I18nProvider(props: { readonly lang: Language; readonly children: ReactNode }) {
  const dir: 'ltr' | 'rtl' = props.lang === 'ar' ? 'rtl' : 'ltr'
  const t = (key: string): string => (props.lang === 'ar' ? (ar[key] ?? key) : key)
  return <I18nContext.Provider value={{ lang: props.lang, dir, t }}>{props.children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  return useContext(I18nContext)
}

/** Standalone translation helper for code outside the provider (e.g. App). */
export function translate(lang: Language, key: string): string {
  return lang === 'ar' ? (ar[key] ?? key) : key
}
