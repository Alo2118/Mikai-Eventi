// Utility per esportazione Excel con dynamic import di exceljs.
// Usa import dinamico per non appesantire il bundle principale.

import { TIPO_TOV, TIPO_HCP } from './constants'

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100

// Costruisce l'export disclosure aggregato (Sunshine Act / MedTech) da righe ToV.
// Due fogli, secondo il consenso privacy dell'HCP:
//  - "Nominativo": HCP con consenso → dettaglio per professionista × periodo × tipo
//  - "Aggregato": HCP senza consenso → totali per periodo × categoria × tipo (senza nomi)
export async function buildDisclosureReport(rows, { periodo } = {}) {
  const nominativi = new Map() // hcpId|periodo|tipo → aggregato
  const aggregati = new Map()  // periodo|categoria|tipo → aggregato

  for (const r of (rows || [])) {
    const hcp = r.hcp
    const per = r.periodo_riferimento || '—'
    const importo = Number(r.importo || 0)
    if (hcp?.consenso_privacy) {
      const k = `${hcp.id}|${per}|${r.tipo}`
      const cur = nominativi.get(k) || {
        cognome: hcp.contatto?.cognome || '',
        nome: hcp.contatto?.nome || '',
        struttura: hcp.contatto?.azienda || '',
        categoria: TIPO_HCP[hcp.categoria] || hcp.categoria || '',
        periodo: per,
        tipo: TIPO_TOV[r.tipo] || r.tipo,
        importo: 0,
        conteggio: 0,
      }
      cur.importo += importo
      cur.conteggio += 1
      nominativi.set(k, cur)
    } else {
      const cat = hcp?.categoria || 'non_specificato'
      const k = `${per}|${cat}|${r.tipo}`
      const cur = aggregati.get(k) || {
        periodo: per,
        categoria: TIPO_HCP[cat] || 'Non specificato',
        tipo: TIPO_TOV[r.tipo] || r.tipo,
        importo: 0,
        professionisti: new Set(),
        conteggio: 0,
      }
      cur.importo += importo
      cur.conteggio += 1
      if (hcp?.id) cur.professionisti.add(hcp.id)
      aggregati.set(k, cur)
    }
  }

  const nominativiRows = [...nominativi.values()]
    .map(r => ({ ...r, importo: round2(r.importo) }))
    .sort((a, b) => a.cognome.localeCompare(b.cognome) || a.tipo.localeCompare(b.tipo))

  const aggregatiRows = [...aggregati.values()]
    .map(r => ({ ...r, importo: round2(r.importo), professionisti: r.professionisti.size }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo) || a.categoria.localeCompare(b.categoria))

  const suffisso = periodo ? `_${periodo}` : ''
  await exportToExcelMultiSheet({
    filename: `disclosure_tov${suffisso}.xlsx`,
    sheets: [
      {
        name: 'Nominativo',
        columns: [
          { label: 'Cognome', key: 'cognome', width: 20 },
          { label: 'Nome', key: 'nome', width: 20 },
          { label: 'Struttura', key: 'struttura', width: 28 },
          { label: 'Categoria', key: 'categoria', width: 16 },
          { label: 'Periodo', key: 'periodo', width: 12 },
          { label: 'Tipo trasferimento', key: 'tipo', width: 18 },
          { label: 'Importo (€)', key: 'importo', width: 14 },
          { label: 'N. trasferimenti', key: 'conteggio', width: 16 },
        ],
        rows: nominativiRows,
      },
      {
        name: 'Aggregato',
        columns: [
          { label: 'Periodo', key: 'periodo', width: 12 },
          { label: 'Categoria HCP', key: 'categoria', width: 18 },
          { label: 'Tipo trasferimento', key: 'tipo', width: 18 },
          { label: 'Importo totale (€)', key: 'importo', width: 16 },
          { label: 'N. professionisti', key: 'professionisti', width: 16 },
          { label: 'N. trasferimenti', key: 'conteggio', width: 16 },
        ],
        rows: aggregatiRows,
      },
    ],
  })

  return { nominativi: nominativiRows.length, aggregati: aggregatiRows.length }
}

export async function exportToExcel({ columns, rows, filename, sheetName = 'Dati' }) {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(sheetName)

  // Set columns
  sheet.columns = columns.map(c => ({ header: c.label, key: c.key, width: c.width || 20 }))

  // Add rows — apply format function if defined
  rows.forEach(row => {
    const rowData = {}
    columns.forEach(col => {
      const raw = col.key.includes('.') ? getNestedValue(row, col.key) : row[col.key]
      rowData[col.key] = col.format ? col.format(raw, row) : (raw ?? '')
    })
    sheet.addRow(rowData)
  })

  // Style header
  sheet.getRow(1).font = { bold: true }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(buffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

export async function exportToExcelMultiSheet({ sheets, filename }) {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()

  for (const s of sheets) {
    const sheet = workbook.addWorksheet(s.name)
    sheet.columns = s.columns.map(c => ({ header: c.label, key: c.key, width: c.width || 20 }))
    s.rows.forEach(row => {
      const rowData = {}
      s.columns.forEach(col => {
        const raw = col.key.includes('.') ? getNestedValue(row, col.key) : row[col.key]
        rowData[col.key] = col.format ? col.format(raw, row) : (raw ?? '')
      })
      sheet.addRow(rowData)
    })
    sheet.getRow(1).font = { bold: true }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(buffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

function downloadBlob(buffer, filename, mimeType) {
  const blob = new Blob([buffer], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
