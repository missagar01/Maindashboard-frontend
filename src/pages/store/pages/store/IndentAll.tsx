// Indent All Page - Shows all indents from /api/indent/all
import { useEffect, useState } from "react";
import { ClipboardList, Download } from "lucide-react";
import Heading from "../../components/element/Heading";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { storeApi } from "@/api/store/storeSystemApi";
import { toast } from "sonner";
import Loading from "./Loading";
interface IndentRow {
  id?: string;
  timestamp: string;
  requestNumber?: string;
  requesterName?: string;
  department?: string;
  division?: string;
  itemCode?: string;
  productName?: string;
  requestQty?: number;
  uom?: string;
  formType?: string;
  status?: string;
}

export default function IndentAll() {
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchIndents();
  }, []);

  const fetchIndents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storeApi.getAllIndents();

      // Handle different response structures
      const payload = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];

      const mappedRows: IndentRow[] = payload.map((r: any) => ({
        id: r.id ? String(r.id) : undefined,
        timestamp: r.timestamp ?? r.created_at ?? r.createdAt ?? '',
        requestNumber: r.request_number ?? r.requestNumber ?? '',
        requesterName: r.requester_name ?? r.requesterName ?? '',
        department: r.department ?? '',
        division: r.division ?? '',
        itemCode: r.item_code ?? r.itemCode ?? '',
        productName: r.product_name ?? r.productName ?? '',
        requestQty: Number(r.request_qty ?? r.requestQty ?? 0) || 0,
        uom: r.uom ?? '',
        formType: r.form_type ?? r.formType ?? '',
        status: r.status ?? '',
      }));

      setRows(mappedRows);
    } catch (err: any) {
      console.error("Failed to load indent list", err);
      setError(err.message || "Failed to fetch indent data");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = rows.filter(
    (row) =>
      row.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.requesterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = async () => {
    try {
      setDownloading(true);
      // Convert rows to CSV/Excel format
      const headers = ["Request Number", "Timestamp", "Requester", "Department", "Division", "Item Code", "Product", "Qty", "UOM", "Form Type", "Status"];
      const csvRows = [
        headers.join(","),
        ...filteredRows.map((row) =>
          [
            row.requestNumber || "",
            row.timestamp || "",
            row.requesterName || "",
            row.department || "",
            row.division || "",
            row.itemCode || "",
            row.productName || "",
            row.requestQty || 0,
            row.uom || "",
            row.formType || "",
            row.status || "",
          ]
            .map((field) => `"${String(field).replace(/"/g, '""')}"`)
            .join(",")
        ),
      ];
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `all-indents-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Indent data downloaded successfully!");
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Failed to download indent data");
    } finally {
      setDownloading(false);
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
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-6">
      <Heading heading="All Indents" subtext="View all indent requests">
        <ClipboardList size={46} className="text-primary" />
      </Heading>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search by request number, product, requester, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-[400px] md:w-[500px]"
            />
            <Button
              onClick={handleDownload}
              disabled={downloading || filteredRows.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
            >
              <Download size={16} className="mr-2" />
              {downloading ? "Downloading..." : "Download Excel"}
            </Button>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Request No</th>
                    <th className="p-2 text-left">Requester</th>
                    <th className="p-2 text-left">Department</th>
                    <th className="p-2 text-left">Division</th>
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-left">UOM</th>
                    <th className="p-2 text-left">Form Type</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-gray-500">
                        {loading ? "Loading..." : "No indents found"}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => (
                      <tr key={row.id || idx} className="border-b hover:bg-gray-50">
                        <td className="p-2">{row.requestNumber || "—"}</td>
                        <td className="p-2">{row.requesterName || "—"}</td>
                        <td className="p-2">{row.department || "—"}</td>
                        <td className="p-2">{row.division || "—"}</td>
                        <td className="p-2">{row.productName || "—"}</td>
                        <td className="p-2 text-right">{row.requestQty || 0}</td>
                        <td className="p-2">{row.uom || "—"}</td>
                        <td className="p-2">{row.formType || "—"}</td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${row.status?.toUpperCase() === "APPROVED"
                              ? "bg-green-100 text-green-800"
                              : row.status?.toUpperCase() === "REJECTED"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                              }`}
                          >
                            {row.status || "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

