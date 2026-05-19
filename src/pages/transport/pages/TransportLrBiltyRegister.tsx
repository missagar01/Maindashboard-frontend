import { useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet,
  MapPinned,
  RefreshCw,
  Route,
  Search,
  Truck,
  UserRound,
} from "lucide-react";
import {
  fetchLrBiltyRegisterReport,
  type LrBiltyRegisterRecord,
} from "../../../api/transport/lrBiltyRegisterApi";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const quantityFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const mobileCardGradients = [
  "from-slate-950 via-sky-950 to-cyan-900",
  "from-emerald-950 via-teal-900 to-sky-900",
  "from-indigo-950 via-blue-900 to-cyan-800",
  "from-zinc-950 via-stone-900 to-amber-800",
  "from-fuchsia-950 via-violet-900 to-indigo-900",
  "from-rose-950 via-pink-900 to-purple-900",
];

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

const formatQuantity = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? quantityFormatter.format(parsed) : "--";
};

const getDriverName = (record: LrBiltyRegisterRecord) =>
  safeText(record.driver_name || record.lr_bilty_driver_name);

const getStatus = (record: LrBiltyRegisterRecord) =>
  safeText(record.lr_bilty_status || record.status);

const getRouteLabel = (record: LrBiltyRegisterRecord) =>
  `${safeText(record.source_name)} -> ${safeText(record.destination_name)}`;

const searchableValues = (record: LrBiltyRegisterRecord) => [
  record.lr_bilty_code,
  record.branch_name,
  record.consignor_name,
  record.consignee_name,
  record.vehicle_no,
  record.driver_name,
  record.lr_bilty_driver_name,
  record.source_name,
  record.destination_name,
  record.status,
  record.lr_bilty_status,
  record.approval_status,
  record.transporter_name,
  record.item_name,
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

  return "LR Bilty Register data load nahi ho paya.";
};

export default function TransportLrBiltyRegister() {
  const [records, setRecords] = useState<LrBiltyRegisterRecord[]>([]);
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
      const response = await fetchLrBiltyRegisterReport({}, signal);
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
      const recordDate = getDateKey(record.lr_bilty_date);

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
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-600">
                Transport Reports
              </p>
              <h1 className="mt-1 truncate text-xl font-black text-slate-900 sm:text-3xl">
                LR Bilty Register
              </h1>
              <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                Desktop me table view aur mobile me gradient card view.
              </p>
            </div>

            <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-end">
              <div className="relative min-w-0 sm:w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search LR, party, vehicle, route..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-400"
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
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-sky-700">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Fetching live report data...
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
                Total Rows
              </p>
              <p className="mt-1 text-lg font-black text-slate-900 sm:text-2xl">
                {isFetching ? "..." : filteredRecords.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-sky-50 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-500">
                Vehicles
              </p>
              <p className="mt-1 text-lg font-black text-slate-900 sm:text-2xl">
                {isFetching
                  ? "..."
                  : new Set(filteredRecords.map((record) => safeText(record.vehicle_no))).size}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-violet-50 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-500">
                Drivers
              </p>
              <p className="mt-1 text-lg font-black text-slate-900 sm:text-2xl">
                {isFetching
                  ? "..."
                  : new Set(filteredRecords.map((record) => getDriverName(record))).size}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-emerald-50 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-500">
                Quantity
              </p>
              <p className="mt-1 text-lg font-black text-slate-900 sm:text-2xl">
                {isFetching
                  ? "..."
                  : quantityFormatter.format(
                      filteredRecords.reduce(
                        (total, record) => total + Number(record.lr_bilty_qty || 0),
                        0
                      )
                    )}
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
              <table className="min-w-[1380px] w-full text-left">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    {[
                      "LR Code",
                      "LR Date",
                      "Branch",
                      "Consignor",
                      "Consignee",
                      "Vehicle",
                      "Driver",
                      "Qty",
                      "Route",
                      "Status",
                      "Approval",
                    ].map((label) => (
                      <th
                        key={label}
                        className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em]"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isFetching ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-4 py-20 text-center"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <RefreshCw className="h-8 w-8 animate-spin text-sky-600" />
                          <p className="mt-3 text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                            Loading LR Bilty Register
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-4 py-16 text-center text-sm font-semibold text-slate-500"
                      >
                        Search ya date filter ke hisaab se koi record nahi mila.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => (
                      <tr
                        key={record.lr_bilty_id || record.lr_bilty_code}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-black text-slate-900">
                          {safeText(record.lr_bilty_code)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-600">
                          {formatDate(record.lr_bilty_date)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                          {safeText(record.branch_name)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {safeText(record.consignor_name)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {safeText(record.consignee_name)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                          {safeText(record.vehicle_no)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {getDriverName(record)}
                        </td>
                        <td className="px-4 py-3 text-sm font-black text-slate-900">
                          {formatQuantity(record.lr_bilty_qty)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {getRouteLabel(record)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-sky-700">
                            {getStatus(record)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                            {safeText(record.approval_status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="relative lg:hidden">
            {refreshing ? (
              <div className="sticky top-0 z-10 flex items-center justify-center bg-slate-950/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">
                <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                Updating records...
              </div>
            ) : null}
            {isFetching ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center bg-white px-4 text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-sky-600" />
                <p className="mt-3 text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                  Loading LR Bilty Register
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
                const gradient = mobileCardGradients[index % mobileCardGradients.length];

                return (
                  <article
                    key={record.lr_bilty_id || `${record.lr_bilty_code}-${index}`}
                    className={`border-b border-white/10 bg-gradient-to-r ${gradient} px-3 py-2.5 text-white`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-base font-black tracking-tight">
                          {safeText(record.lr_bilty_code)}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-white/75">
                          {formatDate(record.lr_bilty_date)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white">
                        {getStatus(record)}
                      </span>
                    </div>

                    <div className="mt-2 space-y-2">
                      <div className="flex items-start justify-between gap-3 border-t border-white/15 pt-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/60">
                            Branch
                          </p>
                          <p className="mt-0.5 text-xs font-bold">
                            {safeText(record.branch_name)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/60">
                            Quantity
                          </p>
                          <p className="mt-0.5 text-xs font-bold">
                            {formatQuantity(record.lr_bilty_qty)} {safeText(record.measuring_unit_name, "")}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-white/15 pt-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/60">
                          Consignor {"->"} Consignee
                        </p>
                        <p className="mt-0.5 text-xs font-bold leading-5">
                          {safeText(record.consignor_name)} {"->"} {safeText(record.consignee_name)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/15 pt-2">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/60">
                            <Truck className="h-3.5 w-3.5" />
                            Vehicle
                          </p>
                          <p className="mt-0.5 text-xs font-bold">
                            {safeText(record.vehicle_no)}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/60">
                            <UserRound className="h-3.5 w-3.5" />
                            Driver
                          </p>
                          <p className="mt-0.5 text-xs font-bold">
                            {getDriverName(record)}
                          </p>
                        </div>

                        <div className="col-span-2 min-w-0">
                          <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/60">
                            <Route className="h-3.5 w-3.5" />
                            Route
                          </p>
                          <p className="mt-0.5 text-xs font-bold leading-5">
                            {getRouteLabel(record)}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/60">
                            Approval
                          </p>
                          <p className="mt-0.5 text-xs font-bold">
                            {safeText(record.approval_status)}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/60">
                            <MapPinned className="h-3.5 w-3.5" />
                            Item
                          </p>
                          <p className="mt-0.5 text-xs font-bold">
                            {safeText(record.item_name)}
                          </p>
                        </div>
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
