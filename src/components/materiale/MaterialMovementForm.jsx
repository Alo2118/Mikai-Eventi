import { useState } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useAuthStore } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { DatePicker } from '../ui/DatePicker'
import { useToastStore } from '../ui/Toast'
import { MODALITA_MOVIMENTO } from '../../lib/constants'

export function MaterialMovementForm({ materialId, eventId, tipo = 'uscita', allMaterialIds, onDone }) {
  const [modalita, setModalita] = useState('')
  const [aPos, setAPos] = useState(tipo === 'rientro' ? 'in_magazzino' : 'presso_evento')
  const [tracking, setTracking] = useState('')
  const [rientro, setRientro] = useState('')
  const [statoRientro, setStatoRientro] = useState('')
  const [noteDanni, setNoteDanni] = useState('')
  const [loading, setLoading] = useState(false)

  const createMovement = useMaterialsStore(s => s.createMovement)
  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const ids = allMaterialIds || [materialId]
    const baseMovement = {
      event_id: eventId || null,
      tipo,
      modalita,
      a_posizione: aPos,
      da_posizione: tipo === 'rientro' ? 'presso_evento' : 'in_magazzino',
      data_movimento: new Date().toISOString(),
      data_rientro_prevista: rientro || null,
      responsabile_id: user.id,
      tracking_spedizione: tracking || null,
      stato_rientro: tipo === 'rientro' ? statoRientro : null,
      note_danni: noteDanni || null,
    }

    let hasError = false
    for (const matId of ids) {
      const { error } = await createMovement({ ...baseMovement, material_id: matId })
      if (error) { addToast(error, 'error'); hasError = true; break }
    }

    setLoading(false)
    if (!hasError) {
      const msg = ids.length > 1
        ? `${ids.length} movimenti registrati!`
        : (tipo === 'rientro' ? 'Rientro registrato!' : 'Movimento registrato!')
      addToast(msg, 'success')
      onDone?.()
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${allMaterialIds ? '' : 'bg-gray-50 rounded-xl p-5'}`}>
      {!allMaterialIds && (
        <h3 className="text-lg font-semibold text-gray-900">
          {tipo === 'uscita' ? 'Registra uscita' : tipo === 'rientro' ? 'Registra rientro' : 'Registra trasferimento'}
        </h3>
      )}

      <div>
        <label className="block text-base font-medium text-gray-700 mb-1">Modalit&agrave; <span className="text-red-500">*</span></label>
        <select value={modalita} onChange={(e) => setModalita(e.target.value)} required
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400">
          <option value="">Seleziona...</option>
          {Object.entries(MODALITA_MOVIMENTO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {tipo === 'uscita' && (
        <DatePicker label="Rientro previsto" value={rientro} onChange={setRientro} />
      )}

      {modalita === 'spedizione' && (
        <div>
          <label className="block text-base font-medium text-gray-700 mb-1">Tracking spedizione</label>
          <input type="text" value={tracking} onChange={(e) => setTracking(e.target.value)}
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400"
            placeholder="Numero tracking..." />
        </div>
      )}

      {tipo === 'rientro' && (
        <>
          <div>
            <label className="block text-base font-medium text-gray-700 mb-1">Stato rientro <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-3">
              {[['integro', 'Integro', 'green'], ['parziale', 'Parziale', 'yellow'], ['danneggiato', 'Danneggiato', 'red']].map(([val, label, color]) => (
                <button key={val} type="button" onClick={() => setStatoRientro(val)}
                  className={`px-5 py-3 rounded-xl border-2 text-base font-medium min-h-[48px] transition-all ${
                    statoRientro === val ? `border-${color}-400 bg-${color}-50 text-${color}-800` : 'border-gray-200 text-gray-600'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {statoRientro === 'danneggiato' && (
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">Descrizione danni <span className="text-red-500">*</span></label>
              <textarea value={noteDanni} onChange={(e) => setNoteDanni(e.target.value)} required
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[80px] focus:ring-2 focus:ring-mikai-400"
                placeholder="Descrivi i danni..." />
            </div>
          )}
        </>
      )}

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="secondary" onClick={onDone}>Annulla</Button>
        <Button type="submit" loading={loading} disabled={!modalita || (tipo === 'rientro' && !statoRientro)}>
          Registra
        </Button>
      </div>
    </form>
  )
}
