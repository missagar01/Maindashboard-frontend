import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ChevronLeft,
  Clock3,
  Gauge,
  RefreshCw,
  Thermometer,
  Droplets,
  Zap,
  Battery,
  MapPin,
  Bell,
  Signal,
  Power,
  Hourglass,
  CheckCircle2,
  Map as MapIcon,
  Play,
  Compass,
} from "lucide-react";
import {
  getEquipmentTripReport,
  getEquipmentTrackingReport,
  type EquipmentTripReportRecord,
  type EquipmentTrackingRecord,
} from "../../../api/transport/trackingApi";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
});
const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const TRIP_REPORT_START_TIME = "00:00:00";
const ALL_DEVICES_FILTER = "__all_devices__";

const formatRelativeTime = (value: string | null) => {
  if (!value) return "No recent update";

  const deltaMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(deltaMs)) return "No recent update";

  const minutes = Math.max(0, Math.floor(deltaMs / 60000));
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
};

const formatDateTime = (value: string | null) => {
  if (!value) return "No timestamp";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No timestamp";

  return dateTimeFormatter.format(parsed);
};

const padNumber = (value: number) => String(value).padStart(2, "0");

const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
    date.getDate()
  )}`;

const toDateTimeInputValue = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
    date.getDate()
  )}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(
    date.getSeconds()
  )}`;

const normalizeTimeInputValue = (value: string) => {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return "00:00:00";
  }

  const [hours = "00", minutes = "00", seconds = "00"] = normalized.split(":");
  return `${padNumber(Number(hours) || 0)}:${padNumber(
    Number(minutes) || 0
  )}:${padNumber(Number(seconds) || 0)}`;
};

const parseLocalDateTimeValue = (value: string) => {
  const [datePart, rawTimePart = "00:00:00"] = String(value || "").split("T");
  const parsedDate = parseDateInputValue(datePart);

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const [hours, minutes, seconds] = normalizeTimeInputValue(rawTimePart)
    .split(":")
    .map((segment) => Number(segment));

  return new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
    hours || 0,
    minutes || 0,
    seconds || 0
  );
};

const parseTripReportDateTime = (value: string | null) => {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return null;
  }

  const parsed = parseLocalDateTimeValue(normalized.replace(" ", "T"));
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getTime();
};

const buildDefaultFromDate = (date: Date = new Date()) =>
  `${toDateInputValue(date)}T${TRIP_REPORT_START_TIME}`;

const buildDefaultToDate = (date: Date = new Date()) => toDateTimeInputValue(date);

interface DashboardFilters {
  selectedRouteId: string;
  fromValue: string;
  toValue: string;
}

const buildDefaultDashboardFilters = (
  date: Date = new Date()
): DashboardFilters => ({
  selectedRouteId: ALL_DEVICES_FILTER,
  fromValue: buildDefaultFromDate(date),
  toValue: buildDefaultToDate(date),
});

const parseDateInputValue = (value: string) => {
  const [year, month, day] = String(value || "")
    .split("-")
    .map((segment) => Number(segment));

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
};

const formatTripDistance = (value: number) => `${value.toFixed(2)} Km`;

