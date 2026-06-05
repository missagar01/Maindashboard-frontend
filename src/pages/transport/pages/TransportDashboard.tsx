import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarDays,
  LayoutGrid,
  RefreshCw,
  Search,
  TrendingUp,
  Truck,
  BadgeIndianRupee,
  ChevronDown,
  FileClock,
  ShieldCheck,
  Zap,
  Navigation
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
  PolarAngleAxis,
  PolarGrid,
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
import { fetchEquipmentShiftChangeList } from "../../../api/transport/equipmentShiftChangeApi";
import { fetchEquipmentHandoverList } from "../../../api/transport/equipmentHandoverApi";
import { fetchEquipmentTakeoverList } from "../../../api/transport/equipmentTakeoverApi";
import { fetchPodRegisterReport } from "../../../api/transport/podRegisterApi";
import {
  getEquipmentTrackingReport,
  getEquipmentTripReport,
  type EquipmentTrackingRecord,
  type EquipmentTripReportRecord,
} from "../../../api/transport/trackingApi";


const RECORD_TITLE_OVERRIDES: Record<string, string> = {
  "353742371399445": "SRMPL_8_Workshop",
};

// ─── Constants ─────────────────────────────────────────────────────────────────
const DOORDRISHTI_API_URL = "https://doordrishti.co/report_trip_ignition_result.php";
const DEFAULT_DEVICE_ID = "13234";
const DEFAULT_USER_NAME = "sagarpipe@doordrishti.com";
const DEFAULT_HASH_KEY = "AMICGJOBSWLVIQJG";
const DEFAULT_TIME_FROM = "00:00:00";
const DEFAULT_TIME_TO = "23:59:59";

// ─── Types ─────────────────────────────────────────────────────────────────────
type DoordrishtiTripData = {
  device_id?: string;
  gps_data_id?: string;
  start_date?: string;
  start_location?: string;
  end_date?: string;
  end_date_gps_data_id?: string;
  registration_no?: string;
  end_location?: string;
  distance?: number | string;
  trip_diffrence?: string;
  average_speed?: number | string;
};

type DoordrishtiResponse = {
  result?: number | string;
  version?: string;
  message?: string;
  data?: DoordrishtiTripData[];
};

type DoordrishtiTripRow = {
  deviceId: string;
  gpsDataId: string;
  startDate: string;
  startLocation: string;
  endDate: string;
  registrationNo: string;
  endLocation: string;
  distanceKm: number;
  tripDifference: string;
  timeCoveredSeconds: number;
  averageSpeedKmph: number;
};

type DoordrishtiFilters = { deviceId: string; dateFrom: string; dateTo: string };
type DoordrishtiRangePreset = "today" | "weekly" | "monthly" | "custom";
type DoordrishtiDeviceOption = { value: string; label: string; registrationNo: string; equipmentName?: string };



type TruckMetric = {
  key: string;
  label: string;
  valueLabel: string;
  dotClass: string;
  ringColor?: string;
  chartValue?: number;
};

type TruckProgressSummary = {
  deviceId: string;
  deviceName: string;       // vehicle registration number (truck number)
  equipmentName: string;    // equipment name from backend
  totalTrips: number;
  totalRunningSeconds: number;
  totalIdleSeconds: number;
  totalElapsedSeconds: number;
  totalPossibleSeconds: number;
  noDataSeconds: number;
  scorePercentage: number;
  scoreLabel: string;
  totalDistanceKm: number;
  averageSpeedKmph: number;
  workingHoursLabel: string;
  movingCount: number;
  firstStartDate: string;   // earliest trip start datetime
  lastEndDate: string;      // latest trip end datetime
  metrics: TruckMetric[];
  ringMetrics: TruckMetric[];
  hasData: boolean;
};

// ─── Constants ─────────────────────────────────────────────────────────────────
const SECONDS_PER_DAY = 24 * 60 * 60;
const RING_RADIUS = 64;
const RING_STROKE = 14;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const RANGE_PRESET_OPTIONS: Array<{
  label: string;
  preset: Exclude<DoordrishtiRangePreset, "custom">;
}> = [
    { label: "Today", preset: "today" },
    { label: "Weekly", preset: "weekly" },
    { label: "Monthly", preset: "monthly" },
  ];

// ─── Utility Functions ─────────────────────────────────────────────────────────
const padNumber = (v: number) => String(v).padStart(2, "0");

const getTodayDateValue = (date: Date = new Date()) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;

const buildFiltersForPreset = (
  preset: Exclude<DoordrishtiRangePreset, "custom">,
  date: Date = new Date(),
  deviceId: string = ""
): DoordrishtiFilters => {
  const endDate = new Date(date);
  const startDate = new Date(date);
  if (preset === "weekly") startDate.setDate(startDate.getDate() - 6);
  else if (preset === "monthly") startDate.setDate(startDate.getDate() - 29);
  return { deviceId, dateFrom: getTodayDateValue(startDate), dateTo: getTodayDateValue(endDate) };
};

