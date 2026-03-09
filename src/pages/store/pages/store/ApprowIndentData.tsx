import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

import Heading from "../../components/element/Heading";
import { Button } from "../../components/ui/button";
import { storeApi } from "@/api/store/storeSystemApi";

type IndentStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "";

type IndentRow = {
  id: string;
  timestamp: string;
  requestNumber: string;
  formType: string;
  indentSeries: string;
  requesterName: string;
  department: string;
  division: string;
  itemCode: string;
  productName: string;
  uom: string;
  requestQty: number;
  status: IndentStatus;
};

const PAGE_SIZE = 50;

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const asNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStatus = (value: unknown): IndentStatus => {
  const status = asText(value).toUpperCase();
  if (status === "PENDING") return "PENDING";
  if (status === "APPROVED") return "APPROVED";
  if (status === "REJECTED") return "REJECTED";
  if (status === "CANCELLED") return "CANCELLED";
  return "";
};

const formatTimestamp = (value: string): string => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const mapIndentRow = (entry: Record<string, unknown>): IndentRow => ({
  id: asText(entry.id),
  timestamp: asText(
    entry.sample_timestamp ??
      entry.sampleTimestamp ??
      entry.timestamp ??
      entry.created_at ??
      entry.createdAt
  ),
  requestNumber: asText(entry.request_number ?? entry.requestNumber),
  formType: asText(entry.form_type ?? entry.formType),
  indentSeries: asText(entry.indent_series ?? entry.indentSeries),
  requesterName: asText(entry.requester_name ?? entry.requesterName),
  department: asText(entry.department),
  division: asText(entry.division),
  itemCode: asText(entry.item_code ?? entry.itemCode),
  productName: asText(entry.product_name ?? entry.productName),
  uom: asText(entry.uom),
  requestQty: asNumber(entry.request_qty ?? entry.requestQty),
  status: normalizeStatus(entry.request_status ?? entry.requestStatus ?? entry.status),
});

export default function ApprowIndentData() {
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;

    const fetchIndents = async () => {
      setLoading(true);
      try {
        const response = await storeApi.getAllIndents();
        if (!alive) return;

        const source = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];

        const mapped = source.map((entry: Record<string, unknown>) => mapIndentRow(entry));
        setRows(mapped);
      } catch (error) {
        console.error("Failed to fetch all indents", error);
        if (alive) {
          toast.error("Failed to load indent sheet");
          setRows([]);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    fetchIndents();
    return () => {
      alive = false;
    };
  }, []);

  const activeRows = useMemo(
    () =>
      rows.filter((row) => {
        const status = row.status.toUpperCase();
        return status === "" || status === "PENDING";
      }),
    [rows]
  );

  const historyRows = useMemo(
    () =>
      rows.filter((row) => {
        const status = row.status.toUpperCase();
        return status === "APPROVED" || status === "REJECTED" || status === "CANCELLED";
      }),
    [rows]
  );

  const selectedRows = activeTab === "active" ? activeRows : historyRows;
  const totalRows = selectedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = selectedRows.slice(startIndex, startIndex + PAGE_SIZE);
  const visibleFrom = totalRows === 0 ? 0 : startIndex + 1;
  const visibleTo = totalRows === 0 ? 0 : Math.min(startIndex + PAGE_SIZE, totalRows);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  return (
    <div className="w-full space-y-5 p-4 md:p-6 lg:p-8">
      <Heading
        heading="Approve Indent HOD"
        subtext="View Indent sheet and select a row to fill inputs"
      >
        <ClipboardCheck size={46} className="text-primary" />
      </Heading>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={activeTab === "active" ? "default" : "outline"}
          onClick={() => setActiveTab("active")}
          className="rounded-xl"
        >
          Active Indents ({activeRows.length})
        </Button>
        <Button
          variant={activeTab === "history" ? "default" : "outline"}
          onClick={() => setActiveTab("history")}
          className="rounded-xl"
        >
          History ({historyRows.length})
        </Button>
        <p className="ml-auto text-sm font-semibold text-slate-700">
          Total: {totalRows.toLocaleString("en-IN")} rows
        </p>
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[66vh] overflow-auto">
          <table className="min-w-[1450px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100/95">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Request No.</th>
                <th className="px-4 py-3">Form Type</th>
                <th className="px-4 py-3">Series</th>
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Division</th>
                <th className="px-4 py-3">Item Code</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">UOM</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-sm text-slate-500">
                    Loading indent sheet...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-sm text-slate-500">
                    No rows found for this tab.
                  </td>
                </tr>
              ) : (
                pageRows.map((row, index) => (
                  <tr
                    key={`${row.id || row.requestNumber}-${index}`}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{formatTimestamp(row.timestamp)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.requestNumber || "--"}</td>
                    <td className="px-4 py-3">{row.formType || "--"}</td>
                    <td className="px-4 py-3">{row.indentSeries || "--"}</td>
                    <td className="px-4 py-3">{row.requesterName || "--"}</td>
                    <td className="px-4 py-3">{row.department || "--"}</td>
                    <td className="px-4 py-3">{row.division || "--"}</td>
                    <td className="px-4 py-3">{row.itemCode || "--"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.productName || "--"}</td>
                    <td className="px-4 py-3">{row.uom || "--"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-600">
          Showing{" "}
          <span className="text-blue-700">{visibleFrom.toLocaleString("en-IN")}</span> -{" "}
          <span className="text-blue-700">{visibleTo.toLocaleString("en-IN")}</span> of{" "}
          <span className="text-slate-900">{totalRows.toLocaleString("en-IN")}</span>
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
