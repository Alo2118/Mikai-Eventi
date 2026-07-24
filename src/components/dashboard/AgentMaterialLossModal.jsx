import { useRef, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { supabase } from '../../lib/supabase'
import { ACTION_ICONS, MAGAZZINO_ICONS } from '../../lib/icons'
import { TEXTAREA_STYLE } from '../../lib/constants'

const PHOTO_BUCKET = 'event-documents'
const ALLOWED_PHOTO = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO = 5 * 1024 * 1024

async function uploadLossPhoto(file, materialId) {
  if (!ALLOWED_PHOTO.includes(file.type)) throw new Error('Formato foto non valido (usa JPG, PNG o WEBP)')
  if (file.size > MAX_PHOTO) throw new Error('Foto troppo grande (massimo 5MB)')
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `agent-material/${materialId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw new Error(error.message)
  return path
}

// Modale per segnalare un esemplare come consumato o perso. Nota e foto sono opzionali.
// La conferma restituisce (note, fotoUrl) al chiamante, che esegue la scrittura sullo store.
export function AgentMaterialLossModal({ open, materialId, materialName, onConfirm, onCancel }) {
  const [note, setNote] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const reset = () => { setNote(''); setPhotoFile(null); setError(null); setSaving(false) }

  const handleClose = () => { if (!saving) { reset(); onCancel() } }

  const handleConfirm = async () => {
    setError(null)
    setSaving(true)
    try {
      let fotoUrl = null
      if (photoFile) fotoUrl = await uploadLossPhoto(photoFile, materialId)
      await onConfirm(note.trim() || null, fotoUrl)
      reset()
    } catch (e) {
      setError(e.message || 'Non siamo riusciti a inviare la segnalazione. Riprova.')
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="md"
      title="Segnala come consumato o perso"
      subtitle={materialName}
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={handleClose} disabled={saving}>Annulla</Button>
          <Button variant="danger" onClick={handleConfirm} loading={saving}>Invia segnalazione</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-base text-gray-600">
          Avvisi il magazzino che questo materiale è stato usato del tutto o non ce l'hai più.
          Il magazzino controllerà e sistemerà la scheda. Questa segnalazione non è annullabile dall'app.
        </p>

        <div className="space-y-2">
          <label className="block text-base font-medium text-gray-900">Vuoi aggiungere una nota? (facoltativo)</label>
          <textarea
            className={TEXTAREA_STYLE}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Es. usato durante l'ultimo intervento"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-base font-medium text-gray-900">Vuoi allegare una foto? (facoltativo)</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPhotoFile(f); setError(null) } }}
          />
          {photoFile ? (
            <div className="flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-base text-gray-700 truncate">{photoFile.name}</span>
              <button
                type="button"
                onClick={() => { setPhotoFile(null); if (fileRef.current) fileRef.current.value = '' }}
                className="shrink-0 min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-red-600"
                aria-label="Rimuovi foto"
              >
                <Icon icon={ACTION_ICONS.close} size={20} />
              </button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => fileRef.current?.click()} className="w-full">
              <Icon icon={MAGAZZINO_ICONS.upload} size={18} className="mr-2" />
              Scatta o scegli una foto
            </Button>
          )}
        </div>

        {error && (
          <p role="alert" className="text-base text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