const buildDefaultFilters = (date: Date = new Date()): DoordrishtiFilters =>
  buildFiltersForPreset("today", date);

const safeString = (value: unknown) => String(value ?? "").trim();
const normalizeRecordText = (value: unknown) => String(value ?? "").trim();
const safeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDurationToSeconds = (value: string) => {
  const normalizedValue = safeString(value);
  if (!normalizedValue) return 0;
  const normalizedLowerValue = normalizedValue.toLowerCase();
  let totalSeconds = 0;
  let matchedUnit = false;
  for (const match of normalizedLowerValue.matchAll(
    /(\d+)\s*(days?|d|hours?|hrs?|hr|h|minutes?|mins?|min|m|seconds?|secs?|sec|s)\b/g
  )) {
    const amount = Number(match[1]);
    const unit = match[2];
    if (!Number.isFinite(amount)) continue;
    matchedUnit = true;
    if (unit.startsWith("d")) { totalSeconds += amount * 24 * 60 * 60; continue; }
    if (unit.startsWith("h")) { totalSeconds += amount * 60 * 60; continue; }
    if (unit.startsWith("m")) { totalSeconds += amount * 60; continue; }
    totalSeconds += amount;
  }
  if (matchedUnit) return totalSeconds;

  const timeMatch = normalizedLowerValue.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (timeMatch) {
    const [, first, second, third] = timeMatch;
    if (third !== undefined) return Number(first) * 60 * 60 + Number(second) * 60 + Number(third);
    return Number(first) * 60 * 60 + Number(second) * 60;
  }
  const numericValue = Number(normalizedLowerValue);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const formatSecondsToDuration = (totalSeconds: number) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${padNumber(Math.floor(s / 3600))}h ${padNumber(Math.floor((s % 3600) / 60))}m ${padNumber(s % 60)}s`;
};

// Format datetime string "2025-12-07 08:00:27" → "07 Dec 2025 08:00"
const formatDateTime = (value: string): string => {
  if (!value) return "--";
  const ts = Date.parse(value.replace(" ", "T"));
  if (!Number.isFinite(ts)) return value;
  const d = new Date(ts);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${padNumber(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()} ${padNumber(d.getHours())}:${padNumber(d.getMinutes())}`;
};

const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

const getDateTimestamp = (value: string) => {
  const v = safeString(value);
  if (!v) return null;
  const t = Date.parse(v.replace(" ", "T"));
  return Number.isFinite(t) ? t : null;
};

const getDateOnlyTimestamp = (value: string) => {
  const v = safeString(value);
  if (!v) return null;
  const t = Date.parse(`${v}T00:00:00`);
  return Number.isFinite(t) ? t : null;
};

const getInclusiveDayCount = (dateFrom: string, dateTo: string) => {
  const s = getDateOnlyTimestamp(dateFrom);
  const e = getDateOnlyTimestamp(dateTo);
  if (s === null || e === null || e < s) return 1;
  return Math.floor((e - s) / (24 * 60 * 60 * 1000)) + 1;
};

const getRangeTotalSeconds = (dateFrom: string, dateTo: string) =>
  getInclusiveDayCount(dateFrom, dateTo) * SECONDS_PER_DAY;



// ─── Record Name / Display Helpers ─────────────────────────────────────────────
const getRecordNameCandidates = (record: EquipmentTrackingRecord) =>
  Array.from(
    new Set(
      [
        record.registrationNo,          // truck number — highest priority
        record.equipment.equipmentName,
        record.raw?.equipment_name,
        record.raw?.equipment?.equipment_name,
        record.raw?.equipmentName,
        record.raw?.display_name,
        record.equipment.doorNumber,
        record.serial,
        record.deviceId,
      ]
        .map(normalizeRecordText)
        .filter(Boolean)
    )
  );

const getRecordTitleScore = (candidate: string, record: EquipmentTrackingRecord) => {
  const upper = candidate.toUpperCase();
  const doorNumber = normalizeRecordText(record.equipment.doorNumber).toUpperCase();
  const regNo = normalizeRecordText(record.registrationNo).toUpperCase();
  let score = 0;
  // Prefer registration number (truck plate)
  if (upper === regNo && regNo.length > 0) score += 200;
  if (upper.includes("/") || upper.includes(" ")) score += 40;
  if (candidate.length >= 6) score += 20;
  if (upper !== doorNumber) score += 15;
  if (upper === doorNumber) score -= 15;
  return score;
};

const getRecordTitle = (record: EquipmentTrackingRecord) => {
  const overrideCandidate = getRecordNameCandidates(record).find(
    (c) => RECORD_TITLE_OVERRIDES[c]
  );
  if (overrideCandidate) return RECORD_TITLE_OVERRIDES[overrideCandidate];
  return [...getRecordNameCandidates(record)].sort((a, b) => {
    const delta = getRecordTitleScore(b, record) - getRecordTitleScore(a, record);
    return delta !== 0 ? delta : b.length - a.length;
  })[0] || "Unknown Vehicle";
};

