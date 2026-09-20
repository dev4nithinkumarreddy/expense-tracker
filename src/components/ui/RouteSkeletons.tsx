/**
 * Route-specific skeleton loaders for tab transitions.
 * Crafted to mirror the layout of each screen to eliminate layout shifts.
 */

// Reusable micro skeleton block
function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`bg-secondary/80 dark:bg-secondary/60 rounded-xl ${className}`} />;
}

export function ExpensesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse select-none">
      {/* Header */}
      <div className="flex justify-between items-center pt-1">
        <SkeletonBlock className="h-8 w-32 rounded-lg" />
        <SkeletonBlock className="h-8 w-24 rounded-lg" />
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-2">
        <SkeletonBlock className="h-10 flex-1 rounded-lg" />
        <SkeletonBlock className="h-10 w-28 rounded-lg" />
      </div>

      {/* Min/Max Inputs */}
      <div className="flex gap-2">
        <SkeletonBlock className="h-10 flex-1 rounded-lg" />
        <SkeletonBlock className="h-10 flex-1 rounded-lg" />
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-hidden py-1">
        <SkeletonBlock className="h-7 w-14 rounded-full" />
        <SkeletonBlock className="h-7 w-20 rounded-full" />
        <SkeletonBlock className="h-7 w-24 rounded-full" />
        <SkeletonBlock className="h-7 w-20 rounded-full" />
      </div>

      {/* Expense List Items */}
      <div className="space-y-3 pt-2">
        <SkeletonBlock className="h-4 w-28 rounded-md mb-2" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-card/60"
          >
            <div className="flex items-center gap-3">
              <SkeletonBlock className="w-10 h-10 rounded-xl" />
              <div className="space-y-1.5">
                <SkeletonBlock className="h-4 w-32 rounded-md" />
                <SkeletonBlock className="h-3 w-20 rounded-md" />
              </div>
            </div>
            <SkeletonBlock className="h-5 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlannedSkeleton() {
  return (
    <div className="space-y-6 animate-pulse select-none">
      {/* Header */}
      <div className="flex justify-between items-center pt-1">
        <SkeletonBlock className="h-8 w-28 rounded-lg" />
        <SkeletonBlock className="h-8 w-24 rounded-lg" />
      </div>

      {/* Segmented Control / Tabs */}
      <SkeletonBlock className="h-11 w-full rounded-2xl" />

      {/* Summary Card */}
      <div className="p-5 rounded-2xl border border-border/50 bg-card/60 space-y-3">
        <div className="flex justify-between">
          <SkeletonBlock className="h-4 w-28 rounded-md" />
          <SkeletonBlock className="h-4 w-16 rounded-md" />
        </div>
        <SkeletonBlock className="h-8 w-36 rounded-lg" />
        <SkeletonBlock className="h-2 w-full rounded-full" />
      </div>

      {/* Planned Rows */}
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-24 rounded-md mb-2" />
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/60"
          >
            <div className="flex items-center gap-3">
              <SkeletonBlock className="w-9 h-9 rounded-lg" />
              <div className="space-y-1.5">
                <SkeletonBlock className="h-4 w-28 rounded-md" />
                <SkeletonBlock className="h-3 w-16 rounded-md" />
              </div>
            </div>
            <SkeletonBlock className="h-5 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse select-none">
      {/* Header */}
      <div className="flex justify-between items-center pt-1">
        <SkeletonBlock className="h-8 w-32 rounded-lg" />
        <SkeletonBlock className="h-8 w-28 rounded-lg" />
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl border border-border/50 bg-card/60 space-y-2">
          <SkeletonBlock className="h-3.5 w-20 rounded-md" />
          <SkeletonBlock className="h-7 w-28 rounded-lg" />
        </div>
        <div className="p-4 rounded-2xl border border-border/50 bg-card/60 space-y-2">
          <SkeletonBlock className="h-3.5 w-20 rounded-md" />
          <SkeletonBlock className="h-7 w-28 rounded-lg" />
        </div>
      </div>

      {/* Main Chart Placeholder */}
      <div className="p-5 rounded-2xl border border-border/50 bg-card/60 space-y-4">
        <div className="flex justify-between items-center">
          <SkeletonBlock className="h-4 w-32 rounded-md" />
          <SkeletonBlock className="h-4 w-16 rounded-md" />
        </div>
        <SkeletonBlock className="h-56 w-full rounded-xl" />
      </div>

      {/* Category Breakdown list */}
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-36 rounded-md mb-2" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-3.5 rounded-xl border border-border/50 bg-card/60 space-y-2"
          >
            <div className="flex justify-between">
              <SkeletonBlock className="h-4 w-24 rounded-md" />
              <SkeletonBlock className="h-4 w-16 rounded-md" />
            </div>
            <SkeletonBlock className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse select-none">
      {/* Header */}
      <div className="pt-1">
        <SkeletonBlock className="h-8 w-28 rounded-lg" />
      </div>

      {/* User Profile Card */}
      <div className="p-4 rounded-2xl border border-border/50 bg-card/60 flex items-center gap-4">
        <SkeletonBlock className="w-12 h-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <SkeletonBlock className="h-4 w-36 rounded-md" />
          <SkeletonBlock className="h-3 w-48 rounded-md" />
        </div>
      </div>

      {/* Settings Section 1 */}
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-24 rounded-md mb-2" />
        <div className="p-4 rounded-2xl border border-border/50 bg-card/60 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="space-y-1">
                <SkeletonBlock className="h-4 w-28 rounded-md" />
                <SkeletonBlock className="h-3 w-40 rounded-md" />
              </div>
              <SkeletonBlock className="h-6 w-11 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Settings Section 2 */}
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-28 rounded-md mb-2" />
        <div className="p-4 rounded-2xl border border-border/50 bg-card/60 space-y-4">
          <SkeletonBlock className="h-10 w-full rounded-xl" />
          <SkeletonBlock className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
