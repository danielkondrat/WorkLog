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
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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

  const handleTogglePaid = useCallback(async (id: string, isPaid: boolean) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, is_paid: isPaid } : e))
    const supabase = createClient()
    const { error } = await supabase.from('entries').update({ is_paid: isPaid }).eq('id', id)
    if (error) {
      setEntries(prev => prev.map(e => e.id === id ? { ...e, is_paid: !isPaid } : e))
      toast.error('Failed to update payment status')
    }
  }, [])

  const handleMarkUpToHere = useCallback(async (targetEntry: EntryWithJob) => {
    // Mark all entries (across full list) on or before the target date as paid
    const toMark = entries.filter(e => e.date <= targetEntry.date && !e.is_paid)
    if (toMark.length === 0) {
      toast.info('All entries up to this date are already paid')
      return
    }
    const ids = toMark.map(e => e.id)
    setEntries(prev => prev.map(e => ids.includes(e.id) ? { ...e, is_paid: true } : e))
    const supabase = createClient()
    const { error } = await supabase.from('entries').update({ is_paid: true }).in('id', ids)
    if (error) {
      setEntries(prev => prev.map(e => ids.includes(e.id) ? { ...e, is_paid: false } : e))
      toast.error('Failed to mark entries as paid')
      return
    }
    toast.success(`${toMark.length} ${toMark.length === 1 ? 'entry' : 'entries'} marked as paid`)
  }, [entries])

  const handleMarkAllPaid = useCallback(async () => {
    const toMark = filtered.filter(e => !e.is_paid)
    if (toMark.length === 0) {
      toast.info('All visible entries are already paid')
      return
    }
    const ids = toMark.map(e => e.id)
    setEntries(prev => prev.map(e => ids.includes(e.id) ? { ...e, is_paid: true } : e))
    const supabase = createClient()
    const { error } = await supabase.from('entries').update({ is_paid: true }).in('id', ids)
    if (error) {
      setEntries(prev => prev.map(e => ids.includes(e.id) ? { ...e, is_paid: false } : e))
      toast.error('Failed to mark entries as paid')
      return
    }
    toast.success(`${toMark.length} ${toMark.length === 1 ? 'entry' : 'entries'} marked as paid`)
  }, [filtered])

  const enterMultiSelect = useCallback((id: string) => {
    setMultiSelectMode(true)
    setSelectedIds(new Set([id]))
  }, [])

  const exitMultiSelect = useCallback(() => {
    setMultiSelectMode(false)
    setSelectedIds(new Set())
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleBulkMarkPaid = useCallback(async () => {
    const ids = Array.from(selectedIds)
    const toMark = entries.filter(e => ids.includes(e.id) && !e.is_paid)
    if (toMark.length === 0) { exitMultiSelect(); return }
    const markIds = toMark.map(e => e.id)
    setEntries(prev => prev.map(e => markIds.includes(e.id) ? { ...e, is_paid: true } : e))
    exitMultiSelect()
    const supabase = createClient()
    const { error } = await supabase.from('entries').update({ is_paid: true }).in('id', markIds)
    if (error) {
      setEntries(prev => prev.map(e => markIds.includes(e.id) ? { ...e, is_paid: false } : e))
      toast.error('Failed to mark entries as paid')
    } else {
      toast.success(`${toMark.length} ${toMark.length === 1 ? 'entry' : 'entries'} marked as paid`)
    }
  }, [selectedIds, entries, exitMultiSelect])

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds)
    const toDelete = entries.filter(e => ids.includes(e.id))
    setEntries(prev => prev.filter(e => !ids.includes(e.id)))
    exitMultiSelect()

    let undone = false
    const timer = setTimeout(async () => {
      if (undone) return
      const supabase = createClient()
      await supabase.from('entries').delete().in('id', ids)
    }, 8000)

    toast(`${toDelete.length} ${toDelete.length === 1 ? 'entry' : 'entries'} deleted`, {
      duration: 8000,
      action: {
        label: 'Undo',
        onClick: () => {
          undone = true
          clearTimeout(timer)
          setEntries(prev => {
            const existing = new Set(prev.map(e => e.id))
            const restored = toDelete.filter(e => !existing.has(e.id))
            return [...prev, ...restored].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          })
        },
      },
    })
  }, [selectedIds, entries, exitMultiSelect])

  const allSelected = filtered.length > 0 && filtered.every(e => selectedIds.has(e.id))
  const toggleSelectAll = useCallback(() => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(e => e.id)))
  }, [allSelected, filtered])

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">History</h1>
        {filtered.length > 0 && !multiSelectMode && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleMarkAllPaid}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Mark all paid
            </button>
            <button
              onClick={() => setMultiSelectMode(true)}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Select
            </button>
          </div>
        )}
        {multiSelectMode && (
          <button
            onClick={exitMultiSelect}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Filter chips */}
      {!multiSelectMode && (
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
      )}

      {/* Multi-select all row */}
      {multiSelectMode && (
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 py-1"
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            allSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'
          }`}>
            {allSelected && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </div>
          {selectedIds.size > 0 ? `${selectedIds.size} of ${filtered.length} selected` : 'Select all'}
        </button>
      )}

      {/* Date range picker */}
      <AnimatePresence>
        {showDateFilter && !multiSelectMode && (
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
      {hasFilter && !multiSelectMode && (
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
                onTogglePaid={handleTogglePaid}
                onMarkUpToHere={handleMarkUpToHere}
                multiSelectMode={multiSelectMode}
                isSelected={selectedIds.has(entry.id)}
                onToggleSelect={toggleSelect}
                onEnterMultiSelect={enterMultiSelect}
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

      {/* Multi-select floating action bar */}
      <AnimatePresence>
        {multiSelectMode && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-56 z-40 px-4 pb-3 pt-1"
          >
            <div className="max-w-2xl mx-auto bg-gray-900 dark:bg-gray-800 rounded-2xl shadow-2xl p-3 flex items-center gap-2">
              <span className="text-sm text-gray-300 font-medium mr-auto pl-1">
                {selectedIds.size} selected
              </span>
              <button
                onClick={handleBulkMarkPaid}
                disabled={selectedIds.size === 0}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition-colors"
              >
                Mark paid
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={exitMultiSelect}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
