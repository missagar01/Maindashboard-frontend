import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";

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
import { Button } from "../../components/ui/button";
import { useAuth } from "@/context/AuthContext";
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

const mapApiRowToIndent = (rec: Record<string, unknown>): IndentRow => {
  const normalizeStatus = (val: unknown): IndentRow["status"] => {
    if (typeof val !== "string") return "";
    const upper = val.toUpperCase();
    if (upper === "APPROVED" || upper === "REJECTED" || upper === "PENDING") {
      return upper as IndentRow["status"];
    }
    return "";
  };

  return {
    id: rec["id"] ? String(rec["id"]) : undefined,
    timestamp:
      (rec["sample_timestamp"] as string) ??
      (rec["timestamp"] as string) ??
      (rec["created_at"] as string) ??
      (rec["createdAt"] as string) ??
      "",
    requestNumber:
      (rec["request_number"] as string) ??
      (rec["requestNumber"] as string) ??
      "",
    requesterName:
      (rec["requester_name"] as string) ??
      (rec["requesterName"] as string) ??
      "",
    department: (rec["department"] as string) ?? "",
    indentSeries:
      (rec["indent_series"] as string) ?? (rec["indentSeries"] as string) ?? "",
    division: (rec["division"] as string) ?? "",
    itemCode: (rec["item_code"] as string) ?? (rec["itemCode"] as string) ?? "",
    productName:
      (rec["product_name"] as string) ?? (rec["productName"] as string) ?? "",
    requestQty:
      Number(rec["request_qty"] ?? rec["requestQty"] ?? 0) ||
      Number(rec["quantity"] ?? 0),
    uom: (rec["uom"] as string) ?? "",
    costLocation:
      (rec["cost_location"] as string) ??
      (rec["costLocation"] as string) ??
      "",
    formType: (rec["form_type"] as string) ?? (rec["formType"] as string) ?? "",
    status: normalizeStatus(rec["request_status"]),
    gmStatus: normalizeStatus(rec["gm_approval"]),
  };
};

