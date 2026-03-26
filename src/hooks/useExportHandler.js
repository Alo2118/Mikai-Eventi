import { useState } from 'react'
import { exportToExcel } from '../lib/export-utils'
import { useToastStore } from '../components/ui/Toast'
import { todayISO } from '../lib/date-utils'

export function useExportHandler() {
  const [exporting, setExporting] = useState(false)
  const addToast = useToastStore(s => s.add)

  const handleExport = async ({ columns, rows, filename, sheetName }) => {
    if (!rows || rows.length === 0) { addToast('Nessun dato da esportare', 'warning'); return }
    setExporting(true)
    try {
      const today = todayISO()
      await exportToExcel({
        columns,
        rows,
        filename: `${filename}_${today}.xlsx`,
        sheetName,
      })
      addToast('File esportato', 'success')
    } catch {
      addToast('Errore durante l\'esportazione', 'error')
    }
    setExporting(false)
  }

  return { exporting, handleExport }
}
