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
    <footer className="status-bar">
      <div className="status-left">
        <span className="status-sheet-index">
          {t('Sheet')} {props.sheetIndex} {t('of')} {props.sheetCount}
        </span>
        <span className="status-message" role="status">
          <span className="status-dot" aria-hidden="true" />
          {props.message === '' ? t('Ready') : props.message}
        </span>
      </div>

      <div className="status-right">
        <div className="zoom-controls">
          <button
            type="button"
            className="zoom-button"
            onClick={props.onZoomOut}
            title="Zoom out"
            aria-label="Zoom out"
          >
            {'\u2212'}
          </button>
          <input
            type="range"
            className="zoom-slider"
            aria-label="Zoom"
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
            title="Zoom in"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="zoom-value"
            onClick={props.onZoomReset}
            title="Reset zoom"
            aria-label="Reset zoom"
          >
            {props.zoom}%
          </button>
        </div>
      </div>
    </footer>
  )
}
