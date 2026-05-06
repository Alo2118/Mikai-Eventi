import { useEffect, useState } from 'react'
import { useAuditLogStore } from '../../hooks/useAuditLog'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ExportButton } from '../../components/ui/ExportButton'
import { useExportHandler } from '../../hooks/useExportHandler'
import { AUDIT_ENTITA, AUDIT_AZIONE, AUDIT_AZIONE_COLORE, SELECT_STYLE, INPUT_STYLE, CARD_STYLE } from '../../lib/constants'
import { COMPLIANCE_ICONS } from '../../lib/icons'
import { formatDateTime } from '../../lib/date-utils'

const EXPORT_COLUMNS = [
  { key: 'created_at', label: 'Data/Ora', format: v => formatDateTime(v), width: 22 },
  { key: 'entita_tipo', label: 'Entità', format: v => AUDIT_ENTITA[v] || v },
  { key: 'azione', label: 'Azione', format: v => AUDIT_AZIONE[v] || v },
  { key: 'utente_nome', label: 'Utente', width: 20 },
  { key: 'campo_modificato', label: 'Campo' },
  { key: 'valore_precedente', label: 'Valore precedente', width: 25 },
  { key: 'valore_nuovo', label: 'Nuovo valore', width: 25 },
  { key: 'commento', label: 'Commento', width: 30 },
]

export function AuditTrailPage() {
  const logs = useAuditLogStore(s => s.logs)
  const loading = useAuditLogStore(s => s.loading)
  const hasMore = useAuditLogStore(s => s.hasMore)
  const totalCount = useAuditLogStore(s => s.totalCount)
  const fetchLogs = useAuditLogStore(s => s.fetchLogs)
  const loadMore = useAuditLogStore(s => s.loadMore)
  const { exporting, handleExport } = useExportHandler()

  const [filtroEntita, setFiltroEntita] = useState('')
  const [filtroAzione, setFiltroAzione] = useState('')
  const [filtroDa, setFiltroDa] = useState('')
  const [filtroA, setFiltroA] = useState('')

  const filters = {
    ...(filtroEntita && { entita_tipo: filtroEntita }),
    ...(filtroAzione && { azione: filtroAzione }),
    ...(filtroDa && { da: filtroDa }),
    ...(filtroA && { a: filtroA }),
  }

  useEffect(() => { fetchLogs(filters) }, [filtroEntita, filtroAzione, filtroDa, filtroA])

  const exportAudit = () => {
    const rows = logs.map(l => ({
      ...l,
      utente_nome: `${l.utente?.cognome || ''} ${l.utente?.nome || ''}`.trim(),
    }))
    handleExport({ columns: EXPORT_COLUMNS, rows, filename: 'audit_trail', sheetName: 'Audit' })
  }

  return (
    <div className="px-4 md:px-8 py-6 space-y-6">
      <Breadcrumb items={[{ label: 'Admin' }, { label: 'Audit Trail' }]} />
      <PageHeader
        title="Audit Trail"
        subtitle={`${totalCount} azioni registrate`}
        actions={<ExportButton onClick={exportAudit} loading={exporting} />}
      />

      <div className="flex flex-col md:flex-row gap-3">
        <select value={filtroEntita} onChange={e => setFiltroEntita(e.target.value)} className={SELECT_STYLE + ' md:max-w-[200px]'}>
          <option value="">Tutte le entità</option>
          {Object.entries(AUDIT_ENTITA).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={filtroAzione} onChange={e => setFiltroAzione(e.target.value)} className={SELECT_STYLE + ' md:max-w-[200px]'}>
          <option value="">Tutte le azioni</option>
          {Object.entries(AUDIT_AZIONE).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input type="date" value={filtroDa} onChange={e => setFiltroDa(e.target.value)} className={INPUT_STYLE + ' md:max-w-[180px]'} placeholder="Da" />
        <input type="date" value={filtroA} onChange={e => setFiltroA(e.target.value)} className={INPUT_STYLE + ' md:max-w-[180px]'} placeholder="A" />
      </div>

      {loading && logs.length === 0 ? (
        <LoadingSkeleton lines={8} />
      ) : logs.length === 0 ? (
        <EmptyState title="Nessuna azione registrata" description="Non ci sono ancora azioni nel log di audit." />
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className={CARD_STYLE}>
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <span className="text-xs text-gray-400 md:w-40 flex-shrink-0">
                  {formatDateTime(log.created_at)}
                </span>
                <span className="text-sm font-medium text-gray-700 md:w-36 flex-shrink-0">
                  {AUDIT_ENTITA[log.entita_tipo] || log.entita_tipo}
                </span>
                <StatusBadge stato={log.azione} labels={AUDIT_AZIONE} colors={AUDIT_AZIONE_COLORE} />
                <span className="text-sm text-gray-600 flex-1 min-w-0">
                  {log.utente?.cognome} {log.utente?.nome}
                  {log.campo_modificato && (
                    <span className="text-gray-400">
                      {' '}— {log.campo_modificato}
                      {log.valore_precedente && log.valore_nuovo
                        ? <span>: {log.valore_precedente} → {log.valore_nuovo}</span>
                        : log.valore_nuovo
                          ? <span>: {log.valore_nuovo}</span>
                          : log.valore_precedente
                            ? <span>: {log.valore_precedente}</span>
                            : null
                      }
                    </span>
                  )}
                </span>
              </div>
              {log.commento && <p className="text-xs text-gray-400 mt-1 ml-0 md:ml-40">{log.commento}</p>}
            </div>
          ))}

          {hasMore && (
            <div className="text-center pt-4">
              <Button variant="secondary" onClick={() => loadMore(filters)} loading={loading}>
                Carica altri
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
