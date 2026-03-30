import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useComplianceStore } from '../../hooks/useCompliance'
import { useAuthStore } from '../../hooks/useAuth'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToastStore } from '../../components/ui/Toast'
import { TIPO_TOV, STATO_TOV, STATO_TOV_COLORE, CARD_STYLE } from '../../lib/constants'
import { COMPLIANCE_ICONS } from '../../lib/icons'
import { formatDate, formatDateTime } from '../../lib/date-utils'
import { formatCurrencyDecimals } from '../../lib/format-utils'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { useState } from 'react'

function InfoRow({ label, children }) {
  return (
    <div className="flex flex-col md:flex-row md:items-start gap-1 md:gap-4 py-3 border-b border-gray-100">
      <dt className="text-sm font-medium text-gray-500 md:w-48 flex-shrink-0">{label}</dt>
      <dd className="text-base text-gray-900">{children || '—'}</dd>
    </div>
  )
}

export function TovDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const tovDetail = useComplianceStore(s => s.tovDetail)
  const tovLoading = useComplianceStore(s => s.tovLoading)
  const fetchTovDetail = useComplianceStore(s => s.fetchTovDetail)
  const verifyTov = useComplianceStore(s => s.verifyTov)
  const flagTov = useComplianceStore(s => s.flagTov)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const addToast = useToastStore(s => s.add)

  const [showVerify, setShowVerify] = useState(false)
  const [showFlag, setShowFlag] = useState(false)

  useEffect(() => { fetchTovDetail(id) }, [id])

  const handleVerify = async () => {
    const { error } = await verifyTov(id)
    setShowVerify(false)
    if (error) { addToast('Errore nella verifica', 'error'); return }
    addToast('Trasferimento verificato', 'success')
  }

  const handleFlag = async () => {
    const { error } = await flagTov(id)
    setShowFlag(false)
    if (error) { addToast('Errore nella segnalazione', 'error'); return }
    addToast('Trasferimento segnalato', 'success')
  }

  if (tovLoading || !tovDetail) return <div className="px-4 md:px-8 py-6"><LoadingSkeleton lines={6} /></div>

  const tov = tovDetail
  const canVerify = hasPermission('compliance') && tov.stato === 'registrato'

  return (
    <div className="px-4 md:px-8 py-6 space-y-6">
      <Breadcrumb items={[
        { label: 'Compliance', to: '/compliance' },
        { label: 'Trasferimenti', to: '/compliance/tov' },
        { label: formatCurrencyDecimals(tov.importo) },
      ]} />
      <MobileHeader title={`Trasferimento — ${TIPO_TOV[tov.tipo]}`} subtitle={`${tov.hcp?.contatto?.cognome || ''} ${tov.hcp?.contatto?.nome || ''}`} backTo="/compliance/tov" />
      <PageHeader
        title={`Trasferimento — ${TIPO_TOV[tov.tipo]}`}
        subtitle={`${tov.hcp?.contatto?.cognome || ''} ${tov.hcp?.contatto?.nome || ''}`}
        actions={
          canVerify ? (
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => setShowFlag(true)}>
                <Icon icon={COMPLIANCE_ICONS.segnalato} size={18} />
                <span className="ml-2">Segnala</span>
              </Button>
              <Button variant="primary" onClick={() => setShowVerify(true)}>
                <Icon icon={COMPLIANCE_ICONS.verificato} size={18} />
                <span className="ml-2">Verifica</span>
              </Button>
            </div>
          ) : null
        }
      />

      <div className={CARD_STYLE}>
        <dl>
          <InfoRow label="Stato">
            <StatusBadge stato={tov.stato} labels={STATO_TOV} colors={STATO_TOV_COLORE} />
          </InfoRow>
          <InfoRow label="Importo">
            <span className="text-lg font-bold">{formatCurrencyDecimals(tov.importo)}</span>
            {tov.valuta !== 'EUR' && <span className="ml-1 text-gray-500">({tov.valuta})</span>}
          </InfoRow>
          <InfoRow label="Tipo">{TIPO_TOV[tov.tipo]}</InfoRow>
          <InfoRow label="Data trasferimento">{formatDate(tov.data_trasferimento)}</InfoRow>
          <InfoRow label="Periodo">{tov.periodo_riferimento || '—'}</InfoRow>
          <InfoRow label="Professionista HCP">
            <button
              onClick={() => navigate(`/compliance/hcp/${tov.hcp?.id}`)}
              className="text-mikai-500 hover:underline"
            >
              {tov.hcp?.contatto?.cognome} {tov.hcp?.contatto?.nome}
            </button>
            {tov.hcp?.contatto?.azienda && (
              <span className="text-gray-500 ml-2">— {tov.hcp.contatto.azienda}</span>
            )}
          </InfoRow>
          {tov.evento && (
            <InfoRow label="Evento collegato">
              <button
                onClick={() => navigate(`/eventi/${tov.evento.id}`)}
                className="text-mikai-500 hover:underline"
              >
                {tov.evento.titolo}
              </button>
            </InfoRow>
          )}
          <InfoRow label="Descrizione">{tov.descrizione}</InfoRow>
          <InfoRow label="Giustificazione">{tov.giustificazione}</InfoRow>
          <InfoRow label="Registrato da">
            {tov.autore?.nome} {tov.autore?.cognome}
          </InfoRow>
          {tov.verified_by && (
            <InfoRow label="Verificato da">
              {tov.verificatore?.nome} {tov.verificatore?.cognome}
              {tov.verified_at && <span className="text-gray-500 ml-2">— {formatDateTime(tov.verified_at)}</span>}
            </InfoRow>
          )}
        </dl>
      </div>

      <ConfirmDialog
        open={showVerify}
        title="Verifica trasferimento"
        message="Confermi la verifica di questo trasferimento di valore?"
        confirmLabel="Verifica"
        onConfirm={handleVerify}
        onCancel={() => setShowVerify(false)}
      />
      <ConfirmDialog
        open={showFlag}
        title="Segnala trasferimento"
        message="Vuoi segnalare questo trasferimento come problematico?"
        confirmLabel="Segnala"
        onConfirm={handleFlag}
        onCancel={() => setShowFlag(false)}
        danger
      />
    </div>
  )
}
