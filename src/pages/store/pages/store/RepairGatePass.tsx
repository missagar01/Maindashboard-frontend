import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, Loader } from "lucide-react";
import { Link, useLocation } from "react-router";
import { toast } from "sonner";

import { repairFollowupApi } from "@/api/store/storeRepairFollowupApi";
import { storeApi } from "@/api/store/storeSystemApi";
import Heading from "../../components/element/Heading";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const PAGE_SIZE = 50;

type GatePassRow = {
  vrno?: string;
  vrdate?: string;
  department?: string;
  partyname?: string;
  item_name?: string;
  item_code?: string;
  qtyissued?: number;
  qtyrecd?: number;
  um?: string;
  app_remark?: string;
  remark?: string;
  repair_gate_pass?: string;
  receive_gate_pass?: string;
  received_date?: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

function MobileInfoRow({
  label,
  value,
  className,
  hideIfEmpty = false,
}: {
  label: string;
  value: string | number | null | undefined;
  className?: string;
  hideIfEmpty?: boolean;
}) {
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
  const pages =
    totalPages <= 3 ? Array.from({ length: totalPages }, (_, i) => i + 1) : page <= 2 ? [1, 2, 3] : page >= totalPages - 1 ? [totalPages - 2, totalPages - 1, totalPages] : [page - 1, page, page + 1];

  return (
    <div className="mt-2 flex flex-col gap-1.5 px-1.5 text-xs text-slate-500 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:px-0 sm:text-sm">
      <span>
        Showing <span className="font-semibold text-slate-700">{startIndex}</span>-<span className="font-semibold text-slate-700">{endIndex}</span> of <span className="font-semibold text-slate-700">{total.toLocaleString("en-IN")}</span>
      </span>
      <div className="flex items-center gap-1 self-center sm:self-auto">
        <Button variant="ghost" size="icon" onClick={() => onChange(page - 1)} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
        {pages.map((p) => <Button key={p} variant={p === page ? "default" : "outline"} size="icon" onClick={() => onChange(p)} disabled={p === page}>{p}</Button>)}
        <Button variant="ghost" size="icon" onClick={() => onChange(page + 1)} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export default function RepairGatePass() {
  const location = useLocation();
  const isHistory = location.pathname.includes("history");
  const [rows, setRows] = useState<GatePassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [selectedRow, setSelectedRow] = useState<GatePassRow | null>(null);
  const [leadTime, setLeadTime] = useState("");
  const [processedKeys, setProcessedKeys] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setRows([]);
      try {
        const res = isHistory ? await storeApi.getRepairGatePassHistory() : await storeApi.getRepairGatePassPending();
        let payload: unknown[] = [];
        if (res && typeof res === "object") {
          if ("data" in res && Array.isArray((res as { data?: unknown }).data)) payload = (res as { data: unknown[] }).data;
          else if (Array.isArray(res)) payload = res;
        }
        if (!active) return;
        setRows(payload.map((row) => {
          const r = row as Record<string, unknown>;
          return isHistory ? {
            repair_gate_pass: String(r.REPAIR_GATE_PASS ?? r.repair_gate_pass ?? "").trim(),
            receive_gate_pass: String(r.RECEIVE_GATE_PASS ?? r.receive_gate_pass ?? "").trim(),
            received_date: String(r.RECEIVED_DATE ?? r.received_date ?? "").trim(),
            department: String(r.DEPARTMENT ?? r.department ?? "").trim(),
            partyname: String(r.PARTYNAME ?? r.partyname ?? "").trim(),
            item_name: String(r.ITEM_NAME ?? r.item_name ?? "").trim(),
            item_code: String(r.ITEM_CODE ?? r.item_code ?? "").trim(),
            qtyrecd: Number(r.QTYRECD ?? r.qtyrecd ?? 0),
            um: String(r.UM ?? r.um ?? "").trim(),
            app_remark: String(r.APP_REMARK ?? r.app_remark ?? "").trim(),
            remark: String(r.REMARK ?? r.remark ?? "").trim(),
          } : {
            vrno: String(r.VRNO ?? r.vrno ?? "").trim(),
            vrdate: String(r.VRDATE ?? r.vrdate ?? "").trim(),
            department: String(r.DEPARTMENT ?? r.department ?? "").trim(),
            partyname: String(r.PARTYNAME ?? r.partyname ?? "").trim(),
            item_name: String(r.ITEM_NAME ?? r.item_name ?? "").trim(),
            item_code: String(r.ITEM_CODE ?? r.item_code ?? "").trim(),
            qtyissued: Number(r.QTYISSUED ?? r.qtyissued ?? 0),
            um: String(r.UM ?? r.um ?? "").trim(),
            app_remark: String(r.APP_REMARK ?? r.app_remark ?? "").trim(),
            remark: String(r.REMARK ?? r.remark ?? "").trim(),
          };
        }));
      } catch (err) {
        console.error("Failed to load repair gate pass data", err);
        if (active) {
          toast.error("Failed to load repair gate pass data");
          setRows([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => {
      active = false;
    };
  }, [isHistory]);

  useEffect(() => {
    let mounted = true;
    repairFollowupApi.getAll().then((res) => {
      if (!mounted || !Array.isArray(res?.data)) return;
      const next = new Set<string>();
      for (const row of res.data) if (row.gate_pass_no && row.item_code) next.add(`${row.gate_pass_no}|${row.item_code}`);
      setProcessedKeys(next);
    }).catch((err) => console.error("Failed to fetch processed follow-ups", err));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => setCurrentPage(1), [isHistory]);

  const filteredRows = search.trim()
    ? rows.filter((row) => {
        const q = search.trim().toLowerCase();
        return isHistory
          ? [row.repair_gate_pass, row.receive_gate_pass, row.department, row.partyname, row.item_name, row.item_code].join(" ").toLowerCase().includes(q)
          : [row.vrno, row.department, row.partyname, row.item_name, row.item_code].join(" ").toLowerCase().includes(q);
      })
    : rows;
  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPageNum = Math.min(currentPage, totalPages);
  const startIndex = (currentPageNum - 1) * PAGE_SIZE;
  const pageRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  const isAlreadyFollowedUp = (row: GatePassRow) => Boolean(row.vrno && row.item_code && processedKeys.has(`${row.vrno}|${row.item_code}`));
  const todayDateIST = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const formatDateIST = (value?: string) => value ? new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }) : "";
  const plannedFromGatePassIST = (value?: string) => { if (!value) return ""; const date = new Date(value); date.setDate(date.getDate() + 1); return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); };
  const calculatePlanned2IST = (actual1: string, leadTimeValue?: number) => { if (!actual1 || !leadTimeValue || leadTimeValue <= 0) return null; const date = new Date(actual1); date.setDate(date.getDate() + leadTimeValue - 2); return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); };
  const toISTDateOnly = (value?: string) => value ? new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : null;

  const closeFollowupForm = () => {
    setShowFollowupForm(false);
    setSelectedRow(null);
    setLeadTime("");
  };

  const handleFollowupSubmit = async () => {
    if (!selectedRow) return;
    try {
      const actual1Date = todayDateIST();
      const leadTimeNum = Number(leadTime);
      const res = await repairFollowupApi.create({
        gate_pass_no: selectedRow.vrno,
        gate_pass_date: toISTDateOnly(selectedRow.vrdate),
        department: selectedRow.department,
        party_name: selectedRow.partyname,
        item_name: selectedRow.item_name,
        item_code: selectedRow.item_code,
        uom: selectedRow.um,
        qty_issued: selectedRow.qtyissued,
        remarks: selectedRow.remark,
        planned1: plannedFromGatePassIST(selectedRow.vrdate),
        actual1: actual1Date,
        lead_time: leadTimeNum,
        planned2: calculatePlanned2IST(actual1Date, leadTimeNum),
        stage1_status: "completed",
        gate_pass_status: null,
      });
      if (res?.success) {
        if (selectedRow.vrno && selectedRow.item_code) setProcessedKeys((prev) => new Set(prev).add(`${selectedRow.vrno}|${selectedRow.item_code}`));
        toast.success("Follow-up created successfully");
        closeFollowupForm();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to create follow-up");
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const blob = await storeApi.downloadRepairGatePassPending();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `repair-gate-pass-pending-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download Excel:", error);
      toast.error("Unable to download the file right now.");
    } finally {
      setDownloading(false);
    }
  };

  const renderFollowupAction = (row: GatePassRow, compact = false) => {
    const disabled = isAlreadyFollowedUp(row);
    return (
      <Button
        size="sm"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setSelectedRow(row);
          setShowFollowupForm(true);
        }}
        className={disabled ? "bg-slate-300 text-slate-600 hover:bg-slate-300" : compact ? "h-8 rounded-lg bg-green-600 px-3 text-xs font-semibold text-white hover:bg-green-700" : "bg-green-600 text-white hover:bg-green-700"}
      >
        {disabled ? "Processed" : "Follow-up"}
      </Button>
    );
  };

  return (
    <div className="w-full space-y-4 px-0 py-2 sm:p-4 md:p-6 lg:p-8">
      <Heading heading={isHistory ? "Repair Gate Pass History" : "Repair Gate Pass Pending"} subtext={isHistory ? "Received repair gate pass records" : "Pending repair gate pass records"}><FileText size={50} className="text-primary" /></Heading>
      <div className="grid grid-cols-2 gap-2 px-1.5 sm:flex sm:flex-wrap sm:gap-3 sm:px-0">
        <Link to="/store/repair-gate-pass" className="w-full sm:w-auto"><Button variant={!isHistory ? "default" : "outline"} className={`w-full ${!isHistory ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`} size="sm">Pending</Button></Link>
        <Link to="/store/repair-gate-pass/history" className="w-full sm:w-auto"><Button variant={isHistory ? "default" : "outline"} className={`w-full ${isHistory ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`} size="sm">History</Button></Link>
      </div>
      <div className="flex flex-col gap-2 px-1.5 sm:px-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md"><Input placeholder={isHistory ? "Search: Repair Gate Pass / Receive Gate Pass / Department / Party / Item" : "Search: Gate Pass No / Department / Party / Item"} value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} /></div>
        {!isHistory && <Button onClick={handleDownload} disabled={downloading} className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto">{downloading ? <div className="flex items-center gap-2"><Loader className="animate-spin" size={14} />Downloading...</div> : <><Download size={16} className="mr-2" />Download Pending Excel</>}</Button>}
      </div>
      <div className="space-y-2 px-1.5 md:hidden">
        {loading ? <div className="rounded-xl border border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-500 shadow-sm"><div className="flex items-center justify-center gap-2"><Loader className="animate-spin text-blue-600" size={18} />Loading data...</div></div> : pageRows.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-500 shadow-sm">No data found</div> : pageRows.map((row, index) => <div key={`${row.vrno || row.repair_gate_pass}-${row.item_code}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{isHistory ? "Repair Gate Pass" : "Gate Pass No."}</p><h3 className="mt-1 text-lg font-black leading-5 text-slate-900">{(isHistory ? row.repair_gate_pass : row.vrno) || "--"}</h3></div>{isHistory ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-blue-700">{formatDate(row.received_date)}</span> : renderFollowupAction(row, true)}</div><div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5"><MobileInfoRow label={isHistory ? "Receive Gate Pass" : "Date"} value={isHistory ? row.receive_gate_pass : formatDate(row.vrdate)} /><MobileInfoRow label={isHistory ? "Qty Received" : "Qty Issued"} value={isHistory ? row.qtyrecd : row.qtyissued} /><MobileInfoRow label="Department" value={row.department} /><MobileInfoRow label="UOM" value={row.um} /><MobileInfoRow label="Party Name" value={row.partyname} className="col-span-2" /><MobileInfoRow label="Item Name" value={row.item_name} className="col-span-2" /><MobileInfoRow label="Item Code" value={row.item_code} /><MobileInfoRow label="App Remark" value={row.app_remark} hideIfEmpty /><MobileInfoRow label="Remark" value={row.remark} className="col-span-2" hideIfEmpty /></div></div>)}
      </div>
      <div className="relative hidden w-full md:block">
        <div className="max-h-[calc(100vh-350px)] overflow-x-auto overflow-y-auto rounded-xl border bg-white shadow-sm">
          {loading ? <div className="flex items-center justify-center p-8"><Loader className="animate-spin text-blue-600" size={24} /><span className="ml-2 text-slate-600">Loading data...</span></div> : pageRows.length === 0 ? <div className="flex items-center justify-center p-8"><span className="text-slate-500">No data found</span></div> : <table className="min-w-[1200px] border-collapse text-xs"><thead className="sticky top-0 z-20 bg-slate-100 shadow-sm"><tr>{isHistory ? <><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Repair Gate Pass</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Receive Gate Pass</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Received Date</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Department</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Party Name</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Item Name</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Item Code</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Qty Received</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">UOM</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">App Remark</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Remark</th></> : <><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Action</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Gate Pass No.</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Date</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Department</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Party Name</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Item Name</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Item Code</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Qty Issued</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">UOM</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">App Remark</th><th className="whitespace-nowrap border-b px-4 py-3 text-left font-bold text-slate-700">Remark</th></>}</tr></thead><tbody className="bg-white">{pageRows.map((row, idx) => <tr key={`${row.vrno || row.repair_gate_pass}-${row.item_code}-${idx}`} className="border-b transition-colors hover:bg-slate-50">{isHistory ? <><td className="border-b px-4 py-2 text-slate-900">{row.repair_gate_pass || "--"}</td><td className="border-b px-4 py-2 text-slate-900">{row.receive_gate_pass || "--"}</td><td className="border-b px-4 py-2 text-slate-900">{formatDate(row.received_date)}</td><td className="border-b px-4 py-2 text-slate-900">{row.department || "--"}</td><td className="border-b px-4 py-2 text-slate-900">{row.partyname || "--"}</td><td className="border-b px-4 py-2 text-slate-900">{row.item_name || "--"}</td><td className="border-b px-4 py-2 text-slate-900">{row.item_code || "--"}</td><td className="border-b px-4 py-2 text-slate-900">{row.qtyrecd ?? "--"}</td><td className="border-b px-4 py-2 text-slate-900">{row.um || "--"}</td><td className="border-b px-4 py-2 text-slate-900">{row.app_remark || "--"}</td><td className="whitespace-pre-wrap border-b px-4 py-2 text-slate-900">{row.remark || "--"}</td></> : <><td className="border-b px-4 py-2">{renderFollowupAction(row)}</td><td className="border-b px-4 py-2 text-slate-900">{row.vrno || "--"}</td><td className="border-b px-4 py-2 text-slate-900">{formatDate(row.vrdate)}</td><td className="border-b px-4 py-2 text-slate-900">{row.department || "--"}</td><td className="border-b px-4 py-2 text-slate-900">{row.partyname || "--"}</td><td className="border-b px-4 py-2 text-slate-900">{row.item_name || "--"}</td><td className="border-b px-4 py-2 text-slate-900">{row.item_code || "--"}</td><td className="border-b px-4 py-2 text-slate-900">{row.qtyissued ?? "--"}</td><td className="border-b px-4 py-2 text-slate-900">{row.um || "--"}</td><td className="border-b px-4 py-2 text-slate-900">{row.app_remark || "--"}</td><td className="whitespace-pre-wrap border-b px-4 py-2 text-slate-900">{row.remark || "--"}</td></>}</tr>)}</tbody></table>}
        </div>
      </div>
      {!loading && total > 0 && <PaginationBar page={currentPageNum} total={total} onChange={(page) => setCurrentPage(Math.max(1, page))} />}
      {showFollowupForm && selectedRow && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-4 shadow-lg sm:p-5"><h2 className="mb-4 text-lg font-semibold text-slate-900">Repair Follow-up</h2><div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold text-slate-500">Gate Pass No</label><Input value={selectedRow.vrno || ""} disabled /></div><div><label className="mb-1 block text-xs font-semibold text-slate-500">Gate Pass Date</label><Input value={formatDateIST(selectedRow.vrdate)} disabled /></div><div><label className="mb-1 block text-xs font-semibold text-slate-500">Department</label><Input value={selectedRow.department || ""} disabled /></div><div><label className="mb-1 block text-xs font-semibold text-slate-500">Party Name</label><Input value={selectedRow.partyname || ""} disabled /></div><div><label className="mb-1 block text-xs font-semibold text-slate-500">Item Name</label><Input value={selectedRow.item_name || ""} disabled /></div><div><label className="mb-1 block text-xs font-semibold text-slate-500">Item Code</label><Input value={selectedRow.item_code || ""} disabled /></div><div><label className="mb-1 block text-xs font-semibold text-slate-500">Qty Issued</label><Input value={selectedRow.qtyissued?.toString() || ""} disabled /></div><div><label className="mb-1 block text-xs font-semibold text-slate-500">UOM</label><Input value={selectedRow.um || ""} disabled /></div><div className="sm:col-span-2"><label className="mb-1 block text-xs font-semibold text-slate-500">Remarks</label><Input value={selectedRow.remark || ""} disabled /></div><div><label className="mb-1 block text-xs font-semibold text-slate-500">Planned Date (Stage 1)</label><Input value={plannedFromGatePassIST(selectedRow.vrdate)} disabled /></div><div><label className="mb-1 block text-xs font-semibold text-slate-500">Lead Time (Days)</label><Input type="number" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} /></div></div><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={closeFollowupForm}>Cancel</Button><Button onClick={handleFollowupSubmit}>Submit</Button></div></div></div>}
    </div>
  );
}
