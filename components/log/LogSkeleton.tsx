import { Skeleton } from '@/components/ui/skeleton'

export default function LogSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
