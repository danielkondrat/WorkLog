import { createClient } from '@/lib/supabase/server'
import HistoryClient from '@/components/history/HistoryClient'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: jobs }, { data: entries }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('jobs').select('*').eq('user_id', user.id).order('name'),
    supabase.from('entries').select('*, job:jobs(*)').eq('user_id', user.id).order('date', { ascending: false }).order('created_at', { ascending: false }),
  ])

  return (
    <HistoryClient
      initialEntries={entries ?? []}
      jobs={jobs ?? []}
      currency={profile?.currency_symbol ?? '$'}
    />
  )
}
