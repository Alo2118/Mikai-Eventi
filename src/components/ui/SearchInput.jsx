import { useState, useEffect } from 'react'
import { Icon } from './Icon'
import { ACTION_ICONS } from '../../lib/icons'

export function SearchInput({ value, onChange, placeholder = 'Cerca...', delay = 300 }) {
  const [local, setLocal] = useState(value)

  useEffect(() => { setLocal(value) }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(local)
    }, delay)
    return () => clearTimeout(timer)
  }, [local, delay])

  function handleClear() {
    setLocal('')
    onChange('')
  }

  return (
    <div className="relative w-full">
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className={'w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 min-h-[48px]' + (local ? ' pr-12' : '')}
        aria-label={placeholder}
      />
      {local && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Cancella ricerca"
          className="absolute right-0 top-0 h-full min-w-[48px] flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-mikai-400 rounded-r-lg"
        >
          <Icon icon={ACTION_ICONS.close} size={16} />
        </button>
      )}
    </div>
  )
}
