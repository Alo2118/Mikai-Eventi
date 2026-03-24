import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { TIPOLOGIA_IMPORT, TIPO_PARTECIPANTE } from '../../lib/constants'

// Map pasted tipologia text to TIPOLOGIA_IMPORT keys (case-insensitive, fuzzy)
const TIPOLOGIA_ALIASES = {
  medico: 'medico',
  specializzando: 'specializzando',
  strumentista: 'strumentista',
  fornitore: 'fornitore',
  tecnico: 'tecnico',
  istituzionale: 'istituzionale',
  altro: 'altro',
  // Common variations from emails
  chirurgo: 'medico',
  dottore: 'medico',
  infermiere: 'tecnico',
  infermiera: 'tecnico',
}

function matchTipologia(text) {
  if (!text) return ''
  const clean = text.trim().toLowerCase()
  return TIPOLOGIA_ALIASES[clean] || ''
}

// Column order for paste: cognome, nome, tipologia, azienda, città, email, telefono, note_salute
const PASTE_FIELDS = ['cognome', 'nome', 'tipologia', 'azienda', 'citta', 'email', 'telefono', 'note_salute']

function parseSpreadsheetPaste(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  return lines.map(line => {
    const cells = line.split('\t')
    const row = { ...EMPTY_ROW }
    PASTE_FIELDS.forEach((field, i) => {
      if (i < cells.length && cells[i].trim()) {
        if (field === 'tipologia') {
          row[field] = matchTipologia(cells[i])
        } else {
          row[field] = cells[i].trim()
        }
      }
    })
    return row
  })
}

const EMPTY_ROW = {
  cognome: '',
  nome: '',
  tipologia: '',
  azienda: '',
  citta: '',
  email: '',
  telefono: '',
  note_salute: '',
  ruolo_evento: 'discente',
  note_evento: '',
}

export function makeEmptyRows(count = 5) {
  return Array.from({ length: count }, () => ({ ...EMPTY_ROW }))
}

const INPUT_CLASS =
  'w-full px-2 py-2 text-base border border-gray-200 min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none rounded'

const ERROR_INPUT_CLASS =
  'w-full px-2 py-2 text-base border border-red-400 min-h-[48px] focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none rounded bg-red-50'

function isRowEmpty(row) {
  return (
    !row.cognome.trim() &&
    !row.nome.trim() &&
    !row.tipologia.trim() &&
    !row.azienda.trim() &&
    !row.citta.trim() &&
    !row.email.trim() &&
    !row.telefono.trim() &&
    !row.note_salute.trim() &&
    !row.note_evento.trim()
  )
}

function validateRows(rows, showEventColumns) {
  const errors = {}
  rows.forEach((row, i) => {
    if (isRowEmpty(row)) return
    const rowErrors = []
    if (!row.cognome.trim()) rowErrors.push('cognome')
    if (!row.nome.trim()) rowErrors.push('nome')
    if (!row.tipologia.trim()) rowErrors.push('tipologia')
    if (showEventColumns && !row.ruolo_evento.trim()) rowErrors.push('ruolo_evento')
    if (rowErrors.length > 0) errors[i] = rowErrors
  })
  return errors
}

