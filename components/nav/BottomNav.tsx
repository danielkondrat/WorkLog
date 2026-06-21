'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  {
    href: '/log',
    label: 'Log',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="9" y1="21" x2="9" y2="9"/>
      </svg>
    ),
  },
  {
    href: '/history',
    label: 'History',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <polyline points="12 7 12 12 15 15"/>
      </svg>
    ),
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    href: '/jobs',
    label: 'Jobs',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-t border-gray-200 dark:border-gray-800">
        <div className="flex">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors',
                  active
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {tab.icon(active)}
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 flex-col bg-card border-r border-gray-200 dark:border-gray-800 px-3 py-6">
        <div className="flex items-center gap-2 px-3 mb-8">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="6" width="18" height="3" rx="1.5" fill="white"/>
              <rect x="3" y="11" width="12" height="3" rx="1.5" fill="white" opacity="0.7"/>
              <rect x="3" y="16" width="15" height="3" rx="1.5" fill="white" opacity="0.4"/>
            </svg>
          </div>
          <span className="font-bold text-gray-900 dark:text-white">WorkLog</span>
        </div>
        <div className="flex flex-col gap-1">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  active
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                )}
              >
                {tab.icon(active)}
                {tab.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
