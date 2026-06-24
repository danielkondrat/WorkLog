'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Job, EntryWithJob, Profile } from '@/lib/types'
import SummaryCards from './SummaryCards'
import EntryCard from './EntryCard'
import NewEntryModal from './NewEntryModal'
import { Button } from '@/components/ui/button'

interface Stats {
  totalHours: number
  totalEarned: number
  paidEarned: number
  unpaidEarned: number
}

interface Props {
  initialJobs: Job[]
  initialEntries: EntryWithJob[]
  profile: Profile | null
  stats: Stats
}

export default function LogClient({ initialJobs, initialEntries, profile, stats: initialStats }: Props) {
  const [jobs] = useState(initialJobs)
  const [entries, setEntries] = useState(initialEntries)
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<EntryWithJob | null>(null)
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const currency = profile?.currency_symbol ?? '$'

  const handleEntryAdded = useCallback((entry: EntryWithJob) => {
    setEntries(prev => [entry, ...prev].slice(0, 10))
  }, [])

  const handleEntryUpdated = useCallback((updated: EntryWithJob) => {
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
  }, [])

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
      description: 'Tap Undo to restore it',
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
    const toMark = entries.filter(e => !e.is_paid)
    if (toMark.length === 0) {
      toast.info('All entries are already paid')
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

  const allSelected = entries.length > 0 && selectedIds.size === entries.length
  const toggleSelectAll = useCallback(() => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(entries.map(e => e.id)))
  }, [allSelected, entries])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Log</h1>
        {entries.length > 0 && !multiSelectMode && (
          <div className="flex items-center gap-2">
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

      {jobs.length === 0 ? (
        <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl p-5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">Add a job first</p>
            <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-0.5">
              You need at least one job before you can log hours.{' '}
              <Link href="/jobs" className="font-semibold underline">Go to Jobs →</Link>
            </p>
          </div>
        </div>
      ) : !multiSelectMode ? (
        <Button
          onClick={() => { setEditingEntry(null); setShowModal(true) }}
          className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-base font-medium"
        >
          + New Entry
        </Button>
      ) : null}

      <SummaryCards stats={initialStats} currency={currency} />

      <div>
        <div className="flex items-center justify-between mb-3">
          {multiSelectMode ? (
            <>
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
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
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent</h2>
              <Link href="/history" className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                View all →
              </Link>
            </>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <p className="text-sm font-medium">No entries yet</p>
            <p className="text-xs mt-1">Tap &quot;+ New Entry&quot; to log your first hours</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {entries.map((entry, i) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  currency={currency}
                  index={i}
                  onDelete={handleDelete}
                  onEdit={(e) => { setEditingEntry(e); setShowModal(true) }}
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
      </div>

      <NewEntryModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingEntry(null) }}
        jobs={jobs}
        currency={currency}
        editingEntry={editingEntry}
        onEntryAdded={handleEntryAdded}
        onEntryUpdated={handleEntryUpdated}
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
