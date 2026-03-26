import { TIPO_EVENTO, MODALITA_EVENTO, STATO_EVENTO, STATO_ISCRIZIONE, STATO_MATERIALE_LISTA, STATO_PRENOTAZIONE, STATO_PREVENTIVO, RUOLO_EVENTO, TIPO_PARTECIPANTE, DIREZIONE_TRASPORTO, MEZZO_TRASPORTO, STATO_ATTIVITA, PDF_COLORS } from './constants'
import { formatDate, formatDateRange, formatTime, formatDayISO } from './date-utils'
import { formatCurrency } from './format-utils'

function personName(row) {
  if (row.user) return `${row.user.nome} ${row.user.cognome}`
  if (row.contact) return `${row.contact.nome} ${row.contact.cognome}`
  return ''
}

function addSectionTitle(doc, title, y) {
  const pageWidth = doc.internal.pageSize.getWidth()
  y = checkPageBreak(doc, 20, y)
  doc.setFontSize(14)
  doc.setTextColor(PDF_COLORS.section)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, y)
  doc.setDrawColor(PDF_COLORS.primary)
  doc.setLineWidth(0.5)
  doc.line(14, y + 2, pageWidth - 14, y + 2)
  doc.setTextColor(PDF_COLORS.text)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  return y + 8
}

function addKeyValue(doc, label, value, y) {
  y = checkPageBreak(doc, 8, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(`${label}:`, 14, y)
  doc.setFont('helvetica', 'normal')
  const labelWidth = doc.getTextWidth(`${label}: `)
  doc.text(String(value || '—'), 14 + labelWidth + 2, y)
  return y + 6
}

function checkPageBreak(doc, neededHeight, currentY) {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (currentY + neededHeight > pageHeight - 20) {
    doc.addPage()
    return 20
  }
  return currentY
}

function addAutoTable(doc, head, body, startY) {
  doc.autoTable({
    head: [head],
    body,
    startY,
    margin: { left: 14, right: 14 },
    headStyles: {
      fillColor: PDF_COLORS.headerBg,
      textColor: PDF_COLORS.text,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: PDF_COLORS.text,
    },
    alternateRowStyles: {
      fillColor: PDF_COLORS.altRow,
    },
    styles: {
      cellPadding: 3,
      lineWidth: 0.1,
      lineColor: PDF_COLORS.border,
    },
  })
  return doc.lastAutoTable.finalY + 8
}

function addFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages()
  const today = formatDate(new Date())
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()
    doc.setFontSize(8)
    doc.setTextColor(PDF_COLORS.muted)
    doc.setFont('helvetica', 'normal')
    const footerText = `Generato il ${today} — Eventi Mikai — Pagina ${i} di ${pageCount}`
    const textWidth = doc.getTextWidth(footerText)
    doc.text(footerText, (pageWidth - textWidth) / 2, pageHeight - 10)
  }
}

function addEmptyMessage(doc, message, y) {
  y = checkPageBreak(doc, 8, y)
  doc.setFontSize(10)
  doc.setTextColor(PDF_COLORS.muted)
  doc.text(message, 14, y)
  doc.setTextColor(PDF_COLORS.text)
  return y + 8
}

