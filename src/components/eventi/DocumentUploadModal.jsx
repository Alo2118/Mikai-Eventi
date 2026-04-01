import { useState } from 'react'
import { TIPO_DOCUMENTO, SELECT_STYLE, TEXTAREA_STYLE } from '../../lib/constants'
import { DOCUMENTO_ICONS } from '../../lib/icons'
import { formatFileSize } from '../../lib/format-utils'
import { Icon } from '../ui/Icon'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

function guessDocumentType(mimeType, filename) {
  if (mimeType === 'image/jpeg' || mimeType === 'image/png') return 'foto'
  const lower = filename.toLowerCase()
  if (lower.includes('contratto')) return 'contratto'
  if (lower.includes('preventivo')) return 'preventivo_firmato'
  if (lower.includes('programma')) return 'programma'
  if (lower.includes('autorizzazione')) return 'autorizzazione'
  return 'altro'
}

export function DocumentUploadModal({ files, onClose, onUpload, activityId = null, activityLabel = null }) {
  const [fileConfigs, setFileConfigs] = useState(
    files.map(f => ({
      file: f,
      tipo: guessDocumentType(f.type, f.name),
      note: '',
    }))
  )
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const single = files.length === 1

  function updateConfig(idx, key, value) {
    setFileConfigs(prev => prev.map((c, i) => i === idx ? { ...c, [key]: value } : c))
  }

  async function handleUpload() {
    setUploading(true)
    for (let i = 0; i < fileConfigs.length; i++) {
      setProgress(i + 1)
      const { file, tipo, note } = fileConfigs[i]
      const { error } = await onUpload(file, tipo, note, activityId)
      if (error) {
        setUploading(false)
        return
      }
    }
    setUploading(false)
    onClose()
  }

  const title = activityLabel
    ? `Carica documento per: ${activityLabel}`
    : single ? 'Carica documento' : `Carica ${files.length} documenti`

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={title}
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Annulla
          </Button>
          <Button onClick={handleUpload} loading={uploading}>
            {uploading
              ? `Caricamento ${progress} di ${files.length}...`
              : single ? 'Carica file' : 'Carica tutti'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {activityId && (
          <p className="text-sm text-yellow-600 bg-yellow-50 rounded-lg px-3 py-2">
            Il documento dovrà essere approvato per completare l&apos;attività
          </p>
        )}
        {fileConfigs.map((config, idx) => (
          <div key={idx} className={`${files.length > 1 ? 'p-3 bg-gray-50 rounded-lg' : ''}`}>
            <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
              <Icon icon={DOCUMENTO_ICONS[config.tipo] || DOCUMENTO_ICONS.altro} size={16} />
              <span className="font-medium truncate">{config.file.name}</span>
              <span className="text-gray-400 shrink-0">({formatFileSize(config.file.size)})</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo documento</label>
                <select
                  value={config.tipo}
                  onChange={e => updateConfig(idx, 'tipo', e.target.value)}
                  className={SELECT_STYLE}
                >
                  {Object.entries(TIPO_DOCUMENTO).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              {single && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
                  <textarea
                    value={config.note}
                    onChange={e => updateConfig(idx, 'note', e.target.value)}
                    placeholder="Descrizione o commento sul file..."
                    className={TEXTAREA_STYLE}
                    rows={2}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
