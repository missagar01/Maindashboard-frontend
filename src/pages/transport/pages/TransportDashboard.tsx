import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BadgeIndianRupee,
  CalendarClock,
  ChevronDown,
  FileClock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Truck,
  ArrowRightLeft,
  Activity,
  Timer,
  Zap,
  BarChart3,
  PieChart as PieIcon,
  Navigation
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getLrBiltyRegister } from "../../../api/transport/reportApi";
import { getHandoverSummary, getTakeoverSummary } from "../../../api/transport/analyticsApi";
import { useTransportAnalyticsSection } from "../hooks/useTransportAnalyticsSection";
import { AnalyticsKpiCard } from "../components/AnalyticsKpiCard";
import { AnalyticsChartContainer } from "../components/AnalyticsChartContainer";
import { formatCurrency, formatNumber } from "../analyticsFormatters";
import {
  AnalyticsChartSkeleton,
  AnalyticsEmptyState,
  AnalyticsErrorState
} from "../components/AnalyticsStates";

type TransportLrBiltyRecord = Record<string, any>;

const chartPalette = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6", "#06b6d4"];

const safeString = (value: unknown) => String(value ?? "").trim();

const SelectField = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-w-[140px] appearance-none rounded-xl border border-slate-200 bg-white px-3 py-1.5 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none transition hover:bg-slate-50 focus:border-indigo-300 shadow-sm"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
  </div>
);

