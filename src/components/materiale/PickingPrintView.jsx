import { useEffect } from 'react'
import { POSIZIONE_MATERIALE, STATO_MATERIALE_LISTA } from '../../lib/constants'
import { formatDateRange } from '../../lib/date-utils'

const POSIZIONE_PRINT_ORDER = ['in_magazzino', 'magazzino_agente', 'in_transito', 'manutenzione', 'presso_evento']

function groupByPosizione(rows) {
  const groups = {}
  for (const r of rows) {
    const pos = r.product?.posizione_principale || 'in_magazzino'
    if (!groups[pos]) groups[pos] = []
    groups[pos].push(r)
  }
  return POSIZIONE_PRINT_ORDER
    .filter(p => groups[p]?.length > 0)
    .map(p => ({ posizione: p, label: POSIZIONE_MATERIALE[p] || p, rows: groups[p] }))
}

/**
 * Vista stampa picking — apri in una nuova finestra e chiama window.print()
 * Layout A4, font grande, checkbox per spuntare a penna, raggruppata per posizione
 */
export function PickingPrintView({ event, rows, onClose }) {
  useEffect(() => {
    // Auto-print all'apertura, dopo il render
    const timer = setTimeout(() => window.print(), 300)
    return () => clearTimeout(timer)
  }, [])

  // Filtra solo righe non rifiutate
  const validRows = (rows || []).filter(r => r.stato !== 'rifiutato')
  const groups = groupByPosizione(validRows)

  return (
    <div className="picking-print bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .picking-print { padding: 0 !important; }
        }
        .picking-print {
          font-family: -apple-system, system-ui, sans-serif;
          color: #111;
          padding: 24px;
          font-size: 14pt;
          line-height: 1.4;
        }
        .picking-print h1 { font-size: 20pt; margin: 0 0 4px 0; }
        .picking-print .subtitle { font-size: 11pt; color: #555; margin-bottom: 16px; }
        .picking-print h2 { font-size: 14pt; margin: 18px 0 6px 0; padding-bottom: 4px; border-bottom: 2px solid #333; }
        .picking-print table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        .picking-print th, .picking-print td { padding: 6px 8px; text-align: left; vertical-align: top; }
        .picking-print th { font-size: 11pt; color: #555; border-bottom: 1px solid #ddd; font-weight: 600; }
        .picking-print td { border-bottom: 1px solid #eee; font-size: 13pt; }
        .picking-print .check { width: 28px; }
        .picking-print .check-box { display: inline-block; width: 20px; height: 20px; border: 2px solid #333; border-radius: 3px; }
        .picking-print .qty { width: 60px; text-align: center; font-weight: 700; font-size: 14pt; }
        .picking-print .codice { color: #666; font-size: 10pt; }
        .picking-print .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 10pt; color: #777; }
        .picking-print .stato { display: inline-block; padding: 2px 6px; border: 1px solid #333; border-radius: 3px; font-size: 9pt; margin-left: 6px; }
      `}</style>

      <div className="no-print mb-4 flex gap-3 items-center px-2">
        <button onClick={() => window.print()} className="px-4 py-2 bg-mikai-400 text-white rounded-lg font-medium">Stampa</button>
        <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium">Chiudi</button>
        <span className="text-sm text-gray-500">Suggerimento: imposta margini stretti nella finestra di stampa.</span>
      </div>

      <h1>Lista picking — {event?.titolo}</h1>
      <div className="subtitle">
        {event?.data_inizio && formatDateRange(event.data_inizio, event.data_fine)}
        {event?.luogo && ` · ${event.luogo}`}
        {' · stampato il '}{new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>

      {groups.length === 0 ? (
        <p>Nessun materiale da preparare.</p>
      ) : (
        groups.map(g => (
          <div key={g.posizione}>
            <h2>{g.label} ({g.rows.length})</h2>
            <table>
              <thead>
                <tr>
                  <th className="check">✓</th>
                  <th className="qty">Q.tà</th>
                  <th>Prodotto</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map(r => (
                  <tr key={r.id}>
                    <td className="check"><span className="check-box" /></td>
                    <td className="qty">{r.quantita_approvata ?? r.quantita ?? 1}×</td>
                    <td>
                      <div><strong>{r.product?.nome || '-'}</strong></div>
                      {(r.product?.codice || r.product?.brand?.nome) && (
                        <div className="codice">
                          {r.product?.brand?.nome}
                          {r.product?.brand?.nome && r.product?.codice && ' · '}
                          {r.product?.codice}
                        </div>
                      )}
                      <span className="stato">{STATO_MATERIALE_LISTA[r.stato] || r.stato}</span>
                    </td>
                    <td>{r.note_commerciale || r.note_ufficio || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      <div className="footer">
        Totale: {validRows.length} righe · Sigla preparatore: __________ · Firma: __________
      </div>
    </div>
  )
}
