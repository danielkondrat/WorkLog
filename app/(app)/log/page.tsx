import { createClient } from '@/lib/supabase/server'
import LogClient from '@/components/log/LogClient'

export default async function LogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: jobs }, { data: entries }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('jobs').select('*').eq('user_id', user.id).eq('is_archived', false).order('created_at'),
    supabase.from('entries').select('*, job:jobs(*)').eq('user_id', user.id).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(10),
  ])

  return (
    <LogClient
      initialJobs={jobs ?? []}
      initialEntries={entries ?? []}
      profile={profile}
    />
  )
}
