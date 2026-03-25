import { KpiCard } from './KpiCard'
import { ProgressIndicator } from '../ui/ProgressIndicator'

export function ConfermaPartecipantiKpi({ confermati, totale }) {
  const pct = totale > 0 ? Math.round((confermati / totale) * 100) : 0
  const color = pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'

  return (
    <KpiCard
      title="Conferma partecipanti"
      value={`${pct}%`}
      valueColor={color}
      subtitle={totale > 0 ? `${confermati}/${totale} confermati` : 'Nessun partecipante'}
    >
      {totale > 0 && (
        <ProgressIndicator
          label="Confermati"
          current={confermati}
          total={totale}
        />
      )}
    </KpiCard>
  )
}
