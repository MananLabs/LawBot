import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { cn } from '@/lib/utils'
import type { ComplianceCalendarEvent, CompliancePriority } from '@/types'

// =====================================================================
// PRIORITY COLORS
// =====================================================================
const priorityDotColors: Record<CompliancePriority, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
}

// =====================================================================
// MOCK EVENTS
// =====================================================================
const generateMockEvents = (): ComplianceCalendarEvent[] => {
  const now = new Date()
  return [
    {
      id: '1',
      title: 'GST Return Filing (GSTR-1)',
      framework: 'gst',
      due_date: new Date(now.getFullYear(), now.getMonth(), 11).toISOString(),
      priority: 'critical',
      status: 'needs_review',
      description: 'Monthly GST return for outward supplies',
      recurring: true,
      frequency: 'monthly',
    },
    {
      id: '2',
      title: 'TDS Payment',
      framework: 'income_tax',
      due_date: new Date(now.getFullYear(), now.getMonth(), 7).toISOString(),
      priority: 'high',
      status: 'compliant',
      description: 'Deposit TDS deducted in previous month',
      recurring: true,
      frequency: 'monthly',
    },
    {
      id: '3',
      title: 'Board Meeting',
      framework: 'companies_act_2013',
      due_date: new Date(now.getFullYear(), now.getMonth(), 22).toISOString(),
      priority: 'medium',
      status: 'needs_review',
      description: 'Quarterly board meeting per Companies Act',
      recurring: true,
      frequency: 'quarterly',
    },
    {
      id: '4',
      title: 'EPF Contribution',
      framework: 'labour_laws',
      due_date: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(),
      priority: 'high',
      status: 'needs_review',
      description: 'Monthly EPF remittance',
      recurring: true,
      frequency: 'monthly',
    },
    {
      id: '5',
      title: 'MCA Annual Return',
      framework: 'companies_act_2013',
      due_date: new Date(now.getFullYear(), now.getMonth(), 28).toISOString(),
      priority: 'critical',
      status: 'non_compliant',
      description: 'Annual return to ROC',
      recurring: true,
      frequency: 'annual',
    },
  ]
}

// =====================================================================
// COMPLIANCE CALENDAR
// =====================================================================
interface ComplianceCalendarProps {
  events?: ComplianceCalendarEvent[]
  className?: string
}

export default function ComplianceCalendar({
  events = generateMockEvents(),
  className,
}: ComplianceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.due_date), day))

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : []

  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className={cn('space-y-4', className)}>
      {/* Calendar */}
      <div className="rounded-2xl bg-white/3 border border-white/8 overflow-hidden">
        {/* Month Navigation */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.button>

          <h3 className="text-sm font-semibold text-white/80">
            {format(currentDate, 'MMMM yyyy')}
          </h3>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </motion.button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-white/5">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2 text-center text-[10px] font-semibold text-white/25 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayEvents = getEventsForDay(day)
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isCurrentDay = isToday(day)

            return (
              <motion.button
                key={i}
                whileHover={{ scale: 0.95 }}
                onClick={() => setSelectedDate(isSameDay(day, selectedDate ?? new Date(0)) ? null : day)}
                className={cn(
                  'relative p-2 min-h-[60px] flex flex-col items-center border-b border-r border-white/3 transition-colors',
                  isCurrentMonth ? '' : 'opacity-25',
                  isSelected ? 'bg-blue-500/12' : 'hover:bg-white/3',
                  i % 7 === 6 && 'border-r-0',
                )}
              >
                {/* Day number */}
                <span
                  className={cn(
                    'h-6 w-6 flex items-center justify-center rounded-full text-xs font-medium',
                    isCurrentDay
                      ? 'bg-blue-500 text-white font-bold'
                      : isSelected
                        ? 'text-blue-400 font-semibold'
                        : 'text-white/60',
                  )}
                >
                  {format(day, 'd')}
                </span>

                {/* Event dots */}
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={cn('h-1.5 w-1.5 rounded-full', priorityDotColors[event.priority])}
                        title={event.title}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] text-white/30">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-5 py-3 border-t border-white/5">
          {Object.entries(priorityDotColors).map(([priority, color]) => (
            <div key={priority} className="flex items-center gap-1.5">
              <div className={cn('h-2 w-2 rounded-full', color)} />
              <span className="text-[10px] text-white/30 capitalize">{priority}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Day Events */}
      <AnimatePresence>
        {selectedDate && selectedEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-2xl bg-white/3 border border-white/8 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
              <Calendar className="h-4 w-4 text-blue-400" />
              <h4 className="text-sm font-semibold text-white/80">
                {format(selectedDate, 'EEEE, dd MMMM yyyy')}
              </h4>
              <span className="ml-auto text-xs text-white/30">
                {selectedEvents.length} event{selectedEvents.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {selectedEvents.map((event) => (
                <div key={event.id} className="px-5 py-3 flex items-start gap-3">
                  <div
                    className={cn('h-2 w-2 rounded-full mt-1.5 shrink-0', priorityDotColors[event.priority])}
                  />
                  <div>
                    <p className="text-sm font-medium text-white/80">{event.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{event.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-white/25 bg-white/4 px-1.5 py-0.5 rounded">
                        {event.framework.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-[10px] text-white/25 capitalize">{event.frequency}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
