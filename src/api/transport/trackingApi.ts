import { transportApiRequest } from "./api";

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
  message: string;
  statusCode: number;
}

const safeString = (value: unknown) => String(value ?? "").trim();

const safeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
  const response = await transportApiRequest(
    "entity/equipment-master/get-equipment-trip-report",
    {
      params: {
        device_id: params.deviceId,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        time_picker_from: params.timePickerFrom,
        time_picker_to: params.timePickerTo,
      },
      signal,
    }
  );

  const body = response?.data || {};
  const records = Array.isArray(body.data)
    ? body.data.map((item: Record<string, any>) =>
        normalizeEquipmentTripReportRecord(item)
      )
    : [];

  return {
    records,
    message: safeString(body.message),
    statusCode: Number(body.statusCode || response?.status || 0),
  };
};
