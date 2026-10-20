import sfondoUrl from '../assets/attestato-sfondo.jpg'
import { ATTESTATO_INTESTAZIONE, ATTESTATO_SEDE } from './constants'
import { formatDateRangeLong } from './date-utils'
import { downloadBlob } from './export-utils'

// Coordinate in mm su A4 orizzontale, ricavate da "ATTESTATI layout.pdf" (baseline del testo)
const X = 103.7
const MAX_WIDTH = 183
const TEXT_COLOR = '#231f20'
const Y = { intestazione: 37, nome: 52.5, haPartecipato: 70.1, corso: 89.9, data: 113.2, sede: 128.7 }
const CORSO_FONT_SIZES = [30, 26, 22, 20]
const PT_TO_MM = 25.4 / 72

let sfondoCache = null

async function loadSfondo() {
  if (sfondoCache) return sfondoCache
  const blob = await (await fetch(sfondoUrl)).blob()
  sfondoCache = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
  return sfondoCache
}

// Riduce il corpo del titolo finché sta in massimo 2 righe
function fitCorso(doc, testo) {
  for (const size of CORSO_FONT_SIZES) {
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(testo, MAX_WIDTH)
    if (lines.length <= 2) return { size, lines }
  }
  return { size: CORSO_FONT_SIZES.at(-1), lines: doc.splitTextToSize(testo, MAX_WIDTH).slice(0, 2) }
}

function drawAttestato(doc, sfondo, { intestazione, nome, corso, data }) {
  doc.addImage(sfondo, 'JPEG', 0, 0, 297, 210)
  doc.setTextColor(TEXT_COLOR)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(18)
  doc.text(intestazione, X, Y.intestazione)
  doc.text(nome, X, Y.nome)
  doc.setLineWidth(0.2)
  doc.setDrawColor(TEXT_COLOR)
  doc.line(X, Y.nome + 0.8, X + doc.getTextWidth(nome), Y.nome + 0.8)
  doc.text('ha partecipato al', X, Y.haPartecipato)

  doc.setFont('helvetica', 'bold')
  const { size, lines } = fitCorso(doc, corso)
  const lineHeight = size * PT_TO_MM * 1.15
  doc.text(lines, X, Y.corso, { lineHeightFactor: 1.15 })
  const shift = (lines.length - 1) * lineHeight

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(18)
  doc.text(data, X, Y.data + shift)
  doc.text(ATTESTATO_SEDE, X, Y.sede + shift, { lineHeightFactor: 1.2 })
}

function safeName(text) {
  return (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')
}

export function attestatiFolderName(event) {
  return ['Attestati', event.data_inizio, safeName(event.luogo)].filter(Boolean).join('_')
}

/**
 * Genera un PDF per persona e li salva in una cartella sul PC.
 * people: [{ nome, cognome, titolo }]. Ritorna { count, method: 'folder' | 'zip' } o { cancelled: true }.
 */
export async function generateAttestati({ event, people, corso }) {
  const { jsPDF } = await import('jspdf')
  const sfondo = await loadSfondo()
  const data = formatDateRangeLong(event.data_inizio, event.data_fine)

  const files = people.map(p => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    drawAttestato(doc, sfondo, {
      intestazione: ATTESTATO_INTESTAZIONE[p.titolo || ''],
      nome: `${p.nome} ${p.cognome}`,
      corso,
      data,
    })
    return { name: `Attestato_${safeName(p.cognome)}_${safeName(p.nome)}.pdf`, blob: doc.output('blob') }
  })

  const folderName = attestatiFolderName(event)
  if (window.showDirectoryPicker) {
    try {
      return await saveToFolder(files, folderName)
    } catch (err) {
      if (err?.name === 'AbortError') return { cancelled: true }
      // Permesso negato o cartella protetta: ripiega sullo ZIP
    }
  }
  return saveAsZip(files, folderName)
}

async function saveToFolder(files, folderName) {
  const root = await window.showDirectoryPicker({ id: 'attestati', mode: 'readwrite', startIn: 'documents' })
  const dir = await root.getDirectoryHandle(folderName, { create: true })
  for (const file of files) {
    const handle = await dir.getFileHandle(file.name, { create: true })
    const writable = await handle.createWritable()
    await writable.write(file.blob)
    await writable.close()
  }
  return { count: files.length, method: 'folder', folderName }
}

async function saveAsZip(files, folderName) {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  const dir = zip.folder(folderName)
  files.forEach(f => dir.file(f.name, f.blob))
  const content = await zip.generateAsync({ type: 'blob' })
  downloadBlob(content, `${folderName}.zip`, 'application/zip')
  return { count: files.length, method: 'zip', folderName }
}
