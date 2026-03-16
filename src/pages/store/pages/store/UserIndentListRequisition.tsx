import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../../../context/AuthContext";
import Heading from "../../components/element/Heading";
import DataTable from "../../components/element/DataTable";
import { Button } from "../../components/ui/button";
import { ComboBox } from "../../components/ui/combobox";
import { storeApi } from "@/api/store/storeSystemApi";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

type IndentRow = {
  id?: string;
  timestamp: string;
  formType?: string;
  requestNumber?: string;
  indentSeries?: string;
  requesterName?: string;
  department?: string;
  division?: string;
  itemCode?: string;
  productName?: string;
  requestQty?: number;
  uom?: string;
  specification?: string;
  make?: string;
  purpose?: string;
  costLocation?: string;
  requestStatus?: string;
  planned_1?: string;
  actual_1?: string;
  time_delay_1?: string;
  approved_quantity?: string;
  updated_at?: string;
  category_name?: string;
};

export default function UserIndentListRequisition() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [uomFilter, setUomFilter] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    const fetchRequisitions = async () => {
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
            id: r.id ?? "",
            timestamp:
              r.created_at ?? r.sample_timestamp ?? r.timestamp ?? "",
            formType: r.form_type ?? r.formType ?? "",
            requestNumber: r.request_number ?? r.requestNumber ?? "",
            indentSeries: r.indent_series ?? r.indentSeries ?? "",
            requesterName: r.requester_name ?? r.requesterName ?? "",
            department: r.department ?? "",
            division: r.division ?? "",
            itemCode: r.item_code ?? r.itemCode ?? "",
            productName: r.product_name ?? r.productName ?? "",
            requestQty: Number(r.request_qty ?? 0),
            uom: r.uom ?? "",
            specification: r.specification ?? "",
            make: r.make ?? "",
            purpose: r.purpose ?? "",
            costLocation: r.cost_location ?? r.costLocation ?? "",
            planned_1: r.planned_1 ?? "",
            actual_1: r.actual_1 ?? "",
            time_delay_1: r.time_delay_1 ?? "",
            requestStatus: r.request_status ?? "",
            approved_quantity: r.approved_quantity ?? "",
            updated_at: r.updated_at ?? "",
            category_name: r.category_name ?? "",
          }))
          .filter(
            (row: IndentRow) =>
              (row.formType || "").toUpperCase() === "REQUISITION"
          );

        setRows(mapped);
      } catch (err) {
        console.error("Failed to load requisition data", err);
        if (active) {
          toast.error("Failed to load requisition list");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchRequisitions();
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
        (r) =>
          (r.requesterName || "").toLowerCase() ===
          String(currentName).toLowerCase()
      );
    }

    if (productValue) {
      data = data.filter(
        (r) =>
          (r.productName || "").toLowerCase() === productValue.toLowerCase()
      );
    }

    if (uomValue) {
      data = data.filter(
        (r) => (r.uom || "").toLowerCase() === uomValue.toLowerCase()
      );
    }

    if (locationValue) {
      data = data.filter(
        (r) =>
          (r.costLocation || "").toLowerCase() === locationValue.toLowerCase()
      );
    }

    return data;
  }, [rows, user, productFilter, uomFilter, locationFilter]);

  const buildOptions = useMemo(() => {
    const extras = {
      products: new Set<string>(),
      uoms: new Set<string>(),
      locations: new Set<string>(),
    };
    rows.forEach((r) => {
      const product = (r.productName || "").trim();
      if (product) extras.products.add(product);
      const uom = (r.uom || "").trim();
      if (uom) extras.uoms.add(uom);
      const location = (r.costLocation || "").trim();
      if (location) extras.locations.add(location);
    });
    return {
      products: [
        { label: "All products", value: "" },
        ...Array.from(extras.products)
          .sort((a, b) => a.localeCompare(b))
          .map((value) => ({ label: value, value })),
      ],
      uoms: [
        { label: "All UOM", value: "" },
        ...Array.from(extras.uoms)
          .sort((a, b) => a.localeCompare(b))
          .map((value) => ({ label: value, value })),
      ],
      locations: [
        { label: "All locations", value: "" },
        ...Array.from(extras.locations)
          .sort((a, b) => a.localeCompare(b))
          .map((value) => ({ label: value, value })),
      ],
    };
  }, [rows]);

  const columns: ColumnDef<IndentRow>[] = [
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => {
        const timestamp = row.original.timestamp;
        if (!timestamp) return "";
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return timestamp;
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
      <Heading heading="Requisition List" subtext="Your Requisition lines" />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">
            Product Name
          </span>
          <ComboBox
            options={buildOptions.products}
            value={productFilter}
            onChange={setProductFilter}
            placeholder="All products"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">UOM</span>
          <ComboBox
            options={buildOptions.uoms}
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
            options={buildOptions.locations}
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
        <Button
          onClick={() => navigate("/store/user-indent?formType=REQUISITION")}
        >
          + Add Requisition
        </Button>
      </DataTable>
    </div>
  );
}
