import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Clock3,
  Gauge,
  Navigation,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
} from "lucide-react";
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
const TRIP_REPORT_START_TIME = "00:00:00";
const TRIP_REPORT_END_TIME = "23:59:59";

const numberFormatter = new Intl.NumberFormat("en-IN");
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
});
const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

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
    badgeClassName: "border-white/20 bg-white/10 text-white backdrop-blur-md shadow-sm",
    markerColor: "#059669",
    summaryTone: "from-emerald-500 to-teal-500",
  },
  stopped: {
    label: "Stopped",
    badgeClassName: "border-white/20 bg-white/10 text-white backdrop-blur-md shadow-sm",
    markerColor: "#d97706",
    summaryTone: "from-amber-500 to-orange-500",
  },
  idling: {
    label: "Idling",
    badgeClassName: "border-white/20 bg-white/10 text-white backdrop-blur-md shadow-sm",
    markerColor: "#0284c7",
    summaryTone: "from-sky-500 to-blue-500",
  },
  unreachable: {
    label: "Offline",
    badgeClassName: "border-white/20 bg-white/10 text-white backdrop-blur-md shadow-sm",
    markerColor: "#475569",
    summaryTone: "from-slate-500 to-slate-700",
  },
};


const formatNumber = (value: number) => numberFormatter.format(Number(value || 0));

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

const formatSpeed = (speed: number) => `${speed.toFixed(0)} km/h`;

const formatHeading = (value: number | null) =>
  value === null ? "--" : `${value.toFixed(0)} deg`;

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

const formatTripLocation = (value: string) =>
  normalizeLocationValue(value) || "Location unavailable";

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
  "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#a855f7_0%,#581c87_100%)] shadow-[0_20px_40px_rgba(168,85,247,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(168,85,247,0.4)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#14b8a6_0%,#134e4a_100%)] shadow-[0_20px_40px_rgba(20,184,166,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(20,184,166,0.4)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
  "relative overflow-hidden border border-white/20 bg-[linear-gradient(135deg,#334155_0%,#0f172a_100%)] shadow-[0_20px_40px_rgba(51,65,85,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(51,65,85,0.4)] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]",
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



const summaryCardGlowClassByKey: Record<
  EquipmentTrackingStatusKey | "total",
  string
> = {
  total:
    "bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.16),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_42%)]",
  moving:
    "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.12),transparent_42%)]",
  stopped:
    "bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.12),transparent_42%)]",
  idling:
    "bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_42%)]",
  unreachable:
    "bg-[radial-gradient(circle_at_top_right,rgba(100,116,139,0.14),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(148,163,184,0.1),transparent_42%)]",
};

type MetricTone = "amber" | "emerald" | "sky" | "slate";





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



