import { useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet,
  RefreshCw,
  Search,
  Truck,
  UserRound,
  CalendarDays,
  Activity,
  Layers,
} from "lucide-react";
import {
  fetchEquipmentShiftChangeList,
  type EquipmentShiftChangeRecord,
} from "../../../api/transport/equipmentShiftChangeApi";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const safeText = (value: unknown, fallback = "--") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const padDateSegment = (value: number) => String(value).padStart(2, "0");

const getDateKey = (value: unknown) => {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return "";

  const isoDateMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) {
    return isoDateMatch[1];
  }

  const parsedDate = new Date(rawValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return `${parsedDate.getFullYear()}-${padDateSegment(
    parsedDate.getMonth() + 1
  )}-${padDateSegment(parsedDate.getDate())}`;
};

const formatDate = (value: unknown) => {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return "--";

  const dateKey = getDateKey(rawValue);
  if (!dateKey) {
    return rawValue;
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  return dateFormatter.format(new Date(year, month - 1, day));
};

const getBranchName = (record: EquipmentShiftChangeRecord) => {
  return safeText(
    record.Branch?.label ||
    record.Branch?.name ||
    record.branch_name ||
    record.branch?.name ||
    record.branch?.branch_name ||
    record.branch_code
  );
};

const getShiftName = (record: EquipmentShiftChangeRecord) => {
  return safeText(
    record.ShiftMaster?.label ||
    record.ShiftMaster?.name ||
    record.shift_master_name ||
    record.shift_master?.name ||
    record.shift_master?.shift_name ||
    record.shift?.name ||
    record.shift_name
  );
};

const getEquipmentName = (record: EquipmentShiftChangeRecord) => {
  const details = Array.isArray(record.ShiftHandoverDetails) ? record.ShiftHandoverDetails : [];
  if (details.length > 0) {
    const equipmentNames = details
      .map((detail) => detail.Equipment?.label || detail.Equipment?.name || detail.door_number || detail.equipment_name)
      .map((name) => String(name ?? "").trim())
      .filter(Boolean);
    if (equipmentNames.length > 0) {
      return equipmentNames.join(", ");
    }
  }
  return safeText(
    record.equipment_name ||
    record.equipment?.name ||
    record.equipment?.equipment_name ||
    record.equipment_code
  );
};

const getDriverName = (record: EquipmentShiftChangeRecord) => {
  const details = Array.isArray(record.ShiftHandoverDetails) ? record.ShiftHandoverDetails : [];
  if (details.length > 0) {
    const driverNames = details
      .map((detail) => detail.Driver?.label || detail.Driver?.name || detail.driver_name || detail.operator_name)
      .map((name) => String(name ?? "").trim())
      .filter(Boolean);
    if (driverNames.length > 0) {
      return driverNames.join(", ");
    }
  }
  return safeText(
    record.driver_name ||
    record.driver?.name ||
    record.driver?.driver_name ||
    record.operator_name ||
    record.operator?.name
  );
};

const getStatus = (record: EquipmentShiftChangeRecord) => {
  return safeText(record.status || record.shift_status || "PENDING");
};

const getStatusBadgeClass = (record: EquipmentShiftChangeRecord) => {
  const status = getStatus(record).toUpperCase();

  if (status === "COMPLETED" || status === "APPROVED") {
    return "border border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (status === "FAILED" || status === "CANCELLED") {
    return "border border-rose-100 bg-rose-50 text-rose-700";
  }

  return "border border-amber-100 bg-amber-50 text-amber-700";
};

const getHandoverDetails = (record: EquipmentShiftChangeRecord) => {
  const details = Array.isArray(record.ShiftHandoverDetails) ? record.ShiftHandoverDetails : [];
  if (details.length > 0) {
    const remarks = details
      .map((detail) => detail.remark || detail.remarks || detail.handover_details)
      .map((remark) => String(remark ?? "").trim())
      .filter(Boolean);
    if (remarks.length > 0) {
      return remarks.join(", ");
    }
  }
  return safeText(
    record.handover_details ||
    record.shift_handover_details ||
    record.remarks ||
    record.description
  );
};

const searchableValues = (record: EquipmentShiftChangeRecord) => [
  record.code,
  record.id,
  getBranchName(record),
  getShiftName(record),
  getEquipmentName(record),
  getDriverName(record),
  getStatus(record),
  getHandoverDetails(record),
];

const isAbortLikeError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const errorName = String((error as { name?: unknown }).name || "");
  return errorName === "CanceledError" || errorName === "AbortError";
};

