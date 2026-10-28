import type { CalculationName } from '../../core/calc'
import { useI18n } from '../i18n'

export interface CalcResultStripProps {
  readonly selectionLabel: string
  readonly calculation: { readonly operation: CalculationName; readonly value: number | null } | null
}

function formatNumber(value: number, language: string): string {
  return value.toLocaleString(language === 'ar' ? 'ar' : 'en', { maximumFractionDigits: 4 })
}

/** A clean result strip shown directly between the formula bar and the grid. */
export function CalcResultStrip(props: CalcResultStripProps) {
  const { t, lang } = useI18n()

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
    <div className="calc-result-strip" role="region" aria-label={t('calc.results')}>
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
              : formatNumber(props.calculation.value, lang)}
          </span>
        </div>
      )}
    </div>
  )
}
