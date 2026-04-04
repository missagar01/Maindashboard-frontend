import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardCheck, Search } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { storeApi } from "@/api/store/storeSystemApi";
import { useAuth } from "../../../../context/AuthContext";
import DataTable from "../../components/element/DataTable";
import Heading from "../../components/element/Heading";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

type IndentRow = {
  id?: string;
  timestamp: string;
  requestNumber?: string;
  requesterName?: string;
  department?: string;
  indentSeries?: string;
  division?: string;
  itemCode?: string;
  productName?: string;
  requestQty?: number;
  uom?: string;
  costLocation?: string;
  formType?: string;
  status?: "APPROVED" | "REJECTED" | "PENDING" | "";
  gmStatus?: "APPROVED" | "REJECTED" | "PENDING" | "";
};

const PAGE_SIZE = 50;

const mapApiRowToIndent = (rec: Record<string, unknown>): IndentRow => {
  const normalizeStatus = (val: unknown): IndentRow["status"] => {
    if (typeof val !== "string") return "";
    const upper = val.toUpperCase();
    return upper === "APPROVED" || upper === "REJECTED" || upper === "PENDING"
      ? (upper as IndentRow["status"])
      : "";
  };

  return {
    id: rec.id ? String(rec.id) : undefined,
    timestamp:
      (rec.sample_timestamp as string) ??
      (rec.timestamp as string) ??
      (rec.created_at as string) ??
      (rec.createdAt as string) ??
      "",
    requestNumber: (rec.request_number as string) ?? (rec.requestNumber as string) ?? "",
    requesterName: (rec.requester_name as string) ?? (rec.requesterName as string) ?? "",
    department: (rec.department as string) ?? "",
    indentSeries: (rec.indent_series as string) ?? (rec.indentSeries as string) ?? "",
    division: (rec.division as string) ?? "",
    itemCode: (rec.item_code as string) ?? (rec.itemCode as string) ?? "",
    productName: (rec.product_name as string) ?? (rec.productName as string) ?? "",
    requestQty: Number(rec.request_qty ?? rec.requestQty ?? 0) || Number(rec.quantity ?? 0),
    uom: (rec.uom as string) ?? "",
    costLocation: (rec.cost_location as string) ?? (rec.costLocation as string) ?? "",
    formType: (rec.form_type as string) ?? (rec.formType as string) ?? "",
    status: normalizeStatus(rec.request_status),
    gmStatus: normalizeStatus(rec.gm_approval),
  };
};

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return "--";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusClassName = (status?: string) => {
  const value = (status || "").toUpperCase();
  if (value === "APPROVED") return "bg-emerald-50 text-emerald-700";
  if (value === "REJECTED") return "bg-rose-50 text-rose-700";
  return "bg-blue-50 text-blue-700";
};

