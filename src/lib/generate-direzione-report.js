import { STATO_EVENTO, TIPO_EVENTO, PDF_COLORS } from './constants'
import { formatCurrency, formatPercentage } from './format-utils'
import {
  addSectionTitle, addKeyValue, addAutoTable, addFooter, addEmptyMessage,
} from './generate-dossier'

function addCoverHeader(doc, periodoLabel) {
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.setFillColor(PDF_COLORS.primary)
  doc.rect(0, 0, pageWidth, 46, 'F')
  doc.setFontSize(24)
  doc.setTextColor(PDF_COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.text('MIKAI', 14, 22)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('REPORT DIREZIONALE', 14, 34)
  doc.setFontSize(10)
  doc.setTextColor(PDF_COLORS.subtle)
  doc.text(`Periodo: ${periodoLabel}`, 14, 56)
  doc.setTextColor(PDF_COLORS.text)
  return 66
}

function addSintesiSection(doc, { costMetrics, confermaRate, attivitaInRitardo, materialeFuori }, y) {
  y = addSectionTitle(doc, 'Sintesi', y)
  y = addKeyValue(doc, 'Eventi nel periodo', costMetrics.eventiCount, y)
  y = addKeyValue(doc, 'Partecipanti totali', costMetrics.partecipantiTotale, y)
  const confPct = confermaRate.totale > 0
    ? Math.round((confermaRate.confermati / confermaRate.totale) * 100) : 0
  y = addKeyValue(doc, 'Partecipanti confermati', `${confermaRate.confermati} / ${confermaRate.totale} (${formatPercentage(confPct)})`, y)
  y = addKeyValue(doc, 'Attività obbligatorie in ritardo', attivitaInRitardo.count, y)
  y = addKeyValue(doc, 'Materiale fuori magazzino', materialeFuori.count, y)
  return y + 2
}

function addCostiSection(doc, costMetrics, y) {
  y = addSectionTitle(doc, 'Costi', y)
  const base = costMetrics.baseCosto === 'consuntivo' ? 'consuntivo' : 'budget previsto'
  y = addKeyValue(doc, 'Budget previsto totale', formatCurrency(costMetrics.budgetTotale), y)
  y = addKeyValue(doc, 'Consuntivo effettivo totale', formatCurrency(costMetrics.effettivoTotale), y)
  y = addKeyValue(doc, 'Costo medio per evento', `${formatCurrency(costMetrics.costoMedioEvento)} (base: ${base})`, y)
  y = addKeyValue(doc, 'Costo per partecipante', formatCurrency(costMetrics.costoPerPartecipante), y)
  return y + 2
}

function formatDelta(value, pct) {
  const seg = value > 0 ? '+' : ''
  return `${seg}${value} (${seg}${pct}%)`
}

function addConfrontoSection(doc, yoy, y) {
  if (!yoy) return y
  y = addSectionTitle(doc, 'Confronto anno precedente', y)
  const head = ['Indicatore', 'Periodo attuale', 'Anno precedente', 'Variazione']
  const body = [
    ['Eventi', String(yoy.eventiCorrente), String(yoy.eventiPrecedente), formatDelta(yoy.deltaEventi, yoy.deltaEventiPct)],
    ['Budget previsto', formatCurrency(yoy.budgetCorrente), formatCurrency(yoy.budgetPrecedente), formatDelta(yoy.deltaBudget, yoy.deltaBudgetPct)],
  ]
  return addAutoTable(doc, head, body, y)
}

function addCountsSection(doc, title, dataObj, labels, y) {
  y = addSectionTitle(doc, title, y)
  const entries = Object.entries(dataObj || {}).filter(([, n]) => n > 0)
  if (entries.length === 0) return addEmptyMessage(doc, 'Nessun dato nel periodo', y)
  const body = entries.map(([k, n]) => [labels[k] || k, String(n)])
  return addAutoTable(doc, ['Voce', 'Eventi'], body, y)
}

function addBudgetMeseSection(doc, budgetBreakdown, y) {
  y = addSectionTitle(doc, 'Budget per mese', y)
  if (!budgetBreakdown || budgetBreakdown.length === 0) return addEmptyMessage(doc, 'Nessun dato nel periodo', y)
  const head = ['Mese', 'Previsto', 'Approvato', 'Effettivo']
  const body = budgetBreakdown.map(b => [
    b.meseLabel, formatCurrency(b.previsto), formatCurrency(b.approvato), formatCurrency(b.effettivo),
  ])
  return addAutoTable(doc, head, body, y)
}

function addPerZonaSection(doc, perZona, y) {
  y = addSectionTitle(doc, 'Performance per zona', y)
  if (!perZona || perZona.length === 0) return addEmptyMessage(doc, 'Nessun dato nel periodo', y)
  const head = ['Zona', 'Eventi', 'Budget', 'Effettivo']
  const body = perZona.map(z => [z.zona, String(z.eventi), formatCurrency(z.budget), formatCurrency(z.effettivo)])
  return addAutoTable(doc, head, body, y)
}

function addPerPromotoreSection(doc, perPromotore, y) {
  y = addSectionTitle(doc, 'Performance per promotore', y)
  if (!perPromotore || perPromotore.length === 0) return addEmptyMessage(doc, 'Nessun dato nel periodo', y)
  const head = ['Promotore', 'Eventi', 'Budget', 'Effettivo']
  const body = perPromotore.map(p => [p.promotore, String(p.eventi), formatCurrency(p.budget), formatCurrency(p.effettivo)])
  return addAutoTable(doc, head, body, y)
}

export async function generateDirezioneReport({
  periodoLabel, eventiPerStato, eventiPerTipo, budgetBreakdown,
  confermaRate, attivitaInRitardo, materialeFuori,
  costMetrics, perZona, perPromotore, confrontoYoY,
}) {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = addCoverHeader(doc, periodoLabel)
  y = addSintesiSection(doc, { costMetrics, confermaRate, attivitaInRitardo, materialeFuori }, y)
  y = addCostiSection(doc, costMetrics, y)
  y = addConfrontoSection(doc, confrontoYoY, y)
  y = addCountsSection(doc, 'Eventi per stato', eventiPerStato, STATO_EVENTO, y)
  y = addCountsSection(doc, 'Eventi per tipo', eventiPerTipo, TIPO_EVENTO, y)
  y = addBudgetMeseSection(doc, budgetBreakdown, y)
  y = addPerZonaSection(doc, perZona, y)
  addPerPromotoreSection(doc, perPromotore, y)
  addFooter(doc)
  return doc
}
