"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Truck } from "lucide-react";
import * as o2dAPI from "../../api/o2dAPI";

type TimelineRow = Record<string, unknown>;

type ColumnDefinition = {
  label: string;
  key: string;
};

type MobileSection = {
  title: string;
  fields: ColumnDefinition[];
};

type MobileFieldRowProps = {
  label: string;
  value: string;
  status?: boolean;
};

const COLUMN_DEFINITIONS: ColumnDefinition[] = [
  { label: "S.No", key: "S_NO" },
  { label: "Loading Order No.", key: "LOADING_ORDER_NUMBER" },
  { label: "Party Name", key: "PARTY_NAME" },
  { label: "Truck No.", key: "TRUCKNO" },
  { label: "Gate Entry Time", key: "GATE_ENTRY_TIMESTAMP" },
  { label: "Gate Entry No.", key: "GATE_ENTRY_NUMBER" },
  { label: "1st Wt. Planned", key: "FIRST_WEIGHT_PLANNED" },
  { label: "1st Wt. Actual", key: "FIRST_WEIGHT_ACTUAL" },
  { label: "1st Wt. Status", key: "FIRST_WEIGHT_STATUS" },
  { label: "2nd Wt. Planned", key: "PLANNED_SECOND_WEIGHT" },
  { label: "2nd Wt. Actual", key: "ACTUAL_SECOND_WEIGHT" },
  { label: "2nd Wt. Status", key: "SECOND_WEIGHT_STATUS" },
  { label: "Invoice Planned", key: "PLANNED_INVOICE_TIMESTAMP" },
  { label: "Invoice Actual", key: "ACTUAL_INVOICE_TIMESTAMP" },
  { label: "Invoice Status", key: "INVOICE_STATUS" },
  { label: "Invoice No.", key: "INVOICE_NUMBER" },
  { label: "Gate Out Planned", key: "GATE_OUT_PLANNED" },
  { label: "Gate Out Actual", key: "GATE_OUT_ACTUAL" },
  { label: "Gate Out Status", key: "GATE_OUT_STATUS" },
];

const MOBILE_SUMMARY_FIELDS: ColumnDefinition[] = [
  { label: "Loading Order", key: "LOADING_ORDER_NUMBER" },
  { label: "Gate Entry No.", key: "GATE_ENTRY_NUMBER" },
  { label: "Gate Entry Time", key: "GATE_ENTRY_TIMESTAMP" },
];

const MOBILE_SECTIONS: MobileSection[] = [
  {
    title: "First Weight",
    fields: [
      { label: "Planned", key: "FIRST_WEIGHT_PLANNED" },
      { label: "Actual", key: "FIRST_WEIGHT_ACTUAL" },
      { label: "Status", key: "FIRST_WEIGHT_STATUS" },
    ],
  },
  {
    title: "Second Weight",
    fields: [
      { label: "Planned", key: "PLANNED_SECOND_WEIGHT" },
      { label: "Actual", key: "ACTUAL_SECOND_WEIGHT" },
      { label: "Status", key: "SECOND_WEIGHT_STATUS" },
    ],
  },
  {
    title: "Invoice",
    fields: [
      { label: "Planned", key: "PLANNED_INVOICE_TIMESTAMP" },
      { label: "Actual", key: "ACTUAL_INVOICE_TIMESTAMP" },
      { label: "Status", key: "INVOICE_STATUS" },
      { label: "Invoice No.", key: "INVOICE_NUMBER" },
    ],
  },
  {
    title: "Gate Out",
    fields: [
      { label: "Planned", key: "GATE_OUT_PLANNED" },
      { label: "Actual", key: "GATE_OUT_ACTUAL" },
      { label: "Status", key: "GATE_OUT_STATUS" },
    ],
  },
];

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Failed to load data";
};

const statusTextColor = (value: string) => {
  const normalized = value.toLowerCase();
  if (
    normalized.includes("done") ||
    normalized.includes("completed") ||
    normalized.includes("out")
  ) {
    return "text-emerald-600 font-bold";
  }
  if (normalized.includes("pending") || normalized.includes("wait")) {
    return "text-amber-600 font-bold";
  }
  return "text-slate-700";
};

const statusBadgeTone = (value: string) => {
  const normalized = value.toLowerCase();
  if (
    normalized.includes("done") ||
    normalized.includes("completed") ||
    normalized.includes("out")
  ) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }
  if (normalized.includes("pending") || normalized.includes("wait")) {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
};

const isStatusKey = (key: string) => key.includes("STATUS");

