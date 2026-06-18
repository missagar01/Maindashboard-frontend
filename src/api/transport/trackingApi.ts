import { transportApiRequest } from "./api";

const DOORDRISHTI_TRIP_REPORT_URL = "https://doordrishti.co/report_trip_result.php";
const DOORDRISHTI_USER_NAME = "sagarpipe@doordrishti.com";
const DOORDRISHTI_HASH_KEY = "AMICGJOBSWLVIQJG";

export type EquipmentTrackingStatusKey =
  | "moving"
  | "stopped"
  | "idling"
  | "unreachable";

export interface EquipmentTrackingEquipmentInfo {
  id: string;
  equipmentName: string;
  equipmentType: string;
  equipmentCategory: string;
  doorNumber: string;
  gpsEquipmentId: string;
}

export interface EquipmentTrackingRecord {
  routeId: string;
  deviceId: string;
  serial: string;
  voiceNo: string;
  registrationNo: string;
  lastUpdate: string | null;
  direction: number | null;
  ignitionOn: boolean;
  speed: number;
  lat: number | null;
  lng: number | null;
  parkingSeconds: number;
  fuelLevel: number | null;
  alertTypeId: number | null;
  distance: number;
  deviceStatus: number | null;
  statusLabel: string;
  statusKey: EquipmentTrackingStatusKey;
  timeout: number | null;
  equipment: EquipmentTrackingEquipmentInfo;
  raw: Record<string, any>;
}

export interface EquipmentTrackingSummary {
  total: number;
  moving: number;
  stopped: number;
  idling: number;
  unreachable: number;
}

export interface EquipmentTrackingReportResponse {
  records: EquipmentTrackingRecord[];
  count: number;
  paginationMetadata: Record<string, any> | null;
  message: string;
  statusCode: number;
  summary: EquipmentTrackingSummary;
}

export interface EquipmentTripReportRecord {
  tripId: number;
  startLatitude: number | null;
  startLongitude: number | null;
  startLocation: string;
  endLatitude: number | null;
  endLongitude: number | null;
  endLocation: string;
  vehicleStatus: string;
  vehicleStatusValue: number | null;
  fuelLevel: number | null;
  temperature: number | null;
  humidity: string;
  gpsDataId: string;
  startDate: string | null;
  movingStartDate: string | null;
  endDate: string | null;
  movingEndDate: string | null;
  distance: number;
  vehicleStatusImage: number | null;
  averageSpeed: number;
  diffSeconds: number;
  timeInterval: string;
  raw: Record<string, any>;
}

export interface EquipmentTripReportParams {
  deviceId: string;
  dateFrom: string;
  dateTo: string;
  timePickerFrom: string;
  timePickerTo: string;
}

export interface EquipmentTripReportResponse {
  records: EquipmentTripReportRecord[];
  summary: EquipmentTripReportSummary | null;
  message: string;
  statusCode: number;
}

export interface EquipmentTripReportSummary {
  movingCount: number;
  totalWorkingHours: string;
  totalWorkingSeconds: number;
  sumOfDistance: number;
  startTime: string | null;
  endTime: string | null;
  perTotalIdleTime: number;
  perTotalMovingTime: number;
  perTotalStoppageTime: number;
  perTotalTowingTime: number;
  perTotalUnreachTime: number;
  avgSpeed: string;
  raw: Record<string, any>;
}

const safeString = (value: unknown) => String(value ?? "").trim();

const safeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDurationToSeconds = (value: unknown) => {
  const normalizedValue = safeString(value);

  if (!normalizedValue) {
    return 0;
  }

  const hhmmssMatch = normalizedValue.match(/^(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?$/);

  if (hhmmssMatch) {
    const [, hours, minutes, seconds = "0"] = hhmmssMatch;
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
  }

  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const hasEquipmentTripSummaryShape = (value: unknown): value is Record<string, any> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return [
    "moving_count",
    "total_working_hours",
    "sum_of_distance",
    "start_time",
    "end_time",
  ].some((key) => key in value);
};

const findEquipmentTripSummarySource = (
  value: unknown,
  depth = 0
): Record<string, any> | null => {
  if (depth > 5 || value == null) {
    return null;
  }

  if (hasEquipmentTripSummaryShape(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const found = findEquipmentTripSummarySource(value[index], depth + 1);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const priorityKeys = ["summary", "totals", "total", "footer", "meta", "extra"];

  for (const key of priorityKeys) {
    if (!(key in record)) {
      continue;
    }

    const found = findEquipmentTripSummarySource(record[key], depth + 1);
    if (found) {
      return found;
    }
  }

  for (const nestedValue of Object.values(record)) {
    const found = findEquipmentTripSummarySource(nestedValue, depth + 1);
    if (found) {
      return found;
    }
  }

  return null;
};

const isNonEmptyEquipmentTripItem = (value: unknown): value is Record<string, any> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, any>;

  return [
    item.trip_id,
    item.start_date,
    item.end_date,
    item.vehicle_status,
    item.distance,
    item.diff_secs,
    item.time_interval,
  ].some((field) => safeString(field).length > 0);
};

const extractEquipmentTripRowsSource = (
  value: unknown,
  depth = 0
): Record<string, any>[] => {
  if (depth > 5 || value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(isNonEmptyEquipmentTripItem);
  }

  if (typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, any>;

  if (Array.isArray(record.trip_data)) {
    return record.trip_data.filter(isNonEmptyEquipmentTripItem);
  }

  for (const key of ["data", "providerResponse", "payload", "response"]) {
    if (!(key in record)) {
      continue;
    }

    const found = extractEquipmentTripRowsSource(record[key], depth + 1);

    if (found.length > 0) {
      return found;
    }
  }

  return [];
};

const isTripReportNoDataPayload = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, any>;
  const messages = [
    safeString(record.message).toLowerCase(),
    safeString(record.providerResponse?.message).toLowerCase(),
  ].filter(Boolean);
  const resultCodes = [
    safeString(record.result),
    safeString(record.providerResponse?.result),
  ].filter(Boolean);

  return (
    messages.some(
      (message) =>
        message.includes("data not found") || message.includes("no record found")
    ) ||
    (extractEquipmentTripRowsSource(record).length === 0 &&
      resultCodes.some((code) => code === "1" || code === "1560"))
  );
};

const normalizeEquipmentTripReportResponse = (
  body: Record<string, any>,
  fallbackStatusCode: number
): EquipmentTripReportResponse => {
  const records = extractEquipmentTripRowsSource(body).map((item) =>
    normalizeEquipmentTripReportRecord(item)
  );
  const summarySource = findEquipmentTripSummarySource(body);

  return {
    records,
    summary: summarySource
      ? normalizeEquipmentTripReportSummary(summarySource)
      : null,
    message: safeString(body.message || body.providerResponse?.message),
    statusCode: Number(body.statusCode || fallbackStatusCode || 0),
  };
};

const fetchDoordrishtiTripReport = async (
  params: EquipmentTripReportParams,
  signal?: AbortSignal
) => {
  const buildLegacyDoordrishtiDateValue = (value: string) => {
    const match = safeString(value).match(/^(\d{4}-\d{2})-(\d{2})$/);

    if (!match) {
      return safeString(value);
    }

    const [, prefix, day] = match;
    return `${prefix}-0${day}`;
  };

  const buildDoordrishtiSearchParams = (dateFrom: string, dateTo: string) =>
    new URLSearchParams({
      action: "report_trip_json",
      device_id: params.deviceId,
      date_from: dateFrom,
      date_to: dateTo,
      time_picker_from: params.timePickerFrom,
      time_picker_to: params.timePickerTo,
      idling: "1",
      moving: "1",
      stoppage: "1",
      unreach: "1",
      minimum_duration: "0",
      order_by: "0",
      order_type: "0",
      distance_filter: "0",
      delayedreports_id: "",
      user_name: DOORDRISHTI_USER_NAME,
      hash_key: DOORDRISHTI_HASH_KEY,
    });

  const readDoordrishtiResponse = async (searchParams: URLSearchParams) => {
    const response = await fetch(
      `${DOORDRISHTI_TRIP_REPORT_URL}?${searchParams.toString()}`,
      {
        method: "GET",
        signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Doordrishti request failed with status ${response.status}`);
    }

    return response.json();
  };

  const primaryBody = await readDoordrishtiResponse(
    buildDoordrishtiSearchParams(params.dateFrom, params.dateTo)
  );

  if (!isTripReportNoDataPayload(primaryBody)) {
    return primaryBody;
  }

  const legacyDateFrom = buildLegacyDoordrishtiDateValue(params.dateFrom);
  const legacyDateTo = buildLegacyDoordrishtiDateValue(params.dateTo);

  if (legacyDateFrom === params.dateFrom && legacyDateTo === params.dateTo) {
    return primaryBody;
  }

  const legacyBody = await readDoordrishtiResponse(
    buildDoordrishtiSearchParams(legacyDateFrom, legacyDateTo)
  );

  if (!isTripReportNoDataPayload(legacyBody)) {
    return legacyBody;
  }

  return primaryBody;
};

export const getEquipmentTripReportFromDoordrishti = async (
  params: EquipmentTripReportParams,
  signal?: AbortSignal
): Promise<EquipmentTripReportResponse> => {
  const doordrishtiBody = await fetchDoordrishtiTripReport(params, signal);

  return normalizeEquipmentTripReportResponse(
    doordrishtiBody && typeof doordrishtiBody === "object"
      ? doordrishtiBody
      : {},
    200
  );
};

const resolveStatusKey = (
  rawItem: Record<string, any>,
  statusLabel: string,
  speed: number,
  ignitionOn: boolean
): EquipmentTrackingStatusKey => {
  const normalizedLabel = statusLabel.toLowerCase();

  if (normalizedLabel.includes("moving") || speed > 0) {
    return "moving";
  }

  if (normalizedLabel.includes("idle")) {
    return "idling";
  }

  if (normalizedLabel.includes("stop")) {
    return "stopped";
  }

  if (
    normalizedLabel.includes("offline") ||
    normalizedLabel.includes("unreachable") ||
    safeNumber(rawItem.device_status) === 4
  ) {
    return "unreachable";
  }

  return ignitionOn ? "idling" : "stopped";
};

const normalizeEquipmentTrackingRecord = (
  item: Record<string, any>
): EquipmentTrackingRecord => {
  const equipmentSource = item?.equipment || {};
  const speed = safeNumber(item.speed) ?? 0;
  const ignitionOn =
    safeString(item.ignition_status) === "1" || safeNumber(item.ignition_status) === 1;
  const statusLabel = safeString(item.status_label) || "Unknown";
  const equipment: EquipmentTrackingEquipmentInfo = {
    id: safeString(equipmentSource.id),
    equipmentName: safeString(equipmentSource.equipment_name),
    equipmentType: safeString(equipmentSource.equipment_type),
    equipmentCategory: safeString(equipmentSource.equipment_category),
    doorNumber: safeString(equipmentSource.door_number),
    gpsEquipmentId: safeString(equipmentSource.gps_equipment_id),
  };

  return {
    routeId:
      equipment.id ||
      equipment.gpsEquipmentId ||
      safeString(item.device_id) ||
      safeString(item.serial),
    deviceId: safeString(item.device_id),
    serial: safeString(item.serial),
    voiceNo: safeString(item.voice_no),
    registrationNo: safeString(item.registration_no),
    lastUpdate: safeString(item.last_update) || null,
    direction: safeNumber(item.direction),
    ignitionOn,
    speed,
    lat: safeNumber(item.lat),
    lng: safeNumber(item.long),
    parkingSeconds: safeNumber(item.parking) ?? 0,
    fuelLevel: safeNumber(item.fuel_level),
    alertTypeId: safeNumber(item.alert_type_id),
    distance: safeNumber(item.distance) ?? 0,
    deviceStatus: safeNumber(item.device_status),
    statusLabel,
    statusKey: resolveStatusKey(item, statusLabel, speed, ignitionOn),
    timeout: safeNumber(item.timeout),
    equipment,
    raw: item,
  };
};

const normalizeEquipmentTripReportRecord = (
  item: Record<string, any>
): EquipmentTripReportRecord => ({
  tripId: Number(item.trip_id || 0),
  startLatitude: safeNumber(item.start_latitude),
  startLongitude: safeNumber(item.start_longitude),
  startLocation: safeString(item.start_location),
  endLatitude: safeNumber(item.end_latitude),
  endLongitude: safeNumber(item.end_longitude),
  endLocation: safeString(item.end_location),
  vehicleStatus: safeString(item.vehicle_status),
  vehicleStatusValue: safeNumber(item.vehicle_status_1),
  fuelLevel: safeNumber(item.fuel_level),
  temperature: safeNumber(item.temperature),
  humidity: safeString(item.humidity),
  gpsDataId: safeString(item.gps_data_id),
  startDate: safeString(item.start_date) || null,
  movingStartDate: safeString(item.mov_start_date) || null,
  endDate: safeString(item.end_date) || null,
  movingEndDate: safeString(item.mov_end_date) || null,
  distance: safeNumber(item.distance) ?? 0,
  vehicleStatusImage: safeNumber(item.vehicle_status_image),
  averageSpeed: safeNumber(item.average_speed) ?? 0,
  diffSeconds: safeNumber(item.diff_secs) ?? 0,
  timeInterval: safeString(item.time_interval),
  raw: item,
});

const normalizeEquipmentTripReportSummary = (
  item: Record<string, any>
): EquipmentTripReportSummary => ({
  movingCount: safeNumber(item.moving_count) ?? 0,
  totalWorkingHours: safeString(item.total_working_hours),
  totalWorkingSeconds: parseDurationToSeconds(item.total_working_hours),
  sumOfDistance: safeNumber(item.sum_of_distance) ?? 0,
  startTime: safeString(item.start_time) || null,
  endTime: safeString(item.end_time) || null,
  perTotalIdleTime: safeNumber(item.per_total_idle_time) ?? 0,
  perTotalMovingTime: safeNumber(item.per_total_moving_time) ?? 0,
  perTotalStoppageTime: safeNumber(item.per_total_stoppage_time) ?? 0,
  perTotalTowingTime: safeNumber(item.per_total_towing_time) ?? 0,
  perTotalUnreachTime: safeNumber(item.per_total_unreach_time) ?? 0,
  avgSpeed: safeString(item.avg_speed),
  raw: item,
});

export const buildEquipmentTrackingSummary = (
  records: EquipmentTrackingRecord[]
): EquipmentTrackingSummary =>
  records.reduce<EquipmentTrackingSummary>(
    (summary, record) => {
      summary.total += 1;
      summary[record.statusKey] += 1;
      return summary;
    },
    {
      total: 0,
      moving: 0,
      stopped: 0,
      idling: 0,
      unreachable: 0,
    }
  );

const coalesceSummaryValue = (
  apiValue: unknown,
  fallbackValue: number
) => {
  const numeric = safeNumber(apiValue);
  return numeric ?? fallbackValue;
};

export const getEquipmentTrackingReport = async (
  signal?: AbortSignal
): Promise<EquipmentTrackingReportResponse> => {
  const response = await transportApiRequest(
    "entity/equipment-master/get-equipment-tracking-report",
    {
      params: {
        page: 1,
        limit: 1000000000,
      },
      signal,
    }
  );

  const body = response?.data || {};
  const records = Array.isArray(body.data)
    ? body.data.map((item: Record<string, any>) =>
      normalizeEquipmentTrackingRecord(item)
    )
    : [];
  const fallbackSummary = buildEquipmentTrackingSummary(records);
  const apiSummary = body.summary || {};

  return {
    records,
    count: Number(body.count || records.length || 0),
    paginationMetadata: body.paginationMetadata || null,
    message: safeString(body.message),
    statusCode: Number(body.statusCode || response?.status || 0),
    summary: {
      total: coalesceSummaryValue(apiSummary.total, fallbackSummary.total),
      moving: coalesceSummaryValue(apiSummary.moving, fallbackSummary.moving),
      stopped: coalesceSummaryValue(apiSummary.stopped, fallbackSummary.stopped),
      idling: coalesceSummaryValue(apiSummary.idling, fallbackSummary.idling),
      unreachable: coalesceSummaryValue(
        apiSummary.unreachable,
        fallbackSummary.unreachable
      ),
    },
  };
};

export const getEquipmentTripReport = async (
  params: EquipmentTripReportParams,
  signal?: AbortSignal
): Promise<EquipmentTripReportResponse> => {
  const combinedFrom = `${params.dateFrom} ${params.timePickerFrom}`.trim();
  const combinedTo = `${params.dateTo} ${params.timePickerTo}`.trim();
  const transportParams = {
    device_id: params.deviceId,
    date_from: params.dateFrom,
    date_to: params.dateTo,
    time_picker_from: params.timePickerFrom,
    time_picker_to: params.timePickerTo,
    // Variants to ensure backend picks up the filter
    from_date: params.dateFrom,
    to_date: params.dateTo,
    from_time: params.timePickerFrom,
    to_time: params.timePickerTo,
    start_time: params.timePickerFrom,
    end_time: params.timePickerTo,
    datetime_from: combinedFrom,
    datetime_to: combinedTo,
    from_datetime: combinedFrom,
    to_datetime: combinedTo,
    date_time_from: combinedFrom,
    date_time_to: combinedTo,
  };

  try {
    const response = await transportApiRequest(
      "entity/equipment-master/get-equipment-trip-report",
      {
        params: transportParams,
        signal,
      }
    );

    const normalizedTransportResponse = normalizeEquipmentTripReportResponse(
      response?.data || {},
      Number(response?.status || 0)
    );

    if (
      normalizedTransportResponse.records.length > 0 ||
      normalizedTransportResponse.summary
    ) {
      return normalizedTransportResponse;
    }

    try {
      const doordrishtiBody = await fetchDoordrishtiTripReport(params, signal);
      const normalizedDoordrishtiResponse =
        normalizeEquipmentTripReportResponse(
          doordrishtiBody && typeof doordrishtiBody === "object"
            ? doordrishtiBody
            : {},
          200
        );

      if (
        normalizedDoordrishtiResponse.records.length > 0 ||
        normalizedDoordrishtiResponse.summary ||
        isTripReportNoDataPayload(doordrishtiBody)
      ) {
        return normalizedDoordrishtiResponse;
      }
    } catch {
      // Ignore fallback failures here and keep the transport response.
    }

    return normalizedTransportResponse;
  } catch (error: any) {
    if (signal?.aborted) {
      throw error;
    }

    const transportStatusCode = Number(error?.response?.status || 0);
    const transportBody =
      error?.response?.data && typeof error.response.data === "object"
        ? error.response.data
        : {};
    const transportHasNoData = isTripReportNoDataPayload(transportBody);
    const shouldTryDoordrishtiFallback =
      transportStatusCode >= 500 || transportHasNoData;

    if (shouldTryDoordrishtiFallback) {
      try {
        const doordrishtiBody = await fetchDoordrishtiTripReport(params, signal);
        const normalizedDoordrishtiResponse =
          normalizeEquipmentTripReportResponse(
            doordrishtiBody && typeof doordrishtiBody === "object"
              ? doordrishtiBody
              : {},
            200
          );

        if (
          normalizedDoordrishtiResponse.records.length > 0 ||
          normalizedDoordrishtiResponse.summary ||
          isTripReportNoDataPayload(doordrishtiBody)
        ) {
          return normalizedDoordrishtiResponse;
        }
      } catch (fallbackError) {
        if (!transportHasNoData) {
          throw error;
        }
      }
    }

    if (transportHasNoData) {
      return normalizeEquipmentTripReportResponse(
        transportBody,
        transportStatusCode
      );
    }

    throw error;
  }
};
