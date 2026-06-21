import { Skeleton } from '@/components/ui/skeleton'
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
    </div>
  )
}
