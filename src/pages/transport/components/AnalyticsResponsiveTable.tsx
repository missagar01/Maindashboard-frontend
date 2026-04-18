import type { ReactNode } from "react";
import { AnalyticsEmptyState } from "./AnalyticsStates";

export type AnalyticsTableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
};

export const AnalyticsResponsiveTable = <T,>({
  title,
  subtitle,
  columns,
  rows,
  emptyTitle,
  emptyDescription,
  flushOnMobile = false,
  mobileCardClassName = "",
  variant = "card",
}: {
  title: string;
  subtitle?: string;
  columns: AnalyticsTableColumn<T>[];
  rows: T[];
  emptyTitle: string;
  emptyDescription?: string;
  flushOnMobile?: boolean;
  mobileCardClassName?: string;
  variant?: "card" | "flat";
}) => (
  <section
    className={`overflow-hidden ${
      variant === "flat"
        ? "bg-transparent shadow-none border-none p-0"
        : flushOnMobile
          ? "-mx-4 bg-transparent px-0 py-0 shadow-none sm:mx-0 sm:rounded-[30px] sm:border sm:border-slate-200 sm:bg-[linear-gradient(180deg,rgba(248,250,252,0.92),#ffffff_22%)] sm:p-6 sm:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
          : "rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),#ffffff_22%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-6"
    }`}
  >

    <div
      className={`${
        variant === "flat"
          ? "mb-6"
          : flushOnMobile
            ? "mb-4 px-4 pb-0 sm:mb-6 sm:border-b sm:border-slate-200/80 sm:px-0 sm:pb-4"
            : "mb-6 border-b border-slate-200/80 pb-4"
      }`}
    >
      <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
      {subtitle ? <p className="mt-1.5 text-sm font-medium leading-6 text-slate-500">{subtitle}</p> : null}
    </div>

    {rows.length === 0 ? (
      <AnalyticsEmptyState title={emptyTitle} description={emptyDescription} />
    ) : (
      <>
        <div className={`md:hidden ${flushOnMobile ? "space-y-3 px-4" : "space-y-4"}`}>
          {rows.map((row, rowIndex) => (
            <article
              key={rowIndex}
              className={`w-full rounded-3xl border border-slate-200 p-4 shadow-sm ${
                mobileCardClassName || "bg-[linear-gradient(135deg,#ffffff,#f8fafc)]"
              }`}
            >
              <div className="grid gap-3">
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-3 last:border-b-0 last:pb-0"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {column.header}
                    </span>
                    <div className="max-w-[55%] text-right text-sm font-medium text-slate-700">
                      {column.cell(row)}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-[24px] border border-slate-200 md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/90">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="transition hover:bg-blue-50/40">
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="px-4 py-4 text-sm font-medium text-slate-700"
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )}
  </section>
);
