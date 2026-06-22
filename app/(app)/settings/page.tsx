import { createClient } from '@/lib/supabase/server'
import SettingsClient from '@/components/settings/SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, name, color')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('name')

  return (
    <SettingsClient
      profile={profile}
      email={user.email ?? ''}
      jobs={jobs ?? []}
    />
  )
}
