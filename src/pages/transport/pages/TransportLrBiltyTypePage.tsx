import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Calendar,
  ChevronLeft,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import { transportReportEndpoints } from "../../../api/transport/reportApi";
import { ReportRowDetailsDrawer } from "../components/ReportRowDetailsDrawer";
import { ReportTable } from "../components/ReportTable";
import type { ReportConfig } from "../config/reportConfig";
import { useTransportReport } from "../hooks/useTransportReport";

type LoadingOrderType = "INWARD" | "OUTWARD";

interface TransportLrBiltyTypePageProps {
  loadingOrderType: LoadingOrderType;
  title: string;
  accentColor: string;
  accentText: string;
}

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const formatDateForFilter = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentMonthRange = () => {
  const now = new Date();
  return {
    fromDate: formatDateForFilter(new Date(now.getFullYear(), now.getMonth(), 1)),
    toDate: formatDateForFilter(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

const toNumber = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const uniqueCount = (records: any[], keys: string[]) =>
  new Set(
    records
      .map((record) =>
        keys
          .map((key) => record?.[key])
          .find((value) => value !== undefined && value !== null && value !== "")
      )
      .filter(Boolean)
  ).size;

const sumByKeys = (records: any[], keys: string[]) =>
  records.reduce((total, record) => {
    const match = keys
      .map((key) => record?.[key])
      .find((value) => value !== undefined && value !== null && value !== "");
    return total + toNumber(match);
  }, 0);

const buildStats = (records: any[], totalCount: number) => {
  const quantity = sumByKeys(records, ["lr_bilty_qty"]);
  const received = sumByKeys(records, ["received_quantity"]);
  const shortage = sumByKeys(records, ["shortage_qty"]);
  const vehicles = uniqueCount(records, ["vehicle_no"]);
  const customers = uniqueCount(records, ["bill_to_name"]);

  return [
    { label: "Total Rows", value: numberFormatter.format(totalCount || records.length) },
    { label: "Total Qty", value: numberFormatter.format(quantity) },
    { label: "Received Qty", value: numberFormatter.format(received) },
    { label: "Shortage Qty", value: numberFormatter.format(shortage) },
    { label: "Vehicles", value: numberFormatter.format(vehicles) },
    { label: "Customers", value: numberFormatter.format(customers) },
  ];
};

const buildReportConfig = (
  title: string,
  accentColor: string,
  loadingOrderType: LoadingOrderType
): ReportConfig => ({
  id: `${loadingOrderType.toLowerCase()}-lr-bilty-report`,
  title,
  description: `${title} current month data`,
  category: "transportation",
  icon: Truck,
  color: accentColor,
  endpoint: transportReportEndpoints.lrBilty,
  serviceKey: "lrBilty",
  rowPrimaryKey: "lr_bilty_id",
  statsKind: "lr",
  searchPlaceholder: "Search LR, party, vehicle, transporter, material",
  defaultFilters: {
    loadingOrderType,
  },
  defaultSort: [{ id: "lr_bilty_date", desc: true }],
  filters: [],
  columns: [
    {
      key: "lr_bilty_code",
      label: "LR Code",
      sortable: true,
      sourceKeys: ["lr_bilty_code", "label"],
    },
    {
      key: "lr_bilty_date",
      label: "LR Date",
      type: "date",
      sortable: true,
    },
    {
      key: "branch_name",
      label: "Branch",
      sortable: true,
    },
    {
      key: "loading_order_code",
      label: "Loading Order",
      sortable: true,
    },
    {
      key: "bill_to_name",
      label: "Bill To",
      sortable: true,
    },
    {
      key: "vehicle_no",
      label: "Vehicle",
      sortable: true,
    },
    {
      key: "transporter_name",
      label: "Transporter",
      sortable: true,
    },
    {
      key: "consignor_name",
      label: "Consignor",
      sortable: true,
    },
    {
      key: "consignee_name",
      label: "Consignee",
      sortable: true,
    },
    {
      key: "item_name",
      label: "Item",
      sortable: true,
    },
    {
      key: "lr_bilty_qty",
      label: "Qty",
      type: "number",
      align: "right",
      sortable: true,
    },
    {
      key: "received_quantity",
      label: "Received",
      type: "number",
      align: "right",
      sortable: true,
    },
    {
      key: "shortage_qty",
      label: "Shortage",
      type: "number",
      align: "right",
      sortable: true,
    },
    {
      key: "driver_name",
      label: "Driver",
      sortable: true,
      sourceKeys: ["driver_name", "lr_bilty_driver_name"],
    },
    {
      key: "lr_bilty_status",
      label: "Status",
      type: "status",
      sortable: true,
      sourceKeys: ["lr_bilty_status", "status"],
    },
  ],
  drilldownRules: [],
});

export default function TransportLrBiltyTypePage({
  loadingOrderType,
  title,
  accentColor,
  accentText,
}: TransportLrBiltyTypePageProps) {
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const initialRange = useMemo(() => getCurrentMonthRange(), []);

  const reportConfig = useMemo(
    () => buildReportConfig(title, accentColor, loadingOrderType),
    [accentColor, loadingOrderType, title]
  );

  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);
  const [tableSearch, setTableSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);
  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<Array<{ id: string; desc: boolean }>>(
    reportConfig.defaultSort || []
  );

  const requestFilters = useMemo(
    () => ({
      ...(reportConfig.defaultFilters || {}),
      fromDate,
      toDate,
      sort: sortState,
    }),
    [fromDate, reportConfig.defaultFilters, sortState, toDate]
  );

  const missingRequiredFilters = !fromDate || !toDate;

  const {
    records,
    loading,
    isFetchingMore,
    totalCount,
    hasMore,
    error,
    fetchData,
    resetRecords,
  } = useTransportReport(reportConfig);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  useEffect(() => {
    if (missingRequiredFilters) {
      return;
    }

    setPage(1);
    setSelectedRecord(null);
    fetchData(requestFilters, 1, false);
  }, [fetchData, missingRequiredFilters, requestFilters]);

  const handleSortChange = (columnKey: string) => {
    setSortState((previous) => {
      const current = previous[0];

      if (current?.id === columnKey) {
        return [{ id: columnKey, desc: !current.desc }];
      }

      return [{ id: columnKey, desc: false }];
    });
  };

  const handleRefresh = () => {
    if (missingRequiredFilters) {
      return;
    }

    setPage(1);
    fetchData(requestFilters, 1, false);
  };

  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || isFetchingMore || !hasMore) {
        return;
      }

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver((entries) => {
        if (!entries[0]?.isIntersecting) {
          return;
        }

        setPage((previous) => {
          const nextPage = previous + 1;
          fetchData(requestFilters, nextPage, true);
          return nextPage;
        });
      });

      if (node) {
        observerRef.current.observe(node);
      }
    },
    [fetchData, hasMore, isFetchingMore, loading, requestFilters]
  );

  const tableData = useMemo(() => {
    if (!tableSearch.trim()) {
      return records;
    }

    const query = tableSearch.toLowerCase();
    return records.filter((record) =>
      Object.values(record).some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [records, tableSearch]);

  const stats = useMemo(() => buildStats(tableData, totalCount), [tableData, totalCount]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-2.5 py-2.5 shadow-sm backdrop-blur sm:px-5 sm:py-3">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                resetRecords();
                navigate("/transport/dashboard");
              }}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black text-slate-900 sm:text-2xl">
                {title}
              </h1>
              <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${accentText}`}>
                Transport / Current Month / {loadingOrderType}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="w-full px-2 py-2.5 sm:px-5 sm:py-5">
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[16px] border border-slate-200 bg-white px-2.5 py-2.5 shadow-sm sm:px-4 sm:py-4"
              >
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px]">
                  {stat.label}
                </p>
                <p className="mt-1 text-lg font-black text-slate-900 sm:text-2xl">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-1 gap-3 px-3 py-3 sm:px-5 sm:py-4 md:grid-cols-[minmax(0,1fr)_180px_180px_auto_auto] md:items-end">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(event) => setTableSearch(event.target.value)}
                  placeholder="Search LR, party, vehicle, item"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                />
              </div>

              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  From Date
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate || undefined}
                    onChange={(event) => setFromDate(event.target.value)}
                    className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
                  />
                </div>
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  To Date
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(event) => setToDate(event.target.value)}
                    className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
                  />
                </div>
              </label>

              <button
                type="button"
                onClick={() => {
                  const currentMonthRange = getCurrentMonthRange();
                  setFromDate(currentMonthRange.fromDate);
                  setToDate(currentMonthRange.toDate);
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-slate-500 transition hover:bg-slate-50 md:w-auto"
              >
                Current Month
              </button>

              <div className="text-xs font-medium leading-5 text-slate-500 sm:text-sm">
                Showing {tableData.length} loaded rows out of {numberFormatter.format(totalCount)}
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}

          {missingRequiredFilters ? (
            <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-slate-50/50 px-4 py-14 text-center sm:py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-8 ring-slate-100/50">
                <Calendar className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="mt-6 text-base font-black text-slate-900">Date Filter Required</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-relaxed text-slate-500">
                From aur to date do, tabhi {loadingOrderType.toLowerCase()} data load hoga.
              </p>
            </div>
          ) : (
            <>
              <ReportTable
                config={reportConfig}
                data={tableData}
                loading={loading}
                hasMore={hasMore}
                isFetchingMore={isFetchingMore}
                lastElementRef={lastElementRef}
                onRowClick={(record) => setSelectedRecord(record)}
                onSortChange={handleSortChange}
                sortState={sortState}
              />

              <div className="flex flex-col gap-1 rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                <span>
                  Page <span className="text-slate-900">{page}</span>
                </span>
                <span>
                  Movement Type <span className="text-slate-900">{loadingOrderType}</span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <ReportRowDetailsDrawer
        config={reportConfig}
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onDrilldown={() => undefined}
      />
    </div>
  );
}
