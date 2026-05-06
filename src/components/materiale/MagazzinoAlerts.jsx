import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useCatalogStore } from '../../hooks/useCatalog'
import { Icon } from '../ui/Icon'
import { BADGE_BASE, COLOR_BADGE } from '../../lib/constants'
import { ACTION_ICONS, MAGAZZINO_ICONS, FEEDBACK_ICONS, NAV_ICONS } from '../../lib/icons'

const SEVERITY_DOT = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  gray: 'bg-gray-300',
  green: 'bg-green-500',
}

const SEVERITY_RANK = { red: 3, yellow: 2, gray: 1, green: 0 }

function CategoryHeader({ icon, title, count, severity, expanded, onToggle }) {
  const badgeColor = COLOR_BADGE[severity === 'gray' ? 'gray' : severity] || COLOR_BADGE.gray
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg min-h-[48px] text-left"
    >
      <Icon icon={icon} size={16} className="text-gray-500" />
      <span className="font-medium text-gray-900 flex-1">{title}</span>
      <span className={`${BADGE_BASE} ${badgeColor}`}>{count}</span>
      <Icon icon={expanded ? ACTION_ICONS.chevronUp : ACTION_ICONS.chevronDown} size={16} className="text-gray-400" />
    </button>
  )
}

function AlertItem({ severity, primary, secondary, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-2 py-2 px-3 hover:bg-mikai-50 rounded-lg text-left min-h-[48px]"
    >
      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${SEVERITY_DOT[severity] || SEVERITY_DOT.gray}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 truncate">{primary}</div>
        {secondary && <div className="text-xs text-gray-500 truncate">{secondary}</div>}
      </div>
      <Icon icon={ACTION_ICONS.forward} size={14} className="text-gray-300 mt-1.5" />
    </button>
  )
}