const buildDeviceFilterLabel = (record: EquipmentTrackingRecord) => {
  const title = normalizeRecordText(getRecordTitle(record));
  const regNo = normalizeRecordText(record.registrationNo);
  if (!title) return regNo || record.deviceId || "Unknown Vehicle";
  if (regNo && !title.toUpperCase().includes(regNo.toUpperCase())) return `${title} | ${regNo}`;
  return title;
};

// ─── Transport Vehicle Filter ──────────────────────────────────────────────────
// Only show actual transport vehicles — exclude IoT pump / SRMPL devices
const IOT_PUMP_KEYWORDS = ["SRMPL", "IOT", "PUMP", "SUBSTATION", "WORKSHOP", "MOTOR", "COMPRESSOR"];

const isTransportVehicleRecord = (record: EquipmentTrackingRecord): boolean => {
  const regNo = normalizeRecordText(record.registrationNo).toUpperCase();
  const fullLabel = buildDeviceFilterLabel(record).toUpperCase();

  // Exclude records whose full display name (including overrides) contains IoT / pump keywords
  if (IOT_PUMP_KEYWORDS.some((kw) => fullLabel.includes(kw))) return false;

  // Must have a valid vehicle registration number (Indian plate pattern, e.g. CG04JB2808)
  // Pattern: 2 letters + 2 digits + 1-3 letters + 4 digits
  if (regNo && /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}$/.test(regNo.replace(/[-\s]/g, ""))) return true;

  // Fallback: has a registration number that is not a pure device ID (not all digits)
  if (regNo && regNo.length >= 6 && !/^\d+$/.test(regNo)) return true;

  return false;
};

const formatDeviceHeading = (value: string) =>
  safeString(value).replace(/_/g, " ").replace(/\s+/g, " ").trim() || "Unknown Vehicle";

// ─── Doordrishti URL ───────────────────────────────────────────────────────────
const buildDoordrishtiUrl = ({ deviceId, dateFrom, dateTo }: DoordrishtiFilters) => {
  const p = new URLSearchParams({
    device_id: deviceId || DEFAULT_DEVICE_ID,
    date_from: dateFrom,
    date_to: dateTo,
    time_picker_from: DEFAULT_TIME_FROM,
    time_picker_to: DEFAULT_TIME_TO,
    order_by: "0",
    order_type: "0",
    action: "report_trip_json",
    user_name: DEFAULT_USER_NAME,
    hash_key: DEFAULT_HASH_KEY,
    rand: String(Math.floor(Date.now() / 1000)),
  });
  return `${DOORDRISHTI_API_URL}?${p.toString()}`;
};

// ─── Flatten Trip Rows ──────────────────────────────────────────────────────────
const flattenTripRows = (response: DoordrishtiResponse | null): DoordrishtiTripRow[] => {
  const items = response?.data || [];
  return items
    .map((item) => ({
      deviceId: safeString(item.device_id),
      gpsDataId: safeString(item.gps_data_id),
      startDate: safeString(item.start_date),
      startLocation: safeString(item.start_location),
      endDate: safeString(item.end_date),
      registrationNo: safeString(item.registration_no),
      endLocation: safeString(item.end_location),
      distanceKm: safeNumber(item.distance) || 0,
      tripDifference: safeString(item.trip_diffrence),
      timeCoveredSeconds: parseDurationToSeconds(safeString(item.trip_diffrence)),
      averageSpeedKmph: safeNumber(item.average_speed) || 0,
    }))
    .filter(
      (item) =>
        item.registrationNo &&
        item.startDate &&
        item.endDate &&
        item.startLocation &&
        item.endLocation &&
        item.tripDifference
    );
};

