import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileClock,
  LayoutDashboard,
  PackageCheck,
  Repeat2,
  Search,
  TrendingUp,
  Truck,
  Warehouse,
  X,
} from "lucide-react";

import { storeApi } from "@/api/store/storeSystemApi";
import { Input } from "../../components/ui/input";
import Loading from "./Loading";

type DashboardTopItem = {
  itemName?: string;
  orderCount?: number;
  totalOrderQty?: number;
};

type DashboardTopVendor = {
  vendorName?: string;
  uniquePoCount?: number;
  totalItems?: number;
};

type DashboardMetrics = {
  totalIndents: number;
  completedIndents: number;
  pendingIndents: number;
  upcomingIndents: number;
  overdueIndents: number;
  overallProgress: number;
  completedPercent: number;
  pendingPercent: number;
  upcomingPercent: number;
  overduePercent: number;
  totalPurchaseOrders: number;
  pendingPurchaseOrders: number;
  totalIssuedQuantity: number;
  outOfStockCount: number;
  topPurchasedItems: DashboardTopItem[];
  topVendors: DashboardTopVendor[];
};

type DashboardApiResponse = {
  success?: boolean;
  data?: Partial<DashboardMetrics> | null;
};

type RepairGatePassCountsResponse = {
  success?: boolean;
  data?: {
    pending?: number;
    history?: number;
  } | null;
};

type ReturnableStats = {
  total: number;
  returnable: number;
  nonReturnable: number;
  returnablePending: number;
  returnableCompleted: number;
};

type CardDetail = {
  label: string;
  value: string | number;
  sub?: string;
};

