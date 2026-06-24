import { createClient } from '@/lib/supabase/server'
import LogClient from '@/components/log/LogClient'
import { calcEarnings } from '@/lib/utils'

export default async function LogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: jobs }, { data: entries }, { data: allRows }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('jobs').select('*').eq('user_id', user.id).eq('is_archived', false).order('created_at'),
    supabase.from('entries').select('*, job:jobs(*)').eq('user_id', user.id).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(10),
    supabase.from('entries').select('hours, is_paid, job:jobs(rate, type)').eq('user_id', user.id),
  ])

  let totalHours = 0, totalEarned = 0, paidEarned = 0, unpaidEarned = 0
  for (const row of allRows ?? []) {
    const job = row.job as unknown as { rate: number; type: string } | null
    const earn = job ? calcEarnings(row.hours, job.rate, job.type as 'hourly' | 'fixed') : 0
    totalHours += row.hours
    totalEarned += earn
    if (row.is_paid) paidEarned += earn
    else unpaidEarned += earn
  }

  return (
    <LogClient
      initialJobs={jobs ?? []}
      initialEntries={entries ?? []}
      profile={profile}
      stats={{ totalHours, totalEarned, paidEarned, unpaidEarned }}
    />
  )
}
