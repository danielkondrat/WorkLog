'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Job, EntryWithJob } from '@/lib/types'
import { isInRange } from '@/lib/utils'
import EntryCard from '@/components/log/EntryCard'
import NewEntryModal from '@/components/log/NewEntryModal'
import { Button } from '@/components/ui/button'

interface Props {
  initialEntries: EntryWithJob[]
  jobs: Job[]
  currency: string
}

export default function HistoryClient({ initialEntries, jobs, currency }: Props) {
  const [entries, setEntries] = useState(initialEntries)
  const [selectedJobs, setSelectedJobs] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [editingEntry, setEditingEntry] = useState<EntryWithJob | null>(null)
  const [showModal, setShowModal] = useState(false)

  const hasFilter = selectedJobs.length > 0 || dateFrom || dateTo

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (selectedJobs.length > 0 && !selectedJobs.includes(e.job_id)) return false
      if (dateFrom) {
        const from = new Date(dateFrom + 'T00:00:00')
        const to = dateTo ? new Date(dateTo + 'T23:59:59') : new Date()
        if (!isInRange(e.date, from, to)) return false
      }
      return true
    })
  }, [entries, selectedJobs, dateFrom, dateTo])

  const handleDelete = useCallback((id: string) => {
    const entry = entries.find(e => e.id === id)
    if (!entry) return
    setEntries(prev => prev.filter(e => e.id !== id))

    let undone = false
    const timer = setTimeout(async () => {
      if (undone) return
      const supabase = createClient()
      await supabase.from('entries').delete().eq('id', id)
    }, 8000)

    toast('Entry deleted', {
      duration: 8000,
      action: {
        label: 'Undo',
        onClick: () => {
          undone = true
          clearTimeout(timer)
          setEntries(prev => {
            const exists = prev.find(e => e.id === id)
            if (exists) return prev
            return [entry, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          })
        },
      },
    })
  }, [entries])

  function toggleJob(id: string) {
    setSelectedJobs(prev => prev.includes(id) ? prev.filter(j => j !== id) : [...prev, id])
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">History</h1>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        <button
          onClick={() => setShowDateFilter(!showDateFilter)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
            dateFrom || dateTo
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Date range
        </button>

        {jobs.map(job => (
          <button
            key={job.id}
            onClick={() => toggleJob(job.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedJobs.includes(job.id)
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedJobs.includes(job.id) ? 'white' : job.color }} />
            {job.name}
          </button>
        ))}

        {hasFilter && (
          <button
            onClick={() => { setSelectedJobs([]); setDateFrom(''); setDateTo('') }}
            className="flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium text-red-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Date range picker */}
      <AnimatePresence>
        {showDateFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card rounded-2xl shadow-sm p-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Count */}
      {hasFilter && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {filtered.length} of {entries.length} entries
        </p>
      )}

      {/* Entry list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-sm font-medium">{hasFilter ? 'No entries match your filters' : 'No entries yet'}</p>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedJobs([]); setDateFrom(''); setDateTo('') }}
              className="mt-2 text-indigo-600"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {filtered.map((entry, i) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                currency={currency}
                index={i}
                onDelete={handleDelete}
                onEdit={e => { setEditingEntry(e); setShowModal(true) }}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      <NewEntryModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingEntry(null) }}
        jobs={jobs.filter(j => !j.is_archived)}
        currency={currency}
        editingEntry={editingEntry}
        onEntryAdded={(e) => setEntries(prev => [e, ...prev])}
        onEntryUpdated={(e) => setEntries(prev => prev.map(x => x.id === e.id ? e : x))}
      />
    </motion.div>
  )
}
