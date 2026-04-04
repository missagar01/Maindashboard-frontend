import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ListTodo } from "lucide-react";
import { toast } from "sonner";
import { PuffLoader as Loader } from "react-spinners";

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

  const handleDownload = async (type: "pending" | "history") => {
    const setLoadingState = type === "pending" ? setDownloadingPending : setDownloadingHistory;
    const downloader = type === "pending" ? storeApi.downloadPoPending : storeApi.downloadPoHistory;
    const fileName = type === "pending" ? "pending-purchase-orders.xlsx" : "received-purchase-orders.xlsx";
    try {
      setLoadingState(true);
      const blob = await downloader();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Failed to download ${type} purchase orders`, err);
      toast.error(err instanceof Error ? err.message : "Unable to download the file right now.");
    } finally {
      setLoadingState(false);
    }
  };

  const pendingFiltered = pendingSearch.trim() ? pendingAll.filter((row) => [row.VRNO, row.INDENT_NO, row.VENDOR_NAME, row.ITEM_NAME].join(" ").toLowerCase().includes(pendingSearch.trim().toLowerCase())) : pendingAll;
  const historyFiltered = historySearch.trim() ? historyAll.filter((row) => [row.VRNO, row.INDENT_NO, row.VENDOR_NAME, row.ITEM_NAME].join(" ").toLowerCase().includes(historySearch.trim().toLowerCase())) : historyAll;
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
        <TabsList className="grid w-full grid-cols-2 px-1.5 sm:px-0">
          <TabsTrigger value="pending" className="w-full">Pending POs</TabsTrigger>
          <TabsTrigger value="received" className="w-full">Received POs</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-3">
          <div className="flex flex-col gap-2 px-1.5 sm:px-0 sm:flex-row sm:items-center sm:justify-between">
            <Input placeholder="Search: PO No / Vendor / Item" value={pendingSearch} onChange={(e) => { setPendingSearch(e.target.value); setPendingPage(1); }} className="w-full sm:max-w-md" />
            <Button onClick={() => handleDownload("pending")} disabled={downloadingPending} className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto">{downloadingPending ? <div className="flex items-center gap-2"><Loader size={14} color="currentColor" />Downloading...</div> : <><Download size={16} className="mr-2" />Download Pending Excel</>}</Button>
          </div>
          <div className="space-y-2 px-1.5 md:hidden">
            {pendingPageRows.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-500 shadow-sm">No Pending POs Found</div> : pendingPageRows.map((row, index) => <PurchaseOrderCard key={`${row.VRNO}-${index}`} row={row} index={pendingStartIndex + index + 1} title="Pending PO" />)}
          </div>
          <div className="relative hidden w-full md:block">
            <div className="max-h-[calc(100vh-350px)] overflow-x-auto overflow-y-auto rounded-xl border bg-white shadow-sm">
              <table className="min-w-[1000px] border-collapse text-xs">
                <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm"><tr><th className="sticky left-0 z-30 border-b bg-slate-100 px-3 py-2 text-left font-semibold">Indent No</th><th className="border-b px-3 py-2 text-center font-semibold">S.No</th><th className="border-b px-3 py-2 font-semibold">Indenter</th><th className="border-b px-3 py-2 font-semibold">PO No.</th><th className="border-b px-3 py-2 font-semibold">Planned Time Stamp</th><th className="border-b px-3 py-2 font-semibold">PO Date</th><th className="border-b px-3 py-2 font-semibold">Vendor Name</th><th className="border-b px-3 py-2 font-semibold">Item Name</th><th className="border-b px-3 py-2 font-semibold">UOM</th><th className="border-b px-3 py-2 font-semibold">Ordered Qty</th><th className="border-b px-3 py-2 font-semibold">Executed Qty</th><th className="border-b px-3 py-2 font-semibold">Balance Qty</th></tr></thead>
                <tbody>{pendingPageRows.length === 0 ? <tr><td colSpan={12} className="py-6 text-center text-sm text-slate-400">No Pending POs Found</td></tr> : pendingPageRows.map((row, index) => <tr key={`${row.VRNO}-${index}`} className="hover:bg-slate-50"><td className="sticky left-0 z-10 border-b bg-white px-3 py-1 text-left font-medium">{row.INDENT_NO}</td><td className="border-b px-2 py-1 text-center">{pendingStartIndex + index + 1}</td><td className="border-b px-2 py-1">{row.INDENTER}</td><td className="border-b px-2 py-1">{row.VRNO}</td><td className="border-b px-2 py-1">{formatDateTime(row.PLANNED_TIMESTAMP)}</td><td className="border-b px-2 py-1">{formatDate(row.VRDATE)}</td><td className="border-b px-2 py-1">{row.VENDOR_NAME}</td><td className="border-b px-2 py-1">{row.ITEM_NAME}</td><td className="border-b px-2 py-1">{row.UM}</td><td className="border-b px-2 py-1">{row.QTYORDER}</td><td className="border-b px-2 py-1">{row.QTYEXECUTE}</td><td className="border-b px-2 py-1">{row.BALANCE_QTY ?? 0}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <PaginationBar page={pendingCurrentPage} total={pendingTotal} onChange={(p) => setPendingPage(Math.max(1, p))} />
        </TabsContent>

        <TabsContent value="received" className="mt-3">
          <div className="flex flex-col gap-2 px-1.5 sm:px-0 sm:flex-row sm:items-center sm:justify-between">
            <Input placeholder="Search: PO No / Vendor / Item" value={historySearch} onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }} className="w-full sm:max-w-md" />
            <Button onClick={() => handleDownload("history")} disabled={downloadingHistory} className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto">{downloadingHistory ? <div className="flex items-center gap-2"><Loader size={14} color="currentColor" />Downloading...</div> : <><Download size={16} className="mr-2" />Download Received Excel</>}</Button>
          </div>
          <div className="space-y-2 px-1.5 md:hidden">
            {historyPageRows.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-500 shadow-sm">No Received POs Found</div> : historyPageRows.map((row, index) => <PurchaseOrderCard key={`${row.VRNO}-${index}`} row={row} index={historyStartIndex + index + 1} title="Received PO" />)}
          </div>
          <div className="relative hidden w-full md:block">
            <div className="max-h-[calc(100vh-350px)] overflow-x-auto overflow-y-auto rounded-xl border bg-white shadow-sm">
              <table className="min-w-[1000px] border-collapse text-xs">
                <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm"><tr><th className="sticky left-0 z-30 border-b bg-slate-100 px-3 py-2 text-left font-semibold">Indent No.</th><th className="border-b px-3 py-2 text-center font-semibold">S.No</th><th className="border-b px-3 py-2 font-semibold">PO No.</th><th className="border-b px-3 py-2 font-semibold">Indenter</th><th className="border-b px-3 py-2 font-semibold">Planned Time Stamp</th><th className="border-b px-3 py-2 font-semibold">PO Date</th><th className="border-b px-3 py-2 font-semibold">Vendor Name</th><th className="border-b px-3 py-2 font-semibold">Item Name</th><th className="border-b px-3 py-2 font-semibold">UOM</th><th className="border-b px-3 py-2 font-semibold">Ordered Qty</th><th className="border-b px-3 py-2 font-semibold">Executed Qty</th><th className="border-b px-3 py-2 font-semibold">Balance Qty</th></tr></thead>
                <tbody>{historyPageRows.length === 0 ? <tr><td colSpan={12} className="py-6 text-center text-sm text-slate-400">No Received POs Found</td></tr> : historyPageRows.map((row, index) => <tr key={`${row.VRNO}-${index}`} className="hover:bg-slate-50"><td className="sticky left-0 z-10 border-b bg-white px-3 py-1 text-left font-medium">{row.INDENT_NO}</td><td className="border-b px-2 py-1 text-center">{historyStartIndex + index + 1}</td><td className="border-b px-2 py-1">{row.VRNO}</td><td className="border-b px-2 py-1">{row.INDENTER}</td><td className="border-b px-2 py-1">{formatDateTime(row.PLANNED_TIMESTAMP)}</td><td className="border-b px-2 py-1">{formatDate(row.VRDATE)}</td><td className="border-b px-2 py-1">{row.VENDOR_NAME}</td><td className="border-b px-2 py-1">{row.ITEM_NAME}</td><td className="border-b px-2 py-1">{row.UM}</td><td className="border-b px-2 py-1">{row.QTYORDER}</td><td className="border-b px-2 py-1">{row.QTYEXECUTE}</td><td className="border-b px-2 py-1">{row.BALANCE_QTY ?? 0}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <PaginationBar page={historyCurrentPage} total={historyTotal} onChange={(p) => setHistoryPage(Math.max(1, p))} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
