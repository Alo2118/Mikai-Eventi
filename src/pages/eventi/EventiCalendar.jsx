import { useState, useEffect } from 'react'
import { addMonths, subMonths, getMonth, getYear } from 'date-fns'
import { useEventsStore } from '../../hooks/useEvents'
import { CalendarGrid } from '../../components/eventi/CalendarGrid'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { formatMonth } from '../../lib/date-utils'
import { Link } from 'react-router-dom'

export function EventiCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const events = useEventsStore(s => s.events)
  const loading = useEventsStore(s => s.loading)
  const setFilter = useEventsStore(s => s.setFilter)

  useEffect(() => {
    setFilter('mese', { year: getYear(currentDate), month: getMonth(currentDate) + 1 })
  }, [currentDate])

  const monthLabel = formatMonth(currentDate)

  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[
          { label: 'Eventi', to: '/eventi' },
          { label: 'Calendario' },
        ]} />
      </div>
      <PageHeader title="Calendario eventi" />

      <div className="px-4 md:px-8">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => setCurrentDate(subMonths(currentDate, 1))} aria-label="Mese precedente">
            <Icon icon={ACTION_ICONS.chevron_left} size={20} />
          </Button>
          <h2 className="text-lg font-semibold text-gray-900 capitalize">{monthLabel}</h2>
          <Button variant="ghost" onClick={() => setCurrentDate(addMonths(currentDate, 1))} aria-label="Mese successivo">
            <Icon icon={ACTION_ICONS.chevron_right} size={20} />
          </Button>
        </div>

        {loading ? (
          <LoadingSkeleton lines={8} />
        ) : (
          <CalendarGrid date={currentDate} events={events} />
        )}

        <div className="mt-4 flex gap-3">
          <Link to="/eventi">
            <Button variant="secondary">Vista lista</Button>
          </Link>
          <Link to="/eventi/nuovo">
            <Button>+ Proponi nuovo evento</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
