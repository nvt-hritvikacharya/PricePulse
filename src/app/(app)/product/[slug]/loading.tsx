import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading product">
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Skeleton className="aspect-square w-full rounded-3xl" />
        <div className="space-y-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>
      </div>
      <Skeleton className="h-80 w-full rounded-3xl" />
    </div>
  );
}
