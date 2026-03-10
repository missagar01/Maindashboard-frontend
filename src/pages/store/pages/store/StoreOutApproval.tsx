import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ClipboardCheck } from "lucide-react";

import Heading from "../../components/element/Heading";
import DataTable from "../../components/element/DataTable";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { storeApi } from "@/api/store/storeSystemApi";
import { toast } from "sonner";
import { mapApiRowToIndent, RowClickBinder, IndentRow } from "./indentHelpers";

export default function StoreOutApproval() {
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [indentNumber, setIndentNumber] = useState("");
  const [headerRequesterName, setHeaderRequesterName] = useState("");
  const [openEdit, setOpenEdit] = useState(false);
  const [modalItems, setModalItems] = useState<IndentRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const canSave = useMemo(
    () =>
      modalItems.length > 0 &&
      modalItems.every((item) => {
        const status = (item.status ?? "").toUpperCase();
        return status === "APPROVED" || status === "REJECTED";
      }),
    [modalItems]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);

    const fetchIndents = async () => {
      try {
        const res = await storeApi.getAllIndents();
        if (!active) return;
        const payload = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        const mapped = payload.map((rec: Record<string, unknown>) =>
          mapApiRowToIndent(rec)
        );
        setRows(mapped);
        if (mapped.length) {
          const sorted = [...mapped].sort(
            (a, b) =>
              Date.parse(b.timestamp || "") - Date.parse(a.timestamp || "")
          );
          const latest = sorted.find(
            (item) => (item.requestNumber || "").trim() !== ""
          );
          if (latest?.requestNumber) setIndentNumber(latest.requestNumber);
          if (latest?.requesterName) setHeaderRequesterName(latest.requesterName);
        }
      } catch (err) {
        console.error("Failed to load indents", err);
        if (active) {
          toast.error("Failed to load indent list");
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

  const requisitionRows = useMemo(
    () =>
      rows.filter(
        (row) => {
          const formType = (row.formType || "").trim().toUpperCase();
          const status = (row.status || row.requestStatus || "").toUpperCase();
          return (
            formType === "REQUISITION" &&
            status !== "APPROVED" &&
            status !== "REJECTED" &&
            status !== ""
          );
        }
      ),
    [rows]
  );

  const fetchRequestItems = useCallback(async (requestNo: string) => {
    const res = await storeApi.getIndent(requestNo);
    const payload = res?.data ?? res;
    const list = Array.isArray(payload)
      ? payload
      : payload
        ? [payload]
        : [];
    return list.map((rec: Record<string, unknown>) => mapApiRowToIndent(rec));
  }, []);

  const handleProcess = useCallback(
    async (row: IndentRow) => {
      const rn = row.requestNumber || "";
      if (!rn) {
        toast.error("Request number unavailable for this row");
        return;
      }

      setIndentNumber(rn);
      setHeaderRequesterName(row.requesterName || "");
      setModalItems([]);
      setDetailsLoading(true);
      setOpenEdit(true);
      try {
        const details = await fetchRequestItems(rn);
        setModalItems(details);
      } catch (err) {
        console.error("Failed to fetch request details", err);
        toast.error("Failed to fetch indent details");
        setOpenEdit(false);
      } finally {
        setDetailsLoading(false);
      }
    },
    [fetchRequestItems]
  );

  const columns: ColumnDef<IndentRow>[] = useMemo(
    () => [
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2 justify-center">
            <button
              className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
              onClick={(event) => {
                event.preventDefault();
                handleProcess(row.original);
              }}
            >
              Process
            </button>
          </div>
        ),
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
      { accessorKey: "requestQty", header: "Qty" },
      { accessorKey: "costLocation", header: "Cost Location" },
    ],
    [handleProcess]
  );

  async function onSaveEdit() {
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
        request_status: (() => {
          const status = (item.status ?? "").toUpperCase();
          return status || "PENDING";
        })(),
      }));
      await storeApi.updateIndentStatus(indentNumber, {
        items: payload,
      });
      
      // Update rows and filter out approved/rejected items
      setRows((prev) => {
        const requestKey = indentNumber;
        // Remove all items with this request number
        const others = prev.filter((item) => item.requestNumber !== requestKey);
        // Add updated items with their new status (both status and requestStatus)
        const updatedItems = modalItems.map((item) => {
          const statusUpper = (item.status ?? "").toUpperCase();
          return {
            ...item,
            status: statusUpper as "APPROVED" | "REJECTED" | "PENDING" | "",
            requestStatus: statusUpper,
          };
        });
        return [...others, ...updatedItems];
      });
      
      toast.success("Indent status updated");
      setOpenEdit(false);
    } catch (err) {
      console.error("Failed to update indent status", err);
      toast.error("Failed to update indent status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full p-4 md:p-6 lg:p-8">
      <Heading
        heading="Store Out Approval"
        subtext="Filter Requisition rows and approve them easily"
      >
        <ClipboardCheck size={50} className="text-primary" />
      </Heading>

      <div className="grid gap-4">
        <div>
          <DataTable
            data={requisitionRows}
            columns={columns}
            searchFields={[
              "requestNumber",
              "requesterName",
              "department",
              "indentSeries",
              "division",
              "itemCode",
              "productName",
            ]}
            dataLoading={loading}
            className="h-[70dvh]"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Tip: Click a row, then use Edit to open all items for that request
            number.
          </p>
        </div>
      </div>

      <RowClickBinder
        rows={requisitionRows}
        onPick={(row) => {
          setIndentNumber(row.requestNumber || "");
          setHeaderRequesterName(row.requesterName || "");
        }}
      />

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-3xl max-h-[90vh] overflow-hidden bg-white">
          <DialogHeader>
            <DialogTitle>Edit / Approve Items</DialogTitle>
            <DialogDescription>
              Update quantity and mark items approved / rejected.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-1">Request Number</label>
              <Input readOnly value={indentNumber} />
            </div>
            <div>
              <label className="block text-sm mb-1">Requester Name</label>
              <Input readOnly value={headerRequesterName} />
            </div>
          </div>

          <div className="border rounded-md overflow-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-2 py-2">Item Code</th>
                  <th className="text-left px-2 py-2">Item Name</th>
                  <th className="text-left px-2 py-2">UOM</th>
                  <th className="text-left px-2 py-2 w-24">Qty</th>
                  <th className="text-left px-2 py-2">Status</th>
                  <th className="text-left px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {detailsLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted-foreground">
                      Loading items...
                    </td>
                  </tr>
                ) : modalItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted-foreground">
                      No items for this request.
                    </td>
                  </tr>
                ) : (
                  modalItems.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-1">{item.itemCode}</td>
                      <td className="px-2 py-1">{item.productName}</td>
                      <td className="px-2 py-1">{item.uom}</td>
                      <td className="px-2 py-1 w-24">
                        <Input
                          type="number"
                          value={item.requestQty ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setModalItems((prev) =>
                              prev.map((m, i) =>
                                i === idx
                                  ? { ...m, requestQty: Number(val || 0) }
                                  : m
                              )
                            );
                          }}
                        />
                      </td>
                      <td className="px-2 py-1">
                        {item.status ? (
                          <span
                            className={
                              item.status === "APPROVED"
                                ? "text-green-600 font-medium"
                                : "text-red-600 font-medium"
                            }
                          >
                            {item.status}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-1.5 text-xs rounded-md font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-sm transition-all"
                            onClick={() =>
                              setModalItems((prev) =>
                                prev.map((m, i) =>
                                  i === idx ? { ...m, status: "APPROVED" } : m
                                )
                              )
                            }
                          >
                            ✓ Approve
                          </button>
                          <button
                            className="px-3 py-1.5 text-xs rounded-md font-semibold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-sm transition-all"
                            onClick={() =>
                              setModalItems((prev) =>
                                prev.map((m, i) =>
                                  i === idx ? { ...m, status: "REJECTED" } : m
                                )
                              )
                            }
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="mt-4 flex gap-3">
            <button
              className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold shadow-sm transition-all"
              onClick={(event) => {
                event.preventDefault();
                setOpenEdit(false);
              }}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-md bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              onClick={(event) => {
                event.preventDefault();
                onSaveEdit();
              }}
              disabled={saving || !canSave}
            >
              {saving ? "Saving…" : "💾 Save Changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
