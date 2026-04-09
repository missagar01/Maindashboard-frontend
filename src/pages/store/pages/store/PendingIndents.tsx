import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ListTodo, Search, X } from "lucide-react";
import { toast } from "sonner";
import { PuffLoader as Loader } from "react-spinners";
import * as XLSX from "xlsx";

import { storeApi } from "@/api/store/storeSystemApi";
import Heading from "../../components/element/Heading";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import Loading from "./Loading";
import { compareDateDesc } from "./currentMonthSort";

interface POData {
  PLANNED_TIMESTAMP: string;
  INDENT_NO: string;
  INDENTER: string;
  VRNO: string;
  VRDATE: string;
  VENDOR_NAME: string;
  ITEM_NAME: string;
  QTYORDER: number;
  QTYEXECUTE: number;
  BALANCE_QTY?: number;
  UM: string;
}

const PAGE_SIZE = 50;
const INDENT_FIELD_KEYS = ["INDENT_NO", "indent_no", "indentNo", "INDENTNO", "indentno"];
const INDENTER_FIELD_KEYS = ["INDENTER", "indenter", "Indenter"];

const extractStringField = (record: Record<string, unknown>, keys: string[], fallback = "") => {
  for (const key of keys) {
    const value = record[key];
    if (value == null || value === "") continue;
    return typeof value === "string" ? value.trim() : String(value);
  }
  return fallback;
};

const normalize = (po: Partial<POData> | Record<string, unknown>): POData => {
  const raw = po as Record<string, unknown>;
  const order = Number(raw.QTYORDER) || 0;
  const exec = Number(raw.QTYEXECUTE) || 0;
  const balance = raw.BALANCE_QTY != null ? Number(raw.BALANCE_QTY) : Math.max(order - exec, 0);
  const indentNo = raw.INDENT_NO != null && raw.INDENT_NO !== "" ? String(raw.INDENT_NO).trim() : extractStringField(raw, INDENT_FIELD_KEYS);
  return {
    PLANNED_TIMESTAMP: String(raw.PLANNED_TIMESTAMP ?? ""),
    INDENT_NO: indentNo,
    INDENTER: extractStringField(raw, INDENTER_FIELD_KEYS),
    VRNO: String(raw.VRNO ?? ""),
    VRDATE: String(raw.VRDATE ?? ""),
    VENDOR_NAME: String(raw.VENDOR_NAME ?? ""),
    ITEM_NAME: String(raw.ITEM_NAME ?? ""),
    QTYORDER: order,
    QTYEXECUTE: exec,
    BALANCE_QTY: balance,
    UM: String(raw.UM ?? ""),
  };
};

const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
const formatDateTime = (value?: string) => value ? new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
const normalizeSearch = (value: string) => value.trim().toLowerCase();
const getSearchablePoText = (row: POData) => [row.VRNO, row.INDENT_NO, row.INDENTER, row.VENDOR_NAME, row.ITEM_NAME].filter(Boolean).join(" ").toLowerCase();
const filterPurchaseOrders = (rows: POData[], query: string) => {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return rows;
  return rows.filter((row) => getSearchablePoText(row).includes(normalizedQuery));
};
const getExportRows = (rows: POData[]) =>
  rows.map((row, index) => ({
    "S.No": index + 1,
    "Indent No": row.INDENT_NO || "",
    Indenter: row.INDENTER || "",
    "PO No.": row.VRNO || "",
    "Planned Time Stamp": formatDateTime(row.PLANNED_TIMESTAMP),
    "PO Date": formatDate(row.VRDATE),
    "Vendor Name": row.VENDOR_NAME || "",
    "Item Name": row.ITEM_NAME || "",
    UOM: row.UM || "",
    "Ordered Qty": row.QTYORDER ?? 0,
    "Executed Qty": row.QTYEXECUTE ?? 0,
    "Balance Qty": row.BALANCE_QTY ?? 0,
  }));
const downloadRowsAsExcel = (rows: POData[], fileName: string, sheetName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(getExportRows(rows));
  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 24 },
    { wch: 16 },
    { wch: 24 },
    { wch: 14 },
    { wch: 28 },
    { wch: 40 },
    { wch: 10 },
    { wch: 12 },
    { wch: 13 },
    { wch: 12 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
};

