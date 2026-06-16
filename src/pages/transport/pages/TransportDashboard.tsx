import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  Clock3,
  type LucideIcon,
  Navigation,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import {
  getEquipmentTrackingReport,
  getEquipmentTripReportFromDoordrishti,
  type EquipmentTrackingRecord,
  type EquipmentTripReportRecord,
  type EquipmentTripReportResponse,
  type EquipmentTripReportSummary,
} from "../../../api/transport/trackingApi";

const IOT_PUMP_KEYWORDS = [
  "SRMPL",
  "IOT",
  "PUMP",
  "SUBSTATION",
  "WORKSHOP",
  "MOTOR",
  "COMPRESSOR",
];

const REQUEST_DELAY_MS = 500;
const MAX_PARALLEL_TRIP_REQUESTS = 25;
const SECONDS_PER_DAY = 24 * 60 * 60;
const WORKING_STATUS_KEYWORDS = ["moving", "idle", "idling"];

type TransportFilters = {
  deviceId: string;
  dateFrom: string;
  dateTo: string;
};

type TransportRangePreset = "today" | "weekly" | "monthly" | "custom";

type VehicleOption = {
  value: string;
  label: string;
  registrationNo: string;
  equipmentName: string;
};

type TransportSummary = {
  deviceId: string;
  deviceName: string;
  equipmentName: string;
  totalTrips: number;
  totalRunningSeconds: number;
  totalIdleSeconds: number;
  totalElapsedSeconds: number;
  totalDistanceKm: number;
  scorePercentage: number;
  scoreLabel: string;
  startTime: string | null;
  endTime: string | null;
  hasData: boolean;
};

const RANGE_PRESET_OPTIONS: Array<{
  label: string;
  preset: Exclude<TransportRangePreset, "custom">;
}> = [
    { label: "Today", preset: "today" },
    { label: "Weekly", preset: "weekly" },
    { label: "Monthly", preset: "monthly" },
  ];

const padNumber = (value: number) => String(value).padStart(2, "0");

const getTodayDateValue = (date: Date = new Date()) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;

