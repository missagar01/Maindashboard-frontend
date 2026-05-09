import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../O2D/ui/select";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
});
const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

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

  const directParsed = new Date(normalized);
  if (!Number.isNaN(directParsed.getTime())) {
    return directParsed.getTime();
  }

  const localParsed = parseLocalDateTimeValue(normalized.replace(" ", "T"));
  if (!localParsed || Number.isNaN(localParsed.getTime())) {
    return null;
  }

  return localParsed.getTime();
};

const buildDefaultFromDate = () =>
  `${toDateInputValue(new Date())}T00:00:00`;

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

interface EquipmentTripSummary {
  totalDistance: number;
  averageSpeed: number;
  totalDurationSeconds: number;
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

// UI Components for the new Premium Theme
const GlassCard = ({
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
    className={`relative overflow-hidden rounded-[16px] border border-slate-200/90 bg-white/70 shadow-[0_18px_48px_rgba(148,163,184,0.22)] backdrop-blur-xl md:rounded-[24px] ${className}`}
  >
    {children}
  </div>
);

const MetricTile = ({
  label,
  value,
  unit = "",
  icon: Icon,
  colorClass = "text-blue-400",
  bgClass = "",
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: any;
  colorClass?: string;
  bgClass?: string;
}) => (
  <GlassCard className={`flex h-full min-h-[98px] flex-col items-center justify-between border-slate-200/80 px-1.5 py-2.5 md:min-h-[184px] md:px-2 md:py-7 ${bgClass}`}>
    <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-500 md:text-[10px] md:tracking-[0.2em]">{label}</p>
    <div className="my-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/45 shadow-inner md:my-2 md:h-14 md:w-14">
      <Icon className={`h-4 w-4 md:h-7 md:w-7 ${colorClass}`} />
    </div>
    <div className="flex flex-col items-center">
      <span className={`text-[1.45rem] font-black leading-none md:text-3xl ${colorClass}`}>{value}</span>
      {unit && <span className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-slate-500 md:mt-1 md:text-[10px] md:tracking-widest">{unit}</span>}
    </div>
  </GlassCard>
);

const DetailStatCard = ({
  label,
  value,
  unit = "",
  icon: Icon,
  colorClass = "text-blue-400",
  subtitle = "",
  bgClass = "",
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: any;
  colorClass?: string;
  subtitle?: string;
  bgClass?: string;
}) => (
  <GlassCard className={`h-full min-h-[100px] border-slate-200/80 p-3 md:min-h-[176px] md:p-6 ${bgClass}`}>
    <div className="flex items-start gap-2 md:gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/45 shadow-inner md:h-12 md:w-12 md:rounded-2xl">
        <Icon className={`h-4 w-4 md:h-6 md:w-6 ${colorClass}`} />
      </div>
      <div className="flex-1">
        <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-500 md:text-[10px] md:tracking-[0.18em]">{label}</p>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className={`text-base font-black md:text-2xl ${colorClass}`}>{value}</span>
          {unit && <span className="text-[7px] font-bold text-slate-500 md:text-[10px]">{unit}</span>}
        </div>
        {subtitle && <p className="mt-1 text-[7px] font-bold uppercase tracking-[0.12em] text-slate-500 md:mt-2 md:text-[9px] md:tracking-widest">{subtitle}</p>}
      </div>
    </div>
  </GlassCard>
);

const EquipmentDetailView = ({
  record,
  isSingle = false,
  onBack,
  tripSummary,
  latestTripRecord,
  currentTime,
  resolvedLocationLabel,
  locationLookupLoading = false,
}: {
  record: EquipmentTrackingRecord;
  isSingle?: boolean;
  onBack?: () => void;
  tripSummary?: EquipmentTripSummary | null;
  latestTripRecord?: EquipmentTripReportRecord | null;
  currentTime?: Date;
  resolvedLocationLabel?: string;
  locationLookupLoading?: boolean;
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
    inlineLocationLabel 
    
  const hasMapCoordinates = record.lat !== null && record.lng !== null;
  const mapEmbedUrl = hasMapCoordinates
    ? buildGoogleMapEmbedUrl(record.lat, record.lng)
    : "";
  const mapOpenUrl = hasMapCoordinates
    ? buildGoogleMapOpenUrl(record.lat, record.lng)
    : "";
  
  return (
    <div className={`space-y-4 md:space-y-8 ${!isSingle ? "mb-10 border-b border-slate-200 pb-10 md:mb-20 md:pb-20" : ""}`}>
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3 md:gap-5">
          {isSingle && (
            <button onClick={onBack} className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-all hover:bg-slate-50 md:mt-1 md:h-12 md:w-12">
              <ArrowLeft className="h-4 w-4 text-slate-700 md:h-5 md:w-5" />
            </button>
          )}
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

      {/* Row 1: Core Metrics */}
      <div className="grid grid-cols-3 gap-2 md:grid-cols-5 md:gap-5">
        <MetricTile label="Speed" value={record.speed.toFixed(0)} unit="km/h" icon={Gauge} colorClass="text-blue-600" bgClass="bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100" />
        <MetricTile label="Ignition" value={record.ignitionOn ? "ON" : "OFF"} icon={Power} colorClass="text-emerald-600" bgClass="bg-gradient-to-br from-emerald-100 via-teal-50 to-emerald-100" />
        <MetricTile label="Heading" value={record.direction?.toFixed(0) || "0"} unit="deg" icon={Compass} colorClass="text-purple-600" bgClass="bg-gradient-to-br from-violet-100 via-fuchsia-50 to-purple-100" />
        <MetricTile label="Odometer" value={runHours} unit="km" icon={Hourglass} colorClass="text-amber-600" bgClass="bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100" />
        <MetricTile label="Voltage" value={voltage} unit="V" icon={Zap} colorClass="text-cyan-600" bgClass="bg-gradient-to-br from-cyan-100 via-sky-50 to-blue-100" />
      </div>

      {/* Row 2: Pump Metrics */}
      <div className="grid grid-cols-3 gap-2 md:grid-cols-5 md:gap-5">
        <GlassCard className="col-span-3 flex items-center gap-2.5 border-slate-200/80 p-3 md:col-span-2 md:min-h-[176px] md:gap-6 md:p-8 bg-gradient-to-br from-indigo-100 via-indigo-50 to-sky-100">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white/55 shadow-inner md:h-20 md:w-20 md:rounded-[24px]">
            <Droplets className={`h-7 w-7 md:h-10 md:w-10 ${record.ignitionOn ? 'text-blue-600 fill-blue-600/10' : 'text-slate-300'}`} />
          </div>
          <div>
            <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-500 md:text-[10px] md:tracking-[0.2em]">
              <span className="md:hidden">Current Status</span>
              <span className="hidden md:inline">Pump Status</span>
            </p>
            <p className={`mt-0.5 text-lg font-black md:mt-2 md:text-3xl ${pumpStatusColor}`}>{pumpStatus}</p>
            <p className="mt-1.5 text-[8px] font-bold text-slate-500 md:mt-4 md:text-[10px]">Since: {pumpStatusSince}</p>
            <p className="mt-1 text-[8px] font-bold text-slate-500 md:mt-2 md:text-[10px]">Reg No: {registrationNo}</p>
          </div>
        </GlassCard>
        <DetailStatCard label="Temperature" value={temperature} unit="C" icon={Thermometer} colorClass="text-rose-600" subtitle="Live Sensor Feed" bgClass="bg-gradient-to-br from-rose-100 via-pink-50 to-red-100" />
        <DetailStatCard label="Humidity" value={humidity} unit="%" icon={Droplets} colorClass="text-sky-600" subtitle="Live Sensor Feed" bgClass="bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-100" />
        <DetailStatCard
          label="Fuel Level"
          value={fuelLevelValue === null ? "--" : Number(fuelLevelValue).toFixed(0)}
          unit="%"
          icon={Battery}
          colorClass="text-amber-600"
          subtitle={`Selected Range: ${selectedTripDistance}`}
          bgClass="bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100"
        />
      </div>

      {/* Row 3: Systems & Diagnostics */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-5">
        <GlassCard className="col-span-2 p-3 md:col-span-1 md:p-8 bg-gradient-to-br from-slate-100 via-slate-50 to-zinc-100">
          <p className="mb-3 text-[7px] font-black uppercase tracking-[0.12em] text-slate-500 md:mb-8 md:text-[10px] md:tracking-[0.2em]">
            <span className="md:hidden">System Diagnostics</span>
            <span className="hidden md:inline">System Status</span>
          </p>
          <div className="space-y-2.5 md:space-y-5">
            {[
              { label: "GPS Fix", status: record.lat ? "LOCKED" : "NO FIX", ok: !!record.lat },
              { label: "Connectivity", status: record.statusKey !== 'unreachable' ? "STABLE" : "OFFLINE", ok: record.statusKey !== 'unreachable' },
              { label: "Power", status: record.ignitionOn ? "ACTIVE" : "STANDBY", ok: true },
              { label: "Hardware", status: record.serial ? "VERIFIED" : "ERROR", ok: !!record.serial },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${item.ok ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'}`} />
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-700 md:text-[11px] md:tracking-widest">{item.label}</span>
                </div>
                <span className={`text-[8px] font-black uppercase tracking-[0.1em] md:text-[10px] md:tracking-widest ${item.ok ? 'text-emerald-600' : 'text-rose-500'}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="col-span-2 p-3 md:col-span-1 md:p-6 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-sky-100">
          <div className="mb-2.5 flex items-center justify-between gap-2 md:mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-500 md:text-[10px] md:tracking-[0.2em]">Location</span>
            </div>
            {hasMapCoordinates ? (
              <a
                href={mapOpenUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/75 px-2 py-1 text-[7px] font-black uppercase tracking-[0.1em] text-slate-600 transition hover:bg-white hover:text-slate-900 md:px-3 md:text-[9px]"
              >
                <MapPin className="h-3 w-3 text-rose-500" />
                Open Map
              </a>
            ) : null}
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-white/55 ring-1 ring-slate-200 md:aspect-video md:rounded-[20px]">
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
                <MapIcon className="h-16 w-16 text-violet-300" />
              </div>
            )}
          </div>
          <div className="mt-2.5 hidden space-y-2.5 md:mt-6 md:block md:space-y-4">
            <div>
              <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-500 md:text-[9px] md:tracking-widest">
                Current Location
              </p>
              <p className="mt-1 text-[9px] font-bold leading-4 text-slate-700 md:text-[11px] md:leading-5">
                {locationLabel}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div>
                <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-500 md:text-[9px] md:tracking-widest">Lat</p>
                <p className="text-[9px] font-bold text-slate-700 uppercase md:text-[11px]">
                  {formatCoordinateLabel(record.lat, "lat")}
                </p>
              </div>
              <div>
                <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-500 md:text-[9px] md:tracking-widest">Long</p>
                <p className="text-[9px] font-bold text-slate-700 uppercase md:text-[11px]">
                  {formatCoordinateLabel(record.lng, "lng")}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      
      </div>

    </div>
  );
};

export default function IOTDashbaord() {
  const navigate = useNavigate();
  const { equipmentId } = useParams();

  const [records, setRecords] = useState<EquipmentTrackingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedLocationLabel, setSelectedLocationLabel] = useState("");
  const [locationLookupLoading, setLocationLookupLoading] = useState(false);
  
  const [selectedEquipmentRouteId, setSelectedEquipmentRouteId] = useState(() => equipmentId || "");
  const [tripRecords, setTripRecords] = useState<EquipmentTripReportRecord[]>([]);

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

  const selectedRecord = useMemo(
    () => equipmentId ? records.find((r) => r.routeId === equipmentId) || null : null,
    [equipmentId, records]
  );

  const equipmentOptions = useMemo(
    () => [...records].sort((a, b) => getRecordTitle(a).localeCompare(getRecordTitle(b))).map((r) => ({
      label: `${getRecordTitle(r)}${r.deviceId ? ` (${r.deviceId})` : ""}`,
      value: r.routeId,
    })),
    [records]
  );

  const tripSummary = useMemo(
    () => buildEquipmentTripSummary(tripRecords),
    [tripRecords]
  );

  const latestTripRecord = useMemo(
    () => tripRecords[tripRecords.length - 1] || null,
    [tripRecords]
  );
  const selectedInlineLocationLabel = useMemo(
    () =>
      selectedRecord ? getTripOrInlineLocationLabel(selectedRecord, latestTripRecord) : "",
    [selectedRecord, latestTripRecord]
  );

  const loadTripReport = async ({ record, fromValue, toValue, signal }: { record: EquipmentTrackingRecord; fromValue: string; toValue: string; signal?: AbortSignal }) => {
    const [dateFrom, rawTimeFrom] = fromValue.split("T");
    const [dateTo, rawTimeTo] = toValue.split("T");
    const timeFrom = normalizeTimeInputValue(rawTimeFrom);
    const timeTo = normalizeTimeInputValue(rawTimeTo);
    const rangeStartDate = parseLocalDateTimeValue(`${dateFrom}T${timeFrom}`);
    const rangeEndDate = parseLocalDateTimeValue(`${dateTo}T${timeTo}`);

    if (!record.deviceId || !dateFrom || !dateTo || !rangeStartDate || !rangeEndDate) {
      setTripRecords([]);
      return;
    }

    try {
      const response = await getEquipmentTripReport({
        deviceId: record.deviceId,
        dateFrom,
        dateTo,
        timePickerFrom: timeFrom,
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

      setTripRecords(filteredTripRecords);
    } catch (err: any) {
      if (!isAbortLikeError(err)) {
        setTripRecords([]);
      }
    }
  };

  useEffect(() => {
    if (!selectedRecord) {
      setTripRecords([]);
      return;
    }

    const nextFromDateTime = buildDefaultFromDate();
    const nextToDateTime = toDateTimeInputValue(currentTime);

    const controller = new AbortController();
    loadTripReport({
      record: selectedRecord,
      fromValue: nextFromDateTime,
      toValue: nextToDateTime,
      signal: controller.signal,
    });
    return () => controller.abort();
  }, [selectedRecord?.routeId, currentTime]);

  useEffect(() => {
    if (!selectedRecord) {
      setSelectedLocationLabel("");
      setLocationLookupLoading(false);
      return;
    }

    if (selectedInlineLocationLabel) {
      setSelectedLocationLabel(selectedInlineLocationLabel);
      setLocationLookupLoading(false);
      return;
    }

    if (selectedRecord.lat === null || selectedRecord.lng === null) {
      setSelectedLocationLabel("");
      setLocationLookupLoading(false);
      return;
    }

    const controller = new AbortController();

    const resolveCurrentLocation = async () => {
      setLocationLookupLoading(true);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${selectedRecord.lat}&lon=${selectedRecord.lng}&zoom=17&addressdetails=1&accept-language=en`,
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

        if (controller.signal.aborted) {
          return;
        }

        setSelectedLocationLabel(buildReverseGeocodeLocationName(payload));
      } catch (err: any) {
        if (!isAbortLikeError(err)) {
          setSelectedLocationLabel("");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLocationLookupLoading(false);
        }
      }
    };

    void resolveCurrentLocation();

    return () => controller.abort();
  }, [
    selectedRecord?.routeId,
    selectedRecord?.lat,
    selectedRecord?.lng,
    selectedInlineLocationLabel,
  ]);

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
      {/* Equipment Selector */}
      {!equipmentId && (
        <div className="mb-8 flex flex-col gap-3 md:mb-12 md:flex-row md:items-center md:gap-4">
          <div className="flex-1">
            <Select value={selectedEquipmentRouteId} onValueChange={(val) => {
              setSelectedEquipmentRouteId(val);
              navigate(`/iot/dashboard/${encodeURIComponent(val)}`);
            }}>
              <SelectTrigger className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-800 shadow-sm backdrop-blur-xl focus:ring-0 md:h-14 md:rounded-2xl md:text-sm">
                <SelectValue placeholder="Select Equipment GPS" />
              </SelectTrigger>
              <SelectContent className="border border-slate-200 bg-white text-slate-800 shadow-xl">
                {equipmentOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs focus:bg-slate-100 focus:text-slate-900 md:text-sm">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button onClick={() => loadTrackingData()} className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-600 active:scale-95 md:h-14 md:w-14 md:rounded-2xl">
            <RefreshCw className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </div>
      )}

      {selectedRecord ? (
        <div className="mx-auto max-w-full space-y-4 rounded-[28px] bg-white p-4 shadow-[0_24px_60px_rgba(148,163,184,0.22)] md:space-y-8 md:rounded-[32px] md:border md:border-slate-200 md:p-6">
          <EquipmentDetailView
            record={selectedRecord}
            isSingle={true}
            onBack={() => navigate("/iot/dashboard")}
            tripSummary={tripSummary}
            latestTripRecord={latestTripRecord}
            currentTime={currentTime}
            resolvedLocationLabel={selectedLocationLabel}
            locationLookupLoading={locationLookupLoading}
          />
        </div>
      ) : (
        <div className="mx-auto max-w-full space-y-8 md:space-y-20">
          {records.map((r) => (
            <EquipmentDetailView key={r.routeId} record={r} currentTime={currentTime} />
          ))}
        </div>
      )}

    </div>
  );
}
