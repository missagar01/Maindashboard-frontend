import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../../context/AuthContext";
import Heading from "../../components/element/Heading";
import DataTable from "../../components/element/DataTable";
import { storeApi } from "@/api/store/storeSystemApi";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

type ErpIndentRow = {
  INDENT_NO: string;
  INDENT_DATE: string;
  EMPLOYEE_ID: string;
  INDENTER: string;
  DIVISION: string;
  DEPARTMENT: string;
  ITEM_CODE: string;
  ITEM_NAME: string;
  QTYINDENT: number;
  UM: string;
  ACKNOWLEDGEDATE: string;
  PURCHASER: string;
  PO_NUMBER: string;
  GRN_NO: string;
  GRN_DATE: string;
  ISSUE_NO: string;
  ISSUE_DATE: string;
  RECEIVER: string;
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString || "-";
  }
};

export default function ErpIndent() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ErpIndentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchErpIndents = async () => {
      setLoading(true);
      try {
        const res: any = await storeApi.getErpIndents();
        if (!active) return;

        const list = Array.isArray(res?.data) ? res.data : [];
        // Sort by date descending (latest first)
        const sortedList = [...list].sort((a, b) => {
          const dateA = new Date(a.INDENT_DATE).getTime();
          const dateB = new Date(b.INDENT_DATE).getTime();
          return dateB - dateA;
        });
        setRows(sortedList);
      } catch (err) {
        console.error("Failed to load ERP indent data", err);
        if (active) {
          toast.error("Failed to load ERP indent list");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchErpIndents();
    return () => {
      active = false;
    };
  }, [user]);

  const searchableFields = [
    "INDENT_NO",
    "INDENTER",
    "DIVISION",
    "DEPARTMENT",
    "ITEM_CODE",
    "ITEM_NAME",
    "PURCHASER",
    "PO_NUMBER",
    "GRN_NO",
    "ISSUE_NO",
    "RECEIVER",
  ];

  const columns: ColumnDef<ErpIndentRow>[] = [
    { accessorKey: "INDENT_NO", header: "Indent No." },
    {
      accessorKey: "INDENT_DATE",
      header: "Indent Date",
      cell: ({ row }) => formatDate(row.original.INDENT_DATE)
    },
    { accessorKey: "INDENTER", header: "Indenter" },
    { accessorKey: "DIVISION", header: "Division" },
    { accessorKey: "DEPARTMENT", header: "Department" },
    { accessorKey: "ITEM_CODE", header: "Item Code" },
    { accessorKey: "ITEM_NAME", header: "Product" },
    { accessorKey: "UM", header: "UOM" },
    { accessorKey: "QTYINDENT", header: "Qty" },
    {
      accessorKey: "ACKNOWLEDGEDATE",
      header: "Acknowledge Date",
      cell: ({ row }) => formatDate(row.original.ACKNOWLEDGEDATE)
    },
    { accessorKey: "PURCHASER", header: "Purchaser" },
    {
      accessorKey: "PO_NUMBER",
      header: "PO Number",
      cell: ({ row }) => row.original.PO_NUMBER || "-"
    },
    {
      accessorKey: "GRN_NO",
      header: "GRN No.",
      cell: ({ row }) => row.original.GRN_NO || "-"
    },
    {
      accessorKey: "GRN_DATE",
      header: "GRN Date",
      cell: ({ row }) => row.original.GRN_DATE || "-"
    },
    {
      accessorKey: "ISSUE_NO",
      header: "Issue No.",
      cell: ({ row }) => row.original.ISSUE_NO || "-"
    },
    {
      accessorKey: "ISSUE_DATE",
      header: "Issue Date",
      cell: ({ row }) => row.original.ISSUE_DATE || "-"
    },
    {
      accessorKey: "RECEIVER",
      header: "Receiver",
      cell: ({ row }) => row.original.RECEIVER || "-"
    },
  ];

  return (
    <div className="w-full p-4 md:p-6 lg:p-8">
      <Heading heading="My Indent" subtext="Indents from ERP system" />

      <DataTable
        data={rows}
        columns={columns}
        searchFields={searchableFields}
        dataLoading={loading}
        className="h-[74dvh]"
      />
    </div>
  );
}
