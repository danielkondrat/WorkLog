import { createClient } from '@/lib/supabase/server'
import JobsClient from '@/components/jobs/JobsClient'

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: jobs }, { data: entryCounts }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('jobs').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('entries').select('job_id').eq('user_id', user.id),
  ])

  const countMap: Record<string, number> = {}
  for (const e of (entryCounts ?? [])) {
    countMap[e.job_id] = (countMap[e.job_id] ?? 0) + 1
  }

  return (
    <JobsClient
      initialJobs={jobs ?? []}
      entryCounts={countMap}
      currency={profile?.currency_symbol ?? '$'}
    />
  )
}
