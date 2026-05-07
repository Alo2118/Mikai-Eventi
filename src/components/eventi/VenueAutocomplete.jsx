import { useState, useEffect, useRef } from 'react'
import { useVenuesStore } from '../../hooks/useVenues'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { useToastStore } from '../ui/Toast'
import { FORM_CONTAINER_STYLE, INPUT_STYLE, INPUT_ERROR_STYLE } from '../../lib/constants'

export function VenueAutocomplete({ value, onChange, onSelect, onBlur, error }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newVenue, setNewVenue] = useState({ nome: '', indirizzo: '', cap: '', citta: '', provincia: '' })
  const timeoutRef = useRef(null)

  const searchVenues = useVenuesStore(s => s.searchVenues)
  const createVenue = useVenuesStore(s => s.createVenue)
  const addToast = useToastStore(s => s.add)

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (query.length < 2) { setResults([]); setShowDropdown(false); return }

    timeoutRef.current = setTimeout(async () => {
      const { data } = await searchVenues(query)
      setResults(data)
      setShowDropdown(data.length > 0 || query.length >= 2)
    }, 300)

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [query])

  const handleSelect = (venue) => {
    setQuery(venue.nome)
    setShowDropdown(false)
    onSelect(venue)
  }

  const handleCreateNew = async () => {
    if (!newVenue.nome.trim()) return
    const { data, error } = await createVenue(newVenue)
    if (error) { addToast(error, 'error'); return }
    setShowNewForm(false)
    setQuery(data.nome)
    setShowDropdown(false)
    onSelect(data)
    addToast('Sede salvata nella rubrica', 'success')
  }

  return (
    <div className="relative">
      <label className={`block text-base font-medium mb-1 ${error ? 'text-red-600' : 'text-gray-700'}`}>
        Sede <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value) }}
        onFocus={() => { if (results.length > 0) setShowDropdown(true) }}
        onBlur={() => onBlur && onBlur()}
        className={error ? INPUT_ERROR_STYLE : INPUT_STYLE}
        placeholder="Cerca sede o digita il nome..."
        aria-invalid={!!error}
      />
      {error && <p className="text-sm text-red-600 mt-1" role="alert">{error}</p>}

      {showDropdown && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {results.map((v) => (
            <button
              key={v.id}
              onClick={() => handleSelect(v)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 min-h-[48px]"
            >
              <p className="text-base font-medium text-gray-900">{v.nome}</p>
              <p className="text-sm text-gray-500">{[v.citta, v.provincia].filter(Boolean).join(', ')}</p>
            </button>
          ))}
          <button
            onClick={() => { setShowDropdown(false); setShowNewForm(true); setNewVenue({ ...newVenue, nome: query }) }}
            className="w-full text-left px-4 py-3 hover:bg-mikai-50 text-mikai-600 font-medium min-h-[48px]"
          >
            <Icon icon={ACTION_ICONS.add} size={16} className="inline mr-1" />
            Crea nuova sede
          </button>
        </div>
      )}

      {showNewForm && (
        <div className={'mt-3 ' + FORM_CONTAINER_STYLE + ' space-y-3'}>
          <h4 className="text-base font-semibold text-gray-900">Nuova sede</h4>
          <input type="text" value={newVenue.nome} onChange={(e) => setNewVenue({ ...newVenue, nome: e.target.value })}
            placeholder="Nome sede" className={INPUT_STYLE} />
          <input type="text" value={newVenue.indirizzo} onChange={(e) => setNewVenue({ ...newVenue, indirizzo: e.target.value })}
            placeholder="Indirizzo" className={INPUT_STYLE} />
          <div className="grid grid-cols-3 gap-3">
            <input type="text" value={newVenue.cap} onChange={(e) => setNewVenue({ ...newVenue, cap: e.target.value })}
              placeholder="CAP" className={INPUT_STYLE} />
            <input type="text" value={newVenue.citta} onChange={(e) => setNewVenue({ ...newVenue, citta: e.target.value })}
              placeholder="Città" className={INPUT_STYLE} />
            <input type="text" value={newVenue.provincia} onChange={(e) => setNewVenue({ ...newVenue, provincia: e.target.value.toUpperCase().slice(0, 2) })}
              placeholder="Prov." maxLength={2} className={INPUT_STYLE} />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowNewForm(false)}>Annulla</Button>
            <Button onClick={handleCreateNew} disabled={!newVenue.nome.trim()}>Salva sede</Button>
          </div>
        </div>
      )}
    </div>
  )
}
