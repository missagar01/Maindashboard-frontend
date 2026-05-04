import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  Clock3,
  Cpu,
  Factory,
  Gauge,
  ShieldCheck,
  Thermometer,
  Wifi,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DeviceStatus = "online" | "warning" | "offline";
type AlertSeverity = "critical" | "warning" | "info";

interface MetricCardData {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  accentClass: string;
  iconClass: string;
}

interface DeviceRowData {
  id: string;
  line: string;
  status: DeviceStatus;
  temperature: string;
  battery: number;
  signal: number;
  throughput: string;
  lastPing: string;
}

interface AlertItem {
  title: string;
  device: string;
  severity: AlertSeverity;
  time: string;
  note: string;
}

const metricCards: MetricCardData[] = [
  {
    title: "Connected Devices",
    value: "42 / 48",
    helper: "6 devices moved to standby in the last shift",
    icon: Cpu,
    accentClass: "from-cyan-500 to-sky-600",
    iconClass: "bg-cyan-500/12 text-cyan-600",
  },
  {
    title: "Telemetry Uptime",
    value: "99.42%",
    helper: "Packet success rate across furnace, caster and dispatch lines",
    icon: ShieldCheck,
    accentClass: "from-emerald-500 to-teal-600",
    iconClass: "bg-emerald-500/12 text-emerald-600",
  },
  {
    title: "Avg Latency",
    value: "138 ms",
    helper: "Gateway response within plant network and field relays",
    icon: Wifi,
    accentClass: "from-violet-500 to-indigo-600",
    iconClass: "bg-violet-500/12 text-violet-600",
  },
  {
    title: "Energy Load",
    value: "68.4%",
    helper: "Real-time power draw against configured safe threshold",
    icon: Zap,
    accentClass: "from-amber-500 to-orange-600",
    iconClass: "bg-amber-500/12 text-amber-600",
  },
];

const telemetrySeries = [
  { time: "06:00", throughput: 1800, load: 52 },
  { time: "08:00", throughput: 2250, load: 58 },
  { time: "10:00", throughput: 2480, load: 61 },
  { time: "12:00", throughput: 2720, load: 66 },
  { time: "14:00", throughput: 2875, load: 70 },
  { time: "16:00", throughput: 3010, load: 74 },
  { time: "18:00", throughput: 2940, load: 69 },
  { time: "20:00", throughput: 2760, load: 64 },
];

const environmentSeries = [
  { time: "06:00", temperature: 29, humidity: 52 },
  { time: "08:00", temperature: 31, humidity: 50 },
  { time: "10:00", temperature: 34, humidity: 48 },
  { time: "12:00", temperature: 36, humidity: 45 },
  { time: "14:00", temperature: 37, humidity: 43 },
  { time: "16:00", temperature: 35, humidity: 44 },
  { time: "18:00", temperature: 33, humidity: 47 },
  { time: "20:00", temperature: 31, humidity: 49 },
];

const zoneHealthData = [
  { zone: "Furnace", health: 96, alerts: 1 },
  { zone: "Caster", health: 92, alerts: 2 },
  { zone: "Rolling", health: 88, alerts: 3 },
  { zone: "Cooling", health: 94, alerts: 1 },
  { zone: "Dispatch", health: 97, alerts: 0 },
];

const deviceMix = [
  { name: "Online", value: 42, color: "#10b981" },
  { name: "Warning", value: 4, color: "#f59e0b" },
  { name: "Offline", value: 2, color: "#ef4444" },
];

const alertFeed: AlertItem[] = [
  {
    title: "Bearing vibration rising",
    device: "ROLL-07",
    severity: "critical",
    time: "12 sec ago",
    note: "Vibration crossed 6.2 mm/s. Auto inspection sequence triggered.",
  },
  {
    title: "Cooling line battery low",
    device: "COOL-02",
    severity: "warning",
    time: "3 min ago",
    note: "Field node battery dropped to 22%. Replacement is queued for next round.",
  },
  {
    title: "Telemetry link restored",
    device: "DSP-09",
    severity: "info",
    time: "8 min ago",
    note: "Gateway connection recovered after relay reset. No packet loss detected now.",
  },
];

