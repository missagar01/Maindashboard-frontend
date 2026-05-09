import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Clock3,
  Fuel,
  Gauge,
  MapPinned,
  Navigation,
  RefreshCw,
  Search,
  Truck,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import {
  buildEquipmentTrackingSummary,
  getEquipmentTripReport,
  getEquipmentTrackingReport,
  type EquipmentTripReportRecord,
  type EquipmentTrackingRecord,
  type EquipmentTrackingStatusKey,
  type EquipmentTrackingSummary,
} from "../../../api/transport/trackingApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../O2D/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../O2D/ui/popover";
import { Calendar as CalendarComponent } from "../../O2D/ui/calendar";

const REFRESH_INTERVAL_MS = 60_000;

const numberFormatter = new Intl.NumberFormat("en-IN");
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
});
const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const TRIP_REPORT_START_TIME = "00:00:00";
const TRIP_REPORT_END_TIME = "23:59:59";

const statusMeta: Record<
  EquipmentTrackingStatusKey,
  {
    label: string;
    badgeClassName: string;
    markerColor: string;
    summaryTone: string;
  }
> = {
  moving: {
    label: "Moving",
    badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm",
    markerColor: "#059669",
    summaryTone: "from-emerald-500 to-teal-500",
  },
  stopped: {
    label: "Stopped",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-700 shadow-sm",
    markerColor: "#d97706",
    summaryTone: "from-amber-500 to-orange-500",
  },
  idling: {
    label: "Idling",
    badgeClassName: "border-sky-200 bg-sky-50 text-sky-700 shadow-sm",
    markerColor: "#0284c7",
    summaryTone: "from-sky-500 to-blue-500",
  },
  unreachable: {
    label: "Offline",
    badgeClassName: "border-slate-200 bg-slate-100 text-slate-700 shadow-sm",
    markerColor: "#475569",
    summaryTone: "from-slate-500 to-slate-700",
  },
};


const formatNumber = (value: number) => numberFormatter.format(Number(value || 0));

const formatDateTime = (value: string | null) => {
  if (!value) return "No timestamp";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No timestamp";
  return dateTimeFormatter.format(parsed);
};

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

const formatSpeed = (speed: number) => `${speed.toFixed(0)} km/h`;

const formatFuelLevel = (value: number | null) =>
  value === null ? "--" : `${value.toFixed(0)}%`;

const formatHeading = (value: number | null) => {
  if (value === null) return "--";

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(value / 45) % directions.length;
  return `${value.toFixed(0)} deg ${directions[index]}`;
};

const formatCoordinates = (record: EquipmentTrackingRecord) => {
  if (record.lat === null || record.lng === null) return "Coordinates unavailable";
  return `${record.lat.toFixed(6)}, ${record.lng.toFixed(6)}`;
};

const formatParkingDuration = (seconds: number) => {
  if (!seconds) return "0 min";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours <= 0) return `${minutes} min`;
  return `${hours}h ${minutes}m`;
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

const buildDefaultFromDate = () =>
  `${toDateInputValue(new Date())}T00:00:00`;

const buildDefaultToDate = () => toDateTimeInputValue(new Date());


const parseDateInputValue = (value: string) => {
  const [year, month, day] = String(value || "")
    .split("-")
    .map((segment) => Number(segment));

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
};

