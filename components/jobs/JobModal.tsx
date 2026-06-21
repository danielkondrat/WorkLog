'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Job } from '@/lib/types'
import { JOB_COLORS } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const schema = z.object({
  name: z.string().min(1, 'Job name is required'),
  type: z.enum(['hourly', 'fixed']),
  rate: z.string().refine(v => parseFloat(v) > 0, { message: 'Rate must be positive' }),
  color: z.string().min(1, 'Pick a color'),
})
type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  editingJob: Job | null
  onJobSaved: (job: Job) => void
}

function JobForm({ editingJob, onClose, onJobSaved }: Omit<Props, 'open'>) {
  const { register, handleSubmit, watch, control, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      type: 'hourly',
      rate: '',
      color: JOB_COLORS[0],
    },
  })

  useEffect(() => {
    if (editingJob) {
      reset({
        name: editingJob.name,
        type: editingJob.type,
        rate: String(editingJob.rate),
        color: editingJob.color,
      })
    } else {
      reset({ name: '', type: 'hourly', rate: '', color: JOB_COLORS[0] })
    }
  }, [editingJob, reset])

  const jobType = watch('type')

  async function onSubmit(data: FormData) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      name: data.name,
      type: data.type,
      rate: parseFloat(data.rate),
      color: data.color,
    }

    if (editingJob) {
      const { data: updated, error } = await supabase
        .from('jobs')
        .update(payload)
        .eq('id', editingJob.id)
        .select()
        .single()
      if (error) { toast.error('Failed to update job'); return }
      onJobSaved(updated as Job)
      toast.success('Job updated')
    } else {
      const { data: created, error } = await supabase
        .from('jobs')
        .insert(payload)
        .select()
        .single()
      if (error) { toast.error('Failed to create job'); return }
      onJobSaved(created as Job)
      toast.success('Job created')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label htmlFor="name">Job name</Label>
        <Input id="name" placeholder="e.g. Freelance Design" className="h-11" {...register('name')} />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Type</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              {(['hourly', 'fixed'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => field.onChange(t)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                    field.value === t
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rate">{jobType === 'hourly' ? 'Hourly rate' : 'Fixed amount'}</Label>
        <Input
          id="rate"
          type="number"
          step="0.01"
          min="0"
          placeholder={jobType === 'hourly' ? '0.00' : '0.00'}
          className="h-11"
          {...register('rate')}
        />
        {errors.rate && <p className="text-xs text-red-500">{errors.rate.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Color</Label>
        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {JOB_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => field.onChange(color)}
                  className={`w-9 h-9 rounded-xl transition-transform ${field.value === color ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        />
        {errors.color && <p className="text-xs text-red-500">{errors.color.message}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-11">Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700">
          {isSubmitting ? 'Saving…' : editingJob ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}

export default function JobModal(props: Props) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const title = props.editingJob ? 'Edit Job' : 'New Job'

  if (isDesktop) {
    return (
      <Dialog open={props.open} onOpenChange={v => !v && props.onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
          <JobForm {...props} />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={props.open} onOpenChange={v => !v && props.onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader><SheetTitle>{title}</SheetTitle></SheetHeader>
        <JobForm {...props} />
      </SheetContent>
    </Sheet>
  )
}
