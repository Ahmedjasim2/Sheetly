import { APP_NAME } from '../../core'
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

  const themeTitle = props.theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')
  const langTitle = props.lang === 'ar' ? t('lang.switchToEnglish') : t('lang.switchToArabic')

  return (
    <header className="title-bar" role="banner" aria-label="Application title bar">
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
          {props.dirty ? t('titlebar.unsavedChanges') : t('titlebar.saved')}
        </span>
      </div>

      <p className="title-tagline">{t('app.tagline')}</p>

      <div className="title-actions">
        <div className="save-group" role="group" aria-label={t('titlebar.saveActions')}>
          <button type="button" className="save-button" onClick={props.onSaveCsv}>
            {t('common.saveCsv')}
          </button>
          <button
            type="button"
            className="save-button save-button-primary"
            onClick={props.onSaveXlsx}
          >
            {t('common.saveXlsx')}
          </button>
        </div>

        <span className="title-divider" aria-hidden="true" />

        <div className="preferences-group" role="group" aria-label={t('titlebar.preferences')}>
          <button
            type="button"
            className="pref-button lang-toggle"
            data-testid="lang-toggle"
            onClick={props.onToggleLang}
            title={langTitle}
            aria-label={langTitle}
            aria-pressed={props.lang === 'ar'}
          >
            <span className={`lang-badge${props.lang === 'en' ? ' is-active' : ''}`}>EN</span>
            <span className="lang-sep" aria-hidden="true">
              /
            </span>
            <span className={`lang-badge${props.lang === 'ar' ? ' is-active' : ''}`}>العربية</span>
          </button>

          <button
            type="button"
            className={`pref-button theme-toggle is-${props.theme}`}
            data-testid="theme-toggle"
            onClick={props.onToggleTheme}
            title={themeTitle}
            aria-label={themeTitle}
            aria-pressed={props.theme === 'light'}
          >
            <span className="theme-icon" aria-hidden="true">
              {props.theme === 'dark' ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </span>
            <span className="theme-text">
              {props.theme === 'dark' ? t('theme.dark') : t('theme.light')}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
