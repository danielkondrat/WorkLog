'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Papa from 'papaparse'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { calcEarnings } from '@/lib/utils'
import ThemeToggle from '@/components/ThemeToggle'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  currency_symbol: z.string().min(1, 'Required').max(3, 'Max 3 chars'),
})
type ProfileForm = z.infer<typeof profileSchema>

interface Props {
  profile: Profile | null
  email: string
}

export default function SettingsClient({ profile, email }: Props) {
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      currency_symbol: profile?.currency_symbol ?? '$',
    },
  })

  async function saveProfile(data: ProfileForm) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update(data).eq('id', user.id)
    if (error) { toast.error('Failed to save'); return }
    toast.success('Profile saved')
    router.refresh()
  }

  async function exportCSV() {
    setExporting(true)
    const supabase = createClient()
    const { data: entries, error } = await supabase
      .from('entries')
      .select('*, job:jobs(*)')
      .order('date', { ascending: false })

    if (error || !entries) {
      toast.error('Export failed')
      setExporting(false)
      return
    }

    const currency = profile?.currency_symbol ?? '$'
    const rows = entries.map(e => {
      const job = e.job as { name: string; type: string; rate: number } | null
      const earnings = job ? calcEarnings(e.hours, job.rate, job.type as 'hourly' | 'fixed') : 0
      return {
        Date: e.date,
        Job: job?.name ?? '',
        Description: e.description ?? '',
        Hours: e.hours,
        'Start Time': e.start_time ?? '',
        'End Time': e.end_time ?? '',
        'Rate Type': job?.type ?? '',
        Rate: job?.rate ?? '',
        [`Earnings (${currency})`]: earnings.toFixed(2),
      }
    })

    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `worklog-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export downloaded')
    setExporting(false)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      {/* Profile */}
      <div className="bg-card rounded-2xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>
        <form onSubmit={handleSubmit(saveProfile)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" className="h-11" {...register('full_name')} />
            {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled className="h-11 opacity-60" />
            <p className="text-xs text-gray-400">Email cannot be changed here</p>
          </div>
          <Button type="submit" disabled={isSubmitting} className="h-10 bg-indigo-600 hover:bg-indigo-700">
            {isSubmitting ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </div>

      {/* Preferences */}
      <div className="bg-card rounded-2xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Preferences</h2>
        <form onSubmit={handleSubmit(saveProfile)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currency_symbol">Currency symbol</Label>
            <div className="flex gap-3 items-start">
              <Input
                id="currency_symbol"
                maxLength={3}
                placeholder="$"
                className="h-11 max-w-[80px]"
                {...register('currency_symbol')}
              />
              <div className="flex flex-col justify-center h-11">
                <p className="text-xs text-gray-400">e.g. $, &euro;, &pound;, &yen;</p>
              </div>
            </div>
            {errors.currency_symbol && <p className="text-xs text-red-500">{errors.currency_symbol.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting} className="h-10 bg-indigo-600 hover:bg-indigo-700">
            {isSubmitting ? 'Saving…' : 'Save preferences'}
          </Button>
        </form>
      </div>

      {/* Appearance */}
      <div className="bg-card rounded-2xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
        <ThemeToggle />
      </div>

      {/* Export */}
      <div className="bg-card rounded-2xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Export</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Download all your entries as a CSV file.
        </p>
        <Button
          onClick={exportCSV}
          disabled={exporting}
          variant="outline"
          className="h-10 gap-2"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {/* Account */}
      <div className="bg-card rounded-2xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Account</h2>
        <Separator className="mb-4" />
        <Button
          onClick={signOut}
          variant="outline"
          className="h-10 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:hover:bg-red-950"
        >
          Sign out
        </Button>
      </div>
    </motion.div>
  )
}
