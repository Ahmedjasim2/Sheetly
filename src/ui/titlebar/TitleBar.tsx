import { APP_NAME, APP_TAGLINE } from '../../core'
import { useI18n } from '../i18n'
import type { Language } from '../i18n'
import type { Theme } from '../preferences'

export interface TitleBarProps {
  readonly workbookName: string
  readonly sheetName: string
  readonly dirty: boolean
  readonly theme: Theme
  readonly lang: Language
  readonly onToggleTheme: () => void
  readonly onToggleLang: () => void
  readonly onSaveCsv: () => void
  readonly onSaveXlsx: () => void
}

export function TitleBar(props: TitleBarProps) {
  const { t } = useI18n()

  return (
    <header className="title-bar">
      <div className="title-left">
        <span className="app-logo" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" focusable="false">
            <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" opacity="0.16" />
            <path d="M3 9h18M9 3v18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <rect x="3.8" y="3.8" width="16.4" height="16.4" rx="3.4" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </span>
        <h1 className="title-app">{APP_NAME}</h1>
        <span className="title-separator" aria-hidden="true">
          {'\u2014'}
        </span>
        <span className="title-doc">{props.workbookName}</span>
        <span className="title-sheet">[{props.sheetName}]</span>
        <span className={`title-state${props.dirty ? ' is-dirty' : ''}`}>
          {props.dirty ? t('Unsaved changes') : t('Saved')}
        </span>
      </div>

      <p className="title-tagline">{APP_TAGLINE}</p>

      <div className="title-actions">
        <button
          type="button"
          className="icon-button title-toggle"
          onClick={props.onToggleTheme}
          title={props.theme === 'dark' ? 'Light mode' : 'Dark mode'}
          aria-label="Toggle theme"
        >
          {props.theme === 'dark' ? '\u2600' : '\u263E'}
        </button>
        <button
          type="button"
          className="icon-button title-toggle"
          onClick={props.onToggleLang}
          title={props.lang === 'ar' ? 'English' : '\u0627\u0644\u0639\u0631\u0628\u064A\u0629'}
          aria-label="Toggle language"
        >
          {props.lang === 'ar' ? 'EN' : '\u0639'}
        </button>
        <button type="button" className="save-button" onClick={props.onSaveCsv}>
          {t('Save CSV')}
        </button>
        <button type="button" className="save-button save-button-primary" onClick={props.onSaveXlsx}>
          {t('Save XLSX')}
        </button>
      </div>
    </header>
  )
}