const buildFiltersForPreset = (
  preset: Exclude<TransportRangePreset, "custom">,
  date: Date = new Date(),
  deviceId = "ALL"
): TransportFilters => {
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

const buildDefaultFilters = (date: Date = new Date()): TransportFilters =>
  buildFiltersForPreset("today", date);

const safeString = (value: unknown) => String(value ?? "").trim();

const normalizeRecordText = (value: unknown) => String(value ?? "").trim();

const getDateTimestamp = (value: string) => {
  const normalizedValue = safeString(value);

  if (!normalizedValue) {
    return null;
  }

  const timestamp = Date.parse(normalizedValue.replace(" ", "T"));
  return Number.isFinite(timestamp) ? timestamp : null;
};

const getDateRangeStartTimestamp = (value: string) => {
  const timestamp = Date.parse(`${safeString(value)}T00:00:00`);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const getDateRangeEndTimestamp = (value: string) => {
  const timestamp = Date.parse(`${safeString(value)}T23:59:59`);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const getInclusiveDayCount = (dateFrom: string, dateTo: string) => {
  const startTimestamp = Date.parse(`${safeString(dateFrom)}T00:00:00`);
  const endTimestamp = Date.parse(`${safeString(dateTo)}T00:00:00`);

  if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp) || endTimestamp < startTimestamp) {
    return 1;
  }

  return Math.floor((endTimestamp - startTimestamp) / (24 * 60 * 60 * 1000)) + 1;
};

const formatSecondsToDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${padNumber(hours)}h ${padNumber(minutes)}m ${padNumber(seconds)}s`;
};

const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

const isWorkingTripStatus = (status: string) =>
  WORKING_STATUS_KEYWORDS.some((keyword) => status.includes(keyword));

const getRecordNameCandidates = (record: EquipmentTrackingRecord) =>
  Array.from(
    new Set(
      [
        record.raw?.category,
        record.equipment?.equipmentCategory,
        record.registrationNo,
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
  const normalizedCandidate = candidate.toUpperCase();
  const doorNumber = normalizeRecordText(record.equipment.doorNumber).toUpperCase();
  const registrationNo = normalizeRecordText(record.registrationNo).toUpperCase();
  let score = 0;

  if (normalizedCandidate === registrationNo && registrationNo.length > 0) {
    score += 200;
  }

  if (normalizedCandidate.includes("/") || normalizedCandidate.includes(" ")) {
    score += 40;
  }

  if (candidate.length >= 6) {
    score += 20;
  }

  if (normalizedCandidate !== doorNumber) {
    score += 15;
  }

  if (normalizedCandidate === doorNumber) {
    score -= 15;
  }

  return score;
};

const getRecordTitle = (record: EquipmentTrackingRecord) => {
  return [...getRecordNameCandidates(record)]
    .sort((left, right) => {
      const scoreDelta = getRecordTitleScore(right, record) - getRecordTitleScore(left, record);

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return right.length - left.length;
    })[0] || "Unknown Vehicle";
};

const buildDeviceFilterLabel = (record: EquipmentTrackingRecord) => {
  const categoryName =
    normalizeRecordText(record.raw?.category) ||
    normalizeRecordText(record.equipment?.equipmentCategory);
  const registrationNo = normalizeRecordText(record.registrationNo);
  const hasVehicleRegistrationPattern = /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}$/.test(
    registrationNo.toUpperCase().replace(/[-\s]/g, "")
  );
  const title =
    categoryName && !(hasVehicleRegistrationPattern && IOT_PUMP_KEYWORDS.some((keyword) => categoryName.toUpperCase().includes(keyword)))
      ? categoryName
      : normalizeRecordText(getRecordTitle(record));

  if (!title) {
    return registrationNo || record.deviceId || "Unknown Vehicle";
  }

  if (registrationNo && !title.toUpperCase().includes(registrationNo.toUpperCase())) {
    return `${title} | ${registrationNo}`;
  }

  return title;
};

const formatDeviceHeading = (value: string) =>
  safeString(value).replace(/_/g, " ").replace(/\s+/g, " ").trim() || "Unknown Vehicle";

const isTransportVehicleRecord = (record: EquipmentTrackingRecord) => {
  const registrationNo = normalizeRecordText(record.registrationNo).toUpperCase();
  const normalizedRegistrationNo = registrationNo.replace(/[-\s]/g, "");
  const fullLabel = buildDeviceFilterLabel(record).toUpperCase();
  const hasVehicleRegistrationPattern = /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}$/.test(
    normalizedRegistrationNo
  );

  if (hasVehicleRegistrationPattern) {
    return true;
  }

  if (IOT_PUMP_KEYWORDS.some((keyword) => fullLabel.includes(keyword))) {
    return false;
  }

  return Boolean(registrationNo && registrationNo.length >= 6 && !/^\d+$/.test(registrationNo));
};

const ON_STATUSES = ["moving", "idle", "idling"];
const OFF_STATUSES = ["stopped", "stop", "unreach", "unreachable"];

const isOnStatus = (status: string) =>
  ON_STATUSES.some((key) => status.includes(key));

const isOffStatus = (status: string) =>
  OFF_STATUSES.some((key) => status.includes(key));

const calculateOnOffTime = (trips: EquipmentTripReportRecord[]) => {
  const sortedTrips = [...trips].sort((a, b) => {
    const aTime = getDateTimestamp(a.startDate ?? "") || 0;
    const bTime = getDateTimestamp(b.startDate ?? "") || 0;
    return aTime - bTime;
  });

  let onTimeSeconds = 0;
  let offTimeSeconds = 0;
  let movingSeconds = 0;
  let idleSeconds = 0;
  let stoppedSeconds = 0;
  let gapSeconds = 0;

  let previousEndTimestamp: number | null = null;

  for (const trip of sortedTrips) {
    const startTimestamp = getDateTimestamp(trip.startDate ?? "");
    const endTimestamp = getDateTimestamp(trip.endDate ?? "");

    if (startTimestamp === null || endTimestamp === null) {
      continue;
    }

    // Gap between previous trip end and current trip start
    if (previousEndTimestamp !== null && startTimestamp > previousEndTimestamp) {
      const gap = Math.floor((startTimestamp - previousEndTimestamp) / 1000);
      gapSeconds += gap;
      offTimeSeconds += gap;
    }

    const durationSeconds = Math.max(
      0,
      Math.floor((endTimestamp - startTimestamp) / 1000)
    );

    const status = safeString(trip.vehicleStatus).toLowerCase();

    if (status.includes("moving")) {
      movingSeconds += durationSeconds;
      onTimeSeconds += durationSeconds;
    } else if (status.includes("idle") || status.includes("idling")) {
      idleSeconds += durationSeconds;
      onTimeSeconds += durationSeconds;
    } else if (isOffStatus(status)) {
      stoppedSeconds += durationSeconds;
      offTimeSeconds += durationSeconds;
    }

    previousEndTimestamp = endTimestamp;
  }

  const totalTimeSeconds = onTimeSeconds + offTimeSeconds;
  const scorePercentage =
    totalTimeSeconds > 0 ? (onTimeSeconds / totalTimeSeconds) * 100 : 0;

  return {
    onTimeSeconds,
    offTimeSeconds,
    movingSeconds,
    idleSeconds,
    stoppedSeconds,
    gapSeconds,
    totalTimeSeconds,
    scorePercentage,
  };
};

const buildTransportSummary = ({
  deviceId,
  deviceName,
  equipmentName,
  tripRows,
  tripSummary,
  dateFrom,
  dateTo,
}: {
  deviceId: string;
  deviceName: string;
  equipmentName: string;
  tripRows: EquipmentTripReportRecord[];
  tripSummary?: EquipmentTripReportSummary | null;
  dateFrom: string;
  dateTo: string;
}): TransportSummary => {
  const sortedTrips = [...tripRows].sort((left, right) => {
    const leftTime = getDateTimestamp(left.startDate ?? "") || 0;
    const rightTime = getDateTimestamp(right.startDate ?? "") || 0;
    return leftTime - rightTime;
  });

  const rangeStartTimestamp = getDateRangeStartTimestamp(dateFrom);
  const rawRangeEndTimestamp = getDateRangeEndTimestamp(dateTo);
  const currentTimestamp = Date.now();
  const actualDataEndTimestamp =
    rawRangeEndTimestamp === null ? currentTimestamp : Math.min(rawRangeEndTimestamp, currentTimestamp);
  const totalPossibleSeconds =
    rangeStartTimestamp !== null && actualDataEndTimestamp >= rangeStartTimestamp
      ? Math.floor((actualDataEndTimestamp - rangeStartTimestamp) / 1000)
      : getInclusiveDayCount(dateFrom, dateTo) * SECONDS_PER_DAY;

  const fallbackTripCount = sortedTrips.length;
  const fallbackDistanceKm = sortedTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
  const normalizedTrips = sortedTrips
    .map((trip) => {
      const rawStartTimestamp = getDateTimestamp(trip.startDate ?? "");
      const rawEndTimestamp = getDateTimestamp(trip.endDate ?? "");

      if (rawStartTimestamp === null) {
        return null;
      }

      const clampedStartTimestamp =
        rangeStartTimestamp === null ? rawStartTimestamp : Math.max(rawStartTimestamp, rangeStartTimestamp);
      const resolvedEndTimestamp = rawEndTimestamp === null ? clampedStartTimestamp : rawEndTimestamp;
      const clampedEndTimestamp = Math.min(resolvedEndTimestamp, actualDataEndTimestamp);

      if (clampedEndTimestamp < clampedStartTimestamp) {
        return null;
      }

      return {
        trip,
        startTimestamp: clampedStartTimestamp,
        endTimestamp: clampedEndTimestamp,
        durationSeconds: Math.floor((clampedEndTimestamp - clampedStartTimestamp) / 1000),
        status: safeString(trip.vehicleStatus).toLowerCase(),
      };
    })
    .filter((trip): trip is NonNullable<typeof trip> => trip !== null);

  let totalRunningSeconds = 0;
  let totalOffSeconds = 0;
  let previousEndTimestamp = rangeStartTimestamp;

  for (const trip of normalizedTrips) {
    if (previousEndTimestamp !== null && trip.startTimestamp > previousEndTimestamp) {
      totalOffSeconds += Math.floor((trip.startTimestamp - previousEndTimestamp) / 1000);
    }

    if (isOffStatus(trip.status)) {
      totalOffSeconds += trip.durationSeconds;
    } else {
      totalRunningSeconds += trip.durationSeconds;
    }

    previousEndTimestamp = trip.endTimestamp;
  }

  if (previousEndTimestamp !== null && actualDataEndTimestamp > previousEndTimestamp) {
    totalOffSeconds += Math.floor((actualDataEndTimestamp - previousEndTimestamp) / 1000);
  }

  if (normalizedTrips.length === 0 && totalPossibleSeconds > 0) {
    totalOffSeconds = totalPossibleSeconds;
  }

  const totalElapsedSeconds = Math.max(
    totalPossibleSeconds,
    totalRunningSeconds + totalOffSeconds
  );
  const scorePercentage =
    totalElapsedSeconds > 0 ? (totalRunningSeconds / totalElapsedSeconds) * 100 : 0;
  const totalTrips = tripSummary?.movingCount ?? fallbackTripCount;
  const totalDistanceKm = tripSummary?.sumOfDistance ?? fallbackDistanceKm;

  return {
    deviceId,
    deviceName,
    equipmentName,
    totalTrips,
    totalRunningSeconds,
    totalIdleSeconds: Math.max(0, totalElapsedSeconds - totalRunningSeconds),
    totalElapsedSeconds,
    totalDistanceKm,
    scorePercentage,
    scoreLabel: formatPercentage(scorePercentage),
    startTime: tripSummary?.startTime ?? null,
    endTime: tripSummary?.endTime ?? null,
    hasData: true,
  };
};

const RING_RADIUS = 66;
const RING_STROKE = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const SummaryMetric = ({
  icon,
  label,
  value,
  dotClass,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  dotClass: string;
}) => {
  const Icon = icon;

  return (
    <div className="flex items-center justify-between gap-2 rounded-[18px] border border-slate-200/90 bg-white px-2.5 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition-all duration-300 hover:border-slate-300 hover:shadow-[0_12px_22px_rgba(15,23,42,0.08)] sm:rounded-full sm:px-3 sm:py-2.5">
      <div className="flex min-w-0 items-center gap-1.5 text-slate-600 sm:gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
        <Icon className="h-3 w-3 text-slate-400 sm:h-3.5 sm:w-3.5" />
        <span className="truncate text-[8px] font-black uppercase tracking-[0.1em] sm:text-[10px] sm:tracking-[0.12em]">
          {label}
        </span>
      </div>
      <div className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-[9px] font-black text-slate-900 ring-1 ring-slate-200 sm:px-3 sm:text-[12px]">
        {value}
      </div>
    </div>
  );
};

const ScoreRing = ({
  onTimeSeconds,
  offTimeSeconds,
  scoreLabel,
}: {
  onTimeSeconds: number;
  offTimeSeconds: number;
  scoreLabel: string;
}) => {
  const total = Math.max(onTimeSeconds + offTimeSeconds, 1);
  const segments = [
    { key: "on", value: onTimeSeconds, color: "#10b981" },
    { key: "off", value: offTimeSeconds, color: "#f59e0b" },
  ];
  let accumulated = 0;

  return (
    <div className="relative flex h-[116px] w-[116px] shrink-0 items-center justify-center sm:h-[148px] sm:w-[148px] lg:h-[176px] lg:w-[176px]">
      <div className="absolute inset-4 rounded-full bg-slate-50 blur-2xl" />
      <svg viewBox="0 0 180 180" className="h-[104px] w-[104px] -rotate-90 sm:h-[136px] sm:w-[136px] lg:h-[160px] lg:w-[160px]">
        <circle
          cx="90"
          cy="90"
          r={RING_RADIUS}
          fill="transparent"
          stroke="#e2e8f0"
          strokeWidth={RING_STROKE}
        />
        {segments.map((segment) => {
          const length = (segment.value / total) * RING_CIRCUMFERENCE;
          const circle = (
            <circle
              key={segment.key}
              cx="90"
              cy="90"
              r={RING_RADIUS}
              fill="transparent"
              stroke={segment.color}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${length} ${RING_CIRCUMFERENCE}`}
              strokeDashoffset={-accumulated}
            />
          );
          accumulated += length;
          return circle;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[9px] lg:text-[10px]">
          Score
        </span>
        <span className="text-[18px] font-black tracking-tight text-slate-900 sm:text-[22px] lg:text-[32px]">
          {scoreLabel}
        </span>
      </div>
    </div>
  );
};