// ─── Build Summary ──────────────────────────────────────────────────────────────
const buildTruckProgressSummary = ({
  deviceId,
  deviceName,
  equipmentName,
  totalTrips,
  totalRunningSeconds,
  totalIdleSeconds,
  totalPossibleSeconds,
  totalDistanceKm,
  averageSpeedKmph,
  movingCount,
  firstStartDate,
  lastEndDate,
}: {
  deviceId: string;
  deviceName: string;
  equipmentName: string;
  totalTrips: number;
  totalRunningSeconds: number;
  totalIdleSeconds: number;
  totalPossibleSeconds: number;
  totalDistanceKm: number;
  averageSpeedKmph: number;
  movingCount: number;
  firstStartDate: string;
  lastEndDate: string;
}): TruckProgressSummary => {
  const totalElapsedSeconds = totalRunningSeconds + totalIdleSeconds;
  const noDataSeconds = Math.max(0, totalPossibleSeconds - totalElapsedSeconds);
  const scorePercentage =
    totalPossibleSeconds > 0 ? (totalRunningSeconds / totalPossibleSeconds) * 100 : 0;

  // Internal ring metrics (for the donut arc — not shown as rows)
  const ringMetrics: TruckMetric[] = [
    {
      key: "running",
      label: "On Time",
      valueLabel: formatSecondsToDuration(totalRunningSeconds),
      dotClass: "bg-emerald-500",
      ringColor: "#16c784",
      chartValue: totalRunningSeconds,
    },
    {
      key: "idle",
      label: "Off Time",
      valueLabel: formatSecondsToDuration(totalIdleSeconds),
      dotClass: "bg-amber-500",
      ringColor: "#f59e0b",
      chartValue: totalIdleSeconds,
    },
  ];

  // Displayed metric rows
  const metrics: TruckMetric[] = [
    {
      key: "startTime",
      label: "Start Time",
      valueLabel: firstStartDate ? formatDateTime(firstStartDate) : "--",
      dotClass: "bg-emerald-500",
    },
    {
      key: "endTime",
      label: "End Time",
      valueLabel: lastEndDate ? formatDateTime(lastEndDate) : "--",
      dotClass: "bg-rose-500",
    },
    {
      key: "distance",
      label: "Total Distance",
      valueLabel: `${totalDistanceKm.toFixed(2)} Km`,
      dotClass: "bg-violet-500",
    },
    {
      key: "speed",
      label: "Avg Speed",
      valueLabel: `${averageSpeedKmph.toFixed(2)} Kmph`,
      dotClass: "bg-cyan-500",
    },
    {
      key: "workingHours",
      label: "Working Hours",
      valueLabel: formatSecondsToDuration(totalRunningSeconds),
      dotClass: "bg-indigo-500",
    },
  ];

  return {
    deviceId,
    deviceName,
    equipmentName,
    totalTrips,
    totalRunningSeconds,
    totalIdleSeconds,
    totalElapsedSeconds,
    totalPossibleSeconds,
    noDataSeconds,
    scorePercentage,
    scoreLabel: formatPercentage(scorePercentage),
    totalDistanceKm,
    averageSpeedKmph,
    workingHoursLabel: formatSecondsToDuration(totalRunningSeconds),
    movingCount,
    firstStartDate,
    lastEndDate,
    metrics,
    ringMetrics,
    hasData: totalElapsedSeconds > 0 || totalTrips > 0,
  };
};

// ─── Progress Ring ──────────────────────────────────────────────────────────────
const ProgressRing = ({
  scoreLabel,
  segments,
}: {
  scoreLabel: string;
  segments: TruckMetric[];
}) => {
  const total = segments.reduce((s, seg) => s + (seg.chartValue || 0), 0);
  const circles: ReactElement[] = [];
  let accumulated = 0;

  segments.forEach((seg) => {
    const value = seg.chartValue || 0;
    if (value <= 0 || !seg.ringColor || total <= 0) return;
    const len = (value / total) * RING_CIRCUMFERENCE;
    circles.push(
      <circle
        key={seg.key}
        cx="80" cy="80" r={RING_RADIUS}
        fill="transparent"
        stroke={seg.ringColor}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={`${len} ${RING_CIRCUMFERENCE}`}
        strokeDashoffset={-accumulated}
        className="transition-all duration-1000 ease-in-out"
      />
    );
    accumulated += len;
  });

  return (
    <div className="relative flex h-[100px] w-[100px] shrink-0 items-center justify-center sm:h-[130px] sm:w-[130px]">
      <div className="absolute h-3/4 w-3/4 rounded-full bg-slate-50/50 blur-xl transition-all group-hover:bg-slate-100/50" />
      <svg width="130" height="130" viewBox="0 0 160 160" className="relative h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={RING_RADIUS} fill="transparent" stroke="#f8fafc" strokeWidth={RING_STROKE + 2} />
        {circles}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 sm:text-[9px]">Score</span>
        <div className="flex items-baseline">
          <span className="bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-[18px] font-black tracking-tight text-transparent sm:text-[22px]">
            {scoreLabel.replace("%", "")}
          </span>
          <span className="ml-0.5 text-[10px] font-black text-slate-400 sm:text-[11px]">%</span>
        </div>
      </div>
    </div>
  );
};


