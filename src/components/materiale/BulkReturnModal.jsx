import { useEffect, useState, useRef } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { useToastStore } from '../ui/Toast'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useAuthStore } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { ACTION_ICONS, MAGAZZINO_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import {
  STATO_RIENTRO, SELECT_STYLE, INPUT_STYLE, TEXTAREA_STYLE,
  CARD_HOVER_STYLE,
} from '../../lib/constants'
import { todayISO } from '../../lib/date-utils'
import { ProductThumb } from './ProductThumb'

const DAMAGE_BUCKET = 'event-documents'
const ALLOWED_PHOTO = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO = 5 * 1024 * 1024

async function uploadDamagePhoto(file, eventId, refId) {
  if (!ALLOWED_PHOTO.includes(file.type)) throw new Error('Formato foto non valido (usa JPG/PNG/WEBP)')
  if (file.size > MAX_PHOTO) throw new Error('Foto troppo grande (max 5MB)')
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `damage/${eventId}/${refId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(DAMAGE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw new Error(error.message)
  return path
}

function RowEntry({ row, onChange, onPhotoChange, onPhotoRemove, eventId }) {
  const fileRef = useRef(null)
  const handleFile = (file) => {
    if (file) onPhotoChange(file)
  }

  const isDanneggiato = row.stato_rientro === 'danneggiato'
  const isParziale = row.stato_rientro === 'parziale'
  const showDetails = isDanneggiato || isParziale

  return (
    <div className={CARD_HOVER_STYLE + ' space-y-3'}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={row.selected}
          onChange={(e) => onChange({ selected: e.target.checked })}
          className="w-5 h-5 mt-1 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400 shrink-0"
          aria-label={`Includi ${row.material?.nome} nel rientro`}
        />
        <ProductThumb product={row.material} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900 truncate">
            {row.material?.product?.nome || row.material?.nome}
          </div>
          <div className="text-sm text-gray-500">
            {row.material?.codice_inventario && <span>{row.material.codice_inventario}</span>}
            {row.material?.product?.brand?.nome && <span> · {row.material.product.brand.nome}</span>}
          </div>
        </div>
        <select
          className={SELECT_STYLE + ' max-w-[180px]'}
          value={row.stato_rientro}
          onChange={(e) => onChange({ stato_rientro: e.target.value })}
          disabled={!row.selected}
          aria-label="Stato rientro"
        >
          {Object.entries(STATO_RIENTRO).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {row.selected && showDetails && (
        <div className="pl-9 space-y-2">
          {isParziale && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantità rientrata</label>
              <input
                type="number"
                min="0"
                className={INPUT_STYLE}
                value={row.quantita_rientrata ?? ''}
                onChange={(e) => onChange({ quantita_rientrata: e.target.value === '' ? null : parseInt(e.target.value) })}
                placeholder="es. 3 di 5"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {isDanneggiato ? 'Note sui danni' : 'Note (opzionale)'}
            </label>
            <textarea
              className={TEXTAREA_STYLE}
              value={row.note_danni || ''}
              onChange={(e) => onChange({ note_danni: e.target.value })}
              rows={2}
              placeholder={isDanneggiato ? 'Descrivi il danno...' : 'Note opzionali...'}
            />
          </div>
          {isDanneggiato && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Foto del danno</label>
              {row.photoFile || row.foto_danno_url ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                    <Icon icon={FEEDBACK_ICONS.success} size={14} className="text-green-500" />
                    {row.photoFile?.name || 'Foto allegata'}
                  </span>
                  <button
                    type="button"
                    onClick={onPhotoRemove}
                    className="text-sm text-red-500 hover:text-red-700 min-h-[48px] px-2"
                    aria-label="Rimuovi foto allegata"
                  >
                    Rimuovi
                  </button>
                </div>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                  <Icon icon={MAGAZZINO_ICONS.upload} size={14} className="mr-1" />
                  Aggiungi foto
                </Button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function BulkReturnModal({ open, eventId, eventTitolo, onClose, onDone }) {
  const fetchPendingReturnsForEvent = useMaterialsStore(s => s.fetchPendingReturnsForEvent)
  const registerBulkReturn = useMaterialsStore(s => s.registerBulkReturn)
  const userId = useAuthStore(s => s.user?.id)
  const addToast = useToastStore(s => s.add)

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [tuttoIntegro, setTuttoIntegro] = useState(true)
  const [destinazione, setDestinazione] = useState('magazzino')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !eventId) return
    let mounted = true
    async function load() {
      setLoading(true)
      const { data } = await fetchPendingReturnsForEvent(eventId)
      if (!mounted) return
      setRows((data || []).map(m => ({
        movement_id: m.id,
        material_id: m.material_id,
        event_material_id: m.event_material_id || null,
        material: m.material,
        modalita: m.modalita,
        selected: true,
        stato_rientro: 'integro',
        quantita_rientrata: null,
        note_danni: '',
        foto_danno_url: null,
        photoFile: null,
      })))
      setTuttoIntegro(true)
      setDestinazione('magazzino')
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [open, eventId])

  const handleTuttoIntegroToggle = (e) => {
    const checked = e.target.checked
    setTuttoIntegro(checked)
    if (checked) {
      setRows(prev => prev.map(r => ({ ...r, selected: true, stato_rientro: 'integro', note_danni: '', photoFile: null })))
    }
  }

  const handleRowChange = (idx, patch) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
    if ('stato_rientro' in patch && patch.stato_rientro !== 'integro') setTuttoIntegro(false)
    if ('selected' in patch && !patch.selected) setTuttoIntegro(false)
  }

  const handlePhotoChange = (idx, file) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, photoFile: file } : r))
  }

  const handlePhotoRemove = (idx) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, photoFile: null, foto_danno_url: null } : r))
  }

  const handleSubmit = async () => {
    if (!userId) {
      addToast('Sessione scaduta. Riaccedi.', 'error')
      return
    }
    const selected = rows.filter(r => r.selected)
    if (selected.length === 0) {
      addToast('Seleziona almeno un materiale', 'warning')
      return
    }
    setSubmitting(true)

    try {
      // Upload damage photos first (only for danneggiato)
      const photoUploads = await Promise.all(selected.map(async (r) => {
        if (r.stato_rientro === 'danneggiato' && r.photoFile) {
          const refId = r.material_id || r.event_material_id || 'item'
          const path = await uploadDamagePhoto(r.photoFile, eventId, refId)
          return { ...r, foto_danno_url: path }
        }
        return r
      }))

      const payload = photoUploads.map(r => ({
        material_id: r.material_id || null,
        event_material_id: r.event_material_id || null,
        stato_rientro: r.stato_rientro,
        quantita_rientrata: r.quantita_rientrata ?? null,
        note_danni: r.note_danni || null,
        foto_danno_url: r.foto_danno_url || null,
        modalita: r.modalita || 'mano',
        destinazione,
      }))

      const { error, insertedCount } = await registerBulkReturn(eventId, payload, userId)
      if (error) {
        addToast(error, 'error')
      } else {
        addToast(`Rientro registrato: ${insertedCount} ${insertedCount === 1 ? 'materiale' : 'materiali'}`, 'success')
        onDone?.()
        onClose()
      }
    } catch (err) {
      addToast(`Errore: ${err.message || err}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCount = rows.filter(r => r.selected).length

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Registra rientro materiale"
      subtitle={eventTitolo}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-gray-500">
            {selectedCount > 0 ? `${selectedCount} di ${rows.length} selezionati` : 'Nessun materiale selezionato'}
          </span>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>Annulla</Button>
            <Button onClick={handleSubmit} disabled={submitting || selectedCount === 0} loading={submitting}>
              Registra rientro
            </Button>
          </div>
        </div>
      }
    >
      {loading ? (
        <LoadingSkeleton lines={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nessun materiale da far rientrare"
          description="Tutto il materiale di questo evento risulta già in magazzino."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-mikai-50 border border-mikai-200 rounded-xl">
            <input
              type="checkbox"
              id="tutto-integro"
              checked={tuttoIntegro}
              onChange={handleTuttoIntegroToggle}
              className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400"
            />
            <label htmlFor="tutto-integro" className="flex-1 cursor-pointer">
              <div className="font-medium text-gray-900">Tutto integro, in magazzino</div>
              <div className="text-sm text-gray-500">Deseleziona se vuoi gestire singoli pezzi (parziale o danneggiato)</div>
            </label>
          </div>

          {!tuttoIntegro && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destinazione (per tutti)</label>
              <select
                className={SELECT_STYLE}
                value={destinazione}
                onChange={(e) => setDestinazione(e.target.value)}
              >
                <option value="magazzino">In magazzino</option>
                <option value="agente">Lascia presso agente</option>
              </select>
            </div>
          )}

          <div className="space-y-2">
            {rows.map((r, idx) => (
              <RowEntry
                key={r.movement_id}
                row={r}
                onChange={(patch) => handleRowChange(idx, patch)}
                onPhotoChange={(file) => handlePhotoChange(idx, file)}
                onPhotoRemove={() => handlePhotoRemove(idx)}
                eventId={eventId}
              />
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
