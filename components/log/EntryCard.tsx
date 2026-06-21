'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import type { EntryWithJob } from '@/lib/types'
import { formatDisplayDate, formatHours, formatMoney, calcEarnings } from '@/lib/utils'

interface Props {
  entry: EntryWithJob
  currency: string
  index: number
  onDelete: (id: string) => void
  onEdit: (entry: EntryWithJob) => void
}

export default function EntryCard({ entry, currency, index, onDelete, onEdit }: Props) {
  const [revealed, setRevealed] = useState(false)
  const x = useMotionValue(0)
  const actionWidth = useTransform(x, [-80, 0], [80, 0])
  const dragRef = useRef(false)

  const earnings = entry.job ? calcEarnings(entry.hours, entry.job.rate, entry.job.type) : 0
  const jobColor = entry.job?.color ?? '#6366F1'

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x < -50) {
      animate(x, -80, { type: 'spring', stiffness: 300, damping: 30 })
      setRevealed(true)
    } else {
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 })
      setRevealed(false)
    }
  }

  function closeActions() {
    animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 })
    setRevealed(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Swipe action buttons (revealed on left swipe) */}
      <div className="absolute right-0 top-0 bottom-0 flex items-stretch">
        <motion.div style={{ width: actionWidth }} className="flex items-stretch overflow-hidden">
          <button
            onClick={() => { closeActions(); onEdit(entry) }}
            className="flex-1 flex items-center justify-center bg-indigo-500 min-w-[40px]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            onClick={() => { closeActions(); onDelete(entry.id) }}
            className="flex-1 flex items-center justify-center bg-red-500 min-w-[40px]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </motion.div>
      </div>

      {/* Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.1}
        onDragStart={() => { dragRef.current = true }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        onClick={() => { if (revealed) { closeActions() } }}
        className="relative bg-card rounded-2xl shadow-sm select-none cursor-pointer group touch-pan-y"
      >
        <div className="flex items-stretch">
          <div className="w-1 rounded-l-2xl flex-shrink-0" style={{ backgroundColor: jobColor }} />
          <div className="flex-1 p-4 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                  {entry.job?.name ?? 'Unknown job'}
                </p>
                {entry.description && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{entry.description}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400 dark:text-gray-500">{formatDisplayDate(entry.date)}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                  {formatHours(entry.hours)}h · {formatMoney(earnings, currency)}
                </p>
              </div>
            </div>
          </div>
          {/* Desktop hover actions */}
          <div className="hidden md:flex items-center gap-1 pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(entry) }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