const formatDurationHms = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${hours}:${padNumber(minutes)}:${padNumber(remainingSeconds)}`;
};

const formatTripDistance = (value: number) => `${value.toFixed(2)} Km`;

const formatTripAverageSpeed = (value: number) => `${value.toFixed(2)} Kmph`;

const formatTripTableDateTime = (value: string | null) => {
  if (!value) return "--";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return `${parsed.getFullYear()}-${padNumber(parsed.getMonth() + 1)}-${padNumber(
    parsed.getDate()
  )} ${padNumber(parsed.getHours())}:${padNumber(
    parsed.getMinutes()
  )}:${padNumber(parsed.getSeconds())}`;
};

const formatTripTableDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
};

const formatTripTableDistance = (value: number) =>
  value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d*[1-9])0$/, "$1");

const formatDateInputPreview = (value: string) => {
  const [datePart, timePart] = value.split("T");
  const parsed = parseDateInputValue(datePart);
  if (!parsed || Number.isNaN(parsed.getTime())) return "No date selected";

  const dateStr = dateFormatter.format(parsed);
  return timePart ? `${dateStr} ${timePart}` : dateStr;
};

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

const resolveTripStatusKey = (
  record: EquipmentTripReportRecord
): EquipmentTrackingStatusKey => {
  const normalized = record.vehicleStatus.toLowerCase();

  if (normalized.includes("moving")) return "moving";
  if (normalized.includes("idle")) return "idling";
  if (normalized.includes("stop")) return "stopped";

  return "unreachable";
};

const formatTripLocation = (value: string) =>
  normalizeLocationValue(value) || "Location unavailable";

const hasCoordinates = (record: EquipmentTrackingRecord) =>
  record.lat !== null && record.lng !== null;

const getRecordTitle = (record: EquipmentTrackingRecord) =>
  record.equipment.equipmentName ||
  record.equipment.doorNumber ||
  record.registrationNo ||
  record.serial ||
  record.deviceId ||
  "Unnamed equipment";

const getRecordSubtitle = (record: EquipmentTrackingRecord) =>
  [record.equipment.equipmentCategory, record.equipment.equipmentType]
    .filter(Boolean)
    .join(" / ") || "Equipment";

const normalizeLocationValue = (value: unknown) => {
  const normalized = String(value ?? "").trim();

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

const getInlineLocationName = (record: EquipmentTrackingRecord | null) => {
  if (!record) return "";

  const raw = record.raw || {};

  return (
    [
      raw.location_name,
      raw.location,
      raw.address,
      raw.place_name,
      raw.geo_address,
      raw.geo_location,
      raw.tag,
    ]
      .map(normalizeLocationValue)
      .find(Boolean) || ""
  );
};

const buildReverseGeocodeLocationName = (payload: any) => {
  const address = payload?.address || {};
  const microLocation = Array.from(
    new Set(
      [
        [address.house_number, address.road || address.highway]
          .map(normalizeLocationValue)
          .filter(Boolean)
          .join(" "),
        address.road,
        address.highway,
        address.industrial,
        address.commercial,
        address.residential,
        address.neighbourhood,
        address.suburb,
        address.city_district,
        address.village,
        address.town,
        address.municipality,
        address.city,
        address.county,
        address.state,
      ]
        .map(normalizeLocationValue)
        .filter(Boolean)
    )
  )
    .slice(0, 5)
    .join(", ");

  const detailedName = normalizeLocationValue(payload?.display_name)
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join(", ");

  const compactName = Array.from(
    new Set(
      [
        address.road,
        address.highway,
        address.industrial,
        address.commercial,
        address.neighbourhood,
        address.hamlet,
        address.suburb,
        address.village,
        address.town,
        address.city_district,
        address.municipality,
        address.city,
        address.county,
        address.state,
      ]
        .map(normalizeLocationValue)
        .filter(Boolean)
    )
  )
    .slice(0, 4)
    .join(", ");

  return (
    microLocation ||
    detailedName ||
    compactName ||
    normalizeLocationValue(payload?.name) ||
    normalizeLocationValue(payload?.display_name)
  );
};

const getMapDisplayLocationName = (value: string | undefined) => {
  const normalized = normalizeLocationValue(value);

  if (!normalized) {
    return "";
  }

  const lowered = normalized.toLowerCase();

  if (
    lowered.includes("resolving location name") ||
    lowered.includes("location name unavailable") ||
    lowered.includes("coordinates unavailable")
  ) {
    return "";
  }

  return normalized
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join(", ");
};

const getMapCoordinateLabel = (record: EquipmentTrackingRecord) =>
  `Lat ${record.lat?.toFixed(6) ?? "--"}, Lng ${record.lng?.toFixed(6) ?? "--"}`;

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

const statusSummaryOrder: EquipmentTrackingStatusKey[] = [
  "moving",
  "stopped",
  "idling",
  "unreachable",
];

const pageCardClass =
  "border border-white/20 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_40%),linear-gradient(145deg,rgba(15,23,42,0.02)_0%,rgba(248,250,252,1)_60%,rgba(241,245,249,1)_100%)] [background-size:24px_24px,24px_24px,auto,auto] shadow-[0_8px_30px_rgb(0,0,0,0.04)]";

const insetCardClass =
  "border border-slate-200 bg-slate-50/50 shadow-inner backdrop-blur-sm";

const equipmentCardPaletteClasses = [
  "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#4f46e5_0%,#312e81_100%)] shadow-[0_20px_40px_rgba(79,70,229,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(79,70,229,0.4)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#10b981_0%,#064e3b_100%)] shadow-[0_20px_40px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(16,185,129,0.4)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#f59e0b_0%,#78350f_100%)] shadow-[0_20px_40px_rgba(245,158,11,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(245,158,11,0.4)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#ec4899_0%,#831843_100%)] shadow-[0_20px_40px_rgba(236,72,153,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(236,72,153,0.4)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#3b82f6_0%,#1e3a8a_100%)] shadow-[0_20px_40px_rgba(59,130,246,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(59,130,246,0.4)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#8b5cf6_0%,#4c1d95_100%)] shadow-[0_20px_40px_rgba(139,92,246,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(139,92,246,0.4)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#f97316_0%,#7c2d12_100%)] shadow-[0_20px_40px_rgba(249,115,22,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(249,115,22,0.4)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#06b6d4_0%,#164e63_100%)] shadow-[0_20px_40px_rgba(6,182,212,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(6,182,212,0.4)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#6366f1_0%,#312e81_100%)] shadow-[0_20px_40px_rgba(99,102,241,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(99,102,241,0.4)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
] as const;

const getEquipmentCardPaletteClass = (index: number) =>
  equipmentCardPaletteClasses[index % equipmentCardPaletteClasses.length];

const summaryCardClassByKey: Record<EquipmentTrackingStatusKey | "total", string> = {
  total:
    "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#6366f1_0%,#4338ca_100%)] shadow-[0_20px_50px_rgba(99,102,241,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(99,102,241,0.5)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] before:[background-size:24px_24px]",
  moving:
    "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#10b981_0%,#065f46_100%)] shadow-[0_20px_50px_rgba(16,185,129,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(16,185,129,0.5)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] before:[background-size:24px_24px]",
  stopped:
    "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#f59e0b_0%,#b45309_100%)] shadow-[0_20px_50px_rgba(245,158,11,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(245,158,11,0.5)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] before:[background-size:24px_24px]",
  idling:
    "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#0ea5e9_0%,#1e40af_100%)] shadow-[0_20px_50px_rgba(14,165,233,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(14,165,233,0.5)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] before:[background-size:24px_24px]",
  unreachable:
    "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#64748b_0%,#334155_100%)] shadow-[0_20px_50px_rgba(100,116,139,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(100,116,139,0.5)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] before:[background-size:24px_24px]",
};

const tripWindowMetaCardClassByKey = {
  wide:
    "relative flex min-h-[80px] flex-col justify-center overflow-hidden rounded-[18px] border border-white/20 bg-[linear-gradient(135deg,#312e81_0%,#1e1b4b_100%)] px-3 py-3 shadow-[0_18px_36px_-12px_rgba(30,27,75,0.5)] sm:min-h-[96px] sm:rounded-[20px] sm:px-4 sm:py-4 before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  sky:
    "relative flex min-h-[80px] flex-col justify-center overflow-hidden rounded-[18px] border border-white/20 bg-[linear-gradient(135deg,#be185d_0%,#831843_100%)] px-3 py-3 shadow-[0_18px_36px_-12px_rgba(190,24,93,0.5)] sm:min-h-[96px] sm:rounded-[20px] sm:px-4 sm:py-4 before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  emerald:
    "relative flex min-h-[80px] flex-col justify-center overflow-hidden rounded-[18px] border border-white/20 bg-[linear-gradient(135deg,#0f766e_0%,#134e4a_100%)] px-3 py-3 shadow-[0_18px_36px_-12px_rgba(15,118,110,0.45)] sm:min-h-[96px] sm:rounded-[20px] sm:px-4 sm:py-4 before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  amber:
    "relative flex min-h-[80px] flex-col justify-center overflow-hidden rounded-[18px] border border-white/20 bg-[linear-gradient(135deg,#c2410c_0%,#7c2d12_100%)] px-3 py-3 shadow-[0_18px_36px_-12px_rgba(194,65,12,0.45)] sm:min-h-[96px] sm:rounded-[20px] sm:px-4 sm:py-4 before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  slate:
    "relative flex min-h-[80px] flex-col justify-center overflow-hidden rounded-[18px] border border-white/20 bg-[linear-gradient(135deg,#334155_0%,#0f172a_100%)] px-3 py-3 shadow-[0_18px_36px_-12px_rgba(15,23,42,0.5)] sm:min-h-[96px] sm:rounded-[20px] sm:px-4 sm:py-4 before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
} as const;

const tripSummaryCardClassByKey = {
  total:
    "relative overflow-hidden rounded-[18px] border border-white/20 bg-[linear-gradient(135deg,#6d28d9_0%,#4c1d95_100%)] px-3 py-3 shadow-[0_18px_36px_-12px_rgba(109,40,217,0.5)] sm:rounded-[24px] sm:p-4 before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  emerald:
    "relative overflow-hidden rounded-[18px] border border-white/20 bg-[linear-gradient(135deg,#047857_0%,#064e3b_100%)] px-3 py-3 shadow-[0_18px_36px_-12px_rgba(4,120,87,0.45)] sm:rounded-[24px] sm:p-4 before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  sky:
    "relative overflow-hidden rounded-[18px] border border-white/20 bg-[linear-gradient(135deg,#0369a1_0%,#0c4a6e_100%)] px-3 py-3 shadow-[0_18px_36px_-12px_rgba(3,105,161,0.45)] sm:rounded-[24px] sm:p-4 before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  violet:
    "relative overflow-hidden rounded-[18px] border border-white/20 bg-[linear-gradient(135deg,#a21caf_0%,#701a75_100%)] px-3 py-3 shadow-[0_18px_36px_-12px_rgba(162,28,175,0.5)] sm:rounded-[24px] sm:p-4 before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  amber:
    "relative overflow-hidden rounded-[18px] border border-white/20 bg-[linear-gradient(135deg,#b45309_0%,#78350f_100%)] px-3 py-3 shadow-[0_18px_36px_-12px_rgba(180,83,9,0.45)] sm:rounded-[24px] sm:p-4 before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  slate:
    "relative overflow-hidden rounded-[18px] border border-white/20 bg-[linear-gradient(135deg,#3f3f46_0%,#18181b_100%)] px-3 py-3 shadow-[0_18px_36px_-12px_rgba(24,24,27,0.5)] sm:rounded-[24px] sm:p-4 before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
} as const;

const tripMobileCardClassByKey: Record<EquipmentTrackingStatusKey, string> = {
  moving:
    "relative overflow-hidden border-white/20 bg-[linear-gradient(135deg,#059669_0%,#065f46_100%)] shadow-lg before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] before:[background-size:20px_20px]",
  stopped:
    "relative overflow-hidden border-white/20 bg-[linear-gradient(135deg,#d97706_0%,#92400e_100%)] shadow-lg before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] before:[background-size:20px_20px]",
  idling:
    "relative overflow-hidden border-white/20 bg-[linear-gradient(135deg,#0284c7_0%,#075985_100%)] shadow-lg before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] before:[background-size:20px_20px]",
  unreachable:
    "relative overflow-hidden border-white/20 bg-[linear-gradient(135deg,#475569_0%,#1e293b_100%)] shadow-lg before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] before:[background-size:20px_20px]",
};


const tripTableRowClassByKey: Record<EquipmentTrackingStatusKey, string> = {
  moving: "bg-emerald-50/75",
  stopped: "bg-amber-50/75",
  idling: "bg-sky-50/75",
  unreachable: "bg-slate-100/90",
};


const RecenterMapView = ({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, map, zoom]);

  return null;
};

const StatusBadge = ({
  statusKey,
  label,
  variant = "solid",
}: {
  statusKey: EquipmentTrackingStatusKey;
  label?: string;
  variant?: "solid" | "glass";
}) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.2em] ${variant === "glass"
      ? "border-white/20 bg-white/10 text-white backdrop-blur-md shadow-sm"
      : statusMeta[statusKey].badgeClassName
      }`}
  >
    {label || statusMeta[statusKey].label}
  </span>
);

