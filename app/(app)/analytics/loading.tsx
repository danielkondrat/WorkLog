import { Skeleton } from '@/components/ui/skeleton'
export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-56 rounded-2xl" />
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-2xl" />)}
    </div>
  )
}
