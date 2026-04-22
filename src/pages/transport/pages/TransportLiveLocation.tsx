import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
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
  Tooltip,
  useMap,
} from "react-leaflet";
import {
  buildEquipmentTrackingSummary,
  getEquipmentTrackingReport,
  type EquipmentTrackingRecord,
  type EquipmentTrackingStatusKey,
  type EquipmentTrackingSummary,
} from "../../../api/transport/trackingApi";

const REFRESH_INTERVAL_MS = 60_000;

const numberFormatter = new Intl.NumberFormat("en-IN");
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
  const detailedName = normalizeLocationValue(payload?.display_name)
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .slice(0, 4)
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
    compactName ||
    detailedName ||
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
    .slice(0, 3)
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
  "border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50/40 shadow-sm";

const insetCardClass =
  "border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/90 shadow-sm";

const latestSignalCardClassByKey: Record<EquipmentTrackingStatusKey, string> = {
  moving:
    "border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50 to-teal-100/65 shadow-sm",
  stopped:
    "border border-amber-200/80 bg-gradient-to-br from-white via-amber-50 to-orange-100/65 shadow-sm",
  idling:
    "border border-sky-200/80 bg-gradient-to-br from-white via-sky-50 to-blue-100/65 shadow-sm",
  unreachable:
    "border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-200/75 shadow-sm",
};

const equipmentGridCardClassByKey: Record<EquipmentTrackingStatusKey, string> = {
  moving:
    "border border-emerald-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(236,253,245,0.98)_48%,rgba(209,250,229,0.92)_100%)] shadow-sm",
  stopped:
    "border border-amber-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(255,251,235,0.98)_48%,rgba(254,215,170,0.88)_100%)] shadow-sm",
  idling:
    "border border-sky-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(240,249,255,0.98)_48%,rgba(191,219,254,0.9)_100%)] shadow-sm",
  unreachable:
    "border border-slate-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.98)_48%,rgba(226,232,240,0.94)_100%)] shadow-sm",
};

