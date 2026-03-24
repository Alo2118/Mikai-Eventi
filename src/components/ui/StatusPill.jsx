import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { StatusBadge } from './StatusBadge'

function StatusPopover({ anchorRef, stato, labels, colors, onChange, onClose }) {
  const popoverRef = useRef(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const scrollY = window.scrollY
    const scrollX = window.scrollX
    setPosition({
      top: rect.bottom + scrollY + 6,
      left: rect.left + scrollX,
    })
  }, [anchorRef])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    function handleClickOutside(e) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [anchorRef, onClose])

  const options = Object.keys(labels)

  return createPortal(
    <div
      ref={popoverRef}
      role="listbox"
      aria-label="Cambia stato"
      style={{ top: position.top, left: position.left }}
      className="fixed z-50 min-w-[180px] bg-white border border-gray-200 rounded-lg shadow-xl py-1"
    >
      {options.map(key => (
        <button
          key={key}
          role="option"
          aria-selected={key === stato}
          onClick={() => {
            onChange(key)
            onClose()
          }}
          className={`w-full flex items-center px-3 min-h-[48px] text-left hover:bg-gray-50 transition-colors ${
            key === stato ? 'bg-mikai-50' : ''
          }`}
        >
          <StatusBadge stato={key} labels={labels} colors={colors} />
        </button>
      ))}
    </div>,
    document.body
  )
}

export function StatusPill({ stato, labels, colors, editable = false, onChange }) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)

  if (!editable) {
    return <StatusBadge stato={stato} labels={labels} colors={colors} />
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center min-h-[48px] min-w-[48px] rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-mikai-400 focus:ring-offset-2"
      >
        <StatusBadge stato={stato} labels={labels} colors={colors} />
      </button>

      {open && (
        <StatusPopover
          anchorRef={anchorRef}
          stato={stato}
          labels={labels}
          colors={colors}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
