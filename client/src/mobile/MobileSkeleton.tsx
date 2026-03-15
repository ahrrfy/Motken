import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div className={cn("bg-muted/70 rounded-lg animate-pulse", className)} />;
}

export function DashboardSkeleton() {
  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Bone className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Bone className="h-4 w-32" />
          <Bone className="h-3 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => (
          <Bone key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Bone className="h-48 rounded-xl" />
      <div className="space-y-2">
        {[1,2,3].map(i => (
          <Bone key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="p-4 space-y-3" dir="rtl">
      <Bone className="h-11 rounded-xl mb-4" />
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/30">
          <Bone className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-28" />
            <Bone className="h-3 w-40" />
          </div>
          <Bone className="h-6 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton() {
  return (
    <div className="p-4 space-y-3" dir="rtl">
      <Bone className="h-11 rounded-xl mb-2" />
      {[1,2,3].map(i => (
        <div key={i} className="p-4 rounded-xl border border-border/30 space-y-3">
          <div className="flex items-center justify-between">
            <Bone className="h-4 w-24" />
            <Bone className="h-6 w-16 rounded-full" />
          </div>
          <Bone className="h-3 w-full" />
          <Bone className="h-3 w-3/4" />
          <div className="flex gap-2 pt-1">
            <Bone className="h-8 w-20 rounded-lg" />
            <Bone className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GenericSkeleton() {
  return (
    <div className="p-4 space-y-4" dir="rtl">
      <Bone className="h-8 w-40 mb-2" />
      <Bone className="h-11 rounded-xl" />
      <div className="space-y-3">
        {[1,2,3,4].map(i => (
          <Bone key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
