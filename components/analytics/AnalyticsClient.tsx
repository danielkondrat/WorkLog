'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Job, EntryWithJob } from '@/lib/types'
import { calcEarnings, formatHours, formatMoney, getWeekBounds, toLocalDateString } from '@/lib/utils'

type Period = 'day' | 'week' | 'month'
type Metric = 'hours' | 'earnings'

interface Props {
  entries: EntryWithJob[]
  jobs: Job[]
  currency: string
}

function getMonday(d: Date) {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  return mon
}

function weekLabel(d: Date): string {
  const mon = getMonday(d)
  return `${mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function AnalyticsClient({ entries, jobs, currency }: Props) {
  const [period, setPeriod] = useState<Period>('week')
  const [metric, setMetric] = useState<Metric>('hours')

  const chartData = useMemo(() => {
    const now = new Date()

    if (period === 'day') {
      const buckets: Record<string, number> = {}
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(now.getDate() - i)
        const key = toLocalDateString(d)
        buckets[key] = 0
      }
      for (const e of entries) {
        if (e.date in buckets) {
          const val = metric === 'hours' ? e.hours : (e.job ? calcEarnings(e.hours, e.job.rate, e.job.type) : 0)
          buckets[e.date] = (buckets[e.date] ?? 0) + val
        }
      }
      return Object.entries(buckets).map(([date, value]) => ({
        label: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: parseFloat(value.toFixed(2)),
      }))
    }

    if (period === 'week') {
      const buckets: Record<string, number> = {}
      const labels: Record<string, string> = {}
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(now.getDate() - i * 7)
        const mon = getMonday(d)
        const key = toLocalDateString(mon)
        buckets[key] = 0
        labels[key] = weekLabel(d)
      }
      for (const e of entries) {
        const eDate = new Date(e.date + 'T00:00:00')
        const mon = getMonday(eDate)
        const key = toLocalDateString(mon)
        if (key in buckets) {
          const val = metric === 'hours' ? e.hours : (e.job ? calcEarnings(e.hours, e.job.rate, e.job.type) : 0)
          buckets[key] = (buckets[key] ?? 0) + val
        }
      }
      return Object.entries(buckets).map(([key, value]) => ({
        label: labels[key],
        value: parseFloat(value.toFixed(2)),
      }))
    }

    // month
    const buckets: Record<string, number> = {}
    const labels: Record<string, string> = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      buckets[key] = 0
      labels[key] = monthLabel(d)
    }
    for (const e of entries) {
      const key = e.date.slice(0, 7)
      if (key in buckets) {
        const val = metric === 'hours' ? e.hours : (e.job ? calcEarnings(e.hours, e.job.rate, e.job.type) : 0)
        buckets[key] = (buckets[key] ?? 0) + val
      }
    }
    return Object.entries(buckets).map(([key, value]) => ({
      label: labels[key],
      value: parseFloat(value.toFixed(2)),
    }))
  }, [entries, period, metric])

  const jobSummary = useMemo(() => {
    const map: Record<string, { job: Job; hours: number; earnings: number }> = {}
    const now = new Date()

    for (const e of entries) {
      if (!e.job) continue
      const key = e.job_id
      const eDate = new Date(e.date + 'T00:00:00')
      let inPeriod = false

      if (period === 'day') {
        const d30 = new Date(now); d30.setDate(now.getDate() - 29); d30.setHours(0,0,0,0)
        inPeriod = eDate >= d30
      } else if (period === 'week') {
        const w12 = new Date(now); w12.setDate(now.getDate() - 83); w12.setHours(0,0,0,0)
        inPeriod = eDate >= w12
      } else {
        const m12 = new Date(now.getFullYear(), now.getMonth() - 11, 1)
        inPeriod = eDate >= m12
      }

      if (!inPeriod) continue
      if (!map[key]) map[key] = { job: e.job, hours: 0, earnings: 0 }
      map[key].hours += e.hours
      map[key].earnings += calcEarnings(e.hours, e.job.rate, e.job.type)
    }

    return Object.values(map).sort((a, b) => b.hours - a.hours)
  }, [entries, period])

  const isEmpty = entries.length === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>

      {isEmpty ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <p className="text-sm font-medium">No data yet</p>
          <p className="text-xs mt-1">Log some hours to see your analytics</p>
        </div>
      ) : (
        <>
          {/* Period switcher */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            {(['day', 'week', 'month'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                  period === p
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {p === 'day' ? 'Day' : p === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>

          {/* Metric toggle */}
          <div className="flex gap-2">
            {(['hours', 'earnings'] as Metric[]).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  metric === m
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {m === 'hours' ? 'Hours' : 'Earnings'}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-card rounded-2xl shadow-sm p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: 13,
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value) => {
                    const n = typeof value === 'number' ? value : 0
                    return metric === 'hours'
                      ? [`${formatHours(n)} hrs`, 'Hours']
                      : [formatMoney(n, currency), 'Earnings']
                  }}
                />
                <Bar dataKey="value" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Job breakdown */}
          {jobSummary.length > 0 && (
            <div className="bg-card rounded-2xl shadow-sm divide-y divide-gray-50 dark:divide-gray-800">
              {jobSummary.map(({ job, hours, earnings }) => (
                <div key={job.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: job.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{job.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatHours(hours)}h</p>
                    <p className="text-xs text-gray-400">{formatMoney(earnings, currency)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
