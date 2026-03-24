import { useState, useEffect, useRef } from 'react'
import { useContactsStore } from '../../hooks/useContacts'
import { INPUT_STYLE } from '../../lib/constants'

export function ContactPicker({ value, onChange, placeholder = 'Cerca contatto...' }) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const searchContacts = useContactsStore(s => s.searchContacts)

  useEffect(() => {
    if (term.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await searchContacts(term)
      setResults(data)
      setOpen(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [term, searchContacts])

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (contact) => {
    onChange(contact)
    setTerm(`${contact.cognome} ${contact.nome}`)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={term}
        onChange={(e) => { setTerm(e.target.value); if (!value) onChange(null) }}
        placeholder={placeholder}
        className={INPUT_STYLE}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map(c => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full px-4 py-3 text-left hover:bg-mikai-50 min-h-[48px] text-base"
              >
                <span className="font-medium">{c.cognome} {c.nome}</span>
                {c.azienda && <span className="text-gray-500 ml-2">— {c.azienda}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
