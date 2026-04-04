import { useEffect, useState } from "react";
import { storeApi } from "@/api/store/storeSystemApi";

export interface IndentRow {
  id?: string | number;
  timestamp?: string;
  requestNumber?: string;
  indentSeries?: string;
  formType?: string;
  requesterName?: string;
  department?: string;
  division?: string;
  itemCode?: string;
  productName?: string;
  uom?: string;
  requestQty?: number;
  costLocation?: string;
  status?: string;
  requestStatus?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedQuantity?: number;
  groupName?: string;
}

export function mapApiRowToIndent(row: Record<string, any>): IndentRow {
  const safeString = (...values: (string | undefined | null)[]) =>
    values.find((v) => typeof v === "string" && v.trim() !== "") ?? "";

  const numeric = (value: unknown) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^0-9.-]/g, ""));
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  };

  return {
    id: row.id ?? row.item_id ?? row.ITEM_ID,
    timestamp:
      safeString(
        row.timestamp,
        row.created_at,
        row.createdAt,
        row.sample_timestamp
      ) || undefined,
    createdAt: safeString(row.created_at, row.createdAt),
    updatedAt: safeString(row.updated_at, row.updatedAt),
    requestNumber:
      safeString(row.request_number, row.requestNumber, row.INDENT_NUMBER) ||
      undefined,
    indentSeries: safeString(row.indent_series, row.indentSeries) || undefined,
    formType: safeString(row.form_type, row.formType),
    requesterName: safeString(
      row.requester_name,
      row.requesterName,
      row.INDENTER_NAME
    ),
    department: safeString(row.department, row.DEPARTMENT),
    division: safeString(row.division, row.DIVISION),
    itemCode: safeString(row.item_code, row.itemCode),
    productName: safeString(
      row.product_name,
      row.productName,
      row.ITEM_NAME
    ),
    groupName: safeString(row.category_name, row.group_name),
    uom: safeString(row.uom, row.UM),
    requestQty: numeric(row.request_qty ?? row.requestQty ?? row.REQUIRED_QTY),
    costLocation: safeString(row.costLocation, row.cost_location),
    status: safeString(row.status, row.requestStatus, row.request_status),
    requestStatus: safeString(row.request_status, row.requestStatus),
    approvedQuantity: numeric(row.approved_quantity ?? row.APPROVED_QTY),
  };
}

type RowClickBinderProps = {
  rows: IndentRow[];
  onPick: (row: IndentRow) => void;
};

export function RowClickBinder({ rows, onPick }: RowClickBinderProps) {
  useEffect(() => {
    if (rows.length === 0) return;
    onPick(rows[0]);
  }, [rows, onPick]);

  return null;
}
