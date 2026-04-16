import { ChevronUp, FileText, Loader2 } from "lucide-react";
import { ReportColumn, ReportConfig } from "../config/reportConfig";

interface ReportTableProps {
  config: ReportConfig;
  data: any[];
  loading: boolean;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onRowClick?: (record: any) => void;
  onSortChange?: (columnKey: string) => void;
  sortState?: Array<{ id: string; desc: boolean }>;
  lastElementRef?: (node: HTMLDivElement | null) => void;
}

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const resolveColumnValue = (record: any, column: ReportColumn) => {
  const keys = column.sourceKeys?.length ? column.sourceKeys : [column.key];

  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
};

const getRowKey = (config: ReportConfig, record: any, index: number) =>
  record?.[config.rowPrimaryKey] ||
  record?.id ||
  record?.key ||
  record?.value ||
  record?.lr_bilty_id ||
  record?.lr_bilty_code ||
  `${config.id}-${index}`;

const renderCellValue = (record: any, column: ReportColumn) => {
  const rawValue = resolveColumnValue(record, column);

  if (!rawValue && rawValue !== 0 && rawValue !== false) {
    return <span className="text-slate-300">--</span>;
  }

  if (column.type === "date") {
    const date = new Date(rawValue);
    return Number.isNaN(date.getTime()) ? (
      <span className="text-slate-500">{String(rawValue)}</span>
    ) : (
      <span className="font-medium text-slate-700">{dateFormatter.format(date)}</span>
    );
  }

  if (column.type === "number") {
    return (
      <span className="font-black tabular-nums text-slate-900">
        {numberFormatter.format(Number(rawValue || 0))}
      </span>
    );
  }

  if (column.type === "status") {
    return (
      <span className="inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">
        {String(rawValue).split("_").join(" ")}
      </span>
    );
  }

  if (column.type === "badge") {
    return (
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
        {String(rawValue)}
      </span>
    );
  }

  if (column.type === "boolean") {
    return (
      <span
        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${Boolean(rawValue)
          ? "border-rose-100 bg-rose-50 text-rose-600"
          : "border-emerald-100 bg-emerald-50 text-emerald-600"
          }`}
      >
        {Boolean(rawValue) ? "Yes" : "No"}
      </span>
    );
  }

  return <span className="font-medium text-slate-700">{String(rawValue)}</span>;
};

export function ReportTable({
  config,
  data,
  loading,
  hasMore,
  isFetchingMore,
  onRowClick,
  onSortChange,
  sortState,
  lastElementRef,
}: ReportTableProps) {
  const activeSort = sortState?.[0] || null;

  if (loading && data.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[20px] border border-slate-200 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
          Loading Data
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden lg:rounded-[20px] lg:border lg:border-slate-200 lg:bg-white lg:shadow-sm">
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full border-collapse text-left">
          <thead className="bg-slate-50/90">
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                #
              </th>
              {config.columns.map((column) => {
                const resolvedSortKey = column.sortKey || column.key;
                const isSorted = activeSort?.id === resolvedSortKey;

                return (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 ${column.align === "right"
                      ? "text-right"
                      : column.align === "center"
                        ? "text-center"
                        : "text-left"
                      }`}
                  >
                    <button
                      type="button"
                      disabled={!column.sortable}
                      onClick={() => column.sortable && onSortChange?.(resolvedSortKey)}
                      className={`inline-flex items-center gap-1.5 ${column.sortable ? "transition hover:text-indigo-600" : "cursor-default"
                        }`}
                    >
                      <span>{column.label}</span>
                      {column.sortable ? (
                        <ChevronUp
                          className={`h-3.5 w-3.5 transition ${isSorted
                            ? activeSort?.desc
                              ? "rotate-180 text-indigo-600"
                              : "text-indigo-600"
                            : "text-slate-300"
                            }`}
                        />
                      ) : null}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.length === 0 ? (
              <tr>
                <td colSpan={config.columns.length + 1} className="px-4 py-20 text-center">
                  <FileText className="mx-auto h-10 w-10 text-slate-200" />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                    No Records Found
                  </p>
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr
                  key={getRowKey(config, record, index)}
                  onClick={() => onRowClick?.(record)}
                  className="cursor-pointer transition hover:bg-slate-50/80"
                >
                  <td className="px-4 py-3.5 text-center text-[10px] font-black text-slate-300">
                    {index + 1}
                  </td>
                  {config.columns.map((column) => (
                    <td
                      key={`${getRowKey(config, record, index)}-${column.key}`}
                      className={`px-4 py-3.5 ${column.align === "right"
                        ? "text-right"
                        : column.align === "center"
                          ? "text-center"
                          : "text-left"
                        }`}
                    >
                      {renderCellValue(record, column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 bg-slate-50/80 py-4 lg:hidden">
        {data.length === 0 ? (
          <div className="mx-4 py-20 text-center bg-white rounded-[24px] border border-slate-100 shadow-sm">
            <FileText className="mx-auto h-12 w-12 text-slate-200" />
            <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              No Records Found
            </p>
          </div>
        ) : (
          data.map((record, index) => {
            const primaryColumn = config.columns[0];
            const statusColumn =
              config.columns.find((item) => item.type === "status") || config.columns[0];

            const colorName = config.color.split("-")[1] || "indigo";

            return (
              <button
                key={getRowKey(config, record, index)}
                type="button"
                onClick={() => onRowClick?.(record)}
                className="group relative block w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] active:scale-[0.97]"
              >
                {/* Dynamic Category Accent */}
                <div className={`absolute left-0 top-0 h-full w-1.5 ${config.color}`} />

                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[11px] font-black text-white shadow-lg">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-black tracking-tight text-slate-900">
                        {renderCellValue(record, primaryColumn)}
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                        Primary Identifier
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 transform transition-transform group-hover:scale-105">
                    {renderCellValue(record, statusColumn)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {config.columns.slice(1).map((column) => (
                    <div
                      key={`${getRowKey(config, record, index)}-${column.key}-mobile`}
                      className="min-w-0"
                    >
                      <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                        <span className={`h-1 w-1 rounded-full bg-${colorName}-400`} />
                        {column.label}
                      </p>
                      <div className="mt-1 truncate text-xs font-bold text-slate-700">
                        {renderCellValue(record, column)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-end border-t border-slate-50 pt-3">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500">
                    Tap To View Details →
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {lastElementRef ? (
        <div
          ref={lastElementRef}
          className="flex min-h-[68px] items-center justify-center border-t border-slate-100 bg-slate-50/60 px-4 py-3"
        >
          {isFetchingMore ? (
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading More
            </div>
          ) : (
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
              {hasMore
                ? "Scroll For More"
                : data.length > 0
                  ? "All Loaded"
                  : "No Data"}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
