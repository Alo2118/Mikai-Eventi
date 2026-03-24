import { SELECT_STYLE } from '../../lib/constants'

export function FilterSelect({ label, options, value, onChange, className = '' }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`${SELECT_STYLE} ${className}`}
    >
      <option value="">{label ? `Tutti — ${label}` : 'Tutti'}</option>
      {Object.entries(options).map(([k, v]) => (
        <option key={k} value={k}>{typeof v === 'object' ? v.label || v.nome || k : v}</option>
      ))}
    </select>
  )
}
