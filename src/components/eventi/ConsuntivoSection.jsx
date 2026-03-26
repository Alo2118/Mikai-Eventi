import { useState } from 'react'
import { useCostsStore } from '../../hooks/useCosts'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { useToastStore } from '../ui/Toast'
import { ACTION_ICONS, COSTI_ICONS } from '../../lib/icons'
import { INPUT_STYLE, CARD_STYLE } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'
import { formatCurrency, formatPercentage } from '../../lib/format-utils'

function deltaColor(approvato, effettivo) {
  if (effettivo == null || effettivo === '') return 'gray'
  const diff = effettivo - approvato
  if (diff <= 0) return 'green'
  const pct = approvato > 0 ? (diff / approvato) * 100 : 100
  return pct > 10 ? 'red' : 'yellow'
}

function ConsuntivoRow({ preventivo, canManage }) {
  const updateConsuntivo = useCostsStore(s => s.updateConsuntivo)
  const addToast = useToastStore(s => s.add)

  const [form, setForm] = useState({
    importo_effettivo: preventivo.importo_effettivo ?? '',
    n_fattura: preventivo.n_fattura || '',
    data_fattura: preventivo.data_fattura || '',
    note_consuntivo: preventivo.note_consuntivo || '',
  })
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const setField = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const effettivo = form.importo_effettivo !== '' ? parseFloat(form.importo_effettivo) : null
    if (effettivo != null && preventivo.importo > 0) {
      const pct = ((effettivo - preventivo.importo) / preventivo.importo) * 100
      if (pct > 10) addToast(`Attenzione: consuntivo supera il preventivo del ${formatPercentage(pct)}`, 'warning')
    }
    const { error } = await updateConsuntivo(preventivo.id, {
      importo_effettivo: effettivo,
      n_fattura: form.n_fattura || null,
      data_fattura: form.data_fattura || null,
      note_consuntivo: form.note_consuntivo || null,
    })
    setSaving(false)
    if (error) { addToast('Errore nel salvataggio', 'error'); return }
    addToast('Consuntivo salvato', 'success')
    setDirty(false)
  }

  const effNum = form.importo_effettivo !== '' ? parseFloat(form.importo_effettivo) : null
  const color = deltaColor(preventivo.importo || 0, effNum)
  const delta = effNum != null && preventivo.importo != null ? effNum - preventivo.importo : null
  const deltaPct = delta != null && preventivo.importo > 0 ? (delta / preventivo.importo) * 100 : null

  const colorMap = { green: 'text-green-600', yellow: 'text-yellow-600', red: 'text-red-600', gray: 'text-gray-400' }

  return (
    <div className="p-4 rounded-xl border border-gray-200 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{preventivo.descrizione}</span>
          {preventivo.fornitore_nome && <span className="text-gray-500 ml-2">— {preventivo.fornitore_nome}</span>}
        </div>
        <span className="font-semibold text-sm">{formatCurrency(preventivo.importo)}</span>
      </div>

      {canManage ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="number"
            step="0.01"
            className={INPUT_STYLE}
            value={form.importo_effettivo}
            onChange={e => setField('importo_effettivo', e.target.value)}
            placeholder="Importo effettivo €"
          />
          <input
            className={INPUT_STYLE}
            value={form.n_fattura}
            onChange={e => setField('n_fattura', e.target.value)}
            placeholder="N. fattura"
          />
          <input
            type="date"
            className={INPUT_STYLE}
            value={form.data_fattura}
            onChange={e => setField('data_fattura', e.target.value)}
          />
          <input
            className={INPUT_STYLE}
            value={form.note_consuntivo}
            onChange={e => setField('note_consuntivo', e.target.value)}
            placeholder="Note"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
          <span>Effettivo: {formatCurrency(effNum)}</span>
          <span>Fattura: {preventivo.n_fattura || '—'}</span>
          <span>Data: {preventivo.data_fattura ? formatDate(preventivo.data_fattura) : '—'}</span>
          <span>Note: {preventivo.note_consuntivo || '—'}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${colorMap[color]}`}>
          {delta != null
            ? `${delta >= 0 ? '+' : ''}${formatCurrency(delta)} (${deltaPct != null ? (deltaPct >= 0 ? '+' : '') + formatPercentage(deltaPct, 1) : ''})`
            : 'Da rendicontare'}
        </span>
        {canManage && dirty && (
          <Button size="sm" onClick={handleSave} loading={saving}>
            <Icon icon={ACTION_ICONS.check} size={16} />
            <span className="ml-1">Salva</span>
          </Button>
        )}
      </div>
    </div>
  )
}

export function ConsuntivoSection({ preventivi, canManage }) {
  if (!preventivi || preventivi.length === 0) return null

  const totPrevisto = preventivi.reduce((s, p) => s + (p.importo || 0), 0)
  const filled = preventivi.filter(p => p.importo_effettivo != null)
  const totEffettivo = filled.reduce((s, p) => s + (p.importo_effettivo || 0), 0)
  const daRendicontare = preventivi.length - filled.length

  return (
    <div className={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-4">
        <Icon icon={COSTI_ICONS.costo} size={20} className="text-mikai-400" />
        <h3 className="font-semibold text-lg">Consuntivo</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-sm">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500">Totale approvato</p>
          <p className="text-xl font-bold">{formatCurrency(totPrevisto)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500">Totale effettivo {daRendicontare > 0 && <span className="text-yellow-600">(parziale)</span>}</p>
          <p className="text-xl font-bold">{formatCurrency(totEffettivo)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500">Da rendicontare</p>
          <p className={`text-xl font-bold ${daRendicontare > 0 ? 'text-yellow-600' : 'text-green-600'}`}>{daRendicontare} / {preventivi.length}</p>
        </div>
      </div>

      <div className="space-y-3">
        {preventivi.map(p => (
          <ConsuntivoRow key={p.id} preventivo={p} canManage={canManage} />
        ))}
      </div>
    </div>
  )
}
