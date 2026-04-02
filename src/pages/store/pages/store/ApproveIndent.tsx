import { useEffect, useState } from "react";
import { ClipboardCheck, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { z } from "zod";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Heading from "../../components/element/Heading";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../../components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Pill } from "../../components/ui/pill";
import { API_BASE_URL, storeApi } from "@/api/store/storeSystemApi";
import { toast } from "sonner";
import { PuffLoader as Loader } from "react-spinners";

const PAGE_SIZE = 50;

type IndentRow = {
  PLANNEDTIMESTAMP?: string | null;
  INDENT_NUMBER: string;
  INDENT_DATE: string;
  INDENTER_NAME: string;
  DIVISION: string;
  DEPARTMENT: string;
  ITEM_NAME: string;
  UM: string;
  REQUIRED_QTY: number;
  REMARK: string;
  SPECIFICATION: string;
  COST_PROJECT: string;
  CANCELLEDDATE?: string | null;
  CANCELLED_REMARK?: string | null;
  PO_NO?: string | null;
  PO_QTY?: number | null;
  VENDOR_TYPE?: string | null;
};

type PaginationBarProps = {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
};

const safeLower = (v: string | null | undefined) => (v ?? "").toString().toLowerCase();

function PaginationBar({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  isLoading,
}: PaginationBarProps) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  const pages: number[] = [];
  if (totalPages <= 3) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (currentPage <= 2) {
    pages.push(1, 2, 3);
  } else if (currentPage >= totalPages - 1) {
    pages.push(totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push(currentPage - 1, currentPage, currentPage + 1);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-3 text-sm text-muted-foreground">
      <span>
        Showing{" "}
        <span className="font-semibold">{startIndex.toLocaleString("en-IN")}</span> –
        <span className="font-semibold">{endIndex.toLocaleString("en-IN")}</span> of{" "}
        <span className="font-semibold">{totalItems.toLocaleString("en-IN")}</span>
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {pages.map((p) => (
          <Button
            key={p}
            variant={p === currentPage ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(p)}
            disabled={isLoading || p === currentPage}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        {isLoading && (
          <span className="ml-2 flex items-center gap-1 text-xs">
            <Loader size={14} />
            Loading...
          </span>
        )}
      </div>
    </div>
  );
}

const valStr = (v: unknown): string => (typeof v === "string" ? v : v != null ? String(v) : "");

const mapData = (data: Record<string, unknown>[]): IndentRow[] =>
  data.map((item) => ({
    PLANNEDTIMESTAMP: valStr(item.PLANNEDTIMESTAMP ?? item.plannedtimestamp) || null,
    INDENT_NUMBER: valStr(item.INDENT_NUMBER ?? item.indent_number ?? item.INDENT_NO ?? item.indent_no),
    INDENT_DATE: valStr(item.INDENT_DATE ?? item.indent_date),
    INDENTER_NAME: valStr(item.INDENTER_NAME ?? item.indenter_name ?? item.INDENTER ?? item.indenter),
    DIVISION: valStr(item.DIVISION ?? item.division),
    DEPARTMENT: valStr(item.DEPARTMENT ?? item.department),
    ITEM_NAME: valStr(item.ITEM_NAME ?? item.item_name),
    UM: valStr(item.UM ?? item.um),
    REQUIRED_QTY:
      typeof item.REQUIRED_QTY === "number"
        ? item.REQUIRED_QTY
        : Number(item.REQUIRED_QTY ?? item.required_qty ?? item.QTYINDENT ?? item.qtyindent ?? 0),
    REMARK: valStr(item.REMARK ?? item.remark ?? item.PURPOSE_REMARK ?? item.purpose_remark),
    SPECIFICATION: valStr(item.SPECIFICATION ?? item.specification),
    COST_PROJECT: valStr(item.COST_PROJECT ?? item.cost_project),
    CANCELLEDDATE: valStr(item.CANCELLEDDATE ?? item.cancelleddate ?? item.CANCEL_DATE ?? item.cancel_date) || null,
    CANCELLED_REMARK: valStr(item.CANCELLED_REMARK ?? item.cancelled_remark ?? item.CANCEL_REMARK ?? item.cancel_remark) || null,
    PO_NO: valStr(item.PO_NO ?? item.po_no ?? item.PO_NUMBER ?? item.po_number) || null,
    PO_QTY:
      typeof item.PO_QTY === "number" ? item.PO_QTY : Number(item.PO_QTY ?? item.po_qty ?? item.POQTY ?? item.poqty ?? 0),
    VENDOR_TYPE: valStr(item.VENDOR_TYPE ?? item.vendor_type) || null,
  }));

const formatDate = (dateString?: string | null) =>
  dateString
    ? new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    : "";

const formatDateTime = (dateString?: string | null) =>
  dateString
    ? new Date(dateString).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    : "";

const schema = z
  .object({
    vendorType: z.enum(["Reject", "Three Party", "Regular"]),
    approvedQuantity: z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.vendorType !== "Reject" && (!data.approvedQuantity || data.approvedQuantity === 0)) {
      ctx.addIssue({
        path: ["approvedQuantity"],
        code: z.ZodIssueCode.custom,
        message: "Approved quantity required",
      });
    }
  });

export default function ApproveIndent() {
  const [pendingAll, setPendingAll] = useState<IndentRow[]>([]);
  const [historyAll, setHistoryAll] = useState<IndentRow[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [pendingSearch, setPendingSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadingPending, setDownloadingPending] = useState(false);
  const [downloadingHistory, setDownloadingHistory] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState<IndentRow | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(schema) as any,
    defaultValues: { vendorType: undefined, approvedQuantity: undefined },
  });
  const vendorType = form.watch("vendorType");

  const fetchPending = async () => {
    const res = await storeApi.getPendingIndents();
    const resData = (res as { data?: unknown })?.data;
    const raw = Array.isArray(resData) ? resData : Array.isArray(res) ? (res as unknown[]) : [];
    const data = raw as Record<string, unknown>[];
    setPendingAll(mapData(data));
    setPendingPage(1);
  };

  const fetchHistory = async () => {
    const res = await storeApi.getHistoryIndents();
    const resData = (res as { data?: unknown })?.data;
    const raw = Array.isArray(resData) ? resData : Array.isArray(res) ? (res as unknown[]) : [];
    const data = raw as Record<string, unknown>[];
    setHistoryAll(mapData(data));
    setHistoryPage(1);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        await Promise.all([fetchPending(), fetchHistory()]);
      } catch (err) {
        if (active) toast.error("Failed to fetch indents");
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleDownload = async (type: "pending" | "history") => {
    try {
      if (type === "pending") {
        setDownloadingPending(true);
        const blob = await storeApi.downloadPendingIndents();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "pending-indents.xlsx";
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        setDownloadingHistory(true);
        const blob = await storeApi.downloadHistoryIndents();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "history-indents.xlsx";
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      toast.error("Unable to download the file right now.");
    } finally {
      setDownloadingPending(false);
      setDownloadingHistory(false);
    }
  };

  const pendingQuery = pendingSearch.trim().toLowerCase();
  const pendingFiltered = pendingQuery
    ? pendingAll.filter((row) => {
      const q = pendingQuery;
      return (
        safeLower(row.INDENT_NUMBER).includes(q) ||
        safeLower(row.ITEM_NAME).includes(q) ||
        safeLower(row.DEPARTMENT).includes(q) ||
        safeLower(row.INDENTER_NAME).includes(q)
      );
    })
    : pendingAll;

  const historyQuery = historySearch.trim().toLowerCase();
  const historyFiltered = historyQuery
    ? historyAll.filter((row) => {
      const q = historyQuery;
      return (
        safeLower(row.INDENT_NUMBER).includes(q) ||
        safeLower(row.ITEM_NAME).includes(q) ||
        safeLower(row.DEPARTMENT).includes(q) ||
        safeLower(row.INDENTER_NAME).includes(q)
      );
    })
    : historyAll;

  const pendingTotal = pendingFiltered.length;
  const pendingTotalPages = Math.max(1, Math.ceil(pendingTotal / PAGE_SIZE) || 1);
  const pendingCurrentPage = Math.min(pendingPage, pendingTotalPages);
  const pendingStartIndex = (pendingCurrentPage - 1) * PAGE_SIZE;
  const pendingPageRows = pendingFiltered.slice(pendingStartIndex, pendingStartIndex + PAGE_SIZE);

  const historyTotal = historyFiltered.length;
  const historyTotalPages = Math.max(1, Math.ceil(historyTotal / PAGE_SIZE) || 1);
  const historyCurrentPage = Math.min(historyPage, historyTotalPages);
  const historyStartIndex = (historyCurrentPage - 1) * PAGE_SIZE;
  const historyPageRows = historyFiltered.slice(historyStartIndex, historyStartIndex + PAGE_SIZE);

  useEffect(() => {
    if (selectedIndent) {
      form.setValue("approvedQuantity", selectedIndent.REQUIRED_QTY);
    }
  }, [selectedIndent, form]);

  const onSubmit = async (values: any) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/three-party-approval/store-indent/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          indentNumber: selectedIndent?.INDENT_NUMBER,
          itemCode: selectedIndent?.ITEM_NAME,
          vendorType: values.vendorType,
          approvedQuantity: values.approvedQuantity,
        }),
      });
      if (!res.ok) throw new Error("Approval update failed");
      toast.success(`Indent ${selectedIndent?.INDENT_NUMBER} updated successfully`);
      setOpenDialog(false);
      form.reset();
      await Promise.all([fetchPending(), fetchHistory()]);
    } catch (err) {
      toast.error("Failed to update indent");
      console.error(err);
    }
  };

  const onError = (e: FieldErrors<any>) => {
    console.error(e);
    toast.error("Please fill all required fields");
  };

  return (
    <div className="w-full p-4 md:p-2 lg:p-2">
      <Tabs defaultValue="pending">
        <Heading heading="Approve Indent" subtext="Approve or Reject Indents" tabs>
          <ClipboardCheck size={50} className="text-primary" />
        </Heading>

        {/* <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList> */}

        {/* Pending Tab */}
        <TabsContent value="pending">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search: Indent / Item / Dept / Indenter"
              value={pendingSearch}
              onChange={(e) => {
                setPendingSearch(e.target.value);
                setPendingPage(1);
              }}
              className="w-full sm:w-[400px] md:w-[500px]"
            />
            <Button
              className="w-full sm:w-auto whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleDownload("pending")}
              disabled={loading || downloadingPending}
            >
              {downloadingPending ? (
                <div className="flex items-center gap-2">
                  <Loader size={14} color="currentColor" />
                  Downloading...
                </div>
              ) : (
                <>
                  <Download size={16} className="mr-2" />
                  Download Pending Excel
                </>
              )}
            </Button>
          </div>

          <div className="relative w-full">
            <div className="max-h-[calc(100vh-350px)] overflow-y-auto border rounded-xl bg-white shadow-sm">
              <table className="min-w-[1400px] text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-white shadow-sm">
                  <tr>
                    <th className="sticky left-0 z-30 bg-white border-b px-3 py-2 text-left font-semibold">
                      Indent No.
                    </th>
                    <th className="bg-white border-b px-3 py-2 text-center font-semibold">S.No</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Planned Time Stamp</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Indent Date</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Indenter</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Division</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Department</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Item Name</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">UOM</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Required Qty</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Remark</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Specification</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Cost Project</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Vendor Type</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={14} className="py-6 text-center text-slate-500 text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <Loader size={16} />
                          Loading...
                        </div>
                      </td>
                    </tr>
                  ) : pendingPageRows.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-6 text-center text-slate-400 text-sm">
                        No Pending Indents Found
                      </td>
                    </tr>
                  ) : (
                    pendingPageRows.map((row, index) => (
                      <tr
                        key={row.INDENT_NUMBER + index}
                        className="hover:bg-slate-50"
                      >
                        <td className="sticky left-0 z-10 bg-white border-b px-3 py-1 text-left font-medium">
                          {row.INDENT_NUMBER}
                        </td>
                        <td className="border-b px-2 py-1 text-center">{pendingStartIndex + index + 1}</td>
                        <td className="border-b px-2 py-1">{formatDateTime(row.PLANNEDTIMESTAMP)}</td>
                        <td className="border-b px-2 py-1">{formatDate(row.INDENT_DATE)}</td>
                        <td className="border-b px-2 py-1">{row.INDENTER_NAME}</td>
                        <td className="border-b px-2 py-1">{row.DIVISION}</td>
                        <td className="border-b px-2 py-1">{row.DEPARTMENT}</td>
                        <td className="border-b px-2 py-1">{row.ITEM_NAME}</td>
                        <td className="border-b px-2 py-1">{row.UM}</td>
                        <td className="border-b px-2 py-1">{row.REQUIRED_QTY}</td>
                        <td className="border-b px-2 py-1">{row.REMARK}</td>
                        <td className="border-b px-2 py-1">{row.SPECIFICATION}</td>
                        <td className="border-b px-2 py-1">{row.COST_PROJECT}</td>
                        <td className="border-b px-2 py-1">
                          <Pill variant="pending">{row.VENDOR_TYPE || "Pending"}</Pill>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <PaginationBar
            currentPage={pendingCurrentPage}
            totalItems={pendingTotal}
            pageSize={PAGE_SIZE}
            isLoading={loading}
            onPageChange={(p) => setPendingPage(Math.max(1, p))}
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search: Indent / Item / Dept / Indenter"
              value={historySearch}
              onChange={(e) => {
                setHistorySearch(e.target.value);
                setHistoryPage(1);
              }}
              className="w-full sm:w-[400px] md:w-[500px]"
            />
            <Button
              className="w-full sm:w-auto whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleDownload("history")}
              disabled={loading || downloadingHistory}
            >
              {downloadingHistory ? (
                <div className="flex items-center gap-2">
                  <Loader size={14} color="currentColor" />
                  Downloading...
                </div>
              ) : (
                <>
                  <Download size={16} className="mr-2" />
                  Download History Excel
                </>
              )}
            </Button>
          </div>

          <div className="relative w-full">
            <div className="max-h-[calc(100vh-350px)] overflow-y-auto border rounded-xl bg-white shadow-sm">
              <table className="min-w-[1600px] text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-white shadow-sm">
                  <tr>
                    <th className="sticky left-0 z-30 bg-white border-b px-3 py-2 text-left font-semibold">
                      Indent No.
                    </th>
                    <th className="bg-white border-b px-3 py-2 text-center font-semibold">S.No</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Planned Time Stamp</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Indent Date</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Indenter</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Division</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Department</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Item Name</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">UOM</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Required Qty</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Remark</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Specification</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Cost Project</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Cancelled Date & Time</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Cancelled Remark</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">PO No.</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">PO Qty</th>
                    <th className="bg-white border-b px-3 py-2 font-semibold">Vendor Type</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={18} className="py-6 text-center text-slate-500 text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <Loader size={16} />
                          Loading...
                        </div>
                      </td>
                    </tr>
                  ) : historyPageRows.length === 0 ? (
                    <tr>
                      <td colSpan={18} className="py-6 text-center text-slate-400 text-sm">
                        No History Indents Found
                      </td>
                    </tr>
                  ) : (
                    historyPageRows.map((row, index) => (
                      <tr key={row.INDENT_NUMBER + index} className="hover:bg-slate-50">
                        <td className="sticky left-0 z-10 bg-white border-b px-3 py-1 text-left font-medium">
                          {row.INDENT_NUMBER}
                        </td>
                        <td className="border-b px-2 py-1 text-center">{historyStartIndex + index + 1}</td>
                        <td className="border-b px-2 py-1">{formatDateTime(row.PLANNEDTIMESTAMP)}</td>
                        <td className="border-b px-2 py-1">{formatDate(row.INDENT_DATE)}</td>
                        <td className="border-b px-2 py-1">{row.INDENTER_NAME}</td>
                        <td className="border-b px-2 py-1">{row.DIVISION}</td>
                        <td className="border-b px-2 py-1">{row.DEPARTMENT}</td>
                        <td className="border-b px-2 py-1">{row.ITEM_NAME}</td>
                        <td className="border-b px-2 py-1">{row.UM}</td>
                        <td className="border-b px-2 py-1">{row.REQUIRED_QTY}</td>
                        <td className="border-b px-2 py-1">{row.REMARK}</td>
                        <td className="border-b px-2 py-1">{row.SPECIFICATION}</td>
                        <td className="border-b px-2 py-1">{row.COST_PROJECT}</td>
                        <td className="border-b px-2 py-1">{formatDateTime(row.CANCELLEDDATE)}</td>
                        <td className="border-b px-2 py-1">{row.CANCELLED_REMARK}</td>
                        <td className="border-b px-2 py-1">{row.PO_NO}</td>
                        <td className="border-b px-2 py-1">{row.PO_QTY}</td>
                        <td className="border-b px-2 py-1">
                          <Pill variant={row.VENDOR_TYPE === "Reject" ? "reject" : row.VENDOR_TYPE ? "primary" : "secondary"}>
                            {row.VENDOR_TYPE || "Pending"}
                          </Pill>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <PaginationBar
            currentPage={historyCurrentPage}
            totalItems={historyTotal}
            pageSize={PAGE_SIZE}
            isLoading={loading}
            onPageChange={(p) => setHistoryPage(Math.max(1, p))}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        {selectedIndent && (
          <DialogContent className="bg-white" aria-describedby={undefined}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, onError)} className="grid gap-5">
                <DialogHeader>
                  <DialogTitle>Approve Indent</DialogTitle>
                  <DialogDescription>
                    Update approval for <b>{selectedIndent.INDENT_NUMBER}</b>
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="vendorType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vendor type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Regular">Regular</SelectItem>
                            <SelectItem value="Three Party">Three Party</SelectItem>
                            <SelectItem value="Reject">Reject</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="approvedQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Approved Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} disabled={vendorType === "Reject"} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={form.formState.isSubmitting} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-sm">
                    {form.formState.isSubmitting && <Loader size={18} color="white" className="mr-2" />}
                    ✓ Approve
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
