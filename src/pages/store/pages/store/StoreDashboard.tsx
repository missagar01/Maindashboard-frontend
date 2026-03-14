// Store Dashboard - Modern UI Version with Modal Integration and Status Tracking
import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth, useStoreDashboard } from "@/context/AuthContext";
import { Navigate } from "react-router";
import {
  ClipboardList, LayoutDashboard, PackageCheck, Truck,
  Warehouse, FileText, TrendingUp, BarChart3, Activity,
  ArrowUpRight, ArrowDownRight, Package, Users, Calendar,
  ArrowRight, RefreshCcw, Search, X, CheckCircle2, Clock, Box, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "../../components/ui/dialog";
import Loading from "./Loading";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

type DashboardApiResponse = {
  success: boolean;
  data: {
    totalIndents: number;
    completedIndents: number;
    pendingIndents: number;
    upcomingIndents: number;
    overdueIndents: number;
    pendingPurchaseOrders: number;
    totalIndentedQuantity: number;
    totalPurchaseOrders: number;
    totalPurchasedQuantity: number;
    totalIssuedQuantity: number;
    outOfStockCount: number;
    overallProgress: number;
    completedPercent: number;
    pendingPercent: number;
    upcomingPercent: number;
    overduePercent: number;
    topPurchasedItems: any[];
    topVendors: any[];
  };
};

type RepairGatePassCounts = {
  success: boolean;
  data: {
    pending: number;
    history: number;
  };
};

type ReturnableStats = {
  success: boolean;
  data: {
    TOTAL_COUNT: number;
    RETURNABLE_COUNT: number;
    NON_RETURNABLE_COUNT: number;
    RETURNABLE_COMPLETED_COUNT: number;
    RETURNABLE_PENDING_COUNT: number;
  };
};

export default function StoreDashboard() {
  const {
    pendingIndents,
    historyIndents,
    poPending,
    poHistory,
    repairPending,
    repairHistory,
    returnableDetails,
    dashboardSummary,
    repairGatePassCounts: backendRepairGatePassCounts,
    returnableStats: backendReturnableStats,
    allVendors,
    allProducts,
    isLoading: loading,
    error: apiError,
    loadDataset,
    loadedDatasets,
  } = useStoreDashboard();
  const { user } = useAuth();

  // Permission Check
  const hasAccess = useMemo(() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const storeAccess = (user.store_access || "")
      .split(",")
      .map(v => v.trim().toUpperCase());
    return storeAccess.includes("DASHBOARD");
  }, [user]);

  const [error, setError] = useState<string | null>(null);

  // Redirect if no access
  if (!loading && !hasAccess) {
    return <Navigate to="/store/erp-indent" replace />;
  }

  // Sync context error to local error if needed
  useEffect(() => {
    if (apiError) setError(apiError);
  }, [apiError]);

  // Modal State
  const MODAL_PAGE_SIZE = 50;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalType, setModalType] = useState("");
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalPage, setModalPage] = useState(1);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(MODAL_PAGE_SIZE);

  // Process Purchaser Performance Data for Chart (Current Month History Only)
  const purchaserChartData = useMemo(() => {
    if (!historyIndents || historyIndents.length === 0) return { series: [], labels: [] };

    // Get Filtered Data (Current Month Only to match dashboard stats)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const filteredIndents = historyIndents.filter(item => {
      // For History, we prioritize using ACKNOWLEDGEDATE or INDENT_DATE
      const dateVal = item.ACKNOWLEDGEDATE || item.acknowledgedate || item.INDENT_DATE || item.indent_date;
      return dateVal && new Date(dateVal) >= monthStart;
    });

    const totals: Record<string, number> = {};
    let unassigned = 0;

    filteredIndents.forEach((item: any) => {
      const purchaser = item.PURCHASER || item.purchaser;

      if (!purchaser || purchaser.trim() === "" || purchaser === "null") {
        unassigned++;
      } else {
        const name = purchaser.trim();
        totals[name] = (totals[name] || 0) + 1;
      }
    });

    const labels = ["Unassigned"];
    const series = [unassigned];

    Object.entries(totals).forEach(([name, count]) => {
      labels.push(name);
      series.push(count);
    });

    return { series, labels, totalCount: filteredIndents.length };
  }, [historyIndents]);

  const donorChartOptions: ApexOptions = {
    labels: purchaserChartData.labels,
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#1e293b'],
    chart: {
      type: 'donut',
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false }
    },
    stroke: { width: 4, colors: ['transparent'] },
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Completed',
              fontSize: '10px',
              fontWeight: 600,
              color: '#64748b',
              formatter: () => (purchaserChartData.totalCount || 0).toString()
            },
            value: {
              fontSize: '22px',
              fontWeight: 800,
              color: '#1e293b',
              offsetY: 4
            }
          }
        }
      }
    },
    dataLabels: {
      enabled: true,
      style: { fontSize: '10px', fontWeight: 'bold' },
      dropShadow: { enabled: false },
      formatter: function (val: number) {
        return val.toFixed(0) + "%"
      }
    },
    legend: {
      show: false,
    },
    tooltip: {
      custom: function ({ series, seriesIndex, w }: any) {
        return `<div style="background: #111827; color: #ffffff; padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);">
          <div style="font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">${w.globals.labels[seriesIndex]}</div>
          <div style="font-size: 14px; font-weight: 900; color: #ffffff;">${series[seriesIndex]} Indents</div>
        </div>`;
      }
    }
  };


  // Helper for current month filtering
  // Helpers for date formatting
  const formatDate = (date: any) => {
    if (!date) return "—";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return "—";
    }
  };

  const getCurrentMonthStart = () => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getDisplayValue = (...values: any[]) => {
    for (const value of values) {
      if (value === 0) return 0;
      if (value == null) continue;

      if (typeof value === "string") {
        const normalized = value.trim();
        if (!normalized || normalized.toLowerCase() === "null") continue;
        return normalized;
      }

      return value;
    }

    return "--";
  };

  const getDisplayDate = (...values: any[]) => {
    const rawValue = getDisplayValue(...values);
    return rawValue === "--" ? "--" : formatDate(rawValue);
  };

  const getModalCardGradient = (type: string) => {
    switch (type) {
      case "totalIndents":
      case "pendingIndents":
        return "from-red-600 via-rose-500 to-orange-500";
      case "totalPurchases":
      case "pendingPOs":
        return "from-emerald-600 via-teal-500 to-cyan-500";
      case "repairPending":
      case "repairHistory":
        return "from-violet-600 via-fuchsia-500 to-purple-500";
      case "returnablePending":
      case "returnableCompleted":
        return "from-amber-500 via-orange-500 to-rose-500";
      default:
        return "from-indigo-600 via-blue-500 to-cyan-500";
    }
  };

  const getStatusTone = (status: any) => {
    const normalizedStatus = String(getDisplayValue(status)).toUpperCase();

    if (normalizedStatus === "COMPLETED") return "success";
    if (normalizedStatus === "PENDING") return "warning";

    return "default";
  };

  const getModalCardData = (type: string, item: any) => {
    switch (type) {
      case "totalIndents":
        return {
          gradient: getModalCardGradient(type),
          title: getDisplayValue(item.indent_no, item.INDENT_NO, item.INDENT_NUMBER),
          subtitle: getDisplayValue(item.item_name, item.ITEM_NAME),
          meta: `Indenter: ${getDisplayValue(item.indenter, item.INDENTER, item.INDENTER_NAME)}`,
          fields: [
            { label: "Date", value: getDisplayDate(item.indent_date, item.INDENT_DATE) },
            { label: "Acknowledge Date", value: getDisplayDate(item.acknowledgedate, item.ACKNOWLEDGEDATE) },
            { label: "Division", value: getDisplayValue(item.division, item.DIVISION) },
            { label: "Department", value: getDisplayValue(item.department, item.DEPARTMENT) },
            { label: "Item Code", value: getDisplayValue(item.item_code, item.ITEM_CODE), tone: "primary" },
            { label: "Qty", value: getDisplayValue(item.qtyindent, item.QTYINDENT, item.REQUIRED_QTY), tone: "primary" },
            { label: "UM", value: getDisplayValue(item.um, item.UM) },
            { label: "Purchaser", value: getDisplayValue(item.purchaser, item.PURCHASER) },
            { label: "PO No", value: getDisplayValue(item.po_no, item.PO_NO), tone: "success" },
            { label: "GRN No", value: getDisplayValue(item.grn_no, item.GRN_NO), tone: "success" },
          ],
        };
      case "pendingIndents":
        return {
          gradient: getModalCardGradient(type),
          title: getDisplayValue(item.INDENT_NUMBER, item.indent_number),
          subtitle: getDisplayValue(item.ITEM_NAME),
          meta: `Indenter: ${getDisplayValue(item.INDENTER_NAME)}`,
          fields: [
            { label: "Planned Date", value: getDisplayDate(item.PLANNEDTIMESTAMP) },
            { label: "Indent Date", value: getDisplayDate(item.INDENT_DATE) },
            { label: "Division", value: getDisplayValue(item.DIVISION) },
            { label: "Department", value: getDisplayValue(item.DEPARTMENT) },
            { label: "Qty", value: getDisplayValue(item.REQUIRED_QTY, item.required_qty), tone: "primary" },
            { label: "UM", value: getDisplayValue(item.UM) },
            { label: "Vendor Type", value: getDisplayValue(item.VENDOR_TYPE, "Pending"), tone: "warning" },
            { label: "Remark", value: getDisplayValue(item.REMARK), fullWidth: true },
            { label: "Specification", value: getDisplayValue(item.SPECIFICATION), fullWidth: true },
          ],
        };
      case "totalPurchases":
      case "pendingPOs":
        return {
          gradient: getModalCardGradient(type),
          title: getDisplayValue(item.VRNO, item.vrno),
          subtitle: getDisplayValue(item.ITEM_NAME),
          meta: `Vendor: ${getDisplayValue(item.VENDOR_NAME)}`,
          fields: [
            { label: "Indent No", value: getDisplayValue(item.INDENT_NO) },
            { label: "Planned Date", value: getDisplayDate(item.PLANNED_TIMESTAMP) },
            { label: "PO Date", value: getDisplayDate(item.VRDATE) },
            { label: "Indenter", value: getDisplayValue(item.INDENTER) },
            { label: "Qty Order", value: getDisplayValue(item.QTYORDER), tone: "primary" },
            { label: "Qty Execute", value: getDisplayValue(item.QTYEXECUTE), tone: "success" },
            { label: "Balance Qty", value: getDisplayValue(item.BALANCE_QTY), tone: "danger" },
            { label: "UM", value: getDisplayValue(item.UM) },
          ],
        };
      case "repairPending":
        return {
          gradient: getModalCardGradient(type),
          title: getDisplayValue(item.vrno, item.VRNO),
          subtitle: getDisplayValue(item.item_name, item.ITEM_NAME),
          meta: `Party: ${getDisplayValue(item.partyname, item.PARTYNAME)}`,
          fields: [
            { label: "Date", value: getDisplayDate(item.vrdate, item.VRDATE) },
            { label: "Department", value: getDisplayValue(item.department, item.DEPARTMENT) },
            { label: "Item Code", value: getDisplayValue(item.item_code, item.ITEM_CODE), tone: "primary" },
            { label: "Qty Issued", value: getDisplayValue(item.qtyissued, item.QTYISSUED), tone: "primary" },
            { label: "UM", value: getDisplayValue(item.um, item.UM) },
            { label: "Remarks", value: getDisplayValue(item.remark, item.REMARK), fullWidth: true },
          ],
        };
      case "repairHistory":
        return {
          gradient: getModalCardGradient(type),
          title: getDisplayValue(item.receive_gate_pass, item.RECEIVE_GATE_PASS),
          subtitle: getDisplayValue(item.item_name, item.ITEM_NAME),
          meta: `Repair Gate Pass: ${getDisplayValue(item.repair_gate_pass, item.REPAIR_GATE_PASS)}`,
          fields: [
            { label: "Received Date", value: getDisplayDate(item.received_date, item.RECEIVED_DATE) },
            { label: "Party Name", value: getDisplayValue(item.partyname, item.PARTYNAME) },
            { label: "Department", value: getDisplayValue(item.department, item.DEPARTMENT) },
            { label: "Item Code", value: getDisplayValue(item.item_code, item.ITEM_CODE), tone: "primary" },
            { label: "Qty Received", value: getDisplayValue(item.qtyrecd, item.QTYRECD, item.qtyreceived, item.QTYRECEIVED), tone: "success" },
            { label: "UM", value: getDisplayValue(item.um, item.UM) },
            { label: "Remarks", value: getDisplayValue(item.remark, item.REMARK), fullWidth: true },
          ],
        };
      case "nonReturnable":
        return {
          gradient: getModalCardGradient(type),
          title: getDisplayValue(item.VRNO, item.vrno),
          subtitle: getDisplayValue(item.ITEM_NAME, item.item_name),
          meta: `Party: ${getDisplayValue(item.PARTY_NAME, item.party_name)}`,
          fields: [
            { label: "Date", value: getDisplayDate(item.VRDATE, item.vrdate) },
            { label: "Item Code", value: getDisplayValue(item.ITEM_CODE, item.item_code), tone: "primary" },
            { label: "Qty Issued", value: getDisplayValue(item.QTYISSUED, item.qtyissued), tone: "primary" },
            { label: "Qty Received", value: getDisplayValue(item.QTYRECEIVED, item.qtyreceived, 0), tone: "success" },
            { label: "Unit", value: getDisplayValue(item.UNIT, item.unit) },
            { label: "Remarks", value: getDisplayValue(item.REMARK, item.remark, "No remarks"), fullWidth: true },
          ],
        };
      default:
        return {
          gradient: getModalCardGradient(type),
          title: getDisplayValue(item.VRNO, item.vrno),
          subtitle: getDisplayValue(item.ITEM_NAME, item.item_name),
          meta: `Party: ${getDisplayValue(item.PARTY_NAME, item.party_name)}`,
          fields: [
            { label: "Date", value: getDisplayDate(item.VRDATE, item.vrdate) },
            { label: "Item Code", value: getDisplayValue(item.ITEM_CODE, item.item_code), tone: "primary" },
            { label: "Qty Issued", value: getDisplayValue(item.QTYISSUED, item.qtyissued), tone: "primary" },
            { label: "Qty Received", value: getDisplayValue(item.QTYRECEIVED, item.qtyreceived, 0), tone: "success" },
            { label: "Unit", value: getDisplayValue(item.UNIT, item.unit) },
            { label: "Status", value: getDisplayValue(item.GATEPASS_STATUS), tone: getStatusTone(item.GATEPASS_STATUS) },
            { label: "Remarks", value: getDisplayValue(item.REMARK, item.remark, "No remarks"), fullWidth: true },
          ],
        };
    }
  };

  const dashboardStats = useMemo(() => {
    const summary = dashboardSummary || {};
    const monthStart = getCurrentMonthStart();
    const filterMonth = (rows: any[]) =>
      (rows || []).filter((item) => {
        const dateVal =
          item.VRDATE ||
          item.vrdate ||
          item.INDENT_DATE ||
          item.indent_date ||
          item.RECEIVED_DATE ||
          item.received_date ||
          item.PLANNEDTIMESTAMP;
        return dateVal && new Date(dateVal) >= monthStart;
      });

    const hasIndentMetrics = loadedDatasets.pendingIndents && loadedDatasets.historyIndents;
    const hasPoMetrics = loadedDatasets.poPending && loadedDatasets.poHistory;
    const hasRepairMetrics = loadedDatasets.repairPending && loadedDatasets.repairHistory;
    const hasReturnableMetrics = loadedDatasets.returnableDetails;

    const curMonthPendingIndents = hasIndentMetrics ? filterMonth(pendingIndents) : [];
    const curMonthHistoryIndents = hasIndentMetrics ? filterMonth(historyIndents) : [];
    const curMonthPoPending = hasPoMetrics ? filterMonth(poPending) : [];
    const curMonthPoHistory = hasPoMetrics ? filterMonth(poHistory) : [];
    const curMonthRepairPending = hasRepairMetrics ? filterMonth(repairPending) : [];
    const curMonthRepairHistory = hasRepairMetrics ? filterMonth(repairHistory) : [];
    const curMonthReturnable = hasReturnableMetrics
      ? (returnableDetails || []).filter((item: any) => new Date(item.VRDATE || item.vrdate) >= monthStart)
      : [];

    const curMonthOverdue = hasIndentMetrics
      ? curMonthPendingIndents.filter((item) => {
          const ts = item.PLANNEDTIMESTAMP || item.plannedtimestamp;
          return ts && new Date(ts) < new Date();
        }).length
      : Number(summary.overdueIndents || 0);

    const completed = hasIndentMetrics
      ? curMonthHistoryIndents.length
      : Number(summary.completedIndents || 0);
    const pending = hasIndentMetrics
      ? curMonthPendingIndents.length
      : Number(summary.pendingIndents || 0);
    const total = hasIndentMetrics
      ? completed + pending
      : Number(summary.totalIndents || 0);

    const completedPercent = hasIndentMetrics
      ? (total > 0 ? (completed / total) * 100 : 0)
      : Number(summary.completedPercent || 0);
    const pendingPercent = hasIndentMetrics
      ? (total > 0 ? (pending / total) * 100 : 0)
      : Number(summary.pendingPercent || 0);
    const overduePercent = hasIndentMetrics
      ? (total > 0 ? (curMonthOverdue / total) * 100 : 0)
      : Number(summary.overduePercent || 0);

    return {
      dashboardData: {
        ...summary,
        totalIndents: total,
        completedIndents: completed,
        pendingIndents: pending,
        upcomingIndents: Number(summary.upcomingIndents || 0),
        overdueIndents: curMonthOverdue,
        totalIndentedQuantity: Number(summary.totalIndentedQuantity || 0),
        totalPurchaseOrders: hasPoMetrics
          ? curMonthPoHistory.length
          : Number(summary.totalPurchaseOrders || 0),
        totalPurchasedQuantity: Number(summary.totalPurchasedQuantity || 0),
        totalIssuedQuantity: Number(summary.totalIssuedQuantity || 0),
        outOfStockCount: Number(summary.outOfStockCount || 0),
        overallProgress: hasIndentMetrics ? completedPercent : Number(summary.overallProgress || 0),
        completedPercent,
        pendingPercent,
        upcomingPercent: Number(summary.upcomingPercent || 0),
        overduePercent,
        pendingPurchaseOrders: hasPoMetrics
          ? curMonthPoPending.length
          : Number(summary.pendingPurchaseOrders || 0),
      },
      repairGatePassCounts: {
        pending: hasRepairMetrics
          ? curMonthRepairPending.length
          : Number(backendRepairGatePassCounts?.pending || 0),
        history: hasRepairMetrics
          ? curMonthRepairHistory.length
          : Number(backendRepairGatePassCounts?.history || 0),
      },
      returnableStats: {
        TOTAL_COUNT: hasReturnableMetrics
          ? curMonthReturnable.length
          : Number(backendReturnableStats?.TOTAL_COUNT || 0),
        RETURNABLE_COUNT: hasReturnableMetrics
          ? curMonthReturnable.filter((i: any) => i.GATEPASS_TYPE === 'RETURNABLE').length
          : Number(backendReturnableStats?.RETURNABLE_COUNT || 0),
        NON_RETURNABLE_COUNT: hasReturnableMetrics
          ? curMonthReturnable.filter((i: any) => i.GATEPASS_TYPE === 'NON RETURANABLE').length
          : Number(backendReturnableStats?.NON_RETURNABLE_COUNT || 0),
        RETURNABLE_COMPLETED_COUNT: hasReturnableMetrics
          ? curMonthReturnable.filter((i: any) => i.GATEPASS_TYPE === 'RETURNABLE' && i.GATEPASS_STATUS === 'COMPLETED').length
          : Number(backendReturnableStats?.RETURNABLE_COMPLETED_COUNT || 0),
        RETURNABLE_PENDING_COUNT: hasReturnableMetrics
          ? curMonthReturnable.filter((i: any) => i.GATEPASS_TYPE === 'RETURNABLE' && i.GATEPASS_STATUS === 'PENDING').length
          : Number(backendReturnableStats?.RETURNABLE_PENDING_COUNT || 0),
      },
    };
  }, [
    dashboardSummary,
    backendRepairGatePassCounts,
    backendReturnableStats,
    loadedDatasets,
    pendingIndents,
    historyIndents,
    poPending,
    poHistory,
    repairPending,
    repairHistory,
    returnableDetails,
  ]);

  const { dashboardData, repairGatePassCounts, returnableStats } = dashboardStats;

  const getModalConfig = (type: string) => {
    switch (type) {
      case 'totalIndents':
        return {
          headers: ["Indent No", "Date", "Indenter", "Division", "Department", "Item Code", "Item Name", "Qty", "UM", "Acknowledge Date", "Purchaser", "PO No", "GRN No"],
          renderRow: (item: any) => (
            <>
              <td className="px-6 py-4 font-mono font-bold text-indigo-700">{item.indent_no || item.INDENT_NO || item.INDENT_NUMBER || "—"}</td>
              <td className="px-6 py-4 text-sm whitespace-nowrap font-medium text-slate-900">{formatDate(item.indent_date || item.INDENT_DATE)}</td>
              <td className="px-6 py-4 text-sm font-semibold text-slate-800">{item.indenter || item.INDENTER || item.INDENTER_NAME || "—"}</td>
              <td className="px-6 py-4 text-sm font-medium text-slate-700">{item.division || item.DIVISION || "—"}</td>
              <td className="px-6 py-4 text-sm font-medium text-slate-800">{item.department || item.DEPARTMENT || "—"}</td>
              <td className="px-6 py-4 text-xs font-mono font-bold text-slate-700">{item.item_code || item.ITEM_CODE || "—"}</td>
              <td className="px-6 py-4 text-sm font-extrabold text-slate-900">{item.item_name || item.ITEM_NAME || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-indigo-900">{item.qtyindent || item.QTYINDENT || item.REQUIRED_QTY || "—"}</td>
              <td className="px-6 py-4 text-center text-[11px] uppercase font-black text-slate-600">{item.um || item.UM || "—"}</td>
              <td className="px-6 py-4 text-sm font-medium text-slate-800">{formatDate(item.acknowledgedate || item.ACKNOWLEDGEDATE)}</td>
              <td className="px-6 py-4 text-sm font-semibold text-slate-700">{item.purchaser || item.PURCHASER || "—"}</td>
              <td className="px-6 py-4 text-indigo-700 font-black">{item.po_no || item.PO_NO || "—"}</td>
              <td className="px-6 py-4 text-emerald-700 font-black">{item.grn_no || item.GRN_NO || "—"}</td>
            </>
          )
        };
      case 'pendingIndents':
        return {
          headers: ["Indent No", "Planned Date", "Indent Date", "Indenter", "Division", "Department", "Item Name", "Qty", "UM", "Remark", "Specification", "Vendor Type"],
          renderRow: (item: any) => (
            <>
              <td className="px-6 py-4 font-mono font-bold text-indigo-700">{item.INDENT_NUMBER || item.indent_number || "—"}</td>
              <td className="px-6 py-4 text-sm font-medium text-slate-900">{formatDate(item.PLANNEDTIMESTAMP)}</td>
              <td className="px-6 py-4 text-sm font-semibold text-slate-800">{formatDate(item.INDENT_DATE)}</td>
              <td className="px-6 py-4 text-sm font-bold text-slate-900">{item.INDENTER_NAME || "—"}</td>
              <td className="px-6 py-4 text-sm font-medium text-slate-700">{item.DIVISION || "—"}</td>
              <td className="px-6 py-4 text-sm font-semibold text-slate-800">{item.DEPARTMENT || "—"}</td>
              <td className="px-6 py-4 text-sm font-extrabold text-slate-900">{item.ITEM_NAME || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-indigo-900">{item.REQUIRED_QTY || item.required_qty || "—"}</td>
              <td className="px-6 py-4 text-center text-[11px] uppercase font-black text-slate-600">{item.UM || "—"}</td>
              <td className="px-6 py-4 text-[12px] text-slate-800 font-medium italic max-w-[200px] truncate">{item.REMARK || "—"}</td>
              <td className="px-6 py-4 text-[12px] text-slate-700 font-medium max-w-[200px] truncate">{item.SPECIFICATION || "—"}</td>
              <td className="px-6 py-4 text-sm font-black text-amber-700">{item.VENDOR_TYPE || "Pending"}</td>
            </>
          )
        };
      case 'totalPurchases':
      case 'pendingPOs':
        return {
          headers: ["Indent No", "PO No", "Planned Date", "PO Date", "Vendor Name", "Indenter", "Item Name", "Qty Order", "Qty Execute", "Balance Qty", "UM"],
          renderRow: (item: any) => (
            <>
              <td className="px-6 py-4 font-mono font-bold text-slate-700">{item.INDENT_NO || "—"}</td>
              <td className="px-6 py-4 font-mono font-black text-indigo-700">{item.VRNO || item.vrno || "—"}</td>
              <td className="px-6 py-4 text-sm font-medium text-slate-900">{formatDate(item.PLANNED_TIMESTAMP)}</td>
              <td className="px-6 py-4 text-sm font-semibold text-slate-800">{formatDate(item.VRDATE)}</td>
              <td className="px-6 py-4 text-sm font-black text-slate-900">{item.VENDOR_NAME || "—"}</td>
              <td className="px-6 py-4 text-sm font-bold text-slate-800 truncate">{item.INDENTER || "—"}</td>
              <td className="px-6 py-4 text-sm font-extrabold text-slate-900">{item.ITEM_NAME || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-slate-900">{item.QTYORDER || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-emerald-700">{item.QTYEXECUTE || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-rose-700">{item.BALANCE_QTY || "—"}</td>
              <td className="px-6 py-4 text-center text-[11px] font-black text-slate-600 uppercase">{item.UM || "—"}</td>
            </>
          )
        };
      case 'repairPending':
        return {
          headers: ["Gate Pass No", "Date", "Party Name", "Department", "Item Code", "Item Name", "Qty Issued", "UM", "Remarks"],
          renderRow: (item: any) => (
            <>
              <td className="px-6 py-4 font-mono font-bold text-indigo-700">{item.vrno || item.VRNO || "—"}</td>
              <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatDate(item.vrdate || item.VRDATE)}</td>
              <td className="px-6 py-4 text-sm font-black text-slate-900">{item.partyname || item.PARTYNAME || "—"}</td>
              <td className="px-6 py-4 text-sm font-semibold text-slate-800">{item.department || item.DEPARTMENT || "—"}</td>
              <td className="px-6 py-4 text-xs font-mono font-bold text-slate-700">{item.item_code || item.ITEM_CODE || "—"}</td>
              <td className="px-6 py-4 text-sm font-extrabold text-slate-900 truncate max-w-[200px]">{item.item_name || item.ITEM_NAME || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-indigo-900">{item.qtyissued || item.QTYISSUED || "—"}</td>
              <td className="px-6 py-4 text-center text-[11px] font-black text-slate-600 uppercase">{item.um || item.UM || "—"}</td>
              <td className="px-6 py-4 text-[12px] text-slate-800 font-medium italic truncate max-w-[150px]">{item.remark || item.REMARK || "—"}</td>
            </>
          )
        };
      case 'repairHistory':
        return {
          headers: ["Repair Gate Pass", "Receive Gate Pass", "Received Date", "Party Name", "Department", "Item Code", "Item Name", "Qty Received", "UM", "Remarks"],
          renderRow: (item: any) => (
            <>
              <td className="px-6 py-4 font-mono font-bold text-slate-700">{item.repair_gate_pass || item.REPAIR_GATE_PASS || "—"}</td>
              <td className="px-6 py-4 font-mono font-black text-indigo-700">{item.receive_gate_pass || item.RECEIVE_GATE_PASS || "—"}</td>
              <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatDate(item.received_date || item.RECEIVED_DATE)}</td>
              <td className="px-6 py-4 text-sm font-black text-slate-900">{item.partyname || item.PARTYNAME || "—"}</td>
              <td className="px-6 py-4 text-sm font-semibold text-slate-800">{item.department || item.DEPARTMENT || "—"}</td>
              <td className="px-6 py-4 text-xs font-mono font-bold text-slate-700">{item.item_code || item.ITEM_CODE || "—"}</td>
              <td className="px-6 py-4 text-sm font-extrabold text-slate-900 truncate max-w-[200px]">{item.item_name || item.ITEM_NAME || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-indigo-900">{item.qtyrecd || item.QTYRECD || item.qtyreceived || item.QTYRECEIVED || "—"}</td>
              <td className="px-6 py-4 text-center text-[11px] font-black text-slate-600 uppercase">{item.um || item.UM || "—"}</td>
              <td className="px-6 py-4 text-[12px] text-slate-800 font-medium italic truncate max-w-[150px]">{item.remark || item.REMARK || "—"}</td>
            </>
          )
        };
      case 'nonReturnable':
        return {
          headers: ["Date", "VR No", "Party Name", "Item Code", "Item Name", "Qty Issued", "Qty Received", "Unit", "Remarks"],
          renderRow: (item: any) => (
            <>
              <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatDate(item.VRDATE || item.vrdate)}</td>
              <td className="px-6 py-4 font-mono font-black text-indigo-700">{item.VRNO || item.vrno || "—"}</td>
              <td className="px-6 py-4 text-sm font-black text-slate-900">{item.PARTY_NAME || item.party_name || "—"}</td>
              <td className="px-6 py-4 text-xs font-mono font-bold text-slate-700">{item.ITEM_CODE || item.item_code || "—"}</td>
              <td className="px-6 py-4 text-sm font-extrabold text-slate-900 truncate max-w-[200px]">{item.ITEM_NAME || item.item_name || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-slate-950">{item.QTYISSUED || item.qtyissued || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-emerald-700">{item.QTYRECEIVED || item.qtyreceived || 0}</td>
              <td className="px-6 py-4 text-center text-[11px] font-black text-slate-600 uppercase">{item.UNIT || item.unit || "—"}</td>
              <td className="px-6 py-4 text-[12px] text-slate-800 font-medium italic truncate max-w-[150px]">{item.REMARK || item.remark || "No remarks"}</td>
            </>
          )
        };
      default: // Returnable types (returnableTotal, returnablePending, returnableCompleted)
        return {
          headers: ["Date", "VR No", "Party Name", "Item Code", "Item Name", "Qty Issued", "Qty Received", "Unit", "Status", "Remarks"],
          renderRow: (item: any) => (
            <>
              <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatDate(item.VRDATE || item.vrdate)}</td>
              <td className="px-6 py-4 font-mono font-black text-indigo-700">{item.VRNO || item.vrno || "—"}</td>
              <td className="px-6 py-4 text-sm font-black text-slate-900">{item.PARTY_NAME || item.party_name || "—"}</td>
              <td className="px-6 py-4 text-xs font-mono font-bold text-slate-700">{item.ITEM_CODE || item.item_code || "—"}</td>
              <td className="px-6 py-4 text-sm font-extrabold text-slate-900 truncate max-w-[200px]">{item.ITEM_NAME || item.item_name || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-slate-950">{item.QTYISSUED || item.qtyissued || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-emerald-700">{item.QTYRECEIVED || item.qtyreceived || 0}</td>
              <td className="px-6 py-4 text-center text-[11px] font-black text-slate-600 uppercase">{item.UNIT || item.unit || "—"}</td>
              <td className="px-6 py-4 text-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight uppercase ring-1 ${item.GATEPASS_STATUS === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-900 ring-emerald-300' : 'bg-amber-100 text-amber-900 ring-amber-300'}`}>
                  {item.GATEPASS_STATUS || "—"}
                </span>
              </td>
              <td className="px-6 py-4 text-[12px] text-slate-800 font-medium italic truncate max-w-[150px]">{item.REMARK || item.remark || "No remarks"}</td>
            </>
          )
        };
    }
  };

  const openModal = async (type: string, title: string) => {
    setModalTitle(title);
    setModalType(type);
    setIsModalOpen(true);
    setModalLoading(true);
    setModalData([]);
    setModalSearch("");
    setModalPage(1);

    try {
      let rows: any[] = [];
      switch (type) {
        case 'totalIndents':
          rows = await loadDataset('historyIndents');
          break;
        case 'pendingIndents':
          rows = await loadDataset('pendingIndents');
          break;
        case 'totalPurchases':
          rows = await loadDataset('poHistory');
          break;
        case 'pendingPOs':
          rows = await loadDataset('poPending');
          break;
        case 'repairPending':
          rows = await loadDataset('repairPending');
          break;
        case 'repairHistory':
          rows = await loadDataset('repairHistory');
          break;
        case 'returnableTotal': {
          const details = await loadDataset('returnableDetails');
          rows = details.filter((i: any) => i.GATEPASS_TYPE === 'RETURNABLE');
          break;
        }
        case 'returnablePending': {
          const details = await loadDataset('returnableDetails');
          rows = details.filter((i: any) => i.GATEPASS_TYPE === 'RETURNABLE' && i.GATEPASS_STATUS === 'PENDING');
          break;
        }
        case 'returnableCompleted': {
          const details = await loadDataset('returnableDetails');
          rows = details.filter((i: any) => i.GATEPASS_TYPE === 'RETURNABLE' && i.GATEPASS_STATUS === 'COMPLETED');
          break;
        }
        case 'nonReturnable': {
          const details = await loadDataset('returnableDetails');
          rows = details.filter((i: any) => i.GATEPASS_TYPE === 'NON RETURANABLE');
          break;
        }
      }

      // Filter by current month start
      const monthStart = getCurrentMonthStart();
      const filteredByMonth = rows.filter((item: any) => {
        const dateVal = item.VRDATE || item.vrdate || item.INDENT_DATE || item.indent_date || item.RECEIVED_DATE || item.received_date || item.date || item.PLANNEDTIMESTAMP;
        if (!dateVal) return true; // Keep if no date found
        return new Date(dateVal) >= monthStart;
      });

      setModalData(filteredByMonth);
    } catch (err) {
      console.error(`Failed to filter ${type} details:`, err);
    } finally {
      setModalLoading(false);
    }
  };

  const cards = [
    {
      title: 'Total Indents',
      icon: <ClipboardList size={20} />,
      value: dashboardData?.totalIndents ?? '—',
      // sublabel: 'Indented Quantity',
      // subvalue: dashboardData?.totalIndentedQuantity?.toLocaleString() ?? '—',
      bgGradient: 'from-red-500 to-red-600',
      shadowColor: 'shadow-red-200 dark:shadow-red-900/20',
      iconBg: 'bg-white/20',
      type: 'totalIndents'
    },
    {
      title: 'Pending Indents',
      icon: <PackageCheck size={20} />,
      value: dashboardData?.pendingIndents ?? '—',
      // sublabel: 'Indents Waiting',
      // subvalue: dashboardData?.pendingIndents?.toLocaleString() ?? '—',
      bgGradient: 'from-red-400 to-red-500',
      shadowColor: 'shadow-red-200 dark:shadow-red-900/20',
      iconBg: 'bg-white/20',
      type: 'pendingIndents'
    },
    {
      title: 'Total Purchases',
      icon: <Truck size={20} />,
      value: dashboardData?.totalPurchaseOrders ?? '—',
      // sublabel: 'Purchased Quantity',
      // subvalue: dashboardData?.totalPurchasedQuantity?.toLocaleString() ?? '—',
      bgGradient: 'from-emerald-600 to-teal-700',
      shadowColor: 'shadow-emerald-200 dark:shadow-emerald-900/20',
      iconBg: 'bg-white/20',
      type: 'totalPurchases'
    },
    {
      title: 'Pending PO',
      icon: <FileText size={20} />,
      value: dashboardData?.pendingPurchaseOrders ?? '—',
      // sublabel: 'POs Waiting',
      // subvalue: dashboardData?.pendingPurchaseOrders?.toLocaleString() ?? '—',
      bgGradient: 'from-emerald-500 to-teal-600',
      shadowColor: 'shadow-emerald-200 dark:shadow-emerald-900/20',
      iconBg: 'bg-white/20',
      type: 'pendingPOs'
    },
    {
      title: 'Repair Pending',
      icon: <Activity size={20} />,
      value: repairGatePassCounts.pending ?? '—',
      // sublabel: 'Gate Pass Pending',
      // subvalue: repairGatePassCounts.pending?.toLocaleString() ?? '—',
      bgGradient: 'from-violet-500 to-purple-600',
      shadowColor: 'shadow-purple-200 dark:shadow-purple-900/20',
      iconBg: 'bg-white/20',
      type: 'repairPending'
    },
    {
      title: 'Repair History',
      icon: <FileText size={20} />,
      value: repairGatePassCounts.history ?? '—',
      // sublabel: 'Gate Pass Received',
      // subvalue: repairGatePassCounts.history?.toLocaleString() ?? '—',
      bgGradient: 'from-violet-400 to-purple-500',
      shadowColor: 'shadow-purple-200 dark:shadow-purple-900/20',
      iconBg: 'bg-white/20',
      type: 'repairHistory'
    },
    {
      title: 'Total Returnable',
      icon: <RefreshCcw size={20} />,
      value: returnableStats.RETURNABLE_COUNT ?? '—',
      // sublabel: 'Total GP R3',
      // subvalue: returnableStats.RETURNABLE_COUNT?.toLocaleString() ?? '—',
      bgGradient: 'from-indigo-600 to-blue-700',
      shadowColor: 'shadow-indigo-200 dark:shadow-indigo-900/20',
      iconBg: 'bg-white/20',
      type: 'returnableTotal'
    },
    {
      title: 'Non Returnable',
      icon: <Box size={20} />,
      value: returnableStats.NON_RETURNABLE_COUNT ?? '—',
      // sublabel: 'Gate Pass N3',
      // subvalue: returnableStats.NON_RETURNABLE_COUNT?.toLocaleString() ?? '—',
      bgGradient: 'from-indigo-500 to-blue-600',
      shadowColor: 'shadow-indigo-200 dark:shadow-indigo-900/20',
      iconBg: 'bg-white/20',
      type: 'nonReturnable'
    },
    {
      title: 'Returnable Pending',
      icon: <Clock size={20} />,
      value: returnableStats.RETURNABLE_PENDING_COUNT ?? '—',
      // sublabel: 'GP Pending R3',
      // subvalue: returnableStats.RETURNABLE_PENDING_COUNT?.toLocaleString() ?? '—',
      bgGradient: 'from-amber-500 to-orange-600',
      shadowColor: 'shadow-orange-200 dark:shadow-orange-900/20',
      iconBg: 'bg-white/20',
      type: 'returnablePending'
    },
    {
      title: 'Returnable Completed',
      icon: <CheckCircle2 size={20} />,
      value: returnableStats.RETURNABLE_COMPLETED_COUNT ?? '—',
      // sublabel: 'GP Completed R3',
      // subvalue: returnableStats.RETURNABLE_COMPLETED_COUNT?.toLocaleString() ?? '—',
      bgGradient: 'from-amber-400 to-orange-500',
      shadowColor: 'shadow-orange-200 dark:shadow-orange-900/20',
      iconBg: 'bg-white/20',
      type: 'returnableCompleted'
    },

  ];

  useEffect(() => {
    setModalPage(1);
    setMobileVisibleCount(MODAL_PAGE_SIZE);
  }, [modalSearch, modalData, modalType]);

  const filteredModalRows = useMemo(() => {
    let data = modalData;
    if (modalSearch) {
      const lowerSearch = modalSearch.toLowerCase();
      data = modalData.filter((item: any) => {
        return Object.entries(item).some(([key, val]) => {
          if (val == null) return false;
          const strVal = val.toString().toLowerCase();
          if (strVal.includes(lowerSearch)) return true;

          // Date-aware search: check formatted string (DD/MM/YYYY)
          const k = key.toLowerCase();
          if (k.includes('date') || k.includes('timestamp')) {
            const formatted = formatDate(val);
            if (formatted !== "—" && formatted.toLowerCase().includes(lowerSearch)) return true;
          }
          return false;
        });
      });
    }

    return data;
  }, [modalData, modalSearch]);

  const filteredModalData = useMemo(() => {
    const total = filteredModalRows.length;
    const totalPages = Math.max(1, Math.ceil(total / MODAL_PAGE_SIZE));
    const currentPage = Math.min(modalPage, totalPages);
    const start = (currentPage - 1) * MODAL_PAGE_SIZE;
    const paginated = filteredModalRows.slice(start, start + MODAL_PAGE_SIZE);

    return { total, totalPages, currentPage, data: paginated };
  }, [filteredModalRows, modalPage]);

  const mobileModalData = useMemo(() => {
    return {
      total: filteredModalRows.length,
      data: filteredModalRows.slice(0, mobileVisibleCount),
    };
  }, [filteredModalRows, mobileVisibleCount]);

  const handleMobileModalScroll = (e: any) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    if (scrollHeight - scrollTop <= clientHeight + 48 && mobileVisibleCount < filteredModalRows.length) {
      setMobileVisibleCount((prev) => Math.min(prev + MODAL_PAGE_SIZE, filteredModalRows.length));
    }
  };

  const modalConfig = useMemo(() => getModalConfig(modalType), [modalType]);

  if (loading) {
    return (
      <Loading
        heading="Store Dashboard"
        subtext="Loading dashboard insights"
        icon={<LayoutDashboard size={48} className="text-red-600" />}
      />
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm flex flex-col items-center justify-center h-64">
          <p className="text-lg font-semibold mb-2">Error loading dashboard</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-8 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-red-600 shadow-xl shadow-red-200 dark:shadow-red-900/20 transform hover:scale-105 transition-transform duration-300">
            <LayoutDashboard size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Store Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Live overview of Store &amp; Purchase
            </p>
          </div>
        </div>
      </div>

      {/* Hero Metrics Cards - Updated Grid to 5 columns on large screens */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={() => openModal(card.type, card.title)}
            className={`group text-left relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br ${card.bgGradient} p-4 sm:p-6 shadow-lg ${card.shadowColor} hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer block w-full border-0 outline-none focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800`}
          >
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-1/4 -translate-y-1/4 scale-150 pointer-events-none">
              {card.icon}
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl sm:rounded-2xl ${card.iconBg} backdrop-blur-sm`}>
                  {card.icon}
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold bg-white/20 backdrop-blur-md px-2 py-1 rounded-full text-white/90">
                  <ArrowUpRight size={14} />
                  <span>View</span>
                </div>
              </div>

              <div>
                <p className="text-white/80 font-medium text-[14px] sm:text-xs tracking-wide uppercase truncate">{card.title}</p>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mt-1 mb-3 truncate">{card.value}</h3>

                {/* <div className="flex items-center justify-between border-t border-white/20 pt-3 mt-1">
                  <p className="text-white/70 text-[9px] font-medium truncate uppercase">{card.sublabel}</p>
                  <p className="text-white font-bold text-xs sm:text-sm truncate">{card.subvalue}</p>
                </div> */}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-3xl border-0 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden h-full">
          <CardHeader className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <TrendingUp size={20} />
              </div>
              <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">Overall Progress</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center justify-center gap-12">
              <div className="relative w-48 h-48 flex-shrink-0">
                <svg className="transform -rotate-90 w-full h-full drop-shadow-lg">
                  <circle cx="50%" cy="50%" r="80" stroke="currentColor" strokeWidth="28" fill="none" className="text-slate-100 dark:text-slate-800" />
                  <circle cx="50%" cy="50%" r="80" stroke="currentColor" strokeWidth="28" fill="none"
                    strokeDasharray={`${(dashboardData?.upcomingPercent || 0) * 5.02} 502`}
                    strokeDashoffset={`-${((dashboardData?.completedPercent || 0) + (dashboardData?.pendingPercent || 0)) * 5.02}`}
                    className="text-slate-300 dark:text-slate-600" />
                  <circle cx="50%" cy="50%" r="80" stroke="currentColor" strokeWidth="28" fill="none"
                    strokeDasharray={`${(dashboardData?.pendingPercent || 0) * 5.02} 502`}
                    strokeDashoffset={`-${(dashboardData?.completedPercent || 0) * 5.02}`}
                    className="text-amber-400" />
                  <circle cx="50%" cy="50%" r="80" stroke="currentColor" strokeWidth="28" fill="none"
                    strokeDasharray={`${(dashboardData?.completedPercent || 0) * 5.02} 502`}
                    className="text-emerald-500" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                    {dashboardData?.overallProgress?.toFixed(0) ?? 0}%
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Completed</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 w-full">
                {[
                  { label: "Completed", color: "bg-emerald-500", value: dashboardData?.completedIndents },
                  { label: "Pending", color: "bg-amber-400", value: dashboardData?.pendingIndents },
                  { label: "Overdue", color: "bg-rose-500", value: dashboardData?.overdueIndents },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{item.label}</span>
                    </div>
                    <span className="text-base font-bold text-slate-900 dark:text-white">{item.value?.toLocaleString() ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 h-full">
          <CardHeader className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <BarChart3 size={20} />
              </div>
              <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">Performance Indicators</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center justify-center gap-12">
              <div className="relative w-48 h-48 flex-shrink-0">
                {purchaserChartData.series.length > 0 ? (
                  <Chart
                    options={donorChartOptions}
                    series={purchaserChartData.series}
                    type="donut"
                    height={220}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
                    <BarChart3 size={48} className="mb-2" />
                    <p className="text-xs font-bold">No data</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {purchaserChartData.labels.map((label: string, index: number) => (
                  <div key={label} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: donorChartOptions.colors?.[index % (donorChartOptions.colors?.length || 1)] as string }}
                      />
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 leading-tight">{label}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{purchaserChartData.series[index]}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <TopListCard title="All Products" data={allProducts} type="product" />
        <TopListCard title="All Vendors" data={allVendors} type="vendor" />
      </div>

      {/* Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent aria-describedby={undefined} className="top-[calc(50%+2.5rem)] h-[calc(100dvh-6.5rem)] max-h-[calc(100dvh-6.5rem)] w-[96vw] overflow-hidden rounded-[28px] border-0 p-0 shadow-2xl [&>button]:hidden md:top-[50%] md:h-[88vh] md:w-[90vw] md:max-h-[88vh] lg:left-auto lg:right-10 lg:h-[92vh] lg:w-[75vw] lg:max-w-none lg:translate-x-0">
          <DialogHeader className="shrink-0 bg-indigo-600 px-3 py-3 text-white md:p-6">
            <div className="flex items-center gap-2.5 md:gap-4">
              <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
                <div className="rounded-xl bg-white/20 p-2">
                  <LayoutDashboard size={24} />
                </div>
                <DialogTitle className="truncate text-base font-bold md:text-2xl">{modalTitle}</DialogTitle>
                <DialogDescription className="sr-only">
                  Detailed view of {modalTitle} data and records.
                </DialogDescription>
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-2 md:max-w-md md:gap-3">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={16} />
                  <input
                    type="text"
                    placeholder="Search all columns..."
                    className="w-full rounded-xl border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-xs text-white placeholder:text-white/50 outline-none transition-all focus:bg-white/20 focus:border-white/40 md:py-2 md:pl-10 md:pr-4 md:text-sm"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                  />
                </div>
                <DialogClose className="shrink-0 rounded-full p-2 outline-none transition-colors hover:bg-white/20">
                  <X size={18} />
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-0 bg-white dark:bg-slate-900">
            {modalLoading ? (
              <div className="flex flex-col items-center justify-center p-32 space-y-4">
                <RefreshCcw className="animate-spin text-indigo-600" size={48} />
                <p className="text-slate-500 font-medium animate-pulse">Fetching detailed data...</p>
              </div>
            ) : filteredModalData.data.length > 0 ? (
              <div className="flex h-full flex-col">
                <div className="flex-1 overflow-auto md:hidden" onScroll={handleMobileModalScroll}>
                  <div className="space-y-2 bg-slate-100/70 px-2 pb-2 pt-1.5 dark:bg-slate-950/50">
                    {mobileModalData.data.map((item: any, idx: number) => {
                      const cardData = getModalCardData(modalType, item);

                      return (
                        <ModalDetailCard
                          key={`${modalType}-${idx}`}
                          index={idx}
                          recordLabel={modalTitle}
                          {...cardData}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="hidden flex-1 overflow-auto md:block">
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 backdrop-blur-md shadow-sm z-10">
                      <tr className="text-[12px] font-black uppercase text-slate-900 dark:text-slate-100 tracking-widest">
                        {modalConfig?.headers?.map((h: string) => (
                          <th key={h} className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredModalData.data.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-indigo-950/20 transition-colors group">
                          {modalConfig?.renderRow(item)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Stats in Modal */}
                <div className="hidden shrink-0 border-t bg-slate-50 p-4 dark:bg-slate-900 md:block">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] font-semibold text-slate-500 sm:text-xs">
                    Showing <span className="text-indigo-600">{Math.min(filteredModalData.total, (filteredModalData.currentPage - 1) * MODAL_PAGE_SIZE + 1)}</span> to <span className="text-indigo-600">{Math.min(filteredModalData.total, filteredModalData.currentPage * MODAL_PAGE_SIZE)}</span> of <span className="text-indigo-600">{filteredModalData.total}</span> items
                    </p>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <button
                        onClick={() => setModalPage(p => Math.max(1, p - 1))}
                        disabled={filteredModalData.currentPage === 1}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold transition-all hover:bg-white disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800 sm:text-xs"
                      >
                        Prev
                      </button>
                      <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:text-xs">
                        Page {filteredModalData.currentPage} of {filteredModalData.totalPages || 1}
                      </span>
                      <button
                        onClick={() => setModalPage(p => Math.min(filteredModalData.totalPages, p + 1))}
                        disabled={filteredModalData.currentPage >= filteredModalData.totalPages}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold transition-all hover:bg-white disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800 sm:text-xs"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-32 space-y-4 opacity-50">
                <Box size={64} className="text-slate-200" />
                <p className="text-lg font-bold text-slate-400">No data available for this category</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiItem({ label, value, color, icon }: any) {
  return (
    <div className="space-y-4 p-5 rounded-3xl bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-gradient-to-br ${color} text-white shadow-sm`}>
            {icon}
          </div>
          <span className="font-bold text-base text-slate-800 dark:text-slate-200 tracking-tight">{label}</span>
        </div>
        <span className={`text-3xl font-black bg-gradient-to-r ${color} bg-clip-text text-transparent`}>{value}%</span>
      </div>
      <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
        <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000 ease-out shadow-lg shadow-white/10`} style={{ width: `${Math.min(value, 100)}%` }}></div>
      </div>
    </div>
  );
}

function getModalFieldValueClasses(tone?: string) {
  switch (tone) {
    case "primary":
      return "text-indigo-700 dark:text-indigo-300";
    case "success":
      return "text-emerald-700 dark:text-emerald-300";
    case "warning":
      return "text-amber-700 dark:text-amber-300";
    case "danger":
      return "text-rose-700 dark:text-rose-300";
    default:
      return "text-slate-900 dark:text-slate-100";
  }
}

function ModalDetailCard({ recordLabel, index, gradient, title, subtitle, meta, fields }: any) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-white/60 bg-white shadow-md shadow-slate-200/70 ring-1 ring-slate-200/70 dark:border-slate-800 dark:bg-slate-950 dark:shadow-slate-950/50 dark:ring-slate-800/80">
      <div className={`bg-gradient-to-br ${gradient} px-3 py-2.5 text-white`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70 sm:text-[11px]">
              {recordLabel} #{index + 1}
            </p>
            <h3 className="mt-1 break-words text-[15px] font-black leading-tight sm:text-lg">
              {title}
            </h3>
            {subtitle && subtitle !== "--" ? (
              <p className="mt-0.5 break-words text-[11px] font-medium leading-snug text-white/90 sm:text-sm">
                {subtitle}
              </p>
            ) : null}
            {meta && meta !== "--" ? (
              <p className="mt-1 break-words text-[10px] font-semibold text-white/75 sm:text-xs">
                {meta}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
            View
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-2.5 dark:bg-slate-950">
        {fields.map((field: any, fieldIndex: number) => (
          <div
            key={`${field.label}-${fieldIndex}`}
            className={`min-w-0 border-b border-slate-200/80 pb-1.5 dark:border-slate-800/80 ${field.fullWidth ? "col-span-2" : ""}`}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {field.label}
            </p>
            <div className={`mt-0.5 break-words text-[12px] font-bold leading-snug ${getModalFieldValueClasses(field.tone)}`}>
              {field.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopListCard({ title, data, type }: any) {
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(50);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((item: any) =>
      (item.itemName || item.vendorName || "").toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  // Reset limit when search changes
  useEffect(() => {
    setVisibleLimit(50);
  }, [searchTerm]);

  const displayedData = useMemo(() => {
    return filteredData.slice(0, visibleLimit);
  }, [filteredData, visibleLimit]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Load more when 20px from bottom
    if (scrollHeight - scrollTop <= clientHeight + 20) {
      if (visibleLimit < filteredData.length) {
        setVisibleLimit(prev => prev + 50);
      }
    }
  };

  return (
    <Card className="rounded-xl border-0 bg-white dark:bg-slate-900 shadow-md overflow-hidden flex flex-col h-[500px]">
      <CardHeader className="bg-slate-50/80 dark:bg-slate-800/80 border-b">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${type === 'product' ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
          <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            {title}
            <span className="text-[11px] text-slate-700 font-bold bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">
              {data?.length || 0}
            </span>
          </CardTitle>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={14} />
          <input
            type="text"
            placeholder={`Search ${title}...`}
            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent
        className="p-0 overflow-y-auto flex-1"
        onScroll={handleScroll}
        ref={scrollContainerRef}
      >
        {displayedData && displayedData.length > 0 ? (
          <>
            {displayedData.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center px-4 py-3 border-b border-slate-50 dark:border-slate-800/30 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="w-6 text-[11px] font-bold flex items-center justify-center mr-3 text-slate-400 shrink-0">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold uppercase text-slate-700 dark:text-slate-200 leading-normal break-words">{item.itemName || item.vendorName}</p>
                </div>
              </div>
            ))}
            {visibleLimit < filteredData.length && (
              <div className="p-2 text-center text-[9px] text-slate-400 font-medium italic animate-pulse">
                Scrolling to load more...
              </div>
            )}
            {searchTerm && filteredData.length === 0 && (
              <div className="p-8 text-center text-[10px] text-slate-400 font-medium">
                No matches found in {data?.length || 0} records
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-200 dark:text-slate-800 p-6 text-center">
            <Package size={32} className="mb-1 opacity-10" />
            <p className="text-[9px] font-medium">{searchTerm ? "No match found" : "No data available"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
