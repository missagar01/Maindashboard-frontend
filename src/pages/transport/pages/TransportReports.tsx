import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import * as XLSX from "xlsx";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  reportCategories,
  reportCountByCategory,
  reportsMasterConfig,
  ReportConfig,
} from "../config/reportConfig";
import { ReportFilterPanel } from "../components/ReportFilterPanel";
import { ReportRowDetailsDrawer } from "../components/ReportRowDetailsDrawer";
import { ReportTable } from "../components/ReportTable";
import { useTransportReport } from "../hooks/useTransportReport";

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const safeString = (value: unknown) => String(value ?? "").trim();

const toNumber = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDate = (value: unknown) => {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? null : date;
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

const buildStats = (config: ReportConfig, records: any[], totalCount: number) => {
  switch (config.statsKind) {
    case "diesel": {
      const totalDiesel = sumByKeys(records, ["total_diesel", "totals", "diesel_qty"]);
      const vehicles = uniqueCount(records, ["vehicle_no", "vehicle", "vehicle_name"]);
      const accounts = uniqueCount(records, ["account", "account_name", "pump_name"]);
      const average = records.length ? totalDiesel / records.length : 0;

      return [
        { label: "Total Records", value: numberFormatter.format(totalCount || records.length) },
        { label: "Total Diesel", value: numberFormatter.format(totalDiesel) },
        { label: "Vehicles", value: numberFormatter.format(vehicles) },
        { label: "Avg / Record", value: numberFormatter.format(average) },
        { label: "Accounts", value: numberFormatter.format(accounts) },
      ];
    }
    case "maintenance": {
      const open = records.filter((record) =>
        ["open", "pending", "in progress"].some((item) =>
          safeString(record.status).toLowerCase().includes(item)
        )
      ).length;
      const closed = records.filter((record) =>
        safeString(record.status).toLowerCase().includes("closed")
      ).length;
      const types = uniqueCount(records, ["maintenanceType"]);

      return [
        { label: "Total Requests", value: numberFormatter.format(totalCount || records.length) },
        { label: "Open", value: numberFormatter.format(open) },
        { label: "Closed", value: numberFormatter.format(closed) },
        { label: "Types", value: numberFormatter.format(types) },
      ];
    }
    case "allowance": {
      const totalAdvance = sumByKeys(records, ["driver_advance", "advance_amount", "amount"]);
      const drivers = uniqueCount(records, ["driver_name"]);
      const vehicles = uniqueCount(records, ["vehicle_no"]);

      return [
        { label: "Total Entries", value: numberFormatter.format(totalCount || records.length) },
        { label: "Total Advance", value: numberFormatter.format(totalAdvance) },
        { label: "Drivers", value: numberFormatter.format(drivers) },
        { label: "Vehicles", value: numberFormatter.format(vehicles) },
      ];
    }
    case "statuary": {
      const now = new Date();
      const expired = records.filter((record) => Boolean(record.is_expired)).length;
      const expiringSoon = records.filter((record) => {
        const expiry = toDate(record.expiry_date || record.document_expiry_date);

        if (!expiry || Boolean(record.is_expired)) {
          return false;
        }

        const diff = expiry.getTime() - now.getTime();
        return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
      }).length;

      return [
        { label: "Total Records", value: numberFormatter.format(totalCount || records.length) },
        { label: "Expired", value: numberFormatter.format(expired) },
        { label: "Expiring Soon", value: numberFormatter.format(expiringSoon) },
        { label: "Valid", value: numberFormatter.format(records.length - expired) },
      ];
    }
    case "lr":
    default: {
      const quantity = sumByKeys(records, [
        "lr_bilty_qty",
        "received_quantity",
        "loading_order_qty",
      ]);
      const vehicles = uniqueCount(records, ["vehicle_no"]);
      const drivers = uniqueCount(records, ["driver_name", "lr_bilty_driver_name"]);
      const destinations = uniqueCount(records, ["destination_name"]);

      return [
        { label: "Total Records", value: numberFormatter.format(totalCount || records.length) },
        { label: "Total Quantity", value: numberFormatter.format(quantity) },
        { label: "Vehicles", value: numberFormatter.format(vehicles) },
        { label: "Drivers", value: numberFormatter.format(drivers) },
        { label: "Destinations", value: numberFormatter.format(destinations) },
      ];
    }
  }
};

export default function TransportReports() {
  const navigate = useNavigate();
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [sortState, setSortState] = useState<Array<{ id: string; desc: boolean }>>([]);
  const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);
  const [page, setPage] = useState(1);

  const observerRef = useRef<IntersectionObserver | null>(null);

  const currentCategory = useMemo(
    () => reportCategories.find((category) => category.id === selectedCategoryId) || null,
    [selectedCategoryId]
  );

  const categoryReports = useMemo(
    () => reportsMasterConfig.filter((report) => report.category === selectedCategoryId),
    [selectedCategoryId]
  );

  const activeReport = useMemo(
    () => reportsMasterConfig.find((report) => report.id === selectedReportId) || null,
    [selectedReportId]
  );

  const requestFilters = useMemo(
    () => ({
      ...(activeReport?.defaultFilters || {}),
      ...activeFilters,
      sort: sortState,
    }),
    [activeFilters, activeReport, sortState]
  );

  const missingRequiredFilters = useMemo(() => {
    if (!activeReport) return false;
    return activeReport.filters.some((field) => {
      if (!field.required) return false;

      if (field.type === "date-range") {
        const fromKey = field.dateKeys?.from || "fromDate";
        const toKey = field.dateKeys?.to || "toDate";
        return !requestFilters[fromKey] || !requestFilters[toKey];
      }

      return !requestFilters[field.key] || (typeof requestFilters[field.key] === "object" && !requestFilters[field.key]?.value);
    });
  }, [activeReport, requestFilters]);

  const {
    records,
    loading,
    isFetchingMore,
    totalCount,
    hasMore,
    error,
    fetchData,
    resetRecords,
  } = useTransportReport(activeReport);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  useEffect(() => {
    if (!activeReport || level !== 3 || missingRequiredFilters) {
      return;
    }

    setPage(1);
    setSelectedRecord(null);
    fetchData(requestFilters, 1, false);
  }, [activeReport, level, requestFilters, fetchData, missingRequiredFilters]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedReportId(null);
    setLevel(2);
  };

  const handleReportSelect = (reportId: string) => {
    const nextReport = reportsMasterConfig.find((report) => report.id === reportId);
    setSelectedReportId(reportId);
    setActiveFilters({ ...(nextReport?.defaultFilters || {}) });
    setTableSearch("");
    setPage(1);
    setSortState(nextReport?.defaultSort || []);
    setLevel(3);
  };

  const handleBack = () => {
    if (level === 3) {
      setLevel(2);
      setSelectedReportId(null);
      setSelectedRecord(null);
      setActiveFilters({});
      resetRecords();
      return;
    }

    if (level === 2) {
      setLevel(1);
      setSelectedCategoryId(null);
      return;
    }

    navigate("/transport/dashboard");
  };

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
    if (!activeReport) {
      return;
    }

    setPage(1);
    fetchData(requestFilters, 1, false);
  };

  const handleExport = () => {
    if (!activeReport || records.length === 0) {
      return;
    }

    const exportRows = records.map((record, index) => {
      const row: Record<string, any> = { "S.No": index + 1 };

      activeReport.columns.forEach((column) => {
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
    XLSX.utils.book_append_sheet(workbook, worksheet, activeReport.title.slice(0, 28));
    XLSX.writeFile(
      workbook,
      `${activeReport.id}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
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

  const stats = useMemo(
    () => (activeReport ? buildStats(activeReport, tableData, totalCount) : []),
    [activeReport, tableData, totalCount]
  );

  const handleDrilldown = (sourceKey: string, value: any) => {
    if (!activeReport) {
      return;
    }

    const rule = activeReport.drilldownRules.find((item) => item.key === sourceKey);
    if (!rule) {
      return;
    }

    const filterKey = rule.filterKey || sourceKey;
    const nextFilter: Record<string, any> = {};

    if (rule.filterType === "multi-select") {
      nextFilter[filterKey] = {
        value: [value],
        filter_type: "multi-select",
      };
    } else if (rule.filterType === "boolean") {
      nextFilter[filterKey] = {
        value: Boolean(value),
        filter_type: "boolean",
      };
    } else {
      nextFilter[filterKey] = {
        value: String(value),
        filter_type: rule.filterType || "string",
      };
    }

    setSelectedRecord(null);
    setActiveFilters((previous) => ({
      ...(activeReport.defaultFilters || {}),
      ...previous,
      ...nextFilter,
    }));
    setPage(1);
  };

  const filteredCategories = useMemo(
    () =>
      reportCategories.filter((category) =>
        category.title.toLowerCase().includes(categorySearch.toLowerCase())
      ),
    [categorySearch]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-3 py-3 shadow-sm backdrop-blur sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black text-slate-900 sm:text-2xl">
                {level === 1
                  ? "Transport Report Hub"
                  : level === 2
                    ? currentCategory?.title
                    : activeReport?.title}
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500">
                {level === 1
                  ? "API Driven Reports"
                  : `Reports / ${currentCategory?.title || "Transport"}`}
              </p>
            </div>
          </div>

          {level === 3 ? (
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
          ) : null}
        </div>
      </div>

      <div className="w-full px-3 py-3 sm:px-5 sm:py-5">
        {level === 1 ? (
          <div className="space-y-4">
            <div className="relative w-full sm:max-w-lg">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Search report categories"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-300"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategorySelect(category.id)}
                  className="rounded-[20px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`rounded-2xl p-3 text-white ${category.color}`}>
                      <category.icon className="h-6 w-6" />
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">
                      {reportCountByCategory[category.id]}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <h2 className="mt-4 text-lg font-black text-slate-900">{category.title}</h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    {category.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {level === 2 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categoryReports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => handleReportSelect(report.id)}
                className="rounded-[20px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className={`rounded-2xl p-3 text-white ${report.color}`}>
                    <report.icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black text-slate-900">{report.title}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                      {report.description}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        ) : null}

        {level === 3 && activeReport ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-5">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[16px] border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4 sm:py-4"
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

            <ReportFilterPanel
              config={activeReport}
              loading={loading}
              onApply={(filters) => {
                setPage(1);
                setActiveFilters(filters);
              }}
              onClear={() => {
                setPage(1);
                setActiveFilters({ ...(activeReport.defaultFilters || {}) });
              }}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(event) => setTableSearch(event.target.value)}
                  placeholder="Search loaded rows"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-300"
                />
              </div>
              <div className="text-sm font-medium text-slate-500">
                Showing {tableData.length} loaded rows out of {numberFormatter.format(totalCount)}
              </div>
            </div>

            {error ? (
              <div className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            ) : null}

            {missingRequiredFilters ? (
              <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-8 ring-slate-100/50">
                  <Calendar className="h-8 w-8 text-indigo-500" />
                </div>
                <h3 className="mt-6 text-base font-black text-slate-900">Required Filters Missing</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-relaxed text-slate-500">
                  Please complete the required date filters or parameters in the panel above to generate this report.
                </p>
              </div>
            ) : (
              <>
                <ReportTable
                  config={activeReport}
                  data={tableData}
                  loading={loading}
                  hasMore={hasMore}
                  isFetchingMore={isFetchingMore}
                  lastElementRef={lastElementRef}
                  onRowClick={(record) => setSelectedRecord(record)}
                  onSortChange={handleSortChange}
                  sortState={sortState}
                />

                <div className="flex flex-col gap-1 rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Page <span className="text-slate-900">{page}</span>
                  </span>
                  <span>
                    Active Report <span className="text-slate-900">{activeReport.title}</span>
                  </span>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      <ReportRowDetailsDrawer
        config={activeReport}
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onDrilldown={handleDrilldown}
      />
    </div>
  );
}
