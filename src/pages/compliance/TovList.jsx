import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useComplianceStore } from '../../hooks/useCompliance'
import { useAuthStore } from '../../hooks/useAuth'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SearchInput } from '../../components/ui/SearchInput'
import { ExportButton } from '../../components/ui/ExportButton'
import { useExportHandler } from '../../hooks/useExportHandler'
import { TIPO_TOV, STATO_TOV, STATO_TOV_COLORE, SELECT_STYLE, CARD_HOVER_STYLE } from '../../lib/constants'
import { COMPLIANCE_ICONS, ACTION_ICONS } from '../../lib/icons'
import { formatDate } from '../../lib/date-utils'
import { formatCurrencyDecimals } from '../../lib/format-utils'

const EXPORT_COLUMNS = [
  { key: 'data_trasferimento', label: 'Data', format: v => formatDate(v) },
  { key: 'hcp_nome', label: 'HCP' },
  { key: 'tipo', label: 'Tipo', format: v => TIPO_TOV[v] || v },
  { key: 'importo', label: 'Importo (€)', width: 15 },
  { key: 'stato', label: 'Stato', format: v => STATO_TOV[v] || v },
  { key: 'descrizione', label: 'Descrizione', width: 30 },
  { key: 'giustificazione', label: 'Giustificazione', width: 30 },
  { key: 'periodo_riferimento', label: 'Periodo' },
]

export function TovList() {
  const navigate = useNavigate()
  const tovList = useComplianceStore(s => s.tovList)
  const tovLoading = useComplianceStore(s => s.tovLoading)
  const fetchTovList = useComplianceStore(s => s.fetchTovList)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const { exporting, handleExport } = useExportHandler()

  const [search, setSearch] = useState('')
  const [filtroStato, setFiltroStato] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  useEffect(() => {
    const filters = {}
    if (filtroStato) filters.stato = filtroStato
    if (filtroTipo) filters.tipo = filtroTipo
    fetchTovList(filters)
  }, [filtroStato, filtroTipo])

  const filtered = tovList.filter(t => {
    if (!search) return true
    const hcpName = `${t.hcp?.contatto?.nome || ''} ${t.hcp?.contatto?.cognome || ''}`.toLowerCase()
    return hcpName.includes(search.toLowerCase()) ||
      t.descrizione?.toLowerCase().includes(search.toLowerCase())
  })

  const exportTov = () => {
    const rows = filtered.map(t => ({
      ...t,
      hcp_nome: `${t.hcp?.contatto?.cognome || ''} ${t.hcp?.contatto?.nome || ''}`.trim(),
    }))
    handleExport({ columns: EXPORT_COLUMNS, rows, filename: 'trasferimenti_valore', sheetName: 'ToV' })
  }

  return (
    <div className="px-4 md:px-8 py-6 space-y-6">
      <Breadcrumb items={[{ label: 'Compliance', to: '/compliance' }, { label: 'Trasferimenti di valore' }]} />
      <PageHeader
        title="Trasferimenti di valore"
        subtitle="Registra e verifica i trasferimenti di valore verso professionisti HCP"
        actions={
          <div className="flex gap-2">
            <ExportButton onClick={exportTov} loading={exporting} />
            {hasPermission('compliance') && (
              <Button variant="primary" onClick={() => navigate('/compliance/tov/nuovo')}>
                <Icon icon={ACTION_ICONS.add} size={18} />
                <span className="ml-2">Nuovo trasferimento</span>
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-col md:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Cerca per HCP o descrizione..." />
        <select value={filtroStato} onChange={e => setFiltroStato(e.target.value)} className={SELECT_STYLE + ' md:max-w-[200px]'}>
          <option value="">Tutti gli stati</option>
          {Object.entries(STATO_TOV).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={SELECT_STYLE + ' md:max-w-[200px]'}>
          <option value="">Tutti i tipi</option>
          {Object.entries(TIPO_TOV).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {tovLoading ? (
        <LoadingSkeleton lines={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nessun trasferimento"
          description="Non ci sono trasferimenti di valore registrati."
          action={hasPermission('compliance') ? { label: 'Registra trasferimento', onClick: () => navigate('/compliance/tov/nuovo') } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(tov => (
            <div
              key={tov.id}
              onClick={() => navigate(`/compliance/tov/${tov.id}`)}
              className={CARD_HOVER_STYLE + ' cursor-pointer'}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {tov.hcp?.contatto?.cognome} {tov.hcp?.contatto?.nome}
                    </span>
                    <StatusBadge stato={tov.stato} labels={STATO_TOV} colors={STATO_TOV_COLORE} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {TIPO_TOV[tov.tipo]} — {formatDate(tov.data_trasferimento)}
                    {tov.evento && <span> — {tov.evento.titolo}</span>}
                  </p>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-1">{tov.descrizione}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrencyDecimals(tov.importo)}
                  </p>
                  {tov.periodo_riferimento && (
                    <p className="text-xs text-gray-400">{tov.periodo_riferimento}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
