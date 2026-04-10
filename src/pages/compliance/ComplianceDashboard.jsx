import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useComplianceStore } from '../../hooks/useCompliance'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { COMPLIANCE_ICONS } from '../../lib/icons'
import { TIPO_TOV, TIPO_TOV_COLORE, CHART_COLORS, COLOR_BG_50, COLOR_TEXT_600, SELECT_STYLE, CARD_STYLE } from '../../lib/constants'
import { formatCurrencyDecimals, formatPercentage } from '../../lib/format-utils'
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
  const [periodo, setPeriodo] = useState('')

  useEffect(() => { fetchDashboardStats(periodo || undefined) }, [periodo])

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

      <div className="flex items-center gap-3">
        <select
          value={periodo}
          onChange={e => setPeriodo(e.target.value)}
          className={SELECT_STYLE + ' max-w-xs'}
        >
          {periodi.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

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
