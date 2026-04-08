import { ProgressIndicator } from '../ui/ProgressIndicator'

export function LogisticaProgressBar({ people, hotels, trasporti, tavoli, hasTavoli, getPersonTavolo }) {
  if (!people.length) return null

  // Count unique people with at least one leg per direction (not raw records)
  const andataCount = new Set(trasporti.filter(t => t.direzione === 'andata').map(t => t.user_id || t.contact_id)).size
  const ritornoCount = new Set(trasporti.filter(t => t.direzione === 'ritorno').map(t => t.user_id || t.contact_id)).size

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
      {hasTavoli && (
        <ProgressIndicator label="Tavoli" current={people.filter(p => getPersonTavolo(p, tavoli)).length} total={people.length} color="mikai" />
      )}
      <ProgressIndicator label="Hotel" current={hotels.length} total={people.length} color="blue" />
      <ProgressIndicator label="Andata" current={andataCount} total={people.length} />
      <ProgressIndicator label="Ritorno" current={ritornoCount} total={people.length} />
    </div>
  )
}
