import { useState, useEffect } from "react";
import { Store, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

import Heading from "../../components/element/Heading";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Pill } from "../../components/ui/pill";
import { storeApi } from "@/api/store/storeSystemApi";
import { toast } from "sonner";

interface StockRow {
  itemCode: string;
  itemName: string;
  uom: string;
  openingQty: number;
  closingQty: number;
}

const PAGE_SIZE = 50;

// Convert YYYY-MM-DD (HTML date input) to DD-MM-YYYY (backend format)
const toBackendDate = (dateStr: string) => {
  if (!dateStr) return "";
  // HTML date input returns YYYY-MM-DD format
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return "";
  return `${d}-${m}-${y}`;
};

const normalizeRow = (item: Record<string, unknown>): StockRow => {
  const col4 = item.COL4 ?? item.OPENING_QTY ?? 0;
  const col5 = item.COL5 ?? item.CLOSING_QTY ?? 0;
  return {
    itemCode: String(item.COL1 || item.ITEM_CODE || "").trim(),
    itemName: String(item.COL2 || item.ITEM_NAME || "").trim(),
    uom: String(item.COL3 || item.UOM || "").trim(),
    openingQty: typeof col4 === 'number' ? col4 : parseFloat(String(col4)) || 0,
    closingQty: typeof col5 === 'number' ? col5 : parseFloat(String(col5)) || 0,
  };
};

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

export default function StockReport() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const firstOfMonth = `${yyyy}-${mm}-01`;
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(todayStr);
  const [allRows, setAllRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");

  // Auto-fetch on component mount with initial dates
  useEffect(() => {
    void fetchStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStock = async () => {
    if (!fromDate || !toDate) {
      toast.error("Please select both From Date and To Date");
      return;
    }
    
    // Validate date range
    if (new Date(fromDate) > new Date(toDate)) {
      toast.error("From Date cannot be greater than To Date");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const fromParam = toBackendDate(fromDate);
      const toParam = toBackendDate(toDate);
      
      if (!fromParam || !toParam) {
        toast.error("Invalid date format");
        return;
      }
      
      const res = await storeApi.getStock(fromParam, toParam) as { data?: unknown[] } | unknown[];
      const data = Array.isArray((res as { data?: unknown[] })?.data)
        ? (res as { data: unknown[] }).data
        : Array.isArray(res)
        ? res
        : [];

      const rows = data.map((item) => normalizeRow(item as Record<string, unknown>));
      setAllRows(rows);
      setPage(1);
      toast.success(`Loaded ${rows.length} records`);
    } catch (err) {
      console.error("Fetch error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch data";
      setError(errorMessage);
      toast.error(errorMessage);
      setAllRows([]);
      setPage(1);
    } finally {
      setLoading(false);
    }
  };

  const q = searchText.trim().toLowerCase();

  const filteredRows = q
    ? allRows.filter((row) => {
        return (
          row.itemCode.toLowerCase().includes(q) ||
          row.itemName.toLowerCase().includes(q) ||
          row.uom.toLowerCase().includes(q)
        );
      })
    : allRows;

  const totalRecords = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="space-y-4">
      <Heading
        heading="Stock Report"
        subtext="View Oracle stock data by date range"
      >
        <Store size={50} className="text-primary" />
      </Heading>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="flex flex-col">
            <label htmlFor="fromDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From Date
            </label>
            <Input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => {
                const selectedDate = e.target.value;
                setFromDate(selectedDate);
                // Auto-validate: if toDate is before fromDate, update toDate
                if (selectedDate && toDate && new Date(selectedDate) > new Date(toDate)) {
                  setToDate(selectedDate);
                }
              }}
              className="w-full sm:w-[200px] bg-white border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="2020-01-01"
              max={todayStr}
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="toDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              To Date
            </label>
            <Input
              id="toDate"
              type="date"
              value={toDate}
              onChange={(e) => {
                const selectedDate = e.target.value;
                setToDate(selectedDate);
                // Auto-validate: if fromDate is after toDate, update fromDate
                if (selectedDate && fromDate && new Date(selectedDate) < new Date(fromDate)) {
                  setFromDate(selectedDate);
                }
              }}
              className="w-full sm:w-[200px] bg-white border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min={fromDate || "2020-01-01"}
              max={todayStr}
            />
          </div>
        </div>

        <div className="flex gap-2 items-center justify-between sm:justify-start">
          <Button
            onClick={fetchStock}
            disabled={loading || !fromDate || !toDate}
            className="mt-2 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading...
              </span>
            ) : (
              "Search"
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="mt-2 sm:mt-0"
            onClick={() => {
              setFromDate(firstOfMonth);
              setToDate(todayStr);
              setSearchText("");
              setPage(1);
              // Auto-fetch after reset
              setTimeout(() => {
                void fetchStock();
              }, 100);
            }}
            title="Reset to current month"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

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

      <div className="flex justify-end mb-2">
        <div className="w-full sm:w-[400px] md:w-[500px]">
          <Input
            type="text"
            placeholder="Search: Code / Name / UOM"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="max-h-[70vh] overflow-auto relative">
          <table className="min-w-full text-center border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-20">
              <tr>
                <th className="px-3 py-2 font-semibold border-b">S.No</th>
                <th className="px-3 py-2 font-semibold border-b">Item Code</th>
                <th className="px-3 py-2 font-semibold border-b">Item Name</th>
                <th className="px-3 py-2 font-semibold border-b">UOM</th>
                <th className="px-3 py-2 font-semibold border-b">Opening Qty</th>
                <th className="px-3 py-2 font-semibold border-b">Closing Qty</th>
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
                    No Data Found
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
                        <Pill variant="reject" className="text-[11px]">
                          Out of Stock
                        </Pill>
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

      <PaginationBar page={currentPage} total={totalRecords} onChange={setPage} />

      <div className="text-[11px] text-slate-400 text-right">
        Oracle stock view · {new Date().toLocaleString()}
      </div>
    </div>
  );
}
