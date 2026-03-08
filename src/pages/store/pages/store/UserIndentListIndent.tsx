import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/context/AuthContext";
import Heading from "../../components/element/Heading";
import DataTable from "../../components/element/DataTable";
import { Button } from "../../components/ui/button";
import { ComboBox } from "../../components/ui/combobox";
import { storeApi } from "@/api/store/storeSystemApi";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

type IndentRow = {
  timestamp: string;
  formType?: string;
  requestNumber?: string;
  indentSeries?: string;
  indentNumber?: string;
  requesterName?: string;
  department?: string;
  division?: string;
  itemCode?: string;
  productName?: string;
  requestQty?: number;
  uom?: string;
  make?: string;
  purpose?: string;
  costLocation?: string;
  requestStatus?: string;
};

const formatIndianDateTime = (isoString: string | null | undefined) => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString || "";
  }
};

export default function UserIndentListIndent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [uomFilter, setUomFilter] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    const fetchIndents = async () => {
      setLoading(true);
      try {
        const res = await storeApi.getAllIndents();
        if (!active) return;
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];

        const mapped = list
          .map((r: any) => ({
            timestamp:
              r.sample_timestamp ??
              r.timestamp ??
              r.created_at ??
              r.createdAt ??
              "",
            formType: r.form_type ?? r.formType ?? "",
            requestNumber: r.request_number ?? r.requestNumber ?? "",
            indentSeries: r.indent_series ?? r.indentSeries ?? "",
            indentNumber: r.indent_number ?? r.indentNumber ?? "",
            requesterName: r.requester_name ?? r.requesterName ?? "",
            department: r.department ?? "",
            division: r.division ?? "",
            itemCode: r.item_code ?? r.itemCode ?? "",
            productName: r.product_name ?? r.productName ?? "",
            requestQty: Number(r.request_qty ?? r.requestQty ?? 0) || 0,
            uom: r.uom ?? "",
            make: r.make ?? "",
            purpose: r.purpose ?? "",
            costLocation: r.cost_location ?? r.costLocation ?? "",
            requestStatus: r.request_status ?? "",
          }))
          .filter(
            (row: IndentRow) => (row.formType || "").toUpperCase() === "INDENT" && Boolean(row.indentNumber?.trim())
          );

        setRows(mapped);
      } catch (err) {
        console.error("Failed to load indent data", err);
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

  const filteredRows = useMemo(() => {
    const currentName = user?.name || user?.user_name;
    const productValue = productFilter[0] ?? "";
    const uomValue = uomFilter[0] ?? "";
    const locationValue = locationFilter[0] ?? "";

    let data = rows;
    if (currentName) {
      data = data.filter(
        (row) =>
          (row.requesterName || "").toLowerCase() ===
          String(currentName).toLowerCase()
      );
    }

    if (productValue) {
      data = data.filter(
        (row) =>
          (row.productName || "").toLowerCase() === productValue.toLowerCase()
      );
    }

    if (uomValue) {
      data = data.filter(
        (row) => (row.uom || "").toLowerCase() === uomValue.toLowerCase()
      );
    }

    if (locationValue) {
      data = data.filter(
        (row) =>
          (row.costLocation || "").toLowerCase() === locationValue.toLowerCase()
      );
    }

    return data;
  }, [rows, user, productFilter, uomFilter, locationFilter]);

  const productOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      const value = (row.productName || "").trim();
      if (value) set.add(value);
    });
    return [
      { label: "All products", value: "" },
      ...Array.from(set)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ label: value, value })),
    ];
  }, [rows]);

  const uomOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      const value = (row.uom || "").trim();
      if (value) set.add(value);
    });
    return [
      { label: "All UOM", value: "" },
      ...Array.from(set)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ label: value, value })),
    ];
  }, [rows]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      const value = (row.costLocation || "").trim();
      if (value) set.add(value);
    });
    return [
      { label: "All locations", value: "" },
      ...Array.from(set)
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ label: value, value })),
    ];
  }, [rows]);

  const columns: ColumnDef<IndentRow>[] = [
    { accessorKey: "indentNumber", header: "Indent No." },
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => formatIndianDateTime(row.original.timestamp),
    },
    { accessorKey: "requestNumber", header: "Request No." },
    { accessorKey: "indentSeries", header: "Series" },
    { accessorKey: "requesterName", header: "Requester" },
    { accessorKey: "department", header: "Department" },
    { accessorKey: "division", header: "Division" },
    { accessorKey: "itemCode", header: "Item Code" },
    { accessorKey: "productName", header: "Product" },
    { accessorKey: "uom", header: "UOM" },
    { accessorKey: "requestQty", header: "Qty" },
    { accessorKey: "costLocation", header: "Cost Location" },
    {
      accessorKey: "requestStatus",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.requestStatus?.toUpperCase();
        if (status === "APPROVED") {
          return <span className="font-medium text-green-600">APPROVED</span>;
        }
        if (status === "REJECTED") {
          return <span className="font-medium text-red-600">REJECTED</span>;
        }
        if (status === "PENDING") {
          return <span className="font-medium text-blue-600">PENDING</span>;
        }
        return (
          <span className="text-gray-500">{row.original.requestStatus}</span>
        );
      },
    },
  ];

  return (
    <div className="w-full p-4 md:p-6 lg:p-8">
      <Heading heading="Indent List" subtext="Your Indent lines" />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">
            Product Name
          </span>
          <ComboBox
            options={productOptions}
            value={productFilter}
            onChange={setProductFilter}
            placeholder="All products"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">UOM</span>
          <ComboBox
            options={uomOptions}
            value={uomFilter}
            onChange={setUomFilter}
            placeholder="All UOM"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">
            Cost / Project Location
          </span>
          <ComboBox
            options={locationOptions}
            value={locationFilter}
            onChange={setLocationFilter}
            placeholder="All locations"
          />
        </div>
      </div>

      <DataTable
        data={filteredRows}
        columns={columns}
        searchFields={[
          "requestNumber",
          "indentSeries",
          "requesterName",
          "department",
          "division",
          "itemCode",
          "productName",
          "costLocation",
        ]}
        dataLoading={loading}
        className="h-[74dvh]"
      >
        <Button onClick={() => navigate("/store/user-indent?formType=INDENT")}>
          + Add Indent
        </Button>
      </DataTable>
    </div>
  );
}
