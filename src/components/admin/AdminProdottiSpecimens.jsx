import { useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, POSIZIONE_ICONS } from '../../lib/icons'
import {
  POSIZIONE_MATERIALE,
  POSIZIONE_MATERIALE_COLORE,
  INPUT_STYLE,
  SELECT_STYLE,
  CARD_STYLE,
  FORM_CONTAINER_STYLE,
} from '../../lib/constants'
import { ConfirmDialog } from '../ui/ConfirmDialog'

const COLOR_TO_CLASSES = {
  green:  { bg: 'bg-green-100',  text: 'text-green-700'  },
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  mikai:  { bg: 'bg-mikai-100',  text: 'text-mikai-700'  },
  red:    { bg: 'bg-red-100',    text: 'text-red-700'    },
}

function PositionPill({ posizione }) {
  const label = POSIZIONE_MATERIALE[posizione] || posizione
  const color = POSIZIONE_MATERIALE_COLORE[posizione] || 'green'
  const cls = COLOR_TO_CLASSES[color] || COLOR_TO_CLASSES.green
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium ${cls.bg} ${cls.text}`}>
      <Icon icon={POSIZIONE_ICONS[posizione]} size={12} />
      {label}
    </span>
  )
}

export function AdminProdottiSpecimens({
  editing,
  specimens,
  newSpecimen,
  setNewSpecimen,
  editingSpecimen,
  editingSpecimenData,
  setEditingSpecimenData,
  deletingSpecimen,
  setDeletingSpecimen,
  specimenSaving,
  onAddSpecimen,
  onStartEditSpecimen,
  onSaveSpecimen,
  onCancelEditSpecimen,
  onDeleteSpecimen,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (!editing.id || !editing.serializzato) return null

  return (
    <>
      <div className={CARD_STYLE + ' md:p-6'}>
        <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between min-h-[48px]">
          <h3 className="font-semibold text-lg">Esemplari</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{specimens.length} registrati</span>
            <Icon icon={ACTION_ICONS.chevron_right} size={18} className={open ? 'rotate-90 transition-transform' : 'transition-transform'} />
          </div>
        </button>

        {open && (
          <div className="mt-4 space-y-3">
            {specimens.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-3 py-2 text-sm font-medium text-gray-500">Cod. Inventario</th>
                      <th className="px-3 py-2 text-sm font-medium text-gray-500">Posizione</th>
                      <th className="px-3 py-2 text-sm font-medium text-gray-500 w-28">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specimens.map(sp => (
                      <tr key={sp.id} className="border-b border-gray-100">
                        {editingSpecimen === sp.id ? (
                          <>
                            <td className="px-2 py-2">
                              <input
                                className={INPUT_STYLE + ' text-sm py-1.5 min-h-[40px]'}
                                value={editingSpecimenData.codice_inventario}
                                onChange={e => setEditingSpecimenData(d => ({ ...d, codice_inventario: e.target.value }))}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <select
                                className={SELECT_STYLE + ' text-sm py-1.5 min-h-[40px]'}
                                value={editingSpecimenData.posizione_attuale}
                                onChange={e => setEditingSpecimenData(d => ({ ...d, posizione_attuale: e.target.value }))}
                              >
                                {Object.entries(POSIZIONE_MATERIALE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex gap-1">
                                <button
                                  onClick={onSaveSpecimen}
                                  disabled={specimenSaving}
                                  className="text-mikai-500 hover:text-mikai-700 min-h-[48px] min-w-[48px] flex items-center justify-center"
                                  aria-label="Salva esemplare"
                                >
                                  <Icon icon={ACTION_ICONS.check} size={16} />
                                </button>
                                <button
                                  onClick={onCancelEditSpecimen}
                                  className="text-gray-400 hover:text-gray-600 min-h-[48px] min-w-[48px] flex items-center justify-center"
                                  aria-label="Annulla modifica"
                                >
                                  <Icon icon={ACTION_ICONS.close} size={16} />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-3 text-base font-mono">{sp.codice_inventario || '\u2014'}</td>
                            <td className="px-3 py-3"><PositionPill posizione={sp.posizione_attuale} /></td>
                            <td className="px-3 py-3">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => onStartEditSpecimen(sp)}
                                  className="text-gray-400 hover:text-mikai-500 min-h-[48px] min-w-[48px] flex items-center justify-center"
                                  aria-label="Modifica esemplare"
                                >
                                  <Icon icon={ACTION_ICONS.edit} size={16} />
                                </button>
                                <button
                                  onClick={() => setDeletingSpecimen(sp)}
                                  className="text-gray-400 hover:text-red-500 min-h-[48px] min-w-[48px] flex items-center justify-center"
                                  aria-label="Elimina esemplare"
                                >
                                  <Icon icon={ACTION_ICONS.close} size={16} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add specimen form */}
            <div className={FORM_CONTAINER_STYLE + ' space-y-3'}>
              <p className="text-sm font-medium text-gray-700">Aggiungi esemplare</p>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Cod. inventario <span className="text-red-500">*</span></label>
                  <input
                    className={INPUT_STYLE}
                    value={newSpecimen.codice_inventario}
                    onChange={e => setNewSpecimen(s => ({ ...s, codice_inventario: e.target.value }))}
                    placeholder="Es. LCP35-004"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Posizione</label>
                  <select
                    className={SELECT_STYLE}
                    value={newSpecimen.posizione_attuale}
                    onChange={e => setNewSpecimen(s => ({ ...s, posizione_attuale: e.target.value }))}
                  >
                    {Object.entries(POSIZIONE_MATERIALE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={onAddSpecimen}
                  loading={specimenSaving}
                  disabled={!newSpecimen.codice_inventario.trim()}
                >
                  <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />Aggiungi esemplare
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deletingSpecimen}
        title="Elimina esemplare"
        message={`Sei sicuro di voler eliminare l'esemplare "${deletingSpecimen?.codice_inventario || ''}"?`}
        confirmLabel="Elimina"
        onConfirm={onDeleteSpecimen}
        onCancel={() => setDeletingSpecimen(null)}
        danger
      />
    </>
  )
}
