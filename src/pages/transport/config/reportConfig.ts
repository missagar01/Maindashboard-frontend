import type { LucideIcon } from "lucide-react";
import {
  BadgeIndianRupee,
  ClipboardList,
  Fuel,
  Package,
  ShieldCheck,
  Truck,
  Users,
  Wrench,
} from "lucide-react";

export type ReportCategoryId =
  | "transportation"
  | "material"
  | "diesel"
  | "maintenance"
  | "allowance"
  | "statuary";

export type ReportServiceKey =
  | "lrBilty"
  | "pumpWiseDieselAdvance"
  | "vehicleWiseDieselAdvance"
  | "maintenanceRequests"
  | "optimizedAdvanceList"
  | "vehicleStatuary";

export type ReportStatsKind =
  | "lr"
  | "diesel"
  | "maintenance"
  | "allowance"
  | "statuary";

export type FilterType =
  | "string"
  | "select"
  | "multi-select"
  | "date-range"
  | "number"
  | "decimal"
  | "boolean"
  | "enum";

export type NumberFilterOperation =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not in";

export type ReportColumnType =
  | "text"
  | "date"
  | "number"
  | "status"
  | "badge"
  | "boolean";

export interface ReportFilterOption {
  label: string;
  value: string | boolean;
}

export interface ReportFilterField {
  key: string;
  label: string;
  type: FilterType;
  placeholder?: string;
  options?: ReportFilterOption[];
  defaultOperation?: NumberFilterOperation;
  required?: boolean;
  dateKeys?: {
    from: string;
    to: string;
  };
}

export interface ReportColumn {
  key: string;
  label: string;
  type?: ReportColumnType;
  sortable?: boolean;
  sortKey?: string;
  align?: "left" | "center" | "right";
  sourceKeys?: string[];
}

export interface ReportDrilldownRule {
  key: string;
  label: string;
  filterKey?: string;
  filterType?: Exclude<FilterType, "date-range">;
}

export interface ReportCategoryConfig {
  id: ReportCategoryId;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export interface ReportConfig {
  id: string;
  title: string;
  description: string;
  category: ReportCategoryId;
  icon: LucideIcon;
  color: string;
  endpoint: string;
  serviceKey: ReportServiceKey;
  rowPrimaryKey: string;
  statsKind: ReportStatsKind;
  searchPlaceholder?: string;
  defaultFilters?: Record<string, unknown>;
  defaultSort?: Array<{ id: string; desc: boolean }>;
  filters: ReportFilterField[];
  columns: ReportColumn[];
  drilldownRules: ReportDrilldownRule[];
}

export const transportReportEndpoints: Record<ReportServiceKey, string> = {
  lrBilty: "/reports/lr-bilty-register",
  pumpWiseDieselAdvance: "/reports/pump-wise-diesel-advance",
  vehicleWiseDieselAdvance: "/reports/vehicle-wise-diesel-advance",
  maintenanceRequests: "/fleets/get-maintenance-requests",
  optimizedAdvanceList: "/process/get-optimized-advance-list",
  vehicleStatuary: "/reports/vehicle-statuary",
};

const statusOptions: ReportFilterOption[] = [
  { label: "LR Bilty Prepared", value: "LR_BILTY_PREPARED" },
  { label: "POD Prepared", value: "POD_PREPARED" },
  { label: "Freight Prepared", value: "FREIGHT_PREPARED" },
  { label: "Service Bill Prepared", value: "SERVICE_BILL_PREPARED" },
  { label: "Done", value: "DONE" },
];

const lrStatusOptions: ReportFilterOption[] = [
  { label: "Original", value: "ORIGINAL" },
  { label: "Duplicate", value: "DUPLICATE" },
  { label: "Copy", value: "COPY" },
];

const booleanOptions: ReportFilterOption[] = [
  { label: "Yes", value: true },
  { label: "No", value: false },
];

const numberOperations: NumberFilterOperation[] = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "not in",
];

const buildDateRangeFilter = (
  label = "Date Range",
  from = "fromDate",
  to = "toDate",
  required = false
): ReportFilterField => ({
  key: `${from}_${to}`,
  label,
  type: "date-range",
  required,
  dateKeys: { from, to },
});

const buildRecentDateDefaults = (days = 30, from = "fromDate", to = "toDate") => {
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setDate(toDate.getDate() - (days - 1));

  return {
    [from]: fromDate.toISOString().slice(0, 10),
    [to]: toDate.toISOString().slice(0, 10),
  };
};

