import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeIndianRupee,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from "../analyticsFormatters";
import type {
  TakeoverRecentRecord,
  TakeoverSummary,
} from "../analyticsTypes";
import { AnalyticsChartContainer } from "../components/AnalyticsChartContainer";
import { AnalyticsKpiCard } from "../components/AnalyticsKpiCard";
import {
  AnalyticsResponsiveTable,
  type AnalyticsTableColumn,
} from "../components/AnalyticsResponsiveTable";
import {
  AnalyticsChartSkeleton,
  AnalyticsEmptyState,
  AnalyticsErrorState,
  AnalyticsKpiGridSkeleton,
  AnalyticsTableSkeleton,
} from "../components/AnalyticsStates";

const tooltipFormatter = (value: number) => [formatNumber(value), "Count"];

export const TakeoverSummaryDashboard = ({
  data,
  loading,
  error,
  onRetry,
}: {
  data: TakeoverSummary | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  const columns = useMemo<AnalyticsTableColumn<TakeoverRecentRecord>[]>(
    () => [
      {
        key: "vehicleNo",
        header: "Vehicle No",
        cell: (row) => (
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 border border-blue-100/50">
            {row.vehicleNo}
          </span>
        ),
      },
      {
        key: "driverName",
        header: "Driver Name",
        cell: (row) => (
          <span className="font-semibold text-slate-700">{row.driverName}</span>
        ),
      },
      {
        key: "takeoverDate",
        header: "Takeover Date",
        cell: (row) => (
          <span className="text-slate-500 font-medium">{formatDate(row.takeoverDate)}</span>
        ),
      },
      {
        key: "processedBy",
        header: "Processed By",
        cell: (row) => (
          <span className="text-slate-600 font-medium">{row.processedBy}</span>
        ),
      },
    ],
    []
  );

  if (loading && !data) {
    return (
      <div className="space-y-8">
        <AnalyticsKpiGridSkeleton cards={3} />
        <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
          <AnalyticsChartSkeleton />
          <AnalyticsChartSkeleton />
        </div>
        <AnalyticsTableSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <AnalyticsErrorState
        title="Takeover analytics unavailable"
        description={error}
        onRetry={onRetry}
      />
    );
  }

  if (!data) {
    return (
      <AnalyticsEmptyState
        title="No takeover analytics available"
        description="Takeover summary data will appear here once the transport analytics API starts returning records."
      />
    );
  }

  return (
    <div className="space-y-10 py-2">
      <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-3">
        <AnalyticsKpiCard
          label="Takeovers This Month"
          value={formatNumber(data.takeoversThisMonth)}
          icon={ShieldCheck}
          tone="blue"
        />
        <AnalyticsKpiCard
          label="Total Deductions"
          value={formatCurrency(data.totalDeductionsThisMonth)}
          icon={BadgeIndianRupee}
          tone="amber"
        />
        <AnalyticsKpiCard
          label="Avg Assignment Duration"
          value={`${formatNumber(data.avgAssignmentDurationDays)} days`}
          icon={CalendarClock}
          tone="emerald"
        />
      </div>

      <div className="grid gap-12 xl:grid-cols-[1.55fr_1fr]">
        <AnalyticsChartContainer
          variant="flat"
          title="Takeover Activity Trend"
          subtitle="Recent takeover volume progression across the selected reporting window."
          flushOnMobile
        >
          {data.activityTrend.length === 0 ? (
            <AnalyticsEmptyState
              title="No activity trend available"
              description="The takeover trend chart will render once date wise counts are returned by the API."
            />
          ) : (
            <div className="h-[270px] min-w-0 sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.activityTrend}
                  margin={{ top: 8, right: 8, bottom: 0, left: isMobile ? -16 : 0 }}
                >
                  <defs>
                    <linearGradient id="takeoverTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={isMobile ? 20 : 12}
                    tick={{ fill: "#64748b", fontSize: isMobile ? 10 : 12, fontWeight: 500 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={isMobile ? 24 : 35}
                    tick={{ fill: "#64748b", fontSize: isMobile ? 10 : 12, fontWeight: 500 }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                    formatter={tooltipFormatter} 
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#2563eb"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#takeoverTrendFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </AnalyticsChartContainer>

        <AnalyticsChartContainer
          variant="flat"
          title="Deduction Breakdown"
          subtitle="Amount wise breakdown of common deduction drivers this month."
          flushOnMobile
        >
          {data.deductionBreakdown.length === 0 ? (
            <AnalyticsEmptyState
              title="No deductions recorded"
              description="If the deduction breakdown array is empty, this section stays clean and intentionally blank."
            />
          ) : (
            <div className="space-y-6">
              <div className="h-[240px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.deductionBreakdown}
                    margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
                  >
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [formatCurrency(value), "Amount"]} 
                    />
                    <Bar dataKey="amount" fill="#f59e0b" radius={[8, 8, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid gap-3">
                {data.deductionBreakdown.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-200 hover:bg-amber-50/30"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-900">{item.label}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        {item.count ? `${formatNumber(item.count)} incidents` : "Total value tracked"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AnalyticsChartContainer>
      </div>

      <AnalyticsResponsiveTable
        variant="flat"
        title="Recent Takeovers"
        subtitle="Latest processed takeover records for operations review."
        columns={columns}
        rows={data.recentTakeovers}
        emptyTitle="No recent takeovers available"
        emptyDescription="The recent takeover table will populate once records are returned from the summary API."
        flushOnMobile
      />
    </div>

  );
};
