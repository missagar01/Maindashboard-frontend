import { useEffect, useMemo, useState } from "react";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";

import Heading from "../../components/element/Heading";
import DataTable from "../../components/element/DataTable";
import { storeApi } from "@/api/store/storeSystemApi";

type IndentRow = {
  id?: string;
  createdAt: string;
  updatedAt: string;
  requestNumber?: string;
  requesterName?: string;
  department?: string;
  division?: string;
  productName?: string;
  requestQty?: number;
  status?: "APPROVED" | "REJECTED" | "PENDING" | "";
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
    requestNumber:
      (rec["request_number"] as string) ?? (rec["requestNumber"] as string) ?? "",
    requesterName:
      (rec["requester_name"] as string) ?? (rec["requesterName"] as string) ?? "",
    department: (rec["department"] as string) ?? "",
    division: (rec["division"] as string) ?? "",
    productName:
      (rec["product_name"] as string) ?? (rec["productName"] as string) ?? "",
    requestQty: Number(rec["request_qty"] ?? rec["requestQty"] ?? 0) || 0,
    status: normalizeStatus(rec["request_status"]),
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
  const [showModal, setShowModal] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState<IndentRow | null>(null);
  const [indentNumber, setIndentNumber] = useState("");
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
          .filter((item) => item.formType === "INDENT")
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
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

  const columns: ColumnDef<IndentRow>[] = useMemo(
    () => [
      {
        id: "process",
        header: "Action",
        cell: ({ row }) => (
          <button
            onClick={() => openProcessModal(row.original)}
            className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Process
          </button>
        ),
      },
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
        header: "Status",
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
    ],
    []
  );

  const openProcessModal = (row: IndentRow) => {
    setSelectedIndent(row);
    setIndentNumber("");
    setShowModal(true);
  };

  const closeProcessModal = () => {
    setShowModal(false);
    setSelectedIndent(null);
    setIndentNumber("");
  };

  const handleSubmitIndentNumber = async () => {
    if (!selectedIndent?.requestNumber) return;

    if (!indentNumber.trim()) {
      toast.error("Indent number is required");
      return;
    }

    try {
      setSubmitting(true);

      await storeApi.updateIndentNumber(
        selectedIndent.requestNumber,
        indentNumber.trim()
      );

      toast.success("Indent number updated successfully");

      // Optional: update UI row locally
      setRows((prev) =>
        prev.map((r) =>
          r.requestNumber === selectedIndent.requestNumber
            ? { ...r, updatedAt: new Date().toISOString() }
            : r
        )
      );

      closeProcessModal();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to update indent number");
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
        <DataTable
          data={rows}
          columns={columns}
          searchFields={["requestNumber", "requesterName", "productName", "status"]}
          dataLoading={loading}
          className="h-[75dvh]"
        />
      </div>

      {showModal && selectedIndent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 relative">
            {/* Close button */}
            <button
              onClick={closeProcessModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              ✕
            </button>

            <h2 className="text-lg font-semibold mb-4">Process Indent</h2>

            {/* Request Number (readonly) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request Number
              </label>
              <input
                type="text"
                value={selectedIndent.requestNumber || ""}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100"
              />
            </div>

            {/* Indent Number */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Indent Number
              </label>
              <input
                type="text"
                value={indentNumber}
                onChange={(e) => setIndentNumber(e.target.value)}
                placeholder="Enter indent number"
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={closeProcessModal}
                className="px-4 py-2 border rounded"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitIndentNumber}
                disabled={submitting}
                className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
