import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'

export interface MenuItemDefinition {
  readonly id: string
  readonly label: string
  readonly onSelect?: () => void
  readonly disabled?: boolean
  readonly hint?: string
}

export interface MenuDefinition {
  readonly id: string
  readonly label: string
  readonly items: readonly MenuItemDefinition[]
}

export interface MenuBarProps {
  readonly menus: readonly MenuDefinition[]
}

export function MenuBar(props: MenuBarProps) {
  const { t } = useI18n()
  const [openId, setOpenId] = useState<string | null>(null)
  const containerRef = useRef<HTMLElement>(null)
  const menuButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const menuItemRefs = useRef(new Map<string, HTMLButtonElement>())
  const previousOpenId = useRef<string | null>(null)

  useEffect(() => {
    if (openId === null) {
      previousOpenId.current = null
      return
    }

    const activeMenuId = openId
    if (previousOpenId.current !== activeMenuId) {
      const firstItem = props.menus
        .find((menu) => menu.id === activeMenuId)
        ?.items.find((item) => !item.disabled && item.onSelect !== undefined)
      if (firstItem) {
        menuItemRefs.current.get(`${activeMenuId}/${firstItem.id}`)?.focus()
      }
    }
    previousOpenId.current = activeMenuId

    function handlePointer(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenId(null)
      }
    }

    function handleKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpenId(null)
        menuButtonRefs.current.get(activeMenuId)?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [openId, props.menus])

  function moveFocus(
    menuId: string,
    currentItemId: string,
    direction: -1 | 1 | 'first' | 'last',
  ): void {
    const menu = props.menus.find((candidate) => candidate.id === menuId)
    const enabledItems = menu?.items.filter((item) => !item.disabled && item.onSelect !== undefined)
    if (!enabledItems || enabledItems.length === 0) {
      return
    }

    const currentIndex = enabledItems.findIndex((item) => item.id === currentItemId)
    const nextIndex =
      direction === 'first'
        ? 0
        : direction === 'last'
          ? enabledItems.length - 1
          : (currentIndex + direction + enabledItems.length) % enabledItems.length
    menuItemRefs.current.get(`${menuId}/${enabledItems[nextIndex].id}`)?.focus()
  }

  function select(item: MenuItemDefinition): void {
    if (item.disabled || !item.onSelect) {
      return
    }
    setOpenId(null)
    item.onSelect()
  }

  return (
    <nav className="menu-bar" aria-label={t('menu.mainMenu')} ref={containerRef}>
      {props.menus.map((menu) => {
        const open = openId === menu.id
        return (
          <div className="menu" key={menu.id}>
            <button
              ref={(element) => {
                if (element) {
                  menuButtonRefs.current.set(menu.id, element)
                } else {
                  menuButtonRefs.current.delete(menu.id)
                }
              }}
              type="button"
              className={`menu-button${open ? ' is-open' : ''}`}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={`menu-${menu.id}`}
              onClick={() => setOpenId(open ? null : menu.id)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setOpenId(menu.id)
                }
              }}
            >
              {menu.label}
            </button>
            {open && (
              <div
                id={`menu-${menu.id}`}
                className="menu-dropdown"
                role="menu"
                aria-label={menu.label}
              >
                {menu.items.map((item) => (
                  <button
                    key={item.id}
                    ref={(element) => {
                      const key = `${menu.id}/${item.id}`
                      if (element) {
                        menuItemRefs.current.set(key, element)
                      } else {
                        menuItemRefs.current.delete(key)
                      }
                    }}
                    type="button"
                    role="menuitem"
                    className="menu-item"
                    disabled={item.disabled}
                    title={item.hint ?? item.label}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                        event.preventDefault()
                        moveFocus(menu.id, item.id, event.key === 'ArrowDown' ? 1 : -1)
                      } else if (event.key === 'Home' || event.key === 'End') {
                        event.preventDefault()
                        moveFocus(menu.id, item.id, event.key === 'Home' ? 'first' : 'last')
                      }
                    }}
                    onClick={() => select(item)}
                  >
                    <span className="menu-item-label">{item.label}</span>
                    {item.hint !== undefined && <span className="menu-hint">{item.hint}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