export default function TransportDashboard() {
  const takeover = useTransportAnalyticsSection(getTakeoverSummary);
  const handover = useTransportAnalyticsSection(getHandoverSummary);

  const [records, setRecords] = useState<TransportLrBiltyRecord[]>([]);
  const [loadingBilty, setLoadingBilty] = useState(true);
  const [errorBilty, setErrorBilty] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");

  const fetchBiltyData = async () => {
    try {
      setLoadingBilty(true);
      setErrorBilty("");
      const response = await getLrBiltyRegister({ limit: 2000 });
      setRecords(response.records);
    } catch (err: any) {
      setErrorBilty(err.message || "Failed to fetch operational data");
    } finally {
      setLoadingBilty(false);
    }
  };

  useEffect(() => {
    fetchBiltyData();
  }, []);

  const branchOptions = useMemo(() => {
    const branches = Array.from(new Set(records.map(r => safeString(r.branch_name)).filter(Boolean))).sort();
    return [{ label: "ALL BRANCHES", value: "all" }, ...branches.map(b => ({ label: b.toUpperCase(), value: b }))];
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (selectedBranch === "all") return records;
    return records.filter(r => safeString(r.branch_name) === selectedBranch);
  }, [records, selectedBranch]);

  const assetDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    filteredRecords.forEach(r => {
      const key = safeString(r.vehicle_type) || "Common";
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([label, amount]) => ({ label, amount })).slice(0, 6);
  }, [filteredRecords]);

  const revenueData = useMemo(() => {
    const totalFreight = filteredRecords.reduce((sum, r) => sum + (Number(r.freight_amount) || 0), 0);
    const totalAdvance = filteredRecords.reduce((sum, r) => sum + (Number(r.advance_cash_amount || r.advance_diesel_amount) || 0), 0);
    const totalTax = filteredRecords.reduce((sum, r) => sum + (Number(r.total_tax_amount) || 0), 0);

    return [
      { name: "Freight", value: totalFreight || 10, color: "#6366f1" },
      { name: "Advance", value: totalAdvance || 5, color: "#10b981" },
      { name: "Handling", value: totalTax || 2, color: "#f59e0b" },
    ];
  }, [filteredRecords]);

  const pipelineItems = useMemo(() => {
    const total = filteredRecords.length;
    const pod = filteredRecords.filter(r => (r.lr_bilty_status || "").toUpperCase() === "POD_PREPARED").length;
    const freight = filteredRecords.filter(r => r.is_freight_advice_prepared || r.freight_voucher_id).length;
    const service = filteredRecords.filter(r => r.is_service_bill_prepared || r.service_bill_id).length;

    return [
      { label: "LR ISSUED", count: total, color: "#6366f1", icon: Zap },
      { label: "POD SYNCED", count: pod, color: "#06b6d4", icon: ShieldCheck },
      { label: "FREIGHT", count: freight, color: "#f59e0b", icon: BadgeIndianRupee },
      { label: "SERVICE", count: service, color: "#10b981", icon: FileClock },
    ];
  }, [filteredRecords]);

  const recentTakeovers = useMemo(() => takeover.data?.recentTakeovers?.slice(0, 4) ?? [], [takeover.data]);

  return (
    <div className="space-y-6 py-2">
      {/* Mini Header Integration */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-indigo-500" />
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">Transport Hub</h1>
        </div>
        <div className="flex items-center gap-2">
          <SelectField value={selectedBranch} onChange={setSelectedBranch} options={branchOptions} />
          <button
            onClick={() => { fetchBiltyData(); takeover.retry(); handover.retry(); }}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${(loadingBilty || takeover.loading || handover.loading) ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Command Center */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 px-1">
        <AnalyticsKpiCard
          label="Takeover"
          value={formatNumber(takeover.data?.takeoversThisMonth ?? 0)}
          tone="blue"
        />
        <AnalyticsKpiCard
          label="Handover"
          value={formatNumber(handover.data?.handoversThisMonth ?? 0)}
          tone="emerald"
        />
        <AnalyticsKpiCard
          label="Bilty"
          value={formatNumber(filteredRecords.length)}
          tone="violet"
        />
        <AnalyticsKpiCard
          label="Deductions"
          value={formatCurrency(takeover.data?.totalDeductionsThisMonth ?? 0)}
          tone="amber"
        />
        <AnalyticsKpiCard
          label="Avg Duration"
          value={`${takeover.data?.avgAssignmentDurationDays ?? 0} Days`}
          tone="slate"
        />
      </div>

      {/* Primary Visual Row */}
      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsChartContainer variant="flat" title="Takeover Trends" subtitle="Daily velocity analysis.">
          <div className="h-[280px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={takeover.data?.activityTrend ?? []} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
                <defs>
                  <linearGradient id="tkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="4 4" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 800 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 800 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                  itemStyle={{ fontWeight: 800, color: '#1e293b' }}
                />
                <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={4} fill="url(#tkGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsChartContainer>

        <AnalyticsChartContainer variant="flat" title="Handover Momentum" subtitle="Movement Variance.">
          <div className="h-[280px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={handover.data?.activityTrend ?? []} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="4 4" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 800 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 800 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                  itemStyle={{ fontWeight: 800, color: '#10b981' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={4}
                  dot={{ r: 5, fill: '#10b981', strokeWidth: 3, stroke: '#fff' }}
                  activeDot={{ r: 8, strokeWidth: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsChartContainer>
      </div>

      {/* Round Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <AnalyticsChartContainer variant="flat" title="Revenue Mix" subtitle="Freight components.">
          <div className="flex h-[260px] items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {revenueData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsChartContainer>

        <AnalyticsChartContainer variant="flat" title="Recent Drivers" subtitle="Leaderboard.">
          <div className="h-[260px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={handover.data?.topEmployees?.slice(0, 5) ?? []} layout="vertical" barSize={12}>
                <XAxis type="number" hide />
                <YAxis dataKey="employeeName" type="category" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} width={80} />
                <Bar dataKey="handoverCount" fill="#ec4899" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsChartContainer>

        <AnalyticsChartContainer variant="flat" title="Utilization" subtitle="Fleet Score.">
          <div className="flex h-[260px] items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                { s: 'OPS', A: pipelineItems[0].count ? (pipelineItems[1].count / pipelineItems[0].count) * 100 : 0 },
                { s: 'FIN', A: pipelineItems[0].count ? (pipelineItems[2].count / pipelineItems[0].count) * 100 : 0 },
                { s: 'SVC', A: pipelineItems[0].count ? (pipelineItems[3].count / pipelineItems[0].count) * 100 : 0 },
                { s: 'USE', A: (assetDistribution.length / 10) * 100 },
                { s: 'REL', A: 90 }
              ]}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="s" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} />
                <Radar name="Fleet" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsChartContainer>
      </div>

      {/* Final Row: Workflow + Distribution */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Pipeline Status</h2>
          <div className="grid gap-3">
            {pipelineItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${item.color}10`, color: item.color }}>
                  <item.icon className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black tracking-widest text-slate-400">{item.label}</span>
                    <span className="text-base font-black text-slate-900">{formatNumber(item.count)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Recent Takeovers</h2>
          <div className="grid gap-3">
            {recentTakeovers.length > 0 ? recentTakeovers.map((tk: any, i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-50 bg-white p-3 shadow-sm hover:border-blue-100 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                  <Navigation className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">{tk.vehicleNo}</p>
                  <p className="text-[10px] font-bold text-slate-400 truncate">{tk.driverName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-blue-500 uppercase">Active</p>
                </div>
              </div>
            )) : <div className="h-20 flex items-center justify-center rounded-2xl border border-dashed text-[10px] font-bold text-slate-400">No Recent Takeovers</div>}
          </div>
        </div>

        <AnalyticsChartContainer variant="flat" title="Distribution" subtitle="By vehicle type.">
          <div className="h-[240px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetDistribution} margin={{ left: -25 }} barSize={18}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} />
                <Tooltip />
                <Bar dataKey="amount" radius={[5, 5, 0, 0]}>
                  {assetDistribution.map((_, i) => <Cell key={`b-${i}`} fill={chartPalette[i % chartPalette.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsChartContainer>
      </div>
    </div>
  );
}