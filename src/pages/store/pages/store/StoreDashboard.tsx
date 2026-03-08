// Store Dashboard - Default Dashboard (Same as StoreFMS)
import { useEffect, useState } from "react";
import { storeApi } from "@/api/store/storeSystemApi";
import { ClipboardList, LayoutDashboard, PackageCheck, Truck, Warehouse, FileText, TrendingUp, BarChart3, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import Loading from "./Loading";

type DashboardApiResponse = {
  success: boolean;
  data: {
    // Status-based metrics
    totalIndents: number;
    completedIndents: number;
    pendingIndents: number;
    upcomingIndents: number;
    overdueIndents: number;

    // Progress percentages
    overallProgress: number;
    completedPercent: number;
    pendingPercent: number;
    upcomingPercent: number;
    overduePercent: number;

    // Quantity metrics
    totalIndentedQuantity: number;
    totalPurchaseOrders: number;
    totalPurchasedQuantity: number;
    totalIssuedQuantity: number;
    outOfStockCount: number;
    topPurchasedItems: {
      itemName: string;
      orderCount: number;
      totalOrderQty: number;
    }[];
    topVendors: {
      vendorName: string;
      uniquePoCount: number;
      totalItems: number;
    }[];
  };
};

type RepairGatePassCounts = {
  success: boolean;
  data: {
    pending: number;
    history: number;
  };
};

export default function StoreDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardApiResponse['data'] | null>(null);
  const [repairGatePassCounts, setRepairGatePassCounts] = useState<{ pending: number; history: number }>({ pending: 0, history: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      setLoading(true);
      try {
        // Load dashboard data and repair gate pass counts in parallel
        const [dashboardRes, gatePassRes] = await Promise.allSettled([
          storeApi.getStoreIndentDashboard() as Promise<DashboardApiResponse>,
          storeApi.getRepairGatePassCounts() as Promise<RepairGatePassCounts>,
        ]);

        if (!active) return;

        // Handle dashboard data
        if (dashboardRes.status === 'fulfilled' && dashboardRes.value) {
          const res = dashboardRes.value;
          if (res.success && res.data) {
            setDashboardData(res.data);
            setError(null);
          } else {
            throw new Error('No dashboard data');
          }
        } else {
          throw (dashboardRes.status === "rejected" ? dashboardRes.reason : null) || new Error('No dashboard data');
        }

        // Handle repair gate pass counts (don't fail dashboard if this fails)
        if (gatePassRes.status === 'fulfilled' && gatePassRes.value) {
          const res = gatePassRes.value;
          if (res.success && res.data) {
            setRepairGatePassCounts(res.data);
          } else if (res.data) {
            setRepairGatePassCounts(res.data);
          }
        } else {
          console.warn(
            'Failed to load repair gate pass counts:',
            gatePassRes.status === "rejected" ? gatePassRes.reason : null
          );
          setRepairGatePassCounts({ pending: 0, history: 0 });
        }
      } catch (err: unknown) {
        console.error('Failed to load dashboard', err);
        if (active) {
          setError('Unable to fetch dashboard data right now.');
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



  const cards = [
    {
      title: 'Total Indents',
      icon: <ClipboardList size={18} />,
      value: dashboardData?.totalIndents ?? '—',
      sublabel: 'Indented Quantity',
      subvalue: dashboardData ? dashboardData.totalIndentedQuantity.toLocaleString() : '—',
      bg: 'from-indigo-50 via-indigo-100 to-indigo-50 dark:from-indigo-950 dark:via-indigo-900 dark:to-indigo-950',
      border: 'border-indigo-200 dark:border-indigo-800',
      text: 'text-indigo-700 dark:text-indigo-300',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      title: 'Total Purchases',
      icon: <Truck size={18} />,
      value: dashboardData?.totalPurchaseOrders ?? '—',
      sublabel: 'Purchased Quantity',
      subvalue: dashboardData ? dashboardData.totalPurchasedQuantity.toLocaleString() : '—',
      bg: 'from-emerald-50 via-emerald-100 to-emerald-50 dark:from-emerald-950 dark:via-emerald-900 dark:to-emerald-950',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Total Issued',
      icon: <PackageCheck size={18} />,
      value: dashboardData?.totalIssuedQuantity ?? '—',
      sublabel: 'Out Quantity',
      subvalue: dashboardData?.totalIssuedQuantity
        ? dashboardData.totalIssuedQuantity.toLocaleString()
        : '—',
      bg: 'from-amber-50 via-amber-100 to-amber-50 dark:from-amber-950 dark:via-amber-900 dark:to-amber-950',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      iconBg: 'bg-amber-100 dark:bg-amber-900',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Out of Stock',
      icon: <Warehouse size={18} />,
      value: dashboardData?.outOfStockCount ?? '—',
      sublabel: 'Low in Stock',
      subvalue: dashboardData ? dashboardData.outOfStockCount.toLocaleString() : '—',
      bg: 'from-rose-50 via-rose-100 to-rose-50 dark:from-rose-950 dark:via-rose-900 dark:to-rose-950',
      border: 'border-rose-200 dark:border-rose-800',
      text: 'text-rose-700 dark:text-rose-300',
      iconBg: 'bg-rose-100 dark:bg-rose-900',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
    {
      title: 'Repair Pending',
      icon: <FileText size={18} />,
      value: repairGatePassCounts.pending ?? '—',
      sublabel: 'Gate Pass Pending',
      subvalue: repairGatePassCounts.pending.toLocaleString() ?? '—',
      bg: 'from-violet-50 via-violet-100 to-violet-50 dark:from-violet-950 dark:via-violet-900 dark:to-violet-950',
      border: 'border-violet-200 dark:border-violet-800',
      text: 'text-violet-700 dark:text-violet-300',
      iconBg: 'bg-violet-100 dark:bg-violet-900',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      title: 'Repair History',
      icon: <FileText size={18} />,
      value: repairGatePassCounts.history ?? '—',
      sublabel: 'Gate Pass Received',
      subvalue: repairGatePassCounts.history.toLocaleString() ?? '—',
      bg: 'from-cyan-50 via-cyan-100 to-cyan-50 dark:from-cyan-950 dark:via-cyan-900 dark:to-cyan-950',
      border: 'border-cyan-200 dark:border-cyan-800',
      text: 'text-cyan-700 dark:text-cyan-300',
      iconBg: 'bg-cyan-100 dark:bg-cyan-900',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
    },
  ];

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
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">Error loading dashboard</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 min-h-screen">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
          <LayoutDashboard size={46} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400">
            Store Purchase
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Live insights from the store indent API
          </p>
        </div>
      </div>

      {/* Status Cards (like housekeeping) - Top Section */}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] mt-6">
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <Card
                key={card.title}
                className={`rounded-2xl bg-gradient-to-br ${card.bg} border border-slate-200 shadow-lg transition-all duration-300`}
              >
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {card.title}
                    </p>
                    <div
                      className={`p-2 rounded-lg border border-white/40 ${card.iconBg}`}
                    >
                      <div className={card.iconColor}>{card.icon}</div>
                    </div>
                  </div>
                  <p className={`text-4xl font-bold ${card.text}`}>{card.value}</p>
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-white/60">
                    <p className="text-slate-700 dark:text-slate-200">{card.sublabel}</p>
                    <p className={`font-semibold ${card.text}`}>{card.subvalue}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-lg">
          <CardHeader className="bg-white/80 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100">
                <BarChart3 className="text-blue-600" size={20} />
              </div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Overall Progress
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="relative w-48 h-48 mx-auto md:mx-0">
                <svg className="transform -rotate-90 w-48 h-48">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="currentColor"
                    strokeWidth="16"
                    fill="none"
                    className="text-slate-200"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="currentColor"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${(dashboardData?.completedPercent || 0) * 5.026} 502.6`}
                    className="text-green-500"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="currentColor"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${(dashboardData?.pendingPercent || 0) * 5.026} 502.6`}
                    strokeDashoffset={`-${(dashboardData?.completedPercent || 0) * 5.026}`}
                    className="text-orange-500"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="currentColor"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${(dashboardData?.upcomingPercent || 0) * 5.026} 502.6`}
                    strokeDashoffset={`-${((dashboardData?.completedPercent || 0) + (dashboardData?.pendingPercent || 0)) * 5.026}`}
                    className="text-gray-400"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="currentColor"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${(dashboardData?.overduePercent || 0) * 5.026} 502.6`}
                    strokeDashoffset={`-${((dashboardData?.completedPercent || 0) + (dashboardData?.pendingPercent || 0) + (dashboardData?.upcomingPercent || 0)) * 5.026}`}
                    className="text-rose-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-3xl font-bold text-slate-900">
                    {dashboardData?.overallProgress?.toFixed(1) ?? 0}%
                  </p>
                  <p className="text-sm text-slate-500">Overall</p>
                </div>
              </div>
              <div className="space-y-3 flex-1">
                {[
                  {
                    label: "Total Indents",
                    color: "bg-indigo-500",
                    value: dashboardData?.totalIndents ?? 0,
                  },
                  {
                    label: "Total Purchases",
                    color: "bg-emerald-500",
                    value: dashboardData?.totalPurchaseOrders ?? 0,
                  },
                  {
                    label: "Total Issued",
                    color: "bg-amber-500",
                    value: dashboardData?.totalIssuedQuantity ?? 0,
                  },
                  {
                    label: "Out of Stock",
                    color: "bg-rose-500",
                    value: dashboardData?.outOfStockCount ?? 0,
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex w-3 h-3 rounded-full ${item.color}`}></span>
                      <span className="text-sm font-medium text-slate-600">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {typeof item.value === "number"
                        ? item.value.toLocaleString("en-IN")
                        : item.value ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Original Metric Cards */}


      {/* Progress Reports Section */}
      <Card className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <BarChart3 className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <CardTitle className="text-xl font-bold text-gray-800 dark:text-gray-200">Progress Reports</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Purchase Completion Rate */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="text-indigo-600 dark:text-indigo-400" size={18} />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Purchase Completion</span>
                </div>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {dashboardData && dashboardData.totalIndents > 0
                    ? Math.round((dashboardData.totalPurchaseOrders / dashboardData.totalIndents) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${dashboardData && dashboardData.totalIndents > 0
                      ? Math.min((dashboardData.totalPurchaseOrders / dashboardData.totalIndents) * 100, 100)
                      : 0}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Purchased: {dashboardData?.totalPurchaseOrders ?? 0}</span>
                <span>Indented: {dashboardData?.totalIndents ?? 0}</span>
              </div>
            </div>

            {/* Stock Utilization */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={18} />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Stock Utilization</span>
                </div>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {dashboardData && dashboardData.totalPurchasedQuantity > 0
                    ? Math.round((dashboardData.totalIssuedQuantity / dashboardData.totalPurchasedQuantity) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${dashboardData && dashboardData.totalPurchasedQuantity > 0
                      ? Math.min((dashboardData.totalIssuedQuantity / dashboardData.totalPurchasedQuantity) * 100, 100)
                      : 0}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Issued: {dashboardData?.totalIssuedQuantity?.toLocaleString() ?? 0}</span>
                <span>Purchased: {dashboardData?.totalPurchasedQuantity?.toLocaleString() ?? 0}</span>
              </div>
            </div>

            {/* Repair Gate Pass Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="text-violet-600 dark:text-violet-400" size={18} />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gate Pass Progress</span>
                </div>
                <span className="text-lg font-bold text-violet-600 dark:text-violet-400">
                  {repairGatePassCounts.pending + repairGatePassCounts.history > 0
                    ? Math.round((repairGatePassCounts.history / (repairGatePassCounts.pending + repairGatePassCounts.history)) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-violet-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${repairGatePassCounts.pending + repairGatePassCounts.history > 0
                      ? Math.min((repairGatePassCounts.history / (repairGatePassCounts.pending + repairGatePassCounts.history)) * 100, 100)
                      : 0}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Received: {repairGatePassCounts.history}</span>
                <span>Total: {repairGatePassCounts.pending + repairGatePassCounts.history}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="min-h-[280px] bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-xl font-bold text-gray-800 dark:text-gray-200">Top Purchased Products</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {dashboardData?.topPurchasedItems && dashboardData.topPurchasedItems.length > 0 ? (
              <div className="space-y-2">
                {dashboardData.topPurchasedItems.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <span className="text-sm font-medium truncate text-gray-800 dark:text-gray-200">{item.itemName}</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{item.orderCount} orders</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Qty: {item.totalOrderQty?.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[280px] bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-xl font-bold text-gray-800 dark:text-gray-200">Top Vendors</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {dashboardData?.topVendors && dashboardData.topVendors.length > 0 ? (
              <div className="space-y-2">
                {dashboardData.topVendors.slice(0, 10).map((vendor, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div>
                      <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{vendor.vendorName}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Order Qty: {vendor.totalItems.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{vendor.uniquePoCount} Orders</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Items: {vendor.totalItems.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