function MobileFieldRow({
  label,
  value,
  status = false,
}: MobileFieldRowProps) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-2 py-1.5">
      <div className="pt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="min-w-0 break-words text-[12px] font-semibold leading-4 text-slate-800">
        {status && value !== "-" ? (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${statusBadgeTone(
              value
            )}`}
          >
            {value}
          </span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

export function PendingVehicles() {
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await o2dAPI.getProcessTimeline();
      if (response.data?.success && Array.isArray(response.data.rows)) {
        setTimeline(response.data.rows as TimelineRow[]);
      } else {
        throw new Error(response.data?.error || "Unable to fetch process data");
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return (
    <div className="flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-slate-50">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-2 py-2 shadow-sm sm:gap-3 sm:px-5 sm:py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex-shrink-0 rounded-lg bg-blue-600 p-1.5">
            <Truck className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black leading-tight text-slate-900 sm:text-base">
              Pending Vehicles
            </h2>
            <p className="text-[9px] font-medium text-slate-400 sm:text-[10px]">
              {timeline.length > 0
                ? `${timeline.length} vehicle${timeline.length > 1 ? "s" : ""}`
                : "No records yet"}
            </p>
          </div>
        </div>
        <button
          onClick={fetchTimeline}
          disabled={loading}
          className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-blue-500 px-2.5 py-1.5 text-[11px] font-bold text-blue-600 transition-all hover:bg-blue-50 disabled:opacity-50 sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="mx-2 mt-2 rounded-lg border-l-4 border-rose-500 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 sm:mx-3 sm:mt-3 sm:px-4 sm:py-3 sm:text-sm">
          {error}
        </div>
      )}

      {loading && timeline.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-slate-500">Loading vehicles...</p>
        </div>
      )}

      {(!loading || timeline.length > 0) && !error && (
        <>
          <div className="flex-1 px-1.5 py-1.5 sm:hidden">
            {timeline.length === 0 ? (
              <div className="flex min-h-[50vh] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 text-center text-sm font-medium text-slate-400">
                No Pending Vehicles. Try refreshing.
              </div>
            ) : (
              <div className="space-y-1.5">
                {timeline.map((row, index) => (
                  <article
                    key={`${row.GATE_ENTRY_NUMBER || index}-${index}`}
                    className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 bg-slate-900 px-3 py-2 text-white">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                          Vehicle
                        </div>
                        <div className="truncate text-sm font-black">
                          {formatValue(row.TRUCKNO)}
                        </div>
                        <div className="truncate text-[11px] text-slate-300">
                          {formatValue(row.PARTY_NAME)}
                        </div>
                      </div>
                      <span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-white/10 px-2 py-1 text-[11px] font-black">
                        {index + 1}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 px-3 py-1">
                      <div className="py-1.5">
                        {MOBILE_SUMMARY_FIELDS.map((field) => (
                          <MobileFieldRow
                            key={field.key}
                            label={field.label}
                            value={formatValue(row[field.key])}
                          />
                        ))}
                      </div>

                      {MOBILE_SECTIONS.map((section) => (
                        <section
                          key={section.title}
                          className="py-2"
                        >
                          <div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                            {section.title}
                          </div>
                          <div>
                            {section.fields.map((field) => {
                              const value = formatValue(row[field.key]);
                              const status = isStatusKey(field.key);

                              return (
                                <MobileFieldRow
                                  key={field.key}
                                  label={field.label}
                                  value={value}
                                  status={status}
                                />
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div
            className="hidden flex-1 overflow-auto sm:block"
            style={{ maxHeight: "calc(100vh - 90px)", WebkitOverflowScrolling: "touch" }}
          >
            <table className="min-w-max border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-slate-800 text-white shadow-md">
                <tr>
                  {COLUMN_DEFINITIONS.map((col) => (
                    <th
                      key={col.key}
                      className="whitespace-nowrap border-r border-slate-700 px-3 py-2.5 text-[9px] font-black uppercase tracking-wider last:border-0 sm:text-[10px]"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {timeline.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COLUMN_DEFINITIONS.length}
                      className="px-4 py-16 text-center text-sm font-medium text-slate-400"
                    >
                      No Pending Vehicles. Try refreshing.
                    </td>
                  </tr>
                ) : (
                  timeline.map((row, index) => (
                    <tr
                      key={`${row.GATE_ENTRY_NUMBER || index}-${index}`}
                      className={`transition-colors hover:bg-blue-50/40 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      {COLUMN_DEFINITIONS.map((col) => {
                        const value =
                          col.key === "S_NO"
                            ? String(index + 1)
                            : formatValue(row[col.key]);
                        const status = isStatusKey(col.key);

                        return (
                          <td
                            key={col.key}
                            className={`whitespace-nowrap border-r border-slate-100 px-3 py-2 text-[10px] align-middle last:border-0 sm:text-xs ${
                              status && value !== "-"
                                ? statusTextColor(value)
                                : "text-slate-700"
                            }`}
                          >
                            {col.key === "S_NO" ? (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-[9px] font-bold text-slate-600 sm:h-6 sm:w-6 sm:text-[10px]">
                                {value}
                              </span>
                            ) : (
                              value
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
