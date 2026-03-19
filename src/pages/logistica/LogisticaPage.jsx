import { useState } from 'react'
import { Tabs } from '../../components/ui/Tabs'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { LogisticaTimeline } from './LogisticaTimeline'
import { LogisticaMatrice } from './LogisticaMatrice'
import { LogisticaRientri } from './LogisticaRientri'
import { LogisticaInventario } from './LogisticaInventario'

const TABS = [
  { id: 'timeline', label: 'Spedizioni' },
  { id: 'matrice', label: 'Matrice' },
  { id: 'rientri', label: 'Rientri' },
  { id: 'inventario', label: 'Inventario' },
]

export function LogisticaPage() {
  const [activeTab, setActiveTab] = useState('timeline')

  return (
    <div className="space-y-4">
      <div className="hidden md:block px-6 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Logistica' }]} />
      </div>
      <div className="md:hidden">
        <MobileHeader title="Logistica" showBack={false} />
      </div>
      <PageHeader title="Logistica" subtitle="Gestione spedizioni, rientri e inventario" />
      <div className="px-4 md:px-8">
        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      </div>
      {activeTab === 'timeline' && <LogisticaTimeline />}
      {activeTab === 'matrice' && <LogisticaMatrice />}
      {activeTab === 'rientri' && <LogisticaRientri />}
      {activeTab === 'inventario' && <LogisticaInventario />}
    </div>
  )
}
