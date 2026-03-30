import { useEffect, useState } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { CARD_STYLE } from '../../lib/constants'
import { TopMaterialiChart } from '../../components/report/TopMaterialiChart'
import { MaterialeFuoriList } from '../../components/report/MaterialeFuoriList'
import { MetricheMaterialeTable } from '../../components/report/MetricheMaterialeTable'
import { ProssimePrenotazioni } from '../../components/report/ProssimePrenotazioni'

export function ReportMaterialePage() {
  const materialAnalytics = useMaterialsStore(s => s.materialAnalytics)
  const upcomingBookings = useMaterialsStore(s => s.upcomingBookings)
  const loading = useMaterialsStore(s => s.analyticsLoading)
  const fetchMaterialAnalytics = useMaterialsStore(s => s.fetchMaterialAnalytics)
  const fetchUpcomingBookings = useMaterialsStore(s => s.fetchUpcomingBookings)
  const fetchProductNames = useMaterialsStore(s => s.fetchProductNames)
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

  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[
          { label: 'Magazzino', to: '/materiale' },
          { label: 'Report Materiale' },
        ]} />
      </div>
      <div className="md:hidden">
        <MobileHeader title="Report Materiale" backTo="/materiale" />
      </div>
      <PageHeader
        title="Report Materiale"
        subtitle="Analisi utilizzo e disponibilità del materiale"
      />

      <div className="px-4 md:px-8 space-y-6 pb-8">
        {loading && !materialAnalytics ? (
          <LoadingSkeleton lines={8} />
        ) : (
          <>
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={CARD_STYLE}>
                <p className="text-sm text-gray-500">Utilizzi (anno)</p>
                <p className="text-3xl font-bold text-gray-900">
                  {materialAnalytics?.totalUsages || 0}
                </p>
              </div>
              <div className={CARD_STYLE}>
                <p className="text-sm text-gray-500">Movimenti</p>
                <p className="text-3xl font-bold text-gray-900">
                  {materialAnalytics?.totalMovements || 0}
                </p>
              </div>
              <div className={CARD_STYLE}>
                <p className="text-sm text-gray-500">Fuori magazzino</p>
                <p className={`text-3xl font-bold ${
                  (materialAnalytics?.fuori?.length || 0) > 0 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {materialAnalytics?.fuori?.length || 0}
                </p>
              </div>
              <div className={CARD_STYLE}>
                <p className="text-sm text-gray-500">Rientro puntuale</p>
                <p className={`text-3xl font-bold ${
                  materialAnalytics?.onTimeRate != null
                    ? materialAnalytics.onTimeRate >= 90 ? 'text-green-600'
                      : materialAnalytics.onTimeRate >= 70 ? 'text-yellow-600'
                        : 'text-red-600'
                    : 'text-gray-400'
                }`}>
                  {materialAnalytics?.onTimeRate != null
                    ? `${materialAnalytics.onTimeRate}%`
                    : '\u2014'}
                </p>
              </div>
            </div>

            <TopMaterialiChart
              data={materialAnalytics?.topUsed}
              productNames={productNames}
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
