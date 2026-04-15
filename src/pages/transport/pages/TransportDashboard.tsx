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
  Truck,
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
import { getLrBiltyRegister } from "../../../api/transport/api";

type TransportLrBiltyRecord = Record<string, unknown>;

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "INR",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
});

const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "short",
});

const chartPalette = [
  "#d9738d",
  "#1f4d4a",
  "#149c95",
  "#739eea",
  "#7c6af4",
  "#f59e0b",
];

const demoSubscriptionCards = [
  {
    label: "Plan Status",
    value: "TRIAL",
    cardClassName:
      "bg-gradient-to-br from-indigo-50 via-white to-sky-50 border-indigo-100",
    labelClassName: "text-indigo-300",
  },
  {
    label: "Days Remaining",
    value: "30.00",
    cardClassName:
      "bg-gradient-to-br from-amber-50 via-white to-orange-50 border-amber-100",
    labelClassName: "text-amber-300",
  },
  {
    label: "Vehicle Usage",
    value: "20 / 100",
    cardClassName:
      "bg-gradient-to-br from-emerald-50 via-white to-cyan-50 border-emerald-100",
    labelClassName: "text-emerald-300",
  },
  {
    label: "Trip Usage",
    value: "2,800",
    cardClassName:
      "bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 border-rose-100",
    labelClassName: "text-rose-300",
  },
];

const demoDocumentExpiryCards = [
  { label: "Expired", value: "0", tone: "rose" },
  { label: "Expiring Soon", value: "0", tone: "amber" },
  { label: "Valid", value: "0", tone: "emerald" },
];

const demoMonthlyProfit = [
  { month: "Jan", revenue: 24, actual: 18, expense: 10 },
  { month: "Feb", revenue: 31, actual: 26, expense: 15 },
  { month: "Mar", revenue: 22, actual: 19, expense: 11 },
  { month: "Apr", revenue: 17, actual: 16, expense: 14 },
  { month: "May", revenue: 26, actual: 21, expense: 12 },
  { month: "Jun", revenue: 28, actual: 24, expense: 13 },
  { month: "Jul", revenue: 23, actual: 20, expense: 12 },
  { month: "Aug", revenue: 32, actual: 26, expense: 15 },
  { month: "Sep", revenue: 27, actual: 18, expense: 10 },
  { month: "Oct", revenue: 14, actual: 16, expense: 13 },
  { month: "Nov", revenue: 28, actual: 23, expense: 12 },
  { month: "Dec", revenue: 26, actual: 22, expense: 11 },
];

const softLegend = [
  { label: "Operational Efficiency", color: "#5b8def" },
  { label: "Revenue Performance", color: "#22c55e" },
  { label: "Fleet Utilization", color: "#8b5cf6" },
  { label: "Document Compliance", color: "#f59e0b" },
];

const timeRangeOptions = [
  { label: "Last 7 Days", value: "last_7_days" },
  { label: "Last 30 Days", value: "last_30_days" },
  { label: "This Year", value: "this_year" },
  { label: "This Financial Year", value: "this_financial_year" },
];

const safeString = (value: unknown) => String(value ?? "").trim();

const toNumber = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDate = (value: unknown) => {
  const raw = safeString(value);
  if (!raw) return null;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  return date;
};

const formatShortDate = (value: unknown) => {
  const date = toDate(value);
  return date ? shortDateFormatter.format(date) : "--";
};

