import { useEffect, useMemo, useState } from "react";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";

import Heading from "../../components/element/Heading";
import DataTable from "../../components/element/DataTable";
import { storeApi } from "@/api/store/storeSystemApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

type IndentRow = {
  id?: string;
  createdAt: string;
  updatedAt: string;
  actual1?: string;
  requestNumber?: string;
  indentNumber?: string;
  requesterName?: string;
  department?: string;
  division?: string;
  productName?: string;
  requestQty?: number;
  status?: "APPROVED" | "REJECTED" | "PENDING" | "";
  gmStatus?: "APPROVED" | "REJECTED" | "PENDING" | "";
  approvedQuantity?: string;
  groupName?: string;
  formType?: "INDENT" | "REQUISITION" | "";
};

const mapApiRowToIndent = (rec: Record<string, unknown>): IndentRow => {
  const normalizeStatus = (val: unknown): IndentRow["status"] => {
    if (typeof val !== "string") return "";
    const upper = val.toUpperCase();
    if (upper === "APPROVED" || upper === "REJECTED" || upper === "PENDING") {
      return upper as IndentRow["status"];
    }
    return "";
  };

  const normalizeFormType = (val: unknown): IndentRow["formType"] => {
    if (typeof val !== "string") return "";
    const upper = val.toUpperCase();
    if (upper === "INDENT" || upper === "REQUISITION") {
      return upper as IndentRow["formType"];
    }
    return "";
  };

  return {
    id: rec["id"] ? String(rec["id"]) : undefined,
    createdAt: (rec["created_at"] as string) ?? "",
    updatedAt: (rec["updated_at"] as string) ?? "",
    actual1: (rec["actual_1"] as string) ?? "",
    requestNumber:
      (rec["request_number"] as string) ?? (rec["requestNumber"] as string) ?? "",
    indentNumber:
      (rec["indent_number"] as string) ?? (rec["indentNumber"] as string) ?? "",
    requesterName:
      (rec["requester_name"] as string) ?? (rec["requesterName"] as string) ?? "",
    department: (rec["department"] as string) ?? "",
    division: (rec["division"] as string) ?? "",
    productName:
      (rec["product_name"] as string) ?? (rec["productName"] as string) ?? "",
    requestQty: Number(rec["request_qty"] ?? rec["requestQty"] ?? 0) || 0,
    status: normalizeStatus(rec["request_status"]),
    gmStatus: normalizeStatus(rec["gm_approval"]),
    approvedQuantity: String(
      rec["approved_quantity"] ?? rec["approvedQuantity"] ?? ""
    ),
    groupName:
      (rec["group_name"] as string) ??
      (rec["groupName"] as string) ??
      (rec["category_name"] as string) ??
      "",
    formType: normalizeFormType(rec["form_type"] ?? rec["formType"]),
  };
};

