'use client'

import { motion } from 'framer-motion'
import type { Job } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Props {
  job: Job
  entryCount: number
  currency: string
  isArchived?: boolean
  onEdit?: () => void
  onArchive?: () => void
  onRestore?: () => void
  onDelete?: () => void
}

export default function JobCard({ job, entryCount, currency, isArchived, onEdit, onArchive, onRestore, onDelete }: Props) {
  const rateLabel = job.type === 'hourly'
    ? `${currency}${job.rate}/hr`
    : `${currency}${job.rate} fixed`

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: isArchived ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-card rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="flex items-stretch">
        <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: job.color }} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900 dark:text-white">{job.name}</p>
                <Badge variant="secondary" className="text-xs capitalize">
                  {job.type}
                </Badge>
                {isArchived && (
                  <Badge variant="outline" className="text-xs text-gray-400">
                    Archived
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{rateLabel}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!isArchived && onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onEdit}
                  className="h-8 w-8 text-gray-400 hover:text-indigo-600"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </Button>
              )}
              {!isArchived && entryCount > 0 && onArchive && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onArchive}
                  className="h-8 w-8 text-gray-400 hover:text-amber-500"
                  title="Archive"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="21 8 21 21 3 21 3 8"/>
                    <rect x="1" y="3" width="22" height="5"/>
                    <line x1="10" y1="12" x2="14" y2="12"/>
                  </svg>
                </Button>
              )}
              {isArchived && onRestore && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRestore}
                  className="h-8 text-xs text-indigo-600 hover:text-indigo-700"
                >
                  Restore
                </Button>
              )}
              {entryCount === 0 && onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className="h-8 w-8 text-gray-400 hover:text-red-500"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                  </svg>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
