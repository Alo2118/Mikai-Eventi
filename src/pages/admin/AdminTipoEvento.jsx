import { useState, useEffect } from 'react'
import { useAdminStore } from '../../hooks/useAdmin'
import { useToastStore } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { ACTION_ICONS, ICON_PICKER_OPTIONS } from '../../lib/icons'
import { CARD_STYLE, FORM_CONTAINER_STYLE, INPUT_STYLE, COLORI_LIST, COLOR_BG_400 } from '../../lib/constants'

export function AdminTipoEvento() {
  const eventTypes = useAdminStore(s => s.eventTypes)
  const loading = useAdminStore(s => s.eventTypesLoading)
  const fetchEventTypes = useAdminStore(s => s.fetchEventTypes)
  const createEventType = useAdminStore(s => s.createEventType)
  const updateEventType = useAdminStore(s => s.updateEventType)
  const deleteEventType = useAdminStore(s => s.deleteEventType)
  const addToast = useToastStore(s => s.add)

  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { fetchEventTypes() }, [])

  function handleNew() {
    setEditing({
      codice: '', nome: '', colore: 'mikai', icona: 'calendar',
      ordine: (eventTypes.length + 1) * 10, attivo: true,
      richiede_spedizione: true, richiede_hotel: true, richiede_trasporti: true,
      usa_tavoli: false,
    })
  }

  function handleEdit(et) {
    setEditing({ ...et })
  }

  async function handleSave() {
    if (!editing.codice?.trim() || !editing.nome?.trim()) {
      addToast('Codice e nome sono obbligatori', 'warning')
      return
    }
    setSaving(true)
    if (editing.id) {
      const { error } = await updateEventType(editing.id, {
        codice: editing.codice.trim(),
        nome: editing.nome.trim(),
        colore: editing.colore,
        icona: editing.icona,
        ordine: Number(editing.ordine) || 0,
        attivo: editing.attivo,
        richiede_spedizione: !!editing.richiede_spedizione,
        richiede_hotel: !!editing.richiede_hotel,
        richiede_trasporti: !!editing.richiede_trasporti,
        usa_tavoli: !!editing.usa_tavoli,
      })
      if (error) addToast(error, 'error')
      else { addToast('Tipologia aggiornata', 'success'); setEditing(null) }
    } else {
      const { error } = await createEventType({
        codice: editing.codice.trim().toLowerCase().replace(/\s+/g, '_'),
        nome: editing.nome.trim(),
        colore: editing.colore,
        icona: editing.icona,
        ordine: Number(editing.ordine) || 0,
        attivo: editing.attivo,
        richiede_spedizione: !!editing.richiede_spedizione,
        richiede_hotel: !!editing.richiede_hotel,
        richiede_trasporti: !!editing.richiede_trasporti,
        usa_tavoli: !!editing.usa_tavoli,
      })
      if (error) addToast(error, 'error')
      else { addToast('Tipologia creata', 'success'); setEditing(null) }
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleting) return
    const { error } = await deleteEventType(deleting.id)
    if (error) addToast('Impossibile eliminare: potrebbe essere in uso da eventi esistenti', 'error')
    else addToast('Tipologia eliminata', 'success')
    setDeleting(null)
  }

  const setField = (key) => (e) => setEditing(prev => ({ ...prev, [key]: e.target.value }))

  return (
    <div>
      <MobileHeader title="Tipologie Evento" />
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Amministrazione' }, { label: 'Tipologie Evento' }]} />
      </div>
      <PageHeader
        title="Tipologie Evento"
        subtitle="Gestisci le tipologie di evento disponibili"
        actions={[
          <Button key="add" onClick={handleNew}>
            <Icon icon={ACTION_ICONS.add} size={16} className="mr-1.5" />
            Nuova tipologia
          </Button>,
        ]}
      />

      <div className="px-4 md:px-8 pb-8 space-y-4">
        {editing && (
          <div className={FORM_CONTAINER_STYLE + ' border border-gray-200 space-y-4 max-w-lg'}>
            <h3 className="font-semibold text-lg">{editing.id ? 'Modifica tipologia' : 'Nuova tipologia'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Codice <span className="text-red-500">*</span></label>
                <input
                  className={INPUT_STYLE}
                  value={editing.codice}
                  onChange={setField('codice')}
                  placeholder="es. simposio"
                  disabled={!!editing.id}
                />
                {!editing.id && <p className="text-xs text-gray-400 mt-1">Identificativo unico, non modificabile dopo la creazione</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
                <input className={INPUT_STYLE} value={editing.nome} onChange={setField('nome')} placeholder="es. Simposio" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Colore</label>
                <div className="flex flex-wrap gap-2">
                  {COLORI_LIST.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditing(prev => ({ ...prev, colore: c }))}
                      className={`w-8 h-8 rounded-full ${COLOR_BG_400[c]} transition-all ${
                        editing.colore === c ? 'ring-2 ring-offset-2 ring-gray-800 scale-110' : 'hover:scale-105'
                      }`}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icona</label>
                <div className="flex flex-wrap gap-1.5">
                  {ICON_PICKER_OPTIONS.map(ic => (
                    <button
                      key={ic.value}
                      type="button"
                      onClick={() => setEditing(prev => ({ ...prev, icona: ic.value }))}
                      className={`min-h-[48px] min-w-[48px] rounded-lg flex items-center justify-center transition-all text-sm ${
                        editing.icona === ic.value
                          ? 'bg-mikai-100 text-mikai-700 ring-2 ring-mikai-400'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      aria-label={ic.label}
                      title={ic.label}
                    >
                      <Icon name={ic.value} size={18} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ordine</label>
                <input type="number" className={INPUT_STYLE} value={editing.ordine} onChange={setField('ordine')} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer min-h-[48px]">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400"
                  checked={editing.attivo}
                  onChange={e => setEditing(prev => ({ ...prev, attivo: e.target.checked }))}
                />
                <span className="text-sm font-medium text-gray-700">Attivo</span>
              </label>
            </div>
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700">Fasi previste per questo tipo di evento</p>
              <p className="text-xs text-gray-500">Disattiva le fasi non applicabili (es. eventi interni: niente spedizione, hotel o trasporti)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 cursor-pointer min-h-[48px]">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400"
                    checked={editing.richiede_spedizione !== false}
                    onChange={e => setEditing(prev => ({ ...prev, richiede_spedizione: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-700">Spedizione materiale</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer min-h-[48px]">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400"
                    checked={editing.richiede_hotel !== false}
                    onChange={e => setEditing(prev => ({ ...prev, richiede_hotel: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-700">Hotel</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer min-h-[48px]">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400"
                    checked={editing.richiede_trasporti !== false}
                    onChange={e => setEditing(prev => ({ ...prev, richiede_trasporti: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-700">Trasporti</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer min-h-[48px]">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400"
                    checked={!!editing.usa_tavoli}
                    onChange={e => setEditing(prev => ({ ...prev, usa_tavoli: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-700">Tavoli (assegnazione discenti)</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave} loading={saving}>Salva</Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>Annulla</Button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-2">
          {eventTypes.map(et => (
            <div
              key={et.id}
              className={CARD_STYLE + ' flex items-center gap-4 cursor-pointer hover:shadow-md transition-all'}
              onClick={() => handleEdit(et)}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${COLOR_BG_400[et.colore] || 'bg-gray-400'}`}>
                <Icon name={et.icona} size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-gray-900">{et.nome}</p>
                <p className="text-sm text-gray-500">{et.codice}</p>
              </div>
              <span className="text-sm text-gray-400">#{et.ordine}</span>
              {!et.attivo && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Disattivato</span>
              )}
              <button
                onClick={e => { e.stopPropagation(); setDeleting(et) }}
                className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                aria-label={`Elimina ${et.nome}`}
              >
                <Icon icon={ACTION_ICONS.close} size={16} />
              </button>
            </div>
          ))}
        </div>

        <ConfirmDialog
          open={!!deleting}
          title="Elimina tipologia evento"
          message={`Eliminare "${deleting?.nome}"? Gli eventi esistenti con questo tipo non verranno modificati.`}
          confirmLabel="Elimina"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          danger
        />
      </div>
    </div>
  )
}