// ─── Truck Summary Card ─────────────────────────────────────────────────────────
const TruckSummaryCard = ({
  summary,
  isAggregate,
}: {
  summary: TruckProgressSummary;
  isAggregate?: boolean;
}) => (
  <article className="group relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-2.5 shadow-sm transition-all duration-300 hover:shadow-md sm:p-4">
    {/* Card Header */}
    <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-3 sm:gap-6">
      <div className="min-w-0 flex-1">
        {/* Vehicle / Truck Registration Number */}
        <h2 className="truncate text-[16px] font-black uppercase tracking-tight text-slate-900 sm:text-[20px]">
          {isAggregate ? "ALL VEHICLES" : (
            <span className="flex items-center gap-2">
              <Truck className="h-4 w-4 shrink-0 text-indigo-500" />
              {formatDeviceHeading(summary.deviceName)}
            </span>
          )}
        </h2>
        {/* Equipment name as subtitle */}
        {!isAggregate && summary.equipmentName && summary.equipmentName.toUpperCase() !== summary.deviceName.toUpperCase() && (
          <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">
            {formatDeviceHeading(summary.equipmentName)}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 rounded-lg bg-[#ff9d1a] px-2 py-1 shadow-sm sm:rounded-xl sm:px-3 sm:py-1.5">
          <TrendingUp className="h-3 w-3 text-white sm:h-4 sm:w-4" />
          <span className="text-[10px] font-black text-white sm:text-[12px]">{summary.scoreLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-2 py-1 shadow-sm sm:rounded-xl sm:px-3 sm:py-1.5">
          <BarChart3 className="h-3 w-3 text-slate-400 sm:h-4 sm:w-4" />
          <span className="text-[10px] font-black text-white sm:text-[12px]">{summary.totalTrips}</span>
        </div>
      </div>
    </div>

    {/* Ring + Metrics */}
    <div className="mt-3 flex items-center justify-between gap-3 sm:mt-4 sm:gap-6">
      <div className="shrink-0 scale-90 sm:scale-100">
        <ProgressRing scoreLabel={summary.scoreLabel} segments={summary.ringMetrics} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 sm:gap-2">
        {summary.metrics.map((metric) => (
          <div
            key={metric.key}
            className="flex items-center justify-between rounded-lg bg-slate-50/80 p-1 px-2 transition-all hover:bg-slate-100"
          >
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${metric.dotClass} shadow-sm`} />
              <span className="text-[10px] font-black uppercase tracking-tight text-slate-900">
                {metric.label}
              </span>
            </div>
            <div className="rounded bg-white px-2 py-0.5 text-[11px] font-black text-[#1e4b7a] shadow-sm ring-1 ring-slate-200">
              {metric.valueLabel}
            </div>
          </div>
        ))}
      </div>
    </div>


  </article>
);

type TransportLrBiltyRecord = Record<string, unknown>;

const chartPalette = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6", "#06b6d4"];

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

// ─── Main Dashboard ─────────────────────────────────────────────────────────────
export default function TransportDashboard() {
  const [selectedRangePreset, setSelectedRangePreset] = useState<DoordrishtiRangePreset>("today");
  const [filterValues, setFilterValues] = useState<DoordrishtiFilters>(() =>
    buildDefaultFilters(new Date())
  );
  const [appliedFilters, setAppliedFilters] = useState<DoordrishtiFilters>(() =>
    buildDefaultFilters(new Date())
  );
  const [deviceOptions, setDeviceOptions] = useState<DoordrishtiDeviceOption[]>([]);
  const [deviceOptionsLoading, setDeviceOptionsLoading] = useState(false);
  const [responseData, setResponseData] = useState<Record<string, EquipmentTripReportRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const takeover = useTransportAnalyticsSection(getTakeoverSummary);
  const handover = useTransportAnalyticsSection(getHandoverSummary);

  const [records, setRecords] = useState<TransportLrBiltyRecord[]>([]);
  const [loadingBilty, setLoadingBilty] = useState(true);
  const [errorBilty, setErrorBilty] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");

  const [shiftChangeCount, setShiftChangeCount] = useState<number | null>(null);
  const [equipmentHandoverCount, setEquipmentHandoverCount] = useState<number | null>(null);
  const [equipmentTakeoverCount, setEquipmentTakeoverCount] = useState<number | null>(null);
  const [podRegisterCount, setPodRegisterCount] = useState<number | null>(null);
  const [loadingNewApis, setLoadingNewApis] = useState(true);

  const fetchBiltyData = async () => {
    try {
      setLoadingBilty(true);
      setErrorBilty("");
      const response = await getLrBiltyRegister({ limit: 2000 });
      setRecords(response.records);
    } catch (err: unknown) {
      setErrorBilty(err instanceof Error ? err.message : "Failed to fetch operational data");
    } finally {
      setLoadingBilty(false);
    }
  };

  const fetchNewApisData = async (signal?: AbortSignal) => {
    try {
      setLoadingNewApis(true);
      const [shiftChangeRes, equipHandoverRes, equipTakeoverRes, podRegisterRes] = await Promise.all([
        fetchEquipmentShiftChangeList({}, signal).catch(() => ({ records: [], total: 0 })),
        fetchEquipmentHandoverList({}, signal).catch(() => ({ records: [], total: 0 })),
        fetchEquipmentTakeoverList({}, signal).catch(() => ({ records: [], total: 0 })),
        fetchPodRegisterReport({}, signal).catch(() => ({ records: [], total: 0 })),
      ]);

      setShiftChangeCount(shiftChangeRes.records.length || shiftChangeRes.total || 0);
      setEquipmentHandoverCount(equipHandoverRes.records.length || equipHandoverRes.total || 0);
      setEquipmentTakeoverCount(equipTakeoverRes.records.length || equipTakeoverRes.total || 0);
      setPodRegisterCount(podRegisterRes.records.length || podRegisterRes.total || 0);
    } catch (err) {
      console.error("Failed to fetch new APIs data", err);
    } finally {
      setLoadingNewApis(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchBiltyData();
    fetchNewApisData(controller.signal);
    return () => controller.abort();
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
    const pod = filteredRecords.filter(r => safeString(r.lr_bilty_status).toUpperCase() === "POD_PREPARED").length;
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

  // ── Load ALL vehicles (no IoT pump filter) ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadDeviceOptions = async () => {
      setDeviceOptionsLoading(true);
      try {
        const response = await getEquipmentTrackingReport();
        const uniqueOptions = new Map<string, DoordrishtiDeviceOption>();

        // ★ Only transport vehicles — exclude IoT pump / SRMPL devices
        response.records.filter(isTransportVehicleRecord).forEach((record) => {
          if (!record.deviceId || uniqueOptions.has(record.deviceId)) return;

          const regNo = normalizeRecordText(record.registrationNo) || normalizeRecordText(record.equipment.doorNumber) || record.deviceId;
          const eqName = normalizeRecordText(record.equipment.equipmentName)
            || normalizeRecordText(record.equipment.equipmentType)
            || normalizeRecordText(record.equipment.equipmentCategory)
            || normalizeRecordText(record.raw?.equipment_name)
            || normalizeRecordText(record.raw?.display_name)
            || normalizeRecordText(record.raw?.vehicle_type)
            || normalizeRecordText(record.raw?.equipment?.vehicle_type)
            || normalizeRecordText(record.raw?.equipment?.asset_type)
            || normalizeRecordText(record.raw?.type)
            || "";

          let displayLabel = regNo;
          if (eqName && eqName.toUpperCase() !== regNo.toUpperCase()) {
            displayLabel = `${eqName} | ${regNo}`;
          }

          uniqueOptions.set(record.deviceId, {
            value: record.deviceId,
            label: displayLabel,
            registrationNo: regNo,
            equipmentName: eqName,
          });
        });

        const nextOptions = [...uniqueOptions.values()].sort((a, b) =>
          a.label.localeCompare(b.label)
        );

        if (!cancelled && nextOptions.length) {
          setDeviceOptions(nextOptions);
          setFilterValues((prev) => ({ ...prev, deviceId: "ALL" }));
          setAppliedFilters((prev) => ({ ...prev, deviceId: "ALL" }));
        } else if (!cancelled) {
          setLoading(false);
        }
      } catch {
        if (!cancelled) { setDeviceOptions([]); setLoading(false); }
      } finally {
        if (!cancelled) setDeviceOptionsLoading(false);
      }
    };

    void loadDeviceOptions();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch trip data ──────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    const loadTrips = async () => {
      setLoading(true);
      // ── Fetch via backend API (same as TransportLiveLocation) ────────────
      setError("");
      try {
        const devicesToFetch =
          appliedFilters.deviceId === "ALL"
            ? deviceOptions.map((o) => o.value)
            : [appliedFilters.deviceId];

        if (!devicesToFetch.length) {
          setLoading(false);
          return;
        }

        // Clear existing data before progressive loading starts
        setResponseData({});

        // Fetch all devices completely in parallel to achieve maximum speed
        await Promise.allSettled(
          devicesToFetch.map(async (deviceId) => {
            try {
              const report = await getEquipmentTripReport(
                {
                  deviceId,
                  dateFrom: appliedFilters.dateFrom,
                  dateTo: appliedFilters.dateTo,
                  timePickerFrom: "00:00:00",
                  timePickerTo: "23:59:59",
                },
                controller.signal
              );

              // Progressively update the UI as each device's data arrives
              setResponseData((prev) => ({ ...prev, [deviceId]: report.records }));
            } catch (e) {
              console.error(`Failed to fetch for device ${deviceId}`, e);
            }
          })
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unable to load trip data.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    if (deviceOptions.length > 0) void loadTrips();
    return () => controller.abort();
  }, [appliedFilters, deviceOptions]);

  const handleRangePresetSelect = (preset: DoordrishtiRangePreset) => {
    if (preset === "custom") return;
    setSelectedRangePreset(preset);
    const f = buildFiltersForPreset(preset, new Date(), filterValues.deviceId);
    setFilterValues((prev) => ({ ...prev, dateFrom: f.dateFrom, dateTo: f.dateTo }));
    setAppliedFilters((prev) => ({ ...prev, dateFrom: f.dateFrom, dateTo: f.dateTo }));
  };

  const handleInputChange = (field: keyof DoordrishtiFilters, value: string) => {
    setFilterValues((prev) => ({ ...prev, [field]: value }));
    if (field === "dateFrom" || field === "dateTo") setSelectedRangePreset("custom");
  };

  const handleApplyFilters = () => setAppliedFilters({ ...filterValues });

  const totalRangeSecondsPerDevice = useMemo(
    () => getRangeTotalSeconds(appliedFilters.dateFrom, appliedFilters.dateTo),
    [appliedFilters.dateFrom, appliedFilters.dateTo]
  );

  // Helper — get vehicle registration number (truck number) for display
  const getVehicleInfo = (deviceId: string) => {
    const opt = deviceOptions.find((o) => o.value === deviceId);
    return {
      registrationNo: opt?.registrationNo || deviceId,
      equipmentName: opt?.equipmentName || "",
    };
  };

  const deviceSummaries = useMemo(() => {
    const devicesToProcess =
      appliedFilters.deviceId === "ALL"
        ? deviceOptions.map((o) => o.value)
        : [appliedFilters.deviceId];

    return devicesToProcess.map((deviceId) => {
      const tripRows: EquipmentTripReportRecord[] = responseData[deviceId] || [];
      const totalTrips = tripRows.length;

      // Working hours = sum of diffSeconds (actual duration per trip from backend)
      const totalRunningSeconds = tripRows.reduce((sum, t) => sum + (t.diffSeconds || 0), 0);

      // Total distance
      const totalDistanceKm = tripRows.reduce((sum, t) => sum + (t.distance || 0), 0);

      // Average speed = average of per-trip averageSpeed (weighted by trips)
      const speedSum = tripRows.reduce((sum, t) => sum + (t.averageSpeed || 0), 0);
      const averageSpeedKmph = totalTrips > 0 ? speedSum / totalTrips : 0;

      // Moving count = trips where vehicleStatus indicates moving or distance > 0
      const movingCount = tripRows.filter(
        (t) => (t.distance || 0) > 0 || t.vehicleStatus?.toLowerCase().includes("moving")
      ).length;

      // Idle time between consecutive trips (gap between end and next start)
      let totalIdleSeconds = 0;
      const sortedTrips = [...tripRows].sort((a, b) => {
        return (getDateTimestamp(a.startDate ?? "") || 0) - (getDateTimestamp(b.startDate ?? "") || 0);
      });
      for (let i = 1; i < sortedTrips.length; i++) {
        const prevEnd = getDateTimestamp(sortedTrips[i - 1].endDate ?? "");
        const nextStart = getDateTimestamp(sortedTrips[i].startDate ?? "");
        if (prevEnd !== null && nextStart !== null && nextStart > prevEnd) {
          totalIdleSeconds += Math.floor((nextStart - prevEnd) / 1000);
        }
      }

      // Get registration no — from deviceOptions
      const vehicleInfo = getVehicleInfo(deviceId);
      const deviceName = vehicleInfo.registrationNo;
      const equipmentName = vehicleInfo.equipmentName;

      // First and last trip dates
      const firstStartDate = sortedTrips[0]?.startDate ?? "";
      const lastEndDate = sortedTrips[sortedTrips.length - 1]?.endDate ?? "";

      return buildTruckProgressSummary({
        deviceId,
        deviceName,
        equipmentName,
        totalTrips,
        totalRunningSeconds,
        totalIdleSeconds,
        totalPossibleSeconds: totalRangeSecondsPerDevice,
        totalDistanceKm,
        averageSpeedKmph,
        movingCount,
        firstStartDate,
        lastEndDate,
      });
    });
  }, [appliedFilters.deviceId, deviceOptions, responseData, totalRangeSecondsPerDevice]);



  const hasRenderableSummaries = deviceSummaries.length > 0 && deviceSummaries.some((s) => s.hasData);
  const showDivisionAnalysis = deviceSummaries.length > 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] px-0 pb-4 pt-0 text-slate-900 sm:px-3 sm:pb-8 sm:pt-3 md:px-4">
      <div className="mx-auto max-w-full space-y-2 sm:space-y-4">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="rounded-none border-b border-x-0 border-t-0 border-slate-200 bg-white p-3 shadow-sm sm:rounded-[28px] sm:border-x sm:border-t sm:p-6 sm:shadow-[0_15px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-8 rounded-full bg-[#1e4b7a]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  Real-time Dashboard
                </span>
              </div>
              <h1 className="mt-1 text-[20px] font-black tracking-tight text-slate-900 sm:mt-1 sm:text-[32px]">
                Transport <span className="text-[#1e4b7a]">Progress</span> Report
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {RANGE_PRESET_OPTIONS.map((option) => {
                const isActive = selectedRangePreset === option.preset;
                return (
                  <button
                    key={option.preset}
                    type="button"
                    onClick={() => handleRangePresetSelect(option.preset)}
                    className={`h-9 rounded-xl border px-4 text-[10px] font-black uppercase tracking-[0.12em] transition-all duration-300 sm:h-11 sm:rounded-2xl sm:px-5 sm:text-[11px] ${isActive
                      ? "border-slate-900 bg-slate-900 text-white shadow-[0_10px_20px_rgba(0,0,0,0.15)]"
                      : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200 hover:bg-white"
                      }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-4 grid gap-2 sm:mt-6 sm:gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
            <div className="space-y-1 sm:space-y-2">
              <span className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Vehicle Selection
              </span>
              <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400 focus-within:bg-white transition-all sm:h-12 sm:rounded-2xl sm:px-4">
                <Search className="h-4 w-4 text-slate-400" />
                <select
                  value={filterValues.deviceId}
                  onChange={(e) => handleInputChange("deviceId", e.target.value)}
                  className="w-full bg-transparent text-[13px] font-bold text-slate-700 outline-none sm:text-[14px]"
                  disabled={deviceOptionsLoading}
                >
                  <option value="ALL">ALL VEHICLES</option>
                  {deviceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:contents">
              <div className="space-y-1 sm:space-y-2">
                <span className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  From Date
                </span>
                <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400 focus-within:bg-white transition-all sm:h-12 sm:gap-3 sm:rounded-2xl sm:px-4">
                  <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    type="date"
                    value={filterValues.dateFrom}
                    onChange={(e) => handleInputChange("dateFrom", e.target.value)}
                    className="w-full bg-transparent text-[12px] font-bold text-slate-700 outline-none sm:text-[14px]"
                  />
                </div>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <span className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  To Date
                </span>
                <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400 focus-within:bg-white transition-all sm:h-12 sm:gap-3 sm:rounded-2xl sm:px-4">
                  <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    type="date"
                    value={filterValues.dateTo}
                    onChange={(e) => handleInputChange("dateTo", e.target.value)}
                    className="w-full bg-transparent text-[12px] font-bold text-slate-700 outline-none sm:text-[14px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApplyFilters}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1e4b7a] px-6 text-[12px] font-black uppercase tracking-[0.15em] text-white shadow-[0_10px_20px_rgba(30,75,122,0.2)] transition-all hover:bg-[#153658] hover:shadow-none active:scale-95"
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
              </button>
              <button
                type="button"
                onClick={() => setAppliedFilters({ ...filterValues })}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[12px] font-black uppercase tracking-[0.15em] text-slate-600 transition-all hover:bg-slate-50 active:scale-95"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-rose-50 px-5 py-3 text-[12px] font-bold text-rose-600 ring-1 ring-rose-200/50">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : null}
        </header>

        {/* ── Main Content ───────────────────────────────────────────────────── */}
        <main className="space-y-6 sm:space-y-8">
          {loading || deviceOptionsLoading ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-[32px] border border-slate-100 bg-white shadow-sm">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-100 border-t-[#1e4b7a]" />
                <Activity className="h-6 w-6 text-[#1e4b7a]" />
              </div>
              <p className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-400">
                Fetching Vehicle Data...
              </p>
            </div>
          ) : hasRenderableSummaries ? (
            <>
              {/* Per-vehicle cards */}
              {showDivisionAnalysis ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 px-2">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-4 w-4 text-[#1e4b7a]" />
                      <h2 className="text-[14px] font-black uppercase tracking-[0.2em] text-slate-900">
                        {appliedFilters.deviceId === "ALL" ? "Vehicle Wise Analysis" : "Vehicle Analysis"}
                      </h2>
                    </div>
                    <div className="h-px flex-1 bg-slate-200/60" />
                    <span className="text-[10px] font-black text-slate-400">
                      {deviceSummaries.length} vehicles
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                    {deviceSummaries.map((summary) => (
                      <TruckSummaryCard key={summary.deviceId} summary={summary} />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[32px] border border-slate-100 bg-white p-8 text-center shadow-sm">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-200">
                <BarChart3 className="h-10 w-10" />
              </div>
              <h3 className="text-[18px] font-black uppercase tracking-widest text-slate-300">
                No Trip Data Found
              </h3>
              <p className="mt-2 max-w-md text-[14px] font-medium text-slate-500">
                Selected vehicle aur date range ke liye koi data available nahi hai.
                Kripya date range ya vehicle selection check karein.
              </p>
            </div>
          )}
        </main>

        <div className="space-y-4 py-1 sm:space-y-6 sm:py-2">
          {errorBilty ? (
            <div className="mx-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {errorBilty}
            </div>
          ) : null}

          {/* Operations Command Center */}
          <div className="space-y-2.5">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-indigo-500" />
              Core Operational Analytics
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:gap-4 xl:grid-cols-5 px-1">
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
                label="Equipment Shift Changes"
                value={loadingNewApis ? "..." : formatNumber(shiftChangeCount ?? 0)}
                tone="violet"
              />
              <AnalyticsKpiCard
                label="Equipment Handovers"
                value={loadingNewApis ? "..." : formatNumber(equipmentHandoverCount ?? 0)}
                tone="emerald"
              />
              <AnalyticsKpiCard
                label="Equipment Takeovers"
                value={loadingNewApis ? "..." : formatNumber(equipmentTakeoverCount ?? 0)}
                tone="blue"
              />
              <AnalyticsKpiCard
                label="Prepared PODs"
                value={loadingNewApis ? "..." : formatNumber(podRegisterCount ?? 0)}
                tone="rose"
              />
            </div>
          </div>



          {/* Primary Visual Row */}
          <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
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
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
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
          <div className="grid gap-4 sm:gap-6 xl:grid-cols-3">
            <div className="space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Pipeline Status</h2>
              <div className="grid gap-2.5 sm:gap-3">
                {pipelineItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm sm:p-2.5">
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
              <div className="grid gap-2.5 sm:gap-3">
                {recentTakeovers.length > 0 ? recentTakeovers.map((tk, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-50 bg-white p-2.5 shadow-sm hover:border-blue-100 transition-colors sm:gap-4 sm:p-3">
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
      </div>
    </div>
  );
}
