import { createClient } from '@/lib/supabase/server'
import AnalyticsClient from '@/components/analytics/AnalyticsClient'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: jobs }, { data: entries }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('jobs').select('*').eq('user_id', user.id).order('name'),
    supabase.from('entries').select('*, job:jobs(*)').eq('user_id', user.id).order('date', { ascending: false }),
  ])

  return (
    <AnalyticsClient
      entries={entries ?? []}
      jobs={jobs ?? []}
      currency={profile?.currency_symbol ?? '$'}
    />
  )
}
