import { useEffect, useRef, useState } from 'react'
import { columnLabel } from '../../core/model'
import type { FilterOperator, FilterSpec } from '../../core/filter'

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

interface OperatorOption {
  readonly value: FilterOperator
  readonly label: string
}

const OPERATORS: readonly OperatorOption[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not-equals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'not-contains', label: 'Does not contain' },
  { value: 'empty', label: 'Is empty' },
  { value: 'not-empty', label: 'Is not empty' },
  { value: 'greater-than', label: 'Greater than' },
  { value: 'greater-than-or-equal', label: 'Greater than or equal' },
  { value: 'less-than', label: 'Less than' },
  { value: 'less-than-or-equal', label: 'Less than or equal' },
]

const VALUELESS_OPERATORS: readonly FilterOperator[] = ['empty', 'not-empty']

function operatorLabel(operator: FilterOperator): string {
  return OPERATORS.find((option) => option.value === operator)?.label ?? operator
}

export function FilterBar(props: FilterBarProps) {
  const [operator, setOperator] = useState<FilterOperator>('equals')
  const [value, setValue] = useState('')
  const conditionRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (props.focusToken !== undefined && props.focusToken > 0) {
      conditionRef.current?.focus()
    }
  }, [props.focusToken])

  const needsValue = !VALUELESS_OPERATORS.includes(operator)
  const canApply = props.activeColumn !== null && (!needsValue || value.trim() !== '')

  return (
    <div className="filter-bar" role="group" aria-label="Filter">
      <span className="filter-label">
        {props.activeColumn !== null
          ? `Filter column ${columnLabel(props.activeColumn)}`
          : 'Select a cell to filter'}
      </span>
      <select
        ref={conditionRef}
        aria-label="Filter condition"
        value={operator}
        onChange={(event) => setOperator(event.target.value as FilterOperator)}
      >
        {OPERATORS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        aria-label="Filter value"
        placeholder="Value"
        value={value}
        disabled={!needsValue}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="button" onClick={() => props.onApply(operator, value)} disabled={!canApply}>
        Apply filter
      </button>
      <button type="button" onClick={props.onClear} disabled={props.filter === null}>
        Clear filter
      </button>
      {props.filter !== null && (
        <span className="filter-indicator" aria-live="polite">
          Filter active: {columnLabel(props.filter.column)} — {operatorLabel(props.filter.operator)}
          {props.filter.operator !== 'empty' && props.filter.operator !== 'not-empty'
            ? ` "${props.filter.value}"`
            : ''}{' '}
          ({props.visibleCount} of {props.totalRows} rows)
        </span>
      )}
    </div>
  )
}