export function MagazzinoAlerts() {
  const navigate = useNavigate()
  const fetchPreparazioniImminenti = useMaterialsStore(s => s.fetchPreparazioniImminenti)
  const fetchEventsPendingReturn = useMaterialsStore(s => s.fetchEventsPendingReturn)
  const fetchMaterialsByAgent = useMaterialsStore(s => s.fetchMaterialsByAgent)
  const stockProducts = useCatalogStore(s => s.stockProducts)
  const fetchStockProducts = useCatalogStore(s => s.fetchStockProducts)

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preparazioni, setPreparazioni] = useState([])
  const [rientri, setRientri] = useState([])
  const [agenti, setAgenti] = useState([])
  const [expanded, setExpanded] = useState({ rientri: true, prep: true, kit: true, soglia: true })
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const closeBtnRef = useRef(null)

  const reload = async () => {
    setLoading(true)
    const [pRes, rRes, aRes] = await Promise.all([
      fetchPreparazioniImminenti(7),
      fetchEventsPendingReturn(),
      fetchMaterialsByAgent(),
    ])
    setPreparazioni(pRes.data || [])
    setRientri(rRes.data || [])
    setAgenti(aRes.data || [])
    if ((stockProducts || []).length === 0) await fetchStockProducts()
    setLoading(false)
  }

  useEffect(() => {
    if (open) reload()
  }, [open])

  // Initial load for badge count (lightweight, no UI)
  useEffect(() => {
    reload()
  }, [])

  // Focus management + ESC key + focus trap
  useEffect(() => {
    if (!open) return
    // Salva l'elemento attivo prima di aprire
    const previouslyFocused = document.activeElement
    // Focus sul bottone chiudi all'apertura
    setTimeout(() => closeBtnRef.current?.focus(), 50)

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        return
      }
      if (e.key !== 'Tab') return
      // Focus trap: ciclare tra elementi focusable nel pannello
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea'
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Ridai focus al trigger al close
      if (previouslyFocused?.focus) previouslyFocused.focus()
    }
  }, [open])

  const sottoSoglia = useMemo(
    () => stockProducts.filter(p => p.soglia_minima != null && p.quantita_disponibile <= p.soglia_minima),
    [stockProducts]
  )

  const prepUrgenti = useMemo(
    () => preparazioni.filter(p => p.giorni_mancanti <= 2),
    [preparazioni]
  )

  const rientriUrgenti = useMemo(
    () => rientri.filter(r => (r.giorni_da_conclusione || 0) >= 5),
    [rientri]
  )

  const kitFuoriTroppo = useMemo(
    () => agenti.filter(a => (a.giorni_max || 0) >= 60),
    [agenti]
  )

  const totalCritical = rientriUrgenti.length + prepUrgenti.length + kitFuoriTroppo.length
  const totalWarning = (rientri.length - rientriUrgenti.length) + (preparazioni.length - prepUrgenti.length) + (kitFuoriTroppo.length === 0 ? agenti.filter(a => (a.giorni_max || 0) >= 30).length : agenti.filter(a => (a.giorni_max || 0) >= 30 && (a.giorni_max || 0) < 60).length) + sottoSoglia.length

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  const goAndClose = (path) => {
    setOpen(false)
    navigate(path)
  }

  const buttonSeverity = totalCritical > 0 ? 'red' : totalWarning > 0 ? 'yellow' : 'gray'
  const totalAll = totalCritical + totalWarning

  return (
    <>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 min-h-[48px] text-sm font-medium"
        aria-label="Apri pannello allerte magazzino"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Icon icon={FEEDBACK_ICONS.warning} size={18} className={
          buttonSeverity === 'red' ? 'text-red-500' : buttonSeverity === 'yellow' ? 'text-yellow-500' : 'text-gray-400'
        } />
        <span className="hidden md:inline">Allerte</span>
        {totalAll > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full text-xs font-bold flex items-center justify-center px-1.5 ring-2 ring-white ${
            buttonSeverity === 'red' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-yellow-900'
          }`}>
            {totalAll}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sliding panel */}
      <aside
        ref={panelRef}
        className={`fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 shadow-xl transform transition-transform duration-200 ease-out flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-panel-title"
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 id="alert-panel-title" className="font-semibold text-lg text-gray-900">Allerte magazzino</h2>
          <button
            ref={closeBtnRef}
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-600 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg"
            aria-label="Chiudi pannello"
          >
            <Icon icon={ACTION_ICONS.close} size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2">
          {loading && totalAll === 0 ? (
            <div role="status" aria-live="polite" className="text-center py-8 text-gray-500">Caricamento...</div>
          ) : totalAll === 0 ? (
            <div className="text-center py-12 px-4">
              <Icon icon={FEEDBACK_ICONS.success} size={36} className="text-green-500 mx-auto mb-3" />
              <p className="text-base font-medium text-gray-700">Tutto in ordine</p>
              <p className="text-sm text-gray-500 mt-1">Nessuna allerta sul magazzino in questo momento.</p>
            </div>
          ) : (
            <>
              {/* Rientri scaduti */}
              <div className="space-y-1">
                <CategoryHeader
                  icon={MAGAZZINO_ICONS.rientro}
                  title="Rientri da registrare"
                  count={rientri.length}
                  severity={rientriUrgenti.length > 0 ? 'red' : rientri.length > 0 ? 'yellow' : 'gray'}
                  expanded={expanded.rientri}
                  onToggle={() => toggle('rientri')}
                />
                {expanded.rientri && rientri.map(r => (
                  <AlertItem
                    key={r.evento.id}
                    severity={(r.giorni_da_conclusione || 0) >= 10 ? 'red' : (r.giorni_da_conclusione || 0) >= 5 ? 'yellow' : 'gray'}
                    primary={r.evento.titolo}
                    secondary={`${r.count} pezzi · ${r.giorni_da_conclusione != null ? `concluso ${r.giorni_da_conclusione} ${r.giorni_da_conclusione === 1 ? 'giorno' : 'giorni'} fa` : 'concluso'}`}
                    onClick={() => goAndClose(`/eventi/${r.evento.id}?tab=materiale`)}
                  />
                ))}
              </div>

              {/* Preparazioni imminenti */}
              <div className="space-y-1">
                <CategoryHeader
                  icon={MAGAZZINO_ICONS.imminente}
                  title="Da preparare urgenti"
                  count={preparazioni.length}
                  severity={prepUrgenti.length > 0 ? 'red' : preparazioni.length > 0 ? 'yellow' : 'gray'}
                  expanded={expanded.prep}
                  onToggle={() => toggle('prep')}
                />
                {expanded.prep && preparazioni.map(ev => (
                  <AlertItem
                    key={ev.id}
                    severity={ev.giorni_mancanti <= 0 ? 'red' : ev.giorni_mancanti <= 2 ? 'yellow' : 'gray'}
                    primary={ev.titolo}
                    secondary={`${ev.giorni_mancanti === 0 ? 'oggi' : ev.giorni_mancanti < 0 ? 'in ritardo' : `tra ${ev.giorni_mancanti} ${ev.giorni_mancanti === 1 ? 'giorno' : 'giorni'}`} · ${ev.da_preparare.length} pezzi`}
                    onClick={() => goAndClose(`/eventi/${ev.id}?tab=materiale`)}
                  />
                ))}
              </div>

              {/* Kit presso agenti */}
              <div className="space-y-1">
                <CategoryHeader
                  icon={NAV_ICONS.profilo}
                  title="Kit fuori da troppo tempo"
                  count={agenti.filter(a => (a.giorni_max || 0) >= 30).length}
                  severity={kitFuoriTroppo.length > 0 ? 'red' : agenti.some(a => (a.giorni_max || 0) >= 30) ? 'yellow' : 'gray'}
                  expanded={expanded.kit}
                  onToggle={() => toggle('kit')}
                />
                {expanded.kit && agenti.filter(a => (a.giorni_max || 0) >= 30).map(a => (
                  <AlertItem
                    key={a.agente?.id}
                    severity={(a.giorni_max || 0) >= 60 ? 'red' : 'yellow'}
                    primary={`${a.agente?.cognome} ${a.agente?.nome}`}
                    secondary={`${a.kit_count} kit · max ${a.giorni_max} ${a.giorni_max === 1 ? 'giorno' : 'giorni'}`}
                    onClick={() => goAndClose(`/materiale/agenti?id=${a.agente?.id}`)}
                  />
                ))}
              </div>

              {/* Sotto soglia */}
              <div className="space-y-1">
                <CategoryHeader
                  icon={FEEDBACK_ICONS.warning}
                  title="Prodotti sotto soglia"
                  count={sottoSoglia.length}
                  severity={sottoSoglia.length > 0 ? 'yellow' : 'gray'}
                  expanded={expanded.soglia}
                  onToggle={() => toggle('soglia')}
                />
                {expanded.soglia && sottoSoglia.slice(0, 8).map(p => (
                  <AlertItem
                    key={p.id}
                    severity="yellow"
                    primary={p.nome}
                    secondary={`${p.quantita_disponibile ?? 0} disponibili · soglia ${p.soglia_minima}${p.brand?.nome ? ` · ${p.brand.nome}` : ''}`}
                    onClick={() => goAndClose(`/materiale?tab=stock`)}
                  />
                ))}
                {expanded.soglia && sottoSoglia.length > 8 && (
                  <div className="px-3 py-1 text-xs text-gray-400">
                    +{sottoSoglia.length - 8} altri prodotti...
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <footer className="px-4 py-3 border-t border-gray-200">
          <button
            onClick={() => goAndClose('/materiale')}
            className="w-full px-4 py-2.5 rounded-lg bg-mikai-400 hover:bg-mikai-500 text-white font-medium min-h-[48px] text-center"
          >
            Vai a Magazzino oggi
          </button>
        </footer>
      </aside>
    </>
  )
}