const formatDuration = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${h}:${padNumber(m)}:${padNumber(s)}`;
};

interface EquipmentTripSummary {
  totalDistance: number;
  averageSpeed: number;
  totalDurationSeconds: number;
  movingDurationSeconds: number;
  movingCount: number;
  startTime: string | null;
  endTime: string | null;
}

const buildEquipmentTripSummary = (
  records: EquipmentTripReportRecord[]
): EquipmentTripSummary => {
  if (!records.length) {
    return {
      totalDistance: 0,
      averageSpeed: 0,
      totalDurationSeconds: 0,
      movingDurationSeconds: 0,
      movingCount: 0,
      startTime: null,
      endTime: null,
    };
  }

  const totalDistance = records.reduce(
    (sum, record) => sum + Number(record.distance || 0),
    0
  );
  const totalDurationSeconds = records.reduce(
    (sum, record) => sum + Math.max(0, Number(record.diffSeconds || 0)),
    0
  );
  const movingRecords = records.filter((record) =>
    record.vehicleStatus.toLowerCase().includes("moving")
  );
  const movingDurationSeconds = movingRecords.reduce(
    (sum, record) => sum + Math.max(0, Number(record.diffSeconds || 0)),
    0
  );
  const averageSpeed =
    movingDurationSeconds > 0
      ? totalDistance / (movingDurationSeconds / 3600)
      : movingRecords.reduce((sum, record) => sum + record.averageSpeed, 0) /
      Math.max(1, movingRecords.length);

  return {
    totalDistance,
    averageSpeed: Number.isFinite(averageSpeed) ? averageSpeed : 0,
    totalDurationSeconds,
    movingDurationSeconds,
    movingCount: movingRecords.length,
    startTime: records[0]?.startDate || null,
    endTime: records[records.length - 1]?.endDate || null,
  };
};

const FLEET_FILTER_KEYWORDS = [
  "IOT PUM",
  "IOT PUMP",
  "IOT PUM BS",
  "IOT PUMP BS",
];

const RECORD_TITLE_OVERRIDES: Record<string, string> = {
  "353742371399445": "SRMPL_8_Workshop",
};

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

const getRecordTitleOverride = (record: EquipmentTrackingRecord) =>
  getRecordNameCandidates(record).find(
    (candidate) => RECORD_TITLE_OVERRIDES[candidate]
  );

const getRecordTitle = (record: EquipmentTrackingRecord) => {
  const overrideCandidate = getRecordTitleOverride(record);

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

const getRecordSubtitle = (record: EquipmentTrackingRecord) =>
  [record.equipment.equipmentCategory, record.equipment.equipmentType]
    .filter(Boolean)
    .join(" / ") || "Equipment";

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

const getRecordSearchText = (record: EquipmentTrackingRecord) =>
  [
    ...getRecordNameCandidates(record),
    getRecordSubtitle(record),
    record.equipment.equipmentCategory,
    record.equipment.equipmentType,
    record.voiceNo,
  ]
    .map(normalizeRecordText)
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

const isIotPumpRecord = (record: EquipmentTrackingRecord) => {
  const searchableText = getRecordSearchText(record);
  return hasIotPumpKeyword(searchableText);
};

const normalizeLocationValue = (value: unknown) => {
  const normalized = normalizeRecordText(value);

  if (
    !normalized ||
    normalized === "---" ||
    normalized.toLowerCase() === "null" ||
    normalized.toLowerCase() === "undefined"
  ) {
    return "";
  }

  return normalized;
};

const getTripOrInlineLocationLabel = (
  record: EquipmentTrackingRecord,
  latestTripRecord?: EquipmentTripReportRecord | null
) =>
  [
    latestTripRecord?.endLocation,
    latestTripRecord?.startLocation,
    record.raw?.location_name,
    record.raw?.location,
    record.raw?.address,
    record.raw?.geo_address,
    record.raw?.display_name,
    record.raw?.place_name,
    record.raw?.tag,
  ]
    .map(normalizeLocationValue)
    .find(Boolean) || "";

const buildReverseGeocodeLocationName = (payload: any) => {
  const address = payload?.address || {};

  return (
    [
      payload?.name,
      [address.house_number, address.road || address.highway]
        .map(normalizeLocationValue)
        .filter(Boolean)
        .join(" "),
      address.neighbourhood,
      address.suburb,
      address.village,
      address.town,
      address.city,
      address.state,
    ]
      .map(normalizeLocationValue)
      .filter(Boolean)
      .slice(0, 5)
      .join(", ") ||
    normalizeLocationValue(payload?.display_name)
  );
};

const formatCoordinateLabel = (value: number | null, axis: "lat" | "lng") => {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const suffix = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(6)} deg ${suffix}`;
};

const buildGoogleMapEmbedUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;

const buildGoogleMapOpenUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps?q=${lat},${lng}&z=16`;

const isAbortLikeError = (error: any) => {
  const name = String(error?.name || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  return (
    name.includes("abort") ||
    name.includes("cancel") ||
    code.includes("abort") ||
    code.includes("cancel") ||
    message.includes("aborted") ||
    message.includes("canceled")
  );
};

const getDashboardFilterValidationError = ({
  fromValue,
  toValue,
}: DashboardFilters) => {
  const fromDate = parseLocalDateTimeValue(fromValue);
  const toDate = parseLocalDateTimeValue(toValue);

  if (!fromDate || !toDate) {
    return "Select a valid from and to date.";
  }

  if (fromDate.getTime() > toDate.getTime()) {
    return "From date must be earlier than to date.";
  }

  return "";
};

// UI Components for the new Premium Theme
const DarkGlassCard = ({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={`relative overflow-hidden rounded-[16px] shadow-xl md:rounded-[24px] text-white ${className}`}
  >
    <div className="relative z-10 h-full w-full">
      {children}
    </div>
  </div>
);

const DarkGridCard = ({
  label,
  value,
  bgClass = "bg-slate-800",
  className = "",
}: {
  label: string;
  value: ReactNode;
  bgClass?: string;
  className?: string;
}) => (
  <div
    className={`relative overflow-hidden rounded-xl p-3 shadow-xl md:rounded-2xl md:p-5 ${bgClass} text-white ${className}`}
  >
    <div className="relative z-10 flex flex-col h-full justify-between">
      <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-white/70 mb-1.5 md:mb-2">{label}</p>
      <div className="text-sm font-black leading-tight drop-shadow-md md:text-[1.35rem]">{value}</div>
    </div>
  </div>
);

const TripReportWindow = ({
  record,
  tripSummary,
  tripRecords,
  currentTime
}: {
  record: EquipmentTrackingRecord;
  tripSummary?: EquipmentTripSummary | null;
  tripRecords: EquipmentTripReportRecord[];
  currentTime?: Date;
}) => {
  const startTimeLabel = tripSummary?.startTime 
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(tripSummary.startTime))
    : "--";
    
  const endTimeLabel = tripSummary?.endTime 
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(tripSummary.endTime))
    : "--";
  const summaryCards = [
    
    {
      label: "Door No",
      value: record.equipment.doorNumber || "N/A",
      bgClass: "bg-gradient-to-br from-[#b45309] to-[#78350f]",
    },
    {
      label: "Category",
      value: record.equipment.equipmentCategory || "N/A",
      bgClass: "bg-gradient-to-br from-[#0f766e] to-[#134e4a]",
    },
    {
      label: "GPS ID",
      value: record.deviceId || "N/A",
      bgClass: "bg-gradient-to-br from-[#334155] to-[#0f172a]",
    },
    {
      label: "Total Distance",
      value: tripSummary ? formatTripDistance(tripSummary.totalDistance) : "0.00 Km",
      bgClass: "bg-gradient-to-br from-[#7e22ce] to-[#581c87]",
    },
    {
      label: "Average Speed",
      value: tripSummary ? `${tripSummary.averageSpeed.toFixed(2)} Kmph` : "0.00 Kmph",
      bgClass: "bg-gradient-to-br from-[#047857] to-[#064e3b]",
    },
    {
      label: "Working Hours",
      value: formatDuration(tripSummary?.movingDurationSeconds || 0),
      bgClass: "bg-gradient-to-br from-[#a21caf] to-[#701a75]",
    },
    {
      label: "Moving Count",
      value: tripSummary?.movingCount || 0,
      bgClass: "bg-gradient-to-br from-[#c2410c] to-[#7c2d12]",
    },
    {
      label: "Start Time",
      value: startTimeLabel,
      bgClass: "bg-gradient-to-br from-[#1d4ed8] to-[#1e3a8a]",
    },
    {
      label: "End Time",
      value: endTimeLabel,
      bgClass: "bg-gradient-to-br from-[#334155] to-[#020617]",
    },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <DarkGridCard
            key={card.label}
            label={card.label}
            value={card.value}
            bgClass={card.bgClass}
            className="min-h-[92px] md:min-h-[116px]"
          />
        ))}
      </div>
    </div>
  );
};

const MetricTile = ({
  label,
  value,
  unit = "",
  icon: Icon,
  colorClass = "text-white",
  bgClass = "",
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: any;
  colorClass?: string;
  bgClass?: string;
}) => (
  <DarkGlassCard className={`flex h-full min-h-[88px] flex-col items-center justify-between px-1.5 py-2 md:min-h-[156px] md:px-2 md:py-5 ${bgClass}`}>
    <div className="flex flex-col items-center w-full h-full justify-between">
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/70 md:text-[10px] md:tracking-[0.2em]">{label}</p>
      <div className="my-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 shadow-inner md:my-2 md:h-14 md:w-14">
        <Icon className={`h-4 w-4 md:h-7 md:w-7 ${colorClass}`} />
      </div>
      <div className="flex flex-col items-center">
        <span className={`text-[1.45rem] font-black leading-none md:text-3xl ${colorClass}`}>{value}</span>
        {unit && <span className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-white/50 md:mt-1 md:text-[10px] md:tracking-widest">{unit}</span>}
      </div>
    </div>
  </DarkGlassCard>
);

const DetailStatCard = ({
  label,
  value,
  unit = "",
  icon: Icon,
  colorClass = "text-white",
  subtitle = "",
  bgClass = "",
  className = "",
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: any;
  colorClass?: string;
  subtitle?: string;
  bgClass?: string;
  className?: string;
}) => (
  <DarkGlassCard className={`h-full min-h-[88px] p-3 md:min-h-[148px] md:p-5 ${bgClass} ${className}`}>
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 shadow-inner md:h-12 md:w-12 md:rounded-2xl">
        <Icon className={`h-4 w-4 md:h-6 md:w-6 ${colorClass}`} />
      </div>
      <div className="mt-2 flex w-full flex-col items-center">
        <p className="text-[7px] font-black uppercase tracking-[0.12em] text-white/70 md:text-[10px] md:tracking-[0.18em]">{label}</p>
        <div className="mt-0.5 flex items-baseline justify-center gap-1">
          <span className={`text-base font-black md:text-2xl ${colorClass}`}>{value}</span>
          {unit && <span className="text-[7px] font-bold text-white/60 md:text-[10px]">{unit}</span>}
        </div>
        {subtitle && <p className="mt-1 max-w-[8rem] text-[7px] font-bold uppercase tracking-[0.12em] text-white/50 md:mt-2 md:text-[9px] md:tracking-widest">{subtitle}</p>}
      </div>
    </div>
  </DarkGlassCard>
);

const EquipmentDetailView = ({
  record,
  showTripSummary = false,
  tripSummary,
  latestTripRecord,
  tripRecords = [],
  currentTime,
  resolvedLocationLabel,
}: {
  record: EquipmentTrackingRecord;
  showTripSummary?: boolean;
  tripSummary?: EquipmentTripSummary | null;
  latestTripRecord?: EquipmentTripReportRecord | null;
  tripRecords?: EquipmentTripReportRecord[];
  currentTime?: Date;
  resolvedLocationLabel?: string;
}) => {
  const runHours = normalizeRecordText(record.raw?.odo) || "0";
  const voltage = normalizeRecordText(record.raw?.analog_voltage) || "0";
  const temperature =
    latestTripRecord?.temperature ??
    Number(normalizeRecordText(record.raw?.temperature) || 0);
  const humidity =
    latestTripRecord?.humidity ||
    normalizeRecordText(record.raw?.humidity) ||
    "0";
  const registrationNo =
    record.registrationNo || normalizeRecordText(record.raw?.registration_no) || "N/A";
  const fuelLevelValue = latestTripRecord?.fuelLevel ?? record.fuelLevel ?? null;
  const pumpStatus =
    record.statusLabel?.toUpperCase() || (record.ignitionOn ? "RUNNING" : "STOPPED");
  const pumpStatusColor = record.ignitionOn ? "text-blue-600" : "text-slate-500";
  const currentDateLabel = dateFormatter.format(currentTime || new Date());
  const currentClockLabel = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(currentTime || new Date());
  const pumpStatusSince = formatDateTime(
    latestTripRecord?.movingStartDate ||
      latestTripRecord?.startDate ||
      record.lastUpdate
  );
  const selectedTripDistance = tripSummary
    ? formatTripDistance(tripSummary.totalDistance)
    : formatTripDistance(record.distance || 0);
  const inlineLocationLabel = getTripOrInlineLocationLabel(record, latestTripRecord);
  const locationLabel =
    resolvedLocationLabel ||
    inlineLocationLabel ||
    "Location unavailable";
  const hasMapCoordinates = record.lat !== null && record.lng !== null;
  const mapEmbedUrl = hasMapCoordinates
    ? buildGoogleMapEmbedUrl(record.lat, record.lng)
    : "";
  const mapOpenUrl = hasMapCoordinates
    ? buildGoogleMapOpenUrl(record.lat, record.lng)
    : "";
  
  return (
    <div className="space-y-4 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3 md:gap-5">
          <div>
            <h1 className="text-[1.7rem] font-black leading-none tracking-tight text-slate-900 md:text-4xl">
              {getRecordTitle(record)}
            </h1>
            <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-blue-600 md:mt-2 md:text-[11px] md:tracking-[0.25em]">
              {getRecordSubtitle(record)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 md:gap-6 md:justify-end">
          <div className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#020617] shadow-lg md:gap-3 md:px-5 md:py-2.5 md:text-[11px] md:tracking-widest ${record.statusKey === 'moving' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-amber-500 shadow-amber-500/30'}`}>
            {record.statusKey === 'moving' ? <Play className="h-2.5 w-2.5 fill-current md:h-3 md:w-3" /> : <Power className="h-2.5 w-2.5 md:h-3 md:w-3" />}
            {record.statusLabel || "Unknown"}
          </div>
          <div className="flex items-center gap-2.5 md:gap-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm md:h-12 md:w-12 md:rounded-2xl">
              <Signal className={`h-5 w-5 md:h-6 md:w-6 ${record.statusKey === 'unreachable' ? 'text-slate-300' : 'text-emerald-500'}`} />
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 md:text-[10px] md:tracking-widest">{currentDateLabel}</p>
              <p className="text-base font-black text-slate-900 md:text-xl">{currentClockLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {showTripSummary && (
        <TripReportWindow
          record={record}
          tripSummary={tripSummary}
          tripRecords={tripRecords}
          currentTime={currentTime}
        />
      )}

      {/* Row 1: Compact Metrics */}
      <div className="grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-4 xl:grid-cols-8">
        <MetricTile label="Speed" value={record.speed.toFixed(0)} unit="km/h" icon={Gauge} colorClass="text-white" bgClass="bg-gradient-to-br from-[#1e40af] to-[#1e3a8a]" />
        <MetricTile label="Ignition" value={record.ignitionOn ? "ON" : "OFF"} icon={Power} colorClass={record.ignitionOn ? "text-emerald-300" : "text-white/60"} bgClass="bg-gradient-to-br from-[#047857] to-[#064e3b]" />
        <MetricTile label="Heading" value={record.direction?.toFixed(0) || "0"} unit="deg" icon={Compass} colorClass="text-white" bgClass="bg-gradient-to-br from-[#7e22ce] to-[#581c87]" />
        <MetricTile label="Odometer" value={runHours} unit="km" icon={Hourglass} colorClass="text-white" bgClass="bg-gradient-to-br from-[#b45309] to-[#78350f]" />
        <MetricTile label="Voltage" value={voltage} unit="V" icon={Zap} colorClass="text-white" bgClass="bg-gradient-to-br from-[#0369a1] to-[#0c4a6e]" />
        <DetailStatCard label="Temperature" value={temperature} unit="C" icon={Thermometer} colorClass="text-white" subtitle="Live Sensor Feed" bgClass="bg-gradient-to-br from-[#be123c] to-[#881337]" />
        <DetailStatCard label="Humidity" value={humidity} unit="%" icon={Droplets} colorClass="text-white" subtitle="Live Sensor Feed" bgClass="bg-gradient-to-br from-[#0f766e] to-[#134e4a]" />
        <DetailStatCard
          label="Fuel Level"
          value={fuelLevelValue === null ? "--" : Number(fuelLevelValue).toFixed(0)}
          unit="%"
          icon={Battery}
          colorClass="text-white"
          subtitle={`Selected Range: ${selectedTripDistance}`}
          bgClass="bg-gradient-to-br from-[#c2410c] to-[#7c2d12]"
        />
      </div>

      {/* Row 2: Status + Diagnostics */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1.25fr_0.95fr_1.05fr] md:items-stretch md:gap-5">
        <DarkGlassCard className="flex h-full w-full items-center gap-2.5 p-3 md:gap-5 md:p-6 bg-gradient-to-br from-[#4338ca] to-[#312e81]">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white/20 shadow-inner md:h-20 md:w-20 md:rounded-[24px]">
            <Droplets className={`h-7 w-7 md:h-10 md:w-10 ${record.ignitionOn ? 'text-blue-300' : 'text-white/40'}`} />
          </div>
          <div>
            <p className="text-[7px] font-black uppercase tracking-[0.12em] text-white/70 md:text-[10px] md:tracking-[0.2em]">
              <span className="md:hidden">Current Status</span>
              <span className="hidden md:inline">Pump Status</span>
            </p>
            <p className={`mt-0.5 text-lg font-black md:mt-2 md:text-3xl ${record.ignitionOn ? "text-white" : "text-white/60"}`}>{pumpStatus}</p>
            <p className="mt-1.5 text-[8px] font-bold text-white/60 md:mt-4 md:text-[10px]">Since: {pumpStatusSince}</p>
            <p className="mt-1 text-[8px] font-bold text-white/60 md:mt-2 md:text-[10px]">Reg No: {registrationNo}</p>
          </div>
        </DarkGlassCard>

        <DarkGlassCard className="h-full p-3 md:p-8 bg-gradient-to-br from-[#334155] to-[#0f172a]">
          <p className="mb-3 text-[7px] font-black uppercase tracking-[0.12em] text-white/70 md:mb-8 md:text-[10px] md:tracking-[0.2em]">
            <span className="md:hidden">System Diagnostics</span>
            <span className="hidden md:inline">System Status</span>
          </p>
          <div className="space-y-2.5 md:space-y-5">
            {[
              { label: "GPS Fix", status: record.lat ? "LOCKED" : "NO FIX", ok: !!record.lat },
              { label: "Connectivity", status: record.statusKey !== 'unreachable' ? "STABLE" : "OFFLINE", ok: record.statusKey !== 'unreachable' },
              { label: "Power", status: record.ignitionOn ? "ACTIVE" : "STANDBY", ok: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${item.ok ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'}`} />
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/90 md:text-[11px] md:tracking-widest">{item.label}</span>
                </div>
                <span className={`text-[8px] font-black uppercase tracking-[0.1em] md:text-[10px] md:tracking-widest ${item.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </DarkGlassCard>

        <DarkGlassCard className="h-full p-3 md:p-6 bg-gradient-to-br from-[#a21caf] to-[#701a75]">
          <div className="mb-2.5 flex items-center justify-between gap-2 md:mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-white" />
              <span className="text-[7px] font-black uppercase tracking-[0.12em] text-white/70 md:text-[10px] md:tracking-[0.2em]">Location</span>
            </div>
            {hasMapCoordinates ? (
              <a
                href={mapOpenUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/20 px-2 py-1 text-[7px] font-black uppercase tracking-[0.1em] text-white transition hover:bg-black/40 md:px-3 md:text-[9px]"
              >
                <MapPin className="h-3 w-3 text-rose-400" />
                Open Map
              </a>
            ) : null}
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-white/10 ring-1 ring-white/20 md:aspect-video md:rounded-[20px]">
            {hasMapCoordinates ? (
              <>
                <iframe
                  title={`Location map for ${getRecordTitle(record)}`}
                  src={mapEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-full w-full border-0"
                />
                <div className="pointer-events-none absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-slate-950/75 px-2 py-1 text-[7px] font-black uppercase tracking-[0.1em] text-white shadow-lg md:left-3 md:top-3 md:text-[8px]">
                  <MapPin className="h-3 w-3 text-rose-400" />
                  Live GPS
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <MapIcon className="h-16 w-16 text-white" />
              </div>
            )}
          </div>
          <div className="mt-2.5 hidden space-y-2.5 md:mt-6 md:block md:space-y-4">
            <div>
              <p className="text-[7px] font-black uppercase tracking-[0.12em] text-white/70 md:text-[9px] md:tracking-widest">
                Current Location
              </p>
              <p className="mt-1 text-[9px] font-bold leading-4 text-white md:text-[11px] md:leading-5">
                {locationLabel}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div>
                <p className="text-[7px] font-black uppercase tracking-[0.12em] text-white/70 md:text-[9px] md:tracking-widest">Lat</p>
                <p className="text-[9px] font-bold text-white uppercase md:text-[11px]">
                  {formatCoordinateLabel(record.lat, "lat")}
                </p>
              </div>
              <div>
                <p className="text-[7px] font-black uppercase tracking-[0.12em] text-white/70 md:text-[9px] md:tracking-widest">Long</p>
                <p className="text-[9px] font-bold text-white uppercase md:text-[11px]">
                  {formatCoordinateLabel(record.lng, "lng")}
                </p>
              </div>
            </div>
          </div>
        </DarkGlassCard>
      </div>

    </div>
  );
};

export default function IOTDashbaord() {
  const [records, setRecords] = useState<EquipmentTrackingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filterValues, setFilterValues] = useState<DashboardFilters>(() =>
    buildDefaultDashboardFilters(new Date())
  );
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>(() =>
    buildDefaultDashboardFilters(new Date())
  );
  const [filterError, setFilterError] = useState("");
  const [resolvedLocationLabels, setResolvedLocationLabels] = useState<
    Record<string, string>
  >({});
  const [tripRecordsByRouteId, setTripRecordsByRouteId] = useState<
    Record<string, EquipmentTripReportRecord[]>
  >({});
  const deviceOptions = useMemo(
    () =>
      [...records]
        .sort((left, right) =>
          buildDeviceFilterLabel(left).localeCompare(buildDeviceFilterLabel(right))
        )
        .map((record) => ({
          value: record.routeId,
          label: buildDeviceFilterLabel(record),
        })),
    [records]
  );
  const filteredRecords = useMemo(() => {
    if (appliedFilters.selectedRouteId === ALL_DEVICES_FILTER) {
      return records;
    }

    return records.filter(
      (record) => record.routeId === appliedFilters.selectedRouteId
    );
  }, [appliedFilters.selectedRouteId, records]);
  const isSingleDeviceView =
    appliedFilters.selectedRouteId !== ALL_DEVICES_FILTER;
  const selectedDisplayDate =
    parseLocalDateTimeValue(appliedFilters.toValue) || currentTime;

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadTrackingData = async ({ signal }: { signal?: AbortSignal } = {}) => {
    setLoading(true);
    try {
      const response = await getEquipmentTrackingReport(signal);
      const iotPumpRecords = response.records.filter(isIotPumpRecord);
      setRecords(iotPumpRecords);
    } catch (err: any) {
      if (!isAbortLikeError(err)) {
        setRecords([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadTrackingData({ signal: controller.signal });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const knownRouteIds = new Set(records.map((record) => record.routeId));

    if (
      filterValues.selectedRouteId !== ALL_DEVICES_FILTER &&
      !knownRouteIds.has(filterValues.selectedRouteId)
    ) {
      setFilterValues((current) => ({
        ...current,
        selectedRouteId: ALL_DEVICES_FILTER,
      }));
    }

    if (
      appliedFilters.selectedRouteId !== ALL_DEVICES_FILTER &&
      !knownRouteIds.has(appliedFilters.selectedRouteId)
    ) {
      setAppliedFilters((current) => ({
        ...current,
        selectedRouteId: ALL_DEVICES_FILTER,
      }));
    }
  }, [appliedFilters.selectedRouteId, filterValues.selectedRouteId, records]);

  const loadTripReport = async ({ record, fromValue, toValue, signal }: { record: EquipmentTrackingRecord; fromValue: string; toValue: string; signal?: AbortSignal }) => {
    const [dateFrom, rawTimeFrom] = fromValue.split("T");
    const [dateTo, rawTimeTo] = toValue.split("T");
    const timeFrom = normalizeTimeInputValue(rawTimeFrom);
    const timeTo = normalizeTimeInputValue(rawTimeTo);
    const rangeStartDate = parseLocalDateTimeValue(`${dateFrom}T${timeFrom}`);
    const rangeEndDate = parseLocalDateTimeValue(`${dateTo}T${timeTo}`);

    if (!record.deviceId || !dateFrom || !dateTo || !rangeStartDate || !rangeEndDate) {
      return [];
    }

    try {
      const response = await getEquipmentTripReport({
        deviceId: record.deviceId,
        dateFrom,
        dateTo,
        timePickerFrom: timeFrom || TRIP_REPORT_START_TIME,
        timePickerTo: timeTo,
      }, signal);

      const filterStart = rangeStartDate.getTime();
      const filterEnd = rangeEndDate.getTime();
      const filteredTripRecords = (response.records || []).filter((tripRecord) => {
        const segmentStart =
          parseTripReportDateTime(tripRecord.startDate) ??
          parseTripReportDateTime(tripRecord.movingStartDate);
        const segmentEnd =
          parseTripReportDateTime(tripRecord.endDate) ??
          parseTripReportDateTime(tripRecord.movingEndDate) ??
          segmentStart;

        if (segmentStart === null && segmentEnd === null) {
          return true;
        }

        const safeSegmentStart = segmentStart ?? segmentEnd ?? filterStart;
        const safeSegmentEnd = segmentEnd ?? segmentStart ?? filterEnd;
        return safeSegmentEnd >= filterStart && safeSegmentStart <= filterEnd;
      });

      return filteredTripRecords;
    } catch (err: any) {
      if (!isAbortLikeError(err)) {
        return [];
      }
    }

    return [];
  };

  const handleFilterValueChange = (
    key: keyof DashboardFilters,
    value: string
  ) => {
    setFilterValues((current) => ({
      ...current,
      [key]: value,
    }));

    if (filterError) {
      setFilterError("");
    }
  };

  const handleApplyFilters = () => {
    const validationError = getDashboardFilterValidationError(filterValues);

    if (validationError) {
      setFilterError(validationError);
      return;
    }

    setFilterError("");
    setAppliedFilters(filterValues);
  };

  const handleBackToAllDevices = () => {
    const nextFilters = buildDefaultDashboardFilters(new Date());

    setFilterError("");
    setFilterValues(nextFilters);
    setAppliedFilters(nextFilters);
  };

  useEffect(() => {
    if (!filteredRecords.length) {
      setTripRecordsByRouteId({});
      return;
    }

    const controller = new AbortController();

    const loadAllTripReports = async () => {
      const tripEntries = await Promise.all(
        filteredRecords.map(async (record) => [
          record.routeId,
          await loadTripReport({
            record,
            fromValue: appliedFilters.fromValue,
            toValue: appliedFilters.toValue,
            signal: controller.signal,
          }),
        ] as const)
      );

      if (!controller.signal.aborted) {
        setTripRecordsByRouteId(Object.fromEntries(tripEntries));
      }
    };

    void loadAllTripReports();

    return () => controller.abort();
  }, [appliedFilters.fromValue, appliedFilters.toValue, filteredRecords]);

  useEffect(() => {
    if (!filteredRecords.length) {
      setResolvedLocationLabels({});
      return;
    }

    const controller = new AbortController();

    const resolveCurrentLocations = async () => {
      const lookupCandidates = filteredRecords.filter((record) => {
        const latestTripRecord =
          tripRecordsByRouteId[record.routeId]?.[
            tripRecordsByRouteId[record.routeId].length - 1
          ] || null;
        const hasInlineLocation = getTripOrInlineLocationLabel(
          record,
          latestTripRecord
        );
        return !hasInlineLocation && record.lat !== null && record.lng !== null;
      });

      if (!lookupCandidates.length) {
        setResolvedLocationLabels({});
        return;
      }

      const results = await Promise.all(
        lookupCandidates.map(async (record) => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${record.lat}&lon=${record.lng}&zoom=17&addressdetails=1&accept-language=en`,
              {
                headers: {
                  Accept: "application/json",
                },
                signal: controller.signal,
              }
            );

            if (!response.ok) {
              throw new Error("Reverse geocode failed");
            }

            const payload = await response.json();
            return [record.routeId, buildReverseGeocodeLocationName(payload)] as const;
          } catch (err: any) {
            if (isAbortLikeError(err)) {
              return null;
            }

            return [record.routeId, ""] as const;
          }
        })
      );

      if (controller.signal.aborted) {
        return;
      }

      setResolvedLocationLabels(
        Object.fromEntries(results.filter(Boolean) as [string, string][])
      );
    };

    void resolveCurrentLocations();

    return () => controller.abort();
  }, [filteredRecords, tripRecordsByRouteId]);

  if (loading && !records.length) {
    return (
      <div className="flex min-h-screen items-center justify-center text-black">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-blue-500" />
          <p className="text-sm font-black uppercase tracking-widest text-black/40">Initializing IOT System...</p>
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-[#f7f8fc] px-2.5 pb-16 pt-4 text-black md:px-10 md:pb-32 md:pt-8">
      <div className="mx-auto mb-6 max-w-full rounded-[24px] border border-slate-200/80 bg-white p-3 shadow-[0_20px_45px_rgba(15,23,42,0.08)] md:mb-8 md:rounded-[32px] md:p-6">
        <div className="space-y-3 md:space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Filters
            </p>

            {isSingleDeviceView ? (
              <button
                type="button"
                onClick={handleBackToAllDevices}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 transition hover:bg-slate-100"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(220px,280px)_minmax(210px,240px)_minmax(210px,240px)_140px] xl:items-end">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Device
              </span>
              <select
                value={filterValues.selectedRouteId}
                onChange={(event) =>
                  handleFilterValueChange("selectedRouteId", event.target.value)
                }
                className="h-11 min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                title={
                  filterValues.selectedRouteId === ALL_DEVICES_FILTER
                    ? "All devices"
                    : deviceOptions.find(
                        (option) => option.value === filterValues.selectedRouteId
                      )?.label || ""
                }
              >
                <option value={ALL_DEVICES_FILTER}>All devices</option>
                {deviceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                From Date
              </span>
              <input
                type="datetime-local"
                step={1}
                value={filterValues.fromValue}
                onChange={(event) =>
                  handleFilterValueChange("fromValue", event.target.value)
                }
                className="h-11 min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </label>

            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                To Date
              </span>
              <input
                type="datetime-local"
                step={1}
                value={filterValues.toValue}
                onChange={(event) =>
                  handleFilterValueChange("toValue", event.target.value)
                }
                className="h-11 min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </label>

            <button
              type="button"
              onClick={handleApplyFilters}
              className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-slate-700"
            >
              Apply
            </button>
          </div>

          {filterError ? (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-rose-600">
              <AlertCircle className="h-3.5 w-3.5" />
              {filterError}
            </div>
          ) : null}
        </div>
      </div>

      {filteredRecords.length ? (
        <div className="mx-auto max-w-full space-y-8 md:space-y-10">
          {filteredRecords.map((record) => {
            const recordTripRecords = tripRecordsByRouteId[record.routeId] || [];
            const recordTripSummary = buildEquipmentTripSummary(recordTripRecords);
            const recordLatestTripRecord =
              recordTripRecords[recordTripRecords.length - 1] || null;

            return (
              <div
                key={record.routeId}
                className="space-y-4 md:space-y-6"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Device Overview
                  </p>
                  <div className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                    Live Summary
                  </div>
                </div>

                <EquipmentDetailView
                  record={record}
                  showTripSummary={true}
                  tripSummary={recordTripSummary}
                  latestTripRecord={recordLatestTripRecord}
                  tripRecords={recordTripRecords}
                  currentTime={selectedDisplayDate}
                  resolvedLocationLabel={resolvedLocationLabels[record.routeId]}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mx-auto flex min-h-[220px] max-w-full items-center justify-center rounded-[28px] bg-white p-6 text-center shadow-[0_24px_60px_rgba(148,163,184,0.18)] md:rounded-[32px]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">
              No Matching Equipment
            </p>
            <p className="mt-2 text-base font-bold text-slate-700">
              Try a different device or date range.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
