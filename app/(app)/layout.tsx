import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/nav/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.full_name === null) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-20 md:pb-0 md:pl-56">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
