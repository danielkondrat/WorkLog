'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Job } from '@/lib/types'
import JobCard from './JobCard'
import JobModal from './JobModal'
import { Button } from '@/components/ui/button'

interface Props {
  initialJobs: Job[]
  entryCounts: Record<string, number>
  currency: string
}

export default function JobsClient({ initialJobs, entryCounts, currency }: Props) {
  const [jobs, setJobs] = useState(initialJobs)
  const [showModal, setShowModal] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const activeJobs = jobs.filter(j => !j.is_archived)
  const archivedJobs = jobs.filter(j => j.is_archived)

  const handleJobSaved = useCallback((job: Job) => {
    setJobs(prev => {
      const exists = prev.find(j => j.id === job.id)
      return exists ? prev.map(j => j.id === job.id ? job : j) : [...prev, job]
    })
    setShowModal(false)
    setEditingJob(null)
  }, [])

  const handleArchive = useCallback(async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('jobs').update({ is_archived: true }).eq('id', id)
    if (error) { toast.error('Failed to archive job'); return }
    setJobs(prev => prev.map(j => j.id === id ? { ...j, is_archived: true } : j))
    toast.success('Job archived')
  }, [])

  const handleRestore = useCallback(async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('jobs').update({ is_archived: false }).eq('id', id)
    if (error) { toast.error('Failed to restore job'); return }
    setJobs(prev => prev.map(j => j.id === id ? { ...j, is_archived: false } : j))
    toast.success('Job restored')
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    const entryCount = entryCounts[id] ?? 0
    if (entryCount > 0) {
      toast.error('This job has entries — archive it instead')
      return
    }
    const supabase = createClient()
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (error) { toast.error('Failed to delete job'); return }
    setJobs(prev => prev.filter(j => j.id !== id))
    toast.success('Job deleted')
  }, [entryCounts])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jobs</h1>
        <Button
          onClick={() => { setEditingJob(null); setShowModal(true) }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-4 rounded-xl"
        >
          + Add Job
        </Button>
      </div>

      {activeJobs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
            </svg>
          </div>
          <p className="text-sm font-medium">No jobs yet</p>
          <p className="text-xs mt-1">Add your first job to start tracking</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {activeJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                entryCount={entryCounts[job.id] ?? 0}
                currency={currency}
                onEdit={() => { setEditingJob(job); setShowModal(true) }}
                onArchive={() => handleArchive(job.id)}
                onDelete={() => handleDelete(job.id)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {archivedJobs.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-3"
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${showArchived ? 'rotate-90' : ''}`}
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            Archived ({archivedJobs.length})
          </button>
          <AnimatePresence>
            {showArchived && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                {archivedJobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    entryCount={entryCounts[job.id] ?? 0}
                    currency={currency}
                    isArchived
                    onRestore={() => handleRestore(job.id)}
                    onDelete={() => handleDelete(job.id)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <JobModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingJob(null) }}
        editingJob={editingJob}
        onJobSaved={handleJobSaved}
      />
    </motion.div>
  )
}
