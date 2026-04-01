import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useEventsStore } from '../../hooks/useEvents'
import { useActivitiesStore } from '../../hooks/useActivities'
import { CalendarGrid } from '../../components/eventi/CalendarGrid'
import { EventFilters } from '../../components/eventi/EventFilters'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { ACTION_ICONS, NAV_ICONS, MODALITA_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import {
  STATO_EVENTO, STATO_EVENTO_COLORE, TIPO_EVENTO,
  MODALITA_EVENTO_SHORT, MODALITA_COLORE,
  PILL_COLORS, SUMMARY_BAR_STYLE
} from '../../lib/constants'
import { formatMonth, addOneMonth, subtractOneMonth, getMonthIndex, getFullYear, todayISO } from '../../lib/date-utils'
import { getPromotoreName } from '../../lib/format-utils'

const MODALITA_BORDER_LEGEND = {
  mikai: 'bg-mikai-400',
  gray: 'bg-gray-400',
  yellow: 'bg-yellow-400',
}

export function EventiCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState(() => window.innerWidth < 768 ? 'agenda' : 'month')
  const [showLegend, setShowLegend] = useState(false)
  const [semaphores, setSemaphores] = useState({})
  const [indicators, setIndicators] = useState({})
  const events = useEventsStore(s => s.events)
  const loading = useEventsStore(s => s.loading)
  const filters = useEventsStore(s => s.filters)
  const setFilter = useEventsStore(s => s.setFilter)
  const fetchEventSemaphores = useActivitiesStore(s => s.fetchEventSemaphores)
  const fetchEventIndicators = useEventsStore(s => s.fetchEventIndicators)
  const touchStartX = useRef(null)

  // Set month filter for data fetching
  useEffect(() => {
    setFilter('mese', { year: getFullYear(currentDate), month: getMonthIndex(currentDate) + 1 })
    return () => setFilter('mese', null)
  }, [currentDate])

  // Fetch semaphores + indicators for events
  useEffect(() => {
    if (!events.length) { setSemaphores({}); setIndicators({}); return }
    const allIds = events.map(e => e.id)
    const activeIds = events
      .filter(e => ['confermato', 'in_preparazione', 'pronto', 'in_corso'].includes(e.stato))
      .map(e => e.id)
    if (activeIds.length) {
      fetchEventSemaphores(activeIds).then(result => {
        if (result && typeof result === 'object') setSemaphores(result)
      })
    } else {
      setSemaphores({})
    }
    fetchEventIndicators(allIds).then(result => {
      if (result && typeof result === 'object') setIndicators(result)
    })
  }, [events])

  // Client-side filtering (search + stato + tipo from EventFilters)
  const filteredEvents = useMemo(() => {
    let result = events
    if (filters.search) {
      const s = filters.search.toLowerCase()
      result = result.filter(e =>
        e.titolo?.toLowerCase().includes(s) ||
        e.luogo?.toLowerCase().includes(s) ||
        (getPromotoreName(e) || '').toLowerCase().includes(s)
      )
    }
    if (filters.tipo) {
      result = result.filter(e => e.tipo_evento === filters.tipo)
    }
    if (filters.stato) {
      result = result.filter(e => e.stato === filters.stato)
    }
    return result
  }, [events, filters.search, filters.tipo, filters.stato])

  // Stats
  const today = todayISO()
  const stats = useMemo(() => {
    const upcoming = filteredEvents.filter(e => e.data_inizio >= today && !['concluso', 'cancellato', 'rifiutato'].includes(e.stato))
    const proposti = filteredEvents.filter(e => e.stato === 'proposto')
    const overdue = filteredEvents.filter(e => semaphores[e.id] === 'red')
    const interni = filteredEvents.filter(e => e.modalita === 'interno')
    const esterni = filteredEvents.filter(e => e.modalita === 'esterno')
    return {
      total: filteredEvents.length,
      upcoming: upcoming.length,
      proposti: proposti.length,
      overdue: overdue.length,
      interni: interni.length,
      esterni: esterni.length,
      needsAttention: proposti.length + overdue.length,
    }
  }, [filteredEvents, today, semaphores])

  const monthLabel = formatMonth(currentDate)

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const isCurrentMonth = useMemo(() => {
    const now = new Date()
    return getFullYear(currentDate) === getFullYear(now) && getMonthIndex(currentDate) === getMonthIndex(now)
  }, [currentDate])

  // Swipe handling for mobile month navigation
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 60) {
      if (diff > 0) {
        setCurrentDate(prev => addOneMonth(prev))
      } else {
        setCurrentDate(prev => subtractOneMonth(prev))
      }
    }
    touchStartX.current = null
  }, [])

  return (
    <div>
      <div className="px-4 md:px-6 pt-4">
        <Breadcrumb items={[
          { label: 'Eventi', to: '/eventi' },
          { label: 'Calendario' },
        ]} />
      </div>

      <PageHeader
        title="Calendario"
        subtitle={`${stats.total} eventi · ${stats.interni} nostri · ${stats.esterni} esterni`}
        actions={
          <div className="flex gap-3 flex-wrap">
            <Link to="/eventi">
              <Button variant="secondary">
                <Icon icon={NAV_ICONS.eventi} size={18} className="mr-1" />
                <span className="hidden sm:inline">Lista</span>
              </Button>
            </Link>
            <Link to="/eventi/nuovo">
              <Button>
                <Icon icon={ACTION_ICONS.add} size={18} className="mr-1" />
                <span className="hidden sm:inline">Nuovo</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Attention summary bar */}
      {!loading && stats.needsAttention > 0 && (
        <div className="px-4 md:px-6 pb-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            <div className="flex items-center gap-1.5 text-yellow-700">
              <Icon icon={FEEDBACK_ICONS.warning} size={16} />
              <span className="font-semibold">Richiede attenzione</span>
            </div>
            {stats.proposti > 0 && (
              <button
                onClick={() => setFilter('stato', filters.stato === 'proposto' ? '' : 'proposto')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg min-h-[36px] transition-colors ${
                  filters.stato === 'proposto' ? 'bg-yellow-200 ring-1 ring-yellow-400' : 'hover:bg-yellow-100'
                }`}
              >
                <span className="font-bold text-yellow-800">{stats.proposti}</span>
                <span className="text-yellow-700">da approvare</span>
              </button>
            )}
            {stats.overdue > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <span className="font-bold">{stats.overdue}</span>
                <span>in ritardo</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <EventFilters />

      <div className="px-4 md:px-6">
        {/* Month navigation + view toggle */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <Button variant="ghost" onClick={() => setCurrentDate(subtractOneMonth(currentDate))} aria-label="Mese precedente">
            <Icon icon={ACTION_ICONS.chevron_left} size={20} />
          </Button>

          <div className="flex items-center gap-2 flex-1 justify-center">
            <button
              onClick={goToToday}
              className="text-lg font-semibold text-gray-900 capitalize hover:text-mikai-600 transition-colors"
              aria-label="Torna al mese corrente"
              title="Torna a oggi"
            >
              {monthLabel}
            </button>
            {!isCurrentMonth && (
              <button
                onClick={goToToday}
                className="text-xs font-medium text-mikai-600 bg-mikai-50 px-2 py-1 rounded-lg hover:bg-mikai-100 transition-colors min-h-[32px]"
              >
                Oggi
              </button>
            )}
          </div>

          <Button variant="ghost" onClick={() => setCurrentDate(addOneMonth(currentDate))} aria-label="Mese successivo">
            <Icon icon={ACTION_ICONS.chevron_right} size={20} />
          </Button>
        </div>

        {/* View mode toggle + legend */}
        <div className="flex gap-2 mb-4">
          {[
            { id: 'month', label: 'Mese', mobileLabel: 'Griglia' },
            { id: 'agenda', label: 'Agenda', mobileLabel: 'Lista' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setViewMode(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[40px] transition-colors ${
                viewMode === opt.id
                  ? 'bg-mikai-400 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="md:hidden">{opt.mobileLabel}</span>
              <span className="hidden md:inline">{opt.label}</span>
            </button>
          ))}

          <button
            onClick={() => setShowLegend(!showLegend)}
            className={`ml-auto px-3 py-1.5 rounded-lg text-sm font-medium min-h-[40px] transition-colors ${
              showLegend ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            aria-label="Mostra legenda colori"
          >
            Legenda
          </button>
        </div>

        {/* Color + modalita legend */}
        {showLegend && (
          <div className={SUMMARY_BAR_STYLE + ' mb-4 space-y-3'}>
            {/* Status colors */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Colore sfondo = Stato evento</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {Object.entries(STATO_EVENTO).map(([key, label]) => {
                  const color = STATO_EVENTO_COLORE[key]
                  const pillClass = PILL_COLORS[color] || PILL_COLORS.gray
                  return (
                    <div key={key} className="flex items-center gap-1.5 text-xs">
                      <span className={`inline-block w-3 h-3 rounded ${pillClass.split(' ')[0]}`} />
                      <span className="text-gray-700">{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Modalita border */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Bordo sinistro = Tipo partecipazione</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {Object.entries(MODALITA_EVENTO_SHORT).map(([key, label]) => {
                  const color = MODALITA_COLORE[key]
                  const borderBg = MODALITA_BORDER_LEGEND[color] || MODALITA_BORDER_LEGEND.gray
                  const ModalitaIcon = MODALITA_ICONS[key]
                  return (
                    <div key={key} className="flex items-center gap-1.5 text-xs">
                      <span className={`inline-block w-1 h-4 rounded-full ${borderBg}`} />
                      {ModalitaIcon && <Icon icon={ModalitaIcon} size={12} className="text-gray-500" />}
                      <span className="text-gray-700">{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Attention indicators */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Segnali di attenzione</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-gray-700">Da approvare</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-gray-700">Attività in ritardo</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar grid / agenda with swipe support */}
        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {loading ? (
            <LoadingSkeleton lines={8} />
          ) : (
            <CalendarGrid
              date={currentDate}
              events={filteredEvents}
              viewMode={viewMode}
              semaphores={semaphores}
              indicators={indicators}
            />
          )}
        </div>
      </div>
    </div>
  )
}
