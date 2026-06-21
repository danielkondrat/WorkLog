import { Skeleton } from '@/components/ui/skeleton'
export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-24" />
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9 w-24 rounded-full" />)}
      </div>
      {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
    </div>
  )
}