const MetricTile = ({
  label,
  value,
  subtitle,
  icon,
  className = "",
  valueClassName = "",
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  tone?: string;
  className?: string;
  valueClassName?: string;
}) => (
  <div
    className={`relative h-full min-h-[64px] overflow-hidden rounded-[14px] border border-white/20 bg-white/10 px-2 py-1.5 backdrop-blur-md sm:min-h-[84px] sm:rounded-xl sm:px-3 ${className}`}
  >
    <div className="flex items-start justify-between gap-2">
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/60 sm:text-[9px] sm:tracking-[0.18em]">
        {label}
      </p>
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 shadow-sm ring-1 ring-white/30 backdrop-blur-md sm:h-7 sm:w-7`}
      >
        {icon}
      </div>
    </div>
    <p
      className={`mt-1.5 text-[13px] font-black leading-tight text-white sm:mt-2 sm:text-base ${valueClassName}`}
    >
      {value}
    </p>
    {subtitle ? (
      <p className="mt-0.5 text-[10px] font-semibold text-white/70 sm:mt-1 sm:text-xs">
        {subtitle}
      </p>
    ) : null}
  </div>
);

const FilterSelect = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (nextValue: string) => void;
  options: Array<{ label: string; value: string }>;
}) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-slate-700 outline-none transition focus:border-slate-300 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);


const EquipmentSelectField = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (nextValue: string) => void;
  options: Array<{ label: string; value: string }>;
}) => (
  <label className="block">
    <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 sm:mb-2 sm:text-[10px] sm:tracking-[0.18em]">
      Equipment GPS
    </span>
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-auto w-full rounded-xl border-slate-200 bg-white px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 shadow-none focus-visible:ring-0 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
        <SelectValue placeholder="Select equipment" />
      </SelectTrigger>
      <SelectContent
        position="popper"
        side="bottom"
        align="start"
        sideOffset={6}
        className="z-[10001] max-h-[min(60vh,22rem)] min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl"
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="whitespace-normal break-words py-2.5 pr-8 text-[13px] font-semibold leading-5 text-slate-700 sm:text-sm"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </label>
);

const DateTimePickerField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [datePart, timePart] = value.split("T");
  const selectedDate = datePart ? parseDateInputValue(datePart) : null;
  const selectedTime = normalizeTimeInputValue(timePart);

  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 sm:mb-2 sm:text-[10px] sm:tracking-[0.18em]">
        {label}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 outline-none transition focus:border-slate-300 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
          >
            <span className="min-w-0 truncate">
              {selectedDate ? (
                formatDateInputPreview(value)
              ) : (
                <span className="text-slate-400">Select date & time</span>
              )}
            </span>
            <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          className="z-[10001] w-[calc(100vw-1.5rem)] max-w-[20rem] rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl"
        >
          <div className="p-3 border-b border-slate-100">
            <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
              Select Time
            </span>
            <input
              type="time"
              step="1"
              value={selectedTime}
              onChange={(e) => {
                const newTime = normalizeTimeInputValue(e.target.value);
                onChange(`${datePart || toDateInputValue(new Date())}T${newTime}`);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-300"
            />
          </div>
          <CalendarComponent
            mode="single"
            selected={selectedDate || undefined}
            onSelect={(nextDate) => {
              const d = nextDate ? toDateInputValue(nextDate) : "";
              if (d) {
                onChange(`${d}T${selectedTime}`);
              } else {
                onChange("");
              }
            }}
            initialFocus
            className="w-full bg-white p-2"
            classNames={{ root: "w-full" }}
          />
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-rose-500 transition hover:bg-rose-50 hover:text-rose-600"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(toDateTimeInputValue(new Date()));
                setOpen(false);
              }}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-sky-600 transition hover:bg-sky-50 hover:text-sky-700"
            >
              Now
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </label>
  );
};

const EquipmentMap = ({
  record,
  locationName,
  zoom,
}: {
  record: EquipmentTrackingRecord | null;
  locationName?: string;
  zoom: number;
}) => {
  if (!record || record.lat === null || record.lng === null) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-slate-50 text-center sm:min-h-[340px] sm:rounded-[28px]">
        <div className="space-y-2.5 px-4 sm:px-6">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm sm:h-14 sm:w-14">
            <MapPinned className="h-5 w-5 text-slate-400 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-sm sm:tracking-[0.2em]">
              Map Unavailable
            </p>
            <p className="mt-1.5 text-xs font-medium leading-5 text-slate-500 sm:mt-2 sm:text-sm">
              GPS coordinates is equipment feed me abhi available nahi hai.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const center: [number, number] = [record.lat, record.lng];
  const mapDisplayLocationName = getMapDisplayLocationName(locationName);
  const coordinateLabel = getMapCoordinateLabel(record);

  return (
    <div className="relative isolate h-[240px] overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm sm:h-[380px] sm:rounded-[28px] lg:h-[460px] xl:h-[520px]">
      <MapContainer
        className="h-full w-full"
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <RecenterMapView center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <CircleMarker
          center={[record.lat, record.lng]}
          radius={12}
          pathOptions={{
            color: "#ffffff",
            fillColor: statusMeta[record.statusKey].markerColor,
            fillOpacity: 0.9,
            weight: 4,
          }}
        >
          <Popup maxWidth={220} minWidth={140}>
            <div className="space-y-1.5 sm:space-y-2">
              <p className="text-[13px] font-black leading-5 text-slate-900 sm:text-sm">
                {getRecordTitle(record)}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 sm:text-xs">
                {getRecordSubtitle(record)}
              </p>
              {locationName ? (
                <p className="text-[11px] font-medium leading-4 text-slate-600 sm:text-xs sm:leading-5">
                  {locationName}
                </p>
              ) : null}
              <p className="text-[10px] font-medium leading-4 text-slate-500 sm:text-[11px]">
                {coordinateLabel}
              </p>
              <StatusBadge
                statusKey={record.statusKey}
                label={record.statusLabel}
                variant="glass"
              />
              <p className="text-[11px] text-slate-600 sm:text-xs">
                Last update: {formatDateTime(record.lastUpdate)}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
};

export default function TransportLiveLocation() {
  const navigate = useNavigate();
  const { equipmentId } = useParams();

  const [records, setRecords] = useState<EquipmentTrackingRecord[]>([]);
  const [apiSummary, setApiSummary] = useState<EquipmentTrackingSummary>({
    total: 0,
    moving: 0,
    stopped: 0,
    idling: 0,
    unreachable: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState("");
  const [locationLookupLoading, setLocationLookupLoading] = useState(false);
  const [selectedEquipmentRouteId, setSelectedEquipmentRouteId] = useState(
    () => equipmentId || ""
  );
  const [fromDateTime, setFromDateTime] = useState(() => buildDefaultFromDate());
  const [toDateTime, setToDateTime] = useState(() => buildDefaultToDate());
  const [appliedFromDateTime, setAppliedFromDateTime] = useState(() =>
    buildDefaultFromDate()
  );
  const [appliedToDateTime, setAppliedToDateTime] = useState(() =>
    buildDefaultToDate()
  );
  const [tripRecords, setTripRecords] = useState<EquipmentTripReportRecord[]>([]);
  const [tripLoading, setTripLoading] = useState(false);
  const [tripLoaded, setTripLoaded] = useState(false);
  const [tripError, setTripError] = useState("");

  const loadTrackingData = async ({
    background = false,
    signal,
  }: {
    background?: boolean;
    signal?: AbortSignal;
  } = {}) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await getEquipmentTrackingReport(signal);
      setRecords(response.records);
      setApiSummary(response.summary);
      setError("");
      setLastSyncedAt(new Date().toISOString());
    } catch (err: any) {
      if (isAbortLikeError(err)) {
        return;
      }

      setError(err?.message || "Live location feed load nahi ho paya.");
    } finally {
      if (background) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadTrackingData({ signal: controller.signal });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadTrackingData({ background: true });
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setSelectedEquipmentRouteId(equipmentId || "");
  }, [equipmentId]);

  const categoryOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        records
          .map((record) => record.equipment.equipmentCategory || record.equipment.equipmentType)
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right));

    return [
      { label: "All Categories", value: "all" },
      ...values.map((value) => ({ label: value, value })),
    ];
  }, [records]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...records]
      .filter((record) => {
        if (statusFilter !== "all" && record.statusKey !== statusFilter) {
          return false;
        }

        if (
          categoryFilter !== "all" &&
          record.equipment.equipmentCategory !== categoryFilter &&
          record.equipment.equipmentType !== categoryFilter
        ) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const lookup = [
          getRecordTitle(record),
          getRecordSubtitle(record),
          record.equipment.doorNumber,
          record.registrationNo,
          record.serial,
          record.deviceId,
          record.voiceNo,
        ]
          .join(" ")
          .toLowerCase();

        return lookup.includes(normalizedSearch);
      })
      .sort((left, right) => {
        const leftTime = left.lastUpdate ? new Date(left.lastUpdate).getTime() : 0;
        const rightTime = right.lastUpdate ? new Date(right.lastUpdate).getTime() : 0;
        return rightTime - leftTime;
      });
  }, [categoryFilter, records, searchTerm, statusFilter]);

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    statusFilter !== "all" ||
    categoryFilter !== "all";

  const filteredSummary = useMemo(
    () => buildEquipmentTrackingSummary(filteredRecords),
    [filteredRecords]
  );

  const displaySummary = hasActiveFilters
    ? filteredSummary
    : apiSummary.total > 0
      ? apiSummary
      : filteredSummary;

  const selectedRecord = useMemo(
    () =>
      equipmentId
        ? records.find((record) => record.routeId === equipmentId) || null
        : null,
    [equipmentId, records]
  );

  const selectedEquipmentOptionRecord = useMemo(
    () =>
      selectedEquipmentRouteId
        ? records.find((record) => record.routeId === selectedEquipmentRouteId) || null
        : null,
    [records, selectedEquipmentRouteId]
  );

  const equipmentOptions = useMemo(
    () =>
      [...records]
        .sort((left, right) =>
          getRecordTitle(left).localeCompare(getRecordTitle(right))
        )
        .map((record) => ({
          label: `${getRecordTitle(record)}${record.deviceId ? ` (${record.deviceId})` : ""
            }`,
          value: record.routeId,
        })),
    [records]
  );

  const latestSignalRecords = useMemo(
    () => filteredRecords.slice(0, 6),
    [filteredRecords]
  );

  const tripSummary = useMemo(
    () => buildEquipmentTripSummary(tripRecords),
    [tripRecords]
  );

  const loadTripReport = async ({
    record,
    fromValue = fromDateTime,
    toValue = toDateTime,
    signal,
  }: {
    record: EquipmentTrackingRecord;
    fromValue?: string;
    toValue?: string;
    signal?: AbortSignal;
  }) => {
    const [dateFrom, rawTimeFrom] = String(fromValue || "").split("T");
    const [dateTo, rawTimeTo] = String(toValue || "").split("T");
    const timeFrom = normalizeTimeInputValue(rawTimeFrom);
    const timeTo = normalizeTimeInputValue(rawTimeTo);
    const rangeStartDate = parseLocalDateTimeValue(`${dateFrom}T${timeFrom}`);
    const rangeEndDate = parseLocalDateTimeValue(`${dateTo}T${timeTo}`);

    if (!record.deviceId) {
      setTripRecords([]);
      setTripError("Selected equipment ka GPS ID available nahi hai.");
      setTripLoaded(true);
      return;
    }

    if (!dateFrom || !dateTo) {
      setTripRecords([]);
      setTripError("From aur To date select karo.");
      setTripLoaded(true);
      return;
    }

    if (
      !rangeStartDate ||
      !rangeEndDate ||
      Number.isNaN(rangeStartDate.getTime()) ||
      Number.isNaN(rangeEndDate.getTime())
    ) {
      setTripRecords([]);
      setTripError("Valid date aur time select karo.");
      setTripLoaded(true);
      return;
    }

    if (rangeStartDate.getTime() > rangeEndDate.getTime()) {
      setTripRecords([]);
      setTripError("From datetime, To datetime se bada nahi ho sakta.");
      setTripLoaded(true);
      return;
    }

    setTripLoading(true);
    setTripLoaded(false);
    setAppliedFromDateTime(fromValue);
    setAppliedToDateTime(toValue);

    try {
      const response = await getEquipmentTripReport(
        {
          deviceId: record.deviceId,
          dateFrom,
          dateTo,
          timePickerFrom: timeFrom || TRIP_REPORT_START_TIME,
          timePickerTo: timeTo || TRIP_REPORT_END_TIME,
        },
        signal
      );

      const filterStart = rangeStartDate.getTime();
      const filterEnd = rangeEndDate.getTime();

      const finalRecords = (response.records || []).filter((r) => {
        const segmentStart =
          parseTripReportDateTime(r.startDate) ??
          parseTripReportDateTime(r.movingStartDate);
        const segmentEnd =
          parseTripReportDateTime(r.endDate) ??
          parseTripReportDateTime(r.movingEndDate) ??
          segmentStart;

        if (segmentStart === null && segmentEnd === null) {
          return true;
        }

        const safeSegmentStart = segmentStart ?? segmentEnd ?? filterStart;
        const safeSegmentEnd = segmentEnd ?? segmentStart ?? filterEnd;

        // Keep only rows that overlap the selected datetime window.
        return safeSegmentEnd >= filterStart && safeSegmentStart <= filterEnd;
      });

      setTripRecords(finalRecords);
      setTripError("");
    } catch (err: any) {
      if (isAbortLikeError(err)) {
        return;
      }

      setTripRecords([]);
      setTripError(err?.message || "Trip report load nahi ho paya.");
    } finally {
      if (!signal?.aborted) {
        setTripLoading(false);
        setTripLoaded(true);
      }
    }
  };

  const handleFetchSelectedEquipmentDetails = () => {
    if (!selectedEquipmentOptionRecord) {
      setTripRecords([]);
      setTripError("Equipment GPS select karo.");
      setTripLoaded(true);
      return;
    }

    if (equipmentId !== selectedEquipmentOptionRecord.routeId) {
      navigate(
        `/transport/live-location/${encodeURIComponent(
          selectedEquipmentOptionRecord.routeId
        )}`
      );
      return;
    }

    void loadTripReport({
      record: selectedEquipmentOptionRecord,
      fromValue: fromDateTime,
      toValue: toDateTime,
    });
  };

  const handleResetTripFilters = () => {
    const nextFromValue = buildDefaultFromDate();
    const nextToValue = buildDefaultToDate();

    setFromDateTime(nextFromValue);
    setToDateTime(nextToValue);
    setTripError("");
    setAppliedFromDateTime(nextFromValue);
    setAppliedToDateTime(nextToValue);
    setTripRecords([]);
    setTripLoading(false);
    setTripLoaded(false);

    if (!equipmentId) {
      setSelectedEquipmentRouteId("");
      return;
    }
  };

  useEffect(() => {
    const inlineLocationName = getInlineLocationName(selectedRecord);

    if (inlineLocationName) {
      setSelectedLocationName(inlineLocationName);
      setLocationLookupLoading(false);
      return;
    }

    if (!selectedRecord || selectedRecord.lat === null || selectedRecord.lng === null) {
      setSelectedLocationName("");
      setLocationLookupLoading(false);
      return;
    }

    const controller = new AbortController();

    const resolveLocationName = async () => {
      setLocationLookupLoading(true);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${selectedRecord.lat}&lon=${selectedRecord.lng}&zoom=18&addressdetails=1&accept-language=en`,
          {
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Reverse geocoding failed");
        }

        const payload = await response.json();

        if (controller.signal.aborted) {
          return;
        }

        setSelectedLocationName(buildReverseGeocodeLocationName(payload));
      } catch (err: any) {
        if (isAbortLikeError(err)) {
          return;
        }

        setSelectedLocationName("");
      } finally {
        if (!controller.signal.aborted) {
          setLocationLookupLoading(false);
        }
      }
    };

    resolveLocationName();

    return () => controller.abort();
  }, [selectedRecord?.routeId, selectedRecord?.lat, selectedRecord?.lng]);

  useEffect(() => {
    if (!selectedRecord) {
      setTripRecords([]);
      setTripError("");
      setTripLoading(false);
      setTripLoaded(false);
      return;
    }

    const freshFrom = buildDefaultFromDate();
    const freshTo = buildDefaultToDate();

    setFromDateTime(freshFrom);
    setToDateTime(freshTo);

    const controller = new AbortController();
    void loadTripReport({
      record: selectedRecord,
      fromValue: freshFrom,
      toValue: freshTo,
      signal: controller.signal,
    });

    return () => controller.abort();
  }, [selectedRecord?.routeId]);

  const selectedLocationLabel =
    selectedLocationName ||
    (locationLookupLoading
      ? "Resolving location name..."
      : selectedRecord && hasCoordinates(selectedRecord)
        ? "Location name unavailable"
        : "Coordinates unavailable");
  const hasAppliedTripDateRange = Boolean(
    appliedFromDateTime && appliedToDateTime
  );

  if (loading && !records.length) {
    return (
      <div className="space-y-2 py-0 sm:space-y-6 sm:py-2">
        <div className={`rounded-[24px] p-5 sm:rounded-[32px] sm:p-8 ${pageCardClass}`}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 sm:h-14 sm:w-14">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-500" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                Transport Live Location
              </p>
              <h1 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
                Equipment tracking feed load ho raha hai
              </h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && !records.length) {
    return (
      <div className="space-y-2 py-0 sm:space-y-6 sm:py-2">
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100/90 px-5 py-12 text-center shadow-sm sm:rounded-[32px] sm:px-6 sm:py-16">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 sm:h-16 sm:w-16">
            <AlertCircle className="h-7 w-7 text-slate-500" />
          </div>
          <h1 className="mt-6 text-xl font-black text-slate-900 sm:text-2xl">
            Live location data available nahi hai
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500">
            {error || "Equipment tracking API ne abhi koi record return nahi kiya."}
          </p>
          <button
            onClick={() => loadTrackingData()}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Feed
          </button>
        </div>
      </div>
    );
  }

  if (equipmentId && !selectedRecord) {
    return (
      <div className="space-y-2 py-0 sm:space-y-6 sm:py-2">
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100/90 px-5 py-12 text-center shadow-sm sm:rounded-[32px] sm:px-6 sm:py-16">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 sm:h-16 sm:w-16">
            <Truck className="h-7 w-7 text-slate-500" />
          </div>
          <h1 className="mt-6 text-xl font-black text-slate-900 sm:text-2xl">
            Requested equipment feed me nahi mila
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500">
            Equipment shayad inactive hai ya route ID change ho gaya hai.
          </p>
          <button
            onClick={() => navigate("/transport/live-location")}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back To Fleet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 py-0 sm:space-y-6 sm:py-2">
      <section className="space-y-2.5 px-0 py-0 sm:overflow-hidden sm:rounded-[32px] sm:border sm:border-slate-200 sm:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_36%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] sm:p-6 sm:shadow-sm">
        <div className="flex flex-col gap-2.5 sm:gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            {equipmentId ? (
              <button
                onClick={() => navigate("/transport/live-location")}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 shadow-sm transition hover:bg-slate-50 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.18em]"
              >
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Back To Fleet
              </button>
            ) : null}



            <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              {selectedRecord ? (
                <StatusBadge
                  statusKey={selectedRecord.statusKey}
                  label={selectedRecord.statusLabel}
                />
              ) : (
                statusSummaryOrder.map((key) => (
                  <StatusBadge key={key} statusKey={key} />
                ))
              )}

              <span className="col-span-full inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500 shadow-sm sm:col-auto sm:justify-start sm:gap-2 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.16em]">
                <Clock3 className="h-3.5 w-3.5 text-slate-400 sm:h-4 sm:w-4" />
                {lastSyncedAt ? formatRelativeTime(lastSyncedAt) : "Waiting for sync"}
              </span>
            </div>
          </div>

        </div>

        <div className="mt-1 grid gap-1.5 p-0 sm:mt-6 sm:rounded-[28px] sm:border sm:border-slate-200 sm:bg-white/90 sm:gap-3 sm:p-5 sm:shadow-sm xl:grid-cols-[minmax(0,1.55fr)_220px_220px_auto_auto] xl:items-end">
          <EquipmentSelectField
            value={selectedEquipmentRouteId}
            onChange={(nextValue) => {
              setSelectedEquipmentRouteId(nextValue);
              setTripError("");
            }}
            options={equipmentOptions}
          />

          <DateTimePickerField
            label="From"
            value={fromDateTime}
            onChange={(nextValue) => {
              setFromDateTime(nextValue);
              setTripError("");
            }}
          />

          <DateTimePickerField
            label="To"
            value={toDateTime}
            onChange={(nextValue) => {
              setToDateTime(nextValue);
              setTripError("");
            }}
          />

          <button
            onClick={handleFetchSelectedEquipmentDetails}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm sm:tracking-[0.18em]"
            disabled={!selectedEquipmentRouteId}
          >
            <Search className="h-4 w-4" />
            Get Details
          </button>

          <button
            onClick={handleResetTripFilters}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-black uppercase tracking-[0.16em] text-slate-700 transition hover:bg-slate-50 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm sm:tracking-[0.18em]"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
        </div>


        {error ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            {error}
          </div>
        ) : null}

        {tripError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {tripError}
          </div>
        ) : null}
      </section>

      {!equipmentId ? (
        <>
          <section className="grid grid-cols-3 gap-1.5 sm:grid-cols-3 sm:gap-4 md:gap-6 lg:grid-cols-5">
            <div className={`h-full min-h-[96px] rounded-[14px] p-2 sm:min-h-[170px] sm:rounded-[24px] sm:p-5 ${summaryCardClassByKey.total}`}>
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between gap-1.5">
                  <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.12em] text-white shadow-sm backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[10px] sm:tracking-[0.18em]">
                    All
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 shadow-sm ring-1 ring-white/30 backdrop-blur-md sm:h-8 sm:w-8">
                    <span className="h-1.5 w-1.5 rounded-full bg-white sm:h-2.5 sm:w-2.5" />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-black leading-none text-white sm:mt-4 sm:text-3xl">
                  {formatNumber(filteredRecords.length)}
                </p>
                <span className="mt-2 inline-flex self-start rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-bold text-white/90 shadow-sm backdrop-blur-md sm:mt-4 sm:px-3 sm:py-1 sm:text-[11px]">
                  Visible Fleet
                </span>
              </div>
            </div>

            {statusSummaryOrder.map((key) => (
              <div
                key={key}
                className={`h-full min-h-[96px] rounded-[14px] p-2 sm:min-h-[170px] sm:rounded-[24px] sm:p-5 ${summaryCardClassByKey[key]}`}
              >
                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.12em] text-white shadow-sm backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[10px] sm:tracking-[0.18em]">
                      {statusMeta[key].label}
                    </span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 shadow-sm ring-1 ring-white/30 backdrop-blur-md sm:h-8 sm:w-8">
                      <span className="h-1.5 w-1.5 rounded-full bg-white sm:h-2.5 sm:w-2.5" />
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-black leading-none text-white sm:mt-4 sm:text-3xl">
                    {formatNumber(displaySummary[key])}
                  </p>
                  <span className="mt-2 inline-flex self-start rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-bold text-white/90 shadow-sm backdrop-blur-md sm:mt-4 sm:px-3 sm:py-1 sm:text-[11px]">
                    Live Snapshot
                  </span>
                </div>
              </div>
            ))}
          </section>


          {filteredRecords.length === 0 ? (
            <section className="rounded-[24px] border border-dashed border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100/90 px-5 py-12 text-center shadow-sm sm:rounded-[32px] sm:px-6 sm:py-16">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 sm:h-16 sm:w-16">
                <Search className="h-6 w-6 text-slate-500" />
              </div>
              <h2 className="mt-6 text-xl font-black text-slate-900 sm:text-2xl">
                No equipment matched the current filters
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500">
                Search text ya selected filters ko reset karke full fleet dubara dekh sakte ho.
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-slate-800"
              >
                Reset Filters
              </button>
            </section>
          ) : (
            <>
              <section className={`space-y-2 rounded-[22px] p-2 sm:space-y-4 sm:rounded-[32px] sm:p-5 ${pageCardClass}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Latest Signal
                    </p>
                    <h2 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
                      Recent equipment heartbeats
                    </h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      Kisi bhi equipment card ko open karke uska single-location map dekho.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Auto refresh 60 sec
                  </span>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {latestSignalRecords.map((record, index) => (
                    <Link
                      key={record.routeId}
                      to={`/transport/live-location/${encodeURIComponent(record.routeId)}`}
                      className={`flex flex-col gap-3 rounded-[22px] px-4 py-4 transition hover:-translate-y-1 sm:flex-row sm:items-start sm:justify-between sm:rounded-[24px] ${getEquipmentCardPaletteClass(index)}`}
                    >
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-white">
                          {getRecordTitle(record)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-white/80">
                          {getRecordSubtitle(record)}
                        </p>
                        <p className="mt-2 text-xs font-medium text-white/60">
                          {formatRelativeTime(record.lastUpdate)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:block sm:shrink-0 sm:text-right">
                        <StatusBadge
                          statusKey={record.statusKey}
                          label={record.statusLabel}
                          variant="glass"
                        />
                        <p className="text-xs font-black text-white sm:mt-3">
                          {formatSpeed(record.speed)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>

              </section>

              <section className="space-y-3 sm:space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Equipment Grid
                    </p>
                    <h2 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
                      Open individual tracking pages
                    </h2>
                  </div>
                  <p className="text-sm font-semibold text-slate-500">
                    {formatNumber(filteredRecords.length)} cards visible
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredRecords.map((record, index) => (
                    <Link
                      key={record.routeId}
                      to={`/transport/live-location/${encodeURIComponent(record.routeId)}`}
                      className={`group flex h-full flex-col rounded-[16px] p-2 ${getEquipmentCardPaletteClass(index)} sm:rounded-[28px] sm:p-5`}
                    >
                      <div className="flex min-h-[68px] flex-col gap-1 sm:min-h-[88px] sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-[0.95rem] font-black leading-tight text-white sm:text-xl">
                            {getRecordTitle(record)}
                          </p>
                          <p className="mt-0.5 text-[10px] font-semibold text-white/80 sm:mt-1 sm:text-sm">
                            {getRecordSubtitle(record)}
                          </p>
                        </div>
                        <div className="flex sm:block">
                          <StatusBadge
                            statusKey={record.statusKey}
                            label={record.statusLabel}
                            variant="glass"
                          />
                        </div>
                      </div>

                      <div className="mt-2 grid flex-1 grid-cols-2 content-start gap-1.5 sm:mt-5 sm:gap-3">
                        <MetricTile
                          label="Speed"
                          value={formatSpeed(record.speed)}
                          tone="amber"
                          icon={<Gauge className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />}
                          valueClassName="text-[15px] sm:text-base"
                        />
                        <MetricTile
                          label="Ignition"
                          value={record.ignitionOn ? "ON" : "OFF"}
                          tone="emerald"
                          icon={
                            record.ignitionOn ? (
                              <Wifi className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />
                            ) : (
                              <WifiOff className="h-3.5 w-3.5 text-white/50 sm:h-4 sm:w-4" />
                            )
                          }
                          valueClassName="text-[15px] sm:text-base"
                        />
                        <MetricTile
                          label="Coordinates"
                          value={formatCoordinates(record)}
                          tone="sky"
                          icon={<MapPinned className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />}
                          className="col-span-2"
                          valueClassName="text-[13px] sm:text-[14px]"
                        />
                      </div>

                      <div className="mt-2.5 flex flex-col gap-1.5 border-t border-white/20 pt-2.5 sm:mt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pt-4">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/60 sm:text-[10px] sm:tracking-[0.18em]">
                            Last Update
                          </p>
                          <p className="mt-1 text-[13px] font-semibold text-white sm:text-sm">
                            {formatRelativeTime(record.lastUpdate)}
                          </p>
                        </div>
                        <span className="self-start text-[13px] font-black uppercase tracking-[0.1em] text-white group-hover:underline sm:self-auto sm:text-sm">
                          Open Tracking
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}
        </>
      ) : selectedRecord ? (
        <>
          <section className="space-y-2 sm:space-y-4">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Trip Report Window
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-900 sm:mt-2 sm:text-2xl">
                  {hasAppliedTripDateRange
                    ? `${formatDateInputPreview(appliedFromDateTime)} to ${formatDateInputPreview(appliedToDateTime)}`
                    : "Select a date range"}
                </h2>
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm sm:px-3 sm:text-[10px] sm:tracking-[0.18em]">
                {tripLoading
                  ? "Loading trip report"
                  : tripRecords.length
                    ? `${formatNumber(tripRecords.length)} segments`
                    : tripLoaded
                      ? "No segments found"
                      : "Waiting for fetch"}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-x-2 gap-y-2 sm:gap-3 xl:grid-cols-[2.2fr_1.05fr_1.05fr_1fr_0.95fr]">
              <div className={`col-span-2 xl:col-span-1 ${tripWindowMetaCardClassByKey.wide}`}>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/75 sm:text-[10px] sm:tracking-[0.18em]">
                  Equipment Name
                </p>
                <p className="mt-1 text-[15px] font-black leading-tight text-white sm:mt-2 sm:text-xl">
                  {getRecordTitle(selectedRecord)}
                </p>
              </div>
              <div className={tripWindowMetaCardClassByKey.sky}>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/75 sm:text-[10px] sm:tracking-[0.18em]">
                  Type
                </p>
                <p className="mt-1 text-[15px] font-black leading-tight text-white sm:mt-2 sm:text-lg">
                  {selectedRecord.equipment.equipmentType || "--"}
                </p>
              </div>
              <div className={tripWindowMetaCardClassByKey.amber}>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/75 sm:text-[10px] sm:tracking-[0.18em]">
                  Door No
                </p>
                <p className="mt-1 text-[15px] font-black leading-tight text-white sm:mt-2 sm:text-lg">
                  {selectedRecord.equipment.doorNumber ||
                    selectedRecord.registrationNo ||
                    "--"}
                </p>
              </div>
              <div className={tripWindowMetaCardClassByKey.emerald}>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/75 sm:text-[10px] sm:tracking-[0.18em]">
                  Category
                </p>
                <p className="mt-1 text-[15px] font-black leading-tight text-white sm:mt-2 sm:text-lg">
                  {selectedRecord.equipment.equipmentCategory || "--"}
                </p>
              </div>
              <div className={tripWindowMetaCardClassByKey.slate}>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/75 sm:text-[10px] sm:tracking-[0.18em]">
                  GPS ID
                </p>
                <p className="mt-1 text-[15px] font-black leading-tight text-white sm:mt-2 sm:text-lg">
                  {selectedRecord.deviceId ||
                    selectedRecord.equipment.gpsEquipmentId ||
                    "--"}
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-x-2 gap-y-2 sm:gap-3 xl:grid-cols-6">
            <div className={tripSummaryCardClassByKey.total}>
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/75 sm:text-[10px] sm:tracking-[0.2em]">
                Total Distance
              </p>
              <p className="mt-1 text-[14px] font-black leading-tight text-white sm:mt-3 sm:text-3xl">
                {formatTripDistance(tripSummary.totalDistance)}
              </p>
            </div>

            <div className={tripSummaryCardClassByKey.emerald}>
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/75 sm:text-[10px] sm:tracking-[0.2em]">
                Average Speed
              </p>
              <p className="mt-1 text-[14px] font-black leading-tight text-white sm:mt-3 sm:text-3xl">
                {formatTripAverageSpeed(tripSummary.averageSpeed)}
              </p>
            </div>

            <div className={tripSummaryCardClassByKey.violet}>
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/75 sm:text-[10px] sm:tracking-[0.2em]">
                Working Hours
              </p>
              <p className="mt-1 text-[14px] font-black leading-tight text-white sm:mt-3 sm:text-3xl">
                {formatDurationHms(tripSummary.totalDurationSeconds)}
              </p>
            </div>

            <div className={tripSummaryCardClassByKey.amber}>
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/75 sm:text-[10px] sm:tracking-[0.2em]">
                Moving Count
              </p>
              <p className="mt-1 text-[14px] font-black leading-tight text-white sm:mt-3 sm:text-3xl">
                {formatNumber(tripSummary.movingCount)}
              </p>
            </div>

            <div className={tripSummaryCardClassByKey.sky}>
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/75 sm:text-[10px] sm:tracking-[0.2em]">
                Start Time
              </p>
              <p className="mt-1 break-words text-[10px] font-black leading-4 text-white sm:mt-3 sm:text-xl sm:leading-tight">
                {formatDateTime(tripSummary.startTime)}
              </p>
            </div>

            <div className={tripSummaryCardClassByKey.slate}>
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/75 sm:text-[10px] sm:tracking-[0.2em]">
                End Time
              </p>
              <p className="mt-1 break-words text-[10px] font-black leading-4 text-white sm:mt-3 sm:text-xl sm:leading-tight">
                {formatDateTime(tripSummary.endTime)}
              </p>
            </div>
          </section>

          <section className="space-y-2 p-0 sm:space-y-4 sm:rounded-[32px] sm:border sm:border-slate-200 sm:bg-gradient-to-br sm:from-white sm:via-slate-50 sm:to-sky-50/40 sm:p-5 sm:shadow-sm">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Trip Segments
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-900 sm:mt-2 sm:text-2xl">
                  Date range movement breakdown
                </h2>
              </div>
              <p className="text-xs font-semibold text-slate-500 sm:text-sm">
                {tripLoading
                  ? "Fetching trip report..."
                  : tripRecords.length
                    ? `${formatNumber(tripRecords.length)} timeline rows`
                    : tripLoaded
                      ? "Selected range me data nahi mila"
                      : "Preparing request"}
              </p>
            </div>

            {tripLoading ? (
              <div className="flex min-h-[120px] items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-white/80 px-4 py-7 text-center sm:min-h-[160px] sm:rounded-[24px] sm:px-6 sm:py-10">
                <div className="space-y-3">
                  <RefreshCw className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  <p className="text-sm font-semibold text-slate-500">
                    Trip report load ho raha hai.
                  </p>
                </div>
              </div>
            ) : tripRecords.length ? (
              <>
                <div className="grid gap-1.5 md:hidden">
                  {tripRecords.map((tripRecord, index) => {
                    const tripStatusKey = resolveTripStatusKey(tripRecord);

                    return (
                      <div
                        key={`${tripRecord.tripId}-${tripRecord.gpsDataId}`}
                        className={`rounded-[16px] border px-3 py-3 shadow-sm ${tripMobileCardClassByKey[tripStatusKey]}`}
                      >
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/60">
                              Voyage no
                            </p>
                            <p className="mt-0.5 text-[11px] font-black leading-4 text-white">
                              {index + 1}
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/60">
                              Vehicle
                            </p>
                            <p className="mt-0.5 text-[11px] font-semibold leading-4 text-white">
                              {getRecordTitle(selectedRecord)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/60">
                              Start Time
                            </p>
                            <p className="mt-0.5 text-[11px] font-semibold leading-4 text-white">
                              {formatTripTableDateTime(tripRecord.startDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/60">
                              End Time
                            </p>
                            <p className="mt-0.5 text-[11px] font-semibold leading-4 text-white">
                              {formatTripTableDateTime(tripRecord.endDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/60">
                              Time Covered
                            </p>
                            <p className="mt-0.5 text-[11px] font-semibold leading-4 text-white">
                              {formatTripTableDuration(tripRecord.diffSeconds)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/60">
                              Distance
                            </p>
                            <p className="mt-0.5 text-[11px] font-semibold leading-4 text-white">
                              {formatTripTableDistance(tripRecord.distance)}
                            </p>
                          </div>
                          <div className="col-span-2 border-t border-white/20 pt-2">
                            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/60">
                              Start Location
                            </p>
                            <p className="mt-0.5 text-[11px] font-semibold leading-4 text-white">
                              {formatTripLocation(tripRecord.startLocation)}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/60">
                              End Location
                            </p>
                            <p className="mt-0.5 text-[11px] font-semibold leading-4 text-white">
                              {formatTripLocation(tripRecord.endLocation)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                </div>

                <div className="hidden overflow-x-auto rounded-[24px] border border-slate-200 bg-white md:block">
                  <table className="min-w-[1280px] w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Voyage no
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Vehicle
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Start Time
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          End Time
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Start Location
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          End Location
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Time Covered
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Distance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tripRecords.map((tripRecord, index) => (
                        <tr
                          key={`${tripRecord.tripId}-${tripRecord.gpsDataId}`}
                          className="bg-white"
                        >
                          <td className="px-4 py-3 align-top text-sm font-semibold text-slate-700">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 align-top text-sm font-semibold text-slate-700">
                            {getRecordTitle(selectedRecord)}
                          </td>
                          <td className="px-4 py-3 align-top text-sm font-semibold text-slate-700">
                            {formatTripTableDateTime(tripRecord.startDate)}
                          </td>
                          <td className="px-4 py-3 align-top text-sm font-semibold text-slate-700">
                            {formatTripTableDateTime(tripRecord.endDate)}
                          </td>
                          <td className="px-4 py-3 align-top text-sm font-semibold leading-6 text-slate-700">
                            <div className="max-w-[260px] whitespace-normal">
                              {formatTripLocation(tripRecord.startLocation)}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-sm font-semibold leading-6 text-slate-700">
                            <div className="max-w-[260px] whitespace-normal">
                              {formatTripLocation(tripRecord.endLocation)}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-sm font-semibold text-slate-700">
                            {formatTripTableDuration(tripRecord.diffSeconds)}
                          </td>
                          <td className="px-4 py-3 align-top text-sm font-semibold text-slate-700">
                            {formatTripTableDistance(tripRecord.distance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/80 px-6 py-10 text-center">
                <p className="text-lg font-black text-slate-900">
                  Selected date range me trip data nahi mila
                </p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Equipment aur From/To change karke dubara Get Details karo.
                </p>
              </div>
            )}
          </section>

          <section className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_420px] xl:gap-6">
            <div className={`min-w-0 space-y-3 rounded-[20px] p-3 sm:space-y-4 sm:rounded-[32px] sm:p-5 ${pageCardClass}`}>
              <div className="relative z-10 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-[10px] sm:tracking-[0.22em]">
                    Location Map
                  </p>
                  <h2 className="mt-1.5 text-lg font-black text-slate-900 sm:mt-2 sm:text-2xl">
                    Selected equipment position
                  </h2>
                </div>
                <a
                  href={
                    hasCoordinates(selectedRecord)
                      ? `https://www.google.com/maps?q=${selectedRecord.lat},${selectedRecord.lng}`
                      : undefined
                  }
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-black uppercase tracking-[0.14em] sm:w-auto sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm sm:tracking-[0.18em] ${hasCoordinates(selectedRecord)
                    ? "bg-slate-900 text-white transition hover:bg-slate-800"
                    : "cursor-not-allowed bg-slate-100 text-slate-400"
                    }`}
                  onClick={(event) => {
                    if (!hasCoordinates(selectedRecord)) {
                      event.preventDefault();
                    }
                  }}
                >
                  <MapPinned className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Open Map
                </a>
              </div>

              <div className={`rounded-[18px] px-3 py-2.5 sm:rounded-[24px] sm:px-5 sm:py-3 ${insetCardClass}`}>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
                  Resolved Location
                </p>
                <p className="mt-1.5 text-[13px] font-semibold leading-5 text-slate-700 sm:mt-2 sm:text-base sm:leading-6">
                  {selectedLocationLabel}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500 sm:text-xs">
                  {formatCoordinates(selectedRecord)}
                </p>
              </div>

              <EquipmentMap
                record={selectedRecord}
                locationName={selectedLocationLabel}
                zoom={15}
              />
            </div>

            <div className="min-w-0 space-y-2 sm:space-y-3">
              <div className="space-y-2.5 rounded-[18px] border border-white/20 bg-[linear-gradient(135deg,#312e81_0%,#1e1b4b_100%)] p-2.5 shadow-xl sm:space-y-3 sm:rounded-[24px] sm:p-4 before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] before:[background-size:24px_24px] relative overflow-hidden">
                <div className="relative z-10 flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 shadow-sm ring-1 ring-white/30 backdrop-blur-md sm:h-10 sm:w-10 sm:rounded-xl">
                    <Truck className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/60 sm:text-[9px] sm:tracking-[0.18em]">
                      Equipment Snapshot
                    </p>
                    <p className="mt-0.5 text-[15px] font-black text-white sm:text-[17px]">
                      {selectedRecord.equipment.doorNumber || selectedRecord.registrationNo || "Door number unavailable"}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-2 grid gap-2 sm:mt-3.5 sm:grid-cols-2 sm:gap-2">
                  <MetricTile
                    label="Serial"
                    value={selectedRecord.serial || "--"}
                    tone="slate"
                    icon={<Activity className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />}
                  />
                  <MetricTile
                    label="Device ID"
                    value={selectedRecord.deviceId || "--"}
                    tone="slate"
                    icon={<Wifi className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />}
                  />
                  <MetricTile
                    label="Last Heartbeat"
                    value={formatDateTime(selectedRecord.lastUpdate)}
                    subtitle={formatRelativeTime(selectedRecord.lastUpdate)}
                    tone="slate"
                    icon={<Clock3 className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />}
                    className="sm:col-span-2"
                  />
                </div>
              </div>

              <div className="space-y-2.5 rounded-[18px] border border-white/20 bg-[linear-gradient(135deg,#047857_0%,#064e3b_100%)] p-2.5 shadow-xl sm:space-y-3 sm:rounded-[24px] sm:p-4 before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] before:[background-size:24px_24px] relative overflow-hidden">
                <p className="relative z-10 text-[8px] font-black uppercase tracking-[0.18em] text-white/60 sm:text-[9px] sm:tracking-[0.22em]">
                  Telemetry
                </p>
                <div className="relative z-10 mt-2 grid gap-2 sm:mt-3 sm:grid-cols-2 sm:gap-2">
                  <MetricTile
                    label="Speed"
                    value={formatSpeed(selectedRecord.speed)}
                    tone="amber"
                    icon={<Gauge className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />}
                  />
                  <MetricTile
                    label="Ignition"
                    value={selectedRecord.ignitionOn ? "ON" : "OFF"}
                    tone="emerald"
                    icon={selectedRecord.ignitionOn ? <Wifi className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" /> : <WifiOff className="h-3.5 w-3.5 text-white/50 sm:h-4 sm:w-4" />}
                  />
                  <MetricTile
                    label="Fuel Level"
                    value={formatFuelLevel(selectedRecord.fuelLevel)}
                    tone="amber"
                    icon={<Fuel className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />}
                  />
                  <MetricTile
                    label="Heading"
                    value={formatHeading(selectedRecord.direction)}
                    tone="sky"
                    icon={<Navigation className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />}
                  />
                  <MetricTile
                    label="Parking"
                    value={formatParkingDuration(selectedRecord.parkingSeconds)}
                    tone="slate"
                    icon={<Activity className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />}
                    className="sm:col-span-2"
                  />
                </div>
              </div>

              <div className="space-y-2.5 rounded-[18px] border border-white/20 bg-[linear-gradient(135deg,#c2410c_0%,#7c2d12_100%)] p-2.5 shadow-xl sm:space-y-3 sm:rounded-[24px] sm:p-4 before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] before:[background-size:24px_24px] relative overflow-hidden">
                <p className="relative z-10 text-[8px] font-black uppercase tracking-[0.18em] text-white/60 sm:text-[9px] sm:tracking-[0.22em]">
                  Coordinates
                </p>
                <p className="relative z-10 mt-1 text-[15px] font-black text-white sm:mt-2 sm:text-[17px]">
                  {formatCoordinates(selectedRecord)}
                </p>
                <p className="relative z-10 mt-2.5 text-[8px] font-black uppercase tracking-[0.16em] text-white/60 sm:mt-3 sm:text-[9px] sm:tracking-[0.18em]">
                  Resolved Location
                </p>
                <p className="relative z-10 mt-1.5 text-[13px] font-semibold leading-5 text-white sm:mt-2 sm:text-sm sm:leading-6">
                  {selectedLocationLabel}
                </p>
                <p className="relative z-10 mt-1.5 text-[12px] font-medium text-white/80 sm:mt-2 sm:text-sm">
                  Distance today: {selectedRecord.distance.toFixed(1)} km
                </p>
              </div>
            </div>
          </section>


        </>
      ) : null}
    </div>
  );
}