const groupCountBy = (records: TransportLrBiltyRecord[], field: string) => {
  const counts = new Map<string, number>();

  records.forEach((record) => {
    const key = safeString(record[field]) || "Unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value);
};

const sumField = (records: TransportLrBiltyRecord[], field: string) =>
  records.reduce((total, record) => total + toNumber(record[field]), 0);

const EmptyChartState = ({ label }: { label: string }) => (
  <div className="flex h-full min-h-[220px] items-center justify-center rounded-[20px] bg-slate-50/70 text-center text-sm font-medium text-slate-400">
    {label}
  </div>
);

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
      className="min-w-[132px] appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-sm font-medium text-slate-500 outline-none transition hover:bg-slate-50 focus:border-slate-300"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
  </div>
);

const DotLegend = ({
  items,
  justify = "justify-start",
}: {
  items: Array<{ label: string; color: string }>;
  justify?: string;
}) => (
  <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 ${justify}`}>
    {items.map((item) => (
      <span key={item.label} className="inline-flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: item.color }}
        />
        {item.label}
      </span>
    ))}
  </div>
);

const SectionCard = ({
  title,
  children,
  action,
  subtitle,
  bodyClassName = "p-5",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
}) => (
  <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
    <div className="flex flex-col gap-3 border-b border-slate-200/80 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900 sm:text-[18px]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
    <div className={bodyClassName}>{children}</div>
  </section>
);

export default function TransportDashboard() {
  const [records, setRecords] = useState<TransportLrBiltyRecord[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedRange, setSelectedRange] = useState("this_year");

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await getLrBiltyRegister();

        if (!active) return;
        setRecords(Array.isArray(response?.records) ? response.records : []);
        setMessage(response?.message || "");
      } catch (err: any) {
        if (!active) return;
        setError(
          err?.response?.data?.message ||
          err?.message ||
          "Transport API se data load nahi ho paaya."
        );
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

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getLrBiltyRegister();
      setRecords(Array.isArray(response?.records) ? response.records : []);
      setMessage(response?.message || "");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Transport API se data refresh nahi ho paaya."
      );
    } finally {
      setLoading(false);
    }
  };

  const branchOptions = useMemo(() => {
    const uniqueBranches = Array.from(
      new Set(
        records
          .map((record) => safeString(record.branch_name))
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right));

    return [
      { label: "Please select", value: "all" },
      ...uniqueBranches.map((branch) => ({
        label: branch,
        value: branch,
      })),
    ];
  }, [records]);

  const filteredRecords = useMemo(() => {
    const now = new Date();
    let nextRecords = [...records];

    if (selectedBranch !== "all") {
      nextRecords = nextRecords.filter(
        (record) => safeString(record.branch_name) === selectedBranch
      );
    }

    if (selectedRange === "last_7_days") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 6);

      nextRecords = nextRecords.filter((record) => {
        const date = toDate(record.lr_bilty_date || record.lr_bilty_created_at);
        return date ? date >= start : false;
      });
    }

    if (selectedRange === "last_30_days") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 29);

      nextRecords = nextRecords.filter((record) => {
        const date = toDate(record.lr_bilty_date || record.lr_bilty_created_at);
        return date ? date >= start : false;
      });
    }

    if (selectedRange === "this_year") {
      nextRecords = nextRecords.filter((record) => {
        const date = toDate(record.lr_bilty_date || record.lr_bilty_created_at);
        return date ? date.getFullYear() === now.getFullYear() : false;
      });
    }

    if (selectedRange === "this_financial_year") {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const financialYearStart =
        currentMonth >= 3
          ? new Date(currentYear, 3, 1, 0, 0, 0, 0)
          : new Date(currentYear - 1, 3, 1, 0, 0, 0, 0);
      const financialYearEnd =
        currentMonth >= 3
          ? new Date(currentYear + 1, 2, 31, 23, 59, 59, 999)
          : new Date(currentYear, 2, 31, 23, 59, 59, 999);

      nextRecords = nextRecords.filter((record) => {
        const date = toDate(record.lr_bilty_date || record.lr_bilty_created_at);
        return date ? date >= financialYearStart && date <= financialYearEnd : false;
      });
    }

    return nextRecords;
  }, [records, selectedBranch, selectedRange]);

  const filteredCount = filteredRecords.length;

  const reportMetrics = useMemo(() => {
    const pendingPod = filteredRecords.filter((record) => !safeString(record.pod_id)).length;
    const pendingPodOriginal = filteredRecords.filter(
      (record) =>
        !safeString(record.pod_id) &&
        safeString(record.LRStatus).toUpperCase() === "ORIGINAL"
    ).length;
    const totalAdvance = sumField(filteredRecords, "total_advance");

    return [
      {
        label: "Pending POD",
        value: numberFormatter.format(pendingPod),
        dotColor: "#fde7c3",
        accentColor: "text-slate-800",
        icon: CalendarClock,
      },
      {
        label: "Pending POD (Original)",
        value: numberFormatter.format(pendingPodOriginal),
        dotColor: "#f9d7de",
        accentColor: "text-slate-800",
        icon: ShieldCheck,
      },
      {
        label: "Total Advance",
        value: currencyFormatter.format(totalAdvance),
        dotColor: "#d9f3ee",
        accentColor: "text-slate-800",
        icon: BadgeIndianRupee,
      },
    ];
  }, [filteredRecords]);

  const dailyTrendData = useMemo(() => {
    const grouped = new Map<string, number>();

    filteredRecords.forEach((record) => {
      const date = toDate(record.lr_bilty_date || record.lr_bilty_created_at);
      if (!date) return;

      const key = date.toISOString().slice(0, 10);
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });

    return Array.from(grouped.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-14)
      .map(([day, trips]) => ({
        day: formatShortDate(day),
        trips,
      }));
  }, [filteredRecords]);

  const topCustomers = useMemo(
    () => groupCountBy(filteredRecords, "consignee_name").slice(0, 4),
    [filteredRecords]
  );

  const branchPerformance = useMemo(
    () => groupCountBy(filteredRecords, "branch_name").slice(0, 4),
    [filteredRecords]
  );

  const pipelineItems = useMemo(() => {
    const total = filteredCount;
    const podPrepared = filteredRecords.filter(
      (record) => safeString(record.lr_bilty_status).toUpperCase() === "POD_PREPARED"
    ).length;
    const freightPrepared = filteredRecords.filter(
      (record) =>
        Boolean(record.is_freight_advice_prepared) || Boolean(record.freight_voucher_id)
    ).length;
    const serviceBillPrepared = filteredRecords.filter(
      (record) =>
        Boolean(record.is_service_bill_prepared) || Boolean(record.service_bill_id)
    ).length;
    const fullyCompleted = filteredRecords.filter(
      (record) =>
        Boolean(record.pod_id) &&
        (Boolean(record.service_bill_id) || Boolean(record.is_service_bill_prepared)) &&
        (Boolean(record.freight_voucher_id) || Boolean(record.is_freight_advice_prepared))
    ).length;

    return [
      {
        label: "LR Created",
        value: total,
        percent: total ? 100 : 0,
        icon: Truck,
        iconTone: "bg-blue-100 text-blue-600",
        barColor: "#bcd0ff",
        cardTone:
          "bg-[linear-gradient(90deg,rgba(190,210,255,0.8),rgba(234,240,255,0.55))]",
      },
      {
        label: "POD Prepared",
        value: podPrepared,
        percent: total ? (podPrepared / total) * 100 : 0,
        icon: FileClock,
        iconTone: "bg-fuchsia-100 text-fuchsia-600",
        barColor: "#e8c6ef",
        cardTone:
          "bg-[linear-gradient(90deg,rgba(240,214,247,0.9),rgba(250,244,253,0.65))]",
      },
      {
        label: "Freight Prepared",
        value: freightPrepared,
        percent: total ? (freightPrepared / total) * 100 : 0,
        icon: BadgeIndianRupee,
        iconTone: "bg-cyan-50 text-cyan-600",
        barColor: "#d7f5fb",
        cardTone: "bg-white",
      },
      {
        label: "Service Bill",
        value: serviceBillPrepared,
        percent: total ? (serviceBillPrepared / total) * 100 : 0,
        icon: BadgeIndianRupee,
        iconTone: "bg-amber-50 text-amber-600",
        barColor: "#fde8b2",
        cardTone: "bg-white",
      },
      {
        label: "Fully Completed",
        value: fullyCompleted,
        percent: total ? (fullyCompleted / total) * 100 : 0,
        icon: ShieldCheck,
        iconTone: "bg-emerald-50 text-emerald-600",
        barColor: "#cef3df",
        cardTone: "bg-white",
      },
    ];
  }, [filteredCount, filteredRecords]);

  const weeklyTrendData = useMemo(() => {
    const base = [
      { day: "Mon", actual: 0 },
      { day: "Tue", actual: 0 },
      { day: "Wed", actual: 0 },
      { day: "Thu", actual: 0 },
      { day: "Fri", actual: 0 },
      { day: "Sat", actual: 0 },
      { day: "Sun", actual: 0 },
    ];

    filteredRecords.forEach((record) => {
      const date = toDate(record.lr_bilty_date || record.lr_bilty_created_at);
      if (!date) return;

      const index = (date.getDay() + 6) % 7;
      base[index].actual += 1;
    });

    return base.map((item) => ({
      ...item,
      target: Math.max(...base.map((entry) => entry.actual), 0) || 100,
    }));
  }, [filteredRecords]);

  const lrBiltyBreakdown = useMemo(
    () => groupCountBy(filteredRecords, "source_name").slice(0, 4),
    [filteredRecords]
  );

  const qtyTrendData = useMemo(() => {
    const grouped = new Map<string, { month: string; qty: number; trips: number }>();

    filteredRecords.forEach((record) => {
      const date = toDate(record.lr_bilty_date || record.lr_bilty_created_at);
      if (!date) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const current = grouped.get(key) || {
        month: monthFormatter.format(date),
        qty: 0,
        trips: 0,
      };

      current.qty += toNumber(record.lr_bilty_qty);
      current.trips += 1;
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-6)
      .map(([, value]) => value);
  }, [filteredRecords]);

  const vehiclePerformance = useMemo(
    () =>
      groupCountBy(filteredRecords, "vehicle_type_name")
        .slice(0, 6)
        .map((item) => ({
          ...item,
          ghost: 0,
        })),
    [filteredRecords]
  );

  return (
    <div className="space-y-6">
      {error ? (
        <section className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 shadow-[0_10px_24px_rgba(244,63,94,0.08)]">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Transport API Error</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        </section>
      ) : null}

      <SectionCard
        title="Subscription Details"
        bodyClassName="bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.2),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.12),transparent_34%),#ffffff] p-5"
      >
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {demoSubscriptionCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-[20px] border px-4 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] sm:px-6 sm:py-6 ${card.cardClassName}`}
            >
              <p className={`text-[13px] font-semibold sm:text-sm ${card.labelClassName}`}>
                {card.label}
              </p>
              <p className="mt-2 text-[28px] font-medium leading-none tracking-[-0.03em] text-slate-800 sm:text-[34px]">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <section className="grid gap-6 xl:grid-cols-[1.75fr_0.9fr]">
        <SectionCard
          title="Operations Overview"
          subtitle={message || "Original LR Bilty report API metrics"}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <SelectField
                value={selectedBranch}
                onChange={setSelectedBranch}
                options={branchOptions}
              />
              <SelectField
                value={selectedRange}
                onChange={setSelectedRange}
                options={timeRangeOptions}
              />
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          }
        >
          <div className="grid gap-0 overflow-hidden rounded-[22px] border border-slate-200/90 xl:grid-cols-[1fr_1fr]">
            <div className="border-b border-slate-200/90 xl:border-b-0 xl:border-r">
              <div className="grid gap-0 md:grid-cols-2">
                {reportMetrics.slice(0, 2).map((metric) => {
                  const Icon = metric.icon;

                  return (
                    <div
                      key={metric.label}
                      className="border-b border-slate-200/70 p-6 md:border-b-0 md:first:border-r"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: metric.dotColor }}
                        />
                        <p className="text-[15px] font-medium text-slate-700">{metric.label}</p>
                      </div>
                      <div className="mt-4 flex items-end gap-3">
                        <p className={`text-[22px] font-medium ${metric.accentColor}`}>
                          {metric.value}
                        </p>
                        <Icon className="mb-1 h-4 w-4 text-slate-300" />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-b border-slate-200/70 p-6">
                <div className="flex items-center gap-3">
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: reportMetrics[2]?.dotColor }}
                  />
                  <p className="text-[15px] font-medium text-slate-700">
                    {reportMetrics[2]?.label}
                  </p>
                </div>
                <div className="mt-4 flex items-end gap-3">
                  <p className={`text-[22px] font-medium ${reportMetrics[2]?.accentColor}`}>
                    {reportMetrics[2]?.value}
                  </p>
                  <BadgeIndianRupee className="mb-1 h-4 w-4 text-slate-300" />
                </div>
              </div>

              <div className="p-6">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-semibold text-slate-900">
                    Daily Trends (LR Bilty)
                  </p>
                  <span className="text-sm text-slate-500">
                    Total {numberFormatter.format(filteredCount)} Trips
                  </span>
                </div>

                <div className="h-[160px] sm:h-[190px]">
                  {loading && records.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : dailyTrendData.length === 0 ? (
                    <EmptyChartState label="Report data aane par trend chart dikhega" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={dailyTrendData}
                        margin={{ left: 0, right: 0, top: 8, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="transportTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#09c18d" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="#09c18d" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#edf2f7" />
                        <XAxis hide dataKey="day" />
                        <YAxis hide />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="trips"
                          stroke="none"
                          fill="url(#transportTrend)"
                        />
                        <Line
                          type="monotone"
                          dataKey="trips"
                          stroke="#09c18d"
                          strokeWidth={2.25}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="mb-4 text-[15px] font-semibold text-slate-900">Top Customers</p>
              <div className="h-[280px] sm:h-[340px]">
                {loading && records.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : topCustomers.length === 0 ? (
                  <EmptyChartState label="Top customer chart report data se fill hoga" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topCustomers}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={0}
                        outerRadius={128}
                        paddingAngle={1}
                      >
                        {topCustomers.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={chartPalette[index % chartPalette.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Branch Performance">
          <div className="h-[310px] sm:h-[390px]">
            {loading && records.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : branchPerformance.length === 0 ? (
              <EmptyChartState label="Branch performance chart report data se fill hoga" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius="72%" data={branchPerformance}>
                  <PolarGrid stroke="#e7eef6" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: "#8a94a6", fontSize: 12 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Radar
                    dataKey="value"
                    stroke="#4ca6bb"
                    fill="#4ca6bb"
                    fillOpacity={0.88}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 border-t border-slate-100 pt-4">
            <DotLegend items={softLegend} />
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.9fr]">
        <SectionCard
          title="LR Pipeline"
          subtitle={`${numberFormatter.format(filteredCount)} items`}
          action={
            <SelectField
              value={selectedRange}
              onChange={setSelectedRange}
              options={timeRangeOptions}
            />
          }
        >
          <div className="space-y-4">
            {pipelineItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className={`overflow-hidden rounded-[20px] border border-slate-100 px-4 py-3 shadow-[0_6px_20px_rgba(15,23,42,0.03)] ${item.cardTone}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-2xl p-3 ${item.iconTone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                          <p className="mt-1 text-sm font-semibold text-cyan-500">
                            {item.percent.toFixed(2)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[18px] font-semibold text-slate-800">
                            {numberFormatter.format(item.value)}
                          </p>
                          <p className="text-xs text-slate-400">items</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/80">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(item.percent, 100)}%`,
                        backgroundColor: item.barColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Document Expiry"
          bodyClassName="p-5"
          action={
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          }
        >
          <div className="mb-5 flex items-center gap-4 rounded-[24px] bg-[radial-gradient(circle_at_left,_rgba(255,223,223,0.45),transparent_44%)] px-4 py-2">
            <div className="rounded-full bg-rose-100 p-3 text-rose-500">
              <AlertCircle className="h-6 w-6" />
            </div>
            <p className="text-[16px] font-semibold text-slate-800">Document Expiry</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {demoDocumentExpiryCards.map((card) => {
              const toneMap: Record<string, string> = {
                rose: "border-rose-200 bg-rose-50/70 text-rose-600",
                amber: "border-amber-200 bg-amber-50/70 text-amber-500",
                emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-600",
              };

              return (
                <div
                  key={card.label}
                  className={`relative overflow-hidden rounded-[18px] border px-5 py-4 ${toneMap[card.tone]}`}
                >
                  <div className="absolute -right-3 -top-3 h-12 w-12 rounded-full bg-white/35" />
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full bg-current" />
                    {card.label}
                  </div>
                  <p className="mt-4 text-[18px] font-semibold">{card.value}</p>
                  <div className="mt-4 h-2 rounded-full bg-black/5" />
                </div>
              );
            })}
          </div>

          <div className="flex min-h-[235px] flex-col items-center justify-center text-slate-300">
            <Truck className="h-14 w-14 opacity-35" />
            <p className="mt-4 text-[15px] font-medium text-slate-400">No Data Present</p>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard title="Monthly Profit">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={demoMonthlyProfit}
                margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="profitRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#86efac" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#86efac" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="profitActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#93c5fd" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="profitExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fca5a5" stopOpacity={0.38} />
                    <stop offset="100%" stopColor="#fca5a5" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#edf2f7" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#7a8597", fontSize: 12 }}
                />
                <YAxis hide />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#16a34a"
                  strokeWidth={1.5}
                  fill="url(#profitRevenue)"
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#2563eb"
                  strokeWidth={1.5}
                  fill="url(#profitActual)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#ef4444"
                  strokeWidth={1.2}
                  fill="url(#profitExpense)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Weekly Trends">
          <div className="h-[300px]">
            {weeklyTrendData.every((item) => item.actual === 0) ? (
              <EmptyChartState label="Weekday trend report data ke baad dikhega" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyTrendData}
                  layout="vertical"
                  margin={{ left: 8, right: 8, top: 10, bottom: 10 }}
                  barCategoryGap={12}
                >
                  <CartesianGrid vertical={false} stroke="#edf2f7" />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#7a8597", fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="day"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#7a8597", fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="target" fill="#cdeee4" radius={[999, 999, 999, 999]} />
                  <Bar dataKey="actual" fill="#c7bef5" radius={[999, 999, 999, 999]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 flex justify-center">
            <DotLegend
              items={[
                { label: "target", color: "#16a34a" },
                { label: "actual", color: "#4f46e5" },
              ]}
            />
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          title="LR Bilty Details"
          action={
            <SelectField
              value={selectedRange}
              onChange={setSelectedRange}
              options={timeRangeOptions}
            />
          }
        >
          <div className="h-[280px] sm:h-[320px]">
            {loading && records.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : lrBiltyBreakdown.length === 0 ? (
              <EmptyChartState label="Source wise report data ke baad pie chart dikhega" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={lrBiltyBreakdown} dataKey="value" nameKey="name" outerRadius={102}>
                    {lrBiltyBreakdown.map((entry, index) => (
                      <Cell key={entry.name} fill={chartPalette[index % chartPalette.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Chart">
          <div className="h-[280px] sm:h-[320px]">
            {loading && records.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : qtyTrendData.length === 0 ? (
              <EmptyChartState label="Monthly quantity trend report data ke baad dikhega" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={qtyTrendData}
                  margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="qtyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7aa4ff" stopOpacity={0.42} />
                      <stop offset="100%" stopColor="#7aa4ff" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#edf2f7" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#7a8597", fontSize: 12 }}
                  />
                  <YAxis hide />
                  <Tooltip />
                  <Area type="monotone" dataKey="qty" stroke="#4f7cff" fill="url(#qtyGradient)" />
                  <Line
                    type="monotone"
                    dataKey="trips"
                    stroke="#3b6df6"
                    strokeWidth={1.6}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      <SectionCard title="Vehicle Performance">
        <div className="mb-5 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="font-semibold text-blue-600">Vehicle Utilization</span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-blue-600" />
            Has drill-down data
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-blue-200" />
            No drill-down data
          </span>
        </div>

        <div className="h-[320px] sm:h-[360px]">
          {loading && records.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : vehiclePerformance.length === 0 ? (
            <EmptyChartState label="Vehicle performance report data ke baad dikhega" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={vehiclePerformance}
                margin={{ left: 0, right: 8, top: 10, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#edf2f7" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#7a8597", fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#7a8597", fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[10, 10, 0, 0]} />
                <Bar dataKey="ghost" fill="#c8dbff" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
