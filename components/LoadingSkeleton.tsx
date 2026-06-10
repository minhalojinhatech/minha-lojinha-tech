import type { ReactNode } from "react";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span className={`block animate-pulse rounded-sm bg-gray-200 ${className}`} aria-hidden="true" />;
}

export function MetricSkeletons({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="min-h-[116px] border border-line bg-white p-4">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="mt-4 h-7 w-20" />
          <SkeletonBlock className="mt-3 h-3 w-32" />
        </div>
      ))}
    </>
  );
}

export function CardListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="border border-line bg-white p-5">
          <div className="flex items-start gap-4">
            <SkeletonBlock className="size-12 shrink-0" />
            <div className="flex-1">
              <SkeletonBlock className="h-5 w-44 max-w-full" />
              <SkeletonBlock className="mt-3 h-3 w-64 max-w-full" />
              <SkeletonBlock className="mt-2 h-3 w-48 max-w-full" />
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SkeletonBlock className="h-20 w-full" />
            <SkeletonBlock className="h-20 w-full" />
          </div>
        </div>
      ))}
    </>
  );
}

export function TableRowsSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} className="border-t border-line">
          {Array.from({ length: columns }, (_, column) => (
            <td key={column} className="px-4 py-4">
              <SkeletonBlock className={`h-4 ${column === 0 ? "w-28" : "w-20"}`} />
              {column < 2 ? <SkeletonBlock className="mt-2 h-3 w-16" /> : null}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function InlineLoading({ label = "Carregando informações" }: { label?: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center border border-line bg-white p-5" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-gray-200 border-t-ink" />
      <span className="ml-3 text-sm font-medium text-gray-600">{label}...</span>
    </div>
  );
}

export function LoadingSection({ children }: { children: ReactNode }) {
  return <div className="animate-pulse" aria-hidden="true">{children}</div>;
}
