import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useComplianceStore } from '../../hooks/useCompliance'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { ExportButton } from '../../components/ui/ExportButton'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToastStore } from '../../components/ui/Toast'
import { COMPLIANCE_ICONS } from '../../lib/icons'
import { TIPO_TOV, TIPO_TOV_COLORE, STATO_TOV, CHART_COLORS, COLOR_BG_50, COLOR_TEXT_600, SELECT_STYLE, CARD_STYLE, BADGE_BASE, COLOR_BADGE } from '../../lib/constants'
import { formatCurrencyDecimals, formatPercentage } from '../../lib/format-utils'
import { buildDisclosureReport } from '../../lib/export-utils'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function StatCard({ icon, label, value, color = 'mikai' }) {
  return (
    <div className={CARD_STYLE}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${COLOR_BG_50[color] || COLOR_BG_50.mikai} ${COLOR_TEXT_600[color] || COLOR_TEXT_600.mikai}`}>
          <Icon icon={icon} size={20} />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

export function ComplianceDashboard() {
  const navigate = useNavigate()
  const stats = useComplianceStore(s => s.stats)
  const statsLoading = useComplianceStore(s => s.statsLoading)
  const fetchDashboardStats = useComplianceStore(s => s.fetchDashboardStats)
  const fetchDisclosureRows = useComplianceStore(s => s.fetchDisclosureRows)
  const closePeriod = useComplianceStore(s => s.closePeriod)
  const addToast = useToastStore(s => s.add)
  const [periodo, setPeriodo] = useState('')
  const [exporting, setExporting] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => { fetchDashboardStats(periodo || undefined) }, [periodo])

  // "Chiudi periodo": marca i verificati del periodo come rendicontati.
  // Richiede un periodo specifico e almeno un trasferimento verificato da rendicontare.
  const daRendicontare = stats?.daRendicontare || 0
  const rendicontati = stats?.rendicontati || 0
  const canClose = !!periodo && daRendicontare > 0

  const handleClosePeriod = async () => {
    setConfirmClose(false)
    setClosing(true)
    const { data, error } = await closePeriod(periodo)
    setClosing(false)
    if (error) {
      addToast(error, 'error')
      return
    }
    const n = Array.isArray(data) ? data.length : 0
    addToast(
      n > 0
        ? `Periodo chiuso: ${n} ${n === 1 ? 'trasferimento segnato' : 'trasferimenti segnati'} come rendicontati.`
        : 'Nessun trasferimento da rendicontare in questo periodo.',
      n > 0 ? 'success' : 'warning',
    )
  }

  const handleExportDisclosure = async () => {
    setExporting(true)
    const { data, error } = await fetchDisclosureRows(periodo || undefined)
    if (error) {
      setExporting(false)
      addToast('Non siamo riusciti a preparare il report disclosure. Riprova.', 'error')
      return
    }
    if (!data || data.length === 0) {
      setExporting(false)
      addToast('Nessun trasferimento da esportare per il periodo selezionato.', 'warning')
      return
    }
    try {
      const res = await buildDisclosureReport(data, { periodo: periodo || undefined })
      addToast(`Report disclosure esportato (${res.nominativi} nominativi, ${res.aggregati} aggregati).`, 'success')
    } catch {
      addToast('Errore durante l\'esportazione del report. Riprova.', 'error')
    } finally {
      setExporting(false)
    }
  }

  const pieData = stats?.perTipo
    ? Object.entries(stats.perTipo).map(([tipo, importo]) => ({
        name: TIPO_TOV[tipo] || tipo,
        value: importo,
        color: CHART_COLORS[TIPO_TOV_COLORE[tipo]] || CHART_COLORS.gray,
      }))
    : []

  // Generate period options (current year + semesters)
  const year = new Date().getFullYear()
  const periodi = [
    { value: '', label: 'Tutti i periodi' },
    { value: `${year}`, label: `${year}` },
    { value: `${year}-S1`, label: `${year} — 1° semestre` },
    { value: `${year}-S2`, label: `${year} — 2° semestre` },
    { value: `${year - 1}`, label: `${year - 1}` },
  ]

  return (
    <div className="px-4 md:px-8 py-6 space-y-6">
      <Breadcrumb items={[{ label: 'Compliance' }]} />
      <PageHeader
        title="Compliance"
        subtitle="Sunshine Act — Trasferimenti di valore e interazioni HCP"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/compliance/hcp')} aria-label="Professionisti HCP">
              <Icon icon={COMPLIANCE_ICONS.hcp} size={18} />
              <span className="ml-2 hidden sm:inline">HCP</span>
            </Button>
            <Button variant="primary" onClick={() => navigate('/compliance/tov')} aria-label="Trasferimenti di valore">
              <Icon icon={COMPLIANCE_ICONS.tov} size={18} />
              <span className="ml-2 hidden sm:inline">Trasferimenti</span>
            </Button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <select
          value={periodo}
          onChange={e => setPeriodo(e.target.value)}
          className={SELECT_STYLE + ' sm:max-w-xs'}
        >
          {periodi.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <ExportButton
          onClick={handleExportDisclosure}
          loading={exporting}
          label="Esporta disclosure"
        />
        <Button
          variant="secondary"
          onClick={() => setConfirmClose(true)}
          loading={closing}
          disabled={!canClose}
          title={!canClose ? 'Seleziona un periodo specifico con almeno un trasferimento verificato da rendicontare.' : undefined}
          aria-label="Chiudi periodo"
        >
          <Icon icon={COMPLIANCE_ICONS.rendicontato} size={18} />
          <span className="ml-2">Chiudi periodo</span>
        </Button>
      </div>

      {periodo && (rendicontati > 0 || daRendicontare > 0) && (
        <div className="flex flex-wrap items-center gap-2 -mt-3">
          {daRendicontare > 0 && (
            <span className={BADGE_BASE + ' ' + COLOR_BADGE.green + ' inline-flex items-center gap-1'}>
              <Icon icon={COMPLIANCE_ICONS.verificato} size={13} />
              {daRendicontare} da rendicontare
            </span>
          )}
          {rendicontati > 0 && (
            <span className={BADGE_BASE + ' ' + COLOR_BADGE.mikai + ' inline-flex items-center gap-1'}>
              <Icon icon={COMPLIANCE_ICONS.rendicontato} size={13} />
              {rendicontati} {STATO_TOV.rendicontato.toLowerCase()}
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500 -mt-3">
        Il report distingue i professionisti con consenso privacy (foglio nominativo) da quelli senza consenso (foglio aggregato).
        {!canClose && (
          <> Per chiudere un periodo, selezionane uno specifico con almeno un trasferimento verificato da rendicontare.</>
        )}
      </p>

      <ConfirmDialog
        open={confirmClose}
        title="Chiudere il periodo?"
        message={`I ${daRendicontare} trasferimenti verificati del periodo selezionato verranno segnati come rendicontati (già pubblicati alla disclosure). L'operazione non blocca nuovi trasferimenti.`}
        confirmLabel="Chiudi periodo"
        cancelLabel="Annulla"
        onConfirm={handleClosePeriod}
        onCancel={() => setConfirmClose(false)}
      />

      {statsLoading ? (
        <LoadingSkeleton lines={4} />
      ) : !stats ? (
        <EmptyState title="Nessun dato" description="Non ci sono ancora trasferimenti di valore registrati." />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={COMPLIANCE_ICONS.tov}
              label="Totale trasferimenti"
              value={formatCurrencyDecimals(stats.totaleImporto)}
              color="mikai"
            />
            <StatCard
              icon={COMPLIANCE_ICONS.registrato}
              label="Da verificare"
              value={stats.daVerificare}
              color={stats.daVerificare > 0 ? 'yellow' : 'green'}
            />
            <StatCard
              icon={COMPLIANCE_ICONS.hcp}
              label="HCP coinvolti"
              value={`${stats.hcpCoinvolti} / ${stats.hcpTotali}`}
              color="mikai"
            />
            <StatCard
              icon={COMPLIANCE_ICONS.interazione}
              label="Trasferimenti registrati"
              value={stats.tovCount}
              color="green"
            />
          </div>

          {pieData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={CARD_STYLE}>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Importi per tipo</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${formatPercentage(percent * 100)}`}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => formatCurrencyDecimals(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className={CARD_STYLE}>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Distribuzione per tipo</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={pieData} layout="vertical">
                    <XAxis type="number" tickFormatter={v => `€${v}`} />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Tooltip formatter={v => formatCurrencyDecimals(v)} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
