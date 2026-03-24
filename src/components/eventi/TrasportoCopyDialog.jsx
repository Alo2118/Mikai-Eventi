import { useState } from 'react'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'

function buildLabel(person, kind) {
  if (kind === 'staff') {
    const cognome = person.user?.cognome ?? ''
    const nome = person.user?.nome ?? ''
    return `${cognome} ${nome}`.trim()
  }
  const cognome = person.contact?.cognome ?? ''
  const nome = person.contact?.nome ?? ''
  const azienda = person.contact?.azienda
  const base = `${cognome} ${nome}`.trim()
  return azienda ? `${base} — ${azienda}` : base
}

function buildTarget(person, kind) {
  if (kind === 'staff') return { userId: person.user_id }
  return { contactId: person.contact_id }
}

export function TrasportoCopyDialog({
  sourceRecord,
  eventId,
  direzione,
  staff,
  participants,
  existingTrasporti,
  onCopy,
  onClose,
}) {
  const copyTrasportoToMany = useLogisticsStore(s => s.copyTrasportoToMany)
  const addToast = useToastStore(s => s.add)
  const [selected, setSelected] = useState(new Set())
  const [saving, setSaving] = useState(false)

  // People who already have a transport record for this direction
  const hasTransport = (kind, id) =>
    existingTrasporti.some(t =>
      t.direzione === direzione &&
      (kind === 'staff' ? t.user_id === id : t.contact_id === id)
    )

  const eligibleStaff = staff.filter(s => !hasTransport('staff', s.user_id))
  const eligibleParticipants = participants.filter(p => !hasTransport('participant', p.contact_id))

  const allItems = [
    ...eligibleStaff.map(s => ({
      key: `staff-${s.user_id}`,
      label: buildLabel(s, 'staff'),
      target: buildTarget(s, 'staff'),
    })),
    ...eligibleParticipants.map(p => ({
      key: `participant-${p.contact_id}`,
      label: buildLabel(p, 'participant'),
      target: buildTarget(p, 'participant'),
    })),
  ]

  const allSelected = allItems.length > 0 && selected.size === allItems.length

  function toggleItem(key) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allItems.map(i => i.key)))
    }
  }

  async function handleCopy() {
    const targets = allItems
      .filter(i => selected.has(i.key))
      .map(i => i.target)
    if (targets.length === 0) return

    setSaving(true)
    const { error } = await copyTrasportoToMany(sourceRecord.id, targets, eventId)
    setSaving(false)

    if (error) {
      addToast('Errore durante la copia del trasporto.', 'error')
    } else {
      addToast(`Trasporto copiato a ${targets.length} ${targets.length === 1 ? 'persona' : 'persone'}.`, 'success')
      onCopy?.()
      onClose()
    }
  }

  const dirLabel = direzione === 'andata' ? "l'andata" : 'il ritorno'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 space-y-3 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900">
            Copia trasporto ad altre persone
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Icon icon={ACTION_ICONS.close} size={20} />
          </button>
        </div>

        {allItems.length === 0 ? (
          <p className="text-base text-gray-500 py-2">
            Tutti hanno già un trasporto per {dirLabel}.
          </p>
        ) : (
          <>
            {/* Select all toggle */}
            <button
              type="button"
              onClick={toggleAll}
              className="text-sm font-medium text-mikai-400 hover:underline min-h-[48px] flex items-center"
            >
              {allSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
            </button>

            {/* Scrollable person list */}
            <ul className="max-h-60 overflow-y-auto space-y-1 border border-gray-100 rounded-lg divide-y divide-gray-100">
              {allItems.map(item => (
                <li key={item.key}>
                  <label className="flex items-center gap-3 px-3 min-h-[48px] cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded accent-mikai-400 cursor-pointer flex-shrink-0"
                      checked={selected.has(item.key)}
                      onChange={() => toggleItem(item.key)}
                    />
                    <span className="text-base text-gray-800 leading-snug">{item.label}</span>
                  </label>
                </li>
              ))}
            </ul>

            {/* Action row */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={onClose} disabled={saving}>
                Annulla
              </Button>
              <Button
                variant="primary"
                onClick={handleCopy}
                loading={saving}
                disabled={selected.size === 0 || saving}
              >
                Copia a {selected.size > 0 ? `${selected.size} ` : ''}
                {selected.size === 1 ? 'persona' : 'persone'}
              </Button>
            </div>

            {selected.size === 0 && (
              <p className="text-sm text-gray-400 text-right" role="status">
                Seleziona almeno una persona.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
