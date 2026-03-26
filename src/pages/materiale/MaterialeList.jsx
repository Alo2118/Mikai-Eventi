import { useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useExportHandler } from '../../hooks/useExportHandler'
import { MaterialCard } from '../../components/materiale/MaterialCard'
import { MaterialFilters } from '../../components/materiale/MaterialFilters'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ExportButton } from '../../components/ui/ExportButton'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { TIPO_MATERIALE, POSIZIONE_MATERIALE } from '../../lib/constants'

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
  const { exporting, handleExport } = useExportHandler()

  useEffect(() => { fetchMaterials() }, [])

  const inMagazzino = materials.filter(m => m.posizione_attuale === 'in_magazzino').length
  const fuori = materials.filter(m => m.posizione_attuale !== 'in_magazzino').length

  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Materiale & Gadget' }]} />
      </div>
      <PageHeader
        title="Materiale & Gadget"
        subtitle={`${inMagazzino} in magazzino · ${fuori} fuori sede`}
        actions={<ExportButton onClick={() => handleExport({ columns: EXPORT_COLUMNS_MATERIALI, rows: materials, filename: 'materiale', sheetName: 'Materiale' })} loading={exporting} />}
      />
      <MaterialFilters />
      <div className="px-4 md:px-8 py-4">
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