const deviceFleet: DeviceRowData[] = [
  {
    id: "FURN-01",
    line: "Billet Furnace",
    status: "online",
    temperature: "41.2 C",
    battery: 87,
    signal: 94,
    throughput: "1.8k pkt/min",
    lastPing: "4 sec ago",
  },
  {
    id: "CAST-04",
    line: "Continuous Caster",
    status: "online",
    temperature: "38.6 C",
    battery: 73,
    signal: 91,
    throughput: "2.1k pkt/min",
    lastPing: "9 sec ago",
  },
  {
    id: "ROLL-07",
    line: "Rolling Mill",
    status: "warning",
    temperature: "47.9 C",
    battery: 64,
    signal: 81,
    throughput: "2.6k pkt/min",
    lastPing: "12 sec ago",
  },
  {
    id: "COOL-02",
    line: "Cooling Bed",
    status: "warning",
    temperature: "35.1 C",
    battery: 22,
    signal: 74,
    throughput: "1.3k pkt/min",
    lastPing: "31 sec ago",
  },
  {
    id: "DSP-09",
    line: "Dispatch Scanner",
    status: "online",
    temperature: "30.4 C",
    battery: 92,
    signal: 96,
    throughput: "1.1k pkt/min",
    lastPing: "6 sec ago",
  },
  {
    id: "YARD-03",
    line: "Yard Gateway",
    status: "offline",
    temperature: "N/A",
    battery: 0,
    signal: 0,
    throughput: "No stream",
    lastPing: "18 min ago",
  },
];

const maintenanceQueue = [
  { title: "Battery replacement", target: "COOL-02", eta: "Today 07:15 PM" },
  { title: "Gateway reboot validation", target: "YARD-03", eta: "Today 07:40 PM" },
  { title: "Sensor calibration", target: "ROLL-07", eta: "Tomorrow 09:00 AM" },
];

const statusClasses: Record<DeviceStatus, string> = {
  online: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  offline: "bg-rose-50 text-rose-700 ring-rose-200",
};

const severityClasses: Record<AlertSeverity, string> = {
  critical: "border-rose-200 bg-rose-50/80 text-rose-700",
  warning: "border-amber-200 bg-amber-50/80 text-amber-700",
  info: "border-sky-200 bg-sky-50/80 text-sky-700",
};

const signalBarClasses = (value: number) => {
  if (value >= 85) return "from-emerald-500 to-teal-500";
  if (value >= 60) return "from-amber-500 to-orange-500";
  return "from-rose-500 to-red-500";
};

const DashboardPanel = ({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <section className="min-w-0 rounded-none border-y border-slate-200/80 bg-white/88 p-3 shadow-none backdrop-blur sm:rounded-[28px] sm:border sm:p-5 sm:shadow-[0_18px_44px_-28px_rgba(15,23,42,0.32)]">
    <div className="mb-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-base font-black tracking-[-0.02em] text-slate-900 sm:text-lg">{title}</h2>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">{subtitle}</p>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const MetricCard = ({ title, value, helper, icon: Icon, accentClass, iconClass }: MetricCardData) => (
  <div className="group relative min-w-0 overflow-hidden rounded-none border-y border-slate-200/80 bg-white/90 p-3 shadow-none transition-transform duration-300 hover:-translate-y-1 sm:rounded-[24px] sm:border sm:p-5 sm:shadow-[0_18px_42px_-28px_rgba(15,23,42,0.28)]">
    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentClass}`} />
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 sm:text-[11px] sm:tracking-[0.24em]">{title}</p>
        <p className="mt-2 break-words text-[1.75rem] font-black tracking-[-0.04em] text-slate-900 sm:mt-3 sm:text-3xl">{value}</p>
        <p className="mt-2 max-w-[28ch] text-[11px] leading-5 text-slate-500 sm:mt-3 sm:text-sm sm:leading-6">{helper}</p>
      </div>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${iconClass}`}>
        <Icon className="h-4.5 w-4.5 sm:h-6 sm:w-6" />
      </div>
    </div>
  </div>
);