function PurchaseOrderToolbar({
  title,
  query,
  totalCount,
  filteredCount,
  onQueryChange,
  onDownload,
  isDownloading,
  downloadLabel,
}: {
  title: string;
  query: string;
  totalCount: number;
  filteredCount: number;
  onQueryChange: (value: string) => void;
  onDownload: () => void;
  isDownloading: boolean;
  downloadLabel: string;
}) {
  const hasQuery = query.trim().length > 0;
  const countLabel = hasQuery
    ? `${filteredCount.toLocaleString("en-IN")} match${filteredCount === 1 ? "" : "es"}`
    : `${totalCount.toLocaleString("en-IN")} total`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/70 p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
            <Search className="h-3.5 w-3.5" />
            {title}
          </div>
          <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search by PO No, Indent No, Indenter, Vendor, or Item"
                className="h-11 rounded-xl border-slate-200 bg-white pl-10 pr-10 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-slate-300"
              />
              {hasQuery ? (
                <button
                  type="button"
                  onClick={() => onQueryChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 shadow-sm">{countLabel}</span>
              <span className={`rounded-full px-3 py-1 font-medium ${hasQuery ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>
                {hasQuery ? `Filtering "${query.trim()}"` : "Showing all purchase orders"}
              </span>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {hasQuery
              ? "Download will include only the filtered rows from this tab."
              : "Download will include all rows from this tab."}
          </p>
        </div>
        <Button
          onClick={onDownload}
          disabled={isDownloading}
          className="h-11 w-full rounded-xl bg-green-600 px-4 text-white hover:bg-green-700 sm:w-auto"
        >
          {isDownloading ? (
            <div className="flex items-center gap-2">
              <Loader size={14} color="currentColor" />
              Downloading...
            </div>
          ) : (
            <>
              <Download size={16} className="mr-2" />
              {hasQuery ? `Download Filtered ${downloadLabel}` : downloadLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function MobileInfoRow({ label, value, className, hideIfEmpty = false }: { label: string; value: string | number | null | undefined; className?: string; hideIfEmpty?: boolean }) {
  const isEmpty = value === null || value === undefined || value === "";
  if (hideIfEmpty && isEmpty) return null;
  return (
    <div className={className}>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-[13px] font-semibold leading-4 text-slate-800">{isEmpty ? "--" : value}</p>
    </div>
  );
}

function PaginationBar({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  if (!total) return null;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, total);
  const pages = totalPages <= 3 ? Array.from({ length: totalPages }, (_, i) => i + 1) : page <= 2 ? [1, 2, 3] : page >= totalPages - 1 ? [totalPages - 2, totalPages - 1, totalPages] : [page - 1, page, page + 1];
  return (
    <div className="mt-2 flex flex-col gap-1.5 px-1.5 text-xs text-slate-500 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:px-0 sm:text-sm">
      <span>Showing <span className="font-semibold text-slate-700">{startIndex}</span>-<span className="font-semibold text-slate-700">{endIndex}</span> of <span className="font-semibold text-slate-700">{total.toLocaleString("en-IN")}</span></span>
      <div className="flex items-center gap-1 self-center sm:self-auto">
        <Button variant="ghost" size="icon" onClick={() => onChange(page - 1)} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
        {pages.map((p) => <Button key={p} variant={p === page ? "default" : "outline"} size="icon" onClick={() => onChange(p)} disabled={p === page}>{p}</Button>)}
        <Button variant="ghost" size="icon" onClick={() => onChange(page + 1)} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function PurchaseOrderCard({ row, index, title }: { row: POData; index: number; title: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <h3 className="mt-1 text-lg font-black leading-5 text-slate-900">{row.INDENT_NO || "--"}</h3>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">S.No</p>
          <p className="mt-0.5 text-[13px] font-semibold leading-4 text-slate-800">{index}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
        <MobileInfoRow label="PO No." value={row.VRNO} />
        <MobileInfoRow label="Indenter" value={row.INDENTER} hideIfEmpty />
        <MobileInfoRow label="PO Date" value={formatDate(row.VRDATE)} />
        <MobileInfoRow label="UOM" value={row.UM} />
        <MobileInfoRow label="Ordered Qty" value={row.QTYORDER} />
        <MobileInfoRow label="Executed Qty" value={row.QTYEXECUTE} />
        <MobileInfoRow label="Balance Qty" value={row.BALANCE_QTY ?? 0} />
        <MobileInfoRow label="Planned Time Stamp" value={formatDateTime(row.PLANNED_TIMESTAMP)} className="col-span-2" />
        <MobileInfoRow label="Vendor Name" value={row.VENDOR_NAME} className="col-span-2" />
        <MobileInfoRow label="Item Name" value={row.ITEM_NAME} className="col-span-2" />
      </div>
    </div>
  );
}

export default function PendingIndents() {
  const [pendingAll, setPendingAll] = useState<POData[]>([]);
  const [historyAll, setHistoryAll] = useState<POData[]>([]);
  const [pendingSearch, setPendingSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [downloadingPending, setDownloadingPending] = useState(false);
  const [downloadingHistory, setDownloadingHistory] = useState(false);

  const fetchPendingAll = async () => {
    const res = await storeApi.getPoPending();
    const rows = res && typeof res === "object" && "data" in res && Array.isArray((res as Record<string, unknown>).data) ? ((res as { data: unknown[] }).data) : Array.isArray(res) ? res : [];
    const normalized = rows.map((row) => normalize(row)).sort((a, b) => compareDateDesc(a.VRDATE || a.PLANNED_TIMESTAMP, b.VRDATE || b.PLANNED_TIMESTAMP));
    setPendingAll(normalized);
    setPendingPage(1);
  };

  const fetchHistoryAll = async () => {
    const res = await storeApi.getPoHistory();
    const rows = res && typeof res === "object" && "data" in res && Array.isArray((res as Record<string, unknown>).data) ? ((res as { data: unknown[] }).data) : Array.isArray(res) ? res : [];
    const normalized = rows.map((row) => normalize(row)).sort((a, b) => compareDateDesc(a.VRDATE || a.PLANNED_TIMESTAMP, b.VRDATE || b.PLANNED_TIMESTAMP));
    setHistoryAll(normalized);
    setHistoryPage(1);
  };

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchPendingAll(), fetchHistoryAll()]);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch purchase orders");
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, []);

  const handleDownload = async (type: "pending" | "history", rows: POData[], query: string) => {
    const setLoadingState = type === "pending" ? setDownloadingPending : setDownloadingHistory;
    const hasQuery = query.trim().length > 0;
    const fileName = type === "pending"
      ? hasQuery ? "pending-purchase-orders-filtered.xlsx" : "pending-purchase-orders.xlsx"
      : hasQuery ? "received-purchase-orders-filtered.xlsx" : "received-purchase-orders.xlsx";
    const sheetName = type === "pending" ? "Pending POs" : "Received POs";
    try {
      setLoadingState(true);
      if (!rows.length) {
        toast.error(hasQuery ? "No filtered rows available to download." : "No purchase orders available to download.");
        return;
      }
      downloadRowsAsExcel(rows, fileName, sheetName);
    } catch (err) {
      console.error(`Failed to download ${type} purchase orders`, err);
      toast.error(err instanceof Error ? err.message : "Unable to download the file right now.");
    } finally {
      setLoadingState(false);
    }
  };

  const pendingFiltered = filterPurchaseOrders(pendingAll, pendingSearch);
  const historyFiltered = filterPurchaseOrders(historyAll, historySearch);
  const pendingTotal = pendingFiltered.length;
  const pendingCurrentPage = Math.min(pendingPage, Math.max(1, Math.ceil(pendingTotal / PAGE_SIZE)));
  const pendingStartIndex = (pendingCurrentPage - 1) * PAGE_SIZE;
  const pendingPageRows = pendingFiltered.slice(pendingStartIndex, pendingStartIndex + PAGE_SIZE);
  const historyTotal = historyFiltered.length;
  const historyCurrentPage = Math.min(historyPage, Math.max(1, Math.ceil(historyTotal / PAGE_SIZE)));
  const historyStartIndex = (historyCurrentPage - 1) * PAGE_SIZE;
  const historyPageRows = historyFiltered.slice(historyStartIndex, historyStartIndex + PAGE_SIZE);

  if (loading) {
    return <Loading heading="Purchase Orders" subtext="Loading pending and received purchase orders" icon={<ListTodo size={48} className="text-blue-600" />} />;
  }

  return (
    <div className="w-full space-y-4 px-0 py-2 sm:p-4 md:p-6 lg:p-8">
      <Heading heading="Purchase Orders" subtext="Pending and received purchase orders"><ListTodo size={50} className="text-primary" /></Heading>
      <Tabs defaultValue="pending" className="mt-4 w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <TabsTrigger value="pending" className="w-full rounded-xl py-2.5 font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            Pending POs ({pendingAll.length})
          </TabsTrigger>
          <TabsTrigger value="received" className="w-full rounded-xl py-2.5 font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            Received POs ({historyAll.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-3">
          <div className="px-1.5 sm:px-0">
            <PurchaseOrderToolbar
              title="Pending Purchase Orders"
              query={pendingSearch}
              totalCount={pendingAll.length}
              filteredCount={pendingTotal}
              onQueryChange={(value) => {
                setPendingSearch(value);
                setPendingPage(1);
              }}
              onDownload={() => handleDownload("pending", pendingFiltered, pendingSearch)}
              isDownloading={downloadingPending}
              downloadLabel="Pending Excel"
            />
          </div>
          <div className="space-y-2 px-1.5 md:hidden">
            {pendingPageRows.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-500 shadow-sm">{pendingSearch.trim() ? `No Pending POs found for "${pendingSearch.trim()}"` : "No Pending POs Found"}</div> : pendingPageRows.map((row, index) => <PurchaseOrderCard key={`${row.VRNO}-${index}`} row={row} index={pendingStartIndex + index + 1} title="Pending PO" />)}
          </div>
          <div className="relative hidden w-full md:block">
            <div className="max-h-[calc(100vh-350px)] overflow-x-auto overflow-y-auto rounded-xl border bg-white shadow-sm">
              <table className="min-w-[1000px] border-collapse text-xs">
                <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm"><tr><th className="sticky left-0 z-30 border-b bg-slate-100 px-3 py-2 text-left font-semibold">Indent No</th><th className="border-b px-3 py-2 text-center font-semibold">S.No</th><th className="border-b px-3 py-2 font-semibold">Indenter</th><th className="border-b px-3 py-2 font-semibold">PO No.</th><th className="border-b px-3 py-2 font-semibold">Planned Time Stamp</th><th className="border-b px-3 py-2 font-semibold">PO Date</th><th className="border-b px-3 py-2 font-semibold">Vendor Name</th><th className="border-b px-3 py-2 font-semibold">Item Name</th><th className="border-b px-3 py-2 font-semibold">UOM</th><th className="border-b px-3 py-2 font-semibold">Ordered Qty</th><th className="border-b px-3 py-2 font-semibold">Executed Qty</th><th className="border-b px-3 py-2 font-semibold">Balance Qty</th></tr></thead>
                <tbody>{pendingPageRows.length === 0 ? <tr><td colSpan={12} className="py-6 text-center text-sm text-slate-400">{pendingSearch.trim() ? `No Pending POs found for "${pendingSearch.trim()}"` : "No Pending POs Found"}</td></tr> : pendingPageRows.map((row, index) => <tr key={`${row.VRNO}-${index}`} className="hover:bg-slate-50"><td className="sticky left-0 z-10 border-b bg-white px-3 py-1 text-left font-medium">{row.INDENT_NO}</td><td className="border-b px-2 py-1 text-center">{pendingStartIndex + index + 1}</td><td className="border-b px-2 py-1">{row.INDENTER}</td><td className="border-b px-2 py-1">{row.VRNO}</td><td className="border-b px-2 py-1">{formatDateTime(row.PLANNED_TIMESTAMP)}</td><td className="border-b px-2 py-1">{formatDate(row.VRDATE)}</td><td className="border-b px-2 py-1">{row.VENDOR_NAME}</td><td className="border-b px-2 py-1">{row.ITEM_NAME}</td><td className="border-b px-2 py-1">{row.UM}</td><td className="border-b px-2 py-1">{row.QTYORDER}</td><td className="border-b px-2 py-1">{row.QTYEXECUTE}</td><td className="border-b px-2 py-1">{row.BALANCE_QTY ?? 0}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <PaginationBar page={pendingCurrentPage} total={pendingTotal} onChange={(p) => setPendingPage(Math.max(1, p))} />
        </TabsContent>

        <TabsContent value="received" className="mt-3">
          <div className="px-1.5 sm:px-0">
            <PurchaseOrderToolbar
              title="Received Purchase Orders"
              query={historySearch}
              totalCount={historyAll.length}
              filteredCount={historyTotal}
              onQueryChange={(value) => {
                setHistorySearch(value);
                setHistoryPage(1);
              }}
              onDownload={() => handleDownload("history", historyFiltered, historySearch)}
              isDownloading={downloadingHistory}
              downloadLabel="Received Excel"
            />
          </div>
          <div className="space-y-2 px-1.5 md:hidden">
            {historyPageRows.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-500 shadow-sm">{historySearch.trim() ? `No Received POs found for "${historySearch.trim()}"` : "No Received POs Found"}</div> : historyPageRows.map((row, index) => <PurchaseOrderCard key={`${row.VRNO}-${index}`} row={row} index={historyStartIndex + index + 1} title="Received PO" />)}
          </div>
          <div className="relative hidden w-full md:block">
            <div className="max-h-[calc(100vh-350px)] overflow-x-auto overflow-y-auto rounded-xl border bg-white shadow-sm">
              <table className="min-w-[1000px] border-collapse text-xs">
                <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm"><tr><th className="sticky left-0 z-30 border-b bg-slate-100 px-3 py-2 text-left font-semibold">Indent No.</th><th className="border-b px-3 py-2 text-center font-semibold">S.No</th><th className="border-b px-3 py-2 font-semibold">PO No.</th><th className="border-b px-3 py-2 font-semibold">Indenter</th><th className="border-b px-3 py-2 font-semibold">Planned Time Stamp</th><th className="border-b px-3 py-2 font-semibold">PO Date</th><th className="border-b px-3 py-2 font-semibold">Vendor Name</th><th className="border-b px-3 py-2 font-semibold">Item Name</th><th className="border-b px-3 py-2 font-semibold">UOM</th><th className="border-b px-3 py-2 font-semibold">Ordered Qty</th><th className="border-b px-3 py-2 font-semibold">Executed Qty</th><th className="border-b px-3 py-2 font-semibold">Balance Qty</th></tr></thead>
                <tbody>{historyPageRows.length === 0 ? <tr><td colSpan={12} className="py-6 text-center text-sm text-slate-400">{historySearch.trim() ? `No Received POs found for "${historySearch.trim()}"` : "No Received POs Found"}</td></tr> : historyPageRows.map((row, index) => <tr key={`${row.VRNO}-${index}`} className="hover:bg-slate-50"><td className="sticky left-0 z-10 border-b bg-white px-3 py-1 text-left font-medium">{row.INDENT_NO}</td><td className="border-b px-2 py-1 text-center">{historyStartIndex + index + 1}</td><td className="border-b px-2 py-1">{row.VRNO}</td><td className="border-b px-2 py-1">{row.INDENTER}</td><td className="border-b px-2 py-1">{formatDateTime(row.PLANNED_TIMESTAMP)}</td><td className="border-b px-2 py-1">{formatDate(row.VRDATE)}</td><td className="border-b px-2 py-1">{row.VENDOR_NAME}</td><td className="border-b px-2 py-1">{row.ITEM_NAME}</td><td className="border-b px-2 py-1">{row.UM}</td><td className="border-b px-2 py-1">{row.QTYORDER}</td><td className="border-b px-2 py-1">{row.QTYEXECUTE}</td><td className="border-b px-2 py-1">{row.BALANCE_QTY ?? 0}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <PaginationBar page={historyCurrentPage} total={historyTotal} onChange={(p) => setHistoryPage(Math.max(1, p))} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
