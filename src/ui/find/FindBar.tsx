import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'

export interface FindBarProps {
  /** Increment to move focus to the find input. */
  readonly focusToken?: number
  readonly onFindNext: (query: string, caseSensitive: boolean) => void
  readonly onReplaceCurrent: (query: string, replacement: string, caseSensitive: boolean) => void
  readonly onReplaceAll: (query: string, replacement: string, caseSensitive: boolean) => void
}

export function FindBar(props: FindBarProps) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(true)
  const findRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (props.focusToken !== undefined && props.focusToken > 0) {
      findRef.current?.focus()
      findRef.current?.select()
    }
  }, [props.focusToken])

  return (
    <div className="find-bar" role="group" aria-label={t('find.group')}>
      <span className="filter-label">{t('find.title')}</span>
      <input
        ref={findRef}
        type="text"
        aria-label={t('find.findText')}
        placeholder={t('find.findPlaceholder')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <input
        type="text"
        aria-label={t('find.replaceText')}
        placeholder={t('find.replacePlaceholder')}
        value={replacement}
        onChange={(event) => setReplacement(event.target.value)}
      />
      <label className="find-case">
        <input
          type="checkbox"
          checked={caseSensitive}
          onChange={(event) => setCaseSensitive(event.target.checked)}
        />
        {t('find.caseSensitive')}
      </label>
      <button
        type="button"
        onClick={() => props.onFindNext(query, caseSensitive)}
        disabled={query === ''}
      >
        {t('find.findNext')}
      </button>
      <button
        type="button"
        onClick={() => props.onReplaceCurrent(query, replacement, caseSensitive)}
        disabled={query === ''}
      >
        {t('find.replaceCurrent')}
      </button>
      <button
        type="button"
        onClick={() => props.onReplaceAll(query, replacement, caseSensitive)}
        disabled={query === ''}
      >
        {t('find.replaceAll')}
      </button>
    </div>
  )
}
