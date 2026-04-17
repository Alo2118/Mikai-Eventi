import { useState, memo } from 'react'
import { Icon } from '../ui/Icon'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ACTION_ICONS } from '../../lib/icons'
import { useTavoliStore } from '../../hooks/useTavoli'
import { SELECT_STYLE, CARD_STYLE, TAVOLO_COLORI, TAVOLO_COLORI_LIST } from '../../lib/constants'

function AssignmentSection({ title, items, renderItem, options, optionLabel, optionValue, onAdd, onRemove, canEdit }) {
  const [selected, setSelected] = useState('')

  function handleAdd() {
    if (!selected) return
    onAdd(selected)
    setSelected('')
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        {title} <span className="font-normal text-gray-400">({items.length})</span>
      </p>

      {canEdit && (
        <div className="flex gap-2">
          <select value={selected} onChange={e => setSelected(e.target.value)} className={SELECT_STYLE + ' flex-1'}>
            <option value="">— seleziona —</option>
            {options.map(o => (
              <option key={optionValue(o)} value={optionValue(o)}>{optionLabel(o)}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!selected}
            aria-label="Aggiungi"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg bg-mikai-400 text-white hover:bg-mikai-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Icon icon={ACTION_ICONS.add} size={20} />
          </button>
        </div>
      )}

      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map(item => (
            <li key={item.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
              <span className="flex-1">{renderItem(item)}</span>
              {canEdit && (
                <button
                  onClick={() => onRemove(item.id)}
                  aria-label="Rimuovi"
                  className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Icon icon={ACTION_ICONS.close} size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export const TavoloCard = memo(function TavoloCard({ tavolo, eventId, availableProducts, canEdit }) {
  const addProduct = useTavoliStore(s => s.addProduct)
  const removeProduct = useTavoliStore(s => s.removeProduct)
  const updateTavolo = useTavoliStore(s => s.updateTavolo)
  const removeTavolo = useTavoliStore(s => s.removeTavolo)

  const [nome, setNome] = useState(tavolo.nome ?? '')
  const [note, setNote] = useState(tavolo.note ?? '')
  const [showDelete, setShowDelete] = useState(false)

  function handleNomeBlur() {
    if (nome !== (tavolo.nome ?? '')) updateTavolo(tavolo.id, { nome })
  }

  function handleNoteBlur() {
    if (note !== (tavolo.note ?? '')) updateTavolo(tavolo.id, { note })
  }

  return (
    <div className={CARD_STYLE + ' space-y-4'}>
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-bold text-gray-900 whitespace-nowrap flex items-center gap-2">
          {tavolo.colore && <span className={`w-4 h-4 rounded-full ${TAVOLO_COLORI[tavolo.colore]?.dot || 'bg-gray-200'}`} aria-hidden="true" />}
          Tavolo {tavolo.numero}
          {tavolo.colore && <span className="text-sm text-gray-500 font-normal">({TAVOLO_COLORI[tavolo.colore]?.label})</span>}
        </span>
        {canEdit ? (
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            onBlur={handleNomeBlur}
            placeholder="Nome opzionale"
            className="flex-1 min-w-[120px] px-3 py-1.5 text-base border border-gray-200 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 outline-none text-gray-700"
          />
        ) : (
          nome && <span className="flex-1 text-gray-600">{nome}</span>
        )}
        {canEdit && (
          <button
            onClick={() => setShowDelete(true)}
            aria-label="Elimina tavolo"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
          >
            <Icon icon={ACTION_ICONS.close} size={18} />
          </button>
        )}
      </div>

      {/* Color picker */}
      {canEdit && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500">Colore:</span>
          <button
            type="button"
            onClick={() => updateTavolo(tavolo.id, { colore: null })}
            className={`min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-[32px] w-11 h-11 md:w-8 md:h-8 rounded-full border-2 bg-white text-gray-400 text-sm md:text-xs transition-all ${!tavolo.colore ? 'ring-2 ring-offset-1 ring-gray-400 border-gray-400' : 'border-gray-200 hover:border-gray-400'}`}
            aria-label="Nessun colore"
            title="Nessun colore"
          >—</button>
          {TAVOLO_COLORI_LIST.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => updateTavolo(tavolo.id, { colore: c })}
              className={`min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-[32px] w-11 h-11 md:w-8 md:h-8 rounded-full transition-all ${TAVOLO_COLORI[c].dot} ${tavolo.colore === c ? `ring-2 ring-offset-1 ${TAVOLO_COLORI[c].ring}` : 'hover:scale-110'}`}
              aria-label={TAVOLO_COLORI[c].label}
              title={TAVOLO_COLORI[c].label}
            />
          ))}
        </div>
      )}

      {/* Materiale */}
      <AssignmentSection
        title="Materiale"
        items={tavolo.materiale ?? []}
        renderItem={m => (
          <span>
            {m.product?.nome}
            {m.product?.codice && <span className="text-gray-400 ml-1">({m.product.codice})</span>}
          </span>
        )}
        options={availableProducts ?? []}
        optionValue={p => p.id}
        optionLabel={p => `${p.nome}${p.codice ? ` (${p.codice})` : ''}`}
        onAdd={productId => addProduct(tavolo.id, productId, eventId)}
        onRemove={id => removeProduct(id, eventId)}
        canEdit={canEdit}
      />

      {/* Riepilogo persone (read-only) */}
      {(tavolo.formatori?.length > 0 || tavolo.discenti?.length > 0) && (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Persone <span className="font-normal text-gray-400">({(tavolo.formatori?.length || 0) + (tavolo.discenti?.length || 0)})</span>
          </p>
          <div className="text-sm text-gray-500">
            {tavolo.formatori?.length > 0 && <span>{tavolo.formatori.length} formatori</span>}
            {tavolo.formatori?.length > 0 && tavolo.discenti?.length > 0 && <span> · </span>}
            {tavolo.discenti?.length > 0 && <span>{tavolo.discenti.length} discenti</span>}
          </div>
        </div>
      )}

      {/* Note */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Note</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          onBlur={handleNoteBlur}
          readOnly={!canEdit}
          rows={2}
          placeholder={canEdit ? 'Aggiungi note...' : '—'}
          className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-mikai-400 outline-none resize-none disabled:bg-gray-50 read-only:bg-gray-50"
        />
      </div>

      <ConfirmDialog
        open={showDelete}
        title="Elimina tavolo"
        message={`Sei sicuro di voler eliminare il Tavolo ${tavolo.numero}? Tutte le assegnazioni verranno rimosse.`}
        confirmLabel="Elimina"
        onConfirm={() => { setShowDelete(false); removeTavolo(tavolo.id) }}
        onCancel={() => setShowDelete(false)}
        danger
      />
    </div>
  )
})