const getScoreBadgeClass = (scorePercentage: number) => {
  if (scorePercentage >= 65) {
    return "from-amber-400 via-orange-500 to-amber-500";
  }

  if (scorePercentage >= 45) {
    return "from-orange-500 via-orange-600 to-amber-600";
  }

  return "from-rose-500 via-red-500 to-rose-600";
};

const TransportSummaryCard = ({
  summary,
  isAggregate = false,
  aggregateVehicleCount = 0,
}: {
  summary: TransportSummary;
  isAggregate?: boolean;
  aggregateVehicleCount?: number;
}) => (
  <article className="relative min-w-0 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/95 p-3.5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.12)] sm:rounded-[34px] sm:p-6">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-blue-500/6 via-cyan-400/6 to-violet-500/6 sm:h-24" />
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2 text-[#1e4b7a]">
          <Truck className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
          <span className="text-[8px] font-black uppercase tracking-[0.16em] sm:text-[10px] sm:tracking-[0.18em]">
            {isAggregate ? "Fleet Overview" : "Vehicle Summary"}
          </span>
        </div>
        <h2 className="truncate text-[14px] font-black uppercase tracking-[0.03em] text-slate-900 sm:text-[18px] lg:text-[22px]">
          {isAggregate ? "ALL VEHICLES" : formatDeviceHeading(summary.deviceName)}
        </h2>
      
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">

        <div className="rounded-full bg-gradient-to-r from-slate-900 to-slate-800 px-3 py-1.5 text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)] sm:px-4 sm:py-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Truck className="h-3 w-3 text-rose-400 sm:h-3.5 sm:w-3.5" />
            <span className="text-[7px] font-black uppercase tracking-[0.01em] sm:text-[11px] sm:tracking-[0.03em]">
              {isAggregate ? `VEHICLES:${aggregateVehicleCount}` : `TRIPS:${summary.totalTrips}`}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div className="mt-5 flex items-start gap-3 sm:mt-6 sm:gap-4 lg:gap-6 xl:justify-between">
      <div className="flex shrink-0 justify-center xl:min-w-[220px]">
        <ScoreRing
          onTimeSeconds={summary.totalRunningSeconds}
          offTimeSeconds={summary.totalIdleSeconds}
          scoreLabel={summary.scoreLabel}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-3 xl:max-w-[360px]">
        <SummaryMetric
          icon={Clock3}
          label="OnTime"
          value={formatSecondsToDuration(summary.totalRunningSeconds)}
          dotClass="bg-emerald-500"
        />
        <SummaryMetric
          icon={Clock3}
          label="OffTime"
          value={formatSecondsToDuration(summary.totalIdleSeconds)}
          dotClass="bg-amber-500"
        />
        <SummaryMetric
          icon={Activity}
          label="TotalTime"
          value={formatSecondsToDuration(summary.totalElapsedSeconds)}
          dotClass="bg-slate-400"
        />
        <SummaryMetric
          icon={Navigation}
          label="Distance"
          value={`${summary.totalDistanceKm.toFixed(2)} Km`}
          dotClass="bg-sky-500"
        />
      </div>
    </div>
  </article>
);

export default function TransportDashboard() {
  const [selectedRangePreset, setSelectedRangePreset] = useState<TransportRangePreset>("today");
  const [filterValues, setFilterValues] = useState<TransportFilters>(() => buildDefaultFilters(new Date()));
  const [appliedFilters, setAppliedFilters] = useState<TransportFilters>(() => buildDefaultFilters(new Date()));
  const [deviceOptions, setDeviceOptions] = useState<VehicleOption[]>([]);
  const [deviceOptionsLoading, setDeviceOptionsLoading] = useState(false);
  const [responseData, setResponseData] = useState<Record<string, EquipmentTripReportResponse>>({});
  const [failedDeviceIds, setFailedDeviceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalToLoad, setTotalToLoad] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadDeviceOptions = async () => {
      setDeviceOptionsLoading(true);

      try {
        const response = await getEquipmentTrackingReport();
        const uniqueOptions = new Map<string, VehicleOption>();

        response.records.filter(isTransportVehicleRecord).forEach((record) => {
          if (!record.deviceId || uniqueOptions.has(record.deviceId)) {
            return;
          }

          const registrationNo =
            normalizeRecordText(record.registrationNo) ||
            normalizeRecordText(record.equipment.doorNumber) ||
            record.deviceId;
          const categoryName =
            normalizeRecordText(record.raw?.category) ||
            normalizeRecordText(record.equipment?.equipmentCategory);
          const equipmentName =
            categoryName ||
            normalizeRecordText(record.equipment.equipmentName) ||
            normalizeRecordText(record.raw?.equipment_name) ||
            normalizeRecordText(record.raw?.display_name) ||
            "";
          const label = buildDeviceFilterLabel(record);

          uniqueOptions.set(record.deviceId, {
            value: record.deviceId,
            label,
            registrationNo,
            equipmentName,
          });
        });

        const nextOptions = [...uniqueOptions.values()].sort((left, right) => left.label.localeCompare(right.label));

        if (!cancelled) {
          setDeviceOptions(nextOptions);
          setFilterValues((prev) => ({ ...prev, deviceId: "ALL" }));
          setAppliedFilters((prev) => ({ ...prev, deviceId: "ALL" }));
          setLoading(false);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setDeviceOptions([]);
          setLoading(false);
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load vehicle list.");
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
      setResponseData({});
      setFailedDeviceIds([]);
      setLoadedCount(0);
      setTotalToLoad(0);

      try {
        const devicesToFetch =
          appliedFilters.deviceId === "ALL"
            ? deviceOptions.map((option) => option.value)
            : [appliedFilters.deviceId];

        setTotalToLoad(devicesToFetch.length);

        if (!devicesToFetch.length) {
          setLoading(false);
          return;
        }

        const BATCH_SIZE = Math.max(
          1,
          Math.min(MAX_PARALLEL_TRIP_REQUESTS, devicesToFetch.length)
        );

        for (let i = 0; i < devicesToFetch.length; i += BATCH_SIZE) {
          if (controller.signal.aborted) {
            return;
          }

          const batch = devicesToFetch.slice(i, i + BATCH_SIZE);

          const batchPromises = batch.map(async (deviceId) => {
            try {
              const report = await getEquipmentTripReportFromDoordrishti(
                {
                  deviceId,
                  dateFrom: appliedFilters.dateFrom,
                  dateTo: appliedFilters.dateTo,
                  timePickerFrom: "00:00:00",
                  timePickerTo: "23:59:59",
                },
                controller.signal
              );
              return { deviceId, report, error: null };
            } catch (error) {
              return { deviceId, report: null, error };
            }
          });

          const results = await Promise.all(batchPromises);

          if (controller.signal.aborted) {
            return;
          }

          const newResponseData: Record<string, EquipmentTripReportResponse> = {};
          const newFailedIds: string[] = [];

          results.forEach((res) => {
            if (res.report) {
              newResponseData[res.deviceId] = res.report;
            } else {
              newFailedIds.push(res.deviceId);
            }
          });

          setResponseData((prev) => ({
            ...prev,
            ...newResponseData,
          }));

          setLoadedCount((prev) => prev + batch.length);

          if (newFailedIds.length > 0) {
            setFailedDeviceIds((prev) => Array.from(new Set([...prev, ...newFailedIds])));
          }
        }
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : "Unable to load trip data.");
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

  const handleRangePresetSelect = (preset: TransportRangePreset) => {
    if (preset === "custom") {
      return;
    }

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

  const handleInputChange = (field: keyof TransportFilters, value: string) => {
    setFilterValues((prev) => ({ ...prev, [field]: value }));

    if (field === "dateFrom" || field === "dateTo") {
      setSelectedRangePreset("custom");
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filterValues });
  };

  const deviceSummaries = useMemo(() => {
    const devicesToProcess =
      appliedFilters.deviceId === "ALL"
        ? deviceOptions.map((option) => option.value)
        : [appliedFilters.deviceId];

    return devicesToProcess.map((deviceId) => {
      const tripReport = responseData[deviceId];
      const tripRows = tripReport?.records || [];
      const deviceInfo = deviceOptions.find((option) => option.value === deviceId);

      return buildTransportSummary({
        deviceId,
        deviceName: deviceInfo?.label || deviceInfo?.registrationNo || deviceId,
        equipmentName: deviceInfo?.equipmentName || "",
        tripRows,
        tripSummary: tripReport?.summary,
        dateFrom: appliedFilters.dateFrom,
        dateTo: appliedFilters.dateTo,
      });
    });
  }, [appliedFilters.dateFrom, appliedFilters.dateTo, appliedFilters.deviceId, deviceOptions, responseData]);

  const visibleSummaries = useMemo(() => deviceSummaries, [deviceSummaries]);

  const aggregateSummary = useMemo(() => {
    if (appliedFilters.deviceId !== "ALL" || visibleSummaries.length === 0) {
      return null;
    }

    const totals = visibleSummaries.reduce(
      (accumulator, summary) => ({
        totalTrips: accumulator.totalTrips + summary.totalTrips,
        totalRunningSeconds: accumulator.totalRunningSeconds + summary.totalRunningSeconds,
        totalIdleSeconds: accumulator.totalIdleSeconds + summary.totalIdleSeconds,
        totalElapsedSeconds: accumulator.totalElapsedSeconds + summary.totalElapsedSeconds,
        totalDistanceKm: accumulator.totalDistanceKm + summary.totalDistanceKm,
      }),
      {
        totalTrips: 0,
        totalRunningSeconds: 0,
        totalIdleSeconds: 0,
        totalElapsedSeconds: 0,
        totalDistanceKm: 0,
      }
    );

    const scorePercentage =
      totals.totalElapsedSeconds > 0
        ? (totals.totalRunningSeconds / totals.totalElapsedSeconds) * 100
        : 0;

    return {
      deviceId: "ALL",
      deviceName: "ALL VEHICLES",
      equipmentName: "",
      totalTrips: totals.totalTrips,
      totalRunningSeconds: totals.totalRunningSeconds,
      totalIdleSeconds: totals.totalIdleSeconds,
      totalElapsedSeconds: totals.totalElapsedSeconds,
      totalDistanceKm: totals.totalDistanceKm,
      scorePercentage,
      scoreLabel: formatPercentage(scorePercentage),
      startTime: null,
      endTime: null,
      hasData: true,
    } satisfies TransportSummary;
  }, [appliedFilters.deviceId, visibleSummaries]);

  const failedVehicleLabels = useMemo(
    () =>
      failedDeviceIds.map((deviceId) => {
        const matched = deviceOptions.find((option) => option.value === deviceId);
        return matched?.registrationNo || matched?.label || deviceId;
      }),
    [deviceOptions, failedDeviceIds]
  );

  const hasRenderableSummaries =
    visibleSummaries.length > 0;

  const sectionTitle =
    appliedFilters.deviceId === "ALL" ? "All Vehicle Summaries" : "Vehicle Summary";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe_0%,_#eff6ff_22%,_#f8fafc_52%,_#eef2ff_100%)] px-2 pb-4 pt-2 text-slate-900 sm:px-3 sm:pb-8 sm:pt-3 md:px-4">
      <div className="mx-auto max-w-full space-y-3 sm:space-y-4">
        <header className="relative overflow-hidden border-0 bg-transparent p-0 shadow-none backdrop-blur-0 sm:rounded-[20px] sm:border sm:border-slate-200/80 sm:bg-white/90 sm:p-4 sm:shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-20 bg-gradient-to-r from-blue-600/12 via-cyan-500/10 to-violet-600/12 sm:block" />
          <div className="pointer-events-none absolute -right-10 top-2 hidden h-20 w-20 rounded-full bg-blue-500/10 blur-3xl sm:block" />
          <div className="pointer-events-none absolute left-10 top-4 hidden h-16 w-16 rounded-full bg-cyan-400/10 blur-3xl sm:block" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-6 rounded-full bg-[#1e4b7a]" />
                <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 sm:text-[9px] sm:tracking-[0.2em]">
                  Transport Dashboard
                </span>
              </div>
              <h1 className="mt-1 text-[clamp(1.4rem,4vw,1.8rem)] font-black leading-none tracking-tight text-slate-900 sm:text-[24px]">
                Vehicle <span className="text-[#1e4b7a]">Trip Summary</span>
              </h1>

            </div>

            <div className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
              {RANGE_PRESET_OPTIONS.map((option) => {
                const isActive = selectedRangePreset === option.preset;

                return (
                  <button
                    key={option.preset}
                    type="button"
                    onClick={() => handleRangePresetSelect(option.preset)}
                    className={`min-w-0 rounded-[12px] border px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.04em] transition-all duration-300 sm:h-9 sm:rounded-[14px] sm:px-4 sm:py-0 sm:text-[10px] sm:tracking-[0.1em] ${isActive
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

          <div className="mt-3 grid gap-2 md:mt-4 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
            <div className="space-y-1.5">
              <span className="ml-1 text-[8px] font-black uppercase tracking-[0.1em] text-slate-400 sm:text-[9px] sm:tracking-[0.15em]">
                Vehicle Selection
              </span>
              <div className="flex h-9 items-center gap-2 rounded-[14px] border border-slate-200 bg-slate-50 px-2.5 focus-within:border-slate-400 focus-within:bg-white transition-all sm:h-10 sm:gap-2.5 sm:px-3">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={filterValues.deviceId}
                  onChange={(event) => handleInputChange("deviceId", event.target.value)}
                  className="w-full bg-transparent text-[11px] font-bold text-slate-700 outline-none sm:text-[12px]"
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

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:contents">
              <div className="space-y-1.5">
                <span className="ml-1 text-[8px] font-black uppercase tracking-[0.1em] text-slate-400 sm:text-[9px] sm:tracking-[0.15em]">
                  From Date
                </span>
                <div className="flex h-9 items-center gap-2 rounded-[14px] border border-slate-200 bg-slate-50 px-2.5 focus-within:border-slate-400 focus-within:bg-white transition-all sm:h-10 sm:gap-2.5 sm:px-3">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={filterValues.dateFrom}
                    onChange={(event) => handleInputChange("dateFrom", event.target.value)}
                    className="w-full bg-transparent text-[11px] font-bold text-slate-700 outline-none sm:text-[12px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="ml-1 text-[8px] font-black uppercase tracking-[0.1em] text-slate-400 sm:text-[9px] sm:tracking-[0.15em]">
                  To Date
                </span>
                <div className="flex h-9 items-center gap-2 rounded-[14px] border border-slate-200 bg-slate-50 px-2.5 focus-within:border-slate-400 focus-within:bg-white transition-all sm:h-10 sm:gap-2.5 sm:px-3">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={filterValues.dateTo}
                    onChange={(event) => handleInputChange("dateTo", event.target.value)}
                    className="w-full bg-transparent text-[11px] font-bold text-slate-700 outline-none sm:text-[12px]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_36px] gap-2 sm:grid-cols-[minmax(0,1fr)_44px]">
              <button
                type="button"
                onClick={handleApplyFilters}
                className="flex h-9 items-center justify-center gap-1.5 rounded-[14px] bg-[#1e4b7a] px-3 text-[10px] font-black uppercase tracking-[0.1em] text-white shadow-[0_8px_16px_rgba(30,75,122,0.2)] transition-all hover:bg-[#153658] hover:shadow-none active:scale-95 sm:h-10 sm:px-5 sm:text-[11px]"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search</span>
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="flex h-9 items-center justify-center gap-1.5 rounded-[14px] border border-slate-200 bg-white px-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-600 transition-all hover:bg-slate-50 active:scale-95 sm:h-10 sm:px-3"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""} sm:h-4 sm:w-4`} />
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-rose-50 px-4 py-2.5 text-[11px] font-bold text-rose-600 ring-1 ring-rose-200/50">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </div>
          ) : null}


        </header>

        <main className="space-y-6 sm:space-y-8">
          {deviceOptionsLoading || (loading && Object.keys(responseData).length === 0) ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-[32px] border border-slate-100 bg-white shadow-sm">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-100 border-t-[#1e4b7a]" />
                <Activity className="h-6 w-6 text-[#1e4b7a]" />
              </div>
              <p className="mt-2 text-[12px] font-black uppercase tracking-[0.3em] text-slate-400">
                Fetching Trips... {totalToLoad > 0 ? `${loadedCount} / ${totalToLoad}` : ""}
              </p>
              {totalToLoad > 0 && (
                <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-[#1e4b7a] transition-all duration-300"
                    style={{ width: `${Math.max(5, (loadedCount / totalToLoad) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ) : hasRenderableSummaries ? (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-4 px-2">
                  <div className="flex min-w-0 items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 shadow-sm sm:gap-3 sm:px-4">
                    <Truck className="h-4 w-4 text-[#1e4b7a]" />
                    <h2 className="truncate text-[11px] font-black uppercase tracking-[0.12em] text-slate-900 sm:text-[14px] sm:tracking-[0.2em]">
                      {sectionTitle}
                    </h2>
                  </div>
                  {loading && (
                    <div className="flex shrink-0 items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-blue-600 shadow-sm sm:px-4 sm:text-[11px]">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Loading {loadedCount}/{totalToLoad}
                    </div>
                  )}
                  <div className="h-px flex-1 bg-slate-200/60" />
                </div>

                {aggregateSummary ? (
                  <TransportSummaryCard
                    summary={aggregateSummary}
                    isAggregate
                    aggregateVehicleCount={visibleSummaries.length}
                  />
                ) : null}

                <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
                  {visibleSummaries.map((summary) => (
                    <TransportSummaryCard key={summary.deviceId} summary={summary} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[32px] border border-slate-100 bg-white p-8 text-center shadow-sm">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-200">
                <Truck className="h-10 w-10" />
              </div>
              <h3 className="text-[18px] font-black uppercase tracking-widest text-slate-300">
                No Vehicle Data Found
              </h3>
              <p className="mt-2 max-w-md text-[14px] font-medium text-slate-500">
                Selected vehicle aur date range ke liye koi trip summary available nahi hai.
                Date range ya vehicle selection ko verify karke dubara search karein.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
