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
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="bg-card rounded-2xl shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Check your email</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          We sent you a confirmation link. Click it to activate your account, then come back to sign in.
        </p>
        <Link href="/login" className="mt-6 block text-indigo-600 text-sm font-medium">
          Back to sign in â†’
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm p-8">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Create account</h2>
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
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            className="h-11"
            {...register('password')}
          />
          {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            className="h-11"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
        </div>
        <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-600 font-medium hover:text-indigo-500">
          Sign in
        </Link>
      </p>
    </div>
  )
}
