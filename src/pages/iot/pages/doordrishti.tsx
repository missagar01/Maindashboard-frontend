import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  MapPin,
  RefreshCw,
  Search,
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

const formatClockTime = (value: string) => {
  const timeMatch = safeString(value).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);

  if (!timeMatch) {
    return "--";
  }

  const [, hours, minutes, seconds = "00"] = timeMatch;

  return `${padNumber(Number(hours))}h ${padNumber(Number(minutes))}m ${padNumber(
    Number(seconds)
  )}s`;
};

const getDateTimestamp = (value: string) => {
  const normalizedValue = safeString(value);

  if (!normalizedValue) {
    return null;
  }

  const timestamp = Date.parse(normalizedValue.replace(" ", "T"));

  return Number.isFinite(timestamp) ? timestamp : null;
};

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

const MOBILE_TRIP_CARD_GRADIENTS = [
  "from-sky-100 via-cyan-50 to-white",
  "from-emerald-100 via-green-50 to-white",
  "from-violet-100 via-purple-50 to-white",
  "from-amber-100 via-yellow-50 to-white",
  "from-rose-100 via-pink-50 to-white",
  "from-indigo-100 via-blue-50 to-white",
];

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

export default function DoordrishtiPage() {
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
  const [responseData, setResponseData] = useState<DoordrishtiResponse | null>(null);
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
          const defaultOption =
            nextOptions.find((opt) =>
              opt.label.toUpperCase().includes("SRMPL_8_WORKSHOP")
            ) || nextOptions[0];
          const targetDeviceId = defaultOption.value;
          setFilterValues((prev) => ({ ...prev, deviceId: targetDeviceId }));
          setAppliedFilters((prev) => ({ ...prev, deviceId: targetDeviceId }));
        }
      } catch {
        if (!cancelled) {
          setDeviceOptions([]);
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
        const response = await fetch(buildDoordrishtiUrl(appliedFilters), {
          method: "GET",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload: DoordrishtiResponse = await response.json();

        if (String(payload?.result) !== "0") {
          throw new Error(payload?.message || "Unable to load Doordrishti trips.");
        }

        setResponseData(payload);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setResponseData(null);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load Doordrishti trips."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadTrips();

    return () => controller.abort();
  }, [appliedFilters]);

  const tripRows = useMemo(() => flattenTripRows(responseData), [responseData]);

  const summary = useMemo(() => {
    const totalTrips = tripRows.length;
    const totalRunningSeconds = tripRows.reduce(
      (sum, trip) => sum + trip.timeCoveredSeconds,
      0
    );
    let firstStartDate = "";
    let firstStartTimestamp = Number.POSITIVE_INFINITY;
    let lastEndDate = "";
    let lastEndTimestamp = Number.NEGATIVE_INFINITY;

    tripRows.forEach((trip) => {
      const startTimestamp = getDateTimestamp(trip.startDate);

      if (startTimestamp !== null && startTimestamp < firstStartTimestamp) {
        firstStartTimestamp = startTimestamp;
        firstStartDate = trip.startDate;
      } else if (!firstStartDate && trip.startDate) {
        firstStartDate = trip.startDate;
      }

      const endTimestamp = getDateTimestamp(trip.endDate);

      if (endTimestamp !== null && endTimestamp > lastEndTimestamp) {
        lastEndTimestamp = endTimestamp;
        lastEndDate = trip.endDate;
      } else if (!lastEndDate && trip.endDate) {
        lastEndDate = trip.endDate;
      }
    });

    let totalElapsedSeconds = 0;
    let totalIdleSeconds = 0;

    // totalElapsedSeconds will be calculated after totalIdleSeconds

    const sortedTrips = [...tripRows].sort((a, b) => {
      const timeA = getDateTimestamp(a.startDate) || 0;
      const timeB = getDateTimestamp(b.startDate) || 0;
      return timeA - timeB;
    });

    for (let i = 1; i < sortedTrips.length; i++) {
      const prevEnd = getDateTimestamp(sortedTrips[i - 1].endDate);
      const nextStart = getDateTimestamp(sortedTrips[i].startDate);

      if (prevEnd !== null && nextStart !== null && nextStart > prevEnd) {
        totalIdleSeconds += Math.floor((nextStart - prevEnd) / 1000);
      }
    }

    totalElapsedSeconds = totalRunningSeconds + totalIdleSeconds;

    return {
      totalTrips,
      firstStartDate,
      firstStartTimeLabel: formatClockTime(firstStartDate),
      lastEndDate,
      lastEndTimeLabel: formatClockTime(lastEndDate),
      totalRunningLabel: formatSecondsToDuration(totalRunningSeconds),
      totalElapsedLabel: formatSecondsToDuration(totalElapsedSeconds),
      totalIdleLabel: formatSecondsToDuration(totalIdleSeconds),
      dateRangeLabel: `${appliedFilters.dateFrom} to ${appliedFilters.dateTo}`,
    };
  }, [tripRows, appliedFilters]);

  const summaryMetricCards = useMemo(
    () => [
      {
        label: "ON Time",
        value: summary.totalRunningLabel,
        bgClass: "from-blue-600 to-indigo-800",
        meta: summary.dateRangeLabel,
        badge: `${summary.totalTrips} Trips`,
      },
      {
        label: "OFF Time",
        value: summary.totalIdleLabel,
        bgClass: "from-emerald-600 to-emerald-800",
        meta: summary.dateRangeLabel,
        badge: `${summary.totalTrips} Trips`,
      },
      {
        label: "Total Time",
        value: summary.totalElapsedLabel,
        bgClass: "from-slate-900 to-slate-700",
        meta: summary.firstStartDate && summary.lastEndDate ? `${summary.firstStartDate.split(" ")[0]} to ${summary.lastEndDate.split(" ")[0]}` : "No trips found",
      },

    ],
    [summary]
  );

  const handleInputChange = (key: keyof DoordrishtiFilters, value: string) => {
    if (key === "dateFrom" || key === "dateTo") {
      setSelectedRangePreset("custom");
    }

    setFilterValues((current) => ({
      ...current,
      [key]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const applyFilters = (nextFilters: DoordrishtiFilters) => {
    if (!nextFilters.deviceId) {
      setError("Please select a device.");
      return false;
    }

    if (!nextFilters.dateFrom || !nextFilters.dateTo) {
      setError("From date and to date both are required.");
      return false;
    }

    if (nextFilters.dateFrom > nextFilters.dateTo) {
      setError("From date cannot be greater than to date.");
      return false;
    }

    setError("");
    setFilterValues(nextFilters);
    setAppliedFilters(nextFilters);
    return true;
  };

  const handleApplyFilters = () => {
    applyFilters(filterValues);
  };

  const handleRangePresetSelect = (
    preset: Exclude<DoordrishtiRangePreset, "custom">
  ) => {
    const nextFilters = buildFiltersForPreset(
      preset,
      new Date(),
      filterValues.deviceId || DEFAULT_DEVICE_ID
    );

    if (applyFilters(nextFilters)) {
      setSelectedRangePreset(preset);
    }
  };

  const getDeviceDisplayName = (deviceId: string, fallback: string) => {
    const opt = deviceOptions.find((o) => o.value === deviceId);
    if (opt && opt.label) {
      return opt.label.split(" | ")[0];
    }
    return fallback || "--";
  };

  return (
    <div className="min-h-screen bg-[#f7f8fc] px-1.5 pb-2 pt-1.5 text-slate-900 md:px-8 md:pb-16 md:pt-8">
      <div className="mx-auto max-w-[1600px] space-y-2 md:space-y-6">
        <section className="rounded-[22px] border border-slate-200 bg-white p-2.5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:rounded-[28px] md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2 md:gap-4">
            <div>
              <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900 md:mt-2 md:text-3xl">
                Trip Report
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 md:inline-flex">
                <Clock3 className="h-3.5 w-3.5" />
                Quick Range
              </div>
              {DOORDRISHTI_RANGE_PRESET_OPTIONS.map((option) => {
                const isActive = selectedRangePreset === option.preset;

                return (
                  <button
                    key={option.preset}
                    type="button"
                    onClick={() => handleRangePresetSelect(option.preset)}
                    className={`inline-flex h-10 items-center justify-center rounded-2xl border px-4 text-[10px] font-black uppercase tracking-[0.14em] transition md:h-11 ${isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                      }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:mt-6 md:gap-3 xl:grid-cols-[minmax(240px,320px)_minmax(220px,280px)_minmax(220px,280px)_auto] xl:items-end">
            <label className="flex flex-col gap-1.5 md:gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Vehicle :
              </span>
              <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                <Search className="h-4 w-4 text-slate-400" />
                <select
                  value={filterValues.deviceId}
                  onChange={(event) =>
                    handleInputChange("deviceId", event.target.value)
                  }
                  className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
                  disabled={deviceOptionsLoading}
                >
                  {deviceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="flex flex-col gap-1.5 md:gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                From Date
              </span>
              <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={filterValues.dateFrom}
                  onChange={(event) =>
                    handleInputChange("dateFrom", event.target.value)
                  }
                  className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5 md:gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                To Date
              </span>
              <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={filterValues.dateTo}
                  onChange={(event) =>
                    handleInputChange("dateTo", event.target.value)
                  }
                  className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
                />
              </div>
            </label>

            <div className="grid gap-2 md:gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleApplyFilters}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1e4b7a] px-5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#153658]"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
              <button
                type="button"
                onClick={() => setAppliedFilters({ ...filterValues })}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#f59e0b] px-5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#d97706]"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Reset
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-rose-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : null}
        </section>

        <section className="grid grid-cols-2 gap-1.5 md:gap-4 xl:grid-cols-3">
          {summaryMetricCards.map((item) => (
            <div
              key={item.label}
              className={`relative rounded-[18px] bg-gradient-to-br ${item.bgClass} p-2.5 text-white shadow-[0_14px_28px_rgba(15,23,42,0.14)] md:rounded-[24px] md:p-5`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.45)] md:text-[11px] md:tracking-[0.18em]">
                  {item.label}
                </p>
                {item.badge && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                    {item.badge}
                  </span>
                )}
              </div>
              <p className="mt-1.5 whitespace-nowrap text-[1.05rem] font-black tracking-tight leading-[1.05] drop-shadow-[0_2px_4px_rgba(15,23,42,0.35)] sm:text-[1.2rem] md:mt-4 md:text-3xl">
                {item.value}
              </p>
              <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em] leading-snug text-white/90 drop-shadow-[0_1px_2px_rgba(15,23,42,0.35)] md:mt-2 md:text-xs md:tracking-[0.16em]">
                {item.meta}
              </p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:rounded-[28px]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-2.5 py-2.5 md:gap-3 md:px-6 md:py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Trip Timeline
              </p>
              <h2 className="mt-0.5 text-base font-black text-slate-900 md:mt-1 md:text-lg">
                {appliedFilters.dateFrom} to {appliedFilters.dateTo}
              </h2>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
              {loading
                ? "Loading..."
                : `${summary.totalTrips} Records`}
            </div>
          </div>


          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <div className="flex items-center gap-3 text-slate-500">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-sm font-bold">Fetching trip data...</span>
              </div>
            </div>
          ) : tripRows.length ? (
            <>
              <div className="md:hidden">
                <div className="space-y-0">
                  {tripRows.map((item, index) => {
                    const mobileGradientClass =
                      MOBILE_TRIP_CARD_GRADIENTS[
                      index % MOBILE_TRIP_CARD_GRADIENTS.length
                      ] || MOBILE_TRIP_CARD_GRADIENTS[0];

                    return (
                      <div
                        key={`mobile-${item.gpsDataId || index}`}
                        className={`border-b border-slate-200 bg-gradient-to-r ${mobileGradientClass} px-2 py-2 last:border-b-0`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                              Voyage #{index + 1}
                            </p>
                            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                              Vehicle: {getDeviceDisplayName(item.deviceId, item.registrationNo)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                          <div className="rounded-xl bg-white/85 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                              Start Time
                            </p>
                            <p className="mt-0.5 text-[11px] font-black leading-snug text-slate-900">
                              {item.startDate || "--"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white/85 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                              End Time
                            </p>
                            <p className="mt-0.5 text-[11px] font-black leading-snug text-slate-900">
                              {item.endDate || "--"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white/85 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                              Time Covered
                            </p>
                            <p className="mt-0.5 text-[11px] font-black leading-snug text-slate-900">
                              {item.tripDifference || "--"}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white/85 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                              Distance
                            </p>
                            <p className="mt-0.5 text-[11px] font-black leading-snug text-slate-900">
                              {item.distance !== null ? item.distance : "--"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-1.5 rounded-xl bg-white/85 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                          <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                            Start Location
                          </p>
                          <div className="mt-0.5 flex items-start gap-1.5 text-[11px] font-bold leading-snug text-slate-700">
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                            <span>{item.startLocation || "--"}</span>
                          </div>
                        </div>

                        <div className="mt-1.5 rounded-xl bg-white/85 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                          <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                            End Location
                          </p>
                          <div className="mt-0.5 flex items-start gap-1.5 text-[11px] font-bold leading-snug text-slate-700">
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                            <span>{item.endLocation || "--"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Voyage no",
                        "Vehicle",
                        "Start Time",
                        "End Time",
                        "Time Covered",
                        "Distance",
                        "Start Location",
                        "End Location",
                      ].map((label) => (
                        <th
                          key={label}
                          className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 md:px-6"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tripRows.map((item, index) => {
                      return (
                        <tr key={item.gpsDataId || index} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-4 md:px-6">
                            <div className="text-sm font-black text-slate-900">
                              {index + 1}
                            </div>
                          </td>
                          <td className="px-4 py-4 md:px-6">
                            <div className="text-sm font-black text-slate-900">
                              {getDeviceDisplayName(item.deviceId, item.registrationNo)}
                            </div>
                          </td>
                          <td className="px-4 py-4 md:px-6">
                            <div className="text-sm font-bold text-slate-700">
                              {item.startDate || "--"}
                            </div>
                          </td>
                          <td className="px-4 py-4 md:px-6">
                            <div className="text-sm font-bold text-slate-700">
                              {item.endDate || "--"}
                            </div>
                          </td>
                          <td className="px-4 py-4 md:px-6">
                            <div className="text-sm font-bold text-slate-700">
                              {item.tripDifference || "--"}
                            </div>
                          </td>
                          <td className="px-4 py-4 md:px-6">
                            <div className="text-sm font-bold text-slate-700">
                              {item.distance !== null ? item.distance : "--"}
                            </div>
                          </td>
                          <td className="px-4 py-4 md:px-6">
                            <div className="text-sm font-medium text-slate-600 max-w-xs truncate" title={item.startLocation}>
                              {item.startLocation || "--"}
                            </div>
                          </td>
                          <td className="px-4 py-4 md:px-6">
                            <div className="text-sm font-medium text-slate-600 max-w-xs truncate" title={item.endLocation}>
                              {item.endLocation || "--"}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex min-h-[260px] items-center justify-center px-6 text-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
                  No Trips Found
                </p>
                <p className="mt-2 text-base font-bold text-slate-700">
                  Selected device aur date range ke liye koi trip available nahi hai.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
