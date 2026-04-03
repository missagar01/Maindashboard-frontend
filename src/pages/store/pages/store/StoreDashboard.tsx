// Store Dashboard - Modern UI Version with Modal Integration and Status Tracking
// Direct API calls — no AuthContext store dependency
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useAuth } from "../../../../context/AuthContext";
import { storeApi } from "@/api/store/storeSystemApi";
import { Navigate } from "react-router";
import {
  ClipboardList, LayoutDashboard, PackageCheck, Truck,
  Warehouse, FileText, TrendingUp, BarChart3, Activity,
  ArrowUpRight, ArrowDownRight, Package, Users, Calendar,
  ArrowRight, RefreshCcw, Search, X, CheckCircle2, Clock, Box, ChevronRight, Rows3, Sparkles, Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "../../components/ui/dialog";
import Loading from "./Loading";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";



const normalizeVendorList = (rows: any[]): { vendorName: string }[] => {
  const seen = new Set<string>();
  const list: { vendorName: string }[] = [];
  rows.forEach((row) => {
    const raw = row?.vendorName || row?.VENDOR_NAME || row?.vendor_name || row?.ACC_NAME || row?.acc_name || '';
    const name = String(raw).trim();
    if (!name) return;
    const key = name.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ vendorName: name });
  });
  return list.sort((a, b) => a.vendorName.localeCompare(b.vendorName));
};

const normalizeProductList = (rows: any[]): { itemName: string }[] => {
  const seen = new Set<string>();
  const list: { itemName: string }[] = [];
  rows.forEach((row) => {
    const raw = row?.itemName || row?.PRODUCT_NAME || row?.product_name || row?.ITEM_NAME || row?.item_name || '';
    const name = String(raw).trim();
    if (!name) return;
    const key = name.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ itemName: name });
  });
  return list.sort((a, b) => a.itemName.localeCompare(b.itemName));
};


// ── Component ────────────────────────────────────────────────────────────────