const lrDateFilter = buildDateRangeFilter("Date Range");

const lrQuantityFilter: ReportFilterField = {
  key: "lr_bilty_qty",
  label: "Quantity",
  type: "decimal",
  defaultOperation: "gte",
};

const lrColumns: ReportColumn[] = [
  {
    key: "lr_bilty_code",
    label: "LR Code",
    sortable: true,
    sourceKeys: ["lr_bilty_code", "label"],
  },
  {
    key: "lr_bilty_date",
    label: "Date",
    type: "date",
    sortable: true,
    sourceKeys: ["lr_bilty_date", "manual_lr_date", "created_at"],
  },
  {
    key: "source_name",
    label: "Source",
    sortable: true,
  },
  {
    key: "destination_name",
    label: "Destination",
    sortable: true,
  },
  {
    key: "vehicle_no",
    label: "Vehicle",
    sortable: true,
  },
  {
    key: "driver_name",
    label: "Driver",
    sortable: true,
    sourceKeys: ["driver_name", "lr_bilty_driver_name"],
  },
  {
    key: "item_name",
    label: "Item",
    sortable: true,
  },
  {
    key: "lr_bilty_qty",
    label: "Quantity",
    type: "number",
    align: "right",
    sortable: true,
    sourceKeys: ["lr_bilty_qty", "received_quantity", "loading_order_qty"],
  },
  {
    key: "lr_bilty_status",
    label: "Status",
    type: "status",
    sortable: true,
    sourceKeys: ["lr_bilty_status", "status"],
  },
  {
    key: "LRStatus",
    label: "LR Status",
    type: "badge",
    sortable: true,
  },
];

const lrDrilldownRules: ReportDrilldownRule[] = [
  { key: "vehicle_no", label: "Vehicle", filterType: "string" },
  { key: "driver_name", label: "Driver", filterType: "string" },
  { key: "source_name", label: "Source", filterType: "string" },
  { key: "destination_name", label: "Destination", filterType: "string" },
  { key: "item_name", label: "Material", filterType: "string" },
  { key: "bill_to_name", label: "Customer", filterType: "string" },
  {
    key: "lr_bilty_status",
    label: "Status",
    filterKey: "status",
    filterType: "multi-select",
  },
  { key: "lr_bilty_code", label: "LR Code", filterType: "string" },
];

const lrDefaultSort = [{ id: "lr_bilty_date", desc: true }];

const vehicleWiseFuelColumns: ReportColumn[] = [
  {
    key: "date",
    label: "Date",
    type: "date",
    sortable: true,
    sortKey: "diesel_advance_date",
    sourceKeys: ["date", "diesel_advance_date", "created_at", "updated_at"],
  },
  {
    key: "vehicle",
    label: "Vehicle",
    sortable: true,
    sourceKeys: ["vehicle", "vehicle_no", "vehicle_name"],
  },
  {
    key: "account",
    label: "Account",
    sortable: true,
    sourceKeys: ["account", "account_name", "pump_name"],
  },
  {
    key: "total_diesel",
    label: "Total Diesel",
    type: "number",
    align: "right",
    sortable: true,
    sourceKeys: ["total_diesel", "diesel_qty", "totals"],
  },
  {
    key: "amount",
    label: "Amount",
    type: "number",
    align: "right",
    sortable: true,
    sourceKeys: ["amount", "total_amount", "diesel_amount"],
  },
  {
    key: "status",
    label: "Status",
    type: "status",
    sortable: true,
  },
];

const vehicleWiseFuelDrilldown: ReportDrilldownRule[] = [
  { key: "vehicle", label: "Vehicle", filterKey: "vehicle", filterType: "string" },
  { key: "vehicle_no", label: "Vehicle No", filterKey: "vehicle", filterType: "string" },
  { key: "account", label: "Account", filterType: "string" },
];

const dieselExpenseColumns: ReportColumn[] = [
  {
    key: "date",
    label: "Date",
    type: "date",
    sortable: true,
    sortKey: "diesel_advance_date",
    sourceKeys: ["date", "diesel_advance_date", "created_at", "updated_at"],
  },
  {
    key: "vehicle_no",
    label: "Vehicle No",
    sortable: true,
  },
  {
    key: "transporter_name",
    label: "Transporter",
    sortable: true,
  },
  {
    key: "total_diesel",
    label: "Total Diesel",
    type: "number",
    align: "right",
    sortable: true,
  },
  {
    key: "amount",
    label: "Amount",
    type: "number",
    align: "right",
    sortable: true,
    sourceKeys: ["amount", "total_amount", "diesel_amount"],
  },
  {
    key: "status",
    label: "Status",
    type: "status",
    sortable: true,
  },
];

