'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import type { EntryWithJob, Job } from '@/lib/types'
import { getWeekBounds, getMonthBounds, isInRange, calcEarnings, formatHours, formatMoney } from '@/lib/utils'

interface Props {
  entries: EntryWithJob[]
  jobs: Job[]
  currency: string
}

function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}

function Card({ label, value, isMoney, currency, accent }: { label: string; value: number; isMoney: boolean; currency: string; accent?: boolean }) {
  const animated = useCountUp(value)
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 shadow-sm ${
      accent
        ? 'bg-indigo-600 dark:bg-indigo-600'
        : 'bg-card'
    }`}>
      {accent && (
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
      )}
      <p className={`text-xs font-medium mb-1 ${accent ? 'text-indigo-200' : 'text-muted-foreground'}`}>
        {label}
      </p>
      <p className={`text-xl font-bold tabular-nums ${accent ? 'text-white' : 'text-foreground'}`}>
        {isMoney ? formatMoney(animated, currency) : formatHours(animated)}
        {!isMoney && <span className={`text-sm font-medium ml-1 ${accent ? 'text-indigo-200' : 'text-muted-foreground'}`}>hrs</span>}
      </p>
    </div>
  )
}

export default function SummaryCards({ entries, currency }: Props) {
  const now = new Date()
  const week = useMemo(() => getWeekBounds(now), [])
  const month = useMemo(() => getMonthBounds(now), [])

  const stats = useMemo(() => {
    let weekHrs = 0, weekEarnings = 0, monthHrs = 0, monthEarnings = 0
    for (const e of entries) {
      if (!e.job) continue
      if (isInRange(e.date, week.start, week.end)) {
        weekHrs += e.hours
        weekEarnings += calcEarnings(e.hours, e.job.rate, e.job.type)
      }
      if (isInRange(e.date, month.start, month.end)) {
        monthHrs += e.hours
        monthEarnings += calcEarnings(e.hours, e.job.rate, e.job.type)
      }
    }
    return { weekHrs, weekEarnings, monthHrs, monthEarnings }
  }, [entries, week, month])

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card label="This week" value={stats.weekHrs} isMoney={false} currency={currency} />
      <Card label="This week" value={stats.weekEarnings} isMoney={true} currency={currency} accent />
      <Card label="This month" value={stats.monthHrs} isMoney={false} currency={currency} />
      <Card label="This month" value={stats.monthEarnings} isMoney={true} currency={currency} accent />
    </div>
  )
}