export default function ApprowIndentData() {
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [indentNumber, setIndentNumber] = useState("");
  const [headerRequesterName, setHeaderRequesterName] = useState("");
  const [openEdit, setOpenEdit] = useState(false);
  const [modalItems, setModalItems] = useState<IndentRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [itemStocks, setItemStocks] = useState<Record<string, number>>({});

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
    setLoading(true);

    const fetchIndents = async () => {
      try {
        const res = await storeApi.getAllIndents();
        if (!active) return;
        const raw = Array.isArray((res as any)?.data)
          ? (res as any).data
          : Array.isArray(res)
            ? (res as any)
            : [];
        const mapped = raw.map((rec: Record<string, unknown>) =>
          mapApiRowToIndent(rec)
        );
        setRows(mapped);

        if (mapped.length > 0) {
          const sorted = [...mapped].sort(
            (a, b) =>
              Date.parse(b.timestamp || "") - Date.parse(a.timestamp || "")
          );
          const latest = sorted.find(
            (r) => (r.requestNumber || "").trim() !== ""
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

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, "0");
        const d = String(today.getDate()).padStart(2, "0");
        const todayFormatted = `${d}-${m}-${y}`;

        const res = await storeApi.getStock(todayFormatted, todayFormatted);
        let dataArray: any[] = [];
        if (Array.isArray(res)) {
          dataArray = res;
        } else if (res && typeof res === "object") {
          const r = res as any;
          if (Array.isArray(r.data)) {
            dataArray = r.data;
          } else if (r.data?.data && Array.isArray(r.data.data)) {
            dataArray = r.data.data;
          }
        }

        const stockMap: Record<string, number> = {};
        dataArray.forEach((r: any) => {
          const code = String(r.COL1 ?? r.itemCode ?? "").trim();
          const qty = Number(r.COL5 ?? r.closingQty ?? 0);
          if (code) stockMap[code] = qty;
        });
        setItemStocks(stockMap);
      } catch (err) {
        console.error("Failed to fetch stock data", err);
      }
    };

    fetchStockData();
  }, []);

  const { user } = useAuth();

  const pendingRows = useMemo(
    () =>
      rows.filter((r) => {
        const status = (r.status || "").toUpperCase();
        const formType = (r.formType || "").toUpperCase();

        // Strictly only show if status is PENDING
        const isPending = status === "PENDING";
        const isAllowedType = formType === "INDENT" || formType === "REQUISITION";

        if (!isPending || !isAllowedType) return false;

        const role = String(user?.role || "").toUpperCase();
        const userDept = (user?.user_access || user?.department || "").toUpperCase();

        const canSeeAll = role === "ADMIN" || role === "USER";
        if (!canSeeAll && userDept) {
          return (r.department || "").toUpperCase() === userDept;
        }

        return true;
      }),
    [rows, user]
  );

  const historyRows = useMemo(
    () =>
      rows.filter((r) => {
        const status = (r.status || "").toUpperCase();
        const formType = (r.formType || "").toUpperCase();

        // Show processing history (APPROVED or REJECTED by HOD)
        const isProcessed = status === "APPROVED" || status === "REJECTED";
        const isAllowedType = formType === "INDENT" || formType === "REQUISITION";

        if (!isProcessed || !isAllowedType) return false;

        const role = String(user?.role || "").toUpperCase();
        const userDept = (user?.user_access || user?.department || "").toUpperCase();

        const canSeeAll = role === "ADMIN" || role === "USER";
        if (!canSeeAll && userDept) {
          return (r.department || "").toUpperCase() === userDept;
        }

        return true;
      }),
    [rows, user]
  );

  const fetchRequestItems = useCallback(async (requestNo: string) => {
    const res = await storeApi.getIndent(requestNo);
    const payload = (res as any)?.data ?? res;
    const list = Array.isArray(payload)
      ? payload
      : payload
        ? [payload]
        : [];
    return list.map((rec: Record<string, unknown>) => mapApiRowToIndent(rec));
  }, []);

  const handleProcess = useCallback(
    (row: IndentRow) => {
      const rn = row.requestNumber || "";
      if (!rn) {
        toast.error("Request number unavailable for this row");
        return;
      }

      setIndentNumber(rn);
      setHeaderRequesterName(row.requesterName || "");
      setModalItems([row]);
      setOpenEdit(true);
    },
    []
  );

  const commonColumns: ColumnDef<IndentRow>[] = [
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => {
        const timestamp = row.original.timestamp;
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
        const code = row.original.itemCode || "";
        const stock = itemStocks[code];
        if (stock === undefined) return <span className="text-gray-400">-</span>;
        return (
          <span className={stock <= 0 ? "text-red-600 font-bold" : "text-green-600 font-medium"}>
            {stock}
          </span>
        );
      }
    },
    { accessorKey: "requestQty", header: "Qty" },
    { accessorKey: "costLocation", header: "Cost Location" },
  ];

  const pendingColumns: ColumnDef<IndentRow>[] = useMemo(
    () => [
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={(e) => {
                e.preventDefault();
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
    [handleProcess]
  );

  const historyColumns: ColumnDef<IndentRow>[] = useMemo(
    () => [...commonColumns],
    []
  );

  function selectFromRow(r: IndentRow) {
    setIndentNumber(r.requestNumber || "");
    setHeaderRequesterName(r.requesterName || "");
  }

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
        request_status: (() => {
          const status = (item.status ?? "").toUpperCase();
          return status || "PENDING";
        })(),
      }));

      await storeApi.updateIndentStatus(indentNumber, { items: payload });

      // Update rows and filter out approved/rejected items
      setRows((prev) => {
        return prev.map((p) => {
          const updated = modalItems.find((m) => m.id === p.id);
          if (updated) {
            return {
              ...p,
              status: (updated.status ?? "").toUpperCase() as "APPROVED" | "REJECTED" | "PENDING" | "",
            };
          }
          return p;
        });
      });

      toast.success("Indent status updated");
      setOpenEdit(false);
    } catch (err) {
      console.error("Failed to update indent status", err);
      toast.error("Failed to update indent status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full p-4 md:p-6 lg:p-8">
      <Heading
        heading="Approve Indent HOD"
        subtext="View Indent sheet and select a row to fill inputs"
      >
        <ClipboardCheck size={50} className="text-primary" />
      </Heading>

      <div className="mt-4">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active Indents ({pendingRows.length})</TabsTrigger>
            <TabsTrigger value="history">History ({historyRows.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <DataTable
              data={pendingRows}
              columns={pendingColumns}
              dataLoading={loading}
              className="h-[70dvh]"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Tip: Click a row, then use Edit to open all items for that request number.
            </p>
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

      <RowClickBinder rows={pendingRows} onPick={selectFromRow} />

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
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
                  <th className="text-left px-2 py-2">Stock</th>
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
                      <td className="px-2 py-1">
                        {itemStocks[item.itemCode || ""] !== undefined ? (
                          <span className={Number(itemStocks[item.itemCode || ""]) <= 0 ? "text-red-600 font-bold" : "text-green-600 font-medium"}>
                            {itemStocks[item.itemCode || ""]}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-2 py-1 w-24">
                        <Input
                          type="number"
                          value={
                            typeof item.requestQty === "number"
                              ? item.requestQty
                              : item.requestQty || ""
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            setModalItems((prev) =>
                              prev.map((m, i) =>
                                i === idx
                                  ? { ...m, requestQty: val ? Number(val) : 0 }
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
                          <span className="text-xs text-muted-foreground">Pending</span>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-sm"
                            onClick={() =>
                              setModalItems((prev) =>
                                prev.map((m, i) =>
                                  i === idx ? { ...m, status: "APPROVED" } : m
                                )
                              )
                            }
                          >
                            ✓ Approve
                          </Button>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-sm"
                            onClick={() =>
                              setModalItems((prev) =>
                                prev.map((m, i) =>
                                  i === idx ? { ...m, status: "REJECTED" } : m
                                )
                              )
                            }
                          >
                            ✕ Reject
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
              className="px-4 py-2"
              onClick={(e) => {
                e.preventDefault();
                setOpenEdit(false);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              onClick={(e) => {
                e.preventDefault();
                onSaveEdit();
              }}
              disabled={saving || !canSave}
            >
              {saving ? "Saving…" : "💾 Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RowClickBinder({
  rows,
  onPick,
}: {
  rows: IndentRow[];
  onPick: (row: IndentRow) => void;
}) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tr = target.closest("tr");
      if (!tr) return;
      const firstCell = tr.querySelector("td, th");
      const text = (firstCell?.textContent || "").trim();
      if (!text) return;
      const match = rows.find((r) => (r.requestNumber || "") === text);
      if (match) onPick(match);
    }
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [rows, onPick]);
  return null;
}