const StatusBadge = ({
  statusKey,
  label,
}: {
  statusKey: EquipmentTrackingStatusKey;
  label?: string;
}) => (
  <span
    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.2em] ${statusMeta[statusKey].badgeClassName}`}
  >
    {label || statusMeta[statusKey].label}
  </span>
);

const OverviewStatCard = ({
  toneKey,
  label,
  value,
  caption,
}: {
  toneKey: EquipmentTrackingStatusKey | "total";
  label: string;
  value: string;
  caption: string;
}) => (
  <div
    className={`h-full min-h-[128px] rounded-[18px] p-2.5 sm:min-h-[170px] sm:rounded-[24px] sm:p-5 ${summaryCardClassByKey[toneKey]}`}
  >
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${summaryCardGlowClassByKey[toneKey]}`}
    />
    <div className="relative z-10 flex h-full flex-col">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.14em] text-white shadow-sm backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-[10px] sm:tracking-[0.18em]`}
        >
          {label}
        </span>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full bg-white/20 shadow-sm ring-1 ring-white/30 backdrop-blur-md sm:h-8 sm:w-8`}
        >
          <span className={`h-2 w-2 rounded-full bg-white sm:h-2.5 sm:w-2.5`} />
        </span>
      </div>
      <p className="mt-3 text-[2rem] font-black leading-none text-white sm:mt-4 sm:text-3xl">
        {value}
      </p>
      <span
        className={`mt-3 inline-flex self-start rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/90 shadow-sm backdrop-blur-md sm:mt-4 sm:px-3 sm:py-1 sm:text-[11px]`}
      >
        {caption}
      </span>
    </div>
  </div>
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
  tone?: MetricTone;
  className?: string;
  valueClassName?: string;
}) => (

  <div
    className={`relative h-full min-h-[88px] overflow-hidden rounded-[14px] border border-white/20 bg-white/10 px-2 py-2.5 backdrop-blur-md sm:min-h-[118px] sm:rounded-2xl sm:px-4 ${className}`}
  >
    <div className="flex items-start justify-between gap-2">
      <p className="text-[7px] font-black uppercase tracking-[0.14em] text-white/60 sm:text-[10px] sm:tracking-[0.18em]">
        {label}
      </p>
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 shadow-sm ring-1 ring-white/30 backdrop-blur-md sm:h-8 sm:w-8`}
      >
        {icon}
      </div>
    </div>
    <p
      className={`mt-2 text-[13px] font-black leading-tight text-white sm:mt-3 sm:text-lg ${valueClassName}`}
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
          className="z-[10001] w-[calc(100vw-1.5rem)] max-w-[19rem] rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl origin-top-left transition-transform sm:scale-100 scale-[0.92]"
        >
          <div className="p-2.5 border-b border-slate-100 sm:p-3">
            <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:mb-1.5">
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
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none focus:border-slate-300 sm:py-2"
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
            className="w-full bg-white p-1 sm:p-2"
            classNames={{
              root: "w-full",
              months: "w-full",
              month: "w-full space-y-2",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-xs font-black uppercase tracking-widest",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
              table: "w-full border-collapse space-y-1",
              head_row: "flex w-full",
              head_cell: "text-slate-500 rounded-md w-full font-bold text-[10px] uppercase",
              row: "flex w-full mt-1",
              cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20 w-full",
              day: "h-8 w-full p-0 font-semibold aria-selected:opacity-100 hover:bg-slate-100 rounded-lg transition-colors",
              day_selected: "bg-slate-900 text-white hover:bg-slate-900 hover:text-white focus:bg-slate-900 focus:text-white",
              day_today: "bg-slate-100 text-slate-900",
              day_outside: "text-slate-500 opacity-50",
              day_disabled: "text-slate-500 opacity-50",
              day_hidden: "invisible",
            }}
          />
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-1.5 sm:py-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rose-500 transition hover:bg-rose-50 sm:px-2.5 sm:py-1.5 sm:text-[11px]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(toDateTimeInputValue(new Date()));
                setOpen(false);
              }}
              className="rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-sky-600 transition hover:bg-sky-50 sm:px-2.5 sm:py-1.5 sm:text-[11px]"
            >
              Now
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </label>
  );
};

export default function IOTDashbaord() {
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
  const [, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [, setLastSyncedAt] = useState<string | null>(null);
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
      const iotPumpRecords = response.records.filter(isIotPumpRecord);

      setRecords(iotPumpRecords);
      setApiSummary(buildEquipmentTrackingSummary(iotPumpRecords));
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

  const filteredRecords = useMemo(() => {
    return [...records]
      .sort((left, right) => {
        const leftTime = left.lastUpdate ? new Date(left.lastUpdate).getTime() : 0;
        const rightTime = right.lastUpdate ? new Date(right.lastUpdate).getTime() : 0;
        return rightTime - leftTime;
      });
  }, [records]);

  const filteredSummary = useMemo(
    () => buildEquipmentTrackingSummary(filteredRecords),
    [filteredRecords]
  );

  const displaySummary = apiSummary.total > 0 ? apiSummary : filteredSummary;

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

      setTripRecords(response.records);
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
        `/iot/dashboard/${encodeURIComponent(selectedEquipmentOptionRecord.routeId)}`
      );
      return;
    }

    void loadTripReport({ record: selectedEquipmentOptionRecord });
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
    }
  };

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
                IOT/PUM Dashboard
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
            {error || "Equipment tracking API ne abhi koi IOT/PUM record return nahi kiya."}
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
            <AlertCircle className="h-7 w-7 text-slate-500" />
          </div>
          <h1 className="mt-6 text-xl font-black text-slate-900 sm:text-2xl">
            Requested IOT equipment feed me nahi mila
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500">
            Equipment shayad inactive hai ya IOT/PUM filter ke bahar hai.
          </p>
          <button
            onClick={() => navigate("/iot/dashboard")}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back To IOT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-2 py-1.5 sm:space-y-6 sm:px-0 sm:py-2">
      <section className="space-y-2 px-0 py-0 sm:overflow-hidden sm:rounded-[32px] sm:border sm:border-slate-200 sm:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_36%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] sm:p-6 sm:shadow-sm">
        <div className="flex flex-col gap-2 sm:gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1.5 sm:space-y-3">
            {equipmentId ? (
              <button
                onClick={() => navigate("/iot/dashboard")}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 shadow-sm transition hover:bg-slate-50 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.18em]"
              >
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Back To IOT
              </button>
            ) : null}

            <div className="space-y-1 sm:space-y-2">
              <h1 className="break-words text-[1.32rem] font-black leading-tight tracking-tight text-slate-900 sm:text-3xl">
                IOT/PUM
              </h1>
            </div>
          </div>
        </div>

        <div className="grid gap-1.5 p-0 sm:rounded-[28px] sm:border sm:border-slate-200 sm:bg-white/90 sm:gap-3 sm:p-5 sm:shadow-sm xl:grid-cols-[minmax(0,1.55fr)_220px_220px_auto_auto] xl:items-end">
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
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            {error}
          </div>
        ) : null}

        {tripError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {tripError}
          </div>
        ) : null}
      </section>

      {!equipmentId ? (
        <>
          <section className="hidden sm:grid sm:grid-cols-3 sm:gap-4 md:gap-6 lg:grid-cols-5">
            <OverviewStatCard
              toneKey="total"
              label="All"
              value={formatNumber(filteredRecords.length)}
              caption="Visible IOT/PUM fleet"
            />

            {statusSummaryOrder.map((key) => (
              <OverviewStatCard
                key={key}
                toneKey={key}
                label={statusMeta[key].label}
                value={formatNumber(displaySummary[key])}
                caption="Live snapshot"
              />
            ))}
          </section>

          {filteredRecords.length === 0 ? (
            <section className="rounded-[24px] border border-dashed border-slate-300 bg-gradient-to-br from-white via-slate-50 to-slate-100/90 px-5 py-12 text-center shadow-sm sm:rounded-[32px] sm:px-6 sm:py-16">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 sm:h-16 sm:w-16">
                <Search className="h-6 w-6 text-slate-500" />
              </div>
              <h2 className="mt-6 text-xl font-black text-slate-900 sm:text-2xl">
                No equipment found
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500">
                Live feed me abhi koi IOT/PUM equipment available nahi hai.
              </p>
            </section>
          ) : (
            <section className="space-y-2 sm:space-y-4">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
                    IoT Live Monitoring
                  </h2>
                </div>
                <p className="text-[13px] font-semibold text-slate-500 sm:text-sm">
                  {formatNumber(filteredRecords.length)} equipments
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-6 lg:grid-cols-4">
                {filteredRecords.map((record, index) => (
                  <Link
                    key={record.routeId}
                    to={`/iot/dashboard/${encodeURIComponent(record.routeId)}`}
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
                        />
                      </div>
                    </div>

                    <div className="mt-2 grid flex-1 grid-cols-3 content-start gap-1.5 sm:mt-5 sm:gap-3">
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
                        label="Heading"
                        value={formatHeading(record.direction)}
                        tone="sky"
                        icon={<Navigation className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />}
                        valueClassName="text-[15px] sm:text-base"
                      />
                      <MetricTile
                        label="Last Update"
                        value={formatRelativeTime(record.lastUpdate)}
                        subtitle={formatDateTime(record.lastUpdate)}
                        tone="slate"
                        icon={<Clock3 className="h-4 w-4 text-white/70" />}
                        className="col-span-3"
                        valueClassName="text-[15px] sm:text-base"
                      />
                    </div>
                  </Link>
                ))}

              </div>
            </section>
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

          <section className="space-y-3 rounded-[22px] border border-white/20 bg-[linear-gradient(135deg,#312e81_0%,#1e1b4b_100%)] p-3 shadow-xl sm:space-y-4 sm:rounded-[32px] sm:p-5 before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] before:[background-size:24px_24px] relative overflow-hidden">
            <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">
                  Current Snapshot
                </p>
                <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
                  Selected IOT equipment feed
                </h2>
              </div>
              <p className="inline-flex self-start rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white shadow-sm backdrop-blur-md sm:self-auto">
                {formatRelativeTime(selectedRecord.lastUpdate)}
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-3 gap-2.5 sm:gap-3 lg:grid-cols-4">
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
                icon={
                  selectedRecord.ignitionOn ? (
                    <Wifi className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />
                  ) : (
                    <WifiOff className="h-3.5 w-3.5 text-white/50 sm:h-4 sm:w-4" />
                  )
                }
              />
              <MetricTile
                label="Heading"
                value={formatHeading(selectedRecord.direction)}
                tone="sky"
                icon={<Navigation className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />}
              />
              <MetricTile
                label="Last Update"
                value={formatRelativeTime(selectedRecord.lastUpdate)}
                subtitle={formatDateTime(selectedRecord.lastUpdate)}
                tone="slate"
                icon={<Clock3 className="h-4 w-4 text-white/70" />}
                className="col-span-3 lg:col-span-1"
              />
            </div>
          </section>


          <section className="space-y-2 p-0 sm:space-y-4 sm:rounded-[32px] sm:border sm:border-slate-200 sm:bg-[linear-gradient(rgba(255,255,255,0.52)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.52)_1px,transparent_1px),radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.99)_0%,rgba(248,250,252,0.98)_60%,rgba(239,246,255,0.94)_100%)] sm:[background-size:24px_24px,24px_24px,auto,auto] sm:p-5 sm:shadow-sm">
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
                        <tr key={`${tripRecord.tripId}-${tripRecord.gpsDataId}`} className="bg-white">
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
        </>
      ) : null}
    </div>
  );
}
