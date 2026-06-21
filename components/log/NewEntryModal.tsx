'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Job, EntryWithJob } from '@/lib/types'
import { toLocalDateString, calcEarnings, formatMoney, JOB_COLORS } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const schema = z.object({
  job_id: z.string().min(1, 'Select a job'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
  method: z.enum(['direct', 'start_end']),
  hours: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
}).refine(d => {
  if (d.method === 'direct') {
    const h = parseFloat(d.hours ?? '')
    return !isNaN(h) && h > 0
  }
  return true
}, { message: 'Hours must be a positive number', path: ['hours'] })
.refine(d => {
  if (d.method === 'start_end') {
    return !!d.start_time && !!d.end_time
  }
  return true
}, { message: 'Start and end time required', path: ['start_time'] })

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  jobs: Job[]
  currency: string
  editingEntry: EntryWithJob | null
  onEntryAdded: (entry: EntryWithJob) => void
  onEntryUpdated: (entry: EntryWithJob) => void
}

function calcHoursFromTimes(start: string, end: string): number | null {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? diff / 60 : null
}

function EntryForm({ jobs, currency, editingEntry, onClose, onEntryAdded, onEntryUpdated }: Omit<Props, 'open'>) {
  const { register, handleSubmit, watch, control, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: toLocalDateString(new Date()),
      method: 'direct',
      hours: '',
      job_id: jobs[0]?.id ?? '',
    },
  })

  useEffect(() => {
    if (editingEntry) {
      reset({
        job_id: editingEntry.job_id,
        date: editingEntry.date,
        description: editingEntry.description ?? '',
        method: editingEntry.start_time ? 'start_end' : 'direct',
        hours: editingEntry.start_time ? '' : String(editingEntry.hours),
        start_time: editingEntry.start_time ?? '',
        end_time: editingEntry.end_time ?? '',
      })
    } else {
      reset({
        date: toLocalDateString(new Date()),
        method: 'direct',
        hours: '',
        job_id: jobs[0]?.id ?? '',
        description: '',
      })
    }
  }, [editingEntry, jobs, reset])

  const method = watch('method')
  const jobId = watch('job_id')
  const hoursRaw = watch('hours')
  const startTime = watch('start_time')
  const endTime = watch('end_time')

  const selectedJob = jobs.find(j => j.id === jobId)
  const computedHours = method === 'start_end' ? calcHoursFromTimes(startTime ?? '', endTime ?? '') : parseFloat(hoursRaw ?? '')
  const earnings = selectedJob && computedHours && computedHours > 0
    ? calcEarnings(computedHours, selectedJob.rate, selectedJob.type)
    : null
  const endBeforeStart = method === 'start_end' && startTime && endTime
    ? calcHoursFromTimes(startTime, endTime) === null
    : false

  async function onSubmit(data: FormData) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const hours = data.method === 'start_end'
      ? calcHoursFromTimes(data.start_time!, data.end_time!)!
      : parseFloat(data.hours!)

    const payload = {
      user_id: user.id,
      job_id: data.job_id,
      date: data.date,
      description: data.description || null,
      hours,
      start_time: data.method === 'start_end' ? data.start_time! : null,
      end_time: data.method === 'start_end' ? data.end_time! : null,
    }

    if (editingEntry) {
      const { data: updated, error } = await supabase
        .from('entries')
        .update(payload)
        .eq('id', editingEntry.id)
        .select('*, job:jobs(*)')
        .single()
      if (error) { toast.error('Failed to update entry'); return }
      onEntryUpdated(updated as EntryWithJob)
      toast.success('Entry updated')
    } else {
      const { data: created, error } = await supabase
        .from('entries')
        .insert(payload)
        .select('*, job:jobs(*)')
        .single()
      if (error) { toast.error('Failed to save entry'); return }
      onEntryAdded(created as EntryWithJob)
      toast.success('Entry saved')
    }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
      {/* Job selector */}
      <div className="space-y-1.5">
        <Label>Job</Label>
        <Controller
          name="job_id"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-1 gap-2">
              {jobs.map(job => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => field.onChange(job.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                    field.value === job.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: job.color }} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{job.name}</span>
                  <span className="ml-auto text-xs text-gray-400">
                    {job.type === 'hourly' ? `${currency}${job.rate}/hr` : `${currency}${job.rate} fixed`}
                  </span>
                </button>
              ))}
            </div>
          )}
        />
        {errors.job_id && <p className="text-xs text-red-500">{errors.job_id.message}</p>}
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" className="h-11" {...register('date')} />
        {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description <span className="text-gray-400 font-normal">(optional)</span></Label>
        <Textarea
          id="description"
          placeholder="What did you work on?"
          rows={2}
          className="resize-none"
          {...register('description')}
        />
      </div>

      {/* Hours method toggle */}
      <div className="space-y-3">
        <Label>Hours</Label>
        <Controller
          name="method"
          control={control}
          render={({ field }) => (
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              {(['direct', 'start_end'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => field.onChange(m)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                    field.value === m
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {m === 'direct' ? 'Direct' : 'Start → End'}
                </button>
              ))}
            </div>
          )}
        />

        {method === 'direct' ? (
          <div className="space-y-1.5">
            <Input
              type="number"
              step="0.5"
              min="0"
              placeholder="Hours worked (e.g. 1.5)"
              className="h-11"
              {...register('hours')}
            />
            {errors.hours && <p className="text-xs text-red-500">{errors.hours.message}</p>}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start_time" className="text-xs">Start</Label>
                <Input id="start_time" type="time" className="h-11 mt-1" {...register('start_time')} />
              </div>
              <div>
                <Label htmlFor="end_time" className="text-xs">End</Label>
                <Input id="end_time" type="time" className="h-11 mt-1" {...register('end_time')} />
              </div>
            </div>
            {endBeforeStart && (
              <p className="text-xs text-amber-600">End time must be after start time</p>
            )}
            {computedHours && computedHours > 0 && (
              <p className="text-xs text-gray-500">= {computedHours.toFixed(2)} hours</p>
            )}
            {errors.start_time && <p className="text-xs text-red-500">{errors.start_time.message}</p>}
          </div>
        )}
      </div>

      {/* Earnings preview */}
      {earnings !== null && earnings >= 0 && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {selectedJob?.type === 'fixed' ? 'Fixed rate:' : 'Estimated:'}
            {' '}
            <span className="font-semibold text-gray-900 dark:text-white">{formatMoney(earnings, currency)}</span>
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-11">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700">
          {isSubmitting ? 'Saving…' : editingEntry ? 'Update' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

export default function NewEntryModal(props: Props) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const title = props.editingEntry ? 'Edit Entry' : 'New Entry'

  if (isDesktop) {
    return (
      <Dialog open={props.open} onOpenChange={v => !v && props.onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[70vh] pr-1">
            <EntryForm {...props} />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={props.open} onOpenChange={v => !v && props.onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <EntryForm {...props} />
      </SheetContent>
    </Sheet>
  )
}
