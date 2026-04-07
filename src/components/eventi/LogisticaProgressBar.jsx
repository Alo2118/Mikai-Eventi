import { ProgressIndicator } from '../ui/ProgressIndicator'

export function LogisticaProgressBar({ people, hotels, trasporti, tavoli, hasTavoli, getPersonTavolo }) {
  if (!people.length) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
      {hasTavoli && (
        <ProgressIndicator label="Tavoli" current={people.filter(p => getPersonTavolo(p, tavoli)).length} total={people.length} color="mikai" />
      )}
      <ProgressIndicator label="Hotel" current={hotels.length} total={people.length} color="blue" />
      <ProgressIndicator label="Andata" current={trasporti.filter(t => t.direzione === 'andata').length} total={people.length} />
      <ProgressIndicator label="Ritorno" current={trasporti.filter(t => t.direzione === 'ritorno').length} total={people.length} />
    </div>
  )
}