export function BulkImportGrid({ rows, onRowsChange, showEventColumns, onSubmit }) {
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState('')

  function handlePaste() {
    if (!pasteText.trim()) return
    const parsed = parseSpreadsheetPaste(pasteText)
    if (parsed.length === 0) return
    // Replace empty rows with parsed data
    const hasData = rows.some(r => !isRowEmpty(r))
    onRowsChange(hasData ? [...rows, ...parsed] : parsed)
    setPasteText('')
    setShowPaste(false)
  }

  function handleCellChange(rowIndex, field, value) {
    const updated = rows.map((row, i) =>
      i === rowIndex ? { ...row, [field]: value } : row
    )
    onRowsChange(updated)
  }

  function handleAddRows() {
    onRowsChange([...rows, ...makeEmptyRows(5)])
  }

  function handleRemoveRow(rowIndex) {
    if (rows.length <= 1) return
    onRowsChange(rows.filter((_, i) => i !== rowIndex))
  }

  function handleVerifica() {
    const nonEmpty = rows.filter((row) => !isRowEmpty(row))
    const errors = validateRows(rows, showEventColumns)
    onSubmit(nonEmpty, errors)
  }

  const validationErrors = validateRows(rows, showEventColumns)
  const hasErrors = Object.keys(validationErrors).length > 0

  return (
    <div className="flex flex-col gap-4">
      {/* Paste area */}
      {showPaste ? (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Incolla da Excel o foglio di calcolo</p>
              <p className="text-sm text-gray-500">Copia le righe dal foglio e incollale qui. Ordine colonne: Cognome, Nome, Tipologia, Ospedale, Città, Email, Telefono, Allergie</p>
            </div>
            <button
              type="button"
              onClick={() => { setShowPaste(false); setPasteText('') }}
              className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-gray-600"
              aria-label="Chiudi"
            >
              <Icon icon={ACTION_ICONS.close} size={18} />
            </button>
          </div>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder={"El Ezzo\tOmar\tMedico\tRoma Gemelli\tRoma\nCinelli\tVirginia\tSpecializzando\tRoma Gemelli\tRoma"}
            rows={6}
            className="w-full px-3 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none font-mono text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePaste}
              disabled={!pasteText.trim()}
              className="flex items-center gap-2 min-h-[48px] px-5 py-2 rounded-lg bg-mikai-400 text-white hover:bg-mikai-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base font-medium"
            >
              <Icon icon={ACTION_ICONS.check} size={18} />
              Carica nella griglia
            </button>
            <p className="text-xs text-gray-400 self-center">
              {pasteText.trim() ? `${pasteText.split(/\r?\n/).filter(l => l.trim()).length} righe rilevate` : ''}
            </p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPaste(true)}
          className="flex items-center gap-2 self-start min-h-[48px] px-4 py-2 rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors text-base"
        >
          <Icon icon={ACTION_ICONS.upload} size={18} />
          Incolla da foglio di calcolo
        </button>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600 font-medium">
              <th className="px-3 py-3 whitespace-nowrap">
                Cognome <span className="text-red-500">*</span>
              </th>
              <th className="px-3 py-3 whitespace-nowrap">
                Nome <span className="text-red-500">*</span>
              </th>
              <th className="px-3 py-3 whitespace-nowrap">
                Tipologia <span className="text-red-500">*</span>
              </th>
              <th className="px-3 py-3 whitespace-nowrap">Azienda / Ospedale</th>
              <th className="px-3 py-3 whitespace-nowrap">Città</th>
              <th className="px-3 py-3 whitespace-nowrap">Email</th>
              <th className="px-3 py-3 whitespace-nowrap">Telefono</th>
              <th className="px-3 py-3 whitespace-nowrap">Note salute</th>
              {showEventColumns && (
                <>
                  <th className="px-3 py-3 whitespace-nowrap">
                    Ruolo evento <span className="text-red-500">*</span>
                  </th>
                  <th className="px-3 py-3 whitespace-nowrap">Note evento</th>
                </>
              )}
              <th className="px-3 py-3 w-10" aria-label="Rimuovi riga" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const rowErrors = validationErrors[i] || []
              return (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={row.cognome}
                      onChange={(e) => handleCellChange(i, 'cognome', e.target.value)}
                      placeholder="Cognome"
                      className={rowErrors.includes('cognome') ? ERROR_INPUT_CLASS : INPUT_CLASS}
                      aria-label={`Riga ${i + 1} cognome`}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={row.nome}
                      onChange={(e) => handleCellChange(i, 'nome', e.target.value)}
                      placeholder="Nome"
                      className={rowErrors.includes('nome') ? ERROR_INPUT_CLASS : INPUT_CLASS}
                      aria-label={`Riga ${i + 1} nome`}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={row.tipologia}
                      onChange={(e) => handleCellChange(i, 'tipologia', e.target.value)}
                      className={rowErrors.includes('tipologia') ? ERROR_INPUT_CLASS : INPUT_CLASS}
                      aria-label={`Riga ${i + 1} tipologia`}
                    >
                      <option value="">— Scegli —</option>
                      {Object.entries(TIPOLOGIA_IMPORT).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={row.azienda}
                      onChange={(e) => handleCellChange(i, 'azienda', e.target.value)}
                      placeholder="Azienda"
                      className={INPUT_CLASS}
                      aria-label={`Riga ${i + 1} azienda`}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={row.citta}
                      onChange={(e) => handleCellChange(i, 'citta', e.target.value)}
                      placeholder="Città"
                      className={INPUT_CLASS}
                      aria-label={`Riga ${i + 1} città`}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="email"
                      value={row.email}
                      onChange={(e) => handleCellChange(i, 'email', e.target.value)}
                      placeholder="email@esempio.it"
                      className={INPUT_CLASS}
                      aria-label={`Riga ${i + 1} email`}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="tel"
                      value={row.telefono}
                      onChange={(e) => handleCellChange(i, 'telefono', e.target.value)}
                      placeholder="+39 000 000 0000"
                      className={INPUT_CLASS}
                      aria-label={`Riga ${i + 1} telefono`}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={row.note_salute}
                      onChange={(e) => handleCellChange(i, 'note_salute', e.target.value)}
                      placeholder="Es: allergie, dieta…"
                      className={INPUT_CLASS}
                      aria-label={`Riga ${i + 1} note salute`}
                    />
                  </td>
                  {showEventColumns && (
                    <>
                      <td className="px-2 py-1">
                        <select
                          value={row.ruolo_evento}
                          onChange={(e) => handleCellChange(i, 'ruolo_evento', e.target.value)}
                          className={
                            rowErrors.includes('ruolo_evento') ? ERROR_INPUT_CLASS : INPUT_CLASS
                          }
                          aria-label={`Riga ${i + 1} ruolo evento`}
                        >
                          <option value="">— Scegli —</option>
                          {Object.entries(TIPO_PARTECIPANTE).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={row.note_evento}
                          onChange={(e) => handleCellChange(i, 'note_evento', e.target.value)}
                          placeholder="Note…"
                          className={INPUT_CLASS}
                          aria-label={`Riga ${i + 1} note evento`}
                        />
                      </td>
                    </>
                  )}
                  <td className="px-2 py-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(i)}
                      disabled={rows.length <= 1}
                      className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label={`Rimuovi riga ${i + 1}`}
                    >
                      <Icon icon={ACTION_ICONS.close} size={18} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleAddRows}
          className="flex items-center gap-2 min-h-[48px] px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-base"
        >
          <Icon icon={ACTION_ICONS.add} size={18} />
          Aggiungi 5 righe
        </button>

        <div className="flex flex-col items-end gap-1">
          {hasErrors && (
            <p className="text-sm text-red-600" role="alert">
              Completa i campi obbligatori evidenziati prima di procedere.
            </p>
          )}
          <button
            type="button"
            onClick={handleVerifica}
            className="flex items-center gap-2 min-h-[48px] px-6 py-2 rounded-lg bg-mikai-400 text-white hover:bg-mikai-500 transition-colors text-base font-medium"
          >
            <Icon icon={ACTION_ICONS.check} size={18} />
            Verifica e importa
          </button>
        </div>
      </div>
    </div>
  )
}
