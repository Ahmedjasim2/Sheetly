import { useI18n } from '../i18n'

export interface StatusBarProps {
  readonly sheetIndex: number
  readonly sheetCount: number
  readonly selectionLabel?: string
  readonly cellCount?: number
  readonly message: string
  readonly zoom: number
  readonly onZoomIn: () => void
  readonly onZoomOut: () => void
  readonly onZoomReset: () => void
  readonly onZoomChange: (zoom: number) => void
}

const ZOOM_MIN = 50
const ZOOM_MAX = 200
const ZOOM_STEP = 10

export function StatusBar(props: StatusBarProps) {
  const { t } = useI18n()

  return (
    <footer className="status-bar" role="contentinfo" aria-label="Status bar">
      <div className="status-left">
        <span className="status-sheet-index">
          {t('statusbar.sheet')} {props.sheetIndex} {t('statusbar.of')} {props.sheetCount}
        </span>
        <span className="status-message" role="status" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          {props.message === '' ? t('common.ready') : props.message}
        </span>
      </div>

      <div className="status-right">
        <div className="zoom-controls">
          <button
            type="button"
            className="zoom-button"
            onClick={props.onZoomOut}
            title={t('statusbar.zoomOut')}
            aria-label={t('statusbar.zoomOut')}
          >
            {'\u2212'}
          </button>
          <input
            type="range"
            className="zoom-slider"
            aria-label={t('statusbar.zoom')}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            value={props.zoom}
            onChange={(event) => props.onZoomChange(Number(event.target.value))}
          />
          <button
            type="button"
            className="zoom-button"
            onClick={props.onZoomIn}
            title={t('statusbar.zoomIn')}
            aria-label={t('statusbar.zoomIn')}
          >
            +
          </button>
          <button
            type="button"
            className="zoom-value"
            onClick={props.onZoomReset}
            title={t('statusbar.zoomReset')}
            aria-label={t('statusbar.zoomReset')}
          >
            {props.zoom}%
          </button>
        </div>
      </div>
    </footer>
  )
}
