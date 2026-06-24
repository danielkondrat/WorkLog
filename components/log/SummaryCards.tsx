'use client'

import { useEffect, useRef, useState } from 'react'
import { formatHours, formatMoney } from '@/lib/utils'

interface Stats {
  totalHours: number
  totalEarned: number
  paidEarned: number
  unpaidEarned: number
}

interface Props {
  stats: Stats
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

function Card({
  label, value, format, accent,
}: {
  label: string
  value: number
  format: (n: number) => string
  accent?: 'indigo' | 'emerald' | 'amber'
}) {
  const animated = useCountUp(value)

  const bg = accent === 'indigo'
    ? 'bg-indigo-600 dark:bg-indigo-600'
    : accent === 'emerald'
    ? 'bg-emerald-600 dark:bg-emerald-600'
    : accent === 'amber'
    ? 'bg-amber-500 dark:bg-amber-500'
    : 'bg-card'

  const labelColor = accent ? 'text-white/70' : 'text-muted-foreground'
  const valueColor = accent ? 'text-white' : 'text-foreground'

  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 shadow-sm ${bg}`}>
      {accent && (
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
      )}
      <p className={`text-xs font-medium mb-1 ${labelColor}`}>{label}</p>
      <p className={`text-xl font-bold tabular-nums ${valueColor}`}>{format(animated)}</p>
    </div>
  )
}

export default function SummaryCards({ stats, currency }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card
        label="Total earned"
        value={stats.totalEarned}
        format={n => formatMoney(n, currency)}
        accent="indigo"
      />
      <Card
        label="Total hours"
        value={stats.totalHours}
        format={n => `${formatHours(n)}h`}
      />
      <Card
        label="Paid"
        value={stats.paidEarned}
        format={n => formatMoney(n, currency)}
        accent="emerald"
      />
      <Card
        label="Outstanding"
        value={stats.unpaidEarned}
        format={n => formatMoney(n, currency)}
        accent="amber"
      />
    </div>
  )
}
