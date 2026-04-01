import { useRef, useEffect, useState } from 'react'

const DOT_COLORS = {
  complete:   'bg-green-500',
  warning:    'bg-yellow-500',
  incomplete: 'bg-red-500',
}

const STATUS_LABELS = {
  complete: 'Completato',
  warning: 'Attenzione',
  incomplete: 'Incompleto',
}

export function Tabs({ tabs, activeTab, onChange }) {
  const navRef = useRef(null)
  const activeRef = useRef(null)
  const [focusOnChange, setFocusOnChange] = useState(false)

  // Scroll active tab into view on mount and tab change
  useEffect(() => {
    if (activeRef.current && navRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [activeTab])

  // Focus the active tab button after keyboard navigation (post-render, after tabIndex updates)
  useEffect(() => {
    if (!focusOnChange) return
    const buttons = navRef.current?.querySelectorAll('[role="tab"]')
    const activeIndex = tabs.findIndex(t => t.id === activeTab)
    if (buttons?.[activeIndex]) buttons[activeIndex].focus()
    setFocusOnChange(false)
  }, [activeTab, focusOnChange, tabs])

  function handleKeyDown(e, currentIndex) {
    let nextIndex = null

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1
    }

    if (nextIndex !== null) {
      e.preventDefault()
      onChange(tabs[nextIndex].id)
      setFocusOnChange(true)
    }
  }

  return (
    <div className="border-b border-gray-200 relative">
      <nav
        ref={navRef}
        role="tablist"
        aria-label="Sezioni"
        className="flex gap-0 -mb-px overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={activeTab === tab.id ? activeRef : undefined}
            role="tab"
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`whitespace-nowrap px-3 md:px-4 py-3 min-h-[48px] text-sm md:text-base font-medium border-b-2 transition-colors flex-shrink-0 ${
              activeTab === tab.id
                ? 'border-mikai-400 text-mikai-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.status && (
                <span className={`w-2 h-2 rounded-full ${DOT_COLORS[tab.status] || ''}`} aria-label={STATUS_LABELS[tab.status] || tab.status} />
              )}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
