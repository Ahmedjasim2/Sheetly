import type { CalculationName } from '../../core/calc'
import { useI18n } from '../i18n'

export interface CalcResultStripProps {
  readonly selectionLabel: string
  readonly count: number
  readonly sum: number | null
  readonly average: number | null
  readonly minimum: number | null
  readonly maximum: number | null
  readonly calculation: { readonly operation: CalculationName; readonly value: number | null } | null
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

/** A slim result strip shown between the formula bar and the grid. */
export function CalcResultStrip(props: CalcResultStripProps) {
  const { t } = useI18n()

  if (props.selectionLabel === '') {
    return null
  }

  const operationLabel: Record<CalculationName, string> = {
    sum: t('Sum'),
    average: t('Average'),
    minimum: t('Minimum'),
    maximum: t('Maximum'),
    count: t('Count'),
  }

  return (
    <div className="calc-result-strip" aria-label="Calculation result">
      <span className="calc-strip-label">
        {t('Selection')}: {props.selectionLabel}
      </span>

      {props.calculation !== null ? (
        <span className="calc-strip-result">
          {operationLabel[props.calculation.operation]}
          {props.calculation.value === null
            ? `: ${t('No numeric values in selection')}`
            : ` = ${formatNumber(props.calculation.value)}`}
        </span>
      ) : props.count > 0 ? (
        <span className="calc-strip-stats">
          {`${t('Sum')}: ${formatNumber(props.sum ?? 0)}`}
          {` \u00B7 ${t('Average')}: ${formatNumber(props.average ?? 0)}`}
          {` \u00B7 ${t('Minimum')}: ${formatNumber(props.minimum ?? 0)}`}
          {` \u00B7 ${t('Maximum')}: ${formatNumber(props.maximum ?? 0)}`}
          {` \u00B7 ${t('Count')}: ${props.count}`}
        </span>
      ) : (
        <span className="calc-strip-empty">{t('No numeric values in selection')}</span>
      )}
    </div>
  )
}
