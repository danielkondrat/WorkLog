'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const schema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  currency_symbol: z.string().min(1, 'Symbol required').max(3, 'Max 3 characters'),
})
type FormData = z.infer<typeof schema>

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency_symbol: '$' },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { error } = await supabase.from('profiles').update({
      full_name: data.full_name,
      currency_symbol: data.currency_symbol,
    }).eq('id', user.id)
    if (error) {
      toast.error('Failed to save profile')
      setLoading(false)
      return
    }
    router.push('/log')
    router.refresh()
  }

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to WorkLog</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Let&apos;s set up your profile</p>
        </div>
        <div className="bg-card rounded-2xl shadow-sm p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Your name</Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Jane Smith"
                className="h-11"
                {...register('full_name')}
              />
              {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency_symbol">Currency symbol</Label>
              <Input
                id="currency_symbol"
                type="text"
                placeholder="$"
                maxLength={3}
                className="h-11 max-w-[80px]"
                {...register('currency_symbol')}
              />
              {errors.currency_symbol && <p className="text-xs text-red-500">{errors.currency_symbol.message}</p>}
              <p className="text-xs text-gray-400">e.g. $, â‚¬, Â£, Â¥</p>
            </div>
            <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading ? 'Saving…' : 'Get started â†’'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