const getLoadErrorMessage = (error: unknown) => {
  if (error && typeof error === "object") {
    const typedError = error as {
      message?: unknown;
      response?: {
        data?: {
          message?: unknown;
        };
      };
    };

    const responseMessage = typedError.response?.data?.message;
    if (typeof responseMessage === "string" && responseMessage.trim()) {
      return responseMessage;
    }

    if (typeof typedError.message === "string" && typedError.message.trim()) {
      return typedError.message;
    }
  }

  return "Equipment Shift Change list load nahi ho paya.";
};

export default function TransportEquipmentShiftChange() {
  const [records, setRecords] = useState<EquipmentShiftChangeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const isFetching = loading || refreshing;
  const hasDateFilter = Boolean(fromDate || toDate);

  const loadRecords = async (signal?: AbortSignal, showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetchEquipmentShiftChangeList({}, signal);
      setRecords(Array.isArray(response.records) ? response.records : []);
    } catch (loadError: unknown) {
      if (isAbortLikeError(loadError)) {
        return;
      }

      setError(getLoadErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadRecords(controller.signal);

    return () => controller.abort();
  }, []);

  const filteredRecords = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return records.filter((record) => {
      const recordDate = getDateKey(record.date || record.created_at || record.createdAt);

      if (fromDate && (!recordDate || recordDate < fromDate)) {
        return false;
      }

      if (toDate && (!recordDate || recordDate > toDate)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return searchableValues(record).some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      );
    });
  }, [fromDate, records, searchTerm, toDate]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-2 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-600">
                Fleet Operations
              </p>
              <h1 className="mt-1 truncate text-xl font-black text-slate-900 sm:text-3xl">
                Equipment Shift Change
              </h1>
             
            </div>

            <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-end">
              <div className="relative min-w-0 sm:w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search code, equipment, driver, branch..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white px-3 py-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    From Date
                  </span>
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate || undefined}
                    onChange={(event) => setFromDate(event.target.value)}
                    className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-700 outline-none [color-scheme:light]"
                  />
                </label>

                <label className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white px-3 py-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    To Date
                  </span>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(event) => setToDate(event.target.value)}
                    className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-700 outline-none [color-scheme:light]"
                  />
                </label>
              </div>

              {hasDateFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Clear Dates
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => loadRecords(undefined, true)}
                disabled={loading || refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {isFetching ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-indigo-700">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Fetching live shift-change data...
            </div>
          ) : null}

          {hasDateFilter ? (
            <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-violet-700">
              <span>Date Filter</span>
              <span className="text-xs font-semibold normal-case tracking-normal text-violet-900">
                {fromDate ? formatDate(fromDate) : "Start"} - {toDate ? formatDate(toDate) : "End"}
              </span>
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Total Changes
              </p>
              <p className="mt-1 text-lg font-black text-slate-900 sm:text-2xl">
                {isFetching ? "..." : filteredRecords.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-indigo-50 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-500">
                Equipments
              </p>
              <p className="mt-1 text-lg font-black text-slate-900 sm:text-2xl">
                {isFetching
                  ? "..."
                  : new Set(filteredRecords.map((record) => getEquipmentName(record))).size}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-violet-50 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-500">
                Drivers/Ops
              </p>
              <p className="mt-1 text-lg font-black text-slate-900 sm:text-2xl">
                {isFetching
                  ? "..."
                  : new Set(filteredRecords.map((record) => getDriverName(record))).size}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-emerald-50 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-500">
                Active Shifts
              </p>
              <p className="mt-1 text-lg font-black text-slate-900 sm:text-2xl">
                {isFetching
                  ? "..."
                  : new Set(filteredRecords.map((record) => getShiftName(record))).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-0 py-0 sm:px-5 sm:py-5">
        {error ? (
          <div className="mx-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 sm:mx-0">
            {error}
          </div>
        ) : null}

        <>
          <div className="relative hidden overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm lg:block">
            {refreshing ? (
              <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Updating...
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full text-left table-fixed">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="w-[12%] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em]">Code</th>
                    <th className="w-[12%] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em]">Date</th>
                    <th className="w-[15%] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em]">Branch</th>
                    <th className="w-[12%] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em]">Shift</th>
                    <th className="w-[15%] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em]">Equipment</th>
                    <th className="w-[15%] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em]">Driver/Operator</th>
                    <th className="w-[13%] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isFetching ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                          <p className="mt-3 text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                            Loading Shift Changes
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-sm font-semibold text-slate-500">
                        Shift change records nahi mile.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record, index) => (
                      <tr key={record.id || `${record.code}-${index}`} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3 font-black text-slate-900 truncate">
                          {safeText(record.code)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-600 truncate">
                          {formatDate(record.date || record.created_at || record.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700 truncate">
                          {getBranchName(record)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-600 truncate">
                          {getShiftName(record)}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-700 truncate">
                          {getEquipmentName(record)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 truncate">
                          {getDriverName(record)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusBadgeClass(
                              record
                            )}`}
                          >
                            {getStatus(record)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile view */}
          <div className="relative lg:hidden">
            {refreshing ? (
              <div className="sticky top-0 z-10 flex items-center justify-center bg-slate-950/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">
                <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                Updating records...
              </div>
            ) : null}
            {isFetching ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center bg-white px-4 text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="mt-3 text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                  Loading Shift Changes
                </p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center bg-white px-4 text-center">
                <FileSpreadsheet className="h-10 w-10 text-slate-200" />
                <p className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                  No Records Found
                </p>
              </div>
            ) : (
              filteredRecords.map((record, index) => {
                return (
                  <article
                    key={record.id || `${record.code}-${index}`}
                    className="mx-2 mb-3 overflow-hidden rounded-[24px] border border-slate-200 bg-white px-3 py-3 text-slate-900 shadow-sm first:mt-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-base font-black tracking-tight text-slate-900">
                          {safeText(record.code)}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                          <CalendarDays className="h-3 w-3 text-slate-400" />
                          {formatDate(record.date || record.created_at || record.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${getStatusBadgeClass(
                          record
                        )}`}
                      >
                        {getStatus(record)}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex items-start justify-between gap-3 border-t border-slate-100 pt-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Branch
                          </p>
                          <p className="mt-0.5 truncate text-xs font-bold text-slate-800">
                            {getBranchName(record)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Active Shift
                          </p>
                          <p className="mt-0.5 flex items-center justify-end gap-1 text-xs font-bold text-slate-800">
                            <Layers className="h-3 w-3 text-indigo-500" />
                            {getShiftName(record)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-2">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                            <Truck className="h-3.5 w-3.5 text-sky-500" />
                            Equipment
                          </p>
                          <p className="mt-0.5 truncate text-xs font-bold text-slate-800">
                            {getEquipmentName(record)}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                            <UserRound className="h-3.5 w-3.5 text-emerald-500" />
                            Driver/Operator
                          </p>
                          <p className="mt-0.5 truncate text-xs font-bold text-slate-800">
                            {getDriverName(record)}
                          </p>
                        </div>

                        {getHandoverDetails(record) !== "--" ? (
                          <div className="col-span-2 min-w-0">
                            <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                              <Activity className="h-3.5 w-3.5 text-amber-500" />
                              Handover details
                            </p>
                            <p className="mt-0.5 text-xs font-medium italic leading-relaxed text-slate-600">
                              {getHandoverDetails(record)}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      </div>
    </div>
  );
}
