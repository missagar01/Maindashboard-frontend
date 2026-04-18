import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowLeftRight,
  Clock3,
  TimerReset,
} from "lucide-react";
import {
  formatNumber,
  formatPercent,
} from "../analyticsFormatters";
import type {
  FrequentSwitcher,
  HandoverSummary,
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

export const HandoverSummaryDashboard = ({
  data,
  loading,
  error,
  onRetry,
}: {
  data: HandoverSummary | null;
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

  const frequentSwitcherColumns = useMemo<AnalyticsTableColumn<FrequentSwitcher>[]>(
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
        key: "handovers",
        header: "Handovers",
        cell: (row) => (
          <span className="font-black text-slate-900">{formatNumber(row.handovers)}</span>
        ),
      },
      {
        key: "lastDriver",
        header: "Last Driver",
        cell: (row) => (
          <span className="font-semibold text-slate-700">{row.lastDriver}</span>
        ),
      },
    ],
    []
  );

  if (loading && !data) {
    return (
      <div className="space-y-8">
        <AnalyticsKpiGridSkeleton cards={4} />
        <div className="grid gap-8 xl:grid-cols-2">
          <AnalyticsChartSkeleton />
          <AnalyticsChartSkeleton />
        </div>
        <div className="grid gap-8 xl:grid-cols-[1fr_1.1fr]">
          <AnalyticsTableSkeleton rows={4} />
          <AnalyticsChartSkeleton />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <AnalyticsErrorState
        title="Handover analytics unavailable"
        description={error}
        onRetry={onRetry}
      />
    );
  }

  if (!data) {
    return (
      <AnalyticsEmptyState
        title="No handover analytics available"
        description="Handover summary data will render here after the transport analytics API is integrated."
      />
    );
  }

  return (
    <div className="space-y-10 py-2">
      <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-4">
        <AnalyticsKpiCard
          label="Handovers This Month"
          value={formatNumber(data.handoversThisMonth)}
          tone="blue"
        />
        <AnalyticsKpiCard
          label="Pending Takeovers"
          value={formatNumber(data.pendingTakeovers)}
          tone="amber"
        />
        <AnalyticsKpiCard
          label="Fleet Utilization"
          value={formatPercent(data.fleetUtilization)}
          tone="emerald"
        />
        <AnalyticsKpiCard
          label="Avg Turnaround Time"
          value={`${formatNumber(data.avgTurnaroundTimeHours)} hrs`}
          tone="violet"
        />
      </div>

      <div className="grid gap-10 xl:grid-cols-2">
        <AnalyticsChartContainer
          variant="flat"
          title="Handover Activity Trend"
          subtitle="Date wise handover movement across the recent reporting period."
          flushOnMobile
        >
          {data.activityTrend.length === 0 ? (
            <AnalyticsEmptyState
              title="No handover trend available"
              description="The handover activity chart needs date_label and count values from the API response."
            />
          ) : (
            <div className="h-[270px] min-w-0 sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.activityTrend}
                  margin={isMobile ? { top: 4, right: 0, bottom: 0, left: -24 } : { top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={isMobile ? 18 : 12}
                    tick={{ fill: "#64748b", fontSize: isMobile ? 10 : 12, fontWeight: 500 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={isMobile ? 24 : 32}
                    tick={{ fill: "#64748b", fontSize: isMobile ? 10 : 12, fontWeight: 500 }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [formatNumber(value), "Handovers"]} 
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#0f766e"
                    strokeWidth={4}
                    dot={{ r: 4, fill: "#0f766e", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </AnalyticsChartContainer>

        <AnalyticsChartContainer
          variant="flat"
          title="Top Employees"
          subtitle="Employees handling the highest handover volume this month."
          flushOnMobile
        >
          {data.topEmployees.length === 0 ? (
            <AnalyticsEmptyState
              title="No employee ranking available"
              description="The top employee chart will populate once employeeName and handover_count values arrive."
            />
          ) : (
            <div className="h-[270px] min-w-0 sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                {isMobile ? (
                  <BarChart
                    data={data.topEmployees}
                    margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
                    barCategoryGap={18}
                  >
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="employeeName"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={26}
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [formatNumber(value), "Handovers"]} 
                    />
                    <Bar
                      dataKey="handoverCount"
                      fill="#7c3aed"
                      radius={[8, 8, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                ) : (
                  <BarChart
                    data={data.topEmployees}
                    layout="vertical"
                    margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
                    barCategoryGap={14}
                  >
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="employeeName"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                      width={110}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [formatNumber(value), "Handovers"]} 
                    />
                    <Bar dataKey="handoverCount" fill="#7c3aed" radius={[0, 8, 8, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </AnalyticsChartContainer>
      </div>

      <div className="grid gap-10 xl:grid-cols-[1fr_1.15fr]">
        <AnalyticsResponsiveTable
          variant="flat"
          title="Frequent Switchers"
          subtitle="Vehicles moving through repeated handover cycles."
          columns={frequentSwitcherColumns}
          rows={data.frequentSwitchers}
          emptyTitle="No frequent switchers found"
          emptyDescription="This section will list vehicles with repeated handover activity once data is available."
        />

        <AnalyticsChartContainer
          variant="flat"
          title="Handover Efficiency Trend"
          subtitle="Monthly total handovers versus average idle time between transfers."
        >
          {data.handoverEfficiencyTrend.length === 0 ? (
            <AnalyticsEmptyState
              title="No efficiency trend available"
              description="The monthly efficiency section will render after month, totalHandovers, and avgIdleTimeHours values are returned."
            />
          ) : (
            <div className="h-[320px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.handoverEfficiencyTrend}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                  />
                  <YAxis
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                  />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="totalHandovers"
                    stroke="#2563eb"
                    strokeWidth={4}
                    dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
                    name="Total Handovers"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgIdleTimeHours"
                    stroke="#f97316"
                    strokeWidth={4}
                    dot={{ r: 4, fill: "#f97316", strokeWidth: 2, stroke: "#fff" }}
                    name="Avg Idle Time (hrs)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </AnalyticsChartContainer>
      </div>
    </div>

  );
};
