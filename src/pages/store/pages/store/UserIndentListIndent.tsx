import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../../../context/AuthContext";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import Heading from "../../components/element/Heading";
import DataTable from "../../components/element/DataTable";
import { Button } from "../../components/ui/button";
import { ComboBox } from "../../components/ui/combobox";
import { Input } from "../../components/ui/input";
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

const PAGE_SIZE = 50;

function PaginationBar({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (!total) return null;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, total);
  const pages: number[] = [];

  if (totalPages <= 3) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (page <= 2) {
    pages.push(1, 2, 3);
  } else if (page >= totalPages - 1) {
    pages.push(totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push(page - 1, page, page + 1);
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5 px-1 text-xs text-slate-500 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:px-0 sm:text-sm">
      <span>
        Showing <span className="font-semibold text-slate-700">{startIndex}</span>-
        <span className="font-semibold text-slate-700">{endIndex}</span> of{" "}
        <span className="font-semibold text-slate-700">{total.toLocaleString("en-IN")}</span>
      </span>

      <div className="flex items-center gap-1 self-center sm:self-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {pages.map((p) => (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="icon"
            onClick={() => onChange(p)}
            disabled={p === page}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function MobileIndentField({
  label,
  value,
  className,
  hideIfEmpty = false,
}: {
  label: string;
  value: string | number | null | undefined;
  className?: string;
  hideIfEmpty?: boolean;
}) {
  const isEmpty = value === null || value === undefined || value === "";
  if (hideIfEmpty && isEmpty) return null;

  return (
    <div className={className}>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 break-words text-[13px] font-semibold leading-4 text-slate-800">
        {isEmpty ? "--" : value}
      </p>
    </div>
  );
}

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
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);

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
    const searchValue = searchText.trim().toLowerCase();

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

    if (searchValue) {
      data = data.filter((row) =>
        [
          row.requestNumber,
          row.indentSeries,
          row.indentNumber,
          row.requesterName,
          row.department,
          row.division,
          row.itemCode,
          row.productName,
          row.uom,
          row.costLocation,
          row.purpose,
          row.requestStatus,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchValue)
      );
    }

    return data;
  }, [rows, user, productFilter, uomFilter, locationFilter, searchText]);

  const totalRecords = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);

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
    <div className="w-full space-y-4 px-0 py-2 sm:p-4 md:p-6 lg:p-8">
      <Heading heading="Indent List" subtext="Your Indent lines" />

      <div className="grid gap-3 px-1.5 md:grid-cols-3 md:px-0">
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

      <div className="flex flex-col gap-2 px-1.5 sm:px-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            placeholder="Search indent / product / item..."
            className="pl-9"
          />
        </div>

        <Button onClick={() => navigate("/store/user-indent?formType=INDENT")}>
          + Add Indent
        </Button>
      </div>

      <div className="px-1.5 text-sm font-semibold text-slate-500 sm:px-0">
        Showing <span className="text-slate-800">{totalRecords.toLocaleString("en-IN")}</span> records
      </div>

      <div className="space-y-2 px-1.5 md:hidden">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-500 shadow-sm">
            Loading indents...
          </div>
        ) : pageRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-500 shadow-sm">
            No Indents Found.
          </div>
        ) : (
          pageRows.map((row, index) => {
            const status = (row.requestStatus || "").toUpperCase();
            const statusClasses =
              status === "APPROVED"
                ? "bg-emerald-50 text-emerald-700"
                : status === "REJECTED"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-blue-50 text-blue-700";

            return (
              <div
                key={`${row.indentNumber}-${row.itemCode}-${index}`}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Indent No.
                    </p>
                    <h3 className="mt-1 text-lg font-black leading-5 text-slate-900">
                      {row.indentNumber || "--"}
                    </h3>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${statusClasses}`}>
                    {row.requestStatus || "Pending"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <MobileIndentField label="Timestamp" value={formatIndianDateTime(row.timestamp)} />
                  <MobileIndentField label="Qty" value={row.requestQty} />
                  <MobileIndentField label="Requester" value={row.requesterName} />
                  <MobileIndentField label="UOM" value={row.uom} />
                  <MobileIndentField label="Request No." value={row.requestNumber} />
                  <MobileIndentField label="Series" value={row.indentSeries} hideIfEmpty />
                  <MobileIndentField label="Department" value={row.department} className="col-span-2" />
                  <MobileIndentField label="Division" value={row.division} className="col-span-2" />
                  <MobileIndentField label="Item Code" value={row.itemCode} />
                  <MobileIndentField label="Product" value={row.productName} className="col-span-2" />
                  <MobileIndentField label="Cost Location" value={row.costLocation} className="col-span-2" hideIfEmpty />
                  <MobileIndentField label="Purpose" value={row.purpose} className="col-span-2" hideIfEmpty />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden md:block">
        <DataTable
          data={pageRows}
          columns={columns}
          searchFields={[]}
          dataLoading={loading}
          className="h-[74dvh]"
        />
      </div>

      <PaginationBar
        page={currentPage}
        total={totalRecords}
        onChange={(nextPage) => setPage(Math.max(1, nextPage))}
      />
    </div>
  );
}
