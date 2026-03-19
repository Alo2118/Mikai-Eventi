import { useState, useEffect } from 'react'

export function SearchInput({ value, onChange, placeholder = 'Cerca...', delay = 300 }) {
  const [local, setLocal] = useState(value)

  useEffect(() => { setLocal(value) }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) onChange(local)
    }, delay)
    return () => clearTimeout(timer)
  }, [local, delay, value])

  return (
    <input
      type="search"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 min-h-[48px]"
      aria-label={placeholder}
    />
  )
}
