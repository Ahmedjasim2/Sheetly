/**
 * A generic, React-free bounded undo/redo history.
 *
 * The history stores snapshots of a value (for the sheet: immutable `Sheet`
 * objects). Snapshots of the immutable model share unchanged cell objects, so
 * each entry costs one map of references plus the changed cells.
 */
export interface History<T> {
  readonly past: readonly T[]
  readonly present: T
  readonly future: readonly T[]
  readonly limit: number
}

export function createHistory<T>(present: T, limit: number): History<T> {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError('History limit must be a positive safe integer')
  }

  return { past: [], present, future: [], limit }
}

function trimPast<T>(past: readonly T[], limit: number): readonly T[] {
  return past.length > limit ? past.slice(past.length - limit) : past
}

/**
 * Records a new present value. Recording the same value is a no-op, and any
 * redo history is discarded.
 */
export function pushHistory<T>(history: History<T>, next: T): History<T> {
  if (next === history.present) {
    return history
  }

  return {
    past: trimPast([...history.past, history.present], history.limit),
    present: next,
    future: [],
    limit: history.limit,
  }
}

export function undoHistory<T>(history: History<T>): History<T> {
  if (history.past.length === 0) {
    return history
  }

  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1],
    future: [history.present, ...history.future],
    limit: history.limit,
  }
}

export function redoHistory<T>(history: History<T>): History<T> {
  if (history.future.length === 0) {
    return history
  }

  return {
    past: trimPast([...history.past, history.present], history.limit),
    present: history.future[0],
    future: history.future.slice(1),
    limit: history.limit,
  }
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0
}
