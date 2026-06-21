'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    router.push('/log')
    router.refresh()
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm p-8">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Sign in</h2>
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
          <div className="flex justify-between items-center">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-500">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
            className="h-11"
            {...register('password')}
          />
          {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
        </div>
        <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-indigo-600 font-medium hover:text-indigo-500">
          Sign up
        </Link>
      </p>
    </div>
  )
}