const filterRows = (rows: IndentRow[], searchText: string) => {
  const query = searchText.trim().toLowerCase();
  if (!query) return rows;
  return rows.filter((row) =>
    [
      row.requestNumber,
      row.formType,
      row.indentSeries,
      row.requesterName,
      row.department,
      row.division,
      row.itemCode,
      row.productName,
      row.requestQty,
      row.uom,
      row.costLocation,
      row.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
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

export default function ApprowIndentData() {
  const { user } = useAuth();
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [indentNumber, setIndentNumber] = useState("");
  const [headerRequesterName, setHeaderRequesterName] = useState("");
  const [openEdit, setOpenEdit] = useState(false);
  const [modalItems, setModalItems] = useState<IndentRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [itemStocks, setItemStocks] = useState<Record<string, number>>({});
  const [pendingSearch, setPendingSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const canSave = useMemo(
    () =>
      modalItems.length > 0 &&
      modalItems.some((item) => {
        const status = (item.status ?? "").toUpperCase();
        return status === "APPROVED" || status === "REJECTED";
      }),
    [modalItems]
  );

  useEffect(() => {
    let active = true;

    const fetchIndents = async () => {
      try {
        setLoading(true);
        const res = await storeApi.getAllIndents();
        if (!active) return;

        const raw = Array.isArray((res as { data?: unknown[] })?.data)
          ? (res as { data: unknown[] }).data
          : Array.isArray(res)
            ? res
            : [];
        const mapped = raw.map((rec: Record<string, unknown>) => mapApiRowToIndent(rec));
        setRows(mapped);

        const latest = mapped.find((row) => (row.requestNumber || "").trim() !== "");
        if (latest?.requestNumber) setIndentNumber(latest.requestNumber);
        if (latest?.requesterName) setHeaderRequesterName(latest.requesterName);
      } catch (err) {
        console.error("Failed to load indents", err);
        if (active) toast.error("Failed to load indent list");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchIndents();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        const today = new Date();
        const todayFormatted = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
        const res = await storeApi.getStock(todayFormatted, todayFormatted);
        let dataArray: Record<string, unknown>[] = [];

        if (Array.isArray(res)) {
          dataArray = res;
        } else if (res && typeof res === "object") {
          const response = res as { data?: Record<string, unknown>[] | { data?: Record<string, unknown>[] } };
          if (Array.isArray(response.data)) {
            dataArray = response.data;
          } else if (Array.isArray(response.data?.data)) {
            dataArray = response.data.data;
          }
        }

        const stockMap: Record<string, number> = {};
        dataArray.forEach((item) => {
          const code = String(item.COL1 ?? item.itemCode ?? "").trim();
          const qty = Number(item.COL5 ?? item.closingQty ?? 0);
          if (code) stockMap[code] = qty;
        });
        setItemStocks(stockMap);
      } catch (err) {
        console.error("Failed to fetch stock data", err);
      }
    };

    fetchStockData();
  }, []);

  const basePendingRows = useMemo(
    () =>
      rows.filter((row) => {
        const status = (row.status || "").toUpperCase();
        const formType = (row.formType || "").toUpperCase();
        const role = String(user?.role || "").toUpperCase();
        const userDept = (user?.user_access || user?.department || "").toUpperCase();

        if (status !== "PENDING") return false;
        if (!(formType === "INDENT" || formType === "REQUISITION")) return false;

        const canSeeAll = role === "ADMIN" || role === "USER";
        return !canSeeAll && userDept
          ? (row.department || "").toUpperCase() === userDept
          : true;
      }),
    [rows, user]
  );

  const baseHistoryRows = useMemo(
    () =>
      rows.filter((row) => {
        const status = (row.status || "").toUpperCase();
        const formType = (row.formType || "").toUpperCase();
        const role = String(user?.role || "").toUpperCase();
        const userDept = (user?.user_access || user?.department || "").toUpperCase();

        if (!(status === "APPROVED" || status === "REJECTED")) return false;
        if (!(formType === "INDENT" || formType === "REQUISITION")) return false;

        const canSeeAll = role === "ADMIN" || role === "USER";
        return !canSeeAll && userDept
          ? (row.department || "").toUpperCase() === userDept
          : true;
      }),
    [rows, user]
  );

  const pendingRows = useMemo(() => filterRows(basePendingRows, pendingSearch), [basePendingRows, pendingSearch]);
  const historyRows = useMemo(() => filterRows(baseHistoryRows, historySearch), [baseHistoryRows, historySearch]);
  const pendingTotal = pendingRows.length;
  const historyTotal = historyRows.length;
  const pendingCurrentPage = Math.min(pendingPage, Math.max(1, Math.ceil(pendingTotal / PAGE_SIZE)));
  const historyCurrentPage = Math.min(historyPage, Math.max(1, Math.ceil(historyTotal / PAGE_SIZE)));
  const pendingStartIndex = (pendingCurrentPage - 1) * PAGE_SIZE;
  const historyStartIndex = (historyCurrentPage - 1) * PAGE_SIZE;
  const pendingPageRows = pendingRows.slice(pendingStartIndex, pendingStartIndex + PAGE_SIZE);
  const historyPageRows = historyRows.slice(historyStartIndex, historyStartIndex + PAGE_SIZE);

  const fetchRequestItems = useCallback(async (requestNo: string) => {
    const res = await storeApi.getIndent(requestNo);
    const payload = (res as { data?: unknown[] }).data ?? res;
    const list = Array.isArray(payload) ? payload : payload ? [payload] : [];
    return list.map((rec: Record<string, unknown>) => mapApiRowToIndent(rec));
  }, []);

  const handleProcess = useCallback(
    async (row: IndentRow) => {
      const requestNo = row.requestNumber || "";
      if (!requestNo) {
        toast.error("Request number unavailable for this row");
        return;
      }

      setIndentNumber(requestNo);
      setHeaderRequesterName(row.requesterName || "");
      setModalItems([]);
      setDetailsLoading(true);
      setOpenEdit(true);

      try {
        const details = await fetchRequestItems(requestNo);
        setModalItems(details.length ? details : [row]);
      } catch (err) {
        console.error("Failed to fetch indent details", err);
        toast.error("Failed to fetch indent details");
        setOpenEdit(false);
      } finally {
        setDetailsLoading(false);
      }
    },
    [fetchRequestItems]
  );

  const renderStatus = (status?: string) => (
    <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${getStatusClassName(status)}`}>
      {status || "Pending"}
    </span>
  );

  const commonColumns = useMemo<ColumnDef<IndentRow>[]>(
    () => [
      {
        accessorKey: "timestamp",
        header: "Timestamp",
        cell: ({ row }) => formatTimestamp(row.original.timestamp),
      },
      { accessorKey: "requestNumber", header: "Request No." },
      { accessorKey: "formType", header: "Form Type" },
      { accessorKey: "indentSeries", header: "Series" },
      { accessorKey: "requesterName", header: "Requester" },
      { accessorKey: "department", header: "Department" },
      { accessorKey: "division", header: "Division" },
      { accessorKey: "itemCode", header: "Item Code" },
      { accessorKey: "productName", header: "Product" },
      { accessorKey: "uom", header: "UOM" },
      {
        accessorKey: "itemCode",
        header: "Stock",
        id: "stock_col",
        cell: ({ row }) => {
          const stock = itemStocks[row.original.itemCode || ""];
          if (stock === undefined) return <span className="text-gray-400">-</span>;
          return <span className={stock <= 0 ? "font-bold text-red-600" : "font-medium text-green-600"}>{stock}</span>;
        },
      },
      { accessorKey: "requestQty", header: "Qty" },
      { accessorKey: "costLocation", header: "Cost Location" },
    ],
    [itemStocks]
  );

  const pendingColumns = useMemo<ColumnDef<IndentRow>[]>(
    () => [
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Button
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={(event) => {
                event.preventDefault();
                handleProcess(row.original);
              }}
            >
              Process
            </Button>
          </div>
        ),
      },
      ...commonColumns,
    ],
    [commonColumns, handleProcess]
  );

  const historyColumns = useMemo<ColumnDef<IndentRow>[]>(
    () => [
      ...commonColumns,
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => renderStatus(row.original.status),
      },
    ],
    [commonColumns]
  );

  const onSaveEdit = async () => {
    if (!indentNumber) {
      toast.error("Request number missing");
      return;
    }
    if (!canSave) {
      toast.error("Please approve or reject every item before saving");
      return;
    }

    try {
      setSaving(true);
      const payload = modalItems.map((item) => ({
        id: item.id,
        request_number: indentNumber,
        item_code: item.itemCode,
        request_qty: Number(item.requestQty ?? 0),
        approved_quantity: Number(item.requestQty ?? 0),
        request_status: (item.status ?? "").toUpperCase() || "PENDING",
      }));

      await storeApi.updateIndentStatus(indentNumber, { items: payload });

      setRows((prev) =>
        prev.map((row) => {
          const updated = modalItems.find((item) => item.id === row.id);
          return updated
            ? {
                ...row,
                status: ((updated.status ?? "").toUpperCase() as IndentRow["status"]) || "PENDING",
              }
            : row;
        })
      );

      toast.success("Indent status updated");
      setOpenEdit(false);
    } catch (err) {
      console.error("Failed to update indent status", err);
      toast.error("Failed to update indent status");
    } finally {
      setSaving(false);
    }
  };

  const renderPendingCard = (row: IndentRow, index: number) => {
    const stock = itemStocks[row.itemCode || ""];
    return (
      <div key={`${row.requestNumber}-${row.itemCode}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Request No.</p>
            <h3 className="mt-1 text-lg font-black leading-5 text-slate-900">{row.requestNumber || "--"}</h3>
          </div>
          <Button
            size="sm"
            className="shrink-0 bg-blue-600 text-white hover:bg-blue-700"
            onClick={(event) => {
              event.preventDefault();
              handleProcess(row);
            }}
          >
            Process
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
          <MobileInfoRow label="Timestamp" value={formatTimestamp(row.timestamp)} />
          <MobileInfoRow label="Qty" value={row.requestQty} />
          <MobileInfoRow label="Requester" value={row.requesterName} />
          <MobileInfoRow label="UOM" value={row.uom} />
          <MobileInfoRow label="Form Type" value={row.formType} />
          <MobileInfoRow label="Series" value={row.indentSeries} hideIfEmpty />
          <MobileInfoRow label="Item Code" value={row.itemCode} />
          <MobileInfoRow label="Stock" value={stock ?? "-"} />
          <MobileInfoRow label="Department" value={row.department} className="col-span-2" />
          <MobileInfoRow label="Division" value={row.division} className="col-span-2" />
          <MobileInfoRow label="Product" value={row.productName} className="col-span-2" />
          <MobileInfoRow label="Cost Location" value={row.costLocation} className="col-span-2" hideIfEmpty />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Status</span>
          {renderStatus(row.status)}
        </div>
      </div>
    );
  };

  const renderHistoryCard = (row: IndentRow, index: number) => {
    const stock = itemStocks[row.itemCode || ""];
    return (
      <div key={`${row.requestNumber}-${row.itemCode}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Processed Request</p>
            <h3 className="mt-1 text-lg font-black leading-5 text-slate-900">{row.requestNumber || "--"}</h3>
          </div>
          <div className="shrink-0">{renderStatus(row.status)}</div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
          <MobileInfoRow label="Timestamp" value={formatTimestamp(row.timestamp)} />
          <MobileInfoRow label="Qty" value={row.requestQty} />
          <MobileInfoRow label="Requester" value={row.requesterName} />
          <MobileInfoRow label="UOM" value={row.uom} />
          <MobileInfoRow label="Form Type" value={row.formType} />
          <MobileInfoRow label="Series" value={row.indentSeries} hideIfEmpty />
          <MobileInfoRow label="Item Code" value={row.itemCode} />
          <MobileInfoRow label="Stock" value={stock ?? "-"} />
          <MobileInfoRow label="Department" value={row.department} className="col-span-2" />
          <MobileInfoRow label="Division" value={row.division} className="col-span-2" />
          <MobileInfoRow label="Product" value={row.productName} className="col-span-2" />
          <MobileInfoRow label="Cost Location" value={row.costLocation} className="col-span-2" hideIfEmpty />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4 px-0 py-2 sm:p-4 md:p-6 lg:p-8">
      <Heading heading="Approve Indent HOD" subtext="View indent sheet and process HOD approvals">
        <ClipboardCheck size={50} className="text-primary" />
      </Heading>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 px-1.5 sm:px-0">
          <TabsTrigger value="active">Active Indents ({basePendingRows.length})</TabsTrigger>
          <TabsTrigger value="history">History ({baseHistoryRows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-3">
          <div className="flex flex-col gap-2 px-1.5 sm:px-0">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={pendingSearch}
                onChange={(event) => {
                  setPendingSearch(event.target.value);
                  setPendingPage(1);
                }}
                placeholder="Search request / requester / item..."
                className="pl-9"
              />
            </div>
            <div className="text-sm font-semibold text-slate-500">
              Showing <span className="text-slate-800">{pendingTotal.toLocaleString("en-IN")}</span> records
            </div>
          </div>

          <div className="space-y-2 px-1.5 md:hidden">
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-500 shadow-sm">
                Loading active indents...
              </div>
            ) : pendingPageRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-500 shadow-sm">
                No active indents found.
              </div>
            ) : (
              pendingPageRows.map(renderPendingCard)
            )}
          </div>

          <div className="hidden md:block">
            <DataTable data={pendingPageRows} columns={pendingColumns} searchFields={[]} dataLoading={loading} className="h-[70dvh]" />
          </div>

          <p className="mt-2 px-1.5 text-sm text-muted-foreground sm:px-0">
            Tip: Use Process to open all items for that request number.
          </p>
          <PaginationBar page={pendingCurrentPage} total={pendingTotal} onChange={(page) => setPendingPage(Math.max(1, page))} />
        </TabsContent>

        <TabsContent value="history" className="mt-3">
          <div className="flex flex-col gap-2 px-1.5 sm:px-0">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={historySearch}
                onChange={(event) => {
                  setHistorySearch(event.target.value);
                  setHistoryPage(1);
                }}
                placeholder="Search processed request / requester / item..."
                className="pl-9"
              />
            </div>
            <div className="text-sm font-semibold text-slate-500">
              Showing <span className="text-slate-800">{historyTotal.toLocaleString("en-IN")}</span> records
            </div>
          </div>

          <div className="space-y-2 px-1.5 md:hidden">
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-500 shadow-sm">
                Loading processed indents...
              </div>
            ) : historyPageRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-500 shadow-sm">
                No processed indents found.
              </div>
            ) : (
              historyPageRows.map(renderHistoryCard)
            )}
          </div>

          <div className="hidden md:block">
            <DataTable data={historyPageRows} columns={historyColumns} searchFields={[]} dataLoading={loading} className="h-[70dvh]" />
          </div>

          <PaginationBar page={historyCurrentPage} total={historyTotal} onChange={(page) => setHistoryPage(Math.max(1, page))} />
        </TabsContent>
      </Tabs>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit / Approve Items</DialogTitle>
            <DialogDescription>Update quantity and mark items approved or rejected.</DialogDescription>
          </DialogHeader>

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Request Number</label>
              <Input readOnly value={indentNumber} />
            </div>
            <div>
              <label className="mb-1 block text-sm">Requester Name</label>
              <Input readOnly value={headerRequesterName} />
            </div>
          </div>

          <div className="overflow-auto rounded-md border">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-2 py-2 text-left">Item Code</th>
                  <th className="px-2 py-2 text-left">Item Name</th>
                  <th className="px-2 py-2 text-left">UOM</th>
                  <th className="px-2 py-2 text-left">Stock</th>
                  <th className="w-24 px-2 py-2 text-left">Qty</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {detailsLoading ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-muted-foreground">Loading items...</td>
                  </tr>
                ) : modalItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-muted-foreground">No items for this request.</td>
                  </tr>
                ) : (
                  modalItems.map((item, idx) => (
                    <tr key={`${item.itemCode}-${idx}`} className="border-t">
                      <td className="px-2 py-1">{item.itemCode}</td>
                      <td className="px-2 py-1">{item.productName}</td>
                      <td className="px-2 py-1">{item.uom}</td>
                      <td className="px-2 py-1">
                        {itemStocks[item.itemCode || ""] !== undefined ? (
                          <span className={Number(itemStocks[item.itemCode || ""]) <= 0 ? "font-bold text-red-600" : "font-medium text-green-600"}>
                            {itemStocks[item.itemCode || ""]}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="w-24 px-2 py-1">
                        <Input
                          type="number"
                          value={typeof item.requestQty === "number" ? item.requestQty : item.requestQty || ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setModalItems((prev) =>
                              prev.map((row, rowIndex) =>
                                rowIndex === idx ? { ...row, requestQty: value ? Number(value) : 0 } : row
                              )
                            );
                          }}
                        />
                      </td>
                      <td className="px-2 py-1">
                        {item.status ? renderStatus(item.status) : <span className="text-xs text-muted-foreground">Pending</span>}
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-700"
                            onClick={() =>
                              setModalItems((prev) =>
                                prev.map((row, rowIndex) => (rowIndex === idx ? { ...row, status: "APPROVED" } : row))
                              )
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600 text-white hover:bg-red-700"
                            onClick={() =>
                              setModalItems((prev) =>
                                prev.map((row, rowIndex) => (rowIndex === idx ? { ...row, status: "REJECTED" } : row))
                              )
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="mt-4 flex gap-3">
            <Button
              variant="outline"
              onClick={(event) => {
                event.preventDefault();
                setOpenEdit(false);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={(event) => {
                event.preventDefault();
                onSaveEdit();
              }}
              disabled={saving || !canSave}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
