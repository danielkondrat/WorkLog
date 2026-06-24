'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { EntryWithJob } from '@/lib/types'
import { calcEarnings, formatHours, formatMoney, toLocalDateString } from '@/lib/utils'

interface Props {
  entries: EntryWithJob[]
  jobs: unknown[]
  currency: string
}

const DOW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)
  while (days.length % 7 !== 0) days.push(null)
  return days
}

export default function AnalyticsClient({ entries, currency }: Props) {
  const today = new Date()
  const todayStr = toLocalDateString(today)
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const calDays = useMemo(() => buildCalendarDays(year, month), [year, month])

  const entriesByDate = useMemo(() => {
    const map: Record<string, EntryWithJob[]> = {}
    for (const e of entries) {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    }
    return map
  }, [entries])

  const selectedEntries = selectedDate ? (entriesByDate[selectedDate] ?? []) : []

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); setSelectedDate(null) }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); setSelectedDate(null) }
  function goToday() { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(null) }

  function handleDayClick(day: number) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (entriesByDate[ds]?.length) setSelectedDate(prev => prev === ds ? null : ds)
  }

  const selectedLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        {!isCurrentMonth && (
          <button
            onClick={goToday}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Today
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <p className="text-sm font-medium">No data yet</p>
          <p className="text-xs mt-1">Log some hours to see your calendar</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{monthLabel}</span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
            {DOW_LABELS.map((label, i) => (
              <div key={i} className="py-2 text-center text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calDays.map((day, i) => {
              if (day === null) {
                return (
                  <div
                    key={i}
                    className="min-h-[56px] border-b border-r border-gray-50 dark:border-gray-800/40 last:border-r-0"
                  />
                )
              }

              const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayEntries = entriesByDate[ds] ?? []
              const hasWork = dayEntries.length > 0
              const totalHours = dayEntries.reduce((s, e) => s + e.hours, 0)
              const isToday = ds === todayStr
              const isSelected = ds === selectedDate
              // Up to 3 unique job colors
              const jobColors = [...new Set(dayEntries.map(e => e.job?.color ?? '#6366F1'))].slice(0, 3)

              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  disabled={!hasWork}
                  className={`relative flex flex-col items-center pt-2 pb-2 gap-0.5 min-h-[56px] border-b border-r border-gray-50 dark:border-gray-800/40 transition-colors focus:outline-none ${
                    (i + 1) % 7 === 0 ? 'border-r-0' : ''
                  } ${
                    hasWork
                      ? 'cursor-pointer hover:bg-indigo-50/70 dark:hover:bg-indigo-950/20'
                      : 'cursor-default'
                  } ${
                    isSelected ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''
                  }`}
                >
                  {/* Day number */}
                  <span className={`w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full flex-shrink-0 ${
                    isToday
                      ? 'bg-indigo-600 text-white'
                      : hasWork
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}>
                    {day}
                  </span>

                  {/* Job color dots */}
                  {hasWork && (
                    <div className="flex gap-0.5 items-center">
                      {jobColors.map((color, ci) => (
                        <span key={ci} className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  )}

                  {/* Hours label */}
                  {hasWork && (
                    <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 leading-none">
                      {totalHours % 1 === 0 ? `${totalHours}h` : `${totalHours.toFixed(1)}h`}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-600 inline-flex items-center justify-center text-white text-[9px] font-bold">1</span>
              Today
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
              Worked — tap for details
            </span>
          </div>
        </div>
      )}

      {/* Day detail popup */}
      <AnimatePresence>
        {selectedDate && selectedEntries.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/25 z-40"
              onClick={() => setSelectedDate(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed inset-x-4 bottom-24 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[380px] z-50 bg-card rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Popup header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedLabel}</p>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {/* Entry list */}
              <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-72 overflow-y-auto">
                {selectedEntries.map(e => {
                  const earnings = e.job ? calcEarnings(e.hours, e.job.rate, e.job.type) : 0
                  return (
                    <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: e.job?.color ?? '#6366F1' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {e.job?.name ?? 'Unknown job'}
                            </p>
                            {e.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{e.description}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatHours(e.hours)}h</p>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400">{formatMoney(earnings, currency)}</p>
                          </div>
                        </div>
                        {e.is_paid && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Paid
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Total footer */}
              {selectedEntries.length > 1 && (
                <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between text-xs font-semibold text-gray-900 dark:text-white">
                  <span className="text-gray-500 dark:text-gray-400">Total</span>
                  <span>
                    {formatHours(selectedEntries.reduce((s, e) => s + e.hours, 0))}h
                    {' · '}
                    {formatMoney(
                      selectedEntries.reduce((s, e) => s + (e.job ? calcEarnings(e.hours, e.job.rate, e.job.type) : 0), 0),
                      currency
                    )}
                  </span>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