const maintenanceColumns: ReportColumn[] = [
  {
    key: "request_no",
    label: "Request",
    sortable: true,
    sourceKeys: ["request_no", "request_code", "id"],
  },
  {
    key: "created_at",
    label: "Date",
    type: "date",
    sortable: true,
    sortKey: "request_date",
    sourceKeys: ["created_at", "request_date", "updated_at"],
  },
  {
    key: "branchId",
    label: "Branch",
    sortable: true,
    sourceKeys: ["branchId", "branch_name", "branch_code"],
  },
  {
    key: "vehicle_no",
    label: "Vehicle",
    sortable: true,
    sourceKeys: ["vehicle_no", "vehicle"],
  },
  {
    key: "maintenanceType",
    label: "Maintenance Type",
    type: "badge",
    sortable: true,
  },
  {
    key: "status",
    label: "Status",
    type: "status",
    sortable: true,
  },
];

const allowanceColumns: ReportColumn[] = [
  {
    key: "created_at",
    label: "Date",
    type: "date",
    sortable: true,
    sortKey: "advance_date",
    sourceKeys: ["created_at", "advance_date", "updated_at"],
  },
  {
    key: "driver_name",
    label: "Driver",
    sortable: true,
  },
  {
    key: "vehicle_no",
    label: "Vehicle",
    sortable: true,
  },
  {
    key: "driver_advance",
    label: "Driver Advance",
    type: "number",
    align: "right",
    sortable: true,
    sourceKeys: ["driver_advance", "advance_amount", "amount"],
  },
  {
    key: "status",
    label: "Status",
    type: "status",
    sortable: true,
  },
];

const statuaryColumns: ReportColumn[] = [
  {
    key: "vehicle_no",
    label: "Vehicle",
    sortable: true,
  },
  {
    key: "vehicle_document_name",
    label: "Document",
    sortable: true,
  },
  {
    key: "expiry_date",
    label: "Expiry Date",
    type: "date",
    sortable: true,
    sortKey: "document_expiry_date",
    sourceKeys: ["expiry_date", "document_expiry_date"],
  },
  {
    key: "is_expired",
    label: "Expired",
    type: "boolean",
    sortable: true,
  },
  {
    key: "branch_name",
    label: "Branch",
    sortable: true,
    sourceKeys: ["branch_name", "branchId"],
  },
];

export const reportCategories: ReportCategoryConfig[] = [
  {
    id: "transportation",
    title: "Transportation Reports",
    description: "Dispatch, route movement, trip visibility, and operational LR flows.",
    icon: Truck,
    color: "bg-emerald-500",
  },
  {
    id: "material",
    title: "Material Reports",
    description: "Material movement, dispatch detail, quantities, and customer movement analysis.",
    icon: Package,
    color: "bg-indigo-500",
  },
  {
    id: "diesel",
    title: "Diesel / Fuel Reports",
    description: "Pump-wise and vehicle-wise fuel usage with expense tracking.",
    icon: Fuel,
    color: "bg-amber-500",
  },
  {
    id: "maintenance",
    title: "Maintenance Reports",
    description: "Maintenance request visibility across branches and equipment types.",
    icon: Wrench,
    color: "bg-rose-500",
  },
  {
    id: "allowance",
    title: "Driver / Allowance Reports",
    description: "Advance and allowance visibility for drivers with operational context.",
    icon: BadgeIndianRupee,
    color: "bg-cyan-500",
  },
  {
    id: "statuary",
    title: "Vehicle Statutory Reports",
    description: "Track expiring vehicle documents and compliance risk across the fleet.",
    icon: ShieldCheck,
    color: "bg-violet-500",
  },
];

