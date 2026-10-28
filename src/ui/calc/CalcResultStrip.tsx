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

/** A clean result strip shown directly between the formula bar and the grid. */
export function CalcResultStrip(props: CalcResultStripProps) {
  const { t } = useI18n()

  if (props.selectionLabel === '') {
    return null
  }

  const operationNames: Record<CalculationName, string> = {
    sum: t('calc.sum'),
    average: t('calc.average'),
    minimum: t('calc.minimum'),
    maximum: t('calc.maximum'),
    count: t('calc.count'),
  }

  return (
    <div className="calc-result-strip" role="region" aria-label="Calculation result">
      <div className="calc-strip-item calc-strip-selection">
        <span className="calc-item-label">{t('calc.selection')}:</span>
        <span className="calc-item-value">{props.selectionLabel}</span>
      </div>

      {props.calculation !== null && (
        <div className="calc-strip-item calc-strip-active-op">
          <span className="calc-item-label">{operationNames[props.calculation.operation]}:</span>
          <span className="calc-item-value">
            {props.calculation.value === null
              ? t('calc.noNumericValues')
              : formatNumber(props.calculation.value)}
          </span>
        </div>
      )}

      {props.count > 0 ? (
        <div className="calc-strip-stats">
          <div className="calc-strip-item">
            <span className="calc-item-label">{t('calc.sum')}:</span>
            <span className="calc-item-value">{formatNumber(props.sum ?? 0)}</span>
          </div>
          <div className="calc-strip-item">
            <span className="calc-item-label">{t('calc.average')}:</span>
            <span className="calc-item-value">{formatNumber(props.average ?? 0)}</span>
          </div>
          <div className="calc-strip-item">
            <span className="calc-item-label">{t('calc.minimum')}:</span>
            <span className="calc-item-value">{formatNumber(props.minimum ?? 0)}</span>
          </div>
          <div className="calc-strip-item">
            <span className="calc-item-label">{t('calc.maximum')}:</span>
            <span className="calc-item-value">{formatNumber(props.maximum ?? 0)}</span>
          </div>
          <div className="calc-strip-item">
            <span className="calc-item-label">{t('calc.count')}:</span>
            <span className="calc-item-value">{props.count}</span>
          </div>
        </div>
      ) : (
        <div className="calc-strip-item calc-strip-empty">
          <span>{t('calc.noNumericValues')}</span>
        </div>
      )}
    </div>
  )
}
