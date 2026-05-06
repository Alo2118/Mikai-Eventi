export const GROUP_MAIN = [
  { id: null, label: 'Tutti' },
  { id: 'tipo', label: 'Per ruolo' },
  { id: 'trasporto', label: 'Per trasporto' },
]

export const GROUP_MORE = [
  { id: 'tavolo', label: 'Per tavolo' },
  { id: 'zona', label: 'Per zona' },
]

export const ISCRIZIONE_CYCLE = {
  invitato: 'confermato',
  confermato: 'presente',
  presente: 'invitato',
  assente: 'invitato',
}

export const personKey = (p) => `${p.type}-${p.id}`

export function getPersonTavolo(person, tavoli) {
  for (const t of tavoli) {
    if (person.type === 'staff') {
      if ((t.formatori || []).some(f => f.staff?.user_id === person.id)) return t
    } else {
      if ((t.discenti || []).some(d => d.participant?.contact_id === person.id)) return t
    }
  }
  return null
}

export function sortLegs(legs) {
  return legs.sort((a, b) => {
    if (a.orario && b.orario) return a.orario < b.orario ? -1 : a.orario > b.orario ? 1 : 0
    if (a.orario) return -1
    if (b.orario) return 1
    return (a.ordine || 1) - (b.ordine || 1)
  })
}
