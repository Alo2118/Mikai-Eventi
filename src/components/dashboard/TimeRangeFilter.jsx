import { useState } from 'react'
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns'
import { formatDayISO } from '../../lib/date-utils'

function quarterRange() {
  const now = new Date()
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0)
  return { start: formatDayISO(qStart), end: formatDayISO(qEnd) }
}

function monthRange() {
  const now = new Date()
  return { start: formatDayISO(startOfMonth(now)), end: formatDayISO(endOfMonth(now)) }
}

function yearRange() {
  const now = new Date()
  return { start: formatDayISO(startOfYear(now)), end: formatDayISO(endOfYear(now)) }
}

const PRESETS = [
  { id: 'mese', label: 'Mese', range: monthRange },
  { id: 'trimestre', label: 'Trimestre', range: quarterRange },
  { id: 'anno', label: 'Anno', range: yearRange },
  { id: 'personalizzato', label: 'Personalizzato', range: null },
]

export function TimeRangeFilter({ value, onChange }) {
  const [customStart, setCustomStart] = useState(value?.start || '')
  const [customEnd, setCustomEnd] = useState(value?.end || '')

  function handlePreset(preset) {
    if (preset.range) {
      const r = preset.range()
      onChange({ type: preset.id, start: r.start, end: r.end })
    } else {
      onChange({ type: 'personalizzato', start: customStart, end: customEnd })
    }
  }

  function handleCustomChange(field, val) {
    const next = field === 'start'
      ? { start: val, end: customEnd }
      : { start: customStart, end: val }
    if (field === 'start') setCustomStart(val)
    else setCustomEnd(val)
    if (next.start && next.end) {
      onChange({ type: 'personalizzato', start: next.start, end: next.end })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => handlePreset(preset)}
            className={`px-4 py-2 rounded-lg text-sm font-medium min-h-[48px] whitespace-nowrap transition-colors ${
              value?.type === preset.id
                ? 'bg-mikai-400 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {value?.type === 'personalizzato' && (
        <div className="flex gap-3 items-center flex-wrap">
          <label className="text-sm text-gray-600">
            Da
            <input
              type="date"
              value={customStart}
              onChange={e => handleCustomChange('start', e.target.value)}
              className="ml-2 px-3 py-2 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 outline-none"
            />
          </label>
          <label className="text-sm text-gray-600">
            A
            <input
              type="date"
              value={customEnd}
              onChange={e => handleCustomChange('end', e.target.value)}
              className="ml-2 px-3 py-2 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 outline-none"
            />
          </label>
        </div>
      )}
    </div>
  )
}
