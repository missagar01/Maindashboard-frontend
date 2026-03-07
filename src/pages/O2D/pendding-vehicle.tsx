"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Truck } from "lucide-react";
import * as o2dAPI from "../../api/o2dAPI";

const COLUMN_DEFINITIONS = [
  { label: "S.No", key: "S_NO" },
  { label: "Gate Entry Time", key: "GATE_ENTRY_TIMESTAMP" },
  { label: "Gate Entry No.", key: "GATE_ENTRY_NUMBER" },
  { label: "Loading Order No.", key: "LOADING_ORDER_NUMBER" },
  { label: "Party Name", key: "PARTY_NAME" },
  { label: "Truck No.", key: "TRUCKNO" },
  { label: "WB Slip", key: "WSLIP_NO" },
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

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const statusColor = (val: string) => {
  const v = val.toLowerCase();
  if (v.includes("done") || v.includes("completed") || v.includes("out")) return "text-emerald-600 font-bold";
  if (v.includes("pending") || v.includes("wait")) return "text-amber-600 font-bold";
  return "text-slate-700";
};

export function PendingVehicles() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await o2dAPI.getProcessTimeline();
      if (response.data?.success && Array.isArray(response.data.rows)) {
        setTimeline(response.data.rows);
      } else {
        throw new Error(response.data?.error || "Unable to fetch process data");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  const memoizedRows = useMemo(() => timeline, [timeline]);

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm px-3 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="bg-blue-600 p-1.5 rounded-lg flex-shrink-0">
            <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">Pending Vehicles</h2>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
              {memoizedRows.length > 0 ? `${memoizedRows.length} vehicle${memoizedRows.length > 1 ? 's' : ''}` : "No records yet"}
            </p>
          </div>
        </div>
        <button
          onClick={fetchTimeline}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-blue-500 text-blue-600 text-xs sm:text-sm font-bold hover:bg-blue-50 transition-all disabled:opacity-50 flex-shrink-0"
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />
          }
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-3 mt-3 px-4 py-3 bg-rose-50 border-l-4 border-rose-500 rounded-lg text-rose-700 text-xs sm:text-sm font-semibold">
          {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && memoizedRows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Loading vehicles...</p>
        </div>
      )}

      {/* ── Table ── */}
      {(!loading || memoizedRows.length > 0) && !error && (
        <div
          className="flex-1 overflow-auto"
          style={{ maxHeight: "calc(100vh - 90px)", WebkitOverflowScrolling: "touch" }}
        >
          <table className="min-w-max text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-800 text-white shadow-md">
              <tr>
                {COLUMN_DEFINITIONS.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap border-r border-slate-700 last:border-0"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {memoizedRows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMN_DEFINITIONS.length} className="px-4 py-16 text-center text-sm text-slate-400 font-medium">
                    No Pending Vehicles. Try refreshing.
                  </td>
                </tr>
              ) : (
                memoizedRows.map((row, index) => (
                  <tr
                    key={`${row.GATE_ENTRY_NUMBER || index}-${index}`}
                    className={`hover:bg-blue-50/40 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                  >
                    {COLUMN_DEFINITIONS.map((col) => {
                      const val = col.key === "S_NO" ? String(index + 1) : formatValue(row[col.key]);
                      const isStatus = col.key.includes("STATUS");
                      return (
                        <td
                          key={col.key}
                          className={`px-3 py-2 text-[10px] sm:text-xs align-middle whitespace-nowrap border-r border-slate-100 last:border-0 ${isStatus && val !== '-' ? statusColor(val) : 'text-slate-700'}`}
                        >
                          {col.key === "S_NO" ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-slate-100 text-slate-600 font-bold text-[9px] sm:text-[10px]">
                              {val}
                            </span>
                          ) : val}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
