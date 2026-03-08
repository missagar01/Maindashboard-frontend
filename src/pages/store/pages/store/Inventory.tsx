import { useMemo, useState } from "react";
import { Store, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import Heading from "../../components/element/Heading";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { storeApi } from "@/api/store/storeSystemApi";
import Loading from "./Loading";

// Custom style to show calendar picker icon
const dateInputStyle = `
  #fromDate::-webkit-calendar-picker-indicator,
  #toDate::-webkit-calendar-picker-indicator {
    display: block !important;
    opacity: 1 !important;
    cursor: pointer !important;
    width: 20px !important;
    height: 20px !important;
    margin-left: 5px !important;
  }
`;

type StockRow = {
  itemCode: string;
  itemName: string;
  uom: string;
  openingQty: number;
  closingQty: number;
};

const PAGE_SIZE = 50;

function PaginationBar({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (!total) return null;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pages: number[] = [];
  const start = Math.max(1, page - 1);
  const end = Math.min(totalPages, page + 1);
  for (let p = start; p <= end; p++) pages.push(p);

  const startIndex = (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
      <span>
        Showing{" "}
        <span className="font-semibold text-slate-700">{startIndex}</span>–
        <span className="font-semibold text-slate-700">{endIndex}</span> of{" "}
        <span className="font-semibold text-slate-700">
          {total.toLocaleString("en-IN")}
        </span>{" "}
        records
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {pages.map((p) => (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="icon"
            onClick={() => onChange(p)}
          >
            {p}
          </Button>
        ))}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Inventory() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [allRows, setAllRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");

  const toBackendDate = (dateStr: string) => {
    if (!dateStr) return "";
    // Input format: YYYY-MM-DD (e.g., "2025-12-16")
    // Output format: DD-MM-YYYY (e.g., "16-12-2025")
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return "";
    return `${d}-${m}-${y}`;
  };

  const fetchStock = async () => {
    if (!fromDate || !toDate) {
      toast.error("Please select both From Date and To Date");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const fromDateFormatted = toBackendDate(fromDate);
      const toDateFormatted = toBackendDate(toDate);

      const res = await storeApi.getStock(fromDateFormatted, toDateFormatted);
      
      // Handle different response structures
      let dataArray: unknown[] = [];
      if (Array.isArray(res)) {
        dataArray = res;
      } else if (res && typeof res === 'object') {
        // Check for { success: true, data: [...] } structure (from Postman example)
        if ('data' in res && Array.isArray((res as { data?: unknown }).data)) {
          dataArray = (res as { data: unknown[] }).data;
        } else if ('data' in res && (res as { data?: unknown }).data && typeof (res as { data?: unknown }).data === 'object') {
          const nestedData = (res as { data?: { data?: unknown[] } }).data;
          if (nestedData && 'data' in nestedData && Array.isArray(nestedData.data)) {
            dataArray = nestedData.data;
          }
        }
      }

      const rows: StockRow[] = dataArray.map((r) => {
        const row = r as Record<string, unknown>;
        const col1 = row.COL1 ?? row.itemCode ?? "";
        const col2 = row.COL2 ?? row.itemName ?? "";
        const col3 = row.COL3 ?? row.uom ?? "";
        const col4 = row.COL4 ?? row.openingQty ?? 0;
        const col5 = row.COL5 ?? row.closingQty ?? 0;
        return {
          itemCode: String(col1).trim() || "",
          itemName: String(col2).trim() || "",
          uom: String(col3).trim() || "",
          openingQty: typeof col4 === 'number' ? col4 : parseFloat(String(col4)) || 0,
          closingQty: typeof col5 === 'number' ? col5 : parseFloat(String(col5)) || 0,
        };
      });
      
      setAllRows(rows);
      setPage(1);
      toast.success(`Loaded ${rows.length} records`);
    } catch (err) {
      console.error("Fetch error:", err);
      
      let message = "Failed to fetch data";
      
      // Check for connection errors
      if (err instanceof TypeError && err.message.includes("Failed to fetch")) {
        message = "Cannot connect to server. Please ensure the backend server is running on port 3004.";
      } else if (err instanceof Error) {
        message = err.message;
      } else if (err && typeof err === 'object') {
        // Check for axios error response
        if ('response' in err && err.response && typeof err.response === 'object') {
          const response = err.response as { status?: number; data?: { message?: string } };
          if (response.status === 404) {
            message = "API endpoint not found. Please check the backend routes.";
          } else if (response.data?.message) {
            message = response.data.message;
          } else if (response.status) {
            message = `Server error (${response.status}). Please try again.`;
          }
        } else if ('message' in err && typeof err.message === 'string') {
          message = err.message;
        }
      }
      
      setError(message);
      setAllRows([]);
      setPage(1);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((row) => {
      const c1 = row.itemCode.toLowerCase();
      const c2 = row.itemName.toLowerCase();
      const c3 = row.uom.toLowerCase();
      return c1.includes(q) || c2.includes(q) || c3.includes(q);
    });
  }, [allRows, searchText]);

  const totalRecords = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);

  if (loading && allRows.length === 0) {
    return (
      <Loading
        heading="Inventory"
        subtext="Fetching inventory data"
        icon={<Store size={48} className="text-blue-600" />}
      />
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8">
    <style>{dateInputStyle}</style>
    {/* Heading */}
    <Heading
      heading="Stock Report"
      subtext="View Oracle stock data by date range"
    >
      <Store size={50} className="text-primary" />
    </Heading>

    {/* Filters – ONLY date filters */}
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col">
          <label htmlFor="fromDate" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            From Date
          </label>
          <input
            id="fromDate"
            type="date"
            value={fromDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const selectedDate = e.target.value;
              setFromDate(selectedDate);
              // Auto-validate: if toDate is before fromDate, update toDate
              if (selectedDate && toDate && new Date(selectedDate) > new Date(toDate)) {
                setToDate(selectedDate);
              }
            }}
            onClick={(e) => {
              // Show calendar picker on click
              if (e.currentTarget.showPicker) {
                e.currentTarget.showPicker();
              }
            }}
            className="w-full sm:w-[200px] bg-white border-2 border-slate-300 rounded-md pl-3 pr-10 py-2 text-sm h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none cursor-pointer text-gray-900"
            style={{
              colorScheme: 'light',
              position: 'relative',
            }}
            min="2020-01-01"
            max={todayStr}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="toDate" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            To Date
          </label>
          <input
            id="toDate"
            type="date"
            value={toDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const selectedDate = e.target.value;
              setToDate(selectedDate);
              // Auto-validate: if fromDate is after toDate, update fromDate
              if (selectedDate && fromDate && new Date(selectedDate) < new Date(fromDate)) {
                setFromDate(selectedDate);
              }
            }}
            onClick={(e) => {
              // Show calendar picker on click
              if (e.currentTarget.showPicker) {
                e.currentTarget.showPicker();
              }
            }}
            className="w-full sm:w-[200px] bg-white border-2 border-slate-300 rounded-md pl-3 pr-10 py-2 text-sm h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none cursor-pointer text-gray-900"
            style={{
              colorScheme: 'light',
              position: 'relative',
            }}
            min={fromDate || "2020-01-01"}
            max={todayStr}
          />
        </div>
      </div>

      <div className="flex gap-2 items-center justify-between sm:justify-start">
        <Button
          onClick={fetchStock}
          disabled={loading || !fromDate || !toDate}
          className="mt-2 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? "Loading..." : "Search"}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="mt-2 sm:mt-0"
          onClick={() => {
            setFromDate("");
            setToDate("");
            setSearchText("");
            setPage(1);
            setAllRows([]);
            setError(null);
          }}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
    </div>

    {/* Record Count + Error */}
    <div className="flex justify-between items-center text-sm text-slate-500">
      <p>
        Showing{" "}
        <span className="font-semibold text-slate-700">
          {totalRecords.toLocaleString("en-IN")}
        </span>{" "}
        total records
      </p>
      {error && (
        <p className="text-red-600 text-sm bg-red-50 px-3 py-1 rounded-md">
          {error}
        </p>
      )}
    </div>

    {/* 🔍 Global Search – table ke upar right me */}
    {allRows.length > 0 && (
      <div className="flex justify-end mb-2">
        <div className="w-full sm:w-[400px] md:w-[500px]">
          <Input
            type="text"
            placeholder="Search: Code / Name / UOM"
            value={searchText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>
    )}

    {/* NEW TABLE with sticky header */}
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
      <div className="max-h-[70vh] overflow-auto relative">
        <table className="min-w-full text-center border-collapse">
          <thead className="sticky top-0 bg-slate-100 z-20 shadow-sm">
            <tr>
              <th className="px-3 py-2 font-semibold border-b whitespace-nowrap">S.No</th>
              <th className="px-3 py-2 font-semibold border-b whitespace-nowrap">Item Code</th>
              <th className="px-3 py-2 font-semibold border-b whitespace-nowrap">Item Name</th>
              <th className="px-3 py-2 font-semibold border-b whitespace-nowrap">UOM</th>
              <th className="px-3 py-2 font-semibold border-b whitespace-nowrap">
                Opening Qty
              </th>
              <th className="px-3 py-2 font-semibold border-b whitespace-nowrap">
                Closing Qty
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-6 text-center text-slate-500 text-sm"
                >
                  Loading...
                </td>
              </tr>
            ) : pagedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-6 text-center text-slate-400 text-sm"
                >
                  {allRows.length === 0 ? "Please select dates and click Search to load data" : "No Data Found"}
                </td>
              </tr>
            ) : (
              pagedRows.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="border-b px-2 py-1">
                    {(currentPage - 1) * PAGE_SIZE + index + 1}
                  </td>
                  <td className="border-b px-2 py-1">{row.itemCode}</td>
                  <td className="border-b px-2 py-1">{row.itemName}</td>
                  <td className="border-b px-2 py-1">{row.uom}</td>
                  <td className="border-b px-2 py-1">{row.openingQty}</td>
                  <td className="border-b px-2 py-1">
                    {row.closingQty === 0 ? (
                      <span className="inline-flex items-center justify-center rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[11px]">
                        Out of Stock
                      </span>
                    ) : (
                      row.closingQty
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Pagination Bar – client-side */}
    {totalRecords > 0 && (
      <PaginationBar
        page={currentPage}
        total={totalRecords}
        onChange={(p) => setPage(p)}
      />
    )}

    {/* Footer */}
    <div className="text-[11px] text-slate-400 text-right">
      Oracle stock view · {new Date().toLocaleString()}
    </div>
  </div>
  );
}
