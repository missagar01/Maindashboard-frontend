"use client";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Truck, X } from "lucide-react";
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
  fullWidth?: boolean;
};

type LoadingOrderDetail = {
  item_name: string;
  qtyorder: number | string | null;
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
  fullWidth = false,
}: MobileFieldRowProps) {
  return (
    <div className={`min-w-0 ${fullWidth ? "col-span-2" : ""}`}>
      <div className="truncate text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>
      <div className="min-w-0 break-words text-[11px] font-semibold leading-4 text-slate-800">
        {status && value !== "-" ? (
          <span
            className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold ${statusBadgeTone(
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
  const [selectedRow, setSelectedRow] = useState<TimelineRow | null>(null);
  const [detailRows, setDetailRows] = useState<LoadingOrderDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const openDetails = useCallback((row: TimelineRow) => {
    setSelectedRow(row);
  }, []);

  const closeDetails = useCallback(() => {
    setSelectedRow(null);
    setDetailRows([]);
    setDetailsLoading(false);
    setDetailsError(null);
  }, []);

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

  useEffect(() => {
    if (!selectedRow) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDetails();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDetails, selectedRow]);

  useEffect(() => {
    if (!selectedRow) return;

    let active = true;
    const loadingOrderNumber = String(
      selectedRow.LOADING_ORDER_NUMBER || ""
    ).trim();

    if (!loadingOrderNumber) {
      setDetailRows([]);
      setDetailsError("Loading order number not found");
      setDetailsLoading(false);
      return;
    }

    setDetailsLoading(true);
    setDetailsError(null);
    setDetailRows([]);

    (async () => {
      try {
        const response = await o2dAPI.getProcessTimelineDetails(loadingOrderNumber);
        if (!active) return;

        if (response.data?.success && Array.isArray(response.data.rows)) {
          setDetailRows(response.data.rows as LoadingOrderDetail[]);
        } else {
          throw new Error(
            response.data?.error || response.data?.message || "Unable to fetch loading order details"
          );
        }
      } catch (err: unknown) {
        if (!active) return;
        setDetailsError(getErrorMessage(err));
        setDetailRows([]);
      } finally {
        if (active) {
          setDetailsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedRow]);

  const handleRowKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>,
    row: TimelineRow
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetails(row);
    }
  };

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
          <div className="flex-1 px-0 py-0.5 sm:hidden">
            {timeline.length === 0 ? (
              <div className="flex min-h-[50vh] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 text-center text-sm font-medium text-slate-400">
                No Pending Vehicles. Try refreshing.
              </div>
            ) : (
              <div className="space-y-1">
                {timeline.map((row, index) => (
                  <article
                    key={`${row.GATE_ENTRY_NUMBER || index}-${index}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetails(row)}
                    onKeyDown={(event) => handleRowKeyDown(event, row)}
                    className="w-full cursor-pointer overflow-hidden rounded-md border border-slate-200 bg-white transition-colors hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <div className="flex items-start justify-between gap-2 bg-slate-900 px-2 py-1.5 text-white">
                      <div className="min-w-0">
                        <div className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                          Vehicle
                        </div>
                        <div className="truncate text-[15px] font-black leading-5">
                          {formatValue(row.TRUCKNO)}
                        </div>
                        <div className="truncate text-[10px] text-slate-300">
                          {formatValue(row.PARTY_NAME)}
                        </div>
                      </div>
                      <span className="inline-flex min-w-7 items-center justify-center rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-black">
                        {index + 1}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 px-2 py-1">
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 py-1">
                        {MOBILE_SUMMARY_FIELDS.map((field) => (
                          <MobileFieldRow
                            key={field.key}
                            label={field.label}
                            value={formatValue(row[field.key])}
                            fullWidth={
                              MOBILE_SUMMARY_FIELDS.length % 2 === 1 &&
                              field.key ===
                                MOBILE_SUMMARY_FIELDS[MOBILE_SUMMARY_FIELDS.length - 1]
                                  ?.key
                            }
                          />
                        ))}
                      </div>

                      {MOBILE_SECTIONS.map((section) => (
                        <section
                          key={section.title}
                          className="py-1"
                        >
                          <div className="mb-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                            {section.title}
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                            {section.fields.map((field, fieldIndex) => {
                              const value = formatValue(row[field.key]);
                              const status = isStatusKey(field.key);

                              return (
                                <MobileFieldRow
                                  key={field.key}
                                  label={field.label}
                                  value={value}
                                  status={status}
                                  fullWidth={
                                    section.fields.length % 2 === 1 &&
                                    fieldIndex === section.fields.length - 1
                                  }
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
                      role="button"
                      tabIndex={0}
                      onClick={() => openDetails(row)}
                      onKeyDown={(event) => handleRowKeyDown(event, row)}
                      className={`transition-colors hover:bg-blue-50/40 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      } cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/40`}
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

      {selectedRow && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px]"
          onClick={closeDetails}
        >
          <div className="flex h-full w-full items-center justify-center p-2 sm:p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pending-vehicle-modal-title"
              className="relative flex w-[min(100vw-16px,560px)] max-h-[86dvh] flex-col overflow-hidden rounded-xl bg-white shadow-[0_18px_48px_rgba(15,23,42,0.2)] sm:w-[min(100vw-32px,680px)] sm:max-h-[88dvh] md:w-[min(100vw-48px,760px)] lg:w-[min(100vw-64px,820px)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-slate-100 bg-slate-900 px-2 py-1.5 text-white sm:px-3 sm:py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Loading Order Details
                    </div>
                    <h3
                      id="pending-vehicle-modal-title"
                      className="truncate text-[15px] font-black leading-5 sm:text-lg"
                    >
                      {formatValue(selectedRow.LOADING_ORDER_NUMBER)}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeDetails}
                    aria-label="Close modal"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/20 bg-white text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-0 py-0">
                {detailsLoading ? (
                  <div className="flex items-center justify-center px-2 py-8 text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : detailsError ? (
                  <div className="px-2 py-3 text-[11px] font-semibold text-rose-600">
                    {detailsError}
                  </div>
                ) : detailRows.length === 0 ? (
                  <div className="px-2 py-3 text-[11px] font-semibold text-slate-500">
                    No loading order details found.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-[minmax(0,1fr)_76px] border-b border-slate-100 bg-slate-50 px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500 sm:grid-cols-[minmax(0,1fr)_92px] sm:px-3">
                      <div>Item Name</div>
                      <div className="text-right">Qty</div>
                    </div>
                    {detailRows.map((detail, index) => (
                      <div
                        key={`${detail.item_name}-${index}`}
                        className="grid grid-cols-[minmax(0,1fr)_76px] border-b border-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-800 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_92px] sm:px-3 sm:text-[12px]"
                      >
                        <div className="min-w-0 break-words">
                          {formatValue(detail.item_name)}
                        </div>
                        <div className="pl-2 text-right">
                          {formatValue(detail.qtyorder)}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
