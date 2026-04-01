import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'
import { ACTION_ICONS, TIPO_EVENTO_ICONS, NAV_ICONS, COMPLIANCE_ICONS } from '../../lib/icons'
import { useGlobalSearchStore } from '../../hooks/useGlobalSearch'

const HISTORY_KEY = 'mikai_search_history'
const MAX_HISTORY = 5

// Category configuration: id, label, list page path
const CATEGORIES = [
  { id: 'evento',    label: 'Eventi',    path: '/eventi'   },
  { id: 'contatto',  label: 'Contatti',  path: '/contatti' },
  { id: 'materiale', label: 'Materiali', path: '/materiale' },
]

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function saveHistory(query) {
  const trimmed = query.trim()
  if (!trimmed) return
  const prev = getHistory().filter(h => h !== trimmed)
  const next = [trimmed, ...prev].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

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
    </button>
  )
}

function CategorySection({ cat, items, count, activeBaseIndex, onSelect, onShowAll }) {
  const shown = items.filter(i => i.category === cat.id)
  if (shown.length === 0) return null

  const hasMore = count > shown.length

  return (
    <div>
      {/* Category header */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {cat.label} ({count})
        </span>
      </div>

      {/* Results */}
      {shown.map((item, i) => (
        <ResultItem
          key={`${item.category}-${item.id}`}
          item={item}
          active={activeBaseIndex + i === activeBaseIndex /* handled by parent */}
          onClick={() => onSelect(item)}
        />
      ))}

      {/* "Mostra tutti" link */}
      {hasMore && (
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-mikai-600 hover:bg-mikai-50 transition-colors min-h-[40px]"
          onClick={() => onShowAll(cat.path)}
        >
          <Icon icon={ACTION_ICONS.forward} size={14} />
          Mostra tutti ({count})
        </button>
      )}
    </div>
  )
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [history, setHistory] = useState([])
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const results = useGlobalSearchStore(s => s.results)
  const counts = useGlobalSearchStore(s => s.counts)
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

  // Focus input when opened, load history
  useEffect(() => {
    if (open) {
      setQuery('')
      clearResults()
      setActiveIndex(0)
      setHistory(getHistory())
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
    saveHistory(query)
    setOpen(false)
    navigate(item.path)
  }

  function handleShowAll(listPath) {
    saveHistory(query)
    setOpen(false)
    navigate(`${listPath}?search=${encodeURIComponent(query.trim())}`)
  }

  function handleHistoryClick(term) {
    setQuery(term)
    setActiveIndex(0)
    // Trigger search immediately
    search(term)
  }

  function handleClearHistory() {
    clearHistory()
    setHistory([])
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
    } else if (e.key === 'Enter' && query.trim().length < 2) {
      // no-op
    }
  }

  const hasQuery = query.trim().length >= 2
  const hasResults = results.length > 0

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
          {query && (
            <button
              onClick={() => { setQuery(''); clearResults(); inputRef.current?.focus() }}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded"
              aria-label="Cancella testo"
            >
              <Icon icon={ACTION_ICONS.close} size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-xs text-gray-400 bg-gray-100 rounded border border-gray-200">
            Esc
          </kbd>
        </div>

        {/* Results area */}
        <div className="max-h-[50vh] overflow-y-auto" role="listbox">

          {/* Loading */}
          {loading && (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">Ricerca in corso...</div>
          )}

          {/* Empty state with query */}
          {!loading && hasQuery && !hasResults && (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-500 text-base font-medium">
                Nessun risultato per &ldquo;{query.trim()}&rdquo;
              </p>
              <p className="text-gray-400 text-sm mt-1">Prova con termini diversi.</p>
            </div>
          )}

          {/* Grouped results */}
          {!loading && hasResults && (
            <div className="py-1 divide-y divide-gray-100">
              {CATEGORIES.map(cat => (
                <CategorySection
                  key={cat.id}
                  cat={cat}
                  items={results}
                  count={counts[cat.id] || 0}
                  onSelect={handleSelect}
                  onShowAll={handleShowAll}
                />
              ))}
            </div>
          )}

          {/* History — shown when no query typed */}
          {!hasQuery && !loading && history.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Ricerche recenti
                </span>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Cancella cronologia
                </button>
              </div>
              {history.map(term => (
                <button
                  key={term}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-600 hover:bg-gray-50 transition-colors min-h-[48px]"
                  onClick={() => handleHistoryClick(term)}
                >
                  <Icon icon={COMPLIANCE_ICONS.audit} size={18} className="text-gray-400 shrink-0" />
                  <span className="text-base">{term}</span>
                </button>
              ))}
            </div>
          )}

          {/* Prompt — shown when no query and no history */}
          {!hasQuery && !loading && history.length === 0 && (
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