function addCoverPage(doc, event) {
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(PDF_COLORS.primary)
  doc.rect(0, 0, pageWidth, 60, 'F')

  doc.setFontSize(28)
  doc.setTextColor(PDF_COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.text('MIKAI', 14, 28)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('DOSSIER EVENTO', 14, 40)

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(PDF_COLORS.text)
  doc.text(event.titolo || '', 14, 78, { maxWidth: pageWidth - 28 })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(PDF_COLORS.subtle)
  const dateStr = formatDateRange(event.data_inizio, event.data_fine)
  doc.text(dateStr, 14, 90)
  if (event.luogo) {
    doc.text(event.luogo, 14, 97)
  }

  return 110
}

function addInfoSection(doc, event, y) {
  y = addSectionTitle(doc, 'Informazioni Generali', y)
  y = addKeyValue(doc, 'Tipo evento', TIPO_EVENTO[event.tipo_evento] || event.tipo_evento, y)
  y = addKeyValue(doc, 'Modalità', MODALITA_EVENTO[event.modalita] || event.modalita, y)
  y = addKeyValue(doc, 'Stato', STATO_EVENTO[event.stato] || event.stato, y)
  const promotoreName = event.promotore ? `${event.promotore.nome} ${event.promotore.cognome}` : '—'
  y = addKeyValue(doc, 'Promotore', promotoreName, y)
  const managerName = event.manager ? `${event.manager.nome} ${event.manager.cognome}` : '—'
  y = addKeyValue(doc, 'Area Manager', managerName, y)
  y = addKeyValue(doc, 'Luogo', event.luogo || '—', y)
  if (event.indirizzo_spedizione) {
    y = addKeyValue(doc, 'Indirizzo spedizione', event.indirizzo_spedizione, y)
  }
  if (event.budget_previsto) {
    y = addKeyValue(doc, 'Budget previsto', formatCurrency(event.budget_previsto), y)
  }
  if (event.certificato_previsto) {
    y = addKeyValue(doc, 'Certificato', 'Previsto', y)
  }
  if (event.note) {
    y = addKeyValue(doc, 'Note', event.note, y)
  }
  return y + 4
}

function addStaffSection(doc, staff, y) {
  y = addSectionTitle(doc, 'Staff', y)
  if (staff && staff.length > 0) {
    const head = ['Nome', 'Ruolo', 'Confermato']
    const body = staff.map(s => [
      s.user ? `${s.user.nome} ${s.user.cognome}` : '—',
      RUOLO_EVENTO[s.ruolo_evento] || s.ruolo_evento || '—',
      s.confermato ? 'Sì' : 'No',
    ])
    return addAutoTable(doc, head, body, y)
  }
  return addEmptyMessage(doc, 'Nessuno staff assegnato', y)
}

function addParticipantsSection(doc, participants, y) {
  y = addSectionTitle(doc, 'Partecipanti', y)
  if (participants && participants.length > 0) {
    const head = ['Nome', 'Tipo', 'Azienda', 'Stato']
    const body = participants.map(p => [
      p.contact ? `${p.contact.nome} ${p.contact.cognome}` : '—',
      TIPO_PARTECIPANTE[p.tipo] || p.tipo || '—',
      p.contact?.azienda || '—',
      STATO_ISCRIZIONE[p.stato_iscrizione] || p.stato_iscrizione || '—',
    ])
    return addAutoTable(doc, head, body, y)
  }
  return addEmptyMessage(doc, 'Nessun partecipante', y)
}

function addProgrammeSection(doc, subActivities, y) {
  if (!subActivities || subActivities.length === 0) return y
  y = addSectionTitle(doc, 'Programma', y)
  const head = ['Orario', 'Attivita', 'Fornitore', 'Confermato']
  const body = subActivities.map(sa => [
    sa.data_ora ? formatTime(sa.data_ora) : '—',
    sa.titolo || sa.tipo_ref?.nome || '—',
    sa.fornitore_ref ? `${sa.fornitore_ref.nome} ${sa.fornitore_ref.cognome}` : '—',
    sa.confermato ? 'Sì' : 'No',
  ])
  return addAutoTable(doc, head, body, y)
}

function addMaterialSection(doc, materials, event, y) {
  if (event.modalita === 'contributo' || !materials || materials.length === 0) return y
  y = addSectionTitle(doc, 'Materiale', y)
  const head = ['Prodotto', 'Brand', 'Quantità', 'Stato']
  const body = materials.map(m => [
    m.product?.nome || '—',
    m.product?.brand?.nome || '—',
    String(m.quantita_approvata || m.quantita || 1),
    STATO_MATERIALE_LISTA[m.stato] || m.stato || '—',
  ])
  return addAutoTable(doc, head, body, y)
}

function addSubtableHeader(doc, title, y) {
  y = checkPageBreak(doc, 10, y)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  return y + 4
}

function addLogisticsSection(doc, hotels, trasporti, event, y) {
  const hasHotels = hotels && hotels.length > 0
  const hasTrasporti = trasporti && trasporti.length > 0
  if (!hasHotels && !hasTrasporti) return y

  y = addSectionTitle(doc, 'Logistica', y)

  if (event.indirizzo_spedizione) {
    y = addKeyValue(doc, 'Indirizzo spedizione', event.indirizzo_spedizione, y)
    y += 2
  }

  if (hasHotels) {
    y = addSubtableHeader(doc, 'Hotel', y)
    const head = ['Persona', 'Hotel', 'Check-in', 'Check-out', 'Stato']
    const body = hotels.map(h => [
      personName(h),
      h.nome_hotel || '—',
      h.check_in ? formatDate(h.check_in) : '—',
      h.check_out ? formatDate(h.check_out) : '—',
      STATO_PRENOTAZIONE[h.stato] || h.stato || '—',
    ])
    y = addAutoTable(doc, head, body, y)
  }

  if (hasTrasporti) {
    y = addSubtableHeader(doc, 'Trasporti', y)
    const head = ['Persona', 'Direzione', 'Mezzo', 'Codice', 'Orario']
    const body = trasporti.map(t => [
      personName(t),
      DIREZIONE_TRASPORTO[t.direzione] || t.direzione || '—',
      MEZZO_TRASPORTO[t.mezzo] || t.mezzo || '—',
      t.codice || '—',
      t.orario || '—',
    ])
    y = addAutoTable(doc, head, body, y)
  }

  return y
}

function addCostsSection(doc, preventivi, permissions, y) {
  const canSeeCosts = permissions && (permissions.includes('gestione_costi') || permissions.includes('approva_preventivi'))
  if (!canSeeCosts || !preventivi || preventivi.length === 0) return y

  y = addSectionTitle(doc, 'Costi', y)
  const head = ['Fornitore', 'Descrizione', 'Importo', 'Stato']
  const body = preventivi.map(p => {
    const fornitore = p.fornitore_ref
      ? `${p.fornitore_ref.nome} ${p.fornitore_ref.cognome}`
      : p.fornitore_nome || '—'
    return [
      fornitore,
      p.descrizione || '—',
      p.importo ? formatCurrency(p.importo) : '—',
      STATO_PREVENTIVO[p.stato] || p.stato || '—',
    ]
  })

  const totale = preventivi.reduce((sum, p) => sum + (Number(p.importo) || 0), 0)
  body.push(['', 'TOTALE', formatCurrency(totale), ''])

  return addAutoTable(doc, head, body, y)
}

function addPreparationSection(doc, activities, y) {
  if (!activities || activities.length === 0) return y
  y = addSectionTitle(doc, 'Stato Preparazione', y)
  const head = ['Attivita', 'Stato', 'Scadenza', 'Responsabile']
  const body = activities.map(a => [
    a.nome || a.titolo || '—',
    STATO_ATTIVITA[a.stato] || a.stato || '—',
    a.deadline ? formatDate(a.deadline) : '—',
    a.assegnato ? `${a.assegnato.nome} ${a.assegnato.cognome}` : '—',
  ])
  return addAutoTable(doc, head, body, y)
}

export async function generateEventDossier({ event, staff, participants, subActivities, materials, hotels, trasporti, preventivi, activities, permissions }) {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  let y = addCoverPage(doc, event)
  y = addInfoSection(doc, event, y)
  y = addStaffSection(doc, staff, y)
  y = addParticipantsSection(doc, participants, y)
  y = addProgrammeSection(doc, subActivities, y)
  y = addMaterialSection(doc, materials, event, y)
  y = addLogisticsSection(doc, hotels, trasporti, event, y)
  y = addCostsSection(doc, preventivi, permissions, y)
  y = addPreparationSection(doc, activities, y)

  addFooter(doc)

  return doc
}
