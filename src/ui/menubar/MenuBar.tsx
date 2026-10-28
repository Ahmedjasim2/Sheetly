import { useEffect, useRef, useState } from 'react'

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
  const [openId, setOpenId] = useState<string | null>(null)
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (openId === null) {
      return
    }

    function handlePointer(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenId(null)
      }
    }

    function handleKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpenId(null)
      }
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [openId])

  function select(item: MenuItemDefinition): void {
    if (item.disabled || !item.onSelect) {
      return
    }
    setOpenId(null)
    item.onSelect()
  }

  return (
    <nav className="menu-bar" aria-label="Main menu" ref={containerRef}>
      {props.menus.map((menu) => {
        const open = openId === menu.id
        return (
          <div className="menu" key={menu.id}>
            <button
              type="button"
              className={`menu-button${open ? ' is-open' : ''}`}
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : menu.id)}
            >
              {menu.label}
            </button>
            {open && (
              <div className="menu-dropdown" role="menu" aria-label={menu.label}>
                {menu.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    className="menu-item"
                    disabled={item.disabled}
                    title={item.hint ?? item.label}
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
