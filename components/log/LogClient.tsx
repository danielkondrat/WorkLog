'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Job, EntryWithJob, Profile } from '@/lib/types'
import SummaryCards from './SummaryCards'
import EntryCard from './EntryCard'
import NewEntryModal from './NewEntryModal'
import { Button } from '@/components/ui/button'

interface Props {
  initialJobs: Job[]
  initialEntries: EntryWithJob[]
  profile: Profile | null
}

export default function LogClient({ initialJobs, initialEntries, profile }: Props) {
  const [jobs] = useState(initialJobs)
  const [entries, setEntries] = useState(initialEntries)
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<EntryWithJob | null>(null)
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
            const newList = [entry, ...prev].sort((a, b) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            return newList
          })
        },
      },
    })
  }, [entries])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Log</h1>
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
      ) : (
        <Button
          onClick={() => { setEditingEntry(null); setShowModal(true) }}
          className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-base font-medium"
        >
          + New Entry
        </Button>
      )}

      <SummaryCards entries={entries} jobs={jobs} currency={currency} />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent</h2>
          <Link href="/history" className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
            View all →
          </Link>
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
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                currency={currency}
                index={i}
                onDelete={handleDelete}
                onEdit={(e) => { setEditingEntry(e); setShowModal(true) }}
              />
            ))}
          </div>
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
    </motion.div>
  )
}
