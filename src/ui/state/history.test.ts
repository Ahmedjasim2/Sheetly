import { describe, expect, it } from 'vitest'
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
} from './history'

describe('createHistory', () => {
  it('starts with the present value and no history', () => {
    const history = createHistory('a', 10)

    expect(history.present).toBe('a')
    expect(history.past).toEqual([])
    expect(history.future).toEqual([])
    expect(canUndo(history)).toBe(false)
    expect(canRedo(history)).toBe(false)
  })

  it('rejects an invalid limit', () => {
    expect(() => createHistory('a', 0)).toThrow(RangeError)
    expect(() => createHistory('a', 1.5)).toThrow(RangeError)
  })
})

describe('pushHistory', () => {
  it('moves the old present into the past and clears redo', () => {
    let history = createHistory('a', 10)
    history = pushHistory(history, 'b')
    history = pushHistory(history, 'c')
    history = undoHistory(history)

    expect(canRedo(history)).toBe(true)

    const next = pushHistory(history, 'd')

    expect(next.present).toBe('d')
    expect(next.past).toEqual(['a', 'b'])
    expect(next.future).toEqual([])
  })

  it('is a no-op when the value does not change', () => {
    const history = createHistory('a', 10)
    expect(pushHistory(history, 'a')).toBe(history)
  })

  it('caps the past at the configured limit', () => {
    let history = createHistory('0', 2)
    history = pushHistory(history, '1')
    history = pushHistory(history, '2')
    history = pushHistory(history, '3')

    expect(history.present).toBe('3')
    expect(history.past).toEqual(['1', '2'])
  })
})

describe('undoHistory and redoHistory', () => {
  it('undoes and redoes in order', () => {
    let history = createHistory('a', 10)
    history = pushHistory(history, 'b')
    history = pushHistory(history, 'c')

    history = undoHistory(history)
    expect(history.present).toBe('b')
    expect(history.future).toEqual(['c'])

    history = undoHistory(history)
    expect(history.present).toBe('a')
    expect(history.future).toEqual(['b', 'c'])

    history = redoHistory(history)
    expect(history.present).toBe('b')
    expect(history.future).toEqual(['c'])

    history = redoHistory(history)
    expect(history.present).toBe('c')
    expect(canRedo(history)).toBe(false)
  })

  it('does nothing at the boundaries', () => {
    const history = createHistory('a', 10)

    expect(undoHistory(history)).toBe(history)
    expect(redoHistory(history)).toBe(history)
  })

  it('clears redo when a new value is pushed after undo', () => {
    let history = createHistory('a', 10)
    history = pushHistory(history, 'b')
    history = undoHistory(history)
    expect(canRedo(history)).toBe(true)

    history = pushHistory(history, 'c')

    expect(history.present).toBe('c')
    expect(canRedo(history)).toBe(false)
  })
})
