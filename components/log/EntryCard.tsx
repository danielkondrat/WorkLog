'use client'

import { useRef, useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import type { EntryWithJob } from '@/lib/types'
import { formatDisplayDate, formatHours, formatMoney, calcEarnings } from '@/lib/utils'

interface Props {
  entry: EntryWithJob
  currency: string
  index: number
  onDelete: (id: string) => void
  onEdit: (entry: EntryWithJob) => void
  onTogglePaid: (id: string, isPaid: boolean) => void
  onMarkUpToHere: (entry: EntryWithJob) => void
  multiSelectMode: boolean
  isSelected: boolean
  onToggleSelect: (id: string) => void
  onEnterMultiSelect: (id: string) => void
}

export default function EntryCard({
  entry, currency, index,
  onDelete, onEdit, onTogglePaid, onMarkUpToHere,
  multiSelectMode, isSelected, onToggleSelect, onEnterMultiSelect,
}: Props) {
  const x = useMotionValue(0)
  const paidRevealOpacity = useTransform(x, [0, 40, 80], [0, 0.7, 1])
  const leftActionsWidth = useTransform(x, [-120, 0], [120, 0])
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDragging = useRef(false)

  useEffect(() => {
    if (multiSelectMode) {
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 })
    }
  }, [multiSelectMode, x])

  const earnings = entry.job ? calcEarnings(entry.hours, entry.job.rate, entry.job.type) : 0
  const jobColor = entry.job?.color ?? '#6366F1'

  function handleDragStart() {
    isDragging.current = true
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    isDragging.current = false
    if (info.offset.x > 60) {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
      onTogglePaid(entry.id, !entry.is_paid)
    } else if (info.offset.x < -70) {
      animate(x, -120, { type: 'spring', stiffness: 300, damping: 30 })
    } else {
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 })
    }
  }

  function closeActions() {
    animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 })
  }

  function handlePointerDown() {
    if (multiSelectMode) return
    longPressTimer.current = setTimeout(() => {
      if (!isDragging.current) {
        onEnterMultiSelect(entry.id)
      }
    }, 500)
  }

  function handlePointerUp() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function handleCardClick() {
    if (multiSelectMode) {
      onToggleSelect(entry.id)
      return
    }
    if (x.get() !== 0) closeActions()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* LEFT side: paid reveal (right swipe) */}
      <motion.div
        style={{ opacity: paidRevealOpacity }}
        className="absolute left-0 top-0 bottom-0 w-20 flex flex-col items-center justify-center gap-1 bg-emerald-500 rounded-l-2xl"
      >
        {entry.is_paid ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
        <span className="text-[10px] text-white font-semibold">{entry.is_paid ? 'Unpay' : 'Paid'}</span>
      </motion.div>

      {/* RIGHT side: Edit | Mark up to here | Delete (left swipe) */}
      <div className="absolute right-0 top-0 bottom-0 flex items-stretch">
        <motion.div style={{ width: leftActionsWidth }} className="flex items-stretch overflow-hidden">
          <button
            onClick={() => { closeActions(); onEdit(entry) }}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-indigo-500 min-w-[40px]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span className="text-[9px] text-white font-medium">Edit</span>
          </button>
          <button
            onClick={() => { closeActions(); onMarkUpToHere(entry) }}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-emerald-600 min-w-[40px]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span className="text-[9px] text-white font-medium leading-tight text-center px-0.5">Up to<br/>here</span>
          </button>
          <button
            onClick={() => { closeActions(); onDelete(entry.id) }}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-red-500 min-w-[40px]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
            <span className="text-[9px] text-white font-medium">Delete</span>
          </button>
        </motion.div>
      </div>

      {/* Card */}
      <motion.div
        drag={multiSelectMode ? false : 'x'}
        dragConstraints={{ left: -120, right: 80 }}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ x }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleCardClick}
        className="relative bg-card rounded-2xl shadow-sm select-none cursor-pointer group touch-pan-y"
      >
        {entry.is_paid && (
          <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 pointer-events-none" />
        )}
        <div className="flex items-stretch">
          {/* Multi-select checkbox */}
          {multiSelectMode && (
            <div className="flex items-center pl-3 pr-1 flex-shrink-0">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'
              }`}>
                {isSelected && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
            </div>
          )}

          <div className="w-1 rounded-l-2xl flex-shrink-0" style={{ backgroundColor: jobColor }} />

          <div className="flex-1 p-4 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {entry.job?.name ?? 'Unknown job'}
                  </p>
                  {entry.is_paid && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 flex-shrink-0">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Paid
                    </span>
                  )}
                </div>
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
          {!multiSelectMode && (
            <div className="hidden md:flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePaid(entry.id, !entry.is_paid) }}
                className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                  entry.is_paid ? 'text-emerald-500' : 'text-gray-400 hover:text-emerald-500'
                }`}
                title={entry.is_paid ? 'Mark as unpaid' : 'Mark as paid'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMarkUpToHere(entry) }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-emerald-600 transition-colors"
                title="Mark this and older entries as paid"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                  <line x1="4" y1="21" x2="20" y2="21"/>
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(entry) }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-indigo-600 transition-colors"
                title="Edit"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