type DashboardCard = {
  title: string;
  value: number;
  icon: ReactNode;
  link: string;
  gradient: string;
  details: CardDetail[];
  description: string;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    const parsedString = Number(normalized);
    return Number.isFinite(parsedString) ? parsedString : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const clampPercent = (value: number): number => Math.max(0, Math.min(100, value));

const uniqueSortedNames = (values: string[]): string[] =>
  Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

const buildConicGradient = (segments: Array<{ value: number; color: string }>): string => {
  let current = 0;
  const parts: string[] = [];

  segments.forEach((segment) => {
    const start = current;
    const end = Math.min(100, start + Math.max(0, segment.value));
    if (end > start) {
      parts.push(`${segment.color} ${start}% ${end}%`);
    }
    current = end;
  });

  if (current < 100) {
    parts.push(`#e5e7eb ${current}% 100%`);
  }

  return `conic-gradient(${parts.join(", ")})`;
};

const parseReturnableStats = (payload: unknown): ReturnableStats => {
  const data = (payload || {}) as Record<string, unknown>;
  return {
    total: toNumber(data.TOTAL_COUNT ?? data.total_count ?? data.totalCount),
    returnable: toNumber(data.RETURNABLE_COUNT ?? data.returnable_count ?? data.returnableCount),
    nonReturnable: toNumber(
      data.NON_RETURNABLE_COUNT ?? data.non_returnable_count ?? data.nonReturnableCount
    ),
    returnablePending: toNumber(
      data.RETURNABLE_PENDING_COUNT ??
      data.returnable_pending_count ??
      data.returnablePendingCount
    ),
    returnableCompleted: toNumber(
      data.RETURNABLE_COMPLETED_COUNT ??
      data.returnable_completed_count ??
      data.returnableCompletedCount
    ),
  };
};

const normalizeTopItems = (payload: unknown): DashboardTopItem[] => {
  if (!Array.isArray(payload)) return [];
  return payload.map((item) => {
    const row = (item || {}) as Record<string, unknown>;
    return {
      itemName: asText(row.itemName ?? row.item_name ?? row.product_name ?? row.PRODUCT_NAME),
      orderCount: toNumber(row.orderCount ?? row.order_count),
      totalOrderQty: toNumber(row.totalOrderQty ?? row.total_order_qty),
    };
  });
};

const normalizeTopVendors = (payload: unknown): DashboardTopVendor[] => {
  if (!Array.isArray(payload)) return [];
  return payload.map((item) => {
    const row = (item || {}) as Record<string, unknown>;
    return {
      vendorName: asText(
        row.vendorName ?? row.vendor_name ?? row.acc_name ?? row.ACC_NAME ?? row.VENDOR_NAME
      ),
      uniquePoCount: toNumber(row.uniquePoCount ?? row.unique_po_count),
      totalItems: toNumber(row.totalItems ?? row.total_items),
    };
  });
};

const normalizeDashboardMetrics = (
  payload: Partial<DashboardMetrics> | null | undefined
): DashboardMetrics => {
  const row = (payload || {}) as Record<string, unknown>;

  const pickNumber = (...keys: string[]): number => {
    for (const key of keys) {
      if (!(key in row)) continue;
      const raw = row[key];
      if (raw === null || raw === undefined || raw === "") continue;
      return toNumber(raw);
    }
    return 0;
  };

  const pickArray = (...keys: string[]): unknown[] => {
    for (const key of keys) {
      const raw = row[key];
      if (Array.isArray(raw)) return raw;
    }
    return [];
  };

  return {
    totalIndents: pickNumber("totalIndents", "total_indents", "TOTAL_INDENTS"),
    completedIndents: pickNumber("completedIndents", "completed_indents", "COMPLETED_INDENTS"),
    pendingIndents: pickNumber("pendingIndents", "pending_indents", "PENDING_INDENTS"),
    upcomingIndents: pickNumber("upcomingIndents", "upcoming_indents", "UPCOMING_INDENTS"),
    overdueIndents: pickNumber("overdueIndents", "overdue_indents", "OVERDUE_INDENTS"),
    overallProgress: pickNumber("overallProgress", "overall_progress", "OVERALL_PROGRESS"),
    completedPercent: pickNumber("completedPercent", "completed_percent", "COMPLETED_PERCENT"),
    pendingPercent: pickNumber("pendingPercent", "pending_percent", "PENDING_PERCENT"),
    upcomingPercent: pickNumber("upcomingPercent", "upcoming_percent", "UPCOMING_PERCENT"),
    overduePercent: pickNumber("overduePercent", "overdue_percent", "OVERDUE_PERCENT"),
    totalPurchaseOrders: pickNumber(
      "totalPurchaseOrders",
      "total_purchase_orders",
      "TOTAL_PURCHASE_ORDERS"
    ),
    pendingPurchaseOrders: pickNumber(
      "pendingPurchaseOrders",
      "pending_purchase_orders",
      "PENDING_PURCHASE_ORDERS",
      "pendingPO",
      "pending_po"
    ),
    totalIssuedQuantity: pickNumber(
      "totalIssuedQuantity",
      "total_issued_quantity",
      "TOTAL_ISSUED_QUANTITY"
    ),
    outOfStockCount: pickNumber("outOfStockCount", "out_of_stock_count", "OUT_OF_STOCK_COUNT"),
    topPurchasedItems: normalizeTopItems(
      pickArray("topPurchasedItems", "top_purchased_items", "TOP_PURCHASED_ITEMS")
    ),
    topVendors: normalizeTopVendors(pickArray("topVendors", "top_vendors", "TOP_VENDORS")),
  };
};

const extractNamesFromResponse = (payload: unknown, keys: string[]): string[] => {
  const source = Array.isArray((payload as { data?: unknown[] })?.data)
    ? (payload as { data: unknown[] }).data
    : Array.isArray(payload)
      ? payload
      : [];

  return uniqueSortedNames(
    source.map((item) => {
      const row = (item || {}) as Record<string, unknown>;
      for (const key of keys) {
        const value = asText(row[key]);
        if (value) return value;
      }
      return "";
    })
  );
};

export default function StoreDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardMetrics | null>(null);
  const [repairCounts, setRepairCounts] = useState({ pending: 0, history: 0 });
  const [returnableStats, setReturnableStats] = useState<ReturnableStats>({
    total: 0,
    returnable: 0,
    nonReturnable: 0,
    returnablePending: 0,
    returnableCompleted: 0,
  });
  const [allProducts, setAllProducts] = useState<string[]>([]);
  const [allVendors, setAllVendors] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<DashboardCard | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const [dashboardRes, repairRes, returnableRes, productsRes, vendorsRes] =
          await Promise.allSettled([
            storeApi.getStoreIndentDashboard() as Promise<DashboardApiResponse>,
            storeApi.getRepairGatePassCounts() as Promise<RepairGatePassCountsResponse>,
            storeApi.getReturnableStats() as Promise<{ success?: boolean; data?: unknown }>,
            storeApi.getAllProducts() as Promise<{ success?: boolean; data?: unknown[] }>,
            storeApi.getAllVendors() as Promise<{ success?: boolean; data?: unknown[] }>,
          ]);

        if (!active) return;

        if (dashboardRes.status !== "fulfilled" || dashboardRes.value?.success === false) {
          throw new Error("Failed to fetch dashboard metrics");
        }

        const metrics = normalizeDashboardMetrics(dashboardRes.value?.data);
        setDashboardData(metrics);

        if (repairRes.status === "fulfilled" && repairRes.value?.data) {
          setRepairCounts({
            pending: toNumber(repairRes.value.data.pending),
            history: toNumber(repairRes.value.data.history),
          });
        } else {
          setRepairCounts({ pending: 0, history: 0 });
        }

        if (returnableRes.status === "fulfilled") {
          setReturnableStats(parseReturnableStats(returnableRes.value?.data));
        } else {
          setReturnableStats({
            total: 0,
            returnable: 0,
            nonReturnable: 0,
            returnablePending: 0,
            returnableCompleted: 0,
          });
        }

        const dashboardProducts = uniqueSortedNames(
          metrics.topPurchasedItems.map((item) => asText(item.itemName))
        );
        const dashboardVendors = uniqueSortedNames(
          metrics.topVendors.map((vendor) => asText(vendor.vendorName))
        );

        const apiProducts =
          productsRes.status === "fulfilled"
            ? extractNamesFromResponse(productsRes.value, [
              "itemName",
              "item_name",
              "productName",
              "product_name",
              "PRODUCT_NAME",
            ])
            : [];

        const apiVendors =
          vendorsRes.status === "fulfilled"
            ? extractNamesFromResponse(vendorsRes.value, [
              "vendorName",
              "vendor_name",
              "acc_name",
              "ACC_NAME",
            ])
            : [];

        setAllProducts(uniqueSortedNames([...dashboardProducts, ...apiProducts]));
        setAllVendors(uniqueSortedNames([...dashboardVendors, ...apiVendors]));
      } catch (loadError) {
        console.error("Failed to load store dashboard", loadError);
        if (active) {
          setError("Unable to load dashboard data right now.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const metrics = dashboardData ?? normalizeDashboardMetrics(null);

  const dashboardCards = useMemo<DashboardCard[]>(
    () => [
      {
        title: "Total Indents",
        value: metrics.totalIndents,
        icon: <ClipboardList size={18} />,
        link: "/store/indent",
        gradient: "from-rose-500 to-red-600",
        description: "All indent requests raised in the system.",
        details: [
          { label: "Total Indents", value: metrics.totalIndents },
          { label: "Completed", value: metrics.completedIndents },
          { label: "Pending", value: metrics.pendingIndents },
          { label: "Overdue", value: metrics.overdueIndents },
          { label: "Overall Progress", value: `${clampPercent(metrics.overallProgress).toFixed(1)}%` },
        ],
      },
      {
        title: "Pending Indents",
        value: metrics.pendingIndents,
        icon: <PackageCheck size={18} />,
        link: "/store/approve-indent",
        gradient: "from-red-400 to-rose-500",
        description: "Indents awaiting approval or action.",
        details: [
          { label: "Pending Indents", value: metrics.pendingIndents },
          { label: "Pending %", value: `${clampPercent(metrics.pendingPercent).toFixed(1)}%` },
          { label: "Overdue Indents", value: metrics.overdueIndents },
          { label: "Overdue %", value: `${clampPercent(metrics.overduePercent).toFixed(1)}%` },
          { label: "Upcoming Indents", value: metrics.upcomingIndents },
        ],
      },
      {
        title: "Total Purchases",
        value: metrics.totalPurchaseOrders,
        icon: <Truck size={18} />,
        link: "/store/pending-indents",
        gradient: "from-emerald-600 to-teal-600",
        description: "Total purchase orders created.",
        details: [
          { label: "Total Purchase Orders", value: metrics.totalPurchaseOrders },
          { label: "Pending PO", value: metrics.pendingPurchaseOrders },
          { label: "Total Issued Qty", value: metrics.totalIssuedQuantity },
          { label: "Out of Stock Items", value: metrics.outOfStockCount },
          { label: "Top Vendors", value: metrics.topVendors.length },
        ],
      },
      {
        title: "Pending PO",
        value: metrics.pendingPurchaseOrders,
        icon: <FileClock size={18} />,
        link: "/store/pending-indents",
        gradient: "from-teal-500 to-emerald-500",
        description: "Purchase orders pending fulfilment.",
        details: [
          { label: "Pending PO", value: metrics.pendingPurchaseOrders },
          { label: "Total PO", value: metrics.totalPurchaseOrders },
          { label: "Issued Quantity", value: metrics.totalIssuedQuantity },
          { label: "Out of Stock", value: metrics.outOfStockCount },
          { label: "Top Purchased Items", value: metrics.topPurchasedItems.length },
        ],
      },
      {
        title: "Repair Pending",
        value: repairCounts.pending,
        icon: <Activity size={18} />,
        link: "/store/repair-gate-pass",
        gradient: "from-violet-500 to-purple-600",
        description: "Repair gate passes awaiting processing.",
        details: [
          { label: "Pending Repairs", value: repairCounts.pending },
          { label: "Repair History", value: repairCounts.history },
          { label: "Total Repairs", value: repairCounts.pending + repairCounts.history },
        ],
      },
      {
        title: "Repair History",
        value: repairCounts.history,
        icon: <CheckCircle2 size={18} />,
        link: "/store/repair-followup",
        gradient: "from-purple-400 to-violet-500",
        description: "Completed / historical repair gate passes.",
        details: [
          { label: "Completed Repairs", value: repairCounts.history },
          { label: "Pending Repairs", value: repairCounts.pending },
          { label: "Total Repairs", value: repairCounts.pending + repairCounts.history },
        ],
      },
      {
        title: "Total Returnable",
        value: returnableStats.returnable,
        icon: <Repeat2 size={18} />,
        link: "/store/returnable",
        gradient: "from-indigo-500 to-blue-600",
        description: "Items issued on returnable basis.",
        details: [
          { label: "Returnable Items", value: returnableStats.returnable },
          { label: "Returnable Pending", value: returnableStats.returnablePending },
          { label: "Returnable Completed", value: returnableStats.returnableCompleted },
          { label: "Non Returnable", value: returnableStats.nonReturnable },
          { label: "Total gate passes", value: returnableStats.total },
        ],
      },
      {
        title: "Non Returnable",
        value: returnableStats.nonReturnable,
        icon: <PackageCheck size={18} />,
        link: "/store/returnable",
        gradient: "from-blue-500 to-indigo-500",
        description: "Items issued on non-returnable basis.",
        details: [
          { label: "Non Returnable", value: returnableStats.nonReturnable },
          { label: "Returnable Items", value: returnableStats.returnable },
          { label: "Total gate passes", value: returnableStats.total },
        ],
      },
      {
        title: "Returnable Pending",
        value: returnableStats.returnablePending,
        icon: <FileClock size={18} />,
        link: "/store/returnable",
        gradient: "from-amber-500 to-orange-500",
        description: "Returnable items not yet returned.",
        details: [
          { label: "Pending Returns", value: returnableStats.returnablePending },
          { label: "Completed Returns", value: returnableStats.returnableCompleted },
          { label: "Total Returnable", value: returnableStats.returnable },
        ],
      },
      {
        title: "Returnable Completed",
        value: returnableStats.returnableCompleted,
        icon: <Warehouse size={18} />,
        link: "/store/returnable",
        gradient: "from-orange-500 to-amber-600",
        description: "Returnable items successfully returned.",
        details: [
          { label: "Completed Returns", value: returnableStats.returnableCompleted },
          { label: "Pending Returns", value: returnableStats.returnablePending },
          { label: "Total Returnable", value: returnableStats.returnable },
        ],
      },
    ],
    [metrics, repairCounts, returnableStats]
  );

  const overallSegments = useMemo(
    () => [
      {
        label: "Completed",
        count: metrics.completedIndents,
        color: "#10b981",
        percent: clampPercent(metrics.completedPercent),
      },
      {
        label: "Pending",
        count: metrics.pendingIndents,
        color: "#f4b400",
        percent: clampPercent(metrics.pendingPercent),
      },
      {
        label: "Overdue",
        count: metrics.overdueIndents,
        color: "#e11d48",
        percent: clampPercent(metrics.overduePercent),
      },
    ],
    [metrics]
  );

  const overallGradient = useMemo(
    () =>
      buildConicGradient(
        overallSegments.map((segment) => ({
          value: segment.percent,
          color: segment.color,
        }))
      ),
    [overallSegments]
  );

  const vendorPerformance = useMemo(() => {
    const vendorColors = ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#6366f1"];
    const vendorRows = metrics.topVendors
      .map((vendor, index) => ({
        label: asText(vendor.vendorName),
        value: Math.max(toNumber(vendor.uniquePoCount), toNumber(vendor.totalItems)),
        color: vendorColors[index % vendorColors.length],
      }))
      .filter((item) => item.label && item.value > 0);

    const rows = [
      { label: "Unassigned", value: metrics.pendingIndents, color: "#3b82f6" },
      ...(
        vendorRows.length
          ? vendorRows.slice(0, 6)
          : [
            { label: "In Progress", value: metrics.upcomingIndents, color: "#10b981" },
            { label: "Overdue", value: metrics.overdueIndents, color: "#f59e0b" },
            { label: "Out of Stock", value: metrics.outOfStockCount, color: "#8b5cf6" },
          ]
      ),
    ];

    return rows.filter((item) => item.value > 0);
  }, [metrics]);

  const performanceTotal = useMemo(
    () => vendorPerformance.reduce((sum, item) => sum + item.value, 0),
    [vendorPerformance]
  );

  const performanceGradient = useMemo(() => {
    if (performanceTotal === 0) {
      return "conic-gradient(#dbeafe 0 100%)";
    }
    return buildConicGradient(
      vendorPerformance.map((item) => ({
        color: item.color,
        value: (item.value / performanceTotal) * 100,
      }))
    );
  }, [vendorPerformance, performanceTotal]);

  const filteredProducts = useMemo(() => {
    const needle = productSearch.trim().toLowerCase();
    if (!needle) return allProducts;
    return allProducts.filter((item) => item.toLowerCase().includes(needle));
  }, [allProducts, productSearch]);

  const filteredVendors = useMemo(() => {
    const needle = vendorSearch.trim().toLowerCase();
    if (!needle) return allVendors;
    return allVendors.filter((item) => item.toLowerCase().includes(needle));
  }, [allVendors, vendorSearch]);

  if (loading) {
    return (
      <Loading
        heading="Store Dashboard"
        subtext="Loading dashboard insights"
        icon={<LayoutDashboard size={48} className="text-blue-600" />}
      />
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        <p className="font-semibold">Dashboard error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full space-y-3 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-md sm:h-14 sm:w-14 sm:rounded-2xl">
            <LayoutDashboard size={22} className="sm:hidden" />
            <LayoutDashboard size={30} className="hidden sm:block" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-3xl md:text-5xl">
              Store Dashboard
            </h1>
            <p className="text-xs font-medium text-slate-600 sm:text-base">Live overview of Store &amp; Purchase</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-5">
          {dashboardCards.map((card) => (
            <div
              key={card.title}
              className={`relative overflow-hidden rounded-2xl sm:rounded-[22px] border border-white/10 bg-gradient-to-r ${card.gradient} p-3.5 sm:p-5 text-white shadow-[0_8px_20px_rgba(15,23,42,0.14)]`}
            >
              <div className="flex items-start justify-between">
                <div className="inline-flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl bg-white/20 text-white">
                  {card.icon}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCard(card)}
                  className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-white/25 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-white transition hover:bg-white/40 active:scale-95"
                >
                  <ArrowUpRight size={10} />
                  <span>View</span>
                </button>
              </div>
              <p className="mt-4 sm:mt-7 text-[10px] sm:text-sm font-semibold uppercase tracking-wide text-white/90 leading-tight">{card.title}</p>
              <p className="mt-0.5 sm:mt-1 text-3xl sm:text-5xl font-black leading-none">{card.value.toLocaleString("en-IN")}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
          <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 sm:px-5 py-3 sm:py-4">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <TrendingUp size={15} />
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">Overall Progress</h2>
            </div>
            <div className="flex flex-row items-center gap-4 p-4 sm:p-5 sm:flex-row">
              <div
                className="relative shrink-0 h-32 w-32 sm:h-40 sm:w-40 rounded-full"
                style={{ background: overallGradient }}
              >
                <div className="absolute inset-4 sm:inset-5 flex flex-col items-center justify-center rounded-full bg-white text-center">
                  <p className="text-3xl sm:text-5xl font-black text-slate-800">
                    {clampPercent(metrics.overallProgress).toFixed(0)}%
                  </p>
                  <p className="text-[9px] sm:text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Done</p>
                </div>
              </div>
              <div className="w-full space-y-1.5 sm:space-y-2">
                {overallSegments.map((segment) => (
                  <div
                    key={segment.label}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-2.5 sm:px-3 py-1.5 sm:py-2"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span
                        className="inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="text-xs sm:text-sm font-semibold text-slate-700">{segment.label}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {segment.count.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 sm:px-5 py-3 sm:py-4">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BarChart3 size={15} />
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">Performance Indicators</h2>
            </div>
            <div className="flex flex-row items-center gap-4 p-4 sm:p-5 sm:flex-row">
              <div
                className="relative shrink-0 h-32 w-32 sm:h-40 sm:w-40 rounded-full"
                style={{ background: performanceGradient }}
              >
                <div className="absolute inset-4 sm:inset-5 flex flex-col items-center justify-center rounded-full bg-white text-center">
                  <p className="text-[9px] sm:text-xs font-bold uppercase tracking-wide text-slate-500">
                    Total
                  </p>
                  <p className="text-2xl sm:text-4xl font-black text-slate-900">
                    {performanceTotal.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
              <div className="w-full max-h-[150px] sm:max-h-[170px] space-y-1.5 sm:space-y-2 overflow-y-auto pr-1">
                {vendorPerformance.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-2.5 sm:px-3 py-1.5 sm:py-2"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <span
                        className="inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate">{item.label}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 ml-2 shrink-0">
                      {item.value.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 sm:px-4 py-2.5 sm:py-3">
              <span className="inline-block h-2 w-2 rounded-full bg-orange-500 shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">All Products</h3>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-slate-600">
                {allProducts.length}
              </span>
            </div>
            <div className="border-b border-slate-100 p-2.5 sm:p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 sm:left-3 top-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Search products..."
                  className="h-8 sm:h-9 rounded-lg pl-8 sm:pl-9 text-xs sm:text-sm"
                />
              </div>
            </div>
            <div className="max-h-[220px] sm:max-h-[260px] overflow-auto">
              {filteredProducts.length === 0 ? (
                <p className="px-3 py-6 text-xs sm:text-sm text-slate-500">No products found.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredProducts.map((name, index) => (
                    <li key={`${name}-${index}`} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2">
                      <span className="min-w-4 text-[10px] sm:text-xs font-semibold text-slate-400 shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-slate-700 leading-snug">{name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 sm:px-4 py-2.5 sm:py-3">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">All Vendors</h3>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-slate-600">
                {allVendors.length}
              </span>
            </div>
            <div className="border-b border-slate-100 p-2.5 sm:p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 sm:left-3 top-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={vendorSearch}
                  onChange={(event) => setVendorSearch(event.target.value)}
                  placeholder="Search vendors..."
                  className="h-8 sm:h-9 rounded-lg pl-8 sm:pl-9 text-xs sm:text-sm"
                />
              </div>
            </div>
            <div className="max-h-[220px] sm:max-h-[260px] overflow-auto">
              {filteredVendors.length === 0 ? (
                <p className="px-3 py-6 text-xs sm:text-sm text-slate-500">No vendors found.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredVendors.map((name, index) => (
                    <li key={`${name}-${index}`} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2">
                      <span className="min-w-4 text-[10px] sm:text-xs font-semibold text-slate-400 shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-slate-700 leading-snug">{name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Card Detail Modal ── */}
      {selectedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedCard(null); }}
        >
          <div
            ref={modalRef}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
            style={{ animation: "modalPop 0.22s cubic-bezier(0.34,1.56,0.64,1) both" }}
          >
            {/* Modal header – uses card gradient */}
            <div className={`bg-gradient-to-r ${selectedCard.gradient} px-5 pt-5 pb-6 text-white`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
                    {selectedCard.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/75">Details</p>
                    <h2 className="text-lg font-black leading-tight">{selectedCard.title}</h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCard(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/35 active:scale-90"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="mt-3 text-sm text-white/80">{selectedCard.description}</p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-black leading-none">
                  {selectedCard.value.toLocaleString("en-IN")}
                </span>
                <span className="text-sm font-semibold text-white/70">total</span>
              </div>
            </div>

            {/* Metric rows */}
            <div className="divide-y divide-slate-100 px-5 py-2">
              {selectedCard.details.map((detail) => (
                <div key={detail.label} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium text-slate-600">{detail.label}</span>
                  <span className="text-sm font-black text-slate-900">
                    {typeof detail.value === "number"
                      ? detail.value.toLocaleString("en-IN")
                      : detail.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Go to page link */}
            <div className="px-5 pb-5 pt-3">
              <Link
                to={selectedCard.link}
                onClick={() => setSelectedCard(null)}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${selectedCard.gradient} py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90 active:scale-[0.98]`}
              >
                <ArrowUpRight size={15} />
                Go to {selectedCard.title}
              </Link>
            </div>
          </div>

          <style>{`
            @keyframes modalPop {
              from { opacity: 0; transform: scale(0.88) translateY(16px); }
              to   { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
