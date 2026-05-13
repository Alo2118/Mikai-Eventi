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
  doc.rect(0, 0, pageWidth, 8, 'F')

  doc.setFontSize(9)
  doc.setTextColor(PDF_COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.text(`MIKAI · SPEDIZIONI MATERIALE · Generato il ${formatDate(new Date())}`, 14, 5.5)

  return 13
}

function addEventHeader(doc, group, y) {
  const pageWidth = doc.internal.pageSize.getWidth()
  y = checkPageBreak(doc, 14, y)

  const dateRange = formatDateRange(group.evento?.data_inizio, group.evento?.data_fine)
  const shipPart = group.shippingDate ? ` · Sped. ${formatDate(group.shippingDate)}` : ''
  const titoloLine = `${group.evento?.titolo || '—'}  —  ${dateRange}${shipPart}`

  doc.setFontSize(10)
  doc.setTextColor(PDF_COLORS.section)
  doc.setFont('helvetica', 'bold')
  doc.text(titoloLine, 14, y, { maxWidth: pageWidth - 28 })

  doc.setDrawColor(PDF_COLORS.primary)
  doc.setLineWidth(0.3)
  doc.line(14, y + 1.2, pageWidth - 14, y + 1.2)
  y += 4

  if (group.evento?.indirizzo_spedizione) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(PDF_COLORS.text)
    const lines = doc.splitTextToSize(`Indirizzo: ${group.evento.indirizzo_spedizione}`, pageWidth - 28)
    doc.text(lines, 14, y)
    y += lines.length * 3.5
  }

  return y + 1
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
      body.push([{
        content: `Distinta (${pieces.length} ${pieces.length === 1 ? 'pezzo' : 'pezzi'})`,
        colSpan: 5,
        styles: {
          fontSize: 7,
          textColor: PDF_COLORS.subtle,
          fillColor: PDF_COLORS.altRow,
          fontStyle: 'italic',
          cellPadding: { top: 1, right: 4, bottom: 1, left: 8 },
        },
      }])
      const pieceCellStyle = {
        fontSize: 7,
        textColor: PDF_COLORS.subtle,
        fillColor: PDF_COLORS.altRow,
        fontStyle: 'italic',
        cellPadding: { top: 1, right: 4, bottom: 1, left: 4 },
      }
      for (const p of pieces) {
        body.push([
          { content: '', styles: pieceCellStyle },
          { content: p.piece_code || '—', styles: pieceCellStyle },
          { content: `   • ${p.piece_name}`, styles: pieceCellStyle },
          { content: `×${p.quantity}`, styles: { ...pieceCellStyle, halign: 'center' } },
          { content: '', styles: pieceCellStyle },
        ])
      }
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
  const totalEvents = eventGroups.length
  const totalItems = eventGroups.reduce((sum, g) => sum + g.items.length, 0)

  y = checkPageBreak(doc, 6, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(PDF_COLORS.section)
  doc.text(`Totali: ${totalEvents} eventi · ${totalItems} righe di materiale`, 14, y + 3)
  return y + 6
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
  if (eventGroups.length > 1) {
    y = addTotalsSummary(doc, eventGroups, y)
  }

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