export default function CompletedItems() {
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);


  useEffect(() => {
    let active = true;
    setLoading(true);

    const fetchCompletedItems = async () => {
      try {
        const [approvedRes, rejectedRes] = await Promise.all([
          storeApi.getIndentsByStatus("approved"),
          storeApi.getIndentsByStatus("rejected"),
        ]);

        if (!active) return;

        const approvedData = (
          (approvedRes as any)?.data ?? approvedRes ?? []
        ) as unknown[];
        const rejectedData = (
          (rejectedRes as any)?.data ?? rejectedRes ?? []
        ) as unknown[];

        const combinedData = [...approvedData, ...rejectedData]
          .map((rec) => mapApiRowToIndent(rec as Record<string, unknown>))
          .filter((item) => {
            const isAllowedType = item.formType === "INDENT" || item.formType === "REQUISITION";
            const hodStatus = (item.status || "").toUpperCase();
            const gmStatus = (item.gmStatus || "").toUpperCase();

            // Item must be processed at both levels (Approved or Rejected)
            const isHodProcessed = hodStatus === "APPROVED" || hodStatus === "REJECTED";
            const isGmProcessed = gmStatus === "APPROVED" || gmStatus === "REJECTED";

            return isAllowedType && isHodProcessed && isGmProcessed;
          })
          .sort(
            (a, b) =>
              new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
          );

        setRows(combinedData);
      } catch (err) {
        console.error("Failed to load completed items", err);
        if (active) {
          toast.error("Failed to load completed items list");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchCompletedItems();

    return () => {
      active = false;
    };
  }, []);

  const activeRows = useMemo(
    () => rows.filter((r) => !r.indentNumber || r.indentNumber === ""),
    [rows]
  );

  const historyRows = useMemo(
    () => rows.filter((r) => r.indentNumber && r.indentNumber !== ""),
    [rows]
  );

  const commonColumns: ColumnDef<IndentRow>[] = [
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => {
        const timestamp = row.original.createdAt;
        if (!timestamp) return "";
        const date = new Date(timestamp);
        return date.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
    },
    { accessorKey: "requestNumber", header: "Request No." },
    { accessorKey: "requesterName", header: "Requester" },
    { accessorKey: "department", header: "Department" },
    { accessorKey: "division", header: "Division" },
    { accessorKey: "productName", header: "Product" },
    { accessorKey: "requestQty", header: "Qty" },
    { accessorKey: "approvedQuantity", header: "Approved Qty" },
    { accessorKey: "groupName", header: "Group Name" },
    {
      accessorKey: "status",
      header: "HOD Status",
      cell: ({ row }) => {
        const status = row.original.status;
        if (status === "APPROVED") {
          return <span className="text-green-600 font-medium">APPROVED</span>;
        }
        if (status === "REJECTED") {
          return <span className="text-red-600 font-medium">REJECTED</span>;
        }
        return <span className="text-gray-500">{status}</span>;
      },
    },
    {
      accessorKey: "gmStatus",
      header: "GM Status",
      cell: ({ row }) => {
        const status = row.original.gmStatus;
        if (status === "APPROVED") {
          return <span className="text-green-600 font-medium">APPROVED</span>;
        }
        if (status === "REJECTED") {
          return <span className="text-red-600 font-medium">REJECTED</span>;
        }
        return <span className="text-gray-500">{status || "-"}</span>;
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => {
        const timestamp = row.original.updatedAt;
        if (!timestamp) return "";
        const date = new Date(timestamp);
        return date.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
    },
  ];

  const pendingColumns: ColumnDef<IndentRow>[] = useMemo(
    () => [
      {
        id: "process",
        header: "Action",
        cell: ({ row }) => (
          <button
            onClick={() => handleProcess(row.original)}
            disabled={submitting}
            className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "..." : "Process"}
          </button>
        ),
      },
      ...commonColumns
    ],
    [commonColumns, submitting]
  );

  const historyColumns: ColumnDef<IndentRow>[] = useMemo(
    () => [
      ...commonColumns,
      { accessorKey: "indentNumber", header: "Indent No." },
    ],
    [commonColumns]
  );

  const handleProcess = async (row: IndentRow) => {
    if (!row.requestNumber) return;

    try {
      setSubmitting(true);
      const now = new Date().toISOString();
      const autoValue = "processed";

      await storeApi.updateIndentNumber(
        row.requestNumber,
        autoValue,
        now
      );

      toast.success("Processed successfully");

      // Update local state to move it to History
      setRows((prev) =>
        prev.map((r) =>
          r.requestNumber === row.requestNumber
            ? { ...r, indentNumber: autoValue, actual1: now, updatedAt: now }
            : r
        )
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to process item");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="w-full p-4 md:p-6 lg:p-8">
      <Heading
        heading="Completed Indents"
        subtext="A combined list of all approved and rejected indents"
      >
        <div className="flex">
          <CheckCircle className="text-green-500" size={40} />
          {/* <XCircle className="text-red-500" size={40} /> */}
        </div>
      </Heading>

      <div className="mt-4">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Pending Process ({activeRows.length})</TabsTrigger>
            <TabsTrigger value="history">History ({historyRows.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <DataTable
              data={activeRows}
              columns={pendingColumns}
              dataLoading={loading}
              className="h-[70dvh]"
            />
          </TabsContent>

          <TabsContent value="history">
            <DataTable
              data={historyRows}
              columns={historyColumns}
              dataLoading={loading}
              className="h-[70dvh]"
            />
          </TabsContent>
        </Tabs>
      </div>



    </div>
  );
}
