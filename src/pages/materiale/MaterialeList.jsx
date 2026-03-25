import { useEffect, useState } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { MaterialCard } from '../../components/materiale/MaterialCard'
import { MaterialFilters } from '../../components/materiale/MaterialFilters'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ExportButton } from '../../components/ui/ExportButton'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { exportToExcel } from '../../lib/export-utils'
import { TIPO_MATERIALE, POSIZIONE_MATERIALE } from '../../lib/constants'
import { useToastStore } from '../../components/ui/Toast'

const EXPORT_COLUMNS_MATERIALI = [
  { key: 'nome', label: 'Nome', width: 30 },
  { key: 'codice_inventario', label: 'Codice inventario' },
  { key: 'tipo', label: 'Tipo', format: v => TIPO_MATERIALE[v] || v },
  { key: 'posizione_attuale', label: 'Posizione', format: v => POSIZIONE_MATERIALE[v] || v },
  { key: 'product', label: 'Brand', format: v => v?.brand?.nome || '' },
]

export function MaterialeList() {
  const materials = useMaterialsStore(s => s.materials)
  const loading = useMaterialsStore(s => s.loading)
  const fetchMaterials = useMaterialsStore(s => s.fetchMaterials)
  const addToast = useToastStore(s => s.add)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { fetchMaterials() }, [])

  const inMagazzino = materials.filter(m => m.posizione_attuale === 'in_magazzino').length
  const fuori = materials.filter(m => m.posizione_attuale !== 'in_magazzino').length

  const handleExport = async () => {
    if (materials.length === 0) { addToast('Nessun dato da esportare', 'warning'); return }
    setExporting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      await exportToExcel({
        columns: EXPORT_COLUMNS_MATERIALI,
        rows: materials,
        filename: `materiale_${today}.xlsx`,
        sheetName: 'Materiale',
      })
      addToast('File esportato', 'success')
    } catch { addToast('Errore durante l\'esportazione', 'error') }
    setExporting(false)
  }

  return (
    <div>
      <div className="px-6 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Materiale & Gadget' }]} />
      </div>
      <PageHeader
        title="Materiale & Gadget"
        subtitle={`${inMagazzino} in magazzino · ${fuori} fuori sede`}
        actions={<ExportButton onClick={handleExport} loading={exporting} />}
      />
      <MaterialFilters />
      <div className="px-6 md:px-8 py-4">
        {loading ? (
          <LoadingSkeleton lines={5} />
        ) : materials.length === 0 ? (
          <EmptyState title="Nessun materiale trovato" description="Prova a cambiare i filtri." />
        ) : (
          <div className="space-y-3">
            {materials.map((m) => (
              <MaterialCard key={m.id} material={m} linkTo={`/materiale/${m.id}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
