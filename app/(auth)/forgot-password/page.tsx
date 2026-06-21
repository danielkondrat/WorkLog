'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="bg-card rounded-2xl shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Check your email</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          We sent a password reset link to your email address.
        </p>
        <Link href="/login" className="mt-6 block text-indigo-600 text-sm font-medium">
          Back to sign in â†’
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm p-8">
      <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Forgot password?</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11"
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <Link href="/login" className="text-indigo-600 font-medium hover:text-indigo-500">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
