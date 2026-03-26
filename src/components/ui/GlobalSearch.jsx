import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'
import { ACTION_ICONS, TIPO_EVENTO_ICONS, NAV_ICONS } from '../../lib/icons'
import { useGlobalSearchStore } from '../../hooks/useGlobalSearch'

function ResultItem({ item, active, onClick }) {
  const iconMap = {
    evento: TIPO_EVENTO_ICONS[item.tipo] || NAV_ICONS.eventi,
    contatto: NAV_ICONS.contatti,
    materiale: NAV_ICONS.materiale,
  }

  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors min-h-[48px] ${
        active ? 'bg-mikai-50 text-mikai-700' : 'text-gray-700 hover:bg-gray-50'
      }`}
      onClick={onClick}
      role="option"
      aria-selected={active}
    >
      <Icon icon={iconMap[item.category]} size={20} className={active ? 'text-mikai-500' : 'text-gray-400'} />
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium truncate">{item.title}</p>
        {item.subtitle && <p className="text-sm text-gray-500 truncate">{item.subtitle}</p>}
      </div>
      <span className="text-xs text-gray-400 shrink-0 capitalize">{item.categoryLabel}</span>
    </button>
  )
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const results = useGlobalSearchStore(s => s.results)
  const loading = useGlobalSearchStore(s => s.loading)
  const search = useGlobalSearchStore(s => s.search)
  const clearResults = useGlobalSearchStore(s => s.clearResults)

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      clearResults()
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Search with debounce
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      clearResults()
      return
    }

    const timer = setTimeout(() => {
      search(query.trim())
      setActiveIndex(0)
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  function handleSelect(item) {
    setOpen(false)
    navigate(item.path)
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault()
      handleSelect(results[activeIndex])
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />

      {/* Search panel */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-gray-200">
          <Icon icon={ACTION_ICONS.search} size={20} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cerca eventi, contatti, materiali..."
            className="flex-1 py-4 text-base outline-none bg-transparent placeholder-gray-400"
            aria-label="Ricerca globale"
            autoComplete="off"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-xs text-gray-400 bg-gray-100 rounded border border-gray-200">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto" role="listbox">
          {loading && (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">Ricerca in corso...</div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">
              Nessun risultato per "{query}"
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((item, i) => (
                <ResultItem
                  key={`${item.category}-${item.id}`}
                  item={item}
                  active={i === activeIndex}
                  onClick={() => handleSelect(item)}
                />
              ))}
            </div>
          )}

          {!loading && query.trim().length < 2 && (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">
              Digita almeno 2 caratteri per cercare
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200">↑↓</kbd>
            naviga
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200">↵</kbd>
            apri
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200">Esc</kbd>
            chiudi
          </span>
        </div>
      </div>
    </div>
  )
}
