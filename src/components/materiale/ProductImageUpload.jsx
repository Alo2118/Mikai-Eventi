import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Icon } from '../ui/Icon'
import { Button } from '../ui/Button'
import { useToastStore } from '../ui/Toast'
import { MAGAZZINO_ICONS, ACTION_ICONS } from '../../lib/icons'

const BUCKET = 'product-images'
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

function buildPath(file, productId) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  const prefix = productId || 'new'
  return `${prefix}/${ts}-${rand}.${ext}`
}

export function ProductImageUpload({ value, onChange, productId, disabled = false }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const addToast = useToastStore(s => s.add)

  const handleFile = async (file) => {
    if (!file) return
    if (!ALLOWED.includes(file.type)) {
      addToast('Formato non supportato. Usa JPG, PNG o WEBP.', 'error')
      return
    }
    if (file.size > MAX_SIZE) {
      addToast('Immagine troppo grande. Massimo 5 MB.', 'error')
      return
    }
    setUploading(true)
    const path = buildPath(file, productId)
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error) {
      addToast(`Errore upload: ${error.message}`, 'error')
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    onChange(data.publicUrl)
    setUploading(false)
    addToast('Immagine caricata', 'success')
  }

  const handleRemove = async () => {
    // Delete only if it's a Supabase Storage URL of our bucket
    if (value && value.includes(`/${BUCKET}/`)) {
      const path = value.split(`/${BUCKET}/`)[1]
      if (path) await supabase.storage.from(BUCKET).remove([path])
    }
    onChange('')
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled || uploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      {value ? (
        <div className="flex items-start gap-3">
          <img
            src={value}
            alt="Anteprima"
            className="w-32 h-32 object-cover rounded-lg border border-gray-200"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div className="flex flex-col gap-2">
            <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={disabled || uploading} loading={uploading}>
              <Icon icon={MAGAZZINO_ICONS.upload} size={16} className="mr-1" />
              Sostituisci
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRemove} disabled={disabled || uploading}>
              <Icon icon={ACTION_ICONS.close} size={16} className="mr-1" />
              Rimuovi
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!disabled && !uploading) setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          disabled={disabled || uploading}
          title={disabled ? 'Salva prima il prodotto per poter caricare la foto' : undefined}
          className={`w-full min-h-[120px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-sm transition-colors ${
            dragOver ? 'border-mikai-400 bg-mikai-50 text-mikai-700' : 'border-gray-300 text-gray-500 hover:border-mikai-300 hover:bg-gray-50'
          } ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Icon icon={MAGAZZINO_ICONS.upload} size={28} />
          <span className="font-medium">
            {uploading ? 'Caricamento...' : disabled ? 'Upload non disponibile' : 'Trascina o clicca per caricare'}
          </span>
          <span className="text-xs">
            {disabled ? 'Salva prima il prodotto, poi torna qui' : 'JPG, PNG o WEBP — max 5 MB'}
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
