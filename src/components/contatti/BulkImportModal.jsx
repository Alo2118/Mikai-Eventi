import { useState } from 'react'
import { BulkImportGrid, makeEmptyRows } from './BulkImportGrid'
import { BulkImportReview } from './BulkImportReview'
import { useContactsStore } from '../../hooks/useContacts'
import { useParticipantsStore } from '../../hooks/useParticipants'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../ui/Toast'
import { TIPOLOGIA_IMPORT } from '../../lib/constants'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'

export function BulkImportModal({ open, eventId, onComplete, onClose }) {
  const [step, setStep] = useState('grid')
  const [rows, setRows] = useState(() => makeEmptyRows(5))
  const [reviewData, setReviewData] = useState(null)
  const [loading, setLoading] = useState(false)

  const findDuplicates = useContactsStore(s => s.findDuplicates)
  const bulkCreateContacts = useContactsStore(s => s.bulkCreateContacts)
  const reactivateContacts = useContactsStore(s => s.reactivateContacts)
  const bulkAddParticipants = useParticipantsStore(s => s.bulkAddParticipants)
  const profile = useAuthStore(s => s.profile)
  const addToast = useToastStore(s => s.add)

  if (!open) return null

  async function handleVerify(nonEmptyRows, validationErrors) {
    setLoading(true)
    const { data, error } = await findDuplicates(nonEmptyRows)
    setLoading(false)

    if (error) {
      addToast('Errore durante la verifica dei duplicati. Riprova.', 'error')
      return
    }

    // validationErrors is an object: { rowIndex: ['field1', 'field2'] }
    const errorMap = {}
    for (const [rowIdx, fields] of Object.entries(validationErrors || {})) {
      errorMap[rowIdx] = fields.map(f => ({ msg: `Campo ${f} obbligatorio` }))
    }

    // Merge validation errors into results from findDuplicates
    const merged = (data || []).map((result, i) => ({
      ...result,
      errors: errorMap[i] ? [...(result.errors || []), ...errorMap[i]] : (result.errors || []),
    }))

    setReviewData(merged)
    setStep('review')
  }

  async function handleConfirm(resolutions) {
    setLoading(true)

    // Separate by action
    const toCreate = []
    const toLink = []
    const toReactivate = []

    resolutions.forEach((res, i) => {
      const row = reviewData[i].row
      if (res.action === 'create') {
        toCreate.push({ index: i, row })
      } else if (res.action === 'link') {
        toLink.push({ index: i, contactId: res.contactId })
      } else if (res.action === 'reactivate') {
        toReactivate.push({ index: i, contactId: res.contactId })
      }
      // action: 'error' → skip
    })

    // Build new contact payloads
    const newContactPayloads = toCreate.map(({ row }) => {
      const mapping = TIPOLOGIA_IMPORT[row.tipologia] || {}
      return {
        nome: row.nome.trim(),
        cognome: row.cognome.trim(),
        tipo_contatto: mapping.tipo_contatto || 'altro',
        ruolo_medico: mapping.ruolo_medico || null,
        azienda: row.azienda?.trim() || null,
        citta: row.citta?.trim() || null,
        email: row.email?.trim() || null,
        telefono: row.telefono?.trim() || null,
        note_salute: row.note_salute?.trim() || null,
        created_by: profile.id,
        proprietario_id: profile.ruolo === 'commerciale' ? profile.id : null,
      }
    })

    // 1. Create new contacts
    const createdIds = []
    if (newContactPayloads.length > 0) {
      const { data: created, error: createError } = await bulkCreateContacts(newContactPayloads)
      if (createError) {
        setLoading(false)
        addToast('Errore durante la creazione dei contatti. Riprova.', 'error')
        return
      }
      // Map created contacts back to their original indices
      toCreate.forEach(({ index }, j) => {
        createdIds.push({ index, contactId: created[j]?.id })
      })
    }

    // 2. Reactivate inactive contacts
    const reactivateIds = toReactivate.map(r => r.contactId).filter(Boolean)
    if (reactivateIds.length > 0) {
      const { error: reactivateError } = await reactivateContacts(reactivateIds)
      if (reactivateError) {
        setLoading(false)
        addToast('Errore durante la riattivazione dei contatti. Riprova.', 'error')
        return
      }
    }

    // 3. Add participants if eventId provided
    if (eventId) {
      // Collect all resolved contact IDs with their row data
      const participantList = []

      for (const { index, contactId } of createdIds) {
        if (contactId) {
          const row = reviewData[index].row
          participantList.push({
            contactId,
            tipo: row.ruolo_evento || 'discente',
            note: row.note_evento?.trim() || null,
          })
        }
      }
      for (const { index, contactId } of toLink) {
        const row = reviewData[index].row
        participantList.push({
          contactId,
          tipo: TIPOLOGIA_IMPORT[row.tipologia]?.tipo_contatto || 'altro',
          note: row.note_salute?.trim() || null,
        })
      }
      for (const { index, contactId } of toReactivate) {
        const row = reviewData[index].row
        participantList.push({
          contactId,
          tipo: TIPOLOGIA_IMPORT[row.tipologia]?.tipo_contatto || 'altro',
          note: row.note_salute?.trim() || null,
        })
      }

      if (participantList.length > 0) {
        const { data: partData, error: partError } = await bulkAddParticipants(eventId, participantList)
        if (partError) {
          setLoading(false)
          addToast('Contatti importati ma errore nell\'aggiunta ai partecipanti. Riprova.', 'error')
          return
        }
        const inserted = partData?.inserted ?? participantList.length
        const skipped = partData?.skipped ?? 0
        addToast(
          `Importazione completata: ${toCreate.length} creati, ${toLink.length + toReactivate.length} collegati. ${inserted} aggiunti all'evento${skipped > 0 ? `, ${skipped} già presenti` : ''}.`,
          'success'
        )
      } else {
        addToast('Nessun contatto da aggiungere.', 'warning')
      }
    } else {
      addToast(
        `Importazione completata: ${toCreate.length} creati, ${toLink.length + toReactivate.length} collegati.`,
        'success'
      )
    }

    setLoading(false)
    resetState()
    onComplete?.()
  }

  function handleClose() {
    resetState()
    onClose?.()
  }

  function resetState() {
    setStep('grid')
    setRows(makeEmptyRows(5))
    setReviewData(null)
    setLoading(false)
  }

  const title = step === 'grid' ? 'Importa contatti' : 'Verifica duplicati'
  const subtitle =
    step === 'grid'
      ? 'Inserisci i dati nelle righe sottostanti. I campi Nome e Cognome sono obbligatori.'
      : 'Controlla i contatti trovati e scegli come procedere per ciascuno.'

  return (
    <Modal open={open} onClose={handleClose} size="full" title={title} subtitle={subtitle}>
      {loading ? (
        <LoadingSkeleton lines={6} />
      ) : step === 'grid' ? (
        <BulkImportGrid
          rows={rows}
          onRowsChange={setRows}
          showEventColumns={!!eventId}
          onSubmit={handleVerify}
        />
      ) : (
        <BulkImportReview
          results={reviewData}
          onConfirm={handleConfirm}
          onCancel={() => setStep('grid')}
        />
      )}
    </Modal>
  )
}
