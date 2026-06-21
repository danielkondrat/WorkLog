export type JobType = 'hourly' | 'fixed'

export interface Profile {
  id: string
  full_name: string | null
  currency_symbol: string
  created_at: string
}

export interface Job {
  id: string
  user_id: string
  name: string
  type: JobType
  rate: number
  color: string
  is_archived: boolean
  created_at: string
}

export interface Entry {
  id: string
  user_id: string
  job_id: string
  date: string
  description: string | null
  hours: number
  start_time: string | null
  end_time: string | null
  created_at: string
  job?: Job
}

export interface EntryWithJob extends Entry {
  job: Job
}