export default function IotDashboard() {
  const lastSyncLabel = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,#cffafe_0%,#f8fafc_42%,#e2e8f0_100%)]">
      <div className="space-y-4 py-3 sm:space-y-6 sm:py-2">
        <section className="relative overflow-hidden rounded-none border-y border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_45%,#155e75_100%)] px-4 pb-4 pt-7 text-white shadow-none sm:rounded-[32px] sm:border sm:p-7 sm:shadow-[0_28px_60px_-34px_rgba(15,23,42,0.7)]">
          <div className="absolute -left-12 top-0 h-36 w-36 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />

          <div className="relative z-10 grid min-w-0 gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
            <div className="min-w-0">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100 sm:text-[11px]">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Simulated Live Feed
              </div>
              <h1 className="mt-4 max-w-[10ch] text-[clamp(1.8rem,8.2vw,2.45rem)] font-black leading-[1.02] tracking-[-0.05em] sm:max-w-none sm:text-4xl">
                IoT Device Monitoring Dashboard
              </h1>
             

              <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/85 sm:mt-6 sm:gap-3 sm:text-xs">
                <div className="rounded-full border border-white/15 bg-white/10 px-3 py-2">Factory Floor</div>
                <div className="rounded-full border border-white/15 bg-white/10 px-3 py-2">Edge Gateways</div>
                <div className="rounded-full border border-white/15 bg-white/10 px-3 py-2">Telemetry Alerts</div>
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4">
              <div className="min-w-0 rounded-[20px] border border-white/10 bg-white/10 p-3 backdrop-blur sm:rounded-[24px] sm:p-4">
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:h-11 sm:w-11 sm:rounded-2xl">
                    <Gauge className="h-4 w-4 text-cyan-100 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/80 sm:text-[11px] sm:tracking-[0.22em]">Shift Throughput</p>
                    <p className="mt-1 break-words text-[1.05rem] font-black leading-tight sm:text-2xl">3.01k pkt/min</p>
                  </div>
                </div>
              </div>
              <div className="min-w-0 rounded-[20px] border border-white/10 bg-white/10 p-3 backdrop-blur sm:rounded-[24px] sm:p-4">
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:h-11 sm:w-11 sm:rounded-2xl">
                    <Thermometer className="h-4 w-4 text-cyan-100 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/80 sm:text-[11px] sm:tracking-[0.22em]">Plant Temp Avg</p>
                    <p className="mt-1 break-words text-[1.05rem] font-black leading-tight sm:text-2xl">34.5 C</p>
                  </div>
                </div>
              </div>
              <div className="min-w-0 rounded-[20px] border border-white/10 bg-white/10 p-3 backdrop-blur sm:rounded-[24px] sm:p-4">
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:h-11 sm:w-11 sm:rounded-2xl">
                    <Factory className="h-4 w-4 text-cyan-100 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/80 sm:text-[11px] sm:tracking-[0.22em]">Healthy Zones</p>
                    <p className="mt-1 break-words text-[1.05rem] font-black leading-tight sm:text-2xl">5 / 5</p>
                  </div>
                </div>
              </div>
              <div className="min-w-0 rounded-[20px] border border-white/10 bg-white/10 p-3 backdrop-blur sm:rounded-[24px] sm:p-4">
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:h-11 sm:w-11 sm:rounded-2xl">
                    <Clock3 className="h-4 w-4 text-cyan-100 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/80 sm:text-[11px] sm:tracking-[0.22em]">Last Sync</p>
                    <p className="mt-1 break-words text-[11px] font-bold leading-4 text-white sm:text-sm sm:leading-6">{lastSyncLabel}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <MetricCard key={card.title} {...card} />
          ))}
        </div>

        <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <DashboardPanel
            title="Telemetry Throughput"
            subtitle="Simulated packet stream and device load through the running shift."
            action={
              <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700 sm:text-[11px]">
                <Activity className="h-4 w-4" />
                Stream Stable
              </div>
            }
          >
            <div className="h-[240px] min-w-0 sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetrySeries} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="iotThroughputFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
                  <Tooltip />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="throughput"
                    name="Throughput"
                    stroke="#0891b2"
                    strokeWidth={3}
                    fill="url(#iotThroughputFill)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="load"
                    name="Load %"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#f97316" }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Fleet Status"
            subtitle="Current state of all registered IoT nodes in the monitoring cluster."
          >
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="h-[220px] min-w-0 sm:h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceMix}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                    >
                      {deviceMix.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {deviceMix.map((item) => (
                  <div key={item.name} className="rounded-[20px] border border-slate-200/70 bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm font-bold text-slate-700">{item.name}</span>
                      </div>
                      <span className="text-xl font-black tracking-[-0.04em] text-slate-900">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DashboardPanel>
        </div>

        <div className="grid gap-4 sm:gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <DashboardPanel
            title="Environmental Trends"
            subtitle="Temperature and humidity pattern captured from the plant floor sensors."
          >
            <div className="h-[240px] min-w-0 sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={environmentSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="temperature" name="Temperature" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: "#ef4444" }} />
                  <Line type="monotone" dataKey="humidity" name="Humidity" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: "#2563eb" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Zone Health Index"
            subtitle="Line-wise reliability score based on uptime, warnings and sensor drift."
          >
            <div className="h-[240px] min-w-0 sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneHealthData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }} barSize={22}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                  <XAxis dataKey="zone" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
                  <Tooltip />
                  <Bar dataKey="health" radius={[8, 8, 0, 0]}>
                    {zoneHealthData.map((item) => (
                      <Cell
                        key={item.zone}
                        fill={item.health >= 95 ? "#10b981" : item.health >= 90 ? "#f59e0b" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DashboardPanel>
        </div>

        <div className="grid gap-4 sm:gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <DashboardPanel
            title="Alert Feed"
            subtitle="Latest simulated events from critical devices and edge gateways."
          >
            <div className="space-y-4">
              {alertFeed.map((alert) => (
                <div
                  key={`${alert.device}-${alert.title}`}
                  className={`rounded-[22px] border p-4 ${severityClasses[alert.severity]}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/70">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black tracking-[-0.02em]">{alert.title}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] opacity-80">{alert.device}</p>
                        <p className="mt-2 break-words text-sm leading-6 opacity-90">{alert.note}</p>
                      </div>
                    </div>
                    <span className="w-fit shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.2em]">
                      {alert.time}
                    </span>
                  </div>
                </div>
              ))}

              <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <BatteryCharging className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Maintenance Queue</p>
                    <p className="text-sm text-slate-500">Planned actions for unstable field devices</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {maintenanceQueue.map((item) => (
                    <div key={`${item.target}-${item.title}`} className="rounded-[18px] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
                      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{item.title}</p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{item.target}</p>
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{item.eta}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Device Inventory"
            subtitle="Demo grid of connected devices, signal quality, battery level and latest heartbeat."
          >
            <div className="space-y-3 md:hidden">
              {deviceFleet.map((device) => (
                <article
                  key={`${device.id}-mobile`}
                  className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      <Cpu className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words text-xl font-black tracking-[-0.03em] text-slate-900">{device.id}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-500">{device.line}</p>
                          </div>
                          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ring-1 ${statusClasses[device.status]}`}>
                            {device.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Temp</p>
                            <p className="mt-1 text-sm font-bold text-slate-800">{device.temperature}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Battery</p>
                            <p className="mt-1 text-sm font-bold text-slate-800">{device.battery}%</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Signal</p>
                            <div className="mt-2">
                              <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
                                <span>Quality</span>
                                <span>{device.signal}%</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${signalBarClasses(device.signal)}`}
                                  style={{ width: `${device.signal}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Throughput</p>
                            <p className="mt-1 text-sm font-bold text-slate-800">{device.throughput}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Last Ping</p>
                            <div className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-800">
                              {device.status === "online" ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              )}
                              <span>{device.lastPing}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr>
                    {["Device", "Line", "Status", "Temp", "Battery", "Signal", "Throughput", "Last Ping"].map((heading) => (
                      <th
                        key={heading}
                        className="px-3 text-left text-[11px] font-black uppercase tracking-[0.22em] text-slate-400"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deviceFleet.map((device) => (
                    <tr key={device.id} className="rounded-[20px] bg-slate-50/80 shadow-sm ring-1 ring-slate-200/70">
                      <td className="rounded-l-[20px] px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                            <Cpu className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{device.id}</p>
                            <p className="text-xs text-slate-500">Edge Node</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-700">{device.line}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ring-1 ${statusClasses[device.status]}`}>
                          {device.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-700">{device.temperature}</td>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-700">{device.battery}%</td>
                      <td className="px-3 py-3">
                        <div className="w-28">
                          <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Signal</span>
                            <span>{device.signal}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${signalBarClasses(device.signal)}`}
                              style={{ width: `${device.signal}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-700">{device.throughput}</td>
                      <td className="rounded-r-[20px] px-3 py-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          {device.status === "online" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                          {device.lastPing}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardPanel>
        </div>
      </div>
    </div>
  );
}
