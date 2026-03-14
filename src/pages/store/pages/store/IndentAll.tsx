import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardList, Download } from "lucide-react";
import { PuffLoader as Loader } from "react-spinners";
import { toast } from "sonner";

import Heading from "../../components/element/Heading";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Pill } from "../../components/ui/pill";
import Loading from "./Loading";
import { storeApi } from "@/api/store/storeSystemApi";
import { mapApiRowToIndent, type IndentRow } from "./indentHelpers";

const PAGE_SIZE = 50;

type PaginationBarProps = {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
};

const safeLower = (value: string | null | undefined) => (value ?? "").toString().toLowerCase();

function normalizeStatus(row: IndentRow) {
  const status = (row.status || row.requestStatus || "").trim().toUpperCase();
  return status || "PENDING";
}

function formatDateTime(value?: string) {
  if (!value) return "--";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getStatusVariant(status: string) {
  switch (status) {
    case "APPROVED":
      return "secondary";
    case "REJECTED":
    case "CANCELLED":
      return "reject";
    case "PENDING":
      return "pending";
    default:
      return "default";
  }
}

function downloadRowsAsCsv(rows: IndentRow[], filenamePrefix: string) {
  const headers = [
    "Request Number",
    "Timestamp",
    "Requester",
    "Department",
    "Division",
    "Item Code",
    "Product",
    "Qty",
    "UOM",
    "Form Type",
    "Status",
  ];

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.requestNumber || "",
        row.timestamp || "",
        row.requesterName || "",
        row.department || "",
        row.division || "",
        row.itemCode || "",
        row.productName || "",
        row.requestQty ?? 0,
        row.uom || "",
        row.formType || "INDENT",
        normalizeStatus(row),
      ]
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenamePrefix}-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

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
    <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing <span className="font-semibold">{startIndex.toLocaleString("en-IN")}</span> -
        <span className="font-semibold"> {endIndex.toLocaleString("en-IN")}</span> of{" "}
        <span className="font-semibold">{totalItems.toLocaleString("en-IN")}</span>
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((page) => (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(page)}
            disabled={isLoading || page === currentPage}
          >
            {page}
          </Button>
        ))}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function IndentTable({
  rows,
  page,
  pageSize,
  loading,
  emptyText,
}: {
  rows: IndentRow[];
  page: number;
  pageSize: number;
  loading: boolean;
  emptyText: string;
}) {
  const startIndex = (page - 1) * pageSize;
  const pageRows = rows.slice(startIndex, startIndex + pageSize);

  return (
    <div className="relative w-full">
      <div className="max-h-[calc(100vh-350px)] overflow-x-auto overflow-y-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-[1300px] border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm">
            <tr>
              <th className="sticky left-0 z-30 border-b bg-slate-100 px-3 py-2 text-left font-semibold">
                Request No.
              </th>
              <th className="border-b bg-slate-100 px-3 py-2 text-center font-semibold">S.No</th>
              <th className="border-b bg-slate-100 px-3 py-2 font-semibold">Timestamp</th>
              <th className="border-b bg-slate-100 px-3 py-2 font-semibold">Requester</th>
              <th className="border-b bg-slate-100 px-3 py-2 font-semibold">Department</th>
              <th className="border-b bg-slate-100 px-3 py-2 font-semibold">Division</th>
              <th className="border-b bg-slate-100 px-3 py-2 font-semibold">Item Code</th>
              <th className="border-b bg-slate-100 px-3 py-2 font-semibold">Item Name</th>
              <th className="border-b bg-slate-100 px-3 py-2 font-semibold">UOM</th>
              <th className="border-b bg-slate-100 px-3 py-2 font-semibold">Required Qty</th>
              <th className="border-b bg-slate-100 px-3 py-2 font-semibold">Form Type</th>
              <th className="border-b bg-slate-100 px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="py-6 text-center text-sm text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader size={16} />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-6 text-center text-sm text-slate-400">
                  {emptyText}
                </td>
              </tr>
            ) : (
              pageRows.map((row, index) => {
                const status = normalizeStatus(row);

                return (
                  <tr key={`${row.id ?? row.requestNumber ?? "indent"}-${startIndex + index}`} className="hover:bg-slate-50">
                    <td className="sticky left-0 z-10 border-b bg-white px-3 py-1 text-left font-medium">
                      {row.requestNumber || "--"}
                    </td>
                    <td className="border-b px-2 py-1 text-center">{startIndex + index + 1}</td>
                    <td className="border-b px-2 py-1">{formatDateTime(row.timestamp)}</td>
                    <td className="border-b px-2 py-1">{row.requesterName || "--"}</td>
                    <td className="border-b px-2 py-1">{row.department || "--"}</td>
                    <td className="border-b px-2 py-1">{row.division || "--"}</td>
                    <td className="border-b px-2 py-1">{row.itemCode || "--"}</td>
                    <td className="border-b px-2 py-1">{row.productName || "--"}</td>
                    <td className="border-b px-2 py-1">{row.uom || "--"}</td>
                    <td className="border-b px-2 py-1">{row.requestQty ?? 0}</td>
                    <td className="border-b px-2 py-1">{row.formType || "INDENT"}</td>
                    <td className="border-b px-2 py-1">
                      <Pill variant={getStatusVariant(status)}>{status}</Pill>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function IndentAll() {
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingSearch, setPendingSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [downloadingPending, setDownloadingPending] = useState(false);
  const [downloadingHistory, setDownloadingHistory] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchIndents = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await storeApi.getAllIndents();
        if (!active) return;

        const payload = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        const mappedRows = payload
          .map((record: Record<string, unknown>) => mapApiRowToIndent(record))
          .filter((row) => {
            const formType = (row.formType || "INDENT").trim().toUpperCase();
            return formType === "INDENT";
          });

        setRows(mappedRows);
      } catch (err: any) {
        console.error("Failed to load indent list", err);
        if (active) {
          setError(err?.message || "Failed to fetch indent data");
          setRows([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchIndents();
    return () => {
      active = false;
    };
  }, []);

  const pendingRows = useMemo(
    () => rows.filter((row) => normalizeStatus(row) === "PENDING"),
    [rows]
  );

  const historyRows = useMemo(
    () => rows.filter((row) => normalizeStatus(row) !== "PENDING"),
    [rows]
  );

  const filterRows = (data: IndentRow[], term: string) => {
    const lowerTerm = term.trim().toLowerCase();
    if (!lowerTerm) return data;

    return data.filter((row) =>
      [
        row.requestNumber,
        row.productName,
        row.requesterName,
        row.department,
        row.division,
        row.itemCode,
        row.uom,
        row.formType,
        normalizeStatus(row),
      ].some((value) => safeLower(value).includes(lowerTerm))
    );
  };

  const pendingFiltered = useMemo(
    () => filterRows(pendingRows, pendingSearch),
    [pendingRows, pendingSearch]
  );

  const historyFiltered = useMemo(
    () => filterRows(historyRows, historySearch),
    [historyRows, historySearch]
  );

  const pendingTotalPages = Math.max(1, Math.ceil(pendingFiltered.length / PAGE_SIZE));
  const historyTotalPages = Math.max(1, Math.ceil(historyFiltered.length / PAGE_SIZE));
  const pendingCurrentPage = Math.min(pendingPage, pendingTotalPages);
  const historyCurrentPage = Math.min(historyPage, historyTotalPages);

  useEffect(() => {
    setPendingPage(1);
  }, [pendingSearch]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch]);

  const handleDownload = async (type: "pending" | "history") => {
    try {
      if (type === "pending") {
        setDownloadingPending(true);
        downloadRowsAsCsv(pendingFiltered, "pending-indents");
        toast.success("Pending indent data downloaded successfully!");
      } else {
        setDownloadingHistory(true);
        downloadRowsAsCsv(historyFiltered, "history-indents");
        toast.success("History indent data downloaded successfully!");
      }
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Failed to download indent data");
    } finally {
      setDownloadingPending(false);
      setDownloadingHistory(false);
    }
  };

  if (loading) {
    return (
      <Loading
        heading="All Indents"
        subtext="Loading indent requests"
        icon={<ClipboardList size={48} className="text-blue-600" />}
      />
    );
  }

  return (
    <div className="w-full p-4 md:p-6 lg:p-8">
      <Tabs defaultValue="pending">
        <Heading heading="All Indents" subtext="Pending & history indent requests" tabs>
          <ClipboardList size={46} className="text-primary" />
        </Heading>

        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending ({pendingRows.length})</TabsTrigger>
          <TabsTrigger value="history">History ({historyRows.length})</TabsTrigger>
        </TabsList>

        {error ? (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <TabsContent value="pending">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search: Request / Item / Dept / Requester"
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              className="w-full sm:w-[400px] md:w-[500px]"
            />
            <Button
              className="w-full whitespace-nowrap bg-green-600 text-white hover:bg-green-700 sm:w-auto"
              onClick={() => handleDownload("pending")}
              disabled={loading || downloadingPending || pendingFiltered.length === 0}
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

          <IndentTable
            rows={pendingFiltered}
            page={pendingCurrentPage}
            pageSize={PAGE_SIZE}
            loading={loading}
            emptyText="No Pending Indents Found"
          />

          <PaginationBar
            currentPage={pendingCurrentPage}
            totalItems={pendingFiltered.length}
            pageSize={PAGE_SIZE}
            isLoading={loading}
            onPageChange={(page) => setPendingPage(Math.max(1, page))}
          />
        </TabsContent>

        <TabsContent value="history">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search: Request / Item / Dept / Requester"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full sm:w-[400px] md:w-[500px]"
            />
            <Button
              className="w-full whitespace-nowrap bg-green-600 text-white hover:bg-green-700 sm:w-auto"
              onClick={() => handleDownload("history")}
              disabled={loading || downloadingHistory || historyFiltered.length === 0}
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

          <IndentTable
            rows={historyFiltered}
            page={historyCurrentPage}
            pageSize={PAGE_SIZE}
            loading={loading}
            emptyText="No History Indents Found"
          />

          <PaginationBar
            currentPage={historyCurrentPage}
            totalItems={historyFiltered.length}
            pageSize={PAGE_SIZE}
            isLoading={loading}
            onPageChange={(page) => setHistoryPage(Math.max(1, page))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
