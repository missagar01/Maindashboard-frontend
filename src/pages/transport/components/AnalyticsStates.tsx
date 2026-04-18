import { AlertTriangle, DatabaseZap, RefreshCw } from "lucide-react";

export const AnalyticsEmptyState = ({
  title,
  description,
  className = "",
  iconWrapClassName = "",
  iconClassName = "",
}: {
  title: string;
  description?: string;
  className?: string;
  iconWrapClassName?: string;
  iconClassName?: string;
}) => (
  <div
    className={`flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center ${className}`}
  >
    <div className={`rounded-2xl bg-white p-4 shadow-sm ${iconWrapClassName}`}>
      <DatabaseZap className={`h-8 w-8 text-slate-400 ${iconClassName}`} />
    </div>
    <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
    {description ? (
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    ) : null}
  </div>
);

export const AnalyticsErrorState = ({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) => (
  <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-rose-500" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-rose-900">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-rose-700">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    </div>
  </div>
);

export const AnalyticsKpiGridSkeleton = ({ cards = 4 }: { cards?: number }) => (
  <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
    {Array.from({ length: cards }).map((_, index) => (
      <div
        key={index}
        className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="mt-4 h-9 w-24 rounded-2xl bg-slate-200" />
        <div className="mt-4 h-3 w-20 rounded-full bg-slate-100" />
      </div>
    ))}
  </div>
);

export const AnalyticsChartSkeleton = () => (
  <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="h-5 w-40 rounded-full bg-slate-200" />
    <div className="mt-2 h-3 w-56 rounded-full bg-slate-100" />
    <div className="mt-6 h-[280px] rounded-3xl bg-slate-100" />
  </div>
);

export const AnalyticsTableSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="h-5 w-40 rounded-full bg-slate-200" />
    <div className="mt-2 h-3 w-60 rounded-full bg-slate-100" />
    <div className="mt-6 space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="grid gap-3 rounded-2xl border border-slate-100 p-4 sm:grid-cols-4">
          <div className="h-4 rounded-full bg-slate-100" />
          <div className="h-4 rounded-full bg-slate-100" />
          <div className="h-4 rounded-full bg-slate-100" />
          <div className="h-4 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  </div>
);