export const reportsMasterConfig: ReportConfig[] = [
  {
    id: "material-details-loading-unloading",
    title: "Material Details (Loading - Unloading)",
    description: "Material movement view across source, destination, LR status, and quantity.",
    category: "material",
    icon: Package,
    color: "bg-emerald-500",
    endpoint: transportReportEndpoints.lrBilty,
    serviceKey: "lrBilty",
    rowPrimaryKey: "lr_bilty_id",
    statsKind: "lr",
    defaultFilters: buildRecentDateDefaults(30),
    defaultSort: lrDefaultSort,
    filters: [
      lrDateFilter,
      { key: "item_name", label: "Item", type: "string", placeholder: "Search material" },
      { key: "source_name", label: "Source", type: "string", placeholder: "Search source" },
      {
        key: "destination_name",
        label: "Destination",
        type: "string",
        placeholder: "Search destination",
      },
      { key: "lr_bilty_code", label: "LR Code", type: "string", placeholder: "Enter LR code" },
      { key: "status", label: "Status", type: "multi-select", options: statusOptions },
      { key: "LRStatus", label: "LR Status", type: "multi-select", options: lrStatusOptions },
      lrQuantityFilter,
    ],
    columns: [
      lrColumns[0],
      lrColumns[1],
      lrColumns[6],
      lrColumns[2],
      lrColumns[3],
      lrColumns[7],
      lrColumns[8],
      lrColumns[9],
    ],
    drilldownRules: lrDrilldownRules,
  },
  {
    id: "trip-dispatch",
    title: "Trip / Dispatch",
    description: "Trip-oriented LR register with status flags, vehicle, driver, and invoice references.",
    category: "transportation",
    icon: Truck,
    color: "bg-indigo-500",
    endpoint: transportReportEndpoints.lrBilty,
    serviceKey: "lrBilty",
    rowPrimaryKey: "lr_bilty_id",
    statsKind: "lr",
    defaultFilters: buildRecentDateDefaults(30),
    defaultSort: lrDefaultSort,
    filters: [
      lrDateFilter,
      { key: "status", label: "Status", type: "multi-select", options: statusOptions },
      { key: "lr_bilty_code", label: "LR Code", type: "string" },
      { key: "manual_lr_no", label: "Manual LR No", type: "string" },
      { key: "party_invoice_no", label: "Party Invoice No", type: "string" },
      { key: "vehicle_no", label: "Vehicle No", type: "string" },
      { key: "driver_name", label: "Driver Name", type: "string" },
    ],
    columns: [
      lrColumns[0],
      lrColumns[1],
      { key: "manual_lr_no", label: "Manual LR No", sortable: true },
      { key: "party_invoice_no", label: "Party Invoice No", sortable: true },
      lrColumns[4],
      lrColumns[5],
      lrColumns[2],
      lrColumns[3],
      lrColumns[8],
    ],
    drilldownRules: lrDrilldownRules,
  },
  {
    id: "source-destination-wise-trips",
    title: "Source Destination Wise Trips",
    description: "Route-wise trip visibility filtered by source, destination, and movement date.",
    category: "transportation",
    icon: ClipboardList,
    color: "bg-sky-500",
    endpoint: transportReportEndpoints.lrBilty,
    serviceKey: "lrBilty",
    rowPrimaryKey: "lr_bilty_id",
    statsKind: "lr",
    defaultFilters: buildRecentDateDefaults(30),
    defaultSort: lrDefaultSort,
    filters: [
      lrDateFilter,
      { key: "source_name", label: "Source", type: "string" },
      { key: "destination_name", label: "Destination", type: "string" },
    ],
    columns: [
      lrColumns[1],
      lrColumns[2],
      lrColumns[3],
      lrColumns[0],
      lrColumns[4],
      lrColumns[5],
      lrColumns[7],
      lrColumns[8],
    ],
    drilldownRules: lrDrilldownRules,
  },
  {
    id: "driver-wise-trip",
    title: "Driver Wise Trip",
    description: "Driver-centric trip view with linked LR, route, vehicle, and quantity metrics.",
    category: "transportation",
    icon: Users,
    color: "bg-teal-500",
    endpoint: transportReportEndpoints.lrBilty,
    serviceKey: "lrBilty",
    rowPrimaryKey: "lr_bilty_id",
    statsKind: "lr",
    defaultFilters: buildRecentDateDefaults(30),
    defaultSort: lrDefaultSort,
    filters: [
      lrDateFilter,
      { key: "driver_name", label: "Driver Name", type: "string" },
    ],
    columns: [
      lrColumns[1],
      lrColumns[5],
      lrColumns[4],
      lrColumns[0],
      lrColumns[2],
      lrColumns[3],
      lrColumns[7],
      lrColumns[8],
    ],
    drilldownRules: lrDrilldownRules,
  },
  {
    id: "load-material-movement",
    title: "Load Material Movement",
    description: "Material flow report focused on item movement and transported quantity.",
    category: "material",
    icon: Package,
    color: "bg-fuchsia-500",
    endpoint: transportReportEndpoints.lrBilty,
    serviceKey: "lrBilty",
    rowPrimaryKey: "lr_bilty_id",
    statsKind: "lr",
    defaultFilters: buildRecentDateDefaults(30),
    defaultSort: lrDefaultSort,
    filters: [
      lrDateFilter,
      { key: "item_name", label: "Item", type: "string" },
      lrQuantityFilter,
    ],
    columns: [
      lrColumns[1],
      lrColumns[6],
      lrColumns[7],
      lrColumns[2],
      lrColumns[3],
      lrColumns[4],
      lrColumns[5],
      lrColumns[8],
    ],
    drilldownRules: lrDrilldownRules,
  },
  {
    id: "material-dispatch-details",
    title: "Material Dispatch Details",
    description: "Dispatch-oriented LR view filtered by LR code and movement status.",
    category: "material",
    icon: ClipboardList,
    color: "bg-indigo-500",
    endpoint: transportReportEndpoints.lrBilty,
    serviceKey: "lrBilty",
    rowPrimaryKey: "lr_bilty_id",
    statsKind: "lr",
    defaultFilters: buildRecentDateDefaults(30),
    defaultSort: lrDefaultSort,
    filters: [
      { key: "lr_bilty_code", label: "LR Code", type: "string" },
      { key: "status", label: "Status", type: "multi-select", options: statusOptions },
    ],
    columns: [
      lrColumns[0],
      lrColumns[1],
      lrColumns[6],
      lrColumns[4],
      lrColumns[2],
      lrColumns[3],
      lrColumns[7],
      lrColumns[8],
    ],
    drilldownRules: lrDrilldownRules,
  },
  {
    id: "quantity-transported",
    title: "Quantity Transported",
    description: "Quantity-first LR view with item, route, and vehicle context.",
    category: "material",
    icon: BadgeIndianRupee,
    color: "bg-emerald-500",
    endpoint: transportReportEndpoints.lrBilty,
    serviceKey: "lrBilty",
    rowPrimaryKey: "lr_bilty_id",
    statsKind: "lr",
    defaultFilters: buildRecentDateDefaults(30),
    defaultSort: lrDefaultSort,
    filters: [lrDateFilter, lrQuantityFilter],
    columns: [
      lrColumns[1],
      lrColumns[0],
      lrColumns[6],
      lrColumns[7],
      lrColumns[4],
      lrColumns[2],
      lrColumns[3],
      lrColumns[8],
    ],
    drilldownRules: lrDrilldownRules,
  },
  {
    id: "party-customer-wise-movements",
    title: "Party / Customer Wise Movements",
    description: "Customer-linked material movement filtered by bill-to party and date range.",
    category: "material",
    icon: Users,
    color: "bg-blue-500",
    endpoint: transportReportEndpoints.lrBilty,
    serviceKey: "lrBilty",
    rowPrimaryKey: "lr_bilty_id",
    statsKind: "lr",
    defaultFilters: buildRecentDateDefaults(30),
    defaultSort: lrDefaultSort,
    filters: [
      lrDateFilter,
      { key: "bill_to_name", label: "Customer", type: "string" },
    ],
    columns: [
      lrColumns[1],
      { key: "bill_to_name", label: "Customer", sortable: true },
      lrColumns[0],
      lrColumns[6],
      lrColumns[7],
      lrColumns[4],
      lrColumns[3],
      lrColumns[8],
    ],
    drilldownRules: lrDrilldownRules,
  },
  {
    id: "vehicle-wise-fuel-usage",
    title: "Vehicle Wise Fuel Usage",
    description: "Pump-wise diesel advance view with mandatory date range and account-level visibility.",
    category: "diesel",
    icon: Fuel,
    color: "bg-amber-500",
    endpoint: transportReportEndpoints.pumpWiseDieselAdvance,
    serviceKey: "pumpWiseDieselAdvance",
    rowPrimaryKey: "id",
    statsKind: "diesel",
    searchPlaceholder: "Search vehicle, account, or amount",
    defaultFilters: buildRecentDateDefaults(30),
    filters: [
      buildDateRangeFilter("Date Range", "fromDate", "toDate", true),
      { key: "vehicle", label: "Vehicle", type: "string" },
      { key: "account", label: "Account", type: "string" },
      {
        key: "totals",
        label: "Totals",
        type: "decimal",
        defaultOperation: "gte",
      },
    ],
    columns: vehicleWiseFuelColumns,
    drilldownRules: vehicleWiseFuelDrilldown,
  },
  {
    id: "diesel-expenses",
    title: "Diesel Expenses",
    description: "Vehicle diesel expense visibility by transporter, vehicle, and total diesel usage.",
    category: "diesel",
    icon: Fuel,
    color: "bg-orange-500",
    endpoint: transportReportEndpoints.vehicleWiseDieselAdvance,
    serviceKey: "vehicleWiseDieselAdvance",
    rowPrimaryKey: "id",
    statsKind: "diesel",
    searchPlaceholder: "Search vehicle, transporter, or diesel amount",
    defaultFilters: buildRecentDateDefaults(30),
    filters: [
      lrDateFilter,
      { key: "vehicle_no", label: "Vehicle No", type: "string" },
      { key: "transporter_name", label: "Transporter", type: "string" },
      {
        key: "total_diesel",
        label: "Total Diesel",
        type: "decimal",
        defaultOperation: "gte",
      },
    ],
    columns: dieselExpenseColumns,
    drilldownRules: [
      { key: "vehicle_no", label: "Vehicle", filterType: "string" },
      { key: "transporter_name", label: "Transporter", filterType: "string" },
    ],
  },
  {
    id: "maintenance-module",
    title: "Maintenance Module",
    description: "Maintenance requests grouped by branch, maintenance type, and status.",
    category: "maintenance",
    icon: Wrench,
    color: "bg-rose-500",
    endpoint: transportReportEndpoints.maintenanceRequests,
    serviceKey: "maintenanceRequests",
    rowPrimaryKey: "id",
    statsKind: "maintenance",
    defaultSort: [{ id: "request_date", desc: true }],
    filters: [
      { key: "branchId", label: "Branch", type: "string" },
      { key: "status", label: "Status", type: "string" },
      { key: "maintenanceType", label: "Maintenance Type", type: "string" },
    ],
    columns: maintenanceColumns,
    drilldownRules: [
      { key: "branchId", label: "Branch", filterType: "string" },
      { key: "status", label: "Status", filterType: "string" },
      { key: "maintenanceType", label: "Type", filterType: "string" },
    ],
  },
  {
    id: "driver-allowance",
    title: "Driver Allowance",
    description: "Driver advance visibility with date range, driver, and vehicle-level context.",
    category: "allowance",
    icon: BadgeIndianRupee,
    color: "bg-cyan-500",
    endpoint: transportReportEndpoints.optimizedAdvanceList,
    serviceKey: "optimizedAdvanceList",
    rowPrimaryKey: "id",
    statsKind: "allowance",
    defaultFilters: buildRecentDateDefaults(30),
    filters: [
      lrDateFilter,
      {
        key: "driver_advance",
        label: "Driver Advance",
        type: "decimal",
        defaultOperation: "gte",
      },
    ],
    columns: allowanceColumns,
    drilldownRules: [],
  },
  {
    id: "vehicle-statutory-reports",
    title: "Vehicle Statutory Reports",
    description: "Compliance and expiry visibility across vehicle documents and branches.",
    category: "statuary",
    icon: ShieldCheck,
    color: "bg-violet-500",
    endpoint: transportReportEndpoints.vehicleStatuary,
    serviceKey: "vehicleStatuary",
    rowPrimaryKey: "id",
    statsKind: "statuary",
    filters: [
      { key: "is_expired", label: "Expired", type: "boolean", options: booleanOptions },
      { key: "vehicle_document_name", label: "Document Name", type: "string" },
      { key: "vehicle_no", label: "Vehicle No", type: "string" },
    ],
    columns: statuaryColumns,
    drilldownRules: [
      { key: "vehicle_no", label: "Vehicle", filterType: "string" },
      { key: "vehicle_document_name", label: "Document", filterType: "string" },
      { key: "is_expired", label: "Expired", filterType: "boolean" },
    ],
  },
];

export const reportCountByCategory = reportsMasterConfig.reduce<Record<ReportCategoryId, number>>(
  (accumulator, report) => {
    accumulator[report.category] = (accumulator[report.category] || 0) + 1;
    return accumulator;
  },
  {
    transportation: 0,
    material: 0,
    diesel: 0,
    maintenance: 0,
    allowance: 0,
    statuary: 0,
  }
);

export const supportedNumberOperations = numberOperations;
