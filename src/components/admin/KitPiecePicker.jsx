import { useState, useMemo, useRef, useEffect } from 'react'
import { useProductsStore } from '../../hooks/useProducts'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { INPUT_STYLE } from '../../lib/constants'

function normalize(s) { return (s || '').toLowerCase().trim() }

// Compact product picker for kit_contents rows.
// Value: { piece_product_id, piece_name, piece_code }
// - When piece_product_id is set: shows a "chip" with the chosen product and a clear button.
// - Otherwise: shows a search input with autocomplete; selecting a product fills the value.
// - "Pezzo non a catalogo" link toggles to manual nome+codice inputs.
export function KitPiecePicker({ value, onChange, excludeProductId }) {
  const products = useProductsStore(s => s.products)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  // Open in manual mode if the value already has manual data (legacy/non-catalog piece)
  const [manualMode, setManualMode] = useState(() =>
    !value?.piece_product_id && !!(value?.piece_name || value?.piece_code)
  )
  const containerRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const results = useMemo(() => {
    const q = normalize(query)
    if (q.length < 2) return []
    return products
      .filter(p => p.attivo !== false && p.id !== excludeProductId)
      .filter(p => normalize(p.codice).includes(q) || normalize(p.nome).includes(q))
      .slice(0, 30)
  }, [products, query, excludeProductId])

  const selectedProduct = value?.piece_product_id
    ? products.find(p => p.id === value.piece_product_id)
    : null

  const handleSelect = (p) => {
    onChange({
      piece_product_id: p.id,
      piece_name: p.nome,
      piece_code: p.codice || '',
    })
    setQuery('')
    setOpen(false)
    setManualMode(false)
  }

  const handleClear = () => {
    onChange({ piece_product_id: null, piece_name: '', piece_code: '' })
    setQuery('')
    setManualMode(false)
  }

  // Selected product chip
  if (selectedProduct && !manualMode) {
    return (
      <div className="flex items-center gap-2 p-2 bg-mikai-50 border border-mikai-200 rounded-lg">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{selectedProduct.nome}</p>
          <p className="text-xs text-gray-500 font-mono">
            {selectedProduct.codice || '—'}{selectedProduct.famiglia ? ` · ${selectedProduct.famiglia}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-gray-400 hover:text-red-500 min-h-[36px] min-w-[36px] flex items-center justify-center"
          aria-label="Rimuovi prodotto"
        >
          <Icon icon={ACTION_ICONS.close} size={16} />
        </button>
      </div>
    )
  }

  // Manual mode (free-text fallback) — auto-link to catalog when codice matches exactly
  if (manualMode) {
    const handleCodeChange = (e) => {
      const code = e.target.value
      const match = code.trim()
        ? products.find(p => p.attivo !== false && p.id !== excludeProductId && normalize(p.codice) === normalize(code))
        : null
      if (match) {
        onChange({
          piece_product_id: match.id,
          piece_name: match.nome,
          piece_code: match.codice || '',
        })
      } else {
        onChange({ ...value, piece_product_id: null, piece_code: code })
      }
    }
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            className={INPUT_STYLE}
            placeholder="Nome pezzo"
            value={value?.piece_name || ''}
            onChange={(e) => onChange({ ...value, piece_product_id: null, piece_name: e.target.value })}
          />
          <input
            className={INPUT_STYLE + ' w-32'}
            placeholder="Codice"
            value={value?.piece_code || ''}
            onChange={handleCodeChange}
          />
        </div>
        <button
          type="button"
          onClick={() => { setManualMode(false); handleClear() }}
          className="text-sm text-mikai-600 hover:text-mikai-700 min-h-[36px]"
        >
          ← Scegli da catalogo
        </button>
      </div>
    )
  }

  // Search mode (default)
  return (
    <div ref={containerRef} className="relative">
      <input
        className={INPUT_STYLE}
        placeholder="Cerca prodotto per codice o nome…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && query.length >= 2 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
          {results.length > 0 ? (
            results.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 min-h-[48px]"
              >
                <p className="text-sm font-medium text-gray-900 truncate">{p.nome}</p>
                <p className="text-xs text-gray-500 font-mono">
                  {p.codice || '—'}{p.famiglia ? ` · ${p.famiglia}` : ''}
                </p>
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-gray-500">Nessun prodotto trovato per “{query}”.</p>
          )}
          <button
            type="button"
            onClick={() => { setOpen(false); setManualMode(true) }}
            className="w-full text-left px-3 py-2 hover:bg-mikai-50 text-mikai-600 font-medium min-h-[48px]"
          >
            <Icon icon={ACTION_ICONS.add} size={14} className="inline mr-1" />
            Pezzo non a catalogo (inserisci manualmente)
          </button>
        </div>
      )}
    </div>
  )
}