const summaryCardClassByKey: Record<EquipmentTrackingStatusKey | "total", string> = {
  total:
    "border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/55 shadow-sm",
  moving:
    "border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50 to-teal-100/70 shadow-sm",
  stopped:
    "border border-amber-200/70 bg-gradient-to-br from-white via-amber-50 to-orange-100/70 shadow-sm",
  idling:
    "border border-sky-200/70 bg-gradient-to-br from-white via-sky-50 to-blue-100/70 shadow-sm",
  unreachable:
    "border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-200/70 shadow-sm",
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
          <Tooltip permanent direction="top" offset={[0, -16]} opacity={1}>
            <div className="min-w-[136px] max-w-[180px] sm:min-w-[170px] sm:max-w-[250px]">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                Current Location
              </p>
              <p className="mt-1 text-[11px] font-black leading-4 text-slate-800 sm:text-sm sm:leading-5">
                {mapDisplayLocationName || "Tracked Position"}
              </p>
              <p className="mt-1 text-[10px] font-medium leading-4 text-slate-500 sm:text-[11px]">
                {coordinateLabel}
              </p>
            </div>
          </Tooltip>

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
              <StatusBadge
                statusKey={record.statusKey}
                label={record.statusLabel}
              />
              <p className="text-[11px] text-slate-600 sm:text-xs">
                Last update: {formatDateTime(record.lastUpdate)}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      </MapContainer>

      <div className="pointer-events-none absolute bottom-2 left-2 z-[500] max-w-[calc(100%-1rem)] rounded-[18px] border border-white/80 bg-white/92 px-2.5 py-2 shadow-lg backdrop-blur-sm sm:bottom-4 sm:left-4 sm:max-w-[380px] sm:rounded-2xl sm:px-3 sm:py-2">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
          Current Location
        </p>
        <p className="mt-1 text-[11px] font-black leading-4 text-slate-800 sm:text-sm sm:leading-5">
          {mapDisplayLocationName || "Tracked Position"}
        </p>
        <p className="mt-1 text-[10px] font-medium leading-4 text-slate-500 sm:text-[11px]">
          {coordinateLabel}
        </p>
      </div>
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

  const latestSignalRecords = useMemo(
    () => filteredRecords.slice(0, 6),
    [filteredRecords]
  );

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

  const selectedLocationLabel =
    selectedLocationName ||
    (locationLookupLoading
      ? "Resolving location name..."
      : selectedRecord && hasCoordinates(selectedRecord)
        ? "Location name unavailable"
        : "Coordinates unavailable");

  if (loading && !records.length) {
    return (
      <div className="space-y-3 py-1 sm:space-y-6 sm:py-2">
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
      <div className="space-y-3 py-1 sm:space-y-6 sm:py-2">
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
      <div className="space-y-3 py-1 sm:space-y-6 sm:py-2">
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
    <div className="space-y-3 py-1 sm:space-y-6 sm:py-2">
      <section className="px-0 py-1 sm:overflow-hidden sm:rounded-[32px] sm:border sm:border-slate-200 sm:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_36%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] sm:p-6 sm:shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            {equipmentId ? (
              <button
                onClick={() => navigate("/transport/live-location")}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 shadow-sm transition hover:bg-slate-50 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.18em]"
              >
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Back To Fleet
              </button>
            ) : null}

            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-600">
                Transport Live Location
              </p>
              <h1 className="break-words text-[1.7rem] font-black leading-[1.02] tracking-tight text-slate-900 sm:text-3xl">
                {selectedRecord ? getRecordTitle(selectedRecord) : "Fleet GPS Monitor"}
              </h1>
           
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
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

              <span className="col-span-full inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 shadow-sm sm:col-auto sm:justify-start sm:gap-2 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.16em]">
                <Clock3 className="h-3.5 w-3.5 text-slate-400 sm:h-4 sm:w-4" />
                {lastSyncedAt ? formatRelativeTime(lastSyncedAt) : "Waiting for sync"}
              </span>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 xl:w-auto">
            <button
              onClick={() => loadTrackingData({ background: true })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-slate-800 sm:w-auto sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm sm:tracking-[0.18em]"
            >
              <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Feed
            </button>
          </div>
        </div>

        {!equipmentId ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search equipment, serial, GPS, registration"
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
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            {error}
          </div>
        ) : null}
      </section>

      {!equipmentId ? (
        <>
          <section className="grid grid-cols-3 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
            <div className={`rounded-[20px] p-3 sm:rounded-[24px] sm:p-5 ${summaryCardClassByKey.total}`}>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-[10px] sm:tracking-[0.2em]">
                Visible Equipments
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900 sm:mt-3 sm:text-3xl">
                {formatNumber(filteredRecords.length)}
              </p>
              <p className="mt-1 text-xs font-medium leading-5 text-slate-500 sm:mt-2 sm:text-sm">
                {hasActiveFilters
                  ? "Active filters ke baad visible fleet"
                  : apiSummary.total > records.length
                    ? `${formatNumber(apiSummary.total)} total feed records`
                    : "Current feed me available equipments"}
              </p>
            </div>

            {statusSummaryOrder.map((key) => (
              <div
                key={key}
                className={`rounded-[20px] p-3 sm:rounded-[24px] sm:p-5 ${summaryCardClassByKey[key]}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-[10px] sm:tracking-[0.2em]">
                    {statusMeta[key].label}
                  </p>
                  <div
                    className={`h-3.5 w-3.5 rounded-full bg-gradient-to-br ${statusMeta[key].summaryTone}`}
                  />
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900 sm:mt-3 sm:text-3xl">
                  {formatNumber(displaySummary[key])}
                </p>
                <p className="mt-1 text-xs font-medium leading-5 text-slate-500 sm:mt-2 sm:text-sm">
                  Live feed snapshot
                </p>
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
              <section className={`space-y-4 rounded-[24px] p-4 sm:rounded-[32px] sm:p-5 ${pageCardClass}`}>
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
                  {latestSignalRecords.map((record) => (
                    <Link
                      key={record.routeId}
                      to={`/transport/live-location/${encodeURIComponent(record.routeId)}`}
                      className={`flex flex-col gap-3 rounded-[22px] px-4 py-4 transition hover:border-slate-300 hover:brightness-[0.99] sm:flex-row sm:items-start sm:justify-between sm:rounded-[24px] ${latestSignalCardClassByKey[record.statusKey]}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">
                          {getRecordTitle(record)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {getRecordSubtitle(record)}
                        </p>
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          {formatRelativeTime(record.lastUpdate)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:block sm:shrink-0 sm:text-right">
                        <StatusBadge
                          statusKey={record.statusKey}
                          label={record.statusLabel}
                        />
                        <p className="text-xs font-semibold text-slate-500 sm:mt-3">
                          {formatSpeed(record.speed)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
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

                <div className="grid gap-3 sm:gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {filteredRecords.map((record) => (
                    <Link
                      key={record.routeId}
                      to={`/transport/live-location/${encodeURIComponent(record.routeId)}`}
                      className={`group rounded-[22px] p-3.5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:rounded-[28px] sm:p-5 ${equipmentGridCardClassByKey[record.statusKey]}`}
                    >
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-[1.6rem] font-black leading-none text-slate-900 sm:text-lg sm:leading-tight">
                            {getRecordTitle(record)}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-600">
                            {getRecordSubtitle(record)}
                          </p>
                        </div>
                        <StatusBadge
                          statusKey={record.statusKey}
                          label={record.statusLabel}
                        />
                      </div>

                      <div className="mt-3 grid gap-2 sm:mt-5 sm:grid-cols-2 sm:gap-3">
                        <div className="rounded-[18px] bg-white/75 px-3 py-2.5 backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
                            Speed
                          </p>
                          <p className="mt-1.5 text-[1.1rem] font-black text-slate-900 sm:mt-2 sm:text-base">
                            {formatSpeed(record.speed)}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-white/75 px-3 py-2.5 backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
                            Ignition
                          </p>
                          <p className="mt-1.5 text-[1.1rem] font-black text-slate-900 sm:mt-2 sm:text-base">
                            {record.ignitionOn ? "ON" : "OFF"}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-white/75 px-3 py-2.5 backdrop-blur-sm sm:col-span-2 sm:rounded-2xl sm:px-4 sm:py-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
                            Coordinates
                          </p>
                          <p className="mt-1.5 text-[0.95rem] font-semibold leading-5 text-slate-700 sm:mt-2 sm:text-sm">
                            {formatCoordinates(record)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-end justify-between gap-3 border-t border-white/70 pt-3 sm:mt-5 sm:items-center sm:border-slate-100 sm:pt-4">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
                            Last Update
                          </p>
                          <p className="mt-1 text-[0.95rem] font-semibold leading-5 text-slate-700 sm:text-sm">
                            {formatRelativeTime(record.lastUpdate)}
                          </p>
                        </div>
                        <span className="text-[0.95rem] font-black leading-5 text-slate-900 group-hover:text-slate-700 sm:text-sm">
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
          <section className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_420px] xl:gap-6">
            <div className={`min-w-0 space-y-3 rounded-[20px] p-3 sm:space-y-4 sm:rounded-[32px] sm:p-5 ${pageCardClass}`}>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
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
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-black uppercase tracking-[0.14em] sm:w-auto sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm sm:tracking-[0.18em] ${
                    hasCoordinates(selectedRecord)
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

            <div className="min-w-0 space-y-3 sm:space-y-4">
              <div className={`rounded-[20px] p-3 sm:rounded-[32px] sm:p-5 ${pageCardClass}`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 sm:h-12 sm:w-12 sm:rounded-2xl">
                    <Truck className="h-4 w-4 text-slate-600 sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
                      Equipment Snapshot
                    </p>
                    <p className="mt-1 text-base font-black text-slate-900 sm:text-lg">
                      {selectedRecord.equipment.doorNumber || selectedRecord.registrationNo || "Door number unavailable"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2.5 sm:mt-5 sm:grid-cols-2 sm:gap-3">
                  <div className="rounded-xl bg-white/75 px-3 py-2.5 backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
                      Serial
                    </p>
                    <p className="mt-1.5 text-[13px] font-semibold text-slate-700 sm:mt-2 sm:text-sm">
                      {selectedRecord.serial || "--"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/75 px-3 py-2.5 backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
                      Device ID
                    </p>
                    <p className="mt-1.5 text-[13px] font-semibold text-slate-700 sm:mt-2 sm:text-sm">
                      {selectedRecord.deviceId || "--"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/75 px-3 py-2.5 backdrop-blur-sm sm:col-span-2 sm:rounded-2xl sm:px-4 sm:py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
                      Last heartbeat
                    </p>
                    <p className="mt-1.5 text-[13px] font-semibold text-slate-700 sm:mt-2 sm:text-sm">
                      {formatDateTime(selectedRecord.lastUpdate)}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-slate-500 sm:text-xs">
                      {formatRelativeTime(selectedRecord.lastUpdate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-[20px] p-3 sm:rounded-[32px] sm:p-5 ${pageCardClass}`}>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-[10px] sm:tracking-[0.22em]">
                  Telemetry
                </p>
                <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-white/75 px-3 py-2.5 backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-3">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <Gauge className="h-3.5 w-3.5 text-slate-500 sm:h-4 sm:w-4" />
                      <span className="text-[13px] font-semibold text-slate-600 sm:text-sm">Speed</span>
                    </div>
                    <span className="text-[13px] font-black text-slate-900 sm:text-sm">
                      {formatSpeed(selectedRecord.speed)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/75 px-3 py-2.5 backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-3">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      {selectedRecord.ignitionOn ? (
                        <Wifi className="h-3.5 w-3.5 text-emerald-500 sm:h-4 sm:w-4" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5 text-slate-500 sm:h-4 sm:w-4" />
                      )}
                      <span className="text-[13px] font-semibold text-slate-600 sm:text-sm">Ignition</span>
                    </div>
                    <span className="text-[13px] font-black text-slate-900 sm:text-sm">
                      {selectedRecord.ignitionOn ? "ON" : "OFF"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/75 px-3 py-2.5 backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-3">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <Fuel className="h-3.5 w-3.5 text-slate-500 sm:h-4 sm:w-4" />
                      <span className="text-[13px] font-semibold text-slate-600 sm:text-sm">Fuel Level</span>
                    </div>
                    <span className="text-[13px] font-black text-slate-900 sm:text-sm">
                      {formatFuelLevel(selectedRecord.fuelLevel)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/75 px-3 py-2.5 backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-3">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <Navigation className="h-3.5 w-3.5 text-slate-500 sm:h-4 sm:w-4" />
                      <span className="text-[13px] font-semibold text-slate-600 sm:text-sm">Heading</span>
                    </div>
                    <span className="text-[13px] font-black text-slate-900 sm:text-sm">
                      {formatHeading(selectedRecord.direction)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/75 px-3 py-2.5 backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-3">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <Activity className="h-3.5 w-3.5 text-slate-500 sm:h-4 sm:w-4" />
                      <span className="text-[13px] font-semibold text-slate-600 sm:text-sm">Parking</span>
                    </div>
                    <span className="text-[13px] font-black text-slate-900 sm:text-sm">
                      {formatParkingDuration(selectedRecord.parkingSeconds)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`rounded-[20px] p-3 sm:rounded-[32px] sm:p-5 ${pageCardClass}`}>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-[10px] sm:tracking-[0.22em]">
                  Coordinates
                </p>
                <p className="mt-2 text-base font-black text-slate-900 sm:mt-3 sm:text-lg">
                  {formatCoordinates(selectedRecord)}
                </p>
                <p className="mt-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:mt-4 sm:text-[10px] sm:tracking-[0.18em]">
                  Location Name
                </p>
                <p className="mt-1.5 text-[13px] font-semibold leading-5 text-slate-700 sm:mt-2 sm:text-sm sm:leading-6">
                  {selectedLocationLabel}
                </p>
                <p className="mt-1.5 text-[12px] font-medium text-slate-500 sm:mt-2 sm:text-sm">
                  Distance today: {selectedRecord.distance.toFixed(1)} km
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3 sm:space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-[10px] sm:tracking-[0.22em]">
                  Other Equipments
                </p>
                <h2 className="mt-1.5 text-lg font-black text-slate-900 sm:mt-2 sm:text-2xl">
                  Switch to another tracking page
                </h2>
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
              {records
                .filter((record) => record.routeId !== selectedRecord.routeId)
                .slice(0, 6)
                .map((record) => (
                  <Link
                    key={record.routeId}
                    to={`/transport/live-location/${encodeURIComponent(record.routeId)}`}
                    className={`rounded-[20px] p-3 transition hover:border-slate-300 hover:brightness-[0.99] sm:rounded-[24px] sm:p-5 ${pageCardClass}`}
                  >
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-black text-slate-900 sm:text-base">
                          {getRecordTitle(record)}
                        </p>
                        <p className="mt-1 text-[12px] font-semibold text-slate-500 sm:text-sm">
                          {getRecordSubtitle(record)}
                        </p>
                      </div>
                      <StatusBadge
                        statusKey={record.statusKey}
                        label={record.statusLabel}
                      />
                    </div>
                    <p className="mt-3 text-[12px] font-medium text-slate-500 sm:mt-4 sm:text-sm">
                      {formatRelativeTime(record.lastUpdate)}
                    </p>
                  </Link>
                ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
