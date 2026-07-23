import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMaterialAnalyticsStore } from '../../hooks/useMaterialAnalytics'
import { useCatalogStore } from '../../hooks/useCatalog'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ExportButton } from '../../components/ui/ExportButton'
import { Icon } from '../../components/ui/Icon'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { CARD_STYLE, CARD_HOVER_STYLE } from '../../lib/constants'
import { ACTION_ICONS, DOCUMENTO_ICONS } from '../../lib/icons'
import { TopMaterialiChart } from '../../components/report/TopMaterialiChart'
import { MaterialeFuoriList } from '../../components/report/MaterialeFuoriList'
import { MetricheMaterialeTable } from '../../components/report/MetricheMaterialeTable'
import { ProssimePrenotazioni } from '../../components/report/ProssimePrenotazioni'
import { useExportHandler } from '../../hooks/useExportHandler'

function KpiCard({ label, value, colorClass, to, children }) {
  const navigate = useNavigate()
  if (to) {
    return (
      <button
        type="button"
        onClick={() => navigate(to)}
        className={CARD_HOVER_STYLE + ' cursor-pointer text-left w-full'}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-gray-500">{label}</p>
          <Icon icon={ACTION_ICONS.forward} size={16} className="text-gray-400 shrink-0" />
        </div>
        <p className={`text-3xl font-bold ${colorClass || 'text-gray-900'}`}>{value}</p>
        {children}
      </button>
    )
  }
  return (
    <div className={CARD_STYLE}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold ${colorClass || 'text-gray-900'}`}>{value}</p>
      {children}
    </div>
  )
}

export function ReportMaterialePage() {
  const navigate = useNavigate()
  const materialAnalytics = useMaterialAnalyticsStore(s => s.materialAnalytics)
  const upcomingBookings = useMaterialAnalyticsStore(s => s.upcomingBookings)
  const loading = useMaterialAnalyticsStore(s => s.analyticsLoading)
  const fetchMaterialAnalytics = useMaterialAnalyticsStore(s => s.fetchMaterialAnalytics)
  const fetchUpcomingBookings = useMaterialAnalyticsStore(s => s.fetchUpcomingBookings)
  const fetchProductNames = useCatalogStore(s => s.fetchProductNames)
  const [productNames, setProductNames] = useState({})

  useEffect(() => {
    fetchMaterialAnalytics()
    fetchUpcomingBookings()
  }, [])

  // Load product names for the top used items
  useEffect(() => {
    if (!materialAnalytics?.topUsed?.length) return
    const ids = materialAnalytics.topUsed.map(t => t.id)
    fetchProductNames(ids).then(map => setProductNames(map))
  }, [materialAnalytics?.topUsed])

  const exportColumns = [
    { key: 'nome', label: 'Prodotto', width: 30 },
    { key: 'utilizzi', label: 'Utilizzi', width: 12 },
    { key: 'giorniMedi', label: 'Giorni medi fuori', width: 18 },
    { key: 'ratePuntuale', label: 'Rientro puntuale %', width: 18 },
  ]

  const exportRows = (materialAnalytics?.topUsed || []).map(item => ({
    nome: productNames[item.id] || item.id,
    utilizzi: item.count,
    giorniMedi: item.avgDays ?? '—',
    ratePuntuale: item.onTimeRate ?? '—',
  }))

  const { handleExport, exporting } = useExportHandler()

  const runExport = () => handleExport({
    columns: exportColumns,
    rows: exportRows,
    filename: 'report_materiale',
    sheetName: 'Report Materiale',
  })

  const hasData = materialAnalytics && (
    materialAnalytics.totalUsages > 0 ||
    materialAnalytics.totalMovements > 0 ||
    materialAnalytics.fuori?.length > 0
  )

  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[
          { label: 'Magazzino', to: '/materiale' },
          { label: 'Report Materiale' },
        ]} />
      </div>
      <div className="md:hidden">
        <MobileHeader
          title="Report Materiale"
          backTo="/materiale"
          actions={hasData ? [
            { icon: DOCUMENTO_ICONS.spreadsheet, label: 'Esporta Excel', onClick: runExport, loading: exporting },
          ] : []}
        />
      </div>
      <PageHeader
        mobileHidden
        title="Report Materiale"
        subtitle="Analisi utilizzo e disponibilità del materiale"
        actions={hasData ? [
          <ExportButton key="export" onClick={runExport} loading={exporting} label="Esporta Excel" />,
        ] : []}
      />

      <div className="px-4 md:px-8 space-y-6 pb-8">
        {loading && !materialAnalytics ? (
          <LoadingSkeleton lines={8} />
        ) : !hasData ? (
          <EmptyState
            title="Nessun dato disponibile"
            description="Non ci sono ancora dati di utilizzo materiale da analizzare."
          />
        ) : (
          <>
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Utilizzi (anno)"
                value={materialAnalytics?.totalUsages || 0}
                to="/materiale"
              />
              <KpiCard
                label="Movimenti"
                value={materialAnalytics?.totalMovements || 0}
                to="/materiale"
              />
              <KpiCard
                label="Fuori magazzino"
                value={materialAnalytics?.fuori?.length || 0}
                colorClass={(materialAnalytics?.fuori?.length || 0) > 0 ? 'text-yellow-600' : 'text-green-600'}
                to="/materiale"
              />
              <KpiCard
                label="Rientro puntuale"
                value={materialAnalytics?.onTimeRate != null
                  ? `${materialAnalytics.onTimeRate}%`
                  : '\u2014'}
                colorClass={materialAnalytics?.onTimeRate != null
                  ? materialAnalytics.onTimeRate >= 90 ? 'text-green-600'
                    : materialAnalytics.onTimeRate >= 70 ? 'text-yellow-600'
                      : 'text-red-600'
                  : 'text-gray-400'}
              />
            </div>

            <TopMaterialiChart
              data={materialAnalytics?.topUsed}
              productNames={productNames}
              onBarClick={(id) => navigate(`/materiale/${id}`)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MaterialeFuoriList data={materialAnalytics?.fuori} />
              <ProssimePrenotazioni bookings={upcomingBookings} />
            </div>

            <MetricheMaterialeTable
              analytics={materialAnalytics}
              productNames={productNames}
            />
          </>
        )}
      </div>
    </div>
  )
}
