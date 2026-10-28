import { useEffect, useRef, useState } from 'react'
import { columnLabel } from '../../core/model'
import type { FilterOperator, FilterSpec } from '../../core/filter'
import { useI18n } from '../i18n'

export interface FilterBarProps {
  readonly activeColumn: number | null
  readonly filter: FilterSpec | null
  readonly visibleCount: number
  readonly totalRows: number
  /** Increment to move focus to the condition control. */
  readonly focusToken?: number
  readonly onApply: (operator: FilterOperator, value: string) => void
  readonly onClear: () => void
}

const VALUELESS_OPERATORS: readonly FilterOperator[] = ['empty', 'not-empty']

export function FilterBar(props: FilterBarProps) {
  const { t } = useI18n()
  const [operator, setOperator] = useState<FilterOperator>('equals')
  const [value, setValue] = useState('')
  const conditionRef = useRef<HTMLSelectElement>(null)

  const operators: ReadonlyArray<{ readonly value: FilterOperator; readonly label: string }> = [
    { value: 'equals', label: t('filter.op.equals') },
    { value: 'not-equals', label: t('filter.op.notEquals') },
    { value: 'contains', label: t('filter.op.contains') },
    { value: 'not-contains', label: t('filter.op.notContains') },
    { value: 'empty', label: t('filter.op.empty') },
    { value: 'not-empty', label: t('filter.op.notEmpty') },
    { value: 'greater-than', label: t('filter.op.greaterThan') },
    { value: 'greater-than-or-equal', label: t('filter.op.greaterThanOrEqual') },
    { value: 'less-than', label: t('filter.op.lessThan') },
    { value: 'less-than-or-equal', label: t('filter.op.lessThanOrEqual') },
  ]

  useEffect(() => {
    if (props.focusToken !== undefined && props.focusToken > 0) {
      conditionRef.current?.focus()
    }
  }, [props.focusToken])

  const needsValue = !VALUELESS_OPERATORS.includes(operator)
  const canApply = props.activeColumn !== null && (!needsValue || value.trim() !== '')

  function getOperatorLabel(op: FilterOperator): string {
    return operators.find((option) => option.value === op)?.label ?? op
  }

  return (
    <div className="filter-bar" role="group" aria-label={t('filter.group')}>
      <span className="filter-label">
        {props.activeColumn !== null
          ? `${t('filter.column')} ${columnLabel(props.activeColumn)}`
          : t('filter.selectCellPrompt')}
      </span>
      <select
        ref={conditionRef}
        aria-label={t('filter.condition')}
        value={operator}
        onChange={(event) => setOperator(event.target.value as FilterOperator)}
      >
        {operators.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        aria-label={t('filter.value')}
        placeholder={t('filter.valuePlaceholder')}
        value={value}
        disabled={!needsValue}
        onChange={(event) => setValue(event.target.value)}
      />
      <button
        type="button"
        onClick={() => props.onApply(operator, value)}
        disabled={!canApply}
      >
        {t('filter.apply')}
      </button>
      <button type="button" onClick={props.onClear} disabled={props.filter === null}>
        {t('filter.clear')}
      </button>
      {props.filter !== null && (
        <span className="filter-indicator" aria-live="polite">
          {t('filter.active')} {columnLabel(props.filter.column)} \u2014{' '}
          {getOperatorLabel(props.filter.operator)}
          {props.filter.operator !== 'empty' && props.filter.operator !== 'not-empty'
            ? ` "${props.filter.value}"`
            : ''}{' '}
          ({props.visibleCount} {t('common.of')} {props.totalRows} {t('filter.rows')})
        </span>
      )}
    </div>
  )
}
