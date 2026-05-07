import { PDF_COLORS, STATO_MATERIALE_LISTA } from './constants'
import { formatDate, formatDateRange } from './date-utils'

const TIPO_LABEL = {
  demo_kit: 'Kit',
  strumentario: 'Strumentario',
  montaggio: 'Montaggio',
  pezzo_sfuso: 'Sfuso',
  gadget: 'Gadget',
  ossa: 'Ossa',
}

function checkPageBreak(doc, neededHeight, currentY) {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (currentY + neededHeight > pageHeight - 20) {
    doc.addPage()
    return 20
  }
  return currentY
}

function addCoverPage(doc) {
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(PDF_COLORS.primary)
  doc.rect(0, 0, pageWidth, 40, 'F')

  doc.setFontSize(20)
  doc.setTextColor(PDF_COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.text('MIKAI', 14, 22)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('SPEDIZIONI MATERIALE — RIEPILOGO PER EVENTO', 14, 31)

  doc.setFontSize(10)
  doc.setTextColor(PDF_COLORS.subtle)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generato il ${formatDate(new Date())}`, 14, 50)

  return 60
}

function addEventHeader(doc, group, y) {
  const pageWidth = doc.internal.pageSize.getWidth()
  y = checkPageBreak(doc, 30, y)

  // Title
  doc.setFontSize(13)
  doc.setTextColor(PDF_COLORS.section)
  doc.setFont('helvetica', 'bold')
  doc.text(group.evento?.titolo || '—', 14, y, { maxWidth: pageWidth - 28 })

  // Underline
  doc.setDrawColor(PDF_COLORS.primary)
  doc.setLineWidth(0.4)
  doc.line(14, y + 1.5, pageWidth - 14, y + 1.5)
  y += 6

  // Meta lines
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(PDF_COLORS.text)

  const dateRange = formatDateRange(group.evento?.data_inizio, group.evento?.data_fine)
  doc.text(`Date evento: ${dateRange}`, 14, y); y += 5

  if (group.shippingDate) {
    doc.text(`Spedizione prevista: ${formatDate(group.shippingDate)}`, 14, y); y += 5
  }

  if (group.evento?.indirizzo_spedizione) {
    const lines = doc.splitTextToSize(`Indirizzo: ${group.evento.indirizzo_spedizione}`, pageWidth - 28)
    doc.text(lines, 14, y)
    y += lines.length * 5
  }

  return y + 2
}

function addMaterialsTable(doc, items, kitContents, y) {
  const head = ['Tipo', 'Codice', 'Materiale', 'Quantità', 'Stato']
  const body = []
  for (const it of items) {
    body.push([
      TIPO_LABEL[it.product?.tipo] || '—',
      it.product?.codice || it.materiale?.codice_inventario || '—',
      it.product?.nome || it.materiale?.nome || 'Materiale',
      String(it.quantita_approvata ?? it.quantita ?? 1),
      STATO_MATERIALE_LISTA[it.stato] || it.stato || '—',
    ])
    const pieces = kitContents?.[it.product_id]
    if (pieces?.length) {
      const lines = pieces
        .map(p => `   • ${p.piece_name}${p.piece_code ? ` [${p.piece_code}]` : ''}  ×${p.quantity}`)
        .join('\n')
      body.push([{
        content: `Distinta (${pieces.length} ${pieces.length === 1 ? 'pezzo' : 'pezzi'})\n${lines}`,
        colSpan: 5,
        styles: {
          fontSize: 7,
          textColor: PDF_COLORS.subtle,
          fillColor: PDF_COLORS.altRow,
          fontStyle: 'italic',
          cellPadding: { top: 1, right: 4, bottom: 2, left: 8 },
        },
      }])
    }
  }

  doc.autoTable({
    head: [head],
    body,
    startY: y,
    margin: { left: 14, right: 14 },
    headStyles: {
      fillColor: PDF_COLORS.headerBg,
      textColor: PDF_COLORS.text,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 1.8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: PDF_COLORS.text,
    },
    alternateRowStyles: { fillColor: PDF_COLORS.altRow },
    styles: {
      cellPadding: 1.8,
      lineWidth: 0.1,
      lineColor: PDF_COLORS.border,
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 28 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 26 },
    },
  })
  return doc.lastAutoTable.finalY + 8
}

function addTotalsSummary(doc, eventGroups, y) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const totalEvents = eventGroups.length
  const totalItems = eventGroups.reduce((sum, g) => sum + g.items.length, 0)

  y = checkPageBreak(doc, 20, y)
  doc.setFillColor(PDF_COLORS.headerBg)
  doc.rect(14, y, pageWidth - 28, 14, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(PDF_COLORS.section)
  doc.text(`Totali: ${totalEvents} eventi · ${totalItems} righe di materiale`, 18, y + 9)
  return y + 18
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

export async function generateShippingPDF(eventGroups, kitContents = {}) {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  let y = addCoverPage(doc)
  y = addTotalsSummary(doc, eventGroups, y)

  for (const group of eventGroups) {
    y = addEventHeader(doc, group, y)
    if (group.items.length === 0) {
      doc.setFontSize(9)
      doc.setTextColor(PDF_COLORS.muted)
      doc.text('Nessun materiale.', 14, y)
      y += 8
      continue
    }
    y = addMaterialsTable(doc, group.items, kitContents, y)
  }

  addFooter(doc)
  return doc
}
