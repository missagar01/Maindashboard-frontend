import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import * as XLSX from "xlsx";
import {
  Calendar,
  ChevronLeft,
  Download,
  RefreshCw,
} from "lucide-react";
import { ReportFilterPanel } from "../components/ReportFilterPanel";
import { ReportRowDetailsDrawer } from "../components/ReportRowDetailsDrawer";
import { ReportTable } from "../components/ReportTable";
import { reportsMasterConfig } from "../config/reportConfig";
import { useTransportReport } from "../hooks/useTransportReport";

const REPORT_ID = "do-po-register";

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

type TransportReportRecord = Record<string, unknown>;

const toNumber = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const uniqueCount = (records: TransportReportRecord[], keys: string[]) =>
  new Set(
    records
      .map((record) =>
        keys
          .map((key) => record?.[key])
          .find((value) => value !== undefined && value !== null && value !== "")
      )
      .filter(Boolean)
  ).size;

const sumByKeys = (records: TransportReportRecord[], keys: string[]) =>
  records.reduce((total, record) => {
    const match = keys
      .map((key) => record?.[key])
      .find((value) => value !== undefined && value !== null && value !== "");
    return total + toNumber(match);
  }, 0);

const buildStats = (records: TransportReportRecord[], totalCount: number) => {
  const totalQuantity = sumByKeys(records, ["quantity"]);
  const remainingQuantity = sumByKeys(records, ["remaining_quantity"]);
  const branches = uniqueCount(records, ["branch_name", "branch_code"]);
  const consignors = uniqueCount(records, ["consignor_name"]);
  const items = uniqueCount(records, ["item_name"]);

  return [
    { label: "Total Orders", value: numberFormatter.format(totalCount || records.length) },
    { label: "Total Quantity", value: numberFormatter.format(totalQuantity) },
    { label: "Remaining Qty", value: numberFormatter.format(remainingQuantity) },
    { label: "Branches", value: numberFormatter.format(branches) },
    { label: "Consignors", value: numberFormatter.format(consignors) },
    { label: "Items", value: numberFormatter.format(items) },
  ];
};

export default function TransportDoDpoReport() {
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);

  const reportConfig = useMemo(
    () => reportsMasterConfig.find((report) => report.id === REPORT_ID) || null,
    []
  );

  const [selectedRecord, setSelectedRecord] = useState<TransportReportRecord | null>(null);
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>(
    () => ({ ...(reportConfig?.defaultFilters || {}) })
  );
  const [sortState, setSortState] = useState<Array<{ id: string; desc: boolean }>>(
    () => reportConfig?.defaultSort || []
  );

  const requestFilters = useMemo(
    () => ({
      ...(reportConfig?.defaultFilters || {}),
      ...activeFilters,
      sort: sortState,
    }),
    [activeFilters, reportConfig, sortState]
  );

  const reportFilterPanelConfig = useMemo(() => {
    if (!reportConfig) {
      return null;
    }

    return {
      ...reportConfig,
      filters: reportConfig.filters.filter((field) => field.type === "date-range"),
    };
  }, [reportConfig]);

  const rowDetailsConfig = useMemo(() => {
    if (!reportConfig) {
      return null;
    }

    return {
      ...reportConfig,
      drilldownRules: [],
    };
  }, [reportConfig]);

  const reportTableConfig = useMemo(() => {
    if (!reportConfig) {
      return null;
    }

    return {
      ...reportConfig,
      color: "bg-transparent",
    };
  }, [reportConfig]);

  const missingRequiredFilters = useMemo(() => {
    if (!reportConfig) return false;

    return reportConfig.filters.some((field) => {
      if (!field.required) return false;

      if (field.type === "date-range") {
        const fromKey = field.dateKeys?.from || "fromDate";
        const toKey = field.dateKeys?.to || "toDate";
        return !requestFilters[fromKey] || !requestFilters[toKey];
      }

      return (
        !requestFilters[field.key] ||
        (typeof requestFilters[field.key] === "object" && !requestFilters[field.key]?.value)
      );
    });
  }, [reportConfig, requestFilters]);

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
    if (!reportConfig || missingRequiredFilters) {
      return;
    }

    setPage(1);
    setSelectedRecord(null);
    fetchData(requestFilters, 1, false);
  }, [fetchData, missingRequiredFilters, reportConfig, requestFilters]);

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
    if (!reportConfig) {
      return;
    }

    setPage(1);
    fetchData(requestFilters, 1, false);
  };

  const handleExport = () => {
    if (!reportConfig || records.length === 0) {
      return;
    }

    const exportRows = records.map((record, index) => {
      const row: Record<string, unknown> = { "S.No": index + 1 };

      reportConfig.columns.forEach((column) => {
        const value =
          column.sourceKeys
            ?.map((key) => record?.[key])
            .find((item) => item !== undefined && item !== null && item !== "") ??
          record?.[column.key];

        row[column.label] = value ?? "";
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, reportConfig.title.slice(0, 28));
    XLSX.writeFile(workbook, `${reportConfig.id}_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

  const stats = useMemo(() => buildStats(records, totalCount), [records, totalCount]);

  if (!reportConfig) {
    return (
      <div className="p-6 text-sm font-semibold text-rose-600">
        DO / DPO report configuration not found.
      </div>
    );
  }

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
                DO / DPO Report
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-600">
                Transport / Current Month Loading Orders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="hidden items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-emerald-700 sm:inline-flex"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
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

          {reportFilterPanelConfig ? (
            <ReportFilterPanel
              config={reportFilterPanelConfig}
              loading={loading}
              onApply={(filters) => {
                setPage(1);
                setActiveFilters(filters);
              }}
              onClear={() => {
                setPage(1);
                setActiveFilters({ ...(reportConfig.defaultFilters || {}) });
              }}
            />
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="text-xs font-medium leading-5 text-slate-500 sm:text-sm">
              Showing {records.length} loaded rows out of {numberFormatter.format(totalCount)}
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
                <Calendar className="h-8 w-8 text-sky-500" />
              </div>
              <h3 className="mt-6 text-base font-black text-slate-900">Required Filters Missing</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-relaxed text-slate-500">
                Date range complete karo, uske baad DO / DPO report load ho jayega.
              </p>
            </div>
          ) : (
            <>
              <ReportTable
                config={reportTableConfig || reportConfig}
                data={records}
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
                  Active Report <span className="text-slate-900">{reportConfig.title}</span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <ReportRowDetailsDrawer
        config={rowDetailsConfig}
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onDrilldown={() => undefined}
      />
    </div>
  );
}
