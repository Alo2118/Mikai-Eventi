// Deduce Dott./Dott.ssa dal nome di battesimo (primo nome se composto).
// Regola italiana: -a femminile, -o/-e/-i maschile, con le eccezioni più comuni.
// Ritorna '' quando il nome non permette di capirlo (es. nomi stranieri non in elenco).

const MASCHILI = new Set([
  'andrea', 'luca', 'nicola', 'mattia', 'elia', 'enea', 'tobia', 'isaia', 'geremia', 'zaccaria',
  'battista', 'cosma', 'leonida', 'gian', 'gianluca', 'pierluca', 'gianandrea',
  'christian', 'cristian', 'igor', 'ivan', 'omar', 'samuel', 'daniel', 'manuel', 'kevin', 'joel',
  'oscar', 'victor', 'nathan', 'thomas', 'patrick', 'marc', 'yuri', 'michael', 'david', 'jonathan',
  'aaron', 'johnny', 'julien', 'ron', 'roger', 'jean', 'pierre', 'john', 'paul', 'mark', 'peter',
])

const FEMMINILI = new Set([
  'beatrice', 'adele', 'irene', 'agnese', 'alice', 'clarice', 'rachele', 'matilde',
  'selene', 'dafne', 'daphne', 'eloise', 'berenice', 'desiree', 'cloe', 'chloe', 'penelope', 'nicole', 'michelle', 'danielle',
  'noemi', 'giusi', 'ketty', 'betty', 'debby', 'jenny', 'cindy', 'mary', 'sally',
  'carmen', 'ester', 'esther', 'miriam', 'ruth', 'rachel', 'abigail', 'nicol', 'ines', 'doris', 'agnes',
  'karin', 'ingrid', 'jennifer', 'isabel', 'josephine', 'caroline', 'jacqueline', 'catherine', 'lilian', 'vivian', 'judith', 'consuelo', 'rocio',
])

function primoNome(nome) {
  return (nome || '')
    .trim()
    .split(/[\s-]+/)[0]
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function guessTitoloFromNome(nome) {
  const n = primoNome(nome)
  if (n.length < 2) return ''
  if (MASCHILI.has(n)) return 'dott'
  if (FEMMINILI.has(n)) return 'dott_ssa'
  if (n.endsWith('a')) return 'dott_ssa'
  if (/[oei]$/.test(n)) return 'dott'
  return ''
}