export default function StoreDashboard() {
  const { user } = useAuth();
  const MODAL_PAGE_SIZE = 25;
  const EMPTY_RESPONSE_RETRY_LIMIT = 1;

  // ── Local dashboard state (replaces useStoreDashboard) ──────────────────
  const [pendingIndents, setPendingIndents] = useState<any[]>([]);
  const [historyIndents, setHistoryIndents] = useState<any[]>([]);
  const [poPending, setPoPending] = useState<any[]>([]);
  const [poHistory, setPoHistory] = useState<any[]>([]);
  const [repairPending, setRepairPending] = useState<any[]>([]);
  const [repairHistory, setRepairHistory] = useState<any[]>([]);
  const [returnableDetails, setReturnableDetails] = useState<any[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [divisionListIssue, setDivisionListIssue] = useState<any[]>([]);
  const [divisionListIndent, setDivisionListIndent] = useState<any[]>([]);
  const [divisionListPO, setDivisionListPO] = useState<any[]>([]);
  const [divisionListGRN, setDivisionListGRN] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(true);

  // Consolidated Modal & Detail states
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalTitle, setModalTitle] = useState("");
  const [modalType, setModalType] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalPage, setModalPage] = useState(1);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(MODAL_PAGE_SIZE);

  const mountedRef = useRef(true);
  const emptyDashboardRetryCountRef = useRef(0);

  // ── Initial fetch: Consolidated Dashboard API ───────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    let pollTimeout: ReturnType<typeof setTimeout> | undefined;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      setEmptyStateMessage(null);

      try {
        const showCurrentMonthEmptyState = () => {
          emptyDashboardRetryCountRef.current += 1;

          if (emptyDashboardRetryCountRef.current <= EMPTY_RESPONSE_RETRY_LIMIT) {
            pollTimeout = setTimeout(() => {
              pollTimeout = undefined;
              if (mountedRef.current && !cancelled) void loadData();
            }, 2500);
            return;
          }

          setPendingIndents([]);
          setHistoryIndents([]);
          setPoPending([]);
          setPoHistory([]);
          setRepairPending([]);
          setRepairHistory([]);
          setReturnableDetails([]);
          setDashboardSummary(null);
          setFeedbacks([]);
          setFeedbacksLoading(false);
          setEmptyStateMessage(`Current month data not found for ${getCurrentMonthLabel()}.`);
          setLoading(false);
        };

        const [issRes, indRes, poRes, grnRes, dashboardRes] = await Promise.allSettled([
          storeApi.getDivisionWiseIssue(),
          storeApi.getDivisionWiseIndent(),
          storeApi.getDivisionWisePO(),
          storeApi.getDivisionWiseGRN(),
          storeApi.getDashboard()
        ]);

        if (cancelled) return;

        const normalizeDivs = (data: any[]) => (data || []).map(item => ({
          ...item,
          _normalizedDiv: getDivName(item)
        }));

        setDivisionListIssue(issRes.status === "fulfilled" ? normalizeDivs(issRes.value?.data || issRes.value) : []);
        setDivisionListIndent(indRes.status === "fulfilled" ? normalizeDivs(indRes.value?.data || indRes.value) : []);
        setDivisionListPO(poRes.status === "fulfilled" ? normalizeDivs(poRes.value?.data || poRes.value) : []);
        setDivisionListGRN(grnRes.status === "fulfilled" ? normalizeDivs(grnRes.value?.data || grnRes.value) : []);

        if (dashboardRes.status === "rejected") {
          if (isNoDataApiError(dashboardRes.reason)) {
            showCurrentMonthEmptyState();
            return;
          }

          throw dashboardRes.reason;
        }

        const data = dashboardRes.value?.data || dashboardRes.value;
        const hasSummary = !!(data?.summary && Object.keys(data.summary).length > 0);
        const hasCurrentMonthRows = hasCurrentMonthRecords([
          data?.pendingIndents,
          data?.historyIndents,
          data?.poPending,
          data?.poHistory,
          data?.repairPending,
          data?.repairHistory,
          data?.returnableDetails,
        ]);

        if (!hasSummary && !hasCurrentMonthRows) {
          showCurrentMonthEmptyState();
          return;
        }

        emptyDashboardRetryCountRef.current = 0;
        setPendingIndents(data?.pendingIndents || []);
        setHistoryIndents(data?.historyIndents || []);
        setPoPending(data?.poPending || []);
        setPoHistory(data?.poHistory || []);
        setRepairPending(data?.repairPending || []);
        setRepairHistory(data?.repairHistory || []);
        setReturnableDetails(data?.returnableDetails || []);
        setDashboardSummary(data?.summary || null);
        setFeedbacks(data?.feedbacks || []);
        setFeedbacksLoading(false);

        if (!cancelled && !pollTimeout) {
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Dashboard data load error:", err);
        if (!cancelled) {
          if (isNoDataApiError(err)) {
            setPendingIndents([]);
            setHistoryIndents([]);
            setPoPending([]);
            setPoHistory([]);
            setRepairPending([]);
            setRepairHistory([]);
            setReturnableDetails([]);
            setDashboardSummary(null);
            setFeedbacks([]);
            setEmptyStateMessage(`Current month data not found for ${getCurrentMonthLabel()}.`);
          } else {
            setError(err?.message ?? 'Failed to load dashboard data');
          }
          setFeedbacksLoading(false);
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, []);

  // Performance Optimization: Moved static data normalization to useMemo
  const allItems = useMemo(() => {
    // Optimization: Pre-calculate size and use a single array for large data sets
    const combined = [];
    if (pendingIndents.length) combined.push(...pendingIndents);
    if (historyIndents.length) combined.push(...historyIndents);
    if (poPending.length) combined.push(...poPending);
    if (poHistory.length) combined.push(...poHistory);
    if (repairPending.length) combined.push(...repairPending);
    if (repairHistory.length) combined.push(...repairHistory);
    return combined;
  }, [pendingIndents, historyIndents, poPending, poHistory, repairPending, repairHistory]);

  const allVendors = useMemo(() => normalizeVendorList(allItems), [allItems]);
  const allProducts = useMemo(() => normalizeProductList(allItems), [allItems]);

  // Permission Check
  const hasAccess = useMemo(() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const storeAccess = (user.store_access || "")
      .split(",")
      .map(v => v.trim().toUpperCase());
    return storeAccess.includes("DASHBOARD");
  }, [user]);

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

  const getDivName = (d: any) => {
    const rawName = String(d.DIVISION || d.division || "Unknown").toUpperCase().trim();
    if (rawName === "STEEL MELTING SHOP (SMS)") return "SMS";
    if (rawName.includes("CORPORATE") || rawName.includes("CORP") || rawName.includes("COMMON")) return "COMMON";
    return rawName;
  };

  const mergedDivisionData = useMemo(() => {
    const map: Record<string, any> = {};

    // Indents - Now a detailed list, so we COUNT records
    divisionListIndent.forEach(d => {
      const name = d._normalizedDiv;
      if (!name) return;
      if (!map[name]) map[name] = { division: name, indent: 0, po: 0, grn: 0, issue: 0 };
      map[name].indent++;
    });

    // PO - Aggregated sum poamount
    divisionListPO.forEach(d => {
      const name = d._normalizedDiv;
      if (!name) return;
      if (!map[name]) map[name] = { division: name, indent: 0, po: 0, grn: 0, issue: 0 };
      map[name].po += Number(d.POAMOUNT || d.poamount || d.ORDER_AMOUNT || d.order_amount || d.TOTAL || d.total || 0);
    });

    // GRN - Aggregated sum grnamount
    divisionListGRN.forEach(d => {
      const name = d._normalizedDiv;
      if (!name) return;
      if (!map[name]) map[name] = { division: name, indent: 0, po: 0, grn: 0, issue: 0 };
      map[name].grn += Number(d.GRNAMOUNT || d.grnamount || d.GRN_AMOUNT || d.grn_amount || d.TOTAL || d.total || 0);
    });

    // Issue - Now summarized by employee, sum issue_amount
    divisionListIssue.forEach(d => {
      const name = d._normalizedDiv;
      if (!name) return;
      if (!map[name]) map[name] = { division: name, indent: 0, po: 0, grn: 0, issue: 0 };
      map[name].issue += Number(d.ISSUE_AMOUNT || d.issue_amount || d.amount || 0);
    });

    return Object.values(map)
      .filter((d: any) => d.division !== "TMT ROLLING MILL")
      .sort((a, b) => b.indent - a.indent);
  }, [divisionListIndent, divisionListPO, divisionListGRN, divisionListIssue]);

  const overallDivisionData = useMemo(() => {
    return mergedDivisionData.reduce(
      (acc, curr) => ({
        indent: acc.indent + curr.indent,
        po: acc.po + curr.po,
        grn: acc.grn + curr.grn,
        issue: acc.issue + curr.issue,
      }),
      { indent: 0, po: 0, grn: 0, issue: 0 }
    );
  }, [mergedDivisionData]);

  const categoryChartsData = useMemo(() => {
    const labels = mergedDivisionData.map(d => d.division);
    return {
      indent: { labels, series: mergedDivisionData.map(d => d.indent), total: overallDivisionData.indent },
      po: { labels, series: mergedDivisionData.map(d => d.po), total: overallDivisionData.po },
      grn: { labels, series: mergedDivisionData.map(d => d.grn), total: overallDivisionData.grn },
      issue: { labels, series: mergedDivisionData.map(d => d.issue), total: overallDivisionData.issue },
    };
  }, [mergedDivisionData, overallDivisionData]);

  const targetActualChartData = useMemo(() => {
    const targets: Record<string, number> = {
      "SMS": 9500000,
      "PIPE MILL": 3000000,
      "PATRA ROLLING MILL": 2500000,
      "COMMON": 300000
    };

    const categories = ["SMS", "PIPE MILL", "PATRA ROLLING MILL", "COMMON"];
    const targetSeries: number[] = categories.map(cat => targets[cat]);
    const actualSeries: number[] = categories.map(cat => {
      const match = mergedDivisionData.find(d => d.division === cat);
      return match ? Math.round(match.grn) : 0;
    });

    return {
      categories,
      series: [
        { name: "TARGET", data: targetSeries },
        { name: "ACTUAL", data: actualSeries }
      ]
    };
  }, [mergedDivisionData]);

  const targetActualChartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '85%',
        borderRadius: 6,
        dataLabels: {
          position: 'top',
        },
      },
    },
    colors: ['#3b82f6', '#ef4444'], // Blue for Target, Red for Actual
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        if (val === 0) return "0";
        return (val / 100000).toFixed(1) + 'L';
      },
      offsetY: -25,
      style: {
        fontSize: '14px',
        colors: ["#304758"],
        fontWeight: 700
      }
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: targetActualChartData.categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        rotate: -45,
        rotateAlways: false,
        hideOverlappingLabels: true,
        style: {
          fontSize: '12px',
          fontWeight: 600,
          colors: '#64748b'
        }
      }
    },
    yaxis: {
      title: {
        text: 'GRN Value',
        style: {
          fontSize: '12px',
          fontWeight: 600,
          color: '#64748b'
        }
      },
      labels: {
        formatter: function (val: number) {
          if (val === 0) return "0";
          return (val / 100000).toFixed(1) + 'L';
        }
      }
    },
    fill: { opacity: 1 },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val.toString();
        }
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
      fontSize: '12px',
      fontWeight: 600,
      markers: {
        radius: 12
      } as any,
    },
    grid: {
      borderColor: '#e2e8f0',
      strokeDashArray: 0,
      xaxis: {
        lines: { show: true }
      },
      yaxis: {
        lines: { show: true }
      },
      padding: {
        top: 10,
        right: 10,
        bottom: 0,
        left: 10
      }
    },
    responsive: [
      {
        breakpoint: 640,
        options: {
          dataLabels: {
            formatter: (val: number) => val === 0 ? "0" : (val / 100000).toFixed(1) + 'L',
            style: {
              fontSize: '10px'
            }
          },
          xaxis: {
            labels: {
              style: {
                fontSize: '10px'
              }
            }
          },
          yaxis: {
            labels: {
              formatter: function (val: number) {
                if (val === 0) return "0";
                return (val / 100000).toFixed(1) + 'L';
              },
              style: {
                fontSize: '10px'
              }
            }
          }
        }
      }
    ]
  };

  const donorChartOptions: ApexOptions = {
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
              label: 'Total',
              fontSize: '10px',
              fontWeight: 600,
              color: '#64748b',
              formatter: () => "0"
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
      enabled: true,
      followCursor: true,
      y: {
        formatter: (val: number) => Math.round(val).toString()
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

  const getCurrentMonthLabel = () =>
    new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

  const hasCurrentMonthRecords = (rowsCollection: any[][]) => {
    const monthStart = getCurrentMonthStart().getTime();

    return rowsCollection.some((rows) =>
      (rows || []).some((item: any) => {
        const dateVal =
          item?.VRDATE ||
          item?.vrdate ||
          item?.INDENT_DATE ||
          item?.indent_date ||
          item?.RECEIVED_DATE ||
          item?.received_date ||
          item?.PLANNEDTIMESTAMP ||
          item?.PLANNED_TIMESTAMP;

        return dateVal ? new Date(dateVal).getTime() >= monthStart : false;
      })
    );
  };

  const isNoDataApiError = (err: any) => {
    const status = Number(err?.response?.status || err?.status || 0);
    const message = String(err?.response?.data?.message || err?.message || "").toLowerCase();

    if (status === 404) return true;
    if (status !== 500) return false;

    if (!message) return true;

    return [
      "no data",
      "data not found",
      "not found",
      "no record",
      "no rows",
      "empty",
      "status code 500",
    ].some((token) => message.includes(token));
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
          title: getDisplayValue(item.item_name, item.ITEM_NAME),
          subtitle: `No: ${getDisplayValue(item.indent_number, item.INDENT_NUMBER)}`,
          meta: `Indenter: ${getDisplayValue(item.employee_name, item.EMPLOYEE_NAME, item.indenter, item.INDENTER)}`,
          fields: [
            { label: "Date", value: getDisplayDate(item.indent_date, item.INDENT_DATE) },
            { label: "Division", value: getDivName(item) },
            { label: "Quantity", value: getDisplayValue(item.indent_quantity, item.INDENT_QUANTITY, 0), tone: "primary" },
            { label: "Received", value: getDisplayValue(item.received, item.RECEIVED, 0), tone: "success" },
            { label: "Pending", value: getDisplayValue(item.pending, item.PENDING, 0), tone: "danger" },
          ],
        };
      case "pendingIndents":
        return {
          gradient: getModalCardGradient(type),
          title: getDisplayValue(item.item_name, item.ITEM_NAME),
          subtitle: `No: ${getDisplayValue(item.indent_number, item.INDENT_NUMBER)}`,
          meta: `Indenter: ${getDisplayValue(item.employee_name, item.EMPLOYEE_NAME, item.indenter, item.INDENTER)}`,
          fields: [
            { label: "Date", value: getDisplayDate(item.indent_date, item.INDENT_DATE) },
            { label: "Division", value: getDivName(item) },
            { label: "Quantity", value: getDisplayValue(item.indent_quantity, item.INDENT_QUANTITY, 0), tone: "primary" },
            { label: "Received", value: getDisplayValue(item.received, item.RECEIVED, 0), tone: "success" },
            { label: "Pending", value: getDisplayValue(item.pending, item.PENDING, 0), tone: "danger" },
          ],
        };
      case "totalPurchases":
      case "pendingPOs":
        return {
          gradient: getModalCardGradient(type),
          title: getDisplayValue(item.ITEM_NAME, item.item_name),
          subtitle: `PO No: ${getDisplayValue(item.VRNO, item.vrno)}`,
          meta: `Vendor: ${getDisplayValue(item.VENDOR_NAME)}`,
          fields: [
            { label: "Indent No", value: getDisplayValue(item.INDENT_NO) },
            { label: "Planned Date", value: getDisplayDate(item.PLANNED_TIMESTAMP) },
            { label: "PO Date", value: getDisplayDate(item.VRDATE) },
            { label: "Indenter", value: getDisplayValue(item.INDENTER) },
            { label: "Amount", value: getDisplayValue(item.POAMOUNT, item.poamount, 0), tone: "success" },
            { label: "Qty Order", value: getDisplayValue(item.QTYORDER), tone: "primary" },
            { label: "Qty Execute", value: getDisplayValue(item.QTYEXECUTE), tone: "success" },
            { label: "Balance Qty", value: getDisplayValue(item.BALANCE_QTY), tone: "danger" },
            { label: "UM", value: getDisplayValue(item.UM) },
          ],
        };
      case "repairPending":
        return {
          gradient: getModalCardGradient(type),
          title: getDisplayValue(item.item_name, item.ITEM_NAME),
          subtitle: `VR No: ${getDisplayValue(item.vrno, item.VRNO)}`,
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
          title: getDisplayValue(item.item_name, item.ITEM_NAME),
          subtitle: `Receive GP: ${getDisplayValue(item.receive_gate_pass, item.RECEIVE_GATE_PASS)}`,
          meta: `Repair GP: ${getDisplayValue(item.repair_gate_pass, item.REPAIR_GATE_PASS)}`,
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
          title: getDisplayValue(item.ITEM_NAME, item.item_name),
          subtitle: `VR No: ${getDisplayValue(item.VRNO, item.vrno)}`,
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
      case 'divPO':
      case 'divGRN':
      case 'divIssue':
      case 'divIndent': {
        const isIndent = type === 'divIndent';
        const isPO = type === 'divPO';
        const isGRN = type === 'divGRN';
        const isIssue = type === 'divIssue';

        const gradient = isIndent ? getModalCardGradient('totalIndents') : getModalCardGradient('totalPurchases');
        const countOrAmountLabel = isIndent ? "Indent Qty" : (isPO ? "PO Amount" : isGRN ? "GRN Amount" : "Issue Amount");

        if (isIndent) {
          return {
            gradient,
            title: getDivName(item),
            subtitle: `No: ${item.INDENT_NUMBER || item.indent_number || "—"}`,
            meta: `Employee: ${String(item.EMPLOYEE_NAME || item.employee_name || "—").trim()}`,
            fields: [
              { label: "Emp Code", value: item.EMPLOYEE_CODE || item.employee_code || "—", tone: "primary" },
              { label: "Indent Date", value: getDisplayDate(item.INDENT_DATE, item.indent_date) },
              { label: "Item Name", value: item.ITEM_NAME || item.item_name || "—", fullWidth: true },
              { label: "Indent Qty", value: item.INDENT_QUANTITY || item.indent_quantity || 0, tone: "success" },
              { label: "Received", value: item.RECEIVED || item.received || 0, tone: "success" },
              { label: "Pending", value: item.PENDING || item.pending || 0, tone: "danger" },
            ],
          };
        }

        if (isPO) {
          return {
            gradient,
            title: getDivName(item),
            subtitle: `Dept: ${getDisplayValue(item.department, item.DEPARTMENT)}`,
            meta: `PO Summary`,
            fields: [
              { label: "Division", value: getDivName(item) },
              { label: "Department", value: getDisplayValue(item.department, item.DEPARTMENT) },
              { label: "PO Amount", value: Math.round(Number(item.POAMOUNT || item.poamount || 0)), tone: "success" },
            ],
          };
        }

        if (isGRN) {
          return {
            gradient,
            title: getDivName(item),
            subtitle: `Dept: ${getDisplayValue(item.department, item.DEPARTMENT)}`,
            meta: `GRN Summary`,
            fields: [
              { label: "Division", value: getDivName(item) },
              { label: "Department", value: getDisplayValue(item.department, item.DEPARTMENT) },
              { label: "GRN Amount", value: Math.round(Number(item.GRNAMOUNT || item.grnamount || 0)), tone: "success" },
            ],
          };
        }

        return {
          gradient,
          title: getDivName(item),
          subtitle: `Dept: ${getDisplayValue(item.department, item.DEPARTMENT)}`,
          meta: `Issue Summary`,
          fields: [
            { label: "Division", value: getDivName(item) },
            { label: "Department", value: getDisplayValue(item.department, item.DEPARTMENT) },
            { label: "Issue Amount", value: Math.round(Number(item.ISSUE_AMOUNT || item.issue_amount || 0)), tone: "success" },
          ],
        };
      }
      default:
        return {
          gradient: getModalCardGradient(type),
          title: getDisplayValue(item.ITEM_NAME, item.item_name),
          subtitle: `VR No: ${getDisplayValue(item.VRNO, item.vrno)}`,
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
    const filterMonth = (rows: any[]) => {
      const ms = monthStart.getTime();
      return (rows || []).filter((item) => {
        const dateVal =
          item.VRDATE ||
          item.vrdate ||
          item.INDENT_DATE ||
          item.indent_date ||
          item.RECEIVED_DATE ||
          item.received_date ||
          item.PLANNEDTIMESTAMP ||
          item.PLANNED_TIMESTAMP;
        return dateVal && new Date(dateVal).getTime() >= ms;
      });
    };

    const curMonthPendingIndents = filterMonth(pendingIndents);
    const curMonthHistoryIndents = filterMonth(historyIndents);
    const curMonthPoPending = filterMonth(poPending);
    const curMonthPoHistory = filterMonth(poHistory);
    const curMonthRepairPending = filterMonth(repairPending);
    const curMonthRepairHistory = filterMonth(repairHistory);
    const curMonthReturnable = (returnableDetails || []).filter((item: any) => {
      const dv = item.VRDATE || item.vrdate;
      return dv && new Date(dv).getTime() >= monthStart.getTime();
    });

    const now = new Date().getTime();
    const curMonthOverdue = curMonthPendingIndents.filter((item) => {
      const ts = item.PLANNEDTIMESTAMP || item.plannedtimestamp || item.PLANNED_TIMESTAMP;
      return ts && new Date(ts).getTime() < now;
    }).length;

    const total = (divisionListIndent || []).length;
    const pending = (divisionListIndent || []).filter(item => (Number(item.pending || item.PENDING || 0)) > 0).length;
    const completed = total - pending;

    const completedPercent = (total > 0 ? (completed / total) * 100 : 0);
    const pendingPercent = (total > 0 ? (pending / total) * 100 : 0);
    const overduePercent = (total > 0 ? (curMonthOverdue / total) * 100 : 0);

    return {
      dashboardData: {
        ...summary,
        totalIndents: total,
        completedIndents: completed,
        pendingIndents: pending,
        upcomingIndents: Number(summary.upcomingIndents || 0),
        overdueIndents: curMonthOverdue,
        totalIndentedQuantity: Number(summary.totalIndentedQuantity || 0),
        totalPurchaseOrders: curMonthPoHistory.length,
        totalPurchasedAmount: curMonthPoHistory.reduce((acc: number, item: any) => acc + (Number(item.POAMOUNT) || 0), 0),
        totalPurchasedQuantity: Number(summary.totalPurchasedQuantity || 0),
        totalIssuedQuantity: Number(summary.totalIssuedQuantity || 0),
        outOfStockCount: Number(summary.outOfStockCount || 0),
        overallProgress: completedPercent,
        completedPercent,
        pendingPercent,
        upcomingPercent: Number(summary.upcomingPercent || 0),
        overduePercent,
        pendingPurchaseOrders: curMonthPoPending.length,
      },
      repairGatePassCounts: {
        pending: curMonthRepairPending.length,
        history: curMonthRepairHistory.length,
      },
      returnableStats: {
        TOTAL_COUNT: curMonthReturnable.length,
        RETURNABLE_COUNT: curMonthReturnable.filter((i: any) => i.GATEPASS_TYPE === 'RETURNABLE').length,
        NON_RETURNABLE_COUNT: curMonthReturnable.filter((i: any) => i.GATEPASS_TYPE === 'NON RETURANABLE').length,
        RETURNABLE_COMPLETED_COUNT: curMonthReturnable.filter((i: any) => i.GATEPASS_TYPE === 'RETURNABLE' && i.GATEPASS_STATUS === 'COMPLETED').length,
        RETURNABLE_PENDING_COUNT: curMonthReturnable.filter((i: any) => i.GATEPASS_TYPE === 'RETURNABLE' && i.GATEPASS_STATUS === 'PENDING').length,
      },
    };
  }, [
    dashboardSummary,
    pendingIndents,
    historyIndents,
    poPending,
    poHistory,
    repairPending,
    repairHistory,
    returnableDetails,
    divisionListIndent,
  ]);

  const { dashboardData, repairGatePassCounts, returnableStats } = dashboardStats;

  const getModalConfig = (type: string) => {
    switch (type) {
      case 'totalIndents':
      case 'pendingIndents':
        return {
          headers: ["Division", "Indenter", "Date", "Indent No", "Item Name", "Quantity", "Received", "Pending"],
          renderRow: (item: any) => (
            <>
              <td className="px-6 py-4 text-sm font-black text-slate-800 uppercase">{getDivName(item)}</td>
              <td className="px-6 py-4 text-sm font-bold text-slate-700 uppercase">{item.employee_name || item.EMPLOYEE_NAME || "—"}</td>
              <td className="px-6 py-4 text-sm font-medium text-slate-600">{formatDate(item.indent_date || item.INDENT_DATE)}</td>
              <td className="px-6 py-4 text-sm font-black text-indigo-700">{item.indent_number || item.INDENT_NUMBER || "—"}</td>
              <td className="px-6 py-4 text-sm font-extrabold text-slate-900">{item.item_name || item.ITEM_NAME || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-indigo-900">{item.indent_quantity || item.INDENT_QUANTITY || 0}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-emerald-700">{item.received || item.RECEIVED || 0}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-rose-700">{item.pending || item.PENDING || 0}</td>
            </>
          )
        };
      case 'totalPurchases':
      case 'pendingPOs':
        return {
          headers: ["Indent No", "PO No", "Planned Date", "PO Date", "Vendor Name", "Indenter", "Item Name", "Amount", "Qty Order", "Qty Execute", "Balance Qty", "UM"],
          renderRow: (item: any) => (
            <>
              <td className="px-6 py-4 font-mono font-bold text-slate-700">{item.INDENT_NO || "—"}</td>
              <td className="px-6 py-4 font-mono font-black text-indigo-700">{item.VRNO || item.vrno || "—"}</td>
              <td className="px-6 py-4 text-sm font-medium text-slate-900">{formatDate(item.PLANNED_TIMESTAMP)}</td>
              <td className="px-6 py-4 text-sm font-semibold text-slate-800">{formatDate(item.VRDATE)}</td>
              <td className="px-6 py-4 text-sm font-black text-slate-900">{item.VENDOR_NAME || "—"}</td>
              <td className="px-6 py-4 text-sm font-bold text-slate-800">{item.INDENTER || "—"}</td>
              <td className="px-6 py-4 text-sm font-extrabold text-slate-900">{item.ITEM_NAME || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-indigo-700">
                {item.POAMOUNT ? `${(Number(item.POAMOUNT)).toFixed(2)}` : "—"}
              </td>
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
              <td className="px-6 py-4 text-sm font-extrabold text-slate-900">{item.item_name || item.ITEM_NAME || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-indigo-900">{item.qtyissued || item.QTYISSUED || "—"}</td>
              <td className="px-6 py-4 text-center text-[11px] font-black text-slate-600 uppercase">{item.um || item.UM || "—"}</td>
              <td className="px-6 py-4 text-[12px] text-slate-800 font-medium italic">{item.remark || item.REMARK || "—"}</td>
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
              <td className="px-6 py-4 text-sm font-extrabold text-slate-900">{item.item_name || item.ITEM_NAME || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-indigo-900">{item.qtyrecd || item.QTYRECD || item.qtyreceived || item.QTYRECEIVED || "—"}</td>
              <td className="px-6 py-4 text-center text-[11px] font-black text-slate-600 uppercase">{item.um || item.UM || "—"}</td>
              <td className="px-6 py-4 text-[12px] text-slate-800 font-medium italic">{item.remark || item.REMARK || "—"}</td>
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
              <td className="px-6 py-4 text-sm font-extrabold text-slate-900">{item.ITEM_NAME || item.item_name || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-slate-950">{item.QTYISSUED || item.qtyissued || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-emerald-700">{item.QTYRECEIVED || item.qtyreceived || 0}</td>
              <td className="px-6 py-4 text-center text-[11px] font-black text-slate-600 uppercase">{item.UNIT || item.unit || "—"}</td>
              <td className="px-6 py-4 text-[12px] text-slate-800 font-medium italic">{item.REMARK || item.remark || "No remarks"}</td>
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
              <td className="px-6 py-4 text-sm font-extrabold text-slate-900">{item.ITEM_NAME || item.item_name || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-slate-950">{item.QTYISSUED || item.qtyissued || "—"}</td>
              <td className="px-6 py-4 text-center text-sm font-black text-emerald-700">{item.QTYRECEIVED || item.qtyreceived || 0}</td>
              <td className="px-6 py-4 text-center text-[11px] font-black text-slate-600 uppercase">{item.UNIT || item.unit || "—"}</td>
              <td className="px-6 py-4 text-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight uppercase ring-1 ${item.GATEPASS_STATUS === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-900 ring-emerald-300' : 'bg-amber-100 text-amber-900 ring-amber-300'}`}>
                  {item.GATEPASS_STATUS || "—"}
                </span>
              </td>
              <td className="px-6 py-4 text-[12px] text-slate-800 font-medium italic">{item.REMARK || item.remark || "No remarks"}</td>
            </>
          )
        };
      case 'divIssue':
      case 'divIndent':
      case 'divPO':
      case 'divGRN': {
        const isIndent = type === 'divIndent';
        const isPO = type === 'divPO';
        const isGRN = type === 'divGRN';
        const isIssue = type === 'divIssue';

        let headers: string[] = [];
        if (isIndent) {
          headers = ["Date", "Indent No", "Division", "Emp Code", "Employee Name", "Item Name", "Quantity", "Received", "Pending"];
        } else if (isPO) {
          headers = ["Division", "Department", "PO Amount"];
        } else if (isGRN) {
          headers = ["Division", "Department", "GRN Amount"];
        } else { // Issue
          headers = ["Division", "Department", "Issue Amount"];
        }

        return {
          headers,
          renderRow: (item: any) => {
            if (isIndent) {
              return (
                <>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{getDisplayDate(item.INDENT_DATE, item.indent_date)}</td>
                  <td className="px-6 py-4 font-mono font-bold text-indigo-700">{item.INDENT_NUMBER || item.indent_number || "—"}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700 uppercase">{getDivName(item)}</td>
                  <td className="px-6 py-4 text-xs font-mono font-bold text-slate-600">{item.EMPLOYEE_CODE || item.employee_code || "—"}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">{String(item.EMPLOYEE_NAME || item.employee_name || "—").trim()}</td>
                  <td className="px-6 py-4 text-sm font-extrabold text-slate-900">{item.ITEM_NAME || item.item_name || "—"}</td>
                  <td className="px-6 py-4 text-center text-sm font-black text-indigo-900">{item.INDENT_QUANTITY || item.indent_quantity || 0}</td>
                  <td className="px-6 py-4 text-center text-sm font-black text-emerald-700">{item.RECEIVED || item.received || 0}</td>
                  <td className="px-6 py-4 text-center text-sm font-black text-rose-700">{item.PENDING || item.pending || 0}</td>
                </>
              );
            }
            if (isPO) {
              return (
                <>
                  <td className="px-6 py-4 text-sm font-black text-slate-800 uppercase">{getDivName(item)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-700 uppercase">{item.DEPARTMENT || item.department || "—"}</td>
                  <td className="px-6 py-4 text-center text-sm font-black text-emerald-700">{Math.round(item.POAMOUNT || item.poamount || 0)}</td>
                </>
              );
            }
            if (isGRN) {
              return (
                <>
                  <td className="px-6 py-4 text-sm font-black text-slate-800 uppercase">{getDivName(item)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-700 uppercase">{item.DEPARTMENT || item.department || "—"}</td>
                  <td className="px-6 py-4 text-center text-sm font-black text-indigo-700">{Math.round(item.GRNAMOUNT || item.grnamount || 0)}</td>
                </>
              );
            }
            // Issue
            return (
              <>
                <td className="px-6 py-4 text-sm font-black text-slate-800 uppercase">{getDivName(item)}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-700 uppercase">{item.DEPARTMENT || item.department || "—"}</td>
                <td className="px-6 py-4 text-center text-sm font-black text-slate-900">{Math.round(Number(item.ISSUE_AMOUNT || item.issue_amount || 0))}</td>
              </>
            );
          }
        };
      }
    }
  };

  const openModal = async (type: string, title: string, divisionFilter?: string) => {
    setModalTitle(title);
    setModalType(type);
    setSelectedDivision(divisionFilter || null);
    setIsModalOpen(true);
    setModalLoading(true);
    setModalData([]);
    setModalSearch("");
    setModalPage(1);

    try {
      let rows: any[] = [];
      const filterByDiv = (data: any[], filter?: string) => filter
        ? data.filter(d => (d._normalizedDiv || getDivName(d)) === filter.toUpperCase().trim())
        : data;

      const getRowsForType = (t: string, filter?: string) => {
        switch (t) {
          case 'totalIndents': return divisionListIndent || [];
          case 'pendingIndents': return (divisionListIndent || []).filter(item => (Number(item.pending || item.PENDING || 0)) > 0);
          case 'totalPurchases': return poHistory;
          case 'pendingPOs': return poPending;
          case 'repairPending': return repairPending;
          case 'repairHistory': return repairHistory;
          case 'returnableTotal': return (returnableDetails || []).filter((i: any) => i.GATEPASS_TYPE === 'RETURNABLE');
          case 'returnablePending': return (returnableDetails || []).filter((i: any) => i.GATEPASS_TYPE === 'RETURNABLE' && i.GATEPASS_STATUS === 'PENDING');
          case 'returnableCompleted': return (returnableDetails || []).filter((i: any) => i.GATEPASS_TYPE === 'RETURNABLE' && i.GATEPASS_STATUS === 'COMPLETED');
          case 'nonReturnable': return (returnableDetails || []).filter((i: any) => i.GATEPASS_TYPE === 'NON RETURANABLE');
          case 'divIssue': return filterByDiv(divisionListIssue, filter);
          case 'divIndent': return filterByDiv(divisionListIndent, filter);
          case 'divPO': return filterByDiv(divisionListPO, filter);
          case 'divGRN': return filterByDiv(divisionListGRN, filter);
          default: return [];
        }
      };

      rows = getRowsForType(type, divisionFilter);

      const monthStart = getCurrentMonthStart();
      const filteredByMonth = rows.filter((item: any) => {
        const dateVal = item.VRDATE || item.vrdate || item.INDENT_DATE || item.indent_date || item.RECEIVED_DATE || item.received_date || item.date || item.PLANNEDTIMESTAMP;
        if (!dateVal) return true;
        return new Date(dateVal) >= monthStart;
      });

      setModalData(filteredByMonth);
    } catch (err) {
      console.error(`Failed to filter ${type} details:`, err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleTabChange = (division: string) => {
    setModalLoading(true);
    setModalSearch("");
    setModalPage(1);
    setSelectedDivision(division);
    setMobileVisibleCount(MODAL_PAGE_SIZE);

    const categoryName = modalType === 'divIndent' ? 'Indents' : modalType === 'divPO' ? 'PO' : modalType === 'divGRN' ? 'GRN' : 'Issues';
    setModalTitle(`${division} ${categoryName} Analysis`);

    const filterByDiv = (data: any[], filter: string) =>
      data.filter(d => (d._normalizedDiv || getDivName(d)) === filter.toUpperCase().trim());

    let rows: any[] = [];
    switch (modalType) {
      case 'divIndent': rows = filterByDiv(divisionListIndent, division); break;
      case 'divPO': rows = filterByDiv(divisionListPO, division); break;
      case 'divGRN': rows = filterByDiv(divisionListGRN, division); break;
      case 'divIssue': rows = filterByDiv(divisionListIssue, division); break;
    }

    const monthStart = getCurrentMonthStart();
    const filteredByMonth = rows.filter((item: any) => {
      const dateVal = item.VRDATE || item.vrdate || item.INDENT_DATE || item.indent_date || item.RECEIVED_DATE || item.received_date || item.date || item.PLANNEDTIMESTAMP;
      if (!dateVal) return true;
      return new Date(dateVal) >= monthStart;
    });

    setModalData(filteredByMonth);
    setModalLoading(false);
  };

  const cards = [
    {
      title: 'Total Indents',
      icon: <ClipboardList size={16} />,
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
      icon: <PackageCheck size={16} />,
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
      icon: <Truck size={16} />,
      value: dashboardData?.totalPurchaseOrders ?? '—',
      sublabel: 'Total Amount',
      subvalue: dashboardData?.totalPurchasedAmount ? `${(dashboardData.totalPurchasedAmount / 100000).toFixed(2)} L` : '0.00 L',
      bgGradient: 'from-emerald-600 to-teal-700',
      shadowColor: 'shadow-emerald-200 dark:shadow-emerald-900/20',
      iconBg: 'bg-white/20',
      type: 'totalPurchases'
    },
    {
      title: 'Pending PO',
      icon: <FileText size={16} />,
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
      icon: <Activity size={16} />,
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
      icon: <FileText size={16} />,
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
      icon: <RefreshCcw size={16} />,
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
      icon: <Box size={16} />,
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
      icon: <Clock size={16} />,
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
      icon: <CheckCircle2 size={16} />,
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

    if (scrollHeight - scrollTop <= clientHeight + 150 && mobileVisibleCount < filteredModalRows.length) {
      setMobileVisibleCount((prev) => Math.min(prev + MODAL_PAGE_SIZE, filteredModalRows.length));
    }
  };

  const modalConfig = useMemo(() => getModalConfig(modalType), [modalType]);
  const desktopModalSummary = useMemo(() => {
    const total = filteredModalRows.length;
    const pageStart = total === 0 ? 0 : (filteredModalData.currentPage - 1) * MODAL_PAGE_SIZE + 1;
    const pageEnd = Math.min(total, filteredModalData.currentPage * MODAL_PAGE_SIZE);

    return {
      total,
      pageStart,
      pageEnd,
      hasSearch: modalSearch.trim().length > 0,
    };
  }, [filteredModalRows.length, filteredModalData.currentPage, modalSearch]);

  if (loading) {
    return (
      <Loading
        heading="Store Dashboard"
        subtext="Compiling real-time store analytics..."
        icon={<LayoutDashboard size={48} className="text-red-600" />}
        showSpinner={false}
        description={
          <div className="flex items-center justify-center py-40">
            <div className="relative flex items-center justify-center">
              {/* Tumbling wrapper */}
              <div className="w-20 h-20 rounded-[1.25rem] bg-gradient-to-br from-red-500 via-red-600 to-orange-600 shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center justify-center animate-spin">
                {/* Inner detail */}
                <div className="w-[68px] h-[68px] rounded-xl border-2 border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-sm">
                  <LayoutDashboard size={36} className="text-white drop-shadow-lg" />
                </div>
              </div>

              {/* Magical sparkles around */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-3 h-3 bg-orange-400 rounded-full animate-ping"></div>
              <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-3 h-3 bg-red-400 rounded-full animate-ping" style={{ animationDelay: '500ms' }}></div>
            </div>
          </div>
        }
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

  if (emptyStateMessage) {
    return (
      <div className="w-full px-1.5 py-4 sm:px-4 md:p-6 lg:p-8 space-y-5 md:space-y-8 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen font-sans">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 sm:px-0">
          <div className="flex items-center gap-3.5 md:gap-4">
            <div className="p-2.5 md:p-3.5 rounded-2xl bg-red-600 shadow-xl shadow-red-200 dark:shadow-red-900/20 shrink-0">
              <LayoutDashboard className="text-white w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Store Dashboard
              </h1>
              <p className="text-[11px] md:text-sm text-slate-500 dark:text-slate-400 font-medium leading-snug">
                Real-time monitoring and analytics for Store &amp; Purchase
              </p>
            </div>
          </div>
        </div>

        <Card className="rounded-3xl border-0 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden">
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-5 rounded-3xl bg-slate-100 p-4 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <Calendar size={36} />
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              {emptyStateMessage}
            </h2>
            <p className="mt-3 max-w-xl text-sm font-medium text-slate-500 dark:text-slate-400">
              No records are available from the API for {getCurrentMonthLabel()} right now. The dashboard will populate automatically once current month data is added.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Permisison redirect disabled as requested
  // if (!loading && !hasAccess) {
  //   return <Navigate to="/store/erp-indent" replace />;
  // }

  return (
    <div className="w-full px-1.5 py-4 sm:px-4 md:p-6 lg:p-8 space-y-5 md:space-y-8 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 sm:px-0">
        <div className="flex items-center gap-3.5 md:gap-4">
          <div className="p-2.5 md:p-3.5 rounded-2xl bg-red-600 shadow-xl shadow-red-200 dark:shadow-red-900/20 transform hover:scale-105 transition-transform duration-300 shrink-0">
            <LayoutDashboard className="text-white w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Store Dashboard
            </h1>
            <p className="text-[11px] md:text-sm text-slate-500 dark:text-slate-400 font-medium leading-snug">
              Real-time monitoring and analytics for Store &amp; Purchase
            </p>
          </div>
        </div>
      </div>

      {/* Hero Metrics Cards - Updated Grid to 5 columns on large screens */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 sm:gap-2 md:gap-4">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={() => openModal(card.type, card.title)}
            className={`group text-left relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br ${card.bgGradient} p-1.5 sm:p-5 md:p-6 shadow-lg ${card.shadowColor} hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer block w-full border-0 outline-none focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800`}
          >
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-1/4 -translate-y-1/4 scale-150 pointer-events-none">
              {card.icon}
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-xl sm:rounded-2xl ${card.iconBg} backdrop-blur-sm`}>
                  {card.icon}
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold bg-white/20 backdrop-blur-md px-2 py-1 rounded-full text-white/90">
                  <span>View</span>
                </div>
              </div>

              <div>
                <p className="text-white/80 font-medium text-[14px] sm:text-xs tracking-wide uppercase whitespace-normal leading-tight">{card.title}</p>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mt-1 mb-3 break-all">{card.value}</h3>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Target vs Actual Chart Section */}
      <Card className="rounded-3xl border-0 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <CardHeader className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400`}>
                <TrendingUp size={20} />
              </div>
              <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Purchase Target vs Actual</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-1 sm:p-2 md:p-4">
          <div className="w-full h-[400px] sm:h-[550px]">
            <Chart
              options={targetActualChartOptions}
              series={targetActualChartData.series}
              type="bar"
              height="100%"
              width="100%"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bottom Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {/* Bottom Analytics Section - Category Wise Breakdown */}
        {[
          { title: 'Indent', type: 'divIndent', data: categoryChartsData.indent, color: '#10b981', label: 'Indents' },
          { title: 'PO', type: 'divPO', data: categoryChartsData.po, color: '#f59e0b', label: 'PO Value' },
          { title: 'GRN', type: 'divGRN', data: categoryChartsData.grn, color: '#3b82f6', label: 'GRN Value' },
          { title: 'Issue', type: 'divIssue', data: categoryChartsData.issue, color: '#4f46e5', label: 'Issue Value' }
        ].map((cat, idx) => (
          <Card key={cat.type} className="rounded-3xl border-0 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 h-full overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-900/5 hover:-translate-y-1">
            <CardHeader className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400`}>
                    <BarChart3 size={20} />
                  </div>
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">{cat.title}</CardTitle>
                </div>

                <div className="flex items-center gap-3 sm:gap-6 overflow-hidden">
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest leading-none mb-1">
                      Total {cat.title === 'Indent' ? 'Count' : 'Value'}
                    </span>
                    <span className="text-sm sm:text-xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
                      {Math.round(cat.data.total)}
                    </span>
                  </div>

                  <div className="text-[10px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 sm:py-2.5 rounded-full shrink-0 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-sm border border-indigo-100/50 dark:border-indigo-900/50"
                    onClick={() => openModal(cat.type, `Global ${cat.title}`)}>
                    View All
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-8">
              <div className="flex flex-row items-center justify-between gap-2 sm:gap-6 md:gap-8 lg:gap-12">
                <div className="relative w-[150px] h-[150px] sm:w-[170px] sm:h-[170px] md:w-56 md:h-56 flex-shrink-0 flex items-center justify-center -ml-2 sm:ml-0">
                  {cat.data.total > 0 ? (
                    <Chart
                      options={{
                        ...donorChartOptions,
                        colors: cat.data.labels.map((label: string, i: number) => {
                          const normalized = label.toUpperCase().trim();
                          if (/COMMON|CORPORATE|CORP/i.test(normalized)) return '#ef4444';
                          const palette = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];
                          return palette[i % palette.length];
                        }),
                        labels: cat.data.labels,
                        tooltip: {
                          enabled: true,
                          followCursor: true,
                          y: { formatter: (val: number) => Math.round(val).toString() }
                        },
                        dataLabels: {
                          enabled: true,
                          formatter: (val: number) => Math.round(val) + "%",
                          style: { fontSize: '10px', fontWeight: 700, colors: ['#fff'] },
                          dropShadow: { enabled: false }
                        },
                        legend: { show: false },
                        plotOptions: {
                          pie: {
                            donut: {
                              size: '55%',
                              labels: {
                                total: { show: true, label: 'Total', formatter: () => Math.round(cat.data.total).toString(), fontSize: '10px', fontWeight: 600 },
                                value: { fontSize: '18px', fontWeight: 900, offsetY: 0, formatter: () => Math.round(cat.data.total).toString() }
                              }
                            }
                          }
                        }
                      }}
                      series={cat.data.series}
                      type="donut"
                      height="100%"
                      width="100%"
                      key={`${cat.type}-${JSON.stringify(cat.data.labels)}`}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-20">
                      <LayoutDashboard size={48} className="mb-2" />
                      <p className="text-xs font-bold font-sans">NO DATA AVAILABLE</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 w-full max-w-[220px] sm:max-w-[260px] md:max-w-xs overflow-y-auto max-h-[160px] sm:max-h-[220px] custom-scrollbar pr-1.5">
                  {cat.data.labels.map((label: string, i: number) => {
                    if (cat.data.series[i] === 0) return null;
                    return (
                      <div key={`${cat.type}-${label}`}
                        onClick={() => openModal(cat.type, `${label} ${cat.label} Details`, label)}
                        className="group flex flex-row items-center justify-between gap-2 px-3 py-2 sm:py-2.5 rounded-full sm:rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100/50 dark:border-slate-800/50 shadow-sm hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all cursor-pointer">
                        <div className="flex items-center gap-2 md:gap-2.5 flex-1 min-w-0 pr-1 overflow-hidden">
                          <div className={`w-2 h-2 rounded-full shrink-0`} style={{
                            backgroundColor: /COMMON|CORPORATE|CORP/i.test(label) ? '#ef4444' : (['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'][i % 11])
                          }} />
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{label}</span>
                        </div>
                        <span className="text-[11px] sm:text-xs font-black text-slate-800 dark:text-white shrink-0 group-hover:scale-110 transition-transform tabular-nums">
                          {Math.round(cat.data.series[i]).toString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <TopListCard title="All Products" data={allProducts} type="product" />
        <TopListCard title="All Vendors" data={allVendors} type="vendor" />

        {/* Vendor Feedback Section */}
        <div className="lg:col-span-2">
          <FeedbackSection feedbacks={feedbacks} loading={feedbacksLoading} />
        </div>
      </div>

      {/* Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent aria-describedby={undefined} className="flex flex-col gap-0 !z-[9999] top-[calc(50%+2.5rem)] h-[calc(100dvh-6.5rem)] max-h-[calc(100dvh-6.5rem)] w-[96vw] overflow-hidden rounded-[28px] border-0 p-0 shadow-2xl [&>button]:hidden md:top-[50%] md:h-[88vh] md:w-[90vw] md:max-h-[88vh] lg:h-[85vh] lg:w-[80vw] lg:max-w-[1200px]">
          <DialogHeader className="shrink-0 bg-indigo-600 px-4 py-3 text-white md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
                <div className="rounded-xl bg-white/20 p-2 shrink-0">
                  <LayoutDashboard size={20} className="md:w-6 md:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base font-bold md:text-2xl leading-tight">{modalTitle}</DialogTitle>
                  <DialogDescription className="sr-only">
                    Detailed view of {modalTitle} data and records.
                  </DialogDescription>
                </div>
                <DialogClose className="block sm:hidden shrink-0 rounded-full p-2 outline-none transition-colors hover:bg-white/20 ml-auto">
                  <X size={20} />
                </DialogClose>
              </div>

              <div className="flex min-w-0 items-center gap-2 md:max-w-md md:gap-3 w-full sm:w-auto">
                <div className="relative min-w-0 flex-1 sm:w-64 md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={16} />
                  <input
                    type="text"
                    placeholder="Search records..."
                    className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/50 outline-none transition-all focus:bg-white/20 focus:border-white/40"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                  />
                </div>
                <DialogClose className="hidden sm:block shrink-0 rounded-full p-2 outline-none transition-colors hover:bg-white/20">
                  <X size={20} />
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

          {(modalType === 'divIndent' || modalType === 'divPO' || modalType === 'divGRN' || modalType === 'divIssue') && (
            <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
              <div className="flex px-4 py-2 gap-2">
                {[...new Set(mergedDivisionData.map(d => d.division))].map((divName) => (
                  <button
                    key={divName}
                    onClick={() => handleTabChange(divName)}
                    className={`px-4 py-2 text-[12px] font-bold rounded-xl transition-all whitespace-nowrap ${selectedDivision === divName
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {divName}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex-1 overflow-auto p-0 bg-white dark:bg-slate-900">
            {modalLoading ? (
              <div className="flex flex-col items-center justify-center p-24 md:p-40 space-y-6">
                <div className="relative flex items-center justify-center scale-125">
                  {/* Outer spin track */}
                  <div className="absolute inset-0 rounded-full border-[3px] border-indigo-100 dark:border-indigo-900/30"></div>
                  {/* Spinning gradient border */}
                  <div className="absolute inset-0 rounded-full border-[3px] border-indigo-600 border-t-transparent border-r-transparent animate-spin"></div>
                  {/* Inner pulsing circle */}
                  <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center shadow-inner relative z-10">
                    <LayoutDashboard size={24} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
                  </div>
                  {/* Sparkle effects */}
                  <div className="absolute -top-1 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></div>
                  <div className="absolute -bottom-1 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" style={{ animationDelay: '400ms' }}></div>
                </div>

                <div className="flex flex-col items-center text-center space-y-1.5">
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">Syncing {modalTitle} Records</h3>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    <span className="animate-pulse">Retrieving comprehensive data structures</span>
                    <span className="flex gap-[3px]">
                      <span className="w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce"></span>
                      <span className="w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                  </div>
                </div>
              </div>
            ) : filteredModalRows.length > 0 ? (
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

                <div className="hidden flex-1 overflow-auto md:block" onScroll={handleMobileModalScroll}>
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 backdrop-blur-md shadow-sm z-10">
                      <tr className="text-[12px] font-black uppercase text-slate-900 dark:text-slate-100 tracking-widest">
                        {modalConfig?.headers?.map((h: string) => (
                          <th key={h} className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {mobileModalData.data.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-indigo-950/20 transition-colors group">
                          {modalConfig?.renderRow(item)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Infinite Scroll Indicator Stats */}
                <div className="hidden shrink-0 border-t bg-slate-50 p-3 dark:bg-slate-900 md:block">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-slate-500 sm:text-xs">
                      Showing <span className="text-indigo-600">{mobileModalData.data.length}</span> of <span className="text-indigo-600">{filteredModalRows.length}</span> items
                    </p>
                    {mobileVisibleCount < filteredModalRows.length && (
                      <span className="text-[11px] font-bold text-slate-400 italic animate-pulse">
                        Scroll down to load more...
                      </span>
                    )}
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
    <div className="overflow-hidden mb-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm hover:shadow-md transition-shadow">
      <div className={`h-1 w-full bg-gradient-to-r ${gradient}`}></div>
      <div className="px-3 py-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-[13px] font-black leading-tight text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              {title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="inline-flex items-center rounded bg-white dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500 shadow-sm border border-slate-200 dark:border-slate-700">
                #{index + 1}
              </span>
              {subtitle && subtitle !== "--" && (
                <span className="text-[10px] sm:text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                  {subtitle}
                </span>
              )}
              {meta && meta !== "--" && (
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {meta}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 px-3 py-2.5">
        {fields.map((field: any, fieldIndex: number) => (
          <div
            key={`${field.label}-${fieldIndex}`}
            className={`min-w-0 ${field.fullWidth ? "col-span-2 sm:col-span-3 border-t border-slate-50 dark:border-slate-800/50 pt-1 mt-0.5" : ""}`}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 mb-0.5">
              {field.label}
            </p>
            <p className={`text-[11px] font-bold leading-tight ${getModalFieldValueClasses(field.tone)}`} title={field.value}>
              {field.value}
            </p>
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

// ── Feedback Section ────────────────────────────────────────────────────────

function FeedbackSection({ feedbacks, loading }: { feedbacks: any[], loading: boolean }) {
  if (loading) {
    return <div className="animate-pulse bg-slate-200 dark:bg-slate-800 rounded-3xl h-64 w-full"></div>;
  }

  const validFeedbacks = (feedbacks || []).filter((fb: any) => fb && fb.Timestamp && String(fb.Timestamp).trim() !== "");

  const stats = useMemo(() => {
    if (validFeedbacks.length === 0) return null;

    const getStatus = (val: any) => {
      if (!val) return 'no';
      const v = String(val).trim().toLowerCase();
      if (v.includes("yes") || v.includes("हाँ") || v.includes("ha")) return 'yes';
      if (v.includes("sometimes") || v.includes("कभी-कभी") || v.includes("occasionally")) return 'sometimes';
      if (v.includes("maybe") || v.includes("शायद") || v.includes("not sure") || v.includes("possibly")) return 'maybe';
      return 'no';
    };

    const getNum = (val: any) => {
      const n = parseFloat(val);
      return isNaN(n) ? 0 : n;
    };

    const totals = {
      feedback: [] as number[],
      communication: [] as number[],
      satisfaction: [] as number[],
      payments: { yes: 0, no: 0, maybe: 0, sometimes: 0 },
      continue: { yes: 0, no: 0, maybe: 0, sometimes: 0 }
    };

    validFeedbacks.forEach(fb => {
      const f = getNum(fb["Feedback"]);
      if (f > 0) totals.feedback.push(f);

      const c = getNum(fb["How was our communication?"]);
      if (c > 0) totals.communication.push(c);

      const s = getNum(fb["How satisfied are you with our overall business relationship?"]);
      if (s > 0) totals.satisfaction.push(s);

      totals.payments[getStatus(fb["Did you receive payments on time?"])]++;
      totals.continue[getStatus(fb["Would you like to continue working with us?"])]++;
    });

    const avg = (arr: number[]) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "0.0";
    const percent = (obj: { yes: number, no: number, maybe: number, sometimes: number }) => {
      const total = validFeedbacks.length || 1;
      return {
        yes: Math.round((obj.yes / total) * 100),
        no: Math.round((obj.no / total) * 100),
        maybe: Math.round((obj.maybe / total) * 100),
        sometimes: Math.round((obj.sometimes / total) * 100),
      };
    };

    return {
      avgFeedback: avg(totals.feedback),
      avgCommunication: avg(totals.communication),
      avgSatisfaction: avg(totals.satisfaction),
      payments: percent(totals.payments),
      continue: percent(totals.continue)
    };
  }, [validFeedbacks]);

  const StarRating = ({ rating, size = 12 }: { rating: number, size?: number }) => {
    const r = parseFloat(String(rating));
    return (
      <div className="flex items-center gap-0.5 mt-1">
        {[...Array(5)].map((_, i) => {
          const fillAmount = Math.max(0, Math.min(1, r - i));
          return (
            <div key={i} className="relative leading-none">
              {/* Background Star (Gray) */}
              <Star
                size={size}
                className="text-slate-300 dark:text-slate-700"
              />
              {/* Foreground Star (Golden) with Clipping */}
              <div
                className="absolute top-0 left-0 overflow-hidden pointer-events-none"
                style={{ width: `${fillAmount * 100}%` }}
              >
                <Star
                  size={size}
                  className="fill-amber-400 text-amber-400"
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="rounded-3xl border-0 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden relative">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-3 rounded-xl bg-white/20 text-white backdrop-blur-sm">
              <Users size={16} />
            </div>
            <CardTitle className="text-lg font-bold text-white">Vendor Satisfaction Feedback</CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-2 md:p-4">
        {/* Statistics Summary Bar */}
        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 bg-transparent">
            <div className="p-2 md:p-4 border border-blue-200 dark:border-blue-900/40 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm shadow-blue-500/20 hover:shadow-blue-500/40">
              <p className="text-[11px] md:text-[13px] font-black uppercase text-slate-600 tracking-widest mb-1">Avg Feedback</p>
              <h4 className="text-xl md:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tighter group-hover:scale-110 transition-transform">{stats.avgFeedback}</h4>
              <StarRating rating={Number(stats.avgFeedback)} size={16} />
            </div>
            <div className="p-2 md:p-4 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/40">
              <p className="text-[11px] md:text-[13px] font-black uppercase text-slate-600 tracking-widest mb-1">Communication</p>
              <h4 className="text-xl md:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter group-hover:scale-110 transition-transform">{stats.avgCommunication}</h4>
              <StarRating rating={Number(stats.avgCommunication)} size={16} />
            </div>
            <div className="p-2 md:p-4 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm shadow-emerald-500/20 hover:shadow-emerald-500/40">
              <p className="text-[11px] md:text-[13px] font-black uppercase text-slate-600 tracking-widest mb-1">Satisfaction</p>
              <h4 className="text-xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter group-hover:scale-110 transition-transform">{stats.avgSatisfaction}</h4>
              <StarRating rating={Number(stats.avgSatisfaction)} size={16} />
            </div>
            <div className="p-2 md:p-4 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-white dark:hover:bg-slate-900 transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/30">
              <p className="text-[11px] md:text-[13px] font-black uppercase text-slate-600 tracking-widest mb-1">Payments On Time</p>
              <div className="flex flex-col items-center">
                <span className="text-md md:text-xl font-black text-emerald-500">Yes - {stats.payments.yes}%</span>
                <span className="text-[11px] md:text-[14px] font-extrabold text-rose-500 opacity-80">No - {stats.payments.no}%</span>
                <div className="flex flex-wrap justify-center gap-x-1.5 mt-0.5">
                  {stats.payments.sometimes > 0 && <span className="text-[11px] md:text-[14px] font-extrabold text-blue-500 opacity-80">Sometimes - {stats.payments.sometimes}%</span>}
                  {stats.payments.maybe > 0 && <span className="text-[11px] md:text-[14px] font-extrabold text-amber-500 opacity-80">Maybe Not - {stats.payments.maybe}%</span>}
                </div>
              </div>
            </div>
            <div className="p-2 md:p-4 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-white dark:hover:bg-slate-900 transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/30">
              <p className="text-[11px] md:text-[13px] font-black uppercase text-slate-600 tracking-widest mb-1">Continue Working</p>
              <div className="flex flex-col items-center">
                <span className="text-md md:text-xl font-black text-emerald-500">Yes - {stats.continue.yes}%</span>
                <span className="text-[11px] md:text-[14px] font-extrabold text-rose-500 opacity-80">No - {stats.continue.no}%</span>
                <div className="flex flex-wrap justify-center gap-x-1.5 mt-0.5">
                  {stats.continue.sometimes > 0 && <span className="text-[11px] md:text-[14px] font-extrabold text-blue-500 opacity-80">Sometimes - {stats.continue.sometimes}%</span>}
                  {stats.continue.maybe > 0 && <span className="text-[11px] md:text-[14px] font-extrabold text-amber-500 opacity-80">Maybe Not - {stats.continue.maybe}%</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile View: Cards */}
        <div className="md:hidden flex flex-col gap-2.5 p-2 max-h-[500px] overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">
          {validFeedbacks.map((fb: any, idx: number) => {
            const cardColors = [
              "bg-blue-50 text-blue-900 border-blue-100 shadow-blue-100/50 dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-100",
              "bg-emerald-50 text-emerald-900 border-emerald-100 shadow-emerald-100/50 dark:bg-emerald-900/20 dark:border-emerald-800/30 dark:text-emerald-100",
              "bg-purple-50 text-purple-900 border-purple-100 shadow-purple-100/50 dark:bg-purple-900/20 dark:border-purple-800/30 dark:text-purple-100",
              "bg-amber-50 text-amber-900 border-amber-100 shadow-amber-100/50 dark:bg-amber-900/20 dark:border-amber-800/30 dark:text-amber-100",
              "bg-rose-50 text-rose-900 border-rose-100 shadow-rose-100/50 dark:bg-rose-900/20 dark:border-rose-800/30 dark:text-rose-100",
              "bg-cyan-50 text-cyan-900 border-cyan-100 shadow-cyan-100/50 dark:bg-cyan-900/20 dark:border-cyan-800/30 dark:text-cyan-100"
            ];
            const colorClass = cardColors[idx % cardColors.length];

            const getStatus = (v: any) => {
              const str = String(v || '').toLowerCase();
              if (str.includes('yes') || str.includes('हाँ') || str.includes('ha')) return 'yes';
              if (str.includes('sometimes') || str.includes('कभी-कभी') || str.includes('occasionally')) return 'sometimes';
              if (str.includes('maybe') || str.includes('शायद') || str.includes('not sure') || str.includes('possibly')) return 'maybe';
              return 'no';
            };

            return (
              <div key={idx} className={`p-4 rounded-2xl border space-y-3 shadow-sm transition-all hover:-translate-y-0.5 ${colorClass}`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white text-[13px] uppercase tracking-wide truncate">{fb["Vendor Name"] || "Unknown"}</h4>
                    <p className="text-[12px] text-slate-500 font-medium truncate mt-0.5">{fb["Company Name"] || "—"}</p>
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-500 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0 shadow-sm">
                    {new Date(fb.Timestamp || Date.now()).toLocaleDateString('en-GB')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div className="col-span-1 bg-white dark:bg-slate-800 shadow-sm p-2 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center">
                    <p className="text-[10px] text-slate-500 font-extrabold uppercase mb-1">Feedback</p>
                    <span className="text-xs font-black text-blue-600">{fb["Feedback"] || "-"}</span>
                    {fb["Feedback"] && <StarRating rating={fb["Feedback"]} size={10} />}
                  </div>
                  <div className="col-span-1 bg-white dark:bg-slate-800 shadow-sm p-2 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center">
                    <p className="text-[10px] text-slate-500 font-extrabold uppercase mb-1">Communication</p>
                    <span className="text-xs font-black text-indigo-600">{fb["How was our communication?"] || "-"}</span>
                    {fb["How was our communication?"] && <StarRating rating={fb["How was our communication?"]} size={10} />}
                  </div>
                  <div className="col-span-1 bg-white dark:bg-slate-800 shadow-sm p-2 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center">
                    <p className="text-[10px] text-slate-500 font-extrabold uppercase mb-1">Satisfaction</p>
                    <span className="text-xs font-black text-emerald-600">{fb["How satisfied are you with our overall business relationship?"] || "-"}</span>
                    {fb["How satisfied are you with our overall business relationship?"] && <StarRating rating={fb["How satisfied are you with our overall business relationship?"]} size={10} />}
                  </div>

                  <div className="col-span-3 grid grid-cols-2 gap-2 mt-1">
                    <div className="bg-white dark:bg-slate-800 shadow-sm px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase">Payment on Time</p>
                      <span className={`text-[11px] font-black border-l-2 pl-2 ${getStatus(fb["Did you receive payments on time?"]) === 'yes' ? 'text-emerald-500 border-emerald-500' : getStatus(fb["Did you receive payments on time?"]) === 'sometimes' ? 'text-blue-500 border-blue-500' : getStatus(fb["Did you receive payments on time?"]) === 'maybe' ? 'text-amber-500 border-amber-500' : 'text-rose-500 border-rose-500'}`}>
                        {getStatus(fb["Did you receive payments on time?"]).toUpperCase()}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-800 shadow-sm px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase">Continue Working</p>
                      <span className={`text-[11px] font-black border-l-2 pl-2 ${getStatus(fb["Would you like to continue working with us?"]) === 'yes' ? 'text-emerald-500 border-emerald-500' : getStatus(fb["Would you like to continue working with us?"]) === 'sometimes' ? 'text-blue-500 border-blue-500' : getStatus(fb["Would you like to continue working with us?"]) === 'maybe' ? 'text-amber-500 border-amber-500' : 'text-rose-500 border-rose-500'}`}>
                        {getStatus(fb["Would you like to continue working with us?"]).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {fb["Any suggestions for us?"] && fb["Any suggestions for us?"].trim() !== "" && (
                  <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-300 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 italic font-medium leading-relaxed">
                    "{fb["Any suggestions for us?"]}"
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block max-h-[500px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/95 backdrop-blur-md shadow-sm z-10">
              <tr className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em]">
                <th className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 w-28">Date</th>
                <th className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 w-48">Vendor</th>
                <th className="px-3 py-4 border-b border-slate-100 dark:border-slate-700 text-center w-24">Feedback</th>
                <th className="px-3 py-4 border-b border-slate-100 dark:border-slate-700 text-center w-24">Commu.</th>
                <th className="px-3 py-4 border-b border-slate-100 dark:border-slate-700 text-center w-24">Satisfy</th>
                <th className="px-3 py-4 border-b border-slate-100 dark:border-slate-700 text-center w-28">Payments On Time</th>
                <th className="px-3 py-4 border-b border-slate-100 dark:border-slate-700 text-center w-28">Continue Working</th>
                <th className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">Suggestions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {validFeedbacks.map((fb: any, idx: number) => {
                const getStatus = (v: any) => {
                  const str = String(v || '').toLowerCase();
                  if (str.includes('yes') || str.includes('हाँ') || str.includes('ha')) return 'yes';
                  if (str.includes('sometimes') || str.includes('कभी-कभी') || str.includes('occasionally')) return 'sometimes';
                  if (str.includes('maybe') || str.includes('शायद') || str.includes('not sure') || str.includes('possibly')) return 'maybe';
                  return 'no';
                };

                return (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-indigo-950/20 transition-colors group">
                    <td className="px-6 py-5 font-mono font-bold text-slate-500 dark:text-slate-500 text-[11px]">
                      {new Date(fb.Timestamp || Date.now()).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-extrabold text-slate-900 dark:text-white text-[13px] leading-snug truncate uppercase tracking-widest">{fb["Vendor Name"]}</p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5 truncate uppercase">{fb["Company Name"] || "—"}</p>
                    </td>
                    <td className="px-3 py-5 text-center">
                      <div className="inline-flex flex-col items-center justify-center min-w-[32px] px-2 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-black text-[13px] border border-blue-100 dark:border-blue-800/50">
                        <span>{fb["Feedback"] || "-"}</span>
                        {fb["Feedback"] && <StarRating rating={fb["Feedback"]} size={10} />}
                      </div>
                    </td>
                    <td className="px-3 py-5 text-center">
                      <div className="inline-flex flex-col items-center justify-center min-w-[32px] px-2 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-black text-[13px] border border-indigo-100 dark:border-indigo-800/50">
                        <span>{fb["How was our communication?"] || "-"}</span>
                        {fb["How was our communication?"] && <StarRating rating={fb["How was our communication?"]} size={10} />}
                      </div>
                    </td>
                    <td className="px-3 py-5 text-center">
                      <div className="inline-flex flex-col items-center justify-center min-w-[32px] px-2 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-black text-[13px] border border-emerald-100 dark:border-emerald-800/50">
                        <span>{fb["How satisfied are you with our overall business relationship?"] || "-"}</span>
                        {fb["How satisfied are you with our overall business relationship?"] && <StarRating rating={fb["How satisfied are you with our overall business relationship?"]} size={10} />}
                      </div>
                    </td>
                    <td className="px-3 py-5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${getStatus(fb["Did you receive payments on time?"]) === 'yes'
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : getStatus(fb["Did you receive payments on time?"]) === 'sometimes'
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          : getStatus(fb["Did you receive payments on time?"]) === 'maybe'
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                        }`}>
                        {getStatus(fb["Did you receive payments on time?"])}
                      </span>
                    </td>
                    <td className="px-3 py-5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${getStatus(fb["Would you like to continue working with us?"]) === 'yes'
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : getStatus(fb["Would you like to continue working with us?"]) === 'sometimes'
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          : getStatus(fb["Would you like to continue working with us?"]) === 'maybe'
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                        }`}>
                        {getStatus(fb["Would you like to continue working with us?"])}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 italic font-medium">
                        {fb["Any suggestions for us?"] ? `"${fb["Any suggestions for us?"]}"` : "—"}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {validFeedbacks.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400">
            <Users size={48} className="opacity-20 mb-4" />
            <p className="font-bold text-sm text-slate-500">No feedback available right now.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
