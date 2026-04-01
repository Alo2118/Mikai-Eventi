import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useComplianceStore } from '../../hooks/useCompliance'
import { useAuthStore } from '../../hooks/useAuth'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { Tabs } from '../../components/ui/Tabs'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useToastStore } from '../../components/ui/Toast'
import { TIPO_HCP, TIPO_TOV, STATO_TOV, STATO_TOV_COLORE, TIPO_INTERAZIONE_HCP, CARD_STYLE, CARD_HOVER_STYLE, SUMMARY_BAR_STYLE } from '../../lib/constants'
import { COMPLIANCE_ICONS, ACTION_ICONS } from '../../lib/icons'
import { formatDate, formatDateTime } from '../../lib/date-utils'
import { formatCurrencyDecimals } from '../../lib/format-utils'
import { MobileHeader } from '../../components/layout/MobileHeader'

function InfoRow({ label, children }) {
  return (
    <div className="flex flex-col md:flex-row md:items-start gap-1 md:gap-4 py-3 border-b border-gray-100">
      <dt className="text-sm font-medium text-gray-500 md:w-48 flex-shrink-0">{label}</dt>
      <dd className="text-base text-gray-900">{children || '—'}</dd>
    </div>
  )
}

export function HcpDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const hcpDetail = useComplianceStore(s => s.hcpDetail)
  const hcpLoading = useComplianceStore(s => s.hcpLoading)
  const fetchHcpDetail = useComplianceStore(s => s.fetchHcpDetail)
  const tovList = useComplianceStore(s => s.tovList)
  const tovLoading = useComplianceStore(s => s.tovLoading)
  const fetchTovList = useComplianceStore(s => s.fetchTovList)
  const interazioni = useComplianceStore(s => s.interazioni)
  const interazioniLoading = useComplianceStore(s => s.interazioniLoading)
  const fetchInterazioni = useComplianceStore(s => s.fetchInterazioni)

  const [tab, setTab] = useState('info')

  useEffect(() => { fetchHcpDetail(id) }, [id])
  useEffect(() => {
    if (tab === 'tov') fetchTovList({ hcp_id: id })
    if (tab === 'interazioni') fetchInterazioni({ hcp_id: id })
  }, [tab, id])

  if (hcpLoading || !hcpDetail) return <div className="px-4 md:px-8 py-6"><LoadingSkeleton lines={6} /></div>

  const hcp = hcpDetail
  const c = hcp.contatto

  const tabs = [
    { id: 'info', label: 'Profilo' },
    { id: 'tov', label: 'Trasferimenti' },
    { id: 'interazioni', label: 'Interazioni' },
  ]

  const totaleToV = tovList.reduce((sum, t) => sum + Number(t.importo), 0)

  return (
    <div className="px-4 md:px-8 py-6 space-y-6">
      <Breadcrumb items={[
        { label: 'Compliance', to: '/compliance' },
        { label: 'HCP', to: '/compliance/hcp' },
        { label: `${c?.cognome || ''} ${c?.nome || ''}` },
      ]} />
      <MobileHeader title={`${c?.cognome || ''} ${c?.nome || ''}`} subtitle="Profilo HCP" backTo="/compliance/hcp" />
      <PageHeader
        title={`${c?.cognome || ''} ${c?.nome || ''}`}
        subtitle={`${TIPO_HCP[hcp.categoria]} — ${c?.azienda || hcp.struttura_appartenenza || ''}`}
        actions={
          <Button variant="primary" onClick={() => navigate(`/compliance/tov/nuovo?hcp_id=${id}`)}>
            <Icon icon={ACTION_ICONS.add} size={18} />
            <span className="ml-2">Registra trasferimento</span>
          </Button>
        }
      />

      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {tab === 'info' && (
        <div className={CARD_STYLE + ' p-6'}>
          <dl>
            <InfoRow label="Nome completo">{c?.cognome} {c?.nome}</InfoRow>
            <InfoRow label="Categoria">{TIPO_HCP[hcp.categoria]}</InfoRow>
            <InfoRow label="Specializzazione">{hcp.specializzazione || c?.specializzazione}</InfoRow>
            <InfoRow label="Struttura">{c?.azienda || hcp.struttura_appartenenza}</InfoRow>
            <InfoRow label="Email">{c?.email}</InfoRow>
            <InfoRow label="Telefono">{c?.telefono}</InfoRow>
            <InfoRow label="Ordine provinciale">{hcp.ordine_provinciale}</InfoRow>
            <InfoRow label="Codice fiscale">{hcp.codice_fiscale}</InfoRow>
            <InfoRow label="Consenso privacy">
              {hcp.consenso_privacy
                ? <span className="text-green-600">Acquisito {hcp.data_consenso && `— ${formatDate(hcp.data_consenso)}`}</span>
                : <span className="text-red-500">Non acquisito</span>
              }
            </InfoRow>
            {hcp.note && <InfoRow label="Note">{hcp.note}</InfoRow>}
          </dl>
        </div>
      )}

      {tab === 'tov' && (
        <div className="space-y-4">
          {totaleToV > 0 && (
            <div className={SUMMARY_BAR_STYLE + ' flex items-center justify-between'}>
              <span className="text-sm font-medium text-mikai-700">Totale trasferimenti</span>
              <span className="text-lg font-bold text-mikai-700">{formatCurrencyDecimals(totaleToV)}</span>
            </div>
          )}
          {tovLoading ? (
            <LoadingSkeleton lines={4} />
          ) : tovList.length === 0 ? (
            <EmptyState title="Nessun trasferimento" description="Nessun trasferimento di valore registrato per questo HCP." />
          ) : (
            <div className="space-y-3">
              {tovList.map(tov => (
                <div
                  key={tov.id}
                  onClick={() => navigate(`/compliance/tov/${tov.id}`)}
                  className={CARD_HOVER_STYLE + ' cursor-pointer'}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{TIPO_TOV[tov.tipo]}</span>
                        <StatusBadge stato={tov.stato} labels={STATO_TOV} colors={STATO_TOV_COLORE} />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{formatDate(tov.data_trasferimento)} — {tov.descrizione}</p>
                    </div>
                    <span className="text-lg font-bold text-gray-900 flex-shrink-0">
                      {formatCurrencyDecimals(tov.importo)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'interazioni' && (
        <div>
          {interazioniLoading ? (
            <LoadingSkeleton lines={4} />
          ) : interazioni.length === 0 ? (
            <EmptyState title="Nessuna interazione" description="Nessuna interazione registrata per questo HCP." />
          ) : (
            <div className="space-y-3">
              {interazioni.map(int => (
                <div key={int.id} className={CARD_STYLE}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon icon={COMPLIANCE_ICONS.interazione} size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-900">{TIPO_INTERAZIONE_HCP[int.tipo]}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{formatDate(int.data_interazione)}</p>
                      {int.note && <p className="text-sm text-gray-600 mt-2">{int.note}</p>}
                      {int.materiale_presentato && (
                        <p className="text-xs text-gray-400 mt-1">Materiale: {int.materiale_presentato}</p>
                      )}
                    </div>
                    <span className="text-sm text-gray-400 flex-shrink-0">
                      {int.utente?.nome} {int.utente?.cognome}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
