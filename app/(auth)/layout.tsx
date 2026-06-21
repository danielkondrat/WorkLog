'use client'

import { motion } from 'framer-motion'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <rect x="3" y="6" width="18" height="3" rx="1.5" fill="currentColor"/>
              <rect x="3" y="11" width="12" height="3" rx="1.5" fill="currentColor" opacity="0.7"/>
              <rect x="3" y="16" width="15" height="3" rx="1.5" fill="currentColor" opacity="0.4"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WorkLog</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your hours, own your time</p>
        </div>
        {children}
      </motion.div>
    </div>
  )
}
