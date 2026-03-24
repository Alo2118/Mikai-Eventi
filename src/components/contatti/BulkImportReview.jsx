import { useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, FEEDBACK_ICONS, TOAST_ICONS } from '../../lib/icons'
import { TIPOLOGIA_IMPORT } from '../../lib/constants'

// ── helpers ──────────────────────────────────────────────────────────────────

function defaultResolution(result) {
  const { matches = [], errors = [] } = result
  if (errors.length > 0) return { action: 'error' }

  const activeMatches = matches.filter(m => m.attivo)
  const inactiveMatches = matches.filter(m => !m.attivo)

  if (activeMatches.length > 0) return { action: 'link', contactId: activeMatches[0].id }
  if (inactiveMatches.length > 0) return { action: 'reactivate', contactId: inactiveMatches[0].id }
  return { action: 'create' }
}

function buildInitialResolutions(results) {
  return results.map(r => defaultResolution(r))
}

function contactLabel(contact) {
  const parts = [contact.nome, contact.cognome].filter(Boolean).join(' ')
  return parts || contact.azienda || contact.id
}

// ── summary counts ────────────────────────────────────────────────────────────

function useSummaryCounts(resolutions) {
  let newCount = 0
  let linkCount = 0
  let reactivateCount = 0
  let errorCount = 0

  for (const r of resolutions) {
    if (r.action === 'create') newCount++
    else if (r.action === 'link') linkCount++
    else if (r.action === 'reactivate') reactivateCount++
    else if (r.action === 'error') errorCount++
  }

  return { newCount, linkCount, reactivateCount, errorCount }
}

// ── row styling ───────────────────────────────────────────────────────────────

const ROW_STYLES = {
  create:     'bg-green-50 border-l-4 border-green-400',
  link:       'bg-yellow-50 border-l-4 border-yellow-400',
  reactivate: 'bg-orange-50 border-l-4 border-orange-400',
  error:      'bg-red-50 border-l-4 border-red-400',
}

// ── sub-components ────────────────────────────────────────────────────────────

function SummaryBar({ counts }) {
  const { newCount, linkCount, reactivateCount, errorCount } = counts

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {newCount > 0 && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-medium">
          <Icon icon={TOAST_ICONS.success} size={16} />
          {newCount} nuov{newCount === 1 ? 'o' : 'i'}
        </span>
      )}
      {linkCount > 0 && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
          <Icon icon={FEEDBACK_ICONS.warning} size={16} />
          {linkCount} esistent{linkCount === 1 ? 'e' : 'i'}
        </span>
      )}
      {reactivateCount > 0 && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-800 text-sm font-medium">
          <Icon icon={ACTION_ICONS.forward} size={16} />
          {reactivateCount} da riattivare
        </span>
      )}
      {errorCount > 0 && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-800 text-sm font-medium">
          <Icon icon={TOAST_ICONS.error} size={16} />
          {errorCount} con error{errorCount === 1 ? 'e' : 'i'}
        </span>
      )}
    </div>
  )
}

function RowLeft({ row }) {
  const tipLabel = TIPOLOGIA_IMPORT[row.tipologia]?.label ?? row.tipologia ?? '—'
  const fullName = [row.nome, row.cognome].filter(Boolean).join(' ') || '—'

  return (
    <div className="min-w-0">
      <p className="font-medium text-gray-900 text-base truncate">{fullName}</p>
      {row.azienda && (
        <p className="text-sm text-gray-600 truncate">{row.azienda}</p>
      )}
      <p className="text-xs text-gray-500 mt-0.5">{tipLabel}</p>
    </div>
  )
}

function RowRight({ result, resolution, onChangeResolution }) {
  const { matches = [], errors = [] } = result

  if (errors.length > 0) {
    return (
      <div className="flex flex-col gap-1 items-end">
        {errors.map((e, i) => (
          <p key={i} className="text-sm text-red-700" role="alert">{e.msg}</p>
        ))}
      </div>
    )
  }

  const activeMatches = matches.filter(m => m.attivo)
  const inactiveMatches = matches.filter(m => !m.attivo)
  const allMatches = [...activeMatches, ...inactiveMatches]

  if (allMatches.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-green-700">
        <Icon icon={ACTION_ICONS.check} size={18} />
        <span className="text-sm font-medium">Nuovo contatto</span>
      </div>
    )
  }

  const handleChange = (e) => {
    const val = e.target.value
    if (val === 'create') {
      onChangeResolution({ action: 'create' })
    } else {
      const [action, id] = val.split(':')
      onChangeResolution({ action, contactId: id })
    }
  }

  const selectedValue = resolution.action === 'create'
    ? 'create'
    : `${resolution.action}:${resolution.contactId}`

  return (
    <div className="min-w-[200px]">
      <select
        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 min-h-[48px] bg-white focus:outline-none focus:ring-2 focus:ring-mikai-400"
        value={selectedValue}
        onChange={handleChange}
        aria-label="Scegli come gestire questo contatto"
      >
        <option value="create">Crea nuovo</option>
        {activeMatches.map(m => (
          <option key={m.id} value={`link:${m.id}`}>
            È lo stesso: {contactLabel(m)}
          </option>
        ))}
        {inactiveMatches.map(m => (
          <option key={m.id} value={`reactivate:${m.id}`}>
            Riattiva: {contactLabel(m)}
          </option>
        ))}
      </select>
    </div>
  )
}

function ReviewRow({ result, resolution, onChangeResolution }) {
  const rowStyle = ROW_STYLES[resolution.action] ?? ROW_STYLES.create

  return (
    <div className={`flex items-start justify-between gap-4 p-4 rounded-lg ${rowStyle}`}>
      <RowLeft row={result.row} />
      <RowRight
        result={result}
        resolution={resolution}
        onChangeResolution={onChangeResolution}
      />
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export function BulkImportReview({ results, onConfirm, onCancel }) {
  const [resolutions, setResolutions] = useState(() => buildInitialResolutions(results))

  const counts = useSummaryCounts(resolutions)
  const hasErrors = counts.errorCount > 0

  function handleResolutionChange(index, resolution) {
    setResolutions(prev => {
      const next = [...prev]
      next[index] = resolution
      return next
    })
  }

  function handleConfirm() {
    onConfirm(resolutions)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Verifica contatti ({results.length})
        </h2>
        <p className="text-sm text-gray-600">
          Controlla ogni riga e scegli come gestire i possibili duplicati.
        </p>
      </div>

      <SummaryBar counts={counts} />

      <div className="flex flex-col gap-3">
        {results.map((result, i) => (
          <ReviewRow
            key={i}
            result={result}
            resolution={resolutions[i]}
            onChangeResolution={(res) => handleResolutionChange(i, res)}
          />
        ))}
      </div>

      {hasErrors && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3" role="alert">
          Correggi le righe con errori prima di procedere, oppure tornare indietro e modificarle nel foglio.
        </p>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          <Icon icon={ACTION_ICONS.back} size={18} className="mr-2" />
          Modifica lista
        </Button>
        <Button
          variant="primary"
          disabled={hasErrors}
          onClick={handleConfirm}
        >
          Conferma import
        </Button>
      </div>
    </div>
  )
}
