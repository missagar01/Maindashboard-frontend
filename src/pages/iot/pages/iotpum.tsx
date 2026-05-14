"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarDays,
  Clock3,
  LayoutGrid,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";
import {
  getEquipmentTrackingReport,
  type EquipmentTrackingRecord,
} from "../../../api/transport/trackingApi";

const DOORDRISHTI_API_URL = "https://doordrishti.co/report_trip_ignition_result.php";
const DEFAULT_DEVICE_ID = "13234";
const DEFAULT_USER_NAME = "sagarpipe@doordrishti.com";
const DEFAULT_HASH_KEY = "AMICGJOBSWLVIQJG";
const DEFAULT_TIME_FROM = "00:00:00";
const DEFAULT_TIME_TO = "23:59:59";
const FLEET_FILTER_KEYWORDS = [
  "IOT PUM",
  "IOT PUMP",
  "IOT PUM BS",
  "IOT PUMP BS",
];
const RECORD_TITLE_OVERRIDES: Record<string, string> = {
  "353742371399445": "SRMPL_8_Workshop",
};

type DoordrishtiFilters = {
  deviceId: string;
  dateFrom: string;
  dateTo: string;
};

type DoordrishtiRangePreset = "today" | "weekly" | "monthly" | "custom";

type DoordrishtiDeviceOption = {
  value: string;
  label: string;
};

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
  endDateGpsDataId: string;
  registrationNo: string;
  endLocation: string;
  distance: number;
  tripDifference: string;
  timeCoveredSeconds: number;
};

type PumpMetric = {
  key: string;
  label: string;
  valueLabel: string;
  dotClass: string;
  ringColor?: string;
  chartValue?: number;
};

type PumpProgressSummary = {
  deviceId: string;
  deviceName: string;
  totalTrips: number;
  totalRunningSeconds: number;
  totalIdleSeconds: number;
  totalElapsedSeconds: number;
  totalPossibleSeconds: number;
  noDataSeconds: number;
  scorePercentage: number;
  scoreLabel: string;
  metrics: PumpMetric[];
  ringMetrics: PumpMetric[];
  hasData: boolean;
};

const SECONDS_PER_DAY = 24 * 60 * 60;
const RING_RADIUS = 64;
const RING_STROKE = 14;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const padNumber = (value: number) => String(value).padStart(2, "0");

const getTodayDateValue = (date: Date = new Date()) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
    date.getDate()
  )}`;

const DOORDRISHTI_RANGE_PRESET_OPTIONS: Array<{
  label: string;
  preset: Exclude<DoordrishtiRangePreset, "custom">;
}> = [
    { label: "Today", preset: "today" },
    { label: "Weekly", preset: "weekly" },
    { label: "Monthly", preset: "monthly" },
  ];

const buildFiltersForPreset = (
  preset: Exclude<DoordrishtiRangePreset, "custom">,
  date: Date = new Date(),
  deviceId: string = DEFAULT_DEVICE_ID
): DoordrishtiFilters => {
  const endDate = new Date(date);
  const startDate = new Date(date);

  if (preset === "weekly") {
    startDate.setDate(startDate.getDate() - 6);
  } else if (preset === "monthly") {
    startDate.setDate(startDate.getDate() - 29);
  }

  return {
    deviceId,
    dateFrom: getTodayDateValue(startDate),
    dateTo: getTodayDateValue(endDate),
  };
};

const buildDefaultFilters = (date: Date = new Date()): DoordrishtiFilters =>
  buildFiltersForPreset("today", date);

const safeString = (value: unknown) => String(value ?? "").trim();

const normalizeRecordText = (value: unknown) => String(value ?? "").trim();

const normalizeFleetFilterText = (value: unknown) =>
  normalizeRecordText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasIotPumpKeyword = (value: unknown) => {
  const normalizedValue = normalizeFleetFilterText(value);

  if (!normalizedValue) {
    return false;
  }

  return FLEET_FILTER_KEYWORDS.some((keyword) =>
    normalizedValue.includes(keyword)
  );
};

const safeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatSecondsToDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${padNumber(hours)}h ${padNumber(minutes)}m ${padNumber(seconds)}s`;
};

const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

const getDateTimestamp = (value: string) => {
  const normalizedValue = safeString(value);

  if (!normalizedValue) {
    return null;
  }

  const timestamp = Date.parse(normalizedValue.replace(" ", "T"));

  return Number.isFinite(timestamp) ? timestamp : null;
};

