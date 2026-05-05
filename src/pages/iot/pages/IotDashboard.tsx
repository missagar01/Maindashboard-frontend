import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
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
  getEquipmentTrackingReport,
  type EquipmentTrackingRecord,
  type EquipmentTrackingStatusKey,
  type EquipmentTrackingSummary,
} from "../../../api/transport/trackingApi";

const REFRESH_INTERVAL_MS = 60_000;

const numberFormatter = new Intl.NumberFormat("en-IN");

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
    badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    markerColor: "#059669",
    summaryTone: "from-emerald-500 to-teal-500",
  },
  stopped: {
    label: "Stopped",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
    markerColor: "#d97706",
    summaryTone: "from-amber-500 to-orange-500",
  },
  idling: {
    label: "Idling",
    badgeClassName: "border-sky-200 bg-sky-50 text-sky-700",
    markerColor: "#0284c7",
    summaryTone: "from-sky-500 to-blue-500",
  },
  unreachable: {
    label: "Offline",
    badgeClassName: "border-slate-200 bg-slate-100 text-slate-700",
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

const formatSpeed = (speed: number) => `${speed.toFixed(0)} km/h`;

const formatCoordinates = (record: EquipmentTrackingRecord) => {
  if (record.lat === null || record.lng === null) return "Coordinates unavailable";
  return `${record.lat.toFixed(6)}, ${record.lng.toFixed(6)}`;
};

const FLEET_FILTER_KEYWORDS = ["IOT/PUM", "IOT/PUMP", "IOT PUM", "IOT PUMP"];

const normalizeRecordText = (value: unknown) => String(value ?? "").trim();

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

  if (
    FLEET_FILTER_KEYWORDS.some((keyword) => normalizedCandidate.includes(keyword))
  ) {
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

const getRecordTitle = (record: EquipmentTrackingRecord) =>
  [...getRecordNameCandidates(record)]
    .sort((left, right) => {
      const scoreDelta =
        getRecordTitleScore(right, record) - getRecordTitleScore(left, record);

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return right.length - left.length;
    })[0] || "Unnamed equipment";

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
  return FLEET_FILTER_KEYWORDS.some((keyword) => searchableText.includes(keyword));
};

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
  "border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50/40 shadow-sm";

const equipmentGridCardClassByKey: Record<EquipmentTrackingStatusKey, string> = {
  moving:
    "border border-emerald-200 bg-gradient-to-br from-emerald-100 via-white to-emerald-50 shadow-sm hover:shadow-md transition-all",
  stopped:
    "border border-amber-200 bg-gradient-to-br from-amber-100 via-white to-orange-50 shadow-sm hover:shadow-md transition-all",
  idling:
    "border border-sky-200 bg-gradient-to-br from-sky-100 via-white to-blue-50 shadow-sm hover:shadow-md transition-all",
  unreachable:
    "border border-slate-300 bg-gradient-to-br from-slate-200 via-white to-slate-100 shadow-sm hover:shadow-md transition-all",
};

const summaryCardClassByKey: Record<EquipmentTrackingStatusKey | "total", string> = {
  total:
    "relative overflow-hidden border border-indigo-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(224,231,255,0.96)_44%,rgba(186,230,253,0.9)_100%)] shadow-[0_10px_28px_rgba(79,70,229,0.14)] transition-all duration-300 hover:shadow-[0_16px_36px_rgba(79,70,229,0.2)]",
  moving:
    "relative overflow-hidden border border-emerald-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(209,250,229,0.94)_42%,rgba(153,246,228,0.82)_100%)] shadow-[0_10px_28px_rgba(5,150,105,0.14)] transition-all duration-300 hover:shadow-[0_16px_36px_rgba(5,150,105,0.2)]",
  stopped:
    "relative overflow-hidden border border-amber-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(254,243,199,0.95)_42%,rgba(253,230,138,0.84)_100%)] shadow-[0_10px_28px_rgba(217,119,6,0.14)] transition-all duration-300 hover:shadow-[0_16px_36px_rgba(217,119,6,0.2)]",
  idling:
    "relative overflow-hidden border border-sky-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(224,242,254,0.95)_42%,rgba(186,230,253,0.84)_100%)] shadow-[0_10px_28px_rgba(2,132,199,0.14)] transition-all duration-300 hover:shadow-[0_16px_36px_rgba(2,132,199,0.2)]",
  unreachable:
    "relative overflow-hidden border border-slate-300/90 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.95)_42%,rgba(203,213,225,0.86)_100%)] shadow-[0_10px_28px_rgba(71,85,105,0.14)] transition-all duration-300 hover:shadow-[0_16px_36px_rgba(71,85,105,0.2)]",
};

const summaryCardGlowClassByKey: Record<
  EquipmentTrackingStatusKey | "total",
  string
> = {
  total:
    "bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.2),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.16),transparent_42%)]",
  moving:
    "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.16),transparent_42%)]",
  stopped:
    "bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.2),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.16),transparent_42%)]",
  idling:
    "bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.2),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.16),transparent_42%)]",
  unreachable:
    "bg-[radial-gradient(circle_at_top_right,rgba(100,116,139,0.18),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(148,163,184,0.14),transparent_42%)]",
};

const StatusBadge = ({
  statusKey,
  label,
}: {
  statusKey: EquipmentTrackingStatusKey;
  label?: string;
}) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.2em] ${statusMeta[statusKey].badgeClassName}`}
  >
    {label || statusMeta[statusKey].label}
  </span>
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

export default function IOTDashbaord() {
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

  return (
    <div className="space-y-4 px-4 py-2 sm:space-y-6 sm:px-0 sm:py-2">
      <section className="px-0 py-0 sm:overflow-hidden sm:rounded-[32px] sm:border sm:border-slate-200 sm:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_36%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] sm:p-6 sm:shadow-sm">
        <div className="flex flex-col gap-4 sm:gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-600">
                Transport Live Location
              </p>
              <h1 className="break-words text-[1.45rem] font-black leading-tight tracking-tight text-slate-900 sm:text-3xl">
                Fleet GPS Monitor (IOT/PUM)
              </h1>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 sm:mt-6 sm:grid-cols-2 sm:gap-3 xl:grid-cols-[minmax(0,1.5fr)_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search equipment..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300"
            />
          </div>

          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: "All Status", value: "all" },
              ...statusSummaryOrder.map((key) => ({
                label: statusMeta[key].label,
                value: key,
              })),
            ]}
          />

          <FilterSelect
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categoryOptions}
          />
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-5">
        <div className={`rounded-[20px] p-3 sm:rounded-[24px] sm:p-5 ${summaryCardClassByKey.total}`}>
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 ${summaryCardGlowClassByKey.total}`}
          />
          <div className="relative z-10">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 sm:text-[10px] sm:tracking-[0.2em]">
              Equipments
            </p>
            <p className="mt-2 text-2xl font-black text-slate-900 sm:mt-3 sm:text-3xl">
              {formatNumber(filteredRecords.length)}
            </p>
            <p className="mt-1 text-xs font-medium leading-5 text-slate-600 sm:mt-2 sm:text-sm">
              Visible IOT/PUM fleet
            </p>
          </div>
        </div>

        {statusSummaryOrder.map((key) => (
          <div
            key={key}
            className={`rounded-[20px] p-3 sm:rounded-[24px] sm:p-5 ${summaryCardClassByKey[key]}`}
          >
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 ${summaryCardGlowClassByKey[key]}`}
            />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 sm:text-[10px] sm:tracking-[0.2em]">
                  {statusMeta[key].label}
                </p>
                <div
                  className={`h-3.5 w-3.5 rounded-full bg-gradient-to-br ${statusMeta[key].summaryTone}`}
                />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900 sm:mt-3 sm:text-3xl">
                {formatNumber(displaySummary[key])}
              </p>
              <p className="mt-1 text-xs font-medium leading-5 text-slate-600 sm:mt-2 sm:text-sm">
                Live snapshot
              </p>
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
            No equipment found
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500">
            Check your search terms or filters.
          </p>
        </section>
      ) : (
        <section className="space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Equipment Data
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
                Fleet Live Feed
              </h2>
            </div>
            <p className="text-sm font-semibold text-slate-500">
              {formatNumber(filteredRecords.length)} equipments
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-4">
            {filteredRecords.map((record) => (
              <div
                key={record.routeId}
                className={`group rounded-[18px] p-2.5 sm:rounded-[28px] sm:p-5 ${equipmentGridCardClassByKey[record.statusKey]}`}
              >
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-base font-black leading-tight text-slate-900 break-words sm:text-xl">
                      {getRecordTitle(record)}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-600 sm:mt-1 sm:text-sm">
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

                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
                  <div className="rounded-[14px] bg-white/75 px-2.5 py-1.5 backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
                      Speed
                    </p>
                    <div className="flex items-center gap-1 mt-0.5 sm:mt-2 sm:gap-1.5">
                      <Gauge className="h-3 w-3 text-slate-500 sm:h-3.5 sm:w-3.5" />
                      <p className="text-sm font-black text-slate-900 sm:text-base">
                        {formatSpeed(record.speed)}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-[14px] bg-white/75 px-2.5 py-1.5 backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
                      Ignition
                    </p>
                    <div className="flex items-center gap-1 mt-0.5 sm:mt-2 sm:gap-1.5">
                      {record.ignitionOn ? (
                        <Wifi className="h-3 w-3 text-emerald-500 sm:h-3.5 sm:w-3.5" />
                      ) : (
                        <WifiOff className="h-3 w-3 text-slate-500 sm:h-3.5 sm:w-3.5" />
                      )}
                      <p className="text-sm font-black text-slate-900 sm:text-base">
                        {record.ignitionOn ? "ON" : "OFF"}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-2 hidden rounded-[18px] bg-white/75 px-3 py-2 backdrop-blur-sm sm:block sm:rounded-2xl sm:px-4 sm:py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
                      Coordinates
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 sm:mt-2">
                      <Activity className="h-3.5 w-3.5 text-slate-500" />
                      <p className="text-[0.95rem] font-semibold leading-5 text-slate-700 sm:text-sm">
                        {formatCoordinates(record)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-white/70 pt-2.5 sm:mt-5 sm:pt-4">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
                      Last Update
                    </p>
                    <div className="flex items-center gap-1 mt-0.5 sm:gap-1.5">
                      <Clock3 className="h-2.5 w-2.5 text-slate-400 sm:h-3 sm:w-3" />
                      <p className="text-[10px] font-semibold text-slate-700 sm:text-xs">
                        {formatRelativeTime(record.lastUpdate)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
                      Heading
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold text-slate-900 sm:text-xs uppercase">
                      {record.direction ? `${record.direction}°` : "--"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
