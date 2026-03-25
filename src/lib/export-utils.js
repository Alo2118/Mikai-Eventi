// Utility per esportazione Excel con dynamic import di exceljs.
// Usa import dinamico per non appesantire il bundle principale.

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