const getDateOnlyTimestamp = (value: string) => {
  const normalizedValue = safeString(value);

  if (!normalizedValue) {
    return null;
  }

  const timestamp = Date.parse(`${normalizedValue}T00:00:00`);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const getInclusiveDayCount = (dateFrom: string, dateTo: string) => {
  const startTimestamp = getDateOnlyTimestamp(dateFrom);
  const endTimestamp = getDateOnlyTimestamp(dateTo);

  if (startTimestamp === null || endTimestamp === null || endTimestamp < startTimestamp) {
    return 1;
  }

  return Math.floor((endTimestamp - startTimestamp) / (24 * 60 * 60 * 1000)) + 1;
};

const getRangeTotalSeconds = (dateFrom: string, dateTo: string) =>
  getInclusiveDayCount(dateFrom, dateTo) * SECONDS_PER_DAY;

const parseDurationToSeconds = (value: string) => {
  const normalizedValue = safeString(value);

  if (!normalizedValue) {
    return 0;
  }

  const normalizedLowerValue = normalizedValue.toLowerCase();
  let totalSeconds = 0;
  let matchedUnit = false;

  for (const match of normalizedLowerValue.matchAll(
    /(\d+)\s*(days?|d|hours?|hrs?|hr|h|minutes?|mins?|min|m|seconds?|secs?|sec|s)\b/g
  )) {
    const amount = Number(match[1]);
    const unit = match[2];

    if (!Number.isFinite(amount)) {
      continue;
    }

    matchedUnit = true;

    if (unit.startsWith("d")) {
      totalSeconds += amount * 24 * 60 * 60;
      continue;
    }

    if (unit.startsWith("h")) {
      totalSeconds += amount * 60 * 60;
      continue;
    }

    if (unit.startsWith("m")) {
      totalSeconds += amount * 60;
      continue;
    }

    totalSeconds += amount;
  }

  if (matchedUnit) {
    return totalSeconds;
  }

  const timeMatch = normalizedLowerValue.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);

  if (timeMatch) {
    const [, first, second, third] = timeMatch;

    if (third !== undefined) {
      return Number(first) * 60 * 60 + Number(second) * 60 + Number(third);
    }

    return Number(first) * 60 * 60 + Number(second) * 60;
  }

  const numericValue = Number(normalizedLowerValue);

  return Number.isFinite(numericValue) ? numericValue : 0;
};

const getRecordNameCandidates = (record: EquipmentTrackingRecord) =>
  Array.from(
    new Set(
      [
        record.equipment.equipmentName,
        record.raw?.equipment_name,
        record.raw?.equipment?.equipment_name,
        record.raw?.equipmentName,
        record.raw?.equipment?.equipmentName,
        record.raw?.display_name,
        record.raw?.equipment_label,
        record.raw?.label,
        record.registrationNo,
        record.equipment.doorNumber,
        record.serial,
        record.deviceId,
      ]
        .map(normalizeRecordText)
        .filter(Boolean)
    )
  );

const getRecordTitleScore = (
  candidate: string,
  record: EquipmentTrackingRecord
) => {
  const normalizedCandidate = candidate.toUpperCase();
  const doorNumber = normalizeRecordText(record.equipment.doorNumber).toUpperCase();
  const registrationNo = normalizeRecordText(record.registrationNo).toUpperCase();

  let score = 0;

  if (hasIotPumpKeyword(normalizedCandidate)) {
    score += 100;
  }

  if (normalizedCandidate.includes("/") || normalizedCandidate.includes(" ")) {
    score += 40;
  }

  if (candidate.length >= 12) {
    score += 20;
  }

  if (normalizedCandidate !== doorNumber && normalizedCandidate !== registrationNo) {
    score += 15;
  }

  if (normalizedCandidate === doorNumber) {
    score -= 15;
  }

  return score;
};

const getRecordTitle = (record: EquipmentTrackingRecord) => {
  const overrideCandidate = getRecordNameCandidates(record).find(
    (candidate) => RECORD_TITLE_OVERRIDES[candidate]
  );

  if (overrideCandidate) {
    return RECORD_TITLE_OVERRIDES[overrideCandidate];
  }

  return [...getRecordNameCandidates(record)]
    .sort((left, right) => {
      const scoreDelta =
        getRecordTitleScore(right, record) - getRecordTitleScore(left, record);

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return right.length - left.length;
    })[0] || "Unnamed equipment";
};

const buildDeviceFilterLabel = (record: EquipmentTrackingRecord) => {
  const title = normalizeRecordText(getRecordTitle(record));
  const fallbackMeta =
    normalizeRecordText(record.equipment.doorNumber) ||
    normalizeRecordText(record.registrationNo) ||
    normalizeRecordText(record.deviceId);

  if (!title) {
    return fallbackMeta || "Unnamed equipment";
  }

  if (
    fallbackMeta &&
    !title.toUpperCase().includes(fallbackMeta.toUpperCase())
  ) {
    return `${title} | ${fallbackMeta}`;
  }

  return title;
};

const formatDeviceHeading = (value: string) =>
  safeString(value).replace(/_/g, " ").replace(/\s+/g, " ").trim() || "Unnamed device";

const getRecordSearchText = (record: EquipmentTrackingRecord) =>
  [
    ...getRecordNameCandidates(record),
    record.equipment.equipmentCategory,
    record.equipment.equipmentType,
    record.voiceNo,
  ]
    .map(normalizeRecordText)
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

const isIotPumpRecord = (record: EquipmentTrackingRecord) =>
  hasIotPumpKeyword(getRecordSearchText(record));

const buildDoordrishtiUrl = ({
  deviceId,
  dateFrom,
  dateTo,
}: DoordrishtiFilters) => {
  const searchParams = new URLSearchParams({
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

  return `${DOORDRISHTI_API_URL}?${searchParams.toString()}`;
};

const flattenTripRows = (response: DoordrishtiResponse | null): DoordrishtiTripRow[] => {
  const items = response?.data || [];

  return items
    .map((item) => ({
      deviceId: safeString(item.device_id),
      gpsDataId: safeString(item.gps_data_id),
      startDate: safeString(item.start_date),
      startLocation: safeString(item.start_location),
      endDate: safeString(item.end_date),
      endDateGpsDataId: safeString(item.end_date_gps_data_id),
      registrationNo: safeString(item.registration_no),
      endLocation: safeString(item.end_location),
      distance: safeNumber(item.distance) || 0,
      tripDifference: safeString(item.trip_diffrence),
      timeCoveredSeconds: parseDurationToSeconds(safeString(item.trip_diffrence)),
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

const buildPumpProgressSummary = ({
  deviceId,
  deviceName,
  totalTrips,
  totalRunningSeconds,
  totalIdleSeconds,
  totalPossibleSeconds,
}: {
  deviceId: string;
  deviceName: string;
  totalTrips: number;
  totalRunningSeconds: number;
  totalIdleSeconds: number;
  totalPossibleSeconds: number;
}): PumpProgressSummary => {
  const totalElapsedSeconds = totalRunningSeconds + totalIdleSeconds;
  const noDataSeconds = Math.max(0, totalPossibleSeconds - totalElapsedSeconds);
  const scorePercentage =
    totalPossibleSeconds > 0 ? (totalRunningSeconds / totalPossibleSeconds) * 100 : 0;

  const metrics: PumpMetric[] = [
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
    {
      key: "captured",
      label: "Total Time",
      valueLabel: formatSecondsToDuration(totalElapsedSeconds),
      dotClass: "bg-slate-900",
    },


  ];

  const hasData = totalElapsedSeconds > 0 || totalTrips > 0;

  return {
    deviceId,
    deviceName,
    totalTrips,
    totalRunningSeconds,
    totalIdleSeconds,
    totalElapsedSeconds,
    totalPossibleSeconds,
    noDataSeconds,
    scorePercentage,
    scoreLabel: formatPercentage(scorePercentage),
    metrics,
    ringMetrics: metrics.filter((metric) => typeof metric.chartValue === "number"),
    hasData,
  };
};

const ProgressRing = ({
  scoreLabel,
  segments,
}: {
  scoreLabel: string;
  segments: PumpMetric[];
}) => {
  const total = segments.reduce((sum, segment) => sum + (segment.chartValue || 0), 0);
  const circles: ReactElement[] = [];
  let accumulated = 0;

  segments.forEach((segment) => {
    const value = segment.chartValue || 0;

    if (value <= 0 || !segment.ringColor || total <= 0) {
      return;
    }

    const segmentLength = (value / total) * RING_CIRCUMFERENCE;

    circles.push(
      <circle
        key={segment.key}
        cx="80"
        cy="80"
        r={RING_RADIUS}
        fill="transparent"
        stroke={segment.ringColor}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={`${segmentLength} ${RING_CIRCUMFERENCE}`}
        strokeDashoffset={-accumulated}
        className="transition-all duration-1000 ease-in-out"
      />
    );

    accumulated += segmentLength;
  });

  return (
    <div className="relative flex h-[100px] w-[100px] shrink-0 items-center justify-center sm:h-[130px] sm:w-[130px]">
      {/* Background Glow */}
      <div className="absolute h-3/4 w-3/4 rounded-full bg-slate-50/50 blur-xl transition-all group-hover:bg-slate-100/50" />

      <svg
        width="130"
        height="130"
        viewBox="0 0 160 160"
        className="relative h-full w-full -rotate-90"
      >
        <circle
          cx="80"
          cy="80"
          r={RING_RADIUS}
          fill="transparent"
          stroke="#f8fafc"
          strokeWidth={RING_STROKE + 2}
        />
        {circles}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 sm:text-[9px]">
            Score
          </span>
          <div className="flex items-baseline">
            <span className="bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-[18px] font-black tracking-tight text-transparent sm:text-[22px]">
              {scoreLabel.replace('%', '')}
            </span>
            <span className="ml-0.5 text-[10px] font-black text-slate-400 sm:text-[11px]">%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricIcon = ({ metricKey }: { metricKey: string }) => {
  switch (metricKey) {
    case "running": return <Clock3 className="h-3.5 w-3.5 text-emerald-500" />;
    case "idle": return <Activity className="h-3.5 w-3.5 text-amber-500" />;
    case "no-data": return <AlertCircle className="h-3.5 w-3.5 text-slate-400" />;
    case "captured": return <LayoutGrid className="h-3.5 w-3.5 text-slate-600" />;
    default: return null;
  }
};

const PumpSummaryCard = ({
  summary,
  isAggregate = false,
}: {
  summary: PumpProgressSummary;
  isAggregate?: boolean;
}) => (
  <article className="group relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-2.5 shadow-sm transition-all duration-300 hover:shadow-md sm:p-4">
    {/* Top Section: Title and Badges */}
    <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-3 sm:gap-6">
      <h2 className="truncate text-[16px] font-black uppercase tracking-tight text-slate-900 sm:text-[22px]">
        {formatDeviceHeading(summary.deviceName)}
      </h2>

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

    {/* Content Section: Ring and Metrics side-by-side even on mobile */}
    <div className="mt-3 flex items-center justify-between gap-3 sm:mt-5 sm:gap-6">
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

export default function IotPumPage() {
  const [selectedRangePreset, setSelectedRangePreset] =
    useState<DoordrishtiRangePreset>("today");
  const [filterValues, setFilterValues] = useState<DoordrishtiFilters>(() =>
    buildDefaultFilters(new Date())
  );
  const [appliedFilters, setAppliedFilters] = useState<DoordrishtiFilters>(() =>
    buildDefaultFilters(new Date())
  );
  const [deviceOptions, setDeviceOptions] = useState<DoordrishtiDeviceOption[]>([]);
  const [deviceOptionsLoading, setDeviceOptionsLoading] = useState(false);
  const [responseData, setResponseData] = useState<Record<string, DoordrishtiResponse>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadDeviceOptions = async () => {
      setDeviceOptionsLoading(true);

      try {
        const response = await getEquipmentTrackingReport();
        const uniqueOptions = new Map<string, DoordrishtiDeviceOption>();

        response.records
          .filter(isIotPumpRecord)
          .forEach((record) => {
            if (!record.deviceId || uniqueOptions.has(record.deviceId)) {
              return;
            }

            uniqueOptions.set(record.deviceId, {
              value: record.deviceId,
              label: buildDeviceFilterLabel(record),
            });
          });

        const nextOptions = [...uniqueOptions.values()].sort((left, right) =>
          left.label.localeCompare(right.label)
        );

        if (!cancelled && nextOptions.length) {
          setDeviceOptions(nextOptions);
          setFilterValues((prev) => ({ ...prev, deviceId: "ALL" }));
          setAppliedFilters((prev) => ({ ...prev, deviceId: "ALL" }));
        } else if (!cancelled) {
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setDeviceOptions([]);
          setLoading(false);
        }
      } finally {
        if (!cancelled) {
          setDeviceOptionsLoading(false);
        }
      }
    };

    void loadDeviceOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadTrips = async () => {
      setLoading(true);
      setError("");

      try {
        const devicesToFetch =
          appliedFilters.deviceId === "ALL"
            ? deviceOptions.map((option) => option.value)
            : [appliedFilters.deviceId];

        if (
          !devicesToFetch.length ||
          (devicesToFetch.length === 1 && devicesToFetch[0] === "ALL")
        ) {
          setLoading(false);
          return;
        }

        const fetchPromises = devicesToFetch.map(async (deviceId) => {
          const response = await fetch(
            buildDoordrishtiUrl({ ...appliedFilters, deviceId }),
            {
              method: "GET",
              signal: controller.signal,
            }
          );

          if (!response.ok) {
            throw new Error(`Request failed for ${deviceId}`);
          }

          const payload: DoordrishtiResponse = await response.json();
          return { deviceId, payload };
        });

        const results = await Promise.all(fetchPromises);
        const nextResponseData: Record<string, DoordrishtiResponse> = {};

        results.forEach((result) => {
          nextResponseData[result.deviceId] = result.payload;
        });

        setResponseData(nextResponseData);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setResponseData({});
        setError(
          err instanceof Error ? err.message : "Unable to load Doordrishti trips."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    if (deviceOptions.length > 0) {
      void loadTrips();
    }

    return () => controller.abort();
  }, [appliedFilters, deviceOptions]);

  const handleRangePresetSelect = (preset: DoordrishtiRangePreset) => {
    if (preset === "custom") return;
    setSelectedRangePreset(preset);
    const nextFilters = buildFiltersForPreset(preset, new Date(), filterValues.deviceId);
    setFilterValues((prev) => ({
      ...prev,
      dateFrom: nextFilters.dateFrom,
      dateTo: nextFilters.dateTo,
    }));
    setAppliedFilters((prev) => ({
      ...prev,
      dateFrom: nextFilters.dateFrom,
      dateTo: nextFilters.dateTo,
    }));
  };

  const handleInputChange = (field: keyof DoordrishtiFilters, value: string) => {
    setFilterValues((prev) => ({ ...prev, [field]: value }));
    if (field === "dateFrom" || field === "dateTo") {
      setSelectedRangePreset("custom");
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filterValues });
  };

  const totalRangeSecondsPerDevice = useMemo(
    () => getRangeTotalSeconds(appliedFilters.dateFrom, appliedFilters.dateTo),
    [appliedFilters.dateFrom, appliedFilters.dateTo]
  );

  const getDeviceDisplayName = (deviceId: string, fallback: string) => {
    const option = deviceOptions.find((entry) => entry.value === deviceId);
    if (option?.label) {
      return option.label.split(" | ")[0];
    }

    return fallback || "--";
  };

  const deviceSummaries = useMemo(() => {
    const devicesToProcess =
      appliedFilters.deviceId === "ALL"
        ? deviceOptions.map((option) => option.value)
        : [appliedFilters.deviceId];

    return devicesToProcess.map((deviceId) => {
      const data = responseData[deviceId] || null;
      const tripRows = flattenTripRows(data);
      const totalTrips = tripRows.length;
      const totalRunningSeconds = tripRows.reduce(
        (sum, trip) => sum + trip.timeCoveredSeconds,
        0
      );
      let totalIdleSeconds = 0;

      const sortedTrips = [...tripRows].sort((left, right) => {
        const leftTime = getDateTimestamp(left.startDate) || 0;
        const rightTime = getDateTimestamp(right.startDate) || 0;
        return leftTime - rightTime;
      });

      for (let index = 1; index < sortedTrips.length; index += 1) {
        const previousEnd = getDateTimestamp(sortedTrips[index - 1].endDate);
        const nextStart = getDateTimestamp(sortedTrips[index].startDate);

        if (previousEnd !== null && nextStart !== null && nextStart > previousEnd) {
          totalIdleSeconds += Math.floor((nextStart - previousEnd) / 1000);
        }
      }

      return buildPumpProgressSummary({
        deviceId,
        deviceName: getDeviceDisplayName(deviceId, "Unknown Device"),
        totalTrips,
        totalRunningSeconds,
        totalIdleSeconds,
        totalPossibleSeconds: totalRangeSecondsPerDevice,
      });
    });
  }, [appliedFilters.deviceId, deviceOptions, responseData, totalRangeSecondsPerDevice]);

  const overallSummary = useMemo(() => {
    if (appliedFilters.deviceId !== "ALL" || deviceSummaries.length === 0) {
      return null;
    }

    return buildPumpProgressSummary({
      deviceId: "ALL",
      deviceName: "ALL",
      totalTrips: deviceSummaries.reduce((sum, summary) => sum + summary.totalTrips, 0),
      totalRunningSeconds: deviceSummaries.reduce(
        (sum, summary) => sum + summary.totalRunningSeconds,
        0
      ),
      totalIdleSeconds: deviceSummaries.reduce(
        (sum, summary) => sum + summary.totalIdleSeconds,
        0
      ),
      totalPossibleSeconds: totalRangeSecondsPerDevice * deviceSummaries.length,
    });
  }, [appliedFilters.deviceId, deviceSummaries, totalRangeSecondsPerDevice]);

  const hasRenderableSummaries =
    deviceSummaries.length > 0 &&
    deviceSummaries.some((summary) => summary.hasData);

  const showDivisionAnalysis = deviceSummaries.length > 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] px-1.5 pb-4 pt-1.5 text-slate-900 sm:px-3 sm:pb-8 sm:pt-3 md:px-4">
      <div className="mx-auto max-w-full space-y-3 sm:space-y-4">
        <header className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_15px_40px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-8 rounded-full bg-[#1e4b7a]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  Real-time Dashboard
                </span>
              </div>
              <h1 className="mt-1 text-[24px] font-black tracking-tight text-slate-900 sm:text-[32px]">
                IoT Pump <span className="text-[#1e4b7a]">Progress</span> Report
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {DOORDRISHTI_RANGE_PRESET_OPTIONS.map((option) => {
                const isActive = selectedRangePreset === option.preset;

                return (
                  <button
                    key={option.preset}
                    type="button"
                    onClick={() => handleRangePresetSelect(option.preset)}
                    className={`h-10 rounded-2xl border px-5 text-[11px] font-black uppercase tracking-[0.12em] transition-all duration-300 sm:h-11 ${isActive
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

          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
            <div className="space-y-2">
              <span className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Vehicle Selection
              </span>
              <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-slate-400 focus-within:bg-white transition-all">
                <Search className="h-4 w-4 text-slate-400" />
                <select
                  value={filterValues.deviceId}
                  onChange={(event) => handleInputChange("deviceId", event.target.value)}
                  className="w-full bg-transparent text-[14px] font-bold text-slate-700 outline-none"
                  disabled={deviceOptionsLoading}
                >
                  <option value="ALL">ALL DEVICES</option>
                  {deviceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:contents">
              <div className="space-y-2">
                <span className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  From Date
                </span>
                <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-slate-400 focus-within:bg-white transition-all">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={filterValues.dateFrom}
                    onChange={(event) => handleInputChange("dateFrom", event.target.value)}
                    className="w-full bg-transparent text-[14px] font-bold text-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <span className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  To Date
                </span>
                <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-slate-400 focus-within:bg-white transition-all">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={filterValues.dateTo}
                    onChange={(event) => handleInputChange("dateTo", event.target.value)}
                    className="w-full bg-transparent text-[14px] font-bold text-slate-700 outline-none"
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
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 px-4 text-[12px] font-black uppercase tracking-[0.15em] text-slate-600 transition-all hover:bg-slate-50 active:scale-95"
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

        <main className="space-y-6 sm:space-y-8">
          {loading || deviceOptionsLoading ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-[32px] border border-slate-100 bg-white shadow-sm">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-100 border-t-[#1e4b7a]" />
                <Activity className="h-6 w-6 text-[#1e4b7a]" />
              </div>
              <p className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-400">
                Fetching Analysis Data...
              </p>
            </div>
          ) : hasRenderableSummaries ? (
            <>
              {overallSummary ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                    <LayoutGrid className="h-4 w-4 text-[#1e4b7a]" />
                    <h2 className="text-[14px] font-black uppercase tracking-[0.2em] text-slate-900">
                      Fleet Overview
                    </h2>
                  </div>
                  <PumpSummaryCard summary={overallSummary} isAggregate />
                </div>
              ) : null}

              {showDivisionAnalysis ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 px-2">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-4 w-4 text-[#1e4b7a]" />
                      <h2 className="text-[14px] font-black uppercase tracking-[0.2em] text-slate-900">
                        {appliedFilters.deviceId === "ALL" ? "Division Wise Analysis" : "Device Analysis"}
                      </h2>
                    </div>
                    <div className="h-px flex-1 bg-slate-200/60" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                    {deviceSummaries.map((summary) => (
                      <PumpSummaryCard key={summary.deviceId} summary={summary} />
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
                No Progress Data Found
              </h3>
              <p className="mt-2 max-w-md text-[14px] font-medium text-slate-500">
                Selected device aur date range ke liye koi data available nahi hai.
                Kripya date range ya vehicle selection check karein.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
